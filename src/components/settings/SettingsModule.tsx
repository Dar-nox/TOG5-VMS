import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  getAccessSummary,
  getAppSettings,
  listLocalUsers,
  resetAppSettings,
  updateAppSettings,
  updateLocalUser,
  type AccessSummary,
  type AppSettings,
  type AppSettingsResponse,
  type LocalUserRecord,
} from "../../services/api/settings";

type SettingsFormState = {
  preferredCurrency: string;
  distanceUnit: string;
  fuelEfficiencyUnit: string;
  dateDisplayPreference: string;
  defaultDueSoonDays: string;
  defaultDueSoonKm: string;
  includeSetupNeededSchedules: boolean;
  backupReminderEnabled: boolean;
  backupReminderIntervalDays: string;
  maintenanceAlertsEnabled: boolean;
  fuelEfficiencyAlertsEnabled: boolean;
  startupOnBootEnabled: boolean;
};

type UserFormState = {
  id: string;
  displayName: string;
  role: string;
};

const roleLabels: Record<string, string> = {
  manager: "Manager",
  owner: "Owner",
  viewer: "Viewer",
};

export function SettingsModule() {
  const [settingsResponse, setSettingsResponse] = useState<AppSettingsResponse | null>(null);
  const [accessSummary, setAccessSummary] = useState<AccessSummary | null>(null);
  const [users, setUsers] = useState<LocalUserRecord[]>([]);
  const [settingsForm, setSettingsForm] = useState<SettingsFormState>(() =>
    formFromSettings(defaultSettings()),
  );
  const [userForm, setUserForm] = useState<UserFormState>({
    displayName: "",
    id: "",
    role: "owner",
  });
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formIssues, setFormIssues] = useState<string[]>([]);

  const roles = useMemo(() => accessSummary?.roles ?? [], [accessSummary]);

  const applyLoadedState = useCallback(
    (response: AppSettingsResponse, userRecords: LocalUserRecord[], access: AccessSummary) => {
      setSettingsResponse(response);
      setAccessSummary(access);
      setUsers(userRecords);
      setSettingsForm(formFromSettings(response.settings));
      setUserForm({
        id: response.activeUser.id,
        displayName: response.activeUser.displayName,
        role: response.activeUser.role,
      });
    },
    [],
  );

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const [response, userRecords, access] = await Promise.all([
        getAppSettings(),
        listLocalUsers(),
        getAccessSummary(),
      ]);
      applyLoadedState(response, userRecords, access);
    } catch (error) {
      setErrorMessage(messageFromError(error));
    } finally {
      setLoading(false);
    }
  }, [applyLoadedState]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleSettingsChange = useCallback(
    <Field extends keyof SettingsFormState>(field: Field, value: SettingsFormState[Field]) => {
      setSettingsForm((currentForm) => ({ ...currentForm, [field]: value }));
      setFormIssues([]);
    },
    [],
  );

  const handleSaveSettings = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const prepared = prepareSettings(settingsForm);
      setFormIssues(prepared.errors);

      if (!prepared.request) {
        return;
      }

      setSavingSettings(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      try {
        const response = await updateAppSettings(prepared.request);
        const [userRecords, access] = await Promise.all([listLocalUsers(), getAccessSummary()]);
        applyLoadedState(response, userRecords, access);
        setSuccessMessage("Settings saved locally.");
      } catch (error) {
        setErrorMessage(messageFromError(error));
      } finally {
        setSavingSettings(false);
      }
    },
    [applyLoadedState, settingsForm],
  );

  const handleResetSettings = useCallback(async () => {
    setResetting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setFormIssues([]);

    try {
      const response = await resetAppSettings();
      const [userRecords, access] = await Promise.all([listLocalUsers(), getAccessSummary()]);
      applyLoadedState(response, userRecords, access);
      setSuccessMessage("Settings reset to local defaults.");
    } catch (error) {
      setErrorMessage(messageFromError(error));
    } finally {
      setResetting(false);
    }
  }, [applyLoadedState]);

  const handleSaveUser = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!userForm.displayName.trim()) {
        setErrorMessage("Display name is required.");
        return;
      }

      setSavingUser(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      try {
        await updateLocalUser({
          id: userForm.id,
          displayName: userForm.displayName,
          role: userForm.role,
        });
        await loadSettings();
        setSuccessMessage("Local user profile saved.");
      } catch (error) {
        setErrorMessage(messageFromError(error));
      } finally {
        setSavingUser(false);
      }
    },
    [loadSettings, userForm],
  );

  return (
    <div className="settings-module">
      <section className="settings-workspace">
        <div className="settings-header">
          <div>
            <h2>Settings</h2>
            <p>
              Local preferences, access scaffolding, backup reminders, and data safety notes for
              this device.
            </p>
          </div>

          <button
            className="secondary-button"
            disabled={loading || resetting}
            type="button"
            onClick={() => void handleResetSettings()}
          >
            {resetting ? "Resetting..." : "Reset to defaults"}
          </button>
        </div>

        {loading ? <div className="maintenance-empty-note">Loading settings...</div> : null}
        {errorMessage ? <div className="inline-error">{errorMessage}</div> : null}
        {successMessage ? <div className="backup-success-note">{successMessage}</div> : null}

        {settingsResponse && accessSummary ? (
          <>
            <ProfileAccessSection
              accessSummary={accessSummary}
              roles={roles}
              saving={savingUser}
              userForm={userForm}
              users={users}
              onFieldChange={(field, value) =>
                setUserForm((currentForm) => ({ ...currentForm, [field]: value }))
              }
              onSubmit={handleSaveUser}
            />

            <form className="settings-section-stack" onSubmit={handleSaveSettings}>
              <GeneralPreferencesSection form={settingsForm} onFieldChange={handleSettingsChange} />
              <MaintenanceAlertsSection form={settingsForm} onFieldChange={handleSettingsChange} />
              <BackupSafetySection
                dataSafety={settingsResponse.dataSafety}
                form={settingsForm}
                reminder={settingsResponse.backupReminder}
                onFieldChange={handleSettingsChange}
              />
              <StartupBehaviorSection form={settingsForm} onFieldChange={handleSettingsChange} />

              {formIssues.length > 0 ? (
                <div className="inline-error">
                  {formIssues.map((issue) => (
                    <span key={issue}>{issue}</span>
                  ))}
                </div>
              ) : null}

              <div className="settings-actions">
                <button className="primary-button" disabled={savingSettings} type="submit">
                  {savingSettings ? "Saving settings..." : "Save settings"}
                </button>
              </div>
            </form>
          </>
        ) : null}
      </section>
    </div>
  );
}

