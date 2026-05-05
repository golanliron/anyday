import { NextRequest, NextResponse } from "next/server";

const MONDAY_API = "https://api.monday.com/v2";

async function mondayQuery(query: string, apiToken: string) {
  const res = await fetch(MONDAY_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiToken,
      "API-Version": "2024-01",
    },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`Monday API error (${res.status})`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, boardId, apiToken } = body;

    if (!apiToken) {
      return NextResponse.json({ error: "נא להזין API Token" }, { status: 400 });
    }

    if (action === "board") {
      if (!boardId) {
        return NextResponse.json({ error: "נא להזין מספר בורד" }, { status: 400 });
      }

      const data = await mondayQuery(
        `query { boards(ids:[${boardId}]) { id name description items_count columns { id title type } items_page(limit:100) { items { id name column_values { id text column { title type } } } } } }`,
        apiToken
      );

      const board = data.boards?.[0];
      if (!board) {
        return NextResponse.json({ error: "בורד לא נמצא. בדקי שמספר הבורד נכון." }, { status: 404 });
      }

      const items = board.items_page?.items || [];
      delete board.items_page;

      return NextResponse.json({ board, items });
    }

    // ── Execute automation: scan items + apply action on matches ──
    if (action === "automate") {
      const { conditionColumn, conditionValues, actionType, actionConfig } = body;

      if (!boardId || !conditionColumn || !actionType) {
        return NextResponse.json({ error: "חסרים פרטים לאוטומציה" }, { status: 400 });
      }

      // Fetch all items
      const boardData = await mondayQuery(
        `query { boards(ids:[${boardId}]) { groups { id title } items_page(limit:500) { items { id name column_values { id text value column { title type } } } } } }`,
        apiToken
      );
      const allItems = boardData.boards?.[0]?.items_page?.items || [];
      const groups = boardData.boards?.[0]?.groups || [];

      // Find matching items
      const matches = allItems.filter((item: { column_values: { id: string; text: string }[] }) => {
        const cv = item.column_values.find((v: { id: string }) => v.id === conditionColumn);
        if (!cv?.text) return false;
        if (conditionValues && conditionValues.length > 0) {
          return conditionValues.includes(cv.text);
        }
        return true;
      });

      if (matches.length === 0) {
        return NextResponse.json({ executed: 0, message: "לא נמצאו פריטים תואמים" });
      }

      let executed = 0;
      const results: string[] = [];

      for (const item of matches) {
        try {
          if (actionType === "change_status") {
            const { columnId, newValue } = actionConfig;
            const valueJson = JSON.stringify({ label: newValue }).replace(/"/g, '\\"');
            await mondayQuery(
              `mutation { change_column_value(board_id:${boardId}, item_id:${item.id}, column_id:"${columnId}", value:"${valueJson}") { id } }`,
              apiToken
            );
            results.push(`${item.name}: סטטוס שונה ל-${newValue}`);
          } else if (actionType === "move_to_group") {
            const { groupId } = actionConfig;
            await mondayQuery(
              `mutation { move_item_to_group(item_id:${item.id}, group_id:"${groupId}") { id } }`,
              apiToken
            );
            const groupName = groups.find((g: { id: string; title: string }) => g.id === groupId)?.title || groupId;
            results.push(`${item.name}: הועבר ל-${groupName}`);
          } else if (actionType === "notify") {
            const { text } = actionConfig;
            let userId = actionConfig.userId;
            if (\!userId) {
              const meRes = await mondayQuery(`query { me { id } }`, apiToken);
              userId = meRes?.data?.me?.id;
            }
            if (userId) {
              await mondayQuery(
                `mutation { create_notification(user_id:${userId}, target_id:${item.id}, text:"${text}", target_type:Project) { text } }`,
                apiToken
              );
              results.push(`${item.name}: נשלחה התראה`);
            } else {
              results.push(`${item.name}: לא נמצא משתמש`);
            }
          } else if (actionType === "archive") {
            await mondayQuery(
              `mutation { archive_item(item_id:${item.id}) { id } }`,
              apiToken
            );
            results.push(`${item.name}: הועבר לארכיון`);
          }
          executed++;
        } catch (err) {
          results.push(`${item.name}: שגיאה - ${err instanceof Error ? err.message : "unknown"}`);
        }
      }

      return NextResponse.json({ executed, total: matches.length, results });
    }

    // ── Single mutation ──
    if (action === "mutate") {
      const { mutation } = body;
      if (!mutation) {
        return NextResponse.json({ error: "חסרה מוטציה" }, { status: 400 });
      }
      const data = await mondayQuery(mutation, apiToken);
      return NextResponse.json({ success: true, data });
    }

    // ── Get groups for a board ──
    if (action === "groups") {
      const data = await mondayQuery(
        `query { boards(ids:[${boardId}]) { groups { id title color } } }`,
        apiToken
      );
      return NextResponse.json({ groups: data.boards?.[0]?.groups || [] });
    }

    // ── List all boards for the user ──
    if (action === "list_boards") {
      const data = await mondayQuery(
        `query { boards(limit:50, order_by:used_at) { id name items_count description } }`,
        apiToken
      );
      return NextResponse.json({ boards: data.boards || [] });
    }

    // ── Change a single column value (structured JSON) ──
    if (action === "change_value") {
      const { itemId, columnId, value } = body;
      if (!boardId || !itemId || !columnId) {
        return NextResponse.json({ error: "missing params" }, { status: 400 });
      }
      const valueJson = JSON.stringify(value).replace(/"/g, '\\"');
      const data = await mondayQuery(
        `mutation { change_column_value(board_id:${boardId}, item_id:${itemId}, column_id:"${columnId}", value:"${valueJson}") { id } }`,
        apiToken
      );
      return NextResponse.json({ success: true, data });
    }

    // ── Change simple (text) column value ──
    if (action === "change_simple") {
      const { itemId, columnId, value } = body;
      if (!boardId || !itemId || !columnId) {
        return NextResponse.json({ error: "missing params" }, { status: 400 });
      }
      const escaped = String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      const data = await mondayQuery(
        `mutation { change_simple_column_value(board_id:${boardId}, item_id:${itemId}, column_id:"${columnId}", value:"${escaped}") { id } }`,
        apiToken
      );
      return NextResponse.json({ success: true, data });
    }

    // ── Create new item ──
    if (action === "create_item") {
      const { itemName, groupId } = body;
      if (!boardId || !itemName) {
        return NextResponse.json({ error: "missing params" }, { status: 400 });
      }
      const escaped = itemName.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      const groupClause = groupId ? `, group_id:"${groupId}"` : "";
      const data = await mondayQuery(
        `mutation { create_item(board_id:${boardId}, item_name:"${escaped}"${groupClause}) { id name } }`,
        apiToken
      );
      return NextResponse.json({ success: true, item: data.create_item });
    }

    return NextResponse.json({ error: "פעולה לא מוכרת" }, { status: 400 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "שגיאה לא ידועה";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
