"use client";

import { useSession, signOut } from "next-auth/react";

import { useState, useRef, useEffect } from "react";
import { Spinner } from "../ui/Spinner";
import { changeColumnValue, changeSimpleValue, createItem } from "@/lib/api-client";
import type { MondayBoard, MondayItem } from "@/types";
import DataEditPanel from "./DataEditPanel";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  mode: string;
}

type SidePanel = "dashboard" | "automations" | "impact" | "report" | "alerts" | "data" | "coming-soon" | null;

interface BrandConfig {
  orgName: string;
  logoUrl: string;
  colors: [string, string, string, string]; // ראשי, משני, שלישי, רביעי
}

const BAR_COLORS = ["#6C5CE7", "#A29BFE", "#00B894", "#FDCB6E", "#E17055", "#0984E3", "#FD79A8", "#55EFC4"];

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function extractColorsFromImage(imgSrc: string): Promise<[string, string, string, string]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const size = 64;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(["#6C5CE7", "#A29BFE", "#00B894", "#FDCB6E"]); return; }
      ctx.drawImage(img, 0, 0, size, size);
      const data = ctx.getImageData(0, 0, size, size).data;
      // Collect non-white, non-black pixels
      const pixels: [number, number, number][] = [];
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
        if (a < 128) continue; // skip transparent
        const brightness = (r + g + b) / 3;
        if (brightness > 240 || brightness < 15) continue; // skip near-white/black
        pixels.push([r, g, b]);
      }
      if (pixels.length < 10) { resolve(["#6C5CE7", "#A29BFE", "#00B894", "#FDCB6E"]); return; }
      // Simple k-means with 4 clusters
      const clusters: [number, number, number][] = [
        pixels[0],
        pixels[Math.floor(pixels.length * 0.25)],
        pixels[Math.floor(pixels.length * 0.5)],
        pixels[Math.floor(pixels.length * 0.75)],
      ];
      for (let iter = 0; iter < 10; iter++) {
        const groups: [number, number, number][][] = [[], [], [], []];
        for (const px of pixels) {
          let minDist = Infinity, minIdx = 0;
          for (let c = 0; c < 4; c++) {
            const d = (px[0] - clusters[c][0]) ** 2 + (px[1] - clusters[c][1]) ** 2 + (px[2] - clusters[c][2]) ** 2;
            if (d < minDist) { minDist = d; minIdx = c; }
          }
          groups[minIdx].push(px);
        }
        for (let c = 0; c < 4; c++) {
          if (groups[c].length === 0) continue;
          clusters[c] = [
            Math.round(groups[c].reduce((s, p) => s + p[0], 0) / groups[c].length),
            Math.round(groups[c].reduce((s, p) => s + p[1], 0) / groups[c].length),
            Math.round(groups[c].reduce((s, p) => s + p[2], 0) / groups[c].length),
          ];
        }
      }
      // Sort by saturation (most vibrant first)
      clusters.sort((a, b) => {
        const satA = Math.max(...a) - Math.min(...a);
        const satB = Math.max(...b) - Math.min(...b);
        return satB - satA;
      });
      const toHex = (c: [number, number, number]) =>
        "#" + c.map(v => v.toString(16).padStart(2, "0")).join("");
      resolve([toHex(clusters[0]), toHex(clusters[1]), toHex(clusters[2]), toHex(clusters[3])]);
    };
    img.onerror = () => resolve(["#6C5CE7", "#A29BFE", "#00B894", "#FDCB6E"]);
    img.src = imgSrc;
  });
}

function renderInline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={j} style={{ fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
    }
    return <span key={j}>{part}</span>;
  });
}

