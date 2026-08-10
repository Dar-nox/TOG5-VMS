import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useConfirm } from "../../../app/providers/confirmContext";
import { useFormat } from "../../../app/providers/formatContext";
import { useToast } from "../../../app/providers/toastContext";
import { messageFromError } from "../../../lib/errors";
import { ABSENT } from "../../../lib/format";
import { routes } from "../../../lib/routes";
import { trimToUndefined } from "../../../lib/text";
import {
  canPinTrips,
  isPinned,
  pinTrip,
  pinningBlocked,
  reconcilePins,
  unpinTrip,
} from "../../../lib/tripPin";
import {
  archiveTrip,
  completeTrip,
  listTrips,
  startTrip,
  type TripRecord,
} from "../../../services/api/trips";
import type { VehicleRecord } from "../../../services/api/vehicles";
import { Badge } from "../../ui/Badge";
import { Button, ButtonRow } from "../../ui/Button";
import { Card, CardHeader } from "../../ui/Card";
import { DataList, DataRow, MetaItem } from "../../ui/DataRow";
import {
  DateTimeField,
  FieldGrid,
  FieldGridFull,
  NumberField,
  TextAreaField,
  TextField,
} from "../../ui/Field";
import { SkeletonRows } from "../../ui/Spinner";
import { EmptyState, ErrorBlock, ErrorSummary } from "../../ui/States";
import { PeopleField } from "./PeopleField";

/**
 * Where this vehicle has been, and whether it is out now.
 *
 * The screen's first job is answering "is the van here?", so open trips come
 * first and everything else is history. The old page led with a paragraph
 * explaining that no odometer or distance tracking happens here — an
 * explanation of a feature that does not exist.
 */
