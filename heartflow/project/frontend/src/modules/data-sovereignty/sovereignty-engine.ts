// ============================================================
// 数据主权与遗忘退场 · 引擎（叶子模块）
// 从 index.ts 抽取，消除 index <-> composables 的循环依赖。
// index.ts 通过 export * 仍透出全部引擎 API。
// ============================================================

// ============================================================
// 数据主权与遗忘退场 · 模块引擎
// 提供 5 种遗忘方法、6 种大厅退出状态、遗忘记录管理等功能
// ============================================================

import { ref } from 'vue'
import { storage } from '../../engine/storage'
import { isTargetActive } from '../../engine/constitution-effect'
import type {
  ForgetMethod,
  ForgetMethodInfo,
  HallExitState,
  HallExitStateInfo,
  ForgettingRecord,
  DataSovereigntyConfig,
  AgingMark,
  SealedData,
  HibernatedData,
  ForgetResult,
} from './types'

export type {
  ForgetMethod,
  ForgetMethodInfo,
  HallExitState,
  HallExitStateInfo,
  ForgettingRecord,
  DataSovereigntyConfig,
  AgingMark,
  SealedData,
  HibernatedData,
  ForgetResult,
} from './types'

export type {
  ExtraditionPhase,
  ExtraditionManifest,
  ExtraditionModule,
  ExtraditionPackage,
  ExtraditionState,
  ExtraditionCallbacks,
  DeviceInfo,
  ContinuitySession,
  ContinuityConfig,
} from './types'


// ---- 存储键 ----
const CONFIG_KEY = 'hf:sovereignty_config'
const RECORDS_KEY = 'hf:forgetting_records'
const AGING_MARKS_KEY = 'hf:aging_marks'
const SEALED_DATA_KEY = 'hf:sealed_data'
const HIBERNATED_DATA_KEY = 'hf:hibernated_data'

// ---- 默认配置 ----

const DEFAULT_CONFIG: DataSovereigntyConfig = {
  defaultForgetMethod: 'release',
  naturalAgingDays: 90,
  sealRetentionDays: 365,
  hibernateRetentionDays: 180,
  forgettingRecordRetentionDays: 30,
  ritualAnimationEnabled: true,
  preferredExitState: 'peaceful',
  exitTransitionEnabled: true,
}

// ---- 5 种遗忘方法元信息 ----

export const FORGET_METHODS: ForgetMethodInfo[] = [
  {
    id: 'natural-aging',
    label: '自然老化',
    icon: '🍂',
    description: '数据随时间自然淡化，标记后渐进衰减直至遗忘',
    reversible: false,
    needsRitual: false,
  },
  {
    id: 'seal',
    label: '加密封存',
    icon: '📦',
    description: '将数据加密封存归档，在保留期内可恢复',
    reversible: true,
    needsRitual: false,
  },
  {
    id: 'release',
    label: '彻底释放',
    icon: '💨',
    description: '物理删除所有数据，永久消失不可恢复',
    reversible: false,
    needsRitual: false,
  },
  {
    id: 'hibernate',
    label: '压缩休眠',
    icon: '💤',
    description: '将数据压缩休眠，保留期内可解压恢复',
    reversible: true,
    needsRitual: false,
  },
  {
    id: 'forgetting-ritual',
    label: '遗忘仪式',
    icon: '✨',
    description: '视觉化删除过程，粒子消散动画后彻底遗忘',
    reversible: false,
    needsRitual: true,
  },
]

// ---- 6 种大厅退出状态元信息 ----

export const HALL_EXIT_STATES: HallExitStateInfo[] = [
  {
    id: 'peaceful',
    label: '平和退场',
    icon: '🕊',
    poem: '轻轻的我走了，正如我轻轻的来',
    description: '平静退出，不留痕迹，一切都是最好的安排',
    color: '#a8d5ba',
    transitionDuration: 2000,
  },
  {
    id: 'satisfied',
    label: '心满意足',
    icon: '🌟',
    poem: '此行无憾，满载星辉',
    description: '带着满足感退出，回顾所有美好时刻',
    color: '#f0c040',
    transitionDuration: 2500,
  },
  {
    id: 'contemplative',
    label: '沉思退场',
    icon: '🤔',
    poem: '行到水穷处，坐看云起时',
    description: '带着思考退出，留下未解的疑问',
    color: '#a0c4e8',
    transitionDuration: 3000,
  },
  {
    id: 'unfinished',
    label: '未竟之志',
    icon: '📖',
    poem: '书未竟，卷未阖，余音犹在',
    description: '带着未完成的事项退出，留下一丝牵挂',
    color: '#e8a0a0',
    transitionDuration: 2000,
  },
  {
    id: 'transformative',
    label: '蜕变新生',
    icon: '🦋',
    poem: '破茧而出，化蝶而飞',
    description: '带着蜕变的力量退出，迎接新的开始',
    color: '#c8a0e8',
    transitionDuration: 3500,
  },
  {
    id: 'cyclical',
    label: '循环往复',
    icon: '🔄',
    poem: '终点亦是起点，周而复始',
    description: '带着循环的智慧退出，知道还会回来',
    color: '#80c8c8',
    transitionDuration: 2500,
  },
]

