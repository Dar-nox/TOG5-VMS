import { useCallback, useEffect, useMemo, useState } from "react";
import {
  archiveVehicleMaintenanceSetting,
  listMaintenanceSchedulesForVehicle,
  listMaintenanceTemplates,
  listVehicleMaintenanceSettings,
  logMaintenance,
  refreshMaintenanceAlertsForVehicle,
  storeMaintenancePhoto,
  storeMaintenanceReceipt,
  upsertVehicleMaintenanceSetting,
  type LogMaintenanceRequest,
  type MaintenanceScheduleRecord,
  type MaintenanceTemplateRecord,
  type UpsertVehicleMaintenanceSettingRequest,
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

type ReminderFormState = {
  settingId: string;
  templateId: string;
  intervalDays: string;
  intervalKm: string;
  dueSoonDays: string;
  dueSoonKm: string;
  notes: string;
};

const attentionStatuses = new Set(["overdue", "due_today", "due_soon", "needs_setup"]);

export function MaintenanceTemplateModule() {
  const [templates, setTemplates] = useState<MaintenanceTemplateRecord[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [reminders, setReminders] = useState<VehicleMaintenanceSettingRecord[]>([]);
  const [schedules, setSchedules] = useState<MaintenanceScheduleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [vehicleDataLoading, setVehicleDataLoading] = useState(false);
  const [logLoading, setLogLoading] = useState(false);
  const [reminderLoading, setReminderLoading] = useState(false);
  const [logForm, setLogForm] = useState<MaintenanceLogFormState>(() => emptyLogForm());
  const [reminderForm, setReminderForm] = useState<ReminderFormState>(() => emptyReminderForm());
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [beforePhotoFile, setBeforePhotoFile] = useState<File | null>(null);
  const [afterPhotoFile, setAfterPhotoFile] = useState<File | null>(null);
  const [issues, setIssues] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === selectedVehicleId) ?? null,
    [selectedVehicleId, vehicles],
  );

  const schedulesByTemplateId = useMemo(() => {
    const map = new Map<string, MaintenanceScheduleRecord>();
    for (const schedule of schedules) {
      map.set(schedule.templateId, schedule);
    }
    return map;
  }, [schedules]);

  const attentionSchedules = useMemo(
    () => schedules.filter((schedule) => attentionStatuses.has(schedule.dueStatus)),
    [schedules],
  );

  const reminderTemplateIds = useMemo(
    () => new Set(reminders.map((reminder) => reminder.templateId)),
    [reminders],
  );

  const templatesSorted = useMemo(
    () =>
      [...templates].sort((left, right) =>
        `${left.category} ${left.name}`.localeCompare(`${right.category} ${right.name}`),
      ),
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
      setLogForm((currentForm) => ({ ...currentForm, [field]: value }));
      setIssues([]);
    },
    [],
  );

  const handleReminderFieldChange = useCallback(
    <Field extends keyof ReminderFormState>(field: Field, value: ReminderFormState[Field]) => {
      setReminderForm((currentForm) => ({ ...currentForm, [field]: value }));
      setIssues([]);
    },
    [],
  );

  const handleLogMaintenance = useCallback(async () => {
    if (!selectedVehicleId) {
      return;
    }

    const prepared = prepareLogRequest(selectedVehicleId, logForm);
    setIssues(prepared.errors);

    if (!prepared.request) {
      return;
    }

    setLogLoading(true);
    setErrorMessage(null);
    setMessage(null);

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
      setIssues([]);
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

  const handleSaveReminder = useCallback(async () => {
    if (!selectedVehicleId) {
      return;
    }

    const prepared = prepareReminderRequest(selectedVehicleId, reminderForm);
    setIssues(prepared.errors);

    if (!prepared.request) {
      return;
    }

    setReminderLoading(true);
    setErrorMessage(null);
    setMessage(null);

    try {
      const reminder = await upsertVehicleMaintenanceSetting(prepared.request);
      await refreshMaintenanceAlertsForVehicle(selectedVehicleId);
      await loadVehicleMaintenance(selectedVehicleId);
      setReminderForm(emptyReminderForm());
      setIssues([]);
      setMessage(`${reminder.templateName} reminder saved for this vehicle.`);
    } catch (error) {
      setErrorMessage(messageFromError(error));
    } finally {
      setReminderLoading(false);
    }
  }, [loadVehicleMaintenance, reminderForm, selectedVehicleId]);

  const handleEditReminder = useCallback((reminder: VehicleMaintenanceSettingRecord) => {
    setReminderForm({
      settingId: reminder.id,
      templateId: reminder.templateId,
      intervalDays: optionalNumberString(reminder.customTimeIntervalDays),
      intervalKm: optionalNumberString(reminder.customOdometerIntervalKm),
      dueSoonDays: optionalNumberString(reminder.customDueSoonDays),
      dueSoonKm: optionalNumberString(reminder.customDueSoonKm),
      notes: reminder.notes ?? "",
    });
    setIssues([]);
    setMessage(null);
  }, []);

  const handleArchiveReminder = useCallback(
    async (settingId: string) => {
      if (!selectedVehicleId) {
        return;
      }

      setReminderLoading(true);
      setErrorMessage(null);
      setMessage(null);

      try {
        await archiveVehicleMaintenanceSetting(settingId);
        await loadVehicleMaintenance(selectedVehicleId);
        setReminderForm(emptyReminderForm());
        setMessage("Reminder removed. Existing service history was kept.");
      } catch (error) {
        setErrorMessage(messageFromError(error));
      } finally {
        setReminderLoading(false);
      }
    },
    [loadVehicleMaintenance, selectedVehicleId],
  );

  const handleUseScheduleInLog = useCallback((schedule: MaintenanceScheduleRecord) => {
    setLogForm((currentForm) => ({
      ...currentForm,
      templateId: schedule.templateId,
      workPerformed: currentForm.workPerformed || schedule.templateName,
    }));
    setMessage("Maintenance item selected in the log form.");
  }, []);

  return (
    <div className="maintenance-module">
      <section className="maintenance-workspace">
        <div className="maintenance-workspace-header">
          <div>
            <h2>Maintenance</h2>
            <p>
              Log work when it is done. Add reminders only for the maintenance items you want this
              vehicle to track.
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
                  setIssues([]);
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
            Add a vehicle first. Then you can log maintenance and set reminders for that vehicle.
          </div>
        ) : null}

        {errorMessage ? <div className="inline-error">{errorMessage}</div> : null}
        {message ? <div className="maintenance-action-note">{message}</div> : null}

        {selectedVehicle ? (
          <div className="maintenance-simple-layout">
            <MaintenanceLogPanel
              form={logForm}
              issues={issues}
              loading={logLoading}
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

              <ReminderSettingsPanel
                form={reminderForm}
                loading={vehicleDataLoading || reminderLoading}
                reminderTemplateIds={reminderTemplateIds}
                reminders={reminders}
                schedulesByTemplateId={schedulesByTemplateId}
                templates={templatesSorted}
                onArchiveReminder={(settingId) => void handleArchiveReminder(settingId)}
                onEditReminder={handleEditReminder}
                onFieldChange={handleReminderFieldChange}
                onResetForm={() => {
                  setReminderForm(emptyReminderForm());
                  setIssues([]);
                }}
                onSubmit={() => void handleSaveReminder()}
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
            {props.templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </label>

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
        <label className="maintenance-file-picker">
          <span>Receipt</span>
          <input
            accept="image/png,image/jpeg,image/webp,application/pdf"
            type="file"
            onChange={(event) => props.onReceiptChange(event.target.files?.[0] ?? null)}
          />
        </label>

        <label className="maintenance-file-picker">
          <span>Before photo</span>
          <input
            accept="image/png,image/jpeg,image/webp"
            type="file"
            onChange={(event) => props.onBeforePhotoChange(event.target.files?.[0] ?? null)}
          />
        </label>

        <label className="maintenance-file-picker">
          <span>After photo</span>
          <input
            accept="image/png,image/jpeg,image/webp"
            type="file"
            onChange={(event) => props.onAfterPhotoChange(event.target.files?.[0] ?? null)}
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
          Nothing is due right now. Set reminders below if you want the app to track future due
          dates or odometer targets.
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

function ReminderSettingsPanel(props: {
  form: ReminderFormState;
  loading: boolean;
  reminderTemplateIds: Set<string>;
  reminders: VehicleMaintenanceSettingRecord[];
  schedulesByTemplateId: Map<string, MaintenanceScheduleRecord>;
  templates: MaintenanceTemplateRecord[];
  onArchiveReminder: (settingId: string) => void;
  onEditReminder: (reminder: VehicleMaintenanceSettingRecord) => void;
  onFieldChange: <Field extends keyof ReminderFormState>(
    field: Field,
    value: ReminderFormState[Field],
  ) => void;
  onResetForm: () => void;
  onSubmit: () => void;
}) {
  return (
    <section className="maintenance-reminder-panel">
      <div>
        <h3>Reminders for this vehicle</h3>
        <p>
          Set a repeat interval only for items you want the app to calculate next due dates for.
        </p>
      </div>

      <div className="maintenance-reminder-form">
        <label className="form-field maintenance-form-wide">
          <span>Maintenance item</span>
          <select
            value={props.form.templateId}
            onChange={(event) => props.onFieldChange("templateId", event.target.value)}
          >
            <option value="">Choose item</option>
            {props.templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
                {props.reminderTemplateIds.has(template.id) && template.id !== props.form.templateId
                  ? " (already set)"
                  : ""}
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
            value={props.form.intervalDays}
            onChange={(event) => props.onFieldChange("intervalDays", event.target.value)}
          />
        </label>

        <label className="form-field">
          <span>Every how many km?</span>
          <input
            min="0"
            step="1"
            type="number"
            value={props.form.intervalKm}
            onChange={(event) => props.onFieldChange("intervalKm", event.target.value)}
          />
        </label>

        <label className="form-field">
          <span>Warn days before</span>
          <input
            min="0"
            step="1"
            type="number"
            value={props.form.dueSoonDays}
            onChange={(event) => props.onFieldChange("dueSoonDays", event.target.value)}
          />
        </label>

        <label className="form-field">
          <span>Warn km before</span>
          <input
            min="0"
            step="1"
            type="number"
            value={props.form.dueSoonKm}
            onChange={(event) => props.onFieldChange("dueSoonKm", event.target.value)}
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

      <div className="maintenance-completion-actions">
        {props.form.settingId ? (
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
          {props.loading ? "Saving..." : props.form.settingId ? "Save reminder" : "Add reminder"}
        </button>
      </div>

      {props.loading ? (
        <div className="maintenance-empty-note">Loading reminder settings...</div>
      ) : null}

      {!props.loading && props.reminders.length === 0 ? (
        <div className="maintenance-empty-note">
          No reminders set for this vehicle yet. You can still log maintenance without reminders.
        </div>
      ) : null}

      <div className="maintenance-reminder-list">
        {props.reminders.map((reminder) => (
          <ReminderCard
            key={reminder.id}
            reminder={reminder}
            schedule={props.schedulesByTemplateId.get(reminder.templateId)}
            onArchive={() => props.onArchiveReminder(reminder.id)}
            onEdit={() => props.onEditReminder(reminder)}
          />
        ))}
      </div>
    </section>
  );
}

function ReminderCard(props: {
  reminder: VehicleMaintenanceSettingRecord;
  schedule?: MaintenanceScheduleRecord;
  onArchive: () => void;
  onEdit: () => void;
}) {
  return (
    <article className="maintenance-reminder-card">
      <div className="maintenance-card-heading">
        <span className="maintenance-category">{labelValue("", props.reminder.category)}</span>
        <span className={`priority-pill ${props.reminder.priority}`}>
          {labelValue("", props.reminder.priority)}
        </span>
      </div>

      <h3>{props.reminder.templateName}</h3>
      <div className="maintenance-intervals">
        <span>{intervalDays(props.reminder.customTimeIntervalDays)}</span>
        <span>{intervalKm(props.reminder.customOdometerIntervalKm)}</span>
        <span>
          Warn: {props.reminder.effectiveDueSoonDays} days /{" "}
          {props.reminder.effectiveDueSoonKm.toLocaleString()} km
        </span>
      </div>

      {props.schedule ? (
        <div className="maintenance-schedule-meta">
          <span>
            {props.schedule.nextDueDate
              ? `Next date: ${formatDate(props.schedule.nextDueDate)}`
              : "No next date"}
          </span>
          <span>
            {props.schedule.nextDueOdometer
              ? `Next odometer: ${formatOdometer(props.schedule.nextDueOdometer)} km`
              : "No next odometer"}
          </span>
          <span className={`schedule-status-pill ${props.schedule.dueStatus}`}>
            {scheduleStatusLabel(props.schedule.dueStatus)}
          </span>
        </div>
      ) : null}

      {props.reminder.notes ? (
        <div className="maintenance-action-note">{props.reminder.notes}</div>
      ) : null}

      <div className="maintenance-card-actions">
        <button className="secondary-button" type="button" onClick={props.onEdit}>
          Edit
        </button>
        <button className="secondary-button danger-text" type="button" onClick={props.onArchive}>
          Remove reminder
        </button>
      </div>
    </article>
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

function emptyReminderForm(): ReminderFormState {
  return {
    settingId: "",
    templateId: "",
    intervalDays: "",
    intervalKm: "",
    dueSoonDays: "",
    dueSoonKm: "",
    notes: "",
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

function prepareReminderRequest(
  vehicleId: string,
  form: ReminderFormState,
): { errors: string[]; request?: UpsertVehicleMaintenanceSettingRequest } {
  const errors: string[] = [];
  const templateId = form.templateId.trim();
  const customTimeIntervalDays = optionalPositiveInteger(
    form.intervalDays,
    "Days interval",
    errors,
  );
  const customOdometerIntervalKm = optionalPositiveInteger(form.intervalKm, "Km interval", errors);
  const customDueSoonDays = optionalNonNegativeInteger(
    form.dueSoonDays,
    "Warn days before",
    errors,
  );
  const customDueSoonKm = optionalNonNegativeInteger(form.dueSoonKm, "Warn km before", errors);

  if (!templateId) {
    errors.push("Choose a maintenance item for this reminder.");
  }

  if (!customTimeIntervalDays && !customOdometerIntervalKm) {
    errors.push("Set at least one reminder interval, such as every 90 days or every 5,000 km.");
  }

  if (errors.length > 0) {
    return { errors };
  }

  return {
    errors: [],
    request: {
      vehicleId,
      templateId,
      status: "active",
      customTimeIntervalDays,
      customOdometerIntervalKm,
      customDueSoonDays,
      customDueSoonKm,
      notes: trimToUndefined(form.notes),
    },
  };
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
