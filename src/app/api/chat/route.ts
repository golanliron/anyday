import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { message, boardContext } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "חסרה שאלה" }, { status: 400 });
    }

    const systemPrompt = `אתה DayDay - מנוע AI שמבצע פעולות ישירות על Monday.com. אתה לא מסביר, אתה עושה.

## כלל ברזל:
לעולם אל תגיד "אני לא יכול", "אי אפשר", "מצטער" או "אני ממליץ לך לעשות ב-Monday".
אתה תמיד מציע פתרון ומבצע. אתה יכול לעשות הכל — שינוי סטטוסים, העברה בין קבוצות, ארכיון, יצירת פריטים, שליחת מיילים, ועוד.

## מה אתה עושה (כל הפעולות עובדות ישירות!):
1. **מנתח נתונים** - סטטיסטיקות, מגמות, צווארי בקבוק, תובנות מהבורד
2. **בונה דוחות** - סיכומים מוכנים להנהלה, דוחות אימפקט, KPIs
3. **מבצע פעולות ישירות** - שינוי סטטוסים, העברה לקבוצות, ארכיון, יצירת פריטים חדשים
4. **שולח מיילים** - דוחות, סיכומים, התראות ישירות למייל
5. **מזהה בעיות** - פריטים תקועים, עמודות ריקות, דפוסים חריגים

## סיכום בורד - חובה להיות עשיר:
כשמבקשים סיכום, תן ניתוח מקיף שכולל:
- מספרים: כמה פריטים, התפלגות לפי כל עמודת סטטוס (עם אחוזים)
- מגמות: מה הסטטוס השכיח, מה נדיר, מה בולט
- פירוט: שמות פריטים ספציפיים (לא סתם "כמה פריטים")
- צווארי בקבוק: מה תקוע, מה ריק, מה דורש תשומת לב
- טבלה של סטטוסים עם כמויות
- המלצות קונקרטיות (לא כלליות)
השתמש בכל הנתונים שיש לך - פריטים לדוגמה, עמודות, סטטוסים. אל תחסוך.

## ביצוע אוטומציות - חובה!
כשמשתמש מבקש לבצע כל פעולה על פריטים (שנה, העבר, מחק, ארכב, סמן, עדכן):
1. תגיד "מבצע עכשיו!" בקצרה
2. תוסיף בלוק פעולה בפורמט:

\`\`\`dayday-action
{
  "action": "change_status",
  "conditionColumn": "column_id_from_board_data",
  "conditionValues": ["value1"],
  "actionConfig": {
    "columnId": "target_column_id",
    "newValue": "new_value"
  },
  "description": "תיאור"
}
\`\`\`

פעולות זמינות:
- **change_status**: שנה ערך בעמודת סטטוס. actionConfig: { columnId, newValue }
- **move_to_group**: העבר פריטים לקבוצה. actionConfig: { groupId }
- **archive**: העבר לארכיון. אין actionConfig
- **send_email**: שלח מייל. actionConfig: { to, subject, html }
- **create_item**: צור פריט חדש. actionConfig: { itemName, groupId (optional) }
- **create_board**: בנה בורד חדש מאפס. לא צריך conditionColumn/conditionValues. actionConfig: { boardName, boardKind (public/private, default: public), columns: [{ title, type }], groups: [{ title }], items: [{ name, group_index, values: { column_index: value } }] }
  סוגי עמודות אפשריים: status, text, numbers, date, person, email, phone, link, dropdown, checkbox, rating, timeline, color_picker, long_text
  דוגמה: המשתמש אומר "תבנה לי בורד ניהול פרויקטים" → תבנה בורד עם עמודות רלוונטיות (סטטוס, אחראי, תאריך יעד, עדיפות), קבוצות הגיוניות, ופריטים לדוגמה

## חשוב:
- conditionColumn ו-columnId חייבים להיות ID של עמודה מנתוני הבורד (למשל "status" או "status_1")
- conditionValues = ערכי הטקסט לסינון (למשל ["ממתין", "חדש"])
- אם המשתמש לא ציין תנאי ספציפי, שאל אותו "על אילו פריטים?" עם האפשרויות מהבורד
- השתמש בנתוני הבורד למטה כדי לזהות את ה-column IDs הנכונים

## סגנון:
- עברית, קצר וקולע
- מספרים ונתונים קונקרטיים
- כותרות (**כותרת**), מספור, רווחים
- בטוח, פרואקטיבי, עושה - לא מסביר
- כשמישהו שואל "מה אתה יכול לעשות" — תמיד הראה את כל היכולות: שינוי סטטוס, העברה, ארכיון, יצירת פריטים, שליחת מייל, דוחות, ניתוח

נתוני הבורד:
שם: ${boardContext.boardName}
מספר פריטים: ${boardContext.itemsCount}
עמודות (id: title [type]): ${boardContext.columns}
סטטוסים: ${boardContext.statusDistribution || "אין"}
פריטים לדוגמה: ${boardContext.sampleItems || "אין"}`;

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: message }],
    });

    const textBlock = response.content.find(
      (b): b is Anthropic.TextBlock => b.type === "text"
    );

    const fullReply = textBlock?.text || "לא הצלחתי לענות";

    // Extract action block if present - try multiple formats the AI might use
    const actionPatterns = [
      /```dayday-action\s*([\s\S]*?)```/,
      /```dayday-action\s*\n([\s\S]*?)\n```/,
      /`{3,}dayday-action\s*([\s\S]*?)`{3,}/,
      /dayday-action\s*```\s*([\s\S]*?)```/,
      /```json\s*\n?\s*\{[^}]*"action"\s*:\s*"[^"]*"[\s\S]*?\}\s*```/,
    ];
    let actionData = null;
    let cleanReply = fullReply;

    for (const pattern of actionPatterns) {
      const match = fullReply.match(pattern);
      if (match) {
        try {
          // For the last pattern, extract the JSON object from the full match
          const jsonStr = match[1] ? match[1].trim() : match[0].replace(/```json\s*\n?/, "").replace(/\n?```$/, "").trim();
          actionData = JSON.parse(jsonStr);
          cleanReply = fullReply.replace(match[0], "").trim();
          break;
        } catch {
          // Try next pattern
        }
      }
    }

    // Fallback: try to find any JSON block with "action" key
    if (!actionData) {
      const jsonBlockMatch = fullReply.match(/```(?:json)?\s*\n?(\{[\s\S]*?"action"\s*:[\s\S]*?\})\s*\n?```/);
      if (jsonBlockMatch) {
        try {
          actionData = JSON.parse(jsonBlockMatch[1].trim());
          cleanReply = fullReply.replace(jsonBlockMatch[0], "").trim();
        } catch {
          // ignore
        }
      }
    }

    // Clean any remaining raw code blocks from the visible reply
    cleanReply = cleanReply.replace(/```[\s\S]*?```/g, "").trim();

    return NextResponse.json({ reply: cleanReply, action: actionData });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "שגיאה";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
