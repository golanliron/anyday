filepath = r"C:\Users\golan\AppData\Local\Temp\dayday-monday\src\components\board\BoardDashboard.tsx"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

replacements = [
    # Already fixed above, revert the unicode escapes to actual Hebrew
    ('"\u05E0\u05E9\u05DE\u05E8 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4!"', '"נשמר בהצלחה!"'),
    ('"\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E9\u05DE\u05D9\u05E8\u05D4"', '"שגיאה בשמירה"'),
    # Toast messages
    ('"Saved!"', '"נשמר בהצלחה!"'),
    ('"Error"', '"שגיאה"'),
    # Add item messages
    ('`"${newItemName.trim()}" added`', '`"${newItemName.trim()}" נוסף בהצלחה`'),
    # Panel title and description
    ('>Edit Items</h3>', '>עריכה ישירה</h3>'),
    ('Click any cell to edit. Changes save directly to Monday.', 'לחצו על תא כדי לערוך. השינויים נשמרים ישירות ב-Monday.'),
    # Add item placeholder
    ('"Add new item..."', '"הוסיפו פריט חדש..."'),
    # Add button
    ('{addingItem ? "..." : "+ Add"}', '{addingItem ? "..." : "+ הוספה"}'),
    # Search placeholder
    ('"Search items..."', '"חיפוש פריטים..."'),
    # Items count
    ('{filteredItems.length} / {items.length} items', '{filteredItems.length} / {items.length} פריטים'),
    # Cancel button
    ('>Cancel</button>', '>ביטול</button>'),
    # Save button
    ('{saving ? "..." : "Save"}', '{saving ? "..." : "שמור"}'),
    # Bottom message
    ('Showing 50 of {filteredItems.length} items. Use search to find more.', 'מציג 50 מתוך {filteredItems.length} פריטים. השתמשו בחיפוש למציאת פריטים נוספים.'),
]

for old, new in replacements:
    if old in content:
        content = content.replace(old, new)
        print(f"Replaced: {old[:40]}...")
    else:
        print(f"NOT FOUND: {old[:40]}...")

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)

print("\nDone!")
