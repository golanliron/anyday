/**
 * AnyDay Health Engine - v0.2 (enriched findings)
 *
 * Pure logic module. No API calls, no UI, no side effects.
 * Receives Monday board data and returns a HealthCheckResult.
 *
 * v0.2 changes:
 * - All findings now include enriched fields: summary, whyItMatters, recommendedAction, confidence, canBeFixedAutomatically
 * - Added check #9: checkMissingManagementColumns (identifies boards missing status/person/date columns by type)
 * - Signature of runHealthCheck unchanged (backward-compatible)
 */

import type { MondayBoard, MondayItem } from "@/types";
import type { HealthCheckResult, HealthFinding, FindingSeverity } from "@/types/health";
import { parseBoardDate } from "./board-intelligence";

// ============================================================
// Check #1: Empty board
// ============================================================

function checkEmptyBoard(board: MondayBoard, items: MondayItem[]): HealthFinding[] {
  if (items.length === 0) {
    return [{
      id: `empty-${board.id}`,
      category: "structure",
      severity: "warning",
      title: "בורד ריק",
      description: `הבורד "${board.name}" לא מכיל פריטים.`,
      boardId: board.id,
      boardName: board.name,
      affectedItems: 0,
      suggestion: "שקלו למחוק בורדים ריקים או להתחיל להשתמש בהם.",
      summary: `הבורד "${board.name}" קיים במערכת אבל ריק לחלוטין, בלי אף פריט אחד.`,
      whyItMatters: "בורדים ריקים יוצרים עומס ויזואלי ומקשים על הצוות למצוא את המידע הרלוונטי. ככל שיש יותר בורדים לא פעילים, כך קשה יותר לנהל את סביבת העבודה.",
      recommendedAction: "בדקו האם הבורד הזה עדיין נחוץ. אם כן, התחילו להוסיף אליו פריטים. אם לא, מחקו אותו או העבירו אותו לארכיון כדי לשמור על סביבת עבודה נקייה.",
      confidence: "high",
      canBeFixedAutomatically: false,
    }];
  }
  return [];
}

// ============================================================
// Check #2: Missing owners
// ============================================================

function checkMissingOwners(board: MondayBoard, items: MondayItem[]): HealthFinding[] {
  const personColumns = board.columns.filter(c =>
    c.type === "multiple-person" || c.type === "person"
  );
  if (personColumns.length === 0) return [];

  const noOwner = items.filter(item =>
    personColumns.every(pc => {
      const val = item.column_values.find(cv => cv.id === pc.id);
      return !val || !val.text || val.text.trim() === "";
    })
  );

  if (noOwner.length === 0) return [];

  const severity: FindingSeverity = noOwner.length > items.length * 0.5 ? "critical" : "warning";
  const pct = Math.round((noOwner.length / items.length) * 100);

  return [{
    id: `no-owner-${board.id}`,
    category: "permissions",
    severity,
    title: "פריטים ללא אחראי",
    description: `${noOwner.length} מתוך ${items.length} פריטים בבורד "${board.name}" לא משויכים לאף אחד.`,
    boardId: board.id,
    boardName: board.name,
    affectedItems: noOwner.length,
    suggestion: "שייכו אחראי לכל משימה כדי שלא ייפלו בין הכיסאות.",
    summary: `מצאנו ${noOwner.length} פריטים (${pct}%) בבורד "${board.name}" שלא משויכים לאף אדם בצוות.`,
    whyItMatters: "כשאין בעלות ברורה על משימה, אף אחד לא מרגיש אחראי להתקדמות שלה. זה גורם למשימות להיתקע, ליפול בין הכיסאות, או להתגלות רק כשכבר מאוחר מדי.",
    recommendedAction: "עברו על הפריטים ללא אחראי ושייכו לכל אחד מהם בעל תפקיד. מומלץ גם ליצור כלל עבודה שבו כל משימה חדשה מקבלת בעלים כבר בשלב הפתיחה.",
    confidence: "high",
    canBeFixedAutomatically: false,
  }];
}

