// ============================================================
// 输出管理 · 版本快照（本地备份 / 恢复）
// ------------------------------------------------------------
// 借鉴「第14类·轻羽写作版本历史 / 有道云笔记备份恢复」：
// 将当前全部输出记录深拷贝为快照存入本地，可随时回滚。
// 全部本地存储，守宪法第1条本地私有，拒绝云端依赖。
// ============================================================

import { ref } from 'vue'
import { storage } from '../../engine/storage'
import type { OutputRecord } from './types'

export interface OutputSnapshot {
  id: string
  label: string
  createdAt: string
  /** 快照时的记录总数 */
  recordCount: number
  records: OutputRecord[]
}

const SNAPSHOTS_KEY = 'hf:output_snapshots'

const snapshots = ref<OutputSnapshot[]>([])

function load() {
  try {
    snapshots.value = storage.getKV<OutputSnapshot[]>(SNAPSHOTS_KEY, [])
  } catch {
    snapshots.value = []
  }
}

function save() {
  storage.setKV(SNAPSHOTS_KEY, snapshots.value)
}

/** 创建快照（深拷贝当前记录） */
function createSnapshot(records: OutputRecord[], label = ''): OutputSnapshot | null {
  const trimmed = label.trim()
  const snapshot: OutputSnapshot = {
    id: `snap_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    label: trimmed || `快照 ${new Date().toLocaleString()}`,
    createdAt: new Date().toISOString(),
    recordCount: records.length,
    records: JSON.parse(JSON.stringify(records)) as OutputRecord[],
  }
  snapshots.value.unshift(snapshot)
  save()
  return snapshot
}

/** 取回快照中的记录（用于恢复） */
function getSnapshotRecords(id: string): OutputRecord[] | null {
  const s = snapshots.value.find(x => x.id === id)
  if (!s) return null
  return JSON.parse(JSON.stringify(s.records)) as OutputRecord[]
}

function deleteSnapshot(id: string) {
  snapshots.value = snapshots.value.filter(s => s.id !== id)
  save()
}

function clearSnapshots() {
  snapshots.value = []
  save()
}

export function useOutputSnapshots() {
  return {
    snapshots,
    load,
    createSnapshot,
    getSnapshotRecords,
    deleteSnapshot,
    clearSnapshots,
  }
}
