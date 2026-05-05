import os

panel_code = r'''

function DataEditPanel({ board, items, apiToken, boardId, pc = "#6C5CE7", ac = "#A29BFE" }: {
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

  const editableCols = board.columns.filter(c =>
    c.type !== "name" && ["color", "text", "long-text", "numeric", "numbers", "dropdown", "email", "phone", "date"].includes(c.type)
  ).slice(0, 6);

  const statusCols = board.columns.filter(c => c.type === "color");

  const statusOptions: Record<string, string[]> = {};
  statusCols.forEach(col => {
    const vals = new Set<string>();
    items.forEach(item => {
      const cv = item.column_values.find(v => v.id === col.id);
      if (cv?.text) vals.add(cv.text);
    });
    statusOptions[col.id] = [...vals];
  });

  const filteredItems = searchQuery
    ? items.filter(it => it.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        it.column_values.some(cv => cv.text?.toLowerCase().includes(searchQuery.toLowerCase())))
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
      setSavedCells(prev => new Set(prev).add(`${itemId}-${colId}`));
      const item = items.find(it => it.id === itemId);
      if (item) {
        const cv = item.column_values.find(v => v.id === colId);
        if (cv) cv.text = value;
      }
      showToast("Saved!");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
      setEditingCell(null);
    }
  }

  async function handleAddItem() {
    if (!newItemName.trim() || addingItem) return;
    setAddingItem(true);
    try {
      await createItem(boardId, apiToken, newItemName.trim());
      showToast(`"${newItemName.trim()}" added`);
      setNewItemName("");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Error");
    } finally {
      setAddingItem(false);
    }
  }

  const cellKey = (itemId: string, colId: string) => `${itemId}-${colId}`;

  return (
    <div>
      <h3 style={{ fontSize: 17, fontWeight: 700, color: "#2D2252", marginBottom: 4 }}>Edit Items</h3>
      <p style={{ fontSize: 12, color: ac, marginBottom: 14, lineHeight: 1.5 }}>
        Click any cell to edit. Changes save directly to Monday.
      </p>

      {toast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 999,
          background: "#2D2252", color: "#FFF", padding: "10px 24px", borderRadius: 12,
          fontSize: 13, fontWeight: 600, boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
        }}>
          {toast}
        </div>
      )}

      <div style={{
        display: "flex", gap: 8, marginBottom: 16,
        background: hexToRgba(pc, 0.03), borderRadius: 10, padding: 10,
        border: `1px solid ${hexToRgba(pc, 0.1)}`,
      }}>
        <input
          value={newItemName}
          onChange={e => setNewItemName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleAddItem()}
          placeholder="Add new item..."
          style={{
            flex: 1, background: "#FFF", border: `1px solid ${hexToRgba(pc, 0.15)}`,
            borderRadius: 8, padding: "8px 12px", fontSize: 13, outline: "none",
            color: "#2D2252",
          }}
        />
        <button onClick={handleAddItem} disabled={!newItemName.trim() || addingItem} style={{
          background: `linear-gradient(135deg, ${pc}, ${ac})`,
          color: "#FFF", border: "none", borderRadius: 8, padding: "8px 16px",
          fontSize: 13, fontWeight: 700, cursor: newItemName.trim() ? "pointer" : "not-allowed",
          opacity: newItemName.trim() ? 1 : 0.5, whiteSpace: "nowrap",
        }}>
          {addingItem ? "..." : "+ Add"}
        </button>
      </div>

      <input
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        placeholder="Search items..."
        style={{
          width: "100%", background: "#F9F7FF", border: `1px solid ${hexToRgba(pc, 0.12)}`,
          borderRadius: 8, padding: "8px 12px", fontSize: 13, outline: "none",
          marginBottom: 12, color: "#2D2252",
        }}
      />

      <div style={{ fontSize: 11, color: ac, marginBottom: 8 }}>
        {filteredItems.length} / {items.length} items
      </div>

      <div style={{ maxHeight: "calc(100vh - 340px)", overflowY: "auto" }}>
        {filteredItems.slice(0, 50).map(item => (
          <div key={item.id} style={{
            background: "#FFF", borderRadius: 10, padding: "12px 14px",
            border: `1px solid ${hexToRgba(pc, 0.08)}`, marginBottom: 8,
            transition: "all 0.15s",
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#2D2252", marginBottom: 8 }}>
              {item.name}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {editableCols.map(col => {
                const cv = item.column_values.find(v => v.id === col.id);
                const value = cv?.text || "";
                const isEditing = editingCell?.itemId === item.id && editingCell?.colId === col.id;
                const wasSaved = savedCells.has(cellKey(item.id, col.id));
                const isStatus = col.type === "color";

                if (isEditing && isStatus) {
                  return (
                    <div key={col.id} style={{
                      display: "flex", flexDirection: "column", gap: 4,
                      background: hexToRgba(pc, 0.04), borderRadius: 8, padding: 8,
                      border: `1.5px solid ${pc}`, minWidth: 140,
                    }}>
                      <div style={{ fontSize: 10, color: ac, fontWeight: 600 }}>{col.title}</div>
                      {(statusOptions[col.id] || []).map(opt => (
                        <button key={opt} onClick={() => handleSave(item.id, col.id, opt)} disabled={saving} style={{
                          background: opt === value ? pc : hexToRgba(pc, 0.06),
                          color: opt === value ? "#FFF" : "#2D2252",
                          border: "none", borderRadius: 6, padding: "5px 10px",
                          fontSize: 12, fontWeight: 600, cursor: saving ? "wait" : "pointer",
                          textAlign: "right", transition: "all 0.15s",
                        }}>
                          {opt}
                        </button>
                      ))}
                      <button onClick={() => setEditingCell(null)} style={{
                        background: "none", border: "none", cursor: "pointer",
                        fontSize: 11, color: "#E17055", fontWeight: 600, marginTop: 2,
                      }}>Cancel</button>
                    </div>
                  );
                }

                if (isEditing) {
                  return (
                    <div key={col.id} style={{
                      display: "flex", flexDirection: "column", gap: 4,
                      background: hexToRgba(pc, 0.04), borderRadius: 8, padding: 8,
                      border: `1.5px solid ${pc}`, minWidth: 140,
                    }}>
                      <div style={{ fontSize: 10, color: ac, fontWeight: 600 }}>{col.title}</div>
                      <input
                        autoFocus
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") handleSave(item.id, col.id, editValue);
                          if (e.key === "Escape") setEditingCell(null);
                        }}
                        style={{
                          background: "#FFF", border: `1px solid ${hexToRgba(pc, 0.2)}`,
                          borderRadius: 6, padding: "5px 8px", fontSize: 12, outline: "none",
                          color: "#2D2252",
                        }}
                      />
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => handleSave(item.id, col.id, editValue)} disabled={saving} style={{
                          flex: 1, background: pc, color: "#FFF", border: "none",
                          borderRadius: 6, padding: "4px 8px", fontSize: 11, fontWeight: 700,
                          cursor: saving ? "wait" : "pointer",
                        }}>{saving ? "..." : "Save"}</button>
                        <button onClick={() => setEditingCell(null)} style={{
                          background: "none", border: `1px solid ${hexToRgba(pc, 0.15)}`,
                          borderRadius: 6, padding: "4px 8px", fontSize: 11, cursor: "pointer",
                          color: "#2D2252",
                        }}>X</button>
                      </div>
                    </div>
                  );
                }

                return (
                  <button key={col.id} onClick={() => {
                    setEditingCell({ itemId: item.id, colId: col.id });
                    setEditValue(value);
                  }} style={{
                    background: isStatus
                      ? hexToRgba(pc, value ? 0.1 : 0.03)
                      : hexToRgba(pc, 0.03),
                    border: `1px solid ${wasSaved ? "#00B894" : hexToRgba(pc, 0.08)}`,
                    borderRadius: 8, padding: "6px 10px", cursor: "pointer",
                    transition: "all 0.15s", textAlign: "right",
                    minWidth: 0,
                  }}>
                    <div style={{ fontSize: 9, color: ac, fontWeight: 600, marginBottom: 2 }}>{col.title}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: value ? "#2D2252" : "#CCC", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 120 }}>
                      {value || "---"}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {filteredItems.length > 50 && (
          <div style={{ textAlign: "center", padding: 12, fontSize: 12, color: ac }}>
            Showing 50 of {filteredItems.length} items. Use search to find more.
          </div>
        )}
      </div>
    </div>
  );
}
'''

filepath = r"C:\Users\golan\AppData\Local\Temp\dayday-monday\src\components\board\BoardDashboard.tsx"
with open(filepath, "a", encoding="utf-8") as f:
    f.write(panel_code)

print("DataEditPanel appended successfully")
