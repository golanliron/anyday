filepath = r"C:\Users\golan\AppData\Local\Temp\dayday-monday\src\components\board\BoardDashboard.tsx"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    '"\\u05E0\\u05E9\\u05DE\\u05E8 \\u05D1\\u05D4\\u05E6\\u05DC\\u05D7\\u05D4!"',
    '"נשמר בהצלחה!"'
)
content = content.replace(
    '"\\u05E9\\u05D2\\u05D9\\u05D0\\u05D4 \\u05D1\\u05E9\\u05DE\\u05D9\\u05E8\\u05D4"',
    '"שגיאה בשמירה"'
)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)

# Verify
with open(filepath, "r", encoding="utf-8") as f:
    for i, line in enumerate(f, 1):
        if "showToast" in line and i > 3200:
            print(f"{i}: {line.rstrip()}")
