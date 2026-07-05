export type PageId =
  | "dashboard"
  | "vehicles"
  | "fuel"
  | "trips"
  | "maintenance"
  | "service-history"
  | "expenses"
  | "reports"
  | "alerts"
  | "backup"
  | "settings";

export type NavigationItem = {
  id: PageId;
  label: string;
  shortLabel: string;
  description: string;
};

export const navigationItems: NavigationItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    shortLabel: "Home",
    description: "Quick view of fleet health and reminders",
  },
  {
    id: "vehicles",
    label: "Vehicles",
    shortLabel: "Vehicles",
    description: "Vehicle profiles, photos, and setup details",
  },
  {
    id: "fuel",
    label: "Fuel Logs",
    shortLabel: "Fuel",
    description: "Fuel purchases, receipts, odometer readings",
  },
  {
    id: "trips",
    label: "Trips",
    shortLabel: "Trips",
    description: "Vehicle time out, drivers, passengers, and destinations",
  },
  {
    id: "maintenance",
    label: "Maintenance",
    shortLabel: "Maint.",
    description: "Log maintenance and set vehicle reminders",
  },
  {
    id: "service-history",
    label: "Service History",
    shortLabel: "History",
    description: "Completed work, shops, parts, and receipts",
  },
  {
    id: "expenses",
    label: "Expenses",
    shortLabel: "Costs",
    description: "Fuel, repair, maintenance, and vehicle costs",
  },
  {
    id: "reports",
    label: "Reports",
    shortLabel: "Reports",
    description: "Printable summaries and exports later",
  },
  {
    id: "alerts",
    label: "Alerts",
    shortLabel: "Alerts",
    description: "Due soon, overdue, missing info, and reminders",
  },
  {
    id: "backup",
    label: "Backup & Restore",
    shortLabel: "Backup",
    description: "Local backup reminders and restore workflow",
  },
  {
    id: "settings",
    label: "Settings",
    shortLabel: "Settings",
    description: "App preferences and future user access",
  },
];
