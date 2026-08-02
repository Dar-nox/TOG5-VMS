use std::{env, path::PathBuf, process::ExitCode};

use vms_server::Shutdown;

/// Told to the service manager when a staged restore needs a fresh start.
/// Anything non-zero makes WinSW's `<onfailure action="restart">` bring the
/// server straight back; 75 is the conventional "temporary failure, try
/// again" code, which is exactly what this is.
const RESTART_EXIT_CODE: u8 = 75;

const USAGE: &str = "\
TOG 5 VMS server

  vms-server              Serve the app (this is what the Windows service runs)
  vms-server backup [dir] Write a backup package, then exit
  vms-server --help       Show this message

Settings come from the environment; see crates/vms-server/README.md.";

#[tokio::main]
async fn main() -> ExitCode {
    let arguments: Vec<String> = env::args().skip(1).collect();

    match arguments.first().map(String::as_str) {
        None => serve().await,
        Some("backup") => backup(arguments.get(1)),
        Some("--help" | "-h" | "help") => {
            println!("{USAGE}");
            ExitCode::SUCCESS
        }
        Some(unknown) => {
            eprintln!("'{unknown}' is not something vms-server knows how to do.\n\n{USAGE}");
            ExitCode::FAILURE
        }
    }
}

async fn serve() -> ExitCode {
    match vms_server::run().await {
        Ok(Shutdown::Requested) => ExitCode::SUCCESS,
        Ok(Shutdown::Restart) => ExitCode::from(RESTART_EXIT_CODE),
        Err(message) => {
            eprintln!("TOG 5 VMS server could not start: {message}");
            ExitCode::FAILURE
        }
    }
}

fn backup(destination: Option<&String>) -> ExitCode {
    let destination = destination.map(PathBuf::from);

    match vms_server::run_backup(destination.as_deref()) {
        Ok(path) => {
            println!("Backup written to {path}");
            ExitCode::SUCCESS
        }
        Err(message) => {
            eprintln!("Backup failed: {message}");
            ExitCode::FAILURE
        }
    }
}
