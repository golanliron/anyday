import { defineConfig } from "vitest/config";
import path from "path";

// המראה של tsconfig: "@/x" = "src/x". בלעדיו כל קובץ שמייבא דרך האלias
// נופל בבדיקות למרות שהוא עובר קומפילציה.
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
