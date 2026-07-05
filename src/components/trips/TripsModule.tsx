import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  archiveTrip,
  completeTrip,
  listTrips,
  startTrip,
  type TripListFilter,
  type TripRecord,
} from "../../services/api/trips";
import { listVehicles, type VehicleRecord } from "../../services/api/vehicles";

type TripFormState = {
  vehicleId: string;
  departureTime: string;
  drivers: string[];
  passengers: string[];
  reason: string;
  destinations: string[];
  departureNotes: string;
};

type EndTripFormState = {
  returnTime: string;
  returnNotes: string;
};

const emptyTripForm = (): TripFormState => ({
  vehicleId: "",
  departureTime: datetimeLocalNow(),
  drivers: [""],
  passengers: [""],
  reason: "",
  destinations: [""],
  departureNotes: "",
});

const emptyEndTripForm = (): EndTripFormState => ({
  returnTime: datetimeLocalNow(),
  returnNotes: "",
});

export function TripsModule() {
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [openTrips, setOpenTrips] = useState<TripRecord[]>([]);
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [form, setForm] = useState<TripFormState>(() => emptyTripForm());
  const [endTripForm, setEndTripForm] = useState<EndTripFormState>(() => emptyEndTripForm());
  const [endingTripId, setEndingTripId] = useState<string | null>(null);
  const [vehicleFilter, setVehicleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed">("completed");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ending, setEnding] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [endTripError, setEndTripError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === form.vehicleId),
    [form.vehicleId, vehicles],
  );

  const historyTrips = useMemo(() => trips.filter((trip) => trip.status !== "open"), [trips]);

  const loadTrips = useCallback(async () => {
    setErrorMessage(null);
    const baseFilter = {
      vehicleId: vehicleFilter === "all" ? undefined : vehicleFilter,
      startDate: trimToUndefined(startDate),
      endDate: trimToUndefined(endDate),
    };
    const historyFilter: TripListFilter = {
      ...baseFilter,
      status: statusFilter === "all" ? undefined : statusFilter,
    };

    try {
      const [openRecords, tripRecords] = await Promise.all([
        listTrips({ ...baseFilter, status: "open" }),
        listTrips(historyFilter),
      ]);
      setOpenTrips(openRecords);
      setTrips(tripRecords);
    } catch (error) {
      setErrorMessage(messageFromError(error));
      setOpenTrips([]);
      setTrips([]);
    }
  }, [endDate, startDate, statusFilter, vehicleFilter]);

  const loadPageData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const vehicleRecords = await listVehicles();
      setVehicles(vehicleRecords);
      setForm((current) => ({
        ...current,
        vehicleId: current.vehicleId || vehicleRecords[0]?.id || "",
      }));
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
    void loadTrips();
  }, [loadTrips]);

  async function handleStartTrip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    setSuccessMessage(null);

    try {
      const created = await startTrip({
        vehicleId: form.vehicleId,
        departureTime: form.departureTime,
        drivers: cleanStringList(form.drivers),
        passengers: cleanStringList(form.passengers),
        reason: form.reason,
        destinations: cleanStringList(form.destinations),
        departureNotes: trimToUndefined(form.departureNotes),
      });
      setForm({
        ...emptyTripForm(),
        vehicleId: created.vehicleId,
      });
      setSuccessMessage(`Trip started for ${created.vehicleName}.`);
      await loadTrips();
    } catch (error) {
      setFormError(messageFromError(error));
    } finally {
      setSaving(false);
    }
  }

  async function handleEndTrip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!endingTripId) {
      return;
    }

    setEnding(true);
    setEndTripError(null);
    setSuccessMessage(null);

    try {
      const completed = await completeTrip(endingTripId, {
        returnTime: endTripForm.returnTime,
        returnNotes: trimToUndefined(endTripForm.returnNotes),
      });
      setEndingTripId(null);
      setEndTripForm(emptyEndTripForm());
      setSuccessMessage(`Trip ended for ${completed.vehicleName}.`);
      await loadTrips();
    } catch (error) {
      setEndTripError(messageFromError(error));
    } finally {
      setEnding(false);
    }
  }

  async function handleArchiveTrip(id: string) {
    const confirmed = window.confirm("Archive this trip log? This hides it from trip history.");
    if (!confirmed) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await archiveTrip(id);
      setSuccessMessage("Trip log archived.");
      await loadTrips();
    } catch (error) {
      setErrorMessage(messageFromError(error));
    }
  }

  function handleStartEndingTrip(tripId: string) {
    setEndingTripId(tripId);
    setEndTripForm(emptyEndTripForm());
    setEndTripError(null);
  }

  return (
    <div className="trips-module">
      <section className="trips-workspace">
        <div className="trips-header">
          <div>
            <h2>Trips</h2>
            <p>
              Start a trip when a vehicle leaves, then end it when it returns. No odometer or
              distance tracking is needed here.
            </p>
          </div>

          <div className="trip-filter-grid" aria-label="Trip filters">
            <label className="form-field">
              <span>Vehicle</span>
              <select
                value={vehicleFilter}
                onChange={(event) => setVehicleFilter(event.target.value)}
              >
                <option value="all">All vehicles</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.vehicleName}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field">
              <span>Past trip status</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as "all" | "completed")}
              >
                <option value="completed">Completed</option>
                <option value="all">All past trips</option>
              </select>
            </label>

            <label className="form-field">
              <span>From</span>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </label>

            <label className="form-field">
              <span>To</span>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </label>
          </div>
        </div>

        {loading ? <div className="maintenance-empty-note">Loading vehicles...</div> : null}
        {errorMessage ? <div className="inline-error">{errorMessage}</div> : null}
        {successMessage ? <div className="backup-success-note">{successMessage}</div> : null}

        <div className="trips-layout">
          <form className="trip-form" onSubmit={handleStartTrip}>
            <div>
              <h3>Start trip</h3>
              <p>Record who went out, where they are headed, and why the vehicle left.</p>
            </div>

            {vehicles.length === 0 ? (
              <div className="maintenance-empty-note">Add a vehicle before starting trip logs.</div>
            ) : null}

            <div className="trip-form-grid">
              <label className="form-field">
                <span>Vehicle</span>
                <select
                  value={form.vehicleId}
                  onChange={(event) => setForm({ ...form, vehicleId: event.target.value })}
                >
                  <option value="">Choose vehicle</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.vehicleName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-field">
                <span>Time out</span>
                <input
                  type="datetime-local"
                  value={form.departureTime}
                  onChange={(event) => setForm({ ...form, departureTime: event.target.value })}
                />
              </label>

              <label className="form-field trip-form-wide">
                <span>Reason for trip</span>
                <input
                  value={form.reason}
                  onChange={(event) => setForm({ ...form, reason: event.target.value })}
                  placeholder="Example: Deliver supplies"
                />
              </label>
            </div>

            <RepeatableTextFields
              addLabel="Add driver"
              label="Driver/s"
              minRows={1}
              onChange={(drivers) => setForm({ ...form, drivers })}
              placeholder="Driver name"
              values={form.drivers}
            />

            <RepeatableTextFields
              addLabel="Add passenger"
              label="Passengers"
              onChange={(passengers) => setForm({ ...form, passengers })}
              placeholder="Passenger name"
              values={form.passengers}
            />

            <RepeatableTextFields
              addLabel="Add destination"
              label="Destination/s"
              minRows={1}
              onChange={(destinations) => setForm({ ...form, destinations })}
              placeholder="Destination"
              values={form.destinations}
            />

            <label className="form-field">
              <span>Notes before leaving</span>
              <textarea
                rows={3}
                value={form.departureNotes}
                onChange={(event) => setForm({ ...form, departureNotes: event.target.value })}
                placeholder="Optional remarks before departure"
              />
            </label>

            {selectedVehicle ? (
              <div className="trip-context-note">
                <strong>{selectedVehicle.vehicleName}</strong>
                <span>
                  {labelFromKey(selectedVehicle.vehicleType)} /{" "}
                  {labelFromKey(selectedVehicle.fuelType)}
                </span>
              </div>
            ) : null}

            {formError ? <div className="inline-error">{formError}</div> : null}

            <div className="form-actions">
              <button className="primary-button" disabled={saving || vehicles.length === 0}>
                {saving ? "Starting trip..." : "Start trip"}
              </button>
            </div>
          </form>

          <div className="trip-list-stack">
            <section className="trip-panel">
              <div className="trip-panel-heading">
                <div>
                  <h3>Currently out</h3>
                  <p>Open trips stay here until someone records the return time.</p>
                </div>
                <span className="status-pill active">{openTrips.length} open</span>
              </div>

              {openTrips.length === 0 ? (
                <div className="maintenance-empty-note">No vehicles are currently out.</div>
              ) : (
                <div className="trip-card-list">
                  {openTrips.map((trip) => (
                    <TripCard
                      key={trip.id}
                      ending={ending}
                      endingTripForm={endTripForm}
                      endingTripId={endingTripId}
                      errorMessage={endTripError}
                      onArchive={() => void handleArchiveTrip(trip.id)}
                      onCancelEnd={() => setEndingTripId(null)}
                      onChangeEndForm={setEndTripForm}
                      onEndSubmit={handleEndTrip}
                      onStartEnd={() => handleStartEndingTrip(trip.id)}
                      trip={trip}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="trip-panel">
              <div className="trip-panel-heading">
                <div>
                  <h3>Past trips</h3>
                  <p>Completed and archived operational trip records.</p>
                </div>
                <span className="status-pill">{historyTrips.length} shown</span>
              </div>

              {historyTrips.length === 0 ? (
                <div className="maintenance-empty-note">No past trips match this filter yet.</div>
              ) : (
                <div className="trip-card-list">
                  {historyTrips.map((trip) => (
                    <TripCard
                      key={trip.id}
                      onArchive={() => void handleArchiveTrip(trip.id)}
                      trip={trip}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}

function RepeatableTextFields({
  addLabel,
  label,
  minRows = 0,
  onChange,
  placeholder,
  values,
}: {
  addLabel: string;
  label: string;
  minRows?: number;
  onChange: (values: string[]) => void;
  placeholder: string;
  values: string[];
}) {
  const visibleValues = values.length === 0 ? [""] : values;

  function updateValue(index: number, value: string) {
    const next = [...visibleValues];
    next[index] = value;
    onChange(next);
  }

  function removeValue(index: number) {
    const next = visibleValues.filter((_, valueIndex) => valueIndex !== index);
    onChange(next.length < minRows ? Array.from({ length: minRows }, () => "") : next);
  }

  return (
    <div className="trip-repeatable">
      <div className="trip-repeatable-heading">
        <span>{label}</span>
        <button
          className="secondary-button"
          onClick={() => onChange([...visibleValues, ""])}
          type="button"
        >
          {addLabel}
        </button>
      </div>

      <div className="trip-repeatable-list">
        {visibleValues.map((value, index) => (
          <div className="trip-repeatable-row" key={`${label}-${index}`}>
            <input
              aria-label={`${label} ${index + 1}`}
              onChange={(event) => updateValue(index, event.target.value)}
              placeholder={placeholder}
              value={value}
            />
            <button
              className="secondary-button"
              disabled={visibleValues.length <= minRows}
              onClick={() => removeValue(index)}
              type="button"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function TripCard({
  ending = false,
  endingTripForm,
  endingTripId,
  errorMessage,
  onArchive,
  onCancelEnd,
  onChangeEndForm,
  onEndSubmit,
  onStartEnd,
  trip,
}: {
  ending?: boolean;
  endingTripForm?: EndTripFormState;
  endingTripId?: string | null;
  errorMessage?: string | null;
  onArchive: () => void;
  onCancelEnd?: () => void;
  onChangeEndForm?: (form: EndTripFormState) => void;
  onEndSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  onStartEnd?: () => void;
  trip: TripRecord;
}) {
  const isEndingThisTrip = endingTripId === trip.id;

  return (
    <article className="trip-card">
      <div className="trip-card-main">
        <div className="maintenance-card-heading">
          <span className={`status-pill ${trip.status === "open" ? "active" : ""}`}>
            {trip.status === "open" ? "Currently out" : labelFromKey(trip.status)}
          </span>
          <span className="maintenance-category">{formatDateTime(trip.departureTime)}</span>
        </div>
        <h3>{trip.vehicleName}</h3>
        <p>{trip.reason}</p>
        <div className="trip-chip-list">
          {trip.destinations.map((destination, index) => (
            <span key={`${destination}-${index}`}>{destination}</span>
          ))}
        </div>
      </div>

      <div className="trip-card-meta">
        <span>Driver/s: {joinOrDash(trip.drivers)}</span>
        <span>Passengers: {joinOrDash(trip.passengers)}</span>
        <span>Returned: {trip.returnTime ? formatDateTime(trip.returnTime) : "Not yet"}</span>
      </div>

      {trip.departureNotes ? (
        <p className="maintenance-action-note">Before leaving: {trip.departureNotes}</p>
      ) : null}
      {trip.returnNotes ? (
        <p className="maintenance-action-note">After return: {trip.returnNotes}</p>
      ) : null}

      {isEndingThisTrip && endingTripForm && onChangeEndForm && onEndSubmit ? (
        <form className="trip-end-form" onSubmit={onEndSubmit}>
          <label className="form-field">
            <span>Time returned</span>
            <input
              type="datetime-local"
              value={endingTripForm.returnTime}
              onChange={(event) =>
                onChangeEndForm({ ...endingTripForm, returnTime: event.target.value })
              }
            />
          </label>
          <label className="form-field">
            <span>Return notes</span>
            <textarea
              rows={3}
              value={endingTripForm.returnNotes}
              onChange={(event) =>
                onChangeEndForm({ ...endingTripForm, returnNotes: event.target.value })
              }
              placeholder="Optional remarks after returning"
            />
          </label>
          {errorMessage ? <div className="inline-error">{errorMessage}</div> : null}
          <div className="form-actions">
            <button className="secondary-button" onClick={onCancelEnd} type="button">
              Cancel
            </button>
            <button className="primary-button" disabled={ending}>
              {ending ? "Ending trip..." : "End trip"}
            </button>
          </div>
        </form>
      ) : null}

      <div className="trip-card-actions">
        {trip.status === "open" && onStartEnd ? (
          <button className="primary-button" onClick={onStartEnd} type="button">
            End trip
          </button>
        ) : null}
        <button className="secondary-button" onClick={onArchive} type="button">
          Archive
        </button>
      </div>
    </article>
  );
}

function datetimeLocalNow() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

function cleanStringList(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean);
}

function trimToUndefined(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function joinOrDash(values: string[]) {
  return values.length > 0 ? values.join(", ") : "None";
}

function formatDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function labelFromKey(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function messageFromError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
