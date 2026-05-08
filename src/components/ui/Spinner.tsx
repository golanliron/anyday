"use client";

export function Spinner({
  size = 18,
  color = "#0035FF",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        border: `2px solid ${color}30`,
        borderTop: `2px solid ${color}`,
        borderRadius: "50%",
        animation: "spin .65s linear infinite",
      }}
    />
  );
}
