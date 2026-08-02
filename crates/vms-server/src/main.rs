#[tokio::main]
async fn main() {
    if let Err(message) = vms_server::run().await {
        eprintln!("TOG 5 VMS server could not start: {message}");
        std::process::exit(1);
    }
}
