// ============================================================
// Heartflow 桌面端后端 · 入口与命令注册
// 跨端接续（配对回路）的「接收端」由 touchpoints 模块承载。
// 设计原则：Rust 只负责「本地 HTTP 传输」与「事件转发」，
// 真实数据落盘仍由前端 storage 负责（避免 Rust 直接读写前端存储）。
// ============================================================

use std::fs;
use std::path::PathBuf;
use tauri::Manager;

mod touchpoints;

#[tauri::command]
async fn start_pairing_server(app: tauri::AppHandle, port: u16) -> Result<(), String> {
    touchpoints::start_server(app, port).await
}

#[tauri::command]
fn stop_pairing_server() -> Result<(), String> {
    touchpoints::stop_server()
}

#[tauri::command]
fn set_share_payload(payload: String) -> Result<(), String> {
    touchpoints::set_share_payload(payload)
}

#[tauri::command]
fn get_share_payload() -> Result<Option<String>, String> {
    touchpoints::get_share_payload()
}

#[tauri::command]
fn is_pairing_server_running() -> bool {
    touchpoints::is_running()
}

#[tauri::command]
fn cmd_get_device_secret(app: tauri::AppHandle) -> Result<String, String> {
    // 设备绑定兜底密钥源：生成本机持久化随机 secret，存 app config 目录独立文件。
    // 明文语义 = 本机可读（仅防存储文件被拷走 / 落入同步盘），与「本地私有」一致。
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    let path = dir.join("device_secret.txt");
    if path.exists() {
        if let Ok(s) = fs::read_to_string(&path) {
            let t = s.trim();
            if !t.is_empty() {
                return Ok(t.to_string());
            }
        }
    }
    let secret = generate_device_secret();
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    fs::write(&path, &secret).map_err(|e| e.to_string())?;
    Ok(secret)
}

fn generate_device_secret() -> String {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    (0..32).map(|_| format!("{:02x}", rng.gen::<u8>())).collect()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|_app| {
            touchpoints::init();
            Ok(())
        })
    .invoke_handler(tauri::generate_handler![
        start_pairing_server,
        stop_pairing_server,
        set_share_payload,
        get_share_payload,
        is_pairing_server_running,
        cmd_get_device_secret
    ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
