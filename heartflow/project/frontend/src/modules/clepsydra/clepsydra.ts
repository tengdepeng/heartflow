// ============================================================
// 更漏 · 工作记录空间（模块二十一）
// 借鉴「时光序/工时记录/时光提醒」：工作时段手动计时、分类组织、
// 强度映射、光仪编织可视化。宪法合规：计时中不发出任何提醒；
// 质量指数以「比例描述」而非「评分」表达。
// 纯函数核心 + 轻量持久化，供 ClepsydraPanel 渲染。
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'

// ------------------------------------------------------------
// 类型
// ------------------------------------------------------------

/** 工作记录分类（blueprint：项目/日常/学习/创造/自定义） */
export type WorkCategory = 'project' | 'daily' | 'study' | 'create' | 'custom'

/** 一条工作时段记录 */
export interface WorkRecord {
  id: string
  /** 开始时间（ISO） */
  startedAt: string
  /** 结束时间（ISO，进行中的记录为 null） */
  endedAt: string | null
  /** 时长（秒，进行中动态累计） */
  durationSeconds: number
  /** 工作分类 */
  category: WorkCategory
  /** 区域（感知层 zone，预留） */
  zone?: string
  /** 来源类型：手动计时 / 锚点联动 / 自动 */
  sourceType: 'manual' | 'anchor' | 'auto'
  /** 关联源头 id（锚点完成联动等，预留） */
  sourceAnchorId?: string
  /** 关联的时间块 id（专注会话绑定到某计划块时使用，便于标记完成与级联移除） */
  blockId?: string
  /** 强度 0-1（blueprint：深度0.9…浅层0.5…会议0.6…） */
  intensity: number
  note: string
  createdAt: string
}

/** 分类强度/颜色元数据 */
export interface CategoryMeta {
  key: WorkCategory
  label: string
  icon: string
  /** 默认强度 0-1 */
  intensity: number
  /** 光丝颜色 */
  color: string
  /** 主色相（度）——光仪编织的 dominant_hue 基础 */
  hue: number
}

/** 光仪聚集状态 */
export interface ClepsydraState {
  /** 光丝密度：0(疏)~1(密)，由记录数密度描述 */
  threadDensity: number
  /** 主导色相（度）：由投入最多的分类 hue 决定 */
  dominantHue: number
  /** 旋转速度（相对灵敏，非量化评分） */
  rotationSpeed: number
  /** 质量指数：各分类累计时长占比（比例描述，0-1 数组） */
  balanceIndex: number[]
}

/** 一次汇总（按时间窗口） */
export interface ClepsydraSummary {
  /** 记录数 */
  count: number
  /** 总时长（秒） */
  totalSeconds: number
  /** 按分类累计时长（秒，键为分类） */
  byCategory: Record<WorkCategory, number>
  /** 分类占比（比例描述，与 byCategory 对齐的分类顺序返回） */
  categoryBalance: number[]
  /** 平均单条时长（秒） */
  avgSeconds: number
}

export const WORK_CATEGORY_META: Record<WorkCategory, CategoryMeta> = {
  project: { key: 'project', label: '项目', icon: '🧩', intensity: 0.7, color: '#f0b95a', hue: 40 },
  daily: { key: 'daily', label: '日常', icon: '🕊', intensity: 0.4, color: '#bfcbd9', hue: 210 },
  study: { key: 'study', label: '学习', icon: '📚', intensity: 0.5, color: '#8fc99a', hue: 130 },
  create: { key: 'create', label: '创造', icon: '✨', intensity: 0.8, color: '#c7a2f5', hue: 280 },
  custom: { key: 'custom', label: '自定义', icon: '🧵', intensity: 0.5, color: '#7fb4d6', hue: 200 },
}

/** 强度描述（供 UI 展示，非评分） */
export function intensityLabel(i: number): string {
  if (i >= 0.8) return '深度'
  if (i >= 0.55) return '专注'
  if (i >= 0.3) return '轻量'
  return '休整'
}

export const STORAGE_KEY = 'hf:clepsydra_records'

// ------------------------------------------------------------
// 纯函数（可单测）
// ------------------------------------------------------------

/**
 * 时间窗口起点。
 * mode: day=当天00:00 / week=本周一00:00 / all
 */
export function windowStart(date: Date, mode: 'day' | 'week' | 'all'): Date {
  const d = new Date(date)
  if (mode === 'all') return new Date(0)
  d.setHours(0, 0, 0, 0)
  if (mode === 'week') {
    const dow = (d.getDay() + 6) % 7 // 周一=0
    d.setDate(d.getDate() - dow)
  }
  return d
}

