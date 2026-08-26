// ============================================================
// Tauri Bridge — 统一后端命令桥接层
// 对所有 Rust 后端 Tauri 命令进行类型安全封装
// ============================================================

// 平台抽象：复用项目统一平台检测。hasCapability('tauriApi') 在非 Tauri 环境（Web/移动端）
// 恒为 false，用于桌面专属命令的降级（不发起 invoke，返回安全默认值或明确错误）。
import { hasCapability } from '../utils/platform'

// ---- 类型定义 ----

/** AI 消息 */
export interface AiMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/** AI 代理配置（字段名与 Rust serde 对齐） */
export interface AiAgentConfig {
  model_url: string
  api_key: string
  model_name: string
  max_tokens: number
  temperature: number
  /** 宪法第1条 fail-closed：是否允许非 localhost 远程 AI 端点（随每次同步下发后端） */
  allow_external_ai?: boolean
}

/** AI 代理状态（字段名与 Rust serde 对齐） */
export interface AiAgentStatus {
  configured: boolean
  model_name: string
  model_url: string
  max_tokens: number
  temperature: number
}

/** 触角系统状态 */
export interface TouchpointStatus {
  autoStart: boolean
  shortcutCount: number
  overlayActive: boolean
}

/** SQLite 查询结果（JSON 字符串数组） */
export type SqliteQueryResult = string

/** 通用命令结果 */
export interface CommandResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

// ---- 内部辅助 ----

/**
 * 获取 Tauri invoke 函数（懒加载 + 缓存）
 * 仅在 Tauri 环境下可用，否则返回 null
 */
let _invoke: (<T>(cmd: string, args?: Record<string, unknown>) => Promise<T>) | null = null
let _invokeInitialized = false

async function getInvoke() {
  if (_invokeInitialized) return _invoke
  _invokeInitialized = true
  try {
    const mod = await import('@tauri-apps/api/core')
    _invoke = mod.invoke
  } catch {
    _invoke = null
  }
  return _invoke
}

/**
 * 安全调用 Tauri 命令，自动处理异常
 */
async function safeInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<CommandResult<T>> {
  try {
    const invoke = await getInvoke()
    if (!invoke) {
      return { success: false, error: 'Not running in Tauri environment' }
    }
    const data = args
      ? await invoke<T>(cmd, args)
      : await invoke<T>(cmd)
    return { success: true, data }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error(`[TauriBridge] ${cmd} 失败:`, message)
    return { success: false, error: message }
  }
}

// ---- 存储命令 (Storage) ----

/** 从磁盘加载完整 JSON 存储 */
export async function loadStorage(): Promise<CommandResult<string>> {
  return safeInvoke<string>('cmd_load_storage')
}

/** 保存完整 JSON 存储到磁盘 */
export async function saveStorage(data: string): Promise<CommandResult<void>> {
  return safeInvoke<void>('cmd_save_storage', { data })
}

/** 清除磁盘存储 */
export async function clearStorage(): Promise<CommandResult<void>> {
  return safeInvoke<void>('cmd_clear_storage')
}

// ---- SQLite 命令 ----

/** 执行 SQL 查询，返回 JSON 行数组 */
export async function sqliteQuery(query: string): Promise<CommandResult<string>> {
  return safeInvoke<string>('cmd_sqlite_query', { query })
}

/** 执行 SQL 语句（INSERT/UPDATE/DELETE/DDL），返回影响行数 */
export async function sqliteExecute(statement: string): Promise<CommandResult<string>> {
  return safeInvoke<string>('cmd_sqlite_execute', { statement })
}

/** 获取单个键值 */
export async function sqliteGetKv(key: string): Promise<CommandResult<string>> {
  return safeInvoke<string>('cmd_sqlite_get_kv', { key })
}

/** 设置键值 */
export async function sqliteSetKv(key: string, value: string): Promise<CommandResult<void>> {
  return safeInvoke<void>('cmd_sqlite_set_kv', { key, value })
}

/** 删除键值 */
export async function sqliteDeleteKv(key: string): Promise<CommandResult<void>> {
  return safeInvoke<void>('cmd_sqlite_delete_kv', { key })
}

/** 获取所有键值（按 key 排序） */
export async function sqliteGetAllKv(): Promise<CommandResult<string>> {
  return safeInvoke<string>('cmd_sqlite_get_all_kv')
}

/** 备份数据库 */
export async function sqliteBackup(): Promise<CommandResult<string>> {
  return safeInvoke<string>('cmd_sqlite_backup')
}

