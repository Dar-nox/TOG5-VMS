import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { FuelLogFuelType, VehicleFuelType } from "../../domain";
import { validateFuelLog } from "../../domain";
import {
  archiveFuelLog,
  createFuelLog,
  fuelReceiptUrl,
  getFuelEfficiencySummaryForVehicle,
  listFuelLogsForVehicle,
  storeFuelReceipt,
  updateFuelLog,
  type FuelEfficiencySummaryRecord,
  type FuelLogMutationRequest,
  type FuelLogRecord,
} from "../../services/api/fuel";
import { listVehicles, type VehicleRecord } from "../../services/api/vehicles";

type FuelFormState = {
  fuelDate: string;
  odometer: string;
  fuelType: FuelLogFuelType;
  liters: string;
  pricePerLiter: string;
  totalAmount: string;
  stationName: string;
  receiptNumber: string;
  receiptDocumentId: string;
  receiptFilename: string;
  isFullTank: boolean;
  notes: string;
};

const fuelTypeOptions: Array<{ value: FuelLogFuelType; label: string }> = [
  { value: "gasoline", label: "Gasoline" },
  { value: "diesel", label: "Diesel" },
  { value: "hybrid_gasoline", label: "Hybrid gasoline" },
  { value: "hybrid_diesel", label: "Hybrid diesel" },
  { value: "full_ev", label: "Electric / EV energy" },
  { value: "def_adblue", label: "DEF / AdBlue" },
  { value: "other", label: "Other" },
];

