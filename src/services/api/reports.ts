/**
 * Saving a report as a CSV file.
 *
 * The desktop build wrote the file itself and could then offer to open the
 * folder it was in. Neither a browser nor a phone has such a folder, so this
 * hands the file over and says honestly where it went — see `lib/saveFile`,
 * which is also where the Android half of the problem is dealt with.
 */

import { saveTextFile, type SaveOutcome } from "../../lib/saveFile";

/**
 * What makes Excel open a UTF-8 CSV as UTF-8. Without it a peso sign or the ñ
 * in a vehicle name arrives as mojibake. Written as an escape rather than the
 * character itself, which is invisible in an editor and reads as a stray
 * whitespace bug to anyone reviewing it.
 */
const BYTE_ORDER_MARK = "\uFEFF";

export type ExportReportCsvRequest = {
  filename: string;
  csvContents: string;
};

export type ExportReportCsvResponse = SaveOutcome;

export async function exportReportCsv(
  request: ExportReportCsvRequest,
): Promise<ExportReportCsvResponse> {
  return saveTextFile(
    request.filename,
    `${BYTE_ORDER_MARK}${request.csvContents}`,
    "text/csv;charset=utf-8",
  );
}
