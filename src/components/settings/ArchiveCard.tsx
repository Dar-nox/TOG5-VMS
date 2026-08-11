import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../app/providers/authContext";
import { useConfirm } from "../../app/providers/confirmContext";
import { useFormat } from "../../app/providers/formatContext";
import { useToast } from "../../app/providers/toastContext";
import { messageFromError } from "../../lib/errors";
import { labelFromKey } from "../../lib/text";
import {
  listArchivedRecords,
  restoreRecord,
  type ArchivedKind,
  type ArchivedRecord,
} from "../../services/api/archive";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card, CardHeader } from "../ui/Card";
import { DataList, DataRow, MetaItem } from "../ui/DataRow";
import { SkeletonRows } from "../ui/Spinner";
import { EmptyState, ErrorBlock } from "../ui/States";

const KIND_LABELS: Record<ArchivedKind, string> = {
  trip: "Trip",
  fuel: "Fuel log",
  expense: "Expense",
  reminder: "Reminder",
};

/**
 * Everything that has been archived, and a way to put it back.
 *
 * Owner only, and loaded on demand rather than with the rest of Settings. It is
 * the least visited thing on the screen and the query touches four tables, so
 * making everybody wait for it every time would be paying for it constantly to
 * use it twice a year.
 */
export function ArchiveCard() {
  const { isOwner } = useAuth();
  const confirm = useConfirm();
  const format = useFormat();
  const toast = useToast();

  const [records, setRecords] = useState<ArchivedRecord[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      setRecords(await listArchivedRecords());
      setError(null);
    } catch (caught) {
      setError(messageFromError(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  // Nothing happens until the owner asks, except that asking twice in a session
  // should not have to be asked for twice.
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    if (opened && records === null && !loading) {
      void load();
    }
  }, [load, loading, opened, records]);

  if (!isOwner) {
    return null;
  }

  async function handleRestore(record: ArchivedRecord) {
    const confirmed = await confirm({
      title: `Put this ${KIND_LABELS[record.kind].toLowerCase()} back?`,
      body: `${record.summary} — ${record.vehicleName}. It will appear in its list again.`,
      confirmLabel: "Restore",
      tone: "primary",
    });

    if (!confirmed) {
      return;
    }

    setBusyId(record.id);

    try {
      await restoreRecord(record.kind, record.id);
      setRecords((current) => current?.filter((item) => item.id !== record.id) ?? null);
      toast.success(`${KIND_LABELS[record.kind]} restored.`);
    } catch (caught) {
      toast.error(messageFromError(caught));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card>
      <CardHeader
        actions={
          opened ? (
            <Button loading={loading} onClick={() => void load()} variant="quiet">
              Refresh
            </Button>
          ) : (
            <Button onClick={() => setOpened(true)} variant="quiet">
              Show
            </Button>
          )
        }
        title="Archived records"
      />

      {!opened ? null : error ? (
        <ErrorBlock
          action={<Button onClick={() => void load()}>Try again</Button>}
          message={error}
        />
      ) : loading && records === null ? (
        <SkeletonRows />
      ) : records && records.length > 0 ? (
        <DataList>
          {records.map((record) => (
            <DataRow
              actions={
                <Button
                  loading={busyId === record.id}
                  onClick={() => void handleRestore(record)}
                  variant="quiet"
                >
                  Restore
                </Button>
              }
              key={record.id}
              meta={
                <>
                  {record.occurredOn ? (
                    <MetaItem
                      // A reminder's date is the last time the work was done,
                      // which is a different question from when a fuel log or
                      // an expense happened.
                      label={record.kind === "reminder" ? "Last done" : "Dated"}
                      value={format.date(record.occurredOn)}
                    />
                  ) : null}
                  {record.amount == null ? null : (
                    <MetaItem label="Amount" numeric value={format.money(record.amount)} />
                  )}
                  <MetaItem label="Archived" value={format.date(record.archivedAt)} />
                </>
              }
              subtitle={
                record.detail
                  ? `${record.vehicleName} · ${
                      // An expense's detail is its category, which arrives as
                      // the stored key — so this screen alone was reading
                      // "preventive_maintenance" where the Expenses tab reads
                      // "Preventive Maintenance". Only that kind needs it; the
                      // others are free text and title-casing them would be
                      // wrong.
                      record.kind === "expense" ? labelFromKey(record.detail) : record.detail
                    }`
                  : record.vehicleName
              }
              title={
                <span className="flex flex-wrap items-center gap-2">
                  {record.summary}
                  <Badge tone="archived">{KIND_LABELS[record.kind]}</Badge>
                </span>
              }
            />
          ))}
        </DataList>
      ) : (
        <EmptyState title="Nothing has been archived." />
      )}
    </Card>
  );
}
