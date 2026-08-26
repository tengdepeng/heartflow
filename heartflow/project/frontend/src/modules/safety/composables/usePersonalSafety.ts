// ============================================================
// 安全守护体系 · 人身安全（SOS/跌倒检测）
// 提供紧急联系人管理、SOS触发、跌倒检测、位置共享
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../../engine/storage'
import type { EmergencyContact } from '../types'

// ---- SOS 系统 ----

export type SOSStatus = 'idle' | 'counting' | 'triggered' | 'cancelled' | 'sent'

export interface SOSConfig {
  /** 倒计时秒数（0=立即触发） */
  countdownSeconds: number
  /** 是否自动发送位置 */
  autoSendLocation: boolean
  /** 是否播放警报音 */
  playAlarm: boolean
  /** 是否自动拨打紧急电话 */
  autoDial: boolean
}

export interface SOSEvent {
  id: string
  timestamp: number
  status: SOSStatus
  location?: string
  contactsNotified: string[]
  cancelled: boolean
}

const SOS_STORAGE_KEY = 'hf:sos_events'
const SOS_CONFIG_KEY = 'hf:sos_config'

const DEFAULT_SOS_CONFIG: SOSConfig = {
  countdownSeconds: 5,
  autoSendLocation: true,
  playAlarm: true,
  autoDial: false,
}

// ---- 跌倒检测 ----

export type FallDetectionMethod = 'accelerometer' | 'gyroscope' | 'barometer'

export interface FallDetectionConfig {
  enabled: boolean
  /** 灵敏度 0-1 */
  sensitivity: number
  /** 检测方法 */
  methods: FallDetectionMethod[]
  /** 检测到跌倒后自动触发SOS的延迟秒数 */
  autoSOSDelay: number
  /** 误报取消窗口秒数 */
  cancelWindow: number
}

export interface FallEvent {
  id: string
  timestamp: number
  /** 置信度 0-1 */
  confidence: number
  /** 是否误报 */
  falseAlarm: boolean
  /** 触发SOS */
  triggeredSOS: boolean
  /** 加速度数据快照 */
  acceleration?: { x: number; y: number; z: number }
}

const FALL_STORAGE_KEY = 'hf:fall_events'
const FALL_CONFIG_KEY = 'hf:fall_config'

const DEFAULT_FALL_CONFIG: FallDetectionConfig = {
  enabled: true,
  sensitivity: 0.7,
  methods: ['accelerometer'],
  autoSOSDelay: 10,
  cancelWindow: 15,
}

// ---- 紧急联系人 ----

const CONTACTS_STORAGE_KEY = 'hf:emergency_contacts'

function loadContacts(): EmergencyContact[] {
  try {
    return storage.getKV<EmergencyContact[]>(CONTACTS_STORAGE_KEY, [])
  } catch {
    return []
  }
}

function persistContacts(contacts: EmergencyContact[]) {
  storage.setKV(CONTACTS_STORAGE_KEY, contacts)
}

