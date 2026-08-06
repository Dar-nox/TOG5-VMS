import { useCallback, useEffect, useRef, useState } from "react";
import { useConfirm } from "../../../app/providers/confirmContext";
import { useFormat } from "../../../app/providers/formatContext";
import { useToast } from "../../../app/providers/toastContext";
import { validateFuelLog } from "../../../domain";
import type { FuelLogFuelType } from "../../../domain";
import { messageFromError } from "../../../lib/errors";
import { trimToUndefined } from "../../../lib/text";
import {
  archiveFuelLog,
  createFuelLog,
  getFuelEfficiencySummaryForVehicle,
  listFuelLogsForVehicle,
  storeFuelReceipt,
  updateFuelLog,
  type FuelEfficiencySummaryRecord,
  type FuelLogMutationRequest,
  type FuelLogRecord,
} from "../../../services/api/fuel";
import type { VehicleRecord } from "../../../services/api/vehicles";
import { Badge } from "../../ui/Badge";
import { Button, ButtonRow } from "../../ui/Button";
import { Card, CardHeader, Stat, StatRow } from "../../ui/Card";
import { DataList, DataRow, MetaItem } from "../../ui/DataRow";
import {
  CheckboxField,
  CurrencyField,
  DateTimeField,
  FieldGrid,
  FieldGridFull,
  NumberField,
  SelectField,
  TextAreaField,
  TextField,
} from "../../ui/Field";
import { SkeletonRows } from "../../ui/Spinner";
import { EmptyState, ErrorBlock, ErrorSummary } from "../../ui/States";
import { Attachment } from "./Attachment";
import { ReceiptField } from "./ReceiptField";

const FUEL_TYPES: Array<{ value: FuelLogFuelType; label: string }> = [
  { value: "gasoline", label: "Gasoline" },
  { value: "diesel", label: "Diesel" },
  { value: "hybrid_gasoline", label: "Hybrid gasoline" },
  { value: "hybrid_diesel", label: "Hybrid diesel" },
  { value: "full_ev", label: "Electric / EV energy" },
  { value: "def_adblue", label: "DEF / AdBlue" },
  { value: "other", label: "Other" },
];

type FormState = {
  fuelDate: string;
  odometer: string;
  fuelType: FuelLogFuelType;
  liters: string;
  pricePerLiter: string;
  totalAmount: string;
  stationName: string;
  receiptNumber: string;
  isFullTank: boolean;
  notes: string;
};

function emptyForm(vehicle: VehicleRecord): FormState {
  return {
    fuelDate: nowForInput(),
    odometer: String(vehicle.currentOdometer),
    fuelType: vehicle.fuelType,
    liters: "",
    pricePerLiter: "",
    totalAmount: "",
    stationName: "",
    receiptNumber: "",
    isFullTank: true,
    notes: "",
  };
}