// ============================================================
// Check #3: Stuck items
// ============================================================

function checkStuckItems(board: MondayBoard, items: MondayItem[]): HealthFinding[] {
  const stuckKeywords = ["תקוע", "stuck", "blocked", "עיכוב", "חסום"];

  const stuck = items.filter(item =>
    item.column_values.some(cv =>
      cv.text && stuckKeywords.some(kw => cv.text.toLowerCase().includes(kw))
    )
  );

  if (stuck.length === 0) return [];

  const severity: FindingSeverity = stuck.length > 5 ? "critical" : "warning";

  return [{
    id: `stuck-${board.id}`,
    category: "workflow",
    severity,
    title: "פריטים תקועים",
    description: `${stuck.length} פריטים בבורד "${board.name}" מסומנים כתקועים או חסומים.`,
    boardId: board.id,
    boardName: board.name,
    affectedItems: stuck.length,
    suggestion: "בדקו מה חוסם את הפריטים האלה ונסו לפתור או להסלים.",
    summary: `${stuck.length} פריטים בבורד "${board.name}" נמצאים בסטטוס תקוע או חסום ולא מתקדמים.`,
    whyItMatters: "פריטים תקועים הם סימן לצוואר בקבוק בתהליך העבודה. ככל שהם נשארים תקועים יותר זמן, כך הם מצטברים ויוצרים עומס שמשפיע על כל הצוות.",
    recommendedAction: "בדקו כל פריט תקוע וזהו מה בדיוק חוסם אותו. אם יש תלות בגורם חיצוני, סמנו את זה בבירור. אם הבעיה דורשת הסלמה, העבירו אותה למנהל הרלוונטי.",
    confidence: "high",
    canBeFixedAutomatically: false,
  }];
}

// ============================================================
// Check #4: Empty columns
// ============================================================

function checkEmptyColumns(board: MondayBoard, items: MondayItem[]): HealthFinding[] {
  if (items.length === 0) return [];

  const emptyColumns = board.columns.filter(col => {
    const filled = items.filter(item => {
      const val = item.column_values.find(cv => cv.id === col.id);
      return val && val.text && val.text.trim() !== "";
    });
    return filled.length === 0;
  });

  if (emptyColumns.length === 0) return [];

  const names = emptyColumns.map(c => c.title).join(", ");

  return [{
    id: `empty-cols-${board.id}`,
    category: "data",
    severity: "info",
    title: "עמודות ריקות לחלוטין",
    description: `${emptyColumns.length} עמודות בבורד "${board.name}" ריקות לגמרי: ${names}.`,
    boardId: board.id,
    boardName: board.name,
    affectedItems: 0,
    suggestion: "עמודות ריקות מבלבלות. שקלו למחוק או להסתיר אותן.",
    summary: `בבורד "${board.name}" יש ${emptyColumns.length} עמודות שאף אחד לא ממלא: ${names}.`,
    whyItMatters: "עמודות ריקות מרעישות את הממשק ומבלבלות את הצוות. הן גורמות למשתמשים לתהות אם צריך למלא אותן, ויוצרות תחושה שהבורד לא מתוחזק.",
    recommendedAction: "עברו על העמודות הריקות והחליטו לגבי כל אחת: אם היא נחוצה, הגדירו מי אחראי למלא אותה. אם לא, הסתירו או מחקו אותה.",
    confidence: "high",
    canBeFixedAutomatically: true,
  }];
}

// ============================================================
// Check #5: Missing dates
// ============================================================