/** 从备份恢复数据库 */
export async function sqliteRestore(): Promise<CommandResult<void>> {
  return safeInvoke<void>('cmd_sqlite_restore')
}

// ---- AI 代理命令 ----

/** AI 对话 */
export async function aiChat(messages: AiMessage[]): Promise<CommandResult<string>> {
  return safeInvoke<string>('cmd_ai_chat', { messages })
}

/** 情感分析 */
export async function aiAnalyzeSentiment(text: string): Promise<CommandResult<string>> {
  return safeInvoke<string>('cmd_ai_analyze_sentiment', { text })
}

/** 生成摘要 */
export async function aiGenerateSummary(entries: string[]): Promise<CommandResult<string>> {
  return safeInvoke<string>('cmd_ai_generate_summary', { entries })
}

/** 建议下一步行动 */
export async function aiSuggestActions(context: string): Promise<CommandResult<string>> {
  return safeInvoke<string>('cmd_ai_suggest_actions', { context })
}

/** 更新 AI 配置（持久化到 SQLite kv_store） */
export async function aiConfigure(config: AiAgentConfig): Promise<CommandResult<void>> {
  return safeInvoke<void>('cmd_ai_configure', { config })
}

/** 获取 AI 代理状态（不含 API 密钥） */
export async function aiGetStatus(): Promise<CommandResult<AiAgentStatus>> {
  return safeInvoke<AiAgentStatus>('cmd_ai_get_status')
}

// ---- 触角系统命令 (Touchpoints) ----
// 移动端降级约定：以下命令均为桌面专属能力（原生多窗口 / 全局快捷键 / 自启动）。
// 在非 Tauri 环境（hasCapability('tauriApi') === false）直接返回安全默认值或明确错误，且不发起 invoke，
// 避免移动端调用未注册命令导致「command not found」或 Rust 侧 Err 路径。

/** 检查是否开机自启（移动端无自启动概念，直接返回 false） */
export async function checkAutoStart(): Promise<CommandResult<boolean>> {
  if (!hasCapability('tauriApi')) {
    return { success: true, data: false }
  }
  return safeInvoke<boolean>('cmd_check_auto_start')
}

/** 设置开机自启（移动端静默忽略） */
export async function setAutoStart(enabled: boolean): Promise<CommandResult<void>> {
  if (!hasCapability('tauriApi')) {
    return { success: true }
  }
  return safeInvoke<void>('cmd_set_auto_start', { enabled })
}

/** 注册全局快捷键（移动端不支持，返回明确错误） */
export async function registerShortcut(shortcut: string): Promise<CommandResult<void>> {
  if (!hasCapability('tauriApi')) {
    return { success: false, error: '全局快捷键在移动端不可用' }
  }
  return safeInvoke<void>('cmd_register_passing_shortcut', { shortcut })
}

/** 注销所有快捷键（移动端为 no-op） */
export async function unregisterAllShortcuts(): Promise<CommandResult<void>> {
  if (!hasCapability('tauriApi')) {
    return { success: true }
  }
  return safeInvoke<void>('cmd_unregister_all_shortcuts')
}

/**
 * 创建浮动覆盖层窗口
 * 移动端不支持原生多窗口，返回明确错误，由前端改走应用内浮层（Vue 组件）
 * @param color 半透明深色底（注入 body 背景）
 * @param opacity 窗口整体不透明度
 * @param form 覆盖层形态（B2-EXT-1：silent/breath/timeline），经后端 eval 写入 window.__OVERLAY_FORM__
 * @param glow 辉光主色，经后端 eval 写入 window.__OVERLAY_GLOW__（仅改光环色，不改底色）
 * @param showBeacon 是否显示中心呼吸光点（报点，B2-EXT-2）
 * @param showHint 是否显示底部落款（静/息/廊，B2-EXT-2）
 * @param glowIntensity 辉光强度 0~2（B2-EXT-2）
 */
export async function openOverlayWindow(
  color: string,
  opacity: number,
  form?: string,
  glow?: string,
  showBeacon?: boolean,
  showHint?: boolean,
  glowIntensity?: number,
): Promise<CommandResult<void>> {
  if (!hasCapability('tauriApi')) {
    return { success: false, error: '覆盖层窗口在移动端不可用，请使用应用内浮层' }
  }
  return safeInvoke<void>('cmd_open_overlay_window', {
    color,
    opacity,
    form: form ?? 'silent',
    glow: glow ?? '#d8a866',
    show_beacon: showBeacon ?? true,
    show_hint: showHint ?? true,
    glow_intensity: glowIntensity ?? 1.0,
  })
}