function ProfileAccessSection(props: {
  accessSummary: AccessSummary;
  users: LocalUserRecord[];
  roles: AccessSummary["roles"];
  userForm: UserFormState;
  saving: boolean;
  onFieldChange: <Field extends keyof UserFormState>(
    field: Field,
    value: UserFormState[Field],
  ) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="settings-card">
      <div>
        <h3>Profile & Access</h3>
        <p>
          Local role scaffolding is available now. Login, app lock, and permission enforcement are
          future hardening work.
        </p>
      </div>

      <form className="settings-form-grid" onSubmit={props.onSubmit}>
        <label className="form-field">
          <span>Display name</span>
          <input
            required
            type="text"
            value={props.userForm.displayName}
            onChange={(event) => props.onFieldChange("displayName", event.target.value)}
          />
        </label>

        <label className="form-field">
          <span>Local role</span>
          <select
            value={props.userForm.role}
            onChange={(event) => props.onFieldChange("role", event.target.value)}
          >
            {props.roles.map((role) => (
              <option key={role.key} value={role.key}>
                {role.label}
              </option>
            ))}
          </select>
        </label>

        <div className="settings-form-wide settings-access-note">
          <strong>{props.accessSummary.activeUser.displayName}</strong>
          <span>{props.accessSummary.securityNote}</span>
        </div>

        <div className="settings-actions settings-form-wide">
          <button className="primary-button" disabled={props.saving} type="submit">
            {props.saving ? "Saving profile..." : "Save profile"}
          </button>
        </div>
      </form>

      <div className="settings-role-grid">
        {props.roles.map((role) => (
          <article className="settings-role-card" key={role.key}>
            <strong>{role.label}</strong>
            <span>{role.description}</span>
          </article>
        ))}
      </div>

      <div className="settings-user-list">
        {props.users.map((user) => (
          <div className="settings-user-row" key={user.id}>
            <span>{user.displayName}</span>
            <em>{roleLabels[user.role] ?? user.role}</em>
          </div>
        ))}
      </div>
    </section>
  );
}

