// ============================================================
// 殿堂触角 · 多通道推送引擎
// 蓝图定义：
//   浏览器通知（Web Notification API）
//   桌面通知（Tauri notification）
//   邮件通知（模拟通道）
//   应用内通知（in-app）
//   小组件通知（widget）
//   渠道偏好管理
//   渠道降级策略
//   推送状态追踪
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'
import { emitOsNotification } from '../../engine/os-notification'
import { isOsNotificationBlocked } from '../../engine/compliance-gate'
import { getEffectMultiplier } from '../../engine/constitution-effect'
import { isSabbathOn } from '../../composables/useDigitalSabbath'
import { hasCapability } from '../../utils/platform'
import type { PushChannelType } from './notification-strategy'

// ---- 外部链接打开（Tauri 感知，移动端安全）----
// 在系统浏览器中打开外部链接：Tauri 环境（桌面/移动）调起系统浏览器，
// 纯 Web 构建（无 Tauri 运行时）回退 window.open，保证降级可用。
async function openExternal(url: string): Promise<void> {
  try {
    const { openUrl } = await import('@tauri-apps/plugin-opener')
    await openUrl(url)
  } catch {
    window.open(url, '_blank')
  }
}

// ---- 类型定义 ----

/** 渠道能力 */
export interface ChannelCapability {
  /** 是否支持图标 */
  icon: boolean
  /** 是否支持图片 */
  image: boolean
  /** 是否支持富文本 */
  richText: boolean
  /** 是否支持交互按钮 */
  actionButtons: boolean
  /** 是否支持声音 */
  sound: boolean
  /** 是否支持振动 */
  vibration: boolean
  /** 是否需要用户授权 */
  requiresPermission: boolean
  /** 最大标题长度 */
  maxTitleLength: number
  /** 最大消息长度 */
  maxMessageLength: number
}

/** 渠道配置 */
export interface ChannelConfig {
  /** 渠道类型 */
  type: PushChannelType
  /** 是否启用 */
  enabled: boolean
  /** 优先级（数值越大越优先） */
  priority: number
  /** 每日最大推送数 */
  maxDailyPush: number
  /** 今日已推送数 */
  todayPushCount: number
  /** 今日推送日期 */
  todayPushDate: string
  /** 渠道能力 */
  capability: ChannelCapability
  /** 权限状态 */
  permissionStatus: 'granted' | 'denied' | 'prompt' | 'unsupported'
  /** 上次推送时间 */
  lastPushAt: string | null
}

/** 推送结果 */
export interface PushResult {
  /** 是否成功 */
  success: boolean
  /** 使用的渠道 */
  channel: PushChannelType
  /** 错误信息 */
  error?: string
  /** 推送时间 */
  pushedAt: string
  /** 消息ID */
  messageId: string
}

/** 推送请求 */
export interface PushRequest {
  /** 标题 */
  title: string
  /** 消息体 */
  message: string
  /** 图标 URL */
  icon?: string
  /** 图片 URL */
  image?: string
  /** 点击后跳转 URL */
  url?: string
  /** 动作按钮 */
  actions?: { title: string; action: string }[]
  /** 是否需要声音 */
  requireSound?: boolean
  /** 标签（用于分组） */
  tag?: string
  /** 过期时间（毫秒） */
  ttl?: number
}

/** 推送记录 */
export interface PushRecord {
  id: string
  channel: PushChannelType
  title: string
  message: string
  success: boolean
  error?: string
  openedAt: string | null
  clickedAt: string | null
  dismissedAt: string | null
  pushedAt: string
  responseTimeMs: number | null
}

// ---- 渠道能力定义 ----

export const CHANNEL_CAPABILITIES: Record<PushChannelType, ChannelCapability> = {
  browser: {
    icon: true,
    image: true,
    richText: false,
    actionButtons: true,
    sound: true,
    vibration: true,
    requiresPermission: true,
    maxTitleLength: 100,
    maxMessageLength: 200,
  },
  desktop: {
    icon: true,
    image: true,
    richText: true,
    actionButtons: true,
    sound: true,
    vibration: false,
    requiresPermission: true,
    maxTitleLength: 150,
    maxMessageLength: 500,
  },
  email: {
    icon: false,
    image: true,
    richText: true,
    actionButtons: true,
    sound: false,
    vibration: false,
    requiresPermission: false,
    maxTitleLength: 200,
    maxMessageLength: 5000,
  },
  'in-app': {
    icon: true,
    image: false,
    richText: true,
    actionButtons: true,
    sound: true,
    vibration: false,
    requiresPermission: false,
    maxTitleLength: 80,
    maxMessageLength: 300,
  },
  widget: {
    icon: true,
    image: false,
    richText: false,
    actionButtons: false,
    sound: false,
    vibration: false,
    requiresPermission: false,
    maxTitleLength: 50,
    maxMessageLength: 100,
  },
}