function checkMissingDates(board: MondayBoard, items: MondayItem[]): HealthFinding[] {
  const dateColumns = board.columns.filter(c => c.type === "date");
  if (dateColumns.length === 0) return [];

  const noDate = items.filter(item =>
    dateColumns.every(dc => {
      const val = item.column_values.find(cv => cv.id === dc.id);
      return !val || !val.text || val.text.trim() === "";
    })
  );

  if (noDate.length === 0 || noDate.length < items.length * 0.3) return [];

  const pct = Math.round((noDate.length / items.length) * 100);

  return [{
    id: `no-dates-${board.id}`,
    category: "data",
    severity: "warning",
    title: "פריטים ללא תאריכים",
    description: `${noDate.length} מתוך ${items.length} פריטים בבורד "${board.name}" חסרי תאריך יעד.`,
    boardId: board.id,
    boardName: board.name,
    affectedItems: noDate.length,
    suggestion: "הוסיפו תאריכי יעד כדי לעקוב אחרי לוחות זמנים.",
    summary: `${noDate.length} פריטים (${pct}%) בבורד "${board.name}" לא מכילים תאריך יעד, מה שמקשה על מעקב אחרי לוחות זמנים.`,
    whyItMatters: "בלי תאריכי יעד אי אפשר לדעת מה דחוף ומה לא, אי אפשר לראות עומסים בלוח הזמנים, ואי אפשר לזהות איחורים לפני שהם הופכים לבעיה.",
    recommendedAction: "הגדירו תאריך יעד לכל פריט פתוח. אם חלק מהפריטים הם רעיונות או משימות ללא דדליין, סמנו אותם בסטטוס מתאים כדי להבדיל בינם לבין משימות אקטיביות.",
    confidence: "high",
    canBeFixedAutomatically: false,
  }];
}

// ============================================================
// Check #6: Overdue items
// ============================================================

function checkOverdueItems(board: MondayBoard, items: MondayItem[]): HealthFinding[] {
  const dateColumns = board.columns.filter(c => c.type === "date");
  if (dateColumns.length === 0) return [];

  const doneKeywords = ["הושלם", "done", "סיום", "בוצע", "completed", "גמור"];
  const now = Date.now();

  const overdue = items.filter(item => {
    const isDone = item.column_values.some(cv =>
      cv.text && doneKeywords.some(kw => cv.text.toLowerCase().includes(kw))
    );
    if (isDone) return false;

    return dateColumns.some(dc => {
      const val = item.column_values.find(cv => cv.id === dc.id);
      if (!val || !val.text) return false;
      /* parseBoardDate ולא new Date(): תאריך כתוב יום-קודם ("25.1.2026") הוא
         Invalid Date ב-JS, ולכן פריט באיחור עם תאריך כזה פשוט נעלם מהבדיקה —
         בדיוק הפריט שהבדיקה קיימת בשבילו. board-intelligence כבר יודע לקרוא
         את כל מה שמונדיי מחזיר; זה אותו קורא, לא שני. */
      const p = parseBoardDate(val.text);
      return p !== null && p.at < now;
    });
  });

  if (overdue.length === 0) return [];

  const severity: FindingSeverity = overdue.length > 10 ? "critical" : "warning";

  return [{
    id: `overdue-${board.id}`,
    category: "workflow",
    severity,
    title: "פריטים באיחור",
    description: `${overdue.length} פריטים בבורד "${board.name}" עברו את תאריך היעד ועדיין לא הושלמו.`,
    boardId: board.id,
    boardName: board.name,
    affectedItems: overdue.length,
    suggestion: "טפלו בפריטים שבאיחור או עדכנו את תאריכי היעד.",
    summary: `${overdue.length} פריטים בבורד "${board.name}" עברו את הדדליין שלהם ועדיין לא סומנו כמושלמים.`,
    whyItMatters: "פריטים באיחור פוגעים באמינות של לוח הזמנים כולו. אם המערכת מלאה באיחורים שלא מטופלים, הצוות מפסיק להתייחס לתאריכי יעד ברצינות, והבורד מאבד את הערך שלו ככלי ניהול.",
    recommendedAction: "עברו על כל פריט באיחור והחליטו: אם הוא עדיין רלוונטי, עדכנו את תאריך היעד ליעד ריאלי. אם הוא הושלם, סמנו אותו כ-Done. אם הוא כבר לא רלוונטי, העבירו אותו לארכיון.",
    confidence: "high",
    canBeFixedAutomatically: true,
  }];
}

