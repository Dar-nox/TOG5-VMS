import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../app/providers/authContext";
import { useConfirm } from "../../app/providers/confirmContext";
import { refreshDisplayPreferences } from "../../app/providers/preferenceEvents";
import { useToast } from "../../app/providers/toastContext";
import { messageFromError } from "../../lib/errors";
import {
  canReceivePush,
  isSubscribed,
  pushBlocked,
  subscribeToPush,
  unsubscribeFromPush,
} from "../../lib/pushNotifications";
import { labelFromKey } from "../../lib/text";
import {
  getNotificationPreferences,
  saveNotificationPreferences,
  type NotificationPreferences,
} from "../../services/api/push";
import { changeOwnPassword } from "../../services/api/auth";
import {
  createAccount,
  getAppSettings,
  listUsers,
  resetAppSettings,
  updateAppSettings,
  transferOwnership,
  updateUser,
  type AppSettings,
  type UserRecord,
  type UserStatus,
} from "../../services/api/settings";
import { Badge } from "../ui/Badge";
import { Button, ButtonRow } from "../ui/Button";
import { Card, CardHeader } from "../ui/Card";
import { DataList, DataRow } from "../ui/DataRow";
import { FieldGrid, NumberField, SelectField, TextField } from "../ui/Field";
import { SkeletonRows } from "../ui/Spinner";
import { ErrorBlock } from "../ui/States";

const CURRENCIES = [
  { value: "PHP", label: "Philippine peso (₱)" },
  { value: "USD", label: "US dollar ($)" },
  { value: "EUR", label: "Euro (€)" },
];

const DISTANCE_UNITS = [
  { value: "km", label: "Kilometres" },
  { value: "mi", label: "Miles" },
];

const EFFICIENCY_UNITS = [
  { value: "km_per_liter", label: "Kilometres per litre" },
  { value: "liters_per_100km", label: "Litres per 100 km" },
];

const DATE_FORMATS = [
  { value: "yyyy_mm_dd", label: "2026-08-05" },
  { value: "dd_mm_yyyy", label: "05/08/2026" },
  { value: "mm_dd_yyyy", label: "08/05/2026" },
];

const ROLES = [
  { value: "owner", label: "Owner" },
  { value: "manager", label: "Manager" },
  { value: "viewer", label: "Viewer" },
];

/**
 * Preferences, people, and your own password.
 *
 * What is gone is the explaining. Every section carried a paragraph, one of
 * which was a word-for-word copy of a paragraph on the Backup screen, and
 * there was a three-card grid whose entire content was descriptions of what
 * the three roles mean. Roles are a dropdown with three options; a card each
 * is not an explanation, it is furniture.
 */
