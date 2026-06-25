import type { EntityId, ISODateTimeString, RelatedRecordType } from "../common";

export type LocalFileReference = {
  id?: EntityId;
  filePath: string;
  originalFilename?: string;
  mimeType?: string;
  fileSizeBytes?: number;
};

export type VehiclePhoto = LocalFileReference & {
  vehicleId?: EntityId;
  isPrimary: boolean;
  createdAt?: ISODateTimeString;
};

export type VehicleDocumentType =
  | "or_cr"
  | "registration"
  | "insurance"
  | "fuel_receipt"
  | "maintenance_receipt"
  | "repair_receipt"
  | "warranty"
  | "inspection_report"
  | "other";

export type VehicleDocument = LocalFileReference & {
  vehicleId: EntityId;
  documentType: VehicleDocumentType;
  description?: string;
  relatedRecordType?: RelatedRecordType;
  relatedRecordId?: EntityId;
  createdAt?: ISODateTimeString;
};
