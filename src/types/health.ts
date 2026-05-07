// Health Check types for AnyDay

export type FindingSeverity = "critical" | "warning" | "info";

export type FindingCategory =
  | "structure"     // מבנה בורדים: עמודות חסרות, שמות לא ברורים
  | "data"          // איכות נתונים: שדות ריקים, כפילויות
  | "workflow"      // תהליכי עבודה: משימות באיחור, סטטוסים תקועים
  | "permissions";  // הרשאות ואחראים: פריטים בלי אחראי

export type FindingConfidence = "high" | "medium" | "low";

export interface HealthFinding {
  id: string;
  category: FindingCategory;
  severity: FindingSeverity;
  title: string;
  description: string;
  boardId?: string;
  boardName?: string;
  affectedItems?: number;
  suggestion: string;
  // Enriched fields (optional, backward-compatible)
  summary?: string;
  whyItMatters?: string;
  recommendedAction?: string;
  confidence?: FindingConfidence;
  canBeFixedAutomatically?: boolean;
}

export interface HealthCheckResult {
  score: number;              // 0-100
  scannedAt: string;          // ISO timestamp
  boardsScanned: number;
  totalItems: number;
  findings: HealthFinding[];
  summary: {
    critical: number;
    warning: number;
    info: number;
  };
}

// Action plan types

export interface ActionItem {
  priority: number;
  finding: HealthFinding;
  actionText: string;
  boardName?: string;
}

// Organization & multi-tenant types (for future use)

export type UserRole = "admin" | "member" | "viewer";

export type OrgPlan = "free" | "trial" | "starter" | "pro" | "enterprise";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: OrgPlan;
  mondayAccountId?: string;
  createdAt: string;
}

export interface OrgUser {
  id: string;
  orgId: string;
  userId: string;
  role: UserRole;
  invitedAt: string;
}
