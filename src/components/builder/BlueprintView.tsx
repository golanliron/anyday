"use client";

import { useState } from "react";
import type { BuilderBlueprint, BuilderBoard, BuilderColumn } from "@/types/builder";

interface BoardResult {
  boardName: string;
  boardId: string | null;
  columns: string[];
  groups: string[];
  error?: string;
}

interface ExecuteResponse {
  success: boolean;
  totalBoards: number;
  successCount: number;
  results: BoardResult[];
  error?: string;
}

interface BlueprintViewProps {
  blueprint: BuilderBlueprint;
  onReset: () => void;
  mondayToken?: string | null;
}

const COLUMN_TYPE_ICONS: Record<string, string> = {
  text: "Aa",
  status: "\u25CF",
  people: "\uD83D\uDC64",
  date: "\uD83D\uDCC5",
  timeline: "\u2194",
  numbers: "#",
  dropdown: "\u25BC",
  phone: "\uD83D\uDCDE",
  email: "@",
  link: "\uD83D\uDD17",
  long_text: "\uD83D\uDCDD",
  checkbox: "\u2611",
  color: "\uD83C\uDFA8",
  file: "\uD83D\uDCCE",
  rating: "\u2B50",
  location: "\uD83D\uDCCD",
};

const COLUMN_TYPE_LABELS: Record<string, string> = {
  text: "\u05D8\u05E7\u05E1\u05D8",
  status: "\u05E1\u05D8\u05D8\u05D5\u05E1",
  people: "\u05D0\u05E0\u05E9\u05D9\u05DD",
  date: "\u05EA\u05D0\u05E8\u05D9\u05DA",
  timeline: "\u05E6\u05D9\u05E8 \u05D6\u05DE\u05DF",
  numbers: "\u05DE\u05E1\u05E4\u05E8",
  dropdown: "\u05E8\u05E9\u05D9\u05DE\u05D4",
  phone: "\u05D8\u05DC\u05E4\u05D5\u05DF",
  email: "\u05D0\u05D9\u05DE\u05D9\u05D9\u05DC",
  link: "\u05E7\u05D9\u05E9\u05D5\u05E8",
  long_text: "\u05D8\u05E7\u05E1\u05D8 \u05D0\u05E8\u05D5\u05DA",
  checkbox: "\u05EA\u05D9\u05D1\u05D4",
  color: "\u05E6\u05D1\u05E2",
  file: "\u05E7\u05D5\u05D1\u05E5",
  rating: "\u05D3\u05D9\u05E8\u05D5\u05D2",
  location: "\u05DE\u05D9\u05E7\u05D5\u05DD",
};

