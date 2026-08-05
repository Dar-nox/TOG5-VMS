import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../../app/providers/authContext";
import { changeOwnPassword } from "../../services/api/auth";
import {
  getAccessSummary,
  getAppSettings,
  listUsers,
  resetAppSettings,
  updateAppSettings,
  updateUser,
  type AccessSummary,
  type AppSettings,
  type AppSettingsResponse,
  type UserRecord,
  type UserStatus,
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
};

const roleLabels: Record<string, string> = {
  manager: "Manager",
  owner: "Owner",
  viewer: "Viewer",
};

const statusLabels: Record<string, string> = {
  active: "Working",
  pending: "Waiting to be let in",
  inactive: "Switched off",
};

export function SettingsModule() {
  const { isOwner, user } = useAuth();
  const [settingsResponse, setSettingsResponse] = useState<AppSettingsResponse | null>(null);
  const [accessSummary, setAccessSummary] = useState<AccessSummary | null>(null);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [settingsForm, setSettingsForm] = useState<SettingsFormState>(() =>
    formFromSettings(defaultSettings()),
  );
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formIssues, setFormIssues] = useState<string[]>([]);

  const roles = useMemo(() => accessSummary?.roles ?? [], [accessSummary]);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const [response, userRecords, access] = await Promise.all([
        getAppSettings(),
        listUsers(),
        getAccessSummary(),
      ]);

      setSettingsResponse(response);
      setAccessSummary(access);
      setUsers(userRecords);
      setSettingsForm(formFromSettings(response.settings));
      setDisplayName(response.activeUser.displayName);
    } catch (error) {
      setErrorMessage(messageFromError(error));
    } finally {
      setLoading(false);
    }
  }, []);

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
      const prepared = prepareSettings(settingsForm, settingsResponse?.settings);
      setFormIssues(prepared.errors);

      if (!prepared.request) {
        return;
      }

      setSavingSettings(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      try {
        const response = await updateAppSettings(prepared.request);
        setSettingsResponse(response);
        setSettingsForm(formFromSettings(response.settings));
        setSuccessMessage("Settings saved. Everyone sees these.");
      } catch (error) {
        setErrorMessage(messageFromError(error));
      } finally {
        setSavingSettings(false);
      }
    },
    [settingsForm, settingsResponse],
  );

  const handleResetSettings = useCallback(async () => {
    setResetting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setFormIssues([]);

    try {
      const response = await resetAppSettings();
      setSettingsResponse(response);
      setSettingsForm(formFromSettings(response.settings));
      setSuccessMessage("Settings reset to their defaults.");
    } catch (error) {
      setErrorMessage(messageFromError(error));
    } finally {
      setResetting(false);
    }
  }, []);

  const handleSaveProfile = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!displayName.trim() || !user) {
        setErrorMessage("Display name is required.");
        return;
      }

      setSavingProfile(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      try {
        await updateUser({ id: user.id, displayName });
        await loadSettings();
        setSuccessMessage("Your name was saved.");
      } catch (error) {
        setErrorMessage(messageFromError(error));
      } finally {
        setSavingProfile(false);
      }
    },
    [displayName, loadSettings, user],
  );

  const handleUserChange = useCallback(
    async (id: string, change: { role?: string; status?: UserStatus }) => {
      setBusyUserId(id);
      setErrorMessage(null);
      setSuccessMessage(null);

      try {
        const updated = await updateUser({ id, ...change });
        setUsers((current) => current.map((record) => (record.id === id ? updated : record)));
        setSuccessMessage(`${updated.displayName} updated.`);
      } catch (error) {
        setErrorMessage(messageFromError(error));
      } finally {
        setBusyUserId(null);
      }
    },
    [],
  );

  return (
    <div className="settings-module">
      <section className="settings-workspace">
        <div className="settings-header">
          <div>
            <h2>Settings</h2>
            <p>
              Preferences everyone shares, who may use TOG 5 VMS, and keeping your own copy of the
              records.
            </p>
          </div>

          {isOwner ? (
            <button
              className="secondary-button"
              disabled={loading || resetting}
              type="button"
              onClick={() => void handleResetSettings()}
            >
              {resetting ? "Resetting..." : "Reset to defaults"}
            </button>
          ) : null}
        </div>

        {loading ? <div className="maintenance-empty-note">Loading settings...</div> : null}
        {errorMessage ? <div className="inline-error">{errorMessage}</div> : null}
        {successMessage ? <div className="backup-success-note">{successMessage}</div> : null}

        {settingsResponse && accessSummary ? (
          <>
            <YourAccountSection
              displayName={displayName}
              saving={savingProfile}
              securityNote={accessSummary.securityNote}
              onDisplayNameChange={setDisplayName}
              onSubmit={handleSaveProfile}
            />

            {isOwner ? (
              <PeopleSection
                busyUserId={busyUserId}
                currentUserId={user?.id ?? ""}
                roles={roles}
                users={users}
                onChange={handleUserChange}
              />
            ) : (
              <ColleaguesSection users={users} />
            )}

            <form className="settings-section-stack" onSubmit={handleSaveSettings}>
              <GeneralPreferencesSection
                form={settingsForm}
                readOnly={!isOwner}
                onFieldChange={handleSettingsChange}
              />
              <MaintenanceAlertsSection
                form={settingsForm}
                readOnly={!isOwner}
                onFieldChange={handleSettingsChange}
              />
              <ExportSafetySection
                form={settingsForm}
                readOnly={!isOwner}
                reminder={settingsResponse.backupReminder}
                onFieldChange={handleSettingsChange}
              />

              {formIssues.length > 0 ? (
                <div className="inline-error">
                  {formIssues.map((issue) => (
                    <span key={issue}>{issue}</span>
                  ))}
                </div>
              ) : null}

              {isOwner ? (
                <div className="settings-actions">
                  <button className="primary-button" disabled={savingSettings} type="submit">
                    {savingSettings ? "Saving settings..." : "Save settings"}
                  </button>
                </div>
              ) : (
                <div className="maintenance-empty-note">
                  Only the fleet owner can change these. They apply to everybody.
                </div>
              )}
            </form>
          </>
        ) : null}
      </section>
    </div>
  );
}

