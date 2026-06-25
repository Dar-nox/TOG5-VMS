export type EntityId = string;
export type ISODateString = string;
export type ISODateTimeString = string;

export type ValidationSeverity = "error" | "warning";

export type ValidationIssue = {
  code: string;
  message: string;
  severity: ValidationSeverity;
  field?: string;
};

export type ValidationResult<T = undefined> = {
  valid: boolean;
  issues: ValidationIssue[];
  value?: T;
};

export type RelatedRecordType =
  | "vehicle"
  | "fuel_log"
  | "maintenance_log"
  | "maintenance_schedule"
  | "repair_record"
  | "expense"
  | "alert"
  | "backup"
  | "other";

export type MoneyAmount = number;

export const moneyHandlingNote =
  "Money values are modeled as numbers for early validation; persistence keeps numeric amounts and future phases may add explicit rounding/decimal policy.";
