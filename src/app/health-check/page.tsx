"use client";

import { useState } from "react";
import Link from "next/link";
import type { HealthCheckResult, HealthFinding } from "@/types/health";
import { getDemoResult } from "@/lib/health-demo-data";
import { buildActionPlan } from "@/lib/health-action-plan";
import { HealthSummary } from "@/components/health/HealthSummary";
import { HealthActionPlan } from "@/components/health/HealthActionPlan";

interface ScanResponse extends HealthCheckResult {
  boardNames: string[];
  totalBoardsInAccount: number;
}

// Severity config
const SEVERITY = {
  critical: { label: "קריטי", bg: "var(--color-red-light)", color: "var(--color-red)", icon: "\uD83D\uDD34" },
  warning: { label: "אזהרה", bg: "var(--color-amber-light)", color: "#B8860B", icon: "\uD83D\uDFE1" },
  info: { label: "טיפ", bg: "var(--color-blue-light)", color: "var(--color-blue)", icon: "\uD83D\uDD35" },
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
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  async function handleScan() {
    if (!token.trim()) {
      setError("נא להזין API Token של Monday.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setIsDemo(false);

    try {
      const res = await fetch("/api/health-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "שגיאה לא צפויה.");
        return;
      }

      setResult(data);
      setToken(""); // clear token from memory after successful scan
    } catch {
      setError("שגיאת רשת. בדקו את החיבור לאינטרנט ונסו שוב.");
    } finally {
      setLoading(false);
    }
  }

  function handleDemo() {
    setResult(getDemoResult());
    setIsDemo(true);
    setError(null);
    setToken("");
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
      {/* Header */}
      <header style={{
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
        }}>
          {"\u2190"} חזרה לעמוד הראשי
        </Link>
        <div style={{ width: 1, height: 24, background: "var(--color-border)" }} />
        <span style={{ fontSize: 28 }}>{"\uD83E\uDE7A"}</span>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Monday Health Check</h1>
          <p style={{ fontSize: 13, color: "var(--color-muted)", margin: 0 }}>by AnyDay</p>
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px" }}>

        {/* Token input */}
        {!result && !loading && (
          <div className="fade-up" style={{
            background: "var(--color-surf)",
            borderRadius: 16,
            border: "1px solid var(--color-border)",
            padding: 32,
            marginBottom: 24,
          }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginTop: 0, marginBottom: 8 }}>
              סריקת סביבת העבודה שלכם
            </h2>
            <p style={{ color: "var(--color-muted)", fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>
              הזינו את ה-API Token של Monday.com ונבדוק מה המצב.
              <br />
              <span style={{ fontSize: 13 }}>
                {"("}אפשר למצוא ב-Monday {"\u2192"} Admin {"\u2192"} API{")"}
              </span>
            </p>

            <div style={{ display: "flex", gap: 10 }}>
              <input
                type="password"
                placeholder="eyJhbGciOi..."
                value={token}
                onChange={e => setToken(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleScan()}
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  borderRadius: 10,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-bg)",
                  fontSize: 15,
                  fontFamily: "monospace",
                  direction: "ltr",
                  textAlign: "left",
                  outline: "none",
                }}
              />
              <button
                onClick={handleScan}
                style={{
                  padding: "12px 28px",
                  borderRadius: 10,
                  border: "none",
                  background: "var(--color-accent)",
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  fontFamily: "var(--font-dm)",
                }}
              >
                התחל סריקה
              </button>
            </div>

            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 12,
              flexWrap: "wrap",
              gap: 8,
            }}>
              <p style={{ fontSize: 12, color: "var(--color-muted2)", margin: 0 }}>
                {"\uD83D\uDD12"} הטוקן לא נשמר אצלנו. הוא משמש רק לסריקה חד-פעמית ונמחק מיד.
              </p>
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
                צפייה בדוגמה
              </button>
            </div>
          </div>
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
            <p style={{ fontSize: 16, fontWeight: 600 }}>סורק את סביבת Monday שלכם...</p>
            <p style={{ fontSize: 14, color: "var(--color-muted)" }}>
              קורא בורדים, בודק נתונים, מחפש בעיות.
              <br />
              זה יכול לקחת עד 30 שניות.
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
              {"\u274C"} {error}
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

            {/* Bottom actions */}
            <div className="fade-up-4" style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
              marginTop: 32,
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
          {"\u26A1"} בעתיד, AnyDay יוכל לטפל בזה אוטומטית
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