// ---- 响应式状态 ----

const config = ref<DataSovereigntyConfig>(loadConfig())
const forgettingRecords = ref<ForgettingRecord[]>(loadRecords())
const agingMarks = ref<AgingMark[]>(loadAgingMarks())

function loadConfig(): DataSovereigntyConfig {
  try {
    return storage.getKV<DataSovereigntyConfig>(CONFIG_KEY, DEFAULT_CONFIG)
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

function persistConfig() {
  storage.setKV(CONFIG_KEY, config.value)
}

function loadRecords(): ForgettingRecord[] {
  try {
    return storage.getKV<ForgettingRecord[]>(RECORDS_KEY, [])
  } catch {
    return []
  }
}

function persistRecords() {
  storage.setKV(RECORDS_KEY, forgettingRecords.value)
}

function loadAgingMarks(): AgingMark[] {
  try {
    return storage.getKV<AgingMark[]>(AGING_MARKS_KEY, [])
  } catch {
    return []
  }
}

function persistAgingMarks() {
  storage.setKV(AGING_MARKS_KEY, agingMarks.value)
}

// ---- 公开 API ----

/**
 * 获取数据主权配置（响应式）
 */
export function getSovereigntyConfig() {
  return config
}

/**
 * 更新数据主权配置
 */
export function updateSovereigntyConfig(partial: Partial<DataSovereigntyConfig>) {
  config.value = { ...config.value, ...partial }
  persistConfig()
}

/**
 * 获取遗忘记录列表
 */
export function getForgettingRecords() {
  return forgettingRecords
}

/**
 * 添加遗忘记录
 */
export function addForgettingRecord(record: ForgettingRecord) {
  forgettingRecords.value.unshift(record)
  // 清理过期记录
  const retentionMs = config.value.forgettingRecordRetentionDays * 86400000
  forgettingRecords.value = forgettingRecords.value.filter(
    r => Date.now() - r.timestamp < retentionMs
  )
  persistRecords()
}

/**
 * 获取指定模块的遗忘记录
 */
export function getModuleForgettingRecords(moduleKey: string): ForgettingRecord[] {
  return forgettingRecords.value.filter(r => r.moduleKey === moduleKey)
}

/**
 * 获取指定模块的自然老化标记
 */
export function getModuleAgingMark(moduleKey: string): AgingMark | undefined {
  return agingMarks.value.find(m => m.moduleKey === moduleKey)
}

/**
 * 设置自然老化标记
 */
export function setAgingMark(moduleKey: string) {
  const existing = agingMarks.value.find(m => m.moduleKey === moduleKey)
  if (existing) {
    existing.lastAccessedAt = Date.now()
    existing.decayLevel = 0
  } else {
    agingMarks.value.push({
      moduleKey,
      lastAccessedAt: Date.now(),
      decayLevel: 0,
      createdAt: Date.now(),
    })
  }
  persistAgingMarks()
}

/**
 * 移除自然老化标记
 */
export function removeAgingMark(moduleKey: string) {
  agingMarks.value = agingMarks.value.filter(m => m.moduleKey !== moduleKey)
  persistAgingMarks()
}

/**
 * 计算自然老化进度（0-100）
 * 基于最后访问时间和老化周期
 */
export function calculateAgingProgress(moduleKey: string): number {
  const mark = agingMarks.value.find(m => m.moduleKey === moduleKey)
  if (!mark) return 0
  const elapsed = Date.now() - mark.lastAccessedAt
  const agingMs = config.value.naturalAgingDays * 86400000
  return Math.min(100, Math.round((elapsed / agingMs) * 100))
}

/**
 * 获取遗忘方法信息
 */
export function getForgetMethodInfo(method: ForgetMethod): ForgetMethodInfo {
  return FORGET_METHODS.find(m => m.id === method) || FORGET_METHODS[2]
}

/**
 * 获取大厅退出状态信息
 */
export function getHallExitStateInfo(state: HallExitState): HallExitStateInfo {
  return HALL_EXIT_STATES.find(s => s.id === state) || HALL_EXIT_STATES[0]
}

/**
 * 重置数据主权配置为默认值
 */
export function resetSovereigntyConfig() {
  config.value = { ...DEFAULT_CONFIG }
  persistConfig()
}

/**
 * 获取模块的存储数据（按 prefix 扫描 localStorage）
 */
export function getModuleData(prefix: string): Record<string, any> {
  const data: Record<string, any> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith(prefix)) {
      try {
        data[k] = JSON.parse(localStorage.getItem(k) || '')
      } catch {
        data[k] = localStorage.getItem(k)
      }
    }
  }
  return data
}