/** 是否落在窗口内（含进行中记录按其 startedAt） */
export function inWindow(record: WorkRecord, start: Date, now: Date): boolean {
  const t = new Date(record.startedAt).getTime()
  return t >= start.getTime() && t <= now.getTime()
}

/** 记录有效时长（进行中的按 now 动态计算） */
export function recordSeconds(record: WorkRecord, now: Date): number {
  const start = new Date(record.startedAt).getTime()
  const end = record.endedAt ? new Date(record.endedAt).getTime() : now.getTime()
  return Math.max(0, Math.round((end - start) / 1000))
}

/** 汇总指定窗口内记录 */
export function computeSummary(
  records: WorkRecord[],
  start: Date,
  now: Date,
): ClepsydraSummary {
  const byCategory: Record<WorkCategory, number> = {
    project: 0, daily: 0, study: 0, create: 0, custom: 0,
  }
  const list = records.filter(r => inWindow(r, start, now))
  let totalSeconds = 0
  for (const r of list) {
    const s = recordSeconds(r, now)
    byCategory[r.category] += s
    totalSeconds += s
  }
  const order: WorkCategory[] = ['project', 'daily', 'study', 'create', 'custom']
  const categoryBalance = order.map(c => (totalSeconds > 0 ? byCategory[c] / totalSeconds : 0))
  return {
    count: list.length,
    totalSeconds,
    byCategory,
    categoryBalance,
    avgSeconds: list.length > 0 ? Math.round(totalSeconds / list.length) : 0,
  }
}

/**
 * 光仪聚集状态。
 * threadDensity: 按窗口内记录数密度描述（非评分）。
 * dominantHue: 投入最多的分类主色相。
 * balanceIndex: 各分类时长占比（比例描述，非评分）。
 */
export function computeState(
  summary: ClepsydraSummary,
  opts: { sessionCount: number } = { sessionCount: 8 },
): ClepsydraState {
  const order: WorkCategory[] = ['project', 'daily', 'study', 'create', 'custom']
  const maxIdx = summary.categoryBalance.reduce(
    (best, v, i) => (v > best.v ? { v, i } : best),
    { v: -1, i: 0 },
  ).i
  const dominantHue = WORK_CATEGORY_META[order[maxIdx]].hue
  // 密度：由日均会话数的温和描述生成 0-1（封顶 1），非评分
  const density = Math.min(1, Math.max(0, opts.sessionCount > 0 ? opts.sessionCount / 12 : summary.count / 20))
  const rotationSpeed = 0.4 + density * 0.6
  return {
    threadDensity: Math.round(density * 100) / 100,
    dominantHue,
    rotationSpeed: Math.round(rotationSpeed * 100) / 100,
    balanceIndex: summary.categoryBalance.map(v => Math.round(v * 100) / 100),
  }
}

/** 时长格式化：人类可读 */
export function formatSeconds(s: number): string {
  const sec = Math.max(0, s)
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return `${h}时${String(m).padStart(2, '0')}分`
  if (m > 0) return `${m}分`
  return `${sec}秒`
}

function localDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function genId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

// ------------------------------------------------------------
// 组合式 API
// ------------------------------------------------------------

// 模块级单例：让「时间块完成联动」写入的记录能即时反映到工作光仪（ClepsydraPanel）。
// useClepsydra() 仅当存储内容变化时才重载（reloadIfChanged），既避免跨组件内存漂移、
// 兼容测试「先置 mock 再挂载」，又消除在「计算属性里读 useClepsydra().records」造成的
// 「读触发写 → computed 重算 → 再写」自触发递归。
const records = ref<WorkRecord[]>(load())

function load(): WorkRecord[] {
  try {
    return storage.getKV<WorkRecord[]>(STORAGE_KEY, [])
  } catch {
    return []
  }
}

function save(): void {
  storage.setKV(STORAGE_KEY, records.value)
}

/**
 * 仅当存储内容与当前内存态不一致时才重载并重新赋值 records.value。
 * 避免 useClepsydra() 的「每次调用无条件 load() 重赋值新数组」在计算属性里
 * 造成「读触发写 → computed 重算 → 再写」的自触发递归；同时保留
 * 「存储变化即时反映到内存单例」（兼容测试「先置 mock 再挂载」与跨组件写入）。
 */
function reloadIfChanged(): void {
  const fresh = load()
  if (JSON.stringify(fresh) !== JSON.stringify(records.value)) {
    records.value = fresh
  }
}

/** 重置内存态（测试用：清 mock 后重新载入空态）。 */
export function resetClepsydra(): void {
  records.value = load()
}

