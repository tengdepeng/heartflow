// ============================================================
// 世界生命系统 · 世界传承引擎
// 管理世代更替、种子继承、遗志传承的聚合视图。
// 蓝图：世界级生命系统 — 昼夜/天气/传承
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'
import type { JadeBeadCarrier, LifecycleStage } from '../carrier'
import type { TimeSeed } from '../play/time-seed'

// ---- 世代定义 ----

export interface WorldGeneration {
  id: string
  /** 世代序号 (1-based) */
  number: number
  /** 起始时间 */
  startedAt: string
  /** 结束时间（null = 当前世代） */
  endedAt: string | null
  /** 活跃载体 ID */
  carrierId: string
  /** 载体名称 */
  carrierName: string
  /** 载体生命周期阶段 */
  carrierStage: LifecycleStage
  /** 继承自上一世代的载体 ID */
  inheritedFromCarrierId: string | null
  /** 继承的时间种子数量 */
  inheritedSeedCount: number
  /** 继承的遗志数量 */
  inheritedWillCount: number
  /** 该世代产出的遗志 ID 列表 */
  willIds: string[]
  /** 该世代的时间种子数 */
  seedCount: number
  /** 该世代专注总分钟数 */
  focusMinutes: number
  /** 该世代情绪花园花朵数 */
  flowerCount: number
}

export interface WorldLegacy {
  generations: WorldGeneration[]
  currentGeneration: WorldGeneration | null
  totalGenerations: number
  /** 跨世代传承的种子总数 */
  totalInheritedSeeds: number
  /** 跨世代传承的遗志总数 */
  totalInheritedWills: number
}

// ---- 存储键 ----

const GENERATIONS_KEY = 'hf:world_life:generations'

// ---- 模块级状态 ----

const generations = ref<WorldGeneration[]>([])

function loadGenerations(): WorldGeneration[] {
  try {
    return storage.getKV<WorldGeneration[]>(GENERATIONS_KEY, [])
  } catch {
    return []
  }
}

function saveGenerations(gens: WorldGeneration[]): void {
  storage.setKV(GENERATIONS_KEY, gens)
}

// ---- 公共 API ----

export function useWorldLegacy() {
  /** 加载世代数据 */
  function load(): void {
    generations.value = loadGenerations()
  }

  /** 当前世代 */
  const currentGeneration = computed<WorldGeneration | null>(() =>
    generations.value.find(g => g.endedAt === null) ?? null,
  )

  /** 所有已结束的世代（历史） */
  const pastGenerations = computed<WorldGeneration[]>(() =>
    generations.value.filter(g => g.endedAt !== null),
  )

  /** 完整传承摘要 */
  const legacy = computed<WorldLegacy>(() => {
    const gens = generations.value
    return {
      generations: gens,
      currentGeneration: currentGeneration.value,
      totalGenerations: gens.length,
      totalInheritedSeeds: gens.reduce((sum, g) => sum + g.inheritedSeedCount, 0),
      totalInheritedWills: gens.reduce((sum, g) => sum + g.inheritedWillCount, 0),
    }
  })

  /**
   * 开始新世代（当载体退休后创建新载体时调用）。
   * 自动继承上一世代的种子和遗志。
   */
  function beginNewGeneration(
    newCarrier: JadeBeadCarrier,
    inheritedSeeds: TimeSeed[] = [],
    inheritedWillIds: string[] = [],
  ): WorldGeneration {
    const prev = currentGeneration.value

    // 结束上一世代
    if (prev) {
      const idx = generations.value.findIndex(g => g.id === prev.id)
      if (idx >= 0) {
        generations.value[idx] = { ...prev, endedAt: new Date().toISOString() }
      }
    }

    const gen: WorldGeneration = {
      id: `gen_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      number: generations.value.length + 1,
      startedAt: new Date().toISOString(),
      endedAt: null,
      carrierId: newCarrier.id,
      carrierName: newCarrier.name,
      carrierStage: newCarrier.lifecycleStage ?? 'newborn',
      inheritedFromCarrierId: prev?.carrierId ?? null,
      inheritedSeedCount: inheritedSeeds.length,
      inheritedWillCount: inheritedWillIds.length,
      willIds: [...inheritedWillIds],
      seedCount: inheritedSeeds.length,
      focusMinutes: 0,
      flowerCount: 0,
    }

    generations.value.push(gen)
    saveGenerations(generations.value)
    return gen
  }

  /**
   * 更新当前世代统计（由各模块在数据变化时调用）。
   */
  function updateStats(updates: Partial<Pick<WorldGeneration, 'seedCount' | 'focusMinutes' | 'flowerCount' | 'willIds'>>): void {
    const gen = currentGeneration.value
    if (!gen) return
    const idx = generations.value.findIndex(g => g.id === gen.id)
    if (idx < 0) return
    generations.value[idx] = { ...generations.value[idx], ...updates }
    saveGenerations(generations.value)
  }

  /**
   * 生成世代传承叙事：总结从一个世代到下一个世代的传承关系。
   */
  function generateLegacyNarrative(): string[] {
    const lines: string[] = []
    const gens = [...generations.value].sort((a, b) => a.number - b.number)

    for (let i = 1; i < gens.length; i++) {
      const prev = gens[i - 1]
      const curr = gens[i]
      const parts: string[] = []

      parts.push(`第${prev.number}代「${prev.carrierName}」→ 第${curr.number}代「${curr.carrierName}」`)

      if (curr.inheritedSeedCount > 0) {
        parts.push(`传承了 ${curr.inheritedSeedCount} 枚时间种子`)
      }
      if (curr.inheritedWillCount > 0) {
        parts.push(`传承了 ${curr.inheritedWillCount} 份遗志`)
      }
      if (curr.willIds.length > 0) {
        parts.push(`留下了 ${curr.willIds.length} 份遗志`)
      }

      lines.push(parts.join('，'))
    }

    return lines
  }

  /**
   * 获取世代传承树（用于可视化）。
   */
  function getLegacyTree(): { id: string; label: string; children: string[] }[] {
    return generations.value.map(g => ({
      id: g.id,
      label: `第${g.number}代 · ${g.carrierName}`,
      children: g.endedAt === null ? [] : [],
    }))
  }

  /** 重置模块级状态（仅用于测试隔离） */
  function _reset(): void {
    generations.value = []
  }

  return {
    generations,
    currentGeneration,
    pastGenerations,
    legacy,
    load,
    beginNewGeneration,
    updateStats,
    generateLegacyNarrative,
    getLegacyTree,
    _reset,
  }
}