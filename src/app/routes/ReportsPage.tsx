import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useFormat } from "../providers/formatContext";
import { useToast } from "../providers/toastContext";
import { messageFromError } from "../../lib/errors";
import { routes } from "../../lib/routes";
import { canPrint, saveMessage } from "../../lib/saveFile";
import { labelFromKey } from "../../lib/text";
import {
  getReportsOverview,
  listCostEvents,
  type CostEventRecord,
  type ReportsOverview,
} from "../../services/api/expenses";
import { exportReportCsv } from "../../services/api/reports";
import {
  getTripReportsOverview,
  listTrips,
  type TripRecord,
  type TripReportsOverview,
} from "../../services/api/trips";
import { ReportDocument } from "../../components/reports/ReportDocument";
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
  const [costEvents, setCostEvents] = useState<CostEventRecord[]>([]);
  const [trips, setTrips] = useState<TripReportsOverview | null>(null);
  const [tripRecords, setTripRecords] = useState<TripRecord[]>([]);
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
      // Four at once, not four spinners. The two summaries plus every
      // underlying record: the old screen showed a sample of costs and called
      // it a report, and a sample is not what somebody looks a figure up in.
      const [costReport, tripReport, events, tripDetail] = await Promise.all([
        getReportsOverview(filter),
        getTripReportsOverview(filter),
        listCostEvents(filter),
        listTrips(filter),
      ]);

      setCosts(costReport);
      setTrips(tripReport);
      setCostEvents(events);
      setTripRecords(tripDetail);
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

  const vehicleName = vehicles.find((vehicle) => vehicle.id === vehicleId)?.vehicleName;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <h1 className="text-xl font-semibold text-heading @md:text-2xl">Reports</h1>

        <ButtonRow>
          {/* Printing is the browser's job; ours is to give it a page worth
              printing. It is absent in the Android build, where window.print()
              silently does nothing. */}
          {canPrint() ? (
            <Button onClick={() => window.print()} variant="secondary">
              Print
            </Button>
          ) : null}
          <Button loading={exporting} onClick={() => void handleExport()}>
            {canPrint() ? "Download CSV" : "Share CSV"}
          </Button>
        </ButtonRow>
      </div>

      <ReportDocument
        costEvents={costEvents}
        costs={costs}
        kind={tab}
        period={describePeriod(startDate, endDate, fmt.date)}
        tripRecords={tripRecords}
        trips={trips}
        vehicleName={vehicleName ?? "Every vehicle"}
      />

      <Card className="print:hidden">
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
          {/* Hand-written rather than a nested `FieldGrid` on purpose. This sits
              inside one cell of the grid above, and `FieldGrid` is container-
              driven — measuring a half-width cell, it would drop to one column
              and stack From above To even on a wide screen. A date pair that
              short should always stay side by side. */}
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

      <Tabs
        active={tab}
        className="print:hidden"
        items={TABS}
        label="Report type"
        onChange={setTab}
      />

      {loading ? (
        <SkeletonRows rows={3} />
      ) : (
        // The document above replaces all of this on paper, rather than the
        // screen being printed with its furniture removed.
        <div className="flex flex-col gap-5 print:hidden">
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
                              {/* Both of these were already in the printed
                                  report and missing from the screen, so the
                                  paper and the app disagreed about what a
                                  vehicle summary contains. */}
                              <MetaItem
                                label="Distance"
                                numeric
                                value={fmt.distance(summary.distanceKm)}
                              />
                              <MetaItem
                                label="Efficiency"
                                numeric
                                value={fmt.efficiency(summary.latestOfficialKmPerLiter)}
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

                <Card>
                  <CardHeader title={`Every cost (${costEvents.length})`} />

                  {costEvents.length === 0 ? (
                    <EmptyState title="No costs recorded for this period." />
                  ) : (
                    <DataList>
                      {costEvents.map((event) => (
                        <DataRow
                          key={`${event.sourceType}-${event.sourceId}`}
                          meta={
                            <>
                              <MetaItem label="Vehicle" value={event.vehicleName ?? "—"} />
                              <MetaItem label="Date" numeric value={fmt.date(event.eventDate)} />
                              <MetaItem label="Type" value={labelFromKey(event.sourceType)} />
                              <MetaItem label="Amount" numeric value={fmt.money(event.amount)} />
                            </>
                          }
                          title={event.description}
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

                <Card>
                  <CardHeader title={`Every trip (${tripRecords.length})`} />

                  {tripRecords.length === 0 ? (
                    <EmptyState title="No trips in this period." />
                  ) : (
                    <DataList>
                      {tripRecords.map((trip) => (
                        <DataRow
                          key={trip.id}
                          meta={
                            <>
                              <MetaItem label="Vehicle" value={trip.vehicleName} />
                              <MetaItem
                                label="Left"
                                numeric
                                value={fmt.dateTime(trip.departureTime)}
                              />
                              <MetaItem
                                label="Back"
                                numeric
                                value={
                                  trip.returnTime ? fmt.dateTime(trip.returnTime) : "Still out"
                                }
                              />
                              <MetaItem label="Driver" value={trip.drivers.join(", ") || "—"} />
                              <MetaItem
                                label="Passengers"
                                value={trip.passengers.join(", ") || "—"}
                              />
                              <MetaItem
                                label="Went to"
                                value={trip.destinations.join(", ") || "—"}
                              />
                              <MetaItem
                                label="Odometer"
                                numeric
                                value={fmt.odometerRange(
                                  trip.departureOdometer,
                                  trip.returnOdometer,
                                )}
                              />
                              <MetaItem
                                label="Distance"
                                numeric
                                value={fmt.distance(trip.distanceKm)}
                              />
                            </>
                          }
                          title={trip.reason}
                        />
                      ))}
                    </DataList>
                  )}
                </Card>
              </div>
            ) : null}
          </TabPanel>
        </div>
      )}
    </div>
  );
}

/**
 * What period the figures cover, in words. "Everything recorded" is the honest
 * reading of two empty date boxes, and it matters on paper: a total with no
 * period against it invites somebody to assume it means this year.
 */
function describePeriod(
  startDate: string,
  endDate: string,
  formatDate: (value?: string | null) => string,
): string {
  if (startDate && endDate) {
    return `${formatDate(startDate)} to ${formatDate(endDate)}`;
  }

  if (startDate) {
    return `From ${formatDate(startDate)}`;
  }

  if (endDate) {
    return `Up to ${formatDate(endDate)}`;
  }

  return "Everything recorded";
}

/** RFC 4180: wrap in quotes and double any quote inside. */
function quote(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