export function SettingsSections() {
  const { isOwner, retry, user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();

  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const [overview, people] = await Promise.all([getAppSettings(), listUsers()]);
      setSettings(overview.settings);
      setUsers(people);
      setError(null);
    } catch (caught) {
      setError(messageFromError(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setSettings((current) => (current ? { ...current, [key]: value } : current));
  }

  async function handleSave() {
    if (!settings) {
      return;
    }

    setSaving(true);

    try {
      const response = await updateAppSettings(settings);
      setSettings(response.settings);

      // Dates and money are formatted from these, so the rest of the app has
      // to be told rather than waiting for a reload.
      refreshDisplayPreferences();
      toast.success("Settings saved.");
    } catch (caught) {
      toast.error(messageFromError(caught));
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    const confirmed = await confirm({
      title: "Put every setting back to its default?",
      body: "Currency, units, date format and reminder thresholds all return to how they started. Your records are not touched.",
      confirmLabel: "Reset settings",
    });

    if (!confirmed) {
      return;
    }

    try {
      const response = await resetAppSettings();
      setSettings(response.settings);
      refreshDisplayPreferences();
      toast.success("Settings reset.");
    } catch (caught) {
      toast.error(messageFromError(caught));
    }
  }

  async function handleUserChange(
    record: UserRecord,
    change: { role?: string; status?: UserStatus; displayName?: string },
  ) {
    setBusyId(record.id);

    try {
      await updateUser({ id: record.id, ...change });
      await load();
      toast.success("Account updated.");
    } catch (caught) {
      toast.error(messageFromError(caught));
    } finally {
      setBusyId(null);
    }
  }

  /**
   * The one account change that cannot be undone by the person making it: the
   * moment it succeeds, the caller is a manager and cannot take it back.
   */
  async function handleTransfer(record: UserRecord) {
    const confirmed = await confirm({
      title: `Make ${record.displayName} the owner?`,
      body:
        `${record.displayName} will be able to let people in, change settings and ` +
        `export the fleet. You become a manager and cannot undo this yourself — ` +
        `only ${record.displayName} can hand it back.`,
      confirmLabel: "Hand over",
      tone: "danger",
    });

    if (!confirmed) {
      return;
    }

    setBusyId(record.id);

    try {
      setUsers(await transferOwnership(record.id));
      // The signed-in person is now a manager, and half the screen depends on
      // that. Without this the owner-only controls stay on screen until a
      // reload, and every one of them would be refused.
      await retry();
      toast.success(`${record.displayName} is now the owner.`);
    } catch (caught) {
      toast.error(messageFromError(caught));
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return <SkeletonRows rows={3} />;
  }

  if (error) {
    return (
      <ErrorBlock action={<Button onClick={() => void load()}>Try again</Button>} message={error} />
    );
  }

  if (!settings) {
    return null;
  }

  const pending = users.filter((record) => record.status === "pending");

  return (
    <>
      {pending.length > 0 && isOwner ? (
        <Card className="border-info-line bg-info-surface/40">
          <CardHeader
            title={`${pending.length} ${pending.length === 1 ? "person is" : "people are"} waiting to be let in`}
          />
          <DataList>
            {pending.map((record) => (
              <DataRow
                actions={
                  <>
                    <Button
                      loading={busyId === record.id}
                      onClick={() => void handleUserChange(record, { status: "active" })}
                      variant="primary"
                    >
                      Let in
                    </Button>
                    <Button
                      loading={busyId === record.id}
                      onClick={() => void handleUserChange(record, { status: "inactive" })}
                      variant="quiet"
                    >
                      Refuse
                    </Button>
                  </>
                }
                key={record.id}
                title={record.displayName}
              />
            ))}
          </DataList>
        </Card>
      ) : null}

      <Card>
        <CardHeader
          actions={
            isOwner ? (
              <Button loading={saving} onClick={() => void handleSave()} variant="primary">
                Save
              </Button>
            ) : undefined
          }
          title="How things are shown"
        />

        <FieldGrid>
          <SelectField
            disabled={!isOwner}
            label="Currency"
            onChange={(value) => update("preferredCurrency", value)}
            options={CURRENCIES}
            value={settings.preferredCurrency}
          />
          <SelectField
            disabled={!isOwner}
            label="Dates"
            onChange={(value) => update("dateDisplayPreference", value)}
            options={DATE_FORMATS}
            value={settings.dateDisplayPreference}
          />
          <SelectField
            disabled={!isOwner}
            label="Distance"
            onChange={(value) => update("distanceUnit", value)}
            options={DISTANCE_UNITS}
            value={settings.distanceUnit}
          />
          <SelectField
            disabled={!isOwner}
            label="Fuel efficiency"
            onChange={(value) => update("fuelEfficiencyUnit", value)}
            options={EFFICIENCY_UNITS}
            value={settings.fuelEfficiencyUnit}
          />
        </FieldGrid>
      </Card>

      <Card>
        <CardHeader title="When to warn about maintenance" />

        <FieldGrid>
          <NumberField
            disabled={!isOwner}
            hint="Applies to new reminders. Existing ones keep their own."
            label="Warn this many days early"
            onChange={(value) => update("defaultDueSoonDays", Number(value) || 0)}
            unit="days"
            value={String(settings.defaultDueSoonDays)}
          />
          <NumberField
            disabled={!isOwner}
            hint="Applies to new reminders. Existing ones keep their own."
            label="Warn this far early"
            onChange={(value) => update("defaultDueSoonKm", Number(value) || 0)}
            unit={settings.distanceUnit === "mi" ? "mi" : "km"}
            value={String(settings.defaultDueSoonKm)}
          />
        </FieldGrid>

        {isOwner ? (
          <ButtonRow className="mt-4">
            <Button onClick={() => void handleReset()} variant="quiet">
              Reset everything to defaults
            </Button>
            <Button loading={saving} onClick={() => void handleSave()} variant="primary">
              Save
            </Button>
          </ButtonRow>
        ) : null}
      </Card>

      <Card>
        <CardHeader
          actions={
            isOwner ? (
              <Button onClick={() => setAdding((open) => !open)} variant="quiet">
                {adding ? "Cancel" : "Add someone"}
              </Button>
            ) : undefined
          }
          title="People"
        />

        {adding && isOwner ? (
          <NewAccountForm
            onCreated={(people) => {
              setUsers(people);
              setAdding(false);
            }}
          />
        ) : null}

        <DataList>
          {users.map((record) => (
            <DataRow
              actions={
                isOwner && record.id !== user?.id ? (
                  <>
                    <div className="w-36">
                      <SelectField
                        label="Role"
                        onChange={(value) => void handleUserChange(record, { role: value })}
                        options={ROLES}
                        value={record.role}
                      />
                    </div>
                    <Button
                      loading={busyId === record.id}
                      onClick={() =>
                        void handleUserChange(record, {
                          status: record.status === "active" ? "inactive" : "active",
                        })
                      }
                      variant="quiet"
                    >
                      {record.status === "active" ? "Switch off" : "Switch on"}
                    </Button>
                    {/* Only for somebody who could actually run the fleet
                        tomorrow: a pending or switched-off account cannot see
                        a single row, let alone approve anybody. */}
                    {record.status === "active" && record.role !== "owner" ? (
                      <Button
                        loading={busyId === record.id}
                        onClick={() => void handleTransfer(record)}
                        variant="quiet"
                      >
                        Make owner
                      </Button>
                    ) : null}
                  </>
                ) : undefined
              }
              key={record.id}
              title={
                <span className="flex flex-wrap items-center gap-2">
                  {record.displayName}
                  <Badge tone={record.status === "active" ? "ok" : "archived"}>
                    {labelFromKey(record.status)}
                  </Badge>
                  <Badge tone="neutral">{labelFromKey(record.role)}</Badge>
                </span>
              }
            />
          ))}
        </DataList>
      </Card>

      <YourNameCard />

      <NotificationCard />

      <PasswordCard />
    </>
  );
}

const NEW_ACCOUNT_ROLES = [
  { value: "manager", label: "Manager" },
  { value: "viewer", label: "Viewer" },
];

/**
 * The owner adds somebody.
 *
 * There was no way to do this from the app at all — a new person had to find
 * the sign-in screen, sign themselves up, and then wait to be approved, which
 * meant explaining two steps before they could record anything.
 *
 * Owner is missing from the roles on purpose. Making somebody an owner is
 * handing the fleet over, and that has its own button on the row, with a
 * confirmation that says what it costs.
 */
function NewAccountForm({ onCreated }: { onCreated: (people: UserRecord[]) => void }) {
  const toast = useToast();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("manager");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (displayName.trim() === "" || email.trim() === "" || password === "") {
      setError("Fill in the name, email and password.");
      return;
    }

    setError(null);
    setSaving(true);

    try {
      onCreated(
        await createAccount({
          displayName,
          email,
          password,
          role: role === "viewer" ? "viewer" : "manager",
        }),
      );
      toast.success(`${displayName.trim()} can sign in now.`);
    } catch (caught) {
      setError(messageFromError(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-4 rounded-md border border-border bg-surface-sunken/50 p-4">
      <FieldGrid>
        <TextField label="Name" onChange={setDisplayName} value={displayName} />
        <TextField
          autoComplete="off"
          label="Email"
          onChange={setEmail}
          type="email"
          value={email}
        />
        <TextField
          autoComplete="new-password"
          hint="Give this to them. They can change it in Settings."
          label="Starting password"
          onChange={setPassword}
          type="password"
          value={password}
        />
        <SelectField label="Role" onChange={setRole} options={NEW_ACCOUNT_ROLES} value={role} />
      </FieldGrid>

      {error ? <ErrorBlock className="mt-4" message={error} /> : null}

      <ButtonRow className="mt-4">
        <Button loading={saving} onClick={() => void handleCreate()} variant="primary">
          Create account
        </Button>
      </ButtonRow>
    </div>
  );
}

/**
 * Editing your own name was on the old Settings screen and was dropped when the
 * screen was consolidated, leaving only the controls for other people's
 * accounts. The name is what everyone else sees against every record you enter.
 */
function YourNameCard() {
  const { user, retry } = useAuth();
  const toast = useToast();
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // A sign-in on another tab, or the first load finishing after this rendered.
  useEffect(() => {
    setDisplayName(user?.displayName ?? "");
  }, [user?.displayName]);

  const trimmed = displayName.trim();
  const unchanged = trimmed === (user?.displayName ?? "");

  async function handleSave() {
    if (!user) {
      return;
    }

    if (trimmed === "") {
      setError("Enter the name other people should see.");
      return;
    }

    setError(null);
    setSaving(true);

    try {
      await updateUser({ id: user.id, displayName: trimmed });
      await retry();
      toast.success("Name updated.");
    } catch (caught) {
      toast.error(messageFromError(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Your name" />

      <FieldGrid>
        <TextField
          autoComplete="name"
          error={error ?? undefined}
          hint="Shown next to everything you record."
          label="Display name"
          onChange={setDisplayName}
          value={displayName}
        />
      </FieldGrid>

      <ButtonRow className="mt-4">
        <Button
          disabled={unchanged}
          loading={saving}
          onClick={() => void handleSave()}
          variant="primary"
        >
          Save name
        </Button>
      </ButtonRow>
    </Card>
  );
}

/**
 * Per device, not per person: a subscription belongs to the browser it was made
 * in, so the office computer and the phone are switched on separately and the
 * label has to say so.
 */
function NotificationCard() {
  const toast = useToast();
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void isSubscribed().then(setOn);
    void getNotificationPreferences()
      .then(setPreferences)
      .catch(() => undefined);
  }, []);

  async function change(update: Partial<NotificationPreferences>) {
    if (!preferences) {
      return;
    }

    const next = { ...preferences, ...update };
    setPreferences(next);
    setSaving(true);

    try {
      await saveNotificationPreferences(next);
    } catch (caught) {
      toast.error(messageFromError(caught));
    } finally {
      setSaving(false);
    }
  }

  async function toggle() {
    setBusy(true);

    try {
      if (on) {
        await unsubscribeFromPush();
        setOn(false);
        toast.success("Notifications off for this device.");
        return;
      }

      if (await subscribeToPush()) {
        setOn(true);
        toast.success("Notifications on for this device.");
      } else {
        toast.error(
          pushBlocked()
            ? "Notifications are switched off for this app in your browser settings."
            : "This device did not allow notifications.",
        );
      }
    } catch (caught) {
      toast.error(messageFromError(caught));
    } finally {
      setBusy(false);
    }
  }

  if (!canReceivePush()) {
    return null;
  }

  return (
    <Card>
      <CardHeader title="Notifications" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink">{on ? "On for this device." : "Off for this device."}</p>

        <Button loading={busy} onClick={() => void toggle()} variant={on ? "secondary" : "primary"}>
          {on ? "Turn off" : "Turn on"}
        </Button>
      </div>

      {/* Shown only once there is somewhere for a notification to arrive.
          Settings for a thing that is switched off are furniture. */}
      {on && preferences ? (
        <FieldGrid className="mt-5 border-t border-border pt-4">
          <TextField
            disabled={saving}
            label="Send at"
            onChange={(value) => void change({ sendAt: value })}
            type="time"
            value={preferences.sendAt}
          />
          <SelectField
            disabled={saving}
            label="Tell me about"
            onChange={(value) => void change({ scope: value === "overdue" ? "overdue" : "all" })}
            options={[
              { value: "all", label: "Anything due soon or overdue" },
              { value: "overdue", label: "Only what is overdue" },
            ]}
            value={preferences.scope}
          />
          <SelectField
            disabled={saving}
            label="Which days"
            onChange={(value) => void change({ weekdaysOnly: value === "weekdays" })}
            options={[
              { value: "every", label: "Every day" },
              { value: "weekdays", label: "Weekdays only" },
            ]}
            value={preferences.weekdaysOnly ? "weekdays" : "every"}
          />
          <NumberField
            disabled={saving}
            hint="Trips still open after this long get mentioned in the digest."
            label="Nag about open trips"
            onChange={(value) =>
              void change({ openTripHours: value === "" ? null : Number(value) || null })
            }
            optional
            unit="hours"
            value={preferences.openTripHours == null ? "" : String(preferences.openTripHours)}
          />
        </FieldGrid>
      ) : null}
    </Card>
  );
}

function PasswordCard() {
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }

    if (password !== confirmation) {
      setError("The two passwords are not the same.");
      return;
    }

    setError(null);
    setSaving(true);

    try {
      await changeOwnPassword(password);
      setPassword("");
      setConfirmation("");
      toast.success("Password changed.");
    } catch (caught) {
      toast.error(messageFromError(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Your password" />

      <FieldGrid>
        <TextField
          autoComplete="new-password"
          error={error ?? undefined}
          label="New password"
          onChange={setPassword}
          type="password"
          value={password}
        />
        <TextField
          autoComplete="new-password"
          label="Type it again"
          onChange={setConfirmation}
          type="password"
          value={confirmation}
        />
      </FieldGrid>

      <ButtonRow className="mt-4">
        <Button loading={saving} onClick={() => void handleSave()} variant="primary">
          Change password
        </Button>
      </ButtonRow>
    </Card>
  );
}
