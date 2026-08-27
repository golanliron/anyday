"use client";

import { useEffect, useRef, useState } from "react";

/* ===== "לוח חי" palette — colorful, energetic, NOT flat purple ===== */
const C = {
  bg: "#F4F3FB", panel: "#FFFFFF", ink: "#1B1830", muted: "#7C7A93",
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
/* A status value is painted by its TONE, which arrives from the server. The
   server derives that tone from the colour the Monday board itself gave the
   label (see board-intelligence), so this screen recognises no word at all -
   a board in Hebrew, Arabic or English colours identically. */
type Tone = "risk" | "progress" | "done" | "neutral";
type ToneMap = Record<string, string>;
const TONE_STYLE: Record<Tone, { fg: string; bg: string }> = {
  done: { fg: "#0B8F76", bg: C.tealL },
  risk: { fg: "#D63A5C", bg: C.coralL },
  progress: { fg: "#C77A00", bg: C.amberL },
  neutral: { fg: C.muted, bg: "#F0EFF6" },
};
const toneStyle = (t?: string) => TONE_STYLE[t as Tone] || TONE_STYLE.neutral;

type Tab = "dash" | "people" | "insights";
interface Widget { kind: string; title: string; source: string; data: unknown; }
interface KPI { icon: string; n: number; label: string; tone: string; }
interface PField { colId: string; title: string; type: string; text: string }
interface Person { id: string; name: string; boardId: string; boardName: string; status: string; owner: string; date: string; fields: PField[]; }
interface BoardOpt { id: string; name: string; items: number; }

/** How much of the board the numbers are actually based on (see board-fetch). */
interface Cov { loaded: number; total: number; truncated: boolean; note: string }

export default function AppPage() {
  const [boards, setBoards] = useState<BoardOpt[]>([]);
  const [active, setActive] = useState<string[]>([]);   // boards shown on dashboard
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("dash");
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    fetch("/api/boards", { cache: "no-store" }).then((r) => r.json()).then((d) => {
      if (d.boards) { setBoards(d.boards.filter((b: BoardOpt) => b.items > 0)); if (d.selected?.length) { setActive(d.selected); setReady(true); } }
    });
  }, []);

  async function begin(ids: string[]) {
    await fetch("/api/boards", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ boardIds: ids }) });
    setActive(ids); setReady(true);
  }
  async function setActiveBoards(ids: string[]) {
    if (!ids.length) return;
    await fetch("/api/boards", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ boardIds: ids }) });
    setActive(ids);
  }

  if (!ready) return <Onboard boards={boards} onStart={begin} />;

  const activeNames = boards.filter((b) => active.includes(b.id)).map((b) => b.name);

  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: C.bg, fontFamily: "Rubik, Assistant, Heebo, system-ui, sans-serif", color: C.ink }}>
      <TopBar tab={tab} setTab={setTab} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 250px", maxWidth: 1260, margin: "0 auto", gap: 18, padding: "20px 20px 90px" }}>
        <main style={{ minWidth: 0 }}>
          {tab === "dash" && <Dashboard key={active.join()} names={activeNames} />}
          {tab === "people" && <People />}
          {tab === "insights" && <Insights key={active.join()} names={activeNames} />}
        </main>
        <BoardRail boards={boards} active={active} setActive={setActiveBoards} />
      </div>
      <ChatFab open={chatOpen} setOpen={setChatOpen} tab={tab} names={activeNames} />
    </div>
  );
}

/* ===== top bar + tabs ===== */
function TopBar({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const synced = useSyncTime();
  return (
    <header style={{ height: 58, background: C.panel, borderBottom: `1px solid #ECEBF5`, display: "flex", alignItems: "center", gap: 16, padding: "0 22px", position: "sticky", top: 0, zIndex: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: `linear-gradient(135deg,${C.grape},${C.coral})`, color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 16 }}>A</div>
        <div style={{ fontWeight: 800, fontSize: 18 }}>Any<span style={{ color: C.grape }}>Day</span></div>
      </div>
      <nav style={{ display: "flex", gap: 2, marginInlineStart: 8 }}>
        {([["dash", "לוח חי"], ["people", "משתתפים"], ["insights", "תובנות"]] as [Tab, string][]).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ position: "relative", padding: "18px 14px", fontSize: 14, fontWeight: tab === id ? 700 : 500, color: tab === id ? C.grape : C.muted, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
            {label}
            {tab === id && <span style={{ position: "absolute", bottom: 0, insetInline: 8, height: 3, borderRadius: "3px 3px 0 0", background: C.grape }} />}
          </button>
        ))}
      </nav>
      <div style={{ marginInlineStart: "auto", display: "flex", alignItems: "center", gap: 6 }} title={`מסונכרן עם Monday · ${synced}`}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.teal }} />
        <span style={{ fontSize: 10.5, color: "#9E9CB2" }}>מסונכרן {synced}</span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: C.muted, borderInlineStart: "1px solid #ECEBF5", paddingInlineStart: 12 }}>שלום, לירון</div>
    </header>
  );
}
function useSyncTime() {
  const [t, setT] = useState("עכשיו");
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => { const s = Math.floor((Date.now() - start) / 1000); setT(s < 5 ? "עכשיו" : s < 60 ? `לפני ${s} ש׳` : `לפני ${Math.floor(s / 60)} דק׳`); }, 5000);
    return () => clearInterval(id);
  }, []);
  return t;
}

