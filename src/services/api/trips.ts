import { invoke } from "./client";

const tripCommands = {
  list: "list_trips",
  listOpen: "list_open_trips",
  get: "get_trip",
  start: "start_trip",
  complete: "complete_trip",
  archive: "archive_trip",
  reportsOverview: "get_trip_reports_overview",
} as const;

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
  status: TripStatus;
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
};

export type CompleteTripRequest = {
  returnTime: string;
  returnNotes?: string;
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

export async function listTrips(filter?: TripListFilter): Promise<TripRecord[]> {
  return invoke<TripRecord[]>(tripCommands.list, { filter: cleanFilter(filter) });
}

export async function listOpenTrips(): Promise<TripRecord[]> {
  return invoke<TripRecord[]>(tripCommands.listOpen);
}

export async function getTrip(id: string): Promise<TripRecord> {
  return invoke<TripRecord>(tripCommands.get, { id });
}

export async function startTrip(request: StartTripRequest): Promise<TripRecord> {
  return invoke<TripRecord>(tripCommands.start, { request });
}

export async function completeTrip(id: string, request: CompleteTripRequest): Promise<TripRecord> {
  return invoke<TripRecord>(tripCommands.complete, { id, request });
}

export async function archiveTrip(id: string): Promise<void> {
  return invoke<void>(tripCommands.archive, { id });
}

export async function getTripReportsOverview(
  filter?: TripReportFilter,
): Promise<TripReportsOverview> {
  return invoke<TripReportsOverview>(tripCommands.reportsOverview, {
    filter: cleanFilter(filter),
  });
}

function cleanFilter<Filter extends Record<string, string | undefined>>(
  filter?: Filter,
): Filter | undefined {
  if (!filter) {
    return undefined;
  }

  const cleaned = Object.fromEntries(
    Object.entries(filter).filter(([, value]) => value !== undefined && value.trim() !== ""),
  ) as Filter;

  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}
