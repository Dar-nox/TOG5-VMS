import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useFormat } from "../providers/formatContext";
import { useToast } from "../providers/toastContext";
import { messageFromError } from "../../lib/errors";
import { routes } from "../../lib/routes";
import { canPrint, saveMessage } from "../../lib/saveFile";
import { labelFromKey } from "../../lib/text";
import { getReportsOverview, type ReportsOverview } from "../../services/api/expenses";
import { exportReportCsv } from "../../services/api/reports";
import { getTripReportsOverview, type TripReportsOverview } from "../../services/api/trips";
import { listVehicles, type VehicleRecord } from "../../services/api/vehicles";
import { Button, ButtonRow } from "../../components/ui/Button";
import { Card, CardHeader, Stat, StatRow } from "../../components/ui/Card";
import { DataList, DataRow, MetaItem } from "../../components/ui/DataRow";
import { DateField, FieldGrid, SelectField } from "../../components/ui/Field";
import { SkeletonRows } from "../../components/ui/Spinner";
import { EmptyState, ErrorBlock } from "../../components/ui/States";
import { TabPanel, Tabs, type TabItem } from "../../components/ui/Tabs";

type ReportTab = "costs" | "trips";

const TABS: TabItem<ReportTab>[] = [
  { id: "costs", label: "Costs" },
  { id: "trips", label: "Trips" },
];

/**
 * Fleet-wide figures.
 *
 * Reports keeps its own page because it is the one place a question spans
 * every vehicle. What it loses is the nesting — a grid inside a panel inside a
 * grid — and the six-column summary that never collapsed until 760px, so on a
 * tablet it produced six ~89px cards each holding a full peso amount with no
 * way to wrap. That is the single clearest example of the overlapping this
 * overhaul exists to fix.
 *
 * It also loses three tiles named after the database: "Linked source copies",
 * "Direct expense rows" and "Linked copies excluded" are not things anybody
 * has.
 */
