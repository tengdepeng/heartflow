// ============================================================
// 根脉之庭 · 核心逻辑（叶子模块）
// 从 index.ts 抽取，消除 index ↔ root-bridge 的 barrel 循环依赖。
// index.ts 仍再导出本模块，公共 API 不变。
// ============================================================

import { ref, computed } from 'vue'
import type { Root, RootLayer } from './types'
import { DEFAULT_STRENGTH, STORAGE_KEY } from './types'
import { storage } from '../../engine/storage'
import {
  weaveTraceTree,
  suggestConnections,
  computeTreeStats,
  type SuggestedConnection,
} from './root-tree'

function loadAll(): Root[] {
  return storage.getKV<Root[]>(STORAGE_KEY, [])
}

function saveAll(data: Root[]) {
  storage.setKV(STORAGE_KEY, data)
}

const roots = ref<Root[]>(loadAll())

export function useRoots() {
  function load() {
    roots.value = loadAll()
  }

  /** 获取所有根系 */
  const allRoots = computed(() => roots.value)

  /** 按层筛选 */
  function getByLayer(layer: RootLayer): Root[] {
    return roots.value.filter(r => r.layer === layer)
  }

  /** 按 ID 查找 */
  function getById(id: string): Root | undefined {
    return roots.value.find(r => r.id === id)
  }

  /**
   * 添加根系节点
   */
  function add(root: Omit<Root, 'id' | 'lastUpdatedAt' | '_expanded'> & { id?: string }): Root {
    const now = new Date().toISOString()
    const item: Root = {
      id: root.id ?? `rt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      layer: root.layer,
      text: root.text,
      detail: root.detail ?? '',
      era: root.era ?? '',
      icon: root.icon ?? '',
      strength: root.strength ?? DEFAULT_STRENGTH,
      connections: root.connections ?? [],
      tags: root.tags ?? [],
      color: root.color ?? '#d4a574',
      willId: root.willId ?? null,
      lastUpdatedAt: now,
      _expanded: false,
    }
    roots.value.unshift(item)
    saveAll(roots.value)
    return item
  }

  /** 删除根系节点 */
  function remove(id: string) {
    roots.value = roots.value.filter(r => r.id !== id)
    saveAll(roots.value)
  }

  /** 更新根系节点（部分字段） */
  function update(id: string, updates: Partial<Root>) {
    const r = roots.value.find(r => r.id === id)
    if (!r) return
    Object.assign(r, updates, { lastUpdatedAt: new Date().toISOString() })
    saveAll(roots.value)
  }

  /** 切换展开/收起 */
  function toggleExpand(id: string) {
    const r = roots.value.find(r => r.id === id)
    if (r) {
      r._expanded = !r._expanded
      saveAll(roots.value)
    }
  }

  /**
   * 自动衰减强度：超过 30 天未更新的节点强度逐渐降低
   */
  function autoDecayStrengths(daysThreshold: number = 30, decayRate: number = 0.05) {
    const now = Date.now()
    const msPerDay = 86400000
    let changed = false

    for (const r of roots.value) {
      const age = (now - new Date(r.lastUpdatedAt).getTime()) / msPerDay
      if (age > daysThreshold) {
        const decay = Math.min(decayRate * Math.floor((age - daysThreshold) / 7), r.strength)
        if (decay > 0.01) {
          r.strength = Math.max(0.1, +(r.strength - decay).toFixed(2))
          changed = true
        }
      }
    }

    if (changed) saveAll(roots.value)
  }

  // ---- 溯源树 ----

  /** 溯源树 */
  const traceTree = computed(() => weaveTraceTree(roots.value))

  /** 连接建议 */
  const connectionSuggestions = computed(() => suggestConnections(roots.value))

  /** 树统计 */
  const treeStats = computed(() => computeTreeStats(traceTree.value))

  /** 接受连接建议 */
  function acceptSuggestion(suggestion: SuggestedConnection) {
    const source = roots.value.find(r => r.id === suggestion.sourceId)
    const target = roots.value.find(r => r.id === suggestion.targetId)
    if (!source || !target) return false

    if (!source.connections.includes(target.id)) {
      source.connections.push(target.id)
    }
    if (!target.connections.includes(source.id)) {
      target.connections.push(source.id)
    }
    source.lastUpdatedAt = new Date().toISOString()
    target.lastUpdatedAt = new Date().toISOString()
    saveAll(roots.value)
    return true
  }

  return {
    roots,
    allRoots,
    load,
    getByLayer,
    getById,
    add,
    remove,
    update,
    toggleExpand,
    autoDecayStrengths,

    // 溯源树
    traceTree,
    connectionSuggestions,
    treeStats,
    acceptSuggestion,
  }
}

/**
 * 获取统计信息
 */
export function getStats(): { total: number; soil: number; era: number; branch: number } {
  const data = loadAll()
  return {
    total: data.length,
    soil: data.filter(r => r.layer === 'soil').length,
    era: data.filter(r => r.layer === 'era').length,
    branch: data.filter(r => r.layer === 'branch').length,
  }
}
