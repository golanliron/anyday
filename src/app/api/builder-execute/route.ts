import { NextRequest, NextResponse } from "next/server";
import type { BuilderBlueprint, BuilderBoard, BuilderColumn } from "@/types/builder";
import { mondayQuery, requireMonday } from "@/lib/monday-server";
import { getOrgContext } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase-server";

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
    // Auth + Monday connection are resolved server-side; no client token.
    const guard = await requireMonday();
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }
    const apiToken = guard.token;

    const body = await req.json();
    const { blueprint } = body as { blueprint: BuilderBlueprint };

    if (!blueprint || !blueprint.boards || blueprint.boards.length === 0) {
      return NextResponse.json({ error: "Missing blueprint data" }, { status: 400 });
    }

    // Build each board sequentially
    const results: BoardResult[] = [];
    for (const board of blueprint.boards) {
      const boardResult = await buildBoard(board, apiToken);
      results.push(boardResult);
    }

    const successCount = results.filter((r) => r.boardId && !r.error).length;

    // Persist the built blueprint to the org's history (best-effort).
    try {
      const ctx = await getOrgContext();
      const service = createServiceClient();
      if (ctx && service) {
        await service.from("blueprints").insert({
          org_id: ctx.orgId,
          created_by: ctx.userId,
          system_name: blueprint.systemName || "מערכת ללא שם",
          description: blueprint.description ?? null,
          status: "built",
          payload: blueprint as unknown as Record<string, unknown>,
          built_result: { results, successCount, totalBoards: results.length },
          built_at: new Date().toISOString(),
        });
      }
    } catch (persistErr) {
      console.error("Blueprint persist failed:", persistErr);
    }

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
