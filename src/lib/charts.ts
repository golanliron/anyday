import type { MondayBoard, MondayItem, ChartData } from "@/types";

export const PIE_COLORS = [
  "#FF2D87",
  "#22D3EE",
  "#2ED573",
  "#FFA502",
  "#FF6B35",
  "#FF4757",
  "#A78BFA",
  "#34D399",
];

export interface SmartInsight {
  icon: string;
  title: string;
  value: string;
  color: string;
}

export interface BoardAnalytics {
  statusData: ChartData[];
  peopleData: ChartData[];
  textDistributions: { title: string; data: ChartData[] }[];
  dateTimeline: ChartData[];
  insights: SmartInsight[];
  healthScore: { score: number; color: string; label: string };
}

export function analyzeBoard(
  board: MondayBoard,
  items: MondayItem[]
): BoardAnalytics {
  const statusMap: Record<string, number> = {};
  const peopleMap: Record<string, number> = {};
  const textColumns: Record<string, Record<string, number>> = {};
  const dateMap: Record<string, number> = {};

  // Scan all column values
  items.forEach((item) =>
    item.column_values.forEach((cv) => {
      const val = cv.text?.trim();
      if (!val) return;

      if (cv.column.type === "color") {
        statusMap[val] = (statusMap[val] || 0) + 1;
      } else if (cv.column.type === "multiple-person") {
        val.split(",").forEach((p) => {
          const name = p.trim().split(" ")[0];
          if (name) peopleMap[name] = (peopleMap[name] || 0) + 1;
        });
      } else if (cv.column.type === "date") {
        // Group by month
        const match = val.match(/^(\d{4}-\d{2})/);
        if (match) {
          dateMap[match[1]] = (dateMap[match[1]] || 0) + 1;
        }
      } else if (cv.column.type === "text" || cv.column.type === "dropdown") {
        // Build distribution for text columns with reasonable cardinality
        const colTitle = cv.column.title;
        if (!textColumns[colTitle]) textColumns[colTitle] = {};
        textColumns[colTitle][val] = (textColumns[colTitle][val] || 0) + 1;
      }
    })
  );

  const statusData = toChartData(statusMap, 6);
  const peopleData = toChartData(peopleMap, 8);

  // Filter text distributions - only columns with 2-10 unique values (useful for charts)
  const textDistributions: { title: string; data: ChartData[] }[] = [];
  for (const [title, map] of Object.entries(textColumns)) {
    const uniqueCount = Object.keys(map).length;
    if (uniqueCount >= 2 && uniqueCount <= 15) {
      textDistributions.push({ title, data: toChartData(map, 8) });
    }
  }

  // Date timeline
  const dateTimeline = Object.entries(dateMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Smart insights
  const insights: SmartInsight[] = [];

  // Total items
  insights.push({
    icon: "📋",
    title: 'סה"כ פריטים',
    value: String(items.length),
    color: "var(--color-accent)",
  });

  // Most common text value from largest text distribution
  if (textDistributions.length > 0) {
    const biggest = textDistributions[0];
    insights.push({
      icon: "🏆",
      title: `הכי נפוץ ב-${biggest.title}`,
      value: `${biggest.data[0].name} (${biggest.data[0].value})`,
      color: "var(--color-green)",
    });
  }

  // Busiest person
  if (peopleData.length > 0) {
    insights.push({
      icon: "👤",
      title: "הכי עמוס",
      value: `${peopleData[0].name} (${peopleData[0].value} פריטים)`,
      color: "var(--color-red)",
    });
  }

  // Recent activity (this month/week)
  if (dateTimeline.length > 0) {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const thisMonthCount = dateMap[thisMonth] || 0;
    insights.push({
      icon: "📅",
      title: "החודש",
      value: `${thisMonthCount} פריטים חדשים`,
      color: "var(--color-blue)",
    });
  }

  // Columns count
  insights.push({
    icon: "📐",
    title: "עמודות",
    value: String(board.columns.length),
    color: "var(--color-muted)",
  });

  // Health score
  const healthScore = calcHealthScore(items, statusData);

  return {
    statusData,
    peopleData,
    textDistributions,
    dateTimeline,
    insights,
    healthScore,
  };
}

function toChartData(map: Record<string, number>, limit: number): ChartData[] {
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

function calcHealthScore(
  items: MondayItem[],
  statusData: ChartData[]
): { score: number; color: string; label: string } {
  if (items.length === 0)
    return { score: 0, color: "var(--color-muted)", label: "ריק" };

  const total = items.length;
  const stuckKeywords = ["תקוע", "stuck", "blocked", "עיכוב", "ממתין"];
  const doneKeywords = ["הושלם", "done", "סיום", "בוצע", "completed"];

  let stuckCount = 0;
  let doneCount = 0;
  statusData.forEach((s) => {
    const lower = s.name.toLowerCase();
    if (stuckKeywords.some((k) => lower.includes(k))) stuckCount += s.value;
    if (doneKeywords.some((k) => lower.includes(k))) doneCount += s.value;
  });

  const doneRatio = doneCount / total;
  const stuckRatio = stuckCount / total;

  let score = Math.round(50 + doneRatio * 40 - stuckRatio * 30);
  score = Math.max(10, Math.min(100, score));

  if (score >= 70) return { score, color: "var(--color-green)", label: "תקין" };
  if (score >= 40) return { score, color: "#E67E22", label: "דורש תשומת לב" };
  return { score, color: "var(--color-red)", label: "בעייתי" };
}
