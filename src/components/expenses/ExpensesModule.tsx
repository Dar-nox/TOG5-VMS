import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { ExpenseCategory } from "../../domain";
import { validateExpense } from "../../domain";
import {
  archiveExpense,
  createExpense,
  getExpenseSummary,
  listExpenses,
  updateExpense,
  type ExpenseListFilter,
  type ExpenseMutationRequest,
  type ExpenseRecord,
  type ExpenseSummaryReport,
  type RelatedRecordType,
} from "../../services/api/expenses";
import { getAppSettings } from "../../services/api/settings";
import { listVehicles, type VehicleRecord } from "../../services/api/vehicles";

type ExpenseFormState = {
  vehicleId: string;
  expenseDate: string;
  category: ExpenseCategory;
  description: string;
  amount: string;
  relatedRecordType: "" | RelatedRecordType;
  relatedRecordId: string;
  notes: string;
};

const categoryOptions: Array<{ value: ExpenseCategory; label: string }> = [
  { value: "fuel", label: "Fuel" },
  { value: "preventive_maintenance", label: "Preventive maintenance" },
  { value: "repairs", label: "Repairs" },
  { value: "parts", label: "Parts" },
  { value: "labor", label: "Labor" },
  { value: "registration", label: "Registration" },
  { value: "insurance", label: "Insurance" },
  { value: "cleaning", label: "Cleaning" },
  { value: "tires", label: "Tires" },
  { value: "emergency", label: "Emergency" },
  { value: "other", label: "Other" },
];

const relatedRecordOptions: Array<{ value: "" | RelatedRecordType; label: string }> = [
  { value: "", label: "No linked source record" },
  { value: "fuel_log", label: "Fuel log" },
  { value: "maintenance_log", label: "Service history record" },
  { value: "repair_record", label: "Repair record" },
  { value: "other", label: "Other record" },
];

