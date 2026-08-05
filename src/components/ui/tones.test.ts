import { describe, expect, it } from "vitest";
import { toneForDueStatus, toneForPriority, toneForVehicleStatus } from "./tones";

/**
 * These mappings decide what colour a status is drawn in, and getting one
 * wrong is invisible in review and wrong on screen. The dashboard used to send
 * alert priorities through the vehicle-status classes, so a `critical` alert
 * was painted in the archived (grey) style.
 */
describe("due status tones", () => {
  it("draws overdue as overdue and due-soon as due", () => {
    expect(toneForDueStatus("overdue")).toBe("overdue");
    expect(toneForDueStatus("due_today")).toBe("due");
    expect(toneForDueStatus("due_soon")).toBe("due");
  });

  it("never draws something that needs attention in the archived style", () => {
    for (const status of ["overdue", "due_today", "due_soon", "needs_setup"]) {
      expect(toneForDueStatus(status)).not.toBe("archived");
      expect(toneForDueStatus(status)).not.toBe("ok");
    }
  });

  it("falls back to neutral rather than guessing", () => {
    expect(toneForDueStatus(undefined)).toBe("neutral");
    expect(toneForDueStatus("something_new")).toBe("neutral");
  });
});

describe("priority tones", () => {
  it("escalates critical to the overdue colour", () => {
    expect(toneForPriority("critical")).toBe("overdue");
    expect(toneForPriority("high")).toBe("due");
  });

  it("does not dress a low priority as a problem", () => {
    expect(toneForPriority("low")).toBe("neutral");
  });
});

describe("vehicle status tones", () => {
  it("separates a working vehicle from one that is put away", () => {
    expect(toneForVehicleStatus("active")).toBe("ok");
    expect(toneForVehicleStatus("under_maintenance")).toBe("due");
    expect(toneForVehicleStatus("archived")).toBe("archived");
  });
});