/* ===== board rail (right) ===== */
function BoardRail({ boards, active, setActive }: { boards: BoardOpt[]; active: string[]; setActive: (ids: string[]) => void }) {
  const [q, setQ] = useState("");
  const shown = boards.filter((b) => b.name.includes(q));
  function toggle(id: string) {
    const next = active.includes(id) ? active.filter((x) => x !== id) : active.length < 2 ? [...active, id] : [active[1], id];
    setActive(next);
  }
  return (
    <aside style={{ position: "sticky", top: 78, alignSelf: "start", background: C.panel, border: `1px solid #ECEBF5`, borderRadius: 20, padding: 14, maxHeight: "calc(100vh - 100px)", overflowY: "auto" }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".05em", color: C.muted, marginBottom: 4 }}>בורדים על הלוח</div>
      <div style={{ fontSize: 11, color: "#A9A7BE", marginBottom: 10 }}>סמנו עד 2 · הלוח מתעדכן מיד</div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש..." style={{ width: "100%", padding: "8px 11px", borderRadius: 10, border: "1px solid #E6E4F0", fontSize: 12.5, outline: "none", fontFamily: "inherit", marginBottom: 10 }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {shown.slice(0, 40).map((b, i) => {
          const on = active.includes(b.id); const c = pick(i);
          return (
            <button key={b.id} onClick={() => toggle(b.id)} style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 10px", borderRadius: 12, border: `1.5px solid ${on ? c.fg : "transparent"}`, background: on ? c.bg : "#F7F6FC", cursor: "pointer", textAlign: "right", fontFamily: "inherit", transition: "all .12s" }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: c.fg, flexShrink: 0, opacity: on ? 1 : .3 }} />
              <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: on ? 700 : 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.name}</span>
              <span style={{ fontSize: 10.5, color: C.muted, fontVariantNumeric: "tabular-nums" }}>{b.items}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

/* ===== onboarding ===== */
function Onboard({ boards, onStart }: { boards: BoardOpt[]; onStart: (ids: string[]) => void }) {
  const [sel, setSel] = useState<string[]>([]); const [q, setQ] = useState("");
  const shown = boards.filter((b) => b.name.includes(q));
  const toggle = (id: string) => setSel((s) => s.includes(id) ? s.filter((x) => x !== id) : s.length < 2 ? [...s, id] : s);
  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: C.bg, fontFamily: "Rubik, Assistant, Heebo, system-ui, sans-serif", color: C.ink, display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 620 }}>
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div style={{ width: 56, height: 56, borderRadius: 18, background: `linear-gradient(135deg,${C.grape},${C.coral})`, color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 26, margin: "0 auto 14px" }}>A</div>
          <h1 style={{ fontSize: 25, fontWeight: 800, margin: "0 0 5px" }}>על אילו בורדים נבנה את הלוח?</h1>
          <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>בחרו עד 2 — נתחיל, ותמיד אפשר להחליף מהסרגל.</p>
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש בורד..." style={{ width: "100%", padding: "12px 15px", borderRadius: 13, border: "1px solid #E6E4F0", fontSize: 14, marginBottom: 12, outline: "none", fontFamily: "inherit" }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {shown.slice(0, 30).map((b, i) => { const on = sel.includes(b.id), dis = !on && sel.length >= 2, c = pick(i);
            return <button key={b.id} onClick={() => toggle(b.id)} disabled={dis} style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 14px", borderRadius: 15, border: `2px solid ${on ? c.fg : "transparent"}`, background: on ? c.bg : C.panel, cursor: dis ? "not-allowed" : "pointer", opacity: dis ? .4 : 1, textAlign: "right", fontFamily: "inherit", boxShadow: on ? `0 8px 20px -10px ${c.fg}` : "0 2px 8px rgba(60,50,120,.05)" }}>
              <span style={{ width: 30, height: 30, borderRadius: 10, background: c.bg, color: c.fg, display: "grid", placeItems: "center", fontSize: 15, flexShrink: 0 }}>📋</span>
              <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.name}</span><span style={{ fontSize: 11.5, color: C.muted }}>{b.items} פריטים</span></span>
            </button>;
          })}
        </div>
        <button onClick={() => onStart(sel)} disabled={!sel.length} style={{ width: "100%", marginTop: 18, background: `linear-gradient(135deg,${C.grape},${C.coral})`, color: "#fff", border: "none", borderRadius: 15, padding: "15px", fontSize: 16, fontWeight: 800, cursor: sel.length ? "pointer" : "not-allowed", opacity: sel.length ? 1 : .5, fontFamily: "inherit" }}>{sel.length ? "בנו לי את הלוח →" : "בחרו בורד"}</button>
      </div>
    </div>
  );
}

/* ===== ImpactMap — the constellation "לוח חי" ===== */
interface Dot { id: string; name: string; cluster: string; status: string; updatedAt: string; fields: { title: string; text: string }[]; x?: number; y?: number; c?: string; }
interface CBoard { boardId: string; boardName: string; entity: string; clusterTitle: string; statusTitle: string; clusters: { name: string; n: number }[]; dots: Dot[]; }
const DOT_COLORS = ["#8A6BFF", "#4FA9FF", "#12C7A8", "#FFAE34", "#FF6B8A", "#84D65A"];
/** Dot colour from the server-derived tone - never from the status text. */
function statusDotColor(tone?: string) { return tone === "risk" ? "#FF5470" : tone === "done" ? "#12C7A8" : null; }

