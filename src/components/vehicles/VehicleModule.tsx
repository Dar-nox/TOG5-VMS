import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent, ReactNode, RefObject } from "react";
import {
  validateVehicleCreation,
  type Drivetrain,
  type TransmissionType,
  type ValidationIssue,
  type VehicleFuelType,
  type VehicleStatus,
  type VehicleType,
} from "../../domain";
import {
  archiveVehicle,
  createVehicle,
  listVehicles,
  storeVehiclePhoto,
  updateVehicle,
  type VehicleMutationRequest,
  type VehicleRecord,
} from "../../services/api/vehicles";
import { useManagedFileUrl } from "../../services/files/useManagedFileUrl";
import {
  listMaintenanceSchedulesForVehicle,
  listVehicleMaintenanceSettings,
  type MaintenanceScheduleRecord,
  type VehicleMaintenanceSettingRecord,
} from "../../services/api/maintenance";

type EditableVehicleStatus = Exclude<VehicleStatus, "archived">;
type ViewMode = "profile" | "create" | "edit";

type VehicleFormState = {
  vehicleName: string;
  plateNumber: string;
  vehicleType: VehicleType | "";
  fuelType: VehicleFuelType | "";
  transmissionType: TransmissionType;
  drivetrain: Drivetrain;
  currentOdometer: string;
  status: EditableVehicleStatus;
  notes: string;
  primaryPhotoId: string;
  primaryPhotoName: string;
  primaryPhotoPath?: string;
};

const vehicleTypeOptions: Array<{ value: VehicleType; label: string }> = [
  { value: "sedan", label: "Sedan" },
  { value: "suv", label: "SUV" },
  { value: "van", label: "Van" },
  { value: "truck", label: "Truck" },
  { value: "bus", label: "Bus" },
  { value: "motorcycle", label: "Motorcycle" },
  { value: "other", label: "Other" },
];

const fuelTypeOptions: Array<{ value: VehicleFuelType; label: string }> = [
  { value: "gasoline", label: "Gasoline" },
  { value: "diesel", label: "Diesel" },
  { value: "hybrid_gasoline", label: "Hybrid gasoline" },
  { value: "hybrid_diesel", label: "Hybrid diesel" },
  { value: "full_ev", label: "Full EV" },
  { value: "other", label: "Other" },
];

const transmissionOptions: Array<{ value: TransmissionType; label: string }> = [
  { value: "unknown", label: "Unknown" },
  { value: "manual", label: "Manual" },
  { value: "automatic", label: "Automatic" },
  { value: "cvt", label: "CVT" },
  { value: "dct", label: "DCT" },
  { value: "none", label: "None" },
];

const drivetrainOptions: Array<{ value: Drivetrain; label: string }> = [
  { value: "unknown", label: "Unknown" },
  { value: "fwd", label: "Front-wheel drive" },
  { value: "rwd", label: "Rear-wheel drive" },
  { value: "awd", label: "All-wheel drive" },
  { value: "4wd", label: "4-wheel drive" },
  { value: "none", label: "None" },
];

const statusOptions: Array<{ value: EditableVehicleStatus; label: string }> = [
  { value: "active", label: "Active" },
  { value: "under_maintenance", label: "Under maintenance" },
  { value: "inactive", label: "Inactive" },
  { value: "sold_disposed", label: "Sold / disposed" },
];

const emptyForm: VehicleFormState = {
  vehicleName: "",
  plateNumber: "",
  vehicleType: "",
  fuelType: "",
  transmissionType: "unknown",
  drivetrain: "unknown",
  currentOdometer: "0",
  status: "active",
  notes: "",
  primaryPhotoId: "",
  primaryPhotoName: "",
};

