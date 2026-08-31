/**
 * הבדיקות הראשונות בריפו — על המנוע הטהור שכל המוצר נשען עליו.
 *
 * הקלטים כאן אינם מומצאים: אלה בדיוק הקלטים שהוכחו בסקירת 30.8 (FINAL.md)
 * כעובדים או כשבורים. בדיקה על קלט שהוכח היא תיעוד חי; בדיקה על קלט מומצא
 * היא ניחוש.
 *
 * test.todo = באג ידוע ומתועד שטרם תוקן. כשהבאג יתוקן — ה-todo הופך לבדיקה.
 */
import { describe, it, expect } from "vitest";
import { parseBoardDate, toneFromColor, toneOf, labelTones } from "../board-intelligence";
import type { Col } from "../board-intelligence";

describe("parseBoardDate — הקורא האחד של תאריכים", () => {
  it("קורא ISO", () => {
    expect(parseBoardDate("2026-02-03")?.iso).toBe("2026-02-03");
  });

  it("קורא ISO עם שעה", () => {
    expect(parseBoardDate("2026-02-03 14:30")?.iso).toBe("2026-02-03");
  });

  it("טווח timeline מחזיר את ההתחלה", () => {
    expect(parseBoardDate("2026-02-03 - 2026-03-01")?.iso).toBe("2026-02-03");
  });

  it("תאריך כתוב יום-קודם — הקלט שהפיל את health-engine (S-5)", () => {
    // new Date("25.1.2026") הוא Invalid Date; parseBoardDate חייב לקרוא אותו.
    expect(parseBoardDate("25.1.2026")?.iso).toBe("2026-01-25");
  });

  it("שנה דו-ספרתית מושלמת ל-2000+", () => {
    expect(parseBoardDate("3/2/26")?.iso).toBe("2026-02-03");
  });

  it("חודש לא-קיים = null, לא ניחוש", () => {
    expect(parseBoardDate("25.13.2026")).toBeNull();
  });

  it("תאריך לא-קיים בלוח השנה = null (31.2 מתגלגל ב-JS — כאן לא)", () => {
    expect(parseBoardDate("31.2.2026")).toBeNull();
  });

  it("טקסט חופשי = null", () => {
    expect(parseBoardDate("מחר בבוקר")).toBeNull();
    expect(parseBoardDate("")).toBeNull();
  });

  it("at הוא חצות מקומית של אותו יום", () => {
    const p = parseBoardDate("2026-02-03")!;
    const d = new Date(p.at);
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 1, 3, 0]);
  });
});

describe("toneFromColor — גוון, לא מילה (עקרון הזהב)", () => {
  it("אדום מונדיי = סיכון", () => {
    expect(toneFromColor("#e2445c")).toBe("risk");
  });
  it("ירוק מונדיי = הושלם", () => {
    expect(toneFromColor("#00c875")).toBe("done");
  });
  it("כתום = בתהליך", () => {
    expect(toneFromColor("#fdab3d")).toBe("progress");
  });
  it("כחול = ניטרלי (אינפורמטיבי)", () => {
    expect(toneFromColor("#579bfc")).toBe("neutral");
  });
  it("אפור בלי רוויה = ניטרלי, אין איתות", () => {
    expect(toneFromColor("#c4c4c4")).toBe("neutral");
  });
  it("קלט שאינו צבע = ניטרלי, לא קריסה", () => {
    expect(toneFromColor("לא-צבע")).toBe("neutral");
  });
});

/** עמודת סטטוס בשני הפורמטים שמונדיי מחזיר. */
const classicCol: Col = {
  id: "status", title: "סטטוס", type: "color",
  settings_str: JSON.stringify({
    labels: { "0": "בעיה", "1": "הושלם" },
    labels_colors: { "0": { color: "#00c875" }, "1": { color: "#e2445c" } },
  }),
};

describe("toneOf — הצבע גובר על המילה", () => {
  it("תווית 'בעיה' שצבועה ירוק היא done — המילה לא מדברת כשיש צבע", () => {
    // זה לב עקרון הזהב: ארגון שאצלו "בעיה" מסומנת ירוק צודק לגבי עצמו.
    expect(toneOf(classicCol, "בעיה")).toBe("done");
  });

  it("בלי settings_str — ורק אז — מילת-סיכון מדברת", () => {
    const bare: Col = { id: "d", title: "שלב", type: "dropdown" };
    expect(toneOf(bare, "תקוע")).toBe("risk");
    expect(toneOf(bare, "רגיל")).toBe("neutral");
  });

  it("ערך ריק = ניטרלי", () => {
    expect(toneOf(classicCol, "")).toBe("neutral");
  });

  // 🔴 באג מתועד (קודקס, 30.8): כשמפת הצבעים קיימת אך חלקית, ערך שאינו בה
  // נופל למילון המילים — בניגוד להערה בקוד (שורות 132–138) שמבטיחה שעמודה
  // צבועה לעולם לא מגיעה לשם. כשיתוקן: ציפייה = neutral.
  it.todo("ערך מחוץ למפת-צבע חלקית לא אמור ליפול למילון המילים");
});

describe("labelTones — שני הפורמטים של מונדיי", () => {
  it("פורמט קלאסי: labels + labels_colors", () => {
    expect(labelTones(classicCol)).toEqual({ "בעיה": "done", "הושלם": "risk" });
  });

  it("פורמט חדש: מערך [{name, color}]", () => {
    const col: Col = {
      id: "s2", title: "מצב", type: "color",
      settings_str: JSON.stringify({ labels: [{ id: 1, name: "פתוח", color: "#fdab3d" }] }),
    };
    expect(labelTones(col)).toEqual({ "פתוח": "progress" });
  });

  it("dropdown בלי צבעים = null (ולא מפה ריקה)", () => {
    const col: Col = {
      id: "d2", title: "סוג", type: "dropdown",
      settings_str: JSON.stringify({ labels: [{ id: 1, name: "רגיל" }] }),
    };
    expect(labelTones(col)).toBeNull();
  });

  it("settings_str שבור = null, לא קריסה", () => {
    const col: Col = { id: "b", title: "x", type: "color", settings_str: "{not json" };
    expect(labelTones(col)).toBeNull();
  });
});
