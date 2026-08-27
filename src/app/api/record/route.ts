import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { mondayQuery, requireMonday } from "@/lib/monday-server";

/**
 * Full record management that writes to the REAL Monday board.
 *   POST {op:"update", boardId, itemId, columnId, columnType, value}  → edit a field
 *   POST {op:"create", boardId, name, values?}                        → add a record
 *   POST {op:"delete", itemId}                                        → delete a record
 *   POST {op:"import", boardId, rows:[{name, values}]}                → bulk add
 * Generic — value formatting is chosen by the Monday column TYPE, so it works
 * for any board/column of any nonprofit.
 */
export async function POST(req: NextRequest) {
  const guard = await requireMonday();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const b = await req.json().catch(() => ({}));
  const { op } = b;

  try {
    if (op === "update") {
      const { boardId, itemId, columnId, columnType, value } = b;
      if (!boardId || !itemId || !columnId) return NextResponse.json({ error: "חסרים פרטים" }, { status: 400 });
      const raw = formatValue(columnType, value);
      await mondayQuery(
        `mutation { change_column_value(board_id:${boardId}, item_id:${itemId}, column_id:"${columnId}", value:"${esc(raw)}") { id } }`,
        guard.token
      );
      return NextResponse.json({ ok: true });
    }

    if (op === "create") {
      const { boardId, name } = b;
      if (!boardId || !name) return NextResponse.json({ error: "חסר שם" }, { status: 400 });
      const data = await mondayQuery(
        `mutation { create_item(board_id:${boardId}, item_name:"${esc(name)}") { id name } }`,
        guard.token
      );
      return NextResponse.json({ ok: true, item: data.create_item });
    }

    if (op === "delete") {
      const { itemId } = b;
      if (!itemId) return NextResponse.json({ error: "חסר מזהה" }, { status: 400 });
      await mondayQuery(`mutation { delete_item(item_id:${itemId}) { id } }`, guard.token);
      return NextResponse.json({ ok: true });
    }

    if (op === "import") {
      const { boardId, rows } = b as { boardId: string; rows: { name: string }[] };
      if (!boardId || !Array.isArray(rows) || !rows.length) return NextResponse.json({ error: "אין שורות לייבוא" }, { status: 400 });
      let created = 0; const errors: string[] = [];
      for (const row of rows.slice(0, 200)) {
        if (!row.name?.trim()) continue;
        try { await mondayQuery(`mutation { create_item(board_id:${boardId}, item_name:"${esc(row.name)}") { id } }`, guard.token); created++; }
        catch (e) { errors.push(`${row.name}: ${e instanceof Error ? e.message : "שגיאה"}`); }
      }
      return NextResponse.json({ ok: true, created, errors: errors.slice(0, 5) });
    }

    return NextResponse.json({ error: "op לא תקין" }, { status: 400 });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "שגיאה" }, { status: 502 });
  }
}

function esc(s: string) { return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"'); }

/** Format a value into Monday's JSON-string per column type. */
function formatValue(type: string, value: string): string {
  switch (type) {
    case "status":
    case "color": return JSON.stringify({ label: value });
    case "date": return JSON.stringify({ date: value });
    case "numbers": return JSON.stringify(value);
    case "checkbox": return JSON.stringify({ checked: value ? "true" : "false" });
    case "email": return JSON.stringify({ email: value, text: value });
    case "phone": return JSON.stringify({ phone: value, countryShortName: "IL" });
    case "text":
    case "long_text":
    default: return JSON.stringify(value);
  }
}