export function TripsTab({ vehicle }: { vehicle: VehicleRecord }) {
  const vehicleId = vehicle.id;
  const fmt = useFormat();
  const confirm = useConfirm();
  const toast = useToast();
  const navigate = useNavigate();

  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [departureTime, setDepartureTime] = useState(nowForInput);
  const [reason, setReason] = useState("");
  const [drivers, setDrivers] = useState<string[]>([""]);
  const [passengers, setPassengers] = useState<string[]>([]);
  const [destinations, setDestinations] = useState<string[]>([""]);
  const [departureNotes, setDepartureNotes] = useState("");
  const [departureOdometer, setDepartureOdometer] = useState("");
  const [issues, setIssues] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const [returning, setReturning] = useState<TripRecord | null>(null);
  const [returnTime, setReturnTime] = useState(nowForInput);
  const [returnNotes, setReturnNotes] = useState("");
  const [returnOdometer, setReturnOdometer] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pinned, setPinned] = useState<Set<string>>(new Set());

  const formRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const records = await listTrips({ vehicleId });
      setTrips(records);
      setError(null);

      // A trip closed on the office computer leaves a notification sitting on
      // the driver's phone naming a journey that finished yesterday. Nothing
      // tells the phone, so the tidying happens the next time it looks.
      const stillOpen = records.filter((trip) => trip.status === "open");
      await reconcilePins(stillOpen.map((trip) => trip.id));
      setPinned(
        new Set(
          (
            await Promise.all(
              stillOpen.map(async (trip) => [trip.id, await isPinned(trip.id)] as const),
            )
          )
            .filter(([, on]) => on)
            .map(([id]) => id),
        ),
      );
    } catch (caught) {
      setError(messageFromError(caught));
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    void load();
  }, [load]);

  const open = trips.filter((trip) => trip.status === "open");
  const past = trips.filter((trip) => trip.status !== "open");

  function openForm() {
    setDepartureTime(nowForInput());
    setReason("");
    setDrivers([""]);
    setPassengers([]);
    setDestinations([""]);
    setDepartureNotes("");
    // The app already knows this number; nobody should have to walk out to the
    // vehicle and read it back.
    setDepartureOdometer(String(vehicle.currentOdometer));
    setIssues([]);
    setFormOpen(true);

    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  async function handleStart() {
    const cleanDrivers = drivers.map((name) => name.trim()).filter(Boolean);
    const cleanDestinations = destinations.map((place) => place.trim()).filter(Boolean);
    const problems: string[] = [];

    // Trips did no client-side checking at all — it sent whatever was typed
    // and relied on the server to refuse it, so a missing driver came back as
    // a database message.
    if (cleanDrivers.length === 0) {
      problems.push("Say who is driving.");
    }

    if (cleanDestinations.length === 0) {
      problems.push("Add at least one destination.");
    }

    if (!reason.trim()) {
      problems.push("Say why the vehicle is going out.");
    }

    setIssues(problems);

    if (problems.length > 0) {
      return;
    }

    setSaving(true);

    try {
      await startTrip({
        vehicleId,
        departureTime,
        drivers: cleanDrivers,
        passengers: passengers.map((name) => name.trim()).filter(Boolean),
        reason: reason.trim(),
        destinations: cleanDestinations,
        departureNotes: trimToUndefined(departureNotes),
        departureOdometer: readingOf(departureOdometer),
      });

      await load();
      setFormOpen(false);
      toast.success("Trip started.");
    } catch (caught) {
      toast.error(messageFromError(caught));
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete(trip: TripRecord) {
    const reading = readingOf(returnOdometer);
    const left = trip.departureOdometer ?? vehicle.currentOdometer;

    if (reading != null && reading < left) {
      toast.error(
        `The vehicle cannot come back on a lower reading than it left on (${fmt.distance(left)}).`,
      );
      return;
    }

    // A reading is the one thing here that cannot be corrected by typing over
    // it: the odometer only ever moves forward, so 21688 typed as 216880 has to
    // be unpicked on the vehicle screen. Worth one question.
    if (reading != null && reading - left > IMPLAUSIBLE_KM) {
      const confirmed = await confirm({
        title: "Is that reading right?",
        body: `That is ${fmt.distance(reading - left)} since the vehicle left, which is a long way for one trip. A reading that is too high can only be undone by editing the vehicle.`,
        confirmLabel: "Yes, close the trip",
        tone: "primary",
      });

      if (!confirmed) {
        return;
      }
    }

    setBusyId(trip.id);

    try {
      await completeTrip(trip.id, {
        returnTime,
        returnNotes: trimToUndefined(returnNotes),
        returnOdometer: reading,
      });

      await load();
      setReturning(null);
      setReturnNotes("");
      setReturnOdometer("");
      toast.success("Trip closed.");
    } catch (caught) {
      toast.error(messageFromError(caught));
    } finally {
      setBusyId(null);
    }
  }

  async function handlePin(trip: TripRecord) {
    if (pinned.has(trip.id)) {
      await unpinTrip(trip.id);
      setPinned((current) => {
        const next = new Set(current);
        next.delete(trip.id);
        return next;
      });
      return;
    }

    const shown = await pinTrip({
      id: trip.id,
      vehicleName: trip.vehicleName,
      reason: trip.reason,
      destinations: trip.destinations,
      url: `${window.location.origin}${routes.vehicle(vehicleId, "trips")}`,
    });

    if (!shown) {
      toast.error(
        pinningBlocked()
          ? "Notifications are switched off for this app in your phone's settings."
          : "Your phone did not allow the notification.",
      );
      return;
    }

    setPinned((current) => new Set(current).add(trip.id));
  }

  async function handleArchive(trip: TripRecord) {
    const confirmed = await confirm({
      title: "Archive this trip?",
      body: `${trip.reason} — ${fmt.dateTime(trip.departureTime)}. It will be left out of trip reports. The owner can put it back from Settings.`,
      confirmLabel: "Archive trip",
    });

    if (!confirmed) {
      return;
    }

    setBusyId(trip.id);

    try {
      await archiveTrip(trip.id);
      await load();
      toast.success("Trip archived.");
    } catch (caught) {
      toast.error(messageFromError(caught));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-heading">Trips</h2>
        {formOpen ? null : (
          <Button onClick={openForm} variant="primary">
            Start a trip
          </Button>
        )}
      </div>

      {error ? <ErrorBlock message={error} /> : null}

      <div ref={formRef}>
        {formOpen ? (
          <Card>
            <CardHeader title="Start a trip" />

            <div className="flex flex-col gap-4">
              <ErrorSummary issues={issues} />

              <FieldGrid>
                <DateTimeField
                  label="Leaving at"
                  onChange={setDepartureTime}
                  required
                  value={departureTime}
                />
                <TextField
                  label="Reason"
                  onChange={setReason}
                  placeholder="Delivery run"
                  required
                  value={reason}
                />
                <NumberField
                  hint="Filled in from the vehicle. Change it if the dash says otherwise."
                  label="Odometer now"
                  onChange={setDepartureOdometer}
                  optional
                  unit={fmt.distanceLabel}
                  value={departureOdometer}
                />

                <FieldGridFull>
                  <PeopleField
                    label="Drivers"
                    onChange={setDrivers}
                    placeholder="Name"
                    values={drivers}
                  />
                </FieldGridFull>
                <FieldGridFull>
                  <PeopleField
                    label="Destinations"
                    onChange={setDestinations}
                    placeholder="Where to"
                    values={destinations}
                  />
                </FieldGridFull>
                <FieldGridFull>
                  <PeopleField
                    label="Passengers"
                    onChange={setPassengers}
                    optional
                    placeholder="Name"
                    values={passengers}
                  />
                </FieldGridFull>

                <FieldGridFull>
                  <TextAreaField
                    label="Notes"
                    onChange={setDepartureNotes}
                    optional
                    value={departureNotes}
                  />
                </FieldGridFull>
              </FieldGrid>

              <ButtonRow>
                <Button onClick={() => setFormOpen(false)}>Cancel</Button>
                <Button loading={saving} onClick={() => void handleStart()} variant="primary">
                  Start trip
                </Button>
              </ButtonRow>
            </div>
          </Card>
        ) : null}
      </div>

      {loading ? (
        <SkeletonRows rows={2} />
      ) : (
        <>
          <Card>
            <CardHeader title={open.length > 0 ? "Out now" : "Currently here"} />

            {open.length === 0 ? (
              <EmptyState title="This vehicle is not out on a trip." />
            ) : (
              <DataList>
                {open.map((trip) => (
                  <div className="flex flex-col gap-3" key={trip.id}>
                    <DataRow
                      actions={
                        returning?.id === trip.id ? null : (
                          <>
                            {/* Phones only. On a desktop the app is already a
                                window somebody is looking at. */}
                            {canPinTrips() ? (
                              <Button onClick={() => void handlePin(trip)} variant="quiet">
                                {pinned.has(trip.id) ? "Unpin" : "Pin to phone"}
                              </Button>
                            ) : null}
                            {/* Getting fuel is why the vehicle went out, so the
                                receipt belongs to the trip rather than to a
                                separate screen somebody has to remember. */}
                            <Button
                              onClick={() =>
                                void navigate(
                                  `${routes.vehicle(vehicleId, "fuel")}?trip=${trip.id}`,
                                )
                              }
                              variant="quiet"
                            >
                              Log fuel
                            </Button>
                            <Button
                              onClick={() =>
                                void navigate(
                                  `${routes.vehicle(vehicleId, "expenses")}?trip=${trip.id}`,
                                )
                              }
                              variant="quiet"
                            >
                              Add cost
                            </Button>
                            <Button
                              onClick={() => {
                                setReturning(trip);
                                setReturnTime(nowForInput());
                                setReturnOdometer("");
                              }}
                            >
                              Record return
                            </Button>
                          </>
                        )
                      }
                      meta={
                        <>
                          <MetaItem label="Left" numeric value={fmt.dateTime(trip.departureTime)} />
                          <MetaItem
                            label="Odometer out"
                            numeric
                            value={fmt.distance(trip.departureOdometer)}
                          />
                          <MetaItem label="Driver" value={trip.drivers.join(", ") || "—"} />
                          <MetaItem label="Going to" value={trip.destinations.join(", ") || "—"} />
                          <MetaItem
                            label="Spent so far"
                            numeric
                            value={fmt.money(trip.fuelTotal + trip.expenseTotal)}
                          />
                        </>
                      }
                      title={
                        <span className="flex flex-wrap items-center gap-2">
                          {trip.reason}
                          <Badge tone="info">Out</Badge>
                        </span>
                      }
                    />

                    {returning?.id === trip.id ? (
                      <Card className="border-info-line bg-info-surface/40">
                        <FieldGrid>
                          <DateTimeField
                            label="Back at"
                            onChange={setReturnTime}
                            required
                            value={returnTime}
                          />
                          <NumberField
                            hint={`Moves the vehicle's odometer on from ${fmt.distance(
                              trip.departureOdometer ?? vehicle.currentOdometer,
                            )}. Leave it empty if nobody looked.`}
                            label="Odometer now"
                            onChange={setReturnOdometer}
                            optional
                            unit={fmt.distanceLabel}
                            value={returnOdometer}
                          />
                          <TextAreaField
                            label="Notes"
                            onChange={setReturnNotes}
                            optional
                            value={returnNotes}
                          />
                        </FieldGrid>

                        <ButtonRow className="mt-4">
                          <Button onClick={() => setReturning(null)}>Cancel</Button>
                          <Button
                            loading={busyId === trip.id}
                            onClick={() => void handleComplete(trip)}
                            variant="primary"
                          >
                            Close trip
                          </Button>
                        </ButtonRow>
                      </Card>
                    ) : null}
                  </div>
                ))}
              </DataList>
            )}
          </Card>

          <Card>
            <CardHeader title="Past trips" />

            {past.length === 0 ? (
              <EmptyState title="No completed trips for this vehicle." />
            ) : (
              <DataList>
                {past.map((trip) => (
                  <DataRow
                    actions={
                      <Button
                        loading={busyId === trip.id}
                        onClick={() => void handleArchive(trip)}
                        variant="quiet"
                      >
                        Archive
                      </Button>
                    }
                    key={trip.id}
                    meta={
                      <>
                        <MetaItem label="Left" numeric value={fmt.dateTime(trip.departureTime)} />
                        <MetaItem label="Back" numeric value={fmt.dateTime(trip.returnTime)} />
                        {/* The two readings the distance was worked out from.
                            Without them a figure that looks wrong cannot be
                            checked, and a missing reading shows only as a dash
                            on Distance without saying which end is absent. */}
                        <MetaItem
                          label="Odometer"
                          numeric
                          value={fmt.odometerRange(trip.departureOdometer, trip.returnOdometer)}
                        />
                        <MetaItem label="Distance" numeric value={fmt.distance(trip.distanceKm)} />
                        <MetaItem label="Driver" value={trip.drivers.join(", ") || ABSENT} />
                        {trip.passengers.length > 0 ? (
                          <MetaItem label="Passengers" value={trip.passengers.join(", ")} />
                        ) : null}
                        <MetaItem label="Went to" value={trip.destinations.join(", ") || ABSENT} />
                        <MetaItem
                          label="Cost"
                          numeric
                          value={
                            trip.fuelTotal + trip.expenseTotal > 0
                              ? fmt.money(trip.fuelTotal + trip.expenseTotal)
                              : ABSENT
                          }
                        />
                      </>
                    }
                    subtitle={trip.returnNotes ?? undefined}
                    title={
                      <span className="flex flex-wrap items-center gap-2">
                        {trip.reason}
                        {/* A cancelled trip rendered identically to a completed
                            one, so a row with no distance and no cost read as a
                            trip somebody forgot to fill in. */}
                        {trip.status === "cancelled" ? (
                          <Badge tone="neutral">Cancelled</Badge>
                        ) : null}
                      </span>
                    }
                  />
                ))}
              </DataList>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function nowForInput(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

/**
 * Far enough that it is worth asking. A day's driving in a fleet like this is
 * tens or low hundreds of kilometres; 2,000 is either a very unusual trip or a
 * digit typed twice.
 */
const IMPLAUSIBLE_KM = 2000;

/** An empty box means "nobody looked", which is not the same as zero. */
function readingOf(value: string): number | undefined {
  const trimmed = value.trim();

  if (trimmed === "") {
    return undefined;
  }

  const parsed = Number(trimmed);

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}
