import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { mondayQuery, requireMonday } from "@/lib/monday-server";

/**
 * Returns the items of the selected board(s) as "people" rows for the
 * participants list + profile cards. Generic: it surfaces every column so any
 * nonprofit's structure (graduates, war-wounded, elderly, animals) works.
 * It also picks out likely status/phone/email/date columns BY TYPE so the
 * profile card can highlight them without knowing their names.
 */
export async function GET() {
  const guard = await requireMonday();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const selected = (await cookies()).get("anyday_selected_boards")?.value?.split(",").filter(Boolean);
  if (!selected?.length) return NextResponse.json({ people: [], boards: [] });

  try {
    const data = await mondayQuery(
      `query { boards(ids:[${selected.join(",")}]) {
         id name
         columns { id title type }
         items_page(limit:200) { items { id name
           column_values { id text column { title type } }
           updated_at
         } }
       } }`,
      guard.token
    );

    const boards = (data?.boards || []).map((b: RawBoard) => {
      const cols = (b.columns || []).map((c) => ({ id: c.id, title: c.title, type: c.type }));
      // classify key columns by type
      const key = {
        status: cols.find((c) => ["status", "color", "dropdown"].includes(c.type))?.title || null,
        phone: cols.find((c) => c.type === "phone")?.title || null,
        email: cols.find((c) => c.type === "email")?.title || null,
        person: cols.find((c) => ["people", "person"].includes(c.type))?.title || null,
        date: cols.find((c) => c.type === "date")?.title || null,
      };
      const people = (b.items_page?.items || []).map((it) => {
        const fields = (it.column_values || [])
          .map((cv) => ({ colId: cv.id, title: cv.column?.title || "", type: cv.column?.type || "", text: cv.text || "" }))
          .filter((f) => f.title && f.type !== "subtasks" && f.type !== "button");
        const get = (title: string | null) => title ? fields.find((f) => f.title === title)?.text || "" : "";
        return {
          id: it.id, name: it.name, boardId: b.id, boardName: b.name,
          status: get(key.status), phone: get(key.phone), email: get(key.email),
          owner: get(key.person), date: get(key.date), updatedAt: it.updated_at,
          fields, // all fields (with colId + type) so the UI can edit them
        };
      });
      return { id: b.id, name: b.name, columns: cols, key, people };
    });

    const people = boards.flatMap((b: { people: unknown[] }) => b.people);
    return NextResponse.json({ boards, people, total: people.length });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "שגיאה" }, { status: 502 });
  }
}

interface RawBoard { id: string; name: string; columns?: { id: string; title: string; type: string }[]; items_page?: { items: RawItem[] }; }
interface RawItem { id: string; name: string; updated_at?: string; column_values?: { id: string; text: string; column?: { title: string; type: string } }[]; }
