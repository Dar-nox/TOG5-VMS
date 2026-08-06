import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useConfirm } from "../../../app/providers/confirmContext";
import { useFormat } from "../../../app/providers/formatContext";
import { useToast } from "../../../app/providers/toastContext";
import type { ExpenseCategory } from "../../../domain";
import { messageFromError } from "../../../lib/errors";
import { routes } from "../../../lib/routes";
import { labelFromKey, trimToUndefined } from "../../../lib/text";
import {
  archiveExpense,
  createExpense,
  listExpensesForVehicle,
  updateExpense,
  type ExpenseMutationRequest,
  type ExpenseRecord,
} from "../../../services/api/expenses";
import { Badge } from "../../ui/Badge";
import { Button, ButtonRow } from "../../ui/Button";
import { Card, CardHeader } from "../../ui/Card";
import { DataList, DataRow, MetaItem } from "../../ui/DataRow";
import {
  CurrencyField,
  DateField,
  FieldGrid,
  FieldGridFull,
  SelectField,
  TextAreaField,
  TextField,
} from "../../ui/Field";
import { SkeletonRows } from "../../ui/Spinner";
import { EmptyState, ErrorBlock, ErrorSummary } from "../../ui/States";

const CATEGORIES: Array<{ value: string; label: string }> = [
  { value: "preventive_maintenance", label: "Preventive maintenance" },
  { value: "repairs", label: "Repairs" },
  { value: "parts", label: "Parts" },
  { value: "labor", label: "Labor" },
  { value: "registration", label: "Registration" },
  { value: "insurance", label: "Insurance" },
  { value: "cleaning", label: "Cleaning" },
  { value: "tires", label: "Tires" },
  { value: "emergency", label: "Emergency" },
  { value: "fuel", label: "Fuel" },
];

type FormState = {
  expenseDate: string;
  category: string;
  description: string;
  amount: string;
  notes: string;
};

function emptyForm(): FormState {
  return {
    expenseDate: new Date().toISOString().slice(0, 10),
    category: "repairs",
    description: "",
    amount: "",
    notes: "",
  };
}

/**
 * Costs recorded by hand for this vehicle.
 *
 * Everything here is something somebody typed. Fuel and completed service
 * carry their own costs and are counted in Reports from those records — which
 * the old screen explained in a paragraph at the top, then explained again in
 * an info box inside the same form eighty lines further down.
 */
