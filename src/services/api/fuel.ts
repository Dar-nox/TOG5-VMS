import { managedFileUrl, rpc, supabase, unwrap, unwrapVoid } from "./client";
import { insertVehicleDocument, uploadManagedFile } from "./storage";
import type { FuelEfficiencyStatus, FuelLogFuelType } from "../../domain";

export type FuelTypeWarningRecord = {
  code: string;
  severity: "warning" | "error" | string;
  message: string;
};

export type FuelLogRecord = {
  id: string;
  vehicleId: string;
  vehicleName: string;
  fuelDate: string;
  odometer: number;
  fuelType: FuelLogFuelType;
  liters: number;
  pricePerLiter?: number | null;
  totalAmount: number;
  stationName?: string | null;
  receiptNumber?: string | null;
  receiptDocumentId?: string | null;
  receiptFilePath?: string | null;
  receiptOriginalFilename?: string | null;
  isFullTank: boolean;
  efficiencyStatus: FuelEfficiencyStatus;
  efficiencyReason: string;
  computedKmPerLiter?: number | null;
  computedLPer100km?: number | null;
  computedCostPerKm?: number | null;
  warnings: FuelTypeWarningRecord[];
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FuelLogMutationRequest = {
  vehicleId: string;
  fuelDate: string;
  odometer: number;
  fuelType: FuelLogFuelType;
  liters: number;
  pricePerLiter?: number;
  totalAmount?: number;
  stationName?: string;
  receiptNumber?: string;
  receiptDocumentId?: string;
  isFullTank: boolean;
  notes?: string;
};

export type FuelReceiptRecord = {
  id: string;
  vehicleId: string;
  storagePath: string;
  originalFilename?: string | null;
  fileSizeBytes: number;
  createdAt?: string | null;
};

export type FuelEfficiencySummaryRecord = {
  vehicleId: string;
  officialLogCount: number;
  latestKmPerLiter?: number | null;
  recentAverageKmPerLiter?: number | null;
  efficiencyDropDetected: boolean;
  warning?: string | null;
};

export async function listFuelLogsForVehicle(vehicleId: string): Promise<FuelLogRecord[]> {
  return unwrap(
    await supabase
      .from("fuel_logs_detailed")
      .select("*")
      .eq("vehicle_id", vehicleId)
      .order("fuel_date", { ascending: false })
      .order("odometer", { ascending: false }),
  );
}

export async function getFuelLog(id: string): Promise<FuelLogRecord> {
  return unwrap(await supabase.from("fuel_logs_detailed").select("*").eq("id", id).single());
}

export async function createFuelLog(request: FuelLogMutationRequest): Promise<FuelLogRecord> {
  const created = unwrap<{ id: string }>(
    await supabase.from("fuel_logs").insert(toRow(request)).select("id").single(),
  );

  await linkReceipt(request.receiptDocumentId, created.id);

  return getFuelLog(created.id);
}

export async function updateFuelLog(
  id: string,
  request: FuelLogMutationRequest,
): Promise<FuelLogRecord> {
  unwrapVoid(await supabase.from("fuel_logs").update(toRow(request)).eq("id", id));
  await linkReceipt(request.receiptDocumentId, id);

  return getFuelLog(id);
}

export async function archiveFuelLog(id: string): Promise<void> {
  // Soft delete. A trigger recalculates the vehicle's whole efficiency history
  // afterwards, since removing a fill changes the readings either side of it.
  unwrapVoid(
    await supabase.from("fuel_logs").update({ deleted_at: new Date().toISOString() }).eq("id", id),
  );
}

export async function storeFuelReceipt(vehicleId: string, file: File): Promise<FuelReceiptRecord> {
  const storagePath = await uploadManagedFile("fuel-receipts", file);
  const document = await insertVehicleDocument(vehicleId, "fuel_receipt", storagePath, file.name);

  return {
    id: document.id,
    vehicleId,
    storagePath: document.storagePath,
    originalFilename: file.name,
    fileSizeBytes: file.size,
    createdAt: new Date().toISOString(),
  };
}

export async function getFuelEfficiencySummaryForVehicle(
  vehicleId: string,
): Promise<FuelEfficiencySummaryRecord> {
  return rpc<FuelEfficiencySummaryRecord>("fuel_efficiency_summary_for_vehicle", {
    vehicle_id: vehicleId,
  });
}

export function fuelReceiptUrl(storagePath?: string | null): Promise<string | undefined> {
  return managedFileUrl(storagePath);
}

/**
 * The desktop app derived whichever of price and total was missing. Keeping
 * that here means somebody can still enter only what is on the receipt.
 */
function toRow(request: FuelLogMutationRequest) {
  const liters = request.liters;
  const pricePerLiter =
    request.pricePerLiter ??
    (request.totalAmount !== undefined && liters > 0 ? request.totalAmount / liters : null);
  const totalAmount =
    request.totalAmount ??
    (request.pricePerLiter !== undefined ? request.pricePerLiter * liters : 0);

  return {
    vehicle_id: request.vehicleId,
    fuel_date: request.fuelDate,
    odometer: request.odometer,
    fuel_type: request.fuelType,
    liters,
    price_per_liter: pricePerLiter,
    total_amount: totalAmount,
    station_name: request.stationName || null,
    receipt_number: request.receiptNumber || null,
    receipt_document_id: request.receiptDocumentId || null,
    is_full_tank: request.isFullTank,
    notes: request.notes || null,
  };
}

async function linkReceipt(documentId: string | undefined, fuelLogId: string): Promise<void> {
  if (!documentId) {
    return;
  }

  await supabase
    .from("vehicle_documents")
    .update({ related_record_type: "fuel_log", related_record_id: fuelLogId })
    .eq("id", documentId);
}
