import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  createFormatters,
  defaultPreferences,
  type DateDisplayFormat,
  type DisplayPreferences,
} from "../../lib/format";
import { getAppSettings, type AppSettings } from "../../services/api/settings";
import { FormatContext } from "./formatContext";
import { subscribeToPreferenceChanges } from "./preferenceEvents";

const DATE_FORMATS: DateDisplayFormat[] = ["yyyy_mm_dd", "dd_mm_yyyy", "mm_dd_yyyy"];

function preferencesFrom(settings: AppSettings): DisplayPreferences {
  const dateFormat = DATE_FORMATS.find((format) => format === settings.dateDisplayPreference);

  return {
    currency: settings.preferredCurrency || defaultPreferences.currency,
    // Postgres constrains this column, but the type allows any string, so an
    // unrecognised value falls back rather than producing a broken date.
    dateFormat: dateFormat ?? defaultPreferences.dateFormat,
    distanceUnit: settings.distanceUnit || defaultPreferences.distanceUnit,
    efficiencyUnit: settings.fuelEfficiencyUnit || defaultPreferences.efficiencyUnit,
  };
}

/**
 * Reads the fleet's display settings once and hands every screen the same
 * formatters, so a date cannot render one way on the dashboard and another
 * way three clicks later.
 *
 * Settings are shared by everyone and change rarely, so this loads once. When
 * Settings saves a change it calls `refreshDisplayPreferences` rather than
 * making every screen poll.
 */
export function FormatProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<DisplayPreferences>(defaultPreferences);

  const load = useCallback(async () => {
    try {
      const response = await getAppSettings();
      setPreferences(preferencesFrom(response.settings));
    } catch {
      // Formatting is not worth failing a screen over. The defaults are the
      // fleet's actual settings in every case we know of; if the call failed
      // the rest of the screen is about to show its own error anyway.
    }
  }, []);

  useEffect(() => {
    void load();

    return subscribeToPreferenceChanges(() => void load());
  }, [load]);

  const formatters = useMemo(() => createFormatters(preferences), [preferences]);

  return <FormatContext.Provider value={formatters}>{children}</FormatContext.Provider>;
}
