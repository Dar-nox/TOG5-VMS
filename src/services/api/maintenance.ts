import { invoke } from "@tauri-apps/api/core";
import type { MaintenanceCategory, MaintenancePriority } from "../../domain";
import type { Drivetrain, TransmissionType, VehicleFuelType, VehicleType } from "../../domain";

const maintenanceCommands = {
  listTemplates: "list_maintenance_templates",
  applicableForVehicle: "get_applicable_maintenance_templates_for_vehicle",
  seedTemplates: "seed_maintenance_templates",
} as const;

export type MaintenanceTemplateRuleRecord = {
  id: string;
  templateId: string;
  appliesToVehicleType?: VehicleType | null;
  appliesToFuelType?: VehicleFuelType | null;
  appliesToTransmissionType?: TransmissionType | null;
  appliesToDrivetrain?: Drivetrain | null;
  requiresFeature?: string | null;
  excludesFeature?: string | null;
  ruleType: "include" | "exclude";
  notes?: string | null;
};

export type MaintenanceTemplateRecord = {
  id: string;
  templateKey?: string | null;
  name: string;
  category: MaintenanceCategory | string;
  description?: string | null;
  defaultTimeIntervalDays?: number | null;
  defaultOdometerIntervalKm?: number | null;
  defaultDueSoonDays: number;
  defaultDueSoonKm: number;
  priority: MaintenancePriority;
  isActive: boolean;
  rules: MaintenanceTemplateRuleRecord[];
};

export type ApplicableMaintenanceTemplate = {
  template: MaintenanceTemplateRecord;
  applicabilityStatus: "applicable" | "excluded" | "requires_feature" | "not_applicable";
  isAutoApplicable: boolean;
  reason: string;
  warnings: string[];
  matchedRuleIds: string[];
};

export type SeedMaintenanceTemplatesResult = {
  templateCount: number;
  ruleCount: number;
};

export async function listMaintenanceTemplates(): Promise<MaintenanceTemplateRecord[]> {
  return invoke<MaintenanceTemplateRecord[]>(maintenanceCommands.listTemplates);
}

export async function getApplicableMaintenanceTemplatesForVehicle(
  vehicleId: string,
): Promise<ApplicableMaintenanceTemplate[]> {
  return invoke<ApplicableMaintenanceTemplate[]>(maintenanceCommands.applicableForVehicle, {
    vehicleId,
  });
}

export async function seedMaintenanceTemplates(): Promise<SeedMaintenanceTemplatesResult> {
  return invoke<SeedMaintenanceTemplatesResult>(maintenanceCommands.seedTemplates);
}
