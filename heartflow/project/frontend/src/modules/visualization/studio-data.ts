// ============================================================
// 数据视觉工坊 · 本地数据源适配器（M1 接线）
// ============================================================
// 把真实本地 KV（storage）映射到 SevenDimensionEngine 的输入契约
// SevenDimensionDataItem。
//
// 设计要点 —— 为什么"不"用 useDataSourceConnector：
//   useDataSourceConnector 面向网络/REST/WebSocket 数据源，其核心
//   fetchData() 走 window.fetch(url)，与宪法第1条「本地私有、数据
//   绝不离开本设备」直接冲突。本地优先存储已是纯本地读取 API，
//   这里直接消费 storage 并映射，既合规又省去一层无意义网络抽象。
//   若未来确有外部数据源需求，再经由合规网关接入，不在本模块内。

import { ref, shallowRef, computed } from 'vue'
import {
  createSevenDimensionEngine,
  parseNaturalLanguage,
  nlpConfigToSevenDimensionConfig,
} from './dimension-mapping/seven-dimensions'
import type {
  SevenDimensionDataItem,
  SevenDimensionConfig,
} from './dimension-mapping/seven-dimensions'
import type { FocusSession, Note, EmotionRecord } from '../../types'
import type { Anchor } from '../anchor/types'
import { storage } from '../../engine/storage'

// ============================================================
// 主题（subject）定义
// ============================================================

/** 可视化主题：对应四类本地数据域 */
export type VizSubject = 'sessions' | 'notes' | 'emotions' | 'anchors'

/** 主题描述符（用于 UI 标签与空态提示） */
export interface VizSubjectDescriptor {
  key: VizSubject
  label: string
  hint: string
}

export const VIZ_SUBJECTS: VizSubjectDescriptor[] = [
  { key: 'sessions', label: '专注会话', hint: '尚无专注会话记录，去主页开始一次专注吧' },
  { key: 'notes', label: '笔记语丝', hint: '还没有任何笔记' },
  { key: 'emotions', label: '情绪花房', hint: '还没有情绪记录' },
  { key: 'anchors', label: '逐日心锚', hint: '还没有安放任何心锚' },
]

// ============================================================
// 工具：时间字段 → 毫秒时间戳
// ============================================================

function toMs(value: string | null | undefined): number | undefined {
  if (!value) return undefined
  const t = Date.parse(value)
  return Number.isNaN(t) ? undefined : t
}

// ============================================================
// 映射：专注会话 → SevenDimensionDataItem
// ============================================================

export function mapSessionsToItems(sessions: FocusSession[]): SevenDimensionDataItem[] {
  return sessions.map((s) => {
    const elapsedMin = s.elapsed / 60000
    const plannedMin = s.plannedDuration / 60000
    const focusRatio = plannedMin > 0 ? Math.min(1, elapsedMin / plannedMin) : 0
    return {
      id: s.id,
      label: `${s.mode} · ${elapsedMin.toFixed(0)}min`,
      values: {
        elapsedMin,
        plannedMin,
        focusRatio,
      },
      categories: {
        mode: s.mode,
        status: s.status,
      },
      timestamp: toMs(s.startedAt) ?? toMs(s.completedAt),
      metadata: { tags: s.tags, note: s.note },
    }
  })
}

// ============================================================
// 映射：笔记 → SevenDimensionDataItem
// ============================================================

export function mapNotesToItems(notes: Note[]): SevenDimensionDataItem[] {
  return notes
    .filter((n) => !n.deletedAt)
    .map((n) => ({
      id: n.id,
      label: n.title || n.content.slice(0, 12),
      values: {
        tagCount: (n.tags ?? []).length,
        titleLen: (n.title ?? '').length,
      },
      categories: {
        priority: n.priority ?? 'normal',
        archived: n.archived ? 'archived' : 'active',
      },
      timestamp: toMs(n.createdAt),
      metadata: { roomId: n.roomId, due: n.due },
    }))
}

// ============================================================
// 映射：情绪 → SevenDimensionDataItem
// ============================================================

export function mapEmotionsToItems(emotions: EmotionRecord[]): SevenDimensionDataItem[] {
  return emotions.map((e) => ({
    id: e.id,
    label: e.type,
    values: { weight: 1 },
    categories: {
      type: e.type,
    },
    timestamp: toMs(e.createdAt),
    metadata: { note: e.note },
  }))
}

// ============================================================
// 映射：逐日心锚 → SevenDimensionDataItem
// ============================================================

export function mapAnchorsToItems(anchors: Anchor[]): SevenDimensionDataItem[] {
  return anchors.map((a) => ({
    id: a.id,
    label: a.text.slice(0, 16),
    values: {
      driftCount: a.driftCount,
    },
    categories: {
      priority: a.priority,
      done: a.done ? 'done' : 'pending',
    },
    timestamp: toMs(a.targetDate) ?? toMs(a.createdAt),
    metadata: { category: a.category, tags: a.tags },
  }))
}

