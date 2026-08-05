import { BackupSection } from "../../components/backup/BackupSection";
import { SettingsSections } from "../../components/settings/SettingsSections";

/**
 * Backup lives here now rather than being its own destination.
 *
 * It was a top-level section holding one button and about seven paragraphs
 * explaining where the records are kept — a thing you do twice a year, given
 * the same standing as the vehicles themselves.
 */
export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold text-heading @md:text-2xl">Settings</h1>
      <SettingsSections />
      <BackupSection />
    </div>
  );
}