export function BlueprintView({ blueprint, onReset, mondayToken }: BlueprintViewProps) {
  const [token, setToken] = useState("");
  const [building, setBuilding] = useState(false);
  const [executeResult, setExecuteResult] = useState<ExecuteResponse | null>(null);
  const [executeError, setExecuteError] = useState<string | null>(null);
  const [showManualToken, setShowManualToken] = useState(false);

  // Use OAuth token if available
  const effectiveToken = mondayToken || token.trim();

  async function handleBuild() {
    if (!effectiveToken) {
      setExecuteError("\u05E0\u05D0 \u05DC\u05D4\u05EA\u05D7\u05D1\u05E8 \u05DC-Monday \u05E7\u05D5\u05D3\u05DD.");
      return;
    }
    setBuilding(true);
    setExecuteError(null);
    setExecuteResult(null);

    try {
      const res = await fetch("/api/builder-execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blueprint, apiToken: effectiveToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        setExecuteError(data.error || "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05DC\u05D0 \u05E6\u05E4\u05D5\u05D9\u05D4.");
        return;
      }
      setExecuteResult(data);
      setToken("");
    } catch {
      setExecuteError("\u05DC\u05D0 \u05D4\u05E6\u05DC\u05D7\u05E0\u05D5 \u05DC\u05D4\u05EA\u05D7\u05D1\u05E8 \u05DC\u05E9\u05E8\u05EA. \u05E0\u05E1\u05D5 \u05E9\u05D5\u05D1.");
    } finally {
      setBuilding(false);
    }
  }

  return (
    <div>
      {/* Blueprint header */}
      <div className="fade-up" style={{
        background: "linear-gradient(135deg, rgba(108,92,231,0.06), rgba(162,155,254,0.1))",
        borderRadius: 16,
        border: "1px solid rgba(108,92,231,0.15)",
        padding: "24px 28px",
        marginBottom: 20,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 24 }}>{"\uD83C\uDFD7\uFE0F"}</span>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: "var(--color-text)" }}>
            {blueprint.systemName}
          </h2>
        </div>
        <p style={{ fontSize: 14, color: "var(--color-muted)", lineHeight: 1.6, margin: "0 0 12px" }}>
          {blueprint.description}
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 13 }}>
          <span style={{
            background: "var(--color-accent-light)",
            color: "var(--color-accent)",
            padding: "4px 10px",
            borderRadius: 8,
            fontWeight: 600,
          }}>
            {blueprint.boards.length} {blueprint.boards.length === 1 ? "\u05D1\u05D5\u05E8\u05D3" : "\u05D1\u05D5\u05E8\u05D3\u05D9\u05DD"}
          </span>
          <span style={{
            background: "var(--color-accent-light)",
            color: "var(--color-accent)",
            padding: "4px 10px",
            borderRadius: 8,
            fontWeight: 600,
          }}>
            {blueprint.boards.reduce((sum, b) => sum + b.columns.length, 0)} {"\u05E2\u05DE\u05D5\u05D3\u05D5\u05EA"}
          </span>
          <span style={{
            background: "var(--color-accent-light)",
            color: "var(--color-accent)",
            padding: "4px 10px",
            borderRadius: 8,
            fontWeight: 600,
          }}>
            {blueprint.boards.reduce((sum, b) => sum + b.automations.length, 0)} {"\u05D0\u05D5\u05D8\u05D5\u05DE\u05E6\u05D9\u05D5\u05EA"}
          </span>
        </div>
        {blueprint.userDescription && (
          <div style={{
            marginTop: 12,
            padding: "8px 12px",
            background: "var(--color-surf)",
            borderRadius: 8,
            fontSize: 13,
            color: "var(--color-text2)",
            lineHeight: 1.5,
          }}>
            <strong>{"\u05DE\u05D4 \u05E1\u05D9\u05E4\u05E8\u05EA\u05DD:"}</strong> {blueprint.userDescription}
          </div>
        )}
      </div>

      {/* Boards */}
      {blueprint.boards.map((board, bi) => (
        <BoardCard key={bi} board={board} index={bi} />
      ))}

      {/* Build in Monday section */}
      {!executeResult && (
        <div className="fade-up-4" style={{
          background: "var(--color-surf)",
          borderRadius: 16,
          border: "1px solid var(--color-border)",
          padding: "28px 24px",
          marginTop: 24,
        }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginTop: 0, marginBottom: 8, color: "var(--color-text)", textAlign: "center" }}>
            {"\u05DE\u05E8\u05D5\u05E6\u05D9\u05DD \u05DE\u05D4\u05DE\u05D1\u05E0\u05D4? \u05D1\u05D5\u05D0\u05D5 \u05E0\u05D1\u05E0\u05D4 \u05D0\u05EA \u05D6\u05D4 \u05D1-Monday"}
          </h3>
          <p style={{ fontSize: 14, color: "var(--color-muted)", lineHeight: 1.6, marginBottom: 20, maxWidth: 440, marginLeft: "auto", marginRight: "auto", textAlign: "center" }}>
            {mondayToken
              ? "\u05D0\u05EA\u05DD \u05DE\u05D7\u05D5\u05D1\u05E8\u05D9\u05DD \u05DC-Monday. \u05DC\u05D7\u05E6\u05D5 \u05DB\u05D3\u05D9 \u05DC\u05D9\u05E6\u05D5\u05E8 \u05D0\u05EA \u05D4\u05D1\u05D5\u05E8\u05D3\u05D9\u05DD, \u05D4\u05E2\u05DE\u05D5\u05D3\u05D5\u05EA \u05D5\u05D4\u05E7\u05D1\u05D5\u05E6\u05D5\u05EA \u05D9\u05E9\u05D9\u05E8\u05D5\u05EA \u05D1\u05D7\u05E9\u05D1\u05D5\u05DF \u05E9\u05DC\u05DB\u05DD."
              : "\u05D7\u05D1\u05E8\u05D5 \u05D0\u05EA \u05D7\u05E9\u05D1\u05D5\u05DF \u05D4-Monday \u05E9\u05DC\u05DB\u05DD \u05D5\u05E0\u05D9\u05E6\u05D5\u05E8 \u05D0\u05EA \u05D4\u05D1\u05D5\u05E8\u05D3\u05D9\u05DD \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9\u05EA."}
          </p>

          {/* Connected state — just show build button */}
          {mondayToken && !building && (
            <div style={{ textAlign: "center" }}>
              <button
                onClick={handleBuild}
                disabled={building}
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
                  boxShadow: "0 4px 16px rgba(108,92,231,0.25)",
                }}
              >
                {"\u05D1\u05E0\u05D5 \u05DC\u05D9 \u05D0\u05EA \u05D6\u05D4 \u05D1-Monday"}
              </button>
            </div>
          )}

          {/* Not connected — show connect button + manual token fallback */}
          {!mondayToken && !building && (
            <>
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <button
                  onClick={() => {
                    window.location.href = "/api/monday-oauth/authorize?return_to=/builder";
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
                    boxShadow: "0 4px 16px rgba(108,92,231,0.25)",
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

              {/* Manual token fallback */}
              <div style={{
                display: "flex", alignItems: "center", gap: 12,
                marginBottom: 12,
              }}>
                <div style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
                <button
                  onClick={() => setShowManualToken(!showManualToken)}
                  style={{
                    fontSize: 12, color: "var(--color-muted)", background: "none",
                    border: "none", cursor: "pointer", fontFamily: "var(--font-dm)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {showManualToken ? "\u05D4\u05E1\u05EA\u05E8\u05D4" : "\u05D0\u05D5 \u05D4\u05D6\u05D9\u05E0\u05D5 Token \u05D9\u05D3\u05E0\u05D9\u05EA"}
                </button>
                <div style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
              </div>

              {showManualToken && (
                <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                  <input
                    type="password"
                    placeholder="eyJhbGciOi..."
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleBuild()}
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
                    onClick={handleBuild}
                    disabled={!token.trim()}
                    style={{
                      padding: "12px 28px",
                      borderRadius: 10,
                      border: "none",
                      background: !token.trim() ? "var(--color-border)" : "var(--color-accent)",
                      color: !token.trim() ? "var(--color-muted)" : "#fff",
                      fontSize: 15,
                      fontWeight: 600,
                      cursor: !token.trim() ? "not-allowed" : "pointer",
                      whiteSpace: "nowrap",
                      fontFamily: "var(--font-dm)",
                    }}
                  >
                    {"\u05D1\u05E0\u05D5"}
                  </button>
                </div>
              )}
            </>
          )}

          {/* Loading spinner */}
          {building && (
            <div style={{ textAlign: "center", marginTop: 20 }}>
              <div style={{
                width: 36, height: 36,
                border: "3px solid var(--color-border)",
                borderTopColor: "var(--color-accent)",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                margin: "0 auto 12px",
              }} />
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)", margin: 0 }}>
                {"\u05D9\u05D5\u05E6\u05E8\u05D9\u05DD \u05D1\u05D5\u05E8\u05D3\u05D9\u05DD, \u05E2\u05DE\u05D5\u05D3\u05D5\u05EA \u05D5\u05E7\u05D1\u05D5\u05E6\u05D5\u05EA..."}
              </p>
              <p style={{ fontSize: 13, color: "var(--color-muted)", margin: "4px 0 0" }}>
                {"\u05D6\u05D4 \u05D9\u05DB\u05D5\u05DC \u05DC\u05E7\u05D7\u05EA \u05E2\u05D3 30 \u05E9\u05E0\u05D9\u05D5\u05EA."}
              </p>
            </div>
          )}

          {/* Error */}
          {executeError && (
            <div style={{
              marginTop: 12,
              background: "var(--color-red-light)",
              borderRadius: 10,
              padding: "12px 16px",
              border: "1px solid var(--color-red)",
            }}>
              <p style={{ margin: 0, fontSize: 14, color: "var(--color-red)", fontWeight: 600 }}>
                {executeError}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Execution results */}
      {executeResult && (
        <div className="fade-up" style={{
          marginTop: 24,
        }}>
          {/* Success/partial banner */}
          <div style={{
            background: executeResult.success ? "var(--color-green-light)" : "var(--color-amber-light)",
            borderRadius: 16,
            border: `1px solid ${executeResult.success ? "var(--color-green)" : "var(--color-amber)"}`,
            padding: "24px 28px",
            textAlign: "center",
            marginBottom: 16,
          }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>
              {executeResult.success ? "\u2705" : "\u26A0\uFE0F"}
            </div>
            <h3 style={{
              fontSize: 20, fontWeight: 700, margin: "0 0 8px",
              color: executeResult.success ? "var(--color-green)" : "#B8860B",
            }}>
              {executeResult.success
                ? `${executeResult.successCount} \u05D1\u05D5\u05E8\u05D3\u05D9\u05DD \u05E0\u05D5\u05E6\u05E8\u05D5 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4!`
                : `${executeResult.successCount} \u05DE\u05EA\u05D5\u05DA ${executeResult.totalBoards} \u05D1\u05D5\u05E8\u05D3\u05D9\u05DD \u05E0\u05D5\u05E6\u05E8\u05D5`
              }
            </h3>
            <p style={{ fontSize: 14, color: "var(--color-text2)", margin: 0, lineHeight: 1.6 }}>
              {"\u05D4\u05D1\u05D5\u05E8\u05D3\u05D9\u05DD \u05DE\u05D7\u05DB\u05D9\u05DD \u05D0\u05EA\u05DB\u05DD \u05D1\u05D7\u05E9\u05D1\u05D5\u05DF \u05D4-Monday. \u05D4\u05D9\u05DB\u05E0\u05E1\u05D5 \u05DC-Monday \u05DB\u05D3\u05D9 \u05DC\u05E8\u05D0\u05D5\u05EA \u05D0\u05D5\u05EA\u05DD."}
            </p>
          </div>

          {/* Per-board results */}
          {executeResult.results.map((r, i) => (
            <div key={i} style={{
              background: "var(--color-surf)",
              borderRadius: 12,
              border: "1px solid var(--color-border)",
              borderRight: `4px solid ${r.error ? "var(--color-red)" : "var(--color-green)"}`,
              padding: "16px 20px",
              marginBottom: 10,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span>{r.error ? "\u274C" : "\u2705"}</span>
                <strong style={{ fontSize: 15, color: "var(--color-text)" }}>{r.boardName}</strong>
                {r.boardId && (
                  <span style={{ fontSize: 12, color: "var(--color-muted)", fontFamily: "monospace" }}>
                    ID: {r.boardId}
                  </span>
                )}
              </div>
              {r.error && (
                <p style={{ fontSize: 13, color: "var(--color-red)", margin: "4px 0 0" }}>{r.error}</p>
              )}
              {!r.error && (
                <p style={{ fontSize: 13, color: "var(--color-muted)", margin: "4px 0 0" }}>
                  {r.columns.length} {"\u05E2\u05DE\u05D5\u05D3\u05D5\u05EA"} + {r.groups.length} {"\u05E7\u05D1\u05D5\u05E6\u05D5\u05EA"}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Bottom actions */}
      <div className="fade-up-4" style={{
        display: "flex",
        gap: 12,
        justifyContent: "center",
        flexWrap: "wrap",
        marginTop: 20,
        paddingBottom: 32,
      }}>
        <button
          onClick={onReset}
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
          {"\uD83D\uDD04 \u05D1\u05E0\u05D5 \u05DE\u05E2\u05E8\u05DB\u05EA \u05D0\u05D7\u05E8\u05EA"}
        </button>
        <button
          onClick={() => window.location.href = "mailto:hello@anyday.co.il?subject=\u05D0\u05D4\u05D1\u05EA\u05D9 \u05D0\u05EA \u05D4\u05DE\u05D1\u05E0\u05D4 \u05E9\u05DC AnyDay \u2014 \u05E8\u05D5\u05E6\u05D4 \u05DC\u05D4\u05EA\u05E7\u05D3\u05DD"}
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
          {"\u05D3\u05D1\u05E8\u05D5 \u05D0\u05D9\u05EA\u05E0\u05D5 \u05E2\u05DC \u05D4\u05D8\u05DE\u05E2\u05D4"}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Board Card
// ============================================================

function BoardCard({ board, index }: { board: BuilderBoard; index: number }) {
  return (
    <div className={`fade-up-${Math.min(index + 2, 4)}`} style={{
      background: "var(--color-surf)",
      borderRadius: 16,
      border: "1px solid var(--color-border)",
      padding: "24px 28px",
      marginBottom: 16,
    }}>
      {/* Board name */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 18 }}>{"\uD83D\uDCCB"}</span>
        <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "var(--color-text)" }}>
          {board.boardName}
        </h3>
      </div>
      <p style={{ fontSize: 13, color: "var(--color-muted)", lineHeight: 1.5, margin: "4px 0 16px" }}>
        {board.purpose}
      </p>

      {/* Groups */}
      <SectionTitle title={`\u05E7\u05D1\u05D5\u05E6\u05D5\u05EA (${board.groups.length})`} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {board.groups.map((g, i) => (
          <span key={i} style={{
            background: "var(--color-accent-light)",
            color: "var(--color-accent)",
            padding: "4px 12px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
          }}>
            {g.title}
          </span>
        ))}
      </div>

      {/* Columns */}
      <SectionTitle title={`\u05E2\u05DE\u05D5\u05D3\u05D5\u05EA (${board.columns.length})`} />
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: 8,
        marginBottom: 16,
      }}>
        {board.columns.map((col, i) => (
          <ColumnChip key={i} column={col} />
        ))}
      </div>

      {/* Automations */}
      {board.automations.length > 0 && (
        <>
          <SectionTitle title={`\u05D0\u05D5\u05D8\u05D5\u05DE\u05E6\u05D9\u05D5\u05EA (${board.automations.length})`} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {board.automations.map((a, i) => (
              <div key={i} style={{
                background: "var(--color-bg)",
                borderRadius: 10,
                padding: "10px 14px",
                fontSize: 13,
                lineHeight: 1.5,
              }}>
                <span style={{ color: "var(--color-accent)", fontWeight: 600 }}>{"\u26A1 \u05DB\u05E9"}</span>{" "}
                <span style={{ color: "var(--color-text)" }}>{a.trigger}</span>
                {" \u2192 "}
                <span style={{ color: "var(--color-text)", fontWeight: 600 }}>{a.action}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Reports */}
      {board.reports.length > 0 && (
        <>
          <SectionTitle title={`\u05D3\u05D5\u05D7\u05D5\u05EA (${board.reports.length})`} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {board.reports.map((r, i) => (
              <div key={i} style={{
                background: "var(--color-bg)",
                borderRadius: 10,
                padding: "8px 14px",
                fontSize: 13,
              }}>
                <span style={{ fontWeight: 600, color: "var(--color-text)" }}>{"\uD83D\uDCCA"} {r.title}</span>
                <span style={{ color: "var(--color-muted)", marginRight: 6 }}> — {r.description}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function SectionTitle({ title }: { title: string }) {
  return (
    <h4 style={{
      fontSize: 13,
      fontWeight: 700,
      color: "var(--color-muted)",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
      margin: "0 0 8px",
    }}>
      {title}
    </h4>
  );
}

function ColumnChip({ column }: { column: BuilderColumn }) {
  const icon = COLUMN_TYPE_ICONS[column.type] || "?";
  const typeLabel = COLUMN_TYPE_LABELS[column.type] || column.type;

  return (
    <div style={{
      background: "var(--color-bg)",
      borderRadius: 10,
      padding: "8px 12px",
      display: "flex",
      alignItems: "center",
      gap: 8,
      fontSize: 13,
      border: column.required ? "1px solid rgba(108,92,231,0.2)" : "1px solid transparent",
    }}>
      <span style={{
        width: 24,
        height: 24,
        borderRadius: 6,
        background: "var(--color-accent-light)",
        color: "var(--color-accent)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 11,
        fontWeight: 700,
        flexShrink: 0,
      }}>
        {icon}
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontWeight: 600,
          color: "var(--color-text)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}>
          {column.title}
          {column.required && <span style={{ color: "var(--color-accent)", marginRight: 2 }}> *</span>}
        </div>
        <div style={{ fontSize: 11, color: "var(--color-muted)" }}>{typeLabel}</div>
      </div>
      {column.statusLabels && column.statusLabels.length > 0 && (
        <div style={{
          marginRight: "auto",
          display: "flex",
          gap: 3,
          flexWrap: "wrap",
          justifyContent: "flex-end",
        }}>
          {column.statusLabels.slice(0, 3).map((label, i) => (
            <span key={i} style={{
              fontSize: 10,
              background: "var(--color-accent-light)",
              color: "var(--color-accent)",
              padding: "1px 6px",
              borderRadius: 4,
              whiteSpace: "nowrap",
            }}>
              {label}
            </span>
          ))}
          {column.statusLabels.length > 3 && (
            <span style={{ fontSize: 10, color: "var(--color-muted)" }}>
              +{column.statusLabels.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
