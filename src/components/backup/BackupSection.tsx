import { useCallback, useEffect, useState } from "react";
import { useFormat } from "../../app/providers/formatContext";
import { useToast } from "../../app/providers/toastContext";
import { messageFromError } from "../../lib/errors";
import { exportAllData, listExports, type ExportHistoryRecord } from "../../services/api/backup";
import { Button } from "../ui/Button";
import { Card, CardHeader } from "../ui/Card";
import { DataList, DataRow, MetaItem } from "../ui/DataRow";
import { EmptyState } from "../ui/States";

/**
 * Taking a copy of the records.
 *
 * This was a top-level section of the app holding one button and roughly seven
 * paragraphs — two full cards of prose explaining that the database is hosted
 * and encrypted, what an export contains, and that putting one back is not
 * something the app can do. One of those paragraphs also appeared, word for
 * word, in Settings.
 *
 * It is a thing you do twice a year. It is one card now, and it says the one
 * fact that changes what somebody should do: the plan takes no automatic
 * copies, so this file is the only copy they hold.
 */
export function BackupSection() {
  const fmt = useFormat();
  const toast = useToast();

  const [history, setHistory] = useState<ExportHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      setHistory(await listExports());
    } catch (caught) {
      toast.error(messageFromError(caught));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleExport() {
    setExporting(true);

    try {
      const summary = await exportAllData();
      await load();
      toast.success(`Exported ${summary.totalRecords.toLocaleString()} records.`);
    } catch (caught) {
      toast.error(messageFromError(caught));
    } finally {
      setExporting(false);
    }
  }

  const latest = history.length > 0 ? history[0] : undefined;

  return (
    <Card>
      <CardHeader
        actions={
          <Button loading={exporting} onClick={() => void handleExport()} variant="primary">
            Export everything
          </Button>
        }
        title="Your own copy"
      >
        <p className="mt-1 text-sm text-muted">
          The nightly backups stay on the same server as the fleet's records. This is the one you
          keep somewhere else.
        </p>
      </CardHeader>

      {loading ? null : latest ? (
        <DataList>
          {history.slice(0, 5).map((record) => (
            <DataRow
              key={record.id}
              meta={
                <MetaItem
                  label="Records"
                  numeric
                  value={countRecords(record.recordCounts).toLocaleString()}
                />
              }
              title={<span className="tabular">{fmt.dateTime(record.createdAt)}</span>}
            />
          ))}
        </DataList>
      ) : (
        <EmptyState title="No export has been taken yet." />
      )}

      <p className="mt-4 text-xs text-muted">
        Photos and receipts are stored as files and are not inside the export, though the records
        list where each one lives. Putting an export back is not something the app can do on its own
        — the file has everything needed, and it should go to whoever looks after the system.
      </p>
    </Card>
  );
}

function countRecords(counts: Record<string, number>): number {
  return Object.values(counts).reduce((sum, count) => sum + count, 0);
}
