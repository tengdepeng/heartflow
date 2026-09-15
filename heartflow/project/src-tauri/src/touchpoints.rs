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
// 宪法第1条「本地私有」保障（安全加固后）：
//   - 默认只绑定 127.0.0.1，服务不对外暴露；仅当用户显式开启「局域网配对」
//     （bind_lan = true）时才绑定 0.0.0.0。
//   - 所有 /snapshot 访问必须携带配对凭据（请求头 X-HF-Pair-Token），
//     采用常量时间比较，校验失败返回 401。
//   - 源 IP 私有网段过滤：仅放行回环 / 10.0.0.0/8 / 172.16-31.0.0 /
//     192.168.0.0/16 / 169.254.0.0/16 / IPv6 唯一本地地址。
//   - 载荷结构化校验：顶层字段白名单 + 必需字段类型校验 + 8MB 体积上限，
//     不再仅依赖可伪造的 format 字符串。
//   - 空闲自动关闭：10 分钟无活动自动停服，避免用户遗忘长期暴露。
//
// 注：前端 isLocalBoundaryUrl 只约束「前端向外请求的目标地址」（防数据外发），
//     与本端服务可被谁访问无关，两者不可互相替代，故上述服务端防护不可省略。
// ============================================================

use std::net::{IpAddr, SocketAddr};
use std::sync::{Arc, Mutex, OnceLock};
use std::time::{Duration, Instant};

use axum::{
    body::Body,
    extract::{ConnectInfo, Request, State},
    http::{header, HeaderMap, StatusCode},
    middleware::{self, Next},
    response::Response,
    routing::{get, put},
    Router,
};
use tauri::{AppHandle, Emitter};

/// 单个快照体积上限（8 MB），防止超大载荷打爆内存
const MAX_SNAPSHOT_BYTES: usize = 8 * 1024 * 1024;
/// 无活动自动关闭时限（10 分钟）
const IDLE_TIMEOUT: Duration = Duration::from_secs(600);
/// 空闲巡检间隔（30 秒）
const IDLE_CHECK_INTERVAL: Duration = Duration::from_secs(30);
/// 快照允许的顶层字段白名单（与前端 SnapshotBlob 严格对齐）
const SNAPSHOT_TOP_KEYS: [&str; 3] = ["format", "exportedAt", "schema"];
/// 约定的快照格式标识
const SNAPSHOT_FORMAT: &str = "hf-snapshot/v1";
/// 配对凭据请求头
const PAIR_TOKEN_HEADER: &str = "x-hf-pair-token";

/// 本机要共享出去的快照（JSON 字符串），由前端 set_share_payload 注册。
static SHARE: OnceLock<Mutex<Option<String>>> = OnceLock::new();
/// 当前运行的服务器句柄（含优雅停机信号）。
static HANDLE: OnceLock<Mutex<Option<ServerHandle>>> = OnceLock::new();

struct ServerHandle {
    shutdown: tokio::sync::oneshot::Sender<()>,
}

/// 配对服务共享状态
#[derive(Clone)]
struct PairState {
    app: AppHandle,
    /// 配对凭据；为空表示拒绝全部请求（fail-closed）
    token: String,
    /// 最近一次成功鉴权的请求时间，用于空闲自动关闭
    last_active: Arc<Mutex<Instant>>,
}

/// 初始化全局状态（幂等）。
pub fn init() {
    let _ = SHARE.get_or_init(|| Mutex::new(None));
    let _ = HANDLE.get_or_init(|| Mutex::new(None));
}

