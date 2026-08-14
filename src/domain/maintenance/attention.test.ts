import { describe, expect, it } from "vitest";
import { attentionRank, needsAttention } from "./attention";
import type { MaintenanceScheduleStatus } from "./types";

/**
 * The client opened the Isuzu Truck and found five maintenance items sitting
 * under a heading that says "Needs attention", each badged `Disabled` and
 * captioned "Disabled schedule does not generate alerts." — a card asking them
 * to act on things it also told them were inert. Worse, nothing on that card
 * could be acted on: they were reminders removed back in July, and a removed
 * reminder has no row on the Maintenance tab to press a button on.
 *
 * The cause was that the card picked rows by what they were *not*
 * (`dueStatus !== "not_due"`), so every status nobody had thought about —
 * `disabled` among them — counted as urgent. These tests pin the opposite
 * rule: a status earns a place on that card by being named, not by failing to
 * be excluded.
 */
describe("needsAttention", () => {
  it("includes the four statuses that actually want somebody", () => {
    expect(needsAttention("overdue")).toBe(true);
    expect(needsAttention("due_today")).toBe(true);
    expect(needsAttention("due_soon")).toBe(true);
    expect(needsAttention("needs_setup")).toBe(true);
  });

  it("leaves out a removed reminder, which is what `disabled` means here", () => {
    expect(needsAttention("disabled")).toBe(false);
  });

  it("leaves out an item that is simply fine", () => {
    expect(needsAttention("not_due")).toBe(false);
  });

  it("stays quiet about statuses it was never told about", () => {
    // `upcoming` is the column default a row is born with, and the importer
    // writes rows without ever passing them through evaluate_due_status. The
    // rest are in the TypeScript union but not in the database constraint.
    for (const status of ["upcoming", "completed", "skipped", "not_applicable"]) {
      expect(needsAttention(status as MaintenanceScheduleStatus)).toBe(false);
    }

    expect(needsAttention("something_added_later" as MaintenanceScheduleStatus)).toBe(false);
    expect(needsAttention(undefined)).toBe(false);
  });
});

describe("attentionRank", () => {
  it("puts the worst first, so the top of the card is the thing to do next", () => {
    const shuffled: MaintenanceScheduleStatus[] = [
      "needs_setup",
      "due_soon",
      "overdue",
      "due_today",
    ];

    expect([...shuffled].sort((a, b) => attentionRank(a) - attentionRank(b))).toEqual([
      "overdue",
      "due_today",
      "due_soon",
      "needs_setup",
    ]);
  });

  it("sorts anything unranked to the bottom rather than the top", () => {
    expect(attentionRank("disabled")).toBeGreaterThan(attentionRank("needs_setup"));
    expect(attentionRank(undefined)).toBeGreaterThan(attentionRank("needs_setup"));
  });
});
