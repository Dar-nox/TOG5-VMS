import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  getReportsOverview,
  getVehicleCostReport,
  type CategoryTotalRecord,
  type CostEventRecord,
  type ReportsOverview,
  type VehicleCostReport,
  type VehicleCostSummaryRecord,
} from "../../services/api/expenses";
import { exportReportCsv, type ExportReportCsvResponse } from "../../services/api/reports";
import { getAppSettings } from "../../services/api/settings";
import {
  getTripReportsOverview,
  type TripCountRecord,
  type TripRecord,
  type TripReportsOverview,
} from "../../services/api/trips";
import { listVehicles, type VehicleRecord } from "../../services/api/vehicles";

export function ReportsModule() {
  const [activeTab, setActiveTab] = useState<"costs" | "trips">("costs");
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [vehicleFilter, setVehicleFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [overview, setOverview] = useState<ReportsOverview | null>(null);
  const [vehicleReport, setVehicleReport] = useState<VehicleCostReport | null>(null);
  const [tripOverview, setTripOverview] = useState<TripReportsOverview | null>(null);
  const [currency, setCurrency] = useState("PHP");
  const [loading, setLoading] = useState(true);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [tripReportsLoading, setTripReportsLoading] = useState(false);
  const [exportingReport, setExportingReport] = useState<"maintenance" | "trips" | null>(null);
  const [exportResult, setExportResult] = useState<ExportReportCsvResponse | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const filter = useMemo(
    () => ({
      vehicleId: vehicleFilter === "all" ? undefined : vehicleFilter,
      startDate: trimToUndefined(startDate),
      endDate: trimToUndefined(endDate),
    }),
    [endDate, startDate, vehicleFilter],
  );

  const loadReports = useCallback(async () => {
    setReportsLoading(true);
    setErrorMessage(null);

    try {
      const [overviewReport, selectedVehicleReport] = await Promise.all([
        getReportsOverview(filter),
        filter.vehicleId ? getVehicleCostReport(filter.vehicleId, filter) : Promise.resolve(null),
      ]);
      setOverview(overviewReport);
      setVehicleReport(selectedVehicleReport);
    } catch (error) {
      setErrorMessage(messageFromError(error));
      setOverview(null);
      setVehicleReport(null);
    } finally {
      setReportsLoading(false);
    }
  }, [filter]);

  const loadTripReports = useCallback(async () => {
    setTripReportsLoading(true);
    setErrorMessage(null);

    try {
      const tripReport = await getTripReportsOverview(filter);
      setTripOverview(tripReport);
    } catch (error) {
      setErrorMessage(messageFromError(error));
      setTripOverview(null);
    } finally {
      setTripReportsLoading(false);
    }
  }, [filter]);

  const loadPageData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const [vehicleRecords, settings] = await Promise.all([listVehicles(), getAppSettings()]);
      setVehicles(vehicleRecords);
      setCurrency(settings.settings.preferredCurrency);
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
    void loadReports();
  }, [loadReports]);

  useEffect(() => {
    void loadTripReports();
  }, [loadTripReports]);

  const filterLabel = useMemo(
    () =>
      [
        vehicleFilter === "all"
          ? "All vehicles"
          : vehicles.find((vehicle) => vehicle.id === vehicleFilter)?.vehicleName,
        startDate ? `From ${startDate}` : null,
        endDate ? `To ${endDate}` : null,
      ]
        .filter(Boolean)
        .join(" / "),
    [endDate, startDate, vehicleFilter, vehicles],
  );

  async function handleExportMaintenanceReport() {
    await exportCsvFile(
      "maintenance",
      `tog5-maintenance-report-${dateStamp()}.csv`,
      maintenanceCsvRows({
        currency,
        filterLabel,
        overview,
        vehicleReport,
      }),
    );
  }

  function handlePrintMaintenanceReport() {
    printReportHtml(
      "TOG 5 VMS - Maintenance Report",
      maintenancePrintHtml({
        currency,
        filterLabel,
        overview,
        vehicleReport,
      }),
    );
  }

  async function handleExportTripsReport() {
    await exportCsvFile(
      "trips",
      `tog5-trips-report-${dateStamp()}.csv`,
      tripsCsvRows({
        filterLabel,
        overview: tripOverview,
      }),
    );
  }

  function handlePrintTripsReport() {
    printReportHtml(
      "TOG 5 VMS - Trips Report",
      tripsPrintHtml({
        filterLabel,
        overview: tripOverview,
      }),
    );
  }

  async function exportCsvFile(
    reportType: "maintenance" | "trips",
    filename: string,
    rows: CsvRow[],
  ) {
    setExportingReport(reportType);
    setExportResult(null);
    setExportError(null);

    try {
      const result = await exportReportCsv({
        filename,
        csvContents: csvContent(rows),
      });
      setExportResult(result);
    } catch (error) {
      setExportError(messageFromError(error));
    } finally {
      setExportingReport(null);
    }
  }

  return (
    <div className="reports-module">
      <section className="reports-workspace">
        <div className="reports-header">
          <div>
            <h2>Reports</h2>
            <p>Reports for vehicle costs, maintenance records, and operational trip logs.</p>
          </div>

          <div className="report-filter-grid" aria-label="Report filters">
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
        {reportsLoading ? <div className="maintenance-empty-note">Loading reports...</div> : null}
        {tripReportsLoading ? (
          <div className="maintenance-empty-note">Loading trip reports...</div>
        ) : null}
        {errorMessage ? <div className="inline-error">{errorMessage}</div> : null}

        <div className="report-tab-list" role="tablist" aria-label="Report type">
          <button
            className={activeTab === "costs" ? "report-tab active" : "report-tab"}
            onClick={() => setActiveTab("costs")}
            type="button"
          >
            Maintenance
          </button>
          <button
            className={activeTab === "trips" ? "report-tab active" : "report-tab"}
            onClick={() => setActiveTab("trips")}
            type="button"
          >
            Trips
          </button>
        </div>

        <div className="report-action-bar">
          <div>
            <strong>{activeTab === "costs" ? "Maintenance report" : "Trips report"}</strong>
            <span>{filterLabel || "All records"}</span>
          </div>
          <div>
            {activeTab === "costs" ? (
              <>
                <button
                  className="secondary-button"
                  disabled={reportsLoading || exportingReport !== null}
                  onClick={() => void handleExportMaintenanceReport()}
                  type="button"
                >
                  {exportingReport === "maintenance" ? "Exporting..." : "Export maintenance CSV"}
                </button>
                <button
                  className="secondary-button"
                  disabled={reportsLoading}
                  onClick={handlePrintMaintenanceReport}
                  type="button"
                >
                  Print maintenance
                </button>
              </>
            ) : (
              <>
                <button
                  className="secondary-button"
                  disabled={tripReportsLoading || exportingReport !== null}
                  onClick={() => void handleExportTripsReport()}
                  type="button"
                >
                  {exportingReport === "trips" ? "Exporting..." : "Export trips CSV"}
                </button>
                <button
                  className="secondary-button"
                  disabled={tripReportsLoading}
                  onClick={handlePrintTripsReport}
                  type="button"
                >
                  Print trips
                </button>
              </>
            )}
          </div>
        </div>

        {exportResult ? (
          <div className="report-export-status">
            <div>
              <strong>CSV downloaded.</strong>
              <span>{exportResult.filename} is wherever this device saves downloads.</span>
            </div>
          </div>
        ) : null}
        {exportError ? <div className="inline-error compact">{exportError}</div> : null}

        {activeTab === "costs" ? (
          <>
            <ReportSummary currency={currency} overview={overview} />

            <div className="report-grid">
              <ReportPanel title="Cost by category">
                <CategoryTotals currency={currency} totals={overview?.categoryTotals ?? []} />
              </ReportPanel>

              <ReportPanel title="Monthly totals">
                <MonthlyTotals currency={currency} totals={overview?.monthlyTotals ?? []} />
              </ReportPanel>
            </div>

            {vehicleReport ? (
              <SelectedVehicleReport currency={currency} report={vehicleReport} />
            ) : (
              <ReportPanel title="Vehicle cost summary">
                <VehicleSummaryList
                  currency={currency}
                  summaries={overview?.vehicleSummaries ?? []}
                />
              </ReportPanel>
            )}

            <ReportPanel title="Recent cost events">
              <CostEventList currency={currency} events={overview?.recentCostEvents ?? []} />
            </ReportPanel>
          </>
        ) : (
          <TripReportsPanel overview={tripOverview} />
        )}
      </section>
    </div>
  );
}

