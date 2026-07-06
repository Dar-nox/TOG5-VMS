use std::{fs, path::Path};

use super::models::{ExportReportCsvRequest, ExportReportCsvResponse};

const REPORT_EXPORT_FOLDER: &str = "report-exports";
const MAX_REPORT_EXPORT_BYTES: usize = 20 * 1024 * 1024;

pub fn export_report_csv(
    app_data_dir: &Path,
    request: ExportReportCsvRequest,
) -> Result<ExportReportCsvResponse, String> {
    let csv_bytes = request.csv_contents.as_bytes();
    if csv_bytes.is_empty() {
        return Err("The report is empty and could not be exported.".to_string());
    }
    if csv_bytes.len() > MAX_REPORT_EXPORT_BYTES {
        return Err("The report is too large to export in this build.".to_string());
    }

    let folder_path = app_data_dir.join(REPORT_EXPORT_FOLDER);
    fs::create_dir_all(&folder_path)
        .map_err(|_| "Could not prepare the local report export folder.".to_string())?;

    let filename = unique_filename(&folder_path, &sanitize_csv_filename(&request.filename));
    let file_path = folder_path.join(&filename);
    fs::write(&file_path, csv_bytes)
        .map_err(|_| "Could not save the report CSV file.".to_string())?;

    Ok(ExportReportCsvResponse {
        filename,
        file_path: file_path.display().to_string(),
        folder_path: folder_path.display().to_string(),
        size_bytes: csv_bytes.len() as u64,
    })
}

fn sanitize_csv_filename(filename: &str) -> String {
    let trimmed = filename.trim();
    let base = if trimmed.is_empty() {
        "tog5-report.csv"
    } else {
        trimmed
    };
    let mut sanitized = base
        .chars()
        .map(|character| match character {
            'a'..='z' | 'A'..='Z' | '0'..='9' | '-' | '_' | '.' => character,
            _ => '-',
        })
        .collect::<String>();

    while sanitized.contains("..") {
        sanitized = sanitized.replace("..", ".");
    }
    sanitized = sanitized.trim_matches(['.', '-']).to_string();

    if sanitized.is_empty() {
        sanitized = "tog5-report".to_string();
    }
    if !sanitized.to_ascii_lowercase().ends_with(".csv") {
        sanitized.push_str(".csv");
    }

    sanitized
}

fn unique_filename(folder_path: &Path, filename: &str) -> String {
    let candidate_path = folder_path.join(filename);
    if !candidate_path.exists() {
        return filename.to_string();
    }

    let without_extension = filename.strip_suffix(".csv").unwrap_or(filename);
    for index in 2..1000 {
        let candidate = format!("{without_extension}-{index}.csv");
        if !folder_path.join(&candidate).exists() {
            return candidate;
        }
    }

    format!("{without_extension}-copy.csv")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn report_export_writes_csv_and_avoids_overwrite() {
        let temp_dir = tempfile::tempdir().expect("temp dir");
        let first = export_report_csv(
            temp_dir.path(),
            ExportReportCsvRequest {
                filename: "../Bad Report.csv".to_string(),
                csv_contents: "a,b\r\n1,2".to_string(),
            },
        )
        .expect("first export should save");
        let second = export_report_csv(
            temp_dir.path(),
            ExportReportCsvRequest {
                filename: "../Bad Report.csv".to_string(),
                csv_contents: "a,b\r\n3,4".to_string(),
            },
        )
        .expect("second export should save");

        assert_eq!(first.filename, "Bad-Report.csv");
        assert_eq!(second.filename, "Bad-Report-2.csv");
        assert!(Path::new(&first.file_path).exists());
        assert!(Path::new(&second.file_path).exists());
        assert_eq!(first.size_bytes, 8);
    }

    #[test]
    fn report_export_rejects_empty_csv() {
        let temp_dir = tempfile::tempdir().expect("temp dir");
        let error = export_report_csv(
            temp_dir.path(),
            ExportReportCsvRequest {
                filename: "empty.csv".to_string(),
                csv_contents: "".to_string(),
            },
        )
        .expect_err("empty export should fail");

        assert!(error.contains("empty"));
    }
}