function YourAccountSection(props: {
  displayName: string;
  saving: boolean;
  securityNote: string;
  onDisplayNameChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [newPassword, setNewPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordNote, setPasswordNote] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  async function handleChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordNote(null);
    setPasswordError(null);

    if (newPassword.length < 8) {
      setPasswordError("Use at least 8 characters.");
      return;
    }

    setPasswordBusy(true);

    try {
      await changeOwnPassword(newPassword);
      setNewPassword("");
      setPasswordNote("Password changed. It applies the next time you sign in anywhere.");
    } catch (error) {
      setPasswordError(messageFromError(error));
    } finally {
      setPasswordBusy(false);
    }
  }

  return (
    <section className="settings-card">
      <div>
        <h3>Your account</h3>
        <p>{props.securityNote}</p>
      </div>

      <form className="settings-form-grid" onSubmit={props.onSubmit}>
        <label className="form-field">
          <span>Your name</span>
          <input
            required
            type="text"
            value={props.displayName}
            onChange={(event) => props.onDisplayNameChange(event.target.value)}
          />
        </label>

        <div className="settings-actions settings-form-wide">
          <button className="primary-button" disabled={props.saving} type="submit">
            {props.saving ? "Saving..." : "Save name"}
          </button>
        </div>
      </form>

      <form className="settings-form-grid" onSubmit={(event) => void handleChangePassword(event)}>
        <label className="form-field">
          <span>New password</span>
          {/*
            No minLength attribute on purpose. It makes the browser refuse the
            submit with a tooltip that is easy to miss, which reads as the
            button doing nothing — the check below says the same thing where
            the rest of the messages appear.
          */}
          <input
            autoComplete="new-password"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
        </label>

        <div className="settings-actions settings-form-wide">
          <button
            className="secondary-button"
            disabled={passwordBusy || newPassword.length === 0}
            type="submit"
          >
            {passwordBusy ? "Changing..." : "Change password"}
          </button>
        </div>

        {passwordNote ? (
          <div className="backup-success-note settings-form-wide">{passwordNote}</div>
        ) : null}
        {passwordError ? (
          <div className="inline-error compact settings-form-wide">{passwordError}</div>
        ) : null}
      </form>
    </section>
  );
}

