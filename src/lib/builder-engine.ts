import type { SystemType, OrgType, BuilderBlueprint } from "@/types/builder";
import { TEMPLATES } from "./builder-templates";

export function generateBlueprint(
  systemType: SystemType,
  orgType: OrgType,
  userDescription: string
): BuilderBlueprint {
  // Find matching template
  const template =
    TEMPLATES.find((t) => t.templateId === systemType) ||
    TEMPLATES.find((t) => t.templateId === "projects")!; // fallback

  return {
    id: crypto.randomUUID(),
    templateId: template.templateId,
    systemName: template.templateName,
    description: template.description,
    userDescription,
    orgType,
    source: "template",
    status: "draft",
    boards: template.boards,
    createdAt: new Date().toISOString(),
  };
}
