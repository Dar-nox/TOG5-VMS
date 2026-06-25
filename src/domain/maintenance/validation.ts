import { makeIssue, validateNonNegativeNumber, type ValidationIssue } from "../common";
import type { Vehicle } from "../vehicles";
import type {
  MaintenanceDueInput,
  MaintenanceScheduleStatus,
  MaintenanceTaskKey,
  MaintenanceTemplate,
  MaintenanceTemplateRule,
} from "./types";

const dieselExcludedTasks: MaintenanceTaskKey[] = ["spark_plug", "ignition_coil"];
const gasolineExcludedTasks: MaintenanceTaskKey[] = ["def_adblue", "dpf"];
const fullEvExcludedTasks: MaintenanceTaskKey[] = [
  "engine_oil",
  "spark_plug",
  "fuel_filter",
  "diesel_fuel_filter",
  "exhaust",
];

export function maintenanceApplicabilityIssues(
  vehicle: Pick<
    Vehicle,
    "fuelType" | "vehicleType" | "transmissionType" | "drivetrain" | "features"
  >,
  taskKey: MaintenanceTaskKey,
): ValidationIssue[] {
  if (vehicle.fuelType === "diesel" && dieselExcludedTasks.includes(taskKey)) {
    return [
      makeIssue(
        "diesel_spark_plug_excluded",
        "Diesel vehicles should not automatically receive spark plug or gasoline ignition maintenance.",
        "taskKey",
        "warning",
      ),
    ];
  }

  if (vehicle.fuelType === "gasoline" && gasolineExcludedTasks.includes(taskKey)) {
    return [
      makeIssue(
        "gasoline_diesel_only_excluded",
        "Gasoline vehicles should not automatically receive diesel-only DEF/AdBlue or DPF maintenance.",
        "taskKey",
        "warning",
      ),
    ];
  }

  if (vehicle.fuelType === "full_ev" && fullEvExcludedTasks.includes(taskKey)) {
    return [
      makeIssue(
        "ev_combustion_task_excluded",
        "Full EVs should not automatically receive engine oil, spark plug, fuel filter, or exhaust maintenance.",
        "taskKey",
        "warning",
      ),
    ];
  }

  return [];
}

export function shouldAutoApplyMaintenanceTask(
  vehicle: Pick<
    Vehicle,
    "fuelType" | "vehicleType" | "transmissionType" | "drivetrain" | "features"
  >,
  taskKey: MaintenanceTaskKey,
): boolean {
  return maintenanceApplicabilityIssues(vehicle, taskKey).length === 0;
}

export function doesTemplateRuleMatchVehicle(
  vehicle: Pick<
    Vehicle,
    "fuelType" | "vehicleType" | "transmissionType" | "drivetrain" | "features"
  >,
  rule: MaintenanceTemplateRule,
): boolean {
  const enabledFeatures = new Set(
    vehicle.features.filter((feature) => feature.enabled).map((feature) => feature.featureKey),
  );

  return (
    (!rule.appliesToVehicleType || rule.appliesToVehicleType === vehicle.vehicleType) &&
    (!rule.appliesToFuelType || rule.appliesToFuelType === vehicle.fuelType) &&
    (!rule.appliesToTransmissionType ||
      rule.appliesToTransmissionType === vehicle.transmissionType) &&
    (!rule.appliesToDrivetrain || rule.appliesToDrivetrain === vehicle.drivetrain) &&
    (!rule.requiresFeature || enabledFeatures.has(rule.requiresFeature)) &&
    (!rule.excludesFeature || !enabledFeatures.has(rule.excludesFeature))
  );
}

export function templateHasMatchingExcludeRule(
  vehicle: Pick<
    Vehicle,
    "fuelType" | "vehicleType" | "transmissionType" | "drivetrain" | "features"
  >,
  template: Pick<MaintenanceTemplate, "rules">,
): boolean {
  return template.rules.some(
    (rule) => rule.ruleType === "exclude" && doesTemplateRuleMatchVehicle(vehicle, rule),
  );
}

export function getMaintenanceDueStatus(input: MaintenanceDueInput): MaintenanceScheduleStatus {
  const numericIssues = [
    ...validateNonNegativeNumber(input.dueSoonDays, "dueSoonDays", "Due soon days"),
    ...validateNonNegativeNumber(input.dueSoonKm, "dueSoonKm", "Due soon kilometers"),
  ];

  if (numericIssues.some((issue) => issue.severity === "error")) {
    return "upcoming";
  }

  const today = toUtcDateOnly(input.today);
  const dateStatus = input.nextDueDate
    ? getDateDueStatus(today, toUtcDateOnly(input.nextDueDate), input.dueSoonDays)
    : "upcoming";
  const odometerStatus =
    input.currentOdometer !== undefined && input.nextDueOdometer !== undefined
      ? getOdometerDueStatus(input.currentOdometer, input.nextDueOdometer, input.dueSoonKm)
      : "upcoming";

  if (dateStatus === "overdue" || odometerStatus === "overdue") {
    return "overdue";
  }

  if (dateStatus === "due_today" || odometerStatus === "due_today") {
    return "due_today";
  }

  if (dateStatus === "due_soon" || odometerStatus === "due_soon") {
    return "due_soon";
  }

  return "upcoming";
}

function getDateDueStatus(
  today: Date,
  nextDueDate: Date,
  dueSoonDays: number,
): MaintenanceScheduleStatus {
  const daysUntilDue = Math.round((nextDueDate.getTime() - today.getTime()) / 86_400_000);

  if (daysUntilDue < 0) {
    return "overdue";
  }

  if (daysUntilDue === 0) {
    return "due_today";
  }

  return daysUntilDue <= dueSoonDays ? "due_soon" : "upcoming";
}

function getOdometerDueStatus(
  currentOdometer: number,
  nextDueOdometer: number,
  dueSoonKm: number,
): MaintenanceScheduleStatus {
  if (![currentOdometer, nextDueOdometer, dueSoonKm].every(Number.isFinite)) {
    return "upcoming";
  }

  const remainingKm = nextDueOdometer - currentOdometer;

  if (remainingKm < 0) {
    return "overdue";
  }

  if (remainingKm === 0) {
    return "due_today";
  }

  return remainingKm <= dueSoonKm ? "due_soon" : "upcoming";
}

function toUtcDateOnly(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
}
