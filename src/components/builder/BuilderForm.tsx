"use client";

import { useState } from "react";
import type { SystemType, OrgType } from "@/types/builder";
import { SYSTEM_TYPE_LABELS, ORG_TYPE_LABELS, TEMPLATES } from "@/lib/builder-templates";

interface BuilderFormProps {
  onGenerate: (systemType: SystemType, orgType: OrgType, description: string) => void;
}

export function BuilderForm({ onGenerate }: BuilderFormProps) {
  const [systemType, setSystemType] = useState<SystemType | "">("");
  const [orgType, setOrgType] = useState<OrgType>("nonprofit");
  const [description, setDescription] = useState("");

  function handleSubmit() {
    if (!systemType) return;
    onGenerate(systemType, orgType, description);
  }

  // Show which org types are recommended for the selected system
  const selectedTemplate = systemType
    ? TEMPLATES.find((t) => t.templateId === systemType)
    : null;

  return (
    <div style={{
      background: "var(--color-surf)",
      borderRadius: 16,
      border: "1px solid var(--color-border)",
      padding: 32,
    }}>
      <h3 style={{ fontSize: 18, fontWeight: 700, marginTop: 0, marginBottom: 8 }}>
        ספרו לנו מה אתם צריכים
      </h3>
      <p style={{ color: "var(--color-muted)", fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
        בחרו את סוג המערכת ונבנה לכם מבנה Monday מומלץ — עם בורדים, עמודות, אוטומציות ודוחות.
      </p>

      {/* System type */}
      <label style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)", display: "block", marginBottom: 6 }}>
        איזו מערכת תרצו לבנות?
      </label>
      <select
        value={systemType}
        onChange={(e) => setSystemType(e.target.value as SystemType)}
        style={{
          width: "100%",
          padding: "12px 16px",
          borderRadius: 10,
          border: "1px solid var(--color-border)",
          background: "var(--color-bg)",
          fontSize: 15,
          fontFamily: "var(--font-dm)",
          marginBottom: 20,
          outline: "none",
          appearance: "auto",
          direction: "rtl",
        }}
      >
        <option value="">בחרו סוג מערכת...</option>
        {Object.entries(SYSTEM_TYPE_LABELS).map(([key, label]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>

      {/* Template info */}
      {selectedTemplate && (
        <div style={{
          background: "var(--color-accent-light)",
          borderRadius: 10,
          padding: "10px 14px",
          marginBottom: 20,
          fontSize: 13,
          color: "var(--color-accent)",
          lineHeight: 1.6,
        }}>
          {selectedTemplate.description}
        </div>
      )}

      {/* Org type */}
      <label style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)", display: "block", marginBottom: 6 }}>
        סוג הארגון שלכם
      </label>
      <select
        value={orgType}
        onChange={(e) => setOrgType(e.target.value as OrgType)}
        style={{
          width: "100%",
          padding: "12px 16px",
          borderRadius: 10,
          border: "1px solid var(--color-border)",
          background: "var(--color-bg)",
          fontSize: 15,
          fontFamily: "var(--font-dm)",
          marginBottom: 20,
          outline: "none",
          appearance: "auto",
          direction: "rtl",
        }}
      >
        {Object.entries(ORG_TYPE_LABELS).map(([key, label]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>

      {/* Free text */}
      <label style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text)", display: "block", marginBottom: 6 }}>
        תארו בקצרה את הצורך (אופציונלי)
      </label>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="למשל: אנחנו עמותה עם 200 בוגרים, 3 רכזות, ואנחנו צריכים לדווח לקרן כל רבעון..."
        rows={3}
        style={{
          width: "100%",
          padding: "12px 16px",
          borderRadius: 10,
          border: "1px solid var(--color-border)",
          background: "var(--color-bg)",
          fontSize: 14,
          fontFamily: "var(--font-dm)",
          marginBottom: 24,
          outline: "none",
          resize: "vertical",
          lineHeight: 1.6,
          direction: "rtl",
        }}
      />

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!systemType}
        style={{
          width: "100%",
          padding: "14px 28px",
          borderRadius: 10,
          border: "none",
          background: systemType ? "var(--color-accent)" : "var(--color-border)",
          color: systemType ? "#fff" : "var(--color-muted)",
          fontSize: 16,
          fontWeight: 700,
          cursor: systemType ? "pointer" : "not-allowed",
          fontFamily: "var(--font-dm)",
          transition: "all 0.2s",
        }}
      >
        בנו לי מבנה Monday
      </button>
    </div>
  );
}