export function FuelLogsModule() {
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [fuelLogs, setFuelLogs] = useState<FuelLogRecord[]>([]);
  const [summary, setSummary] = useState<FuelEfficiencySummaryRecord | null>(null);
  const [form, setForm] = useState<FuelFormState>(() => emptyForm());
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionLogId, setActionLogId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formIssues, setFormIssues] = useState<string[]>([]);
  const [formWarnings, setFormWarnings] = useState<string[]>([]);

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === selectedVehicleId) ?? null,
    [selectedVehicleId, vehicles],
  );

  const latestFuelLogOdometer = useMemo(() => {
    const odometers = fuelLogs.filter((log) => log.id !== editingLogId).map((log) => log.odometer);

    return odometers.length > 0 ? Math.max(...odometers) : undefined;
  }, [editingLogId, fuelLogs]);

  const loadFuelData = useCallback(async (vehicleId: string) => {
    setLogsLoading(true);
    setErrorMessage(null);

    try {
      const [logs, fuelSummary] = await Promise.all([
        listFuelLogsForVehicle(vehicleId),
        getFuelEfficiencySummaryForVehicle(vehicleId),
      ]);
      setFuelLogs(logs);
      setSummary(fuelSummary);
    } catch (error) {
      setErrorMessage(messageFromError(error));
      setFuelLogs([]);
      setSummary(null);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  const resetFormForVehicle = useCallback((vehicle: VehicleRecord | null) => {
    setForm(emptyForm(vehicle));
    setReceiptFile(null);
    setEditingLogId(null);
    setFormIssues([]);
    setFormWarnings([]);
  }, []);

  const loadPageData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const vehicleRecords = await listVehicles();
      setVehicles(vehicleRecords);
      setSelectedVehicleId((currentId) => {
        if (currentId && vehicleRecords.some((vehicle) => vehicle.id === currentId)) {
          return currentId;
        }

        return vehicleRecords[0]?.id ?? "";
      });
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
    resetFormForVehicle(selectedVehicle);

    if (selectedVehicleId) {
      void loadFuelData(selectedVehicleId);
    } else {
      setFuelLogs([]);
      setSummary(null);
    }
  }, [loadFuelData, resetFormForVehicle, selectedVehicle, selectedVehicleId]);

  const handleFieldChange = useCallback(
    <Field extends keyof FuelFormState>(field: Field, value: FuelFormState[Field]) => {
      setForm((currentForm) => ({ ...currentForm, [field]: value }));
      setFormIssues([]);
      setFormWarnings([]);
    },
    [],
  );

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!selectedVehicle) {
        setFormIssues(["Choose a vehicle before saving a fuel log."]);
        return;
      }

      const prepared = prepareFuelRequest(
        form,
        selectedVehicle,
        latestFuelLogOdometer,
        receiptFile,
      );
      setFormIssues(prepared.errors);
      setFormWarnings(prepared.warnings);

      if (!prepared.request) {
        return;
      }

      setSaving(true);
      setErrorMessage(null);

      try {
        let receiptDocumentId = prepared.request.receiptDocumentId;

        if (receiptFile) {
          const receipt = await storeFuelReceipt(selectedVehicle.id, receiptFile);
          receiptDocumentId = receipt.id;
        }

        const request = { ...prepared.request, receiptDocumentId };

        if (editingLogId) {
          await updateFuelLog(editingLogId, request);
        } else {
          await createFuelLog(request);
        }

        await loadFuelData(selectedVehicle.id);
        resetFormForVehicle(selectedVehicle);
      } catch (error) {
        setErrorMessage(messageFromError(error));
      } finally {
        setSaving(false);
      }
    },
    [
      editingLogId,
      form,
      latestFuelLogOdometer,
      loadFuelData,
      receiptFile,
      resetFormForVehicle,
      selectedVehicle,
    ],
  );

  const handleEdit = useCallback((log: FuelLogRecord) => {
    setEditingLogId(log.id);
    setReceiptFile(null);
    setFormIssues([]);
    setFormWarnings([]);
    setForm({
      fuelDate: normalizeDateTimeInput(log.fuelDate),
      odometer: String(log.odometer),
      fuelType: log.fuelType,
      liters: String(log.liters),
      pricePerLiter: log.pricePerLiter == null ? "" : String(log.pricePerLiter),
      totalAmount: String(log.totalAmount),
      stationName: log.stationName ?? "",
      receiptNumber: log.receiptNumber ?? "",
      receiptDocumentId: log.receiptDocumentId ?? "",
      receiptFilename: log.receiptOriginalFilename ?? "",
      isFullTank: log.isFullTank,
      notes: log.notes ?? "",
    });
  }, []);

  const handleArchive = useCallback(
    async (logId: string) => {
      setActionLogId(logId);
      setErrorMessage(null);

      try {
        await archiveFuelLog(logId);

        if (selectedVehicleId) {
          await loadFuelData(selectedVehicleId);
        }

        if (editingLogId === logId) {
          resetFormForVehicle(selectedVehicle);
        }
      } catch (error) {
        setErrorMessage(messageFromError(error));
      } finally {
        setActionLogId(null);
      }
    },
    [editingLogId, loadFuelData, resetFormForVehicle, selectedVehicle, selectedVehicleId],
  );

  return (
    <div className="fuel-module">
      <section className="fuel-workspace">
        <div className="fuel-workspace-header">
          <div>
            <h2>Fuel Logs</h2>
            <p>
              Save local fuel receipts and odometer readings. Official efficiency is calculated only
              between valid full-tank logs.
            </p>
          </div>

          {vehicles.length > 0 ? (
            <label className="fuel-vehicle-select">
              <span>Vehicle</span>
              <select
                value={selectedVehicleId}
                onChange={(event) => setSelectedVehicleId(event.target.value)}
              >
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.vehicleName}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        {loading ? <div className="maintenance-empty-note">Loading vehicles...</div> : null}

        {!loading && vehicles.length === 0 ? (
          <div className="maintenance-empty-note">
            Add a vehicle before recording fuel logs. Fuel entries are always tied to a vehicle.
          </div>
        ) : null}

        {selectedVehicle ? (
          <>
            <div className="vehicle-rule-summary" aria-label="Selected vehicle fuel inputs">
              <span>{labelValue("Fuel", selectedVehicle.fuelType)}</span>
              <span>{labelValue("Vehicle type", selectedVehicle.vehicleType)}</span>
              <span>Odometer: {formatOdometer(selectedVehicle.currentOdometer)} km</span>
            </div>

            <FuelSummary summary={summary} />

            {errorMessage ? <div className="inline-error">{errorMessage}</div> : null}

            <div className="fuel-layout">
              <FuelLogForm
                editing={Boolean(editingLogId)}
                form={form}
                formIssues={formIssues}
                formWarnings={formWarnings}
                receiptFile={receiptFile}
                saving={saving}
                selectedVehicle={selectedVehicle}
                onCancelEdit={() => resetFormForVehicle(selectedVehicle)}
                onFieldChange={handleFieldChange}
                onReceiptChange={setReceiptFile}
                onSubmit={handleSubmit}
              />

              <FuelLogHistory
                actionLogId={actionLogId}
                fuelLogs={fuelLogs}
                loading={logsLoading}
                onArchive={(logId) => void handleArchive(logId)}
                onEdit={handleEdit}
              />
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}

function FuelSummary({ summary }: { summary: FuelEfficiencySummaryRecord | null }) {
  return (
    <div className="fuel-summary-grid" aria-label="Fuel efficiency summary">
      <div className="fuel-summary-card">
        <span>Official logs</span>
        <strong>{summary?.officialLogCount ?? 0}</strong>
      </div>
      <div className="fuel-summary-card">
        <span>Latest efficiency</span>
        <strong>{formatEfficiency(summary?.latestKmPerLiter)}</strong>
      </div>
      <div className="fuel-summary-card">
        <span>Recent average</span>
        <strong>{formatEfficiency(summary?.recentAverageKmPerLiter)}</strong>
      </div>
      <div className={`fuel-summary-card ${summary?.efficiencyDropDetected ? "warning" : ""}`}>
        <span>Efficiency alert</span>
        <strong>{summary?.efficiencyDropDetected ? "Drop detected" : "No drop"}</strong>
      </div>
      {summary?.warning ? <div className="fuel-summary-note">{summary.warning}</div> : null}
    </div>
  );
}

function FuelLogForm(props: {
  editing: boolean;
  form: FuelFormState;
  formIssues: string[];
  formWarnings: string[];
  receiptFile: File | null;
  saving: boolean;
  selectedVehicle: VehicleRecord;
  onCancelEdit: () => void;
  onFieldChange: <Field extends keyof FuelFormState>(
    field: Field,
    value: FuelFormState[Field],
  ) => void;
  onReceiptChange: (file: File | null) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="fuel-form" onSubmit={props.onSubmit}>
      <div>
        <h3>{props.editing ? "Edit fuel log" : "Add fuel log"}</h3>
        <p>
          Full-tank entries unlock official km/L once there is a previous full-tank log for this
          vehicle.
        </p>
      </div>

      <div className="fuel-form-grid">
        <label className="form-field">
          <span>Date and time</span>
          <input
            required
            type="datetime-local"
            value={props.form.fuelDate}
            onChange={(event) => props.onFieldChange("fuelDate", event.target.value)}
          />
        </label>

        <label className="form-field">
          <span>Odometer</span>
          <input
            required
            min="0"
            step="0.1"
            type="number"
            value={props.form.odometer}
            onChange={(event) => props.onFieldChange("odometer", event.target.value)}
          />
        </label>

        <label className="form-field">
          <span>Fuel type</span>
          <select
            value={props.form.fuelType}
            onChange={(event) =>
              props.onFieldChange("fuelType", event.target.value as FuelLogFuelType)
            }
          >
            {fuelTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="form-field">
          <span>Liters</span>
          <input
            required
            min="0.01"
            step="0.01"
            type="number"
            value={props.form.liters}
            onChange={(event) => props.onFieldChange("liters", event.target.value)}
          />
        </label>

        <label className="form-field">
          <span>Price per liter</span>
          <input
            min="0"
            step="0.01"
            type="number"
            value={props.form.pricePerLiter}
            onChange={(event) => props.onFieldChange("pricePerLiter", event.target.value)}
          />
        </label>

        <label className="form-field">
          <span>Total amount</span>
          <input
            min="0"
            step="0.01"
            type="number"
            value={props.form.totalAmount}
            onChange={(event) => props.onFieldChange("totalAmount", event.target.value)}
          />
        </label>
      </div>

      <label className="fuel-checkbox">
        <input
          checked={props.form.isFullTank}
          type="checkbox"
          onChange={(event) => props.onFieldChange("isFullTank", event.target.checked)}
        />
        <span>Full tank</span>
      </label>

      <div className="fuel-form-grid">
        <label className="form-field">
          <span>Station name</span>
          <input
            type="text"
            value={props.form.stationName}
            onChange={(event) => props.onFieldChange("stationName", event.target.value)}
          />
        </label>

        <label className="form-field">
          <span>Receipt number</span>
          <input
            type="text"
            value={props.form.receiptNumber}
            onChange={(event) => props.onFieldChange("receiptNumber", event.target.value)}
          />
        </label>
      </div>

      <label className="fuel-receipt-picker">
        <span>Receipt attachment</span>
        <input
          accept="image/png,image/jpeg,image/webp,application/pdf"
          type="file"
          onChange={(event) => props.onReceiptChange(event.target.files?.[0] ?? null)}
        />
        <small>
          {props.receiptFile?.name ??
            props.form.receiptFilename ??
            "PNG, JPG, WEBP, or PDF. Stored locally on this device."}
        </small>
      </label>

      <label className="form-field">
        <span>Notes</span>
        <textarea
          rows={3}
          value={props.form.notes}
          onChange={(event) => props.onFieldChange("notes", event.target.value)}
        />
      </label>

      {props.formIssues.length > 0 ? (
        <div className="inline-error">
          {props.formIssues.map((issue) => (
            <span key={issue}>{issue}</span>
          ))}
        </div>
      ) : null}

      {props.formWarnings.length > 0 ? (
        <div className="fuel-warning-list">
          {props.formWarnings.map((warning) => (
            <span key={warning}>{warning}</span>
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
          {props.saving ? "Saving..." : props.editing ? "Save fuel log" : "Add fuel log"}
        </button>
      </div>
    </form>
  );
}

function FuelLogHistory(props: {
  actionLogId: string | null;
  fuelLogs: FuelLogRecord[];
  loading: boolean;
  onArchive: (logId: string) => void;
  onEdit: (log: FuelLogRecord) => void;
}) {
  return (
    <section className="fuel-history-panel">
      <div>
        <h3>Fuel history</h3>
        <p>Newest entries appear first. Archived entries stay out of this list.</p>
      </div>

      {props.loading ? <div className="maintenance-empty-note">Loading fuel logs...</div> : null}

      {!props.loading && props.fuelLogs.length === 0 ? (
        <div className="maintenance-empty-note">
          No fuel logs yet. Add a partial or full-tank entry to start the history.
        </div>
      ) : null}

      {!props.loading ? (
        <div className="fuel-log-list">
          {props.fuelLogs.map((log) => (
            <FuelLogCard
              key={log.id}
              actionLogId={props.actionLogId}
              log={log}
              onArchive={props.onArchive}
              onEdit={props.onEdit}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function FuelLogCard(props: {
  actionLogId: string | null;
  log: FuelLogRecord;
  onArchive: (logId: string) => void;
  onEdit: (log: FuelLogRecord) => void;
}) {
  const receiptHref = fuelReceiptUrl(props.log.receiptFilePath);

  return (
    <article className="fuel-log-card">
      <div className="fuel-log-main">
        <div className="maintenance-card-heading">
          <span className="maintenance-category">{formatDateTime(props.log.fuelDate)}</span>
          <span className={`schedule-status-pill ${efficiencyStatusClass(props.log)}`}>
            {efficiencyStatusLabel(props.log)}
          </span>
        </div>

        <h3>
          {formatOdometer(props.log.odometer)} km / {labelValue("", props.log.fuelType)}
        </h3>
        <p>{props.log.efficiencyReason}</p>

        {props.log.warnings.length > 0 ? (
          <div className="fuel-warning-list">
            {props.log.warnings.map((warning) => (
              <span key={`${props.log.id}-${warning.code}`}>{warning.message}</span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="fuel-log-meta">
        <span>{props.log.liters.toLocaleString()} L</span>
        <span>Total: {formatMoney(props.log.totalAmount)}</span>
        <span>Price/L: {formatMoney(props.log.pricePerLiter)}</span>
        <span>{props.log.isFullTank ? "Full tank" : "Partial tank"}</span>
        <span>{formatEfficiency(props.log.computedKmPerLiter)}</span>
        <span>{formatCostPerKm(props.log.computedCostPerKm)}</span>
        <span>
          {receiptHref ? (
            <a href={receiptHref} rel="noreferrer" target="_blank">
              {props.log.receiptOriginalFilename ?? "Receipt stored"}
            </a>
          ) : (
            "No receipt"
          )}
        </span>
      </div>

      {props.log.notes ? <div className="maintenance-action-note">{props.log.notes}</div> : null}

      <div className="fuel-log-actions">
        <button className="secondary-button" type="button" onClick={() => props.onEdit(props.log)}>
          Edit
        </button>
        <button
          className="danger-button"
          disabled={props.actionLogId === props.log.id}
          type="button"
          onClick={() => props.onArchive(props.log.id)}
        >
          {props.actionLogId === props.log.id ? "Archiving..." : "Archive"}
        </button>
      </div>
    </article>
  );
}

function prepareFuelRequest(
  form: FuelFormState,
  selectedVehicle: VehicleRecord,
  latestFuelLogOdometer: number | undefined,
  receiptFile: File | null,
): {
  errors: string[];
  warnings: string[];
  request?: FuelLogMutationRequest;
} {
  const odometer = parseNumber(form.odometer);
  const liters = parseNumber(form.liters);
  let pricePerLiter = parseOptionalNumber(form.pricePerLiter);
  let totalAmount = parseOptionalNumber(form.totalAmount);
  const errors: string[] = [];

  if (liters !== undefined && totalAmount === undefined && pricePerLiter !== undefined) {
    totalAmount = pricePerLiter * liters;
  }

  if (liters !== undefined && pricePerLiter === undefined && totalAmount !== undefined) {
    pricePerLiter = totalAmount / liters;
  }

  if (totalAmount === undefined) {
    errors.push("Enter total amount or price per liter.");
  }

  const validation = validateFuelLog({
    odometer,
    previousOdometer: latestFuelLogOdometer,
    fuelType: form.fuelType,
    vehicleFuelType: selectedVehicle.fuelType,
    liters,
    totalAmount,
    pricePerLiter,
    isFullTank: form.isFullTank,
  });
  const validationErrors = validation.issues
    .filter((issue) => issue.severity === "error")
    .map((issue) => issue.message);
  const validationWarnings = validation.issues
    .filter((issue) => issue.severity !== "error")
    .map((issue) => issue.message);

  if (form.fuelType === "def_adblue") {
    validationWarnings.push("DEF/AdBlue will be saved but not counted as diesel fuel consumption.");
  }

  if (!form.isFullTank) {
    validationWarnings.push("Partial tank logs are saved, but they are not official efficiency.");
  }

  if (receiptFile && receiptFile.size > 10 * 1024 * 1024) {
    errors.push("Receipt files must be 10 MB or smaller.");
  }

  const allErrors = [...errors, ...validationErrors];

  if (
    allErrors.length > 0 ||
    odometer === undefined ||
    liters === undefined ||
    totalAmount === undefined
  ) {
    return { errors: allErrors, warnings: validationWarnings };
  }

  return {
    errors: [],
    warnings: validationWarnings,
    request: {
      vehicleId: selectedVehicle.id,
      fuelDate: form.fuelDate,
      odometer,
      fuelType: form.fuelType,
      liters,
      pricePerLiter,
      totalAmount,
      stationName: trimToUndefined(form.stationName),
      receiptNumber: trimToUndefined(form.receiptNumber),
      receiptDocumentId: trimToUndefined(form.receiptDocumentId),
      isFullTank: form.isFullTank,
      notes: trimToUndefined(form.notes),
    },
  };
}

function emptyForm(vehicle?: VehicleRecord | null): FuelFormState {
  return {
    fuelDate: currentDateTimeInputValue(),
    odometer: vehicle ? String(vehicle.currentOdometer) : "",
    fuelType: vehicle ? fuelTypeFromVehicle(vehicle.fuelType) : "gasoline",
    liters: "",
    pricePerLiter: "",
    totalAmount: "",
    stationName: "",
    receiptNumber: "",
    receiptDocumentId: "",
    receiptFilename: "",
    isFullTank: true,
    notes: "",
  };
}

function fuelTypeFromVehicle(fuelType: VehicleFuelType): FuelLogFuelType {
  return fuelType;
}

function parseNumber(value: string): number | undefined {
  if (value.trim() === "") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseOptionalNumber(value: string): number | undefined {
  return parseNumber(value);
}

function trimToUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function currentDateTimeInputValue() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

function normalizeDateTimeInput(value: string) {
  return value.slice(0, 16);
}

function formatDateTime(value: string) {
  return value.replace("T", " ").slice(0, 16);
}

function formatOdometer(value: number) {
  return Math.round(value).toLocaleString();
}

function formatMoney(value?: number | null) {
  if (value == null) {
    return "--";
  }

  return new Intl.NumberFormat(undefined, {
    currency: "PHP",
    maximumFractionDigits: 2,
    style: "currency",
  }).format(value);
}

function formatEfficiency(value?: number | null) {
  return value == null ? "-- km/L" : `${value.toFixed(2)} km/L`;
}

function formatCostPerKm(value?: number | null) {
  return value == null ? "-- / km" : `${formatMoney(value)} / km`;
}

function efficiencyStatusLabel(log: FuelLogRecord) {
  if (log.efficiencyStatus === "official") {
    return "Official";
  }

  return log.isFullTank ? "Waiting" : "Partial";
}

function efficiencyStatusClass(log: FuelLogRecord) {
  if (log.efficiencyStatus === "official") {
    return "not_due";
  }

  return log.isFullTank ? "needs_setup" : "due_soon";
}

function labelValue(label: string, value: string) {
  const formatted = value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return label ? `${label}: ${formatted}` : formatted;
}

function messageFromError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
