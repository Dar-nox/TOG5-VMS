import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import type {
  Drivetrain,
  TransmissionType,
  VehicleFuelType,
  VehicleStatus,
  VehicleType,
} from "../../domain";

const vehicleCommands = {
  list: "list_vehicles",
  get: "get_vehicle",
  storePhoto: "store_vehicle_photo",
  create: "create_vehicle",
  update: "update_vehicle",
  archive: "archive_vehicle",
} as const;

export type VehicleRecord = {
  id: string;
  vehicleName: string;
  primaryPhotoId?: string | null;
  primaryPhotoPath?: string | null;
  primaryPhotoMimeType?: string | null;
  plateNumber?: string | null;
  vehicleType: VehicleType;
  fuelType: VehicleFuelType;
  transmissionType: TransmissionType;
  drivetrain: Drivetrain;
  currentOdometer: number;
  status: VehicleStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
};

export type VehiclePhotoRecord = {
  id: string;
  vehicleId?: string | null;
  filePath: string;
  originalFilename?: string | null;
  mimeType?: string | null;
  fileSizeBytes: number;
  isPrimary: boolean;
  createdAt?: string | null;
};

export type VehicleMutationRequest = {
  vehicleName: string;
  primaryPhotoId: string;
  plateNumber?: string;
  vehicleType: VehicleType;
  fuelType: VehicleFuelType;
  transmissionType: TransmissionType;
  drivetrain: Drivetrain;
  currentOdometer: number;
  status: Exclude<VehicleStatus, "archived">;
  notes?: string;
};

export type StoreVehiclePhotoRequest = {
  originalFilename?: string;
  mimeType?: string;
  bytes: number[];
};

export function vehiclePhotoUrl(filePath?: string | null): string | undefined {
  return filePath ? convertFileSrc(filePath) : undefined;
}

export async function listVehicles(): Promise<VehicleRecord[]> {
  return invoke<VehicleRecord[]>(vehicleCommands.list);
}

export async function getVehicle(id: string): Promise<VehicleRecord> {
  return invoke<VehicleRecord>(vehicleCommands.get, { id });
}

export async function storeVehiclePhoto(file: File): Promise<VehiclePhotoRecord> {
  const bytes = Array.from(new Uint8Array(await file.arrayBuffer()));
  const request: StoreVehiclePhotoRequest = {
    originalFilename: file.name,
    mimeType: file.type || undefined,
    bytes,
  };

  return invoke<VehiclePhotoRecord>(vehicleCommands.storePhoto, { request });
}

export async function createVehicle(request: VehicleMutationRequest): Promise<VehicleRecord> {
  return invoke<VehicleRecord>(vehicleCommands.create, { request });
}

export async function updateVehicle(
  id: string,
  request: VehicleMutationRequest,
): Promise<VehicleRecord> {
  return invoke<VehicleRecord>(vehicleCommands.update, { id, request });
}

export async function archiveVehicle(id: string): Promise<void> {
  return invoke<void>(vehicleCommands.archive, { id });
}