/** 渠道标签 */
export const CHANNEL_LABELS: Record<PushChannelType, string> = {
  browser: '浏览器通知',
  desktop: '桌面通知',
  email: '邮件通知',
  'in-app': '应用内通知',
  widget: '桌面小组件',
}

/** 渠道图标 */
export const CHANNEL_ICONS: Record<PushChannelType, string> = {
  browser: '🌐',
  desktop: '🖥',
  email: '📧',
  'in-app': '📱',
  widget: '🧩',
}

// ---- 默认配置 ----

function createDefaultChannelConfig(type: PushChannelType): ChannelConfig {
  return {
    type,
    // 宪法第5/52条：所有推送渠道默认关闭，绝不在用户未显式开启时主动推送
    enabled: false,
    priority: type === 'browser' ? 5 : type === 'in-app' ? 4 : type === 'desktop' ? 3 : type === 'email' ? 2 : 1,
    maxDailyPush: type === 'email' ? 3 : type === 'widget' ? 10 : 20,
    todayPushCount: 0,
    todayPushDate: '',
    capability: CHANNEL_CAPABILITIES[type],
    permissionStatus: type === 'browser' || type === 'desktop' ? 'prompt' : 'granted',
    lastPushAt: null,
  }
}

export const DEFAULT_CHANNEL_CONFIGS: ChannelConfig[] = [
  createDefaultChannelConfig('browser'),
  createDefaultChannelConfig('desktop'),
  createDefaultChannelConfig('email'),
  createDefaultChannelConfig('in-app'),
  createDefaultChannelConfig('widget'),
]

// ---- 存储键 ----

const STORAGE_KEYS = {
  channels: 'hf:touchpoints:push_channels',
  records: 'hf:touchpoints:push_records',
  fallbackLog: 'hf:touchpoints:fallback_log',
}

// ============================================================
// 多通道推送引擎
// ============================================================

