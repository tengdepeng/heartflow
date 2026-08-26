// ============================================================
// 数据主权与遗忘退场 · 跨端接续
// 蓝图定义：
//   实现跨设备无缝接续体验
//   会话令牌生成 + 设备配对 + 状态快照 + 接续恢复
//   支持 QR 码配对 + 手动输入令牌
//   衔接而非同步：设备间经本地网络/手动令牌接管同一份数据
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../../engine/storage'
import * as dataPort from '../../../engine/data-port'
import { snapshotConstitutionStatus } from '../../constitution/use-constitution-status'
import type {
  DeviceInfo,
  ContinuitySession,
  ContinuityConfig,
} from '../types'
import {
  createLanTransportAdapter,
  isLocalBoundaryUrl,
  SNAPSHOT_FORMAT,
} from '../../sync'

// ---- 存储键 ----
const DEVICES_KEY = 'hf:continuity_devices'
const SESSIONS_KEY = 'hf:continuity_sessions'
const CONFIG_KEY = 'hf:continuity_config'

// ---- 默认配置 ----

const DEFAULT_CONFIG: ContinuityConfig = {
  enabled: true,
  sessionTTLMinutes: 10,
  autoDiscover: false,
  preserveState: true,
  maxHistorySessions: 20,
}

// ---- 设备检测 ----

