// ============================================================
// 守护室（GuardRoom）数据层组合式函数
// 将视图中多处裸的 storage.getKV / setKV / removeKV 调用统一下沉，
// 所有存储键原值与行为严格保留。
// 模式：模块级单例 ref + useGuard() 组合式 + storage 下沉。
// ============================================================

import { ref, watch } from 'vue'
import { storage } from '../../engine/storage'

// ---- 类型定义 ----
export interface GuardSessionActivity {
  id: string
  at: string
  action: string
}

export interface GuardContact {
  id: string
  name: string
  phone: string
  priority: 'primary' | 'secondary'
}

export interface GuardVisitLog {
  id: string
  at: string
  action: string
}

export type GuardPermissionStatus = 'authorized' | 'unauthorized' | 'revoked'

export interface GuardPermissionLight {
  key: string
  label: string
  status: GuardPermissionStatus
  statusText: string
}

export type GuardCrashLevel = 'recovered' | 'warning' | 'error'

export interface GuardCrashLog {
  id: string
  at: string
  level: GuardCrashLevel
  message: string
}

// ---- 存储键（严格保留原值）----
const SESSION_KEY = 'hf:session_activity'
const CONTACTS_KEY = 'hf:contacts'
const VISITS_KEY = 'hf:guard_visits'
const PERMISSION_LIGHTS_KEY = 'hf:guard_permission_lights'
const CRASH_LOG_KEY = 'hf:guard_crash_logs'
// 隐私控制存储键（守宪法第1条：本地私有，用户偏好真实持久化）
const ANON_MODE_KEY = 'hf:guard_anonymous_mode'
const DATA_REFLUX_KEY = 'hf:guard_data_reflux'
const EXTERNAL_LINK_KEY = 'hf:guard_external_link'

// ============================================================
// 模块级单例 ref
// ============================================================
const sessionActivity = ref<GuardSessionActivity[]>([])
const contacts = ref<GuardContact[]>([])
const visitLogs = ref<GuardVisitLog[]>([])
const permissionLights = ref<GuardPermissionLight[]>(defaultPermissionLights())
const crashLogs = ref<GuardCrashLog[]>([])
// 数据回流总开关（UI 状态，跨视图统计概览与治理台共享，统一下沉为单例）
const dataReflux = ref(false)
// 匿名模式（UI 状态，治理台隐私治理写入、安全台评分详情读取，统一下沉为单例）
const anonymousMode = ref(false)
// 外部链接控制（UI 状态，安全台网络开关写入、安全台及视图评分读取，统一下沉为单例）
const externalLinkControl = ref(true)

// ---- 权限光点默认值 ----
function defaultPermissionLights(): GuardPermissionLight[] {
  return [
    { key: 'data-security', label: '数据安全', status: 'authorized', statusText: '已授权' },
    { key: 'property-security', label: '财产安全', status: 'authorized', statusText: '已授权' },
    { key: 'personal-safety', label: '人身安全', status: 'unauthorized', statusText: '未授权' },
    { key: 'psychological-safety', label: '心理安全', status: 'authorized', statusText: '已授权' },
  ]
}

// ============================================================
// 会话活跃度
// ============================================================
function loadSessionActivity() {
  try {
    sessionActivity.value = storage.getKV<GuardSessionActivity[]>(SESSION_KEY, [])
  } catch {
    sessionActivity.value = []
  }
}

function saveSessionActivity() {
  storage.setKV(SESSION_KEY, sessionActivity.value)
}

function clearSessionActivity() {
  sessionActivity.value = []
  saveSessionActivity()
}

// ============================================================
// 紧急联系人
// ============================================================
function loadContacts() {
  try {
    contacts.value = storage.getKV<GuardContact[]>(CONTACTS_KEY, [])
  } catch {
    contacts.value = []
  }
}

function saveContacts() {
  storage.setKV(CONTACTS_KEY, contacts.value)
}

function addContact(name: string, phone: string, priority: GuardContact['priority']) {
  contacts.value.push({
    id: `c${Date.now()}`,
    name,
    phone,
    priority,
  })
  saveContacts()
}

function removeContact(id: string) {
  contacts.value = contacts.value.filter(c => c.id !== id)
  saveContacts()
}

function updateContact(id: string, data: Partial<Pick<GuardContact, 'name' | 'phone' | 'priority'>>) {
  const c = contacts.value.find(c => c.id === id)
  if (!c) return
  Object.assign(c, data)
  saveContacts()
}

// ============================================================
// 访问记录
// ============================================================
function loadVisits() {
  try {
    visitLogs.value = storage.getKV<GuardVisitLog[]>(VISITS_KEY, [])
  } catch {
    visitLogs.value = []
  }
}

function saveVisits() {
  storage.setKV(VISITS_KEY, visitLogs.value)
}

function addVisitLog() {
  visitLogs.value.unshift({
    id: `v${Date.now()}`,
    at: new Date().toISOString(),
    action: '访问守护室',
  })
  saveVisits()
}

