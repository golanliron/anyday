import type { MondayBoard, MondayItem, MondayUser } from "@/types";

const MONDAY_API = "https://api.monday.com/v2";

async function mondayFetch<T>(apiKey: string, query: string): Promise<T> {
  const res = await fetch(MONDAY_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
      "API-Version": "2024-01",
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    throw new Error(`שגיאת חיבור ל-Monday (${res.status})`);
  }

  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(json.errors[0].message);
  }
  return json.data;
}

export async function getMe(apiKey: string): Promise<MondayUser> {
  const data = await mondayFetch<{ me: MondayUser }>(
    apiKey,
    `query { me { name email account { name } } }`
  );
  return data.me;
}

export async function getBoards(apiKey: string): Promise<MondayBoard[]> {
  const data = await mondayFetch<{ boards: MondayBoard[] }>(
    apiKey,
    `query { boards(limit:25) { id name description items_count columns { id title type } } }`
  );
  return data.boards;
}

export async function getItems(
  apiKey: string,
  boardId: string
): Promise<MondayItem[]> {
  const data = await mondayFetch<{
    boards: { items_page: { items: MondayItem[] } }[];
  }>(
    apiKey,
    `query { boards(ids:[${boardId}]) { items_page(limit:100) { items { id name column_values { id text column { title type } } } } } }`
  );
  return data.boards[0]?.items_page?.items || [];
}
