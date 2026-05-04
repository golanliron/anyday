import type { MondayBoard, MondayItem, AIAnalysis } from "@/types";

export async function loadBoard(boardId: string, apiToken: string): Promise<{
  board: MondayBoard;
  items: MondayItem[];
}> {
  const res = await fetch("/api/monday", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "board", boardId, apiToken }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

export async function listBoards(apiToken: string): Promise<{ id: string; name: string; items_count: number; description: string }[]> {
  const res = await fetch("/api/monday", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "list_boards", apiToken }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.boards;
}

export async function changeColumnValue(
  boardId: string, apiToken: string, itemId: string, columnId: string, value: unknown
): Promise<void> {
  const res = await fetch("/api/monday", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "change_value", boardId, apiToken, itemId, columnId, value }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
}

export async function changeSimpleValue(
  boardId: string, apiToken: string, itemId: string, columnId: string, value: string
): Promise<void> {
  const res = await fetch("/api/monday", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "change_simple", boardId, apiToken, itemId, columnId, value }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
}

export async function createItem(
  boardId: string, apiToken: string, itemName: string, groupId?: string
): Promise<{ id: string; name: string }> {
  const res = await fetch("/api/monday", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "create_item", boardId, apiToken, itemName, groupId }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.item;
}

export async function analyzeBoardAI(
  boardName: string,
  itemsCount: number,
  columns: string,
  statusDistribution: string
): Promise<AIAnalysis> {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ boardName, itemsCount, columns, statusDistribution }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}
