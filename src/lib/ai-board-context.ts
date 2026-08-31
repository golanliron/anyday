// The board context the AI routes feed the model — built ON THE SERVER from a
// board that was just read with the org's own token.
//
// It used to be built in the browser and posted to the route, which meant two
// things at once: the "report about your board" was really a report about
// whatever JSON the client chose to send, and board text (item names, status
// labels — third-party data anyone in the org can type) was interpolated
// straight into the SYSTEM prompt. /api/ask always did this correctly: fetch
// server-side, keep instructions in `system`, pass board text as `user` data.
// This module is that pattern, shared, so the other routes can do the same.
//
// The shape mirrors the old client-side buildBoardContext() exactly — same
// fields, same 30-item sample, same "color"-type status counting — so prompts
// built on top of it keep behaving as before.
import type { FetchedBoard } from "./board-fetch";

export interface AIBoardContext {
  boardName: string;
  itemsCount: number;
  columns: string;
  statusDistribution: string;
  sampleItems: string;
}

export function aiBoardContext(b: FetchedBoard): AIBoardContext {
  const statusDist: Record<string, number> = {};
  for (const item of b.items) {
    for (const v of item.values) {
      if (v.type === "color" && v.text) statusDist[v.text] = (statusDist[v.text] || 0) + 1;
    }
  }

  const sampleItems = b.items
    .slice(0, 30)
    .map((it) => {
      const vals = it.values.filter((v) => v.text).map((v) => `${v.title}:${v.text}`).join(", ");
      return `${it.name} (${vals})`;
    })
    .join(" | ");

  return {
    boardName: b.name,
    itemsCount: b.itemsCount,
    columns: b.columns.map((c) => `${c.id}: ${c.title} [${c.type}]`).join(", "),
    statusDistribution:
      Object.entries(statusDist).map(([k, v]) => `${k}:${v}`).join(", ") || "אין",
    sampleItems,
  };
}

/** The context as the text block the AI routes append to the USER message. */
export function aiBoardContextText(ctx: AIBoardContext): string {
  return [
    `שם: ${ctx.boardName}`,
    `מספר פריטים: ${ctx.itemsCount}`,
    `עמודות (id: title [type]): ${ctx.columns}`,
    `סטטוסים: ${ctx.statusDistribution}`,
    `פריטים לדוגמה: ${ctx.sampleItems || "אין"}`,
  ].join("\n");
}
