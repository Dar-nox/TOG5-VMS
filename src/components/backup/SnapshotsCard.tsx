import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../app/providers/authContext";
import { useFormat } from "../../app/providers/formatContext";
import { usePeople } from "../../app/providers/peopleContext";
import { useToast } from "../../app/providers/toastContext";
import { messageFromError } from "../../lib/errors";
import {
  listSnapshots,
  snapshotUrl,
  takeSnapshot,
  type SnapshotRecord,
} from "../../services/api/backup";
import { Button } from "../ui/Button";
import { Card, CardHeader } from "../ui/Card";
import { DataList, DataRow, MetaItem } from "../ui/DataRow";
import { SkeletonRows } from "../ui/Spinner";
import { EmptyState } from "../ui/States";

/**
 * The copies taken without anybody having to remember.
 *
 * Owner-only, and gated here as well as in the database. The policy is what
 * actually enforces it — this only stops the card appearing at all, so a
 * manager does not see a panel that would be empty and unexplained.
 *
 * Deliberately no restore button. Putting a fleet back from one of these is a
 * supervised job done with the file, not something to offer as a tap next to a
 * date. Saying so on screen is better than leaving people to assume either way.
 */
export function SnapshotsCard() {
  const { isOwner } = useAuth();
  const fmt = useFormat();
  const toast = useToast();
  const { nameFor } = usePeople();

  const [snapshots, setSnapshots] = useState<SnapshotRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [taking, setTaking] = useState(false);

  const load = useCallback(async () => {
    try {
      setSnapshots(await listSnapshots());
    } catch (caught) {
      toast.error(messageFromError(caught));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isOwner) {
      void load();
    }
  }, [isOwner, load]);

  if (!isOwner) {
    return null;
  }

  async function handleTake() {
    setTaking(true);

    try {
      await takeSnapshot();
      // The work happens in an Edge Function that pg_net does not wait for, so
      // the row is not there yet. Saying "started" is honest; claiming it is
      // done and showing an unchanged list is not.
      toast.success("Backup started. It will appear here in a moment.");
    } catch (caught) {
      toast.error(messageFromError(caught));
    } finally {
      setTaking(false);
    }
  }

  async function handleDownload(record: SnapshotRecord) {
    try {
      const url = await snapshotUrl(record.storagePath);

      if (!url) {
        toast.error("That backup could not be opened. It may have been pruned.");
        return;
      }

      window.open(url, "_blank", "noopener");
    } catch (caught) {
      toast.error(messageFromError(caught));
    }
  }

  return (
    <Card>
      <CardHeader
        actions={
          <>
            <Button loading={taking} onClick={() => void handleTake()}>
              Take one now
            </Button>
            <Button onClick={() => void load()} variant="quiet">
              Refresh
            </Button>
          </>
        }
        title="Restore points"
      >
        <p className="mt-1 text-sm text-muted">
          A copy of every record is taken each night and the last ten are kept here. Nobody has to
          remember to do it.
        </p>
      </CardHeader>

      {loading ? (
        <SkeletonRows rows={3} />
      ) : snapshots.length > 0 ? (
        <DataList>
          {snapshots.map((record) => (
            <DataRow
              actions={
                <Button onClick={() => void handleDownload(record)} variant="quiet">
                  Download
                </Button>
              }
              footnote={record.takenBy ? `Taken by ${nameFor(record.takenBy)}` : "Taken overnight"}
              key={record.id}
              meta={
                <>
                  <MetaItem
                    label="Records"
                    numeric
                    value={countRecords(record.recordCounts).toLocaleString()}
                  />
                  <MetaItem label="Size" numeric value={fileSize(record.sizeBytes)} />
                </>
              }
              title={<span className="tabular">{fmt.dateTime(record.createdAt)}</span>}
            />
          ))}
        </DataList>
      ) : (
        <EmptyState title="No backup has been taken yet. The first one runs tonight." />
      )}

      <p className="mt-4 text-xs text-muted">
        Each one holds every row, including anything archived. It does not hold the photos and
        receipts themselves — those stay in storage — or the accounts, which live outside this
        database. Putting a fleet back from one of these is not a button here; send the file to
        whoever looks after the system.
      </p>
    </Card>
  );
}

function countRecords(counts: Record<string, number>): number {
  return Object.values(counts).reduce((sum, count) => sum + count, 0);
}

/** Plain sizes. Nobody reading this needs to know what a mebibyte is. */
function fileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
