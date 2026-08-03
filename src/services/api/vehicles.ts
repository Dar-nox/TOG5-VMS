import type {
  Drivetrain,
  TransmissionType,
  VehicleFuelType,
  VehicleStatus,
  VehicleType,
} from "../../domain";
import { managedFileUrl, supabase, unwrap, unwrapVoid } from "./client";
import { uploadManagedFile } from "./storage";

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
  storagePath: string;
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

/**
 * A link to a stored photo. The buckets are private, so this is a signed URL
 * that expires — which is why it is a promise where the desktop build could
 * return a string.
 */
export function vehiclePhotoUrl(storagePath?: string | null): Promise<string | undefined> {
  return managedFileUrl(storagePath);
}

export async function listVehicles(): Promise<VehicleRecord[]> {
  return unwrap(
    await supabase
      .from("vehicles_with_photo")
      .select("*")
      .neq("status", "archived")
      .order("vehicle_name"),
  );
}

export async function getVehicle(id: string): Promise<VehicleRecord> {
  return unwrap(await supabase.from("vehicles_with_photo").select("*").eq("id", id).single());
}

export async function storeVehiclePhoto(file: File): Promise<VehiclePhotoRecord> {
  const storagePath = await uploadManagedFile("vehicle-photos", file);

  // The photo is uploaded before the vehicle exists — the form needs an id to
  // save against — so it starts unattached and is linked when the vehicle is
  // created.
  return unwrap(
    await supabase
      .from("vehicle_photos")
      .insert({
        storage_path: storagePath,
        original_filename: file.name,
        mime_type: file.type || null,
        file_size_bytes: file.size,
        is_primary: true,
      })
      .select("*")
      .single(),
  );
}

export async function createVehicle(request: VehicleMutationRequest): Promise<VehicleRecord> {
  const created = unwrap<{ id: string }>(
    await supabase.from("vehicles").insert(toRow(request)).select("id").single(),
  );

  await attachPhoto(request.primaryPhotoId, created.id);

  return getVehicle(created.id);
}

export async function updateVehicle(
  id: string,
  request: VehicleMutationRequest,
): Promise<VehicleRecord> {
  unwrapVoid(await supabase.from("vehicles").update(toRow(request)).eq("id", id));
  await attachPhoto(request.primaryPhotoId, id);

  return getVehicle(id);
}

export async function archiveVehicle(id: string): Promise<void> {
  unwrapVoid(
    await supabase
      .from("vehicles")
      .update({ status: "archived", archived_at: new Date().toISOString() })
      .eq("id", id),
  );
}

async function attachPhoto(photoId: string | undefined, vehicleId: string): Promise<void> {
  if (!photoId) {
    return;
  }

  unwrapVoid(
    await supabase.from("vehicle_photos").update({ vehicle_id: vehicleId }).eq("id", photoId),
  );
}

function toRow(request: VehicleMutationRequest) {
  return {
    vehicle_name: request.vehicleName,
    primary_photo_id: request.primaryPhotoId || null,
    plate_number: request.plateNumber || null,
    vehicle_type: request.vehicleType,
    fuel_type: request.fuelType,
    transmission_type: request.transmissionType,
    drivetrain: request.drivetrain,
    current_odometer: request.currentOdometer,
    status: request.status,
    notes: request.notes || null,
  };
}
