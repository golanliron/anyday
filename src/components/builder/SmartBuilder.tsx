"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface BlueprintBoard {
  boardName: string;
  purpose?: string;
  groups?: { title: string; description?: string }[];
  columns?: {
    title: string;
    type: string;
    description?: string;
    required?: boolean;
    statusLabels?: string[];
    dropdownOptions?: string[];
  }[];
  automations?: { trigger: string; action: string; description?: string }[];
  items?: { name: string; group_index?: number; values?: Record<string, string> }[];
}

interface Blueprint {
  systemName: string;
  description?: string;
  boards: BlueprintBoard[];
}

interface Props {
  apiToken: string;
  existingBoards?: string[];
  onBoardCreated?: () => void;
}

const COLUMN_ICONS: Record<string, string> = {
  status: "●", text: "Aa", numbers: "#", date: "📅", people: "👤",
  phone: "📞", email: "✉", dropdown: "▼", long_text: "¶",
  timeline: "⟷", link: "🔗", checkbox: "☑", rating: "★", color_picker: "🎨",
};

export function SmartBuilder({ apiToken, existingBoards, onBoardCreated }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [building, setBuilding] = useState(false);
  const [buildResult, setBuildResult] = useState<{ success: boolean; message: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(text: string) {
    if (!text.trim()) return;

    const userMsg: Message = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const boardNames = existingBoards?.join(", ") || "אין מידע";
      const res = await fetch("/api/smart-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updated,
          existingBoards: boardNames,
        }),
      });

      const data = await res.json();
      if (data.error) {
        setMessages([...updated, { role: "assistant", content: `שגיאה: ${data.error}` }]);
      } else {
        setMessages([...updated, { role: "assistant", content: data.reply }]);
        if (data.blueprint) {
          setBlueprint(data.blueprint);
        }
      }
    } catch {
      setMessages([...updated, { role: "assistant", content: "שגיאת תקשורת. נסו שוב." }]);
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/parse-file", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.error) {
        setMessages(prev => [...prev, { role: "assistant", content: `שגיאה בקריאת הקובץ: ${data.error}` }]);
      } else {
        // Send the parsed data as a user message to the AI
        const fileMsg = `העליתי קובץ: ${data.fileName}\n\n${data.preview}`;
        await sendMessage(fileMsg);
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "שגיאה בהעלאת הקובץ. נסו שוב." }]);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleBuild() {
    if (!blueprint || !apiToken) return;

    setBuilding(true);
    setBuildResult(null);

    try {
      const res = await fetch("/api/builder-execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blueprint: {
            id: crypto.randomUUID(),
            templateId: "smart-builder",
            systemName: blueprint.systemName,
            description: blueprint.description || "",
            userDescription: "",
            orgType: "other",
            source: "ai",
            status: "approved",
            boards: blueprint.boards,
          },
          token: apiToken,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setBuildResult({
          success: true,
          message: `${data.results?.length || 0} בורדים נוצרו בהצלחה ב-Monday!`,
        });
        setBlueprint(null);
        onBoardCreated?.();
      } else {
        setBuildResult({
          success: false,
          message: data.error || "שגיאה ביצירת הבורדים",
        });
      }
    } catch {
      setBuildResult({ success: false, message: "שגיאת תקשורת" });
    } finally {
      setBuilding(false);
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100%", minHeight: 500,
      background: "var(--color-surf)", borderRadius: 16,
      border: "1px solid var(--color-border)", overflow: "hidden",
    }}>
      <style>{`
        .sb-msg-user { background: var(--color-accent); color: #fff; border-radius: 16px 16px 4px 16px; align-self: flex-end; }
        .sb-msg-ai { background: var(--color-bg); color: var(--color-text); border-radius: 16px 16px 16px 4px; align-self: flex-start; }
        .sb-msg-user, .sb-msg-ai { padding: 12px 16px; max-width: 85%; font-size: 14px; line-height: 1.7; white-space: pre-wrap; word-break: break-word; }
        .sb-input:focus { outline: none; border-color: var(--color-accent) !important; }
        .sb-chip { display: inline-block; padding: 8px 16px; border-radius: 20px; border: 1px solid var(--color-border);
          background: var(--color-bg); font-size: 13px; cursor: pointer; transition: all 0.15s; font-family: var(--font-dm); }
        .sb-chip:hover { border-color: var(--color-accent); background: var(--color-accent-light); }
        .sb-file-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 10px;
          border: 1px dashed var(--color-border); background: transparent; font-size: 13px; cursor: pointer;
          color: var(--color-muted); transition: all 0.15s; font-family: var(--font-dm); }
        .sb-file-btn:hover { border-color: var(--color-accent); color: var(--color-accent); }
        .sb-bp-card { background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 14px; padding: 16px; margin: 8px 0; }
      `}</style>

      {/* Header */}
      <div style={{
        padding: "16px 20px", borderBottom: "1px solid var(--color-border)",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 50,
          background: "#0035FF",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, color: "#FFEF00", fontWeight: 900,
        }}>A</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>AnyDay Builder</div>
          <div style={{ fontSize: 12, color: "var(--color-muted)" }}>
            המטמיע החכם שלכם — ספרו לי מה אתם צריכים
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "16px 20px",
        display: "flex", flexDirection: "column", gap: 10,
      }}>
        {/* Welcome state */}
        {isEmpty && (
          <div style={{ textAlign: "center", padding: "40px 16px" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🏗️</div>
            <h3 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px" }}>
              מה נבנה היום?
            </h3>
            <p style={{ fontSize: 14, color: "var(--color-muted)", margin: "0 0 24px", lineHeight: 1.7 }}>
              ספרו לי מה אתם מנהלים — או העלו אקסל קיים ואני אבנה מזה מערכת שלמה
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 16 }}>
              {[
                "בנה לי CRM לניהול לקוחות",
                "אני צריך מערכת לניהול פרויקטים",
                "ניהול מתנדבים ושעות",
                "מעקב פניות שירות",
                "ניהול תוכנית בוגרים",
                "משהו אחר...",
              ].map((text) => (
                <button
                  key={text}
                  className="sb-chip"
                  onClick={() => sendMessage(text)}
                >
                  {text}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
              <button
                className="sb-file-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                📁 העלו אקסל / CSV
              </button>
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={msg.role === "user" ? "sb-msg-user" : "sb-msg-ai"}
          >
            {msg.content}
          </div>
        ))}

        {/* Loading */}
        {loading && (
          <div className="sb-msg-ai" style={{ display: "flex", gap: 4, padding: "14px 20px" }}>
            <span style={{ animation: "sb-dot 1s 0s infinite" }}>●</span>
            <span style={{ animation: "sb-dot 1s 0.2s infinite" }}>●</span>
            <span style={{ animation: "sb-dot 1s 0.4s infinite" }}>●</span>
          </div>
        )}
        <style>{`@keyframes sb-dot { 0%,60%,100% { opacity:0.3 } 30% { opacity:1 } }`}</style>

        {/* Blueprint preview */}
        {blueprint && (
          <div style={{ alignSelf: "stretch" }}>
            <div className="sb-bp-card">
              <h4 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px" }}>
                📋 {blueprint.systemName}
              </h4>
              {blueprint.description && (
                <p style={{ fontSize: 13, color: "var(--color-muted)", margin: "0 0 12px" }}>
                  {blueprint.description}
                </p>
              )}

              {blueprint.boards.map((board, bi) => (
                <div key={bi} style={{
                  background: "var(--color-surf)", borderRadius: 10,
                  border: "1px solid var(--color-border)",
                  padding: "12px 14px", marginBottom: 8,
                }}>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
                    {board.boardName}
                  </div>
                  {board.purpose && (
                    <div style={{ fontSize: 12, color: "var(--color-muted)", marginBottom: 8 }}>
                      {board.purpose}
                    </div>
                  )}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
                    {board.columns?.map((col, ci) => (
                      <span key={ci} style={{
                        fontSize: 11, padding: "3px 8px", borderRadius: 6,
                        background: "var(--color-accent-light)", color: "var(--color-accent)",
                        fontWeight: 600,
                      }}>
                        {COLUMN_ICONS[col.type] || "·"} {col.title}
                      </span>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--color-muted)" }}>
                    {board.groups && <span>{board.groups.length} קבוצות</span>}
                    {board.automations && board.automations.length > 0 && (
                      <span>{board.automations.length} אוטומציות</span>
                    )}
                    {board.items && board.items.length > 0 && (
                      <span>{board.items.length} פריטים לייבוא</span>
                    )}
                  </div>
                </div>
              ))}

              {/* Build button */}
              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <button
                  onClick={handleBuild}
                  disabled={building}
                  style={{
                    flex: 1, padding: "12px 20px", borderRadius: 10, border: "none",
                    background: building ? "var(--color-muted)" : "var(--color-accent)",
                    color: "#fff", fontSize: 15, fontWeight: 700, cursor: building ? "default" : "pointer",
                    fontFamily: "var(--font-dm)",
                  }}
                >
                  {building ? "בונה ב-Monday..." : "🚀 בנה לי את זה ב-Monday"}
                </button>
                <button
                  onClick={() => setBlueprint(null)}
                  style={{
                    padding: "12px 16px", borderRadius: 10,
                    border: "1px solid var(--color-border)", background: "transparent",
                    color: "var(--color-muted)", fontSize: 13, cursor: "pointer",
                    fontFamily: "var(--font-dm)",
                  }}
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Build result */}
        {buildResult && (
          <div style={{
            padding: "14px 18px", borderRadius: 12,
            background: buildResult.success ? "var(--color-green-light)" : "var(--color-red-light)",
            border: `1px solid ${buildResult.success ? "var(--color-green)" : "var(--color-red)"}`,
            fontSize: 14, fontWeight: 600,
            color: buildResult.success ? "var(--color-green)" : "var(--color-red)",
          }}>
            {buildResult.success ? "✅" : "❌"} {buildResult.message}
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input area */}
      {!isEmpty && (
        <div style={{
          padding: "12px 16px", borderTop: "1px solid var(--color-border)",
          display: "flex", gap: 8, alignItems: "center",
        }}>
          <button
            className="sb-file-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{ padding: "8px 10px", fontSize: 16, border: "none" }}
            title="העלו אקסל / CSV"
          >
            {uploading ? "⏳" : "📎"}
          </button>
          <input
            className="sb-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !loading) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            placeholder="ספרו לי מה אתם צריכים..."
            disabled={loading}
            style={{
              flex: 1, padding: "10px 14px", borderRadius: 10,
              border: "1px solid var(--color-border)", background: "var(--color-bg)",
              fontSize: 14, fontFamily: "var(--font-dm)", color: "var(--color-text)",
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            style={{
              padding: "10px 18px", borderRadius: 10, border: "none",
              background: !input.trim() || loading ? "var(--color-border)" : "var(--color-accent)",
              color: "#fff", fontSize: 14, fontWeight: 600, cursor: !input.trim() || loading ? "default" : "pointer",
              fontFamily: "var(--font-dm)",
            }}
          >
            שלח
          </button>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.tsv,.xlsx,.xls"
        onChange={handleFileUpload}
        style={{ display: "none" }}
      />
    </div>
  );
}
