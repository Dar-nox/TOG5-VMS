import type { EntityId, ISODateString, RelatedRecordType } from "../common";

export type ExpenseCategory =
  | "fuel"
  | "preventive_maintenance"
  | "repairs"
  | "parts"
  | "labor"
  | "registration"
  | "insurance"
  | "cleaning"
  | "tires"
  | "emergency"
  | "other";

export type Expense = {
  id: EntityId;
  vehicleId?: EntityId;
  expenseDate: ISODateString;
  category: ExpenseCategory;
  description: string;
  amount: number;
  receiptDocumentId?: EntityId;
  relatedRecordType?: RelatedRecordType;
  relatedRecordId?: EntityId;
  notes?: string;
};
