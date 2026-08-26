// ============================================================
// 殿堂触角 · 文本速识（第11类 / 传送门）
// 剪贴板历史 + 文本实体速识 + 快捷卡片
// 本地离线，仅处理用户主动提供/粘贴的文本，不外传
// ============================================================

import { ref, readonly } from 'vue'
import { storage } from '../../engine/storage'

// ---- 实体类型 ----

export type EntityType =
  | 'url' | 'email' | 'phone' | 'express' | 'flight'
  | 'idcard' | 'amount' | 'date' | 'order'

export interface EntityMeta { label: string; icon: string }

export const ENTITY_TYPE_META: Record<EntityType, EntityMeta> = {
  url: { label: '链接', icon: '🔗' },
  email: { label: '邮箱', icon: '✉️' },
  phone: { label: '电话', icon: '📞' },
  express: { label: '快递单号', icon: '📦' },
  flight: { label: '航班号', icon: '✈️' },
  idcard: { label: '证件号', icon: '🪪' },
  amount: { label: '金额', icon: '💰' },
  date: { label: '日期', icon: '🗓️' },
  order: { label: '单据号', icon: '🧾' },
}

export interface RecognizedEntity {
  type: EntityType
  label: string
  icon: string
  value: string
  start: number
  end: number
}

interface Rule { type: EntityType; re: RegExp }

const RULES: Rule[] = [
  { type: 'url', re: /https?:\/\/[^\s，。；、""'']+/gi },
  { type: 'email', re: /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g },
  { type: 'phone', re: /(?<!\d)1[3-9]\d{9}(?!\d)/g },
  { type: 'express', re: /(?:(?:SF|YT|JD|ZT|YJ|EMS|RY|DB|YZPY|HTKY|QFKD|STO|YD)[0-9A-Z]{10,14})/gi },
  { type: 'flight', re: /(?<!\w)\b(?:CA|MU|CZ|HU|3U|MF|ZH|SC|GS|DR|GJ|HO|BK|KN|9C|FM|JD|EU|8L)[-\s]?\d{3,4}\b/g },
  { type: 'idcard', re: /(?<!\d)\d{17}[\dXx](?!\d)/g },
  { type: 'amount', re: /[¥￥]\s?\d+(?:\.\d{1,2})?|\d+(?:\.\d{2})?\s*元/g },
  { type: 'date', re: /\d{4}[-/年]\s?\d{1,2}[-/月]\s?\d{1,2}\s?日?/g },
  { type: 'order', re: /(?<!\d)\d{8}(?!\d)/g },
]

/** 从一段文本中识别实体（按位置去重，取最长的匹配） */
export function recognizeEntities(text: string): RecognizedEntity[] {
  if (!text) return []
  const candidates: Array<{ type: EntityType; start: number; end: number; value: string }> = []
  for (const rule of RULES) {
    rule.re.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = rule.re.exec(text)) !== null) {
      const value = m[0].trim()
      if (!value) continue
      candidates.push({ type: rule.type, start: m.index, end: m.index + m[0].length, value })
      if (rule.re.lastIndex === m.index) rule.re.lastIndex++
    }
  }
  candidates.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start))
  const accepted: RecognizedEntity[] = []
  for (const c of candidates) {
    const last = accepted[accepted.length - 1]
    if (last && c.start < last.end) continue
    const meta = ENTITY_TYPE_META[c.type]
    accepted.push({ type: c.type, label: meta.label, icon: meta.icon, value: c.value, start: c.start, end: c.end })
  }
  return accepted
}

/** 解析出的实体类型集合（用于历史条目角标，去重） */
export function entityTypesOf(text: string): EntityType[] {
  const seen = new Set<EntityType>()
  const out: EntityType[] = []
  for (const e of recognizeEntities(text)) {
    if (!seen.has(e.type)) { seen.add(e.type); out.push(e.type) }
  }
  return out
}

/** 实体的快捷操作文案 */
export function entityActionLabel(e: RecognizedEntity): string {
  switch (e.type) {
    case 'url': return '打开'
    case 'email': return '复制邮箱'
    case 'phone': return '复制号码'
    case 'express': return '复制单号'
    case 'flight': return '复制航班'
    case 'idcard': return '复制证件'
    case 'amount': return '复制金额'
    case 'date': return '复制日期'
    case 'order': return '复制单号'
  }
}

// ---- 剪贴板历史 ----

export interface ClipItem {
  id: string
  text: string
  length: number
  entityTypes: EntityType[]
  capturedAt: string
}

export const TEXT_SENSE_STORAGE_KEY = 'hf:touchpoints:text-sense'
export const CLIP_HISTORY_CAP = 50

export function useTextSense() {
  const clips = ref<ClipItem[]>(loadClips())
  const listening = ref(false)
  const lastCaptured = ref<ClipItem | null>(null)

  function loadClips(): ClipItem[] {
    const stored = storage.getKV<ClipItem[] | null>(TEXT_SENSE_STORAGE_KEY, null)
    return Array.isArray(stored) ? stored.slice(0, CLIP_HISTORY_CAP) : []
  }

  function persist() {
    storage.setKV(TEXT_SENSE_STORAGE_KEY, clips.value)
  }

  function addClip(text: string): ClipItem {
    const clean = text.trim()
    if (!clean) throw new Error('empty')
    const item: ClipItem = {
      id: cryptoRandomId(),
      text: clean,
      length: clean.length,
      entityTypes: entityTypesOf(clean),
      capturedAt: new Date().toISOString(),
    }
    clips.value = [item, ...clips.value.filter(c => c.text !== clean)].slice(0, CLIP_HISTORY_CAP)
    lastCaptured.value = item
    persist()
    return item
  }

  function removeClip(id: string) {
    clips.value = clips.value.filter(c => c.id !== id)
    persist()
  }

  function clearClips() {
    clips.value = []
    persist()
  }

  const onPaste = (e: ClipboardEvent) => {
    const data = e.clipboardData?.getData('text') ?? ''
    if (data) addClip(data)
  }

  function startListening() {
    if (listening.value) return
    window.addEventListener('paste', onPaste)
    listening.value = true
  }

  function stopListening() {
    window.removeEventListener('paste', onPaste)
    listening.value = false
  }

  async function captureFromNavigator(): Promise<ClipItem | null> {
    try {
      if (!navigator.clipboard?.readText) return null
      const text = await navigator.clipboard.readText()
      if (!text.trim()) return null
      return addClip(text)
    } catch {
      return null
    }
  }

  return {
    clips: readonly(clips),
    listening,
    lastCaptured,
    addClip,
    removeClip,
    clearClips,
    startListening,
    stopListening,
    captureFromNavigator,
  }
}

function cryptoRandomId(): string {
  const base = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID().slice(0, 8) : String(Math.random()).slice(2, 10)
  return `${Date.now().toString(36)}-${base}`
}