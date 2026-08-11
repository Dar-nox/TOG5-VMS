import type { ReactNode } from "react";
import { useFormat } from "../../app/providers/formatContext";
import { cn } from "../../lib/cn";
import { labelFromKey } from "../../lib/text";
import type {
  CostEventRecord,
  MonthlyTotalRecord,
  ReportsOverview,
} from "../../services/api/expenses";
import type { TripRecord, TripReportsOverview } from "../../services/api/trips";

/**
 * The printed report.
 *
 * Deliberately not the screen with its navigation hidden. A printout leaves the
 * app behind — it gets filed, posted, or handed to somebody who will never open
 * the app — so it has to carry its own identity, say what period it covers, and
 * lay figures out in ruled columns that can be read down. Cards cannot do that;
 * this is real table markup, and it exists only on paper.
 *
 * `thead` repeats across pages by default when a table breaks, which is why the
 * markup is ordinary rather than a grid of divs.
 *
 * One limitation worth knowing: browsers do not implement the CSS that numbers
 * pages (`@page` margin boxes), so there is no "page 1 of 3". Every page
 * carries the report's name and period instead, which is what stops loose
 * sheets becoming anonymous.
 */
export function ReportDocument({
  kind,
  vehicleName,
  period,
  costs,
  costEvents,
  trips,
  tripRecords,
}: {
  kind: "costs" | "trips";
  vehicleName: string;
  period: string;
  costs: ReportsOverview | null;
  costEvents: CostEventRecord[];
  trips: TripReportsOverview | null;
  tripRecords: TripRecord[];
}) {
  const fmt = useFormat();

  return (
    <article className="hidden print:block">
      <header className="border-b-2 border-ink-900 pb-3">
        <p className="text-xs font-semibold tracking-[0.2em] text-ink-900 uppercase">
          TOG 5 Vehicle Care
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-ink-900">
          {kind === "costs" ? "Cost report" : "Trip report"}
        </h1>
        <p className="mt-1 text-sm text-ink-700">
          {vehicleName} · {period}
        </p>
        <p className="text-sm text-ink-700">Generated {fmt.dateTime(new Date().toISOString())}</p>
      </header>

      {kind === "costs" && costs ? (
        <>
          <Section title="Summary">
            <Figures
              rows={[
                ["Fuel", fmt.money(costs.fuelTotal)],
                ["Maintenance", fmt.money(costs.maintenanceTotal)],
                ["Repairs", fmt.money(costs.repairTotal)],
                ["Other", fmt.money(costs.manualExpenseTotal)],
                ["Total", fmt.money(costs.totalTrackedCost)],
              ]}
            />
          </Section>

          <Section title="By vehicle">
            <Table
              head={[
                "Vehicle",
                "Fuel",
                "Maintenance",
                "Repairs",
                "Other",
                "Total",
                "Distance",
                "Cost / km",
                "km / L",
              ]}
              numericFrom={1}
              rows={costs.vehicleSummaries.map((summary) => [
                summary.vehicleName,
                fmt.money(summary.fuelTotal),
                fmt.money(summary.maintenanceTotal),
                fmt.money(summary.repairTotal),
                fmt.money(summary.manualExpenseTotal),
                fmt.money(summary.totalCost),
                fmt.distance(summary.distanceKm),
                summary.costPerKm == null ? "—" : fmt.money(summary.costPerKm),
                summary.latestOfficialKmPerLiter == null
                  ? "—"
                  : summary.latestOfficialKmPerLiter.toFixed(2),
              ])}
              total={["Total", fmt.money(costs.totalTrackedCost)]}
            />
          </Section>

          {costs.monthlyTotals.length > 0 ? (
            <Section title="Month by month">
              <Table
                head={["Month", "Records", "Total"]}
                numericFrom={1}
                rows={costs.monthlyTotals.map((month: MonthlyTotalRecord) => [
                  month.month,
                  String(month.count),
                  fmt.money(month.total),
                ])}
              />
            </Section>
          ) : null}

          <Section title={`Every cost (${costEvents.length})`}>
            <Table
              head={["Date", "Vehicle", "Type", "Description", "Amount"]}
              numericFrom={4}
              rows={costEvents.map((event) => [
                fmt.date(event.eventDate),
                event.vehicleName ?? "—",
                labelFromKey(event.sourceType),
                event.description,
                fmt.money(event.amount),
              ])}
              total={["Total", fmt.money(costEvents.reduce((sum, e) => sum + e.amount, 0))]}
            />
          </Section>
        </>
      ) : null}

      {kind === "trips" && trips ? (
        <>
          <Section title="Summary">
            <Figures
              rows={[
                ["Trips", String(trips.totalTrips)],
                ["Out now", String(trips.openTrips)],
                ["Completed", String(trips.completedTrips)],
                ["Cancelled", String(trips.cancelledTrips)],
              ]}
            />
          </Section>

          <Section title={`Every trip (${tripRecords.length})`}>
            <Table
              head={[
                "Left",
                "Back",
                "Vehicle",
                "Driver",
                "Passengers",
                "Destinations",
                "Purpose",
                "Odometer",
                "Distance",
                "Cost",
              ]}
              numericFrom={7}
              rows={tripRecords.map((trip) => [
                fmt.dateTime(trip.departureTime),
                trip.returnTime ? fmt.dateTime(trip.returnTime) : "Still out",
                trip.vehicleName,
                trip.drivers.join(", ") || "—",
                trip.passengers.join(", ") || "—",
                trip.destinations.join(", ") || "—",
                trip.reason,
                fmt.odometerRange(trip.departureOdometer, trip.returnOdometer),
                fmt.distance(trip.distanceKm),
                trip.fuelTotal + trip.expenseTotal > 0
                  ? fmt.money(trip.fuelTotal + trip.expenseTotal)
                  : "—",
              ])}
            />
          </Section>

          {trips.tripsByDriver.length > 0 ? (
            <Section title="By driver">
              <Table
                head={["Driver", "Trips"]}
                numericFrom={1}
                rows={trips.tripsByDriver.map((row) => [row.label, String(row.count)])}
              />
            </Section>
          ) : null}

          {trips.tripsByDestination.length > 0 ? (
            <Section title="Where they went">
              <Table
                head={["Destination", "Trips"]}
                numericFrom={1}
                rows={trips.tripsByDestination.map((row) => [row.label, String(row.count)])}
              />
            </Section>
          ) : null}
        </>
      ) : null}

      <footer className="mt-10 break-inside-avoid border-t border-ink-400 pt-6">
        <div className="flex gap-12">
          <SignatureLine label="Prepared by" />
          <SignatureLine label="Checked by" />
        </div>
        <p className="mt-6 text-xs text-ink-700">
          TOG 5 Vehicle Care · {kind === "costs" ? "Cost report" : "Trip report"} · {vehicleName} ·{" "}
          {period}
        </p>
      </footer>
    </article>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="mb-2 text-sm font-semibold tracking-wide text-ink-900 uppercase">{title}</h2>
      {children}
    </section>
  );
}