export function ExpensesTab({ vehicleId }: { vehicleId: string }) {
  const fmt = useFormat();
  const confirm = useConfirm();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseRecord | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [issues, setIssues] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const formRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      setExpenses(await listExpensesForVehicle(vehicleId));
      setError(null);
    } catch (caught) {
      setError(messageFromError(caught));
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Arrived from "Add cost" on an open trip: the toll or the parking fee is
  // booked against it. See FuelTab for the same pattern.
  const fromTrip = searchParams.get("trip") ?? undefined;

  useEffect(() => {
    if (fromTrip) {
      openForm();
    }
  }, [fromTrip]);

  function openForm(expense?: ExpenseRecord) {
    setEditing(expense ?? null);
    setIssues([]);
    setForm(
      expense
        ? {
            expenseDate: expense.expenseDate.slice(0, 10),
            category: expense.category,
            description: expense.description,
            amount: String(expense.amount),
            notes: expense.notes ?? "",
          }
        : emptyForm(),
    );
    setFormOpen(true);

    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSave() {
    const amount = Number(form.amount);
    const problems: string[] = [];

    if (!form.description.trim()) {
      problems.push("Say what the cost was for.");
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      problems.push("Enter an amount greater than zero.");
    }

    if (!form.expenseDate) {
      problems.push("Choose the date of the expense.");
    }

    setIssues(problems);

    if (problems.length > 0) {
      return;
    }

    const request: ExpenseMutationRequest = {
      vehicleId,
      expenseDate: form.expenseDate,
      category: form.category as ExpenseCategory,
      description: form.description.trim(),
      amount,
      tripId: fromTrip,
      notes: trimToUndefined(form.notes),
    };

    setSaving(true);

    try {
      if (editing) {
        await updateExpense(editing.id, request);
      } else {
        await createExpense(request);
      }

      await load();
      setFormOpen(false);
      setEditing(null);
      toast.success(editing ? "Expense updated." : "Expense saved.");

      if (fromTrip) {
        navigate(routes.vehicle(vehicleId, "trips"));
      }
    } catch (caught) {
      toast.error(messageFromError(caught));
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(expense: ExpenseRecord) {
    // Another that went on a single tap with nothing asked.
    const confirmed = await confirm({
      title: "Archive this expense?",
      body: `${expense.description} — ${fmt.money(expense.amount)} on ${fmt.date(expense.expenseDate)}. It will be left out of cost reports, and cannot be brought back from the app.`,
      confirmLabel: "Archive expense",
    });

    if (!confirmed) {
      return;
    }

    setBusyId(expense.id);

    try {
      await archiveExpense(expense.id);
      await load();
      toast.success("Expense archived.");
    } catch (caught) {
      toast.error(messageFromError(caught));
    } finally {
      setBusyId(null);
    }
  }

  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-heading">
          Expenses
          {expenses.length > 0 ? (
            <span className="tabular ml-3 text-sm font-normal text-muted">
              {fmt.money(total)} recorded
            </span>
          ) : null}
        </h2>
        {formOpen ? null : (
          <Button onClick={() => openForm()} variant="primary">
            Add expense
          </Button>
        )}
      </div>

      {error ? <ErrorBlock message={error} /> : null}

      <div ref={formRef}>
        {formOpen ? (
          <Card>
            <CardHeader title={editing ? "Edit expense" : "Add expense"} />

            <div className="flex flex-col gap-4">
              <ErrorSummary issues={issues} />

              <FieldGrid>
                <FieldGridFull>
                  <TextField
                    label="What was it for"
                    onChange={(value) => update("description", value)}
                    placeholder="New battery"
                    required
                    value={form.description}
                  />
                </FieldGridFull>

                <CurrencyField
                  label="Amount"
                  onChange={(value) => update("amount", value)}
                  required
                  value={form.amount}
                />
                <DateField
                  label="Date"
                  onChange={(value) => update("expenseDate", value)}
                  required
                  value={form.expenseDate}
                />
                <SelectField
                  label="Category"
                  onChange={(value) => update("category", value)}
                  options={CATEGORIES}
                  value={form.category}
                />

                <FieldGridFull>
                  <TextAreaField
                    label="Notes"
                    onChange={(value) => update("notes", value)}
                    optional
                    value={form.notes}
                  />
                </FieldGridFull>
              </FieldGrid>

              <ButtonRow>
                <Button onClick={() => setFormOpen(false)}>Cancel</Button>
                <Button loading={saving} onClick={() => void handleSave()} variant="primary">
                  {editing ? "Save changes" : "Save expense"}
                </Button>
              </ButtonRow>
            </div>
          </Card>
        ) : null}
      </div>

      {loading ? (
        <SkeletonRows rows={3} />
      ) : expenses.length === 0 ? (
        <EmptyState
          action={
            formOpen ? undefined : (
              <Button onClick={() => openForm()} variant="primary">
                Add the first expense
              </Button>
            )
          }
          title="No costs recorded by hand for this vehicle."
        />
      ) : (
        <DataList>
          {expenses.map((expense) => (
            <DataRow
              actions={
                <>
                  <Button onClick={() => openForm(expense)} variant="quiet">
                    Edit
                  </Button>
                  <Button
                    loading={busyId === expense.id}
                    onClick={() => void handleArchive(expense)}
                    variant="quiet"
                  >
                    Archive
                  </Button>
                </>
              }
              key={expense.id}
              meta={
                <>
                  <MetaItem label="Amount" numeric value={fmt.money(expense.amount)} />
                  <MetaItem label="Date" numeric value={fmt.date(expense.expenseDate)} />
                </>
              }
              subtitle={expense.notes ?? undefined}
              title={
                <span className="flex flex-wrap items-center gap-2">
                  {expense.description}
                  <Badge tone="neutral">{labelFromKey(expense.category)}</Badge>
                </span>
              }
            />
          ))}
        </DataList>
      )}
    </div>
  );
}
