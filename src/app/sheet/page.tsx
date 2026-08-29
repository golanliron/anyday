"use client";

/**
 * /sheet — a dashboard from a file you already have, with no account at all.
 *
 * ── The one rule this screen is built around ──
 * THE FILE NEVER LEAVES THE BROWSER. It is read with `File.text()`, parsed by
 * `@/lib/sheet-to-board`, and handed straight to `board-intelligence` — all of
 * it inside this tab. There is no upload, no API route, no cookie, no
 * localStorage. Closing the tab is the delete button.
 *
 * That is not only a privacy promise. It is what lets AnyDay be shown to
 * somebody who has never heard of us, using her own real data, without asking
 * her to hand it over first.
 *
 * ── What this screen is NOT ──
 * A view. There is no writing back, no automation, no digest — a file cannot be
 * updated, and pretending otherwise would be the "כאילו" this product exists to
 * end. A live system is Monday, connected.
 */

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import * as BI from "@/lib/board-intelligence";
import { readSheet, planToBoard, type SheetPlan, type SheetType } from "@/lib/sheet-to-board";

/* ── the palette of "לוח חי", so a sheet dashboard and a board dashboard are
      recognisably the same product ── */
const C = {
  bg: "#F4F3FB", panel: "#FFFFFF", ink: "#1B1830", muted: "#7C7A93", line: "#ECEBF5",
  grape: "#6C4CF1", grapeL: "#EEEBFE",
  coral: "#FF6B8A", coralL: "#FFEBF0",
  teal: "#12C7A8", tealL: "#DFF7F2",
  amber: "#FFAE34", amberL: "#FFF1DC",
  sky: "#3E9BFF", skyL: "#E4F1FF",
  lime: "#84D65A", limeL: "#ECF9E1",
};
const PALETTE = [
  { fg: C.grape, bg: C.grapeL }, { fg: C.coral, bg: C.coralL }, { fg: C.teal, bg: C.tealL },
  { fg: C.amber, bg: C.amberL }, { fg: C.sky, bg: C.skyL }, { fg: C.lime, bg: C.limeL },
];
const pick = (i: number) => PALETTE[i % PALETTE.length];
const TONE_STYLE: Record<string, { fg: string; bg: string }> = {
  done: { fg: "#0B8F76", bg: C.tealL },
  risk: { fg: "#D63A5C", bg: C.coralL },
  progress: { fg: "#C77A00", bg: C.amberL },
  neutral: { fg: C.muted, bg: "#F0EFF6" },
};
const toneStyle = (t?: string) => TONE_STYLE[t || "neutral"] || TONE_STYLE.neutral;

const FONT = "Rubik, Assistant, Heebo, system-ui, sans-serif";
const card = { background: C.panel, border: `1px solid ${C.line}`, borderRadius: 18, boxShadow: "0 4px 16px -8px rgba(60,50,120,.14)" } as const;

/** What each inferred type is called on screen, and why it was chosen. The
 *  wording describes the SHAPE that was measured — never the column's name. */
const TYPE_LABEL: Record<SheetType, string> = {
  status: "קטגוריה",
  date: "תאריך",
  numbers: "מספר",
  text: "טקסט",
};
const TYPE_ORDER: SheetType[] = ["status", "date", "numbers", "text"];

/* ═══════════════════════════════ the screen ═══════════════════════════════ */

type Stage = "drop" | "confirm" | "dash";

