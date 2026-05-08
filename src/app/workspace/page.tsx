"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { listBoards, loadBoard } from "@/lib/api-client";
import { BoardDashboard } from "@/components/board/BoardDashboard";
import { SmartBuilder } from "@/components/builder/SmartBuilder";
import type { MondayBoard, MondayItem } from "@/types";

interface BoardSummary {
  id: string;
  name: string;
  items_count: number;
  description: string;
}

export default function WorkspacePage() {
  const [mondayToken, setMondayToken] = useState<string | null>(null);
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [loadingBoards, setLoadingBoards] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dashboard state
  const [selectedBoard, setSelectedBoard] = useState<MondayBoard | null>(null);
  const [selectedItems, setSelectedItems] = useState<MondayItem[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState("");
  const [loadingBoard, setLoadingBoard] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);

  // Pick up token from OAuth redirect or localStorage
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const oauthToken = params.get("monday_token");
      if (oauthToken) {
        setMondayToken(oauthToken);
        localStorage.setItem("anyday-token", oauthToken);
        window.history.replaceState({}, "", window.location.pathname);
        fetchBoards(oauthToken);
        return;
      }
      const saved = localStorage.getItem("anyday-token");
      if (saved) {
        setMondayToken(saved);
        fetchBoards(saved);
      }
    } catch {}
  }, []);

  async function fetchBoards(token: string) {
    setLoadingBoards(true);
    setError(null);
    try {
      const b = await listBoards(token);
      setBoards(b);
    } catch {
      setError("\u05DC\u05D0 \u05D4\u05E6\u05DC\u05D7\u05E0\u05D5 \u05DC\u05D8\u05E2\u05D5\u05DF \u05D1\u05D5\u05E8\u05D3\u05D9\u05DD. \u05E0\u05E1\u05D5 \u05DC\u05D4\u05EA\u05D7\u05D1\u05E8 \u05DE\u05D7\u05D3\u05E9.");
      setMondayToken(null);
      try { localStorage.removeItem("anyday-token"); } catch {}
    } finally {
      setLoadingBoards(false);
    }
  }

  async function handleSelectBoard(id: string) {
    if (!mondayToken) return;
    setSelectedBoardId(id);
    setLoadingBoard(true);
    setError(null);
    try {
      const data = await loadBoard(id, mondayToken);
      setSelectedBoard(data.board);
      setSelectedItems(data.items);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D8\u05E2\u05D9\u05E0\u05EA \u05D4\u05D1\u05D5\u05E8\u05D3");
    } finally {
      setLoadingBoard(false);
    }
  }

  function handleBack() {
    setSelectedBoard(null);
    setSelectedItems([]);
    setSelectedBoardId("");
    setError(null);
  }

  function handleDisconnect() {
    setMondayToken(null);
    setBoards([]);
    setSelectedBoard(null);
    setSelectedItems([]);
    try { localStorage.removeItem("anyday-token"); } catch {}
  }

  // ========== Dashboard view ==========
  if (selectedBoard) {
    return (
      <BoardDashboard
        board={selectedBoard}
        items={selectedItems}
        onBack={handleBack}
        apiToken={mondayToken || ""}
        boardId={selectedBoardId}
      />
    );
  }

  // ========== Main workspace view ==========
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
          .ws-main { padding: 20px 14px !important; }
          .ws-header { padding: 14px 16px !important; }
          .ws-board-grid { grid-template-columns: 1fr !important; }
        }
        .ws-board-card:hover {
          border-color: var(--color-accent) !important;
          box-shadow: 0 4px 20px rgba(0,53,255,0.12) !important;
          transform: translateY(-2px);
        }
        .ws-board-card { transition: all 0.2s ease; cursor: pointer; }
      `}</style>

      {/* Header */}
      <header className="ws-header" style={{
        padding: "20px 24px",
        borderBottom: "1px solid var(--color-border)",
        background: "var(--color-surf)",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}>
        <Link href="/" style={{
          fontSize: 13, color: "var(--color-accent)", textDecoration: "none",
          fontWeight: 600, display: "flex", alignItems: "center", gap: 4,
          marginLeft: 8, whiteSpace: "nowrap",
        }}>
          {"\u2190"} {"\u05D7\u05D6\u05E8\u05D4"}
        </Link>
        <div style={{ width: 1, height: 24, background: "var(--color-border)", flexShrink: 0 }} />
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>AnyDay Workspace</h1>
          <p style={{ fontSize: 13, color: "var(--color-muted)", margin: 0 }}>
            {mondayToken ? `${boards.length} \u05D1\u05D5\u05E8\u05D3\u05D9\u05DD` : "\u05DC\u05D0 \u05DE\u05D7\u05D5\u05D1\u05E8"}
          </p>
        </div>
        {mondayToken && (
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

      <main className="ws-main" style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px" }}>

        {/* Not connected — show connect button */}
        {!mondayToken && !loadingBoards && (
          <div style={{
            textAlign: "center",
            padding: "60px 24px",
            background: "var(--color-surf)",
            borderRadius: 16,
            border: "1px solid var(--color-border)",
          }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginTop: 0, marginBottom: 12 }}>
              {"\u05D4\u05EA\u05D7\u05D1\u05E8\u05D5 \u05DC-Monday \u05DB\u05D3\u05D9 \u05DC\u05D4\u05EA\u05D7\u05D9\u05DC"}
            </h2>
            <p style={{ fontSize: 15, color: "var(--color-muted)", marginBottom: 24, lineHeight: 1.7 }}>
              {"\u05D7\u05D1\u05E8\u05D5 \u05D0\u05EA \u05D7\u05E9\u05D1\u05D5\u05DF \u05D4-Monday \u05E9\u05DC\u05DB\u05DD \u05D5\u05EA\u05D5\u05DB\u05DC\u05D5 \u05DC\u05E8\u05D0\u05D5\u05EA \u05D3\u05E9\u05D1\u05D5\u05E8\u05D3\u05D9\u05DD, \u05DC\u05E0\u05EA\u05D7 \u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D5\u05DC\u05D1\u05E0\u05D5\u05EA \u05DE\u05E2\u05E8\u05DB\u05D5\u05EA \u05D7\u05D3\u05E9\u05D5\u05EA."}
            </p>
            <button
              onClick={() => { window.location.href = "/api/monday-oauth/authorize?return_to=/workspace"; }}
              style={{
                padding: "16px 40px", borderRadius: 12, border: "none",
                background: "var(--color-accent)", color: "#fff",
                fontSize: 17, fontWeight: 700, cursor: "pointer",
                fontFamily: "var(--font-dm)",
                boxShadow: "0 4px 16px rgba(0,53,255,0.25)",
                display: "inline-flex", alignItems: "center", gap: 10,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              {"\u05D4\u05EA\u05D7\u05D1\u05E8\u05D5 \u05DC-Monday"}
            </button>
          </div>
        )}

        {/* Loading boards */}
        {loadingBoards && (
          <div style={{ textAlign: "center", padding: 48 }}>
            <div style={{
              width: 40, height: 40,
              border: "3px solid var(--color-border)",
              borderTopColor: "var(--color-accent)",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 16px",
            }} />
            <p style={{ fontSize: 16, fontWeight: 600 }}>{"\u05D8\u05D5\u05E2\u05E0\u05D9\u05DD \u05D1\u05D5\u05E8\u05D3\u05D9\u05DD..."}</p>
          </div>
        )}

        {/* Loading single board */}
        {loadingBoard && (
          <div style={{ textAlign: "center", padding: 48 }}>
            <div style={{
              width: 40, height: 40,
              border: "3px solid var(--color-border)",
              borderTopColor: "var(--color-accent)",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 16px",
            }} />
            <p style={{ fontSize: 16, fontWeight: 600 }}>{"\u05D8\u05D5\u05E2\u05DF \u05D3\u05E9\u05D1\u05D5\u05E8\u05D3..."}</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            background: "var(--color-red-light)", borderRadius: 12,
            padding: "16px 20px", marginBottom: 16,
            border: "1px solid var(--color-red)",
          }}>
            <p style={{ margin: 0, fontSize: 15, color: "var(--color-red)", fontWeight: 600 }}>{error}</p>
          </div>
        )}

        {/* Smart Builder */}
        {mondayToken && !loadingBoards && !loadingBoard && showBuilder && (
          <div style={{ marginBottom: 24 }}>
            <button
              onClick={() => setShowBuilder(false)}
              style={{
                fontSize: 13, color: "var(--color-accent)", background: "none",
                border: "none", cursor: "pointer", fontWeight: 600,
                fontFamily: "var(--font-dm)", marginBottom: 12,
                display: "flex", alignItems: "center", gap: 4,
              }}
            >
              {"\u2190 \u05D7\u05D6\u05E8\u05D4 \u05DC\u05D1\u05D5\u05E8\u05D3\u05D9\u05DD"}
            </button>
            <SmartBuilder
              apiToken={mondayToken}
              existingBoards={boards.map(b => b.name)}
              onBoardCreated={() => {
                setShowBuilder(false);
                fetchBoards(mondayToken!);
              }}
            />
          </div>
        )}

        {/* Board list */}
        {mondayToken && !loadingBoards && !loadingBoard && !showBuilder && (
          <>
            {/* Build new system — prominent CTA */}
            <div
              onClick={() => setShowBuilder(true)}
              style={{
                background: "#0035FF",
                borderRadius: 16, padding: "24px 28px", marginBottom: 20,
                cursor: "pointer", transition: "transform 0.2s, box-shadow 0.2s",
                boxShadow: "0 4px 20px rgba(0,53,255,0.25)",
                display: "flex", alignItems: "center", gap: 16,
                border: "none",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 30px rgba(0,53,255,0.4), 0 0 40px rgba(255,239,0,0.15)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,53,255,0.25)"; }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: 50,
                background: "#FFEF00", display: "flex",
                alignItems: "center", justifyContent: "center",
                fontSize: 22, flexShrink: 0, color: "#0035FF", fontWeight: 900,
              }}>
                A
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#FFEF00", marginBottom: 4 }}>
                  {"\u05D1\u05E0\u05D5 \u05DE\u05E2\u05E8\u05DB\u05EA \u05D7\u05D3\u05E9\u05D4 \u05E2\u05DD AI"}
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 1.5 }}>
                  {"\u05E1\u05E4\u05E8\u05D5 \u05DE\u05D4 \u05D0\u05EA\u05DD \u05E6\u05E8\u05D9\u05DB\u05D9\u05DD, \u05D4\u05E2\u05DC\u05D5 \u05D0\u05E7\u05E1\u05DC \u2014 \u05D5\u05D0\u05E0\u05D9 \u05D0\u05D1\u05E0\u05D4 \u05DC\u05DB\u05DD \u05DE\u05E2\u05E8\u05DB\u05EA \u05E9\u05DC\u05DE\u05D4 \u05D1-Monday"}
                </div>
              </div>
              <div style={{ marginRight: "auto", fontSize: 24, color: "rgba(255,255,255,0.6)" }}>{"\u2190"}</div>
            </div>

            {boards.length > 0 && (
              <>
                <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 14px" }}>
                  {"הבורדים שלכם"}
                </h2>
                <div className="ws-board-grid" style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                  gap: 14,
                }}>
                  {boards.map(b => (
                    <div
                      key={b.id}
                      className="ws-board-card"
                      onClick={() => handleSelectBoard(b.id)}
                      style={{
                        background: "var(--color-surf)",
                        borderRadius: 14,
                        border: "1px solid var(--color-border)",
                        padding: "20px 18px",
                      }}
                    >
                      <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 6px", lineHeight: 1.3 }}>
                        {b.name}
                      </h3>
                      {b.description && (
                        <p style={{
                          fontSize: 13, color: "var(--color-muted)", margin: "0 0 10px",
                          lineHeight: 1.5, overflow: "hidden",
                          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                        }}>
                          {b.description}
                        </p>
                      )}
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{
                          fontSize: 12, fontWeight: 600, color: "var(--color-accent)",
                          background: "var(--color-accent-light)", padding: "3px 8px", borderRadius: 6,
                        }}>
                          {b.items_count} {"פריטים"}
                        </span>
                        <span style={{ fontSize: 12, color: "var(--color-muted2)" }}>
                          {"ID: "}{b.id}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {boards.length === 0 && !error && (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <p style={{ fontSize: 15, color: "var(--color-muted)" }}>
                  {"אין עדיין בורדים — לחצו למעלה כדי לבנות את המערכת הראשונה שלכם"}
                </p>
              </div>
            )}
          </>
        )}
      </main>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
