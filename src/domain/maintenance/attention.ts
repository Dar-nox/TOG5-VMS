import type { MaintenanceScheduleStatus } from "./types";

/**
 * Which maintenance statuses are asking for somebody, worst first.
 *
 * The order is the answer to both questions this file gets asked — whether a
 * schedule belongs on a "needs attention" list at all, and where it sits once
 * it is there — so they cannot drift apart. They previously lived as two
 * separate helpers in `VehicleOverview`, one an allow-list and one a
 * deny-list, and it was the deny-list that was wrong.
 */
const ATTENTION_ORDER = ["overdue", "due_today", "due_soon", "needs_setup"] as const;

/**
 * A schedule earns a place on an attention list by being named here, never by
 * failing to be excluded.
 *
 * The rule used to be `status !== "not_due"`, which meant every status nobody
 * had considered counted as urgent. `disabled` is how the database stores a
 * *removed* reminder, so the client's vehicle overview listed items they had
 * deleted months earlier under a heading telling them to act — and, since a
 * removed reminder has no row on the Maintenance tab, gave them nothing to
 * press. Four vehicles were affected; one of them showed 33 of these against
 * 33 real ones.
 *
 * `upcoming` matters for the same reason: it is the column default a row is
 * born with, and the desktop importer writes rows straight through PostgREST
 * without them ever passing through `evaluate_due_status`.
 */
export function needsAttention(status?: MaintenanceScheduleStatus): boolean {
  return ATTENTION_ORDER.includes(status as (typeof ATTENTION_ORDER)[number]);
}

/** Sort key for {@link ATTENTION_ORDER}; anything unranked sorts to the bottom. */
export function attentionRank(status?: MaintenanceScheduleStatus): number {
  const rank = ATTENTION_ORDER.indexOf(status as (typeof ATTENTION_ORDER)[number]);
  return rank === -1 ? ATTENTION_ORDER.length : rank;
}
