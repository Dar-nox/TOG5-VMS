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
import { getAppSettings } from "../../services/api/settings";
import { listVehicles, type VehicleRecord } from "../../services/api/vehicles";

export function ReportsModule() {
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [vehicleFilter, setVehicleFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [overview, setOverview] = useState<ReportsOverview | null>(null);
  const [vehicleReport, setVehicleReport] = useState<VehicleCostReport | null>(null);
  const [currency, setCurrency] = useState("PHP");
  const [loading, setLoading] = useState(true);
  const [reportsLoading, setReportsLoading] = useState(false);
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

  return (
    <div className="reports-module">
      <section className="reports-workspace">
        <div className="reports-header">
          <div>
            <h2>Reports</h2>
            <p>
              Local cost summaries built from fuel logs, service history, repair records, and manual
              expenses without duplicating linked source costs.
            </p>
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
        {errorMessage ? <div className="inline-error">{errorMessage}</div> : null}

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
            <VehicleSummaryList currency={currency} summaries={overview?.vehicleSummaries ?? []} />
          </ReportPanel>
        )}

        <ReportPanel title="Recent cost events">
          <CostEventList currency={currency} events={overview?.recentCostEvents ?? []} />
        </ReportPanel>
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
        label="Service"
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
        No vehicle costs match this filter yet. Fuel, service, repairs, and manual expenses will
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
        <span>Service: {formatMoney(summary.maintenanceTotal, currency)}</span>
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
      return "Service";
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
