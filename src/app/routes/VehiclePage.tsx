import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ExpensesTab } from "../../components/vehicle/tabs/ExpensesTab";
import { FuelTab } from "../../components/vehicle/tabs/FuelTab";
import { MaintenanceTab } from "../../components/vehicle/tabs/MaintenanceTab";
import { ServiceHistoryTab } from "../../components/vehicle/tabs/ServiceHistoryTab";
import { TripsTab } from "../../components/vehicle/tabs/TripsTab";
import { VehicleOverview } from "../../components/vehicle/VehicleOverview";
import { VehiclePhoto } from "../../components/vehicle/VehiclePhoto";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { SkeletonRows } from "../../components/ui/Spinner";
import { ErrorBlock } from "../../components/ui/States";
import { TabPanel, Tabs, type TabItem } from "../../components/ui/Tabs";
import { toneForVehicleStatus } from "../../components/ui/tones";
import { messageFromError } from "../../lib/errors";
import { routes, type VehicleTab } from "../../lib/routes";
import { labelFromKey } from "../../lib/text";
import { useFormat } from "../providers/formatContext";
import {
  listMaintenanceSchedulesForVehicle,
  type MaintenanceScheduleRecord,
} from "../../services/api/maintenance";
import { getVehicle, type VehicleRecord } from "../../services/api/vehicles";

const TABS: TabItem<VehicleTab>[] = [
  { id: "overview", label: "Overview" },
  { id: "fuel", label: "Fuel" },
  { id: "maintenance", label: "Maintenance" },
  { id: "history", label: "Service history" },
  { id: "trips", label: "Trips" },
  { id: "expenses", label: "Expenses" },
];

function isVehicleTab(value?: string): value is VehicleTab {
  return TABS.some((tab) => tab.id === value);
}

/**
 * One vehicle, and everything true about it.
 *
 * The tab is in the address rather than in component state, so a link can
 * point at a particular vehicle's fuel history and the back button steps
 * between tabs instead of leaving the vehicle altogether.
 */
export default function VehiclePage() {
  const { vehicleId, tab } = useParams();
  const navigate = useNavigate();
  const fmt = useFormat();

  const [vehicle, setVehicle] = useState<VehicleRecord | null>(null);
  const [schedules, setSchedules] = useState<MaintenanceScheduleRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const active: VehicleTab = isVehicleTab(tab) ? tab : "overview";

  const load = useCallback(async () => {
    if (!vehicleId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [record, scheduleRecords] = await Promise.all([
        getVehicle(vehicleId),
        listMaintenanceSchedulesForVehicle(vehicleId),
      ]);

      setVehicle(record);
      setSchedules(scheduleRecords);
    } catch (caught) {
      setError(messageFromError(caught));
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!vehicleId) {
    return null;
  }

  if (loading && !vehicle) {
    return <SkeletonRows rows={3} />;
  }

  if (error && !vehicle) {
    return (
      <div className="flex flex-col gap-4">
        <ErrorBlock message={error} />
        <Link className="text-sm font-semibold text-info underline" to={routes.vehicles}>
          Back to vehicles
        </Link>
      </div>
    );
  }

  if (!vehicle) {
    return null;
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-start gap-4">
        <VehiclePhoto
          alt={vehicle.vehicleName}
          className="size-20 @md:size-28"
          storagePath={vehicle.primaryPhotoPath}
        />

        <div className="min-w-0 flex-1">
          {/* The name and the picture are the identifiers; the plate is a
              detail, which is the order specs/05 asks for and the reverse of
              how a fleet system usually does it. */}
          <h1 className="text-xl font-semibold break-words text-heading @md:text-2xl">
            {vehicle.vehicleName}
          </h1>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone={toneForVehicleStatus(vehicle.status)}>
              {labelFromKey(vehicle.status)}
            </Badge>
            {vehicle.plateNumber ? (
              <span className="tabular text-sm text-muted">{vehicle.plateNumber}</span>
            ) : null}
            <span className="tabular text-sm text-muted">
              {fmt.distance(vehicle.currentOdometer)}
            </span>
          </div>
        </div>

        <Button onClick={() => void navigate(`/vehicles/${vehicleId}/edit`)}>Edit</Button>
      </header>

      <Tabs
        active={active}
        items={TABS}
        label="Vehicle sections"
        onChange={(next) => void navigate(routes.vehicle(vehicleId, next))}
      />

      <TabPanel active={active} id="overview">
        <VehicleOverview schedules={schedules} vehicle={vehicle} />
      </TabPanel>

      <TabPanel active={active} id="fuel">
        <FuelTab vehicle={vehicle} />
      </TabPanel>
      <TabPanel active={active} id="maintenance">
        <MaintenanceTab vehicle={vehicle} />
      </TabPanel>
      <TabPanel active={active} id="history">
        <ServiceHistoryTab vehicleId={vehicleId} />
      </TabPanel>
      <TabPanel active={active} id="trips">
        <TripsTab vehicleId={vehicleId} />
      </TabPanel>
      <TabPanel active={active} id="expenses">
        <ExpensesTab vehicleId={vehicleId} />
      </TabPanel>
    </div>
  );
}
