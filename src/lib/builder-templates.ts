import type { BuilderTemplate } from "@/types/builder";

export const TEMPLATES: BuilderTemplate[] = [
  // ============================================================
  // 1. ניהול תוכנית בוגרים
  // ============================================================
  {
    templateId: "bogrim",
    templateName: "ניהול תוכנית בוגרים",
    description: "מערכת מלאה לניהול בוגרי תוכנית: פרטים אישיים, סטטוס שירות ולימודים, שיחות מעקב, משימות לרכזות ודוחות לקרנות.",
    recommendedFor: ["nonprofit", "social_org"],
    boards: [
      {
        boardName: "בוגרים — פרטים אישיים",
        purpose: "מאגר מרכזי של כל הבוגרים עם פרטים אישיים, סטטוס עדכני ומידע רלוונטי.",
        groups: [
          { title: "פעילים", description: "בוגרים בליווי פעיל" },
          { title: "סיימו ליווי", description: "בוגרים שסיימו את תקופת הליווי" },
          { title: "לא זמינים", description: "בוגרים שלא בקשר" },
        ],
        columns: [
          { title: "שם מלא", type: "text", description: "שם פרטי ומשפחה", required: true },
          { title: "טלפון", type: "phone", description: "מספר טלפון ראשי", required: true },
          { title: "אימייל", type: "email", description: "כתובת דוא\"ל", required: false },
          { title: "סטטוס", type: "status", description: "מצב נוכחי בתוכנית", required: true, statusLabels: ["פעיל", "בהמתנה", "סיים", "נשר"] },
          { title: "שנת סיום תוכנית", type: "numbers", description: "שנה בה סיים את התוכנית", required: true },
          { title: "רכזת אחראית", type: "people", description: "הרכזת שמלווה את הבוגר", required: true },
          { title: "סטטוס שירות", type: "status", description: "שירות צבאי/לאומי", required: false, statusLabels: ["לפני שירות", "בשירות", "אחרי שירות", "פטור"] },
          { title: "סטטוס לימודים", type: "status", description: "מצב לימודים", required: false, statusLabels: ["לא לומד", "מכינה", "תואר ראשון", "תואר שני", "לימודי מקצוע"] },
          { title: "סטטוס תעסוקה", type: "status", description: "מצב תעסוקתי", required: false, statusLabels: ["לא עובד", "עבודה חלקית", "עבודה מלאה", "מחפש עבודה"] },
          { title: "עיר מגורים", type: "text", description: "עיר מגורים נוכחית", required: false },
          { title: "הערות", type: "long_text", description: "הערות חופשיות", required: false },
        ],
        views: ["טבלה ראשית", "לפי רכזת", "לפי סטטוס"],
        automations: [
          { trigger: "סטטוס משתנה ל-\"נשר\"", action: "שליחת התראה לרכזת", description: "כשבוגר מסומן כנושר, הרכזת מקבלת התראה" },
          { trigger: "בוגר ללא שיחה 60 יום", action: "יצירת משימת מעקב", description: "אם עברו 60 יום בלי שיחה, נוצרת משימת מעקב אוטומטית" },
        ],
        reports: [
          { title: "התפלגות סטטוסים", description: "גרף עוגה של סטטוס בוגרים", type: "chart" },
          { title: "דוח רכזות", description: "כמה בוגרים לכל רכזת", type: "table" },
          { title: "דוח לקרן", description: "סיכום שנתי: שירות, לימודים, תעסוקה", type: "summary" },
        ],
      },
      {
        boardName: "שיחות מעקב",
        purpose: "תיעוד שיחות עם בוגרים — מתי, מי, מה עלה, מה הצעד הבא.",
        groups: [
          { title: "שיחות החודש", description: "שיחות שתוכננו או בוצעו החודש" },
          { title: "ארכיון", description: "שיחות קודמות" },
        ],
        columns: [
          { title: "בוגר/ת", type: "text", description: "שם הבוגר/ת", required: true },
          { title: "תאריך שיחה", type: "date", description: "מתי התקיימה השיחה", required: true },
          { title: "רכזת", type: "people", description: "מי ביצעה את השיחה", required: true },
          { title: "סוג שיחה", type: "status", description: "סוג השיחה", required: true, statusLabels: ["מעקב שוטף", "חירום", "יוזמת בוגר", "פגישה פרונטלית"] },
          { title: "סיכום", type: "long_text", description: "עיקרי השיחה", required: true },
          { title: "צעד הבא", type: "text", description: "מה סוכם לעשות", required: false },
          { title: "תאריך מעקב הבא", type: "date", description: "מתי לחזור לבוגר", required: false },
        ],
        automations: [
          { trigger: "תאריך מעקב הבא הגיע", action: "יצירת תזכורת לרכזת", description: "ביום המעקב נשלחת תזכורת" },
        ],
        reports: [
          { title: "שיחות החודש", description: "כמה שיחות בוצעו לפי רכזת", type: "chart" },
        ],
      },
      {
        boardName: "משימות רכזות",
        purpose: "ניהול משימות שוטפות של צוות הרכזות — מעקבים, טיפולים, הכנת דוחות.",
        groups: [
          { title: "דחוף", description: "משימות שדורשות טיפול מיידי" },
          { title: "השבוע", description: "משימות לשבוע הנוכחי" },
          { title: "בהמשך", description: "משימות לא דחופות" },
          { title: "הושלם", description: "משימות שהושלמו" },
        ],
        columns: [
          { title: "משימה", type: "text", description: "תיאור המשימה", required: true },
          { title: "אחראית", type: "people", description: "מי אחראית", required: true },
          { title: "סטטוס", type: "status", description: "מצב המשימה", required: true, statusLabels: ["לא התחיל", "בעבודה", "ממתין לתגובה", "הושלם"] },
          { title: "תאריך יעד", type: "date", description: "עד מתי", required: true },
          { title: "קשור לבוגר", type: "text", description: "שם הבוגר אם רלוונטי", required: false },
          { title: "עדיפות", type: "status", description: "רמת דחיפות", required: false, statusLabels: ["גבוהה", "בינונית", "נמוכה"] },
        ],
        automations: [
          { trigger: "תאריך יעד עבר", action: "שינוי צבע לאדום + התראה", description: "משימה שעבר תאריך היעד שלה מקבלת דגל אדום" },
          { trigger: "סטטוס השתנה ל-\"הושלם\"", action: "העברה לקבוצת הושלם", description: "משימה שהושלמה עוברת אוטומטית לארכיון" },
        ],
        reports: [
          { title: "עומס רכזות", description: "כמה משימות פתוחות לכל רכזת", type: "chart" },
          { title: "משימות באיחור", description: "רשימת משימות שעבר תאריך היעד", type: "table" },
        ],
      },
    ],
  },

  // ============================================================
  // 2. ניהול מתנדבים
  // ============================================================
  {
    templateId: "volunteers",
    templateName: "ניהול מתנדבים",
    description: "מערכת לניהול מתנדבים: רישום, שיבוץ, מעקב שעות, הערכה ותודות.",
    recommendedFor: ["nonprofit", "social_org", "school"],
    boards: [
      {
        boardName: "מתנדבים — מאגר",
        purpose: "רשימת כל המתנדבים עם פרטים אישיים, זמינות ותחומי עניין.",
        groups: [
          { title: "פעילים", description: "מתנדבים פעילים" },
          { title: "ממתינים לשיבוץ", description: "נרשמו אך טרם שובצו" },
          { title: "לא פעילים", description: "הפסיקו להתנדב" },
        ],
        columns: [
          { title: "שם מלא", type: "text", description: "שם המתנדב/ת", required: true },
          { title: "טלפון", type: "phone", description: "טלפון ליצירת קשר", required: true },
          { title: "אימייל", type: "email", description: "דוא\"ל", required: false },
          { title: "סטטוס", type: "status", description: "מצב התנדבות", required: true, statusLabels: ["פעיל", "ממתין", "מושהה", "סיים"] },
          { title: "תחום התנדבות", type: "dropdown", description: "באיזה תחום מתנדב", required: true, dropdownOptions: ["חינוך", "רווחה", "לוגיסטיקה", "ניהול", "שיווק", "אחר"] },
          { title: "זמינות", type: "status", description: "מתי זמין", required: false, statusLabels: ["בקרים", "אחה\"צ", "ערבים", "סופ\"ש", "גמיש"] },
          { title: "רכז/ת אחראי/ת", type: "people", description: "מי מנהל את המתנדב", required: true },
          { title: "תאריך הצטרפות", type: "date", description: "מתי התחיל להתנדב", required: true },
          { title: "סה\"כ שעות", type: "numbers", description: "סה\"כ שעות התנדבות", required: false },
        ],
        automations: [
          { trigger: "מתנדב חדש נוסף", action: "שליחת הודעת קבלה", description: "מתנדב חדש מקבל הודעת ברוכים הבאים" },
        ],
        reports: [
          { title: "מתנדבים לפי תחום", description: "כמה מתנדבים בכל תחום", type: "chart" },
          { title: "שעות התנדבות חודשי", description: "סיכום שעות לפי חודש", type: "chart" },
        ],
      },
      {
        boardName: "שיבוצים ומשמרות",
        purpose: "ניהול שיבוץ מתנדבים לפעילויות, ימים ומשמרות.",
        groups: [
          { title: "השבוע", description: "שיבוצים לשבוע הנוכחי" },
          { title: "שבוע הבא", description: "שיבוצים לשבוע הבא" },
          { title: "ארכיון", description: "שיבוצים שהושלמו" },
        ],
        columns: [
          { title: "פעילות", type: "text", description: "שם הפעילות", required: true },
          { title: "מתנדב/ת", type: "text", description: "שם המתנדב/ת", required: true },
          { title: "תאריך", type: "date", description: "תאריך הפעילות", required: true },
          { title: "שעות", type: "numbers", description: "כמה שעות", required: true },
          { title: "סטטוס", type: "status", description: "מצב השיבוץ", required: true, statusLabels: ["מתוכנן", "אושר", "בוצע", "בוטל"] },
          { title: "הערות", type: "long_text", description: "הערות על השיבוץ", required: false },
        ],
        automations: [
          { trigger: "סטטוס השתנה ל-\"בוצע\"", action: "עדכון שעות במאגר", description: "שיבוץ שהושלם מעדכן את סה\"כ שעות המתנדב" },
        ],
        reports: [
          { title: "שיבוצים השבוע", description: "כמה שיבוצים פעילים", type: "table" },
        ],
      },
    ],
  },

  // ============================================================
  // 3. ניהול פניות
  // ============================================================
  {
    templateId: "inquiries",
    templateName: "ניהול פניות",
    description: "מערכת לטיפול בפניות: קבלה, מיון, שיוך לגורם מטפל, מעקב וסגירה.",
    recommendedFor: ["nonprofit", "social_org", "business", "ops_team"],
    boards: [
      {
        boardName: "פניות — ניהול ראשי",
        purpose: "כל הפניות הנכנסות, מיון לפי נושא, שיוך לאחראי, מעקב עד סגירה.",
        groups: [
          { title: "חדשות", description: "פניות שהתקבלו וטרם טופלו" },
          { title: "בטיפול", description: "פניות שמישהו מטפל בהן" },
          { title: "ממתינות לתגובה", description: "ממתינות לתגובת הפונה או גורם חיצוני" },
          { title: "סגורות", description: "פניות שטופלו" },
        ],
        columns: [
          { title: "שם הפונה", type: "text", description: "שם מי שפנה", required: true },
          { title: "טלפון", type: "phone", description: "טלפון ליצירת קשר", required: true },
          { title: "אימייל", type: "email", description: "דוא\"ל", required: false },
          { title: "נושא פנייה", type: "dropdown", description: "קטגוריית הפנייה", required: true, dropdownOptions: ["שאלה כללית", "בקשת מידע", "תלונה", "הצעה", "בקשת עזרה", "שיתוף פעולה", "אחר"] },
          { title: "סטטוס", type: "status", description: "מצב הפנייה", required: true, statusLabels: ["חדש", "בטיפול", "ממתין", "נסגר"] },
          { title: "דחיפות", type: "status", description: "רמת דחיפות", required: true, statusLabels: ["רגיל", "דחוף", "קריטי"] },
          { title: "אחראי/ת", type: "people", description: "מי מטפל בפנייה", required: true },
          { title: "תאריך קבלה", type: "date", description: "מתי התקבלה הפנייה", required: true },
          { title: "תאריך יעד לסגירה", type: "date", description: "עד מתי לטפל", required: false },
          { title: "תיאור", type: "long_text", description: "פירוט הפנייה", required: true },
          { title: "סיכום טיפול", type: "long_text", description: "מה נעשה ואיך נסגר", required: false },
          { title: "ערוץ פנייה", type: "status", description: "איך הגיעה הפנייה", required: false, statusLabels: ["טלפון", "מייל", "וואטסאפ", "אתר", "פרונטלי"] },
        ],
        automations: [
          { trigger: "פנייה חדשה נוספה", action: "התראה למנהל/ת", description: "כשפנייה חדשה נכנסת, המנהל מקבל התראה" },
          { trigger: "פנייה דחופה ללא טיפול 24 שעות", action: "אסקלציה למנהל", description: "פנייה דחופה שלא טופלה ביממה עולה למנהל" },
          { trigger: "סטטוס השתנה ל-\"נסגר\"", action: "העברה לקבוצת סגורות", description: "פנייה סגורה עוברת אוטומטית" },
        ],
        reports: [
          { title: "פניות פתוחות", description: "כמה פניות פתוחות לפי סטטוס", type: "chart" },
          { title: "זמן טיפול ממוצע", description: "ממוצע ימים מקבלה עד סגירה", type: "summary" },
          { title: "פניות לפי ערוץ", description: "מאיפה מגיעות הפניות", type: "chart" },
        ],
      },
    ],
  },

  // ============================================================
  // 4. ניהול פרויקטים
  // ============================================================
  {
    templateId: "projects",
    templateName: "ניהול פרויקטים",
    description: "מערכת לניהול פרויקטים: תכנון, ביצוע, מעקב לוחות זמנים, צוות ותקציב.",
    recommendedFor: ["nonprofit", "social_org", "business", "ops_team", "school"],
    boards: [
      {
        boardName: "פרויקטים — תמונה כללית",
        purpose: "מבט על של כל הפרויקטים: מצב, לוח זמנים, אחראים, תקציב.",
        groups: [
          { title: "פעילים", description: "פרויקטים בביצוע" },
          { title: "בתכנון", description: "פרויקטים שטרם התחילו" },
          { title: "הושלמו", description: "פרויקטים שהסתיימו" },
          { title: "מוקפאים", description: "פרויקטים שהוקפאו" },
        ],
        columns: [
          { title: "שם פרויקט", type: "text", description: "שם הפרויקט", required: true },
          { title: "סטטוס", type: "status", description: "מצב הפרויקט", required: true, statusLabels: ["בתכנון", "בביצוע", "מעוכב", "הושלם", "מוקפא"] },
          { title: "אחראי/ת", type: "people", description: "מנהל/ת הפרויקט", required: true },
          { title: "ציר זמן", type: "timeline", description: "תאריך התחלה וסיום", required: true },
          { title: "תקציב", type: "numbers", description: "תקציב בש\"ח", required: false },
          { title: "ביצוע תקציב", type: "numbers", description: "כמה הוצא בפועל", required: false },
          { title: "עדיפות", type: "status", description: "רמת עדיפות", required: true, statusLabels: ["גבוהה", "בינונית", "נמוכה"] },
          { title: "תיאור", type: "long_text", description: "תיאור הפרויקט", required: false },
          { title: "% התקדמות", type: "numbers", description: "אחוז השלמה", required: false },
        ],
        automations: [
          { trigger: "ציר זמן הסתיים", action: "התראה אם לא הושלם", description: "פרויקט שהגיע לתאריך הסיום ולא הושלם — התראה" },
        ],
        reports: [
          { title: "סטטוס פרויקטים", description: "כמה פרויקטים בכל מצב", type: "chart" },
          { title: "סיכום תקציבי", description: "תקציב מול ביצוע בפועל", type: "summary" },
          { title: "לוח זמנים", description: "ציר זמן של כל הפרויקטים", type: "dashboard" },
        ],
      },
      {
        boardName: "משימות פרויקט",
        purpose: "ניהול משימות שוטפות בתוך כל הפרויקטים.",
        groups: [
          { title: "לביצוע", description: "משימות שצריך לעשות" },
          { title: "בעבודה", description: "משימות בתהליך" },
          { title: "הושלם", description: "משימות שהסתיימו" },
        ],
        columns: [
          { title: "משימה", type: "text", description: "תיאור המשימה", required: true },
          { title: "פרויקט", type: "dropdown", description: "שייך לאיזה פרויקט", required: true, dropdownOptions: [] },
          { title: "אחראי/ת", type: "people", description: "מי מבצע", required: true },
          { title: "סטטוס", type: "status", description: "מצב", required: true, statusLabels: ["לא התחיל", "בעבודה", "ממתין", "הושלם"] },
          { title: "תאריך יעד", type: "date", description: "עד מתי", required: true },
          { title: "עדיפות", type: "status", description: "דחיפות", required: false, statusLabels: ["גבוהה", "בינונית", "נמוכה"] },
        ],
        automations: [
          { trigger: "תאריך יעד עבר", action: "התראה לאחראי", description: "משימה באיחור — התראה אוטומטית" },
          { trigger: "סטטוס = הושלם", action: "העברה לקבוצת הושלם", description: "משימה שהושלמה עוברת אוטומטית" },
        ],
        reports: [
          { title: "משימות פתוחות", description: "כמה משימות פתוחות לפי אחראי", type: "chart" },
        ],
      },
    ],
  },

  // ============================================================
  // 5. ניהול תורמים
  // ============================================================
  {
    templateId: "donors",
    templateName: "ניהול תורמים",
    description: "מערכת לניהול קשרי תורמים: פרטים, היסטוריית תרומות, פגישות, תודות ודוחות לדירקטוריון.",
    recommendedFor: ["nonprofit", "social_org"],
    boards: [
      {
        boardName: "תורמים — מאגר",
        purpose: "רשימת כל התורמים, פרטי קשר, סכום מצטבר, תדירות ומצב קשר.",
        groups: [
          { title: "תורמים פעילים", description: "תרמו בשנה האחרונה" },
          { title: "תורמים פוטנציאליים", description: "בתהליך גיוס" },
          { title: "תורמים לשעבר", description: "הפסיקו לתרום" },
        ],
        columns: [
          { title: "שם תורם/ת", type: "text", description: "שם מלא או שם חברה", required: true },
          { title: "טלפון", type: "phone", description: "טלפון", required: false },
          { title: "אימייל", type: "email", description: "דוא\"ל", required: true },
          { title: "סוג תורם", type: "status", description: "סיווג", required: true, statusLabels: ["פרטי", "חברה", "קרן", "ממשלתי"] },
          { title: "סכום מצטבר", type: "numbers", description: "סה\"כ שנתרם", required: false },
          { title: "תרומה אחרונה", type: "date", description: "תאריך תרומה אחרונה", required: false },
          { title: "סטטוס קשר", type: "status", description: "מצב הקשר", required: true, statusLabels: ["פעיל", "קר", "חם", "מעוניין", "סירב"] },
          { title: "אחראי/ת גיוס", type: "people", description: "מי מנהל את הקשר", required: true },
          { title: "ערוץ מועדף", type: "status", description: "איך מעדיף לקבל פניות", required: false, statusLabels: ["מייל", "טלפון", "פגישה", "וואטסאפ"] },
          { title: "הערות", type: "long_text", description: "מידע נוסף", required: false },
        ],
        automations: [
          { trigger: "לא היתה פעילות 90 יום", action: "יצירת משימת חימום קשר", description: "תורם שלא דיברנו איתו 3 חודשים — תזכורת" },
        ],
        reports: [
          { title: "סיכום גיוס שנתי", description: "סה\"כ גיוס לפי חודש ולפי תורם", type: "chart" },
          { title: "תורמים לפי סוג", description: "פילוח: פרטי, חברה, קרן, ממשלתי", type: "chart" },
          { title: "דוח לדירקטוריון", description: "סיכום מצב גיוס, תורמים חדשים, מגמות", type: "summary" },
        ],
      },
      {
        boardName: "פגישות ואירועי גיוס",
        purpose: "מעקב אחר פגישות עם תורמים, אירועי גיוס ופולואפ.",
        groups: [
          { title: "קרובות", description: "פגישות בשבועיים הקרובים" },
          { title: "בוצעו", description: "פגישות שהתקיימו" },
          { title: "בוטלו", description: "פגישות שבוטלו" },
        ],
        columns: [
          { title: "תורם/ת", type: "text", description: "עם מי הפגישה", required: true },
          { title: "תאריך", type: "date", description: "מתי", required: true },
          { title: "סוג", type: "status", description: "סוג אירוע", required: true, statusLabels: ["פגישה ראשונה", "פולואפ", "אירוע", "טלפון", "זום"] },
          { title: "אחראי/ת", type: "people", description: "מי מהצוות", required: true },
          { title: "סטטוס", type: "status", description: "מצב", required: true, statusLabels: ["מתוכנן", "בוצע", "בוטל", "נדחה"] },
          { title: "סיכום", type: "long_text", description: "מה דובר ומה סוכם", required: false },
          { title: "צעד הבא", type: "text", description: "מה עושים אחרי", required: false },
        ],
        automations: [
          { trigger: "פגישה בוצעה ואין צעד הבא", action: "תזכורת למלא צעד הבא", description: "אחרי פגישה — תזכורת לתעד מה הלאה" },
        ],
        reports: [
          { title: "פגישות החודש", description: "כמה פגישות התקיימו", type: "table" },
        ],
      },
    ],
  },
];

export const SYSTEM_TYPE_LABELS: Record<string, string> = {
  bogrim: "ניהול תוכנית בוגרים",
  volunteers: "ניהול מתנדבים",
  inquiries: "ניהול פניות",
  projects: "ניהול פרויקטים",
  donors: "ניהול תורמים",
  scholarships: "ניהול מלגות",
  clients: "ניהול לקוחות",
  team_tasks: "ניהול משימות צוות",
};

export const ORG_TYPE_LABELS: Record<string, string> = {
  nonprofit: "עמותה",
  social_org: "ארגון חברתי",
  school: "בית ספר",
  business: "חברה עסקית",
  ops_team: "צוות תפעול",
  other: "אחר",
};