export function usePushChannel() {
  const channels = ref<ChannelConfig[]>(
    storage.getKV<ChannelConfig[]>(STORAGE_KEYS.channels, [...DEFAULT_CHANNEL_CONFIGS]),
  )
  const records = ref<PushRecord[]>(
    storage.getKV<PushRecord[]>(STORAGE_KEYS.records, []),
  )

  function persist() {
    resetDailyCounts()
    storage.setKV(STORAGE_KEYS.channels, channels.value)
    storage.setKV(STORAGE_KEYS.records, records.value)
  }

  /** 重置每日计数 */
  function resetDailyCounts() {
    const today = new Date().toISOString().slice(0, 10)
    for (const ch of channels.value) {
      if (ch.todayPushDate !== today) {
        ch.todayPushCount = 0
        ch.todayPushDate = today
      }
    }
  }

  // ---- 渠道管理 ----

  /** 获取渠道配置 */
  function getChannel(type: PushChannelType): ChannelConfig | undefined {
    return channels.value.find(c => c.type === type)
  }

  /** 更新渠道配置 */
  function updateChannel(type: PushChannelType, updates: Partial<ChannelConfig>) {
    const ch = channels.value.find(c => c.type === type)
    if (!ch) return
    Object.assign(ch, updates)
    persist()
  }

  /** 启用/禁用渠道 */
  function toggleChannel(type: PushChannelType) {
    const ch = channels.value.find(c => c.type === type)
    if (!ch) return
    ch.enabled = !ch.enabled
    persist()
  }

  /** 设置渠道优先级 */
  function setChannelPriority(type: PushChannelType, priority: number) {
    const ch = channels.value.find(c => c.type === type)
    if (!ch) return
    ch.priority = priority
    persist()
  }

  /** 请求渠道权限 */
  async function requestPermission(type: PushChannelType): Promise<boolean> {
    const ch = channels.value.find(c => c.type === type)
    if (!ch) return false

    if (type === 'browser') {
      if (isOsNotificationBlocked()) return false
      if (!('Notification' in window)) {
        ch.permissionStatus = 'unsupported'
        persist()
        return false
      }

      try {
        const permission = await Notification.requestPermission()
        ch.permissionStatus = permission as 'granted' | 'denied' | 'prompt'
        persist()
        return permission === 'granted'
      } catch {
        ch.permissionStatus = 'denied'
        persist()
        return false
      }
    }

    // 桌面通知通过 Tauri
    if (type === 'desktop') {
      if (isOsNotificationBlocked()) return false
      if (hasCapability('tauriApi')) {
        ch.permissionStatus = 'granted'
        persist()
        return true
      }
      ch.permissionStatus = 'unsupported'
      persist()
      return false
    }

    // email / in-app / widget 无需权限
    ch.permissionStatus = 'granted'
    persist()
    return true
  }

  /** 检测渠道可用性 */
  function isChannelAvailable(type: PushChannelType): boolean {
    const ch = channels.value.find(c => c.type === type)
    if (!ch) return false
    if (!ch.enabled) return false
    if (ch.permissionStatus === 'denied' || ch.permissionStatus === 'unsupported') return false

    // 宪法第50条：数字安息日（每周日）→ 不接收任何通知
    if (isSabbathOn()) return false

    // 宪法「通知频率」软效果（宪法之实）：reduce 到 X% 时，每日上限同步降低
    const dailyCap = Math.max(0, Math.floor(ch.maxDailyPush * getEffectMultiplier('ui:notification')))
    if (ch.todayPushCount >= dailyCap) return false

    // 宪法第5条：禁止 OS 级主动推送（浏览器/桌面通知）
    if ((type === 'browser' || type === 'desktop') && isOsNotificationBlocked()) return false

    if (type === 'browser') return 'Notification' in window
    if (type === 'desktop') return hasCapability('tauriApi')
    return true
  }

  /** 获取可用渠道列表（按优先级排序） */
  function getAvailableChannels(): PushChannelType[] {
    return channels.value
      .filter(c => isChannelAvailable(c.type))
      .sort((a, b) => b.priority - a.priority)
      .map(c => c.type)
  }

  /**
   * 宪法门控：第5条「按需开启/无推送」启用时，阻断 OS 级主动推送。
   * 已抽离为共享单一真源 `engine/compliance-gate` 的 isOsNotificationBlocked，
   * 此处直接复用，确保全发射端到端 fail-closed（详见 compliance-gate.ts）。
   */

  // ---- 推送执行 ----

  /** 通过浏览器推送 */
  function pushViaBrowser(request: PushRequest): Promise<PushResult> {
    const messageId = `browser_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

    return new Promise((resolve) => {
      if (!('Notification' in window)) {
        resolve({
          success: false,
          channel: 'browser',
          error: '浏览器不支持通知',
          pushedAt: new Date().toISOString(),
          messageId,
        })
        return
      }

      // 宪法第5条门控：禁止主动推送系统通知
      if (isOsNotificationBlocked()) {
        resolve({
          success: false,
          channel: 'browser',
          error: '宪法禁止主动推送系统通知',
          pushedAt: new Date().toISOString(),
          messageId,
        })
        return
      }

      if (Notification.permission !== 'granted') {
        resolve({
          success: false,
          channel: 'browser',
          error: '未获得通知权限',
          pushedAt: new Date().toISOString(),
          messageId,
        })
        return
      }

      // 统一入口发射（宪法第5条门控在 emitOsNotification 内端到端 fail-closed）
      const notification = emitOsNotification({
        title: request.title,
        options: {
          body: request.message,
          icon: request.icon,
          tag: request.tag ?? 'heartflow',
          requireInteraction: false,
          silent: !request.requireSound,
        },
      })

      if (!notification) {
        resolve({
          success: false,
          channel: 'browser',
          error: '推送失败',
          pushedAt: new Date().toISOString(),
          messageId,
        })
        return
      }

      if (request.actions?.length) {
        request.actions.forEach(_a => {
          // 浏览器通知的动作按钮支持有限
        })
      }

      notification.onclick = () => {
        recordInteraction(messageId, 'clicked')
        if (request.url) {
          void openExternal(request.url)
        }
        notification.close()
      }

      notification.onclose = () => {
        recordInteraction(messageId, 'dismissed')
      }

      const ch = getChannel('browser')
      if (ch) {
        ch.todayPushCount++
        ch.lastPushAt = new Date().toISOString()
      }
      persist()

      resolve({
        success: true,
        channel: 'browser',
        pushedAt: new Date().toISOString(),
        messageId,
      })
    })
  }

  /** 通过桌面推送 (Tauri) */
  function pushViaDesktop(request: PushRequest): Promise<PushResult> {
    const messageId = `desktop_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

    return new Promise((resolve) => {
      // 宪法第5条门控：禁止 OS 级通知（含桌面与降级浏览器通知）
      if (isOsNotificationBlocked()) {
        resolve({
          success: false,
          channel: 'desktop',
          error: '宪法禁止主动推送系统通知',
          pushedAt: new Date().toISOString(),
          messageId,
        })
        return
      }

      if (!hasCapability('tauriApi')) {
        resolve({
          success: false,
          channel: 'desktop',
          error: 'Tauri 环境不可用',
          pushedAt: new Date().toISOString(),
          messageId,
        })
        return
      }

      // 模拟 Tauri 通知
      try {
        // 在实际 Tauri 环境中调用 notification API
        // await tauri.notification.sendNotification({
        //   title: request.title,
        //   body: request.message,
        //   icon: request.icon,
        // })

        // 降级为浏览器通知（宪法门控与权限检查在统一入口 emitOsNotification 内执行）
        emitOsNotification({
          title: request.title,
          options: {
            body: request.message,
            icon: request.icon,
          },
        })

        const ch = getChannel('desktop')
        if (ch) {
          ch.todayPushCount++
          ch.lastPushAt = new Date().toISOString()
        }
        persist()

        resolve({
          success: true,
          channel: 'desktop',
          pushedAt: new Date().toISOString(),
          messageId,
        })
      } catch (err: any) {
        resolve({
          success: false,
          channel: 'desktop',
          error: err?.message ?? '桌面推送失败',
          pushedAt: new Date().toISOString(),
          messageId,
        })
      }
    })
  }

  /** 通过邮件推送（模拟通道） */
  function pushViaEmail(request: PushRequest): Promise<PushResult> {
    const messageId = `email_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

    return new Promise((resolve) => {
      // 邮件通道为模拟实现，记录日志
      console.log(`[Email Push] ${request.title}: ${request.message}`)

      const ch = getChannel('email')
      if (ch) {
        ch.todayPushCount++
        ch.lastPushAt = new Date().toISOString()
      }
      persist()

      resolve({
        success: true,
        channel: 'email',
        pushedAt: new Date().toISOString(),
        messageId,
      })
    })
  }

  /** 应用内推送 */
  function pushViaInApp(_request: PushRequest): Promise<PushResult> {
    const messageId = `inapp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

    return new Promise((resolve) => {
      const ch = getChannel('in-app')
      if (ch) {
        ch.todayPushCount++
        ch.lastPushAt = new Date().toISOString()
      }
      persist()

      resolve({
        success: true,
        channel: 'in-app',
        pushedAt: new Date().toISOString(),
        messageId,
      })
    })
  }

  /** 小组件推送 */
  function pushViaWidget(_request: PushRequest): Promise<PushResult> {
    const messageId = `widget_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

    return new Promise((resolve) => {
      const ch = getChannel('widget')
      if (ch) {
        ch.todayPushCount++
        ch.lastPushAt = new Date().toISOString()
      }
      persist()

      resolve({
        success: true,
        channel: 'widget',
        pushedAt: new Date().toISOString(),
        messageId,
      })
    })
  }

  /** 渠道推送分发器 */
  const channelPushers: Record<PushChannelType, (req: PushRequest) => Promise<PushResult>> = {
    browser: pushViaBrowser,
    desktop: pushViaDesktop,
    email: pushViaEmail,
    'in-app': pushViaInApp,
    widget: pushViaWidget,
  }

  // ---- 智能推送 ----

  /** 推送消息（智能选择渠道） */
  async function push(
    request: PushRequest,
    preferredChannels?: PushChannelType[],
  ): Promise<PushResult> {
    const availableChannels = preferredChannels ?? getAvailableChannels()

    // 按优先级尝试各渠道
    const sortedChannels = availableChannels
      .filter(c => isChannelAvailable(c))
      .sort((a, b) => {
        const pa = channels.value.find(ch => ch.type === a)?.priority ?? 0
        const pb = channels.value.find(ch => ch.type === b)?.priority ?? 0
        return pb - pa
      })

    if (sortedChannels.length === 0) {
      return {
        success: false,
        channel: 'browser',
        error: '无可用推送渠道',
        pushedAt: new Date().toISOString(),
        messageId: `none_${Date.now()}`,
      }
    }

    const result = await channelPushers[sortedChannels[0]](request)
    addRecord(result, request)
    return result
  }

  /** 多通道同时推送 */
  async function pushMultiChannel(
    request: PushRequest,
    channels: PushChannelType[],
  ): Promise<PushResult[]> {
    const results = await Promise.all(
      channels
        .filter(c => isChannelAvailable(c))
        .map(c => channelPushers[c](request)),
    )

    for (const result of results) {
      addRecord(result, request)
    }

    return results
  }

  /** 带降级策略的推送 */
  async function pushWithFallback(
    request: PushRequest,
    primaryChannels: PushChannelType[],
    fallbackChannels: PushChannelType[],
  ): Promise<PushResult> {
    // 先尝试主渠道
    const primaryResult = await push(request, primaryChannels)
    if (primaryResult.success) return primaryResult

    // 主渠道失败，降级到备用渠道
    if (fallbackChannels.length > 0) {
      return push(request, fallbackChannels)
    }

    return primaryResult
  }

  // ---- 记录管理 ----

  /** 添加推送记录 */
  function addRecord(result: PushResult, request: PushRequest) {
    const record: PushRecord = {
      id: result.messageId,
      channel: result.channel,
      title: request.title,
      message: request.message,
      success: result.success,
      error: result.error,
      openedAt: null,
      clickedAt: null,
      dismissedAt: null,
      pushedAt: result.pushedAt,
      responseTimeMs: null,
    }
    records.value.push(record)

    // 保留最近 500 条
    if (records.value.length > 500) {
      records.value = records.value.slice(-500)
    }
    persist()
  }

  /** 记录交互 */
  function recordInteraction(
    messageId: string,
    action: 'opened' | 'clicked' | 'dismissed',
  ) {
    const record = records.value.find(r => r.id === messageId)
    if (!record) return

    const now = new Date().toISOString()
    switch (action) {
      case 'opened':
        record.openedAt = now
        break
      case 'clicked':
        record.clickedAt = now
        break
      case 'dismissed':
        record.dismissedAt = now
        break
    }

    if (action === 'clicked' || action === 'opened') {
      record.responseTimeMs = new Date(now).getTime() - new Date(record.pushedAt).getTime()
    }

    persist()
  }

  /** 清理旧记录 */
  function cleanupOldRecords(daysToKeep: number = 30) {
    const cutoff = Date.now() - daysToKeep * 86400000
    records.value = records.value.filter(r => new Date(r.pushedAt).getTime() > cutoff)
    persist()
  }

  // ---- 统计 ----

  /** 获取推送统计 */
  function getPushStats() {
    const today = new Date().toISOString().slice(0, 10)
    const todayRecords = records.value.filter(r => r.pushedAt.slice(0, 10) === today)

    const total = todayRecords.length
    const success = todayRecords.filter(r => r.success).length
    const opened = todayRecords.filter(r => r.openedAt).length
    const clicked = todayRecords.filter(r => r.clickedAt).length
    const dismissed = todayRecords.filter(r => r.dismissedAt).length

    const responseTimes = todayRecords
      .filter(r => r.responseTimeMs !== null)
      .map(r => r.responseTimeMs!)
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0

    return {
      total,
      success,
      opened,
      clicked,
      dismissed,
      openRate: total > 0 ? opened / total : 0,
      clickRate: total > 0 ? clicked / total : 0,
      dismissRate: total > 0 ? dismissed / total : 0,
      avgResponseTimeMs: avgResponseTime,
    }
  }

  /** 获取渠道对比 */
  function getChannelComparison() {
    const comparison: Record<PushChannelType, {
      total: number
      success: number
      clicked: number
      clickRate: number
    }> = {} as any

    for (const channel of ['browser', 'desktop', 'email', 'in-app', 'widget'] as PushChannelType[]) {
      const channelRecords = records.value.filter(r => r.channel === channel)
      const total = channelRecords.length
      const success = channelRecords.filter(r => r.success).length
      const clicked = channelRecords.filter(r => r.clickedAt).length
      comparison[channel] = {
        total,
        success,
        clicked,
        clickRate: total > 0 ? clicked / total : 0,
      }
    }
    return comparison
  }

  // ---- 计算属性 ----

  const enabledChannels = computed(() => channels.value.filter(c => c.enabled))

  const availableChannels = computed(() => getAvailableChannels())

  const channelStatus = computed(() => {
    return channels.value.map(c => ({
      type: c.type,
      label: CHANNEL_LABELS[c.type],
      icon: CHANNEL_ICONS[c.type],
      enabled: c.enabled,
      available: isChannelAvailable(c.type),
      permission: c.permissionStatus,
      todayCount: c.todayPushCount,
      maxDaily: c.maxDailyPush,
      priority: c.priority,
    }))
  })

  const pushStats = computed(() => getPushStats())

  return {
    channels,
    records,
    enabledChannels,
    availableChannels,
    channelStatus,
    pushStats,
    getChannel,
    updateChannel,
    toggleChannel,
    setChannelPriority,
    requestPermission,
    isChannelAvailable,
    getAvailableChannels,
    push,
    pushMultiChannel,
    pushWithFallback,
    recordInteraction,
    cleanupOldRecords,
    getPushStats,
    getChannelComparison,
    persist,
  }
}