function ReportSummary({
  currency,
  overview,
}: {
  currency: string;
  overview: ReportsOverview | null;
}) {
  return (
    <div className="report-summary-grid" aria-label="Reports overview">
      <ReportMetric
        label="Total tracked cost"
        value={formatMoney(overview?.totalTrackedCost ?? 0, currency)}
      />
      <ReportMetric label="Fuel" value={formatMoney(overview?.fuelTotal ?? 0, currency)} />
      <ReportMetric
        label="Maintenance"
        value={formatMoney(overview?.maintenanceTotal ?? 0, currency)}
      />
      <ReportMetric label="Repairs" value={formatMoney(overview?.repairTotal ?? 0, currency)} />
      <ReportMetric
        label="Manual expenses"
        value={formatMoney(overview?.manualExpenseTotal ?? 0, currency)}
      />
      <ReportMetric
        label="Linked copies excluded"
        value={formatMoney(overview?.linkedExpenseTotal ?? 0, currency)}
      />
    </div>
  );
}

function ReportMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="report-summary-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function TripReportsPanel({ overview }: { overview: TripReportsOverview | null }) {
  return (
    <>
      <div className="report-summary-grid trip-report-summary" aria-label="Trip report overview">
        <ReportMetric label="Total trips" value={(overview?.totalTrips ?? 0).toLocaleString()} />
        <ReportMetric label="Currently out" value={(overview?.openTrips ?? 0).toLocaleString()} />
        <ReportMetric label="Completed" value={(overview?.completedTrips ?? 0).toLocaleString()} />
      </div>

      <div className="report-grid">
        <ReportPanel title="Trips by vehicle">
          <TripCountList
            emptyText="No vehicle trip totals for this filter yet."
            rows={overview?.tripsByVehicle ?? []}
          />
        </ReportPanel>
        <ReportPanel title="Trips by driver">
          <TripCountList
            emptyText="No driver trip totals for this filter yet."
            rows={overview?.tripsByDriver ?? []}
          />
        </ReportPanel>
      </div>

      <ReportPanel title="Common destinations">
        <TripCountList
          emptyText="No destination totals for this filter yet."
          rows={overview?.tripsByDestination ?? []}
        />
      </ReportPanel>

      <ReportPanel title="Recent trips">
        <TripRecentList trips={overview?.recentTrips ?? []} />
      </ReportPanel>
    </>
  );
}