function clearVisitLog(id: string) {
  visitLogs.value = visitLogs.value.filter(l => l.id !== id)
  saveVisits()
}

// ============================================================
// 权限光点
// ============================================================
function loadPermissionLights() {
  try {
    permissionLights.value = storage.getKV<GuardPermissionLight[]>(PERMISSION_LIGHTS_KEY, defaultPermissionLights())
  } catch {
    permissionLights.value = defaultPermissionLights()
  }
}

function savePermissionLights() {
  storage.setKV(PERMISSION_LIGHTS_KEY, permissionLights.value)
}

function cyclePermissionStatus(key: string) {
  const perm = permissionLights.value.find(p => p.key === key)
  if (!perm) return
  const order: GuardPermissionStatus[] = ['authorized', 'unauthorized', 'revoked']
  const idx = order.indexOf(perm.status)
  perm.status = order[(idx + 1) % order.length]
  perm.statusText =
    perm.status === 'authorized' ? '已授权' : perm.status === 'unauthorized' ? '未授权' : '已撤销'
  savePermissionLights()
}

// ============================================================
// 崩溃恢复日志
// ============================================================
function loadCrashLogs() {
  try {
    crashLogs.value = storage.getKV<GuardCrashLog[]>(CRASH_LOG_KEY, [])
  } catch {
    crashLogs.value = []
  }
}

function saveCrashLogs() {
  storage.setKV(CRASH_LOG_KEY, crashLogs.value)
}

const CRASH_MESSAGES: Record<GuardCrashLevel, string> = {
  recovered: '系统从上次异常中自动恢复，数据完整性验证通过。',
  warning: '检测到存储写入延迟，已自动重试成功。',
  error: '存储模块初始化异常，已回退至安全模式。',
}

function addCrashLog(level: GuardCrashLevel = 'recovered') {
  crashLogs.value.unshift({
    id: `crash_${Date.now()}`,
    at: new Date().toISOString(),
    level,
    message: CRASH_MESSAGES[level] || CRASH_MESSAGES.recovered,
  })
  saveCrashLogs()
}

function removeCrashLog(id: string) {
  crashLogs.value = crashLogs.value.filter(l => l.id !== id)
  saveCrashLogs()
}

function clearCrashLogs() {
  crashLogs.value = []
  saveCrashLogs()
}

// ============================================================
// 数据完整性辅助：检测某键是否真实存在
// ============================================================
function isKeyPresent(key: string): boolean {
  try {
    return storage.getKV(key, null) !== null
  } catch {
    return false
  }
}

// ============================================================
// 统一加载（在视图 onMounted 时调用，重置单例）
// ============================================================
function load() {
  loadSessionActivity()
  loadContacts()
  loadVisits()
  loadPermissionLights()
  loadCrashLogs()
  loadPrivacyControls()
}

// ============================================================
// 隐私控制（匿名模式 / 数据回流 / 外部链接控制）
// 守宪法第1条：本地私有——用户偏好真实持久化，刷新不丢。
// ============================================================
function loadPrivacyControls() {
  try { anonymousMode.value = storage.getKV<boolean>(ANON_MODE_KEY, false) } catch { /* 默认 false */ }
  try { dataReflux.value = storage.getKV<boolean>(DATA_REFLUX_KEY, false) } catch { /* 默认 false */ }
  try { externalLinkControl.value = storage.getKV<boolean>(EXTERNAL_LINK_KEY, true) } catch { /* 默认 true */ }
}

function savePrivacyControls() {
  storage.setKV(ANON_MODE_KEY, anonymousMode.value)
  storage.setKV(DATA_REFLUX_KEY, dataReflux.value)
  storage.setKV(EXTERNAL_LINK_KEY, externalLinkControl.value)
}

// 隐私开关实时持久化（守宪法第1条本地私有）
watch(anonymousMode, savePrivacyControls)
watch(dataReflux, savePrivacyControls)
watch(externalLinkControl, savePrivacyControls)

/**
 * 使用守护室数据层
 */
export function useGuard() {
  return {
    // 响应式状态
    sessionActivity,
    contacts,
    visitLogs,
    permissionLights,
    crashLogs,
    dataReflux,
    anonymousMode,
    externalLinkControl,
    // 统一加载
    load,
    // 数据完整性辅助
    isKeyPresent,
    // 会话活跃度
    clearSessionActivity,
    // 紧急联系人
    loadContacts,
    saveContacts,
    addContact,
    removeContact,
    updateContact,
    // 访问记录
    loadVisits,
    saveVisits,
    addVisitLog,
    clearVisitLog,
    // 权限光点
    loadPermissionLights,
    savePermissionLights,
    cyclePermissionStatus,
    // 崩溃恢复日志
    loadCrashLogs,
    saveCrashLogs,
    addCrashLog,
    removeCrashLog,
    clearCrashLogs,
  }
}
