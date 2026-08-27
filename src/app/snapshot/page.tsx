"use client";

import { useEffect, useState } from "react";

interface SnapshotData {
  account: string | null;
  userName: string | null;
  boardsCount: number;
  totalItems: number;
  boards: { id: string; name: string; items: number; columns: number }[];
  trend: { date: string; count: number }[];
  error?: string;
}

const PURPLE = "#6C4CF1";

export default function SnapshotPage() {
  const [data, setData] = useState<SnapshotData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/snapshot", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setErr(d.error);
        else setData(d);
      })
      .catch(() => setErr("לא הצלחנו לקרוא מ-Monday"))
      .finally(() => setLoading(false));
  }, []);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "בוקר טוב";
    if (h < 18) return "צהריים טובים";
    return "ערב טוב";
  })();

  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: "#F6F7FA", fontFamily: "Rubik, Assistant, Heebo, system-ui, sans-serif", color: "#1D2130" }}>
      {/* top bar */}
      <header style={{ height: 62, background: "#fff", borderBottom: "1px solid #ECEDF3", display: "flex", alignItems: "center", gap: 16, padding: "0 26px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: `linear-gradient(140deg, ${PURPLE}, #8A6BFF)`, color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 17 }}>A</div>
          <div style={{ fontWeight: 800, fontSize: 19 }}>Any<span style={{ color: PURPLE }}>Day</span></div>
        </div>
        <nav style={{ marginInlineStart: "auto", display: "flex", gap: 4, fontSize: 14 }}>
          {["תמונת מצב", "אנשים", "תוכניות", "משימות", "שאלונים", "דוחות", "הגדרות"].map((t, i) => (
            <span key={t} style={{ padding: "8px 13px", fontWeight: i === 0 ? 700 : 500, color: i === 0 ? PURPLE : "#8489A0", borderBottom: i === 0 ? `3px solid ${PURPLE}` : "3px solid transparent", cursor: "pointer" }}>{t}</span>
          ))}
        </nav>
      </header>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "26px 26px 70px" }}>
        {loading && <Loader />}
        {err && !loading && <ErrorCard msg={err} />}
        {data && !loading && (
          <>
            {/* greeting */}
            <div style={{ textAlign: "center", marginBottom: 26 }}>
              <h1 style={{ fontSize: 30, fontWeight: 800, margin: "0 0 4px" }}>
                {greeting}{data.userName ? `, ${data.userName.split(" ")[0]}` : ""}
              </h1>
              <p style={{ fontSize: 15, color: "#8489A0", margin: 0 }}>
                {data.account ? `${data.account} · ` : ""}הנה תמונת המצב מה-Monday שלכם
              </p>
            </div>

            {/* stat cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14, marginBottom: 24 }}>
              <Stat icon="📋" n={data.boardsCount} label="בורדים מחוברים" />
              <Stat icon="📊" n={data.totalItems} label="סה״כ פריטים" />
              <Stat icon="🗂" n={data.boards.reduce((s, b) => s + b.columns, 0)} label="עמודות בסך הכל" />
              <Stat icon="⚡" n={data.trend.reduce((s, t) => s + t.count, 0)} label="עדכונים לאחרונה" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 18, alignItems: "start" }}>
              {/* trend chart */}
              <Card title="מגמות פעילות" sub="עדכונים בבורדים המובילים">
                <TrendChart series={data.trend} />
              </Card>

              {/* boards list */}
              <Card title="הבורדים שלכם" sub={`${data.boardsCount} בורדים`}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 320, overflowY: "auto" }}>
                  {data.boards.map((b) => (
                    <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 11px", borderRadius: 12, background: "#F3F4F9" }}>
                      <div style={{ width: 30, height: 30, borderRadius: 9, background: "#EFEBFE", display: "grid", placeItems: "center", fontSize: 14 }}>📋</div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.name}</div>
                        <div style={{ fontSize: 11.5, color: "#8489A0" }}>{b.items} פריטים · {b.columns} עמודות</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <p style={{ textAlign: "center", fontSize: 12, color: "#AEB3C6", marginTop: 26 }}>
              🔒 נתונים חיים מה-Monday שלכם · AnyDay קורא בלבד ולא ממציא
            </p>
          </>
        )}
      </main>
    </div>
  );
}

