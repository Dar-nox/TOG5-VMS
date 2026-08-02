import { invoke, managedFileUrl } from "./client";
import type { FuelEfficiencyStatus, FuelLogFuelType } from "../../domain";

const fuelCommands = {
  listForVehicle: "list_fuel_logs_for_vehicle",
  get: "get_fuel_log",
  create: "create_fuel_log",
  update: "update_fuel_log",
  archive: "archive_fuel_log",
  storeReceipt: "store_fuel_receipt",
  summaryForVehicle: "get_fuel_efficiency_summary_for_vehicle",
} as const;

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
  filePath: string;
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
  return invoke<FuelLogRecord[]>(fuelCommands.listForVehicle, { vehicleId });
}

export async function getFuelLog(id: string): Promise<FuelLogRecord> {
  return invoke<FuelLogRecord>(fuelCommands.get, { id });
}

export async function createFuelLog(request: FuelLogMutationRequest): Promise<FuelLogRecord> {
  return invoke<FuelLogRecord>(fuelCommands.create, { request });
}

export async function updateFuelLog(
  id: string,
  request: FuelLogMutationRequest,
): Promise<FuelLogRecord> {
  return invoke<FuelLogRecord>(fuelCommands.update, { id, request });
}

export async function archiveFuelLog(id: string): Promise<void> {
  return invoke<void>(fuelCommands.archive, { id });
}

export async function storeFuelReceipt(vehicleId: string, file: File): Promise<FuelReceiptRecord> {
  const bytes = Array.from(new Uint8Array(await file.arrayBuffer()));

  return invoke<FuelReceiptRecord>(fuelCommands.storeReceipt, {
    request: {
      vehicleId,
      originalFilename: file.name,
      mimeType: file.type || undefined,
      bytes,
    },
  });
}

export async function getFuelEfficiencySummaryForVehicle(
  vehicleId: string,
): Promise<FuelEfficiencySummaryRecord> {
  return invoke<FuelEfficiencySummaryRecord>(fuelCommands.summaryForVehicle, { vehicleId });
}

export function fuelReceiptUrl(filePath?: string | null): string | undefined {
  return managedFileUrl(filePath);
}
