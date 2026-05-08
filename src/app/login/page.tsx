"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#0035FF", fontFamily: "'Space Grotesk', 'Rubik', sans-serif",
      padding: 24, position: "relative", overflow: "hidden",
    }}>
      {/* Background blobs */}
      <div style={{
        position: "absolute", width: 300, height: 300, borderRadius: "50%",
        background: "#FFEF00", opacity: 0.08, top: -80, right: -60,
        filter: "blur(80px)",
      }} />
      <div style={{
        position: "absolute", width: 200, height: 200, borderRadius: "50%",
        background: "#FFEF00", opacity: 0.06, bottom: -40, left: -40,
        filter: "blur(60px)",
      }} />

      <div style={{ maxWidth: 420, width: "100%", textAlign: "center", position: "relative", zIndex: 1 }}>
        {/* Logo */}
        <div style={{
          width: 64, height: 64, borderRadius: 50,
          background: "#FFEF00",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 24px", fontSize: 28, color: "#0035FF", fontWeight: 900,
          boxShadow: "0 0 30px rgba(255,239,0,0.3)",
        }}>A</div>

        <h1 style={{
          fontSize: 36, fontWeight: 900, color: "#FFEF00", marginBottom: 8, letterSpacing: "-0.02em",
        }}>
          AnyDay
        </h1>

        <p style={{
          fontSize: 16, color: "rgba(255,255,255,0.7)", marginBottom: 40, lineHeight: 1.6,
        }}>
          {"\u05E9\u05DB\u05D1\u05EA \u05E0\u05D9\u05D4\u05D5\u05DC \u05D7\u05DB\u05DE\u05D4 \u05DE\u05E2\u05DC \u05D4\u05D8\u05D1\u05DC\u05D0\u05D5\u05EA \u05E9\u05DC\u05DB\u05DD"}
        </p>

        {/* Login Card */}
        <div style={{
          background: "#FFFFFF", borderRadius: 24, padding: "36px 32px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}>
          <h2 style={{
            fontSize: 20, fontWeight: 700, color: "#0035FF", marginBottom: 8,
          }}>{"\u05D4\u05EA\u05D7\u05D1\u05E8\u05D5\u05EA"}</h2>
          <p style={{
            fontSize: 14, color: "rgba(0,53,255,0.5)", marginBottom: 28,
          }}>{"\u05D4\u05D9\u05DB\u05E0\u05E1\u05D5 \u05E2\u05DD \u05D7\u05E9\u05D1\u05D5\u05DF Google \u05DB\u05D3\u05D9 \u05DC\u05D4\u05EA\u05D7\u05D9\u05DC"}</p>

          <button
            onClick={() => signIn("google", { callbackUrl })}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
              background: "#FFFFFF", border: "2px solid rgba(0,53,255,0.15)",
              borderRadius: 50, padding: "14px 24px", fontSize: 16, fontWeight: 600,
              color: "#0035FF", cursor: "pointer", transition: "all 0.2s",
              fontFamily: "'Space Grotesk', 'Rubik', sans-serif",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = "#0035FF";
              e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,53,255,0.15)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "rgba(0,53,255,0.15)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {"\u05D4\u05EA\u05D7\u05D1\u05E8\u05D5\u05EA \u05E2\u05DD Google"}
          </button>

          <div style={{
            marginTop: 20, display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{ flex: 1, height: 1, background: "rgba(0,53,255,0.1)" }} />
            <span style={{ fontSize: 12, color: "rgba(0,53,255,0.35)" }}>{"\u05D0\u05D5"}</span>
            <div style={{ flex: 1, height: 1, background: "rgba(0,53,255,0.1)" }} />
          </div>

          <button
            onClick={() => window.location.href = "/"}
            style={{
              width: "100%", marginTop: 20,
              background: "rgba(0,53,255,0.06)", border: "none",
              borderRadius: 50, padding: "14px 24px", fontSize: 14, fontWeight: 600,
              color: "#0035FF", cursor: "pointer", transition: "all 0.2s",
              fontFamily: "'Space Grotesk', 'Rubik', sans-serif",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(0,53,255,0.12)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(0,53,255,0.06)"}
          >
            {"\u05D4\u05DE\u05E9\u05DA \u05D1\u05DC\u05D9 \u05D4\u05EA\u05D7\u05D1\u05E8\u05D5\u05EA"}
          </button>
        </div>

        <p style={{
          fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 24,
        }}>
          {"\u05D1\u05D4\u05EA\u05D7\u05D1\u05E8\u05D5\u05EA \u05D0\u05EA\u05DD \u05DE\u05E1\u05DB\u05D9\u05DE\u05D9\u05DD \u05DC\u05EA\u05E0\u05D0\u05D9 \u05D4\u05E9\u05D9\u05DE\u05D5\u05E9 \u05D5\u05DE\u05D3\u05D9\u05E0\u05D9\u05D5\u05EA \u05D4\u05E4\u05E8\u05D8\u05D9\u05D5\u05EA"}
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0035FF", color: "#fff" }}>{"\u05D8\u05D5\u05E2\u05DF..."}</div>}>
      <LoginContent />
    </Suspense>
  );
}