function detectCurrentDevice(): DeviceInfo {
  const ua = navigator.userAgent
  let type: DeviceInfo['type'] = 'other'
  let os = 'Unknown'
  let name = '未知设备'

  if (ua.includes('Windows')) {
    os = 'Windows'
    type = 'desktop'
    name = 'Windows 电脑'
  } else if (ua.includes('Mac')) {
    os = 'macOS'
    type = 'desktop'
    name = 'Mac 电脑'
  } else if (ua.includes('Linux') && !ua.includes('Android')) {
    os = 'Linux'
    type = 'desktop'
    name = 'Linux 电脑'
  } else if (ua.includes('Android')) {
    os = 'Android'
    type = 'phone'
    name = 'Android 手机'
  } else if (ua.includes('iPhone') || ua.includes('iPad')) {
    os = 'iOS'
    type = ua.includes('iPad') ? 'tablet' : 'phone'
    name = ua.includes('iPad') ? 'iPad' : 'iPhone'
  }

  return {
    id: `device_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    type,
    os,
    lastSeenAt: Date.now(),
    trusted: true,
  }
}

// ---- 令牌生成 ----

function generateToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const segments: string[] = []
  for (let s = 0; s < 4; s++) {
    let segment = ''
    for (let i = 0; i < 4; i++) {
      segment += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    segments.push(segment)
  }
  return segments.join('-')
}

function generateSessionId(): string {
  return `cs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

// ============================================================
// 主 composable
// ============================================================

export function useCrossDevice() {
  // ---- 状态 ----

  const config = ref<ContinuityConfig>(loadConfig())
  const devices = ref<DeviceInfo[]>(loadDevices())
  const sessions = ref<ContinuitySession[]>(loadSessions())
  const currentDevice = ref<DeviceInfo>(loadOrCreateCurrentDevice())

  /** 当前活跃会话 */
  const activeSession = ref<ContinuitySession | null>(null)

  /** 是否正在配对 */
  const isPairing = ref(false)

  /** 配对超时计时器 */
  const pairingTimeout = ref<number | null>(null)

  /** 接续进度 */
  const continuityProgress = ref(0)
  const continuityStatus = ref('')

  // ---- 持久化 ----

  function loadConfig(): ContinuityConfig {
    try {
      return storage.getKV<ContinuityConfig>(CONFIG_KEY, DEFAULT_CONFIG)
    } catch {
      return { ...DEFAULT_CONFIG }
    }
  }

  function saveConfig() {
    storage.setKV(CONFIG_KEY, config.value)
  }

  function loadDevices(): DeviceInfo[] {
    try {
      return storage.getKV<DeviceInfo[]>(DEVICES_KEY, [])
    } catch {
      return []
    }
  }

  function saveDevices() {
    storage.setKV(DEVICES_KEY, devices.value)
  }

  function loadSessions(): ContinuitySession[] {
    try {
      return storage.getKV<ContinuitySession[]>(SESSIONS_KEY, [])
    } catch {
      return []
    }
  }

  function saveSessions() {
    storage.setKV(SESSIONS_KEY, sessions.value)
  }

  function loadOrCreateCurrentDevice(): DeviceInfo {
    const existing = loadDevices()
    const stored = localStorage.getItem('hf:current_device_id')
    if (stored) {
      const found = existing.find(d => d.id === stored)
      if (found) {
        found.lastSeenAt = Date.now()
        return found
      }
    }
    const device = detectCurrentDevice()
    localStorage.setItem('hf:current_device_id', device.id)
    existing.push(device)
    saveDevices()
    return device
  }

  // ---- 计算属性 ----

  /** 历史会话 */
  const historySessions = computed(() =>
    sessions.value
      .filter(s => s.status === 'completed' || s.status === 'expired' || s.status === 'cancelled')
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, config.value.maxHistorySessions)
  )

  /** 信任设备列表 */
  const trustedDevices = computed(() =>
    devices.value.filter(d => d.trusted)
  )

  /** 是否启用了跨端接续 */
  const isEnabled = computed({
    get: () => config.value.enabled,
    set: (v: boolean) => {
      config.value.enabled = v
      saveConfig()
    },
  })

  // ---- 方法 ----

  /**
   * 创建接续会话（源端）
   * 生成令牌并等待目标设备配对
   */
  function createSession(
    currentRoom: string,
    currentRoute: string,
    stateSnapshot?: Record<string, any>
  ): ContinuitySession {
    // 取消之前的活跃会话
    if (activeSession.value) {
      cancelSession(activeSession.value.sessionId)
    }

    const session: ContinuitySession = {
      sessionId: generateSessionId(),
      sourceDevice: { ...currentDevice.value },
      targetDevice: null,
      token: generateToken(),
      status: 'waiting',
      currentRoom,
      currentRoute,
      stateSnapshot: stateSnapshot || {},
      createdAt: Date.now(),
      expiresAt: Date.now() + config.value.sessionTTLMinutes * 60000,
      pairedAt: null,
      completedAt: null,
    }

    sessions.value.unshift(session)
    saveSessions()
    activeSession.value = session
    isPairing.value = true

    // 设置配对超时
    if (pairingTimeout.value) clearTimeout(pairingTimeout.value)
    pairingTimeout.value = window.setTimeout(() => {
      if (activeSession.value?.sessionId === session.sessionId && session.status === 'waiting') {
        expireSession(session.sessionId)
      }
    }, config.value.sessionTTLMinutes * 60000)

    return session
  }

  /**
   * 配对接续会话（目标端）
   * 输入令牌进行配对
   */
  function pairSession(token: string): ContinuitySession | null {
    const cleanToken = token.toUpperCase().trim()
    const session = sessions.value.find(
      s => s.token === cleanToken && s.status === 'waiting' && s.expiresAt > Date.now()
    )

    if (!session) return null

    session.targetDevice = { ...currentDevice.value }
    session.status = 'paired'
    session.pairedAt = Date.now()
    saveSessions()
    activeSession.value = session

    // 注册目标设备
    if (!devices.value.find(d => d.id === currentDevice.value.id)) {
      devices.value.push({ ...currentDevice.value })
      saveDevices()
    }

    return session
  }

  /**
   * 执行接续传输
   * 将源端数据真实交接给目标端：源端导出 data-port 全量 → 绑定会话；
   * 目标端恢复时经 applyContinuityPayload 真实回写本地存储。
   */
  async function executeContinuity(sessionId: string): Promise<boolean> {
    const session = sessions.value.find(s => s.sessionId === sessionId)
    if (!session || session.status !== 'paired') return false

    // 源端：导出当前全量数据并绑定到会话（真实数据交接的第一棒）
    session.payload = buildContinuityPayload()
    session.status = 'transferring'
    saveSessions()
    activeSession.value = session

    continuityProgress.value = 50
    continuityStatus.value = '已封装源端数据'

    // 给 UI 一个可见的"传输中"节拍（不阻塞真实数据，仅状态过渡）
    await delay(150)
    continuityProgress.value = 100
    continuityStatus.value = '接续完成'
    session.status = 'completed'
    session.completedAt = Date.now()
    saveSessions()
    isPairing.value = false
    activeSession.value = null

    return true
  }

  /**
   * 目标端恢复：把配对会话中的源端数据真实回写本地存储。
   * 返回导入计数（0/n）供 UI 反馈。失败返回 null。
   */
  function recoverContinuity(sessionId: string): dataPort.ImportCounts | null {
    const session = sessions.value.find(s => s.sessionId === sessionId)
    if (!session?.payload) return null
    try {
      const counts = applyContinuityPayload(session.payload)
      continuityStatus.value = '已恢复源端数据'
      return counts
    } catch {
      continuityStatus.value = '恢复失败'
      return null
    }
  }

  /**
   * 目标端：经 LAN 二维码 URL 拉取并导入源端快照（GET 对端 /snapshot）。
   * 守宪法第1条：URL 必须是本地边界地址，否则拒绝。
   */
  async function receiveFromLanUrl(url: string): Promise<{ success: boolean; error?: string }> {
    if (!isLocalBoundaryUrl(url)) {
      return { success: false, error: '拒绝非本地地址（违反宪法第1条本地私有）' }
    }
    try {
      const adapter = createLanTransportAdapter({ peerUrl: url })
      // adapter.import 会 GET 对端 /snapshot 并导入；传入占位 blob 仅用于格式门控
      await adapter.import({
        format: SNAPSHOT_FORMAT,
        exportedAt: new Date().toISOString(),
        schema: {},
      })
      continuityStatus.value = '已从对端拉取并接续本机'
      return { success: true }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : '拉取失败' }
    }
  }

  /**
   * 取消会话
   */
  function cancelSession(sessionId: string) {
    const session = sessions.value.find(s => s.sessionId === sessionId)
    if (session && (session.status === 'waiting' || session.status === 'paired')) {
      session.status = 'cancelled'
      saveSessions()
      if (activeSession.value?.sessionId === sessionId) {
        activeSession.value = null
        isPairing.value = false
      }
    }
  }

  /**
   * 使会话过期
   */
  function expireSession(sessionId: string) {
    const session = sessions.value.find(s => s.sessionId === sessionId)
    if (session && session.status === 'waiting') {
      session.status = 'expired'
      saveSessions()
      if (activeSession.value?.sessionId === sessionId) {
        activeSession.value = null
        isPairing.value = false
      }
    }
  }

  /**
   * 获取会话剩余时间（秒）
   */
  function getSessionRemaining(sessionId: string): number {
    const session = sessions.value.find(s => s.sessionId === sessionId)
    if (!session) return 0
    return Math.max(0, Math.round((session.expiresAt - Date.now()) / 1000))
  }

  /**
   * 获取会话的 QR 码数据
   * 返回用于生成 QR 码的字符串
   */
  function getQRCodeData(sessionId: string): string {
    const session = sessions.value.find(s => s.sessionId === sessionId)
    if (!session) return ''
    return JSON.stringify({
      type: 'heartflow-continuity',
      token: session.token,
      device: session.sourceDevice.name,
      room: session.currentRoom,
      expiresAt: session.expiresAt,
    })
  }

  /**
   * 保存当前应用状态快照
   */
  function captureStateSnapshot(state: Record<string, any>) {
    if (!config.value.preserveState) return
    if (activeSession.value) {
      activeSession.value.stateSnapshot = {
        ...activeSession.value.stateSnapshot,
        ...state,
      }
      saveSessions()
    }
  }

  /**
   * 恢复状态快照
   */
  function restoreStateSnapshot(sessionId: string): Record<string, any> | null {
    const session = sessions.value.find(s => s.sessionId === sessionId)
    if (!session) return null
    return session.stateSnapshot
  }

  /**
   * 添加信任设备
   */
  function trustDevice(deviceId: string) {
    const device = devices.value.find(d => d.id === deviceId)
    if (device) {
      device.trusted = true
      saveDevices()
    }
  }

  /**
   * 移除设备（取消信任）
   */
  function removeDevice(deviceId: string) {
    devices.value = devices.value.filter(d => d.id !== deviceId)
    saveDevices()
  }

  /**
   * 更新配置
   */
  function updateConfig(partial: Partial<ContinuityConfig>) {
    config.value = { ...config.value, ...partial }
    saveConfig()
  }

  /**
   * 清理过期会话
   */
  function cleanupSessions() {
    const now = Date.now()
    sessions.value = sessions.value.filter(s =>
      s.status === 'waiting' || s.status === 'paired' || s.status === 'transferring'
        ? s.expiresAt > now
        : s.createdAt > now - 7 * 86400000 // 保留7天历史
    )
    saveSessions()
  }

  /**
   * 格式化令牌（便于显示）
   */
  function formatToken(token: string): string {
    return token.toUpperCase()
  }

  /**
   * 格式化会话剩余时间
   */
  function formatRemaining(seconds: number): string {
    if (seconds <= 0) return '已过期'
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    if (m > 0) return `${m}分${s}秒`
    return `${s}秒`
  }

  return {
    // 状态
    config,
    devices,
    sessions,
    currentDevice,
    activeSession,
    isPairing,
    continuityProgress,
    continuityStatus,

    // 计算属性
    historySessions,
    trustedDevices,
    isEnabled,

    // 方法
    createSession,
    pairSession,
    executeContinuity,
    recoverContinuity,
    receiveFromLanUrl,
    cancelSession,
    getSessionRemaining,
    getQRCodeData,
    buildLanQrPayload: (sourceLanUrl: string) =>
      buildLanQrPayload(sourceLanUrl, activeSession.value?.token ?? ''),
    parseLanQrPayload,
    captureStateSnapshot,
    restoreStateSnapshot,
    trustDevice,
    removeDevice,
    updateConfig,
    cleanupSessions,
    formatToken,
    formatRemaining,
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ============================================================
// 模块级纯函数（与组件实例解耦，便于单测）
// ============================================================

/** 导出当前全量数据为 data-port JSON 字符串（源端封装） */
export function buildContinuityPayload(): string {
  const payload = {
    exportedAt: new Date().toISOString(),
    version: 2,
    sessions: storage.getSessions(),
    crystals: storage.getCrystals(),
    notes: storage.getNotes(),
    emotions: storage.getEmotions(),
    anchors: storage.getAnchors(),
    goals: storage.getGoals(),
    relations: storage.getRelations(),
    ledger: storage.getLedger(),
    carriers: storage.getCarriers(),
    constitution: storage.getConstitution(),
    // P2.2 · 宪法透明度账本快照：经 B1 跨设备通道同步（守宪法第1条·本地私有）
    constitutionStatus: snapshotConstitutionStatus(),
  }
  return JSON.stringify(payload)
}

/** 将源端导出的 data-port JSON 真实回写本地存储（目标端恢复） */
export function applyContinuityPayload(jsonStr: string): dataPort.ImportCounts {
  return dataPort.importJSON(jsonStr)
}

// ============================================================
// 局域网「扫码即配对」载荷（B1.4 延伸）
// 源端把本机 LAN 端点编码进二维码，目标端扫码即得 URL，零手动填 IP。
// 守宪法第1条：URL 仅允许本地边界（localhost / 私有网段 / .local/.lan/.home）。
// ============================================================

/** 构建 LAN 接续二维码载荷：源端 LAN 端点 + 会话令牌 */
export function buildLanQrPayload(sourceLanUrl: string, token: string): string {
  return JSON.stringify({
    type: 'heartflow-lan',
    url: sourceLanUrl,
    token,
    version: 1,
  })
}

/** 解析 LAN 二维码载荷：校验类型 + 本地边界；非法返回 null */
export function parseLanQrPayload(text: string): { url: string; token: string } | null {
  try {
    const obj = JSON.parse(text) as { type?: unknown; url?: unknown; token?: unknown }
    if (obj?.type !== 'heartflow-lan' || typeof obj.url !== 'string') return null
    if (!isLocalBoundaryUrl(obj.url)) return null
    return { url: obj.url, token: typeof obj.token === 'string' ? obj.token : '' }
  } catch {
    return null
  }
}