export default function SheetPage() {
  const [plan, setPlan] = useState<SheetPlan | null>(null);
  const [types, setTypes] = useState<Record<string, SheetType>>({});
  const [stage, setStage] = useState<Stage>("drop");
  const [err, setErr] = useState<string | null>(null);

  /* The plan the user actually approved: the guess, plus any type she corrected.
     Rebuilt on every render from the same inputs, so nothing is cached behind
     her back and a correction is visible immediately. */
  const finalPlan = useMemo<SheetPlan | null>(
    () => (plan ? { ...plan, columns: plan.columns.map((c) => ({ ...c, type: types[c.id] || c.type })) } : null),
    [plan, types],
  );

  function reset() { setPlan(null); setTypes({}); setStage("drop"); setErr(null); }

  /**
   * Reading a file. `f.text()` resolves inside this tab — the bytes go nowhere
   * else, and there is deliberately no fetch() anywhere in this component.
   */
  async function accept(f: File) {
    setErr(null);
    if (/\.(xlsx|xls|ods)$/i.test(f.name)) {
      setErr("קובץ אקסל עדיין לא נקרא כאן. בתוך אקסל: קובץ ← שמירה בשם ← CSV UTF-8, ואז לגרור לכאן את הגיליון שנשמר.");
      return;
    }
    if (f.size > 20 * 1024 * 1024) { setErr("הקובץ גדול מ-20MB. הדפדפן יתקשה לקרוא אותו כאן."); return; }
    let text = "";
    try { text = await f.text(); } catch { setErr("לא הצלחתי לקרוא את הקובץ."); return; }
    const p = readSheet(f.name, text);
    if (p.empty) { setErr("לא נמצאו נתונים בקובץ — כל השורות ריקות."); return; }
    setPlan(p); setTypes({}); setStage("confirm");
  }

  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: C.bg, color: C.ink, fontFamily: FONT }}>
      <TopBar onReset={plan ? reset : undefined} fileName={plan?.fileName} />
      <main style={{ maxWidth: 1080, margin: "0 auto", padding: "26px 20px 70px" }}>
        {stage === "drop" && <DropStage onFile={accept} err={err} />}
        {stage === "confirm" && finalPlan && (
          <ConfirmStage
            plan={finalPlan}
            onType={(id, t) => setTypes((p) => ({ ...p, [id]: t }))}
            onGo={() => setStage("dash")}
            onBack={reset}
          />
        )}
        {stage === "dash" && finalPlan && <DashStage plan={finalPlan} onBack={() => setStage("confirm")} onReset={reset} />}
      </main>
    </div>
  );
}

function TopBar({ onReset, fileName }: { onReset?: () => void; fileName?: string }) {
  return (
    <header style={{ height: 58, background: C.panel, borderBottom: `1px solid ${C.line}`, display: "flex", alignItems: "center", gap: 14, padding: "0 22px", position: "sticky", top: 0, zIndex: 20 }}>
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none", color: C.ink }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: `linear-gradient(135deg,${C.grape},#FF2D87)`, color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 16 }}>A</div>
        <div style={{ fontWeight: 800, fontSize: 18 }}>Any<span style={{ color: C.grape }}>Day</span></div>
      </Link>
      <span style={{ fontSize: 12.5, color: C.muted, fontWeight: 600, borderInlineStart: `1px solid ${C.line}`, paddingInlineStart: 14 }}>
        דשבורד מגיליון
      </span>
      {fileName && <span style={{ fontSize: 12, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 260 }}>{fileName}</span>}
      <div style={{ marginInlineStart: "auto", display: "flex", gap: 8, alignItems: "center" }}>
        <PrivacyPill />
        {onReset && <button onClick={onReset} style={btnGhost}>קובץ אחר</button>}
      </div>
    </header>
  );
}

/** The promise, said in the chrome and not only in the small print. */
function PrivacyPill() {
  return (
    <span style={{ fontSize: 11.5, fontWeight: 700, color: "#0B8F76", background: C.tealL, borderRadius: 999, padding: "5px 11px", whiteSpace: "nowrap" }}>
      🔒 הקובץ נשאר בדפדפן שלך
    </span>
  );
}

/* ── stage 1: choose a file ─────────────────────────────────────────────── */

