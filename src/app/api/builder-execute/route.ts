import { NextRequest, NextResponse } from "next/server";
import type { BuilderBlueprint, BuilderBoard, BuilderColumn } from "@/types/builder";

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

// Map our ColumnType to Monday's column_type enum
const COLUMN_TYPE_MAP: Record<string, string> = {
  text: "text",
  status: "status",
  people: "people",
  date: "date",
  timeline: "timeline",
  numbers: "numbers",
  dropdown: "dropdown",
  phone: "phone",
  email: "email",
  link: "link",
  long_text: "long_text",
  checkbox: "checkbox",
  color: "color_picker",
  file: "file",
  rating: "rating",
  location: "location",
};

function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

interface BoardResult {
  boardName: string;
  boardId: string | null;
  columns: string[];
  groups: string[];
  error?: string;
}

async function buildBoard(board: BuilderBoard, apiToken: string): Promise<BoardResult> {
  const result: BoardResult = {
    boardName: board.boardName,
    boardId: null,
    columns: [],
    groups: [],
  };

  // 1. Create the board
  try {
    const data = await mondayQuery(
      `mutation { create_board(board_name:"${esc(board.boardName)}", board_kind:public) { id } }`,
      apiToken
    );
    result.boardId = data.create_board?.id;
  } catch (err) {
    result.error = `Failed to create board: ${err instanceof Error ? err.message : "unknown"}`;
    return result;
  }

  if (!result.boardId) {
    result.error = "Board created but no ID returned";
    return result;
  }

  // 2. Create columns
  for (const col of board.columns) {
    const mondayType = COLUMN_TYPE_MAP[col.type] || "text";
    try {
      // Build defaults for status/dropdown columns
      let defaultsClause = "";
      if (col.type === "status" && col.statusLabels && col.statusLabels.length > 0) {
        const labels: Record<number, string> = {};
        col.statusLabels.forEach((label, i) => {
          labels[i] = label;
        });
        const labelsJson = JSON.stringify({ labels }).replace(/"/g, '\\"');
        defaultsClause = `, defaults:"${labelsJson}"`;
      }
      if (col.type === "dropdown" && col.dropdownOptions && col.dropdownOptions.length > 0) {
        const settings = { labels: col.dropdownOptions.map((opt, i) => ({ id: i, name: opt })) };
        const settingsJson = JSON.stringify(settings).replace(/"/g, '\\"');
        defaultsClause = `, defaults:"${settingsJson}"`;
      }

      await mondayQuery(
        `mutation { create_column(board_id:${result.boardId}, title:"${esc(col.title)}", column_type:${mondayType}${defaultsClause}) { id } }`,
        apiToken
      );
      result.columns.push(col.title);
    } catch (err) {
      result.columns.push(`${col.title} (error: ${err instanceof Error ? err.message : "unknown"})`);
    }
  }

  // 3. Create groups (Monday creates a default group, so we create ours and the default stays)
  for (const group of board.groups) {
    try {
      await mondayQuery(
        `mutation { create_group(board_id:${result.boardId}, group_name:"${esc(group.title)}") { id } }`,
        apiToken
      );
      result.groups.push(group.title);
    } catch (err) {
      result.groups.push(`${group.title} (error: ${err instanceof Error ? err.message : "unknown"})`);
    }
  }

  return result;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { blueprint, apiToken } = body as { blueprint: BuilderBlueprint; apiToken: string };

    if (!apiToken) {
      return NextResponse.json({ error: "Missing API token" }, { status: 400 });
    }
    if (!blueprint || !blueprint.boards || blueprint.boards.length === 0) {
      return NextResponse.json({ error: "Missing blueprint data" }, { status: 400 });
    }

    // Verify token works
    try {
      await mondayQuery(`query { me { id name } }`, apiToken);
    } catch {
      return NextResponse.json({ error: "API Token is invalid or expired" }, { status: 401 });
    }

    // Build each board sequentially
    const results: BoardResult[] = [];
    for (const board of blueprint.boards) {
      const boardResult = await buildBoard(board, apiToken);
      results.push(boardResult);
    }

    const successCount = results.filter((r) => r.boardId && !r.error).length;

    return NextResponse.json({
      success: successCount === results.length,
      totalBoards: results.length,
      successCount,
      results,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