function TripCountList({ emptyText, rows }: { emptyText: string; rows: TripCountRecord[] }) {
  if (rows.length === 0) {
    return <div className="maintenance-empty-note">{emptyText}</div>;
  }

  return (
    <div className="report-row-list">
      {rows.map((row) => (
        <div className="report-row" key={row.label}>
          <span>{row.label}</span>
          <strong>{row.count.toLocaleString()}</strong>
          <em>{row.count === 1 ? "trip" : "trips"}</em>
        </div>
      ))}
    </div>
  );
}

function TripRecentList({ trips }: { trips: TripRecord[] }) {
  if (trips.length === 0) {
    return <div className="maintenance-empty-note">No trips match this filter yet.</div>;
  }

  return (
    <div className="cost-event-list">
      {trips.map((trip) => (
        <article className="cost-event-row" key={trip.id}>
          <div>
            <span className="maintenance-category">{labelFromKey(trip.status)}</span>
            <h3>{trip.vehicleName}</h3>
            <p>
              {formatDate(trip.departureTime)} / {trip.drivers.join(", ")} /{" "}
              {trip.destinations.join(", ")}
            </p>
          </div>
          <strong>{trip.returnTime ? formatDate(trip.returnTime) : "Still out"}</strong>
        </article>
      ))}
    </div>
  );
}

