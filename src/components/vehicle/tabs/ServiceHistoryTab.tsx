import { useEffect, useState } from "react";
import { useFormat } from "../../../app/providers/formatContext";
import { usePeople } from "../../../app/providers/peopleContext";
import { messageFromError } from "../../../lib/errors";
import {
  listServiceHistoryForVehicle,
  type MaintenanceLogRecord,
} from "../../../services/api/maintenance";
import { DataList, DataRow, MetaItem } from "../../ui/DataRow";
import { SkeletonRows } from "../../ui/Spinner";
import { EmptyState, ErrorBlock } from "../../ui/States";
import { Attachment } from "./Attachment";

/**
 * Work that has been done on this vehicle.
 *
 * The old card packed seven labelled values into a fixed sidebar column and
 * then listed three attachments whether or not any existed — "No receipt", "No
 * before photo", "No after photo" on every row, on every record, forever.
 * Attachments appear here only when there is one to open.
 */
export function ServiceHistoryTab({ vehicleId }: { vehicleId: string }) {
  const fmt = useFormat();
  const { nameFor } = usePeople();
  const [logs, setLogs] = useState<MaintenanceLogRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let stillWanted = true;
    setLoading(true);

    void (async () => {
      try {
        const records = await listServiceHistoryForVehicle(vehicleId);

        if (stillWanted) {
          setLogs(records);
          setError(null);
        }
      } catch (caught) {
        if (stillWanted) {
          setError(messageFromError(caught));
        }
      } finally {
        if (stillWanted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      stillWanted = false;
    };
  }, [vehicleId]);

  if (loading) {
    return <SkeletonRows rows={3} />;
  }

  if (error) {
    return <ErrorBlock message={error} />;
  }

  if (logs.length === 0) {
    return <EmptyState title="No work has been logged for this vehicle yet." />;
  }

  return (
    <DataList>
      {logs.map((log) => (
        <DataRow
          key={log.id}
          actions={
            <div className="flex flex-wrap gap-2">
              <Attachment label="Receipt" path={log.receiptFilePath} />
              <Attachment label="Before" path={log.beforePhotoPath} />
              <Attachment label="After" path={log.afterPhotoPath} />
            </div>
          }
          meta={
            <>
              <MetaItem label="Done" numeric value={fmt.date(log.completedDate)} />
              <MetaItem label="Odometer" numeric value={fmt.distance(log.odometer)} />
              {/* What the total was made of. A bill that is nearly all labour
                  and one that is nearly all parts say very different things
                  about a vehicle, and both were being shown as one number. */}
              {log.laborCost > 0 ? (
                <MetaItem label="Labour" numeric value={fmt.money(log.laborCost)} />
              ) : null}
              {log.partsCost > 0 ? (
                <MetaItem label="Parts" numeric value={fmt.money(log.partsCost)} />
              ) : null}
              <MetaItem label="Total" numeric value={fmt.money(log.totalCost)} />
              {log.mechanicShop ? <MetaItem label="Shop" value={log.mechanicShop} /> : null}
              {log.warrantyExpiration ? (
                <MetaItem label="Warranty until" numeric value={fmt.date(log.warrantyExpiration)} />
              ) : null}
            </>
          }
          footnote={`Added by ${nameFor(log.createdBy)}`}
          subtitle={
            log.partsReplaced
              ? `${log.workPerformed} · Parts: ${log.partsReplaced}`
              : log.workPerformed
          }
          title={log.templateName ?? "Maintenance"}
        />
      ))}
    </DataList>
  );
}
