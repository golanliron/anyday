import sys

with open('src/components/board/BoardDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_start = 'function DataEditPanel({ board, items, apiToken, boardId, pc = "#6C5CE7", ac = "#A29BFE" }: {\n  board: MondayBoard; items: MondayItem[]; apiToken: string; boardId: string; pc?: string; ac?: string;\n}) {'

end_text = 'מציג 50 מתוך {filteredItems.length} פריטים. השתמשו בחיפוש למציאת פריטים נוספים.'
idx_start = content.index(old_start)
idx_end = content.index(end_text, idx_start)
# find closing tags after that
rest = content[idx_end:]
close_idx = rest.index('    </div>')
idx_end = idx_end + close_idx + len('    </div>')

new_panel = open('new_data_panel.tsx', 'r', encoding='utf-8').read()

content = content[:idx_start] + new_panel + content[idx_end:]

with open('src/components/board/BoardDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done: DataEditPanel replaced')
