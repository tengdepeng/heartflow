// ============================================================
// 跨端配对接收端（B1-EXT 真机配对回路 Rust 侧）
//
// 与前端 modules/sync/transport.ts 的 createLanTransportAdapter 对齐：
//   - 前端 export() → PUT <host>:<port>/snapshot  （本机数据推送到对端）
//   - 前端 import() → GET <host>:<port>/snapshot  （从对端拉取数据）
// 本模块在每个设备实例内起一个本地 HTTP 服务，扮演「接收端」：
//   - GET  /snapshot ：返回本机当前共享快照（由前端经 set_share_payload 注册）
//   - PUT  /snapshot ：接收对端快照，校验格式后通过 Tauri 事件转发给前端导入
//
// 宪法第1条「本地私有」保障：
//   - 前端 isLocalBoundaryUrl 已在客户端硬性拒绝非本地地址（fail-closed）。
//   - 本端绑定 0.0.0.0 仅为局域网可达；真实部署应在真机阶段追加「源 IP 私有网段」
//     过滤作为纵深防御（当前依赖前端守门 + 快照格式校验）。
// ============================================================

use std::sync::{Mutex, OnceLock};

use axum::{
    body::  Body,
    extract::State,
    http::{header, StatusCode},
    response::Response,
    routing::get,
    Router,
};
use tauri::{AppHandle, Emitter};

/// 本机要共享出去的快照（JSON 字符串），由前端 set_share_payload 注册。
static SHARE: OnceLock<Mutex<Option<String>>> = OnceLock::new();
/// 当前运行的服务器句柄（含优雅停机信号）。
static HANDLE: OnceLock<Mutex<Option<ServerHandle>>> = OnceLock::new();

struct ServerHandle {
    shutdown: tokio::sync::oneshot::Sender<()>,
}

/// 初始化全局状态（幂等）。
pub fn init() {
    let _ = SHARE.get_or_init(|| Mutex::new(None));
    let _ = HANDLE.get_or_init(|| Mutex::new(None));
}

pub fn set_share_payload(p: String) -> Result<(),  String> {
    SHARE
        .get()
        .ok_or_else(|| "未初始化".to_string())?
        .lock()
        .map_err(|_| "锁损坏".to_string())
        .map(|mut g| *g = Some(p))
}

pub fn get_share_payload() -> Result<Option<String>, String> {
    Ok(SHARE
        .get()
        .ok_or_else(|| "未初始化".to_string())?
        .lock()
        .map_err(|_| "锁损坏".to_string())?
        .clone())
}

pub fn is_running() -> bool {
    HANDLE
        .get()
        .map(|h| h.lock().map(|g| g.is_some()).unwrap_or(false))
        .unwrap_or(false)
}

pub async fn start_server(app: AppHandle, port: u16) -> Result<(), String> {
    if is_running() {
        return Err("配对服务已在运行".to_string());
    }

    let (tx, rx) = tokio::sync::oneshot::channel::<()>();
    let app_state = app.clone();

    let tcp = tokio::net::TcpListener::bind(("0.0.0.0", port))
        .await
        .map_err(|e| format!("绑定端口失败：{e}"))?;

    let router = Router::new()
        .route("/snapshot", get(handler_get).put(handler_put))
        .with_state(app_state);

    tauri::async_runtime::spawn(async move {
        if let Err(e) = axum::serve(tcp, router)
            .with_graceful_shutdown(async move {
                let _ = rx.await;
            })
            .await
        {
            eprintln!("配对服务异常退出：{e}");
        }
    });

    HANDLE
        .get()
        .ok_or_else(|| "未初始化".to_string())?
        .lock()
        .map_err(|_| "锁损坏".to_string())?
        .replace(ServerHandle { shutdown: tx });

    Ok(())
}

pub fn stop_server() -> Result<(), String> {
    let mut guard = HANDLE
        .get()
        .ok_or_else(|| "未初始化".to_string())?
        .lock()
        .map_err(|_| "锁损坏".to_string())?;
    if let Some(h) = guard.take() {
        let _ = h.shutdown.send(());
    }
    Ok(())
}

// ---- HTTP 处理 ----

async fn handler_get(State(_app): State<AppHandle>) -> Response {
    match get_share_payload().ok().flatten() {
        Some(p) => json_response(StatusCode::OK, &p),
        None => json_response(StatusCode::NOT_FOUND, "{\"error\":\"无可共享快照\"}"),
    }
}

async fn handler_put(State(app): State<AppHandle>, body: String) -> Response {
    // 校验快照格式：与前端 SnapshotBlob.format 保持一致，杜绝非预期载荷
    let parsed: serde_json::Value = match serde_json::from_str(&body) {
        Ok(v) => v,
        Err(_) => return json_response(StatusCode::BAD_REQUEST, "{\"error\":\"JSON 解析失败\"}"),
    };
    let format_ok = parsed
        .get("format")
        .and_then(|f| f.as_str())
        == Some("hf-snapshot/v1");
    if !format_ok {
        return json_response(
            StatusCode::BAD_REQUEST,
            "{\"error\":\"不支持的快照格式\"}",
        );
    }

    // 转发给前端导入（前端监听 snapshot-incoming 事件写入本地存储）
    if let Err(e) = app.emit("snapshot-incoming", body.clone()) {
        eprintln!("转发快照事件失败：{e}");
    }
    json_response(StatusCode::OK, "{\"ok\":true}")
}

fn json_response(status: StatusCode, text: &str) -> Response {
    Response::builder()
        .status(status)
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(text.to_string()))
        .unwrap_or_else(|_| Response::new(Body::empty()))
}
