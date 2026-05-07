import type { ActionItem } from "@/types/health";

interface HealthActionPlanProps {
  actions: ActionItem[];
}

const PRIORITY_COLORS = [
  "var(--color-red)",
  "var(--color-red)",
  "#B8860B",
  "var(--color-blue)",
  "var(--color-blue)",
];

export function HealthActionPlan({ actions }: HealthActionPlanProps) {
  if (actions.length === 0) return null;

  return (
    <div className="fade-up-2" style={{
      background: "var(--color-surf)",
      borderRadius: 16,
      border: "1px solid var(--color-border)",
      padding: "24px 28px",
      marginBottom: 20,
    }}>
      <h3 style={{ fontSize: 18, fontWeight: 700, marginTop: 0, marginBottom: 16 }}>
        {"\u{1F3AF}"} מה לעשות קודם
      </h3>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {actions.map((action) => (
          <div
            key={action.finding.id}
            style={{
              display: "flex",
              gap: 14,
              alignItems: "flex-start",
              padding: "14px 16px",
              borderRadius: 12,
              background: "var(--color-surf2)",
              border: "1px solid var(--color-border)",
            }}
          >
            {/* Priority number */}
            <div style={{
              minWidth: 32,
              height: 32,
              borderRadius: 10,
              background: PRIORITY_COLORS[action.priority - 1] || "var(--color-muted)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 15,
              fontWeight: 800,
              flexShrink: 0,
            }}>
              {action.priority}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 15,
                fontWeight: 600,
                color: "var(--color-text)",
                marginBottom: 4,
              }}>
                {action.finding.title}
              </div>

              {action.boardName && (
                <div style={{
                  fontSize: 12,
                  color: "var(--color-muted)",
                  marginBottom: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}>
                  {"\uD83D\uDCCB"} {action.boardName}
                </div>
              )}

              <div style={{
                fontSize: 13,
                color: "var(--color-text2)",
                lineHeight: 1.6,
              }}>
                {action.actionText}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
