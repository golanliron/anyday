import type { HealthFinding, ActionItem } from "@/types/health";

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

export function buildActionPlan(findings: HealthFinding[]): ActionItem[] {
  const withAction = findings.filter(
    (f) => f.recommendedAction || f.suggestion
  );

  const sorted = [...withAction].sort((a, b) => {
    const sevDiff =
      (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3);
    if (sevDiff !== 0) return sevDiff;
    return (b.affectedItems ?? 0) - (a.affectedItems ?? 0);
  });

  return sorted.slice(0, 5).map((finding, i) => ({
    priority: i + 1,
    finding,
    actionText: finding.recommendedAction || finding.suggestion,
    boardName: finding.boardName,
  }));
}
