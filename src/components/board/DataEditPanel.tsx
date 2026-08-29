"use client";

import { useState, useEffect, useRef, Component, type ReactNode } from "react";
import { changeColumnValue, changeSimpleValue, createItem } from "@/lib/api-client";
import type { MondayBoard, MondayItem } from "@/types";

class DataEditErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 20, color: "#E17055", textAlign: "center" }}>
          <p style={{ fontWeight: 700, marginBottom: 8 }}>שגיאה בטעינת הטבלה</p>
          <p style={{ fontSize: 12, color: "#666" }}>{this.state.error.message}</p>
          <button onClick={() => this.setState({ error: null })} style={{ marginTop: 12, background: "var(--color-accent)", color: "var(--color-bg)", border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 13 }}>נסה שוב</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
}

function DataEditPanelInner({ board, items, apiToken, boardId, pc = "#FF2D87", ac = "var(--color-text2)" }: {
  board: MondayBoard; items: MondayItem[]; apiToken: string; boardId: string; pc?: string; ac?: string;
}) {
  const [editingCell, setEditingCell] = useState<{ itemId: string; colId: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedCells, setSavedCells] = useState<Set<string>>(new Set());
  const [newItemName, setNewItemName] = useState("");
  const [addingItem, setAddingItem] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [deletingItem, setDeletingItem] = useState<string | null>(null);
  /* ארכוב כותב לבורד האמיתי, לכן הוא דו-שלבי: לחיצה ראשונה רק שואלת,
     רק השנייה שולחת בקשה. אותו דפוס כמו כפתור הניתוק בראש המסך. */
  const [pendingArchive, setPendingArchive] = useState<string | null>(null);
  const confirmRef = useRef<HTMLDivElement | null>(null);

  /* שורה לא נשארת דרוכה: כל לחיצה מחוץ לבועת האישור — שורה אחרת, תא
     לעריכה, הרקע — או Escape, מבטלת את המתנה לאישור. */
  useEffect(() => {
    if (!pendingArchive) return;
    function onPointerDown(e: Event) {
      const t = e.target;
      if (confirmRef.current && t instanceof Node && confirmRef.current.contains(t)) return;
      setPendingArchive(null);
    }
    function onKeyDown(e: KeyboardEvent) { if (e.key === "Escape") setPendingArchive(null); }
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [pendingArchive]);

  const editableCols = board.columns.filter(c =>
    c.type !== "name" && ["color", "text", "long-text", "numeric", "numbers", "dropdown", "email", "phone", "date", "checkbox"].includes(c.type)
  );

  const statusCols = board.columns.filter(c => c.type === "color");
  const statusOptions: Record<string, string[]> = {};
  statusCols.forEach(col => {
    const vals = new Set<string>();
    items.forEach(item => {
      const cv = (item.column_values || []).find(v => v.id === col.id);
      if (cv?.text) vals.add(cv.text);
    });
    statusOptions[col.id] = [...vals];
  });

  const filteredItems = searchQuery
    ? items.filter(it => it.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (it.column_values || []).some(cv => cv.text?.toLowerCase().includes(searchQuery.toLowerCase())))
    : items;

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  async function handleSave(itemId: string, colId: string, value: string) {
    setSaving(true);
    try {
      const col = board.columns.find(c => c.id === colId);
      if (col?.type === "color") {
        await changeColumnValue(boardId, apiToken, itemId, colId, { label: value });
      } else {
        await changeSimpleValue(boardId, apiToken, itemId, colId, value);
      }
      setSavedCells(prev => new Set(prev).add(itemId + "-" + colId));
      const item = items.find(it => it.id === itemId);
      if (item) {
        const cv = item.column_values.find(v => v.id === colId);
        if (cv) cv.text = value;
      }
      showToast("נשמר!");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setSaving(false);
      setEditingCell(null);
    }
  }

  /* הפעולה נשארת archive_item — הפיכה מתוך Monday. אין כאן מחיקה. */
  async function handleArchive(itemId: string) {
    setDeletingItem(itemId);
    try {
      await fetch("/api/monday", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mutate", apiToken, mutation: "mutation { archive_item(item_id: " + itemId + ") { id } }" }),
      });
      showToast("הועבר לארכיון");
    } catch {
      showToast("שגיאה");
    } finally {
      setDeletingItem(null);
      setPendingArchive(null);
    }
  }

  async function handleAddItem() {
    if (!newItemName.trim() || addingItem) return;
    setAddingItem(true);
    try {
      await createItem(boardId, apiToken, newItemName.trim());
      showToast(newItemName.trim() + " נוסף!");
      setNewItemName("");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setAddingItem(false);
    }
  }

  return (
    <div>
      <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--color-text)", marginBottom: 4 }}>
        {"\u05e2\u05e8\u05d9\u05db\u05ea \u05d4\u05d1\u05d5\u05e8\u05d3"}
      </h3>
      <p style={{ fontSize: 12, color: ac, marginBottom: 14, lineHeight: 1.5 }}>
        {"הטבלה המלאה. לחצו על תא לעריכה. הכפתור בסוף השורה מעביר לארכיון, אחרי אישור."}
      </p>
      {toast && (<div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 999, background: "var(--color-accent)", color: "var(--color-bg)", padding: "10px 24px", borderRadius: 12, fontSize: 13, fontWeight: 600, boxShadow: "0 8px 30px rgba(0,0,0,0.2)" }}>{toast}</div>)}
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input value={newItemName} onChange={e => setNewItemName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAddItem()} placeholder={"+ \u05e4\u05e8\u05d9\u05d8 \u05d7\u05d3\u05e9..."} style={{ flex: 1, background: "var(--color-surf)", border: "1.5px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "7px 12px", fontSize: 13, outline: "none", color: "var(--color-text)" }} />
        <button onClick={handleAddItem} disabled={!newItemName.trim() || addingItem} style={{ background: pc, color: "var(--color-bg)", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: newItemName.trim() ? "pointer" : "not-allowed", opacity: newItemName.trim() ? 1 : 0.5 }}>{addingItem ? "..." : "\u05d4\u05d5\u05e1\u05e3"}</button>
      </div>
      <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={"\u05d7\u05d9\u05e4\u05d5\u05e9..."} style={{ width: "100%", background: "var(--color-surf)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8, padding: "7px 12px", fontSize: 12, outline: "none", marginBottom: 8, color: "var(--color-text)" }} />
      <div style={{ fontSize: 11, color: ac, marginBottom: 6 }}>{filteredItems.length} / {items.length} {"\u05e4\u05e8\u05d9\u05d8\u05d9\u05dd \u00b7 "}{editableCols.length}{" \u05e2\u05de\u05d5\u05d3\u05d5\u05ea"}</div>
      <div style={{ overflowX: "auto", maxHeight: "calc(100vh - 300px)", overflowY: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 12 }}>
          <thead><tr>
            <th style={{ position: "sticky", top: 0, zIndex: 2, background: "rgba(212,255,43,0.04)", padding: "8px 10px", textAlign: "right", fontWeight: 700, color: "var(--color-text)", fontSize: 11, borderBottom: "2px solid var(--color-accent)", whiteSpace: "nowrap", minWidth: 120 }}>{"\u05e9\u05dd"}</th>
            {editableCols.map(col => (<th key={col.id} style={{ position: "sticky", top: 0, zIndex: 2, background: "rgba(212,255,43,0.04)", padding: "8px 6px", textAlign: "right", fontWeight: 700, color: "var(--color-text)", fontSize: 11, borderBottom: "2px solid var(--color-accent)", whiteSpace: "nowrap", minWidth: 80 }}>{col.title}</th>))}
            <th style={{ position: "sticky", top: 0, zIndex: 2, background: "rgba(212,255,43,0.04)", padding: "8px 4px", borderBottom: "2px solid var(--color-accent)", width: 30 }} />
          </tr></thead>
          <tbody>
            {filteredItems.slice(0, 100).map((item, idx) => (<tr key={item.id} style={{ background: idx % 2 === 0 ? "var(--color-surf)" : "rgba(255,255,255,0.02)" }}>
              <td style={{ padding: "8px 10px", fontWeight: 600, color: "var(--color-text)", borderBottom: "1px solid rgba(255,255,255,0.05)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", borderRight: "3px solid var(--color-accent)" }}>{item.name}</td>
              {editableCols.map(col => { const cv = (item.column_values || []).find(v => v.id === col.id); const value = cv?.text || ""; const isEditing = editingCell?.itemId === item.id && editingCell?.colId === col.id; const wasSaved = savedCells.has(item.id + "-" + col.id); const isStatus = col.type === "color"; return (<td key={col.id} style={{ padding: "4px 6px", borderBottom: "1px solid rgba(255,255,255,0.05)", position: "relative" }}>{isEditing ? (isStatus ? (<div style={{ display: "flex", flexDirection: "column", gap: 2, position: "absolute", top: 0, right: 0, zIndex: 10, background: "var(--color-surf)", border: "1.5px solid var(--color-accent)", borderRadius: 8, padding: 6, minWidth: 120, boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }}>{(statusOptions[col.id] || []).map(opt => (<button key={opt} onClick={() => handleSave(item.id, col.id, opt)} disabled={saving} style={{ background: opt === value ? "var(--color-accent)" : "transparent", color: opt === value ? "var(--color-bg)" : "var(--color-text)", border: "none", borderRadius: 4, padding: "4px 8px", fontSize: 11, fontWeight: 600, cursor: saving ? "wait" : "pointer", textAlign: "right" }}>{opt}</button>))}<button onClick={() => setEditingCell(null)} style={{ background: "none", border: "none", fontSize: 10, color: "#E17055", cursor: "pointer", fontWeight: 600 }}>{"\u05d1\u05d9\u05d8\u05d5\u05dc"}</button></div>) : (<input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleSave(item.id, col.id, editValue); if (e.key === "Escape") setEditingCell(null); }} onBlur={() => { if (editValue !== value) handleSave(item.id, col.id, editValue); else setEditingCell(null); }} style={{ width: "100%", background: "var(--color-surf)", border: "1.5px solid var(--color-accent)", borderRadius: 4, padding: "4px 6px", fontSize: 12, outline: "none", color: "var(--color-text)" }} />)) : (<div onClick={() => { setPendingArchive(null); setEditingCell({ itemId: item.id, colId: col.id }); setEditValue(value); }} style={{ cursor: "pointer", padding: "4px 6px", borderRadius: 4, background: isStatus && value ? "rgba(212,255,43,0.06)" : "transparent", border: wasSaved ? "1.5px solid #00B894" : "1.5px solid transparent", color: value ? "var(--color-text)" : "var(--color-muted2)", fontWeight: isStatus ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 110, fontSize: 12 }}>{value || "\u2014"}</div>)}</td>); })}
              <td style={{ padding: "4px", borderBottom: "1px solid rgba(255,255,255,0.05)", textAlign: "center", position: "relative" }}>{pendingArchive === item.id ? (<div ref={confirmRef} style={{ position: "absolute", top: 0, insetInlineEnd: 0, zIndex: 20, display: "flex", alignItems: "center", gap: 6, background: "var(--color-surf)", border: "1.5px solid var(--color-accent)", borderRadius: 8, padding: "4px 8px", boxShadow: "0 4px 16px rgba(0,0,0,0.18)", whiteSpace: "nowrap" }}><span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text)" }}>{"להעביר לארכיון?"}</span><button onClick={() => handleArchive(item.id)} disabled={deletingItem === item.id} style={{ background: "var(--color-accent)", color: "var(--color-bg)", border: "none", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700, cursor: deletingItem === item.id ? "wait" : "pointer", fontFamily: "inherit" }}>{deletingItem === item.id ? "מעבירים…" : "כן"}</button><button onClick={() => setPendingArchive(null)} disabled={deletingItem === item.id} style={{ background: "none", border: "1px solid rgba(255,255,255,0.15)", color: "var(--color-text2)", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{"ביטול"}</button></div>) : (<button onClick={() => setPendingArchive(item.id)} disabled={deletingItem === item.id} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "#CCC", transition: "color 0.15s" }} onMouseEnter={e => (e.currentTarget.style.color = "#E17055")} onMouseLeave={e => (e.currentTarget.style.color = "#CCC")} title={"העברה לארכיון"} aria-label={"העברה לארכיון"}>{deletingItem === item.id ? (<span style={{ fontSize: 10 }}>...</span>) : (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>)}</button>)}</td>
            </tr>))}
          </tbody>
        </table>
        {filteredItems.length > 100 && (<div style={{ textAlign: "center", padding: 12, fontSize: 12, color: ac }}>{"\u05de\u05e6\u05d9\u05d2 100 \u05de\u05ea\u05d5\u05da "}{filteredItems.length}{". \u05d7\u05e4\u05e9\u05d5 \u05dc\u05de\u05e6\u05d9\u05d0\u05ea \u05e0\u05d5\u05e1\u05e4\u05d9\u05dd."}</div>)}
      </div>
    </div>
  );
}

export default function DataEditPanel(props: {
  board: MondayBoard; items: MondayItem[]; apiToken: string; boardId: string; pc?: string; ac?: string;
}) {
  if (!props.board || !props.items || !Array.isArray(props.items)) {
    return <div style={{ padding: 20, textAlign: "center", color: "#999", fontSize: 13 }}>טוען נתוני בורד...</div>;
  }
  if (!props.board.columns || !Array.isArray(props.board.columns)) {
    return <div style={{ padding: 20, textAlign: "center", color: "#999", fontSize: 13 }}>אין עמודות בבורד</div>;
  }
  return (
    <DataEditErrorBoundary>
      <DataEditPanelInner {...props} />
    </DataEditErrorBoundary>
  );
}
