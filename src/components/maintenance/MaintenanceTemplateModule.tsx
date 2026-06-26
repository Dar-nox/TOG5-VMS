import { useCallback, useEffect, useMemo, useState } from "react";
import {
  completeMaintenanceSchedule,
  getApplicableMaintenanceTemplatesForVehicle,
  listMaintenanceSchedulesForVehicle,
  listMaintenanceTemplates,
  refreshMaintenanceAlertsForVehicle,
  storeMaintenancePhoto,
  storeMaintenanceReceipt,
  syncMaintenanceSchedulesForVehicle,
  type ApplicableMaintenanceTemplate,
  type CompleteMaintenanceScheduleRequest,
  type MaintenanceScheduleRecord,
  type MaintenanceTemplateRecord,
} from "../../services/api/maintenance";
import { listVehicles, type VehicleRecord } from "../../services/api/vehicles";

type MaintenanceTab = "schedules" | "applicability" | "library";
type CompletionFormState = {
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

type ApplicabilitySummary = Record<ApplicableMaintenanceTemplate["applicabilityStatus"], number>;

const maintenanceTabs: Array<{ id: MaintenanceTab; label: string }> = [
  { id: "schedules", label: "Schedules" },
  { id: "applicability", label: "Applicability" },
  { id: "library", label: "Template Library" },
];

export function MaintenanceTemplateModule() {
  const [templates, setTemplates] = useState<MaintenanceTemplateRecord[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<MaintenanceTab>("schedules");
  const [applicability, setApplicability] = useState<ApplicableMaintenanceTemplate[]>([]);
  const [schedules, setSchedules] = useState<MaintenanceScheduleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [applicabilityLoading, setApplicabilityLoading] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleActionLoading, setScheduleActionLoading] = useState(false);
  const [scheduleActionMessage, setScheduleActionMessage] = useState<string | null>(null);
  const [completionSchedule, setCompletionSchedule] = useState<MaintenanceScheduleRecord | null>(
    null,
  );
  const [completionForm, setCompletionForm] = useState<CompletionFormState>(() =>
    emptyCompletionForm(),
  );
  const [completionReceiptFile, setCompletionReceiptFile] = useState<File | null>(null);
  const [beforePhotoFile, setBeforePhotoFile] = useState<File | null>(null);
  const [afterPhotoFile, setAfterPhotoFile] = useState<File | null>(null);
  const [completionIssues, setCompletionIssues] = useState<string[]>([]);
  const [completionLoading, setCompletionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === selectedVehicleId) ?? null,
    [selectedVehicleId, vehicles],
  );

  const applicabilitySummary = useMemo<ApplicabilitySummary>(
    () =>
      applicability.reduce<ApplicabilitySummary>(
        (summary, result) => ({
          ...summary,
          [result.applicabilityStatus]: summary[result.applicabilityStatus] + 1,
        }),
        { applicable: 0, excluded: 0, requires_feature: 0, not_applicable: 0 },
      ),
    [applicability],
  );

  const templatesByCategory = useMemo(() => {
    const groups = new Map<string, MaintenanceTemplateRecord[]>();

    for (const template of templates) {
      const categoryTemplates = groups.get(template.category) ?? [];
      categoryTemplates.push(template);
      groups.set(template.category, categoryTemplates);
    }

    return Array.from(groups, ([category, categoryTemplates]) => ({
      category,
      templates: categoryTemplates,
    }));
  }, [templates]);

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
      setApplicability([]);
      setSchedules([]);
      return;
    }

    let cancelled = false;
    setApplicabilityLoading(true);
    setScheduleLoading(true);
    setScheduleActionMessage(null);
    setErrorMessage(null);

    void Promise.all([
      getApplicableMaintenanceTemplatesForVehicle(selectedVehicleId),
      listMaintenanceSchedulesForVehicle(selectedVehicleId),
    ])
      .then(([results, scheduleRecords]) => {
        if (!cancelled) {
          setApplicability(results);
          setSchedules(scheduleRecords);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setErrorMessage(messageFromError(error));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setApplicabilityLoading(false);
          setScheduleLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedVehicleId]);

  const handleSyncSchedules = useCallback(async () => {
    if (!selectedVehicleId) {
      return;
    }

    setScheduleActionLoading(true);
    setScheduleActionMessage(null);
    setErrorMessage(null);

    try {
      const syncResult = await syncMaintenanceSchedulesForVehicle(selectedVehicleId);
      const alertResult = await refreshMaintenanceAlertsForVehicle(selectedVehicleId);
      setSchedules(syncResult.schedules);
      setScheduleActionMessage(
        `${syncResult.createdCount} schedules created, ${syncResult.updatedCount} statuses refreshed, and ${alertResult.createdCount} alerts created.`,
      );
    } catch (error) {
      setErrorMessage(messageFromError(error));
    } finally {
      setScheduleActionLoading(false);
    }
  }, [selectedVehicleId]);

  const handleRefreshAlerts = useCallback(async () => {
    if (!selectedVehicleId) {
      return;
    }

    setScheduleActionLoading(true);
    setScheduleActionMessage(null);
    setErrorMessage(null);

    try {
      const alertResult = await refreshMaintenanceAlertsForVehicle(selectedVehicleId);
      const scheduleRecords = await listMaintenanceSchedulesForVehicle(selectedVehicleId);
      setSchedules(scheduleRecords);
      setScheduleActionMessage(
        `${alertResult.createdCount} alerts created, ${alertResult.updatedCount} alerts updated, and ${alertResult.resolvedCount} old alerts resolved.`,
      );
    } catch (error) {
      setErrorMessage(messageFromError(error));
    } finally {
      setScheduleActionLoading(false);
    }
  }, [selectedVehicleId]);

  const handleOpenCompletion = useCallback(
    (schedule: MaintenanceScheduleRecord) => {
      setCompletionSchedule(schedule);
      setCompletionForm(emptyCompletionForm(selectedVehicle));
      setCompletionReceiptFile(null);
      setBeforePhotoFile(null);
      setAfterPhotoFile(null);
      setCompletionIssues([]);
      setScheduleActionMessage(null);
    },
    [selectedVehicle],
  );

  const handleCompletionFieldChange = useCallback(
    <Field extends keyof CompletionFormState>(field: Field, value: CompletionFormState[Field]) => {
      setCompletionForm((currentForm) => ({ ...currentForm, [field]: value }));
      setCompletionIssues([]);
    },
    [],
  );

  const handleCompleteSchedule = useCallback(async () => {
    if (!selectedVehicleId || !completionSchedule) {
      return;
    }

    const prepared = prepareCompletionRequest(completionSchedule.id, completionForm);
    setCompletionIssues(prepared.errors);

    if (!prepared.request) {
      return;
    }

    setCompletionLoading(true);
    setErrorMessage(null);
    setScheduleActionMessage(null);

    try {
      let receiptDocumentId = prepared.request.receiptDocumentId;
      let beforePhotoId = prepared.request.beforePhotoId;
      let afterPhotoId = prepared.request.afterPhotoId;

      if (completionReceiptFile) {
        const receipt = await storeMaintenanceReceipt(selectedVehicleId, completionReceiptFile);
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

      const result = await completeMaintenanceSchedule({
        ...prepared.request,
        receiptDocumentId,
        beforePhotoId,
        afterPhotoId,
      });
      const [scheduleRecords, alertResult] = await Promise.all([
        listMaintenanceSchedulesForVehicle(selectedVehicleId),
        refreshMaintenanceAlertsForVehicle(selectedVehicleId),
      ]);

      setSchedules(scheduleRecords);
      setCompletionSchedule(null);
      setCompletionReceiptFile(null);
      setBeforePhotoFile(null);
      setAfterPhotoFile(null);
      setCompletionIssues([]);
      setScheduleActionMessage(
        `${result.log.templateName ?? "Maintenance"} completed. ${result.resolvedAlertCount} alerts resolved and ${alertResult.createdCount} current alerts created.`,
      );
    } catch (error) {
      setErrorMessage(messageFromError(error));
    } finally {
      setCompletionLoading(false);
    }
  }, [
    afterPhotoFile,
    beforePhotoFile,
    completionForm,
    completionReceiptFile,
    completionSchedule,
    selectedVehicleId,
  ]);

  return (
    <div className="maintenance-module">
      <section className="maintenance-workspace">
        <div className="maintenance-workspace-header">
          <div>
            <h2>Maintenance</h2>
            <p>
              Work from vehicle schedules first, then review applicability and the default template
              library when you need reference details.
            </p>
          </div>

          {vehicles.length > 0 ? (
            <label className="maintenance-vehicle-select">
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
          ) : (
            <div className="maintenance-empty-note">
              Add a vehicle first to create schedules and preview template applicability.
            </div>
          )}
        </div>

        {selectedVehicle ? (
          <div className="vehicle-rule-summary" aria-label="Selected vehicle maintenance inputs">
            <span>{labelValue("Vehicle type", selectedVehicle.vehicleType)}</span>
            <span>{labelValue("Fuel", selectedVehicle.fuelType)}</span>
            <span>{labelValue("Transmission", selectedVehicle.transmissionType)}</span>
            <span>{labelValue("Drivetrain", selectedVehicle.drivetrain)}</span>
          </div>
        ) : null}

        <div className="maintenance-command-bar">
          <div>
            <strong>{selectedVehicle ? selectedVehicle.vehicleName : "No vehicle selected"}</strong>
            <span>
              Schedules are created only from templates that auto-apply to the selected vehicle.
            </span>
          </div>

          <div className="maintenance-action-row">
            <button
              className="primary-button"
              disabled={!selectedVehicleId || scheduleActionLoading}
              type="button"
              onClick={handleSyncSchedules}
            >
              {scheduleActionLoading ? "Working..." : "Create / sync schedules"}
            </button>
            <button
              className="secondary-button"
              disabled={!selectedVehicleId || scheduleActionLoading}
              type="button"
              onClick={handleRefreshAlerts}
            >
              Refresh alerts
            </button>
          </div>
        </div>

        {scheduleActionMessage ? (
          <div className="maintenance-action-note">{scheduleActionMessage}</div>
        ) : null}

        {errorMessage ? <div className="inline-error">{errorMessage}</div> : null}

        <div className="maintenance-tabs" role="tablist" aria-label="Maintenance sections">
          {maintenanceTabs.map((tab) => (
            <button
              key={tab.id}
              aria-selected={activeTab === tab.id}
              className={activeTab === tab.id ? "active" : ""}
              role="tab"
              type="button"
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="maintenance-tab-panel" role="tabpanel">
          {activeTab === "schedules" ? (
            <SchedulesPanel
              completionLoading={completionLoading}
              completionSchedule={completionSchedule}
              completionForm={completionForm}
              completionIssues={completionIssues}
              scheduleLoading={scheduleLoading}
              schedules={schedules}
              selectedVehicleId={selectedVehicleId}
              onAfterPhotoChange={setAfterPhotoFile}
              onBeforePhotoChange={setBeforePhotoFile}
              onCancelCompletion={() => setCompletionSchedule(null)}
              onCompleteSchedule={() => void handleCompleteSchedule()}
              onCompletionFieldChange={handleCompletionFieldChange}
              onOpenCompletion={handleOpenCompletion}
              onReceiptChange={setCompletionReceiptFile}
            />
          ) : null}

          {activeTab === "applicability" ? (
            <ApplicabilityPanel
              applicability={applicability}
              applicabilityLoading={applicabilityLoading}
              selectedVehicleId={selectedVehicleId}
              summary={applicabilitySummary}
            />
          ) : null}

          {activeTab === "library" ? (
            <TemplateLibraryPanel
              loading={loading}
              templateGroups={templatesByCategory}
              templates={templates}
            />
          ) : null}
        </div>
      </section>
    </div>
  );
}

function SchedulesPanel(props: {
  completionLoading: boolean;
  completionSchedule: MaintenanceScheduleRecord | null;
  completionForm: CompletionFormState;
  completionIssues: string[];
  scheduleLoading: boolean;
  schedules: MaintenanceScheduleRecord[];
  selectedVehicleId: string;
  onAfterPhotoChange: (file: File | null) => void;
  onBeforePhotoChange: (file: File | null) => void;
  onCancelCompletion: () => void;
  onCompleteSchedule: () => void;
  onCompletionFieldChange: <Field extends keyof CompletionFormState>(
    field: Field,
    value: CompletionFormState[Field],
  ) => void;
  onOpenCompletion: (schedule: MaintenanceScheduleRecord) => void;
  onReceiptChange: (file: File | null) => void;
}) {
  if (props.scheduleLoading) {
    return <div className="maintenance-empty-note">Loading vehicle schedules...</div>;
  }

  if (!props.selectedVehicleId) {
    return (
      <div className="maintenance-empty-note">
        Add or select a vehicle before creating schedules.
      </div>
    );
  }

  if (props.schedules.length === 0) {
    return (
      <div className="maintenance-empty-note">
        No schedules yet. Use Create / sync schedules to generate them from applicable templates.
      </div>
    );
  }

  return (
    <div className="maintenance-panel-stack">
      {props.completionSchedule ? (
        <MaintenanceCompletionPanel
          completionLoading={props.completionLoading}
          form={props.completionForm}
          issues={props.completionIssues}
          schedule={props.completionSchedule}
          onAfterPhotoChange={props.onAfterPhotoChange}
          onBeforePhotoChange={props.onBeforePhotoChange}
          onCancel={props.onCancelCompletion}
          onFieldChange={props.onCompletionFieldChange}
          onReceiptChange={props.onReceiptChange}
          onSubmit={props.onCompleteSchedule}
        />
      ) : null}

      <div className="maintenance-schedule-list" aria-label="Vehicle maintenance schedules">
        {props.schedules.map((schedule) => (
          <MaintenanceScheduleCard
            key={schedule.id}
            schedule={schedule}
            onComplete={props.onOpenCompletion}
          />
        ))}
      </div>
    </div>
  );
}

function ApplicabilityPanel(props: {
  applicability: ApplicableMaintenanceTemplate[];
  applicabilityLoading: boolean;
  selectedVehicleId: string;
  summary: ApplicabilitySummary;
}) {
  if (props.applicabilityLoading) {
    return <div className="maintenance-empty-note">Checking template applicability...</div>;
  }

  if (!props.selectedVehicleId) {
    return (
      <div className="maintenance-empty-note">
        Add or select a vehicle to preview template applicability.
      </div>
    );
  }

  return (
    <div className="maintenance-panel-stack">
      <div className="applicability-summary" aria-label="Applicability summary">
        <span>Auto-applies: {props.summary.applicable}</span>
        <span>Excluded: {props.summary.excluded}</span>
        <span>Needs feature: {props.summary.requires_feature}</span>
        <span>Not applicable: {props.summary.not_applicable}</span>
      </div>

      <div className="maintenance-template-list" aria-label="Applicable maintenance templates">
        {props.applicability.map((result) => (
          <MaintenanceTemplateCard
            key={result.template.id}
            compact
            result={result}
            showApplicability
          />
        ))}
      </div>
    </div>
  );
}

function TemplateLibraryPanel(props: {
  loading: boolean;
  templateGroups: Array<{ category: string; templates: MaintenanceTemplateRecord[] }>;
  templates: MaintenanceTemplateRecord[];
}) {
  if (props.loading) {
    return <div className="maintenance-empty-note">Loading templates...</div>;
  }

  if (props.templates.length === 0) {
    return (
      <div className="maintenance-empty-note">No maintenance templates are available yet.</div>
    );
  }

  return (
    <div className="template-library-groups" aria-label="Default maintenance template library">
      {props.templateGroups.map((group) => (
        <section key={group.category} className="template-library-group">
          <h3>{labelValue("", group.category)}</h3>
          <div className="template-library-list">
            {group.templates.map((template) => (
              <MaintenanceTemplateCard key={template.id} template={template} compact />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function MaintenanceTemplateCard(props: {
  result?: ApplicableMaintenanceTemplate;
  showApplicability?: boolean;
  compact?: boolean;
  template?: MaintenanceTemplateRecord;
}) {
  const template = props.result?.template ?? props.template;

  if (!template) {
    return null;
  }

  return (
    <article
      className={`maintenance-template-card ${props.compact ? "compact" : ""} ${
        props.showApplicability ? "with-applicability" : ""
      }`}
    >
      <div className="maintenance-template-main">
        <div className="maintenance-card-heading">
          <span className="maintenance-category">{labelValue("", template.category)}</span>
          <span className={`priority-pill ${template.priority}`}>
            {labelValue("", template.priority)}
          </span>
        </div>

        <h3>{template.name}</h3>
        {template.description ? <p>{template.description}</p> : null}

        <div className="maintenance-intervals">
          <span>{intervalDays(template.defaultTimeIntervalDays)}</span>
          <span>{intervalKm(template.defaultOdometerIntervalKm)}</span>
        </div>
      </div>

      {props.showApplicability && props.result ? (
        <div className={`applicability-note ${props.result.applicabilityStatus}`}>
          <strong>{statusLabel(props.result.applicabilityStatus)}</strong>
          <span>{props.result.reason}</span>
          {props.result.warnings.map((warning) => (
            <span key={warning}>{warning}</span>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function MaintenanceScheduleCard({
  schedule,
  onComplete,
}: {
  schedule: MaintenanceScheduleRecord;
  onComplete: (schedule: MaintenanceScheduleRecord) => void;
}) {
  return (
    <article className="maintenance-schedule-card">
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
          {schedule.nextDueDate ? `Date: ${formatDate(schedule.nextDueDate)}` : "No due date"}
        </span>
        <span>
          {schedule.nextDueOdometer
            ? `Odometer: ${formatOdometer(schedule.nextDueOdometer)} km`
            : "No odometer target"}
        </span>
        <span>
          Due soon: {schedule.dueSoonDays} days / {schedule.dueSoonKm.toLocaleString()} km
        </span>
      </div>

      {schedule.notes ? <div className="maintenance-action-note">{schedule.notes}</div> : null}

      <div className="maintenance-card-actions">
        <button className="primary-button" type="button" onClick={() => onComplete(schedule)}>
          Complete
        </button>
      </div>
    </article>
  );
}

function MaintenanceCompletionPanel(props: {
  completionLoading: boolean;
  form: CompletionFormState;
  issues: string[];
  schedule: MaintenanceScheduleRecord;
  onAfterPhotoChange: (file: File | null) => void;
  onBeforePhotoChange: (file: File | null) => void;
  onCancel: () => void;
  onFieldChange: <Field extends keyof CompletionFormState>(
    field: Field,
    value: CompletionFormState[Field],
  ) => void;
  onReceiptChange: (file: File | null) => void;
  onSubmit: () => void;
}) {
  return (
    <section className="maintenance-completion-panel" aria-label="Complete maintenance schedule">
      <div>
        <h3>Complete {props.schedule.templateName}</h3>
        <p>
          Save the service details, update the next due target, and resolve related maintenance
          alerts.
        </p>
      </div>

      <div className="maintenance-completion-grid">
        <label className="form-field">
          <span>Completion date</span>
          <input
            required
            type="date"
            value={props.form.completedDate}
            onChange={(event) => props.onFieldChange("completedDate", event.target.value)}
          />
        </label>

        <label className="form-field">
          <span>Completion odometer</span>
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
        <button className="secondary-button" type="button" onClick={props.onCancel}>
          Cancel
        </button>
        <button
          className="primary-button"
          disabled={props.completionLoading}
          type="button"
          onClick={props.onSubmit}
        >
          {props.completionLoading ? "Saving..." : "Save completion"}
        </button>
      </div>
    </section>
  );
}

function intervalDays(days?: number | null) {
  if (!days) {
    return "No time interval";
  }

  if (days % 30 === 0) {
    const months = days / 30;
    return `${months} ${months === 1 ? "month" : "months"}`;
  }

  return `${days} days`;
}

function intervalKm(kilometers?: number | null) {
  return kilometers ? `${kilometers.toLocaleString()} km` : "No odometer interval";
}

function emptyCompletionForm(vehicle?: VehicleRecord | null): CompletionFormState {
  return {
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

function prepareCompletionRequest(
  scheduleId: string,
  form: CompletionFormState,
): { errors: string[]; request?: CompleteMaintenanceScheduleRequest } {
  const errors: string[] = [];
  const completedDate = form.completedDate.trim();
  const workPerformed = form.workPerformed.trim();
  const odometer = optionalNonNegativeNumber(form.odometer, "Completion odometer", errors);
  const laborCost = optionalNonNegativeNumber(form.laborCost, "Labor cost", errors);
  const partsCost = optionalNonNegativeNumber(form.partsCost, "Parts cost", errors);
  const totalCost = optionalNonNegativeNumber(form.totalCost, "Total cost", errors);

  if (!completedDate) {
    errors.push("Completion date is required.");
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
      scheduleId,
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

function trimToUndefined(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function statusLabel(status: ApplicableMaintenanceTemplate["applicabilityStatus"]) {
  switch (status) {
    case "applicable":
      return "Auto-applies";
    case "excluded":
      return "Excluded";
    case "requires_feature":
      return "Needs feature";
    case "not_applicable":
      return "Not applicable";
    default:
      return status;
  }
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
