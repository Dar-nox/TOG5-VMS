import {
  makeIssue,
  resultFromIssues,
  validateNonNegativeNumber,
  validateOdometerProgression,
  validatePositiveNumber,
  type ValidationIssue,
  type ValidationResult,
} from "../common";
import type {
  FuelEfficiencyCalculation,
  FuelEfficiencyInput,
  FuelLogFuelType,
  FuelLogValidationInput,
} from "./types";

export function validateFuelLog(input: FuelLogValidationInput): ValidationResult {
  const issues: ValidationIssue[] = [
    ...validateOdometerProgression({
      currentOdometer: input.odometer,
      previousOdometer: input.previousOdometer,
      allowAdminOverride: input.allowAdminOdometerOverride,
      field: "odometer",
    }),
    ...validatePositiveNumber(input.liters, "liters", "Fuel liters"),
    ...validateNonNegativeNumber(input.totalAmount, "totalAmount", "Total amount"),
  ];

  if (input.pricePerLiter !== undefined) {
    issues.push(
      ...validateNonNegativeNumber(input.pricePerLiter, "pricePerLiter", "Price per liter"),
    );
  }

  issues.push(...validateFuelTypeCompatibility(input.vehicleFuelType, input.fuelType));

  return resultFromIssues(issues);
}

export function validateFuelTypeCompatibility(
  vehicleFuelType: FuelLogValidationInput["vehicleFuelType"],
  fuelType: FuelLogFuelType,
): ValidationIssue[] {
  if (!vehicleFuelType || fuelType === "def_adblue") {
    return [];
  }

  if (vehicleFuelType !== fuelType) {
    return [
      makeIssue(
        "fuel_type_mismatch",
        "Fuel type does not match the selected vehicle. Confirm before saving.",
        "fuelType",
        "warning",
      ),
    ];
  }

  return [];
}

export function calculateOfficialFuelEfficiency(
  input: FuelEfficiencyInput,
): FuelEfficiencyCalculation {
  if (input.fuelType === "def_adblue") {
    return {
      status: "not_computed",
      reason: "DEF/AdBlue is not counted as diesel fuel consumption.",
    };
  }

  if (!input.previousIsFullTank || !input.currentIsFullTank) {
    return {
      status: "not_computed",
      reason: "Official fuel efficiency requires previous and current full-tank logs.",
    };
  }

  if (
    ![input.previousOdometer, input.currentOdometer, input.liters, input.totalAmount].every(
      Number.isFinite,
    )
  ) {
    return { status: "not_computed", reason: "Fuel efficiency inputs must be valid numbers." };
  }

  if (input.currentOdometer <= input.previousOdometer || input.liters <= 0) {
    return {
      status: "not_computed",
      reason:
        "Current odometer must be higher than previous odometer and liters must be greater than zero.",
    };
  }

  const distanceKm = input.currentOdometer - input.previousOdometer;

  return {
    status: "official",
    distanceKm,
    kmPerLiter: distanceKm / input.liters,
    litersPer100Km: (input.liters / distanceKm) * 100,
    costPerKm: input.totalAmount / distanceKm,
  };
}
