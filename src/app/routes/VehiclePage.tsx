import { useNavigate, useParams } from "react-router";
import { ExpensesModule } from "../../components/expenses/ExpensesModule";
import { FuelLogsModule } from "../../components/fuel/FuelLogsModule";
import { MaintenanceTemplateModule } from "../../components/maintenance/MaintenanceTemplateModule";
import { ServiceHistoryModule } from "../../components/serviceHistory/ServiceHistoryModule";
import { TripsModule } from "../../components/trips/TripsModule";
import { VehicleModule } from "../../components/vehicles/VehicleModule";
import { TabPanel, Tabs, type TabItem } from "../../components/ui/Tabs";
import { routes, type VehicleTab } from "../../lib/routes";

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
 *
 * The panels still hold the fleet-wide modules while those are being rebuilt;
 * they are replaced with vehicle-scoped content screen by screen.
 */
export default function VehiclePage() {
  const { vehicleId, tab } = useParams();
  const navigate = useNavigate();
  const active: VehicleTab = isVehicleTab(tab) ? tab : "overview";

  if (!vehicleId) {
    return null;
  }

  return (
    <div className="flex flex-col gap-5">
      <Tabs
        active={active}
        items={TABS}
        label="Vehicle sections"
        onChange={(next) => void navigate(routes.vehicle(vehicleId, next))}
      />

      <TabPanel active={active} id="overview">
        <VehicleModule />
      </TabPanel>
      <TabPanel active={active} id="fuel">
        <FuelLogsModule />
      </TabPanel>
      <TabPanel active={active} id="maintenance">
        <MaintenanceTemplateModule />
      </TabPanel>
      <TabPanel active={active} id="history">
        <ServiceHistoryModule />
      </TabPanel>
      <TabPanel active={active} id="trips">
        <TripsModule />
      </TabPanel>
      <TabPanel active={active} id="expenses">
        <ExpensesModule />
      </TabPanel>
    </div>
  );
}
