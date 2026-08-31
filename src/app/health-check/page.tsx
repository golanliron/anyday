"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { HealthCheckResult, HealthFinding } from "@/types/health";
import { getDemoResult } from "@/lib/health-demo-data";
import { buildActionPlan } from "@/lib/health-action-plan";
import { HealthSummary } from "@/components/health/HealthSummary";
import { HealthActionPlan } from "@/components/health/HealthActionPlan";
import { getMondayStatus, disconnectMonday } from "@/lib/api-client";

interface ScanResponse extends HealthCheckResult {
  boardNames: string[];
  totalBoardsInAccount: number;
  /** כמה מהנתונים באמת נקראו — מוצג כשקריאה נקטעה בתקרה, כדי שמדגם לא יוצג כסריקה. */
  coverage?: { loaded: number; total: number; truncated: boolean; note: string };
}

// Severity config
const SEVERITY = {
  critical: { label: "\u05E7\u05E8\u05D9\u05D8\u05D9", bg: "var(--color-red-light)", color: "var(--color-red)", icon: "\uD83D\uDD34" },
  warning: { label: "\u05D0\u05D6\u05D4\u05E8\u05D4", bg: "var(--color-amber-light)", color: "#B8860B", icon: "\uD83D\uDFE1" },
  info: { label: "\u05D8\u05D9\u05E4", bg: "var(--color-blue-light)", color: "var(--color-blue)", icon: "\uD83D\uDD35" },
} as const;

const CATEGORY_LABELS: Record<string, string> = {
  structure: "מבנה",
  data: "נתונים",
  workflow: "תהליכי עבודה",
  permissions: "הרשאות ואחראים",
};

const CONFIDENCE_LABELS: Record<string, string> = {
  high: "ודאות גבוהה",
  medium: "ודאות בינונית",
  low: "ודאות נמוכה",
};

