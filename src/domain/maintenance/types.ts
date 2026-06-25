import type { EntityId, ISODateString, ISODateTimeString } from "../common";
import type {
  Drivetrain,
  TransmissionType,
  VehicleFeatureKey,
  VehicleFuelType,
  VehicleType,
} from "../vehicles";

export type MaintenanceCategory =
  | "oil_filters"
  | "tires_wheels"
  | "brakes"
  | "battery_electrical"
  | "fluids"
  | "cooling"
  | "belts_hoses"
  | "transmission"
  | "suspension_steering"
  | "legal_documents"
  | "gasoline_ignition"
  | "diesel_emissions"
  | "ev_hybrid"
  | "other";

export type MaintenanceTaskKey =
  | "engine_oil"
  | "oil_filter"
  | "engine_air_filter"
  | "fuel_filter"
  | "diesel_fuel_filter"
  | "water_separator"
  | "spark_plug"
  | "glow_plug"
  | "ignition_coil"
  | "def_adblue"
  | "dpf"
  | "exhaust"
  | "ev_battery"
  | "brake_inspection"
  | "tire_rotation"
  | "transmission_fluid"
  | "clutch";

export type MaintenancePriority = "low" | "medium" | "high" | "critical";

export type MaintenanceRuleType = "include" | "exclude";

export type MaintenanceTemplateRule = {
  appliesToVehicleType?: VehicleType;
  appliesToFuelType?: VehicleFuelType;
  appliesToTransmissionType?: TransmissionType;
  appliesToDrivetrain?: Drivetrain;
  requiresFeature?: VehicleFeatureKey;
  excludesFeature?: VehicleFeatureKey;
  ruleType: MaintenanceRuleType;
  notes?: string;
};

export type MaintenanceTemplate = {
  id: EntityId;
  taskKey?: MaintenanceTaskKey;
  name: string;
  category: MaintenanceCategory;
  description?: string;
  defaultTimeIntervalDays?: number;
  defaultOdometerIntervalKm?: number;
  defaultDueSoonDays: number;
  defaultDueSoonKm: number;
  priority: MaintenancePriority;
  isActive: boolean;
  rules: MaintenanceTemplateRule[];
};

export type MaintenanceScheduleStatus =
  | "upcoming"
  | "due_soon"
  | "due_today"
  | "overdue"
  | "completed"
  | "skipped"
  | "not_applicable"
  | "disabled";

export type MaintenanceSchedule = {
  id: EntityId;
  vehicleId: EntityId;
  templateId: EntityId;
  lastCompletedDate?: ISODateString;
  lastCompletedOdometer?: number;
  nextDueDate?: ISODateString;
  nextDueOdometer?: number;
  dueSoonDays: number;
  dueSoonKm: number;
  status: MaintenanceScheduleStatus;
  priority: MaintenancePriority;
  updatedAt?: ISODateTimeString;
};

export type MaintenanceLog = {
  id: EntityId;
  vehicleId: EntityId;
  templateId?: EntityId;
  completedDate: ISODateString;
  odometer: number;
  workPerformed: string;
  partsReplaced?: string;
  laborCost: number;
  partsCost: number;
  totalCost: number;
  mechanicShop?: string;
  receiptDocumentId?: EntityId;
  beforePhotoId?: EntityId;
  afterPhotoId?: EntityId;
  warrantyExpiration?: ISODateString;
  nextRecommendedDate?: ISODateString;
  nextRecommendedOdometer?: number;
  notes?: string;
};

export type MaintenanceDueInput = {
  today: ISODateString;
  currentOdometer?: number;
  nextDueDate?: ISODateString;
  nextDueOdometer?: number;
  dueSoonDays: number;
  dueSoonKm: number;
};