function DropStage({ onFile, err }: { onFile: (f: File) => void; err: string | null }) {
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  return (
    <div style={{ maxWidth: 620, margin: "24px auto 0" }}>
      <h1 style={{ fontSize: 27, fontWeight: 800, margin: "0 0 8px", letterSpacing: "-.02em" }}>
        גיליון אחד, ומיד דשבורד
      </h1>
      <p style={{ fontSize: 14.5, color: C.muted, lineHeight: 1.7, margin: "0 0 22px" }}>
        גררו לכאן קובץ CSV. המערכת קוראת אותו, מזהה לבד מה יש בכל עמודה, ובונה תמונת מצב.
        בלי חשבון, בלי הרשמה, ובלי להעלות שום דבר לשרת.
      </p>

      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files?.[0]; if (f) onFile(f); }}
        style={{
          ...card, borderStyle: "dashed", borderWidth: 2,
          borderColor: over ? C.grape : "#D9D6EC", background: over ? C.grapeL : C.panel,
          padding: "42px 24px", textAlign: "center", transition: "all .18s",
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 10 }}>📄</div>
        <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>גררו קובץ לכאן</div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 18 }}>CSV או TSV · עד 20MB</div>
        <button onClick={() => ref.current?.click()} style={btnPrimary}>בחירת קובץ מהמחשב</button>
        <input
          ref={ref} type="file" accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values"
          onChange={(e) => { const f = e.target.files?.[0]; if (ref.current) ref.current.value = ""; if (f) onFile(f); }}
          style={{ display: "none" }}
        />
      </div>

      {err && (
        <div style={{ ...card, borderColor: `${C.coral}55`, padding: "13px 16px", marginTop: 14, fontSize: 13.5, lineHeight: 1.7 }}>
          {err}
        </div>
      )}

      <div style={{ ...card, padding: "16px 18px", marginTop: 18 }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 8 }}>מה קורה לקובץ שלכם</div>
        <ul style={{ margin: 0, paddingInlineStart: 18, fontSize: 13, color: C.muted, lineHeight: 1.95 }}>
          <li>הוא נקרא בתוך הדפדפן. הוא לא נשלח לשרת שלנו ולא נשמר בשום מקום.</li>
          <li>סגירת הלשונית מוחקת הכול. אין מה לבטל ואין מה למחוק אחר כך.</li>
          <li>זו <b style={{ color: C.ink }}>תצוגה בלבד</b>: אין עריכה, אין כתיבה חזרה לקובץ, אין אוטומציות ואין דיוור.</li>
        </ul>
      </div>

      <div style={{ marginTop: 14, fontSize: 12.5, color: C.muted, textAlign: "center" }}>
        רוצים מערכת חיה שמתעדכנת לבד? <Link href="/app" style={{ color: C.grape, fontWeight: 700 }}>מחברים את Monday</Link>
      </div>
    </div>
  );
}

/* ── stage 2: what was understood, and a chance to correct it ───────────── */

