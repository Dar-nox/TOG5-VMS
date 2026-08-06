import { useCallback, useEffect, useRef, useState } from "react";
import { useConfirm } from "../../../app/providers/confirmContext";
import { useFormat } from "../../../app/providers/formatContext";
import { useToast } from "../../../app/providers/toastContext";
import { cn } from "../../../lib/cn";
import { messageFromError } from "../../../lib/errors";
import { ABSENT } from "../../../lib/format";
import { labelFromKey, trimToUndefined } from "../../../lib/text";
import {
  archiveVehicleMaintenanceSetting,
  createMaintenanceTemplate,
  listMaintenanceSchedulesForVehicle,
  listVehicleMaintenanceSettings,
  logMaintenance,
  storeMaintenancePhoto,
  storeMaintenanceReceipt,
  upsertVehicleMaintenanceSetting,
  type MaintenanceScheduleRecord,
  type VehicleMaintenanceSettingRecord,
} from "../../../services/api/maintenance";
import type { VehicleRecord } from "../../../services/api/vehicles";
import { Badge } from "../../ui/Badge";
import { Button, ButtonRow } from "../../ui/Button";
import { Card, CardHeader } from "../../ui/Card";
import { DataList, DataRow, MetaItem } from "../../ui/DataRow";
import {
  CurrencyField,
  DateField,
  FieldGrid,
  FieldGridFull,
  NumberField,
  SelectField,
  TextAreaField,
  TextField,
} from "../../ui/Field";
import { HelpTerm } from "../../ui/HelpTerm";
import { SkeletonRows } from "../../ui/Spinner";
import { EmptyState, ErrorBlock, ErrorSummary } from "../../ui/States";
import { toneForDueStatus } from "../../ui/tones";
import { ReceiptField } from "./ReceiptField";

const CATEGORIES = [
  { value: "engine", label: "Engine" },
  { value: "brakes", label: "Brakes" },
  { value: "tires", label: "Tires" },
  { value: "fluids", label: "Fluids" },
  { value: "electrical", label: "Electrical" },
  { value: "transmission", label: "Transmission" },
  { value: "suspension", label: "Suspension" },
  { value: "body", label: "Body" },
  { value: "other", label: "Other" },
];

type Reminder = {
  setting: VehicleMaintenanceSettingRecord;
  schedule?: MaintenanceScheduleRecord;
};

/**
 * What this vehicle needs, and recording what was done.
 *
 * The old screen put three things side by side — a log form, a reminders list,
 * and a catalogue of maintenance items — and then explained how to use them in
 * prose, including one row that gave click-by-click instructions: "This item
 * has intervals saved, but it has not been applied to this vehicle yet. Click
 * Edit, then Save item to use those intervals here."
 *
 * When an interface has to tell somebody which buttons to press in which
 * order, the buttons are wrong. Logging work is one action from the item it
 * belongs to.
 */
