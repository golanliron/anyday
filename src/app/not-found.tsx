import Link from "next/link";

/**
 * 404 בעברית, בשפת העיצוב של המוצר. בלעדיו Next מגיש את עמוד ברירת
 * המחדל שלו — אנגלית, LTR — לכל כתובת שגויה.
 */
export default function NotFound() {
  return (
    <div dir="rtl" style={{
      minHeight: "100vh", background: "#F4F3FB", color: "#1B1830",
      fontFamily: "Rubik, Assistant, Heebo, system-ui, sans-serif",
      display: "grid", placeItems: "center", padding: 24,
    }}>
      <div style={{ width: "100%", maxWidth: 460, background: "#FFFFFF", borderRadius: 22, padding: "36px 30px", textAlign: "center", boxShadow: "0 18px 50px -28px rgba(60,50,120,.45)" }}>
        <div style={{ fontSize: 40, marginBottom: 10 }} aria-hidden>🧭</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 8px" }}>העמוד לא נמצא</h1>
        <p style={{ fontSize: 14, color: "#7C7A93", margin: "0 0 22px", lineHeight: 1.75 }}>
          הכתובת הזו לא קיימת — אולי הקישור ישן, או שנפלה אות בדרך.
        </p>
        <Link
          href="/"
          style={{ display: "inline-block", background: "linear-gradient(135deg,#6C4CF1,#FF2D87)", color: "#fff", borderRadius: 13, padding: "12px 26px", fontSize: 14.5, fontWeight: 700, textDecoration: "none", fontFamily: "inherit" }}
        >
          לעמוד הבית
        </Link>
      </div>
    </div>
  );
}