function ConfirmStage({ plan, onType, onGo, onBack }: {
  plan: SheetPlan; onType: (id: string, t: SheetType) => void; onGo: () => void; onBack: () => void;
}) {
  /* Every decision the reader took, said out loud. A number nobody can explain
     is worth less than no number (RULES §3). */
  const facts: string[] = [
    plural(plan.rows.length, "שורה אחת נקראה", "שורות נקראו"),
    plural(plan.columns.length, "עמודה אחת", "עמודות"),
  ];
  if (plan.headerLine) facts.push(`הכותרות זוהו בשורה ${plan.headerLine}`);
  else facts.push("לא נמצאה שורת כותרות — השורה הראשונה נקראה כנתונים, והעמודות קיבלו שמות גנריים");
  if (plan.preambleLines) facts.push(plural(plan.preambleLines, "שורה אחת מעל הטבלה דולגה", "שורות מעל הטבלה דולגו"));
  if (plan.blankRows) facts.push(plural(plan.blankRows, "שורה ריקה אחת לא נספרה", "שורות ריקות לא נספרו"));
  if (plan.droppedColumns.length) facts.push(plural(plan.droppedColumns.length, "עמודה אחת ריקה לגמרי הושמטה", "עמודות ריקות לגמרי הושמטו"));

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 23, fontWeight: 800, margin: "0 0 6px" }}>זה מה שזיהיתי בקובץ</h1>
      <p style={{ fontSize: 13.5, color: C.muted, margin: "0 0 16px", lineHeight: 1.7 }}>
        הטיפוס של כל עמודה נקבע לפי <b style={{ color: C.ink }}>צורת הנתונים</b> שבתוכה — לא לפי שם העמודה.
        זה ניחוש, ואפשר לתקן אותו כאן לפני שמחשבים משהו.
      </p>

      <div style={{ ...card, padding: "14px 18px", marginBottom: 14 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "7px 10px" }}>
          {facts.map((f, i) => (
            <span key={i} style={{ fontSize: 12.5, fontWeight: 600, background: "#F4F3FB", borderRadius: 999, padding: "5px 12px", color: C.ink }}>{f}</span>
          ))}
        </div>
        {plan.droppedColumns.length > 0 && (
          <div style={{ marginTop: 10, fontSize: 12, color: C.muted, lineHeight: 1.7 }}>
            הושמטו: {plan.droppedColumns.join(" · ")}
          </div>
        )}
      </div>

      <div style={{ ...card, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#FAFAFE", color: C.muted, fontSize: 11.5, fontWeight: 700 }}>
              <th style={th}>עמודה</th>
              <th style={th}>מלאות</th>
              <th style={th}>ערכים שונים</th>
              <th style={th}>למה כך</th>
              <th style={th}>טיפוס</th>
            </tr>
          </thead>
          <tbody>
            {plan.columns.map((c) => (
              <tr key={c.id} style={{ borderTop: `1px solid ${C.line}` }}>
                <td style={{ ...td, fontWeight: 700 }}>
                  {c.title}
                  {c.index === plan.nameIndex && <span style={{ fontSize: 10.5, color: C.grape, background: C.grapeL, borderRadius: 999, padding: "2px 7px", marginInlineStart: 7 }}>שם הרשומה</span>}
                </td>
                <td style={{ ...td, fontVariantNumeric: "tabular-nums", color: C.muted }}>
                  {c.filled} מתוך {plan.rows.length}
                </td>
                <td style={{ ...td, fontVariantNumeric: "tabular-nums", color: C.muted }}>{c.unique}</td>
                <td style={{ ...td, color: C.muted, fontSize: 12, lineHeight: 1.6 }}>{whyText(c.type, c.identifier, c.filled, c.unique)}</td>
                <td style={td}>
                  <select
                    value={c.type} onChange={(e) => onType(c.id, e.target.value as SheetType)}
                    aria-label={`טיפוס העמודה ${c.title}`}
                    style={{ fontFamily: FONT, fontSize: 12.5, fontWeight: 700, padding: "6px 9px", borderRadius: 9, border: `1px solid ${C.line}`, background: C.panel, color: C.ink }}
                  >
                    {TYPE_ORDER.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 18, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={onGo} style={btnPrimary}>בניית הדשבורד</button>
        <button onClick={onBack} style={btnGhost}>קובץ אחר</button>
        <span style={{ fontSize: 12, color: C.muted }}>עדיין לא נשלח שום דבר לשום מקום.</span>
      </div>
    </div>
  );
}

/** Hebrew does not say "1 שורות". One of anything gets its own sentence. */
function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : `${n.toLocaleString("he-IL")} ${many}`;
}

/** Says which measurement produced this type. Numbers only — no words about
 *  the data itself, because none were read. */
function whyText(type: SheetType, identifier: boolean, filled: number, unique: number): string {
  if (identifier) return `כל ${filled} הערכים מספריים, ייחודיים ובאורך אחיד — זה מזהה, לא מדד. לא יחושבו עליו סכום או ממוצע.`;
  if (type === "date") return "כמעט כל הערכים נפרשים כתאריך.";
  if (type === "numbers") return "כמעט כל הערכים מספריים ומשתנים — אפשר לסכם אותם.";
  if (type === "status") return `${plural(unique, "ערך אחד בלבד, חוזר", "ערכים בלבד, חוזרים")} על פני ${filled} שורות — קבוצה סגורה.`;
  return "הערכים ברובם ייחודיים — טקסט חופשי.";
}

/* ── stage 3: the dashboard, straight from the engine ───────────────────── */

function DashStage({ plan, onBack, onReset }: { plan: SheetPlan; onBack: () => void; onReset: () => void }) {
  const board = useMemo(() => planToBoard(plan), [plan]);
  const kpis = useMemo(() => BI.headlineKpis(board), [board]);
  const tones = useMemo(() => BI.statusTones(board), [board]);

  /* The engine is asked what this board CAN show, and then asked to compute
     exactly those things. Nothing here decides what is interesting. */
  const widgets = useMemo(() => {
    const out: BI.Widget[] = [];
    for (const cap of BI.capabilities(board)) {
      if (cap.kind === "breakdown") { const w = BI.breakdown(board, cap.col); if (w) out.push(w); }
      else if (cap.kind === "numberSummary") { const w = BI.numberSummary(board, cap.col); if (w) out.push(w); }
      else if (cap.kind === "attention") { const w = BI.attention(board); if ((w.data as { count: number }).count > 0) out.push(w); }
    }
    if (!out.length) out.push(BI.list(board, 24));
    return out.slice(0, 12);
  }, [board]);

  const hasAttention = widgets.some((w) => w.kind === "attention");
  const hasTimeline = useMemo(() => board.items.length > 0 && BI.timeline(board, board.items[0]) !== null, [board]);

  return (
    <div>
      <ViewOnlyBanner />

      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", margin: "0 0 14px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{board.name}</h1>
        <span style={{ fontSize: 12.5, color: C.muted }}>
          {plural(board.items.length, "שורה אחת", "שורות")} · {plural(board.columns.length, "עמודה אחת", "עמודות")}
          {plan.headerLine ? ` · כותרות משורה ${plan.headerLine}` : " · ללא שורת כותרות"}
          {plan.blankRows ? ` · ${plural(plan.blankRows, "שורה ריקה אחת דולגה", "שורות ריקות דולגו")}` : ""}
          {plan.droppedColumns.length ? ` · ${plural(plan.droppedColumns.length, "עמודה ריקה אחת הושמטה", "עמודות ריקות הושמטו")}` : ""}
        </span>
        <div style={{ marginInlineStart: "auto", display: "flex", gap: 8 }}>
          <button onClick={onBack} style={btnGhost}>תיקון טיפוסים</button>
          <button onClick={onReset} style={btnGhost}>קובץ אחר</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12, marginBottom: 14 }}>
        {kpis.map((k, i) => <KpiTile key={i} k={k} i={i} />)}
      </div>

      {hasAttention && (
        <div style={{ ...card, borderColor: `${C.amber}55`, background: C.amberL, padding: "11px 15px", marginBottom: 14, fontSize: 12.5, lineHeight: 1.7 }}>
          גיליון לא נושא צבעים כמו לוח Monday, ולכן הסימון של &quot;דורשים תשומת לב&quot; נשען על הטקסט שבתא בלבד. במערכת מחוברת הסימון מגיע מהצבע שהלוח עצמו נתן לתווית.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 12 }}>
        {widgets.map((w, i) => <ChartCard key={`${w.kind}-${w.title}-${i}`} w={w} i={i} tones={tones} />)}
      </div>

      {hasTimeline && <Records board={board} />}
    </div>
  );
}

function ViewOnlyBanner() {
  return (
    <div style={{ ...card, padding: "13px 17px", marginBottom: 16, display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
      <span style={{ fontSize: 18, lineHeight: 1.2 }}>👁️</span>
      <div style={{ flex: 1, minWidth: 240 }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 3 }}>תצוגה בלבד</div>
        <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.7 }}>
          הכול חושב כאן בדפדפן, מהקובץ שבחרתם. הוא לא נשלח לשרת ולא נשמר — סגירת הלשונית מוחקת אותו.
          אין כתיבה חזרה לקובץ, אין אוטומציות ואין דיוור. למערכת חיה שמתעדכנת לבד — <Link href="/app" style={{ color: C.grape, fontWeight: 700 }}>מחברים את Monday</Link>.
        </div>
      </div>
    </div>
  );
}