export function ExpensesModule() {
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [vehicleFilter, setVehicleFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [summary, setSummary] = useState<ExpenseSummaryReport | null>(null);
  const [currency, setCurrency] = useState("PHP");
  const [form, setForm] = useState<ExpenseFormState>(() => emptyForm());
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expensesLoading, setExpensesLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionExpenseId, setActionExpenseId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formIssues, setFormIssues] = useState<string[]>([]);

  const filter = useMemo<ExpenseListFilter>(
    () => ({
      vehicleId: vehicleFilter === "all" ? undefined : vehicleFilter,
      category: categoryFilter === "all" ? undefined : (categoryFilter as ExpenseCategory),
      startDate: trimToUndefined(startDate),
      endDate: trimToUndefined(endDate),
    }),
    [categoryFilter, endDate, startDate, vehicleFilter],
  );

  const loadExpenses = useCallback(async (activeFilter: ExpenseListFilter) => {
    setExpensesLoading(true);
    setErrorMessage(null);

    try {
      const [expenseRecords, expenseSummary] = await Promise.all([
        listExpenses(activeFilter),
        getExpenseSummary(activeFilter),
      ]);
      setExpenses(expenseRecords);
      setSummary(expenseSummary);
    } catch (error) {
      setErrorMessage(messageFromError(error));
      setExpenses([]);
      setSummary(null);
    } finally {
      setExpensesLoading(false);
    }
  }, []);

  const loadPageData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const [vehicleRecords, settings] = await Promise.all([listVehicles(), getAppSettings()]);
      setVehicles(vehicleRecords);
      setCurrency(settings.settings.preferredCurrency);
      setForm((currentForm) => ({
        ...currentForm,
        vehicleId: currentForm.vehicleId || vehicleRecords[0]?.id || "",
      }));
    } catch (error) {
      setErrorMessage(messageFromError(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPageData();
  }, [loadPageData]);

  useEffect(() => {
    void loadExpenses(filter);
  }, [filter, loadExpenses]);

  const handleFieldChange = useCallback(
    <Field extends keyof ExpenseFormState>(field: Field, value: ExpenseFormState[Field]) => {
      setForm((currentForm) => ({ ...currentForm, [field]: value }));
      setFormIssues([]);
    },
    [],
  );

  const resetForm = useCallback(() => {
    setForm(emptyForm(vehicles[0]?.id));
    setEditingExpenseId(null);
    setFormIssues([]);
  }, [vehicles]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const prepared = prepareExpenseRequest(form);
      setFormIssues(prepared.errors);

      if (!prepared.request) {
        return;
      }

      setSaving(true);
      setErrorMessage(null);

      try {
        if (editingExpenseId) {
          await updateExpense(editingExpenseId, prepared.request);
        } else {
          await createExpense(prepared.request);
        }

        await loadExpenses(filter);
        resetForm();
      } catch (error) {
        setErrorMessage(messageFromError(error));
      } finally {
        setSaving(false);
      }
    },
    [editingExpenseId, filter, form, loadExpenses, resetForm],
  );

  const handleEdit = useCallback((expense: ExpenseRecord) => {
    setEditingExpenseId(expense.id);
    setFormIssues([]);
    setForm({
      vehicleId: expense.vehicleId ?? "",
      expenseDate: expense.expenseDate.slice(0, 10),
      category: expense.category as ExpenseCategory,
      description: expense.description,
      amount: String(expense.amount),
      relatedRecordType: (expense.relatedRecordType as RelatedRecordType | null) ?? "",
      relatedRecordId: expense.relatedRecordId ?? "",
      notes: expense.notes ?? "",
    });
  }, []);

  const handleArchive = useCallback(
    async (expenseId: string) => {
      setActionExpenseId(expenseId);
      setErrorMessage(null);

      try {
        await archiveExpense(expenseId);
        await loadExpenses(filter);

        if (editingExpenseId === expenseId) {
          resetForm();
        }
      } catch (error) {
        setErrorMessage(messageFromError(error));
      } finally {
        setActionExpenseId(null);
      }
    },
    [editingExpenseId, filter, loadExpenses, resetForm],
  );

  return (
    <div className="expenses-module">
      <section className="expenses-workspace">
        <div className="expenses-header">
          <div>
            <h2>Expenses</h2>
            <p>
              Track manual vehicle costs locally. Fuel and service costs stay in their source
              records and are summarized in Reports.
            </p>
          </div>

          <ExpenseFilters
            categoryFilter={categoryFilter}
            endDate={endDate}
            startDate={startDate}
            vehicleFilter={vehicleFilter}
            vehicles={vehicles}
            onCategoryFilterChange={setCategoryFilter}
            onEndDateChange={setEndDate}
            onStartDateChange={setStartDate}
            onVehicleFilterChange={setVehicleFilter}
          />
        </div>

        {loading ? <div className="maintenance-empty-note">Loading vehicles...</div> : null}

        {!loading && vehicles.length === 0 ? (
          <div className="maintenance-empty-note">
            Add a vehicle before recording expenses. Expense records work best when tied to a
            vehicle.
          </div>
        ) : null}

        {errorMessage ? <div className="inline-error">{errorMessage}</div> : null}

        <ExpenseSummaryCards currency={currency} summary={summary} />

        <div className="expenses-layout">
          <ExpenseForm
            editing={Boolean(editingExpenseId)}
            form={form}
            formIssues={formIssues}
            saving={saving}
            vehicles={vehicles}
            onCancelEdit={resetForm}
            onFieldChange={handleFieldChange}
            onSubmit={handleSubmit}
          />

          <ExpenseHistory
            actionExpenseId={actionExpenseId}
            currency={currency}
            expenses={expenses}
            loading={expensesLoading}
            onArchive={(expenseId) => void handleArchive(expenseId)}
            onEdit={handleEdit}
          />
        </div>
      </section>
    </div>
  );
}

function ExpenseFilters(props: {
  vehicles: VehicleRecord[];
  vehicleFilter: string;
  categoryFilter: string;
  startDate: string;
  endDate: string;
  onVehicleFilterChange: (value: string) => void;
  onCategoryFilterChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
}) {
  return (
    <div className="expense-filter-grid" aria-label="Expense filters">
      <label className="form-field">
        <span>Vehicle</span>
        <select
          value={props.vehicleFilter}
          onChange={(event) => props.onVehicleFilterChange(event.target.value)}
        >
          <option value="all">All vehicles</option>
          {props.vehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicle.vehicleName}
            </option>
          ))}
        </select>
      </label>

      <label className="form-field">
        <span>Category</span>
        <select
          value={props.categoryFilter}
          onChange={(event) => props.onCategoryFilterChange(event.target.value)}
        >
          <option value="all">All categories</option>
          {categoryOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="form-field">
        <span>From</span>
        <input
          type="date"
          value={props.startDate}
          onChange={(event) => props.onStartDateChange(event.target.value)}
        />
      </label>

      <label className="form-field">
        <span>To</span>
        <input
          type="date"
          value={props.endDate}
          onChange={(event) => props.onEndDateChange(event.target.value)}
        />
      </label>
    </div>
  );
}

