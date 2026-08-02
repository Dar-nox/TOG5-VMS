import { invoke, managedFileUrl } from "./client";

const dashboardCommands = {
  overview: "get_dashboard_overview",
} as const;

export type VehicleDashboardSummary = {
  totalCount: number;
  activeCount: number;
  archivedCount: number;
  underMaintenanceCount: number;
  latestVehicleName?: string | null;
  latestVehiclePhotoPath?: string | null;
};

export type DashboardMaintenanceItem = {
  id: string;
  vehicleId: string;
  vehicleName: string;
  templateName: string;
  category: string;
  priority: string;
  dueStatus: string;
  dueReason: string;
  nextDueDate?: string | null;
  nextDueOdometer?: number | null;
};

export type MaintenanceDashboardSummary = {
  totalScheduleCount: number;
  overdueCount: number;
  dueTodayCount: number;
  dueSoonCount: number;
  needsSetupCount: number;
  upcoming: DashboardMaintenanceItem[];
};

export type DashboardAlertItem = {
  id: string;
  title: string;
  message: string;
  alertType: string;
  priority: string;
  maintenanceScheduleId?: string | null;
  vehicleName?: string | null;
  maintenanceTemplateName?: string | null;
  createdAt: string;
  dueDate?: string | null;
};

export type AlertsDashboardSummary = {
  activeCount: number;
  highPriorityCount: number;
  topAlerts: DashboardAlertItem[];
};

export type FuelDashboardSummary = {
  latestOfficialKmPerLiter?: number | null;
  recentAverageKmPerLiter?: number | null;
  officialLogCount: number;
  efficiencyDropActive: boolean;
  message: string;
};

export type CostDashboardSummary = {
  currentMonth: string;
  totalTrackedCost: number;
  fuelTotal: number;
  maintenanceTotal: number;
  repairTotal: number;
  manualExpenseTotal: number;
  preferredCurrency: string;
};

export type BackupDashboardSummary = {
  latestCompletedAt?: string | null;
  latestBackupPath?: string | null;
  reminderDue: boolean;
  message: string;
  packageNote: string;
};

export type DashboardActivityItem = {
  id: string;
  activityType: string;
  title: string;
  detail: string;
  happenedAt: string;
  vehicleName?: string | null;
  amount?: number | null;
  targetPage?: string | null;
};

export type DashboardSetupHint = {
  code: string;
  title: string;
  message: string;
  actionLabel?: string | null;
  targetPage?: string | null;
};

export type DashboardOverview = {
  generatedAt: string;
  ownerDisplayName: string;
  preferredCurrency: string;
  vehicleSummary: VehicleDashboardSummary;
  maintenanceSummary: MaintenanceDashboardSummary;
  alertsSummary: AlertsDashboardSummary;
  fuelSummary: FuelDashboardSummary;
  costSummary: CostDashboardSummary;
  backupSummary: BackupDashboardSummary;
  recentActivity: DashboardActivityItem[];
  setupHints: DashboardSetupHint[];
};

export async function getDashboardOverview(): Promise<DashboardOverview> {
  return invoke<DashboardOverview>(dashboardCommands.overview);
}

export function dashboardPhotoUrl(filePath?: string | null): string | undefined {
  return managedFileUrl(filePath);
}
