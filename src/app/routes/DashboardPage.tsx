import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useFormat } from "../providers/formatContext";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card, CardHeader, Stat, StatRow } from "../../components/ui/Card";
import { DataList, DataRow, MetaItem } from "../../components/ui/DataRow";
import { SkeletonRows } from "../../components/ui/Spinner";
import { EmptyState, ErrorBlock } from "../../components/ui/States";
import { toneForDueStatus, toneForPriority } from "../../components/ui/tones";
import { messageFromError } from "../../lib/errors";
import { routeForTargetPage, routes } from "../../lib/routes";
import { labelFromKey } from "../../lib/text";
import {
  getDashboardOverview,
  getOpenTrips,
  type DashboardOverview,
  type OpenTripRecord,
} from "../../services/api/dashboard";

/**
 * What the fleet needs today.
 *
 * The old dashboard stacked four bento layers: a hero with a decorative photo
 * of the most recently added vehicle, a row of five stat tiles, a two-panel
 * split, and a cost breakdown — several of which reported that nothing was
 * wrong at some length. Two of the tiles said nothing at all ("Efficiency
 * alert: No drop"), and the recent-activity list was a copy of screens you
 * could already open.
 *
 * A dashboard's job is to answer "is anything wrong, and what do I do?". This
 * leads with that and stops.
 */