function ReportPanel(props: { title: string; children: ReactNode }) {
  return (
    <section className="report-panel">
      <h3>{props.title}</h3>
      {props.children}
    </section>
  );
}

function CategoryTotals({ currency, totals }: { currency: string; totals: CategoryTotalRecord[] }) {
  if (totals.length === 0) {
    return <div className="maintenance-empty-note">No category totals for this filter yet.</div>;
  }

  return (
    <div className="report-row-list">
      {totals.map((total) => (
        <div className="report-row" key={total.category}>
          <span>{labelFromKey(total.category)}</span>
          <strong>{formatMoney(total.total, currency)}</strong>
          <em>{total.count.toLocaleString()} records</em>
        </div>
      ))}
    </div>
  );
}

function MonthlyTotals({
  currency,
  totals,
}: {
  currency: string;
  totals: Array<{ month: string; total: number; count: number }>;
}) {
  if (totals.length === 0) {
    return <div className="maintenance-empty-note">No monthly totals for this filter yet.</div>;
  }

  return (
    <div className="report-row-list">
      {totals.map((total) => (
        <div className="report-row" key={total.month}>
          <span>{total.month}</span>
          <strong>{formatMoney(total.total, currency)}</strong>
          <em>{total.count.toLocaleString()} records</em>
        </div>
      ))}
    </div>
  );
}

function VehicleSummaryList({
  currency,
  summaries,
}: {
  currency: string;
  summaries: VehicleCostSummaryRecord[];
}) {
  if (summaries.length === 0) {
    return (
      <div className="maintenance-empty-note">
        No vehicle costs match this filter yet. Fuel, maintenance, repairs, and manual expenses will
        appear here as records are added.
      </div>
    );
  }

  return (
    <div className="vehicle-cost-list">
      {summaries.map((summary) => (
        <VehicleCostCard key={summary.vehicleId} currency={currency} summary={summary} />
      ))}
    </div>
  );
}

function SelectedVehicleReport({
  currency,
  report,
}: {
  currency: string;
  report: VehicleCostReport;
}) {
  return (
    <ReportPanel title={`${report.vehicle.vehicleName} cost report`}>
      <div className="vehicle-cost-list">
        <VehicleCostCard currency={currency} summary={report.vehicle} />
      </div>

      <div className="report-grid nested">
        <section>
          <h4>Vehicle categories</h4>
          <CategoryTotals currency={currency} totals={report.categoryTotals} />
        </section>
        <section>
          <h4>Vehicle monthly totals</h4>
          <MonthlyTotals currency={currency} totals={report.monthlyTotals} />
        </section>
      </div>
    </ReportPanel>
  );
}

function VehicleCostCard({
  currency,
  summary,
}: {
  currency: string;
  summary: VehicleCostSummaryRecord;
}) {
  return (
    <article className="vehicle-cost-card">
      <div className="expense-card-main">
        <div className="maintenance-card-heading">
          <span className="maintenance-category">{summary.vehicleName}</span>
          <span className="priority-pill">{formatMoney(summary.totalCost, currency)}</span>
        </div>
        <h3>{formatCostPerKm(summary, currency)}</h3>
        <p>{summary.costPerKmReason}</p>
      </div>

      <div className="expense-card-meta">
        <span>Fuel: {formatMoney(summary.fuelTotal, currency)}</span>
        <span>Maintenance: {formatMoney(summary.maintenanceTotal, currency)}</span>
        <span>Repairs: {formatMoney(summary.repairTotal, currency)}</span>
        <span>Manual: {formatMoney(summary.manualExpenseTotal, currency)}</span>
        <span>
          Distance:{" "}
          {summary.distanceKm
            ? `${Math.round(summary.distanceKm).toLocaleString()} km`
            : "Not enough data"}
        </span>
        <span>Latest efficiency: {formatEfficiency(summary.latestOfficialKmPerLiter)}</span>
      </div>
    </article>
  );
}

