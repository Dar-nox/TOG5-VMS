import { BackupRestoreModule } from "../../components/backup/BackupRestoreModule";
import { SettingsModule } from "../../components/settings/SettingsModule";

/**
 * Backup lives here now rather than being its own destination.
 *
 * It was a top-level section holding one button and about seven paragraphs
 * explaining where the records are kept — a thing you do twice a year, given
 * the same standing as the vehicles themselves.
 */
export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <SettingsModule />
      <BackupRestoreModule />
    </div>
  );
}
