export type ExportReportCsvRequest = {
  filename: string;
  csvContents: string;
};

/** Excel needs a byte-order mark to read accented names and the peso sign. */
const UTF8_BOM = "﻿";

/**
 * Saves a report through the browser rather than the server.
 *
 * The CSV is built here from data that is already on screen, so sending it to
 * the server would only write the file onto the server's disk — the wrong
 * computer entirely, and one the person who asked for the report may never
 * touch.
 */
export function downloadReportCsv(request: ExportReportCsvRequest): void {
  const blob = new Blob([`${UTF8_BOM}${request.csvContents}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = request.filename;
  document.body.append(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}
