import { Link } from "react-router";
import { useFormat } from "../../app/providers/formatContext";
import { routes } from "../../lib/routes";
import { attentionRank, needsAttention } from "../../domain/maintenance";
import { labelFromKey } from "../../lib/text";
import type { MaintenanceScheduleRecord } from "../../services/api/maintenance";
import type { VehicleRecord } from "../../services/api/vehicles";
import { Badge } from "../ui/Badge";
import { Card, CardHeader, Stat, StatRow } from "../ui/Card";
import { DataList, DataRow, MetaItem } from "../ui/DataRow";
import { EmptyState } from "../ui/States";
import { HelpTerm } from "../ui/HelpTerm";
import { toneForDueStatus } from "../ui/tones";

/**
 * What a vehicle is, and what it needs.
 *
 * specs/05 asked for this: a large photo, the name, the status, the odometer,
 * the fuel type and what is due next. It was never built — vehicles had a
 * detail panel of six boxed values and no answer to "does this one need
 * anything?" without going to another screen and filtering.
 */
export function VehicleOverview({
  vehicle,
  schedules,
}: {
  vehicle: VehicleRecord;
  schedules: MaintenanceScheduleRecord[];
}) {
  const fmt = useFormat();

  // Anything actually asking for somebody, worst first. A vehicle with nothing
  // wrong should say so in one line rather than list twenty things that are
  // fine — and, having asked for attention, every row here has to be something
  // the reader can go and do.
  const attention = schedules
    .filter((schedule) => needsAttention(schedule.dueStatus))
    .sort((a, b) => attentionRank(a.dueStatus) - attentionRank(b.dueStatus));

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <StatRow>
          <Stat label="Odometer" value={fmt.distance(vehicle.currentOdometer)} />
          <Stat label="Fuel" value={labelFromKey(vehicle.fuelType)} />
          <Stat label="Type" value={labelFromKey(vehicle.vehicleType)} />
          <Stat label="Transmission" value={labelFromKey(vehicle.transmissionType)} />
          <Stat label="Drivetrain" value={labelFromKey(vehicle.drivetrain)} />
        </StatRow>

        {vehicle.notes ? (
          <p className="mt-5 border-t border-border pt-4 text-sm text-muted">{vehicle.notes}</p>
        ) : null}
      </Card>

      <Card>
        <CardHeader
          actions={
            <Link
              className="text-sm font-semibold text-info underline underline-offset-4"
              to={routes.vehicle(vehicle.id, "maintenance")}
            >
              All maintenance
            </Link>
          }
          title="Needs attention"
        />

        {attention.length === 0 ? (
          <EmptyState title="Nothing is due for this vehicle." />
        ) : (
          <DataList>
            {attention.map((schedule) => (
              <DataRow
                key={schedule.id}
                meta={
                  <>
                    <MetaItem label="Due date" numeric value={fmt.date(schedule.nextDueDate)} />
                    <MetaItem
                      label="Due odometer"
                      numeric
                      value={fmt.distance(schedule.nextDueOdometer)}
                    />
                    <MetaItem
                      label="Last done"
                      numeric
                      value={fmt.date(schedule.lastCompletedDate)}
                    />
                  </>
                }
                subtitle={schedule.dueReason}
                title={
                  <span className="flex flex-wrap items-center gap-2">
                    <HelpTerm term={schedule.templateName}>{schedule.templateName}</HelpTerm>
                    <Badge tone={toneForDueStatus(schedule.dueStatus)}>
                      {labelFromKey(schedule.dueStatus)}
                    </Badge>
                  </span>
                }
              />
            ))}
          </DataList>
        )}
      </Card>
    </div>
  );
}
