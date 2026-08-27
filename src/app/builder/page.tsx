"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { SystemType, OrgType, BuilderBlueprint } from "@/types/builder";
import { generateBlueprint } from "@/lib/builder-engine";
import { BuilderForm } from "@/components/builder/BuilderForm";
import { BlueprintView } from "@/components/builder/BlueprintView";
import { getMondayStatus, disconnectMonday } from "@/lib/api-client";

export default function BuilderPage() {
  const [blueprint, setBlueprint] = useState<BuilderBlueprint | null>(null);
  const [connected, setConnected] = useState(false);

  // Connection is a server-side fact — ask the API, clean any OAuth flag.
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("monday") || params.get("monday_error")) {
        window.history.replaceState({}, "", window.location.pathname);
      }
    } catch {}
    getMondayStatus().then((s) => setConnected(s.connected)).catch(() => {});
  }, []);

  function handleGenerate(systemType: SystemType, orgType: OrgType, description: string) {
    const bp = generateBlueprint(systemType, orgType, description);
    setBlueprint(bp);
  }

  function handleReset() {
    setBlueprint(null);
  }

  async function handleDisconnect() {
    await disconnectMonday();
    setConnected(false);
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--color-bg)",
      color: "var(--color-text)",
      direction: "rtl",
      fontFamily: "var(--font-dm)",
    }}>
      <style>{`
        @media (max-width: 600px) {
          .builder-main { padding: 20px 14px !important; }
          .builder-card { padding: 20px 16px !important; }
          .builder-header { padding: 14px 16px !important; gap: 8px !important; }
        }
      `}</style>

      {/* Header */}
      <header className="builder-header" style={{
        padding: "20px 24px",
        borderBottom: "1px solid var(--color-border)",
        background: "var(--color-surf)",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}>
        <Link href="/" style={{
          fontSize: 13,
          color: "var(--color-accent)",
          textDecoration: "none",
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: 4,
          marginLeft: 8,
          whiteSpace: "nowrap",
        }}>
          {"\u2190 \u05D7\u05D6\u05E8\u05D4"}
        </Link>
        <div style={{ width: 1, height: 24, background: "var(--color-border)", flexShrink: 0 }} />
        <span style={{ fontSize: 28 }}>{"\uD83C\uDFD7\uFE0F"}</span>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Monday Builder</h1>
          <p style={{ fontSize: 13, color: "var(--color-muted)", margin: 0 }}>by AnyDay</p>
        </div>
        {/* Connected indicator */}
        {connected && (
          <div style={{ marginRight: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              fontSize: 12, fontWeight: 600, color: "var(--color-green)",
              background: "var(--color-green-light)", padding: "4px 10px", borderRadius: 8,
            }}>
              {"\u2705 \u05DE\u05D7\u05D5\u05D1\u05E8 \u05DC-Monday"}
            </span>
            <button onClick={handleDisconnect} style={{
              fontSize: 11, color: "var(--color-muted)", background: "none",
              border: "none", cursor: "pointer", textDecoration: "underline",
              fontFamily: "var(--font-dm)",
            }}>
              {"\u05E0\u05EA\u05E7"}
            </button>
          </div>
        )}
      </header>

      <main className="builder-main" style={{ maxWidth: 760, margin: "0 auto", padding: "32px 20px" }}>

        {/* Form (shown when no blueprint) */}
        {!blueprint && (
          <>
            {/* Intro */}
            <div className="fade-up" style={{
              textAlign: "center",
              marginBottom: 20,
              padding: "0 8px",
            }}>
              <h2 style={{ fontSize: 26, fontWeight: 800, marginTop: 0, marginBottom: 10, color: "var(--color-text)" }}>
                {"\u05D1\u05E0\u05D5 \u05DE\u05E2\u05E8\u05DB\u05EA Monday \u05D7\u05DB\u05DE\u05D4 \u05D1\u05D3\u05E7\u05D5\u05EA"}
              </h2>
              <p style={{ color: "var(--color-muted)", fontSize: 15, lineHeight: 1.7, maxWidth: 520, margin: "0 auto 8px" }}>
                {"\u05E1\u05E4\u05E8\u05D5 \u05DC\u05E0\u05D5 \u05DE\u05D4 \u05D0\u05EA\u05DD \u05E6\u05E8\u05D9\u05DB\u05D9\u05DD \u05DC\u05E0\u05D4\u05DC \u05D5\u05E0\u05D1\u05E0\u05D4 \u05DC\u05DB\u05DD \u05DE\u05D1\u05E0\u05D4 \u05DE\u05D5\u05DE\u05DC\u05E5 \u2014 \u05E2\u05DD \u05D1\u05D5\u05E8\u05D3\u05D9\u05DD, \u05E2\u05DE\u05D5\u05D3\u05D5\u05EA, \u05D0\u05D5\u05D8\u05D5\u05DE\u05E6\u05D9\u05D5\u05EA \u05D5\u05D3\u05D5\u05D7\u05D5\u05EA."}
              </p>
              <div style={{
                display: "flex",
                justifyContent: "center",
                gap: 20,
                flexWrap: "wrap",
                fontSize: 13,
                color: "var(--color-accent)",
                fontWeight: 600,
                marginTop: 12,
              }}>
                <span>{"\u2705 5 \u05EA\u05D1\u05E0\u05D9\u05D5\u05EA \u05DE\u05D5\u05DB\u05E0\u05D5\u05EA"}</span>
                <span>{"\uD83C\uDFAF \u05DE\u05D5\u05EA\u05D0\u05DD \u05DC\u05E2\u05DE\u05D5\u05EA\u05D5\u05EA \u05D5\u05D0\u05E8\u05D2\u05D5\u05E0\u05D9\u05DD"}</span>
                <span>{"\u26A1 \u05EA\u05D5\u05DA 10 \u05E9\u05E0\u05D9\u05D5\u05EA"}</span>
              </div>
            </div>

            <div className="fade-up-2 builder-card">
              <BuilderForm onGenerate={handleGenerate} />
            </div>
          </>
        )}

        {/* Blueprint result */}
        {blueprint && (
          <BlueprintView
            blueprint={blueprint}
            onReset={handleReset}
            connected={connected}
          />
        )}
      </main>
    </div>
  );
}