export default function ReportsPage() {
  const fmt = useFormat();
  const toast = useToast();
  const navigate = useNavigate();

  const [tab, setTab] = useState<ReportTab>("costs");
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [vehicleId, setVehicleId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [costs, setCosts] = useState<ReportsOverview | null>(null);
  const [trips, setTrips] = useState<TripReportsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    void listVehicles()
      .then(setVehicles)
      .catch(() => undefined);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);

    const filter = {
      vehicleId: vehicleId || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    };

    try {
      // Both at once. The old screen ran three independent loads and could
      // show three stacked "Loading…" banners at the same time.
      const [costReport, tripReport] = await Promise.all([
        getReportsOverview(filter),
        getTripReportsOverview(filter),
      ]);

      setCosts(costReport);
      setTrips(tripReport);
      setError(null);
    } catch (caught) {
      setError(messageFromError(caught));
    } finally {
      setLoading(false);
    }
  }, [endDate, startDate, vehicleId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleExport() {
    if (!costs) {
      return;
    }

    setExporting(true);

    try {
      const rows = [
        ["Vehicle", "Fuel", "Maintenance", "Repairs", "Other", "Total", "Cost per km"],
        ...costs.vehicleSummaries.map((summary) => [
          summary.vehicleName,
          summary.fuelTotal.toFixed(2),
          summary.maintenanceTotal.toFixed(2),
          summary.repairTotal.toFixed(2),
          summary.manualExpenseTotal.toFixed(2),
          summary.totalCost.toFixed(2),
          summary.costPerKm == null ? "" : summary.costPerKm.toFixed(2),
        ]),
      ];

      const outcome = await exportReportCsv({
        filename: `tog5-costs-${new Date().toISOString().slice(0, 10)}.csv`,
        csvContents: rows.map((row) => row.map(quote).join(",")).join("\r\n"),
      });

      if (outcome.via === "cancelled") {
        return;
      }

      toast.success(saveMessage(outcome));
    } catch (caught) {
      toast.error(messageFromError(caught));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-heading @md:text-2xl">Reports</h1>

        <ButtonRow>
          <Button loading={exporting} onClick={() => void handleExport()}>
            {canPrint() ? "Download CSV" : "Share CSV"}
          </Button>
        </ButtonRow>
      </div>

      <Card>
        <FieldGrid>
          <SelectField
            label="Vehicle"
            onChange={setVehicleId}
            options={[
              { value: "", label: "Every vehicle" },
              ...vehicles.map((vehicle) => ({
                value: vehicle.id,
                label: vehicle.vehicleName,
              })),
            ]}
            value={vehicleId}
          />
          <div className="grid grid-cols-2 gap-3">
            <DateField label="From" onChange={setStartDate} optional value={startDate} />
            <DateField label="To" onChange={setEndDate} optional value={endDate} />
          </div>
        </FieldGrid>
      </Card>

      {error ? (
        <ErrorBlock
          action={<Button onClick={() => void load()}>Try again</Button>}
          message={error}
        />
      ) : null}

      <Tabs active={tab} items={TABS} label="Report type" onChange={setTab} />

      {loading ? (
        <SkeletonRows rows={3} />
      ) : (
        <>
          <TabPanel active={tab} id="costs">
            {costs ? (
              <div className="flex flex-col gap-5">
                <Card>
                  <StatRow>
                    <Stat label="Total" value={fmt.money(costs.totalTrackedCost)} />
                    <Stat label="Fuel" value={fmt.money(costs.fuelTotal)} />
                    <Stat label="Maintenance" value={fmt.money(costs.maintenanceTotal)} />
                    <Stat label="Repairs" value={fmt.money(costs.repairTotal)} />
                    <Stat label="Other" value={fmt.money(costs.manualExpenseTotal)} />
                  </StatRow>
                </Card>

                <Card>
                  <CardHeader title="By vehicle" />

                  {costs.vehicleSummaries.length === 0 ? (
                    <EmptyState title="No costs recorded for this period." />
                  ) : (
                    <DataList>
                      {costs.vehicleSummaries.map((summary) => (
                        <DataRow
                          key={summary.vehicleId}
                          meta={
                            <>
                              <MetaItem label="Fuel" numeric value={fmt.money(summary.fuelTotal)} />
                              <MetaItem
                                label="Maintenance"
                                numeric
                                value={fmt.money(summary.maintenanceTotal)}
                              />
                              <MetaItem
                                label="Repairs"
                                numeric
                                value={fmt.money(summary.repairTotal)}
                              />
                              <MetaItem
                                label="Total"
                                numeric
                                value={fmt.money(summary.totalCost)}
                              />
                              <MetaItem
                                label="Per distance"
                                numeric
                                value={fmt.costPerDistance(summary.costPerKm)}
                              />
                            </>
                          }
                          onClick={() => void navigate(routes.vehicle(summary.vehicleId))}
                          openLabel={`Open ${summary.vehicleName}`}
                          title={summary.vehicleName}
                        />
                      ))}
                    </DataList>
                  )}
                </Card>

                <Card>
                  <CardHeader title="By category" />

                  {costs.categoryTotals.length === 0 ? (
                    <EmptyState title="Nothing to break down yet." />
                  ) : (
                    <DataList>
                      {costs.categoryTotals.map((total) => (
                        <DataRow
                          key={total.category}
                          meta={
                            <>
                              <MetaItem label="Total" numeric value={fmt.money(total.total)} />
                              <MetaItem label="Records" numeric value={total.count} />
                            </>
                          }
                          title={labelFromKey(total.category)}
                        />
                      ))}
                    </DataList>
                  )}
                </Card>
              </div>
            ) : null}
          </TabPanel>

          <TabPanel active={tab} id="trips">
            {trips ? (
              <div className="flex flex-col gap-5">
                <Card>
                  <StatRow>
                    <Stat label="Trips" value={trips.totalTrips} />
                    <Stat label="Out now" value={trips.openTrips} />
                    <Stat label="Completed" value={trips.completedTrips} />
                  </StatRow>
                </Card>

                <Card>
                  <CardHeader title="By driver" />

                  {trips.tripsByDriver.length === 0 ? (
                    <EmptyState title="No trips in this period." />
                  ) : (
                    <DataList>
                      {trips.tripsByDriver.map((row) => (
                        <DataRow
                          key={row.label}
                          meta={<MetaItem label="Trips" numeric value={row.count} />}
                          title={row.label}
                        />
                      ))}
                    </DataList>
                  )}
                </Card>

                <Card>
                  <CardHeader title="Where they went" />

                  {trips.tripsByDestination.length === 0 ? (
                    <EmptyState title="No destinations recorded." />
                  ) : (
                    <DataList>
                      {trips.tripsByDestination.map((row) => (
                        <DataRow
                          key={row.label}
                          meta={<MetaItem label="Trips" numeric value={row.count} />}
                          title={row.label}
                        />
                      ))}
                    </DataList>
                  )}
                </Card>
              </div>
            ) : null}
          </TabPanel>
        </>
      )}
    </div>
  );
}

/** RFC 4180: wrap in quotes and double any quote inside. */
function quote(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
