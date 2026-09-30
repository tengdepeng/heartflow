// ============================================================
// Heartflow 桌面端后端 · 入口与命令注册
// 跨端接续（配对回路）的「接收端」由 touchpoints 模块承载。
// 设计原则：Rust 只负责「本地 HTTP 传输」与「事件转发」，
// 真实数据落盘仍由前端 storage 负责（避免 Rust 直接读写前端存储）。
// ============================================================

use std::fs;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::Manager;
#[cfg(desktop)]
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

// ============================================================
// 系统桌面小组件（三端：Windows / macOS / Linux）
// 实现路线：Tauri 无边框透明置顶小窗（skip_taskbar），
// 前端经 getCurrentWindow().label === 'desktop-widget' 识别后
// 只渲染 DesktopWidgetView。关闭请求转为隐藏（保活、免重建）。
// ============================================================

const DESKTOP_WIDGET_LABEL: &str = "desktop-widget";

#[cfg(desktop)]
fn show_desktop_widget_impl(app: &tauri::AppHandle) -> Result<(), String> {
    if app.get_webview_window(DESKTOP_WIDGET_LABEL).is_none() {
        tauri::WebviewWindowBuilder::new(
            app,
            DESKTOP_WIDGET_LABEL,
            tauri::WebviewUrl::App("index.html".into()),
        )
        .title("Heartflow 小组件")
        .transparent(true)
        .always_on_top(true)
        .decorations(false)
        .skip_taskbar(true)
        .resizable(true)
        .inner_size(300.0, 420.0)
        .build()
        .map_err(|e| e.to_string())?;
    }
    if let Some(w) = app.get_webview_window(DESKTOP_WIDGET_LABEL) {
        w.show().map_err(|e| e.to_string())?;
        w.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg(not(desktop))]
fn show_desktop_widget_impl(_app: &tauri::AppHandle) -> Result<(), String> {
    Err("当前平台不支持系统桌面小组件窗".into())
}

#[tauri::command]
async fn show_desktop_widget(app: tauri::AppHandle) -> Result<(), String> {
    show_desktop_widget_impl(&app)
}

#[tauri::command]
fn hide_desktop_widget(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window(DESKTOP_WIDGET_LABEL) {
        w.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn toggle_desktop_widget(app: tauri::AppHandle) -> Result<bool, String> {
    if let Some(w) = app.get_webview_window(DESKTOP_WIDGET_LABEL) {
        if w.is_visible().unwrap_or(false) {
            w.hide().map_err(|e| e.to_string())?;
            return Ok(false);
        }
    }
    show_desktop_widget_impl(&app)?;
    Ok(true)
}

#[tauri::command]
fn is_desktop_widget_visible(app: tauri::AppHandle) -> bool {
    app.get_webview_window(DESKTOP_WIDGET_LABEL)
        .and_then(|w| w.is_visible().ok())
        .unwrap_or(false)
}

/// 系统小组件数据桥：前端把小组件快照（一言/心锚/专注状态等）写入
/// app_data_dir/widget_data.json。Android 桌面小组件（AppWidgetProvider）
/// 读取同路径渲染；桌面端写入无害（供后续系统级扩展复用）。
#[tauri::command]
fn sync_widget_data(app: tauri::AppHandle, payload: String) -> Result<(), String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    fs::write(dir.join("widget_data.json"), payload).map_err(|e| e.to_string())
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

// ============================================================
// 系统已安装应用枚举（桌面端）
// 用于「桌面收纳空间」收纳 PC 上已安装的 App 图标（200+）。
// 路线：纯 std 文件系统枚举，不引入新 crate（避免离线 cargo 下载受限）。
//   - Windows：开始菜单 Programs 下 .lnk / .url（递归）
//   - macOS：/Applications（及 ~/Applications）下 .app
//   - Linux：/usr/share/applications 与 /usr/local/share/applications 下 .desktop
// 移动端（#[cfg(not(desktop))]）返回空：Android 走 Kotlin 插件命令 enumSystemApps。
// ============================================================

#[derive(serde::Serialize, Clone)]
struct SystemApp {
    id: String,
    name: String,
    exec: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    icon: Option<String>,
}

#[cfg(any(target_os = "windows", target_os = "macos"))]
fn walk_dir(dir: &std::path::Path, depth: usize, max_depth: usize, out: &mut Vec<std::path::PathBuf>) {
    if depth > max_depth {
        return;
    }
    let entries = match std::fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };
    for entry in entries.flatten() {
        let p = entry.path();
        if p.is_dir() {
            walk_dir(&p, depth + 1, max_depth, out);
        } else {
            out.push(p);
        }
    }
}

#[cfg(desktop)]
fn enum_system_apps_impl() -> Vec<SystemApp> {
    let mut out: Vec<SystemApp> = Vec::new();
    let mut seen = std::collections::HashSet::new();

    #[cfg(target_os = "windows")]
    {
        let mut dirs: Vec<std::path::PathBuf> = Vec::new();
        if let Ok(p) = std::env::var("APPDATA") {
            let mut d = std::path::PathBuf::from(p);
            d.push("Microsoft\\Windows\\Start Menu\\Programs");
            dirs.push(d);
        }
        if let Ok(p) = std::env::var("PROGRAMDATA") {
            let mut d = std::path::PathBuf::from(p);
            d.push("Microsoft\\Windows\\Start Menu\\Programs");
            dirs.push(d);
        }
        for d in dirs {
            let mut files = Vec::new();
            walk_dir(&d, 0, 5, &mut files);
            for f in files {
                let ext = f
                    .extension()
                    .and_then(|e| e.to_str())
                    .unwrap_or("")
                    .to_lowercase();
                if ext != "lnk" && ext != "url" {
                    continue;
                }
                let name = f.file_stem().and_then(|s| s.to_str()).unwrap_or("").to_string();
                if name.is_empty() || !seen.insert(name.clone()) {
                    continue;
                }
                out.push(SystemApp {
                    id: format!("sys:{}", f.display()),
                    name,
                    exec: f.display().to_string(),
                    icon: None,
                });
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        let home = std::env::var("HOME").unwrap_or_default();
        let roots = vec![
            std::path::PathBuf::from("/Applications"),
            std::path::PathBuf::from(format!("{home}/Applications")),
        ];
        for root in roots {
            let mut files = Vec::new();
            walk_dir(&root, 0, 4, &mut files);
            for f in files {
                if f.extension().and_then(|e| e.to_str()) != Some("app") {
                    continue;
                }
                let name = f.file_stem().and_then(|s| s.to_str()).unwrap_or("").to_string();
                if name.is_empty() || !seen.insert(name.clone()) {
                    continue;
                }
                out.push(SystemApp {
                    id: format!("sys:{}", f.display()),
                    name,
                    exec: f.display().to_string(),
                    icon: None,
                });
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        let roots = vec![
            std::path::PathBuf::from("/usr/share/applications"),
            std::path::PathBuf::from("/usr/local/share/applications"),
        ];
        for root in roots {
            if !root.exists() {
                continue;
            }
            let entries = match std::fs::read_dir(&root) {
                Ok(e) => e,
                Err(_) => continue,
            };
            for entry in entries.flatten() {
                let p = entry.path();
                if p.extension().and_then(|e| e.to_str()) != Some("desktop") {
                    continue;
                }
                let content = match std::fs::read_to_string(&p) {
                    Ok(c) => c,
                    Err(_) => continue,
                };
                let mut name = String::new();
                let mut exec = String::new();
                let mut hidden = false;
                for line in content.lines() {
                    let line = line.trim();
                    if line.is_empty() || line.starts_with('#') || line.starts_with('[') {
                        continue;
                    }
                    if let Some(v) = line.strip_prefix("Name=") {
                        if name.is_empty() {
                            name = v.trim().to_string();
                        }
                    } else if let Some(v) = line.strip_prefix("Exec=") {
                        exec = v.trim().to_string();
                    } else if line.starts_with("NoDisplay=") || line.starts_with("Hidden=") {
                        if line.to_lowercase().contains("true") {
                            hidden = true;
                        }
                    }
                }
                if hidden || name.is_empty() || !seen.insert(name.clone()) {
                    continue;
                }
                out.push(SystemApp {
                    id: format!("sys:{}", p.display()),
                    name,
                    exec: if exec.is_empty() {
                        p.display().to_string()
                    } else {
                        exec
                    },
                    icon: None,
                });
            }
        }
    }

    out.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    out
}

#[cfg(not(desktop))]
fn enum_system_apps_impl() -> Vec<SystemApp> {
    Vec::new()
}

#[tauri::command]
fn enum_system_apps() -> Vec<SystemApp> {
    enum_system_apps_impl()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        // shell 插件：Launcher 启动外部应用（open URI / 路径）
        .plugin(tauri_plugin_shell::init());

    // 全局热键插件：桌面专用（切换 AuraLayer 透明窗显隐），移动端不支持该 API
    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_global_shortcut::Builder::new().build());
    }
        // 主窗关闭即退出整个应用；aura 透明窗一并销毁，避免残留导致 app 不退出。
    builder.on_window_event(|window, event| {
        if let tauri::WindowEvent::CloseRequested { api, .. } = event {
            if window.label() == "main" {
                // 主窗关闭即退出整个应用，避免「点关闭却关不掉」。
                // aura 透明窗 / 桌面小组件窗一并销毁，否则会残留导致 app 不退出。
                if let Some(aura) = window.app_handle().get_webview_window("aura") {
                    let _ = aura.destroy();
                }
                if let Some(widget) = window.app_handle().get_webview_window(DESKTOP_WIDGET_LABEL) {
                    let _ = widget.destroy();
                }
            } else if window.label() == DESKTOP_WIDGET_LABEL {
                // 小组件窗「关闭」转为隐藏：保活免重建，状态与位置保留。
                api.prevent_close();
                let _ = window.hide();
            }
        }
    })
        .setup(|app| {
            touchpoints::init();

            // aura 透明窗改由代码在桌面创建（conf 不再声明，避免移动端创建 transparent 窗报错）
            #[cfg(desktop)]
            {
                if let Err(e) = tauri::WebviewWindowBuilder::new(app, "aura", tauri::WebviewUrl::App("index.html".into()))
                    .title("Heartflow Aura")
                    .transparent(true)
                    .always_on_top(true)
                    .decorations(false)
                    .inner_size(1280.0, 800.0)
                    .build()
                {
                    eprintln!("failed to create aura window: {}", e);
                }
            }

            // 启动即隐藏 aura 透明窗（避免一开机就盖一层）；由全局热键 / 退出保活唤起。
            if let Some(aura) = app.get_webview_window("aura") {
                let _ = aura.hide();
            }

            #[cfg(desktop)]
            {
                // 全局热键 Ctrl/Cmd+Shift+A 切换 aura 透明窗显隐
                let shortcut = Shortcut::new(Some(Modifiers::SUPER | Modifiers::SHIFT), Code::KeyA);
                let _ = app.handle().global_shortcut().on_shortcut(
                    shortcut,
                    |app_handle, _s: &Shortcut, _| {
                        if let Some(aura) = app_handle.get_webview_window("aura") {
                            let visible = aura.is_visible().unwrap_or(false);
                            if visible {
                                let _ = aura.hide();
                            } else {
                                let _ = aura.show();
                                let _ = aura.set_focus();
                            }
                        }
                    },
                );
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            start_pairing_server,
            stop_pairing_server,
            set_share_payload,
            get_share_payload,
            is_pairing_server_running,
            cmd_get_device_secret,
            set_exit_to_aura,
            show_desktop_widget,
            hide_desktop_widget,
            toggle_desktop_widget,
            is_desktop_widget_visible,
            sync_widget_data,
            enum_system_apps
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