// ============================================================
// 从真实本地存储加载所有主题
// ============================================================

export function loadVisualizationSubjects(): Record<VizSubject, SevenDimensionDataItem[]> {
  return {
    sessions: mapSessionsToItems(storage.getSessions()),
    notes: mapNotesToItems(storage.getNotes()),
    emotions: mapEmotionsToItems(storage.getEmotions()),
    anchors: mapAnchorsToItems(storage.getAnchors()),
  }
}

// ============================================================
// 各主题的默认七维配置
// 使用确定性布局（避免 free-scatter 的 Math.random 导致渲染抖动/测试不穩）
// ============================================================

export function buildDefaultConfig(subject: VizSubject): Partial<SevenDimensionConfig> {
  switch (subject) {
    case 'sessions':
      return {
        shape: { type: 'light-point' },
        size: { mode: 'size-by-value', field: 'elapsedMin', domain: [0, 60], range: [4, 28], scale: 'sqrt' },
        color: { mode: 'unified', unified: { color: '#d4a574' } },
        relation: { mode: 'left-to-right' },
        time: { mode: 'none', field: 'timestamp' },
      }
    case 'notes':
      return {
        shape: { type: 'light-bubble' },
        size: { mode: 'size-by-value', field: 'tagCount', domain: [0, 6], range: [4, 24], scale: 'linear' },
        color: {
          mode: 'category',
          category: { field: 'priority', colorMap: { high: '#e87030', normal: '#80b8d0', low: '#90a0b0' }, defaultColor: '#888888' },
        },
        relation: { mode: 'around-same-center' },
        time: { mode: 'none', field: 'timestamp' },
      }
    case 'emotions':
      return {
        shape: { type: 'glow' },
        size: { mode: 'size-by-value', field: 'weight', domain: [0, 1], range: [10, 26], scale: 'linear' },
        color: {
          mode: 'category',
          category: {
            field: 'type',
            colorMap: { happy: '#f0c040', calm: '#80b8d0', sad: '#9080b8', anxious: '#c05050', angry: '#e87030' },
            defaultColor: '#888888',
          },
        },
        relation: { mode: 'center-outward-radial' },
        time: { mode: 'none', field: 'timestamp' },
      }
    case 'anchors':
      return {
        shape: { type: 'light-sphere' },
        size: { mode: 'size-by-value', field: 'driftCount', domain: [0, 5], range: [4, 22], scale: 'sqrt' },
        color: {
          mode: 'category',
          category: { field: 'priority', colorMap: { must: '#f0c040', can: '#80b8d0', float: 'rgba(255,255,255,0.3)' }, defaultColor: '#888888' },
        },
        relation: { mode: 'grid' },
        time: { mode: 'none', field: 'timestamp' },
      }
  }
}

// ============================================================
// 组合式：数据视觉工坊运行时状态
// ============================================================

export function useVisualizationStudio() {
  const subjects = ref<Record<VizSubject, SevenDimensionDataItem[]>>(loadVisualizationSubjects())
  const activeSubject = ref<VizSubject>('sessions')
  const nlDescription = ref('')
  const lastApplied = ref<{ success: boolean; unrecognized: string[] } | null>(null)
  const engine = shallowRef(createSevenDimensionEngine(buildDefaultConfig('sessions')))

  const items = computed(() => subjects.value[activeSubject.value])
  const isEmpty = computed(() => items.value.length === 0)

  function selectSubject(subject: VizSubject): void {
    activeSubject.value = subject
    nlDescription.value = ''
    lastApplied.value = null
    engine.value = createSevenDimensionEngine(buildDefaultConfig(subject))
  }

  /**
   * 用自然语言描述调整七维配置。
   * 仅合并 NLP 实际解析出的维度（不影响未提及的维度），并与默认配置叠加。
   */
  function applyNaturalLanguage(description: string) {
    const parsed = parseNaturalLanguage(description)
    const nlConfig = nlpConfigToSevenDimensionConfig(parsed, items.value)
    engine.value = createSevenDimensionEngine({
      ...buildDefaultConfig(activeSubject.value),
      ...nlConfig,
    })
    lastApplied.value = { success: parsed.success, unrecognized: parsed.unrecognized }
    return parsed
  }

  function resetConfig(): void {
    nlDescription.value = ''
    lastApplied.value = null
    engine.value = createSevenDimensionEngine(buildDefaultConfig(activeSubject.value))
  }

  return {
    subjects,
    activeSubject,
    items,
    isEmpty,
    nlDescription,
    lastApplied,
    engine,
    selectSubject,
    applyNaturalLanguage,
    resetConfig,
  }
}
