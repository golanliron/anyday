// Builder types for AnyDay

export type ColumnType =
  | "text"
  | "status"
  | "people"
  | "date"
  | "timeline"
  | "numbers"
  | "dropdown"
  | "phone"
  | "email"
  | "link"
  | "long_text"
  | "checkbox"
  | "color"
  | "file"
  | "rating"
  | "location";

export type SystemType =
  | "bogrim"        // תוכנית בוגרים
  | "volunteers"    // מתנדבים
  | "inquiries"     // פניות
  | "projects"      // פרויקטים
  | "donors"        // תורמים
  | "scholarships"  // מלגות
  | "clients"       // לקוחות
  | "team_tasks";   // משימות צוות

export type OrgType =
  | "nonprofit"
  | "social_org"
  | "school"
  | "business"
  | "ops_team"
  | "other";

export type BlueprintSource = "template" | "ai";
export type BlueprintStatus = "draft" | "approved" | "building" | "done";

export interface BuilderColumn {
  title: string;
  type: ColumnType;
  description: string;
  required: boolean;
  statusLabels?: string[];  // for status columns
  dropdownOptions?: string[]; // for dropdown columns
}

export interface BuilderGroup {
  title: string;
  description: string;
}

export interface BuilderAutomation {
  trigger: string;
  action: string;
  description: string;
}

export interface BuilderReport {
  title: string;
  description: string;
  type: "dashboard" | "chart" | "table" | "summary";
}

export interface BuilderBoard {
  boardName: string;
  purpose: string;
  groups: BuilderGroup[];
  columns: BuilderColumn[];
  views?: string[];
  automations: BuilderAutomation[];
  reports: BuilderReport[];
}

export interface BuilderTemplate {
  templateId: string;
  templateName: string;
  description: string;
  recommendedFor: OrgType[];
  boards: BuilderBoard[];
}

export interface BuilderBlueprint {
  id: string;
  templateId: string;
  systemName: string;
  description: string;
  userDescription: string;
  orgType: OrgType;
  source: BlueprintSource;
  status: BlueprintStatus;
  boards: BuilderBoard[];
  createdAt: string;
}