/** 关闭覆盖层窗口（移动端为 no-op） */
export async function closeOverlayWindow(): Promise<CommandResult<void>> {
  if (!hasCapability('tauriApi')) {
    return { success: true }
  }
  return safeInvoke<void>('cmd_close_overlay_window')
}

/**
 * 订阅后端广播的「会话锁屏」事件。
 * 后端 cmd_start_session_lock_monitor 在用户开启「仅锁屏时显示」模式时启动 OS 监听，
 * 并通过 Tauri 事件 `session-lock` 广播 `{ locked: boolean }`。
 * 移动端无锁屏事件概念，返回 no-op 取消函数（永不触发 handler）。
 */
export async function listenSessionLock(
  handler: (locked: boolean) => void,
): Promise<CommandResult<() => void>> {
  if (!hasCapability('tauriApi')) {
    return { success: true, data: () => {} }
  }
  try {
    const mod = await import('@tauri-apps/api/event')
    const unlisten = await mod.listen<{ locked: boolean }>('session-lock', (e) => {
      handler(e.payload.locked)
    })
    return { success: true, data: unlisten }
  } catch {
    return { success: false, error: 'Not running in Tauri environment' }
  }
}

/**
 * 请求后端启动 OS 会话锁屏监听（桌面专属）。
 * 仅在用户开启「仅锁屏时显示」模式时调用一次；移动端安全降级为 no-op。
 * 后端未实现/未注册该命令时返回 success:false，前端订阅不受影响（锁屏模式仅保持 inert，绝不崩溃）。
 */
export async function startSessionLockMonitor(): Promise<CommandResult<void>> {
  if (!hasCapability('tauriApi')) {
    return { success: true }
  }
  return safeInvoke<void>('cmd_start_session_lock_monitor')
}

/** 获取触角系统状态（移动端无桌面专属能力，返回安全默认） */
export async function getTouchpointStatus(): Promise<CommandResult<TouchpointStatus>> {
  if (!hasCapability('tauriApi')) {
    return { success: true, data: { autoStart: false, shortcutCount: 0, overlayActive: false } }
  }
  return safeInvoke<TouchpointStatus>('cmd_get_touchpoint_status')
}

// ---- 感知层命令 (Perception) ----

/** 系统状态（Tauri 后端采集） */
export interface SystemState {
  /** 活跃窗口标题；null = 不可用 */
  active_window_title: string | null
  /** 系统级电量 0-1；null = 不可用 */
  battery_level: number | null
  /** 是否充电中；null = 不可用 */
  battery_charging: boolean | null
  /** 系统空闲毫秒数 */
  system_idle_ms: number
  /** 系统主题；null = 不可用 */
  system_theme: 'light' | 'dark' | null
  /** 时间戳 */
  timestamp: number
}

/** 获取系统级感知状态（Tauri 专属；web 环境返回 error） */
export async function getSystemState(): Promise<CommandResult<SystemState>> {
  return safeInvoke<SystemState>('cmd_get_system_state')
}

// ---- 批量操作 ----

/** 批量设置多个键值对（用于 SQLite 存储后端的高效写入） */
export async function sqliteSetKvBatch(entries: Array<{ key: string; value: string }>): Promise<CommandResult<void>> {
  try {
    const invoke = await getInvoke()
    if (!invoke) {
      return { success: false, error: 'Not running in Tauri environment' }
    }
    // 逐个写入（Rust 后端暂不支持批量，但 WAL 模式下性能足够）
    for (const { key, value } of entries) {
      await invoke('cmd_sqlite_set_kv', { key, value })
    }
    return { success: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[TauriBridge] sqliteSetKvBatch 失败:', message)
    return { success: false, error: message }
  }
}

/** 获取多个键值 */
export async function sqliteGetKvBatch(keys: string[]): Promise<CommandResult<Record<string, string | null>>> {
  try {
    const invoke = await getInvoke()
    if (!invoke) {
      return { success: false, error: 'Not running in Tauri environment' }
    }
    const result: Record<string, string | null> = {}
    for (const key of keys) {
      try {
        result[key] = await invoke<string>('cmd_sqlite_get_kv', { key })
      } catch {
        result[key] = null
      }
    }
    return { success: true, data: result }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[TauriBridge] sqliteGetKvBatch 失败:', message)
    return { success: false, error: message }
  }
}