function FormattedText({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty line
    if (!trimmed) { elements.push(<br key={i} />); i++; continue; }

    // Horizontal rule
    if (/^-{3,}$/.test(trimmed) || /^\*{3,}$/.test(trimmed)) {
      elements.push(<div key={i} style={{ height: 1, background: "var(--brand-pc, #6C5CE7)", opacity: 0.15, margin: "12px 0" }} />);
      i++; continue;
    }

    // Headers ## and ###
    if (trimmed.startsWith("### ")) {
      elements.push(
        <div key={i} style={{ fontSize: 14, fontWeight: 700, color: "var(--brand-pc, #6C5CE7)", marginTop: 14, marginBottom: 6 }}>
          {renderInline(trimmed.slice(4))}
        </div>
      );
      i++; continue;
    }
    if (trimmed.startsWith("## ")) {
      elements.push(
        <div key={i} style={{
          fontSize: 16, fontWeight: 800, color: "#2D2252", marginTop: 16, marginBottom: 8,
          paddingBottom: 6, borderBottom: "2px solid var(--brand-pc, #6C5CE7)", opacity: 0.8,
        }}>
          {renderInline(trimmed.slice(3))}
        </div>
      );
      i++; continue;
    }
    if (trimmed.startsWith("# ")) {
      elements.push(
        <div key={i} style={{ fontSize: 18, fontWeight: 800, color: "#2D2252", marginTop: 16, marginBottom: 10 }}>
          {renderInline(trimmed.slice(2))}
        </div>
      );
      i++; continue;
    }

    // Table detection: | col | col |
    if (trimmed.startsWith("|") && trimmed.endsWith("|") && trimmed.includes("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
        tableLines.push(lines[i].trim());
        i++;
      }
      // Parse table
      const rows = tableLines
        .filter(l => !/^\|[\s-:|]+\|$/.test(l)) // skip separator row
        .map(l => l.slice(1, -1).split("|").map(c => c.trim()));

      if (rows.length >= 1) {
        const header = rows[0];
        const body = rows.slice(1);
        // Check if it's a data table with numbers - render as visual bars
        const hasNumbers = body.length > 0 && body.some(row =>
          row.some(cell => /^\d+/.test(cell.replace(/[~%]/g, "")))
        );

        if (hasNumbers && header.length === 2 && body.length >= 2) {
          // Render as horizontal bar chart
          const dataRows = body.map(row => {
            const numMatch = row[1]?.replace(/[~%]/g, "").match(/(\d+)/);
            return { label: row[0], value: numMatch ? parseInt(numMatch[1]) : 0, raw: row[1] };
          }).filter(r => r.label);
          const maxVal = Math.max(...dataRows.map(r => r.value), 1);

          elements.push(
            <div key={`table-${tableLines[0]}`} style={{
              background: "#F9F7FF", borderRadius: 14,
              padding: "14px 16px", margin: "10px 0",
              border: "1px solid #E8E4F7",
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#2D2252", marginBottom: 10 }}>
                {header[0]} / {header[1]}
              </div>
              {dataRows.map((row, ri) => {
                const barWidth = Math.round((row.value / maxVal) * 100);
                return (
                  <div key={ri} style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                      <span style={{ color: "#2D2252", fontWeight: 500 }}>{row.label}</span>
                      <span style={{ color: "#7C6FD0", fontWeight: 600 }}>{row.raw}</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 4, background: "#E8E4F7", overflow: "hidden" }}>
                      <div style={{
                        height: "100%", borderRadius: 4,
                        background: `linear-gradient(90deg, ${BAR_COLORS[ri % BAR_COLORS.length]}, ${BAR_COLORS[ri % BAR_COLORS.length]}aa)`,
                        width: `${barWidth}%`, transition: "width 0.6s ease",
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          );
        } else {
          // Render as styled table
          elements.push(
            <div key={`table-${tableLines[0]}`} style={{
              overflowX: "auto", margin: "10px 0",
              borderRadius: 12, border: "1px solid #E8E4F7",
            }}>
              <table style={{
                width: "100%", borderCollapse: "collapse", fontSize: 13, direction: "rtl",
              }}>
                <thead>
                  <tr style={{ background: "#F5F3FA" }}>
                    {header.map((h, hi) => (
                      <th key={hi} style={{
                        padding: "10px 12px", textAlign: "right",
                        fontWeight: 700, color: "#2D2252",
                        borderBottom: "2px solid #E0DCF0",
                      }}>{renderInline(h)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {body.map((row, ri) => (
                    <tr key={ri} style={{
                      background: ri % 2 === 0 ? "transparent" : "#FBFAFE",
                    }}>
                      {row.map((cell, ci) => (
                        <td key={ci} style={{
                          padding: "8px 12px", textAlign: "right",
                          color: "#2D2252", borderBottom: "1px solid #F0EEF8",
                        }}>{renderInline(cell)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
      }
      continue;
    }

    // Numbered list
    const numMatch = trimmed.match(/^(\d+)\.\s/);
    if (numMatch) {
      elements.push(
        <div key={i} style={{ display: "flex", gap: 6, marginBottom: 4 }}>
          <span style={{ color: "var(--brand-pc, #6C5CE7)", fontWeight: 700, minWidth: 18 }}>{numMatch[1]}.</span>
          <span>{renderInline(line)}</span>
        </div>
      );
      i++; continue;
    }

    // Bullet list
    if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
      elements.push(
        <div key={i} style={{ display: "flex", gap: 6, marginBottom: 4, paddingRight: 8 }}>
          <span style={{ color: "var(--brand-pc, #6C5CE7)" }}>•</span>
          <span>{renderInline(trimmed.slice(2))}</span>
        </div>
      );
      i++; continue;
    }

    // Regular text
    elements.push(<div key={i} style={{ marginBottom: 2 }}>{renderInline(line)}</div>);
    i++;
  }

  return <div>{elements}</div>;
}

const MODE_CONFIG: Record<string, { title: string; subtitle: string; suggestions: string[]; placeholder: string; loadingMessages: string[] }> = {
  chat: {
    title: "מה צריך לקרות היום?",
    subtitle: "סיכום, עדכון, דוח — במשפט אחד",
    suggestions: ["תן סיכום מצב + המלצות", "שנה את כל הממתינים לבטיפול", "צור פריט חדש: [שם] בקבוצה [שם]", "שלח לי דוח שבועי במייל", "העבר הושלמו לארכיון", "מי אחראי על הכי הרבה?"],
    placeholder: "כתבו מה צריך לקרות...",
    loadingMessages: [
      "מנתח נתונים...",
      "סורק את הבורד...",
      "עובד על זה...",
      "רגע...",
      "מעבד נתונים...",
      "מסכם...",
    ],
  },
  dashboard: {
    title: "דשבורד מוכן לשליחה",
    subtitle: "גרפים, מספרים ותובנות — מוכן לפגישה או למייל",
    suggestions: ["צור דשבורד מנהלים", "תן 4 KPIs מרכזיים", "הכן סיכום שבועי לצוות", "סכם הכל בטבלה מסודרת"],
    placeholder: "איזה דשבורד להכין?",
    loadingMessages: [
      "מצייר גרפים...",
      "הנתונים שלכם הופכים לזהב...",
      "בונה משהו שההנהלה תאהב...",
      "עוד שנייה יש לכם דשבורד...",
      "מסדר את העמודות ביופי...",
      "וואי איזה בורד משגע...",
    ],
  },
  automations: {
    title: "אוטומציות שעובדות",
    subtitle: "שינוי סטטוס, העברה, ארכיון, מייל — תגידו מה לעשות",
    suggestions: ["שנה סטטוס לכל הפריטים של יוסי", "העבר חדשים לקבוצה ראשונה", "ארכב הושלמו", "שלח מייל סיכום להנהלה", "צור 5 פריטים חדשים", "שלח התראה על תקועים"],
    placeholder: "מה לאוטמט?",
    loadingMessages: [
      "בונה אוטומציה...",
      "מחבר חוטים מאחורי הקלעים...",
      "עוד רגע זה רץ לבד...",
      "מייצר קסם אוטומטי...",
      "שנייה, מלמד את המאנדיי טריקים...",
      "יאללה, עוד קצת סבלנות...",
    ],
  },
  impact: {
    title: "דוחות מוכנים",
    subtitle: "אימפקט, הנהלה, תורמים — בלחיצה",
    suggestions: ["הכן דוח אימפקט רבעוני", "סכם תוצאות + מגמות", "בנה דוח להנהלה", "הפק דוח לתורמים"],
    placeholder: "איזה דוח להכין?",
    loadingMessages: [
      "אוסף נתוני אימפקט...",
      "מחפש את הסיפור בנתונים...",
      "בונה דוח שיעשה רושם...",
      "הנתונים שלכם = השפעה אמיתית...",
      "עוד שנייה יש לכם דוח מנצח...",
      "מתרגם מספרים לסיפור...",
    ],
  },
};

export function BoardDashboard({
  board,
  items,
  onBack,
  apiToken,
  boardId,
}: {
  board: MondayBoard;
  items: MondayItem[];
  onBack: () => void;
  apiToken: string;
  boardId: string;
}) {
  const [messagesByMode, setMessagesByMode] = useState<Record<string, ChatMessage[]>>({
    chat: [], dashboard: [], automations: [], impact: [],
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidePanel, setSidePanel] = useState<SidePanel>(null);
  const [mode, setMode] = useState<"chat" | "dashboard" | "data" | "automations" | "impact" | "report">("chat");
  const [panelWidth, setPanelWidth] = useState(340);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [brand, setBrand] = useState<BrandConfig>({
    orgName: "", logoUrl: "", colors: ["#6C5CE7", "#A29BFE", "#00B894", "#FDCB6E"],
  });
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [mobilePanel, setMobilePanel] = useState(false);
  const { data: session } = useSession();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load chat history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`dayday-history-${boardId}`);
      if (saved) setChatHistory(JSON.parse(saved));
    } catch {}
  }, [boardId]);

  // Save chat history to localStorage
  useEffect(() => {
    if (chatHistory.length > 0) {
      try { localStorage.setItem(`dayday-history-${boardId}`, JSON.stringify(chatHistory)); } catch {}
    }
  }, [chatHistory, boardId]);

  // Auto-save current session when messages change
  useEffect(() => {
    const msgs = messagesByMode[mode] || [];
    if (msgs.length >= 2 && mode === "chat") {
      const firstUserMsg = msgs.find(m => m.role === "user");
      const title = firstUserMsg ? firstUserMsg.content.slice(0, 50) : "שיחה חדשה";
      const sessionId = activeSessionId || `s-${Date.now()}`;
      if (!activeSessionId) setActiveSessionId(sessionId);
      setChatHistory(prev => {
        const existing = prev.findIndex(s => s.id === sessionId);
        const session: ChatSession = { id: sessionId, title, messages: msgs, createdAt: new Date().toISOString(), mode };
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = session;
          return updated;
        }
        return [session, ...prev].slice(0, 20); // keep last 20 sessions
      });
    }
  }, [messagesByMode, mode, activeSessionId]);

  function startNewChat() {
    setMessagesByMode(prev => ({ ...prev, chat: [] }));
    setActiveSessionId(null);
  }

  function loadSession(session: ChatSession) {
    setMessagesByMode(prev => ({ ...prev, [session.mode]: session.messages }));
    setMode(session.mode as typeof mode);
    setActiveSessionId(session.id);
    setShowHistory(false);
    setSidePanel(null);
  }

  function deleteSession(id: string) {
    setChatHistory(prev => {
      const updated = prev.filter(s => s.id !== id);
      try { localStorage.setItem(`dayday-history-${boardId}`, JSON.stringify(updated)); } catch {}
      return updated;
    });
    if (activeSessionId === id) startNewChat();
  }
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!isDragging.current) return;
      const delta = dragStartX.current - e.clientX;
      const newWidth = Math.min(Math.max(dragStartWidth.current + delta, 280), 800);
      setPanelWidth(newWidth);
    }
    function onMouseUp() {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const hasBrand = brand.orgName.trim() !== "" || brand.logoUrl.trim() !== "" || brand.colors[0] !== "#6C5CE7";
  const [pc, ac] = brand.colors;
  // brand.colors[2] and brand.colors[3] available for charts/exports

  const messages = messagesByMode[mode] || [];
  const setMessages = (updater: (prev: ChatMessage[]) => ChatMessage[]) => {
    setMessagesByMode(prev => ({ ...prev, [mode]: updater(prev[mode] || []) }));
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesByMode, mode]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Rotate loading messages
  useEffect(() => {
    if (!loading) return;
    const msgs = MODE_CONFIG[mode].loadingMessages;
    setLoadingMsg(msgs[Math.floor(Math.random() * msgs.length)]);
    const interval = setInterval(() => {
      setLoadingMsg(msgs[Math.floor(Math.random() * msgs.length)]);
    }, 2500);
    return () => clearInterval(interval);
  }, [loading, mode]);

  function buildBoardContext() {
    const statusDist: Record<string, number> = {};
    items.forEach((item) =>
      item.column_values.forEach((cv) => {
        if (cv.column.type === "color" && cv.text)
          statusDist[cv.text] = (statusDist[cv.text] || 0) + 1;
      })
    );
    const sampleItems = items.slice(0, 30).map(it => {
      const vals = it.column_values.filter(cv => cv.text).map(cv => `${cv.column.title}:${cv.text}`).join(", ");
      return `${it.name} (${vals})`;
    }).join(" | ");

    return {
      boardName: board.name,
      itemsCount: board.items_count,
      columns: board.columns.map((c) => `${c.id}: ${c.title} [${c.type}]`).join(", "),
      statusDistribution: Object.entries(statusDist).map(([k, v]) => `${k}:${v}`).join(", ") || "אין",
      sampleItems,
    };
  }

  async function sendMessage(text?: string) {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput("");

    const userMsg: ChatMessage = { role: "user", content: msg, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    setLoadingMsg("חושב...");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, boardContext: buildBoardContext() }),
      });
      const data = await res.json();
      const reply = data.error ? `שגיאה: ${data.error}` : data.reply;
      setMessages(prev => [...prev, { role: "assistant", content: reply, timestamp: new Date() }]);

      // If AI returned an action, execute it automatically
      if (data.action) {
        setLoadingMsg("מבצע פעולה על הבורד...");
        try {
          const actionRes = await fetch("/api/monday", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "automate",
              boardId,
              apiToken,
              conditionColumn: data.action.conditionColumn,
              conditionValues: data.action.conditionValues,
              actionType: data.action.action,
              actionConfig: data.action.actionConfig || {},
            }),
          });
          const actionResult = await actionRes.json();
          const resultMsg = actionResult.executed > 0
            ? `**בוצע בהצלחה!** ${actionResult.executed} מתוך ${actionResult.total} פריטים עודכנו.\n\n${actionResult.results?.map((r: string) => `- ${r}`).join("\n") || ""}`
            : `לא נמצאו פריטים תואמים לביצוע.`;
          setMessages(prev => [...prev, { role: "assistant", content: resultMsg, timestamp: new Date() }]);
        } catch {
          setMessages(prev => [...prev, { role: "assistant", content: "שגיאה בביצוע הפעולה על הבורד", timestamp: new Date() }]);
        }
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "שגיאה בחיבור לשרת", timestamp: new Date() }]);
    } finally {
      setLoading(false);
      setLoadingMsg("");
    }
  }

  const NAV_ITEMS: { modeId: "chat" | "dashboard" | "data" | "automations" | "impact"; panel: SidePanel; icon: React.ReactNode; label: string }[] = [
    { modeId: "chat", panel: null, icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        <path d="M8 10h.01" /><path d="M12 10h.01" /><path d="M16 10h.01" />
      </svg>
    ), label: "AnyDay" },
    { modeId: "dashboard", panel: "dashboard", icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" />
      </svg>
    ), label: "דשבורד" },
    { modeId: "data", panel: "data", icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ), label: "עריכה" },
    { modeId: "automations", panel: "automations", icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ), label: "אוטומציות" },
    { modeId: "impact", panel: "impact", icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ), label: "דוחות" },


  ];

  return (
    <div dir="rtl" style={{
      height: "100vh", display: "flex", flexDirection: "column",
      fontFamily: "'Rubik', sans-serif", background: hexToRgba(pc, 0.02),
      // CSS variables for FormattedText and nested components
      "--brand-pc": pc,
      "--brand-ac": ac,
    } as React.CSSProperties}>
      <style>{`
        @media (max-width: 768px) {
          .dash-sidebar { display: none !important; }
          .dash-mobile-nav { display: flex !important; }
          .dash-side-panel { position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; width: 100% !important; z-index: 100 !important; padding-top: 50px !important; }
          .dash-panel-drag { display: none !important; }
          .dash-history { position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; width: 100% !important; z-index: 100 !important; }
          .dash-header-actions button span:not(.icon-only) { display: none; }
          .dash-header-info { display: none !important; }
          .dash-chat-area { padding: 12px 8px !important; }
        }
      `}</style>
      {/* ── Header ── */}
      <div style={{
        background: "#FFFFFF", borderBottom: `3px solid ${pc}`,
        padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onBack} style={{
            background: "none", border: `1px solid ${hexToRgba(pc, 0.15)}`, borderRadius: 8,
            padding: "6px 12px", cursor: "pointer", color: pc, fontSize: 13, fontWeight: 600,
          }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
              חזרה
            </span>
          </button>
          {brand.logoUrl ? (
            <img onClick={onBack} src={brand.logoUrl} alt="logo" style={{
              height: 44, maxWidth: 180, borderRadius: 10, objectFit: "contain", cursor: "pointer",
            }} />
          ) : (
            <div onClick={onBack} style={{
              width: 40, height: 40, borderRadius: 10,
              background: `linear-gradient(135deg, ${pc}, ${ac})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#FFF", fontSize: 14, fontWeight: 800,
              cursor: "pointer",
            }}>{brand.orgName ? brand.orgName.charAt(0) : "D"}</div>
          )}
          <div className="dash-header-info">
            <div style={{ fontSize: 15, fontWeight: 700, color: "#2D2252" }}>
              {hasBrand && brand.orgName ? brand.orgName : board.name}
            </div>
            <div style={{ fontSize: 11, color: ac }}>
              {hasBrand && brand.orgName ? `${board.name} · ` : ""}{board.items_count} פריטים · {board.columns.length} עמודות
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {/* Alerts button */}
        <button onClick={() => {
          if (sidePanel === "alerts") { setSidePanel(null); } else { setSidePanel("alerts"); }
        }} style={{
          background: sidePanel === "alerts" ? hexToRgba(pc, 0.1) : "none",
          border: `1px solid ${hexToRgba(pc, 0.15)}`, borderRadius: 8,
          padding: "6px 10px", cursor: "pointer", color: pc, fontSize: 12, fontWeight: 600,
          display: "flex", alignItems: "center", gap: 4, position: "relative",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          התראות
        </button>
        {/* User profile */}
        {session?.user && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 8, borderRight: "1px solid rgba(108,92,231,0.1)", paddingRight: 12 }}>
            <img src={session.user.image || ""} alt="" style={{
              width: 28, height: 28, borderRadius: "50%", border: `2px solid ${hexToRgba(pc, 0.2)}`,
            }} />
            <span className="dash-header-info" style={{ fontSize: 12, fontWeight: 600, color: "#2D2252" }}>
              {session.user.name?.split(" ")[0]}
            </span>
          </div>
        )}
        </div>
      </div>

      {/* ── Main Area ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── Right Sidebar Nav ── */}
        <div style={{
          width: 60, background: hexToRgba(pc, 0.03), borderLeft: `2px solid ${hexToRgba(pc, 0.12)}`,
          display: "flex", flexDirection: "column", alignItems: "center",
          paddingTop: 16, gap: 8, flexShrink: 0,
        }} className="dash-sidebar">
          {NAV_ITEMS.map((n, idx) => (
            <button key={idx} onClick={() => {
              setMode(n.modeId);
              setSidePanel(n.panel);
              inputRef.current?.focus();
            }} style={{
              width: 44, height: 44, borderRadius: 12, border: "none", cursor: "pointer",
              background: (n.panel ? sidePanel === n.panel : mode === "chat" && !sidePanel) ? hexToRgba(pc, 0.15) : "transparent",
              color: (n.panel ? sidePanel === n.panel : mode === "chat" && !sidePanel) ? pc : "#999",
              borderRight: (n.panel ? sidePanel === n.panel : mode === "chat" && !sidePanel) ? `3px solid ${pc}` : "3px solid transparent",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 2, transition: "all 0.2s",
            }}
            title={n.label}
            >
              {n.icon}
              <span style={{ fontSize: 9, fontWeight: 600 }}>{n.label}</span>
            </button>
          ))}


          {/* Divider */}
          <div style={{ width: 28, height: 1, background: hexToRgba(pc, 0.1), marginTop: 8 }} />

          {/* New chat */}
          <button onClick={() => { startNewChat(); setSidePanel(null); setMode("chat"); }} style={{
            marginTop: 4, width: 44, height: 44, borderRadius: 12, border: "none", cursor: "pointer",
            background: "transparent", color: "#999",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: 2, transition: "all 0.2s",
          }} title="שיחה חדשה">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span style={{ fontSize: 9, fontWeight: 600 }}>חדש</span>
          </button>


        </div>



        {/* ── Side Panel ── */}
        {sidePanel && (
          <>
            <div style={{
              width: panelWidth, background: "#FFFFFF", overflowY: "auto",
              borderLeft: `1px solid ${hexToRgba(pc, 0.08)}`,
              padding: 20, flexShrink: 0,
            }} className="dash-side-panel">
              {/* Mobile close */}
              <button className="dash-mobile-nav" onClick={() => setSidePanel(null)} style={{
                display: "none", position: "sticky", top: 0, zIndex: 10, marginBottom: 12,
                background: "rgba(0,0,0,0.05)", border: "none", borderRadius: 8, padding: "8px 14px",
                cursor: "pointer", color: "#2D2252", fontSize: 13, fontWeight: 600, width: "100%",
              }}>
                סגור פאנל X
              </button>
              {sidePanel === "dashboard" && <DashboardPanel board={board} items={items} pc={pc} ac={ac} />}
              {sidePanel === "automations" && <AutomationsPanel board={board} items={items} apiToken={apiToken} boardId={boardId} pc={pc} ac={ac} />}
              {sidePanel === "impact" && <>
                <ImpactPanel board={board} items={items} pc={pc} ac={ac} />
                <div style={{ borderTop: "2px solid rgba(108,92,231,0.1)", margin: "20px 0", paddingTop: 20 }}>
                  <ReportPanel board={board} items={items} pc={pc} ac={ac} orgName={brand.orgName} />
                </div>
              </>}
              
              {sidePanel === "alerts" && <AlertsPanel board={board} items={items} pc={pc} ac={ac} onAskAI={(q) => { setSidePanel(null); setMode("chat"); setTimeout(() => sendMessage(q), 100); }} />}
              {sidePanel === "data" && <DataEditPanel board={board} items={items} apiToken={apiToken} boardId={boardId} pc={pc} ac={ac} />}
              {sidePanel === "coming-soon" && (
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: "#2D2252", marginBottom: 4 }}>בקרוב ב-AnyDay</h3>
                  <p style={{ fontSize: 12, color: ac, marginBottom: 18, lineHeight: 1.5 }}>
                    פיצ׳רים שאנחנו עובדים עליהם עכשיו
                  </p>
                  {[
                    { icon: "🌍", title: "תרגום דוחות לאנגלית", desc: "הפקת דוחות אימפקט באנגלית ישירות מהמערכת, מוכנים לתורמים בינלאומיים" },
                    { icon: "🔄", title: "ניהול מלא מכאן", desc: "עריכה, הוספה ומחיקה של פריטים ישירות מ-AnyDay, בלי לפתוח מאנדיי" },
                  ].map((item, i) => (
                    <div key={i} style={{
                      background: hexToRgba(pc, 0.04), borderRadius: 14,
                      padding: "16px 18px", marginBottom: 10,
                      border: `1px dashed ${hexToRgba(pc, 0.15)}`,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 20 }}>{item.icon}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "#2D2252" }}>{item.title}</span>
                      </div>
                      <p style={{ fontSize: 12, color: ac, lineHeight: 1.5, margin: 0 }}>{item.desc}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Drag handle */}
            <div
              onMouseDown={(e) => {
                isDragging.current = true;
                dragStartX.current = e.clientX;
                dragStartWidth.current = panelWidth;
                document.body.style.cursor = "col-resize";
                document.body.style.userSelect = "none";
              }}
              style={{
                width: 6, cursor: "col-resize", flexShrink: 0,
                background: "transparent", position: "relative",
                transition: "background 0.15s",
              }}
              className="dash-panel-drag"
              onMouseEnter={e => (e.currentTarget.style.background = hexToRgba(pc, 0.15))}
              onMouseLeave={e => { if (!isDragging.current) e.currentTarget.style.background = "transparent"; }}
            >
              <div style={{
                position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
                width: 4, height: 32, borderRadius: 2,
                background: hexToRgba(pc, 0.2),
              }} />
            </div>
          </>
        )}

        {/* ── Chat ── */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          background: "#FFFFFF",
        }}>
          {/* Messages */}
          <div style={{
            flex: 1, overflowY: "auto", padding: "24px 24px 12px",
            display: "flex", flexDirection: "column",
          }}>
            {messages.length === 0 ? (
              <div style={{
                flex: 1, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 24,
              }}>
                <div style={{
                  padding: "12px 28px", borderRadius: 16,
                  background: `linear-gradient(135deg, ${pc}, ${ac})`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ fontSize: 28, fontWeight: 800, color: "#FFF", letterSpacing: "-0.5px" }}>AnyDay</span>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#2D2252", marginBottom: 6 }}>
                    {MODE_CONFIG[mode].title}
                  </div>
                  <div style={{ fontSize: 14, color: ac }}>
                    {MODE_CONFIG[mode].subtitle}
                  </div>
                </div>

                {/* Quick Board Summary Card */}
                {mode === "chat" && (
                  <button onClick={() => sendMessage("תן לי סיכום מצב הבורד בפסקה אחת קצרה וברורה, מוכנה להעתקה למייל או לישיבה")} style={{
                    width: "100%", maxWidth: 420,
                    background: `linear-gradient(135deg, ${hexToRgba(pc, 0.06)}, ${hexToRgba(ac, 0.1)})`,
                    border: `1.5px solid ${hexToRgba(pc, 0.2)}`,
                    borderRadius: 16, padding: "18px 22px",
                    cursor: "pointer", transition: "all 0.3s",
                    textAlign: "right", display: "flex", alignItems: "center", gap: 14,
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget).style.borderColor = pc;
                    (e.currentTarget).style.boxShadow = `0 8px 24px ${hexToRgba(pc, 0.15)}`;
                    (e.currentTarget).style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget).style.borderColor = hexToRgba(pc, 0.2);
                    (e.currentTarget).style.boxShadow = "none";
                    (e.currentTarget).style.transform = "translateY(0)";
                  }}
                  >
                    <div style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: `linear-gradient(135deg, ${pc}, ${ac})`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#2D2252", marginBottom: 3 }}>
                        סיכום מצב הבורד
                      </div>
                      <div style={{ fontSize: 12, color: ac, lineHeight: 1.5 }}>
                        פסקה קצרה וחדה, מוכנה לישיבה, מייל או דיווח
                      </div>
                    </div>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ac} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                )}

                <div style={{
                  display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center",
                  maxWidth: 500,
                }}>
                  {MODE_CONFIG[mode].suggestions.map((s, i) => (
                    <button key={i} onClick={() => sendMessage(s)} style={{
                      background: "#F9F7FF", border: `1px solid ${hexToRgba(pc, 0.12)}`,
                      borderRadius: 20, padding: "8px 16px", cursor: "pointer",
                      color: pc, fontSize: 13, fontWeight: 500,
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={e => {
                      (e.target as HTMLButtonElement).style.background = hexToRgba(pc, 0.08);
                      (e.target as HTMLButtonElement).style.borderColor = hexToRgba(pc, 0.3);
                    }}
                    onMouseLeave={e => {
                      (e.target as HTMLButtonElement).style.background = "#F9F7FF";
                      (e.target as HTMLButtonElement).style.borderColor = hexToRgba(pc, 0.12);
                    }}
                    >{s}</button>
                  ))}
                </div>

                {/* Inline history */}
                {chatHistory.length > 0 && (
                  <div style={{ width: "100%", maxWidth: 500, marginTop: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#999", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 1 0 6 6L3 3" /><path d="M12 7v5l4 2" />
                      </svg>
                      שיחות אחרונות
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {chatHistory.slice(0, 5).map(session => (
                        <div key={session.id} style={{
                          display: "flex", alignItems: "center", gap: 8,
                          padding: "8px 12px", borderRadius: 10, cursor: "pointer",
                          background: hexToRgba(pc, 0.03),
                          border: `1px solid ${hexToRgba(pc, 0.08)}`,
                          transition: "all 0.15s",
                        }}
                        onClick={() => loadSession(session)}
                        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = hexToRgba(pc, 0.08); }}
                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = hexToRgba(pc, 0.03); }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={pc} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          </svg>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "#2D2252", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {session.title}
                            </div>
                            <div style={{ fontSize: 10, color: "#999" }}>
                              {new Date(session.createdAt).toLocaleDateString("he-IL")} · {session.messages.length} הודעות
                            </div>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }} style={{
                            background: "none", border: "none", cursor: "pointer", padding: 2, color: "#CCC", flexShrink: 0,
                          }}
                          onMouseEnter={e => (e.currentTarget.style.color = "#E17055")}
                          onMouseLeave={e => (e.currentTarget.style.color = "#CCC")}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                {messages.map((msg, i) => (
                  <div key={i} style={{
                    display: "flex", justifyContent: msg.role === "user" ? "flex-start" : "flex-end",
                    marginBottom: 16,
                  }}>
                    <div style={{
                      maxWidth: "75%", padding: "12px 18px",
                      borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                      background: msg.role === "user"
                        ? `linear-gradient(135deg, ${pc}, ${ac})`
                        : "#F9F7FF",
                      color: msg.role === "user" ? "#FFF" : "#2D2252",
                      fontSize: 14, lineHeight: 1.7,
                      whiteSpace: "pre-wrap",
                      border: msg.role === "assistant" ? `1px solid ${hexToRgba(pc, 0.1)}` : "none",
                    }}>
                      {msg.role === "assistant" ? <FormattedText text={msg.content} /> : msg.content}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
                    <div style={{
                      padding: "14px 20px", borderRadius: "18px 18px 18px 4px",
                      background: "#F9F7FF", border: `1px solid ${hexToRgba(pc, 0.1)}`,
                      display: "flex", alignItems: "center", gap: 8,
                    }}>
                      <Spinner size={14} color={pc} />
                      <span style={{ color: ac, fontSize: 13 }}>{loadingMsg}</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div style={{
            padding: "16px 24px", borderTop: `1px solid ${hexToRgba(pc, 0.08)}`,
            background: "#FFFFFF",
          }}>
            <div style={{
              display: "flex", gap: 10, alignItems: "center",
              background: "#F9F7FF", borderRadius: 16,
              border: `1.5px solid ${hexToRgba(pc, 0.12)}`,
              padding: "4px 6px 4px 16px",
              transition: "border-color 0.2s",
            }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendMessage()}
                placeholder={MODE_CONFIG[mode].placeholder}
                disabled={loading}
                style={{
                  flex: 1, background: "transparent", border: "none",
                  outline: "none", fontSize: 15, color: "#2D2252",
                  padding: "10px 0",
                }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: (!input.trim() || loading)
                    ? `${pc}26`
                    : `linear-gradient(135deg, ${pc}, ${ac})`,
                  border: "none", cursor: (!input.trim() || loading) ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.2s", flexShrink: 0,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* ── Mobile Bottom Nav ── */}
      <div className="dash-mobile-nav" style={{
        display: "none", position: "fixed", bottom: 0, left: 0, right: 0,
        background: "#FFFFFF", borderTop: "2px solid rgba(108,92,231,0.15)",
        padding: "4px 8px env(safe-area-inset-bottom, 8px)", zIndex: 90,
        justifyContent: "space-around", alignItems: "center",
        boxShadow: "0 -4px 20px rgba(0,0,0,0.08)",
      }}>
        {NAV_ITEMS.map((n, idx) => (
          <button key={idx} onClick={() => {
            setMode(n.modeId);
            setSidePanel(n.panel);
          }} style={{
            background: mode === n.modeId ? "rgba(108,92,231,0.12)" : "transparent",
            border: "none", borderRadius: 10, padding: "6px 10px", cursor: "pointer",
            color: (n.panel ? sidePanel === n.panel : mode === "chat" && !sidePanel) ? pc : "#999",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            fontSize: 9, fontWeight: 600, transition: "all 0.2s",
          }}>
            {n.icon}
            <span>{n.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

const TYPE_LABELS: Record<string, string> = {
  color: "סטטוס", date: "תאריך", text: "טקסט", "long-text": "טקסט ארוך",
  numeric: "מספר", numbers: "מספר", dropdown: "רשימה", "multiple-person": "אנשים",
  person: "אנשים", email: "מייל", phone: "טלפון", checkbox: "צ'קבוקס",
  timeline: "ציר זמן", link: "קישור", file: "קובץ", mirror: "מירור",
  formula: "נוסחה", rating: "דירוג", country: "מדינה", location: "מיקום",
  "board-relation": "קשר לבורד", subitems: "פריטי משנה",
};

const CHART_TYPES: Record<string, string[]> = {
  color: ["pie", "bar"],
  dropdown: ["pie", "bar"],
  date: ["timeline"],
  numeric: ["bar", "summary"],
  numbers: ["bar", "summary"],
  "multiple-person": ["bar"],
  person: ["bar"],
  checkbox: ["pie"],
  rating: ["bar"],
  text: ["bar"],
};

const COLORS = ["#6C5CE7", "#A29BFE", "#00B894", "#FDCB6E", "#E17055", "#0984E3", "#FD79A8", "#55EFC4"];

function DashboardPanel({ board, items, pc = "#6C5CE7", ac = "#A29BFE" }: { board: MondayBoard; items: MondayItem[]; pc?: string; ac?: string }) {
  const [selectedCols, setSelectedCols] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  // Analyze which columns have chartable data
  const columnAnalysis = board.columns.map(col => {
    const values: string[] = [];
    items.forEach(item => {
      const cv = item.column_values.find(v => v.id === col.id);
      if (cv?.text) values.push(cv.text);
    });
    const uniqueValues = [...new Set(values)];
    const distribution: Record<string, number> = {};
    values.forEach(v => { distribution[v] = (distribution[v] || 0) + 1; });
    const fillRate = Math.round((values.length / Math.max(items.length, 1)) * 100);
    const chartable = CHART_TYPES[col.type] && uniqueValues.length >= 2 && uniqueValues.length <= 30;

    return {
      ...col, values, uniqueValues, distribution, fillRate, chartable,
      typeLabel: TYPE_LABELS[col.type] || col.type,
    };
  }).filter(c => c.fillRate > 0);

  // Auto-select best columns on first render
  useEffect(() => {
    if (selectedCols.size === 0) {
      const auto = new Set<string>();
      columnAnalysis
        .filter(c => c.chartable)
        .sort((a, b) => b.fillRate - a.fillRate)
        .slice(0, 3)
        .forEach(c => auto.add(c.id));
      if (auto.size > 0) setSelectedCols(auto);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleCol(id: string) {
    setSelectedCols(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const selectedAnalysis = columnAnalysis.filter(c => selectedCols.has(c.id));

  function exportPDF() {
    if (selectedAnalysis.length === 0) return;
    setExporting(true);

    const chartsHtml = selectedAnalysis.map(col => {
      const sorted = Object.entries(col.distribution).sort((a, b) => b[1] - a[1]);
      const total = sorted.reduce((sum, [, v]) => sum + v, 0) || 1;
      const maxVal = sorted[0]?.[1] || 1;

      const barsHtml = sorted.slice(0, 12).map(([label, count], i) => {
        const pct = Math.round((count / total) * 100);
        const barWidth = Math.round((count / maxVal) * 100);
        const color = COLORS[i % COLORS.length];
        return `
          <div style="margin-bottom:8px">
            <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px">
              <span style="color:#2D2252;font-weight:500">${label}</span>
              <span style="color:#7C6FD0;font-size:12px">${count} (${pct}%)</span>
            </div>
            <div style="height:10px;border-radius:5px;background:${hexToRgba(pc, 0.06)};overflow:hidden">
              <div style="height:100%;border-radius:5px;background:${color};width:${barWidth}%"></div>
            </div>
          </div>`;
      }).join("");

      return `
        <div style="background:${hexToRgba(pc, 0.03)};border-radius:14px;padding:18px;border:1px solid ${hexToRgba(pc, 0.1)};margin-bottom:18px;break-inside:avoid">
          <div style="font-size:15px;font-weight:700;color:#2D2252;margin-bottom:12px">
            ${col.title}
            <span style="font-size:11px;color:${ac};margin-right:8px">${col.uniqueValues.length} ערכים</span>
          </div>
          ${barsHtml}
          ${sorted.length > 12 ? `<div style="font-size:11px;color:${ac};margin-top:6px">+${sorted.length - 12} ערכים נוספים</div>` : ""}
        </div>`;
    }).join("");

    const now = new Date();
    const dateStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="utf-8">
  <title>דשבורד - ${board.name}</title>
  <link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Rubik',sans-serif; background:#FFF; padding:40px; color:#2D2252; direction:rtl; }
    @media print { body { padding:20px; } }
  </style>
</head>
<body>
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:30px;padding-bottom:18px;border-bottom:3px solid ${pc}">
    <div>
      <div style="font-size:26px;font-weight:800;color:#2D2252">${board.name}</div>
      <div style="font-size:13px;color:${ac};margin-top:4px">${board.items_count} פריטים · ${board.columns.length} עמודות · ${dateStr}</div>
    </div>
    <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,${pc},${ac});display:flex;align-items:center;justify-content:center;color:#FFF;font-size:20px;font-weight:800">D</div>
  </div>
  <div style="display:flex;gap:12px;margin-bottom:24px">
    <div style="flex:1;background:${hexToRgba(pc, 0.03)};border-radius:12px;padding:16px;border:1px solid ${hexToRgba(pc, 0.08)};text-align:center">
      <div style="font-size:28px;font-weight:800;color:${pc}">${board.items_count}</div>
      <div style="font-size:12px;color:${ac}">פריטים</div>
    </div>
    <div style="flex:1;background:${hexToRgba(pc, 0.03)};border-radius:12px;padding:16px;border:1px solid ${hexToRgba(pc, 0.08)};text-align:center">
      <div style="font-size:28px;font-weight:800;color:${pc}">${selectedAnalysis.length}</div>
      <div style="font-size:12px;color:${ac}">עמודות מוצגות</div>
    </div>
    <div style="flex:1;background:${hexToRgba(pc, 0.03)};border-radius:12px;padding:16px;border:1px solid ${hexToRgba(pc, 0.08)};text-align:center">
      <div style="font-size:28px;font-weight:800;color:${pc}">${columnAnalysis.filter(c => c.chartable).length}</div>
      <div style="font-size:12px;color:${ac}">ניתנות להצגה</div>
    </div>
  </div>
  ${chartsHtml}
  <div style="text-align:center;margin-top:30px;padding-top:16px;border-top:1px solid ${hexToRgba(pc, 0.08)};font-size:11px;color:${ac}">
    הופק ע״י AnyDay · ${dateStr}
  </div>
</body>
</html>`;

    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
      setTimeout(() => {
        w.print();
        setExporting(false);
      }, 500);
    } else {
      setExporting(false);
    }
  }

  return (
    <div>
      <h3 style={{ fontSize: 17, fontWeight: 700, color: "#2D2252", marginBottom: 6 }}>
        הדשבורד שלכם, בדקה
      </h3>
      <p style={{ fontSize: 12, color: ac, marginBottom: 16 }}>
        סמנו עמודות ותראו איך הנתונים מדברים
      </p>

      {/* Stats bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        <div style={{
          flex: 1, background: hexToRgba(pc, 0.03), borderRadius: 12, padding: "12px",
          border: `1px solid ${hexToRgba(pc, 0.08)}`, textAlign: "center",
        }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: pc }}>{board.items_count}</div>
          <div style={{ fontSize: 11, color: ac }}>פריטים</div>
        </div>
        <div style={{
          flex: 1, background: hexToRgba(pc, 0.03), borderRadius: 12, padding: "12px",
          border: `1px solid ${hexToRgba(pc, 0.08)}`, textAlign: "center",
        }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: pc }}>{columnAnalysis.filter(c => c.chartable).length}</div>
          <div style={{ fontSize: 11, color: ac }}>ניתנות להצגה</div>
        </div>
      </div>

      {/* Export PDF button */}
      <button onClick={exportPDF} disabled={selectedAnalysis.length === 0 || exporting} style={{
        width: "100%", padding: "10px", borderRadius: 10, border: "none", cursor: selectedAnalysis.length > 0 ? "pointer" : "not-allowed",
        background: selectedAnalysis.length > 0
          ? `linear-gradient(135deg, ${pc}, ${ac})`
          : `${pc}1A`,
        color: selectedAnalysis.length > 0 ? "#FFF" : ac,
        fontSize: 13, fontWeight: 600, marginBottom: 18,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        transition: "all 0.2s",
        opacity: exporting ? 0.6 : 1,
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        {exporting ? "מייצא..." : "ייצוא דשבורד PDF"}
      </button>

      {/* Column selector */}
      <div style={{ fontSize: 13, fontWeight: 600, color: "#2D2252", marginBottom: 10 }}>
        עמודות זמינות
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20, maxHeight: 200, overflowY: "auto" }}>
        {columnAnalysis.filter(c => c.chartable).map(col => (
          <div key={col.id} onClick={() => toggleCol(col.id)} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "8px 12px", borderRadius: 10, cursor: "pointer",
            background: selectedCols.has(col.id) ? `${pc}14` : "#FAFAFA",
            border: `1.5px solid ${selectedCols.has(col.id) ? pc : hexToRgba(pc, 0.08)}`,
            transition: "all 0.15s",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 18, height: 18, borderRadius: 5,
                border: `2px solid ${selectedCols.has(col.id) ? pc : "#D0D5DF"}`,
                background: selectedCols.has(col.id) ? pc : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s",
              }}>
                {selectedCols.has(col.id) && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: "#2D2252" }}>{col.title}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{
                fontSize: 10, color: pc, background: hexToRgba(pc, 0.08),
                padding: "2px 6px", borderRadius: 4, fontWeight: 600,
              }}>{col.typeLabel}</span>
              <span style={{ fontSize: 10, color: "#7C6FD0" }}>{col.fillRate}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts for selected columns */}
      {selectedAnalysis.length > 0 && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#2D2252", marginBottom: 10 }}>
            תצוגה
          </div>
          {selectedAnalysis.map(col => {
            const sorted = Object.entries(col.distribution).sort((a, b) => b[1] - a[1]);
            const total = sorted.reduce((sum, [, v]) => sum + v, 0) || 1;
            const maxVal = sorted[0]?.[1] || 1;

            return (
              <div key={col.id} style={{
                marginBottom: 16, background: "#F9F7FF", borderRadius: 14,
                padding: "14px", border: `1px solid ${hexToRgba(pc, 0.08)}`,
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#2D2252", marginBottom: 10 }}>
                  {col.title}
                  <span style={{ fontSize: 10, color: "#A29BFE", marginRight: 6 }}>
                    {col.uniqueValues.length} ערכים
                  </span>
                </div>
                {sorted.slice(0, 8).map(([label, count], i) => {
                  const pct = Math.round((count / total) * 100);
                  const barWidth = Math.round((count / maxVal) * 100);
                  return (
                    <div key={label} style={{ marginBottom: 6 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                        <span style={{ color: "#2D2252", fontWeight: 500, maxWidth: "60%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
                        <span style={{ color: "#7C6FD0", fontSize: 11 }}>{count} ({pct}%)</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: hexToRgba(pc, 0.06), overflow: "hidden" }}>
                        <div style={{
                          height: "100%", borderRadius: 3,
                          background: COLORS[i % COLORS.length],
                          width: `${barWidth}%`, transition: "width 0.4s ease",
                        }} />
                      </div>
                    </div>
                  );
                })}
                {sorted.length > 8 && (
                  <div style={{ fontSize: 11, color: "#A29BFE", marginTop: 4 }}>
                    +{sorted.length - 8} ערכים נוספים
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {selectedAnalysis.length === 0 && (
        <div style={{
          textAlign: "center", padding: "20px", color: "#A29BFE", fontSize: 13,
          background: "#F9F7FF", borderRadius: 14, border: `1px solid ${hexToRgba(pc, 0.08)}`,
        }}>
          סמנו עמודות למעלה ותראו קסם
        </div>
      )}
    </div>
  );
}

interface AutoGroup { id: string; title: string }

interface SavedAutomation {
  id: string;
  name: string;
  condCol: string;
  condVals: string[];
  actionType: string;
  targetCol: string;
  targetVal: string;
  targetGroup: string;
  notifyText: string;
  createdAt: string;
}

function AutomationsPanel({ board, items, apiToken, boardId, pc = "#6C5CE7", ac = "#A29BFE" }: {
  board: MondayBoard; items: MondayItem[]; apiToken: string; boardId: string; pc?: string; ac?: string;
}) {
  const [condCol, setCondCol] = useState("");
  const [condVals, setCondVals] = useState<string[]>([]);
  const [actionType, setActionType] = useState<"change_status" | "move_to_group" | "archive" | "notify" | "">("");
  const [targetCol, setTargetCol] = useState("");
  const [targetVal, setTargetVal] = useState("");
  const [targetGroup, setTargetGroup] = useState("");
  const [notifyText, setNotifyText] = useState("");
  const [groups, setGroups] = useState<AutoGroup[]>([]);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<{ executed: number; total: number; results: string[] } | null>(null);
  const [savedAutomations, setSavedAutomations] = useState<SavedAutomation[]>([]);
  const [showSaved, setShowSaved] = useState(true);

  // Load saved automations from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`dayday-automations-${boardId}`);
      if (saved) setSavedAutomations(JSON.parse(saved));
    } catch {}
  }, [boardId]);

  function saveAutomation() {
    const condColObj = board.columns.find(c => c.id === condCol);
    const name = `${condColObj?.title || condCol} → ${
      actionType === "change_status" ? `שנה ל-${targetVal}` :
      actionType === "move_to_group" ? `העבר לקבוצה` :
      actionType === "notify" ? `שלח התראה` :
      "ארכיון"
    }`;
    const auto: SavedAutomation = {
      id: `a-${Date.now()}`, name,
      condCol, condVals: [...condVals], actionType,
      targetCol, targetVal, targetGroup, notifyText,
      createdAt: new Date().toISOString(),
    };
    const updated = [auto, ...savedAutomations].slice(0, 20);
    setSavedAutomations(updated);
    try { localStorage.setItem(`dayday-automations-${boardId}`, JSON.stringify(updated)); } catch {}
  }

  function loadAutomation(auto: SavedAutomation) {
    setCondCol(auto.condCol);
    setCondVals(auto.condVals);
    setActionType(auto.actionType as typeof actionType);
    setTargetCol(auto.targetCol);
    setTargetVal(auto.targetVal);
    setTargetGroup(auto.targetGroup);
    setNotifyText(auto.notifyText || "");
    setResults(null);
    setShowSaved(false);
  }

  function deleteSavedAutomation(id: string) {
    const updated = savedAutomations.filter(a => a.id !== id);
    setSavedAutomations(updated);
    try { localStorage.setItem(`dayday-automations-${boardId}`, JSON.stringify(updated)); } catch {}
  }

  // Get columns with values for condition selection
  const condColumns = board.columns.filter(c =>
    ["color", "dropdown", "text", "checkbox"].includes(c.type)
  );

  // Get unique values for selected condition column
  const condOptions = condCol
    ? [...new Set(items.map(it => it.column_values.find(cv => cv.id === condCol)?.text).filter(Boolean) as string[])]
    : [];

  // Status columns for "change status" action
  const statusColumns = board.columns.filter(c => c.type === "color");

  // Get unique values for target status column
  const targetOptions = targetCol
    ? [...new Set(items.map(it => it.column_values.find(cv => cv.id === targetCol)?.text).filter(Boolean) as string[])]
    : [];

  // Load groups when "move to group" is selected
  useEffect(() => {
    if (actionType === "move_to_group" && groups.length === 0) {
      fetch("/api/monday", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "groups", boardId, apiToken }),
      })
        .then(r => r.json())
        .then(data => { if (data.groups) setGroups(data.groups); });
    }
  }, [actionType, boardId, apiToken, groups.length]);

  // Count matching items
  const matchCount = condCol
    ? items.filter(it => {
        const cv = it.column_values.find(v => v.id === condCol);
        if (!cv?.text) return false;
        if (condVals.length > 0) return condVals.includes(cv.text);
        return true;
      }).length
    : 0;

  function toggleCondVal(val: string) {
    setCondVals(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  }

  const canExecute = condCol && actionType && (
    (actionType === "change_status" && targetCol && targetVal) ||
    (actionType === "move_to_group" && targetGroup) ||
    (actionType === "archive") ||
    (actionType === "notify" && notifyText.trim())
  );

  async function execute() {
    if (!canExecute || running) return;
    setRunning(true);
    setResults(null);

    const actionConfig: Record<string, string> = {};
    if (actionType === "change_status") {
      actionConfig.columnId = targetCol;
      actionConfig.newValue = targetVal;
    } else if (actionType === "move_to_group") {
      actionConfig.groupId = targetGroup;
    } else if (actionType === "notify") {
      actionConfig.text = notifyText;
    }

    try {
      const res = await fetch("/api/monday", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "automate", boardId, apiToken,
          conditionColumn: condCol,
          conditionValues: condVals.length > 0 ? condVals : undefined,
          actionType, actionConfig,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setResults({ executed: 0, total: 0, results: [data.error] });
      } else {
        setResults(data);
      }
    } catch {
      setResults({ executed: 0, total: 0, results: ["שגיאה בחיבור לשרת"] });
    } finally {
      setRunning(false);
    }
  }

  const selectStyle: React.CSSProperties = {
    width: "100%", padding: "8px 10px", borderRadius: 8, fontSize: 13,
    border: `1.5px solid ${hexToRgba(pc, 0.15)}`, background: "#FFF",
    color: "#2D2252", outline: "none", direction: "rtl",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: "#2D2252", marginBottom: 6, display: "block",
  };

  const sectionStyle: React.CSSProperties = {
    background: hexToRgba(pc, 0.03), borderRadius: 12, padding: 14,
    border: `1px solid ${hexToRgba(pc, 0.1)}`, marginBottom: 12,
  };

  return (
    <div>
      <h3 style={{ fontSize: 17, fontWeight: 700, color: "#2D2252", marginBottom: 4 }}>
        אוטומציות אמיתיות
      </h3>
      <p style={{ fontSize: 12, color: ac, marginBottom: 14, lineHeight: 1.5 }}>
        בחרו תנאי, בחרו פעולה, לחצו הפעל. DayDay מבצע את זה ישירות על הבורד.
      </p>

      {/* Capabilities showcase */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18 }}>
        {[
          { icon: "M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z", label: "שנה סטטוס", desc: "עדכון סטטוס לפריטים", act: "change_status" },
          { icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0", label: "העבר לקבוצה", desc: "העברה בין קבוצות", act: "move_to_group" },
          { icon: "M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8", label: "ארכיון", desc: "העבר פריטים לארכיון", act: "archive" },
          { icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9", label: "שלח התראה", desc: "התראה למשתמשים", act: "notify" },
          { icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z", label: "שלח מייל", desc: "שליחת מייל אוטומטית", act: "send_email" },
          { icon: "M12 6v6m0 0v6m0-6h6m-6 0H6", label: "צור פריט", desc: "הוספת פריטים חדשים", act: "create_item" },
        ].map((cap) => (
          <button key={cap.act} onClick={() => { setActionType(cap.act === "send_email" || cap.act === "create_item" ? "" : cap.act as typeof actionType); }} style={{
            background: actionType === cap.act ? hexToRgba(pc, 0.1) : hexToRgba(pc, 0.03),
            border: `1px solid ${actionType === cap.act ? hexToRgba(pc, 0.3) : hexToRgba(pc, 0.08)}`,
            borderRadius: 10, padding: "10px 8px", cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            transition: "all 0.15s",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={actionType === cap.act ? pc : "#999"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d={cap.icon} />
            </svg>
            <span style={{ fontSize: 11, fontWeight: 700, color: actionType === cap.act ? pc : "#2D2252" }}>{cap.label}</span>
            <span style={{ fontSize: 9, color: "#999" }}>{cap.desc}</span>
          </button>
        ))}
      </div>

      {/* Saved automations */}
      {savedAutomations.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <button onClick={() => setShowSaved(!showSaved)} style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 12, fontWeight: 700, color: pc,
            display: "flex", alignItems: "center", gap: 4, marginBottom: 8, padding: 0,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              style={{ transform: showSaved ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
            אוטומציות שמורות ({savedAutomations.length})
          </button>
          {showSaved && savedAutomations.map(auto => (
            <div key={auto.id} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 10px", borderRadius: 10,
              background: hexToRgba(pc, 0.04),
              border: `1px solid ${hexToRgba(pc, 0.1)}`,
              marginBottom: 4, cursor: "pointer",
            }}
            onClick={() => loadAutomation(auto)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={pc} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#2D2252", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {auto.name}
                </div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); deleteSavedAutomation(auto.id); }} style={{
                background: "none", border: "none", cursor: "pointer", padding: 2, color: "#A29BFE", flexShrink: 0,
              }}
              onMouseEnter={e => (e.currentTarget.style.color = "#E17055")}
              onMouseLeave={e => (e.currentTarget.style.color = "#A29BFE")}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Step 1: Condition */}
      <div style={sectionStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <div style={{
            width: 22, height: 22, borderRadius: 6, background: pc,
            color: "#FFF", fontSize: 12, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>1</div>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#2D2252" }}>כשעמודה שווה ל...</span>
        </div>

        <label style={labelStyle}>עמודה</label>
        <select value={condCol} onChange={e => { setCondCol(e.target.value); setCondVals([]); }} style={selectStyle}>
          <option value="">בחרו עמודה</option>
          {condColumns.map(c => (
            <option key={c.id} value={c.id}>{c.title} ({TYPE_LABELS[c.type] || c.type})</option>
          ))}
        </select>

        {condCol && condOptions.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <label style={labelStyle}>ערכים (השאירו ריק = הכל)</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {condOptions.map(val => (
                <button key={val} onClick={() => toggleCondVal(val)} style={{
                  padding: "4px 10px", borderRadius: 16, fontSize: 11, fontWeight: 500,
                  border: `1.5px solid ${condVals.includes(val) ? pc : hexToRgba(pc, 0.15)}`,
                  background: condVals.includes(val) ? hexToRgba(pc, 0.1) : "#FFF",
                  color: condVals.includes(val) ? pc : "#2D2252",
                  cursor: "pointer", transition: "all 0.15s",
                }}>{val}</button>
              ))}
            </div>
          </div>
        )}

        {condCol && (
          <div style={{ marginTop: 8, fontSize: 11, color: pc, fontWeight: 600 }}>
            {matchCount} פריטים תואמים
          </div>
        )}
      </div>

      {/* Step 2: Action */}
      <div style={sectionStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <div style={{
            width: 22, height: 22, borderRadius: 6, background: condCol ? pc : "#D0D5DF",
            color: "#FFF", fontSize: 12, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>2</div>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#2D2252" }}>תבצע...</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[
            { id: "change_status" as const, label: "שנה סטטוס", icon: "🔄" },
            { id: "move_to_group" as const, label: "העבר לקבוצה", icon: "📦" },
            { id: "notify" as const, label: "שלח התראה", icon: "🔔" },
            { id: "archive" as const, label: "העבר לארכיון", icon: "🗄️" },
          ].map(a => (
            <button key={a.id} onClick={() => setActionType(a.id)} style={{
              padding: "10px 12px", borderRadius: 10, fontSize: 13, fontWeight: 500,
              border: `1.5px solid ${actionType === a.id ? pc : hexToRgba(pc, 0.1)}`,
              background: actionType === a.id ? hexToRgba(pc, 0.08) : "#FFF",
              color: "#2D2252", cursor: "pointer", textAlign: "right",
              display: "flex", alignItems: "center", gap: 8, transition: "all 0.15s",
            }}>
              <span>{a.icon}</span>
              {a.label}
            </button>
          ))}
        </div>

        {/* Action config: change status */}
        {actionType === "change_status" && (
          <div style={{ marginTop: 10 }}>
            <label style={labelStyle}>עמודת סטטוס</label>
            <select value={targetCol} onChange={e => { setTargetCol(e.target.value); setTargetVal(""); }} style={selectStyle}>
              <option value="">בחרו עמודה</option>
              {statusColumns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
            {targetCol && targetOptions.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <label style={labelStyle}>ערך חדש</label>
                <select value={targetVal} onChange={e => setTargetVal(e.target.value)} style={selectStyle}>
                  <option value="">בחרו ערך</option>
                  {targetOptions.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Action config: move to group */}
        {actionType === "move_to_group" && (
          <div style={{ marginTop: 10 }}>
            <label style={labelStyle}>קבוצת יעד</label>
            <select value={targetGroup} onChange={e => setTargetGroup(e.target.value)} style={selectStyle}>
              <option value="">בחרו קבוצה</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
            </select>
          </div>
        )}

        {/* Action config: notify */}
        {actionType === "notify" && (
          <div style={{ marginTop: 10 }}>
            <label style={labelStyle}>טקסט ההתראה</label>
            <input
              value={notifyText}
              onChange={e => setNotifyText(e.target.value)}
              placeholder="לדוגמה: יש פריט שדורש טיפול"
              style={{ ...selectStyle, direction: "rtl" }}
            />
          </div>
        )}
      </div>

      {/* Execute + Save buttons */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={execute} disabled={!canExecute || running} style={{
          flex: 1, padding: "12px", borderRadius: 12, border: "none",
          cursor: canExecute && !running ? "pointer" : "not-allowed",
          background: canExecute
            ? `linear-gradient(135deg, ${pc}, ${ac})`
          : hexToRgba(pc, 0.1),
        color: canExecute ? "#FFF" : ac,
        fontSize: 14, fontWeight: 700,
        transition: "all 0.2s", opacity: running ? 0.6 : 1,
      }}>
          {running ? "מבצע..." : `הפעל על ${matchCount} פריטים`}
        </button>
        {canExecute && (
          <button onClick={saveAutomation} style={{
            padding: "12px 14px", borderRadius: 12,
            border: `1.5px solid ${hexToRgba(pc, 0.2)}`,
            background: "#FFF", cursor: "pointer",
            color: pc, fontSize: 13, fontWeight: 600,
            transition: "all 0.2s", flexShrink: 0,
            display: "flex", alignItems: "center", gap: 4,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
            </svg>
            שמור
          </button>
        )}
      </div>

      {/* Results */}
      {results && (
        <div style={{
          background: results.executed > 0 ? "rgba(0,184,148,0.06)" : "rgba(225,112,85,0.06)",
          borderRadius: 12, padding: 14,
          border: `1px solid ${results.executed > 0 ? "rgba(0,184,148,0.2)" : "rgba(225,112,85,0.2)"}`,
        }}>
          <div style={{
            fontSize: 14, fontWeight: 700, marginBottom: 8,
            color: results.executed > 0 ? "#00B894" : "#E17055",
          }}>
            {results.executed > 0
              ? `בוצע בהצלחה: ${results.executed} מתוך ${results.total}`
              : results.results[0] || "לא בוצע"}
          </div>
          {results.results.length > 0 && results.executed > 0 && (
            <div style={{ maxHeight: 150, overflowY: "auto" }}>
              {results.results.map((r, i) => (
                <div key={i} style={{
                  fontSize: 11, color: "#2D2252", padding: "3px 0",
                  borderBottom: `1px solid ${hexToRgba(pc, 0.05)}`,
                }}>
                  {r}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


function ImpactPanel({ board, items, pc = "#6C5CE7", ac = "#A29BFE" }: { board: MondayBoard; items: MondayItem[]; pc?: string; ac?: string }) {
  const [exporting, setExporting] = useState(false);
  const [selectedCols, setSelectedCols] = useState<Set<string>>(new Set());

  const totalItems = items.length;

  // Analyze all columns
  const columnAnalysis = board.columns.map(col => {
    const values: string[] = [];
    items.forEach(it => {
      const cv = it.column_values.find(v => v.id === col.id);
      if (cv?.text) values.push(cv.text);
    });
    const dist: Record<string, number> = {};
    values.forEach(v => { dist[v] = (dist[v] || 0) + 1; });
    const fillRate = Math.round((values.length / Math.max(totalItems, 1)) * 100);
    const chartable = values.length >= 2 && Object.keys(dist).length >= 2 && Object.keys(dist).length <= 30;
    return {
      ...col, values, dist, fillRate, chartable,
      typeLabel: TYPE_LABELS[col.type] || col.type,
    };
  }).filter(c => c.fillRate > 0);

  // Auto-select best columns on mount
  useEffect(() => {
    if (selectedCols.size === 0) {
      const auto = new Set<string>();
      columnAnalysis
        .filter(c => c.chartable)
        .sort((a, b) => b.fillRate - a.fillRate)
        .slice(0, 5)
        .forEach(c => auto.add(c.id));
      if (auto.size > 0) setSelectedCols(auto);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleCol(id: string) {
    setSelectedCols(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const selected = columnAnalysis.filter(c => selectedCols.has(c.id));

  // Separate selected by type for display
  const statusAnalysis = selected.filter(c => c.type === "color");
  const peopleAnalysis = selected.filter(c => ["person", "multiple-person"].includes(c.type)).map(col => {
    const peopleDist: Record<string, number> = {};
    items.forEach(it => {
      const cv = it.column_values.find(v => v.id === col.id);
      if (cv?.text) cv.text.split(",").map(n => n.trim()).filter(Boolean).forEach(name => {
        peopleDist[name] = (peopleDist[name] || 0) + 1;
      });
    });
    return { ...col, peopleDist, total: Object.values(peopleDist).reduce((s, v) => s + v, 0) };
  }).filter(p => p.total > 0);
  const numAnalysis = selected.filter(c => ["numeric", "numbers"].includes(c.type)).map(col => {
    const nums: number[] = [];
    items.forEach(it => {
      const cv = it.column_values.find(v => v.id === col.id);
      if (cv?.text) { const n = parseFloat(cv.text.replace(/[^0-9.-]/g, "")); if (!isNaN(n)) nums.push(n); }
    });
    const sum = nums.reduce((s, v) => s + v, 0);
    return { ...col, sum, avg: nums.length > 0 ? sum / nums.length : 0, count: nums.length };
  }).filter(n => n.count > 0);
  const otherAnalysis = selected.filter(c =>
    c.type !== "color" && !["person", "multiple-person", "numeric", "numbers"].includes(c.type)
  );

  // Data completeness for all columns (not just selected)
  const allCols = columnAnalysis.map(c => ({ title: c.title, filled: c.values.length, rate: c.fillRate })).sort((a, b) => b.rate - a.rate);
  const avgFillRate = allCols.length > 0 ? Math.round(allCols.reduce((s, c) => s + c.rate, 0) / allCols.length) : 0;

  const kpis = [
    { label: "פריטים", value: totalItems.toString(), color: pc },
    { label: "עמודות נבחרות", value: selected.length.toString(), color: ac },
    { label: "שלמות", value: `${avgFillRate}%`, color: avgFillRate >= 70 ? "#00B894" : "#FDCB6E" },
    { label: "סטטוסים", value: statusAnalysis.length.toString(), color: "#0984E3" },
  ];

  function exportImpactPDF() {
    setExporting(true);
    const now = new Date();
    const dateStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

    // Build chart HTML for each selected column
    const chartsHtml = selected.map(col => {
      const sorted = Object.entries(col.dist).sort((a, b) => b[1] - a[1]);
      const total = sorted.reduce((sum, [, v]) => sum + v, 0) || 1;
      const maxVal = sorted[0]?.[1] || 1;
      const bars = sorted.slice(0, 10).map(([label, count], i) => {
        const pct = Math.round((count / total) * 100);
        return `<div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px"><span style="font-weight:500">${label}</span><span style="color:${ac}">${count} (${pct}%)</span></div><div style="height:10px;border-radius:5px;background:${hexToRgba(pc, 0.06)};overflow:hidden"><div style="height:100%;border-radius:5px;background:${COLORS[i % COLORS.length]};width:${Math.round((count / maxVal) * 100)}%"></div></div></div>`;
      }).join("");
      return `<div style="background:${hexToRgba(pc, 0.03)};border-radius:14px;padding:18px;border:1px solid ${hexToRgba(pc, 0.1)};margin-bottom:16px;break-inside:avoid"><div style="font-size:15px;font-weight:700;margin-bottom:12px">${col.title} <span style="font-size:11px;color:${ac}">${col.typeLabel} | ${col.fillRate}% מלא</span></div>${bars}</div>`;
    }).join("");

    const completenessRows = allCols.slice(0, 15).map(c => {
      const color = c.rate >= 70 ? "#00B894" : c.rate >= 40 ? "#FDCB6E" : "#E17055";
      return `<tr><td style="padding:6px 10px;font-size:12px;border-bottom:1px solid ${hexToRgba(pc, 0.06)}">${c.title}</td><td style="padding:6px 10px;font-size:12px;text-align:center;border-bottom:1px solid ${hexToRgba(pc, 0.06)}">${c.filled}/${totalItems}</td><td style="padding:6px 10px;width:120px;border-bottom:1px solid ${hexToRgba(pc, 0.06)}"><div style="display:flex;align-items:center;gap:6px"><div style="flex:1;height:6px;border-radius:3px;background:${hexToRgba(pc, 0.06)};overflow:hidden"><div style="height:100%;border-radius:3px;background:${color};width:${c.rate}%"></div></div><span style="font-size:11px;font-weight:600;color:${color}">${c.rate}%</span></div></td></tr>`;
    }).join("");

    const html = `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="utf-8"><title>דוח אימפקט - ${board.name}</title><link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800&display=swap" rel="stylesheet"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Rubik',sans-serif;background:#FFF;padding:40px;color:#2D2252;direction:rtl}@media print{body{padding:20px}}</style></head><body>
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;padding-bottom:16px;border-bottom:3px solid ${pc}"><div><div style="font-size:28px;font-weight:800">דוח אימפקט</div><div style="font-size:18px;font-weight:600;color:${pc};margin-top:2px">${board.name}</div><div style="font-size:12px;color:${ac};margin-top:4px">${dateStr} | ${totalItems} פריטים | ${selected.length} עמודות נבחרות</div></div><div style="width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,${pc},${ac});display:flex;align-items:center;justify-content:center;color:#FFF;font-size:24px;font-weight:800">D</div></div>
<div style="display:flex;gap:12px;margin-bottom:24px">${kpis.map(k => `<div style="flex:1;background:${hexToRgba(pc, 0.03)};border-radius:12px;padding:16px;border:1px solid ${hexToRgba(pc, 0.08)};text-align:center"><div style="font-size:32px;font-weight:800;color:${k.color}">${k.value}</div><div style="font-size:12px;color:${ac}">${k.label}</div></div>`).join("")}</div>
<div style="font-size:18px;font-weight:700;margin-bottom:12px">ניתוח עמודות נבחרות</div>
${chartsHtml}
<div style="font-size:18px;font-weight:700;margin-bottom:12px">שלמות נתונים (${avgFillRate}%)</div>
<div style="border-radius:14px;border:1px solid ${hexToRgba(pc, 0.1)};overflow:hidden;margin-bottom:16px"><table style="width:100%;border-collapse:collapse"><thead><tr style="background:${hexToRgba(pc, 0.06)}"><th style="padding:10px;text-align:right;font-weight:700;border-bottom:2px solid ${hexToRgba(pc, 0.15)}">עמודה</th><th style="padding:10px;text-align:center;font-weight:700;border-bottom:2px solid ${hexToRgba(pc, 0.15)}">מלא</th><th style="padding:10px;text-align:right;font-weight:700;border-bottom:2px solid ${hexToRgba(pc, 0.15)}">אחוז</th></tr></thead><tbody>${completenessRows}</tbody></table></div>
<div style="text-align:center;margin-top:30px;padding-top:16px;border-top:2px solid ${hexToRgba(pc, 0.1)};font-size:11px;color:${ac}">הופק ע״י AnyDay | ${dateStr}</div>
</body></html>`;

    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => { w.print(); setExporting(false); }, 500); }
    else { setExporting(false); }
  }

  const cardStyle: React.CSSProperties = {
    background: hexToRgba(pc, 0.03), borderRadius: 12, padding: 14,
    border: `1px solid ${hexToRgba(pc, 0.1)}`, marginBottom: 12,
  };

  return (
    <div>
      <h3 style={{ fontSize: 17, fontWeight: 700, color: "#2D2252", marginBottom: 4 }}>דוח אימפקט</h3>
      <p style={{ fontSize: 12, color: ac, marginBottom: 14, lineHeight: 1.5 }}>
        סריקה מלאה של הבורד. מספרים אמיתיים. מוכן לתורמים.
      </p>

      <button onClick={exportImpactPDF} disabled={exporting} style={{
        width: "100%", padding: "11px", borderRadius: 10, border: "none", cursor: "pointer",
        background: `linear-gradient(135deg, ${pc}, ${ac})`,
        color: "#FFF", fontSize: 13, fontWeight: 700, marginBottom: 16,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        opacity: exporting ? 0.6 : 1,
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        {exporting ? "מייצא..." : "ייצוא דוח אימפקט PDF"}
      </button>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
        {kpis.map((k, i) => (
          <div key={i} style={{
            background: "#F9F7FF", borderRadius: 10, padding: "12px 10px",
            border: `1px solid ${hexToRgba(pc, 0.08)}`, textAlign: "center",
          }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 10, color: "#7C6FD0" }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Column selector */}
      <div style={{ fontSize: 13, fontWeight: 600, color: "#2D2252", marginBottom: 8 }}>בחרו עמודות לדוח</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 16, maxHeight: 180, overflowY: "auto" }}>
        {columnAnalysis.filter(c => c.chartable).map(col => (
          <div key={col.id} onClick={() => toggleCol(col.id)} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "7px 10px", borderRadius: 8, cursor: "pointer",
            background: selectedCols.has(col.id) ? hexToRgba(pc, 0.08) : "#FAFAFA",
            border: `1.5px solid ${selectedCols.has(col.id) ? pc : hexToRgba(pc, 0.06)}`,
            transition: "all 0.15s",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{
                width: 16, height: 16, borderRadius: 4,
                border: `2px solid ${selectedCols.has(col.id) ? pc : "#D0D5DF"}`,
                background: selectedCols.has(col.id) ? pc : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {selectedCols.has(col.id) && (
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              <span style={{ fontSize: 12, fontWeight: 500, color: "#2D2252" }}>{col.title}</span>
            </div>
            <span style={{ fontSize: 9, color: pc, background: hexToRgba(pc, 0.08), padding: "1px 5px", borderRadius: 3, fontWeight: 600 }}>{col.typeLabel}</span>
          </div>
        ))}
      </div>

      {/* Charts for selected columns */}
      {selected.length > 0 && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#2D2252", marginBottom: 8 }}>ניתוח</div>
          {selected.map(col => {
            const sorted = Object.entries(col.dist).sort((a, b) => b[1] - a[1]);
            const total = sorted.reduce((sum, [, v]) => sum + v, 0) || 1;
            const maxVal = sorted[0]?.[1] || 1;
            return (
              <div key={col.id} style={cardStyle}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#2D2252", marginBottom: 8 }}>
                  {col.title}
                  <span style={{ fontSize: 9, color: "#A29BFE", marginRight: 6 }}>{Object.keys(col.dist).length} ערכים</span>
                </div>
                {sorted.slice(0, 6).map(([label, count], i) => (
                  <div key={label} style={{ marginBottom: 5 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 2 }}>
                      <span style={{ color: "#2D2252", fontWeight: 500 }}>{label}</span>
                      <span style={{ color: "#7C6FD0" }}>{count} ({Math.round((count / total) * 100)}%)</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: hexToRgba(pc, 0.06), overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 3, background: COLORS[i % COLORS.length], width: `${Math.round((count / maxVal) * 100)}%` }} />
                    </div>
                  </div>
                ))}
                {sorted.length > 6 && <div style={{ fontSize: 9, color: "#A29BFE", marginTop: 3 }}>+{sorted.length - 6} ערכים</div>}
              </div>
            );
          })}
        </div>
      )}

      {selected.length === 0 && (
        <div style={{ textAlign: "center", padding: 16, color: ac, fontSize: 12, background: hexToRgba(pc, 0.03), borderRadius: 12, border: `1px solid ${hexToRgba(pc, 0.08)}` }}>
          סמנו עמודות למעלה כדי לבנות את הדוח
        </div>
      )}

      {/* Data completeness */}
      <div style={{ fontSize: 13, fontWeight: 600, color: "#2D2252", marginBottom: 8, marginTop: 12 }}>שלמות נתונים ({avgFillRate}%)</div>
      <div style={cardStyle}>
        {allCols.slice(0, 8).map(c => {
          const barColor = c.rate >= 70 ? "#00B894" : c.rate >= 40 ? "#FDCB6E" : "#E17055";
          return (
            <div key={c.title} style={{ marginBottom: 5 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 2 }}>
                <span style={{ fontWeight: 500 }}>{c.title}</span>
                <span style={{ color: barColor, fontWeight: 600 }}>{c.rate}%</span>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: hexToRgba(pc, 0.06), overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 3, background: barColor, width: `${c.rate}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// ReportPanel - One-click management reports
// ═══════════════════════════════════════════════════════

function ReportPanel({ board, items, pc = "#6C5CE7", ac = "#A29BFE", orgName = "" }: {
  board: MondayBoard; items: MondayItem[]; pc?: string; ac?: string; orgName?: string;
}) {
  const [reportType, setReportType] = useState<string>("management");
  const [report, setReport] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  function buildBoardContext() {
    const statusDist: Record<string, number> = {};
    items.forEach((item) =>
      item.column_values.forEach((cv) => {
        if (cv.column.type === "color" && cv.text)
          statusDist[cv.text] = (statusDist[cv.text] || 0) + 1;
      })
    );
    const sampleItems = items.slice(0, 30).map(it => {
      const vals = it.column_values.filter(cv => cv.text).map(cv => `${cv.column.title}:${cv.text}`).join(", ");
      return `${it.name} (${vals})`;
    }).join(" | ");

    return {
      boardName: board.name,
      itemsCount: board.items_count,
      columns: board.columns.map((c) => `${c.id}: ${c.title} [${c.type}]`).join(", "),
      statusDistribution: Object.entries(statusDist).map(([k, v]) => `${k}:${v}`).join(", ") || "אין",
      sampleItems,
    };
  }

  async function generateReport() {
    setGenerating(true);
    setReport("");
    setGenerated(false);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boardContext: buildBoardContext(),
          reportType,
          orgName,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setReport(`שגיאה: ${data.error}`);
      } else {
        setReport(data.report);
        setGenerated(true);
      }
    } catch {
      setReport("שגיאה בחיבור לשרת");
    } finally {
      setGenerating(false);
    }
  }

  function exportReportPDF() {
    const now = new Date();
    const dateStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
    const displayName = orgName || board.name;

    // Convert markdown-like report to HTML
    const reportHtml = report
      .split("\n")
      .map(line => {
        const trimmed = line.trim();
        if (!trimmed) return "<br/>";
        if (trimmed.startsWith("### ")) return `<h3 style="font-size:16px;font-weight:700;color:${pc};margin:18px 0 8px;border-bottom:2px solid ${hexToRgba(pc, 0.15)};padding-bottom:6px">${trimmed.slice(4)}</h3>`;
        if (trimmed.startsWith("## ")) return `<h2 style="font-size:20px;font-weight:800;color:#2D2252;margin:22px 0 10px">${trimmed.slice(3)}</h2>`;
        if (trimmed.startsWith("# ")) return `<h1 style="font-size:24px;font-weight:800;color:#2D2252;margin:24px 0 12px">${trimmed.slice(2)}</h1>`;
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) return `<div style="display:flex;gap:6px;margin-bottom:4px;padding-right:12px"><span style="color:${pc};font-weight:700">&#8226;</span><span>${trimmed.slice(2).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')}</span></div>`;
        if (/^\d+\.\s/.test(trimmed)) return `<div style="display:flex;gap:6px;margin-bottom:4px"><span style="color:${pc};font-weight:700">${trimmed.match(/^\d+/)![0]}.</span><span>${trimmed.replace(/^\d+\.\s/, '').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')}</span></div>`;
        if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
          if (/^\|[\s-:|]+\|$/.test(trimmed)) return ""; // skip separator
          const cells = trimmed.slice(1, -1).split("|").map(c => c.trim());
          const cellsHtml = cells.map(c => `<td style="padding:8px 12px;border-bottom:1px solid ${hexToRgba(pc, 0.1)};text-align:right">${c.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')}</td>`).join("");
          return `<tr style="font-size:13px">${cellsHtml}</tr>`;
        }
        return `<p style="margin-bottom:6px;line-height:1.7">${trimmed.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')}</p>`;
      })
      .join("\n");

    // Wrap table rows
    const finalHtml = reportHtml.replace(/(<tr[^>]*>[\s\S]*?<\/tr>\n?)+/g, (match) => {
      return `<table style="width:100%;border-collapse:collapse;margin:12px 0;border:1px solid ${hexToRgba(pc, 0.1)};border-radius:8px;overflow:hidden;direction:rtl"><tbody>${match}</tbody></table>`;
    });

    const reportTypeLabels: Record<string, string> = {
      management: "דוח מנהלים",
      weekly: "דוח שבועי",
      donors: "דוח למשקיעים",
      kpi: "דוח KPIs",
    };

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="utf-8">
  <title>${reportTypeLabels[reportType] || "דוח"} - ${displayName}</title>
  <link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Rubik',sans-serif; background:#FFF; padding:40px; color:#2D2252; direction:rtl; font-size:14px; line-height:1.6; }
    @media print { body { padding:20px; } }
    table tr:first-child td { background:${hexToRgba(pc, 0.05)}; font-weight:700; }
    table tr:hover td { background:${hexToRgba(pc, 0.03)}; }
  </style>
</head>
<body>
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:30px;padding-bottom:18px;border-bottom:3px solid ${pc}">
    <div>
      <div style="font-size:28px;font-weight:800;color:#2D2252">${reportTypeLabels[reportType] || "דוח"}</div>
      <div style="font-size:15px;color:${ac};margin-top:4px">${displayName} | ${dateStr} | ${board.items_count} פריטים</div>
    </div>
    <div style="width:50px;height:50px;border-radius:14px;background:linear-gradient(135deg,${pc},${ac});display:flex;align-items:center;justify-content:center;color:#FFF;font-size:22px;font-weight:800">
      ${displayName.charAt(0)}
    </div>
  </div>
  ${finalHtml}
  <div style="text-align:center;margin-top:40px;padding-top:16px;border-top:2px solid ${hexToRgba(pc, 0.1)};font-size:11px;color:${ac}">
    הופק ע"י AnyDay | ${dateStr}
  </div>
</body>
</html>`;

    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
      setTimeout(() => w.print(), 500);
    }
  }

  const reportTypes = [
    { id: "management", label: "דוח מנהלים", desc: "סיכום מקיף לדירקטוריון", icon: "briefcase" },
    { id: "weekly", label: "דוח שבועי", desc: "עדכון קצר לצוות", icon: "calendar" },
    { id: "donors", label: "דוח למשקיעים", desc: "התקדמות ו-ROI", icon: "heart" },
    { id: "kpi", label: "דוח KPIs", desc: "מדדים ומגמות", icon: "trending" },
  ];

  const iconMap: Record<string, React.ReactNode> = {
    briefcase: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>,
    calendar: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    heart: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
    trending: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  };

  return (
    <div>
      <h3 style={{ fontSize: 17, fontWeight: 700, color: "#2D2252", marginBottom: 4 }}>
        דוח בלחיצה אחת
      </h3>
      <p style={{ fontSize: 12, color: ac, marginBottom: 18, lineHeight: 1.5 }}>
        בחרו סוג דוח ו-AnyDay ייצר אותו מהנתונים שלכם. מוכן לשליחה.
      </p>

      {/* Report type selector */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
        {reportTypes.map(rt => (
          <button key={rt.id} onClick={() => { setReportType(rt.id); setGenerated(false); setReport(""); }} style={{
            padding: "12px 14px", borderRadius: 12, cursor: "pointer",
            border: `1.5px solid ${reportType === rt.id ? pc : hexToRgba(pc, 0.1)}`,
            background: reportType === rt.id ? hexToRgba(pc, 0.08) : "#FFF",
            display: "flex", alignItems: "center", gap: 10, textAlign: "right",
            transition: "all 0.15s",
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: reportType === rt.id ? `linear-gradient(135deg, ${pc}, ${ac})` : hexToRgba(pc, 0.06),
              display: "flex", alignItems: "center", justifyContent: "center",
              color: reportType === rt.id ? "#FFF" : pc, flexShrink: 0,
            }}>
              {iconMap[rt.icon]}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#2D2252" }}>{rt.label}</div>
              <div style={{ fontSize: 11, color: ac }}>{rt.desc}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Generate button */}
      <button onClick={generateReport} disabled={generating} style={{
        width: "100%", padding: "12px", borderRadius: 12, border: "none", cursor: generating ? "not-allowed" : "pointer",
        background: `linear-gradient(135deg, ${pc}, ${ac})`,
        color: "#FFF", fontSize: 14, fontWeight: 700,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        opacity: generating ? 0.7 : 1, transition: "all 0.2s", marginBottom: 16,
      }}>
        {generating ? (
          <>
            <Spinner size={14} color="#FFF" />
            מייצר דוח...
          </>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            ייצר דוח עכשיו
          </>
        )}
      </button>

      {/* Report preview */}
      {report && (
        <div>
          {generated && (
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <button onClick={exportReportPDF} style={{
                flex: 1, padding: "8px", borderRadius: 8, border: "none",
                background: `linear-gradient(135deg, ${pc}, ${ac})`,
                color: "#FFF", fontSize: 12, fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                ייצוא PDF
              </button>
              <button onClick={() => { navigator.clipboard.writeText(report); }} style={{
                flex: 1, padding: "8px", borderRadius: 8,
                border: `1.5px solid ${hexToRgba(pc, 0.2)}`,
                background: "#FFF", color: pc, fontSize: 12, fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
                העתק טקסט
              </button>
            </div>
          )}
          <div style={{
            background: hexToRgba(pc, 0.02), borderRadius: 14,
            padding: "16px", border: `1px solid ${hexToRgba(pc, 0.08)}`,
            fontSize: 13, lineHeight: 1.7, color: "#2D2252",
            maxHeight: 500, overflowY: "auto",
          }}>
            <FormattedText text={report} />
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// AlertsPanel - Smart alerts detection
// ═══════════════════════════════════════════════════════

interface Alert {
  type: "danger" | "warning" | "info";
  title: string;
  detail: string;
  count: number;
  items: string[];
}

function AlertsPanel({ board, items, pc = "#6C5CE7", ac = "#A29BFE", onAskAI }: {
  board: MondayBoard; items: MondayItem[]; pc?: string; ac?: string; onAskAI?: (question: string) => void;
}) {
  // Analyze board for alerts
  const alerts: Alert[] = [];

  // 1. Empty columns (fill rate < 30%)
  board.columns.forEach(col => {
    const filled = items.filter(it => {
      const cv = it.column_values.find(v => v.id === col.id);
      return cv?.text && cv.text.trim() !== "";
    }).length;
    const rate = Math.round((filled / Math.max(items.length, 1)) * 100);
    if (rate < 30 && rate > 0 && items.length > 5) {
      alerts.push({
        type: "warning",
        title: `עמודה "${col.title}" כמעט ריקה`,
        detail: `רק ${rate}% מהפריטים מולאו (${filled} מתוך ${items.length})`,
        count: items.length - filled,
        items: items.filter(it => {
          const cv = it.column_values.find(v => v.id === col.id);
          return !cv?.text || cv.text.trim() === "";
        }).slice(0, 5).map(it => it.name),
      });
    }
  });

  // 2. Status bottlenecks (one status has >50% of items)
  const statusDist: Record<string, { count: number; items: string[] }> = {};
  items.forEach(item => {
    item.column_values.forEach(cv => {
      if (cv.column.type === "color" && cv.text) {
        if (!statusDist[cv.text]) statusDist[cv.text] = { count: 0, items: [] };
        statusDist[cv.text].count++;
        if (statusDist[cv.text].items.length < 5) statusDist[cv.text].items.push(item.name);
      }
    });
  });

  Object.entries(statusDist).forEach(([status, data]) => {
    const pct = Math.round((data.count / Math.max(items.length, 1)) * 100);
    if (pct > 50 && data.count > 3) {
      alerts.push({
        type: "danger",
        title: `צוואר בקבוק: "${status}"`,
        detail: `${data.count} פריטים (${pct}%) מרוכזים בסטטוס אחד`,
        count: data.count,
        items: data.items,
      });
    }
  });

  // 3. Items with no status at all
  const noStatus = items.filter(item => {
    const hasStatus = item.column_values.some(cv => cv.column.type === "color" && cv.text);
    return !hasStatus;
  });
  if (noStatus.length > 0) {
    alerts.push({
      type: "warning",
      title: "פריטים בלי סטטוס",
      detail: `${noStatus.length} פריטים ללא שום סטטוס מוגדר`,
      count: noStatus.length,
      items: noStatus.slice(0, 5).map(it => it.name),
    });
  }

  // 4. Duplicate names
  const nameCounts: Record<string, number> = {};
  items.forEach(it => { nameCounts[it.name] = (nameCounts[it.name] || 0) + 1; });
  const duplicates = Object.entries(nameCounts).filter(([, c]) => c > 1);
  if (duplicates.length > 0) {
    const totalDups = duplicates.reduce((sum, [, c]) => sum + c, 0);
    alerts.push({
      type: "info",
      title: "פריטים עם שם כפול",
      detail: `${duplicates.length} שמות חוזרים (${totalDups} פריטים)`,
      count: totalDups,
      items: duplicates.slice(0, 5).map(([name, count]) => `${name} (x${count})`),
    });
  }

  // 5. Board health score
  const totalCols = board.columns.length;
  const avgFillRate = Math.round(
    board.columns.reduce((sum, col) => {
      const filled = items.filter(it => {
        const cv = it.column_values.find(v => v.id === col.id);
        return cv?.text && cv.text.trim() !== "";
      }).length;
      return sum + (filled / Math.max(items.length, 1)) * 100;
    }, 0) / Math.max(totalCols, 1)
  );

  const healthScore = Math.max(0, Math.min(100,
    100 - (alerts.filter(a => a.type === "danger").length * 20)
        - (alerts.filter(a => a.type === "warning").length * 10)
        - (alerts.filter(a => a.type === "info").length * 3)
  ));

  const healthColor = healthScore >= 70 ? "#00B894" : healthScore >= 40 ? "#FDCB6E" : "#E17055";
  const healthLabel = healthScore >= 70 ? "מצוין" : healthScore >= 40 ? "דורש תשומת לב" : "קריטי";

  const alertColors = {
    danger: { bg: "#FFF0F0", border: "#FFD0D0", icon: "#E17055", text: "#C0392B" },
    warning: { bg: "#FFF8E1", border: "#FFE8A0", icon: "#F39C12", text: "#D68910" },
    info: { bg: "#E8F4FD", border: "#B0D9F1", icon: "#0984E3", text: "#2471A3" },
  };

  return (
    <div>
      <h3 style={{ fontSize: 17, fontWeight: 700, color: "#2D2252", marginBottom: 4 }}>
        התראות
      </h3>
      <p style={{ fontSize: 12, color: ac, marginBottom: 18, lineHeight: 1.5 }}>
        סריקה אוטומטית: צווארי בקבוק, עמודות ריקות, כפילויות. לחצו על התראה כדי לשאול את AI מה לעשות.
      </p>

      {/* Health Score */}
      <div style={{
        background: `linear-gradient(135deg, ${hexToRgba(pc, 0.04)}, ${hexToRgba(pc, 0.08)})`,
        borderRadius: 16, padding: "20px", marginBottom: 18,
        border: `1px solid ${hexToRgba(pc, 0.1)}`, textAlign: "center",
      }}>
        <div style={{ fontSize: 11, color: ac, marginBottom: 6, fontWeight: 600 }}>התראות</div>
        <div style={{
          fontSize: 48, fontWeight: 800, color: healthColor,
          lineHeight: 1,
        }}>{healthScore}</div>
        <div style={{
          fontSize: 13, fontWeight: 600, color: healthColor, marginTop: 4,
        }}>{healthLabel}</div>
        <div style={{
          height: 8, borderRadius: 4, background: hexToRgba(pc, 0.08),
          overflow: "hidden", marginTop: 12,
        }}>
          <div style={{
            height: "100%", borderRadius: 4, background: healthColor,
            width: `${healthScore}%`, transition: "width 0.6s ease",
          }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: ac }}>
          <span>מילוי ממוצע: {avgFillRate}%</span>
          <span>{items.length} פריטים</span>
        </div>
      </div>

      {/* Alert count summary */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[
          { type: "danger", label: "קריטי", color: "#E17055" },
          { type: "warning", label: "אזהרה", color: "#F39C12" },
          { type: "info", label: "מידע", color: "#0984E3" },
        ].map(t => {
          const count = alerts.filter(a => a.type === t.type).length;
          return (
            <div key={t.type} style={{
              flex: 1, textAlign: "center", padding: "10px 6px", borderRadius: 10,
              background: count > 0 ? `${t.color}12` : hexToRgba(pc, 0.03),
              border: `1px solid ${count > 0 ? `${t.color}30` : hexToRgba(pc, 0.06)}`,
            }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: count > 0 ? t.color : "#CCC" }}>{count}</div>
              <div style={{ fontSize: 10, color: count > 0 ? t.color : "#999", fontWeight: 600 }}>{t.label}</div>
            </div>
          );
        })}
      </div>

      {/* Alerts list */}
      {alerts.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "24px",
          background: "#F0FFF0", borderRadius: 14,
          border: "1px solid #C8E6C8",
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>&#10003;</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#00B894" }}>הבורד במצב מעולה!</div>
          <div style={{ fontSize: 12, color: "#7C9A7C", marginTop: 4 }}>לא נמצאו בעיות</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {alerts.sort((a, b) => {
            const order = { danger: 0, warning: 1, info: 2 };
            return order[a.type] - order[b.type];
          }).map((alert, i) => {
            const colors = alertColors[alert.type];
            return (
              <div key={i} style={{
                background: colors.bg, borderRadius: 12,
                border: `1px solid ${colors.border}`,
                padding: "12px 14px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: colors.icon, flexShrink: 0,
                  }} />
                  <div style={{ fontSize: 13, fontWeight: 700, color: colors.text }}>
                    {alert.title}
                  </div>
                  <div style={{
                    marginRight: "auto", fontSize: 10, fontWeight: 700,
                    background: `${colors.icon}20`, color: colors.icon,
                    padding: "2px 8px", borderRadius: 10,
                  }}>{alert.count}</div>
                </div>
                <div style={{ fontSize: 12, color: colors.text, opacity: 0.8, marginBottom: 6 }}>
                  {alert.detail}
                </div>
                {alert.items.length > 0 && (
                  <div style={{ fontSize: 11, color: colors.text, opacity: 0.7 }}>
                    {alert.items.map((item, j) => (
                      <span key={j}>
                        {j > 0 && " | "}
                        {item}
                      </span>
                    ))}
                    {alert.count > 5 && <span> | +{alert.count - 5} נוספים</span>}
                  </div>
                )}
                {onAskAI && (
                  <button onClick={() => onAskAI(`יש לי בעיה: ${alert.title}. ${alert.detail}. מה אתה ממליץ לעשות?`)} style={{
                    marginTop: 8, padding: "6px 12px", borderRadius: 8, cursor: "pointer",
                    background: "none", border: `1px solid ${colors.icon}40`,
                    color: colors.icon, fontSize: 11, fontWeight: 600,
                    display: "flex", alignItems: "center", gap: 4,
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                    שאל את AI מה לעשות
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