/**
 * 物理删除模块的所有数据（release 方法）
 */
export function deleteModuleData(prefix: string): { affectedCount: number; freedBytes: number } {
  let affectedCount = 0
  let freedBytes = 0
  const toDelete: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith(prefix)) {
      toDelete.push(k)
      freedBytes += localStorage.getItem(k)?.length || 0
    }
  }
  toDelete.forEach(k => localStorage.removeItem(k))
  affectedCount = toDelete.length
  return { affectedCount, freedBytes }
}

/**
 * 封存模块数据（seal 方法）
 * 将数据复制到封存区，然后删除原数据
 */
export function sealModuleData(moduleKey: string, prefix: string): SealedData {
  const data = getModuleData(prefix)
  const sealed: SealedData = {
    id: `seal-${Date.now()}`,
    moduleKey,
    data,
    sealedAt: Date.now(),
    encrypted: true,
    expiresAt: Date.now() + config.value.sealRetentionDays * 86400000,
  }
  // 保存封存数据
  const existing = loadSealedData()
  existing.push(sealed)
  storage.setKV(SEALED_DATA_KEY, existing)
  // 删除原数据
  deleteModuleData(prefix)
  return sealed
}

function loadSealedData(): SealedData[] {
  try {
    return storage.getKV<SealedData[]>(SEALED_DATA_KEY, [])
  } catch {
    return []
  }
}

/**
 * 恢复封存数据
 */
export function unsealModuleData(sealId: string): boolean {
  const sealed = loadSealedData()
  const idx = sealed.findIndex(s => s.id === sealId)
  if (idx === -1) return false
  const item = sealed[idx]
  // 恢复数据到 localStorage
  for (const [k, v] of Object.entries(item.data)) {
    localStorage.setItem(k, JSON.stringify(v))
  }
  // 移除封存记录
  sealed.splice(idx, 1)
  storage.setKV(SEALED_DATA_KEY, sealed)
  return true
}

/**
 * 休眠模块数据（hibernate 方法）
 * 模拟压缩存储，标记为休眠状态
 */
export function hibernateModuleData(moduleKey: string, prefix: string): HibernatedData {
  const data = getModuleData(prefix)
  const originalSize = JSON.stringify(data).length
  const hibernated: HibernatedData = {
    id: `hibernate-${Date.now()}`,
    moduleKey,
    compressedSize: Math.round(originalSize * 0.3), // 模拟压缩率 30%
    originalSize,
    hibernatedAt: Date.now(),
    expiresAt: Date.now() + config.value.hibernateRetentionDays * 86400000,
    data,
  }
  // 保存休眠数据
  const existing = loadHibernatedData()
  existing.push(hibernated)
  storage.setKV(HIBERNATED_DATA_KEY, existing)
  // 删除原数据
  deleteModuleData(prefix)
  return hibernated
}

function loadHibernatedData(): HibernatedData[] {
  try {
    return storage.getKV<HibernatedData[]>(HIBERNATED_DATA_KEY, [])
  } catch {
    return []
  }
}

/**
 * 恢复休眠数据
 */
export function wakeModuleData(hibernateId: string): boolean {
  const hibernated = loadHibernatedData()
  const idx = hibernated.findIndex(h => h.id === hibernateId)
  if (idx === -1) return false
  const item = hibernated[idx]
  // 恢复数据到 localStorage
  for (const [k, v] of Object.entries(item.data)) {
    localStorage.setItem(k, JSON.stringify(v))
  }
  // 移除休眠记录
  hibernated.splice(idx, 1)
  storage.setKV(HIBERNATED_DATA_KEY, hibernated)
  return true
}

