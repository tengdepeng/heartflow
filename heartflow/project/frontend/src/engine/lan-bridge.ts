// ============================================================
// 局域网接续 · 后端桥接（B1.4）
// 仅桌面端：在本机启动一个仅绑定 localhost / 私有网段的临时 HTTP 服务，
// 供对端经局域网拉取/推送快照（守宪法第1条本地私有）。
// 独立成文件以避免改动并行会话占用的 tauri-bridge.ts；后端命令
// （cmd_lan_snapshot_serve / cmd_lan_snapshot_stop / cmd_lan_set_shared_snapshot /
//  cmd_lan_take_incoming_snapshot）尚未实现时，safeInvoke 返回 error，由前端 UI 提示，
// 不影响其它功能。
//
// 跨设备闭环（入站模型）：
//  - 接收端「本机开启接收」：startLanSnapshotServer(port, bindHost) 把本机 LAN IP 作 bind_host，
//    使对端能推送进来（默认 127.0.0.1 仅本机可达）。
//  - 发送端「推送到对端」：由 CrossDevicePanel 经 createLanTransportAdapter 把快照 PUT 到对端
//    /snapshot（对端 incoming）。
//  - 接收端「从对端拉取」：importIncomingSnapshot() 取回对端推送进本机 incoming 的快照并接续。
// ============================================================

import { hasCapability } from '../utils/platform'
import { storage } from './storage'

/** 通用命令结果 */
export interface CommandResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

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

async function safeInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<CommandResult<T>> {
  try {
    const invoke = await getInvoke()
    if (!invoke) {
      return { success: false, error: 'Not running in Tauri environment' }
    }
    const data = args ? await invoke<T>(cmd, args) : await invoke<T>(cmd)
    return { success: true, data }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return { success: false, error: message }
  }
}

/** 在本机指定端口开启局域网快照接收服务（仅本地边界绑定） */
export async function startLanSnapshotServer(
  port: number,
  bindHost?: string,
): Promise<CommandResult<void>> {
  if (!hasCapability('tauriApi')) {
    return { success: false, error: '局域网接续在移动端不可用' }
  }
  // bindHost 透传至后端；后端 is_local_bind_host 守门，仅放行 localhost / 私有网段 /
  // .local/.lan/.home，公网/0.0.0.0 一律拒绝（fail-closed，绝不监听全部网卡）。
  // 不传则后端默认 127.0.0.1（仅本机可达，用于同机调试）。
  return safeInvoke<void>('cmd_lan_snapshot_serve', { port, bindHost })
}

/** 关闭本机局域网快照接收服务 */
export async function stopLanSnapshotServer(): Promise<CommandResult<void>> {
  if (!hasCapability('tauriApi')) {
    return { success: true }
  }
  return safeInvoke<void>('cmd_lan_snapshot_stop')
}

/** 取回对端经局域网推送进本机 incoming 的快照（原始 JSON 字符串；无则 null） */
export async function takeIncomingSnapshot(): Promise<CommandResult<string | null>> {
  if (!hasCapability('tauriApi')) {
    return { success: false, error: '局域网接续在移动端不可用' }
  }
  return safeInvoke<string | null>('cmd_lan_take_incoming_snapshot')
}

/**
 * 取回对端推送进本机的快照并真实接续（覆盖本机当前数据）。
 * 失败返回 success:false；对端尚未推送返回 success:false（error 提示）。
 */
export async function importIncomingSnapshot(): Promise<CommandResult<boolean>> {
  if (!hasCapability('tauriApi')) {
    return { success: false, error: '局域网接续在移动端不可用' }
  }
  const res = await takeIncomingSnapshot()
  if (!res.success) {
    return { success: false, error: res.error ?? '取回快照失败' }
  }
  if (!res.data) {
    return { success: false, error: '没有待接续的快照（对端尚未推送）' }
  }
  try {
    // 与 modules/sync/transport.ts 的 SNAPSHOT_FORMAT 保持一致（'hf-snapshot/v1'）
    const blob = JSON.parse(res.data) as {
      format: string
      exportedAt: string
      schema: Record<string, unknown>
    }
    if (blob.format !== 'hf-snapshot/v1') {
      return { success: false, error: `不支持的快照格式：${blob.format}` }
    }
    storage.importAllData(blob.schema)
    return { success: true, data: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : '快照解析失败' }
  }
}

/**
 * 本机发布一份待对端「扫码拉取」的快照（写入后端 shared，供对端经 GET /snapshot 取得）。
 * 用于「扫码即配对」：源端把完整 SnapshotBlob JSON 发布到本机 LAN 服务，
 * 目标端扫码得到本机 URL 后直接 GET /snapshot 拉取并导入，全程零手动填 IP。
 * 后端命令未实现时 safeInvoke 返回 error，由 UI 提示，不影响其它功能。
 */
export async function publishSharedSnapshot(snapshotJson: string): Promise<CommandResult<void>> {
  if (!hasCapability('tauriApi')) {
    return { success: false, error: '局域网接续在移动端不可用' }
  }
  return safeInvoke<void>('cmd_lan_set_shared_snapshot', { snapshot: snapshotJson })
}