// NOTE: this component is not mounted anywhere today. When it is wired back in,
// its caller must hand it the tone map (GET /api/dashboard?meta=1), exactly as
// People does - /api/constellation does not carry tones of its own.
function ImpactMap({ names, tones }: { names: string[]; tones: ToneMap }) {
  const [data, setData] = useState<CBoard[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [sel, setSel] = useState<Dot | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotsRef = useRef<Dot[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setData(null);
    fetch("/api/constellation", { cache: "no-store" }).then((r) => r.json()).then((d) => d.error ? setErr(d.error) : setData(d.boards)).catch(() => setErr("שגיאה"));
  }, []);

  // layout + draw the constellation
  useEffect(() => {
    if (!data || !canvasRef.current || !wrapRef.current) return;
    const canvas = canvasRef.current, wrap = wrapRef.current;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = wrap.clientWidth, H = 560;
    canvas.width = W * dpr; canvas.height = H * dpr; canvas.style.width = W + "px"; canvas.style.height = H + "px";
    const ctx = canvas.getContext("2d")!; ctx.scale(dpr, dpr);

    // Build clusters from the first board (or merge). Position clusters on a grid.
    const board = data[0];
    const clusters = board.clusters.slice(0, 6);
    const clusterPos: Record<string, { cx: number; cy: number; color: string }> = {};
    const cols = Math.ceil(Math.sqrt(clusters.length)); const rows = Math.ceil(clusters.length / cols);
    clusters.forEach((cl, i) => {
      const gx = i % cols, gy = Math.floor(i / cols);
      clusterPos[cl.name] = { cx: W * (0.22 + 0.56 * (cols === 1 ? .5 : gx / (cols - 1 || 1))), cy: H * (0.26 + 0.5 * (rows === 1 ? .5 : gy / (rows - 1 || 1))), color: DOT_COLORS[i % DOT_COLORS.length] };
    });

    // deterministic pseudo-random so layout is stable across redraws (no Math.random per frame issues)
    const rand = (seed: number) => { const x = Math.sin(seed * 9973.7) * 43758.5453; return x - Math.floor(x); };
    const dots: Dot[] = [];
    board.dots.forEach((d, i) => {
      const cp = clusterPos[d.cluster] || { cx: W / 2, cy: H / 2, color: "#8A6BFF" };
      const a = rand(i) * Math.PI * 2, r = 18 + rand(i + 999) * 78;
      const x = cp.cx + Math.cos(a) * r, y = cp.cy + Math.sin(a) * r * 0.8;
      dots.push({ ...d, x, y, c: statusDotColor(tones[d.status]) || cp.color });
    });
    dotsRef.current = dots;

    let raf = 0, t = 0;
    const reduce = matchMedia("(prefers-reduced-motion:reduce)").matches;
    function frame() {
      ctx.clearRect(0, 0, W, H);
      // faint cluster halos + labels
      clusters.forEach((cl) => { const cp = clusterPos[cl.name]; if (!cp) return;
        const g = ctx.createRadialGradient(cp.cx, cp.cy, 0, cp.cx, cp.cy, 120);
        g.addColorStop(0, cp.color + "22"); g.addColorStop(1, cp.color + "00");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cp.cx, cp.cy, 120, 0, Math.PI * 2); ctx.fill();
      });
      // dots with gentle twinkle
      dots.forEach((d, i) => {
        const tw = reduce ? 1 : 0.7 + 0.3 * Math.sin(t / 40 + i);
        ctx.beginPath(); ctx.arc(d.x!, d.y!, 2.6 + (d.c === "#FF5470" ? 1.4 : 0), 0, Math.PI * 2);
        ctx.fillStyle = d.c!; ctx.globalAlpha = tw; ctx.fill();
        if (d.c === "#FF5470") { ctx.globalAlpha = 0.3 * tw; ctx.beginPath(); ctx.arc(d.x!, d.y!, 7, 0, Math.PI * 2); ctx.fillStyle = "#FF5470"; ctx.fill(); }
        ctx.globalAlpha = 1;
      });
      // cluster labels
      clusters.forEach((cl) => { const cp = clusterPos[cl.name]; if (!cp) return;
        ctx.fillStyle = "#EDECFB"; ctx.font = "700 13px Rubik, sans-serif"; ctx.textAlign = "center"; ctx.direction = "rtl";
        ctx.fillText(cl.name, cp.cx, cp.cy - 128); ctx.fillStyle = "#8B88A8"; ctx.font = "600 11px Rubik, sans-serif";
        ctx.fillText(`${cl.n} ${board.entity}`, cp.cx, cp.cy - 112);
      });
      t++; if (!reduce) raf = requestAnimationFrame(frame);
    }
    frame();
    return () => cancelAnimationFrame(raf);
  }, [data, tones]);

  function onClick(e: React.MouseEvent) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    let hit: Dot | null = null, best = 12;
    for (const d of dotsRef.current) { const dist = Math.hypot(d.x! - mx, d.y! - my); if (dist < best) { best = dist; hit = d; } }
    if (hit) setSel(hit);
  }

  if (err) return <ErrBox msg={err} />;
  if (!data) return <Spinner label="בונה את מפת האימפקט..." />;
  const totalDots = data.reduce((s, b) => s + b.dots.length, 0);
  const atRisk = data.flatMap((b) => b.dots).filter((d) => tones[d.status] === "risk").length;

  return (
    <div style={{ animation: "rise .4s both" }}>
      <div style={{ marginBottom: 14 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 2px" }}>מפת האימפקט</h1>
        <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>{names.join(" · ")} · כל נקודה = {data[0]?.entity?.slice(0, -2) || "אדם"}, אשכולות לפי "{data[0]?.clusterTitle || "קטגוריה"}"</p>
      </div>
      <div ref={wrapRef} style={{ position: "relative", background: "radial-gradient(120% 120% at 70% 0%, #1A1636 0%, #0C0A1E 60%)", borderRadius: 24, overflow: "hidden", boxShadow: "0 20px 50px -20px rgba(30,20,70,.5)" }}>
        <canvas ref={canvasRef} onClick={onClick} style={{ display: "block", cursor: "pointer" }} />
        {/* floating stats on the map */}
        <div style={{ position: "absolute", top: 16, insetInlineEnd: 20, textAlign: "left", color: "#EDECFB" }}>
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-.02em" }}>{totalDots.toLocaleString("he-IL")}</div>
          <div style={{ fontSize: 12, color: "#9A97B8" }}>{data[0]?.entity} על המפה</div>
          {atRisk > 0 && <div style={{ marginTop: 10, color: "#FF7A93", fontSize: 13, fontWeight: 700 }}>● {atRisk} דורשים תשומת לב</div>}
        </div>
        {/* legend */}
        <div style={{ position: "absolute", bottom: 14, insetInlineStart: 18, display: "flex", gap: 14, fontSize: 11.5, color: "#B8B5D0" }}>
          <Legend c="#8A6BFF" t="אדם" /><Legend c="#12C7A8" t="הסתיים" /><Legend c="#FF5470" t="דורש תשומת לב" />
        </div>
      </div>
      {sel && <DotProfile d={sel} entity={data[0]?.entity || ""} onClose={() => setSel(null)} />}
    </div>
  );
}
function Legend({ c, t }: { c: string; t: string }) { return <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />{t}</span>; }

/* dot → profile panel with STORY timeline */
function DotProfile({ d, entity, onClose }: { d: Dot; entity: string; onClose: () => void }) {
  // Build a story timeline from any date-like fields, sorted chronologically.
  const events = d.fields
    .filter((f) => /\d{1,2}[./]\d{1,2}[./]\d{2,4}|\d{4}-\d{2}-\d{2}/.test(f.text))
    .map((f) => ({ label: f.title, date: f.text }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const other = d.fields.filter((f) => !/\d{1,2}[./]\d{1,2}[./]\d{2,4}|\d{4}-\d{2}-\d{2}/.test(f.text));
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(12,10,30,.5)", zIndex: 50, display: "grid", placeItems: "center", padding: 20, animation: "fade .2s both" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 24, maxWidth: 480, width: "100%", maxHeight: "86vh", overflowY: "auto", boxShadow: "0 30px 80px -20px rgba(20,10,60,.5)", animation: "pop .25s both" }}>
        <div style={{ padding: "22px 24px 16px", background: `linear-gradient(135deg,${C.grape},${C.coral})`, color: "#fff", position: "relative" }}>
          <button onClick={onClose} style={{ position: "absolute", top: 16, insetInlineStart: 18, background: "rgba(255,255,255,.2)", border: "none", color: "#fff", width: 30, height: 30, borderRadius: 9, cursor: "pointer", fontSize: 15 }}>✕</button>
          <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: "rgba(255,255,255,.22)", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 19 }}>{initials(d.name)}</div>
            <div><div style={{ fontSize: 20, fontWeight: 800 }}>{d.name}</div><div style={{ fontSize: 13, opacity: .9 }}>{d.cluster}{d.status ? ` · ${d.status}` : ""}</div></div>
          </div>
        </div>
        <div style={{ padding: "18px 24px 24px" }}>
          {events.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: C.grape, marginBottom: 12 }}>מסע {entity.slice(0, -2) || "המשתתף"}</div>
              <div style={{ position: "relative", paddingInlineStart: 22 }}>
                <div style={{ position: "absolute", insetInlineStart: 6, top: 4, bottom: 4, width: 2, background: `linear-gradient(${C.grape},${C.coral})` }} />
                {events.map((e, i) => (
                  <div key={i} style={{ position: "relative", paddingBottom: i === events.length - 1 ? 0 : 16 }}>
                    <span style={{ position: "absolute", insetInlineStart: -20, top: 3, width: 12, height: 12, borderRadius: "50%", background: "#fff", border: `3px solid ${i === events.length - 1 ? C.coral : C.grape}` }} />
                    <div style={{ fontSize: 12, color: C.muted, fontWeight: 700 }}>{e.date}</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{e.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 9 }}>
            {other.slice(0, 12).map((f, i) => (
              <div key={i} style={{ background: "#F7F6FC", borderRadius: 11, padding: "8px 11px" }}>
                <div style={{ fontSize: 10.5, color: C.muted }}>{f.title}</div>
                <div style={{ fontSize: 12.5, fontWeight: 600, wordBreak: "break-word" }}>{f.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`@keyframes fade{from{opacity:0}}@keyframes pop{from{opacity:0;transform:scale(.96) translateY(10px)}}`}</style>
    </div>
  );
}

/* ===== dashboard (charts fallback) ===== */
function Dashboard({ names }: { names: string[] }) {
  const [d, setD] = useState<{ kpis: KPI[]; charts: Widget[]; attention: { count: number; items: { name: string; why: string; board: string }[] }; coverage?: Cov; source: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = () => { setD(null); setErr(null);
    fetch("/api/dashboard", { cache: "no-store" }).then((r) => r.json()).then((x) => x.error ? setErr(x.error) : setD(x)).catch(() => setErr("שגיאה"));
  };
  useEffect(() => { load();
    const h = () => load(); window.addEventListener("anyday-refresh", h);
    return () => window.removeEventListener("anyday-refresh", h);
  }, []);
  if (err) return <ErrBox msg={err} />;
  if (!d) return <Spinner label="בונה את הלוח החי..." />;
  return (
    <div style={{ animation: "rise .4s both" }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 23, fontWeight: 800, margin: "0 0 2px" }}>הלוח של {names.join(" · ")}</h1>
        <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>מתעדכן חי מ-Monday{d.coverage?.truncated ? ` · ${d.coverage.note}` : ""}</p>
      </div>
      {/* KPI tiles — colorful, animated numbers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 16 }}>
        {d.kpis.map((k, i) => <KpiTile key={i} k={k} i={i} />)}
      </div>
      {/* attention banner if any */}
      {d.attention.count > 0 && (
        <div style={{ background: `linear-gradient(120deg,${C.coralL},${C.amberL})`, border: `1px solid ${C.coral}30`, borderRadius: 18, padding: "14px 18px", marginBottom: 16, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", animation: "rise .5s both" }}>
          <div style={{ fontSize: 26 }}>⚠️</div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontWeight: 800, fontSize: 14.5 }}>{d.attention.count} דורשים תשומת לב</div>
            <div style={{ fontSize: 12.5, color: C.muted }}>{d.attention.items.slice(0, 3).map((x) => x.name).join(" · ")}{d.attention.count > 3 ? " ועוד…" : ""}</div>
          </div>
        </div>
      )}
      {/* chart cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 14, alignItems: "start" }}>
        {d.charts.map((w, i) => <ChartCard key={i} w={w} i={i} />)}
      </div>
      <style>{`@keyframes rise{from{opacity:0;transform:translateY(8px)}}`}</style>
    </div>
  );
}
function KpiTile({ k, i }: { k: KPI; i: number }) {
  const c = k.tone === "rose" ? { fg: C.coral, bg: C.coralL } : k.tone === "mint" ? { fg: C.teal, bg: C.tealL } : k.tone === "brand" ? { fg: C.grape, bg: C.grapeL } : pick(i + 3);
  const n = useCountUp(k.n);
  return (
    <div style={{ background: C.panel, border: `1px solid #ECEBF5`, borderRadius: 18, padding: "16px 18px", boxShadow: "0 4px 16px -8px rgba(60,50,120,.14)", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -14, insetInlineStart: -14, width: 60, height: 60, borderRadius: "50%", background: c.bg, opacity: .6 }} />
      <div style={{ position: "relative" }}>
        <div style={{ width: 40, height: 40, borderRadius: 13, background: c.bg, color: c.fg, display: "grid", placeItems: "center", fontSize: 20, marginBottom: 10 }}>{k.icon}</div>
        <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-.02em", fontVariantNumeric: "tabular-nums", color: c.fg }}>{n.toLocaleString("he-IL")}</div>
        <div style={{ fontSize: 12.5, color: C.muted, fontWeight: 600 }}>{k.label}</div>
      </div>
    </div>
  );
}
function ChartCard({ w, i }: { w: Widget; i: number }) {
  const c = pick(i);
  return (
    <div style={{ background: C.panel, border: `1px solid #ECEBF5`, borderRadius: 18, padding: "16px 18px", boxShadow: "0 4px 16px -8px rgba(60,50,120,.12)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ width: 8, height: 22, borderRadius: 4, background: c.fg }} />
        <div style={{ fontSize: 14, fontWeight: 800 }}>{w.title}</div>
      </div>
      <ChartBody w={w} c={c} />
      <div style={{ marginTop: 12, fontSize: 10.5, color: "#B4B2C6", borderTop: "1px dashed #EEEDF5", paddingTop: 8 }}>🔎 {w.source}</div>
    </div>
  );
}
function ChartBody({ w, c }: { w: Widget; c: { fg: string; bg: string } }) {
  const d = w.data as Record<string, unknown>;
  const drill = (w as Widget & { drill?: Record<string, string[]> }).drill;
  const [openRow, setOpenRow] = useState<string | null>(null);
  if (w.kind === "breakdown" || w.kind === "byOwner") {
    const rows = (d.rows as { label: string; n: number; tone?: string }[]) || []; const max = Math.max(...rows.map((r) => r.n), 1);
    return <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>{rows.slice(0, 8).map((r, i) => { const sc = w.kind === "breakdown" ? toneStyle(r.tone) : pick(i); const canOpen = drill && drill[r.label]?.length; const isOpen = openRow === r.label;
      return <div key={r.label} style={{ display: "grid", gap: 4 }}>
        <button onClick={() => canOpen && setOpenRow(isOpen ? null : r.label)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5, background: "none", border: "none", padding: 0, cursor: canOpen ? "pointer" : "default", fontFamily: "inherit", color: C.ink, textAlign: "right" }}>
          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 190 }}>{r.label}{canOpen && <span style={{ color: "#C4C2D6", marginInlineStart: 5, fontSize: 11 }}>{isOpen ? "▾" : "◂ הצג שמות"}</span>}</span>
          <b style={{ fontVariantNumeric: "tabular-nums", color: sc.fg }}>{r.n}</b>
        </button>
        <div style={{ height: 9, borderRadius: 999, background: "#F2F1F9", overflow: "hidden" }}><div style={{ width: `${(r.n / max) * 100}%`, height: "100%", background: sc.fg, borderRadius: 999, transition: "width .6s cubic-bezier(.2,.8,.2,1)" }} /></div>
        {isOpen && canOpen && <div style={{ display: "flex", flexWrap: "wrap", gap: 5, padding: "6px 0 2px", animation: "fade .2s both" }}>{drill![r.label].slice(0, 40).map((name, j) => <span key={j} style={{ fontSize: 11.5, padding: "3px 9px", background: sc.bg, color: sc.fg, borderRadius: 999 }}>{name}</span>)}{drill![r.label].length > 40 && <span style={{ fontSize: 11, color: C.muted }}>ועוד {drill![r.label].length - 40}…</span>}<style>{`@keyframes fade{from{opacity:0}}`}</style></div>}
      </div>; })}</div>;
  }
  if (w.kind === "numberSummary")
    return <div style={{ display: "flex", gap: 10 }}>{[["סה\"כ", d.sum], ["ממוצע", d.avg], ["מקס׳", d.max]].map(([l, v]) => <div key={l as string} style={{ flex: 1, background: c.bg, borderRadius: 13, padding: "12px" }}><div style={{ fontSize: 20, fontWeight: 800, color: c.fg, fontVariantNumeric: "tabular-nums" }}>{String(v)}</div><div style={{ fontSize: 11, color: C.muted }}>{l as string}</div></div>)}</div>;
  if (w.kind === "list") { const items = (d.items as string[]) || [];
    return <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{items.slice(0, 10).map((n, i) => <span key={i} style={{ fontSize: 12, padding: "5px 11px", background: pick(i).bg, color: pick(i).fg, borderRadius: 999, fontWeight: 600 }}>{n}</span>)}</div>;
  }
  return null;
}

/* ===== people = FULL MANAGEMENT (edit/add/delete/import → writes to Monday) ===== */
function People() {
  const [people, setPeople] = useState<Person[] | null>(null);
  const [err, setErr] = useState<string | null>(null); const [q, setQ] = useState(""); const [open, setOpen] = useState<string | null>(null);
  const [view, setView] = useState<"cards" | "list">("cards");
  const [toast, setToast] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [cov, setCov] = useState<Cov | null>(null);
  // tone map + the board's own word for a row - both derived server-side
  const [meta, setMeta] = useState<{ tones: ToneMap; entities: Record<string, string> } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => fetch("/api/people", { cache: "no-store" }).then((r) => r.json()).then((d) => { if (d.error) { setErr(d.error); return; } setPeople(d.people || []); setCov(d.coverage || null); }).catch(() => setErr("שגיאה"));
  useEffect(() => { load();
    fetch("/api/dashboard?meta=1", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (!d.error) setMeta({ tones: d.tones || {}, entities: d.entities || {} }); })
      .catch(() => { /* colours simply stay neutral */ });
  }, []);
  function flash(m: string) { setToast(m); setTimeout(() => setToast(null), 2600); }

  async function addRecord(name: string) {
    const boardId = people?.[0]?.boardId; if (!boardId || !name.trim()) return;
    const r = await fetch("/api/record", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op: "create", boardId, name: name.trim() }) });
    const d = await r.json(); if (d.ok) { flash("נוסף ל-Monday ✓"); setAdding(false); load(); } else flash("שגיאה: " + d.error);
  }
  async function delRecord(id: string) {
    const r = await fetch("/api/record", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op: "delete", itemId: id }) });
    const d = await r.json(); if (d.ok) { flash("נמחק מ-Monday ✓"); setOpen(null); load(); } else flash("שגיאה: " + d.error);
  }
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    const text = await f.text();
    // simple CSV: first column = name (one per line, skip header if it looks like one)
    const lines = text.split(/\r?\n/).map((l) => l.split(/[,\t;]/)[0]?.trim()).filter(Boolean);
    if (lines.length && /שם|name/i.test(lines[0])) lines.shift();
    const boardId = people?.[0]?.boardId; if (!boardId || !lines.length) { flash("לא נמצאו שורות"); return; }
    flash(`מייבא ${lines.length} רשומות...`);
    const r = await fetch("/api/record", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op: "import", boardId, rows: lines.map((name) => ({ name })) }) });
    const d = await r.json(); flash(d.ok ? `יובאו ${d.created} רשומות ל-Monday ✓` : "שגיאה בייבוא"); load();
    if (fileRef.current) fileRef.current.value = "";
  }

  if (err) return <ErrBox msg={err} />;
  if (!people) return <Spinner label="קורא רשומות..." />;
  const tones: ToneMap = meta?.tones || {};
  const entity = meta?.entities[people[0]?.boardName || ""] || "רשומות";
  const shown = people.filter((p) => p.name.includes(q) || p.status.includes(q) || p.owner.includes(q));
  return (
    <div style={{ animation: "rise .4s both" }}>
      {toast && <div style={{ position: "fixed", top: 70, insetInlineStart: "50%", transform: "translateX(-50%)", background: C.ink, color: "#fff", padding: "10px 18px", borderRadius: 12, fontSize: 13, fontWeight: 600, zIndex: 60, boxShadow: "0 10px 30px rgba(0,0,0,.3)" }}>{toast}</div>}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <div><h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 2px" }}>{entity}</h1><p style={{ fontSize: 12.5, color: C.muted, margin: 0 }}>{people.length} רשומות · עריכה נכתבת ישר ל-Monday{cov?.truncated ? ` · ${cov.note}` : ""}</p></div>
        <div style={{ marginInlineStart: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => setAdding(true)} style={{ background: C.grape, color: "#fff", border: "none", borderRadius: 11, padding: "9px 15px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>+ רשומה</button>
          <button onClick={() => fileRef.current?.click()} style={{ background: "#fff", color: C.grape, border: `1px solid ${C.grape}`, borderRadius: 11, padding: "9px 15px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>העלאת רשימה</button>
          <input ref={fileRef} type="file" accept=".csv,.txt,.tsv" onChange={onFile} style={{ display: "none" }} />
          <div style={{ display: "flex", gap: 6, background: "#EDECF6", borderRadius: 11, padding: 3 }}>
            {(["cards", "list"] as const).map((v) => <button key={v} onClick={() => setView(v)} style={{ padding: "6px 13px", fontSize: 12.5, fontWeight: 700, border: "none", borderRadius: 9, background: view === v ? "#fff" : "transparent", color: view === v ? C.grape : C.muted, cursor: "pointer", fontFamily: "inherit" }}>{v === "cards" ? "כרטיסים" : "רשימה"}</button>)}
          </div>
        </div>
      </div>
      {adding && <AddRow onAdd={addRecord} onCancel={() => setAdding(false)} entity={entity} />}
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש..." style={{ width: "100%", maxWidth: 400, padding: "11px 14px", borderRadius: 12, border: "1px solid #E6E4F0", fontSize: 13.5, marginBottom: 16, outline: "none", fontFamily: "inherit" }} />
      {view === "cards" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12 }}>
          {shown.slice(0, 60).map((p, i) => <PersonCard key={p.id} p={p} i={i} tone={tones[p.status]} open={open === p.id} onToggle={() => setOpen(open === p.id ? null : p.id)} onSaved={load} onDelete={delRecord} flash={flash} />)}
        </div>
      ) : (
        <div style={{ background: C.panel, border: "1px solid #ECEBF5", borderRadius: 16, overflow: "hidden" }}>
          {shown.slice(0, 100).map((p, i) => (
            <div key={p.id}>
              <button onClick={() => setOpen(open === p.id ? null : p.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 15px", background: open === p.id ? "#FAF9FE" : "#fff", border: "none", borderBottom: "1px solid #F4F3FB", cursor: "pointer", textAlign: "right", fontFamily: "inherit" }}>
                <Avatar name={p.name} i={i} sm />
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>{p.owner && <div style={{ fontSize: 11.5, color: C.muted }}>{p.owner}</div>}</div>
                {p.status && <Chip s={p.status} tone={tones[p.status]} />}
              </button>
              {open === p.id && <ProfileExpand p={p} onSaved={load} onDelete={delRecord} flash={flash} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
function AddRow({ onAdd, onCancel, entity }: { onAdd: (n: string) => void; onCancel: () => void; entity: string }) {
  const [n, setN] = useState("");
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 14, background: C.grapeL, borderRadius: 13, padding: 10 }}>
      <input autoFocus value={n} onChange={(e) => setN(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onAdd(n)} placeholder={`שם ${entity.slice(0, -2) || "הרשומה"} החדשה...`} style={{ flex: 1, border: "1px solid #E1DBFC", borderRadius: 10, padding: "10px 13px", fontSize: 13.5, outline: "none", fontFamily: "inherit" }} />
      <button onClick={() => onAdd(n)} style={{ background: C.grape, color: "#fff", border: "none", borderRadius: 10, padding: "0 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>הוסיפו</button>
      <button onClick={onCancel} style={{ background: "#fff", color: C.muted, border: "none", borderRadius: 10, padding: "0 14px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>ביטול</button>
    </div>
  );
}
function PersonCard({ p, i, tone, open, onToggle, onSaved, onDelete, flash }: { p: Person; i: number; tone?: string; open: boolean; onToggle: () => void; onSaved: () => void; onDelete: (id: string) => void; flash: (m: string) => void }) {
  const c = pick(i);
  return (
    <div onClick={(e) => { if ((e.target as HTMLElement).tagName !== "INPUT" && (e.target as HTMLElement).tagName !== "BUTTON") onToggle(); }} style={{ background: C.panel, border: `1px solid ${open ? c.fg : "#ECEBF5"}`, borderRadius: 16, padding: 15, cursor: "pointer", boxShadow: open ? `0 10px 26px -12px ${c.fg}` : "0 3px 12px -6px rgba(60,50,120,.1)", transition: "all .18s", gridColumn: open ? "1 / -1" : "auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <Avatar name={p.name} i={i} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
          <div style={{ fontSize: 11.5, color: C.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.owner || p.boardName}</div>
        </div>
        {p.status && <Chip s={p.status} tone={tone} />}
      </div>
      {open && <ProfileExpand p={p} inline onSaved={onSaved} onDelete={onDelete} flash={flash} />}
    </div>
  );
}
function ProfileExpand({ p, inline, onSaved, onDelete, flash }: { p: Person; inline?: boolean; onSaved: () => void; onDelete: (id: string) => void; flash: (m: string) => void }) {
  const [confirmDel, setConfirmDel] = useState(false);
  const editable = p.fields.filter((f) => !["subtasks", "button", "creation_log", "last_updated", "formula", "mirror", "board_relation"].includes(f.type));
  async function save(f: PField, value: string) {
    if (value === f.text) return;
    const r = await fetch("/api/record", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op: "update", boardId: p.boardId, itemId: p.id, columnId: f.colId, columnType: f.type, value }) });
    const d = await r.json(); if (d.ok) { flash(`"${f.title}" עודכן ב-Monday ✓`); onSaved(); } else flash("שגיאה: " + d.error);
  }
  return (
    <div style={{ marginTop: inline ? 14 : 0, padding: inline ? "14px 0 0" : "16px 18px", background: inline ? "transparent" : "#FAF9FE", borderTop: inline ? "1px dashed #EEEDF5" : "none", animation: "fade .25s both" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: 9 }}>
        {editable.map((f, i) => <EditField key={i} f={f} onSave={save} />)}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        {!confirmDel ? (
          <button onClick={() => setConfirmDel(true)} style={{ background: "#fff", color: C.coral, border: `1px solid ${C.coral}55`, borderRadius: 10, padding: "8px 15px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>מחקי רשומה</button>
        ) : (
          <>
            <span style={{ fontSize: 12.5, color: C.coral, fontWeight: 700, alignSelf: "center" }}>למחוק מ-Monday לצמיתות?</span>
            <button onClick={() => onDelete(p.id)} style={{ background: C.coral, color: "#fff", border: "none", borderRadius: 10, padding: "8px 15px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>כן, מחקי</button>
            <button onClick={() => setConfirmDel(false)} style={{ background: "#F0EFF6", color: C.muted, border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>ביטול</button>
          </>
        )}
      </div>
      <style>{`@keyframes fade{from{opacity:0}}`}</style>
    </div>
  );
}
function EditField({ f, onSave }: { f: PField; onSave: (f: PField, v: string) => void }) {
  const [v, setV] = useState(f.text);
  const [editing, setEditing] = useState(false);
  useEffect(() => setV(f.text), [f.text]);
  return (
    <div style={{ background: "#fff", border: `1px solid ${editing ? C.grape : "#ECEBF5"}`, borderRadius: 11, padding: "8px 11px" }}>
      <div style={{ fontSize: 10.5, color: C.muted, marginBottom: 3 }}>{f.title}</div>
      <input
        value={v} onChange={(e) => setV(e.target.value)}
        onFocus={() => setEditing(true)}
        onBlur={() => { setEditing(false); onSave(f, v); }}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
        placeholder="—"
        style={{ width: "100%", border: "none", outline: "none", fontSize: 12.5, fontWeight: 600, background: "transparent", fontFamily: "inherit", color: C.ink }}
      />
    </div>
  );
}
// (the board's word for a row is derived server-side by terminology() and
//  delivered through /api/dashboard?meta=1 - the screen keeps no copy)
function Avatar({ name, i, sm }: { name: string; i: number; sm?: boolean }) {
  const c = pick(i); const s = sm ? 34 : 42;
  return <div style={{ width: s, height: s, borderRadius: 12, background: `linear-gradient(135deg,${c.fg},${c.fg}cc)`, color: "#fff", display: "grid", placeItems: "center", fontSize: sm ? 12 : 15, fontWeight: 800, flexShrink: 0 }}>{initials(name)}</div>;
}
function Chip({ s, tone }: { s: string; tone?: string }) { const c = toneStyle(tone); return <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: c.bg, color: c.fg, whiteSpace: "nowrap" }}>{s}</span>; }

/* ===== insights = "שמתי לב ש..." phrased discoveries (NOT charts) ===== */
interface Discovery { tone: string; icon: string; title: string; body: string; source: string }
function Insights({ names }: { names: string[] }) {
  const [items, setItems] = useState<Discovery[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { setItems(null); fetch("/api/insights", { cache: "no-store" }).then((r) => r.json()).then((x) => x.error ? setErr(x.error) : setItems(x.insights)).catch(() => setErr("שגיאה")); }, []);
  if (err) return <ErrBox msg={err} />;
  if (!items) return <Spinner label="מגלה תובנות..." />;
  const toneMap: Record<string, { fg: string; bg: string }> = { rose: { fg: C.coral, bg: C.coralL }, amber: { fg: C.amber, bg: C.amberL }, grape: { fg: C.grape, bg: C.grapeL }, mint: { fg: C.teal, bg: C.tealL } };
  return (
    <div style={{ animation: "rise .4s both" }}>
      <div style={{ marginBottom: 18 }}><h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 2px" }}>שמתי לב ש...</h1><p style={{ fontSize: 12.5, color: C.muted, margin: 0 }}>גיליתי בעצמי ב-{names.join(" · ")} — כל תובנה מגובה במקור</p></div>
      {items.length === 0 ? (
        <div style={{ textAlign: "center", padding: 50, color: C.muted, background: C.panel, border: "1px solid #ECEBF5", borderRadius: 18 }}>הכל נראה תקין — לא זיהיתי פערים או חריגים בבורד. 👌</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map((it, i) => { const c = toneMap[it.tone] || toneMap.grape;
            return <div key={i} style={{ background: C.panel, border: "1px solid #ECEBF5", borderRadius: 16, padding: "16px 18px", display: "flex", gap: 14, boxShadow: "0 4px 16px -8px rgba(60,50,120,.1)", animation: `rise .4s ${i * 0.05}s both` }}>
              <div style={{ width: 42, height: 42, borderRadius: 13, background: c.bg, color: c.fg, display: "grid", placeItems: "center", fontSize: 19, flexShrink: 0, fontWeight: 800 }}>{it.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 2 }}>{it.title}</div>
                <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>{it.body}</div>
                <div style={{ fontSize: 11, color: "#B4B2C6", marginTop: 7 }}>🔎 {it.source}</div>
              </div>
            </div>;
          })}
        </div>
      )}
    </div>
  );
}

/* ===== floating context chat ===== */
interface Action { type: string; personName: string; boardId: string; boardName: string; itemId: string; columnId: string; columnTitle: string; from: string; to: string; }
interface ChatMsg { role: "user" | "bot"; text: string; ai?: boolean; source?: string | null; action?: Action; done?: boolean; }
function ChatFab({ open, setOpen, tab, names }: { open: boolean; setOpen: (v: boolean) => void; tab: Tab; names: string[] }) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState(""); const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.scrollTo(0, ref.current.scrollHeight); }, [msgs, busy]);
  const ctx = tab === "people" ? "המשתתפים" : tab === "insights" ? "התובנות" : "הלוח";
  async function send(q?: string) {
    const question = (q ?? input).trim(); if (!question) return;
    setInput(""); setMsgs((m) => [...m, { role: "user", text: question }]); setBusy(true);
    try { const r = await fetch("/api/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question }) }); const d = await r.json();
      setMsgs((m) => [...m, { role: "bot", text: d.answer || d.error, ai: d.ai, source: d.source, action: d.action }]);
    } catch { setMsgs((m) => [...m, { role: "bot", text: "שגיאת שרת" }]); } finally { setBusy(false); }
  }
  async function confirmAction(idx: number, a: Action) {
    setBusy(true);
    try {
      const r = await fetch("/api/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "apply", boardId: a.boardId, itemId: a.itemId, columnId: a.columnId, columnTitle: a.columnTitle, newStatus: a.to }) });
      const d = await r.json();
      setMsgs((m) => m.map((x, i) => i === idx ? { ...x, done: true } : x).concat([{ role: "bot", text: d.ok ? `✅ ${d.message} — עודכן ב-Monday!` : `❌ ${d.error}` }]));
      window.dispatchEvent(new CustomEvent("anyday-refresh"));
    } catch { setMsgs((m) => m.concat([{ role: "bot", text: "❌ העדכון נכשל" }])); } finally { setBusy(false); }
  }
  function cancelAction(idx: number) { setMsgs((m) => m.map((x, i) => i === idx ? { ...x, done: true } : x).concat([{ role: "bot", text: "ביטלתי — לא שונה כלום." }])); }
  if (!open) return <button onClick={() => setOpen(true)} style={{ position: "fixed", bottom: 24, insetInlineStart: 24, height: 54, padding: "0 22px", borderRadius: 999, border: "none", background: `linear-gradient(135deg,${C.grape},${C.coral})`, color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer", boxShadow: `0 14px 34px -10px ${C.grape}`, display: "flex", alignItems: "center", gap: 9, fontFamily: "inherit", zIndex: 40 }}>💬 שאלו על {ctx}</button>;
  return (
    <div style={{ position: "fixed", bottom: 24, insetInlineStart: 24, width: 380, maxWidth: "calc(100vw - 40px)", height: 520, maxHeight: "78vh", background: C.panel, borderRadius: 22, boxShadow: "0 30px 70px -20px rgba(40,30,90,.4)", display: "flex", flexDirection: "column", overflow: "hidden", zIndex: 40, animation: "pop .25s both" }}>
      <div style={{ padding: "14px 16px", background: `linear-gradient(135deg,${C.grape},${C.coral})`, color: "#fff", display: "flex", alignItems: "center", gap: 9 }}>
        <div style={{ fontWeight: 800, fontSize: 14.5 }}>🟣 שאלו על {ctx}</div>
        <div style={{ fontSize: 11, opacity: .85 }}>{names.join(" · ")}</div>
        <button onClick={() => setOpen(false)} style={{ marginInlineStart: "auto", background: "rgba(255,255,255,.2)", border: "none", color: "#fff", width: 28, height: 28, borderRadius: 8, cursor: "pointer", fontSize: 15 }}>✕</button>
      </div>
      <div ref={ref} style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10, background: C.bg }}>
        {msgs.length === 0 && <div style={{ fontSize: 13, color: C.muted, textAlign: "center", padding: "20px 10px" }}>שאלו כל דבר על {ctx} — למשל "כמה בכל סטטוס?" או "מי דורש תשומת לב?"</div>}
        {msgs.map((m, i) => <div key={i} style={{ alignSelf: m.role === "user" ? "flex-start" : "flex-end", maxWidth: "90%" }}>
          {m.role === "bot" && <div style={{ fontSize: 10, fontWeight: 800, color: C.grape, marginBottom: 3 }}>ANYDAY {m.ai && "· AI"}</div>}
          <div style={{ background: m.role === "user" ? "#fff" : C.grapeL, border: `1px solid ${m.role === "user" ? "#ECEBF5" : "#E1DBFC"}`, borderRadius: 14, padding: "9px 13px", fontSize: 13.5, lineHeight: 1.55 }} dangerouslySetInnerHTML={{ __html: m.text }} />
          {m.action && !m.done && (
            <div style={{ marginTop: 8, background: "#fff", border: `1.5px solid ${C.amber}`, borderRadius: 14, padding: 13 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: C.amber, marginBottom: 8 }}>מה ישתנה ב-Monday?</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 11 }}>
                <b>{m.action.personName}</b>
                <span style={{ color: C.muted }}>· {m.action.columnTitle}:</span>
                <span style={{ background: "#F0EFF6", padding: "2px 8px", borderRadius: 7, textDecoration: "line-through", color: C.muted }}>{m.action.from}</span>
                <span>←</span>
                <span style={{ background: C.tealL, color: "#0B8F76", padding: "2px 8px", borderRadius: 7, fontWeight: 700 }}>{m.action.to}</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => confirmAction(i, m.action!)} style={{ flex: 1, background: C.teal, color: "#fff", border: "none", borderRadius: 10, padding: "9px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>אשרי ועדכני ב-Monday</button>
                <button onClick={() => cancelAction(i)} style={{ background: "#F0EFF6", color: C.muted, border: "none", borderRadius: 10, padding: "9px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>ביטול</button>
              </div>
            </div>
          )}
          {m.source && <div style={{ fontSize: 10, color: "#B4B2C6", marginTop: 3 }}>🔎 {m.source}</div>}
        </div>)}
        {busy && <div style={{ alignSelf: "flex-end", display: "flex", gap: 4, padding: "9px 13px", background: C.grapeL, borderRadius: 14 }}>{[0, 1, 2].map((i) => <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: C.grape, animation: `bob 1.2s ${i * .15}s infinite` }} />)}</div>}
      </div>
      <div style={{ padding: 12, borderTop: "1px solid #ECEBF5", display: "flex", gap: 8 }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder={`שאלו על ${ctx}...`} style={{ flex: 1, border: "1px solid #E6E4F0", borderRadius: 12, padding: "10px 13px", fontSize: 13.5, outline: "none", fontFamily: "inherit" }} />
        <button onClick={() => send()} style={{ width: 42, height: 42, borderRadius: 12, border: "none", background: C.grape, color: "#fff", fontSize: 17, cursor: "pointer" }}>↑</button>
      </div>
      <style>{`@keyframes pop{from{opacity:0;transform:translateY(12px) scale(.97)}}@keyframes bob{0%,60%,100%{opacity:.35;transform:translateY(0)}30%{opacity:1;transform:translateY(-4px)}}`}</style>
    </div>
  );
}

/* ===== helpers ===== */
function useCountUp(target: number) {
  const [n, setN] = useState(0);
  useEffect(() => { if (matchMedia("(prefers-reduced-motion:reduce)").matches) { setN(target); return; }
    let raf = 0; const t0 = performance.now(), dur = 900;
    const tick = (t: number) => { const p = Math.min(1, (t - t0) / dur); setN(Math.round((1 - Math.pow(1 - p, 3)) * target)); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [target]);
  return n;
}
function Spinner({ label }: { label: string }) { return <div style={{ textAlign: "center", padding: 60 }}><div style={{ width: 40, height: 40, border: `3px solid ${C.grapeL}`, borderTopColor: C.grape, borderRadius: "50%", margin: "0 auto 14px", animation: "spin .8s linear infinite" }} /><p style={{ fontSize: 14, color: C.muted, fontWeight: 600 }}>{label}</p><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>; }
function ErrBox({ msg }: { msg: string }) { return <div style={{ maxWidth: 440, margin: "40px auto", background: C.panel, border: `1px solid ${C.coral}40`, borderRadius: 16, padding: 24, textAlign: "center" }}><div style={{ fontSize: 30, marginBottom: 8 }}>🔌</div><p style={{ fontSize: 14, color: C.muted, margin: 0 }}>{msg}</p></div>; }
function initials(name: string) { const p = (name || "").trim().split(/\s+/); return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).slice(0, 2) || "?"; }
