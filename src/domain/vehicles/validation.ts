import {
  resultFromIssues,
  trimToUndefined,
  validateNonNegativeNumber,
  validateRequiredText,
  type ValidationResult,
} from "../common";
import type { VehicleCreationInput } from "./types";

export function validateVehicleCreation(
  input: VehicleCreationInput,
): ValidationResult<VehicleCreationInput> {
  const issues = [
    ...validateRequiredText(input.vehicleName, "vehicleName", "Vehicle name"),
    ...validateRequiredText(input.primaryPhotoId, "primaryPhotoId", "Vehicle picture"),
    ...validateRequiredText(input.vehicleType, "vehicleType", "Vehicle type"),
    ...validateRequiredText(input.fuelType, "fuelType", "Fuel type"),
    ...validateNonNegativeNumber(input.currentOdometer, "currentOdometer", "Current odometer"),
  ];

  return resultFromIssues(issues, {
    ...input,
    vehicleName: trimToUndefined(input.vehicleName),
    plateNumber: trimToUndefined(input.plateNumber),
  });
}
