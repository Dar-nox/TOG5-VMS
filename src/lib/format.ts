/**
 * Every number, date and unit the interface shows.
 *
 * Before this existed, `formatMoney` was written six times, `formatDate` five
 * times and `formatOdometer` five times, each slightly differently. The same
 * date rendered as `2026-08-05` on Expenses, `08/05/2026` on the Dashboard and
 * `Aug 5, 2026` on Vehicles — and the `dateDisplayPreference` setting, which
 * exists in the database and in Settings, was read by nothing at all.
 *
 * These are pure functions over an explicit preferences object so that report
 * and CSV generation, which run outside React, format identically to the
 * screens. Components get them bound to the current settings via `useFormat`.
 */

export type DateDisplayFormat = "yyyy_mm_dd" | "dd_mm_yyyy" | "mm_dd_yyyy";

export type DisplayPreferences = {
  currency: string;
  dateFormat: DateDisplayFormat;
  distanceUnit: string;
  efficiencyUnit: string;
};

export const defaultPreferences: DisplayPreferences = {
  currency: "PHP",
  dateFormat: "yyyy_mm_dd",
  distanceUnit: "km",
  efficiencyUnit: "km_per_liter",
};

/**
 * Shown wherever a value is genuinely absent. One character, unmistakably not
 * a number, and not the `--` / `No date` / `just now` / `-- km/L` assortment
 * that was in use.
 */
export const ABSENT = "—";

/**
 * Number formatting is pinned to one locale rather than the browser's.
 *
 * Half the old copies passed `undefined`, which lets the device decide how to
 * group digits and where to put the currency symbol — so the same record read
 * differently on a phone set to one region and a desktop set to another. The
 * client is Philippine; this is their locale.
 */
const LOCALE = "en-PH";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const KM_PER_MILE = 1.609344;

type DateParts = { year: string; month: string; day: string };

/**
 * Splits a value into calendar parts *without* moving it between timezones.
 *
 * This distinction is the reason this function exists. A `date` column arrives
 * as `2026-08-05` and means that day, everywhere. Passing it to `new Date()`
 * parses it as UTC midnight and then renders it in the viewer's zone, which
 * west of Greenwich shows the day before. A `timestamptz` is the opposite: it
 * is an instant, and must be converted to local time to read correctly.
 */
function partsOf(value: string): DateParts | undefined {
  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  if (DATE_ONLY.test(trimmed)) {
    const [year, month, day] = trimmed.split("-");
    return { year, month, day };
  }

  const parsed = new Date(trimmed);

  if (Number.isNaN(parsed.getTime())) {
    // Not something we recognise. The caller shows it unchanged rather than
    // inventing a date.
    return undefined;
  }

  return {
    year: String(parsed.getFullYear()),
    month: String(parsed.getMonth() + 1).padStart(2, "0"),
    day: String(parsed.getDate()).padStart(2, "0"),
  };
}

function applyDateFormat(parts: DateParts, format: DateDisplayFormat): string {
  switch (format) {
    case "dd_mm_yyyy":
      return `${parts.day}/${parts.month}/${parts.year}`;
    case "mm_dd_yyyy":
      return `${parts.month}/${parts.day}/${parts.year}`;
    case "yyyy_mm_dd":
    default:
      return `${parts.year}-${parts.month}-${parts.day}`;
  }
}

function timeOf(value: string): string | undefined {
  if (DATE_ONLY.test(value.trim())) {
    return undefined;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  const hours = String(parsed.getHours()).padStart(2, "0");
  const minutes = String(parsed.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function createFormatters(preferences: DisplayPreferences = defaultPreferences) {
  const money = new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: preferences.currency || "PHP",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });

  const wholeNumber = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });

  const decimal = new Intl.NumberFormat(LOCALE, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });

  const usesMiles = preferences.distanceUnit === "mi";
  const distanceLabel = usesMiles ? "mi" : "km";

  /** Odometer and distances are stored in kilometres whatever the display. */
  function toDisplayDistance(km: number): number {
    return usesMiles ? km / KM_PER_MILE : km;
  }

  return {
    preferences,
    distanceLabel,

    /** `₱1,234.50`. Always two decimals, so amounts line up in a column. */
    money(value?: number | null): string {
      return value == null ? ABSENT : money.format(value);
    },

    /** The bare number for a form field — no symbol, no grouping. */
    moneyInput(value?: number | null): string {
      return value == null ? "" : value.toFixed(2);
    },

    /** `1,234 km`. */
    distance(value?: number | null): string {
      if (value == null) {
        return ABSENT;
      }

      return `${wholeNumber.format(Math.round(toDisplayDistance(value)))} ${distanceLabel}`;
    },

    /** The same number without its unit, for tables that label the column. */
    distanceValue(value?: number | null): string {
      return value == null ? ABSENT : wholeNumber.format(Math.round(toDisplayDistance(value)));
    },

    /**
     * `45,120 → 45,380 km`. The pair of readings a distance was worked out
     * from.
     *
     * One figure rather than two, because it fits a phone: a trip row already
     * carries six labelled values, and on a 360px screen the meta grid is two
     * columns wide. It also says which reading is missing — `45,120 → —` — where
     * a bare distance can only show `—` and leave you guessing whether anyone
     * wrote down the reading at the start, the end, or neither.
     */
    odometerRange(from?: number | null, to?: number | null): string {
      if (from == null && to == null) {
        return ABSENT;
      }

      const start = from == null ? ABSENT : wholeNumber.format(Math.round(toDisplayDistance(from)));
      const end = to == null ? ABSENT : wholeNumber.format(Math.round(toDisplayDistance(to)));

      return `${start} → ${end} ${distanceLabel}`;
    },

    /** `45.50 L`. Fuel is recorded to three decimals but read to two. */
    volume(value?: number | null): string {
      return value == null ? ABSENT : `${decimal.format(value)} L`;
    },

    /**
     * `12.30 km/L`, or `8.13 L/100km` if that is the chosen unit.
     *
     * Stored as km/L either way, so the alternative is a conversion rather
     * than a relabelling — a value of 0 has no equivalent and stays absent.
     */
    efficiency(value?: number | null): string {
      if (value == null) {
        return ABSENT;
      }

      if (preferences.efficiencyUnit === "liters_per_100km") {
        return value === 0 ? ABSENT : `${decimal.format(100 / value)} L/100km`;
      }

      return `${decimal.format(value)} km/L`;
    },

    /** `₱4.20 / km`. */
    costPerDistance(value?: number | null): string {
      if (value == null) {
        return ABSENT;
      }

      return `${money.format(usesMiles ? value * KM_PER_MILE : value)} / ${distanceLabel}`;
    },

    /** Honours the date preference from Settings. */
    date(value?: string | null): string {
      if (!value) {
        return ABSENT;
      }

      const parts = partsOf(value);
      return parts ? applyDateFormat(parts, preferences.dateFormat) : value;
    },

    /** The same, with a 24-hour clock appended when the value carries a time. */
    dateTime(value?: string | null): string {
      if (!value) {
        return ABSENT;
      }

      const parts = partsOf(value);

      if (!parts) {
        return value;
      }

      const time = timeOf(value);
      const day = applyDateFormat(parts, preferences.dateFormat);
      return time ? `${day} ${time}` : day;
    },

    /** `2026-08-05`, for a `<input type="date">` whatever the display format. */
    dateInput(value?: string | null): string {
      if (!value) {
        return "";
      }

      const parts = partsOf(value);
      return parts ? `${parts.year}-${parts.month}-${parts.day}` : "";
    },
  };
}

export type Formatters = ReturnType<typeof createFormatters>;