function CostEventList({ currency, events }: { currency: string; events: CostEventRecord[] }) {
  if (events.length === 0) {
    return <div className="maintenance-empty-note">No recent cost events for this filter yet.</div>;
  }

  return (
    <div className="cost-event-list">
      {events.map((event) => (
        <article className="cost-event-row" key={`${event.sourceType}-${event.sourceId}`}>
          <div>
            <span className="maintenance-category">{sourceLabel(event.sourceType)}</span>
            <h3>{event.description}</h3>
            <p>
              {event.vehicleName ?? "No vehicle"} / {formatDate(event.eventDate)} /{" "}
              {labelFromKey(event.category)}
            </p>
          </div>
          <strong>{formatMoney(event.amount, currency)}</strong>
        </article>
      ))}
    </div>
  );
}

type CsvRow = Array<string | number | null | undefined>;

function maintenanceCsvRows({
  currency,
  filterLabel,
  overview,
  vehicleReport,
}: {
  currency: string;
  filterLabel: string;
  overview: ReportsOverview | null;
  vehicleReport: VehicleCostReport | null;
}): CsvRow[] {
  const categoryTotals = vehicleReport?.categoryTotals ?? overview?.categoryTotals ?? [];
  const monthlyTotals = vehicleReport?.monthlyTotals ?? overview?.monthlyTotals ?? [];
  const vehicleSummaries = vehicleReport
    ? [vehicleReport.vehicle]
    : (overview?.vehicleSummaries ?? []);
  const recentEvents = vehicleReport?.recentCostEvents ?? overview?.recentCostEvents ?? [];

  return [
    ["Section", "Item", "Vehicle", "Date or month", "Category", "Count", "Amount", "Notes"],
    ["Report", "Maintenance", filterLabel || "All records", "", "", "", "", "TOG 5 VMS"],
    ["Summary", "Total tracked cost", "", "", "", "", overview?.totalTrackedCost ?? 0, currency],
    ["Summary", "Fuel", "", "", "", "", overview?.fuelTotal ?? 0, currency],
    ["Summary", "Maintenance", "", "", "", "", overview?.maintenanceTotal ?? 0, currency],
    ["Summary", "Repairs", "", "", "", "", overview?.repairTotal ?? 0, currency],
    ["Summary", "Manual expenses", "", "", "", "", overview?.manualExpenseTotal ?? 0, currency],
    [
      "Summary",
      "Linked copies excluded",
      "",
      "",
      "",
      "",
      overview?.linkedExpenseTotal ?? 0,
      currency,
    ],
    ...categoryTotals.map((total) => [
      "Category total",
      labelFromKey(total.category),
      "",
      "",
      total.category,
      total.count,
      total.total,
      currency,
    ]),
    ...monthlyTotals.map((total) => [
      "Monthly total",
      total.month,
      "",
      total.month,
      "",
      total.count,
      total.total,
      currency,
    ]),
    ...vehicleSummaries.map((summary) => [
      "Vehicle summary",
      "Total cost",
      summary.vehicleName,
      "",
      "",
      "",
      summary.totalCost,
      summary.costPerKmReason,
    ]),
    ...recentEvents.map((event) => [
      "Recent cost event",
      event.description,
      event.vehicleName ?? "No vehicle",
      event.eventDate,
      event.category,
      "",
      event.amount,
      sourceLabel(event.sourceType),
    ]),
  ];
}

function tripsCsvRows({
  filterLabel,
  overview,
}: {
  filterLabel: string;
  overview: TripReportsOverview | null;
}): CsvRow[] {
  return [
    ["Section", "Item", "Vehicle", "Date", "Status", "Count", "Drivers", "Destinations", "Notes"],
    ["Report", "Trips", filterLabel || "All records", "", "", "", "", "", "TOG 5 VMS"],
    ["Summary", "Total trips", "", "", "", overview?.totalTrips ?? 0, "", "", ""],
    ["Summary", "Currently out", "", "", "", overview?.openTrips ?? 0, "", "", ""],
    ["Summary", "Completed", "", "", "", overview?.completedTrips ?? 0, "", "", ""],
    ...(overview?.tripsByVehicle ?? []).map((row) => [
      "Trips by vehicle",
      row.label,
      row.label,
      "",
      "",
      row.count,
      "",
      "",
      "",
    ]),
    ...(overview?.tripsByDriver ?? []).map((row) => [
      "Trips by driver",
      row.label,
      "",
      "",
      "",
      row.count,
      row.label,
      "",
      "",
    ]),
    ...(overview?.tripsByDestination ?? []).map((row) => [
      "Trips by destination",
      row.label,
      "",
      "",
      "",
      row.count,
      "",
      row.label,
      "",
    ]),
    ...(overview?.recentTrips ?? []).map((trip) => [
      "Recent trip",
      trip.reason,
      trip.vehicleName,
      trip.departureTime,
      trip.status,
      "",
      trip.drivers.join("; "),
      trip.destinations.join("; "),
      [trip.departureNotes, trip.returnNotes].filter(Boolean).join(" / "),
    ]),
  ];
}

