// ============================================================
// P2P 同步引擎 · 核心逻辑
// 基于 kvStore 的多设备增量同步
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'
import * as dataPort from '../../engine/data-port'
import type { DataPortPayload } from '../../engine/data-port'
import { useDataOutflow } from '../../engine/data-outflow'
import type {
  SyncConfig, SyncStatus, SyncTarget, SyncLogEntry,
  SyncConflict, SyncSnapshot, SyncDomain, SyncDirection,
} from './types'
import {
  DEFAULT_SYNC_CONFIG,
  SYNC_CONFIG_KEY, SYNC_LOGS_KEY, SYNC_CONFLICTS_KEY,
  SYNC_TARGETS_KEY, SYNC_SNAPSHOTS_KEY, SYNC_CURSOR_KEY,
} from './types'
import {
  createLocalSnapshotAdapter,
  createLanTransportAdapter,
  isLocalBoundaryUrl,
  NO_TRANSPORT,
  SNAPSHOT_FORMAT,
  type TransportAdapter,
  type SnapshotBlob,
  type TransportKind,
  type LanAdapterOptions,
} from './transport'

export type { SyncConfig, SyncStatus, SyncTarget, SyncLogEntry, SyncConflict, SyncSnapshot, SyncDomain, SyncDirection }
export { DEFAULT_SYNC_CONFIG }
export type { TransportAdapter, SnapshotBlob, TransportKind, LanAdapterOptions }
export { createLocalSnapshotAdapter, createLanTransportAdapter, isLocalBoundaryUrl, NO_TRANSPORT, SNAPSHOT_FORMAT }

// ---- 跨端接续 · 传输通道（B1） ----
// 默认无任何传输通道（null）→ 守宪法第1条「本地私有·默认关闭」。
// 用户需显式调用 setTransportAdapter 注册通道后，exportSnapshot/importSnapshot 才可用。
// 现有 sync() / downloadSyncData / importSyncFile 保持用户显式触发，不受影响。

let activeTransport: TransportAdapter | null = NO_TRANSPORT

/** 注册/注销传输通道；传 null 即回到「默认关闭」 */
export function setTransportAdapter(adapter: TransportAdapter | null): void {
  activeTransport = adapter
}

/** 读取当前传输通道（默认 null） */
export function getTransportAdapter(): TransportAdapter | null {
  return activeTransport
}

/**
 * 导出一份跨端接续快照。无通道时返回 null（默认关闭，不报错）。
 * 业务层据此决定是否提示用户「先选择接续方式」。
 */
export async function exportSnapshot(): Promise<SnapshotBlob | null> {
  if (!activeTransport) return null
  return activeTransport.export()
}

/**
 * 导入一份跨端接续快照。无通道时返回 false（默认关闭）。
 * 调用前应由 UI 完成文件读取/网络拉取，传入内存中的 SnapshotBlob。
 */
export async function importSnapshot(blob: SnapshotBlob): Promise<boolean> {
  if (!activeTransport) return false
  await activeTransport.import(blob)
  return true
}

// ---- 辅助函数 ----

function getKV<T>(key: string, def: T): T {
  return storage.getKV<T>(key, def)
}
function setKV<T>(key: string, val: T): void {
  storage.setKV(key, val)
}

function now(): string {
  return new Date().toISOString()
}