// ============================================================
// Check #7: Low data quality
// ============================================================

function checkLowDataQuality(board: MondayBoard, items: MondayItem[]): HealthFinding[] {
  if (items.length === 0) return [];

  let totalCells = 0;
  let emptyCells = 0;

  for (const item of items) {
    for (const cv of item.column_values) {
      totalCells++;
      if (!cv.text || cv.text.trim() === "") emptyCells++;
    }
  }

  if (totalCells === 0) return [];

  const emptyRate = emptyCells / totalCells;
  if (emptyRate < 0.4) return [];

  const severity: FindingSeverity = emptyRate > 0.7 ? "critical" : "warning";
  const pct = Math.round(emptyRate * 100);

  return [{
    id: `data-quality-${board.id}`,
    category: "data",
    severity,
    title: "שלמות נתונים נמוכה",
    description: `${pct}% מהשדות בבורד "${board.name}" ריקים.`,
    boardId: board.id,
    boardName: board.name,
    affectedItems: items.length,
    suggestion: "מלאו שדות חסרים או הסירו עמודות שלא בשימוש.",
    summary: `בבורד "${board.name}" רק ${100 - pct}% מהשדות מלאים. רוב המידע חסר.`,
    whyItMatters: "כשרוב השדות ריקים, הבורד לא יכול לשמש ככלי ניהול אפקטיבי. אי אפשר לסנן, למיין, או להפיק דוחות מנתונים שלא קיימים. הבורד הופך לרשימה פשוטה במקום כלי עבודה.",
    recommendedAction: "בדקו אילו עמודות באמת חשובות לתהליך העבודה שלכם. עמודות שאף אחד לא ממלא כנראה מיותרות ועדיף להסתיר אותן. את העמודות שנשארות, הגדירו כשדות חובה או הוסיפו תזכורות למילוי.",
    confidence: "medium",
    canBeFixedAutomatically: false,
  }];
}

// ============================================================
// Check #8: Unclear board names
// ============================================================

function checkUnclearNames(board: MondayBoard): HealthFinding[] {
  const badNames = ["board", "test", "ללא שם", "untitled", "new board", "חדש", "בורד"];
  const name = board.name.toLowerCase().trim();

  if (badNames.some(bad => name === bad || name.startsWith(bad + " "))) {
    return [{
      id: `bad-name-${board.id}`,
      category: "structure",
      severity: "info",
      title: "שם בורד לא ברור",
      description: `לבורד "${board.name}" שם גנרי שלא מסביר מה הוא מכיל.`,
      boardId: board.id,
      boardName: board.name,
      suggestion: "תנו לבורד שם ברור שמתאר את התוכן שלו.",
      summary: `הבורד "${board.name}" נושא שם גנרי שלא אומר לצוות מה הוא מכיל או למה הוא משמש.`,
      whyItMatters: "שמות בורדים לא ברורים מקשים על חברי הצוות למצוא את המידע שהם צריכים. כשיש הרבה בורדים, שם גנרי כמו \"Board\" או \"Test\" גורם לבלבול ולבזבוז זמן.",
      recommendedAction: "שנו את שם הבורד לשם שמתאר בבירור את התוכן או התהליך שהוא מנהל. לדוגמה: \"ניהול פרויקט אתר חדש\" או \"מעקב לקוחות Q1\".",
      confidence: "medium",
      canBeFixedAutomatically: true,
    }];
  }
  return [];
}

// ============================================================
// Check #9: Missing management columns (NEW)
// ============================================================

// Column types that indicate management capability
const STATUS_TYPES = ["color", "status"];
const PERSON_TYPES = ["multiple-person", "person"];
const DATE_TYPES = ["date", "timeline"];

