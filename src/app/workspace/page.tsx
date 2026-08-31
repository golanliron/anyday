import { redirect } from "next/navigation";

/**
 * The old workspace screen is gone — every capability it had now lives in the
 * shared roof (/app). The file itself stays so that existing links, bookmarks
 * and old emails do not fall to a 404; it only forwards.
 *
 * Target: /app?mode=act — "act" mode is the direct equivalent of what this
 * screen was (chat commands, bulk edit, automations, reports, board builder).
 * Server-side redirect: no flash of an empty client screen, no extra roundtrip.
 */
export default function WorkspacePage() {
  redirect("/app?mode=act");
}
