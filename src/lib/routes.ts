/**
 * Where things live now.
 *
 * Fuel, maintenance, service history, trips and expenses stopped being places
 * you go and became things that are true about a vehicle. Everything that used
 * to link to them has to be translated, including the dashboard, which asks
 * the database where to send you and gets back the old names.
 */

export type VehicleTab =
  | "overview"
  | "fuel"
  | "maintenance"
  | "history"
  | "trips"
  | "expenses"
  | "documents";

export const routes = {
  dashboard: "/",
  vehicles: "/vehicles",
  alerts: "/alerts",
  reports: "/reports",
  settings: "/settings",
  vehicle: (id: string, tab: VehicleTab = "overview") =>
    tab === "overview" ? `/vehicles/${id}` : `/vehicles/${id}/${tab}`,
};

/** The `targetPage` values the dashboard functions return. */
const TAB_FOR_TARGET: Record<string, VehicleTab> = {
  fuel: "fuel",
  maintenance: "maintenance",
  "service-history": "history",
  trips: "trips",
  expenses: "expenses",
};

/**
 * Turns a server-supplied destination into a route.
 *
 * With a vehicle it goes straight to the right tab of the right vehicle, which
 * is a better link than the old one — the old navigation dropped you on a
 * fleet-wide page and left you to filter down. Without one there is nothing
 * more specific to offer than the list, because those rows carry a vehicle
 * name but no id.
 */
export function routeForTargetPage(
  targetPage?: string | null,
  vehicleId?: string | null,
): string | undefined {
  if (!targetPage) {
    return undefined;
  }

  if (targetPage === "vehicles") {
    return vehicleId ? routes.vehicle(vehicleId) : routes.vehicles;
  }

  if (targetPage === "alerts") {
    return routes.alerts;
  }

  if (targetPage === "reports") {
    return routes.reports;
  }

  if (targetPage === "settings" || targetPage === "backup") {
    return routes.settings;
  }

  const tab = TAB_FOR_TARGET[targetPage];

  if (!tab) {
    return undefined;
  }

  return vehicleId ? routes.vehicle(vehicleId, tab) : routes.vehicles;
}