function GeneralPreferencesSection(props: {
  form: SettingsFormState;
  onFieldChange: <Field extends keyof SettingsFormState>(
    field: Field,
    value: SettingsFormState[Field],
  ) => void;
}) {
  return (
    <section className="settings-card">
      <div>
        <h3>General Preferences</h3>
        <p>These affect display labels only. Stored values stay in the original local units.</p>
      </div>

      <div className="settings-form-grid">
        <label className="form-field">
          <span>Preferred currency</span>
          <input
            maxLength={3}
            type="text"
            value={props.form.preferredCurrency}
            onChange={(event) => props.onFieldChange("preferredCurrency", event.target.value)}
          />
        </label>

        <label className="form-field">
          <span>Distance unit</span>
          <select
            value={props.form.distanceUnit}
            onChange={(event) => props.onFieldChange("distanceUnit", event.target.value)}
          >
            <option value="km">Kilometers</option>
            <option value="mi">Miles</option>
          </select>
        </label>

        <label className="form-field">
          <span>Fuel efficiency display</span>
          <select
            value={props.form.fuelEfficiencyUnit}
            onChange={(event) => props.onFieldChange("fuelEfficiencyUnit", event.target.value)}
          >
            <option value="km_per_liter">km/L</option>
            <option value="liters_per_100km">L/100 km</option>
          </select>
        </label>

        <label className="form-field">
          <span>Date display</span>
          <select
            value={props.form.dateDisplayPreference}
            onChange={(event) => props.onFieldChange("dateDisplayPreference", event.target.value)}
          >
            <option value="yyyy_mm_dd">YYYY-MM-DD</option>
            <option value="dd_mm_yyyy">DD/MM/YYYY</option>
            <option value="mm_dd_yyyy">MM/DD/YYYY</option>
          </select>
        </label>
      </div>
    </section>
  );
}

function MaintenanceAlertsSection(props: {
  form: SettingsFormState;
  onFieldChange: <Field extends keyof SettingsFormState>(
    field: Field,
    value: SettingsFormState[Field],
  ) => void;
}) {
  return (
    <section className="settings-card">
      <div>
        <h3>Maintenance & Alerts</h3>
        <p>
          Due-soon defaults apply to newly synced schedules. Existing schedules keep their stored
          thresholds unless edited later.
        </p>
      </div>

      <div className="settings-form-grid">
        <label className="form-field">
          <span>Default due-soon days</span>
          <input
            min="0"
            step="1"
            type="number"
            value={props.form.defaultDueSoonDays}
            onChange={(event) => props.onFieldChange("defaultDueSoonDays", event.target.value)}
          />
        </label>

        <label className="form-field">
          <span>Default due-soon km</span>
          <input
            min="0"
            step="1"
            type="number"
            value={props.form.defaultDueSoonKm}
            onChange={(event) => props.onFieldChange("defaultDueSoonKm", event.target.value)}
          />
        </label>

        <SettingsToggle
          checked={props.form.includeSetupNeededSchedules}
          label="Include setup-needed schedules in attention lists"
          onChange={(value) => props.onFieldChange("includeSetupNeededSchedules", value)}
        />

        <SettingsToggle
          checked={props.form.maintenanceAlertsEnabled}
          label="Create in-app maintenance alerts"
          onChange={(value) => props.onFieldChange("maintenanceAlertsEnabled", value)}
        />

        <SettingsToggle
          checked={props.form.fuelEfficiencyAlertsEnabled}
          label="Create fuel-efficiency-drop alerts"
          onChange={(value) => props.onFieldChange("fuelEfficiencyAlertsEnabled", value)}
        />
      </div>
    </section>
  );
}

function BackupSafetySection(props: {
  form: SettingsFormState;
  reminder: AppSettingsResponse["backupReminder"];
  dataSafety: AppSettingsResponse["dataSafety"];
  onFieldChange: <Field extends keyof SettingsFormState>(
    field: Field,
    value: SettingsFormState[Field],
  ) => void;
}) {
  return (
    <section className="settings-card">
      <div>
        <h3>Backup & Local Data Safety</h3>
        <p>Backups stay local. Database encryption is not enabled in this build.</p>
      </div>

      <div className="settings-form-grid">
        <SettingsToggle
          checked={props.form.backupReminderEnabled}
          label="Show backup reminder messaging"
          onChange={(value) => props.onFieldChange("backupReminderEnabled", value)}
        />

        <label className="form-field">
          <span>Backup reminder interval days</span>
          <input
            min="1"
            step="1"
            type="number"
            value={props.form.backupReminderIntervalDays}
            onChange={(event) =>
              props.onFieldChange("backupReminderIntervalDays", event.target.value)
            }
          />
        </label>
      </div>

      <div className={props.reminder.reminderDue ? "settings-reminder due" : "settings-reminder"}>
        <strong>{props.reminder.reminderDue ? "Backup reminder" : "Backup status"}</strong>
        <span>{props.reminder.message}</span>
        {props.reminder.latestBackupPath ? <em>{props.reminder.latestBackupPath}</em> : null}
      </div>

      <div className="settings-path-list">
        <PathRow label="Database" value={props.dataSafety.databasePath} />
        <PathRow label="App data folder" value={props.dataSafety.appDataDir} />
        <PathRow label="Backup package" value={props.dataSafety.backupPackageFormat} />
        <PathRow label="Encryption" value={props.dataSafety.encryptionStatus} />
      </div>
    </section>
  );
}

