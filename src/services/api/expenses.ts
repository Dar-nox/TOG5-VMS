/**
 * Expenses, and the cost reports built on them.
 *
 * Every total comes from the database rather than being added up here. The
 * desktop app implemented the "an expense that mirrors a fuel log is not an
 * extra cost" rule three separate times, in three places that could disagree;
 * there is now one view that decides it and every report reads that.
 */

import { rpc, supabase, unwrap, unwrapVoid } from "./client";
import type { ExpenseCategory } from "../../domain";

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
  /**
   * The trip this was spent on, when it was recorded from one. Written after
   * the row exists rather than through `save_expense`, which would mean
   * restating that whole function to add one nullable column.
   */
  tripId?: string;
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
  let query = supabase.from("expenses_detailed").select("*");
  const clean = cleanFilter(filter);

  if (clean?.vehicleId) {
    query = query.eq("vehicle_id", clean.vehicleId);
  }

  if (clean?.category) {
    query = query.eq("category", clean.category);
  }

  if (clean?.startDate) {
    query = query.gte("expense_date", clean.startDate);
  }

  if (clean?.endDate) {
    query = query.lte("expense_date", clean.endDate);
  }

  return unwrap(
    await query
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false }),
  );
}

export async function listExpensesForVehicle(vehicleId: string): Promise<ExpenseRecord[]> {
  return listExpenses({ vehicleId });
}

export async function getExpense(id: string): Promise<ExpenseRecord> {
  return unwrap(await supabase.from("expenses_detailed").select("*").eq("id", id).single());
}

export async function createExpense(request: ExpenseMutationRequest): Promise<ExpenseRecord> {
  const id = await rpc<string>("save_expense", expenseArgs(request));

  if (request.tripId) {
    unwrapVoid(await supabase.from("expenses").update({ trip_id: request.tripId }).eq("id", id));
  }

  return getExpense(id);
}

export async function updateExpense(
  id: string,
  request: ExpenseMutationRequest,
): Promise<ExpenseRecord> {
  return getExpense(await rpc<string>("save_expense", { expense_id: id, ...expenseArgs(request) }));
}

export async function archiveExpense(id: string): Promise<void> {
  await rpc<void>("archive_expense", { expense_id: id });
}

export async function getExpenseSummary(filter?: ExpenseListFilter): Promise<ExpenseSummaryReport> {
  const clean = cleanFilter(filter);

  return rpc<ExpenseSummaryReport>("expense_summary", {
    vehicle_id: clean?.vehicleId ?? null,
    category: clean?.category ?? null,
    start_date: clean?.startDate ?? null,
    end_date: clean?.endDate ?? null,
  });
}

export async function getVehicleCostReport(
  vehicleId: string,
  filter?: ReportFilter,
): Promise<VehicleCostReport> {
  const clean = cleanFilter(filter);

  return rpc<VehicleCostReport>("vehicle_cost_report", {
    vehicle_id: vehicleId,
    start_date: clean?.startDate ?? null,
    end_date: clean?.endDate ?? null,
  });
}

export async function getReportsOverview(filter?: ReportFilter): Promise<ReportsOverview> {
  const clean = cleanFilter(filter);

  return rpc<ReportsOverview>("reports_overview", {
    vehicle_id: clean?.vehicleId ?? null,
    start_date: clean?.startDate ?? null,
    end_date: clean?.endDate ?? null,
  });
}

function expenseArgs(request: ExpenseMutationRequest) {
  return {
    vehicle_id: request.vehicleId,
    expense_date: request.expenseDate,
    category: request.category,
    description: request.description,
    amount: request.amount,
    receipt_document_id: request.receiptDocumentId ?? null,
    related_record_type: request.relatedRecordType ?? null,
    related_record_id: request.relatedRecordId ?? null,
    notes: request.notes ?? null,
  };
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
