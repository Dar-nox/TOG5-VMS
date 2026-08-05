import { afterEach, describe, expect, it } from "vitest";
import { ABSENT, createFormatters, defaultPreferences } from "./format";

const fmt = createFormatters();

describe("money", () => {
  it("uses the peso sign and always two decimals so columns line up", () => {
    expect(fmt.money(1234.5)).toBe("₱1,234.50");
    expect(fmt.money(0)).toBe("₱0.00");
  });

  it("does not invent a value when there is none", () => {
    expect(fmt.money(null)).toBe(ABSENT);
    expect(fmt.money(undefined)).toBe(ABSENT);
  });

  it("formats a form field as a bare number", () => {
    expect(fmt.moneyInput(1234.5)).toBe("1234.50");
    expect(fmt.moneyInput(null)).toBe("");
  });

  it("honours a different currency", () => {
    const usd = createFormatters({ ...defaultPreferences, currency: "USD" });
    expect(usd.money(1234.5)).toContain("1,234.50");
  });
});

describe("dates", () => {
  it("honours each of the three settings, which nothing used to read", () => {
    const iso = createFormatters({ ...defaultPreferences, dateFormat: "yyyy_mm_dd" });
    const day = createFormatters({ ...defaultPreferences, dateFormat: "dd_mm_yyyy" });
    const month = createFormatters({ ...defaultPreferences, dateFormat: "mm_dd_yyyy" });

    expect(iso.date("2026-08-05")).toBe("2026-08-05");
    expect(day.date("2026-08-05")).toBe("05/08/2026");
    expect(month.date("2026-08-05")).toBe("08/05/2026");
  });

  it("returns something honest for an absent or unparseable value", () => {
    expect(fmt.date(null)).toBe(ABSENT);
    expect(fmt.date("")).toBe(ABSENT);
    expect(fmt.date("not a date")).toBe("not a date");
  });

  it("appends a time only when the value carries one", () => {
    expect(fmt.dateTime("2026-08-05")).toBe("2026-08-05");
    expect(fmt.dateTime("2026-08-05T14:30:00+08:00")).toMatch(/^2026-08-05 \d{2}:\d{2}$/);
  });

  it("gives a date input its required ISO shape whatever the display format", () => {
    const month = createFormatters({ ...defaultPreferences, dateFormat: "mm_dd_yyyy" });
    expect(month.date("2026-08-05")).toBe("08/05/2026");
    expect(month.dateInput("2026-08-05")).toBe("2026-08-05");
  });
});

describe("dates across timezones", () => {
  const original = process.env.TZ;

  afterEach(() => {
    process.env.TZ = original;
  });

  /**
   * A `date` column means that calendar day everywhere. Handing it to
   * `new Date()` parses it as UTC midnight and renders it in the local zone,
   * which west of Greenwich shows the day before — the bug this guards.
   */
  it("does not move a date-only value to the previous day", () => {
    process.env.TZ = "America/Los_Angeles";
    expect(createFormatters().date("2026-08-05")).toBe("2026-08-05");

    process.env.TZ = "Pacific/Kiritimati";
    expect(createFormatters().date("2026-08-05")).toBe("2026-08-05");
  });

  it("does convert an instant, because a timestamp is a moment not a day", () => {
    process.env.TZ = "Asia/Manila";
    const manila = createFormatters().dateTime("2026-08-05T20:00:00Z");

    process.env.TZ = "America/Los_Angeles";
    const pacific = createFormatters().dateTime("2026-08-05T20:00:00Z");

    expect(manila).not.toBe(pacific);
  });
});

describe("distance and fuel", () => {
  it("rounds an odometer and labels it", () => {
    expect(fmt.distance(123456.7)).toBe("123,457 km");
    expect(fmt.distanceValue(123456.7)).toBe("123,457");
    expect(fmt.distance(null)).toBe(ABSENT);
  });

  it("converts rather than merely relabelling when set to miles", () => {
    const miles = createFormatters({ ...defaultPreferences, distanceUnit: "mi" });
    expect(miles.distance(100)).toBe("62 mi");
    expect(miles.distanceLabel).toBe("mi");
  });

  it("reads fuel to two decimals", () => {
    expect(fmt.volume(45.5)).toBe("45.50 L");
    expect(fmt.volume(null)).toBe(ABSENT);
  });

  it("converts efficiency to litres per 100 km when asked", () => {
    const per100 = createFormatters({
      ...defaultPreferences,
      efficiencyUnit: "liters_per_100km",
    });

    expect(fmt.efficiency(12.5)).toBe("12.50 km/L");
    expect(per100.efficiency(12.5)).toBe("8.00 L/100km");
  });

  it("has nothing to say about zero efficiency rather than dividing by it", () => {
    const per100 = createFormatters({
      ...defaultPreferences,
      efficiencyUnit: "liters_per_100km",
    });

    expect(per100.efficiency(0)).toBe(ABSENT);
  });

  it("expresses cost per unit of distance in the same unit it labels", () => {
    expect(fmt.costPerDistance(4.2)).toBe("₱4.20 / km");
    expect(fmt.costPerDistance(null)).toBe(ABSENT);
  });
});