export function VehicleModule() {
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("profile");
  const [form, setForm] = useState<VehicleFormState>(emptyForm);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [archiveSaving, setArchiveSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [maintenanceSchedules, setMaintenanceSchedules] = useState<MaintenanceScheduleRecord[]>([]);
  const [maintenanceSettings, setMaintenanceSettings] = useState<VehicleMaintenanceSettingRecord[]>(
    [],
  );
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [maintenanceError, setMaintenanceError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === selectedVehicleId) ?? null,
    [selectedVehicleId, vehicles],
  );

  const loadVehicles = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const records = await listVehicles();
      setVehicles(records);
      setSelectedVehicleId((currentId) => {
        if (currentId && records.some((vehicle) => vehicle.id === currentId)) {
          return currentId;
        }

        return records[0]?.id ?? null;
      });
    } catch (error) {
      setErrorMessage(messageFromError(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadVehicles();
  }, [loadVehicles]);

  const loadMaintenanceOverview = useCallback(async (vehicleId: string | null) => {
    if (!vehicleId) {
      setMaintenanceSettings([]);
      setMaintenanceSchedules([]);
      setMaintenanceError(null);
      return;
    }

    setMaintenanceLoading(true);
    setMaintenanceError(null);

    try {
      const [settings, schedules] = await Promise.all([
        listVehicleMaintenanceSettings(vehicleId),
        listMaintenanceSchedulesForVehicle(vehicleId),
      ]);
      setMaintenanceSettings(settings);
      setMaintenanceSchedules(schedules);
    } catch (error) {
      setMaintenanceSettings([]);
      setMaintenanceSchedules([]);
      setMaintenanceError(messageFromError(error));
    } finally {
      setMaintenanceLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMaintenanceOverview(selectedVehicleId);
  }, [loadMaintenanceOverview, selectedVehicleId]);

  function startCreate() {
    setValidationIssues([]);
    setErrorMessage(null);
    setForm(emptyForm);
    setViewMode("create");
  }

  function startEdit(vehicle: VehicleRecord) {
    setValidationIssues([]);
    setErrorMessage(null);
    setSelectedVehicleId(vehicle.id);
    setForm(formFromVehicle(vehicle));
    setViewMode("edit");
  }

  function cancelForm() {
    setValidationIssues([]);
    setErrorMessage(null);
    setViewMode("profile");
  }

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setPhotoSaving(true);
    setErrorMessage(null);

    try {
      const savedPhoto = await storeVehiclePhoto(file);
      setForm((currentForm) => ({
        ...currentForm,
        primaryPhotoId: savedPhoto.id,
        primaryPhotoName: savedPhoto.originalFilename ?? file.name,
        primaryPhotoPath: savedPhoto.storagePath,
      }));
      setValidationIssues((issues) => issues.filter((issue) => issue.field !== "primaryPhotoId"));
    } catch (error) {
      setErrorMessage(messageFromError(error));
    } finally {
      setPhotoSaving(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const request = buildVehicleRequest(form);
    if ("issues" in request) {
      setValidationIssues(request.issues);
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setValidationIssues([]);

    try {
      const savedVehicle =
        viewMode === "edit" && selectedVehicle
          ? await updateVehicle(selectedVehicle.id, request)
          : await createVehicle(request);

      await loadVehicles();
      setSelectedVehicleId(savedVehicle.id);
      setViewMode("profile");
    } catch (error) {
      setErrorMessage(messageFromError(error));
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(vehicle: VehicleRecord) {
    setArchiveSaving(true);
    setErrorMessage(null);

    try {
      await archiveVehicle(vehicle.id);
      await loadVehicles();
      setViewMode("profile");
    } catch (error) {
      setErrorMessage(messageFromError(error));
    } finally {
      setArchiveSaving(false);
    }
  }

  return (
    <div className="vehicle-module">
      <section className="vehicle-toolbar" aria-label="Vehicle actions">
        <div>
          <h2>Vehicles</h2>
          <p>
            Add vehicles with a name and picture first. Plate number stays optional, and maintenance
            reminders can be set per vehicle when you need them.
          </p>
        </div>
        {!loading && vehicles.length > 0 ? (
          <button className="primary-button" type="button" onClick={startCreate}>
            Add vehicle
          </button>
        ) : null}
      </section>

      {errorMessage ? <div className="inline-error">{errorMessage}</div> : null}

      <div className="vehicle-workspace">
        <section className="vehicle-list-panel" aria-label="Vehicle list">
          {loading ? <LoadingState /> : null}
          {!loading && vehicles.length === 0 ? (
            <EmptyVehicleState onAddVehicle={startCreate} />
          ) : null}
          {!loading && vehicles.length > 0 ? (
            <div className="vehicle-list">
              {vehicles.map((vehicle) => (
                <button
                  className={`vehicle-list-item ${
                    vehicle.id === selectedVehicleId ? "selected" : ""
                  }`}
                  key={vehicle.id}
                  type="button"
                  onClick={() => {
                    setSelectedVehicleId(vehicle.id);
                    setViewMode("profile");
                  }}
                >
                  <VehiclePhoto vehicle={vehicle} size="small" />
                  <span>
                    <strong>{vehicle.vehicleName}</strong>
                    <span>
                      {vehicle.plateNumber || labelFor(vehicle.vehicleType, vehicleTypeOptions)}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <section className="vehicle-detail-panel" aria-label="Vehicle details">
          {viewMode === "create" || viewMode === "edit" ? (
            <VehicleForm
              fileInputRef={fileInputRef}
              form={form}
              issues={validationIssues}
              mode={viewMode}
              photoSaving={photoSaving}
              saving={saving}
              onCancel={cancelForm}
              onChange={setForm}
              onPhotoChange={handlePhotoChange}
              onSubmit={handleSubmit}
            />
          ) : selectedVehicle ? (
            <VehicleProfile
              archiveSaving={archiveSaving}
              maintenanceError={maintenanceError}
              maintenanceLoading={maintenanceLoading}
              maintenanceSchedules={maintenanceSchedules}
              maintenanceSettings={maintenanceSettings}
              vehicle={selectedVehicle}
              onArchive={() => void handleArchive(selectedVehicle)}
              onEdit={() => startEdit(selectedVehicle)}
            />
          ) : (
            <NoVehicleSelected />
          )}
        </section>
      </div>
    </div>
  );
}

function VehicleForm(props: {
  fileInputRef: RefObject<HTMLInputElement | null>;
  form: VehicleFormState;
  issues: ValidationIssue[];
  mode: Extract<ViewMode, "create" | "edit">;
  photoSaving: boolean;
  saving: boolean;
  onCancel: () => void;
  onChange: (form: VehicleFormState) => void;
  onPhotoChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const { fileInputRef, form, issues, mode, photoSaving, saving, onChange } = props;
  const formPhotoUrl = useManagedFileUrl(form.primaryPhotoPath);

  return (
    <form className="vehicle-form" onSubmit={props.onSubmit}>
      <div className="section-heading">
        <h2>{mode === "create" ? "Add vehicle" : "Edit vehicle"}</h2>
        <p>
          Save the vehicle basics here. Fuel, trips, maintenance, alerts, and reports will use this
          record.
        </p>
      </div>

      <div className="vehicle-photo-picker">
        <div className="vehicle-photo-frame large vehicle-photo-preview">
          {formPhotoUrl ? (
            <img className="vehicle-photo-image" alt="" src={formPhotoUrl} />
          ) : (
            <span>Vehicle picture</span>
          )}
        </div>
        <div>
          <label>Vehicle picture</label>
          <p>
            Required. The app saves a local copy so this record does not depend on the original
            file.
          </p>
          <input
            ref={fileInputRef}
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="visually-hidden"
            onChange={props.onPhotoChange}
            type="file"
          />
          <button
            className="secondary-button"
            disabled={photoSaving || saving}
            type="button"
            onClick={() => fileInputRef.current?.click()}
          >
            {photoSaving ? "Saving picture..." : "Choose picture"}
          </button>
          {form.primaryPhotoName ? (
            <span className="file-note">{form.primaryPhotoName}</span>
          ) : null}
          <FieldError field="primaryPhotoId" issues={issues} />
        </div>
      </div>

      <div className="form-grid">
        <Field label="Vehicle name" error={<FieldError field="vehicleName" issues={issues} />}>
          <input
            autoComplete="off"
            value={form.vehicleName}
            onChange={(event) => onChange({ ...form, vehicleName: event.target.value })}
          />
        </Field>

        <Field label="Plate number (optional)">
          <input
            autoComplete="off"
            value={form.plateNumber}
            onChange={(event) => onChange({ ...form, plateNumber: event.target.value })}
          />
        </Field>

        <Field label="Vehicle type" error={<FieldError field="vehicleType" issues={issues} />}>
          <select
            value={form.vehicleType}
            onChange={(event) =>
              onChange({ ...form, vehicleType: event.target.value as VehicleType | "" })
            }
          >
            <option value="">Choose type</option>
            {vehicleTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Fuel type" error={<FieldError field="fuelType" issues={issues} />}>
          <select
            value={form.fuelType}
            onChange={(event) =>
              onChange({ ...form, fuelType: event.target.value as VehicleFuelType | "" })
            }
          >
            <option value="">Choose fuel</option>
            {fuelTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Transmission">
          <select
            value={form.transmissionType}
            onChange={(event) =>
              onChange({ ...form, transmissionType: event.target.value as TransmissionType })
            }
          >
            {transmissionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Drivetrain">
          <select
            value={form.drivetrain}
            onChange={(event) =>
              onChange({ ...form, drivetrain: event.target.value as Drivetrain })
            }
          >
            {drivetrainOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Current odometer"
          error={<FieldError field="currentOdometer" issues={issues} />}
        >
          <input
            min="0"
            step="0.1"
            type="number"
            value={form.currentOdometer}
            onChange={(event) => onChange({ ...form, currentOdometer: event.target.value })}
          />
        </Field>

        <Field label="Status">
          <select
            value={form.status}
            onChange={(event) =>
              onChange({ ...form, status: event.target.value as EditableVehicleStatus })
            }
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Notes">
        <textarea
          rows={4}
          value={form.notes}
          onChange={(event) => onChange({ ...form, notes: event.target.value })}
        />
      </Field>

      {issues.length > 0 ? (
        <div className="validation-summary" role="alert">
          {issues.map((issue) => (
            <p key={`${issue.field ?? "form"}-${issue.code}`}>{issue.message}</p>
          ))}
        </div>
      ) : null}

      <div className="form-actions">
        <button
          className="secondary-button"
          disabled={saving || photoSaving}
          type="button"
          onClick={props.onCancel}
        >
          Cancel
        </button>
        <button className="primary-button" disabled={saving || photoSaving} type="submit">
          {saving ? "Saving..." : mode === "create" ? "Save vehicle" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

function VehicleProfile(props: {
  archiveSaving: boolean;
  maintenanceError: string | null;
  maintenanceLoading: boolean;
  maintenanceSchedules: MaintenanceScheduleRecord[];
  maintenanceSettings: VehicleMaintenanceSettingRecord[];
  vehicle: VehicleRecord;
  onArchive: () => void;
  onEdit: () => void;
}) {
  const { archiveSaving, vehicle } = props;
  const [archiveConfirming, setArchiveConfirming] = useState(false);

  useEffect(() => {
    setArchiveConfirming(false);
  }, [vehicle.id]);

  return (
    <div className="vehicle-profile">
      <div className="vehicle-profile-hero">
        <VehiclePhoto vehicle={vehicle} size="large" />
        <div>
          <span className={`status-pill ${vehicle.status}`}>{labelForStatus(vehicle.status)}</span>
          <h2>{vehicle.vehicleName}</h2>
          {vehicle.plateNumber ? <p>{vehicle.plateNumber}</p> : <p>Plate number not set</p>}
        </div>
      </div>

      <dl className="vehicle-detail-grid">
        <div>
          <dt>Vehicle type</dt>
          <dd>{labelFor(vehicle.vehicleType, vehicleTypeOptions)}</dd>
        </div>
        <div>
          <dt>Fuel type</dt>
          <dd>{labelFor(vehicle.fuelType, fuelTypeOptions)}</dd>
        </div>
        <div>
          <dt>Transmission</dt>
          <dd>{labelFor(vehicle.transmissionType, transmissionOptions)}</dd>
        </div>
        <div>
          <dt>Drivetrain</dt>
          <dd>{labelFor(vehicle.drivetrain, drivetrainOptions)}</dd>
        </div>
        <div>
          <dt>Current odometer</dt>
          <dd>{formatOdometer(vehicle.currentOdometer)}</dd>
        </div>
        <div>
          <dt>Last updated</dt>
          <dd>{formatDateTime(vehicle.updatedAt)}</dd>
        </div>
      </dl>

      {vehicle.notes ? (
        <div className="vehicle-notes">
          <h3>Notes</h3>
          <p>{vehicle.notes}</p>
        </div>
      ) : null}

      <VehicleMaintenanceOverview
        error={props.maintenanceError}
        loading={props.maintenanceLoading}
        schedules={props.maintenanceSchedules}
        settings={props.maintenanceSettings}
      />

      <div className="form-actions">
        <button className="secondary-button" type="button" onClick={props.onEdit}>
          Edit vehicle
        </button>
        {archiveConfirming ? (
          <div className="inline-confirmation">
            <span>Archive this vehicle? It will be hidden from the normal vehicle list.</span>
            <div className="inline-confirmation-actions">
              <button
                className="secondary-button"
                disabled={archiveSaving}
                type="button"
                onClick={() => setArchiveConfirming(false)}
              >
                Cancel
              </button>
              <button
                className="danger-button"
                disabled={archiveSaving}
                type="button"
                onClick={props.onArchive}
              >
                {archiveSaving ? "Archiving..." : "Confirm archive"}
              </button>
            </div>
          </div>
        ) : (
          <button
            className="danger-button"
            disabled={archiveSaving}
            type="button"
            onClick={() => setArchiveConfirming(true)}
          >
            Archive vehicle
          </button>
        )}
      </div>
    </div>
  );
}

type VehicleMaintenanceOverviewRow = {
  id: string;
  name: string;
  category: string;
  dueStatus?: string;
  dueReason?: string;
  nextDueDate?: string | null;
  nextDueOdometer?: number | null;
};

function VehicleMaintenanceOverview(props: {
  error: string | null;
  loading: boolean;
  schedules: MaintenanceScheduleRecord[];
  settings: VehicleMaintenanceSettingRecord[];
}) {
  const rows = buildMaintenanceOverviewRows(props.settings, props.schedules);

  return (
    <section className="vehicle-maintenance-overview" aria-label="Vehicle maintenance reminders">
      <div className="vehicle-maintenance-heading">
        <div>
          <h3>Maintenance reminders</h3>
          <p>Items set for this vehicle appear here with their next due date or odometer.</p>
        </div>
      </div>

      {props.loading ? <p className="vehicle-maintenance-muted">Loading reminders...</p> : null}
      {props.error ? <div className="inline-error compact">{props.error}</div> : null}

      {!props.loading && !props.error && rows.length === 0 ? (
        <p className="vehicle-maintenance-muted">
          No maintenance reminders are set for this vehicle yet. Use the Maintenance page to add
          items and choose when they are due.
        </p>
      ) : null}

      {rows.length > 0 ? (
        <div className="vehicle-maintenance-list">
          {rows.map((row) => (
            <article className="vehicle-maintenance-row" key={row.id}>
              <div className="vehicle-maintenance-main">
                <strong>{row.name}</strong>
                <span>{labelValue(row.category)}</span>
                {row.dueReason ? <p>{row.dueReason}</p> : null}
              </div>
              <div className="vehicle-maintenance-status">
                <span className={`schedule-status-pill ${row.dueStatus ?? "needs_setup"}`}>
                  {scheduleStatusLabel(row.dueStatus)}
                </span>
                <div className="vehicle-maintenance-targets">
                  {row.nextDueDate ? <span>{formatDateOnly(row.nextDueDate)}</span> : null}
                  {row.nextDueOdometer !== null && row.nextDueOdometer !== undefined ? (
                    <span>{formatOdometer(row.nextDueOdometer)}</span>
                  ) : null}
                  {!row.nextDueDate &&
                  (row.nextDueOdometer === null || row.nextDueOdometer === undefined) ? (
                    <span>No next due set</span>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function buildMaintenanceOverviewRows(
  settings: VehicleMaintenanceSettingRecord[],
  schedules: MaintenanceScheduleRecord[],
): VehicleMaintenanceOverviewRow[] {
  const visibleSettings = settings.filter(
    (setting) => setting.status !== "disabled" && setting.status !== "not_applicable",
  );
  const scheduleByTemplateId = new Map(
    schedules.map((schedule) => [schedule.templateId, schedule]),
  );
  const rows = visibleSettings.map((setting) => {
    const schedule = scheduleByTemplateId.get(setting.templateId);

    return {
      id: setting.id,
      name: setting.templateName,
      category: String(setting.category),
      dueStatus: schedule?.dueStatus ?? "needs_setup",
      dueReason: schedule?.dueReason ?? "Log this item once to start next due tracking.",
      nextDueDate: schedule?.nextDueDate ?? null,
      nextDueOdometer: schedule?.nextDueOdometer ?? null,
    };
  });
  const settingTemplateIds = new Set(visibleSettings.map((setting) => setting.templateId));

  for (const schedule of schedules) {
    if (settingTemplateIds.has(schedule.templateId)) {
      continue;
    }

    rows.push({
      id: schedule.id,
      name: schedule.templateName,
      category: String(schedule.category),
      dueStatus: schedule.dueStatus,
      dueReason: schedule.dueReason,
      nextDueDate: schedule.nextDueDate ?? null,
      nextDueOdometer: schedule.nextDueOdometer ?? null,
    });
  }

  return rows.sort((left, right) => {
    const statusOrder: Record<string, number> = {
      overdue: 0,
      due_today: 1,
      due_soon: 2,
      needs_setup: 3,
      not_due: 4,
      disabled: 5,
    };

    return (
      (statusOrder[left.dueStatus ?? "needs_setup"] ?? 6) -
      (statusOrder[right.dueStatus ?? "needs_setup"] ?? 6)
    );
  });
}

function VehiclePhoto(props: { vehicle: VehicleRecord; size: "small" | "large" }) {
  const imageUrl = useManagedFileUrl(props.vehicle.primaryPhotoPath);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  const fallbackLabel =
    imageUrl && imageFailed ? "Photo unavailable" : props.vehicle.vehicleName.slice(0, 2);
  const frameRoleClass =
    props.size === "small" ? "vehicle-thumbnail-photo" : "vehicle-profile-photo";

  return (
    <div
      className={`vehicle-photo-frame ${props.size} ${frameRoleClass} ${
        imageFailed ? "image-error" : ""
      }`}
      title={imageFailed ? "The saved vehicle picture could not be displayed." : undefined}
    >
      {imageUrl && !imageFailed ? (
        <img
          className="vehicle-photo-image"
          alt=""
          src={imageUrl}
          onError={() => {
            setImageFailed(true);
          }}
        />
      ) : (
        <span>{fallbackLabel}</span>
      )}
    </div>
  );
}

function Field(props: { children: ReactNode; error?: ReactNode; label: string }) {
  return (
    <label className="form-field">
      <span>{props.label}</span>
      {props.children}
      {props.error}
    </label>
  );
}

function FieldError(props: { field: string; issues: ValidationIssue[] }) {
  const issue = props.issues.find((item) => item.field === props.field);
  return issue ? <span className="field-error">{issue.message}</span> : null;
}

function LoadingState() {
  return <div className="vehicle-empty-state">Loading vehicles...</div>;
}

function EmptyVehicleState(props: { onAddVehicle: () => void }) {
  return (
    <div className="vehicle-empty-state">
      <h3>No vehicles yet</h3>
      <p>Add your first vehicle with a name and picture. Plate number can stay blank.</p>
      <button className="primary-button" type="button" onClick={props.onAddVehicle}>
        Add vehicle
      </button>
    </div>
  );
}

function NoVehicleSelected() {
  return (
    <div className="vehicle-empty-state">
      <h3>Select a vehicle</h3>
      <p>A vehicle profile will appear here after a vehicle is added or selected.</p>
    </div>
  );
}

function formFromVehicle(vehicle: VehicleRecord): VehicleFormState {
  return {
    vehicleName: vehicle.vehicleName,
    plateNumber: vehicle.plateNumber ?? "",
    vehicleType: vehicle.vehicleType,
    fuelType: vehicle.fuelType,
    transmissionType: vehicle.transmissionType ?? "unknown",
    drivetrain: vehicle.drivetrain ?? "unknown",
    currentOdometer: String(vehicle.currentOdometer),
    status: vehicle.status === "archived" ? "inactive" : vehicle.status,
    notes: vehicle.notes ?? "",
    primaryPhotoId: vehicle.primaryPhotoId ?? "",
    primaryPhotoName: "",
    primaryPhotoPath: vehicle.primaryPhotoPath ?? undefined,
  };
}

function buildVehicleRequest(
  form: VehicleFormState,
): VehicleMutationRequest | { issues: ValidationIssue[] } {
  const currentOdometer = parseOdometer(form.currentOdometer);
  const validation = validateVehicleCreation({
    vehicleName: form.vehicleName,
    primaryPhotoId: form.primaryPhotoId,
    plateNumber: form.plateNumber,
    vehicleType: form.vehicleType || undefined,
    fuelType: form.fuelType || undefined,
    transmissionType: form.transmissionType,
    drivetrain: form.drivetrain,
    currentOdometer,
    status: form.status,
  });

  if (!validation.valid || !form.vehicleType || !form.fuelType || currentOdometer === undefined) {
    return { issues: validation.issues };
  }

  return {
    vehicleName: validation.value?.vehicleName ?? form.vehicleName.trim(),
    primaryPhotoId: form.primaryPhotoId,
    plateNumber: validation.value?.plateNumber,
    vehicleType: form.vehicleType,
    fuelType: form.fuelType,
    transmissionType: form.transmissionType,
    drivetrain: form.drivetrain,
    currentOdometer,
    status: form.status,
    notes: trimToUndefined(form.notes),
  };
}

function parseOdometer(value: string): number | undefined {
  if (!value.trim()) {
    return undefined;
  }

  return Number(value);
}

function trimToUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function labelFor<T extends string>(value: T, options: Array<{ value: T; label: string }>) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function labelValue(value: string) {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function labelForStatus(status: VehicleStatus) {
  return labelFor(status, [
    ...statusOptions,
    { value: "archived", label: "Archived" },
  ] satisfies Array<{ value: VehicleStatus; label: string }>);
}

function scheduleStatusLabel(status?: string) {
  switch (status) {
    case "not_due":
      return "Not due";
    case "due_soon":
      return "Due soon";
    case "due_today":
      return "Due today";
    case "overdue":
      return "Overdue";
    case "disabled":
      return "Disabled";
    case "needs_setup":
    default:
      return "Needs setup";
  }
}

function formatOdometer(value: number) {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value)} km`;
}

function formatDateOnly(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function messageFromError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
