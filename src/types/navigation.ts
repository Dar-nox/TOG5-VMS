import type { ComponentType } from "react";
import {
  AlertsIcon,
  DashboardIcon,
  ReportsIcon,
  SettingsIcon,
  VehiclesIcon,
} from "../components/ui/icons";

/**
 * Where you can go.
 *
 * Five places, down from eleven. Fuel, trips, maintenance, service history,
 * expenses and documents are not destinations — they are things that are true
 * about a vehicle, and they live inside one. That is what specs/05 asked for
 * and what was never built, and it is the difference between starting a task
 * with "which van?" and starting it by filtering a fleet-wide table down to
 * one.
 *
 * The eleven `description` strings are gone with them. They were rendered
 * under the page title on every screen, above a second title and a second
 * description supplied by the module — so every screen introduced itself
 * twice before showing anything. Two of them had also stopped being true:
 * backup was still described as "Local", and Settings offered "future user
 * access" to an app that has had users for months.
 */

export type NavigationItem = {
  path: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** Matches child routes too, so a vehicle's page keeps Vehicles lit. */
  matchPrefix?: boolean;
};

export const navigationItems: NavigationItem[] = [
  { path: "/", label: "Dashboard", icon: DashboardIcon },
  { path: "/vehicles", label: "Vehicles", icon: VehiclesIcon, matchPrefix: true },
  { path: "/alerts", label: "Alerts", icon: AlertsIcon },
  { path: "/reports", label: "Reports", icon: ReportsIcon },
  { path: "/settings", label: "Settings", icon: SettingsIcon },
];

export function isActivePath(item: NavigationItem, pathname: string): boolean {
  if (item.matchPrefix) {
    return pathname === item.path || pathname.startsWith(`${item.path}/`);
  }

  return pathname === item.path;
}
