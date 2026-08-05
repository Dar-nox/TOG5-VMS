/**
 * Saving a report as a CSV file.
 *
 * The desktop build wrote the file itself and could then offer to open the
 * folder it was in. A browser has no such folder — the file goes wherever that
 * browser puts downloads, and on a phone that is the only place it can go. So
 * this hands the file to the browser and says where it went, rather than
 * pretending to a path it does not know.
 */

export type ExportReportCsvRequest = {
  filename: string;
  csvContents: string;
};

export type ExportReportCsvResponse = {
  filename: string;
  sizeBytes: number;
};

export async function exportReportCsv(
  request: ExportReportCsvRequest,
): Promise<ExportReportCsvResponse> {
  // The byte order mark is what makes Excel open a UTF-8 CSV as UTF-8. Without
  // it, a peso sign or an ñ in a vehicle name arrives as mojibake.
  const blob = new Blob(["﻿", request.csvContents], {
    type: "text/csv;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = request.filename;
  document.body.append(link);
  link.click();
  link.remove();

  // Revoking immediately can cancel the download in some browsers, so this
  // waits for the current task to finish first.
  setTimeout(() => URL.revokeObjectURL(url), 0);

  return { filename: request.filename, sizeBytes: blob.size };
}