export default function DashboardPage() {
  const navigate = useNavigate();
  const fmt = useFormat();

  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [outNow, setOutNow] = useState<OpenTripRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [summary, trips] = await Promise.all([getDashboardOverview(), getOpenTrips()]);

      setOverview(summary);
      setOutNow(trips);
    } catch (caught) {
      setError(messageFromError(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !overview) {
    return <SkeletonRows rows={4} />;
  }

  if (error && !overview) {
    return (
      <ErrorBlock action={<Button onClick={() => void load()}>Try again</Button>} message={error} />
    );
  }

  if (!overview) {
    return null;
  }

  const { maintenanceSummary, alertsSummary, costSummary, vehicleSummary, fuelSummary } = overview;
  const needsAttention = maintenanceSummary.overdueCount + maintenanceSummary.dueTodayCount;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-xl font-semibold text-heading @md:text-2xl">
          {greeting()}, {overview.ownerDisplayName}
        </h1>
        <Button loading={loading} onClick={() => void load()} variant="quiet">
          Refresh
        </Button>
      </div>

      {/* The single most useful sentence on the screen, and it is a sentence
          rather than a tile, because "nothing" deserves less room than
          "something". */}
      <Card>
        <p className="text-base text-ink">
          {needsAttention > 0 ? (
            <>
              <strong className="text-overdue">
                {needsAttention} {needsAttention === 1 ? "item needs" : "items need"} doing now
              </strong>
              {maintenanceSummary.dueSoonCount > 0
                ? `, and ${maintenanceSummary.dueSoonCount} more coming up soon.`
                : "."}
            </>
          ) : maintenanceSummary.dueSoonCount > 0 ? (
            <>
              Nothing is overdue. <strong>{maintenanceSummary.dueSoonCount}</strong>{" "}
              {maintenanceSummary.dueSoonCount === 1 ? "item is" : "items are"} coming up soon.
            </>
          ) : (
            "Nothing is due across the fleet."
          )}
        </p>

        <StatRow className="mt-5 border-t border-border pt-4">
          <Stat label="Vehicles" value={vehicleSummary.activeCount} />
          <Stat label="Overdue" value={maintenanceSummary.overdueCount} />
          <Stat label="Due soon" value={maintenanceSummary.dueSoonCount} />
          <Stat label="Open alerts" value={alertsSummary.activeCount} />
          <Stat
            label={`Spent in ${monthName(costSummary.currentMonth)}`}
            value={fmt.money(costSummary.totalTrackedCost)}
          />
        </StatRow>
      </Card>

      {/* Trips live inside a vehicle, which made "who is out right now" a
          question you answered by opening every vehicle in turn. It belongs
          here, where somebody is already looking. */}
      {outNow.length > 0 ? (
        <Card>
          <CardHeader title={outNow.length === 1 ? "One vehicle is out" : "Out on the road"} />
          <DataList>
            {outNow.map((trip) => (
              <DataRow
                key={trip.id}
                meta={
                  <>
                    <MetaItem label="Driver" value={trip.drivers.join(", ") || "—"} />
                    <MetaItem label="Going to" value={trip.destinations.join(", ") || "—"} />
                    <MetaItem label="Left" numeric value={fmt.dateTime(trip.departureTime)} />
                    <MetaItem
                      label="Spent so far"
                      numeric
                      value={trip.spentSoFar > 0 ? fmt.money(trip.spentSoFar) : "—"}
                    />
                  </>
                }
                onClick={() => void navigate(routes.vehicle(trip.vehicleId, "trips"))}
                openLabel={`Open the trip for ${trip.vehicleName}`}
                subtitle={trip.reason}
                title={
                  <span className="flex flex-wrap items-center gap-2">
                    {trip.vehicleName}
                    <Badge tone="info">{outFor(trip.departureTime)}</Badge>
                  </span>
                }
              />
            ))}
          </DataList>
        </Card>
      ) : null}

      {overview.setupHints.length > 0 ? (
        <Card>
          <CardHeader title="Worth setting up" />
          <DataList>
            {overview.setupHints.map((hint) => {
              const route = routeForTargetPage(hint.targetPage);

              return (
                <DataRow
                  key={hint.code}
                  onClick={route ? () => void navigate(route) : undefined}
                  openLabel={hint.actionLabel ?? undefined}
                  subtitle={hint.message}
                  title={hint.title}
                />
              );
            })}
          </DataList>
        </Card>
      ) : null}

      <Card>
        <CardHeader
          actions={
            <Link
              className="text-sm font-semibold text-info underline underline-offset-4"
              to={routes.alerts}
            >
              All alerts
            </Link>
          }
          title="Needs attention"
        />

        {maintenanceSummary.upcoming.length === 0 ? (
          <EmptyState title="Nothing is due." />
        ) : (
          <DataList>
            {maintenanceSummary.upcoming.map((item) => (
              <DataRow
                key={item.id}
                meta={
                  <>
                    <MetaItem label="Vehicle" value={item.vehicleName} />
                    <MetaItem label="Due date" numeric value={fmt.date(item.nextDueDate)} />
                    <MetaItem
                      label="Due odometer"
                      numeric
                      value={fmt.distance(item.nextDueOdometer)}
                    />
                  </>
                }
                onClick={() => void navigate(routes.vehicle(item.vehicleId, "maintenance"))}
                openLabel={`Open ${item.vehicleName}`}
                subtitle={item.dueReason}
                title={
                  <span className="flex flex-wrap items-center gap-2">
                    {item.templateName}
                    <Badge tone={toneForDueStatus(item.dueStatus)}>
                      {labelFromKey(item.dueStatus)}
                    </Badge>
                  </span>
                }
              />
            ))}
          </DataList>
        )}
      </Card>

      {alertsSummary.topAlerts.length > 0 ? (
        <Card>
          <CardHeader title="Recent alerts" />
          <DataList>
            {alertsSummary.topAlerts.map((alert) => (
              <DataRow
                key={alert.id}
                meta={<MetaItem label="Vehicle" value={alert.vehicleName ?? "—"} />}
                subtitle={alert.message}
                title={
                  <span className="flex flex-wrap items-center gap-2">
                    {alert.title}
                    <Badge tone={toneForPriority(alert.priority)}>
                      {labelFromKey(alert.priority)}
                    </Badge>
                  </span>
                }
              />
            ))}
          </DataList>
        </Card>
      ) : null}

      <Card>
        <CardHeader title={`Costs in ${monthName(costSummary.currentMonth)}`} />
        <StatRow>
          <Stat label="Fuel" value={fmt.money(costSummary.fuelTotal)} />
          <Stat label="Maintenance" value={fmt.money(costSummary.maintenanceTotal)} />
          <Stat label="Repairs" value={fmt.money(costSummary.repairTotal)} />
          <Stat label="Other" value={fmt.money(costSummary.manualExpenseTotal)} />
        </StatRow>

        {/* Only shown when there is something to say. The old screen kept a
            permanent tile reading "No drop", which is a box that reports the
            absence of news. */}
        {fuelSummary.efficiencyDropActive ? (
          <p className="mt-4 rounded-md border border-due-line bg-due-surface p-3 text-sm text-due">
            {fuelSummary.message}
          </p>
        ) : null}
      </Card>
    </div>
  );
}

/**
 * How long a vehicle has been out, in the terms somebody would say it. "Out for
 * 3 days" is the sentence that makes a dispatcher pick up the phone; a
 * departure timestamp needs arithmetic first.
 */
function outFor(departureTime: string): string {
  const minutes = Math.floor((Date.now() - new Date(departureTime).getTime()) / 60000);

  if (minutes < 0) {
    return "Leaving later";
  }

  if (minutes < 60) {
    return "Out just now";
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `Out ${hours}h`;
  }

  const days = Math.floor(hours / 24);

  return days === 1 ? "Out since yesterday" : `Out ${days} days`;
}

function greeting(): string {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Good morning";
  }

  return hour < 18 ? "Good afternoon" : "Good evening";
}

/** `2026-08` reads as August without making anyone parse it. */
function monthName(month: string): string {
  const [year, monthPart] = month.split("-");
  const index = Number(monthPart) - 1;

  const names = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  return names[index] ? `${names[index]} ${year}` : month;
}