pub fn set_share_payload(p: String) -> Result<(), String> {
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

/// 启动配对接收服务。
///
/// - `bind_lan = false`（默认/推荐）：只绑定 127.0.0.1，服务不对外暴露。
/// - `bind_lan = true`：绑定 0.0.0.0 以允许局域网配对；此时仍强制
///   源 IP 私有网段过滤与配对凭据校验。
/// - `token`：配对凭据，前端需以 `X-HF-Pair-Token` 头携带；传空串将拒绝所有请求。
pub async fn start_server(
    app: AppHandle,
    port: u16,
    bind_lan: bool,
    token: String,
) -> Result<(), String> {
    if is_running() {
        return Err("配对服务已在运行".to_string());
    }

    let (tx, rx) = tokio::sync::oneshot::channel::<()>();
    let (wd_tx, wd_rx) = tokio::sync::oneshot::channel::<()>();

    // 默认仅本机回环；只有用户显式开启局域网配对时才绑定所有网卡
    let bind_addr = if bind_lan { "0.0.0.0" } else { "127.0.0.1" };
    let tcp = tokio::net::TcpListener::bind((bind_addr, port))
        .await
        .map_err(|e| format!("绑定 {bind_addr}:{port} 失败：{e}"))?;

    let state = PairState {
        app,
        token,
        last_active: Arc::new(Mutex::new(Instant::now())),
    };

    let router = Router::new()
        .route("/snapshot", get(handler_get).put(handler_put))
        .layer(middleware::from_fn(ip_guard))
        .layer(middleware::from_fn_with_state(state.clone(), auth_guard))
        .with_state(state.clone());

    // 空闲看门狗：超时后触发关闭并清理句柄，避免 is_running 失真
    let last = state.last_active.clone();
    tauri::async_runtime::spawn(async move {
        loop {
            tokio::time::sleep(IDLE_CHECK_INTERVAL).await;
            let expired = match last.lock() {
                Ok(g) => g.elapsed() >= IDLE_TIMEOUT,
                Err(_) => true,
            };
            if expired {
                let _ = wd_tx.send(());
                if let Some(h) = HANDLE.get() {
                    if let Ok(mut g) = h.lock() {
                        g.take();
                    }
                }
                break;
            }
        }
    });

    tauri::async_runtime::spawn(async move {
        if let Err(e) = axum::serve(tcp, router.into_make_service_with_connect_info::<SocketAddr>())
            .with_graceful_shutdown(async move {
                tokio::select! {
                    _ = rx => {}
                    _ = wd_rx => {}
                }
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

// ---- 中间件 ----

/// 常量时间字符串比较，降低时序侧信道风险
fn constant_time_eq(a: &str, b: &str) -> bool {
    let ab = a.as_bytes();
    let bb = b.as_bytes();
    if ab.len() != bb.len() {
        return false;
    }
    let mut diff = 0u8;
    for (x, y) in ab.iter().zip(bb.iter()) {
        diff |= x ^ y;
    }
    diff == 0
}

/// 判断来源 IP 是否处于本地边界内（回环 / 私有网段 / 链路本地 / IPv6 ULA）
fn is_local_boundary(ip: IpAddr) -> bool {
    match ip {
        IpAddr::V4(v4) => {
            if v4.is_loopback() {
                return true;
            }
            let o = v4.octets();
            match o[0] {
                10 => true,
                172 => (16..=31).contains(&o[1]),
                192 => o[1] == 168,
                169 => o[1] == 254,
                _ => false,
            }
        }
        // IPv6：回环与唯一本地地址（fc00::/7）
        IpAddr::V6(v6) => v6.is_loopback() || (v6.segments()[0] & 0xfe00) == 0xfc00,
    }
}

/// 源 IP 私有网段过滤（纵深防御）
async fn ip_guard(ConnectInfo(addr): ConnectInfo<SocketAddr>, req: Request, next: Next) -> Response {
    if !is_local_boundary(addr.ip()) {
        return json_response(
            StatusCode::FORBIDDEN,
            "{\"error\":\"来源地址不在本地边界内\"}",
        );
    }
    next.run(req).await
}

/// 配对凭据校验；通过则刷新活跃时间
async fn auth_guard(
    State(st): State<PairState>,
    headers: HeaderMap,
    req: Request,
    next: Next,
) -> Response {
    let provided = headers
        .get(PAIR_TOKEN_HEADER)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");

    if st.token.is_empty() || !constant_time_eq(provided, &st.token) {
        return json_response(
            StatusCode::UNAUTHORIZED,
            "{\"error\":\"未授权：缺少或错误的配对凭据\"}",
        );
    }

    if let Ok(mut g) = st.last_active.lock() {
        *g = Instant::now();
    }

    next.run(req).await
}

// ---- HTTP 处理 ----

async fn handler_get(State(_st): State<PairState>) -> Response {
    match get_share_payload().ok().flatten() {
        Some(p) => json_response(StatusCode::OK, &p),
        None => json_response(StatusCode::NOT_FOUND, "{\"error\":\"无可共享快照\"}"),
    }
}

async fn handler_put(State(st): State<PairState>, body: String) -> Response {
    // 体积上限（在解析前拦截，避免超大载荷进入 JSON 解析器）
    if body.len() > MAX_SNAPSHOT_BYTES {
        return json_response(
            StatusCode::PAYLOAD_TOO_LARGE,
            "{\"error\":\"快照体积超出上限（8MB）\"}",
        );
    }

    let parsed: serde_json::Value = match serde_json::from_str(&body) {
        Ok(v) => v,
        Err(_) => return json_response(StatusCode::BAD_REQUEST, "{\"error\":\"JSON 解析失败\"}"),
    };

    let obj = match parsed.as_object() {
        Some(o) => o,
        None => {
            return json_response(StatusCode::BAD_REQUEST, "{\"error\":\"快照必须是 JSON 对象\"}")
        }
    };

    // 顶层字段白名单：拒绝任何未在 SnapshotBlob 中定义的键
    for k in obj.keys() {
        if !SNAPSHOT_TOP_KEYS.contains(&k.as_str()) {
            return json_response(
                StatusCode::BAD_REQUEST,
                "{\"error\":\"快照含未知顶层字段\"}",
            );
        }
    }

    // 必需字段与类型校验（不再仅依赖可伪造的 format 字符串）
    let format_ok = obj.get("format").and_then(|f| f.as_str()) == Some(SNAPSHOT_FORMAT);
    if !format_ok {
        return json_response(
            StatusCode::BAD_REQUEST,
            "{\"error\":\"不支持的快照格式\"}",
        );
    }
    if obj.get("exportedAt").and_then(|v| v.as_str()).is_none() {
        return json_response(
            StatusCode::BAD_REQUEST,
            "{\"error\":\"缺少或无效的 exportedAt\"}",
        );
    }
    if !obj.get("schema").map(|v| v.is_object()).unwrap_or(false) {
        return json_response(
            StatusCode::BAD_REQUEST,
            "{\"error\":\"缺少或无效的 schema\"}",
        );
    }

    // 转发给前端导入（前端监听 snapshot-incoming 事件写入本地存储）
    if let Err(e) = st.app.emit("snapshot-incoming", body) {
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
