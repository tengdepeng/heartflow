// ============================================================
// 安全岛 · 便签与访问记录持久化模块
// ------------------------------------------------------------
// 职责：封装 release note（释放便签）与 visit log（访问记录）的
// 本地持久化与 CRUD。视图不再直接触碰 storage 裸键，统一经由本模块。
//
// 设计原则（沿用蓝图13 安全岛心理安全约束）：
// - 仅本地存储，绝不外发、绝不弹窗/推送/报警（与 useSanctuaryTrigger 一致）
// - 模块级单例 ref，与视图共享同一响应式来源
// ============================================================

import { ref } from 'vue'
import { storage } from '../../engine/storage'

export const SANCTUARY_NOTES_KEY = 'sanctuary_notes'
export const SANCTUARY_LOGS_KEY = 'hf:sanctuary_logs'

export interface SanctuaryNote {
  id: string
  text: string
  at: string
}

export interface SanctuaryLog {
  id: string
  enterAt: string
  exitAt: string | null
  durationSec: number
  breathCount: number
  notesReleased: number
}

// ---- 响应式单例 ----
const notes = ref<SanctuaryNote[]>([])
const logs = ref<SanctuaryLog[]>([])

// ---- 便签 ----
function normalizeNote(raw: any, index: number): SanctuaryNote {
  return {
    id: raw?.id ?? `sanctuary_${raw?.at}_${index}`,
    text: (raw?.text ?? '').trim(),
    at: raw?.at ?? new Date().toISOString(),
  }
}

function loadNotes() {
  const raw = storage.getKV<any[]>(SANCTUARY_NOTES_KEY, [])
  notes.value = (raw || [])
    .filter((n) => n?.text?.trim())
    .map(normalizeNote)
    .sort((a, b) => b.at.localeCompare(a.at))
}

function persistNotes() {
  storage.setKV(SANCTUARY_NOTES_KEY, notes.value)
}

function addNote(text: string): SanctuaryNote {
  const note: SanctuaryNote = {
    id: `sanctuary_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    text: text.trim(),
    at: new Date().toISOString(),
  }
  notes.value = [note, ...notes.value]
  persistNotes()
  return note
}

function removeNote(id: string) {
  notes.value = notes.value.filter((n) => n.id !== id)
  persistNotes()
}

function clearNotes() {
  notes.value = []
  persistNotes()
}

// ---- 访问记录 ----
function loadLogs() {
  logs.value = storage.getKV<SanctuaryLog[]>(SANCTUARY_LOGS_KEY, [])
}

function persistLogs() {
  storage.setKV(SANCTUARY_LOGS_KEY, logs.value)
}

function createLog(): SanctuaryLog {
  const log: SanctuaryLog = {
    id: `sanctuary_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    enterAt: new Date().toISOString(),
    exitAt: null,
    durationSec: 0,
    breathCount: 0,
    notesReleased: 0,
  }
  logs.value = [log, ...logs.value]
  persistLogs()
  return log
}

function updateLog(id: string, patch: Partial<SanctuaryLog>) {
  const idx = logs.value.findIndex((l) => l.id === id)
  if (idx === -1) return
  logs.value[idx] = { ...logs.value[idx], ...patch }
  persistLogs()
}

function removeLog(id: string) {
  logs.value = logs.value.filter((l) => l.id !== id)
  persistLogs()
}

export function useSanctuary() {
  return {
    notes,
    logs,
    loadNotes,
    addNote,
    removeNote,
    clearNotes,
    loadLogs,
    createLog,
    updateLog,
    removeLog,
  }
}
