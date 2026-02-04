use tauri::Manager;
use tauri_plugin_shell::ShellExt;
use std::sync::Mutex;

struct BackendState {
    child: Option<tauri_plugin_shell::process::CommandChild>,
}

#[tauri::command]
async fn start_backend(app: tauri::AppHandle, state: tauri::State<'_, Mutex<BackendState>>) -> Result<String, String> {
    let mut backend_state = state.lock().map_err(|e| e.to_string())?;

    if backend_state.child.is_some() {
        return Ok("Backend already running".to_string());
    }

    let sidecar_command = app.shell()
        .sidecar("tysttext-backend")
        .map_err(|e| format!("Failed to create sidecar command: {}", e))?;

    let (mut rx, child) = sidecar_command
        .spawn()
        .map_err(|e| format!("Failed to spawn backend: {}", e))?;

    backend_state.child = Some(child);

    // Log backend output in background
    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                tauri_plugin_shell::process::CommandEvent::Stdout(line) => {
                    println!("[Backend] {}", String::from_utf8_lossy(&line));
                }
                tauri_plugin_shell::process::CommandEvent::Stderr(line) => {
                    eprintln!("[Backend Error] {}", String::from_utf8_lossy(&line));
                }
                tauri_plugin_shell::process::CommandEvent::Error(error) => {
                    eprintln!("[Backend] Error: {}", error);
                }
                tauri_plugin_shell::process::CommandEvent::Terminated(payload) => {
                    println!("[Backend] Terminated with code: {:?}", payload.code);
                    break;
                }
                _ => {}
            }
        }
    });

    Ok("Backend started".to_string())
}

#[tauri::command]
async fn stop_backend(state: tauri::State<'_, Mutex<BackendState>>) -> Result<String, String> {
    let mut backend_state = state.lock().map_err(|e| e.to_string())?;

    if let Some(child) = backend_state.child.take() {
        child.kill().map_err(|e| format!("Failed to kill backend: {}", e))?;
        return Ok("Backend stopped".to_string());
    }

    Ok("Backend was not running".to_string())
}

#[tauri::command]
fn get_backend_url() -> String {
    "http://localhost:8000".to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(Mutex::new(BackendState { child: None }))
        .invoke_handler(tauri::generate_handler![
            start_backend,
            stop_backend,
            get_backend_url
        ])
        .setup(|app| {
            // Auto-start backend when app opens
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                // Give the window a moment to initialize
                tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

                let state = handle.state::<Mutex<BackendState>>();
                if let Ok(mut backend_state) = state.lock() {
                    if backend_state.child.is_none() {
                        if let Ok(sidecar) = handle.shell().sidecar("tysttext-backend") {
                            if let Ok((mut rx, child)) = sidecar.spawn() {
                                backend_state.child = Some(child);
                                println!("Backend auto-started");

                                // Log output
                                tauri::async_runtime::spawn(async move {
                                    while let Some(event) = rx.recv().await {
                                        match event {
                                            tauri_plugin_shell::process::CommandEvent::Stdout(line) => {
                                                println!("[Backend] {}", String::from_utf8_lossy(&line));
                                            }
                                            tauri_plugin_shell::process::CommandEvent::Stderr(line) => {
                                                eprintln!("[Backend Error] {}", String::from_utf8_lossy(&line));
                                            }
                                            _ => {}
                                        }
                                    }
                                });
                            }
                        }
                    }
                }
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            // Stop backend when window closes
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                let state = window.state::<Mutex<BackendState>>();
                if let Ok(mut backend_state) = state.lock() {
                    if let Some(child) = backend_state.child.take() {
                        let _ = child.kill();
                        println!("Backend stopped on window close");
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
