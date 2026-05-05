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
            if (!userId) {
              const meRes = await mondayQuery(`query { me { id } }`, apiToken);
              userId = meRes?.me?.id;
            }
            if (userId) {
              const escapedText = (text || "התראה").replace(/"/g, '\\"');
              await mondayQuery(
                `mutation { create_notification(user_id:${userId}, target_id:${item.id}, text:"${escapedText}", target_type:Project) { text } }`,
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
          } else if (actionType === "send_email") {
            const { to, subject, html } = actionConfig;
            if (to) {
              // Monday doesn't have native email sending via API, but we can create a notification with the content
              const emailText = `מייל ל-${to}: ${subject || "ללא נושא"}`;
              const meRes = await mondayQuery(`query { me { id } }`, apiToken);
              const uid = meRes?.me?.id;
              if (uid) {
                await mondayQuery(
                  `mutation { create_notification(user_id:${uid}, target_id:${item.id}, text:"${emailText.replace(/"/g, '\\"')}", target_type:Project) { text } }`,
                  apiToken
                );
              }
              results.push(`${item.name}: נשלחה התראת מייל`);
            } else {
              results.push(`${item.name}: חסרה כתובת מייל`);
            }
          } else if (actionType === "create_item") {
            const { itemName, groupId: gId } = actionConfig;
            if (itemName) {
              const escaped = itemName.replace(/"/g, '\\"');
              const groupClause = gId ? `, group_id:"${gId}"` : "";
              await mondayQuery(
                `mutation { create_item(board_id:${boardId}, item_name:"${escaped}"${groupClause}) { id } }`,
                apiToken
              );
              results.push(`נוצר פריט: ${itemName}`);
            }
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

    // ── Create a new board with columns, groups, and items ──
    if (action === "create_board") {
      const { boardName, boardKind, columns, groups, items } = body;
      if (!boardName) {
        return NextResponse.json({ error: "חסר שם בורד" }, { status: 400 });
      }
      const kind = boardKind === "private" ? "private" : "public";
      const escapedName = boardName.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

      // 1. Create the board
      const boardData = await mondayQuery(
        `mutation { create_board(board_name:"${escapedName}", board_kind:${kind}) { id } }`,
        apiToken
      );
      const newBoardId = boardData.create_board?.id;
      if (!newBoardId) {
        return NextResponse.json({ error: "שגיאה ביצירת הבורד" }, { status: 500 });
      }

      const results: string[] = [`בורד "${boardName}" נוצר (${newBoardId})`];

      // 2. Create columns
      const columnMap: Record<number, string> = {};
      if (columns && Array.isArray(columns)) {
        for (let i = 0; i < columns.length; i++) {
          const col = columns[i];
          const colTitle = (col.title || `עמודה ${i + 1}`).replace(/"/g, '\\"');
          const colType = col.type || "text";
          try {
            const colData = await mondayQuery(
              `mutation { create_column(board_id:${newBoardId}, title:"${colTitle}", column_type:${colType}) { id } }`,
              apiToken
            );
            columnMap[i] = colData.create_column?.id || "";
            results.push(`עמודה: ${col.title} (${colType})`);
          } catch (err) {
            results.push(`שגיאה בעמודה ${col.title}: ${err instanceof Error ? err.message : "unknown"}`);
          }
        }
      }

      // 3. Create groups
      const groupMap: Record<number, string> = {};
      if (groups && Array.isArray(groups)) {
        for (let i = 0; i < groups.length; i++) {
          const grp = groups[i];
          const grpName = (grp.title || `קבוצה ${i + 1}`).replace(/"/g, '\\"');
          try {
            const grpData = await mondayQuery(
              `mutation { create_group(board_id:${newBoardId}, group_name:"${grpName}") { id } }`,
              apiToken
            );
            groupMap[i] = grpData.create_group?.id || "";
            results.push(`קבוצה: ${grp.title}`);
          } catch (err) {
            results.push(`שגיאה בקבוצה ${grp.title}: ${err instanceof Error ? err.message : "unknown"}`);
          }
        }
      }

      // 4. Create items
      if (items && Array.isArray(items)) {
        for (const item of items) {
          const itemName = (item.name || "פריט חדש").replace(/"/g, '\\"');
          const groupClause = item.group_index !== undefined && groupMap[item.group_index]
            ? `, group_id:"${groupMap[item.group_index]}"`
            : "";
          try {
            await mondayQuery(
              `mutation { create_item(board_id:${newBoardId}, item_name:"${itemName}"${groupClause}) { id } }`,
              apiToken
            );
            results.push(`פריט: ${item.name}`);
          } catch (err) {
            results.push(`שגיאה בפריט ${item.name}: ${err instanceof Error ? err.message : "unknown"}`);
          }
        }
      }

      return NextResponse.json({ success: true, boardId: newBoardId, results });
    }

    return NextResponse.json({ error: "פעולה לא מוכרת" }, { status: 400 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "שגיאה לא ידועה";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