export function FuelTab({ vehicle }: { vehicle: VehicleRecord }) {
  const fmt = useFormat();
  const confirm = useConfirm();
  const toast = useToast();

  const [logs, setLogs] = useState<FuelLogRecord[]>([]);
  const [summary, setSummary] = useState<FuelEfficiencySummaryRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<FuelLogRecord | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(() => emptyForm(vehicle));
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [issues, setIssues] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const formRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const [records, efficiency] = await Promise.all([
        listFuelLogsForVehicle(vehicle.id),
        getFuelEfficiencySummaryForVehicle(vehicle.id),
      ]);

      setLogs(records);
      setSummary(efficiency);
      setError(null);
    } catch (caught) {
      setError(messageFromError(caught));
    } finally {
      setLoading(false);
    }
  }, [vehicle.id]);

  useEffect(() => {
    void load();
  }, [load]);

  // Newest first, so the first row is the reading a new entry must exceed.
  const latestOdometer = logs.length > 0 ? logs[0].odometer : undefined;

  function openForm(log?: FuelLogRecord) {
    setEditing(log ?? null);
    setReceiptFile(null);
    setIssues([]);
    setWarnings([]);
    setForm(
      log
        ? {
            fuelDate: log.fuelDate.slice(0, 16),
            odometer: String(log.odometer),
            fuelType: log.fuelType,
            liters: String(log.liters),
            pricePerLiter: log.pricePerLiter == null ? "" : String(log.pricePerLiter),
            totalAmount: String(log.totalAmount),
            stationName: log.stationName ?? "",
            receiptNumber: log.receiptNumber ?? "",
            isFullTank: log.isFullTank,
            notes: log.notes ?? "",
          }
        : emptyForm(vehicle),
    );
    setFormOpen(true);

    // Tapping Edit on the twentieth log used to do nothing you could see — the
    // form was a permanently visible column somewhere above, and nothing moved.
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
    setReceiptFile(null);
    setIssues([]);
    setWarnings([]);
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSave() {
    const prepared = prepare(form, vehicle, latestOdometer, receiptFile);
    setIssues(prepared.errors);
    setWarnings(prepared.warnings);

    if (!prepared.request) {
      return;
    }

    setSaving(true);

    try {
      let receiptDocumentId = prepared.request.receiptDocumentId;

      if (receiptFile) {
        const receipt = await storeFuelReceipt(vehicle.id, receiptFile);
        receiptDocumentId = receipt.id;
      }

      const request = { ...prepared.request, receiptDocumentId };

      if (editing) {
        await updateFuelLog(editing.id, request);
      } else {
        await createFuelLog(request);
      }

      await load();
      closeForm();
      toast.success(editing ? "Fuel log updated." : "Fuel log saved.");
    } catch (caught) {
      toast.error(messageFromError(caught));
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(log: FuelLogRecord) {
    // This had no confirmation of any kind: one tap and the record was gone.
    // A fuel log also moves the vehicle's odometer, so removing one is not
    // only about the row you can see.
    const confirmed = await confirm({
      title: "Archive this fuel log?",
      body: `${fmt.date(log.fuelDate)}, ${fmt.volume(log.liters)} for ${fmt.money(log.totalAmount)}. It will be left out of fuel efficiency and cost reports, and cannot be brought back from the app.`,
      confirmLabel: "Archive log",
    });

    if (!confirmed) {
      return;
    }

    setBusyId(log.id);

    try {
      await archiveFuelLog(log.id);
      await load();
      toast.success("Fuel log archived.");
    } catch (caught) {
      toast.error(messageFromError(caught));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {summary && summary.officialLogCount > 0 ? (
        <Card>
          <StatRow>
            <Stat label="Latest" value={fmt.efficiency(summary.latestKmPerLiter)} />
            <Stat label="Recent average" value={fmt.efficiency(summary.recentAverageKmPerLiter)} />
            <Stat label="Full-tank logs" value={summary.officialLogCount} />
          </StatRow>

          {summary.efficiencyDropDetected && summary.warning ? (
            <p className="mt-4 rounded-md border border-due-line bg-due-surface p-3 text-sm text-due">
              {summary.warning}
            </p>
          ) : null}
        </Card>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-heading">Fuel</h2>
        {formOpen ? null : (
          <Button onClick={() => openForm()} variant="primary">
            Log fuel
          </Button>
        )}
      </div>

      {error ? <ErrorBlock message={error} /> : null}

      <div ref={formRef}>
        {formOpen ? (
          <Card>
            <CardHeader title={editing ? "Edit fuel log" : "Log fuel"} />

            <div className="flex flex-col gap-4">
              <ErrorSummary issues={issues} />

              <FieldGrid>
                <DateTimeField
                  label="Date and time"
                  onChange={(value) => update("fuelDate", value)}
                  required
                  value={form.fuelDate}
                />
                <NumberField
                  hint={
                    latestOdometer == null
                      ? undefined
                      : `Last recorded: ${fmt.distance(latestOdometer)}`
                  }
                  label="Odometer"
                  onChange={(value) => update("odometer", value)}
                  required
                  unit={fmt.distanceLabel}
                  value={form.odometer}
                />
                <NumberField
                  label="Liters"
                  onChange={(value) => update("liters", value)}
                  required
                  step={0.001}
                  unit="L"
                  value={form.liters}
                />
                <SelectField
                  label="Fuel type"
                  onChange={(value) => update("fuelType", value as FuelLogFuelType)}
                  options={FUEL_TYPES}
                  value={form.fuelType}
                />
                <CurrencyField
                  hint="Fill in either this or the total. The other is worked out."
                  label="Price per liter"
                  onChange={(value) => update("pricePerLiter", value)}
                  optional
                  value={form.pricePerLiter}
                />
                <CurrencyField
                  label="Total amount"
                  onChange={(value) => update("totalAmount", value)}
                  optional
                  value={form.totalAmount}
                />

                <FieldGridFull>
                  <CheckboxField
                    checked={form.isFullTank}
                    hint="Fuel efficiency can only be worked out between two full-tank fill-ups."
                    label="Filled the tank right up"
                    onChange={(value) => update("isFullTank", value)}
                  />
                </FieldGridFull>

                <TextField
                  label="Station"
                  onChange={(value) => update("stationName", value)}
                  optional
                  value={form.stationName}
                />
                <TextField
                  label="Receipt number"
                  onChange={(value) => update("receiptNumber", value)}
                  optional
                  value={form.receiptNumber}
                />

                <FieldGridFull>
                  <ReceiptField file={receiptFile} label="Receipt" onChange={setReceiptFile} />
                </FieldGridFull>

                <FieldGridFull>
                  <TextAreaField
                    label="Notes"
                    onChange={(value) => update("notes", value)}
                    optional
                    value={form.notes}
                  />
                </FieldGridFull>
              </FieldGrid>

              {warnings.length > 0 ? (
                <div className="rounded-md border border-due-line bg-due-surface p-3 text-sm text-due">
                  <ul className="flex list-disc flex-col gap-1 pl-4">
                    {warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <ButtonRow>
                <Button onClick={closeForm}>Cancel</Button>
                <Button loading={saving} onClick={() => void handleSave()} variant="primary">
                  {editing ? "Save changes" : "Save fuel log"}
                </Button>
              </ButtonRow>
            </div>
          </Card>
        ) : null}
      </div>

      {loading ? (
        <SkeletonRows rows={3} />
      ) : logs.length === 0 ? (
        <EmptyState
          action={
            formOpen ? undefined : (
              <Button onClick={() => openForm()} variant="primary">
                Log the first fill-up
              </Button>
            )
          }
          title="No fuel logged for this vehicle yet."
        />
      ) : (
        <DataList>
          {logs.map((log) => (
            <DataRow
              actions={
                <>
                  <Attachment label="Receipt" path={log.receiptFilePath} />
                  <Button onClick={() => openForm(log)} variant="quiet">
                    Edit
                  </Button>
                  <Button
                    loading={busyId === log.id}
                    onClick={() => void handleArchive(log)}
                    variant="quiet"
                  >
                    Archive
                  </Button>
                </>
              }
              key={log.id}
              meta={
                <>
                  <MetaItem label="Odometer" numeric value={fmt.distance(log.odometer)} />
                  <MetaItem label="Volume" numeric value={fmt.volume(log.liters)} />
                  <MetaItem label="Total" numeric value={fmt.money(log.totalAmount)} />
                  <MetaItem
                    label="Efficiency"
                    numeric
                    value={fmt.efficiency(log.computedKmPerLiter)}
                  />
                  {log.stationName ? <MetaItem label="Station" value={log.stationName} /> : null}
                </>
              }
              title={
                <span className="flex flex-wrap items-center gap-2">
                  <span className="tabular">{fmt.dateTime(log.fuelDate)}</span>
                  {log.efficiencyStatus === "official" ? (
                    <Badge tone="ok">Full tank</Badge>
                  ) : (
                    <Badge tone="neutral">Partial</Badge>
                  )}
                </span>
              }
            />
          ))}
        </DataList>
      )}
    </div>
  );
}

/** `YYYY-MM-DDTHH:mm` in local time, which is what the inputs and API expect. */
function nowForInput(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

function parse(value: string): number | undefined {
  if (value.trim() === "") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Unchanged from the original, including which of price and total is derived
 * from the other and the two standing warnings. The rules are the same rules;
 * only the way they are shown has changed.
 */
function prepare(
  form: FormState,
  vehicle: VehicleRecord,
  previousOdometer: number | undefined,
  receiptFile: File | null,
): { errors: string[]; warnings: string[]; request?: FuelLogMutationRequest } {
  const odometer = parse(form.odometer);
  const liters = parse(form.liters);
  let pricePerLiter = parse(form.pricePerLiter);
  let totalAmount = parse(form.totalAmount);
  const errors: string[] = [];

  if (liters !== undefined && totalAmount === undefined && pricePerLiter !== undefined) {
    totalAmount = pricePerLiter * liters;
  }

  if (liters !== undefined && pricePerLiter === undefined && totalAmount !== undefined) {
    pricePerLiter = totalAmount / liters;
  }

  if (totalAmount === undefined) {
    errors.push("Enter the total amount, or the price per liter.");
  }

  const validation = validateFuelLog({
    odometer,
    previousOdometer,
    fuelType: form.fuelType,
    vehicleFuelType: vehicle.fuelType,
    liters,
    totalAmount,
    pricePerLiter,
    isFullTank: form.isFullTank,
  });

  const validationErrors = validation.issues
    .filter((issue) => issue.severity === "error")
    .map((issue) => issue.message);
  const warnings = validation.issues
    .filter((issue) => issue.severity !== "error")
    .map((issue) => issue.message);

  if (form.fuelType === "def_adblue") {
    warnings.push("DEF/AdBlue is saved, but not counted as fuel used.");
  }

  if (!form.isFullTank) {
    warnings.push("A partial fill is saved, but does not count towards fuel efficiency.");
  }

  if (receiptFile && receiptFile.size > 10 * 1024 * 1024) {
    errors.push("Receipts must be 10 MB or smaller.");
  }

  const allErrors = [...errors, ...validationErrors];

  if (
    allErrors.length > 0 ||
    odometer === undefined ||
    liters === undefined ||
    totalAmount === undefined
  ) {
    return { errors: allErrors, warnings };
  }

  return {
    errors: [],
    warnings,
    request: {
      vehicleId: vehicle.id,
      fuelDate: form.fuelDate,
      odometer,
      fuelType: form.fuelType,
      liters,
      pricePerLiter,
      totalAmount,
      stationName: trimToUndefined(form.stationName),
      receiptNumber: trimToUndefined(form.receiptNumber),
      isFullTank: form.isFullTank,
      notes: trimToUndefined(form.notes),
    },
  };
}