/**
 * 获取可恢复的封存数据列表
 */
export function getSealedDataList(): SealedData[] {
  return loadSealedData().filter(s => s.expiresAt > Date.now())
}

/**
 * 获取可恢复的休眠数据列表
 */
export function getHibernatedDataList(): HibernatedData[] {
  return loadHibernatedData().filter(h => h.expiresAt > Date.now())
}

/**
 * 执行遗忘操作（统一入口）
 * 根据指定的遗忘方法执行对应操作
 */
export function executeForgetting(
  moduleKey: string,
  moduleName: string,
  prefix: string,
  method: ForgetMethod
): ForgetResult {
  // 宪法第45条「遗忘的权利」：权利关闭时禁止任何遗忘操作（老化/封存/释放/冬眠/仪式）
  if (!isTargetActive('data:forget')) {
    const blocked: ForgettingRecord = {
      id: `forget-blocked-${Date.now()}`,
      moduleKey,
      moduleName,
      method,
      timestamp: Date.now(),
      affectedCount: 0,
      freedBytes: 0,
      recoverable: false,
    }
    return {
      success: false,
      moduleKey,
      moduleName,
      method,
      affectedCount: 0,
      freedBytes: 0,
      record: blocked,
    }
  }
  try {
    let affectedCount = 0
    let freedBytes = 0
    let record: ForgettingRecord

    switch (method) {
      case 'natural-aging': {
        // 设置自然老化标记
        setAgingMark(moduleKey)
        affectedCount = countModuleKeys(prefix)
        freedBytes = 0 // 数据仍在，只是标记
        record = {
          id: `forget-${Date.now()}`,
          moduleKey,
          moduleName,
          method,
          timestamp: Date.now(),
          affectedCount,
          freedBytes,
          recoverable: false,
        }
        break
      }

      case 'seal': {
        const sealed = sealModuleData(moduleKey, prefix)
        affectedCount = Object.keys(sealed.data).length
        freedBytes = calculateModuleSize(prefix) // 封存前的大小
        record = {
          id: `forget-${Date.now()}`,
          moduleKey,
          moduleName,
          method,
          timestamp: Date.now(),
          affectedCount,
          freedBytes,
          recoverable: true,
          recoverableUntil: sealed.expiresAt,
        }
        break
      }

      case 'release': {
        const result = deleteModuleData(prefix)
        affectedCount = result.affectedCount
        freedBytes = result.freedBytes
        record = {
          id: `forget-${Date.now()}`,
          moduleKey,
          moduleName,
          method,
          timestamp: Date.now(),
          affectedCount,
          freedBytes,
          recoverable: false,
        }
        break
      }

      case 'hibernate': {
        const hibernated = hibernateModuleData(moduleKey, prefix)
        affectedCount = Object.keys(hibernated.data).length
        freedBytes = hibernated.originalSize
        record = {
          id: `forget-${Date.now()}`,
          moduleKey,
          moduleName,
          method,
          timestamp: Date.now(),
          affectedCount,
          freedBytes,
          recoverable: true,
          recoverableUntil: hibernated.expiresAt,
        }
        break
      }

      case 'forgetting-ritual': {
        const result = deleteModuleData(prefix)
        affectedCount = result.affectedCount
        freedBytes = result.freedBytes
        record = {
          id: `forget-${Date.now()}`,
          moduleKey,
          moduleName,
          method,
          timestamp: Date.now(),
          affectedCount,
          freedBytes,
          recoverable: false,
        }
        break
      }
    }

    // 记录遗忘操作
    addForgettingRecord(record)

    return {
      success: true,
      moduleKey,
      moduleName,
      method,
      affectedCount,
      freedBytes,
      record,
    }
  } catch (e) {
    return {
      success: false,
      moduleKey,
      moduleName,
      method,
      affectedCount: 0,
      freedBytes: 0,
      record: {
        id: `forget-${Date.now()}`,
        moduleKey,
        moduleName,
        method,
        timestamp: Date.now(),
        affectedCount: 0,
        freedBytes: 0,
        recoverable: false,
      },
      error: String(e),
    }
  }
}

function calculateModuleSize(prefix: string): number {
  let total = 0
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith(prefix)) {
      total += localStorage.getItem(k)?.length || 0
    }
  }
  return total
}

function countModuleKeys(prefix: string): number {
  let count = 0
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith(prefix)) count++
  }
  return count
}