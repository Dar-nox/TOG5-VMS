/**
 * Uploading photos and receipts.
 *
 * The desktop build turned a file into `Array.from(new Uint8Array(...))` and
 * sent it as JSON — a 10 MB photo became roughly 40 MB of text. That was
 * tolerable over local IPC and is not over a phone's connection, so files now
 * go straight to Supabase Storage as files.
 *
 * Images are also shrunk first. The client's real photos average 2.9 MB
 * straight off a phone camera, which is far more resolution than a vehicle
 * record needs, and the free tier has 1 GB to last them.
 */

import { supabase, unwrap } from "./client";

export type ManagedBucket =
  | "vehicle-photos"
  | "fuel-receipts"
  | "maintenance-receipts"
  | "maintenance-photos";

/** Roughly print quality on a phone screen, and a fraction of the size. */
const MAX_IMAGE_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/**
 * Shrinks an image that is larger than we need. Anything that is not an image
 * — a PDF receipt, most often — is returned untouched.
 */
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(
      1,
      MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height),
    );

    // Already small enough that re-encoding would only lose quality.
    if (scale === 1 && file.size <= 1024 * 1024) {
      bitmap.close();
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return file;
    }

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );

    if (!blob || blob.size >= file.size) {
      return file;
    }

    return new File([blob], replaceExtension(file.name, "jpg"), {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
  } catch {
    // Compression is an optimisation. If the browser will not do it, upload
    // the original rather than failing the save.
    return file;
  }
}

/**
 * Puts a file in its bucket and returns the path to store against the record.
 * The path includes the bucket so one helper can turn it back into a link.
 */
export async function uploadManagedFile(bucket: ManagedBucket, file: File): Promise<string> {
  const prepared = await compressImage(file);

  if (prepared.size > MAX_UPLOAD_BYTES) {
    throw new Error("Files must be 10 MB or smaller. Try a smaller picture.");
  }

  const objectName = `${crypto.randomUUID()}.${extensionOf(prepared.name) || "bin"}`;

  const { error } = await supabase.storage.from(bucket).upload(objectName, prepared, {
    contentType: prepared.type || undefined,
    upsert: false,
  });

  if (error) {
    throw new Error("Could not upload that file. Check your connection and try again.");
  }

  return `${bucket}/${objectName}`;
}

/** Records the uploaded file as a document belonging to a vehicle. */
export async function insertVehicleDocument(
  vehicleId: string,
  documentType: string,
  storagePath: string,
  originalFilename: string,
): Promise<{ id: string; storagePath: string }> {
  return unwrap(
    await supabase
      .from("vehicle_documents")
      .insert({
        vehicle_id: vehicleId,
        document_type: documentType,
        storage_path: storagePath,
        original_filename: originalFilename,
      })
      .select("id, storage_path")
      .single(),
  );
}

function extensionOf(filename: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(filename);
  return match ? match[1].toLowerCase() : "";
}

function replaceExtension(filename: string, extension: string): string {
  return `${filename.replace(/\.[^.]+$/, "")}.${extension}`;
}
