// ============================================================
// Heartflow 桌面端后端 · 入口与命令注册
// 跨端接续（配对回路）的「接收端」由 touchpoints 模块承载。
// 设计原则：Rust 只负责「本地 HTTP 传输」与「事件转发」，
// 真实数据落盘仍由前端 storage 负责（避免 Rust 直接读写前端存储）。
// ============================================================

use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::Manager;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Modifiers, Shortcut, Code};
use tauri_plugin_shell;

mod touchpoints;

/// 退出主窗时是否缩小为 aura 美化层（保活）。由前端 aura:exit-to-aura
/// 经 set_exit_to_aura 命令同步；默认 true（与前端 KV 默认值一致）。
static EXIT_TO_AURA: AtomicBool = AtomicBool::new(true);

#[tauri::command]
fn set_exit_to_aura(value: bool) -> Result<(), String> {
    EXIT_TO_AURA.store(value, Ordering::SeqCst);
    Ok(())
}

/// 启动配对接收服务。
/// - `bind_lan`：false（推荐默认）只绑 127.0.0.1；true 才绑 0.0.0.0 供局域网配对。
/// - `token`：配对凭据，对端须以 `X-HF-Pair-Token` 头携带；空串将拒绝所有请求。
#[tauri::command]
async fn start_pairing_server(
    app: tauri::AppHandle,
    port: u16,
    bind_lan: bool,
    token: String,
) -> Result<(), String> {
    touchpoints::start_server(app, port, bind_lan, token).await
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
    // 加固：无论新建还是读取既有文件，均收紧为「仅当前用户可读写」，
    // 避免同机其他用户/进程读取；生成侧使用 CSPRNG，强度本身无问题。
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    let path = dir.join("device_secret.txt");
    if path.exists() {
        harden_secret_file(&path);
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
    harden_secret_file(&path);
    Ok(secret)
}

/// 收紧 secret 文件权限为「仅当前用户可读写」。
/// 失败仅忽略（不阻断主流程），因为该 secret 仅作本机兜底凭据。
fn harden_secret_file(path: &std::path::Path) {
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = fs::set_permissions(path, fs::Permissions::from_mode(0o600));
    }
    #[cfg(windows)]
    {
        // Windows：移除继承权限，仅授予当前用户读写
        let user = std::env::var("USERNAME").unwrap_or_default();
        if !user.is_empty() {
            let _ = std::process::Command::new("icacls")
                .arg(path)
                .arg("/inheritance:r")
                .arg("/grant:r")
                .arg(format!("{}:(R,W)", user))
                .output();
        }
    }
}

fn generate_device_secret() -> String {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    (0..32).map(|_| format!("{:02x}", rng.gen::<u8>())).collect()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // 全局热键插件：用于切换 AuraLayer 透明窗显隐
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        // shell 插件：Launcher 启动外部应用（open URI / 路径）
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            touchpoints::init();

            // 启动即隐藏 aura 透明窗（避免一开机就盖一层）；由全局热键 / 退出保活唤起。
            if let Some(aura) = app.get_webview_window("aura") {
                let _ = aura.hide();
            }

            // 退出保活：关闭主窗时隐藏而非销毁，保留 aura 透明窗常驻（「缩小为美化层」）。
            // 仅当配置 exitToAura 时唤起 aura；此处保守默认唤起，前端可关闭 aura 窗。
            let app_handle = app.handle().clone();
            app.on_window_event(move |window, event| {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    api.prevent_close();
                    let _ = window.hide();
                    // 仅在用户开启了「退出缩小为美化层」时唤起 aura 透明窗；
                    // 否则主窗隐藏后仅后台驻留（托盘/热键可再次唤起主窗）。
                    if EXIT_TO_AURA.load(Ordering::SeqCst) {
                        if let Some(aura) = app_handle.get_webview_window("aura") {
                            let _ = aura.show();
                            let _ = aura.set_focus();
                        }
                    }
                }
                }
            });

            // 全局热键 Ctrl/Cmd+Shift+A 切换 aura 透明窗显隐
            let handle = app.handle().clone();
            let shortcut = Shortcut::new(Some(Modifiers::SUPER | Modifiers::SHIFT), Code::KeyA);
            let _ = handle.global_shortcut().register(shortcut, move |_s: Shortcut| {
                if let Some(aura) = handle.get_webview_window("aura") {
                    let visible = aura.is_visible().unwrap_or(false);
                    if visible {
                        let _ = aura.hide();
                    } else {
                        let _ = aura.show();
                        let _ = aura.set_focus();
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            start_pairing_server,
            stop_pairing_server,
            set_share_payload,
            get_share_payload,
            is_pairing_server_running,
            cmd_get_device_secret,
            set_exit_to_aura
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