export function useClepsydra() {
  // 仅当存储内容变化时才重载，避免在计算属性里自触发递归（见 reloadIfChanged）
  reloadIfChanged()

  /** 开始一段工作计时（微型光仪 start） */
  function startTimer(meta: { category?: WorkCategory; note?: string; intensity?: number; blockId?: string } = {}): WorkRecord {
    const running = records.value.find(r => r.endedAt === null)
    if (running) return running
    const now = new Date()
    const record: WorkRecord = {
      id: genId(),
      startedAt: now.toISOString(),
      endedAt: null,
      durationSeconds: 0,
      category: meta.category ?? 'project',
      sourceType: 'manual',
      sourceAnchorId: meta.blockId,
      blockId: meta.blockId,
      intensity: meta.intensity ?? WORK_CATEGORY_META[meta.category ?? 'project'].intensity,
      note: meta.note ?? '',
      createdAt: now.toISOString(),
    }
    records.value.push(record)
    save()
    return record
  }

  /** 结束当前计时（再次点击微型光仪） */
  function stopTimer(note?: string): WorkRecord | null {
    const running = records.value.find(r => r.endedAt === null)
    if (!running) return null
    const now = new Date()
    running.endedAt = now.toISOString()
    running.durationSeconds = Math.max(0, Math.round((new Date(running.endedAt).getTime() - new Date(running.startedAt).getTime()) / 1000))
    if (note) running.note = note
    save()
    return running
  }

  /** 手动新增一条已完成记录 */
  function addRecord(input: {
    startedAt: Date
    endedAt: Date
    category?: WorkCategory
    intensity?: number
    note?: string
    /** 来源类型，默认手动；联动（时间块完成）写入为 'auto' */
    sourceType?: WorkRecord['sourceType']
    /** 关联源头 id（如联动时间块 id），用于可追溯与级联移除 */
    sourceAnchorId?: string
  }): WorkRecord {
    const record: WorkRecord = {
      id: genId(),
      startedAt: input.startedAt.toISOString(),
      endedAt: input.endedAt.toISOString(),
      durationSeconds: Math.max(0, Math.round((input.endedAt.getTime() - input.startedAt.getTime()) / 1000)),
      category: input.category ?? 'project',
      sourceType: input.sourceType ?? 'manual',
      sourceAnchorId: input.sourceAnchorId,
      intensity: input.intensity ?? WORK_CATEGORY_META[input.category ?? 'project'].intensity,
      note: input.note ?? '',
      createdAt: new Date().toISOString(),
    }
    records.value.push(record)
    records.value.sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    save()
    return record
  }

  /** 更新一条记录的字段（主要用于联动记录的起止/分类同步） */
  function updateRecord(
    id: string,
    patch: Partial<Pick<WorkRecord, 'startedAt' | 'endedAt' | 'category' | 'intensity' | 'note'>>,
  ): void {
    const r = records.value.find(x => x.id === id)
    if (!r) return
    Object.assign(r, patch)
    if (patch.startedAt || patch.endedAt) {
      const s = new Date(r.startedAt).getTime()
      const e = r.endedAt ? new Date(r.endedAt).getTime() : Date.now()
      r.durationSeconds = Math.max(0, Math.round((e - s) / 1000))
    }
    save()
  }

  /** 按关联源头 id 移除记录（级联移除联动写入的时间块记录） */
  function removeRecordByAnchor(anchorId: string): void {
    const before = records.value.length
    records.value = records.value.filter(r => r.sourceAnchorId !== anchorId)
    if (records.value.length !== before) save()
  }

  function removeRecord(id: string): void {
    records.value = records.value.filter(r => r.id !== id)
    save()
  }

  function setNote(id: string, note: string): void {
    const r = records.value.find(x => x.id === id)
    if (!r) return
    r.note = note
    save()
  }

  const running = computed(() => records.value.find(r => r.endedAt === null) ?? null)

  /** 今日/本周总览 */
  function summary(mode: 'day' | 'week' = 'day', now = new Date()): ClepsydraSummary {
    return computeSummary(records.value, windowStart(now, mode), now)
  }

  /** 光仪聚集状态 */
  function state(now = new Date()): ClepsydraState {
    const week = summary('week', now)
    const today = summary('day', now)
    return computeState(week, { sessionCount: today.count })
  }

  function recordsByDate(): Array<{ date: string; items: WorkRecord[] }> {
    const map = new Map<string, WorkRecord[]>()
    for (const r of records.value) {
      const key = localDateKey(new Date(r.startedAt))
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(r)
    }
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, items]) => ({ date, items }))
  }

  return {
    records: computed(() => records.value),
    running,
    startTimer,
    stopTimer,
    addRecord,
    updateRecord,
    removeRecord,
    removeRecordByAnchor,
    setNote,
    summary,
    state,
    recordsByDate,
    localDateKey,
  }
}