function KpiTile({ k, i }: { k: { icon: string; n: number; label: string; tone: string }; i: number }) {
  const c = k.tone === "rose" ? { fg: C.coral, bg: C.coralL }
    : k.tone === "mint" ? { fg: C.teal, bg: C.tealL }
    : k.tone === "brand" ? { fg: C.grape, bg: C.grapeL } : pick(i + 3);
  return (
    <div style={{ ...card, padding: "16px 18px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -14, insetInlineStart: -14, width: 60, height: 60, borderRadius: "50%", background: c.bg, opacity: .6 }} />
      <div style={{ position: "relative" }}>
        <div style={{ width: 40, height: 40, borderRadius: 13, background: c.bg, color: c.fg, display: "grid", placeItems: "center", fontSize: 20, marginBottom: 10 }}>{k.icon}</div>
        <div style={{ fontSize: 29, fontWeight: 800, letterSpacing: "-.02em", fontVariantNumeric: "tabular-nums", color: c.fg }}>{k.n.toLocaleString("he-IL")}</div>
        <div style={{ fontSize: 12.5, color: C.muted, fontWeight: 600 }}>{k.label}</div>
      </div>
    </div>
  );
}

function ChartCard({ w, i, tones }: { w: BI.Widget; i: number; tones: BI.ToneMap }) {
  const c = pick(i);
  return (
    <div style={{ ...card, padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ width: 8, height: 22, borderRadius: 4, background: c.fg }} />
        <div style={{ fontSize: 14, fontWeight: 800 }}>{w.title}</div>
      </div>
      <ChartBody w={w} c={c} tones={tones} />
      <div style={{ marginTop: 12, fontSize: 10.5, color: "#B4B2C6", borderTop: `1px dashed ${C.line}`, paddingTop: 8 }}>🔎 {w.source}</div>
    </div>
  );
}

function ChartBody({ w, c, tones }: { w: BI.Widget; c: { fg: string; bg: string }; tones: BI.ToneMap }) {
  const d = w.data as Record<string, unknown>;

  if (w.kind === "breakdown") {
    const rows = (d.rows as { label: string; n: number; tone?: string }[]) || [];
    const max = Math.max(...rows.map((r) => r.n), 1);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {rows.slice(0, 8).map((r) => {
          const sc = toneStyle(r.tone || tones[r.label]);
          return (
            <div key={r.label} style={{ display: "grid", gap: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5 }}>
                <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 200 }}>{r.label}</span>
                <b style={{ fontVariantNumeric: "tabular-nums", color: sc.fg }}>{r.n}</b>
              </div>
              <div style={{ height: 9, borderRadius: 999, background: "#F2F1F9", overflow: "hidden" }}>
                <div style={{ width: `${(r.n / max) * 100}%`, height: "100%", background: sc.fg, borderRadius: 999 }} />
              </div>
            </div>
          );
        })}
        {rows.length > 8 && <div style={{ fontSize: 11.5, color: C.muted }}>ועוד {rows.length - 8} ערכים</div>}
      </div>
    );
  }

  if (w.kind === "numberSummary") {
    const cells: [string, unknown][] = [["סה״כ", d.sum], ["ממוצע", d.avg], ["מקסימום", d.max]];
    return (
      <div>
        <div style={{ display: "flex", gap: 10 }}>
          {cells.map(([l, v]) => (
            <div key={l} style={{ flex: 1, background: c.bg, borderRadius: 13, padding: 12 }}>
              <div style={{ fontSize: 19, fontWeight: 800, color: c.fg, fontVariantNumeric: "tabular-nums" }}>{Number(v).toLocaleString("he-IL")}</div>
              <div style={{ fontSize: 11, color: C.muted }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: C.muted }}>מבוסס על {String(d.count)} תאים שיש בהם מספר.</div>
      </div>
    );
  }

  if (w.kind === "attention") {
    const items = (d.items as { name: string; why: string }[]) || [];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.slice(0, 10).map((it, j) => (
          <div key={j} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12.5, background: C.coralL, borderRadius: 10, padding: "7px 11px" }}>
            <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.name}</span>
            <span style={{ color: "#D63A5C", whiteSpace: "nowrap" }}>{it.why}</span>
          </div>
        ))}
        {items.length > 10 && <div style={{ fontSize: 11.5, color: C.muted }}>ועוד {items.length - 10}</div>}
      </div>
    );
  }

  if (w.kind === "list") {
    const items = (d.items as string[]) || [];
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {items.map((n, j) => (
          <span key={j} style={{ fontSize: 12, padding: "5px 11px", background: pick(j).bg, color: pick(j).fg, borderRadius: 999, fontWeight: 600 }}>{n}</span>
        ))}
        {(d.total as number) > items.length && <span style={{ fontSize: 11.5, color: C.muted }}>ועוד {(d.total as number) - items.length}</span>}
      </div>
    );
  }

  return null;
}