function Stat({ icon, n, label }: { icon: string; n: number; label: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #ECEDF3", borderRadius: 20, padding: "20px 22px", display: "flex", alignItems: "center", gap: 16, boxShadow: "0 6px 18px -6px rgba(60,50,120,.1)" }}>
      <div style={{ width: 48, height: 48, borderRadius: 14, background: "#EFEBFE", display: "grid", placeItems: "center", fontSize: 22 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>{n.toLocaleString("he-IL")}</div>
        <div style={{ fontSize: 13, color: "#8489A0" }}>{label}</div>
      </div>
    </div>
  );
}

function Card({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #ECEDF3", borderRadius: 22, padding: "20px 22px", boxShadow: "0 6px 18px -6px rgba(60,50,120,.1)" }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 800 }}>{title}</div>
        {sub && <div style={{ fontSize: 12.5, color: "#8489A0" }}>{sub}</div>}
      </div>
      {children}
    </div>
  );
}

function TrendChart({ series }: { series: { date: string; count: number }[] }) {
  if (!series.length) return <div style={{ padding: 30, textAlign: "center", color: "#8489A0", fontSize: 13.5 }}>אין עדיין מספיק נתוני פעילות להצגת מגמה</div>;
  const max = Math.max(...series.map((s) => s.count), 1);
  const W = 620, H = 200, pad = 30;
  const xs = (i: number) => W - pad - (i / Math.max(1, series.length - 1)) * (W - pad * 2);
  const ys = (v: number) => pad + (1 - v / max) * (H - pad * 2);
  const line = series.map((s, i) => `${i === 0 ? "M" : "L"}${xs(i)},${ys(s.count)}`).join(" ");
  const area = `${line} L${xs(series.length - 1)},${H - pad} L${xs(0)},${H - pad} Z`;
  return (
    <div style={{ overflowX: "auto" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: 480 }}>
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={PURPLE} stopOpacity="0.22" />
            <stop offset="1" stopColor={PURPLE} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((g) => <line key={g} x1={pad} x2={W - pad} y1={pad + g * (H - pad * 2)} y2={pad + g * (H - pad * 2)} stroke="#ECEDF3" />)}
        <path d={area} fill="url(#g)" />
        <path d={line} fill="none" stroke={PURPLE} strokeWidth="2.5" strokeLinejoin="round" />
        <circle cx={xs(series.length - 1)} cy={ys(series[series.length - 1].count)} r="4" fill={PURPLE} stroke="#fff" strokeWidth="2" />
      </svg>
    </div>
  );
}

function Loader() {
  return (
    <div style={{ textAlign: "center", padding: 80 }}>
      <div style={{ width: 42, height: 42, border: "3px solid #ECEDF3", borderTopColor: PURPLE, borderRadius: "50%", margin: "0 auto 16px", animation: "spin .8s linear infinite" }} />
      <p style={{ fontSize: 15, fontWeight: 600, color: "#8489A0" }}>קורא את ה-Monday שלכם...</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function ErrorCard({ msg }: { msg: string }) {
  return (
    <div style={{ maxWidth: 520, margin: "60px auto", background: "#fff", border: "1px solid #FCE8ED", borderRadius: 20, padding: 28, textAlign: "center" }}>
      <div style={{ fontSize: 34, marginBottom: 10 }}>🔌</div>
      <h2 style={{ fontSize: 19, fontWeight: 800, margin: "0 0 8px" }}>עוד לא מחובר ל-Monday</h2>
      <p style={{ fontSize: 14, color: "#8489A0", lineHeight: 1.7, margin: 0 }}>{msg}</p>
      <p style={{ fontSize: 13, color: "#AEB3C6", marginTop: 14, lineHeight: 1.7 }}>
        להתחברות מהירה לניסוי: הוסיפו <code style={{ background: "#F3F4F9", padding: "1px 5px", borderRadius: 4 }}>MONDAY_PERSONAL_TOKEN</code> לקובץ <code style={{ background: "#F3F4F9", padding: "1px 5px", borderRadius: 4 }}>.env.local</code> והפעילו מחדש.
      </p>
    </div>
  );
}
