import { useCallback, useEffect, useMemo, useState } from "react";
import {
  archiveMaintenanceTemplate,
  archiveVehicleMaintenanceSetting,
  createMaintenanceTemplate,
  listMaintenanceSchedulesForVehicle,
  listMaintenanceTemplates,
  listVehicleMaintenanceSettings,
  logMaintenance,
  refreshMaintenanceAlertsForVehicle,
  storeMaintenancePhoto,
  storeMaintenanceReceipt,
  updateMaintenanceTemplate,
  upsertVehicleMaintenanceSetting,
  type CreateMaintenanceTemplateRequest,
  type LogMaintenanceRequest,
  type MaintenanceScheduleRecord,
  type MaintenanceTemplateRecord,
  type UpdateMaintenanceTemplateRequest,
  type VehicleMaintenanceSettingRecord,
} from "../../services/api/maintenance";
import { listVehicles, type VehicleRecord } from "../../services/api/vehicles";

type MaintenanceLogFormState = {
  templateId: string;
  completedDate: string;
  odometer: string;
  workPerformed: string;
  partsReplaced: string;
  laborCost: string;
  partsCost: string;
  totalCost: string;
  mechanicShop: string;
  warrantyExpiration: string;
  notes: string;
};

type MaintenanceItemFormState = {
  templateId: string;
  name: string;
  priority: MaintenanceTemplateRecord["priority"];
  defaultTimeIntervalDays: string;
  defaultOdometerIntervalKm: string;
  defaultDueSoonDays: string;
  defaultDueSoonKm: string;
  description: string;
};

const attentionStatuses = new Set(["overdue", "due_today", "due_soon", "needs_setup"]);
const maintenancePriorityOptions: MaintenanceTemplateRecord["priority"][] = [
  "low",
  "medium",
  "high",
  "critical",
];

