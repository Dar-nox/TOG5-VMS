import { invoke } from "@tauri-apps/api/core";

const reportCommands = {
  exportCsv: "export_report_csv",
} as const;

export type ExportReportCsvRequest = {
  filename: string;
  csvContents: string;
};

export type ExportReportCsvResponse = {
  filename: string;
  filePath: string;
  folderPath: string;
  sizeBytes: number;
};

export async function exportReportCsv(
  request: ExportReportCsvRequest,
): Promise<ExportReportCsvResponse> {
  return invoke<ExportReportCsvResponse>(reportCommands.exportCsv, { request });
}