function StartupBehaviorSection(props: {
  form: SettingsFormState;
  onFieldChange: <Field extends keyof SettingsFormState>(
    field: Field,
    value: SettingsFormState[Field],
  ) => void;
}) {
  return (
    <section className="settings-card">
      <div>
        <h3>Startup & App Behavior</h3>
        <p>
          Startup preference is saved locally. Actual Windows startup registration belongs to
          packaging/startup hardening.
        </p>
      </div>

      <SettingsToggle
        checked={props.form.startupOnBootEnabled}
        label="Prefer starting TOG 5 VMS when Windows starts"
        onChange={(value) => props.onFieldChange("startupOnBootEnabled", value)}
      />
    </section>
  );
}

function SettingsToggle(props: {
  checked: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="settings-toggle">
      <input
        checked={props.checked}
        type="checkbox"
        onChange={(event) => props.onChange(event.target.checked)}
      />
      <span>{props.label}</span>
    </label>
  );
}

function PathRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="settings-path-row">
      <strong>{label}</strong>
      <span>{value}</span>
    </div>
  );
}

function prepareSettings(form: SettingsFormState): {
  errors: string[];
  request?: AppSettings;
} {
  const defaultDueSoonDays = parseInteger(form.defaultDueSoonDays);
  const defaultDueSoonKm = parseInteger(form.defaultDueSoonKm);
  const backupReminderIntervalDays = parseInteger(form.backupReminderIntervalDays);
  const currency = form.preferredCurrency.trim().toUpperCase();
  const errors: string[] = [];

  if (!/^[A-Z]{3}$/.test(currency)) {
    errors.push("Preferred currency must be a 3-letter code such as PHP.");
  }

  if (defaultDueSoonDays === undefined || defaultDueSoonDays < 0) {
    errors.push("Default due-soon days must be zero or higher.");
  }

  if (defaultDueSoonKm === undefined || defaultDueSoonKm < 0) {
    errors.push("Default due-soon kilometers must be zero or higher.");
  }

  if (backupReminderIntervalDays === undefined || backupReminderIntervalDays < 1) {
    errors.push("Backup reminder interval must be at least 1 day.");
  }

  if (errors.length > 0) {
    return { errors };
  }

  const parsedDefaultDueSoonDays = defaultDueSoonDays ?? 0;
  const parsedDefaultDueSoonKm = defaultDueSoonKm ?? 0;
  const parsedBackupReminderIntervalDays = backupReminderIntervalDays ?? 1;

  return {
    errors: [],
    request: {
      preferredCurrency: currency,
      distanceUnit: form.distanceUnit,
      fuelEfficiencyUnit: form.fuelEfficiencyUnit,
      dateDisplayPreference: form.dateDisplayPreference,
      defaultDueSoonDays: parsedDefaultDueSoonDays,
      defaultDueSoonKm: parsedDefaultDueSoonKm,
      includeSetupNeededSchedules: form.includeSetupNeededSchedules,
      backupReminderEnabled: form.backupReminderEnabled,
      backupReminderIntervalDays: parsedBackupReminderIntervalDays,
      maintenanceAlertsEnabled: form.maintenanceAlertsEnabled,
      fuelEfficiencyAlertsEnabled: form.fuelEfficiencyAlertsEnabled,
      startupOnBootEnabled: form.startupOnBootEnabled,
    },
  };
}

function formFromSettings(settings: AppSettings): SettingsFormState {
  return {
    preferredCurrency: settings.preferredCurrency,
    distanceUnit: settings.distanceUnit,
    fuelEfficiencyUnit: settings.fuelEfficiencyUnit,
    dateDisplayPreference: settings.dateDisplayPreference,
    defaultDueSoonDays: String(settings.defaultDueSoonDays),
    defaultDueSoonKm: String(settings.defaultDueSoonKm),
    includeSetupNeededSchedules: settings.includeSetupNeededSchedules,
    backupReminderEnabled: settings.backupReminderEnabled,
    backupReminderIntervalDays: String(settings.backupReminderIntervalDays),
    maintenanceAlertsEnabled: settings.maintenanceAlertsEnabled,
    fuelEfficiencyAlertsEnabled: settings.fuelEfficiencyAlertsEnabled,
    startupOnBootEnabled: settings.startupOnBootEnabled,
  };
}

function defaultSettings(): AppSettings {
  return {
    preferredCurrency: "PHP",
    distanceUnit: "km",
    fuelEfficiencyUnit: "km_per_liter",
    dateDisplayPreference: "yyyy_mm_dd",
    defaultDueSoonDays: 14,
    defaultDueSoonKm: 500,
    includeSetupNeededSchedules: true,
    backupReminderEnabled: true,
    backupReminderIntervalDays: 7,
    maintenanceAlertsEnabled: true,
    fuelEfficiencyAlertsEnabled: true,
    startupOnBootEnabled: false,
  };
}

function parseInteger(value: string): number | undefined {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : undefined;
}

function messageFromError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