function PeopleSection(props: {
  users: UserRecord[];
  roles: AccessSummary["roles"];
  currentUserId: string;
  busyUserId: string | null;
  onChange: (id: string, change: { role?: string; status?: UserStatus }) => void;
}) {
  const waiting = props.users.filter((user) => user.status === "pending");

  return (
    <section className="settings-card">
      <div>
        <h3>People</h3>
        <p>
          Anyone can create an account, so nobody gets in until you let them. Switching somebody off
          keeps everything they recorded.
        </p>
      </div>

      {waiting.length > 0 ? (
        <div className="settings-reminder due">
          <strong>
            {waiting.length === 1
              ? "1 person is waiting to be let in"
              : `${waiting.length} people are waiting to be let in`}
          </strong>
          <span>They can see nothing at all until you approve them.</span>
        </div>
      ) : null}

      <div className="settings-user-list">
        {props.users.map((user) => {
          const busy = props.busyUserId === user.id;
          const isSelf = user.id === props.currentUserId;

          return (
            <div className="settings-user-row" key={user.id}>
              <span>
                {user.displayName}
                {isSelf ? " (you)" : ""}
              </span>

              <em>{statusLabels[user.status] ?? user.status}</em>

              <select
                disabled={busy}
                value={user.role}
                onChange={(event) => props.onChange(user.id, { role: event.target.value })}
              >
                {props.roles.map((role) => (
                  <option key={role.key} value={role.key}>
                    {role.label}
                  </option>
                ))}
              </select>

              {user.status === "active" ? (
                <button
                  className="secondary-button"
                  disabled={busy}
                  type="button"
                  onClick={() => props.onChange(user.id, { status: "inactive" })}
                >
                  Switch off
                </button>
              ) : (
                <button
                  className="primary-button"
                  disabled={busy}
                  type="button"
                  onClick={() => props.onChange(user.id, { status: "active" })}
                >
                  {user.status === "pending" ? "Let in" : "Switch on"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="settings-role-grid">
        {props.roles.map((role) => (
          <article className="settings-role-card" key={role.key}>
            <strong>{role.label}</strong>
            <span>{role.description}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function ColleaguesSection({ users }: { users: UserRecord[] }) {
  return (
    <section className="settings-card">
      <div>
        <h3>People</h3>
        <p>Everyone using TOG 5 VMS. Only the fleet owner can change who is here.</p>
      </div>

      <div className="settings-user-list">
        {users.map((user) => (
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
  readOnly: boolean;
  onFieldChange: <Field extends keyof SettingsFormState>(
    field: Field,
    value: SettingsFormState[Field],
  ) => void;
}) {
  return (
    <section className="settings-card">
      <div>
        <h3>General preferences</h3>
        <p>These affect display labels only. Stored values keep their original units.</p>
      </div>

      <div className="settings-form-grid">
        <label className="form-field">
          <span>Preferred currency</span>
          <input
            disabled={props.readOnly}
            maxLength={3}
            type="text"
            value={props.form.preferredCurrency}
            onChange={(event) => props.onFieldChange("preferredCurrency", event.target.value)}
          />
        </label>

        <label className="form-field">
          <span>Distance unit</span>
          <select
            disabled={props.readOnly}
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
            disabled={props.readOnly}
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
            disabled={props.readOnly}
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
  readOnly: boolean;
  onFieldChange: <Field extends keyof SettingsFormState>(
    field: Field,
    value: SettingsFormState[Field],
  ) => void;
}) {
  return (
    <section className="settings-card">
      <div>
        <h3>Maintenance &amp; alerts</h3>
        <p>
          Due-soon defaults apply to new vehicle reminders. Existing reminders keep their stored
          thresholds unless you edit them.
        </p>
      </div>

      <div className="settings-form-grid">
        <label className="form-field">
          <span>Default due-soon days</span>
          <input
            disabled={props.readOnly}
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
            disabled={props.readOnly}
            min="0"
            step="1"
            type="number"
            value={props.form.defaultDueSoonKm}
            onChange={(event) => props.onFieldChange("defaultDueSoonKm", event.target.value)}
          />
        </label>

        <SettingsToggle
          checked={props.form.includeSetupNeededSchedules}
          disabled={props.readOnly}
          label="Include setup-needed schedules in attention lists"
          onChange={(value) => props.onFieldChange("includeSetupNeededSchedules", value)}
        />

        <SettingsToggle
          checked={props.form.maintenanceAlertsEnabled}
          disabled={props.readOnly}
          label="Create in-app maintenance alerts"
          onChange={(value) => props.onFieldChange("maintenanceAlertsEnabled", value)}
        />

        <SettingsToggle
          checked={props.form.fuelEfficiencyAlertsEnabled}
          disabled={props.readOnly}
          label="Create fuel-efficiency-drop alerts"
          onChange={(value) => props.onFieldChange("fuelEfficiencyAlertsEnabled", value)}
        />
      </div>
    </section>
  );
}

function ExportSafetySection(props: {
  form: SettingsFormState;
  readOnly: boolean;
  reminder: AppSettingsResponse["backupReminder"];
  onFieldChange: <Field extends keyof SettingsFormState>(
    field: Field,
    value: SettingsFormState[Field],
  ) => void;
}) {
  return (
    <section className="settings-card">
      <div>
        <h3>Exports &amp; data safety</h3>
        <p>
          Records live on a hosted database, encrypted on the way there and where they sit. The free
          plan takes no automatic copies, though — so an export from the Backup screen is the only
          copy you hold yourself.
        </p>
      </div>

      <div className="settings-form-grid">
        <SettingsToggle
          checked={props.form.backupReminderEnabled}
          disabled={props.readOnly}
          label="Remind us to take an export"
          onChange={(value) => props.onFieldChange("backupReminderEnabled", value)}
        />

        <label className="form-field">
          <span>Remind after this many days</span>
          <input
            disabled={props.readOnly}
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
        <strong>{props.reminder.reminderDue ? "Export reminder" : "Export status"}</strong>
        <span>{props.reminder.message}</span>
      </div>
    </section>
  );
}

function SettingsToggle(props: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="settings-toggle">
      <input
        checked={props.checked}
        disabled={props.disabled}
        type="checkbox"
        onChange={(event) => props.onChange(event.target.checked)}
      />
      <span>{props.label}</span>
    </label>
  );
}

function prepareSettings(
  form: SettingsFormState,
  current?: AppSettings,
): {
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
    errors.push("Reminder interval must be at least 1 day.");
  }

  if (errors.length > 0) {
    return { errors };
  }

  return {
    errors: [],
    request: {
      preferredCurrency: currency,
      distanceUnit: form.distanceUnit,
      fuelEfficiencyUnit: form.fuelEfficiencyUnit,
      dateDisplayPreference: form.dateDisplayPreference,
      defaultDueSoonDays: defaultDueSoonDays ?? 0,
      defaultDueSoonKm: defaultDueSoonKm ?? 0,
      includeSetupNeededSchedules: form.includeSetupNeededSchedules,
      backupReminderEnabled: form.backupReminderEnabled,
      backupReminderIntervalDays: backupReminderIntervalDays ?? 1,
      maintenanceAlertsEnabled: form.maintenanceAlertsEnabled,
      fuelEfficiencyAlertsEnabled: form.fuelEfficiencyAlertsEnabled,
      // No longer on this screen — a hosted app does not start with Windows —
      // but the stored value is passed through rather than silently reset.
      startupOnBootEnabled: current?.startupOnBootEnabled ?? false,
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