/** The summary block: a short list of labelled figures, not a table. */
function Figures({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-1 text-sm">
      {rows.map(([label, value]) => (
        <div className="contents" key={label}>
          <dt className="text-ink-700">{label}</dt>
          <dd className="tabular text-ink-900">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Table({
  head,
  rows,
  total,
  numericFrom,
}: {
  head: string[];
  rows: string[][];
  total?: [string, string];
  /** Column index from which figures are right-aligned and set in the mono face. */
  numericFrom: number;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-ink-700">Nothing recorded for this period.</p>;
  }

  return (
    <table className="w-full border-collapse text-xs">
      <thead>
        <tr>
          {head.map((cell, index) => (
            <th
              className={cn(
                "border border-ink-400 bg-ink-100 px-2 py-1.5 font-semibold text-ink-900",
                index >= numericFrom ? "text-right" : "text-left",
              )}
              key={cell}
            >
              {cell}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr className="break-inside-avoid" key={rowIndex}>
            {row.map((cell, index) => (
              <td
                className={cn(
                  "border border-ink-400 px-2 py-1 align-top text-ink-900",
                  index >= numericFrom ? "tabular text-right" : "text-left",
                )}
                key={index}
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
      {total ? (
        <tfoot>
          <tr>
            <td
              className="border border-ink-400 bg-ink-100 px-2 py-1.5 font-semibold text-ink-900"
              colSpan={head.length - 1}
            >
              {total[0]}
            </td>
            <td className="tabular border border-ink-400 bg-ink-100 px-2 py-1.5 text-right font-semibold text-ink-900">
              {total[1]}
            </td>
          </tr>
        </tfoot>
      ) : null}
    </table>
  );
}

function SignatureLine({ label }: { label: string }) {
  return (
    <div className="flex-1">
      <div className="h-8 border-b border-ink-900" />
      <p className="mt-1 text-xs text-ink-700">{label}</p>
    </div>
  );
}