export function usePersonalSafety() {
  // ---- 紧急联系人 ----
  const contacts = ref<EmergencyContact[]>(loadContacts())

  function addContact(contact: Omit<EmergencyContact, 'id'>): EmergencyContact {
    const entry: EmergencyContact = {
      id: `contact_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      ...contact,
    }
    contacts.value = [...contacts.value, entry]
    persistContacts(contacts.value)
    return entry
  }

  function removeContact(id: string): boolean {
    const idx = contacts.value.findIndex(c => c.id === id)
    if (idx === -1) return false
    contacts.value = contacts.value.filter(c => c.id !== id)
    persistContacts(contacts.value)
    return true
  }

  function updateContact(id: string, partial: Partial<Omit<EmergencyContact, 'id'>>): boolean {
    const idx = contacts.value.findIndex(c => c.id === id)
    if (idx === -1) return false
    contacts.value[idx] = { ...contacts.value[idx], ...partial }
    persistContacts(contacts.value)
    return true
  }

  const primaryContacts = computed(() => contacts.value.filter(c => c.priority === 'primary'))
  const secondaryContacts = computed(() => contacts.value.filter(c => c.priority === 'secondary'))

  // ---- SOS ----
  const sosStatus = ref<SOSStatus>('idle')
  const sosEvents = ref<SOSEvent[]>(
    (() => {
      try { return storage.getKV<SOSEvent[]>(SOS_STORAGE_KEY, []) }
      catch { return [] }
    })(),
  )
  const sosConfig = ref<SOSConfig>(
    (() => {
      try { return storage.getKV<SOSConfig>(SOS_CONFIG_KEY, DEFAULT_SOS_CONFIG) }
      catch { return { ...DEFAULT_SOS_CONFIG } }
    })(),
  )
  let countdownTimer: ReturnType<typeof setInterval> | null = null

  /** 启动 SOS 倒计时 */
  function triggerSOS(location?: string): SOSStatus {
    const config = sosConfig.value
    if (config.countdownSeconds <= 0) {
      return sendSOS(location)
    }

    sosStatus.value = 'counting'
    let remaining = config.countdownSeconds

    countdownTimer = setInterval(() => {
      remaining--
      if (remaining <= 0) {
        if (countdownTimer) clearInterval(countdownTimer)
        sendSOS(location)
      }
    }, 1000)

    return 'counting'
  }

  /** 取消 SOS */
  function cancelSOS(): boolean {
    if (sosStatus.value !== 'counting') return false
    if (countdownTimer) {
      clearInterval(countdownTimer)
      countdownTimer = null
    }
    sosStatus.value = 'cancelled'
    return true
  }

  /** 发送 SOS */
  function sendSOS(location?: string): SOSStatus {
    sosStatus.value = 'sent'
    const event: SOSEvent = {
      id: `sos_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      status: 'sent',
      location,
      contactsNotified: contacts.value.map(c => c.id),
      cancelled: false,
    }
    sosEvents.value = [...sosEvents.value, event]
    try { storage.setKV(SOS_STORAGE_KEY, sosEvents.value) } catch { /* ignore */ }
    return 'sent'
  }

  /** 更新 SOS 配置 */
  function updateSOSConfig(partial: Partial<SOSConfig>) {
    sosConfig.value = { ...sosConfig.value, ...partial }
    try { storage.setKV(SOS_CONFIG_KEY, sosConfig.value) } catch { /* ignore */ }
  }

  // ---- 跌倒检测 ----
  const fallEvents = ref<FallEvent[]>(
    (() => {
      try { return storage.getKV<FallEvent[]>(FALL_STORAGE_KEY, []) }
      catch { return [] }
    })(),
  )
  const fallConfig = ref<FallDetectionConfig>(
    (() => {
      try { return storage.getKV<FallDetectionConfig>(FALL_CONFIG_KEY, DEFAULT_FALL_CONFIG) }
      catch { return { ...DEFAULT_FALL_CONFIG } }
    })(),
  )

  /** 模拟跌倒检测（实际应用中通过加速度计等传感器触发） */
  function detectFall(acceleration: { x: number; y: number; z: number }): FallEvent | null {
    if (!fallConfig.value.enabled) return null

    // 计算合成加速度
    const magnitude = Math.sqrt(
      acceleration.x * acceleration.x +
      acceleration.y * acceleration.y +
      acceleration.z * acceleration.z,
    )

    // 正常重力 ~9.8 m/s²，跌倒时加速度剧烈变化
    // 简化检测：合成加速度偏离重力加速度超过阈值
    const gravity = 9.8
    const deviation = Math.abs(magnitude - gravity)
    const threshold = (1 - fallConfig.value.sensitivity) * 8 + 2 // 灵敏度越高阈值越低
    const confidence = Math.min(1, deviation / (threshold * 2))

    if (deviation < threshold) return null

    const event: FallEvent = {
      id: `fall_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      confidence: Math.round(confidence * 100) / 100,
      falseAlarm: false,
      triggeredSOS: false,
      acceleration,
    }

    fallEvents.value = [event, ...fallEvents.value].slice(0, 100) // 保留最近100条
    try { storage.setKV(FALL_STORAGE_KEY, fallEvents.value) } catch { /* ignore */ }

    // 自动触发 SOS
    if (confidence >= fallConfig.value.sensitivity) {
      setTimeout(() => {
        if (fallConfig.value.autoSOSDelay > 0) {
          triggerSOS()
        }
      }, fallConfig.value.autoSOSDelay * 1000)
    }

    return event
  }

  /** 标记跌倒为误报 */
  function markFalseAlarm(eventId: string): boolean {
    const event = fallEvents.value.find(e => e.id === eventId)
    if (!event) return false
    event.falseAlarm = true
    try { storage.setKV(FALL_STORAGE_KEY, fallEvents.value) } catch { /* ignore */ }
    return true
  }

  /** 更新跌倒检测配置 */
  function updateFallConfig(partial: Partial<FallDetectionConfig>) {
    fallConfig.value = { ...fallConfig.value, ...partial }
    try { storage.setKV(FALL_CONFIG_KEY, fallConfig.value) } catch { /* ignore */ }
  }

  /** 跌倒统计 */
  const fallStats = computed(() => {
    const events = fallEvents.value
    const recent24h = events.filter(e => e.timestamp > Date.now() - 86400000)
    return {
      total: events.length,
      recent24h: recent24h.length,
      falseAlarms: events.filter(e => e.falseAlarm).length,
      triggeredSOS: events.filter(e => e.triggeredSOS).length,
      avgConfidence: events.length > 0
        ? Math.round(events.reduce((s, e) => s + e.confidence, 0) / events.length * 100) / 100
        : 0,
    }
  })

  /** 重置 SOS 状态 */
  function resetSOS() {
    sosStatus.value = 'idle'
    if (countdownTimer) {
      clearInterval(countdownTimer)
      countdownTimer = null
    }
  }

  return {
    // 紧急联系人
    contacts,
    primaryContacts,
    secondaryContacts,
    addContact,
    removeContact,
    updateContact,
    // SOS
    sosStatus,
    sosEvents,
    sosConfig,
    triggerSOS,
    cancelSOS,
    resetSOS,
    updateSOSConfig,
    // 跌倒检测
    fallEvents,
    fallConfig,
    fallStats,
    detectFall,
    markFalseAlarm,
    updateFallConfig,
  }
}