function ExpenseSummaryCards({
  currency,
  summary,
}: {
  currency: string;
  summary: ExpenseSummaryReport | null;
}) {
  return (
    <div className="expense-summary-grid" aria-label="Expense summary">
      <SummaryMetric
        label="Manual total"
        value={formatMoney(summary?.manualExpenseTotal ?? 0, currency)}
      />
      <SummaryMetric
        label="Direct expense rows"
        value={formatMoney(summary?.directExpenseTotal ?? 0, currency)}
      />
      <SummaryMetric
        label="Linked source copies"
        value={formatMoney(summary?.linkedExpenseTotal ?? 0, currency)}
      />
      <SummaryMetric
        label="Expense records"
        value={(summary?.expenseCount ?? 0).toLocaleString()}
      />
    </div>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="expense-summary-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ExpenseForm(props: {
  editing: boolean;
  form: ExpenseFormState;
  formIssues: string[];
  saving: boolean;
  vehicles: VehicleRecord[];
  onCancelEdit: () => void;
  onFieldChange: <Field extends keyof ExpenseFormState>(
    field: Field,
    value: ExpenseFormState[Field],
  ) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="expense-form" onSubmit={props.onSubmit}>
      <div>
        <h3>{props.editing ? "Edit expense" : "Add manual expense"}</h3>
        <p>
          Use this for costs that are not already saved as a fuel log or completed maintenance
          service.
        </p>
      </div>

      <div className="expense-form-grid">
        <label className="form-field">
          <span>Vehicle</span>
          <select
            required
            value={props.form.vehicleId}
            onChange={(event) => props.onFieldChange("vehicleId", event.target.value)}
          >
            <option value="">Choose vehicle</option>
            {props.vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.vehicleName}
              </option>
            ))}
          </select>
        </label>

        <label className="form-field">
          <span>Expense date</span>
          <input
            required
            type="date"
            value={props.form.expenseDate}
            onChange={(event) => props.onFieldChange("expenseDate", event.target.value)}
          />
        </label>

        <label className="form-field">
          <span>Category</span>
          <select
            required
            value={props.form.category}
            onChange={(event) =>
              props.onFieldChange("category", event.target.value as ExpenseCategory)
            }
          >
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="form-field">
          <span>Amount</span>
          <input
            required
            min="0"
            step="0.01"
            type="number"
            value={props.form.amount}
            onChange={(event) => props.onFieldChange("amount", event.target.value)}
          />
        </label>

        <label className="form-field expense-form-wide">
          <span>Description</span>
          <input
            required
            type="text"
            value={props.form.description}
            onChange={(event) => props.onFieldChange("description", event.target.value)}
          />
        </label>

        <label className="form-field">
          <span>Linked record type</span>
          <select
            value={props.form.relatedRecordType}
            onChange={(event) =>
              props.onFieldChange(
                "relatedRecordType",
                event.target.value as ExpenseFormState["relatedRecordType"],
              )
            }
          >
            {relatedRecordOptions.map((option) => (
              <option key={option.value || "none"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="form-field">
          <span>Linked record ID</span>
          <input
            type="text"
            value={props.form.relatedRecordId}
            onChange={(event) => props.onFieldChange("relatedRecordId", event.target.value)}
          />
        </label>

        <label className="form-field expense-form-wide">
          <span>Notes</span>
          <textarea
            rows={3}
            value={props.form.notes}
            onChange={(event) => props.onFieldChange("notes", event.target.value)}
          />
        </label>
      </div>

      <div className="maintenance-action-note">
        Reports already include saved fuel logs and completed service costs. Linked expense copies
        are shown here but excluded from combined report totals.
      </div>

      {props.formIssues.length > 0 ? (
        <div className="inline-error">
          {props.formIssues.map((issue) => (
            <span key={issue}>{issue}</span>
          ))}
        </div>
      ) : null}

      <div className="form-actions">
        {props.editing ? (
          <button className="secondary-button" type="button" onClick={props.onCancelEdit}>
            Cancel edit
          </button>
        ) : null}
        <button className="primary-button" disabled={props.saving} type="submit">
          {props.saving ? "Saving..." : props.editing ? "Save expense" : "Add expense"}
        </button>
      </div>
    </form>
  );
}

function ExpenseHistory(props: {
  actionExpenseId: string | null;
  currency: string;
  expenses: ExpenseRecord[];
  loading: boolean;
  onArchive: (expenseId: string) => void;
  onEdit: (expense: ExpenseRecord) => void;
}) {
  return (
    <section className="expense-history-panel">
      <div>
        <h3>Expense history</h3>
        <p>Manual expenses are listed newest first. Archived rows stay out of this view.</p>
      </div>

      {props.loading ? <div className="maintenance-empty-note">Loading expenses...</div> : null}

      {!props.loading && props.expenses.length === 0 ? (
        <div className="maintenance-empty-note">No manual expenses match these filters yet.</div>
      ) : null}

      {!props.loading ? (
        <div className="expense-list">
          {props.expenses.map((expense) => (
            <ExpenseCard
              key={expense.id}
              actionExpenseId={props.actionExpenseId}
              currency={props.currency}
              expense={expense}
              onArchive={props.onArchive}
              onEdit={props.onEdit}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ExpenseCard(props: {
  actionExpenseId: string | null;
  currency: string;
  expense: ExpenseRecord;
  onArchive: (expenseId: string) => void;
  onEdit: (expense: ExpenseRecord) => void;
}) {
  return (
    <article className="expense-card">
      <div className="expense-card-main">
        <div className="maintenance-card-heading">
          <span className="maintenance-category">{formatDate(props.expense.expenseDate)}</span>
          <span className="priority-pill">{formatMoney(props.expense.amount, props.currency)}</span>
        </div>
        <h3>{props.expense.description}</h3>
        <p>{props.expense.vehicleName ?? "Vehicle not selected"}</p>
      </div>

      <div className="expense-card-meta">
        <span>{categoryLabel(props.expense.category)}</span>
        <span>{linkedRecordLabel(props.expense)}</span>
        <span>{props.expense.notes ?? "No notes"}</span>
      </div>

      <div className="expense-card-actions">
        <button
          className="secondary-button"
          type="button"
          onClick={() => props.onEdit(props.expense)}
        >
          Edit
        </button>
        <button
          className="danger-button"
          disabled={props.actionExpenseId === props.expense.id}
          type="button"
          onClick={() => props.onArchive(props.expense.id)}
        >
          {props.actionExpenseId === props.expense.id ? "Archiving..." : "Archive"}
        </button>
      </div>
    </article>
  );
}

function prepareExpenseRequest(form: ExpenseFormState): {
  errors: string[];
  request?: ExpenseMutationRequest;
} {
  const amount = parseNumber(form.amount);
  const errors: string[] = [];

  if (!form.vehicleId.trim()) {
    errors.push("Choose a vehicle before saving.");
  }

  if (!form.expenseDate.trim()) {
    errors.push("Expense date is required.");
  }

  if (form.relatedRecordType && !form.relatedRecordId.trim()) {
    errors.push("Enter the linked record ID or choose no linked source record.");
  }

  if (!form.relatedRecordType && form.relatedRecordId.trim()) {
    errors.push("Choose what kind of record this expense links to.");
  }

  const validation = validateExpense({
    description: form.description,
    amount: amount ?? Number.NaN,
  });
  const validationErrors = validation.issues
    .filter((issue) => issue.severity === "error")
    .map((issue) => issue.message);
  const allErrors = [...errors, ...validationErrors];

  if (allErrors.length > 0 || amount === undefined) {
    return { errors: allErrors };
  }

  return {
    errors: [],
    request: {
      vehicleId: form.vehicleId,
      expenseDate: form.expenseDate,
      category: form.category,
      description: form.description.trim(),
      amount,
      relatedRecordType: form.relatedRecordType || undefined,
      relatedRecordId: trimToUndefined(form.relatedRecordId),
      notes: trimToUndefined(form.notes),
    },
  };
}

function emptyForm(vehicleId = ""): ExpenseFormState {
  return {
    vehicleId,
    expenseDate: currentDateInputValue(),
    category: "other",
    description: "",
    amount: "",
    relatedRecordType: "",
    relatedRecordId: "",
    notes: "",
  };
}

function currentDateInputValue() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}

function parseNumber(value: string): number | undefined {
  if (value.trim() === "") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function trimToUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function formatDate(value: string) {
  return value.slice(0, 10);
}

function formatMoney(value: number, currency = "PHP") {
  return new Intl.NumberFormat(undefined, {
    currency,
    maximumFractionDigits: 2,
    style: "currency",
  }).format(value);
}

function categoryLabel(value: string) {
  return categoryOptions.find((option) => option.value === value)?.label ?? labelFromKey(value);
}

function linkedRecordLabel(expense: ExpenseRecord) {
  if (!expense.relatedRecordType || !expense.relatedRecordId) {
    return "Manual expense";
  }

  return `${labelFromKey(expense.relatedRecordType)}: ${expense.relatedRecordId}`;
}

function labelFromKey(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function messageFromError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
