/**
 * המנוע השני: גיליון → Board. אותו עיקרון — קלטים שהוכחו, לא קלטים שנוחים.
 * test.todo = באג שאומת בסקירת 30.8 וטרם תוקן; הרשימה הזו היא הלו"ז שלו.
 */
import { describe, it, expect } from "vitest";
import {
  sniffDelimiter, parseDelimited, headRow, normKey, looksLikeHeader,
  isNumericValue, isDateValue, looksLikeIdentifier,
} from "../sheet-to-board";

describe("sniffDelimiter", () => {
  it("פסיק / טאב / נקודה-פסיק", () => {
    expect(sniffDelimiter("a,b,c\n1,2,3")).toBe(",");
    expect(sniffDelimiter("a\tb\tc")).toBe("\t");
    expect(sniffDelimiter("a;b;c")).toBe(";");
  });
  it("פסיק בתוך מרכאות לא נספר", () => {
    expect(sniffDelimiter('"שם, פרטי";עיר;גיל')).toBe(";");
  });
});

describe("parseDelimited — CSV אמיתי, לא split על פסיק", () => {
  it("שורות ותאים פשוטים", () => {
    expect(parseDelimited("שם,עיר\nדנה,חיפה")).toEqual([["שם", "עיר"], ["דנה", "חיפה"]]);
  });
  it("פסיק בתוך תא מצוטט נשאר תא אחד", () => {
    expect(parseDelimited('"כהן, דנה",חיפה\nלוי,עכו')).toEqual([["כהן, דנה", "חיפה"], ["לוי", "עכו"]]);
  });
  it("מרכאה כפולה בתוך תא מצוטט", () => {
    expect(parseDelimited('"בי""ס אלון",צפת')).toEqual([['בי"ס אלון', "צפת"]]);
  });
  it("BOM של אקסל לא הופך לחלק מהכותרת הראשונה", () => {
    expect(parseDelimited("﻿שם,עיר")[0][0]).toBe("שם");
  });
  it("שבירת שורה בתוך תא מצוטט לא פותחת רשומה חדשה", () => {
    expect(parseDelimited('"שורה\nשנייה",x')).toEqual([["שורה\nשנייה", "x"]]);
  });

  // 🔴 באג מתועד (קודקס): מרכאה שנפתחה ולא נסגרה בולעת את שארית הקובץ בשקט —
  // בלי שגיאה ובלי אזהרה. כשיתוקן: או שגיאה מפורשת, או התאוששות מדווחת.
  it.todo("מרכאה לא-סגורה לא אמורה לבלוע את שארית הקובץ בשקט");
});

describe("headRow / normKey / looksLikeHeader", () => {
  it("כותרת מתרחבת לרוחב השורה הרחבה ביותר", () => {
    expect(headRow([["א", "ב"], ["1", "2", "3"]])).toEqual(["א", "ב", ""]);
  });
  it("normKey מוחק רווחים כפולים ורישיות", () => {
    expect(normKey("  שם   מלא ")).toBe("שם מלא");
    expect(normKey("Full  Name")).toBe("full name");
  });
  it("שורה ראשונה נחשבת כותרת רק אם היא שמה עמודה אמיתית", () => {
    const targets = [{ title: "שם מלא" }, { title: "עיר" }];
    expect(looksLikeHeader(["שם מלא", "???"], targets)).toBe(true);
    expect(looksLikeHeader(["דנה", "חיפה"], targets)).toBe(false);
  });
});

describe("isNumericValue / isDateValue", () => {
  it("מפריד-אלפים ואחוז עדיין מספר", () => {
    expect(isNumericValue("1,234")).toBe(true);
    expect(isNumericValue("87%")).toBe(true);
    expect(isNumericValue("-3.5")).toBe(true);
  });
  it("טקסט אינו מספר", () => {
    expect(isNumericValue("שבע")).toBe(false);
    expect(isNumericValue("")).toBe(false);
  });
  it("תאריך = מה ש-parseBoardDate מקבל — קורא אחד לגיליון ולבורד", () => {
    expect(isDateValue("25.1.2026")).toBe(true);
    expect(isDateValue("2026-01-25")).toBe(true);
    expect(isDateValue("מחר")).toBe(false);
  });
});

describe("looksLikeIdentifier — מלכודת מספר-הזהות", () => {
  it("תשע ספרות ייחודיות באורך אחיד = מזהה, לא מדד", () => {
    expect(looksLikeIdentifier(["203456789", "301234567", "205678123"])).toBe(true);
  });
  it("כמויות קטנות ומתחלפות אינן מזהה", () => {
    expect(looksLikeIdentifier(["12", "7", "30"])).toBe(false);
  });

  // 🔴 באג מתועד (קודקס): הפונקציה טועה בשני הכיוונים על קלטים גבוליים —
  // הקלטים המדויקים מתועדים ב-CODEX-REVIEW.md; לקבע אותם כאן כשמתקנים.
  it.todo("קלטים גבוליים מ-CODEX-REVIEW (טעות בשני הכיוונים)");
});

// 🔴 שני באגים מתועדים ב-readSheet שדורשים fixture מלא כשמתקנים:
// 1. looksLikeDataRow מוחק שורת-אדם אמיתית ("Alice,30,TelAviv" + 2 עמודות ריקות
//    → 1/3 < 0.5) — שורה נעלמת בשקט מהייבוא.
// 2. שורות ריקות מוסרות לפני איתור blockStart ⇒ שתי טבלאות שהופרדו בשורה
//    ריקה מתמזגות לטבלה אחת.
describe("readSheet — באגים מתועדים", () => {
  it.todo("שורת אדם עם עמודות ריקות לא אמורה להימחק (Alice,30,TelAviv)");
  it.todo("שתי טבלאות מופרדות בשורה ריקה לא אמורות להתמזג");
});
