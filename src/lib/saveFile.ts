/**
 * Getting a generated file off the device it was generated on.
 *
 * On the web this is a Blob and a hidden `<a download>`, which is what the app
 * already did. Inside the Android app that mechanism silently does nothing: a
 * WebView has no downloads directory and no download UI, so the click lands,
 * no file appears, and the screen reports success. Reports and the backup
 * export were therefore unusable on a phone — while the phone is the whole
 * point of this release.
 *
 * On Android the file is written to the app's cache and handed to the system
 * share sheet, which is how a phone actually moves a file somewhere: Drive,
 * Gmail, Files, WhatsApp. The user chooses where it goes, which is closer to
 * what they wanted than a path they would have to go hunting for anyway.
 */

import { Capacitor } from "@capacitor/core";

export type SaveOutcome = {
  filename: string;
  sizeBytes: number;
  /**
   * How it left: the browser's downloads, the system share sheet, or not at
   * all because the sheet was dismissed. The last one matters — a dismissed
   * share is not a failure to apologise for, and it is not an export to record
   * against the backup reminder either.
   */
  via: "download" | "share" | "cancelled";
};

export async function saveTextFile(
  filename: string,
  contents: string,
  mimeType: string,
): Promise<SaveOutcome> {
  const sizeBytes = new Blob([contents]).size;

  if (Capacitor.isNativePlatform()) {
    // Loaded only on the phone. The browser build has no use for the native
    // shims and should not carry them.
    const [{ Directory, Encoding, Filesystem }, { Share }] = await Promise.all([
      import("@capacitor/filesystem"),
      import("@capacitor/share"),
    ]);

    // Cache rather than Documents: this is a copy on its way somewhere else,
    // and the system may reclaim it once it has been shared.
    const written = await Filesystem.writeFile({
      path: filename,
      data: contents,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });

    try {
      await Share.share({
        title: filename,
        // `url` rather than `text`, so the receiving app gets a file rather
        // than the entire report pasted into a message body.
        url: written.uri,
        dialogTitle: "Save or send",
      });
    } catch {
      // Dismissing the sheet rejects. Somebody changing their mind is not an
      // error worth showing them.
      return { filename, sizeBytes, via: "cancelled" };
    }

    return { filename, sizeBytes, via: "share" };
  }

  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();

  // Revoking immediately can cancel the download in some browsers, so this
  // waits for the current task to finish first.
  setTimeout(() => URL.revokeObjectURL(url), 0);

  return { filename, sizeBytes, via: "download" };
}

/**
 * What to tell somebody once it has gone, in the words that match what they
 * just saw happen.
 */
export function saveMessage(outcome: SaveOutcome): string {
  switch (outcome.via) {
    case "share":
      return `${outcome.filename} sent.`;
    case "cancelled":
      return "Nothing was saved.";
    default:
      return `${outcome.filename} is wherever this device saves downloads.`;
  }
}

/**
 * Whether this device can print.
 *
 * `window.print()` is not implemented in an Android WebView — it does nothing
 * at all, with no error. Rather than offer a button that lies, the reports
 * screen offers to share the report as a file on native, which the person can
 * then open and print from Chrome if they need paper.
 */
export function canPrint(): boolean {
  return !Capacitor.isNativePlatform();
}
