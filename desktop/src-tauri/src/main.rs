#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Mutex;
use tauri::{Manager, WebviewWindowBuilder};
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::ShellExt;
use tokio::time::{sleep, Duration};

const PORT: u16 = 8420;
const HEALTH_URL: &str = "http://localhost:8420/api/v1/health";
const HEALTH_POLL_MS: u64 = 200;
const HEALTH_TIMEOUT_S: u64 = 30;

struct Sidecar(Mutex<Option<CommandChild>>);

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let handle = app.handle().clone();

            // Spawn the sidecar
            let sidecar = handle
                .shell()
                .sidecar("solon")
                .expect("failed to locate solon sidecar")
                .args(["serve", "--port", &PORT.to_string()]);

            let (mut rx, child) = sidecar.spawn().expect("failed to spawn solon sidecar");
            println!("solon sidecar started (pid: {})", child.pid());

            // Store child for cleanup on exit
            app.manage(Sidecar(Mutex::new(Some(child))));

            // Monitor sidecar output in background
            let monitor_handle = handle.clone();
            tauri::async_runtime::spawn(async move {
                use tauri_plugin_shell::process::CommandEvent;
                while let Some(event) = rx.recv().await {
                    match event {
                        CommandEvent::Stdout(line) => {
                            println!("[solon] {}", String::from_utf8_lossy(&line));
                        }
                        CommandEvent::Stderr(line) => {
                            eprintln!("[solon] {}", String::from_utf8_lossy(&line));
                        }
                        CommandEvent::Terminated(status) => {
                            eprintln!("solon exited: {:?}", status);
                            monitor_handle.exit(1);
                            return;
                        }
                        _ => {}
                    }
                }
            });

            // Poll health endpoint, then open window
            tauri::async_runtime::spawn(async move {
                let client = reqwest::Client::new();
                let max_attempts = (HEALTH_TIMEOUT_S * 1000) / HEALTH_POLL_MS;

                for _ in 0..max_attempts {
                    if client.get(HEALTH_URL).send().await.is_ok() {
                        let url: tauri::Url = format!("http://localhost:{}", PORT)
                            .parse()
                            .unwrap();
                        let _ = WebviewWindowBuilder::new(
                            &handle,
                            "main",
                            tauri::WebviewUrl::External(url),
                        )
                        .title("Solon")
                        .inner_size(1200.0, 800.0)
                        .min_inner_size(800.0, 500.0)
                        .build();
                        return;
                    }
                    sleep(Duration::from_millis(HEALTH_POLL_MS)).await;
                }

                eprintln!("solon failed to start within {}s", HEALTH_TIMEOUT_S);
                handle.exit(1);
            });

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building solon desktop")
        .run(|handle, event| {
            if let tauri::RunEvent::Exit = event {
                if let Some(child) = handle
                    .state::<Sidecar>()
                    .0
                    .lock()
                    .unwrap()
                    .take()
                {
                    let _ = child.kill();
                    println!("solon sidecar killed");
                }
            }
        });
}