export function MaintenanceTab({ vehicle }: { vehicle: VehicleRecord }) {
  const fmt = useFormat();
  const confirm = useConfirm();
  const toast = useToast();

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [logging, setLogging] = useState<Reminder | null>(null);
  const [addingItem, setAddingItem] = useState(false);
  const [editingIntervals, setEditingIntervals] = useState<Reminder | null>(null);
  const [query, setQuery] = useState("");

  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const [settings, schedules] = await Promise.all([
        listVehicleMaintenanceSettings(vehicle.id),
        listMaintenanceSchedulesForVehicle(vehicle.id),
      ]);

      const byTemplate = new Map(schedules.map((schedule) => [schedule.templateId, schedule]));

      setReminders(
        settings
          .filter((setting) => setting.status !== "not_applicable")
          .map((setting) => ({ setting, schedule: byTemplate.get(setting.templateId) }))
          .sort(byUrgency),
      );
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

  function scrollToPanel() {
    requestAnimationFrame(() => {
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function openLog(reminder: Reminder) {
    setAddingItem(false);
    setEditingIntervals(null);
    setLogging(reminder);
    scrollToPanel();
  }

  async function handleRemove(reminder: Reminder) {
    const confirmed = await confirm({
      title: `Stop tracking ${reminder.setting.templateName}?`,
      body: "The reminder is removed and its alerts are cleared. Work already recorded in service history is kept.",
      confirmLabel: "Stop tracking",
    });

    if (!confirmed) {
      return;
    }

    setBusyId(reminder.setting.id);

    try {
      await archiveVehicleMaintenanceSetting(reminder.setting.id);
      await load();
      toast.success("Reminder removed.");
    } catch (caught) {
      toast.error(messageFromError(caught));
    } finally {
      setBusyId(null);
    }
  }

  const panelOpen = Boolean(logging || addingItem || editingIntervals);

  // A well-kept vehicle carries thirty-odd items, and the list is ordered by
  // urgency rather than alphabetically — so finding one particular item means
  // reading the whole thing. Matching the category as well as the name lets
  // "brake" find the pads, the fluid and the inspection together.
  const searchable = reminders.length > 5;
  const needle = query.trim().toLowerCase();
  const visible =
    needle === ""
      ? reminders
      : reminders.filter(({ setting }) =>
          `${setting.templateName} ${labelFromKey(setting.category ?? "")}`
            .toLowerCase()
            .includes(needle),
        );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-heading">Maintenance</h2>
        {panelOpen ? null : (
          <Button
            onClick={() => {
              setAddingItem(true);
              scrollToPanel();
            }}
            variant="primary"
          >
            Add an item
          </Button>
        )}
      </div>

      {error ? <ErrorBlock message={error} /> : null}

      <div ref={panelRef}>
        {logging ? (
          <LogForm
            onCancel={() => setLogging(null)}
            onSaved={async () => {
              setLogging(null);
              await load();
            }}
            reminder={logging}
            vehicle={vehicle}
          />
        ) : null}

        {addingItem ? (
          <AddItemForm
            onCancel={() => setAddingItem(false)}
            onSaved={async () => {
              setAddingItem(false);
              await load();
            }}
            vehicleId={vehicle.id}
          />
        ) : null}

        {editingIntervals ? (
          <IntervalForm
            onCancel={() => setEditingIntervals(null)}
            onSaved={async () => {
              setEditingIntervals(null);
              await load();
            }}
            reminder={editingIntervals}
            vehicleId={vehicle.id}
          />
        ) : null}
      </div>

      {loading || !searchable ? null : (
        <TextField
          label="Search maintenance items"
          onChange={setQuery}
          placeholder="Brakes, oil, tyres…"
          type="search"
          value={query}
        />
      )}

      {loading ? (
        <SkeletonRows rows={3} />
      ) : reminders.length === 0 ? (
        <EmptyState
          action={
            panelOpen ? undefined : (
              <Button onClick={() => setAddingItem(true)} variant="primary">
                Add the first item
              </Button>
            )
          }
          title="Nothing is being tracked for this vehicle."
        />
      ) : visible.length === 0 ? (
        <EmptyState
          action={
            <Button onClick={() => setQuery("")} variant="secondary">
              Clear the search
            </Button>
          }
          title={`Nothing here matches “${query.trim()}”.`}
        />
      ) : (
        <DataList>
          {visible.map((reminder) => {
            const { setting, schedule } = reminder;
            const tracked =
              setting.customTimeIntervalDays != null || setting.customOdometerIntervalKm != null;

            return (
              <DataRow
                actions={
                  <>
                    <Button onClick={() => openLog(reminder)}>Log done</Button>
                    <Button
                      onClick={() => {
                        setEditingIntervals(reminder);
                        setLogging(null);
                        setAddingItem(false);
                        scrollToPanel();
                      }}
                      variant="quiet"
                    >
                      Intervals
                    </Button>
                    <Button
                      loading={busyId === setting.id}
                      onClick={() => void handleRemove(reminder)}
                      variant="quiet"
                    >
                      Remove
                    </Button>
                  </>
                }
                key={setting.id}
                meta={
                  <>
                    <MetaItem label="Next due" numeric value={fmt.date(schedule?.nextDueDate)} />
                    <MetaItem
                      label="At odometer"
                      numeric
                      value={fmt.distance(schedule?.nextDueOdometer)}
                    />
                    <MetaItem
                      label="Last done"
                      numeric
                      value={fmt.date(schedule?.lastCompletedDate)}
                    />
                    <MetaItem label="Every" value={intervalText(setting, fmt.distanceLabel)} />
                    <MetaItem
                      label="Warns"
                      value={
                        <span
                          className={cn(
                            "flex flex-wrap items-center gap-1",
                            warningIsTooEarly(setting) && "text-due",
                          )}
                        >
                          {warnText(setting, fmt.distanceLabel)}
                          {/* A warning that covers most of its own interval
                              leaves the item amber almost permanently, which is
                              how two of the client's items came to read "Due
                              Soon" against a date in 2036. */}
                          {warningIsTooEarly(setting) ? (
                            <span title="This warns for most of the interval, so the item is almost always due soon.">
                              ⚠
                            </span>
                          ) : null}
                        </span>
                      }
                    />
                  </>
                }
                subtitle={
                  tracked
                    ? (schedule?.dueReason ?? undefined)
                    : "No interval set, so nothing will become due."
                }
                title={
                  <span className="flex flex-wrap items-center gap-2">
                    <HelpTerm term={setting.templateName}>{setting.templateName}</HelpTerm>
                    {schedule ? (
                      <Badge tone={toneForDueStatus(schedule.dueStatus)}>
                        {labelFromKey(schedule.dueStatus)}
                      </Badge>
                    ) : (
                      <Badge tone="info">Not tracked</Badge>
                    )}
                  </span>
                }
              />
            );
          })}
        </DataList>
      )}
    </div>
  );
}

/** Overdue first; things with no interval last, since they never come due. */
function byUrgency(a: Reminder, b: Reminder): number {
  const rank = (reminder: Reminder) => {
    switch (reminder.schedule?.dueStatus) {
      case "overdue":
        return 0;
      case "due_today":
        return 1;
      case "due_soon":
        return 2;
      case "not_due":
        return 3;
      default:
        return 4;
    }
  };

  return rank(a) - rank(b);
}

/** How much notice this item gives, in the same shape as its interval. */
function warnText(setting: VehicleMaintenanceSettingRecord, distanceLabel: string): string {
  const parts: string[] = [];

  if (setting.customTimeIntervalDays) {
    parts.push(`${setting.effectiveDueSoonDays} days`);
  }

  if (setting.customOdometerIntervalKm) {
    parts.push(`${setting.effectiveDueSoonKm.toLocaleString()} ${distanceLabel}`);
  }

  return parts.length > 0 ? `${parts.join(" or ")} early` : ABSENT;
}

/**
 * A notice period worth more than half its own interval. Not wrong on its own —
 * the database refuses only a window at or beyond the interval — but it means
 * the item spends most of its life amber, so it is worth pointing at rather
 * than leaving to be discovered nine years later.
 */
function warningIsTooEarly(setting: VehicleMaintenanceSettingRecord): boolean {
  const days = setting.customTimeIntervalDays;
  const km = setting.customOdometerIntervalKm;

  return Boolean(
    (days && setting.effectiveDueSoonDays > days / 2) ||
    (km && setting.effectiveDueSoonKm > km / 2),
  );
}

function intervalText(setting: VehicleMaintenanceSettingRecord, distanceLabel: string): string {
  const parts: string[] = [];

  if (setting.customTimeIntervalDays) {
    parts.push(`${setting.customTimeIntervalDays} days`);
  }

  if (setting.customOdometerIntervalKm) {
    parts.push(`${setting.customOdometerIntervalKm.toLocaleString()} ${distanceLabel}`);
  }

  return parts.length > 0 ? parts.join(" or ") : "—";
}

/* -------------------------------------------------------------------------
 * Recording work
 * ---------------------------------------------------------------------- */

function LogForm({
  reminder,
  vehicle,
  onCancel,
  onSaved,
}: {
  reminder: Reminder;
  vehicle: VehicleRecord;
  onCancel: () => void;
  onSaved: () => Promise<void>;
}) {
  const fmt = useFormat();
  const toast = useToast();

  const [completedDate, setCompletedDate] = useState(new Date().toISOString().slice(0, 10));
  const [odometer, setOdometer] = useState(String(vehicle.currentOdometer));
  const [workPerformed, setWorkPerformed] = useState("");
  const [partsReplaced, setPartsReplaced] = useState("");
  const [laborCost, setLaborCost] = useState("");
  const [partsCost, setPartsCost] = useState("");
  const [mechanicShop, setMechanicShop] = useState("");
  const [warrantyExpiration, setWarrantyExpiration] = useState("");
  const [notes, setNotes] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [beforePhoto, setBeforePhoto] = useState<File | null>(null);
  const [afterPhoto, setAfterPhoto] = useState<File | null>(null);
  const [showCosts, setShowCosts] = useState(false);
  const [issues, setIssues] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const labor = Number(laborCost) || 0;
  const parts = Number(partsCost) || 0;
  const total = labor + parts;

  async function handleSave() {
    const problems: string[] = [];

    if (!workPerformed.trim()) {
      problems.push("Say what was done.");
    }

    if (!completedDate) {
      problems.push("Choose the date the work was done.");
    }

    setIssues(problems);

    if (problems.length > 0) {
      return;
    }

    setSaving(true);

    try {
      const [receiptDoc, beforeDoc, afterDoc] = await Promise.all([
        receipt ? storeMaintenanceReceipt(vehicle.id, receipt) : Promise.resolve(null),
        beforePhoto ? storeMaintenancePhoto(vehicle.id, beforePhoto) : Promise.resolve(null),
        afterPhoto ? storeMaintenancePhoto(vehicle.id, afterPhoto) : Promise.resolve(null),
      ]);

      const result = await logMaintenance({
        vehicleId: vehicle.id,
        templateId: reminder.setting.templateId,
        completedDate,
        odometer: Number(odometer) || undefined,
        workPerformed: workPerformed.trim(),
        partsReplaced: trimToUndefined(partsReplaced),
        laborCost: labor || undefined,
        partsCost: parts || undefined,
        totalCost: total || undefined,
        mechanicShop: trimToUndefined(mechanicShop),
        receiptDocumentId: receiptDoc?.id,
        beforePhotoId: beforeDoc?.id,
        afterPhotoId: afterDoc?.id,
        warrantyExpiration: trimToUndefined(warrantyExpiration),
        notes: trimToUndefined(notes),
      });

      await onSaved();

      // Says what actually happened rather than a generic "Saved". Whether a
      // reminder moved forward is the thing somebody wants to know.
      toast.success(
        result.reminderUsed && result.schedule
          ? `Recorded. Next due ${fmt.date(result.schedule.nextDueDate)}.`
          : "Recorded. This item has no interval, so nothing is scheduled next.",
      );
    } catch (caught) {
      toast.error(messageFromError(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader title={`Log ${reminder.setting.templateName}`} />

      <div className="flex flex-col gap-4">
        <ErrorSummary issues={issues} />

        <FieldGrid>
          <DateField label="Date done" onChange={setCompletedDate} required value={completedDate} />
          <NumberField
            label="Odometer"
            onChange={setOdometer}
            unit={fmt.distanceLabel}
            value={odometer}
          />

          <FieldGridFull>
            <TextAreaField
              label="What was done"
              onChange={setWorkPerformed}
              required
              rows={2}
              value={workPerformed}
            />
          </FieldGridFull>
        </FieldGrid>

        {/* The old form put fourteen controls on screen at once. The six that
            are usually blank are behind this. */}
        {showCosts ? (
          <FieldGrid>
            <CurrencyField label="Labor" onChange={setLaborCost} optional value={laborCost} />
            <CurrencyField label="Parts" onChange={setPartsCost} optional value={partsCost} />

            <FieldGridFull>
              <p className="tabular text-sm text-muted">Total {fmt.money(total)}</p>
            </FieldGridFull>

            <TextField label="Shop" onChange={setMechanicShop} optional value={mechanicShop} />
            <DateField
              label="Warranty until"
              onChange={setWarrantyExpiration}
              optional
              value={warrantyExpiration}
            />

            <FieldGridFull>
              <TextField
                label="Parts replaced"
                onChange={setPartsReplaced}
                optional
                value={partsReplaced}
              />
            </FieldGridFull>

            <FieldGridFull>
              <ReceiptField file={receipt} label="Receipt" onChange={setReceipt} />
            </FieldGridFull>
            <ReceiptField
              accept="image/*"
              file={beforePhoto}
              label="Photo before"
              onChange={setBeforePhoto}
            />
            <ReceiptField
              accept="image/*"
              file={afterPhoto}
              label="Photo after"
              onChange={setAfterPhoto}
            />

            <FieldGridFull>
              <TextAreaField label="Notes" onChange={setNotes} optional value={notes} />
            </FieldGridFull>
          </FieldGrid>
        ) : (
          <Button onClick={() => setShowCosts(true)} variant="quiet">
            Add costs, receipt and photos
          </Button>
        )}

        <ButtonRow>
          <Button onClick={onCancel}>Cancel</Button>
          <Button loading={saving} onClick={() => void handleSave()} variant="primary">
            Save
          </Button>
        </ButtonRow>
      </div>
    </Card>
  );
}

/* -------------------------------------------------------------------------
 * Adding an item to track
 * ---------------------------------------------------------------------- */

function AddItemForm({
  vehicleId,
  onCancel,
  onSaved,
}: {
  vehicleId: string;
  onCancel: () => void;
  onSaved: () => Promise<void>;
}) {
  const fmt = useFormat();
  const toast = useToast();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("other");
  const [days, setDays] = useState("");
  const [km, setKm] = useState("");
  const [issues, setIssues] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const problems: string[] = [];

    if (!name.trim()) {
      problems.push("Give the item a name.");
    }

    if (!days && !km) {
      problems.push("Set at least one interval, in days or in distance, or nothing will come due.");
    }

    setIssues(problems);

    if (problems.length > 0) {
      return;
    }

    setSaving(true);

    try {
      const template = await createMaintenanceTemplate({
        name: name.trim(),
        category,
        defaultTimeIntervalDays: Number(days) || undefined,
        defaultOdometerIntervalKm: Number(km) || undefined,
      });

      // Creating the item and applying it to this vehicle is one action. The
      // old screen made them two, and then had to explain in a list row that
      // you must click Edit and then Save to connect them.
      await upsertVehicleMaintenanceSetting({
        vehicleId,
        templateId: template.id,
        customTimeIntervalDays: Number(days) || undefined,
        customOdometerIntervalKm: Number(km) || undefined,
      });

      await onSaved();
      toast.success(`Now tracking ${template.name}.`);
    } catch (caught) {
      toast.error(messageFromError(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Add an item to track" />

      <div className="flex flex-col gap-4">
        <ErrorSummary issues={issues} />

        <FieldGrid>
          <FieldGridFull>
            <TextField
              label="What needs doing"
              onChange={setName}
              placeholder="Oil change"
              required
              value={name}
            />
          </FieldGridFull>

          <SelectField
            label="Category"
            onChange={setCategory}
            options={CATEGORIES}
            value={category}
          />

          <NumberField
            hint="Leave blank if only distance matters."
            label="Every"
            onChange={setDays}
            optional
            unit="days"
            value={days}
          />
          <NumberField
            hint="Leave blank if only time matters."
            label="Or every"
            onChange={setKm}
            optional
            unit={fmt.distanceLabel}
            value={km}
          />
        </FieldGrid>

        <ButtonRow>
          <Button onClick={onCancel}>Cancel</Button>
          <Button loading={saving} onClick={() => void handleSave()} variant="primary">
            Start tracking
          </Button>
        </ButtonRow>
      </div>
    </Card>
  );
}

/* -------------------------------------------------------------------------
 * Changing how often something is due
 * ---------------------------------------------------------------------- */

function IntervalForm({
  reminder,
  vehicleId,
  onCancel,
  onSaved,
}: {
  reminder: Reminder;
  vehicleId: string;
  onCancel: () => void;
  onSaved: () => Promise<void>;
}) {
  const fmt = useFormat();
  const toast = useToast();

  const [days, setDays] = useState(
    reminder.setting.customTimeIntervalDays == null
      ? ""
      : String(reminder.setting.customTimeIntervalDays),
  );
  const [km, setKm] = useState(
    reminder.setting.customOdometerIntervalKm == null
      ? ""
      : String(reminder.setting.customOdometerIntervalKm),
  );
  const [warnDays, setWarnDays] = useState(
    reminder.setting.customDueSoonDays == null ? "" : String(reminder.setting.customDueSoonDays),
  );
  const [warnKm, setWarnKm] = useState(
    reminder.setting.customDueSoonKm == null ? "" : String(reminder.setting.customDueSoonKm),
  );
  const [issues, setIssues] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!days && !km) {
      setIssues(["Set at least one interval, in days or in distance."]);
      return;
    }

    // Caught here as well as in the database, because the server message
    // arrives after a round trip and this is the mistake the whole rule exists
    // for: a warning that starts the moment the work is logged.
    const problems: string[] = [];

    if (days && warnDays && Number(warnDays) >= Number(days)) {
      problems.push(
        `Warn me earlier than ${days} days, or the reminder starts the day the work is logged.`,
      );
    }

    if (km && warnKm && Number(warnKm) >= Number(km)) {
      problems.push(
        `Warn me sooner than ${Number(km).toLocaleString()} ${fmt.distanceLabel}, or the reminder never goes quiet.`,
      );
    }

    setIssues(problems);

    if (problems.length > 0) {
      return;
    }

    setSaving(true);

    try {
      await upsertVehicleMaintenanceSetting({
        vehicleId,
        templateId: reminder.setting.templateId,
        customTimeIntervalDays: Number(days) || undefined,
        customOdometerIntervalKm: Number(km) || undefined,
        customDueSoonDays: warnDays === "" ? undefined : Number(warnDays),
        customDueSoonKm: warnKm === "" ? undefined : Number(warnKm),
      });

      await onSaved();
      toast.success("Interval saved.");
    } catch (caught) {
      toast.error(messageFromError(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader title={`How often is ${reminder.setting.templateName} due?`} />

      <div className="flex flex-col gap-4">
        <ErrorSummary issues={issues} />

        <FieldGrid>
          <NumberField label="Every" onChange={setDays} optional unit="days" value={days} />
          <NumberField
            label="Or every"
            onChange={setKm}
            optional
            unit={fmt.distanceLabel}
            value={km}
          />
        </FieldGrid>

        {/* The desktop app had these and the rewrite dropped them, which left
            the threshold unreachable: Settings only sets the default for new
            reminders, so a wrong value on an existing one could not be seen or
            corrected from anywhere in the app. */}
        <FieldGrid>
          <NumberField
            label="Warn"
            onChange={setWarnDays}
            optional
            placeholder={String(reminder.setting.effectiveDueSoonDays)}
            unit="days early"
            value={warnDays}
          />
          <NumberField
            label="Or warn"
            onChange={setWarnKm}
            optional
            placeholder={String(reminder.setting.effectiveDueSoonKm)}
            unit={`${fmt.distanceLabel} early`}
            value={warnKm}
          />
        </FieldGrid>

        <ButtonRow>
          <Button onClick={onCancel}>Cancel</Button>
          <Button loading={saving} onClick={() => void handleSave()} variant="primary">
            Save
          </Button>
        </ButtonRow>
      </div>
    </Card>
  );
}
