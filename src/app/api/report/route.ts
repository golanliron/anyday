import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// הדוח ארוך (max_tokens: 6000) ולוקח קרוב לדקה. בלי התקרה הזאת בקשה
// כזאת נחתכת בפריסה. ההזרמה שומרת על החיבור פעיל לכל אורכה.
export const maxDuration = 300;
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let boardContext: {
    boardName?: string;
    itemsCount?: number;
    columns?: string;
    statusDistribution?: string;
    sampleItems?: string;
  } | null = null;
  let reportType: string | undefined;
  let orgName: string | undefined;

  try {
    const body = await req.json();
    boardContext = body?.boardContext ?? null;
    reportType = body?.reportType;
    orgName = body?.orgName;
  } catch {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }

  if (!boardContext) {
    return NextResponse.json({ error: "חסרים נתוני בורד" }, { status: 400 });
  }

  const reportPrompts: Record<string, string> = {
    management: `צור דוח מנהלים מקצועי ומפורט מנתוני הבורד. הדוח חייב לכלול:

## מבנה הדוח:

### 1. תקציר מנהלים (3-4 משפטים)
סיכום חד של מצב הבורד - מה עובד, מה דורש תשומת לב.

### 2. נתונים עיקריים
טבלה עם כל הסטטוסים, כמויות ואחוזים.

### 3. צווארי בקבוק ונקודות כאב
- פריטים תקועים (ציין שמות!)
- עמודות עם שיעור מילוי נמוך
- סטטוסים שמרכזים יותר מדי פריטים

### 4. הישגים ונקודות חיוביות
מה עובד טוב? מה מתקדם?

### 5. המלצות לפעולה מיידית
3-5 פעולות קונקרטיות שכדאי לעשות עכשיו. לא כלליות - ספציפיות עם שמות פריטים.

### 6. מבט קדימה
מה צפוי לקרות אם ממשיכים בקצב הנוכחי?

חשוב: השתמש במספרים, אחוזים, שמות ספציפיים. הדוח חייב להיות מוכן לשליחה לדירקטוריון כמו שהוא.`,

    weekly: `צור דוח שבועי קצר וחד מנתוני הבורד:

### סיכום שבועי
- מה השתנה השבוע (הערכה לפי הנתונים)
- כמה פריטים בכל סטטוס (טבלה)
- מה דורש תשומת לב דחופה
- 3 פעולות מומלצות לשבוע הבא

תהיה קצר, קולע, עם מספרים.`,

    donors: `צור דוח למשקיעים/תורמים מנתוני הבורד:

### דוח התקדמות למשקיעים

1. **סיכום ביצועים** - מספרים מרכזיים, אחוזי השלמה
2. **הישגים עיקריים** - מה הושג, כמה פריטים הושלמו
3. **אתגרים ופתרונות** - מה היה קשה ומה עשינו
4. **תוכנית המשך** - מה בתכנון

הטון: מקצועי, אופטימי אבל כנה, מותאם למשקיעים שרוצים לראות ROI.`,

    kpi: `צור דוח KPIs מנתוני הבורד:

חלץ 4-6 KPIs מרכזיים מהנתונים. לכל KPI:
- **שם ה-KPI**
- **ערך נוכחי** (מספר/אחוז)
- **מגמה** (עלייה/ירידה/יציב)
- **המלצה** (מה לעשות)

הצג בטבלה מסודרת. אחרי הטבלה תן 2-3 תובנות מרכזיות.`,
  };

  const type = reportType || "management";
  const prompt = reportPrompts[type] || reportPrompts.management;

  const systemPrompt = `אתה AnyDay - מייצר דוחות מקצועיים מנתוני Monday.com.
${orgName ? `שם הארגון: ${orgName}` : ""}

## כללים:
- עברית מקצועית, נקייה
- מספרים ואחוזים בכל פסקה
- שמות פריטים ספציפיים (לא "כמה פריטים")
- כותרות ברורות עם **כותרת**
- טבלאות עם | עמודה | עמודה |
- הדוח חייב להיות מוכן לשליחה כמו שהוא
- אל תוסיף הערות כמו "הערה: הנתונים מבוססים על..." - פשוט תן את הדוח

נתוני הבורד:
שם: ${boardContext.boardName}
מספר פריטים: ${boardContext.itemsCount}
עמודות: ${boardContext.columns}
סטטוסים: ${boardContext.statusDistribution || "אין"}
פריטים לדוגמה: ${boardContext.sampleItems || "אין"}`;

  const encoder = new TextEncoder();

  // כל שורה בתשובה היא אובייקט JSON יחיד (NDJSON):
  //   {"type":"delta","text":"..."}  — עוד פיסת דוח
  //   {"type":"error","error":"..."} — נפילה, גם אם כבר יצא טקסט
  //   {"type":"done"}                — ורק אז הדוח שלם
  // זרם שנקטע באמצע פשוט לא יכיל "done", ולכן הצד השני לא יציג אותו כשלם.
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      };

      try {
        const messageStream = anthropic.messages.stream(
          {
            model: "claude-sonnet-4-6",
            max_tokens: 6000,
            system: systemPrompt,
            messages: [{ role: "user", content: prompt }],
          },
          { signal: req.signal }
        );

        for await (const event of messageStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta" &&
            event.delta.text
          ) {
            send({ type: "delta", text: event.delta.text });
          }
        }

        const final = await messageStream.finalMessage();

        if (final.stop_reason === "max_tokens") {
          // הדוח נעצר בתקרת האורך — הוא חתוך, ואסור להציג אותו כשלם.
          send({ type: "error", error: "הדוח נעצר באמצע כי הגיע לאורך המרבי" });
          controller.close();
          return;
        }

        send({ type: "done" });
        controller.close();
      } catch (e: unknown) {
        if (req.signal.aborted) {
          // המשתמשת עזבה את הדף — אין למי לדווח.
          controller.close();
          return;
        }
        const msg = e instanceof Error ? e.message : "שגיאה";
        try {
          send({ type: "error", error: msg });
        } catch {
          // הצד השני כבר לא מקשיב.
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
