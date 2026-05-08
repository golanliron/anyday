"use client";

import { useState, useEffect, useCallback } from "react";
import type { MondayBoard, MondayItem } from "@/types";

// ── Helpers ──
function hexToRgba(hex: string, alpha: number): string {
  if (!hex.startsWith("#")) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const TYPE_LABELS: Record<string, string> = {
  color: "סטטוס", date: "תאריך", text: "טקסט", "long-text": "טקסט ארוך",
  numeric: "מספר", numbers: "מספר", dropdown: "רשימה", checkbox: "צ׳קבוקס",
  person: "אנשים", email: "מייל", phone: "טלפון",
};

// ── Types ──
type ActionType = "change_status" | "move_to_group" | "archive" | "notify" | "create_item" | "duplicate_item" | "add_update";
type ConditionOp = "equals" | "not_equals" | "contains" | "empty" | "not_empty";

interface ConditionRule {
  column: string;
  op: ConditionOp;
  values: string[];
}

interface ActionStep {
  id: string;
  type: ActionType;
  config: Record<string, string>;
}

interface SavedAutomation {
  id: string;
  name: string;
  conditions: ConditionRule[];
  actions: ActionStep[];
  autoRun: boolean;
  createdAt: string;
  lastRun?: string;
  lastResult?: { executed: number; total: number };
}

interface ExecutionLog {
  id: string;
  automationName: string;
  timestamp: string;
  executed: number;
  total: number;
  success: boolean;
}

interface AutoGroup {
  id: string;
  title: string;
}

// ── Recipe Templates ──
interface Recipe {
  id: string;
  icon: string;
  title: string;
  desc: string;
  trigger: string;
  action: string;
  conditions: ConditionRule[];
  actions: ActionStep[];
}

const RECIPES: Recipe[] = [
  {
    id: "stuck-notify",
    icon: "\u26A0\uFE0F",
    title: "פריט תקוע \u2192 התראה",
    desc: "כשפריט נשאר בסטטוס מסוים — שלח התראה",
    trigger: "כשסטטוס = ערך מסוים",
    action: "שלח התראה",
    conditions: [{ column: "", op: "equals", values: [] }],
    actions: [{ id: "a1", type: "notify", config: { text: "שימו לב — פריט תקוע ודורש טיפול!" } }],
  },
  {
    id: "done-archive",
    icon: "\u2705",
    title: "הושלם \u2192 ארכיון",
    desc: "כשפריט מסומן כ״הושלם״ — העבר לארכיון",
    trigger: "כשסטטוס = הושלם",
    action: "העבר לארכיון",
    conditions: [{ column: "", op: "equals", values: [] }],
    actions: [{ id: "a1", type: "archive", config: {} }],
  },
  {
    id: "empty-flag",
    icon: "\uD83D\uDEA9",
    title: "עמודה ריקה \u2192 סמן",
    desc: "כשעמודה ריקה — שנה סטטוס ל״חסר מידע״",
    trigger: "כשעמודה ריקה",
    action: "שנה סטטוס",
    conditions: [{ column: "", op: "empty", values: [] }],
    actions: [{ id: "a1", type: "change_status", config: {} }],
  },
  {
    id: "batch-move",
    icon: "\uD83D\uDCE6",
    title: "העבר קבוצתית",
    desc: "העבר כל הפריטים עם ערך מסוים לקבוצה אחרת",
    trigger: "כשעמודה = ערך",
    action: "העבר לקבוצה",
    conditions: [{ column: "", op: "equals", values: [] }],
    actions: [{ id: "a1", type: "move_to_group", config: {} }],
  },
  {
    id: "status-chain",
    icon: "\u26A1",
    title: "שרשרת פעולות",
    desc: "שנה סטטוס + שלח התראה + העבר קבוצה — בלחיצה אחת",
    trigger: "כשעמודה = ערך",
    action: "3 פעולות ברצף",
    conditions: [{ column: "", op: "equals", values: [] }],
    actions: [
      { id: "a1", type: "change_status", config: {} },
      { id: "a2", type: "notify", config: { text: "הפריט עודכן אוטומטית" } },
      { id: "a3", type: "move_to_group", config: {} },
    ],
  },
  {
    id: "create-from-status",
    icon: "\u2795",
    title: "צור פריט חדש",
    desc: "כשסטטוס משתנה — צור פריט חדש בקבוצה אחרת",
    trigger: "כשסטטוס = ערך",
    action: "צור פריט",
    conditions: [{ column: "", op: "equals", values: [] }],
    actions: [{ id: "a1", type: "create_item", config: { itemName: "פריט חדש מאוטומציה" } }],
  },
];

// ── Action metadata ──
const ACTION_META: Record<ActionType, { icon: string; label: string; desc: string; color: string }> = {
  change_status: { icon: "M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z", label: "שנה סטטוס", desc: "עדכון עמודת סטטוס", color: "#6C5CE7" },
  move_to_group: { icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0", label: "העבר לקבוצה", desc: "העברה בין קבוצות", color: "#00B894" },
  archive: { icon: "M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8", label: "ארכיון", desc: "העבר לארכיון", color: "#636E72" },
  notify: { icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9", label: "שלח התראה", desc: "התראה למשתמשים", color: "#FDCB6E" },
  create_item: { icon: "M12 6v6m0 0v6m0-6h6m-6 0H6", label: "צור פריט", desc: "פריט חדש בבורד", color: "#0984E3" },
  duplicate_item: { icon: "M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z", label: "שכפל פריט", desc: "שכפול פריטים תואמים", color: "#E17055" },
  add_update: { icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z", label: "הוסף עדכון", desc: "כתוב עדכון בפריט", color: "#A29BFE" },
};

const CONDITION_OPS: { id: ConditionOp; label: string }[] = [
  { id: "equals", label: "שווה ל..." },
  { id: "not_equals", label: "שונה מ..." },
  { id: "contains", label: "מכיל..." },
  { id: "empty", label: "ריק" },
  { id: "not_empty", label: "לא ריק" },
];

// ── Tab type ──
type Tab = "recipes" | "builder" | "saved" | "history";

// ── Main Component ──
export function AutomationsPanel({ board, items, apiToken, boardId, pc = "#D4FF2B", ac = "var(--color-accent)" }: {
  board: MondayBoard; items: MondayItem[]; apiToken: string; boardId: string; pc?: string; ac?: string;
}) {
  const [tab, setTab] = useState<Tab>("recipes");
  const [conditions, setConditions] = useState<ConditionRule[]>([{ column: "", op: "equals", values: [] }]);
  const [actions, setActions] = useState<ActionStep[]>([]);
  const [groups, setGroups] = useState<AutoGroup[]>([]);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<{ executed: number; total: number; results: string[] } | null>(null);
  const [saved, setSaved] = useState<SavedAutomation[]>([]);
  const [history, setHistory] = useState<ExecutionLog[]>([]);
  const [editingName, setEditingName] = useState("");
  const [autoRunDone, setAutoRunDone] = useState(false);

  // Load saved + history from localStorage
  useEffect(() => {
    try {
      const s = localStorage.getItem(`anyday-auto-${boardId}`);
      if (s) setSaved(JSON.parse(s));
      const h = localStorage.getItem(`anyday-auto-history-${boardId}`);
      if (h) setHistory(JSON.parse(h));
    } catch {}
  }, [boardId]);

  // Load groups
  useEffect(() => {
    const needsGroups = actions.some(a => a.type === "move_to_group" || a.type === "create_item");
    if (needsGroups && groups.length === 0) {
      fetch("/api/monday", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "groups", boardId, apiToken }),
      })
        .then(r => r.json())
        .then(data => { if (data.groups) setGroups(data.groups); });
    }
  }, [actions, boardId, apiToken, groups.length]);

  // Auto-run saved automations on mount
  useEffect(() => {
    if (autoRunDone || saved.length === 0) return;
    setAutoRunDone(true);
    const autoRuns = saved.filter(s => s.autoRun);
    if (autoRuns.length > 0) {
      autoRuns.forEach(a => executeAutomation(a.conditions, a.actions, a.name, true));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved, autoRunDone]);

  function persistSaved(list: SavedAutomation[]) {
    setSaved(list);
    try { localStorage.setItem(`anyday-auto-${boardId}`, JSON.stringify(list)); } catch {}
  }

  function persistHistory(list: ExecutionLog[]) {
    setHistory(list);
    try { localStorage.setItem(`anyday-auto-history-${boardId}`, JSON.stringify(list.slice(0, 50))); } catch {}
  }

  // ── Condition matching ──
  const matchItems = useCallback((conds: ConditionRule[]) => {
    return items.filter(item => {
      return conds.every(cond => {
        if (!cond.column) return true;
        const cv = item.column_values.find(v => v.id === cond.column);
        const text = cv?.text || "";
        switch (cond.op) {
          case "equals":
            if (cond.values.length === 0) return !!text;
            return cond.values.includes(text);
          case "not_equals":
            if (cond.values.length === 0) return true;
            return !cond.values.includes(text);
          case "contains":
            if (cond.values.length === 0) return true;
            return cond.values.some(v => text.includes(v));
          case "empty":
            return !text;
          case "not_empty":
            return !!text;
          default: return true;
        }
      });
    });
  }, [items]);

  const matchCount = matchItems(conditions).length;

  // ── Columns for conditions ──
  const condColumns = board.columns.filter(c =>
    ["color", "dropdown", "text", "checkbox", "date", "numeric", "numbers", "long-text", "email", "phone"].includes(c.type)
  );
  const statusColumns = board.columns.filter(c => c.type === "color");

  function getColumnOptions(colId: string): string[] {
    if (!colId) return [];
    return [...new Set(items.map(it => it.column_values.find(cv => cv.id === colId)?.text).filter(Boolean) as string[])];
  }

  // ── Execute ──
  async function executeAutomation(conds: ConditionRule[], acts: ActionStep[], name: string, silent = false) {
    if (running) return;
    if (!silent) { setRunning(true); setResults(null); }

    let totalExecuted = 0;
    let totalMatched = 0;
    const allResults: string[] = [];

    for (const act of acts) {
      const actionConfig: Record<string, string> = { ...act.config };

      try {
        const res = await fetch("/api/monday", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "automate",
            boardId, apiToken,
            conditionColumn: conds[0]?.column || "",
            conditionValues: conds[0]?.op === "equals" ? (conds[0]?.values.length > 0 ? conds[0].values : undefined) : undefined,
            actionType: act.type === "duplicate_item" ? "create_item" : act.type === "add_update" ? "notify" : act.type,
            actionConfig,
          }),
        });
        const data = await res.json();
        if (data.error) {
          allResults.push(`\u274C ${ACTION_META[act.type].label}: ${data.error}`);
        } else {
          totalExecuted += data.executed || 0;
          totalMatched = Math.max(totalMatched, data.total || 0);
          if (data.results) allResults.push(...data.results.map((r: string) => `${ACTION_META[act.type].label}: ${r}`));
        }
      } catch {
        allResults.push(`\u274C ${ACTION_META[act.type].label}: שגיאה בחיבור`);
      }
    }

    const result = { executed: totalExecuted, total: totalMatched, results: allResults };
    if (!silent) {
      setResults(result);
      setRunning(false);
    }

    // Log to history
    const log: ExecutionLog = {
      id: `log-${Date.now()}`,
      automationName: name || "אוטומציה ידנית",
      timestamp: new Date().toISOString(),
      executed: totalExecuted,
      total: totalMatched,
      success: totalExecuted > 0,
    };
    persistHistory([log, ...history]);

    // Update last run on saved automation
    const updatedSaved = saved.map(s => {
      if (s.name === name) return { ...s, lastRun: new Date().toISOString(), lastResult: { executed: totalExecuted, total: totalMatched } };
      return s;
    });
    persistSaved(updatedSaved);

    return result;
  }

  function handleExecute() {
    const name = editingName || `${conditions.map(c => {
      const col = board.columns.find(cc => cc.id === c.column);
      return col?.title || "";
    }).join(" + ")} \u2192 ${actions.map(a => ACTION_META[a.type].label).join(" + ")}`;
    executeAutomation(conditions, actions, name);
  }

  // ── Save ──
  function handleSave() {
    const name = editingName || `${conditions.map(c => {
      const col = board.columns.find(cc => cc.id === c.column);
      return col?.title || "";
    }).join(" + ")} \u2192 ${actions.map(a => ACTION_META[a.type].label).join(" + ")}`;
    const auto: SavedAutomation = {
      id: `a-${Date.now()}`, name,
      conditions: conditions.map(c => ({ ...c, values: [...c.values] })),
      actions: actions.map(a => ({ ...a, config: { ...a.config } })),
      autoRun: false,
      createdAt: new Date().toISOString(),
    };
    persistSaved([auto, ...saved].slice(0, 30));
    setEditingName("");
  }

  function loadSavedAutomation(auto: SavedAutomation) {
    setConditions(auto.conditions.map(c => ({ ...c, values: [...c.values] })));
    setActions(auto.actions.map(a => ({ ...a, config: { ...a.config } })));
    setEditingName(auto.name);
    setResults(null);
    setTab("builder");
  }

  function toggleAutoRun(id: string) {
    const updated = saved.map(s => s.id === id ? { ...s, autoRun: !s.autoRun } : s);
    persistSaved(updated);
  }

  function deleteSaved(id: string) {
    persistSaved(saved.filter(s => s.id !== id));
  }

  // ── Apply recipe ──
  function applyRecipe(recipe: Recipe) {
    setConditions(recipe.conditions.map(c => ({ ...c, values: [...c.values] })));
    setActions(recipe.actions.map(a => ({ ...a, config: { ...a.config } })));
    setEditingName(recipe.title);
    setResults(null);
    setTab("builder");
  }

  // ── Actions CRUD ──
  function addAction(type: ActionType) {
    setActions(prev => [...prev, { id: `act-${Date.now()}`, type, config: {} }]);
  }

  function removeAction(id: string) {
    setActions(prev => prev.filter(a => a.id !== id));
  }

  function updateActionConfig(id: string, key: string, value: string) {
    setActions(prev => prev.map(a => a.id === id ? { ...a, config: { ...a.config, [key]: value } } : a));
  }

  // ── Conditions CRUD ──
  function updateCondition(idx: number, partial: Partial<ConditionRule>) {
    setConditions(prev => prev.map((c, i) => i === idx ? { ...c, ...partial } : c));
  }

  function addCondition() {
    setConditions(prev => [...prev, { column: "", op: "equals", values: [] }]);
  }

  function removeCondition(idx: number) {
    if (conditions.length <= 1) return;
    setConditions(prev => prev.filter((_, i) => i !== idx));
  }

  const canExecute = conditions.some(c => c.column) && actions.length > 0;

  // ── Styles ──
  const selectStyle: React.CSSProperties = {
    width: "100%", padding: "8px 10px", borderRadius: 8, fontSize: 13,
    border: `1.5px solid ${hexToRgba(pc, 0.15)}`, background: "var(--color-surf)",
    color: "var(--color-text)", outline: "none", direction: "rtl",
  };

  const sectionStyle: React.CSSProperties = {
    background: hexToRgba(pc, 0.03), borderRadius: 12, padding: 14,
    border: `1px solid ${hexToRgba(pc, 0.1)}`, marginBottom: 12,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: "var(--color-text)", marginBottom: 6, display: "block",
  };

  // ── Tabs ──
  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "recipes", label: "מתכונים" },
    { id: "builder", label: "בנה אוטומציה" },
    { id: "saved", label: "שמורות", count: saved.length },
    { id: "history", label: "היסטוריה", count: history.length },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 12 }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--color-text)", marginBottom: 2, display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={pc} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          אוטומציות
        </h3>
        <p style={{ fontSize: 11, color: ac, lineHeight: 1.5 }}>
          בחרו מתכון מוכן או בנו אוטומציה מותאמת — AnyDay מבצע ישירות על הבורד
        </p>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 2, marginBottom: 14, background: hexToRgba(pc, 0.04), borderRadius: 10, padding: 3 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: "7px 4px", borderRadius: 8, border: "none", cursor: "pointer",
            fontSize: 11, fontWeight: tab === t.id ? 700 : 500,
            background: tab === t.id ? pc : "transparent",
            color: tab === t.id ? "var(--color-bg)" : "var(--color-text)",
            transition: "all 0.15s", position: "relative",
          }}>
            {t.label}
            {!!t.count && t.count > 0 && (
              <span style={{
                position: "absolute", top: -4, left: -2, fontSize: 9, fontWeight: 700,
                background: pc, color: "var(--color-bg)", borderRadius: 10,
                padding: "1px 5px", minWidth: 14, textAlign: "center",
                display: tab === t.id ? "none" : "block",
              }}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ═══════════ TAB: Recipes ═══════════ */}
      {tab === "recipes" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {RECIPES.map(recipe => (
            <button key={recipe.id} onClick={() => applyRecipe(recipe)} style={{
              background: hexToRgba(pc, 0.03), border: `1px solid ${hexToRgba(pc, 0.1)}`,
              borderRadius: 12, padding: "12px 14px", cursor: "pointer",
              textAlign: "right", transition: "all 0.15s", display: "flex", gap: 12, alignItems: "flex-start",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = hexToRgba(pc, 0.35); e.currentTarget.style.background = hexToRgba(pc, 0.06); }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = hexToRgba(pc, 0.1); e.currentTarget.style.background = hexToRgba(pc, 0.03); }}
            >
              <div style={{
                width: 38, height: 38, borderRadius: 10, background: hexToRgba(pc, 0.1),
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0,
              }}>{recipe.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text)", marginBottom: 2 }}>{recipe.title}</div>
                <div style={{ fontSize: 11, color: "#999", marginBottom: 6 }}>{recipe.desc}</div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{
                    fontSize: 9, padding: "2px 8px", borderRadius: 10,
                    background: hexToRgba(pc, 0.08), color: pc, fontWeight: 600,
                  }}>{recipe.trigger}</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                  <span style={{
                    fontSize: 9, padding: "2px 8px", borderRadius: 10,
                    background: "rgba(0,184,148,0.08)", color: "#00B894", fontWeight: 600,
                  }}>{recipe.action}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ═══════════ TAB: Builder ═══════════ */}
      {tab === "builder" && (
        <div>
          {/* Automation name */}
          <div style={{ marginBottom: 12 }}>
            <input
              value={editingName}
              onChange={e => setEditingName(e.target.value)}
              placeholder="שם האוטומציה (אופציונלי)"
              style={{ ...selectStyle, fontWeight: 600, fontSize: 14 }}
            />
          </div>

          {/* ── Step 1: Conditions ── */}
          <div style={sectionStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <div style={{
                width: 22, height: 22, borderRadius: 6, background: pc,
                color: "var(--color-bg)", fontSize: 12, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>1</div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text)" }}>כשהתנאי מתקיים...</span>
              <span style={{ fontSize: 10, color: "#999", marginRight: "auto" }}>
                {conditions.length > 1 ? `${conditions.length} תנאים (AND)` : ""}
              </span>
            </div>

            {conditions.map((cond, idx) => (
              <div key={idx} style={{
                marginBottom: idx < conditions.length - 1 ? 10 : 0,
                padding: conditions.length > 1 ? 10 : 0,
                background: conditions.length > 1 ? hexToRgba(pc, 0.02) : "transparent",
                borderRadius: 8,
                border: conditions.length > 1 ? `1px dashed ${hexToRgba(pc, 0.12)}` : "none",
              }}>
                {conditions.length > 1 && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: pc }}>תנאי {idx + 1}</span>
                    <button onClick={() => removeCondition(idx)} style={{
                      background: "none", border: "none", cursor: "pointer", color: "#E17055", fontSize: 10, fontWeight: 600,
                    }}>הסר</button>
                  </div>
                )}

                <label style={labelStyle}>עמודה</label>
                <select
                  value={cond.column}
                  onChange={e => updateCondition(idx, { column: e.target.value, values: [] })}
                  style={selectStyle}
                >
                  <option value="">בחרו עמודה</option>
                  {condColumns.map(c => (
                    <option key={c.id} value={c.id}>{c.title} ({TYPE_LABELS[c.type] || c.type})</option>
                  ))}
                </select>

                {cond.column && (
                  <div style={{ marginTop: 8 }}>
                    <label style={labelStyle}>תנאי</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {CONDITION_OPS.map(op => (
                        <button key={op.id} onClick={() => updateCondition(idx, { op: op.id, values: [] })} style={{
                          padding: "4px 10px", borderRadius: 16, fontSize: 11, fontWeight: 500,
                          border: `1.5px solid ${cond.op === op.id ? pc : hexToRgba(pc, 0.15)}`,
                          background: cond.op === op.id ? hexToRgba(pc, 0.1) : "var(--color-surf)",
                          color: cond.op === op.id ? pc : "var(--color-text)",
                          cursor: "pointer", transition: "all 0.15s",
                        }}>{op.label}</button>
                      ))}
                    </div>
                  </div>
                )}

                {cond.column && (cond.op === "equals" || cond.op === "not_equals") && (
                  <div style={{ marginTop: 8 }}>
                    <label style={labelStyle}>ערכים {cond.op === "equals" ? "(השאירו ריק = הכל)" : ""}</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {getColumnOptions(cond.column).map(val => (
                        <button key={val} onClick={() => {
                          const newVals = cond.values.includes(val) ? cond.values.filter(v => v !== val) : [...cond.values, val];
                          updateCondition(idx, { values: newVals });
                        }} style={{
                          padding: "4px 10px", borderRadius: 16, fontSize: 11, fontWeight: 500,
                          border: `1.5px solid ${cond.values.includes(val) ? pc : hexToRgba(pc, 0.15)}`,
                          background: cond.values.includes(val) ? hexToRgba(pc, 0.1) : "var(--color-surf)",
                          color: cond.values.includes(val) ? pc : "var(--color-text)",
                          cursor: "pointer", transition: "all 0.15s",
                        }}>{val}</button>
                      ))}
                    </div>
                  </div>
                )}

                {cond.column && cond.op === "contains" && (
                  <div style={{ marginTop: 8 }}>
                    <label style={labelStyle}>מכיל את הטקסט:</label>
                    <input
                      value={cond.values[0] || ""}
                      onChange={e => updateCondition(idx, { values: [e.target.value] })}
                      placeholder="הקלידו טקסט לחיפוש..."
                      style={selectStyle}
                    />
                  </div>
                )}
              </div>
            ))}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
              <button onClick={addCondition} style={{
                background: "none", border: `1px dashed ${hexToRgba(pc, 0.2)}`, borderRadius: 8,
                padding: "5px 12px", cursor: "pointer", color: pc, fontSize: 11, fontWeight: 600,
              }}>+ הוסף תנאי (AND)</button>

              {conditions.some(c => c.column) && (
                <span style={{ fontSize: 12, color: pc, fontWeight: 700 }}>
                  {matchCount} פריטים תואמים
                </span>
              )}
            </div>
          </div>

          {/* ── Step 2: Actions ── */}
          <div style={sectionStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <div style={{
                width: 22, height: 22, borderRadius: 6,
                background: conditions.some(c => c.column) ? pc : "#D0D5DF",
                color: "var(--color-bg)", fontSize: 12, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>2</div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text)" }}>תבצע... {actions.length > 1 ? `(${actions.length} פעולות)` : ""}</span>
            </div>

            {/* Action picker grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: actions.length > 0 ? 12 : 0 }}>
              {(Object.keys(ACTION_META) as ActionType[]).map(type => (
                <button key={type} onClick={() => addAction(type)} style={{
                  background: hexToRgba(ACTION_META[type].color, 0.06),
                  border: `1px solid ${hexToRgba(ACTION_META[type].color, 0.15)}`,
                  borderRadius: 8, padding: "8px 4px", cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = hexToRgba(ACTION_META[type].color, 0.4); e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = hexToRgba(ACTION_META[type].color, 0.15); e.currentTarget.style.transform = "none"; }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={ACTION_META[type].color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d={ACTION_META[type].icon} />
                  </svg>
                  <span style={{ fontSize: 9, fontWeight: 700, color: ACTION_META[type].color }}>{ACTION_META[type].label}</span>
                </button>
              ))}
            </div>

            {/* Added actions */}
            {actions.map((act, idx) => (
              <div key={act.id} style={{
                marginBottom: 8, padding: 10, borderRadius: 10,
                background: hexToRgba(ACTION_META[act.type].color, 0.04),
                border: `1px solid ${hexToRgba(ACTION_META[act.type].color, 0.15)}`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: 6, background: ACTION_META[act.type].color,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d={ACTION_META[act.type].icon} />
                      </svg>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: ACTION_META[act.type].color }}>
                      {idx + 1}. {ACTION_META[act.type].label}
                    </span>
                  </div>
                  <button onClick={() => removeAction(act.id)} style={{
                    background: "none", border: "none", cursor: "pointer", color: "#E17055", fontSize: 10, fontWeight: 600,
                  }}>הסר</button>
                </div>

                {/* Config for each action type */}
                {act.type === "change_status" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <select value={act.config.columnId || ""} onChange={e => updateActionConfig(act.id, "columnId", e.target.value)} style={selectStyle}>
                      <option value="">בחרו עמודת סטטוס</option>
                      {statusColumns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                    {act.config.columnId && (
                      <select value={act.config.newValue || ""} onChange={e => updateActionConfig(act.id, "newValue", e.target.value)} style={selectStyle}>
                        <option value="">בחרו ערך חדש</option>
                        {getColumnOptions(act.config.columnId).map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    )}
                  </div>
                )}

                {act.type === "move_to_group" && (
                  <select value={act.config.groupId || ""} onChange={e => updateActionConfig(act.id, "groupId", e.target.value)} style={selectStyle}>
                    <option value="">בחרו קבוצת יעד</option>
                    {groups.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
                  </select>
                )}

                {act.type === "notify" && (
                  <input
                    value={act.config.text || ""}
                    onChange={e => updateActionConfig(act.id, "text", e.target.value)}
                    placeholder="טקסט ההתראה..."
                    style={selectStyle}
                  />
                )}

                {act.type === "create_item" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <input
                      value={act.config.itemName || ""}
                      onChange={e => updateActionConfig(act.id, "itemName", e.target.value)}
                      placeholder="שם הפריט החדש..."
                      style={selectStyle}
                    />
                    <select value={act.config.groupId || ""} onChange={e => updateActionConfig(act.id, "groupId", e.target.value)} style={selectStyle}>
                      <option value="">קבוצה (אופציונלי)</option>
                      {groups.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
                    </select>
                  </div>
                )}

                {act.type === "duplicate_item" && (
                  <select value={act.config.groupId || ""} onChange={e => updateActionConfig(act.id, "groupId", e.target.value)} style={selectStyle}>
                    <option value="">שכפל לקבוצה (אופציונלי)</option>
                    {groups.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
                  </select>
                )}

                {act.type === "add_update" && (
                  <textarea
                    value={act.config.text || ""}
                    onChange={e => updateActionConfig(act.id, "text", e.target.value)}
                    placeholder="תוכן העדכון..."
                    rows={2}
                    style={{ ...selectStyle, resize: "vertical", minHeight: 50 }}
                  />
                )}

                {act.type === "archive" && (
                  <div style={{ fontSize: 11, color: "#999", fontStyle: "italic" }}>
                    הפריטים התואמים יועברו לארכיון
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ── Execute + Save ── */}
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button onClick={handleExecute} disabled={!canExecute || running} style={{
              flex: 1, padding: "12px", borderRadius: 12, border: "none",
              cursor: canExecute && !running ? "pointer" : "not-allowed",
              background: canExecute
                ? `linear-gradient(135deg, ${pc}, ${ac})`
                : hexToRgba(pc, 0.1),
              color: canExecute ? "var(--color-bg)" : ac,
              fontSize: 14, fontWeight: 700,
              transition: "all 0.2s", opacity: running ? 0.6 : 1,
            }}>
              {running ? "מבצע..." : `הפעל על ${matchCount} פריטים`}
            </button>
            {canExecute && (
              <button onClick={handleSave} style={{
                padding: "12px 14px", borderRadius: 12,
                border: `1.5px solid ${hexToRgba(pc, 0.2)}`,
                background: "var(--color-surf)", cursor: "pointer",
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
                      fontSize: 11, color: "var(--color-text)", padding: "3px 0",
                      borderBottom: `1px solid ${hexToRgba(pc, 0.05)}`,
                    }}>{r}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══════════ TAB: Saved ═══════════ */}
      {tab === "saved" && (
        <div>
          {saved.length === 0 ? (
            <div style={{ textAlign: "center", padding: 30, color: "#999" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D0D5DF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 8px" }}>
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              <div style={{ fontSize: 13, fontWeight: 600 }}>אין אוטומציות שמורות</div>
              <div style={{ fontSize: 11, marginTop: 4 }}>בנו אוטומציה ושמרו אותה לשימוש חוזר</div>
            </div>
          ) : saved.map(auto => (
            <div key={auto.id} style={{
              marginBottom: 8, padding: 12, borderRadius: 12,
              background: hexToRgba(pc, 0.03),
              border: `1px solid ${hexToRgba(pc, auto.autoRun ? 0.3 : 0.1)}`,
              transition: "all 0.15s",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={auto.autoRun ? "#00B894" : pc} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: "var(--color-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {auto.name}
                </span>
              </div>

              {/* Meta info */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 6, background: hexToRgba(pc, 0.08), color: pc, fontWeight: 600 }}>
                  {auto.conditions.length} תנאי{auto.conditions.length > 1 ? "ם" : ""}
                </span>
                <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 6, background: "rgba(0,184,148,0.08)", color: "#00B894", fontWeight: 600 }}>
                  {auto.actions.length} פעול{auto.actions.length > 1 ? "ות" : "ה"}
                </span>
                {auto.lastRun && (
                  <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 6, background: "rgba(99,102,241,0.08)", color: "#6366F1", fontWeight: 600 }}>
                    הרצה אחרונה: {new Date(auto.lastRun).toLocaleDateString("he-IL")}
                    {auto.lastResult ? ` (${auto.lastResult.executed}/${auto.lastResult.total})` : ""}
                  </span>
                )}
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <button onClick={() => loadSavedAutomation(auto)} style={{
                  flex: 1, padding: "6px 10px", borderRadius: 8, border: `1px solid ${hexToRgba(pc, 0.2)}`,
                  background: "var(--color-surf)", cursor: "pointer", color: pc, fontSize: 11, fontWeight: 600,
                }}>טען ועריכה</button>
                <button onClick={() => executeAutomation(auto.conditions, auto.actions, auto.name)} style={{
                  flex: 1, padding: "6px 10px", borderRadius: 8, border: "none",
                  background: pc, cursor: "pointer", color: "var(--color-bg)", fontSize: 11, fontWeight: 700,
                }}>הפעל עכשיו</button>
                <button onClick={() => toggleAutoRun(auto.id)} title={auto.autoRun ? "כבה הפעלה אוטומטית" : "הפעל אוטומטית בכניסה"} style={{
                  width: 30, height: 30, borderRadius: 8, border: `1px solid ${auto.autoRun ? "rgba(0,184,148,0.3)" : hexToRgba(pc, 0.15)}`,
                  background: auto.autoRun ? "rgba(0,184,148,0.1)" : "var(--color-surf)",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={auto.autoRun ? "#00B894" : "#999"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                  </svg>
                </button>
                <button onClick={() => deleteSaved(auto.id)} style={{
                  width: 30, height: 30, borderRadius: 8, border: "1px solid rgba(225,112,85,0.15)",
                  background: "rgba(225,112,85,0.04)", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#E17055" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══════════ TAB: History ═══════════ */}
      {tab === "history" && (
        <div>
          {history.length === 0 ? (
            <div style={{ textAlign: "center", padding: 30, color: "#999" }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>אין היסטוריה עדיין</div>
              <div style={{ fontSize: 11, marginTop: 4 }}>הריצו אוטומציה והיא תופיע כאן</div>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text)" }}>
                  {history.length} הרצות
                </span>
                <button onClick={() => persistHistory([])} style={{
                  background: "none", border: "none", cursor: "pointer", color: "#E17055", fontSize: 10, fontWeight: 600,
                }}>נקה היסטוריה</button>
              </div>
              {history.map(log => (
                <div key={log.id} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 10px", borderRadius: 8, marginBottom: 4,
                  background: log.success ? "rgba(0,184,148,0.04)" : "rgba(225,112,85,0.04)",
                  border: `1px solid ${log.success ? "rgba(0,184,148,0.1)" : "rgba(225,112,85,0.1)"}`,
                }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                    background: log.success ? "#00B894" : "#E17055",
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {log.automationName}
                    </div>
                    <div style={{ fontSize: 10, color: "#999" }}>
                      {new Date(log.timestamp).toLocaleString("he-IL")} &middot; {log.executed}/{log.total}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default AutomationsPanel;
