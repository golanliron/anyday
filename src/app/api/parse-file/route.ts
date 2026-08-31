import { NextRequest, NextResponse } from "next/server";
import { requireMonday } from "@/lib/monday-server";
import { rateLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  // הנתיב משרת רק את הבונה החכם, שממילא יושב מאחורי חיבור Monday — אותו שער.
  // בלעדיו זה היה נתיב ציבורי שקורא כל קובץ שמעלים אליו לתוך הזיכרון.
  const guard = await requireMonday();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const rl = rateLimit("parse-file", guard.orgId, 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "לא הועלה קובץ" }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "הקובץ גדול מדי (עד 5MB)" }, { status: 413 });
    }

    const name = file.name.toLowerCase();
    const text = await file.text();

    let rows: string[][] = [];
    let headers: string[] = [];

    if (name.endsWith(".csv") || name.endsWith(".tsv")) {
      const separator = name.endsWith(".tsv") ? "\t" : ",";
      const lines = text
        .split(/\r?\n/)
        .filter((l) => l.trim().length > 0);

      if (lines.length === 0) {
        return NextResponse.json(
          { error: "הקובץ ריק" },
          { status: 400 }
        );
      }

      // Parse CSV with basic quote handling
      const parseLine = (line: string, sep: string): string[] => {
        const result: string[] = [];
        let current = "";
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') {
              current += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (ch === sep && !inQuotes) {
            result.push(current.trim());
            current = "";
          } else {
            current += ch;
          }
        }
        result.push(current.trim());
        return result;
      };

      headers = parseLine(lines[0], separator);
      rows = lines.slice(1, 51).map((l) => parseLine(l, separator)); // max 50 rows
    } else {
      return NextResponse.json(
        {
          error:
            "סוג קובץ לא נתמך. העלו CSV או TSV. לאקסל — שמרו קודם כ-CSV.",
        },
        { status: 400 }
      );
    }

    // Build preview text for AI
    const preview = [
      `קובץ: ${file.name}`,
      `עמודות (${headers.length}): ${headers.join(" | ")}`,
      `שורות: ${rows.length}${rows.length === 50 ? "+" : ""}`,
      "",
      "דוגמאות נתונים:",
      ...rows.slice(0, 10).map(
        (row, i) =>
          `${i + 1}. ${headers
            .map((h, j) => `${h}: ${row[j] || ""}`)
            .join(" | ")}`
      ),
    ].join("\n");

    return NextResponse.json({
      fileName: file.name,
      headers,
      rowCount: rows.length,
      preview,
      rows: rows.slice(0, 50), // send up to 50 rows for import
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
