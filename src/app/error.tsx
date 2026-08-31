"use client";

import Link from "next/link";

/**
 * שגיאה לא-צפויה בכל מקום באפליקציה. בלי הקובץ הזה Next מציג את המסך
 * הגנרי שלו — אנגלית, LTR, בלי דרך חזרה — למשתמשת שכל המוצר מדבר אליה
 * עברית. reset() מנסה לרנדר מחדש את מה שנפל; זו לא הבטחה, ולכן יש גם
 * דרך הביתה.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div dir="rtl" style={{
      minHeight: "100vh", background: "#F4F3FB", color: "#1B1830",
      fontFamily: "Rubik, Assistant, Heebo, system-ui, sans-serif",
      display: "grid", placeItems: "center", padding: 24,
    }}>
      <div style={{ width: "100%", maxWidth: 460, background: "#FFFFFF", borderRadius: 22, padding: "36px 30px", textAlign: "center", boxShadow: "0 18px 50px -28px rgba(60,50,120,.45)" }}>
        <div style={{ fontSize: 40, marginBottom: 10 }} aria-hidden>🫧</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 8px" }}>משהו השתבש</h1>
        <p style={{ fontSize: 14, color: "#7C7A93", margin: "0 0 22px", lineHeight: 1.75 }}>
          לא הצלחנו להציג את המסך הזה. הנתונים שלכם ב-Monday לא נפגעו — זו תקלה בהצגה בלבד.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={reset}
            style={{ background: "linear-gradient(135deg,#6C4CF1,#FF2D87)", color: "#fff", border: "none", borderRadius: 13, padding: "12px 26px", fontSize: 14.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
          >
            לנסות שוב
          </button>
          <Link
            href="/"
            style={{ display: "inline-block", borderRadius: 13, padding: "12px 26px", fontSize: 14.5, fontWeight: 700, color: "#1B1830", border: "1px solid #E6E4F0", textDecoration: "none", fontFamily: "inherit" }}
          >
            לעמוד הבית
          </Link>
        </div>
        {error?.digest && (
          <p style={{ fontSize: 11, color: "#A9A7BE", marginTop: 18, fontVariantNumeric: "tabular-nums" }}>
            קוד תקלה: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