function genId(): string {
  return `sync_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

/** 计算字符串的简单哈希 */
function hash(str: string): string {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h).toString(36)
}

/** 计算 JSON 数据的哈希 */
function dataHash(data: unknown): string {
  return hash(JSON.stringify(data))
}

// ---- 配置管理 ----

function loadConfig(): SyncConfig {
  return { ...DEFAULT_SYNC_CONFIG, ...getKV(SYNC_CONFIG_KEY, {}) }
}

function saveConfig(cfg: SyncConfig): void {
  setKV(SYNC_CONFIG_KEY, cfg)
}

function loadTargets(): SyncTarget[] {
  return getKV<SyncTarget[]>(SYNC_TARGETS_KEY, [])
}

function saveTargets(targets: SyncTarget[]): void {
  setKV(SYNC_TARGETS_KEY, targets)
}

function loadLogs(): SyncLogEntry[] {
  return getKV<SyncLogEntry[]>(SYNC_LOGS_KEY, [])
}

function saveLogs(logs: SyncLogEntry[]): void {
  setKV(SYNC_LOGS_KEY, logs)
}

function loadConflicts(): SyncConflict[] {
  return getKV<SyncConflict[]>(SYNC_CONFLICTS_KEY, [])
}

function saveConflicts(cf: SyncConflict[]): void {
  setKV(SYNC_CONFLICTS_KEY, cf)
}

function loadSnapshots(): SyncSnapshot[] {
  return getKV<SyncSnapshot[]>(SYNC_SNAPSHOTS_KEY, [])
}

function saveSnapshots(snaps: SyncSnapshot[]): void {
  setKV(SYNC_SNAPSHOTS_KEY, snaps)
}

// ---- 同步引擎 ----

export function useSync() {
  const config = ref<SyncConfig>(loadConfig())
  const targets = ref<SyncTarget[]>(loadTargets())
  const logs = ref<SyncLogEntry[]>(loadLogs())
  const conflicts = ref<SyncConflict[]>(loadConflicts())
  const snapshots = ref<SyncSnapshot[]>(loadSnapshots())

  /** 当前同步状态 */
  const syncStatus = ref<SyncStatus>('idle')
  /** 同步进度（0-1） */
  const syncProgress = ref(0)
  /** 同步错误信息 */
  const syncError = ref<string | null>(null)

  /** 未解决的冲突数量 */
  const unresolvedConflictCount = computed(() =>
    conflicts.value.filter(c => c.resolution === null).length,
  )

  /** 最近同步日志 */
  const recentLogs = computed(() =>
    [...logs.value].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 10),
  )

  /** 最近的快照列表 */
  const recentSnapshots = computed(() =>
    [...snapshots.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  )

  // ---- 配置 ----

  function updateConfig(partial: Partial<SyncConfig>): void {
    config.value = { ...config.value, ...partial }
    saveConfig(config.value)
  }

  // ---- 目标管理 ----

  function addTarget(target: SyncTarget): void {
    const existing = targets.value.find(t => t.id === target.id)
    if (existing) {
      Object.assign(existing, target)
    } else {
      targets.value.push(target)
    }
    saveTargets(targets.value)
  }

  function removeTarget(targetId: string): void {
    targets.value = targets.value.filter(t => t.id !== targetId)
    saveTargets(targets.value)
  }

  function updateTarget(targetId: string, partial: Partial<SyncTarget>): void {
    const t = targets.value.find(t => t.id === targetId)
    if (t) {
      Object.assign(t, partial)
      saveTargets(targets.value)
    }
  }

  // ---- 数据导出（增量同步的核心） ----

  /** 导出当前全部数据为 DataPortPayload */
  function exportPayload(): DataPortPayload {
    return {
      exportedAt: now(),
      version: 2,
      sessions: storage.getSessions(),
      crystals: storage.getCrystals(),
      notes: storage.getNotes(),
      emotions: storage.getEmotions(),
      anchors: storage.getAnchors(),
      goals: storage.getGoals(),
      relations: storage.getRelations(),
      ledger: storage.getLedger() as DataPortPayload['ledger'],
      carriers: storage.getCarriers(),
      constitution: storage.getConstitution(),
    }
  }

  /** 导出指定数据域的增量变更（基于游标） */
  function exportIncremental(domains: SyncDomain[]): DataPortPayload {
    const cursor = getKV<Record<string, string>>(SYNC_CURSOR_KEY, {})
    const full = exportPayload()
    const result: DataPortPayload = { exportedAt: now(), version: 2 }

    for (const domain of domains) {
      const lastSync = cursor[domain]
      const items = (full as any)[domain] as any[] | undefined
      if (!items) continue

      // 根据时间戳筛选增量
      const filtered = lastSync
        ? items.filter((item: any) => {
          const ts = item.updatedAt || item.completedAt || item.createdAt || item.at || ''
          return ts > lastSync
        })
        : items

      if (filtered.length > 0) {
        (result as any)[domain] = filtered
      }
    }

    return result
  }

  /** 导入数据（去重合并） */
  function importPayload(payload: DataPortPayload): dataPort.ImportCounts {
    const jsonStr = JSON.stringify(payload)
    return dataPort.importJSON(jsonStr)
  }

  /** 导入数据并返回冲突信息 */
  function importPayloadWithConflictCheck(payload: DataPortPayload, _sourceDeviceId: string): {
    count: number
    conflicts: number
  } {
    const result = importPayload(payload)

    // 记录冲突
    let conflictCount = 0
    // 简单冲突检测：检查存在相同 ID 但数据不同的条目
    const existingData = {
      sessions: storage.getSessions(),
      crystals: storage.getCrystals(),
      notes: storage.getNotes(),
      carriers: storage.getCarriers(),
    }

    for (const [domain, items] of Object.entries(payload)) {
      if (domain === 'exportedAt' || domain === 'version') continue
      if (!Array.isArray(items)) continue

      const existingList = (existingData as any)[domain] as any[] | undefined
      if (!existingList) continue

      for (const item of items) {
        if (!item.id) continue
        const existing = existingList.find((e: any) => e.id === item.id)
        if (existing) {
          const localHash = dataHash(existing)
          const remoteHash = dataHash(item)
          if (localHash !== remoteHash) {
            // 检测到冲突
            conflictCount++
            const existingConflict = conflicts.value.find(
              c => c.domain === domain && c.entryId === item.id && c.resolution === null,
            )
            if (!existingConflict) {
              conflicts.value.push({
                id: genId(),
                domain: domain as SyncDomain,
                entryId: item.id,
                localData: JSON.stringify(existing),
                remoteData: JSON.stringify(item),
                localTimestamp: existing.updatedAt || existing.createdAt || '',
                remoteTimestamp: item.updatedAt || item.createdAt || '',
                resolution: null,
                resolvedAt: null,
                occurredAt: now(),
              })
            }
          }
        }
      }
    }

    saveConflicts(conflicts.value)
    return { count: result.sessions + result.crystals + result.notes + result.emotions + result.anchors + result.goals + result.relations + result.ledger + result.carriers + result.constitution, conflicts: conflictCount }
  }

  // ---- 同步执行 ----

  /** 执行一次完整的同步操作 */
  async function sync(
    targetId: string,
    direction: SyncDirection,
    domains?: SyncDomain[],
  ): Promise<SyncStatus> {
    const start = performance.now()
    syncStatus.value = 'syncing'
    syncProgress.value = 0
    syncError.value = null

    const target = targets.value.find(t => t.id === targetId)
    if (!target) {
      syncStatus.value = 'error'
      syncError.value = '同步目标不存在'
      return 'error'
    }

    try {
      let exportedCount = 0
      let importedCount = 0
      let conflictCount = 0

      const effectiveDomains = domains ?? config.value.enabledDomains
      const totalSteps = direction === 'bidirectional' ? 2 : 1
      let step = 0

      // 导出阶段
      if (direction === 'export' || direction === 'bidirectional') {
        const payload = exportIncremental(effectiveDomains)
        exportedCount = countPayload(payload)
        syncProgress.value = ++step / totalSteps

        // 守护室·数据流出日志：增量数据发往对等节点（P2P 同步）
        try {
          useDataOutflow().recordOutflow('sync', '对等节点', target.id, 'P2P 同步导出增量数据')
        } catch { /* 静默 */ }

        // 更新游标
        if (exportedCount > 0) {
          const cursor = getKV<Record<string, string>>(SYNC_CURSOR_KEY, {})
          for (const domain of effectiveDomains) {
            cursor[domain] = now()
          }
          setKV(SYNC_CURSOR_KEY, cursor)
        }
      }

      // 导入阶段（模拟：从本地快照导入）
      if (direction === 'import' || direction === 'bidirectional') {
        // 找最近的快照作为"远程数据"源
        const snapshots = loadSnapshots()
        const latestSnapshot = snapshots.find(s => s.deviceId !== targetId)
        if (latestSnapshot) {
          // 在实际 P2P 场景中，这里会从远程获取数据
          // 当前实现为从本地最近快照导入
          const payload = loadSnapshotPayload(latestSnapshot.id)
          if (payload) {
            const result = importPayloadWithConflictCheck(payload, latestSnapshot.deviceId)
            importedCount = result.count
            conflictCount = result.conflicts
          }
        }
        syncProgress.value = ++step / totalSteps
      }

      // 记录同步日志
      const durationMs = Math.round(performance.now() - start)
      const logEntry: SyncLogEntry = {
        id: genId(),
        timestamp: now(),
        targetId,
        direction,
        status: 'success',
        exportedCount,
        importedCount,
        conflictCount,
        durationMs,
      }
      logs.value.unshift(logEntry)
      if (logs.value.length > config.value.logRetentionLimit) {
        logs.value = logs.value.slice(0, config.value.logRetentionLimit)
      }
      saveLogs(logs.value)

      // 更新目标状态
      updateTarget(targetId, {
        lastSyncAt: now(),
        lastSyncStatus: 'success',
      })

      syncStatus.value = conflictCount > 0 ? 'conflict' : 'success'
      return syncStatus.value
    } catch (err: any) {
      syncStatus.value = 'error'
      syncError.value = err?.message ?? String(err)

      // 记录错误日志
      const durationMs = Math.round(performance.now() - start)
      logs.value.unshift({
        id: genId(),
        timestamp: now(),
        targetId,
        direction,
        status: 'error',
        exportedCount: 0,
        importedCount: 0,
        conflictCount: 0,
        error: syncError.value ?? undefined,
        durationMs,
      })
      saveLogs(logs.value)

      updateTarget(targetId, {
        lastSyncAt: now(),
        lastSyncStatus: 'error',
      })

      return 'error'
    }
  }

  /** 统计 payload 中的条目数 */
  function countPayload(payload: DataPortPayload): number {
    let count = 0
    for (const [key, val] of Object.entries(payload)) {
      if (key === 'exportedAt' || key === 'version') continue
      if (Array.isArray(val)) count += val.length
    }
    return count
  }

  // ---- 快照管理 ----

  /** 创建当前数据快照 */
  function createSnapshot(): SyncSnapshot {
    const payload = exportPayload()
    const json = JSON.stringify(payload)
    const domains: Partial<Record<SyncDomain, number>> = {}
    let totalEntries = 0

    for (const [key, val] of Object.entries(payload)) {
      if (key === 'exportedAt' || key === 'version') continue
      if (Array.isArray(val)) {
        domains[key as SyncDomain] = val.length
        totalEntries += val.length
      }
    }

    const snapshot: SyncSnapshot = {
      id: genId(),
      createdAt: now(),
      domains,
      totalEntries,
      sizeBytes: new Blob([json]).size,
      deviceId: config.value.deviceId,
    }

    // 保存快照数据到 kvStore
    setKV(`${SYNC_SNAPSHOTS_KEY}:${snapshot.id}`, payload)

    snapshots.value.unshift(snapshot)
    if (snapshots.value.length > config.value.snapshotRetentionLimit) {
      const removed = snapshots.value.pop()
      if (removed) {
        setKV(`${SYNC_SNAPSHOTS_KEY}:${removed.id}`, null)
      }
    }
    saveSnapshots(snapshots.value)

    return snapshot
  }

  /** 加载快照数据 */
  function loadSnapshotPayload(snapshotId: string): DataPortPayload | null {
    return getKV<DataPortPayload | null>(`${SYNC_SNAPSHOTS_KEY}:${snapshotId}`, null)
  }

  /** 将快照恢复为当前数据 */
  function restoreSnapshot(snapshotId: string): boolean {
    const payload = loadSnapshotPayload(snapshotId)
    if (!payload) return false
    importPayload(payload)
    return true
  }

  // ---- 冲突解决 ----

  /** 解决冲突 */
  function resolveConflict(conflictId: string, strategy: 'local' | 'remote'): boolean {
    const conflict = conflicts.value.find(c => c.id === conflictId)
    if (!conflict) return false

    conflict.resolution = strategy
    conflict.resolvedAt = now()

    if (strategy === 'remote') {
      // 用远程数据覆盖本地
      try {
        const remoteData = JSON.parse(conflict.remoteData)
        const domain = conflict.domain
        const existing = storage.getKV<any[]>(`hf:${domain}`, [])
        const idx = existing.findIndex((e: any) => e.id === conflict.entryId)
        if (idx !== -1) {
          existing[idx] = remoteData
          storage.setKV(`hf:${domain}`, existing)
        }
      } catch { /* 忽略解析错误 */ }
    }
    // 'local' 策略：保留本地数据，不做任何操作

    const idx = conflicts.value.findIndex(c => c.id === conflictId)
    if (idx !== -1) {
      conflicts.value[idx] = { ...conflict }
      saveConflicts(conflicts.value)
    }

    return true
  }

  /** 批量解决所有冲突 */
  function resolveAllConflicts(strategy: 'local' | 'remote'): number {
    let count = 0
    for (const conflict of conflicts.value) {
      if (conflict.resolution === null) {
        if (resolveConflict(conflict.id, strategy)) {
          count++
        }
      }
    }
    return count
  }

  // ---- 导出下载 ----

  /** 导出同步数据为 JSON 文件（用于文件同步） */
  function downloadSyncData(): void {
    const payload = exportPayload()
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `heartflow-sync-${now().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    // 守护室·数据流出日志：同步数据文件离设备
    try {
      useDataOutflow().recordOutflow('sync', '本地文件', a.download, '导出同步数据文件')
    } catch { /* 静默 */ }
  }

  /** 从文件导入同步数据 */
  function importSyncFile(file: File): Promise<{ count: number; conflicts: number }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const payload = JSON.parse(reader.result as string) as DataPortPayload
          const result = importPayloadWithConflictCheck(payload, 'file')
          resolve(result)
        } catch (err) {
          reject(new Error('文件解析失败'))
        }
      }
      reader.onerror = () => reject(new Error('文件读取失败'))
      reader.readAsText(file)
    })
  }

  // ---- 初始化 ----

  function load() {
    config.value = loadConfig()
    targets.value = loadTargets()
    logs.value = loadLogs()
    conflicts.value = loadConflicts()
    snapshots.value = loadSnapshots()
  }

  return {
    // 状态
    config,
    targets,
    logs,
    conflicts,
    snapshots,
    syncStatus,
    syncProgress,
    syncError,
    unresolvedConflictCount,
    recentLogs,
    recentSnapshots,

    // 配置
    updateConfig,

    // 目标管理
    addTarget,
    removeTarget,
    updateTarget,

    // 同步执行
    sync,
    exportPayload,
    exportIncremental,
    importPayload,
    importPayloadWithConflictCheck,

    // 快照
    createSnapshot,
    loadSnapshotPayload,
    restoreSnapshot,

    // 冲突解决
    resolveConflict,
    resolveAllConflicts,

    // 文件同步
    downloadSyncData,
    importSyncFile,

    // 初始化
    load,
  }
}