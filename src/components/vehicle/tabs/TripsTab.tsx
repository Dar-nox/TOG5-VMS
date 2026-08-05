import { useCallback, useEffect, useRef, useState } from "react";
import { useConfirm } from "../../../app/providers/confirmContext";
import { useFormat } from "../../../app/providers/formatContext";
import { useToast } from "../../../app/providers/toastContext";
import { messageFromError } from "../../../lib/errors";
import { trimToUndefined } from "../../../lib/text";
import {
  archiveTrip,
  completeTrip,
  listTrips,
  startTrip,
  type TripRecord,
} from "../../../services/api/trips";
import { Badge } from "../../ui/Badge";
import { Button, ButtonRow } from "../../ui/Button";
import { Card, CardHeader } from "../../ui/Card";
import { DataList, DataRow, MetaItem } from "../../ui/DataRow";
import { DateTimeField, FieldGrid, FieldGridFull, TextAreaField, TextField } from "../../ui/Field";
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
export function TripsTab({ vehicleId }: { vehicleId: string }) {
  const fmt = useFormat();
  const confirm = useConfirm();
  const toast = useToast();

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
  const [issues, setIssues] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const [returning, setReturning] = useState<TripRecord | null>(null);
  const [returnTime, setReturnTime] = useState(nowForInput);
  const [returnNotes, setReturnNotes] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const formRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      setTrips(await listTrips({ vehicleId }));
      setError(null);
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
    setBusyId(trip.id);

    try {
      await completeTrip(trip.id, {
        returnTime,
        returnNotes: trimToUndefined(returnNotes),
      });

      await load();
      setReturning(null);
      setReturnNotes("");
      toast.success("Trip closed.");
    } catch (caught) {
      toast.error(messageFromError(caught));
    } finally {
      setBusyId(null);
    }
  }

  async function handleArchive(trip: TripRecord) {
    const confirmed = await confirm({
      title: "Archive this trip?",
      body: `${trip.reason} — ${fmt.dateTime(trip.departureTime)}. It will be left out of trip reports. Archived records can be restored.`,
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
                          <Button
                            onClick={() => {
                              setReturning(trip);
                              setReturnTime(nowForInput());
                            }}
                          >
                            Record return
                          </Button>
                        )
                      }
                      meta={
                        <>
                          <MetaItem label="Left" numeric value={fmt.dateTime(trip.departureTime)} />
                          <MetaItem label="Driver" value={trip.drivers.join(", ") || "—"} />
                          <MetaItem label="Going to" value={trip.destinations.join(", ") || "—"} />
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
                        <MetaItem label="Driver" value={trip.drivers.join(", ") || "—"} />
                        <MetaItem label="Went to" value={trip.destinations.join(", ") || "—"} />
                      </>
                    }
                    subtitle={trip.returnNotes ?? undefined}
                    title={trip.reason}
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
