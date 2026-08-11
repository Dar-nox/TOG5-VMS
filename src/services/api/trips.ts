import { rpc, supabase, unwrap } from "./client";

export type TripStatus = "open" | "completed" | "cancelled";

export type TripListFilter = {
  vehicleId?: string;
  status?: TripStatus;
  startDate?: string;
  endDate?: string;
};

export type TripReportFilter = {
  vehicleId?: string;
  startDate?: string;
  endDate?: string;
};

export type TripRecord = {
  id: string;
  vehicleId: string;
  vehicleName: string;
  departureTime: string;
  returnTime?: string | null;
  reason: string;
  destinations: string[];
  drivers: string[];
  passengers: string[];
  departureNotes?: string | null;
  returnNotes?: string | null;
  departureOdometer?: number | null;
  returnOdometer?: number | null;
  /** Only once both readings are in. */
  distanceKm?: number | null;
  /** Fuel bought on this trip, and costs booked against it. */
  fuelTotal: number;
  expenseTotal: number;
  status: TripStatus;
  /** Who entered it. Null on records imported from the desktop app. */
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StartTripRequest = {
  vehicleId: string;
  departureTime: string;
  drivers: string[];
  passengers: string[];
  reason: string;
  destinations: string[];
  departureNotes?: string;
  departureOdometer?: number;
};

export type CompleteTripRequest = {
  returnTime: string;
  returnNotes?: string;
  returnOdometer?: number;
};

export type TripCountRecord = {
  label: string;
  count: number;
};

export type TripReportsOverview = {
  totalTrips: number;
  openTrips: number;
  completedTrips: number;
  cancelledTrips: number;
  tripsByVehicle: TripCountRecord[];
  tripsByDriver: TripCountRecord[];
  tripsByDestination: TripCountRecord[];
  recentTrips: TripRecord[];
};

/**
 * Trips read from a view that flattens the drivers, passengers and
 * destinations into lists, so one request replaces four joins.
 */
export async function listTrips(filter?: TripListFilter): Promise<TripRecord[]> {
  let query = supabase.from("trips_with_people").select("*");

  if (filter?.vehicleId) {
    query = query.eq("vehicle_id", filter.vehicleId);
  }
  if (filter?.status) {
    query = query.eq("status", filter.status);
  }
  if (filter?.startDate) {
    query = query.gte("departure_time", filter.startDate);
  }
  if (filter?.endDate) {
    query = query.lte("departure_time", `${filter.endDate}T23:59:59`);
  }

  return unwrap(await query.order("departure_time", { ascending: false }));
}

export async function listOpenTrips(): Promise<TripRecord[]> {
  return unwrap(
    await supabase
      .from("trips_with_people")
      .select("*")
      .eq("status", "open")
      .order("departure_time", { ascending: false }),
  );
}

export async function getTrip(id: string): Promise<TripRecord> {
  return unwrap(await supabase.from("trips_with_people").select("*").eq("id", id).single());
}

/** One call, because a trip and its people have to be written together. */
export async function startTrip(request: StartTripRequest): Promise<TripRecord> {
  const id = await rpc<string>("start_trip", {
    vehicle_id: request.vehicleId,
    departure_time: request.departureTime,
    reason: request.reason,
    drivers: request.drivers,
    passengers: request.passengers,
    destinations: request.destinations,
    departure_notes: request.departureNotes ?? null,
    // Left out, the server fills it from the vehicle's own reading.
    departure_odometer: request.departureOdometer ?? null,
  });

  return getTrip(id);
}

export async function completeTrip(id: string, request: CompleteTripRequest): Promise<TripRecord> {
  await rpc<void>("complete_trip", {
    trip_id: id,
    return_time: request.returnTime,
    return_notes: request.returnNotes ?? null,
    return_odometer: request.returnOdometer ?? null,
  });

  return getTrip(id);
}

export async function archiveTrip(id: string): Promise<void> {
  // Soft delete. A trigger takes the drivers, passengers and destinations
  // with it, so nothing is left listed against a trip that is gone.
  //
  // Through a function rather than writing `deleted_at` from here: the read
  // policy hides soft-deleted rows, and Postgres applies that policy to the row
  // an UPDATE is about to produce, so this table refuses the one update that
  // matters. See migration 31.
  await rpc<void>("archive_trip", { trip_id: id });
}

export async function getTripReportsOverview(
  filter?: TripReportFilter,
): Promise<TripReportsOverview> {
  return rpc<TripReportsOverview>("trip_reports_overview", {
    vehicle_id: filter?.vehicleId ?? null,
    start_date: filter?.startDate ?? null,
    end_date: filter?.endDate ?? null,
  });
}
