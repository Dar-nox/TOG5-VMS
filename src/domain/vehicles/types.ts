import type { EntityId, ISODateString, ISODateTimeString } from "../common";

export type VehicleType = "sedan" | "suv" | "van" | "truck" | "bus" | "motorcycle" | "other";

export type VehicleFuelType =
  | "gasoline"
  | "diesel"
  | "hybrid_gasoline"
  | "hybrid_diesel"
  | "full_ev"
  | "other";

export type TransmissionType = "manual" | "automatic" | "cvt" | "dct" | "none" | "unknown";

export type Drivetrain = "fwd" | "rwd" | "awd" | "4wd" | "none" | "unknown";

export type VehicleFeatureKey =
  | "turbocharged"
  | "supercharged"
  | "diesel_particulate_filter"
  | "def_adblue"
  | "timing_belt"
  | "timing_chain"
  | "carbureted"
  | "fuel_injected"
  | "hybrid_system"
  | "electric_motor_system";

export type VehicleStatus = "active" | "under_maintenance" | "inactive" | "archived";

export type VehicleFeature = {
  featureKey: VehicleFeatureKey;
  enabled: boolean;
  notes?: string;
};

export type Vehicle = {
  id: EntityId;
  vehicleName: string;
  primaryPhotoId?: EntityId;
  plateNumber?: string;
  vehicleType: VehicleType;
  fuelType: VehicleFuelType;
  transmissionType?: TransmissionType;
  drivetrain?: Drivetrain;
  brand?: string;
  model?: string;
  yearModel?: number;
  color?: string;
  engineDescription?: string;
  currentOdometer: number;
  status: VehicleStatus;
  assignedDriver?: string;
  dateAcquired?: ISODateString;
  registrationExpiry?: ISODateString;
  insuranceExpiry?: ISODateString;
  features: VehicleFeature[];
  notes?: string;
  createdAt?: ISODateTimeString;
  updatedAt?: ISODateTimeString;
  archivedAt?: ISODateTimeString;
};

export type VehicleCreationInput = {
  vehicleName?: string;
  primaryPhotoId?: EntityId;
  plateNumber?: string;
  vehicleType?: VehicleType;
  fuelType?: VehicleFuelType;
  transmissionType?: TransmissionType;
  drivetrain?: Drivetrain;
  currentOdometer?: number;
  features?: VehicleFeature[];
  status?: VehicleStatus;
};