function checkMissingManagementColumns(board: MondayBoard, items: MondayItem[]): HealthFinding[] {
  // Only relevant for boards with items (non-empty boards)
  if (items.length === 0) return [];

  const hasStatus = board.columns.some(c => STATUS_TYPES.includes(c.type));
  const hasPerson = board.columns.some(c => PERSON_TYPES.includes(c.type));
  const hasDate = board.columns.some(c => DATE_TYPES.includes(c.type));

  const missing: string[] = [];
  if (!hasStatus) missing.push("סטטוס");
  if (!hasPerson) missing.push("אחראי");
  if (!hasDate) missing.push("תאריך יעד");

  // Only flag if at least 2 management columns are missing
  if (missing.length < 2) return [];

  return [{
    id: `missing-mgmt-cols-${board.id}`,
    category: "structure",
    severity: "warning",
    title: "חסרים שדות ניהוליים בסיסיים",
    description: `בבורד "${board.name}" חסרים שדות ניהוליים: ${missing.join(", ")}.`,
    boardId: board.id,
    boardName: board.name,
    affectedItems: items.length,
    suggestion: `הוסיפו לבורד עמודות של ${missing.join(" ו")}.`,
    summary: `הבורד "${board.name}" מכיל ${items.length} פריטים אבל חסרים בו שדות ניהוליים בסיסיים: ${missing.join(", ")}. בלי השדות האלה, קשה מאוד לנהל את העבודה בצורה מסודרת.`,
    whyItMatters: "בורד ניהולי אפקטיבי צריך לפחות שלושה דברים: סטטוס כדי לדעת מה המצב של כל פריט, אחראי כדי לדעת מי מטפל, ותאריך יעד כדי לדעת מתי צריך לסיים. בלי השדות האלה, הבורד הוא בסך הכל רשימה בלי יכולת מעקב ובקרה.",
    recommendedAction: `הוסיפו לבורד "${board.name}" את העמודות החסרות: ${missing.map(m => {
      if (m === "סטטוס") return "עמודת Status עם ערכים כמו \"בעבודה\", \"הושלם\", \"ממתין\"";
      if (m === "אחראי") return "עמודת People כדי לשייך אחראי לכל פריט";
      return "עמודת Date כדי להגדיר תאריך יעד";
    }).join(". ")}. אחרי שתוסיפו, מלאו את הנתונים לפחות לפריטים הפעילים.`,
    confidence: "high",
    canBeFixedAutomatically: false,
  }];
}

// ============================================================
// Main engine - runs all checks and computes score
// ============================================================

const ALL_CHECKS = [
  checkEmptyBoard,
  checkMissingOwners,
  checkStuckItems,
  checkEmptyColumns,
  checkMissingDates,
  checkOverdueItems,
  checkLowDataQuality,
  checkMissingManagementColumns,
];

const NAME_CHECK = checkUnclearNames;

export function runHealthCheck(
  boards: MondayBoard[],
  itemsByBoard: Map<string, MondayItem[]>
): HealthCheckResult {
  const findings: HealthFinding[] = [];
  let totalItems = 0;

  for (const board of boards) {
    const items = itemsByBoard.get(board.id) || [];
    totalItems += items.length;

    // Run name check (doesn't need items)
    findings.push(...NAME_CHECK(board));

    // Run all data checks
    for (const check of ALL_CHECKS) {
      findings.push(...check(board, items));
    }
  }

  const summary = {
    critical: findings.filter(f => f.severity === "critical").length,
    warning: findings.filter(f => f.severity === "warning").length,
    info: findings.filter(f => f.severity === "info").length,
  };

  // Score: start at 100, deduct per finding
  const deductions = {
    critical: 15,
    warning: 7,
    info: 2,
  };

  let score = 100
    - summary.critical * deductions.critical
    - summary.warning * deductions.warning
    - summary.info * deductions.info;

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    scannedAt: new Date().toISOString(),
    boardsScanned: boards.length,
    totalItems,
    findings,
    summary,
  };
}
