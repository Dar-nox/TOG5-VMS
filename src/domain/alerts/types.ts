import type { EntityId, ISODateTimeString, RelatedRecordType } from "../common";

export type AlertType =
  | "due_soon_by_date"
  | "due_soon_by_odometer"
  | "overdue_by_date"
  | "overdue_by_odometer"
  | "fuel_efficiency_drop"
  | "missing_receipt"
  | "abnormal_odometer"
  | "expiring_registration"
  | "expiring_insurance"
  | "vehicle_inactive"
  | "maintenance_applicability_warning"
  | "backup_reminder"
  | "unusual_expense";

export type AlertPriority = "low" | "medium" | "high" | "critical";
export type AlertStatus = "active" | "snoozed" | "dismissed" | "resolved";

export type Alert = {
  id: EntityId;
  vehicleId?: EntityId;
  maintenanceScheduleId?: EntityId;
  alertType: AlertType;
  priority: AlertPriority;
  title: string;
  message: string;
  relatedRecordType?: RelatedRecordType;
  relatedRecordId?: EntityId;
  status: AlertStatus;
  dueDate?: ISODateTimeString;
  snoozedUntil?: ISODateTimeString;
  createdAt?: ISODateTimeString;
  resolvedAt?: ISODateTimeString;
};
