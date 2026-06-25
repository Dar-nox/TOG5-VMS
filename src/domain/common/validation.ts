import type { ValidationIssue, ValidationResult } from "./types";

export function makeIssue(
  code: string,
  message: string,
  field?: string,
  severity: ValidationIssue["severity"] = "error",
): ValidationIssue {
  return { code, message, field, severity };
}

export function resultFromIssues<T>(issues: ValidationIssue[], value?: T): ValidationResult<T> {
  return {
    valid: !issues.some((issue) => issue.severity === "error"),
    issues,
    value,
  };
}

export function trimToUndefined(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function validateRequiredText(
  value: unknown,
  field: string,
  label: string,
): ValidationIssue[] {
  return trimToUndefined(value) ? [] : [makeIssue("required_text", `${label} is required.`, field)];
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function validateFiniteNumber(
  value: unknown,
  field: string,
  label: string,
): ValidationIssue[] {
  return isFiniteNumber(value)
    ? []
    : [makeIssue("invalid_number", `${label} must be a valid number.`, field)];
}

export function validateNonNegativeNumber(
  value: unknown,
  field: string,
  label: string,
): ValidationIssue[] {
  if (!isFiniteNumber(value)) {
    return validateFiniteNumber(value, field, label);
  }

  return value >= 0 ? [] : [makeIssue("negative_number", `${label} cannot be negative.`, field)];
}

export function validatePositiveNumber(
  value: unknown,
  field: string,
  label: string,
): ValidationIssue[] {
  if (!isFiniteNumber(value)) {
    return validateFiniteNumber(value, field, label);
  }

  return value > 0 ? [] : [makeIssue("not_positive", `${label} must be greater than zero.`, field)];
}

export function validateOdometerProgression(input: {
  currentOdometer: unknown;
  previousOdometer?: number;
  allowAdminOverride?: boolean;
  field?: string;
}): ValidationIssue[] {
  const field = input.field ?? "odometer";
  const issues = validateNonNegativeNumber(input.currentOdometer, field, "Odometer");

  if (!isFiniteNumber(input.currentOdometer) || input.previousOdometer === undefined) {
    return issues;
  }

  if (input.currentOdometer < input.previousOdometer && !input.allowAdminOverride) {
    issues.push(
      makeIssue(
        "odometer_decreased",
        "Odometer is lower than the previous reading. Admin override is required to continue.",
        field,
      ),
    );
  }

  if (input.currentOdometer < input.previousOdometer && input.allowAdminOverride) {
    issues.push(
      makeIssue(
        "odometer_decreased_override",
        "Odometer is lower than the previous reading. Save only if this is an approved correction.",
        field,
        "warning",
      ),
    );
  }

  return issues;
}
