import {
  resultFromIssues,
  validateNonNegativeNumber,
  validateRequiredText,
  type ValidationResult,
} from "../common";
import type { Expense } from "./types";

export function validateExpense(input: Pick<Expense, "description" | "amount">): ValidationResult {
  return resultFromIssues([
    ...validateRequiredText(input.description, "description", "Expense description"),
    ...validateNonNegativeNumber(input.amount, "amount", "Expense amount"),
  ]);
}