/**
 * One record's own story. A date column is a stage, and the order comes from the
 * dates the record actually carries — all of that is the engine's `timeline`,
 * computed here without a single change to it.
 */
function Records({ board }: { board: BI.Board }) {
  const [open, setOpen] = useState<string | null>(null);
  const item = board.items.find((x) => x.id === open) || null;
  const tl = item ? BI.timeline(board, item) : null;
  const stages = (tl?.data as { stages: BI.Stage[]; passed: number; total: number } | undefined);

  return (
    <div style={{ ...card, padding: "16px 18px", marginTop: 14 }}>
      <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>ציר הזמן של רשומה</div>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 11 }}>לקובץ הזה יש עמודות תאריך, אז לכל שורה יש סדר אירועים משלה. בחרו שורה.</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: open ? 14 : 0 }}>
        {board.items.slice(0, 60).map((it, j) => {
          const on = it.id === open;
          return (
            <button
              key={it.id} onClick={() => setOpen(on ? null : it.id)}
              style={{
                fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer",
                padding: "5px 11px", borderRadius: 999, border: `1px solid ${on ? C.grape : C.line}`,
                background: on ? C.grape : pick(j).bg, color: on ? "#fff" : pick(j).fg,
              }}
            >{it.name}</button>
          );
        })}
        {board.items.length > 60 && <span style={{ fontSize: 11.5, color: C.muted, alignSelf: "center" }}>ועוד {board.items.length - 60}</span>}
      </div>

      {stages && (
        <div style={{ borderTop: `1px dashed ${C.line}`, paddingTop: 12 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 9 }}>{tl?.title} — {stages.passed} מתוך {stages.total} שלבים עם תאריך</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {stages.stages.map((s) => (
              <div key={s.colId} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5, opacity: s.at === null ? .45 : 1 }}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: s.at === null ? "#D5D3E4" : C.grape, flexShrink: 0 }} />
                <span style={{ fontWeight: 600 }}>{s.title}</span>
                <span style={{ marginInlineStart: "auto", color: C.muted, fontVariantNumeric: "tabular-nums" }}>{s.iso || "טרם"}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── shared bits of style ───────────────────────────────────────────────── */

const btnPrimary: React.CSSProperties = {
  fontFamily: FONT, fontSize: 14, fontWeight: 700, cursor: "pointer",
  padding: "11px 22px", borderRadius: 12, border: "none", background: C.grape, color: "#fff",
};
const btnGhost: React.CSSProperties = {
  fontFamily: FONT, fontSize: 12.5, fontWeight: 700, cursor: "pointer",
  padding: "8px 14px", borderRadius: 10, border: `1px solid ${C.line}`, background: C.panel, color: C.ink,
};
const th: React.CSSProperties = { textAlign: "start", padding: "10px 14px", whiteSpace: "nowrap" };
const td: React.CSSProperties = { textAlign: "start", padding: "10px 14px", verticalAlign: "middle" };
