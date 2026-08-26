// ============================================================
// 全我镜 · 自我对话（self-talks）
// 注意：全我镜房间本身是"跨房间数据聚合镜像"（蓝图第 4 条：只呈现不评判
// + 数据驱动自我探索），本模块只承载其唯一的本地数据点 —— 自我对话。
// 不引入任何评判/建议逻辑，仅做中立的记录与回看。
// ============================================================

import { ref } from 'vue'
import { storage } from '../../engine/storage'

export const SELF_TALKS_KEY = 'hf:self_talks_v2'

export interface SelfTalk {
  id: string
  text: string
  at: string
  roomContext: string | null
}

const MAX_TALKS = 50

function loadKV<T>(key: string, fallback: T): T {
  try { return storage.getKV<T>(key, fallback) } catch { return fallback }
}

function saveKV<T>(key: string, value: T) {
  storage.setKV(key, value)
}

const talks = ref<SelfTalk[]>(
  loadKV<SelfTalk[]>(SELF_TALKS_KEY, []).map(normalizeTalk),
)

function normalizeTalk(t: Partial<SelfTalk> & Record<string, any>): SelfTalk {
  return {
    id: t.id || `tlk${Date.now()}`,
    text: t.text || '',
    at: t.at || t.created_at || new Date().toISOString(),
    roomContext: t.roomContext ?? t.room_context ?? null,
  }
}

function persist() {
  saveKV(SELF_TALKS_KEY, talks.value)
}

export function useSelfTalks() {
  function loadTalks() {
    talks.value = loadKV<SelfTalk[]>(SELF_TALKS_KEY, []).map(normalizeTalk)
  }

  function addTalk(text: string, roomContext: string | null = null): SelfTalk | null {
    const trimmed = text.trim()
    if (!trimmed) return null
    const talk: SelfTalk = {
      id: `tlk${Date.now()}${Math.random().toString(36).slice(2, 5)}`,
      text: trimmed,
      at: new Date().toISOString(),
      roomContext,
    }
    talks.value = [talk, ...talks.value].slice(0, MAX_TALKS)
    persist()
    return talk
  }

  function removeTalk(id: string) {
    talks.value = talks.value.filter(t => t.id !== id)
    persist()
  }

  function clearTalks() {
    talks.value = []
    persist()
  }

  return {
    talks,
    loadTalks,
    addTalk,
    removeTalk,
    clearTalks,
    SELF_TALKS_KEY,
  }
}