export default function HealthCheckPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [connected, setConnected] = useState(false);

  // Connection is a server-side fact — ask the API, clean any OAuth flag.
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("monday") || params.get("monday_error")) {
        window.history.replaceState({}, "", window.location.pathname);
      }
    } catch {}
    getMondayStatus().then((st) => setConnected(st.connected)).catch(() => {});
  }, []);

  async function handleDisconnect() {
    await disconnectMonday();
    setConnected(false);
  }

  async function handleScan() {
    setLoading(true);
    setError(null);
    setResult(null);
    setIsDemo(false);

    try {
      // Token is resolved server-side from the org — nothing sent from client.
      const res = await fetch("/api/health-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error || "שגיאה לא צפויה.";
        setError(friendlyError(msg, res.status));
        return;
      }
      setResult(data);
    } catch {
      setError("לא הצלחנו להתחבר לשרת. בדקו את החיבור לאינטרנט ונסו שוב.");
    } finally {
      setLoading(false);
    }
  }

  function handleDemo() {
    setResult(getDemoResult());
    setIsDemo(true);
    setError(null);
  }

  function handleReset() {
    setResult(null);
    setError(null);
    setIsDemo(false);
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--color-bg)",
      color: "var(--color-text)",
      direction: "rtl",
      fontFamily: "var(--font-dm)",
    }}>
      <style>{`
        @media (max-width: 600px) {
          .hc-main { padding: 20px 14px !important; }
          .hc-card { padding: 20px 16px !important; }
          .hc-input-row { flex-direction: column !important; }
          .hc-input-row input { width: 100% !important; }
          .hc-input-row button { width: 100% !important; }
          .hc-header { padding: 14px 16px !important; gap: 8px !important; }
          .hc-bottom-actions { flex-direction: column !important; }
          .hc-bottom-actions button { width: 100% !important; }
        }
      `}</style>

      {/* Header */}
      <header className="hc-header" style={{
        padding: "20px 24px",
        borderBottom: "1px solid var(--color-border)",
        background: "var(--color-surf)",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}>
        <Link href="/" style={{
          fontSize: 13,
          color: "var(--color-accent)",
          textDecoration: "none",
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: 4,
          marginLeft: 8,
          whiteSpace: "nowrap",
        }}>
          {"\u2190"} חזרה
        </Link>
        <div style={{ width: 1, height: 24, background: "var(--color-border)", flexShrink: 0 }} />
        <span style={{ fontSize: 28 }}>{"\uD83E\uDE7A"}</span>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Monday Health Check</h1>
          <p style={{ fontSize: 13, color: "var(--color-muted)", margin: 0 }}>by AnyDay</p>
        </div>
        {connected && (
          <div style={{ marginRight: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              fontSize: 12, fontWeight: 600, color: "var(--color-green)",
              background: "var(--color-green-light)", padding: "4px 10px", borderRadius: 8,
            }}>
              {"\u2705 \u05DE\u05D7\u05D5\u05D1\u05E8 \u05DC-Monday"}
            </span>
            <button onClick={handleDisconnect} style={{
              fontSize: 11, color: "var(--color-muted)", background: "none",
              border: "none", cursor: "pointer", textDecoration: "underline",
              fontFamily: "var(--font-dm)",
            }}>
              {"\u05E0\u05EA\u05E7"}
            </button>
          </div>
        )}
      </header>

      <main className="hc-main" style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px" }}>

        {/* Intro + Token input */}
        {!result && !loading && (
          <>
            {/* Intro section */}
            <div className="fade-up" style={{
              textAlign: "center",
              marginBottom: 20,
              padding: "0 8px",
            }}>
              <h2 style={{ fontSize: 26, fontWeight: 800, marginTop: 0, marginBottom: 10, color: "var(--color-text)" }}>
                האם ה-Monday שלכם באמת עובד בשבילכם?
              </h2>
              <p style={{ color: "var(--color-muted)", fontSize: 15, lineHeight: 1.7, maxWidth: 520, margin: "0 auto 8px" }}>
                AnyDay סורקת את הבורדים, הנתונים והתהליכים שלכם
                ומחזירה אבחון ברור — עם ציון בריאות, ממצאים, ותוכנית פעולה.
              </p>
              <div style={{
                display: "flex",
                justifyContent: "center",
                gap: 20,
                flexWrap: "wrap",
                fontSize: 13,
                color: "var(--color-accent)",
                fontWeight: 600,
                marginTop: 12,
              }}>
                <span>{"\u2705"} לארגונים, עמותות וצוותים</span>
                <span>{"\uD83D\uDD12"} הבדיקה הזאת קוראת בלבד ואינה משנה דבר</span>
                <span>{"\u23F1\uFE0F"} תוצאות תוך 30 שניות</span>
              </div>
            </div>

            {/* Connection card */}
            <div className="fade-up-2 hc-card" style={{
              background: "var(--color-surf)",
              borderRadius: 16,
              border: "1px solid var(--color-border)",
              padding: 32,
              marginBottom: 24,
            }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginTop: 0, marginBottom: 8 }}>
                {"\u05D4\u05EA\u05D7\u05D9\u05DC\u05D5 \u05E1\u05E8\u05D9\u05E7\u05D4"}
              </h3>

              {/* Connected — just show scan button */}
              {connected && (
                <>
                  <p style={{ color: "var(--color-muted)", fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
                    {"\u05D0\u05EA\u05DD \u05DE\u05D7\u05D5\u05D1\u05E8\u05D9\u05DD \u05DC-Monday. \u05DC\u05D7\u05E6\u05D5 \u05DB\u05D3\u05D9 \u05DC\u05E1\u05E8\u05D5\u05E7 \u05D0\u05EA \u05D4\u05D1\u05D5\u05E8\u05D3\u05D9\u05DD \u05E9\u05DC\u05DB\u05DD."}
                  </p>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "center", flexWrap: "wrap" }}>
                    <button
                      onClick={handleScan}
                      style={{
                        padding: "14px 36px",
                        borderRadius: 10,
                        border: "none",
                        background: "var(--color-accent)",
                        color: "#fff",
                        fontSize: 16,
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: "var(--font-dm)",
                        boxShadow: "0 4px 16px rgba(212,255,43,0.15)",
                      }}
                    >
                      {"\u05D4\u05EA\u05D7\u05DC \u05E1\u05E8\u05D9\u05E7\u05D4"}
                    </button>
                    <button
                      onClick={handleDemo}
                      style={{
                        background: "none",
                        border: "1px solid var(--color-border)",
                        borderRadius: 8,
                        padding: "10px 18px",
                        fontSize: 13,
                        color: "var(--color-accent)",
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: "var(--font-dm)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {"\u05E6\u05E4\u05D9\u05D9\u05D4 \u05D1\u05D3\u05D5\u05D2\u05DE\u05D4"}
                    </button>
                  </div>
                </>
              )}

              {/* Not connected — OAuth button + manual fallback */}
              {!connected && (
                <>
                  <p style={{ color: "var(--color-muted)", fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
                    {"\u05D7\u05D1\u05E8\u05D5 \u05D0\u05EA \u05D7\u05E9\u05D1\u05D5\u05DF \u05D4-Monday \u05E9\u05DC\u05DB\u05DD \u05D5\u05E0\u05D1\u05D3\u05D5\u05E7 \u05DE\u05D4 \u05D4\u05DE\u05E6\u05D1."}
                  </p>

                  <div style={{ textAlign: "center", marginBottom: 16 }}>
                    <button
                      onClick={() => {
                        window.location.href = "/api/monday-oauth/authorize?return_to=/health-check";
                      }}
                      style={{
                        padding: "14px 36px",
                        borderRadius: 10,
                        border: "none",
                        background: "var(--color-accent)",
                        color: "#fff",
                        fontSize: 16,
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: "var(--font-dm)",
                        boxShadow: "0 4px 16px rgba(212,255,43,0.15)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                        <polyline points="10 17 15 12 10 7" />
                        <line x1="15" y1="12" x2="3" y2="12" />
                      </svg>
                      {"\u05D4\u05EA\u05D7\u05D1\u05E8\u05D5 \u05DC-Monday"}
                    </button>
                    <p style={{ fontSize: 12, color: "var(--color-muted2)", margin: "10px 0 0" }}>
                      {"\u05DC\u05D7\u05D9\u05E6\u05D4 \u05D0\u05D7\u05EA. \u05E7\u05E8\u05D9\u05D0\u05D4 \u05D1\u05DC\u05D1\u05D3, \u05D1\u05DC\u05D9 \u05E9\u05D9\u05E0\u05D5\u05D9\u05D9\u05DD."}
                    </p>
                  </div>

                  <div style={{ textAlign: "center" }}>
                    <button
                      onClick={handleDemo}
                      style={{
                        background: "none",
                        border: "1px solid var(--color-border)",
                        borderRadius: 8,
                        padding: "6px 14px",
                        fontSize: 13,
                        color: "var(--color-accent)",
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: "var(--font-dm)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {"\u05E6\u05E4\u05D9\u05D9\u05D4 \u05D1\u05D3\u05D5\u05D2\u05DE\u05D4"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* Loading state */}
        {loading && (
          <div className="fade-up" style={{
            textAlign: "center",
            padding: 48,
            background: "var(--color-surf)",
            borderRadius: 16,
            border: "1px solid var(--color-border)",
          }}>
            <div style={{
              width: 40, height: 40,
              border: "3px solid var(--color-border)",
              borderTopColor: "var(--color-accent)",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 16px",
            }} />
            <p style={{ fontSize: 16, fontWeight: 600 }}>סורקים את סביבת Monday שלכם...</p>
            <p style={{ fontSize: 14, color: "var(--color-muted)" }}>
              קוראים בורדים, בודקים נתונים, מחפשים בעיות.
              <br />
              זה לוקח עד 30 שניות.
            </p>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="fade-up" style={{
            background: "var(--color-red-light)",
            borderRadius: 12,
            padding: "16px 20px",
            marginBottom: 16,
            border: "1px solid var(--color-red)",
          }}>
            <p style={{ margin: 0, fontSize: 15, color: "var(--color-red)", fontWeight: 600 }}>
              {error}
            </p>
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <div>
            {/* Demo banner */}
            {isDemo && (
              <div className="fade-up" style={{
                background: "var(--color-amber-light)",
                borderRadius: 10,
                padding: "10px 16px",
                marginBottom: 16,
                border: "1px solid var(--color-amber)",
                fontSize: 14,
                color: "#B8860B",
                fontWeight: 600,
                textAlign: "center",
              }}>
                זהו מצב הדגמה. הנתונים אינם אמיתיים.
              </div>
            )}

            {/* Summary section */}
            <HealthSummary
              result={result}
              boardNames={result.boardNames}
              totalBoardsInAccount={result.totalBoardsInAccount}
              coverageNote={result.coverage?.truncated ? result.coverage.note : undefined}
            />

            {/* Action plan */}
            <HealthActionPlan actions={buildActionPlan(result.findings)} />

            {/* Findings list */}
            {result.findings.length > 0 && (
              <div className="fade-up-3">
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
                  כל הממצאים ({result.findings.length})
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {result.findings
                    .sort((a, b) => severityOrder(a.severity) - severityOrder(b.severity))
                    .map((f, i) => (
                      <FindingCard key={f.id || i} finding={f} />
                    ))}
                </div>
              </div>
            )}

            {/* No findings state */}
            {result.findings.length === 0 && (
              <div className="fade-up-3" style={{
                background: "var(--color-green-light)",
                borderRadius: 16,
                border: "1px solid var(--color-green)",
                padding: 32,
                textAlign: "center",
              }}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>{"\u2705"}</div>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: "var(--color-green)", margin: "0 0 8px" }}>
                  מצוין! לא נמצאו בעיות.
                </h3>
                <p style={{ fontSize: 14, color: "var(--color-text2)", margin: 0, lineHeight: 1.6 }}>
                  סביבת ה-Monday שלכם מנוהלת היטב. המשיכו ככה.
                </p>
              </div>
            )}

            {/* CTA section */}
            <div className="fade-up-4" style={{
              background: "linear-gradient(135deg, rgba(212,255,43,0.04), rgba(212,255,43,0.08))",
              borderRadius: 16,
              border: "1px solid rgba(212,255,43,0.12)",
              padding: "28px 24px",
              textAlign: "center",
              marginTop: 24,
            }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginTop: 0, marginBottom: 8, color: "var(--color-text)" }}>
                רוצים שנעזור לכם לסדר את ה-Monday?
              </h3>
              <p style={{ fontSize: 14, color: "var(--color-muted)", lineHeight: 1.6, marginBottom: 16, maxWidth: 440, marginLeft: "auto", marginRight: "auto" }}>
                AnyDay יכולה לעזור לכם לתקן ממצאים, לבנות דוחות, ולהפוך את ה-Monday לכלי שבאמת עובד בשבילכם.
              </p>
              <button
                onClick={() => window.location.href = "mailto:hello@anyday.co.il?subject=\u05D0\u05D1\u05D7\u05D5\u05DF Monday Health Check — \u05D0\u05E9\u05DE\u05D7 \u05DC\u05E9\u05DE\u05D5\u05E2 \u05E2\u05D5\u05D3"}
                style={{
                  padding: "12px 32px",
                  borderRadius: 10,
                  border: "none",
                  background: "var(--color-accent)",
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "var(--font-dm)",
                }}
              >
                השאירו פרטים להמשך
              </button>
            </div>

            {/* Bottom actions */}
            <div className="fade-up-4 hc-bottom-actions" style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
              marginTop: 20,
              paddingBottom: 32,
            }}>
              {isDemo && (
                <button
                  onClick={handleReset}
                  style={{
                    padding: "12px 32px",
                    borderRadius: 10,
                    border: "none",
                    background: "var(--color-accent)",
                    color: "#fff",
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "var(--font-dm)",
                  }}
                >
                  סרקו את ה-Monday שלכם
                </button>
              )}
              <button
                onClick={handleReset}
                style={{
                  padding: "12px 32px",
                  borderRadius: 10,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surf)",
                  color: "var(--color-text)",
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "var(--font-dm)",
                }}
              >
                {"\uD83D\uDD04"} סריקה חדשה
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function FindingCard({ finding }: { finding: HealthFinding }) {
  const sev = SEVERITY[finding.severity];
  const hasEnriched = !!(finding.summary || finding.whyItMatters || finding.recommendedAction);

  return (
    <div style={{
      background: "var(--color-surf)",
      borderRadius: 12,
      border: "1px solid var(--color-border)",
      borderRight: `4px solid ${sev.color}`,
      padding: "16px 20px",
    }}>
      {/* Header badges */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
        <span>{sev.icon}</span>
        <span style={{
          fontSize: 12,
          fontWeight: 600,
          padding: "2px 8px",
          borderRadius: 6,
          background: sev.bg,
          color: sev.color,
        }}>
          {sev.label}
        </span>
        <span style={{
          fontSize: 12,
          padding: "2px 8px",
          borderRadius: 6,
          background: "var(--color-surf2)",
          color: "var(--color-muted)",
        }}>
          {CATEGORY_LABELS[finding.category] || finding.category}
        </span>
        {finding.boardName && (
          <span style={{
            fontSize: 12,
            padding: "2px 8px",
            borderRadius: 6,
            background: "var(--color-accent-light)",
            color: "var(--color-accent)",
            fontWeight: 600,
          }}>
            {"\uD83D\uDCCB"} {finding.boardName}
          </span>
        )}
        {finding.confidence && (
          <span style={{
            fontSize: 11,
            padding: "2px 6px",
            borderRadius: 6,
            background: "var(--color-surf2)",
            color: "var(--color-muted2)",
          }}>
            {CONFIDENCE_LABELS[finding.confidence]}
          </span>
        )}
      </div>

      {/* Title */}
      <h4 style={{ fontSize: 16, fontWeight: 600, margin: "4px 0" }}>
        {finding.title}
      </h4>

      {/* Summary (enriched) or description (fallback) */}
      <p style={{ fontSize: 14, color: "var(--color-text2)", margin: "4px 0 8px", lineHeight: 1.6 }}>
        {finding.summary || finding.description}
      </p>

      {!!finding.affectedItems && finding.affectedItems > 0 && (
        <span style={{ fontSize: 12, color: "var(--color-muted)" }}>
          {finding.affectedItems} פריטים מושפעים
        </span>
      )}

      {/* Why it matters (enriched) */}
      {finding.whyItMatters && (
        <div style={{
          marginTop: 10,
          padding: "10px 14px",
          borderRadius: 8,
          background: sev.bg,
          fontSize: 13,
          color: "var(--color-text2)",
          lineHeight: 1.6,
        }}>
          <strong style={{ color: sev.color }}>{"\u26A0\uFE0F"} למה זה חשוב:</strong>
          <br />
          {finding.whyItMatters}
        </div>
      )}

      {/* Recommended action (enriched) or suggestion (fallback) */}
      <div style={{
        marginTop: 8,
        padding: "10px 14px",
        borderRadius: 8,
        background: "var(--color-accent-light)",
        fontSize: 13,
        color: hasEnriched ? "var(--color-text2)" : "var(--color-accent)",
        lineHeight: 1.6,
      }}>
        <strong style={{ color: "var(--color-accent)" }}>{"\uD83D\uDCA1"} מה כדאי לעשות:</strong>
        {hasEnriched ? <br /> : " "}
        {finding.recommendedAction || finding.suggestion}
      </div>

      {/* Can be fixed automatically badge */}
      {finding.canBeFixedAutomatically && (
        <div style={{
          marginTop: 8,
          fontSize: 12,
          color: "var(--color-green)",
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}>
          {"\u26A1"} בעתיד, AnyDay תוכל לטפל בזה אוטומטית
        </div>
      )}
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================

function severityOrder(s: string): number {
  if (s === "critical") return 0;
  if (s === "warning") return 1;
  return 2;
}

function friendlyError(msg: string, status: number): string {
  if (status === 401) return "הטוקן לא תקין. ודאו שהעתקתם את הטוקן המלא מ-Monday \u2192 Admin \u2192 API.";
  if (status === 404) return "לא נמצאו בורדים בחשבון. ודאו שיש לכם לפחות בורד אחד פעיל ב-Monday.";
  if (status === 502) return "Monday.com לא מגיב כרגע. נסו שוב בעוד כמה דקות.";
  if (status === 400) return "הטוקן שהוזן לא בפורמט תקין. API Token של Monday מתחיל ב-eyJ...";
  return msg;
}
