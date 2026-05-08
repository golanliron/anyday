"use client";

import type { ReactNode, CSSProperties } from "react";

export function GlassCard({
  children,
  style = {},
  glow,
  onClick,
  className = "",
}: {
  children: ReactNode;
  style?: CSSProperties;
  glow?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <div
      onClick={onClick}
      className={className}
      style={{
        background: "var(--color-surf)",
        border: `1px solid ${glow ? "var(--color-accent)" : "var(--color-border)"}`,
        borderRadius: 14,
        padding: 22,
        boxShadow: glow
          ? "0 4px 24px rgba(212,255,43,0.08)"
          : "0 1px 3px rgba(0,0,0,0.04)",
        cursor: onClick ? "pointer" : "default",
        transition: "border-color 0.2s ease, box-shadow 0.2s ease",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
