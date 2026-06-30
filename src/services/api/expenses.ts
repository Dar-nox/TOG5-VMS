import { invoke } from "@tauri-apps/api/core";
import type { ExpenseCategory } from "../../domain";

const expenseCommands = {
  list: "list_expenses",
  listForVehicle: "list_expenses_for_vehicle",
  get: "get_expense",
  create: "create_expense",
  update: "update_expense",
  archive: "archive_expense",
  summary: "get_expense_summary",
  vehicleCostReport: "get_vehicle_cost_report",
  reportsOverview: "get_reports_overview",
} as const;

export type RelatedRecordType = "fuel_log" | "maintenance_log" | "repair_record" | "other";

export type ExpenseListFilter = {
  vehicleId?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
};

export type ReportFilter = {
  vehicleId?: string;
  startDate?: string;
  endDate?: string;
};

export type ExpenseRecord = {
  id: string;
  vehicleId?: string | null;
  vehicleName?: string | null;
  expenseDate: string;
  category: ExpenseCategory | string;
  description: string;
  amount: number;
  receiptDocumentId?: string | null;
  relatedRecordType?: RelatedRecordType | string | null;
  relatedRecordId?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ExpenseMutationRequest = {
  vehicleId: string;
  expenseDate: string;
  category: ExpenseCategory | string;
  description: string;
  amount: number;
  receiptDocumentId?: string;
  relatedRecordType?: RelatedRecordType;
  relatedRecordId?: string;
  notes?: string;
};

export type CategoryTotalRecord = {
  category: string;
  total: number;
  count: number;
};

export type MonthlyTotalRecord = {
  month: string;
  total: number;
  count: number;
};

export type CostEventRecord = {
  sourceType: "fuel_log" | "maintenance_log" | "repair_record" | "expense" | string;
  sourceId: string;
  vehicleId?: string | null;
  vehicleName?: string | null;
  eventDate: string;
  category: string;
  description: string;
  amount: number;
};

export type ExpenseSummaryReport = {
  directExpenseTotal: number;
  manualExpenseTotal: number;
  linkedExpenseTotal: number;
  expenseCount: number;
  categoryTotals: CategoryTotalRecord[];
  monthlyTotals: MonthlyTotalRecord[];
  recentExpenses: ExpenseRecord[];
};

export type VehicleCostSummaryRecord = {
  vehicleId: string;
  vehicleName: string;
  fuelTotal: number;
  maintenanceTotal: number;
  repairTotal: number;
  manualExpenseTotal: number;
  totalCost: number;
  distanceKm?: number | null;
  costPerKm?: number | null;
  costPerKmReason: string;
  latestOfficialKmPerLiter?: number | null;
};

export type VehicleCostReport = {
  vehicle: VehicleCostSummaryRecord;
  categoryTotals: CategoryTotalRecord[];
  monthlyTotals: MonthlyTotalRecord[];
  recentCostEvents: CostEventRecord[];
};

export type ReportsOverview = {
  totalTrackedCost: number;
  fuelTotal: number;
  maintenanceTotal: number;
  repairTotal: number;
  manualExpenseTotal: number;
  directExpenseTotal: number;
  linkedExpenseTotal: number;
  categoryTotals: CategoryTotalRecord[];
  monthlyTotals: MonthlyTotalRecord[];
  vehicleSummaries: VehicleCostSummaryRecord[];
  recentCostEvents: CostEventRecord[];
};

export async function listExpenses(filter?: ExpenseListFilter): Promise<ExpenseRecord[]> {
  return invoke<ExpenseRecord[]>(expenseCommands.list, { filter: cleanFilter(filter) });
}

export async function listExpensesForVehicle(vehicleId: string): Promise<ExpenseRecord[]> {
  return invoke<ExpenseRecord[]>(expenseCommands.listForVehicle, { vehicleId });
}

export async function getExpense(id: string): Promise<ExpenseRecord> {
  return invoke<ExpenseRecord>(expenseCommands.get, { id });
}

export async function createExpense(request: ExpenseMutationRequest): Promise<ExpenseRecord> {
  return invoke<ExpenseRecord>(expenseCommands.create, { request });
}

export async function updateExpense(
  id: string,
  request: ExpenseMutationRequest,
): Promise<ExpenseRecord> {
  return invoke<ExpenseRecord>(expenseCommands.update, { id, request });
}

export async function archiveExpense(id: string): Promise<void> {
  return invoke<void>(expenseCommands.archive, { id });
}

export async function getExpenseSummary(filter?: ExpenseListFilter): Promise<ExpenseSummaryReport> {
  return invoke<ExpenseSummaryReport>(expenseCommands.summary, { filter: cleanFilter(filter) });
}

export async function getVehicleCostReport(
  vehicleId: string,
  filter?: ReportFilter,
): Promise<VehicleCostReport> {
  return invoke<VehicleCostReport>(expenseCommands.vehicleCostReport, {
    vehicleId,
    filter: cleanFilter(filter),
  });
}

export async function getReportsOverview(filter?: ReportFilter): Promise<ReportsOverview> {
  return invoke<ReportsOverview>(expenseCommands.reportsOverview, { filter: cleanFilter(filter) });
}

function cleanFilter<Filter extends Record<string, string | undefined>>(
  filter?: Filter,
): Filter | undefined {
  if (!filter) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(filter).filter(([, value]) => value !== undefined && value.trim() !== ""),
  ) as Filter;
}
