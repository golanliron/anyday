"use client";

import {
  PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { GlassCard } from "../ui/GlassCard";
import { Spinner } from "../ui/Spinner";
import { CustomTooltip } from "../ui/CustomTooltip";
import { PIE_COLORS, analyzeBoard as buildAnalytics } from "@/lib/charts";
import type { MondayBoard, MondayItem } from "@/types";

export function DataTab({ board, items, loading }: { board: MondayBoard; items: MondayItem[]; loading: boolean }) {
  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: 80, color: "var(--color-muted)" }}>
        <Spinner size={24} /><span style={{ fontSize: 15 }}>טוען נתונים מ-Monday...</span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: 80, color: "var(--color-muted)" }}>
        <span style={{ fontSize: 40 }}>📭</span><span style={{ fontSize: 15 }}>אין פריטים בבורד זה</span>
      </div>
    );
  }

  const analytics = buildAnalytics(board, items);
  const { statusData, peopleData, textDistributions, dateTimeline, insights, healthScore } = analytics;
  const hasCharts = statusData.length > 0 || peopleData.length > 0 || textDistributions.length > 0 || dateTimeline.length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }} className="fade-up">
      {/* Insight Cards Row */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(insights.length, 5)}, 1fr)`, gap: 12 }}>
        {/* Health Score first */}
        <GlassCard style={{ padding: "18px", textAlign: "center", borderTop: `3px solid ${healthScore.color}` }}>
          <div style={{ color: "var(--color-muted)", fontSize: 11, fontWeight: 500, marginBottom: 6 }}>ציון בריאות</div>
          <div style={{ fontFamily: "var(--font-syne)", fontSize: 38, fontWeight: 800, color: healthScore.color, lineHeight: 1 }}>{healthScore.score}</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: healthScore.color, marginTop: 4 }}>{healthScore.label}</div>
        </GlassCard>
        {insights.slice(0, 4).map((ins, i) => (
          <GlassCard key={i} style={{ padding: "18px", textAlign: "center", borderTop: `3px solid ${ins.color}` }}>
            <div style={{ color: "var(--color-muted)", fontSize: 11, fontWeight: 500, marginBottom: 6 }}>{ins.icon} {ins.title}</div>
            <div style={{ fontFamily: "var(--font-syne)", fontSize: 18, fontWeight: 700, color: ins.color, lineHeight: 1.3 }}>{ins.value}</div>
          </GlassCard>
        ))}
      </div>

      {/* Charts - dynamically built */}
      {hasCharts && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {/* Date Timeline */}
          {dateTimeline.length >= 2 && (
            <GlassCard>
              <div style={{ fontFamily: "var(--font-syne)", color: "var(--color-text)", fontWeight: 600, fontSize: 14, marginBottom: 16 }}>📈 פריטים לאורך זמן</div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={dateTimeline} margin={{ right: 10, left: -20 }}>
                  <defs>
                    <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D4FF2B" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#D4FF2B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "var(--color-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "var(--color-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="value" name="פריטים" stroke="#D4FF2B" strokeWidth={2} fill="url(#colorArea)" />
                </AreaChart>
              </ResponsiveContainer>
            </GlassCard>
          )}

          {/* Status Distribution */}
          {statusData.length > 0 && (
            <GlassCard>
              <div style={{ fontFamily: "var(--font-syne)", color: "var(--color-text)", fontWeight: 600, fontSize: 14, marginBottom: 16 }}>📊 התפלגות סטטוסים</div>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={3} strokeWidth={0}>
                    {statusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                {statusData.map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--color-text2)" }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    {s.name} ({s.value})
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {/* People chart */}
          {peopleData.length > 0 && (
            <GlassCard>
              <div style={{ fontFamily: "var(--font-syne)", color: "var(--color-text)", fontWeight: 600, fontSize: 14, marginBottom: 16 }}>👥 עומס לפי אנשים</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={peopleData} margin={{ right: 0, left: -20 }}>
                  <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "var(--color-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "var(--color-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="פריטים" radius={[6, 6, 0, 0]}>
                    {peopleData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </GlassCard>
          )}

          {/* Dynamic text distributions (e.g. "בית הספר בו למדת", "תוכנית") */}
          {textDistributions.slice(0, 3).map((dist, idx) => (
            <GlassCard key={idx}>
              <div style={{ fontFamily: "var(--font-syne)", color: "var(--color-text)", fontWeight: 600, fontSize: 14, marginBottom: 16 }}>📑 {dist.title}</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={dist.data} layout="vertical" margin={{ right: 10, left: 10 }}>
                  <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "var(--color-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: "var(--color-text2)", fontSize: 11 }} axisLine={false} tickLine={false} width={120} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="פריטים" radius={[0, 6, 6, 0]} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                </BarChart>
              </ResponsiveContainer>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Items Table */}
      <GlassCard style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "var(--font-syne)", color: "var(--color-text)", fontWeight: 600, fontSize: 14 }}>רשימת פריטים</span>
          <span style={{ color: "var(--color-muted)", fontSize: 12 }}>{items.length} סה״כ</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--color-surf2)" }}>
                <th style={{ color: "var(--color-muted)", textAlign: "right", padding: "10px 16px", fontWeight: 500, fontSize: 12 }}>שם</th>
                {board.columns.slice(1, 5).map((col) => (
                  <th key={col.id} style={{ color: "var(--color-muted)", textAlign: "right", padding: "10px 12px", fontWeight: 500, fontSize: 12 }}>{col.title}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.slice(0, 15).map((item) => (
                <tr key={item.id} style={{ borderTop: "1px solid var(--color-border)", transition: "background 0.1s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surf2)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ color: "var(--color-text)", padding: "10px 16px", fontWeight: 500 }}>{item.name}</td>
                  {board.columns.slice(1, 5).map((col) => {
                    const cv = item.column_values.find((c) => c.id === col.id);
                    const val = cv?.text || "\u2014";
                    const isStatus = col.type === "color";
                    return (
                      <td key={col.id} style={{ padding: "10px 12px" }}>
                        {isStatus && val !== "\u2014" ? (
                          <span style={{
                            background: PIE_COLORS[Math.abs(val.charCodeAt(0) % PIE_COLORS.length)] + "18",
                            color: PIE_COLORS[Math.abs(val.charCodeAt(0) % PIE_COLORS.length)],
                            padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                          }}>{val}</span>
                        ) : (
                          <span style={{ color: val === "\u2014" ? "var(--color-muted2)" : "var(--color-text2)" }}>
                            {val.length > 30 ? val.slice(0, 30) + "..." : val}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