function maintenancePrintHtml({
  currency,
  filterLabel,
  overview,
  vehicleReport,
}: {
  currency: string;
  filterLabel: string;
  overview: ReportsOverview | null;
  vehicleReport: VehicleCostReport | null;
}) {
  const rows = maintenanceCsvRows({ currency, filterLabel, overview, vehicleReport });
  return reportHtml({
    subtitle: filterLabel || "All records",
    title: "Maintenance Report",
    rows,
  });
}

function tripsPrintHtml({
  filterLabel,
  overview,
}: {
  filterLabel: string;
  overview: TripReportsOverview | null;
}) {
  const rows = tripsCsvRows({ filterLabel, overview });
  return reportHtml({
    subtitle: filterLabel || "All records",
    title: "Trips Report",
    rows,
  });
}

function csvContent(rows: CsvRow[]) {
  return `\uFEFF${rows.map(csvLine).join("\r\n")}`;
}

function csvLine(row: CsvRow) {
  return row.map(csvCell).join(",");
}

function csvCell(value: string | number | null | undefined) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function printReportHtml(title: string, bodyHtml: string) {
  const frame = document.createElement("iframe");
  frame.title = title;
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);

  const frameDocument = frame.contentWindow?.document;
  if (!frameDocument) {
    frame.remove();
    window.print();
    return;
  }

  frameDocument.open();
  frameDocument.write(bodyHtml);
  frameDocument.close();

  setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 1000);
  }, 100);
}

function reportHtml({
  rows,
  subtitle,
  title,
}: {
  rows: CsvRow[];
  subtitle: string;
  title: string;
}) {
  const [header = [], ...bodyRows] = rows;
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      body {
        color: #172026;
        font-family: Arial, sans-serif;
        margin: 28px;
      }
      h1 {
        color: #173844;
        margin: 0 0 8px;
      }
      p {
        color: #52636a;
        margin: 0 0 20px;
      }
      table {
        border-collapse: collapse;
        width: 100%;
      }
      th,
      td {
        border: 1px solid #cfdad6;
        padding: 8px;
        text-align: left;
        vertical-align: top;
      }
      th {
        background: #eef3f1;
        color: #173844;
      }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(subtitle)} / Generated ${escapeHtml(new Date().toLocaleString())}</p>
    <table>
      <thead>
        <tr>${header.map((cell) => `<th>${escapeHtml(cell)}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${bodyRows
          .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
          .join("")}
      </tbody>
    </table>
  </body>
</html>`;
}

function escapeHtml(value: string | number | null | undefined) {
  return (value == null ? "" : String(value))
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}

function trimToUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function formatMoney(value: number, currency = "PHP") {
  return new Intl.NumberFormat(undefined, {
    currency,
    maximumFractionDigits: 2,
    style: "currency",
  }).format(value);
}

function formatDate(value: string) {
  return value.slice(0, 10);
}

function formatCostPerKm(summary: VehicleCostSummaryRecord, currency: string) {
  return summary.costPerKm == null ? "-- / km" : `${formatMoney(summary.costPerKm, currency)} / km`;
}

function formatEfficiency(value?: number | null) {
  return value == null ? "-- km/L" : `${value.toFixed(2)} km/L`;
}

function sourceLabel(value: string) {
  switch (value) {
    case "fuel_log":
      return "Fuel";
    case "maintenance_log":
      return "Maintenance";
    case "repair_record":
      return "Repair";
    case "expense":
      return "Manual";
    default:
      return labelFromKey(value);
  }
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
