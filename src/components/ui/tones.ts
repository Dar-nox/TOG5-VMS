import type { BadgeTone } from "./Badge";

/**
 * Maps what the database stores onto the five meanings specs/05 defines.
 *
 * Kept in one place so a screen never invents its own mapping. The dashboard
 * used to route alert priorities through the *vehicle status* classes, so
 * `critical` was drawn in the archived style and `due_soon` in the
 * under-maintenance style.
 */
export function toneForDueStatus(status?: string | null): BadgeTone {
  switch (status) {
    case "overdue":
      return "overdue";
    case "due_today":
    case "due_soon":
      return "due";
    case "not_due":
      return "ok";
    case "needs_setup":
      return "info";
    default:
      return "neutral";
  }
}

export function toneForPriority(priority?: string | null): BadgeTone {
  switch (priority) {
    case "critical":
      return "overdue";
    case "high":
      return "due";
    case "medium":
      return "info";
    default:
      return "neutral";
  }
}

export function toneForVehicleStatus(status?: string | null): BadgeTone {
  switch (status) {
    case "active":
      return "ok";
    case "under_maintenance":
      return "due";
    case "archived":
    case "inactive":
      return "archived";
    default:
      return "neutral";
  }
}