export function MaintenanceTemplateModule() {
  const [templates, setTemplates] = useState<MaintenanceTemplateRecord[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [reminders, setReminders] = useState<VehicleMaintenanceSettingRecord[]>([]);
  const [schedules, setSchedules] = useState<MaintenanceScheduleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [vehicleDataLoading, setVehicleDataLoading] = useState(false);
  const [logLoading, setLogLoading] = useState(false);
  const [itemLoading, setItemLoading] = useState(false);
  const [logForm, setLogForm] = useState<MaintenanceLogFormState>(() => emptyLogForm());
  const [itemForm, setItemForm] = useState<MaintenanceItemFormState>(() =>
    emptyMaintenanceItemForm(),
  );
  const [archiveTemplateConfirmId, setArchiveTemplateConfirmId] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [beforePhotoFile, setBeforePhotoFile] = useState<File | null>(null);
  const [afterPhotoFile, setAfterPhotoFile] = useState<File | null>(null);
  const [logIssues, setLogIssues] = useState<string[]>([]);
  const [itemIssues, setItemIssues] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === selectedVehicleId) ?? null,
    [selectedVehicleId, vehicles],
  );

  const attentionSchedules = useMemo(
    () => schedules.filter((schedule) => attentionStatuses.has(schedule.dueStatus)),
    [schedules],
  );

  const remindersByTemplateId = useMemo(
    () => new Map(reminders.map((reminder) => [reminder.templateId, reminder])),
    [reminders],
  );

  const templatesSorted = useMemo(
    () => [...templates].sort((left, right) => left.name.localeCompare(right.name)),
    [templates],
  );

  const loadVehicleMaintenance = useCallback(async (vehicleId: string) => {
    setVehicleDataLoading(true);
    setErrorMessage(null);

    try {
      const [reminderRecords, scheduleRecords] = await Promise.all([
        listVehicleMaintenanceSettings(vehicleId),
        listMaintenanceSchedulesForVehicle(vehicleId),
      ]);
      setReminders(reminderRecords);
      setSchedules(scheduleRecords);
    } catch (error) {
      setErrorMessage(messageFromError(error));
      setReminders([]);
      setSchedules([]);
    } finally {
      setVehicleDataLoading(false);
    }
  }, []);

  const loadPageData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const [templateRecords, vehicleRecords] = await Promise.all([
        listMaintenanceTemplates(),
        listVehicles(),
      ]);
      setTemplates(templateRecords);
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
    if (!selectedVehicleId) {
      setReminders([]);
      setSchedules([]);
      return;
    }

    void loadVehicleMaintenance(selectedVehicleId);
  }, [loadVehicleMaintenance, selectedVehicleId]);

  useEffect(() => {
    setLogForm((currentForm) => ({
      ...currentForm,
      odometer: selectedVehicle ? String(selectedVehicle.currentOdometer) : "",
    }));
  }, [selectedVehicle]);

  const handleLogFieldChange = useCallback(
    <Field extends keyof MaintenanceLogFormState>(
      field: Field,
      value: MaintenanceLogFormState[Field],
    ) => {
      setLogForm((currentForm) => maintenanceLogFormWithAutoTotal(currentForm, field, value));
      setLogIssues([]);
    },
    [],
  );

  const handleItemFieldChange = useCallback(
    <Field extends keyof MaintenanceItemFormState>(
      field: Field,
      value: MaintenanceItemFormState[Field],
    ) => {
      setItemForm((currentForm) => ({ ...currentForm, [field]: value }));
      setItemIssues([]);
    },
    [],
  );

  const handleLogMaintenance = useCallback(async () => {
    if (!selectedVehicleId) {
      return;
    }

    const prepared = prepareLogRequest(selectedVehicleId, logForm);
    setLogIssues(prepared.errors);
    setErrorMessage(null);
    setMessage(null);

    if (!prepared.request) {
      return;
    }

    setLogLoading(true);

    try {
      let receiptDocumentId = prepared.request.receiptDocumentId;
      let beforePhotoId = prepared.request.beforePhotoId;
      let afterPhotoId = prepared.request.afterPhotoId;

      if (receiptFile) {
        const receipt = await storeMaintenanceReceipt(selectedVehicleId, receiptFile);
        receiptDocumentId = receipt.id;
      }

      if (beforePhotoFile) {
        const beforePhoto = await storeMaintenancePhoto(selectedVehicleId, beforePhotoFile);
        beforePhotoId = beforePhoto.id;
      }

      if (afterPhotoFile) {
        const afterPhoto = await storeMaintenancePhoto(selectedVehicleId, afterPhotoFile);
        afterPhotoId = afterPhoto.id;
      }

      const result = await logMaintenance({
        ...prepared.request,
        receiptDocumentId,
        beforePhotoId,
        afterPhotoId,
      });
      const alertResult = await refreshMaintenanceAlertsForVehicle(selectedVehicleId);
      await loadVehicleMaintenance(selectedVehicleId);

      setLogForm(emptyLogForm(selectedVehicle));
      setReceiptFile(null);
      setBeforePhotoFile(null);
      setAfterPhotoFile(null);
      setLogIssues([]);
      setMessage(
        result.reminderUsed
          ? `${result.log.templateName ?? "Maintenance"} was logged and the next reminder was updated. ${result.resolvedAlertCount} old alerts resolved; ${alertResult.createdCount} current alerts created.`
          : `${result.log.templateName ?? "Maintenance"} was logged. Set a reminder for this item if you want future due dates.`,
      );
    } catch (error) {
      setErrorMessage(messageFromError(error));
    } finally {
      setLogLoading(false);
    }
  }, [
    afterPhotoFile,
    beforePhotoFile,
    loadVehicleMaintenance,
    logForm,
    receiptFile,
    selectedVehicle,
    selectedVehicleId,
  ]);

  const handleSaveMaintenanceItem = useCallback(async () => {
    const prepared = prepareMaintenanceItemRequest(itemForm);
    setItemIssues(prepared.errors);
    setErrorMessage(null);
    setMessage(null);

    if (!prepared.request) {
      return;
    }

    setItemLoading(true);

    try {
      const savedItem = itemForm.templateId
        ? await updateMaintenanceTemplate({
            id: itemForm.templateId,
            ...prepared.request,
          })
        : await createMaintenanceTemplate(prepared.request);
      let reminderMessage = "";
      const existingReminder = reminders.find((reminder) => reminder.templateId === savedItem.id);
      const shouldTrackReminder =
        Boolean(prepared.request.defaultTimeIntervalDays) ||
        Boolean(prepared.request.defaultOdometerIntervalKm);

      if (selectedVehicleId && shouldTrackReminder) {
        await upsertVehicleMaintenanceSetting({
          vehicleId: selectedVehicleId,
          templateId: savedItem.id,
          status: "active",
          customTimeIntervalDays: prepared.request.defaultTimeIntervalDays,
          customOdometerIntervalKm: prepared.request.defaultOdometerIntervalKm,
          customDueSoonDays: prepared.request.defaultDueSoonDays,
          customDueSoonKm: prepared.request.defaultDueSoonKm,
          notes: trimToUndefined(prepared.request.description ?? ""),
        });
        await refreshMaintenanceAlertsForVehicle(selectedVehicleId);
        reminderMessage = " The selected vehicle reminder was updated.";
      } else if (selectedVehicleId && existingReminder) {
        await archiveVehicleMaintenanceSetting(existingReminder.id);
        await refreshMaintenanceAlertsForVehicle(selectedVehicleId);
        reminderMessage = " The selected vehicle reminder was removed.";
      } else if (selectedVehicleId) {
        reminderMessage = " Add days or km before saving if you want next due tracking.";
      }

      await loadPageData();
      if (selectedVehicleId) {
        await loadVehicleMaintenance(selectedVehicleId);
      }

      setItemForm(emptyMaintenanceItemForm());
      setItemIssues([]);
      setMessage(`${savedItem.name} maintenance item saved.${reminderMessage}`);
    } catch (error) {
      setErrorMessage(messageFromError(error));
    } finally {
      setItemLoading(false);
    }
  }, [itemForm, loadPageData, loadVehicleMaintenance, reminders, selectedVehicleId]);

  const handleEditMaintenanceItem = useCallback(
    (template: MaintenanceTemplateRecord) => {
      const reminder = reminders.find((item) => item.templateId === template.id);
      setItemForm(emptyMaintenanceItemForm(template, reminder));
      setItemIssues([]);
      setMessage("Maintenance item loaded for editing.");
      setArchiveTemplateConfirmId(null);
    },
    [reminders],
  );

  const handleArchiveMaintenanceItem = useCallback(
    async (template: MaintenanceTemplateRecord) => {
      setItemLoading(true);
      setErrorMessage(null);
      setMessage(null);

      try {
        await archiveMaintenanceTemplate(template.id);
        await loadPageData();
        if (selectedVehicleId) {
          await loadVehicleMaintenance(selectedVehicleId);
        }

        setLogForm((currentForm) =>
          currentForm.templateId === template.id ? { ...currentForm, templateId: "" } : currentForm,
        );
        setItemForm((currentForm) =>
          currentForm.templateId === template.id ? emptyMaintenanceItemForm() : currentForm,
        );
        setItemIssues([]);
        setArchiveTemplateConfirmId(null);
        setMessage(`${template.name} was removed. Existing service history was kept.`);
      } catch (error) {
        setErrorMessage(messageFromError(error));
      } finally {
        setItemLoading(false);
      }
    },
    [loadPageData, loadVehicleMaintenance, selectedVehicleId],
  );

  const handleUseScheduleInLog = useCallback((schedule: MaintenanceScheduleRecord) => {
    setLogForm((currentForm) => ({
      ...currentForm,
      templateId: schedule.templateId,
      workPerformed: currentForm.workPerformed || schedule.templateName,
    }));
    setLogIssues([]);
    setMessage("Maintenance item selected in the log form.");
  }, []);

  return (
    <div className="maintenance-module">
      <section className="maintenance-workspace">
        <div className="maintenance-workspace-header">
          <div>
            <h2>Maintenance</h2>
            <p>
              Log work when it is done. Add days or km to a maintenance item when you want this
              vehicle to track the next due reminder.
            </p>
          </div>

          {vehicles.length > 0 ? (
            <label className="maintenance-vehicle-select">
              <span>Vehicle</span>
              <select
                value={selectedVehicleId}
                onChange={(event) => {
                  setSelectedVehicleId(event.target.value);
                  setMessage(null);
                  setLogIssues([]);
                  setItemIssues([]);
                }}
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

        {selectedVehicle ? (
          <div className="vehicle-rule-summary" aria-label="Selected vehicle maintenance context">
            <span>{selectedVehicle.vehicleName}</span>
            <span>Odometer: {formatOdometer(selectedVehicle.currentOdometer)} km</span>
            <span>{labelValue("Fuel", selectedVehicle.fuelType)}</span>
            <span>{labelValue("Transmission", selectedVehicle.transmissionType)}</span>
          </div>
        ) : null}

        {loading ? (
          <div className="maintenance-empty-note">Loading maintenance setup...</div>
        ) : null}

        {!loading && vehicles.length === 0 ? (
          <div className="maintenance-empty-note">
            Add a vehicle first. Then you can log maintenance and track due dates for that vehicle.
          </div>
        ) : null}

        {errorMessage ? <div className="inline-error">{errorMessage}</div> : null}
        {message ? <div className="maintenance-action-note">{message}</div> : null}

        {selectedVehicle ? (
          <div className="maintenance-simple-layout">
            <MaintenanceLogPanel
              form={logForm}
              issues={logIssues}
              loading={logLoading}
              afterPhotoFileName={afterPhotoFile?.name}
              beforePhotoFileName={beforePhotoFile?.name}
              receiptFileName={receiptFile?.name}
              templates={templatesSorted}
              onAfterPhotoChange={setAfterPhotoFile}
              onBeforePhotoChange={setBeforePhotoFile}
              onFieldChange={handleLogFieldChange}
              onReceiptChange={setReceiptFile}
              onSubmit={() => void handleLogMaintenance()}
            />

            <section className="maintenance-side-stack">
              <AttentionPanel
                loading={vehicleDataLoading}
                schedules={attentionSchedules}
                onUseSchedule={handleUseScheduleInLog}
              />

              <MaintenanceItemsPanel
                archiveConfirmTemplateId={archiveTemplateConfirmId}
                form={itemForm}
                issues={itemIssues}
                loading={itemLoading}
                remindersByTemplateId={remindersByTemplateId}
                templates={templatesSorted}
                onArchiveItem={(template) => void handleArchiveMaintenanceItem(template)}
                onArchiveRequest={setArchiveTemplateConfirmId}
                onEditItem={handleEditMaintenanceItem}
                onFieldChange={handleItemFieldChange}
                onResetForm={() => {
                  setItemForm(emptyMaintenanceItemForm());
                  setItemIssues([]);
                  setArchiveTemplateConfirmId(null);
                }}
                onSubmit={() => void handleSaveMaintenanceItem()}
              />
            </section>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function MaintenanceLogPanel(props: {
  form: MaintenanceLogFormState;
  issues: string[];
  loading: boolean;
  afterPhotoFileName?: string;
  beforePhotoFileName?: string;
  receiptFileName?: string;
  templates: MaintenanceTemplateRecord[];
  onAfterPhotoChange: (file: File | null) => void;
  onBeforePhotoChange: (file: File | null) => void;
  onFieldChange: <Field extends keyof MaintenanceLogFormState>(
    field: Field,
    value: MaintenanceLogFormState[Field],
  ) => void;
  onReceiptChange: (file: File | null) => void;
  onSubmit: () => void;
}) {
  return (
    <section className="maintenance-log-panel">
      <div>
        <h3>Log maintenance done</h3>
        <p>
          Save the service details now. If this item has a reminder for the selected vehicle, the
          next due date or odometer will update automatically.
        </p>
      </div>

      <div className="maintenance-completion-grid">
        <label className="form-field maintenance-form-wide">
          <span>Maintenance item</span>
          <select
            value={props.form.templateId}
            onChange={(event) => props.onFieldChange("templateId", event.target.value)}
          >
            <option value="">Choose maintenance item</option>
            <MaintenanceTemplateOptions templates={props.templates} />
          </select>
        </label>

        {props.templates.length === 0 ? (
          <div className="maintenance-empty-note maintenance-form-wide">
            Add a maintenance item in the Maintenance items section before logging work.
          </div>
        ) : null}

        <label className="form-field">
          <span>Completed date</span>
          <input
            required
            type="date"
            value={props.form.completedDate}
            onChange={(event) => props.onFieldChange("completedDate", event.target.value)}
          />
        </label>

        <label className="form-field">
          <span>Odometer</span>
          <input
            min="0"
            step="0.1"
            type="number"
            value={props.form.odometer}
            onChange={(event) => props.onFieldChange("odometer", event.target.value)}
          />
        </label>

        <label className="form-field maintenance-form-wide">
          <span>Work performed</span>
          <textarea
            rows={3}
            value={props.form.workPerformed}
            onChange={(event) => props.onFieldChange("workPerformed", event.target.value)}
          />
        </label>

        <label className="form-field maintenance-form-wide">
          <span>Parts replaced</span>
          <input
            type="text"
            value={props.form.partsReplaced}
            onChange={(event) => props.onFieldChange("partsReplaced", event.target.value)}
          />
        </label>

        <label className="form-field">
          <span>Labor cost</span>
          <input
            min="0"
            step="0.01"
            type="number"
            value={props.form.laborCost}
            onChange={(event) => props.onFieldChange("laborCost", event.target.value)}
          />
        </label>

        <label className="form-field">
          <span>Parts cost</span>
          <input
            min="0"
            step="0.01"
            type="number"
            value={props.form.partsCost}
            onChange={(event) => props.onFieldChange("partsCost", event.target.value)}
          />
        </label>

        <label className="form-field">
          <span>Total cost</span>
          <input
            min="0"
            step="0.01"
            type="number"
            value={props.form.totalCost}
            onChange={(event) => props.onFieldChange("totalCost", event.target.value)}
          />
        </label>

        <label className="form-field">
          <span>Service provider</span>
          <input
            type="text"
            value={props.form.mechanicShop}
            onChange={(event) => props.onFieldChange("mechanicShop", event.target.value)}
          />
        </label>

        <label className="form-field">
          <span>Warranty until</span>
          <input
            type="date"
            value={props.form.warrantyExpiration}
            onChange={(event) => props.onFieldChange("warrantyExpiration", event.target.value)}
          />
        </label>

        <label className="form-field maintenance-form-wide">
          <span>Notes</span>
          <textarea
            rows={2}
            value={props.form.notes}
            onChange={(event) => props.onFieldChange("notes", event.target.value)}
          />
        </label>
      </div>

      <div className="maintenance-attachment-row">
        <MaintenanceFilePicker
          accept="image/png,image/jpeg,image/webp,application/pdf"
          fileName={props.receiptFileName}
          inputId="maintenance-receipt-file"
          label="Receipt"
          onChange={props.onReceiptChange}
        />

        <MaintenanceFilePicker
          accept="image/png,image/jpeg,image/webp"
          fileName={props.beforePhotoFileName}
          inputId="maintenance-before-photo-file"
          label="Before photo"
          onChange={props.onBeforePhotoChange}
        />

        <MaintenanceFilePicker
          accept="image/png,image/jpeg,image/webp"
          fileName={props.afterPhotoFileName}
          inputId="maintenance-after-photo-file"
          label="After photo"
          onChange={props.onAfterPhotoChange}
        />
      </div>

      {props.issues.length > 0 ? (
        <div className="inline-error">
          {props.issues.map((issue) => (
            <span key={issue}>{issue}</span>
          ))}
        </div>
      ) : null}

      <div className="maintenance-completion-actions">
        <button
          className="primary-button"
          disabled={props.loading}
          type="button"
          onClick={props.onSubmit}
        >
          {props.loading ? "Saving..." : "Save maintenance log"}
        </button>
      </div>
    </section>
  );
}

function MaintenanceFilePicker(props: {
  accept: string;
  fileName?: string;
  inputId: string;
  label: string;
  onChange: (file: File | null) => void;
}) {
  return (
    <div className="maintenance-file-picker">
      <span>{props.label}</span>
      <div className="maintenance-file-control">
        <input
          key={props.fileName ?? "empty"}
          accept={props.accept}
          className="visually-hidden"
          id={props.inputId}
          type="file"
          onChange={(event) => props.onChange(event.target.files?.[0] ?? null)}
        />
        <label className="secondary-button maintenance-file-button" htmlFor={props.inputId}>
          Choose file
        </label>
        <span className="maintenance-file-name">{props.fileName ?? "No file chosen"}</span>
      </div>
    </div>
  );
}

function AttentionPanel(props: {
  loading: boolean;
  schedules: MaintenanceScheduleRecord[];
  onUseSchedule: (schedule: MaintenanceScheduleRecord) => void;
}) {
  return (
    <section className="maintenance-reminder-panel">
      <div>
        <h3>Needs attention</h3>
        <p>Only reminders you set for this vehicle can appear here.</p>
      </div>

      {props.loading ? <div className="maintenance-empty-note">Loading reminders...</div> : null}

      {!props.loading && props.schedules.length === 0 ? (
        <div className="maintenance-empty-note">
          Nothing is due right now. Add days or km on a maintenance item if you want the app to
          track future due dates or odometer targets.
        </div>
      ) : null}

      <div className="maintenance-schedule-list">
        {props.schedules.map((schedule) => (
          <article key={schedule.id} className="maintenance-schedule-card compact">
            <div className="maintenance-schedule-main">
              <div className="maintenance-card-heading">
                <span className="maintenance-category">{labelValue("", schedule.category)}</span>
                <span className={`schedule-status-pill ${schedule.dueStatus}`}>
                  {scheduleStatusLabel(schedule.dueStatus)}
                </span>
              </div>
              <h3>{schedule.templateName}</h3>
              <p>{schedule.dueReason}</p>
            </div>
            <div className="maintenance-schedule-meta">
              <span>
                {schedule.nextDueDate ? `Date: ${formatDate(schedule.nextDueDate)}` : "No date"}
              </span>
              <span>
                {schedule.nextDueOdometer
                  ? `Odometer: ${formatOdometer(schedule.nextDueOdometer)} km`
                  : "No odometer target"}
              </span>
            </div>
            <div className="maintenance-card-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => props.onUseSchedule(schedule)}
              >
                Log this maintenance
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function MaintenanceTemplateOptions(props: { templates: MaintenanceTemplateRecord[] }) {
  return (
    <>
      {props.templates.map((template) => (
        <option key={template.id} value={template.id}>
          {template.name}
        </option>
      ))}
    </>
  );
}

function MaintenanceItemsPanel(props: {
  archiveConfirmTemplateId: string | null;
  form: MaintenanceItemFormState;
  issues: string[];
  loading: boolean;
  remindersByTemplateId: Map<string, VehicleMaintenanceSettingRecord>;
  templates: MaintenanceTemplateRecord[];
  onArchiveItem: (template: MaintenanceTemplateRecord) => void;
  onArchiveRequest: (templateId: string | null) => void;
  onEditItem: (template: MaintenanceTemplateRecord) => void;
  onFieldChange: <Field extends keyof MaintenanceItemFormState>(
    field: Field,
    value: MaintenanceItemFormState[Field],
  ) => void;
  onResetForm: () => void;
  onSubmit: () => void;
}) {
  return (
    <section className="maintenance-reminder-panel maintenance-item-manager">
      <div>
        <h3>Maintenance items</h3>
        <p>
          Add or edit maintenance choices here. Days and km fields also become the selected
          vehicle's reminder intervals.
        </p>
      </div>

      <div className="maintenance-item-form">
        <label className="form-field maintenance-form-wide">
          <span>Item name</span>
          <input
            type="text"
            value={props.form.name}
            onChange={(event) => props.onFieldChange("name", event.target.value)}
          />
        </label>

        <label className="form-field">
          <span>Priority</span>
          <select
            value={props.form.priority}
            onChange={(event) =>
              props.onFieldChange(
                "priority",
                event.target.value as MaintenanceTemplateRecord["priority"],
              )
            }
          >
            {maintenancePriorityOptions.map((priority) => (
              <option key={priority} value={priority}>
                {labelValue("", priority)}
              </option>
            ))}
          </select>
        </label>

        <label className="form-field">
          <span>Every how many days?</span>
          <input
            min="0"
            step="1"
            type="number"
            value={props.form.defaultTimeIntervalDays}
            onChange={(event) => props.onFieldChange("defaultTimeIntervalDays", event.target.value)}
          />
        </label>

        <label className="form-field">
          <span>Every how many km?</span>
          <input
            min="0"
            step="1"
            type="number"
            value={props.form.defaultOdometerIntervalKm}
            onChange={(event) =>
              props.onFieldChange("defaultOdometerIntervalKm", event.target.value)
            }
          />
        </label>

        <label className="form-field">
          <span>Warn days before</span>
          <input
            min="0"
            step="1"
            type="number"
            value={props.form.defaultDueSoonDays}
            onChange={(event) => props.onFieldChange("defaultDueSoonDays", event.target.value)}
          />
        </label>

        <label className="form-field">
          <span>Warn km before</span>
          <input
            min="0"
            step="1"
            type="number"
            value={props.form.defaultDueSoonKm}
            onChange={(event) => props.onFieldChange("defaultDueSoonKm", event.target.value)}
          />
        </label>

        <label className="form-field maintenance-form-wide">
          <span>Description</span>
          <textarea
            rows={2}
            value={props.form.description}
            onChange={(event) => props.onFieldChange("description", event.target.value)}
          />
        </label>
      </div>

      {props.issues.length > 0 ? (
        <div className="inline-error">
          {props.issues.map((issue) => (
            <span key={issue}>{issue}</span>
          ))}
        </div>
      ) : null}

      <div className="maintenance-completion-actions">
        {props.form.templateId ? (
          <button className="secondary-button" type="button" onClick={props.onResetForm}>
            Cancel edit
          </button>
        ) : null}
        <button
          className="primary-button"
          disabled={props.loading}
          type="button"
          onClick={props.onSubmit}
        >
          {props.loading ? "Saving..." : props.form.templateId ? "Save item" : "Add item"}
        </button>
      </div>

      <div className="maintenance-item-list">
        {props.templates.length === 0 ? (
          <div className="maintenance-empty-note">
            No maintenance items yet. Add your own item above, then it will appear in the log and
            start tracking reminders when days or km are set.
          </div>
        ) : null}

        {props.templates.map((template) => (
          <article key={template.id} className="maintenance-item-card">
            <div>
              <div className="maintenance-card-heading">
                <span className={`priority-pill ${template.priority}`}>
                  {labelValue("", template.priority)}
                </span>
              </div>
              <h4>{template.name}</h4>
              <div className="maintenance-intervals">
                <span>{intervalDays(template.defaultTimeIntervalDays)}</span>
                <span>{intervalKm(template.defaultOdometerIntervalKm)}</span>
              </div>
              <VehicleReminderSummary
                reminder={props.remindersByTemplateId.get(template.id)}
                template={template}
              />
            </div>
            <div className="maintenance-card-actions">
              {props.archiveConfirmTemplateId === template.id ? (
                <div className="inline-confirmation">
                  <span>Remove this item? Service history stays saved.</span>
                  <div className="inline-confirmation-actions">
                    <button
                      className="secondary-button"
                      disabled={props.loading}
                      type="button"
                      onClick={() => props.onArchiveRequest(null)}
                    >
                      Cancel
                    </button>
                    <button
                      className="danger-button"
                      disabled={props.loading}
                      type="button"
                      onClick={() => props.onArchiveItem(template)}
                    >
                      {props.loading ? "Removing..." : "Confirm remove"}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => props.onEditItem(template)}
                  >
                    Edit
                  </button>
                  <button
                    className="secondary-button danger-text"
                    type="button"
                    onClick={() => props.onArchiveRequest(template.id)}
                  >
                    Remove
                  </button>
                </>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function VehicleReminderSummary(props: {
  reminder?: VehicleMaintenanceSettingRecord;
  template: MaintenanceTemplateRecord;
}) {
  const reminder = props.reminder;

  return (
    <div className="maintenance-item-reminder">
      {reminder ? (
        <div className="maintenance-reminder-summary">
          <span>
            Tracking for this vehicle: {intervalDays(reminder.customTimeIntervalDays)},{" "}
            {intervalKm(reminder.customOdometerIntervalKm)}
          </span>
          <span>
            Warn: {reminder.effectiveDueSoonDays} days /{" "}
            {reminder.effectiveDueSoonKm.toLocaleString()} km
          </span>
        </div>
      ) : props.template.defaultTimeIntervalDays || props.template.defaultOdometerIntervalKm ? (
        <div className="maintenance-reminder-summary muted">
          This item has intervals saved, but it has not been applied to this vehicle yet. Click
          Edit, then Save item to use those intervals here.
        </div>
      ) : (
        <div className="maintenance-reminder-summary muted">
          No reminder interval set. Add days or km above, then save the item to track next due dates
          for this vehicle.
        </div>
      )}
    </div>
  );
}

function emptyLogForm(vehicle?: VehicleRecord | null): MaintenanceLogFormState {
  return {
    templateId: "",
    completedDate: new Date().toISOString().slice(0, 10),
    odometer: vehicle ? String(vehicle.currentOdometer) : "",
    workPerformed: "",
    partsReplaced: "",
    laborCost: "",
    partsCost: "",
    totalCost: "",
    mechanicShop: "",
    warrantyExpiration: "",
    notes: "",
  };
}

function maintenanceLogFormWithAutoTotal<Field extends keyof MaintenanceLogFormState>(
  currentForm: MaintenanceLogFormState,
  field: Field,
  value: MaintenanceLogFormState[Field],
): MaintenanceLogFormState {
  const nextForm: MaintenanceLogFormState = { ...currentForm, [field]: value };

  if (field !== "laborCost" && field !== "partsCost") {
    return nextForm;
  }

  const laborCost = parseAutoCost(nextForm.laborCost);
  const partsCost = parseAutoCost(nextForm.partsCost);
  const hasLaborCost = nextForm.laborCost.trim() !== "";
  const hasPartsCost = nextForm.partsCost.trim() !== "";

  if (!hasLaborCost && !hasPartsCost) {
    nextForm.totalCost = "";
    return nextForm;
  }

  if ((hasLaborCost && laborCost === undefined) || (hasPartsCost && partsCost === undefined)) {
    return nextForm;
  }

  nextForm.totalCost = formatMoneyInput((laborCost ?? 0) + (partsCost ?? 0));
  return nextForm;
}

function emptyMaintenanceItemForm(
  template?: MaintenanceTemplateRecord,
  reminder?: VehicleMaintenanceSettingRecord,
): MaintenanceItemFormState {
  return {
    templateId: template?.id ?? "",
    name: template?.name ?? "",
    priority: template?.priority ?? "medium",
    defaultTimeIntervalDays: optionalNumberString(
      reminder?.customTimeIntervalDays ?? template?.defaultTimeIntervalDays,
    ),
    defaultOdometerIntervalKm: optionalNumberString(
      reminder?.customOdometerIntervalKm ?? template?.defaultOdometerIntervalKm,
    ),
    defaultDueSoonDays: optionalNumberString(
      reminder?.customDueSoonDays ?? template?.defaultDueSoonDays ?? 14,
    ),
    defaultDueSoonKm: optionalNumberString(
      reminder?.customDueSoonKm ?? template?.defaultDueSoonKm ?? 500,
    ),
    description: reminder?.notes ?? template?.description ?? "",
  };
}

function prepareLogRequest(
  vehicleId: string,
  form: MaintenanceLogFormState,
): { errors: string[]; request?: LogMaintenanceRequest } {
  const errors: string[] = [];
  const templateId = form.templateId.trim();
  const completedDate = form.completedDate.trim();
  const workPerformed = form.workPerformed.trim();
  const odometer = optionalNonNegativeNumber(form.odometer, "Odometer", errors);
  const laborCost = optionalNonNegativeNumber(form.laborCost, "Labor cost", errors);
  const partsCost = optionalNonNegativeNumber(form.partsCost, "Parts cost", errors);
  const totalCost = optionalNonNegativeNumber(form.totalCost, "Total cost", errors);

  if (!templateId) {
    errors.push("Choose a maintenance item.");
  }

  if (!completedDate) {
    errors.push("Completed date is required.");
  }

  if (!workPerformed) {
    errors.push("Work performed is required.");
  }

  if (errors.length > 0) {
    return { errors };
  }

  return {
    errors: [],
    request: {
      vehicleId,
      templateId,
      completedDate,
      odometer,
      workPerformed,
      partsReplaced: trimToUndefined(form.partsReplaced),
      laborCost,
      partsCost,
      totalCost,
      mechanicShop: trimToUndefined(form.mechanicShop),
      warrantyExpiration: trimToUndefined(form.warrantyExpiration),
      notes: trimToUndefined(form.notes),
    },
  };
}

function prepareMaintenanceItemRequest(form: MaintenanceItemFormState): {
  errors: string[];
  request?: CreateMaintenanceTemplateRequest | UpdateMaintenanceTemplateRequest;
} {
  const errors: string[] = [];
  const name = form.name.trim();
  const defaultTimeIntervalDays = optionalPositiveInteger(
    form.defaultTimeIntervalDays,
    "Reminder days",
    errors,
  );
  const defaultOdometerIntervalKm = optionalPositiveInteger(
    form.defaultOdometerIntervalKm,
    "Reminder km",
    errors,
  );
  const defaultDueSoonDays = optionalNonNegativeInteger(
    form.defaultDueSoonDays,
    "Warn days before",
    errors,
  );
  const defaultDueSoonKm = optionalNonNegativeInteger(
    form.defaultDueSoonKm,
    "Warn km before",
    errors,
  );

  if (!name) {
    errors.push("Maintenance item name is required.");
  }

  if (errors.length > 0) {
    return { errors };
  }

  const request = {
    name,
    category: "maintenance",
    description: trimToUndefined(form.description),
    defaultTimeIntervalDays,
    defaultOdometerIntervalKm,
    defaultDueSoonDays,
    defaultDueSoonKm,
    priority: form.priority,
  };

  return { errors: [], request };
}

function optionalNonNegativeNumber(
  value: string,
  label: string,
  errors: string[],
): number | undefined {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    errors.push(`${label} must be a valid number.`);
    return undefined;
  }

  if (parsed < 0) {
    errors.push(`${label} cannot be negative.`);
    return undefined;
  }

  return parsed;
}

function parseAutoCost(value: string): number | undefined {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function formatMoneyInput(value: number) {
  return value.toFixed(2);
}

function optionalPositiveInteger(
  value: string,
  label: string,
  errors: string[],
): number | undefined {
  const parsed = optionalNonNegativeInteger(value, label, errors);

  if (parsed === 0) {
    errors.push(`${label} must be greater than zero when entered.`);
    return undefined;
  }

  return parsed;
}

function optionalNonNegativeInteger(
  value: string,
  label: string,
  errors: string[],
): number | undefined {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed)) {
    errors.push(`${label} must be a whole number.`);
    return undefined;
  }

  if (parsed < 0) {
    errors.push(`${label} cannot be negative.`);
    return undefined;
  }

  return parsed;
}

function optionalNumberString(value?: number | null) {
  return value === null || value === undefined ? "" : String(value);
}

function trimToUndefined(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function intervalDays(days?: number | null) {
  if (!days) {
    return "No day interval";
  }

  if (days % 30 === 0) {
    const months = days / 30;
    return `Every ${months} ${months === 1 ? "month" : "months"}`;
  }

  return `Every ${days} days`;
}

function intervalKm(kilometers?: number | null) {
  return kilometers ? `Every ${kilometers.toLocaleString()} km` : "No km interval";
}

function scheduleStatusLabel(status: MaintenanceScheduleRecord["dueStatus"]) {
  switch (status) {
    case "not_due":
      return "Not due";
    case "due_soon":
      return "Due soon";
    case "due_today":
      return "Due today";
    case "overdue":
      return "Overdue";
    case "needs_setup":
      return "Needs setup";
    case "disabled":
      return "Disabled";
    default:
      return labelValue("", status);
  }
}

function formatDate(date: string) {
  return date.slice(0, 10);
}

function formatOdometer(value: number) {
  return Math.round(value).toLocaleString();
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
