// ============================================================
// 行囊 · 物品进化系统
// 管理物品从种子到丰收的五阶段成长路径
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '@/engine/storage'

// ============================================================
// 类型定义
// ============================================================

/** 进化阶段 */
export type EvolutionStage = 'seed' | 'sprout' | 'bloom' | 'fruit' | 'harvest'

/** 进化需求项 */
export interface EvolutionRequirement {
  type: 'proficiency' | 'count' | 'time' | 'milestone'
  target: number
  current: number
}

/** 进化路径中的阶段条目 */
export interface EvolutionStageEntry {
  stage: EvolutionStage
  requirements: EvolutionRequirement[]
  unlockedAt?: string
  icon?: string
}

/** 进化路径 */
export interface EvolutionPath {
  id: string
  itemName: string
  currentStage: EvolutionStage
  stages: EvolutionStageEntry[]
  startedAt: string
  updatedAt: string
}

/** 进化统计 */
export interface EvolutionStats {
  totalPaths: number
  activePaths: number
  completedPaths: number
  stageDistribution: Record<EvolutionStage, number>
}

/** 进化进度检查结果 */
export interface EvolutionProgress {
  canEvolve: boolean
  nextStage: EvolutionStage | null
  requirements: EvolutionRequirement[]
  unmetRequirements: EvolutionRequirement[]
}

// ============================================================
// 常量
// ============================================================

/** 进化阶段元信息 */
export const EVOLUTION_STAGE_META: Record<EvolutionStage, {
  label: string
  icon: string
  color: string
  description: string
}> = {
  seed: {
    label: '种子',
    icon: '\uD83C\uDF31',
    color: '#8bc34a',
    description: '初识此物，埋下成长的种子',
  },
  sprout: {
    label: '萌芽',
    icon: '\uD83C\uDF3F',
    color: '#4caf50',
    description: '开始练习，破土而出',
  },
  bloom: {
    label: '绽放',
    icon: '\uD83C\uDF38',
    color: '#e91e63',
    description: '熟练运用，绽放光彩',
  },
  fruit: {
    label: '硕果',
    icon: '\uD83C\uDF4E',
    color: '#ff5722',
    description: '融会贯通，收获果实',
  },
  harvest: {
    label: '丰收',
    icon: '\uD83C\uDFC6',
    color: '#ffc107',
    description: '登峰造极，大丰收',
  },
}

/** 各阶段晋升至下一阶段所需的条件阈值 */
export const STAGE_THRESHOLDS: Record<Exclude<EvolutionStage, 'harvest'>, EvolutionRequirement[]> = {
  seed: [
    { type: 'proficiency', target: 20, current: 0 },
    { type: 'count',       target: 1,  current: 0 },
    { type: 'time',        target: 1,  current: 0 },
  ],
  sprout: [
    { type: 'proficiency', target: 50, current: 0 },
    { type: 'count',       target: 3,  current: 0 },
    { type: 'time',        target: 3,  current: 0 },
  ],
  bloom: [
    { type: 'proficiency', target: 80, current: 0 },
    { type: 'count',       target: 5,  current: 0 },
    { type: 'time',        target: 7,  current: 0 },
  ],
  fruit: [
    { type: 'proficiency', target: 100, current: 0 },
    { type: 'count',       target: 10,  current: 0 },
    { type: 'time',        target: 30,  current: 0 },
    { type: 'milestone',   target: 1,   current: 0 },
  ],
}

/** 行囊存储键 */
export const BAG_STORAGE_KEYS = {
  EVOLUTION_PATHS: 'bag:evolution-paths',
} as const

// ============================================================
// 内部工具
// ============================================================

/** 进化阶段顺序 */
const EVOLUTION_STAGE_ORDER: EvolutionStage[] = ['seed', 'sprout', 'bloom', 'fruit', 'harvest']

/** 生成唯一 ID */
function generateId(): string {
  return `evo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/** 获取当前时间 ISO 字符串 */
function nowISO(): string {
  return new Date().toISOString()
}

/** 计算从指定日期起经过的天数 */
function daysSince(dateStr: string): number {
  const diff = Date.now() - new Date(dateStr).getTime()
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

/** 获取给定阶段的下一阶段，若已是最后阶段则返回 null */
function getNextStage(current: EvolutionStage): EvolutionStage | null {
  const idx = EVOLUTION_STAGE_ORDER.indexOf(current)
  if (idx === -1 || idx === EVOLUTION_STAGE_ORDER.length - 1) return null
  return EVOLUTION_STAGE_ORDER[idx + 1]
}

/** 构建阶段条目 */
function createStageEntry(stage: EvolutionStage, requirements: EvolutionRequirement[]): EvolutionStageEntry {
  return {
    stage,
    requirements: requirements.map(r => ({ ...r })),
    unlockedAt: nowISO(),
    icon: EVOLUTION_STAGE_META[stage].icon,
  }
}

// ============================================================
// Composable
// ============================================================

/** 物品进化系统 composable */
export function useBagEvolution() {
  // ---- 状态 ----

  const paths = ref<EvolutionPath[]>([])

  // ---- 路径管理 ----

  /** 添加新的进化路径（从种子阶段开始） */
  function addPath(itemName: string): EvolutionPath {
    const now = nowISO()
    const path: EvolutionPath = {
      id: generateId(),
      itemName,
      currentStage: 'seed',
      stages: [createStageEntry('seed', [])],
      startedAt: now,
      updatedAt: now,
    }
    paths.value.push(path)
    return path
  }

  /** 移除指定进化路径 */
  function removePath(id: string): boolean {
    const idx = paths.value.findIndex(p => p.id === id)
    if (idx === -1) return false
    paths.value.splice(idx, 1)
    return true
  }

  /** 获取指定进化路径 */
  function getPath(id: string): EvolutionPath | undefined {
    return paths.value.find(p => p.id === id)
  }

  // ---- 进化检查 ----

  /**
   * 检查指定路径是否满足进化条件
   * @param pathId 进化路径 ID
   * @param currentValues 当前物品的实际数值
   * @returns 进化进度检查结果
   */
  function checkProgress(
    pathId: string,
    currentValues: { proficiency: number; count: number; milestone?: number },
  ): EvolutionProgress {
    const path = paths.value.find(p => p.id === pathId)
    if (!path) {
      return {
        canEvolve: false,
        nextStage: null,
        requirements: [],
        unmetRequirements: [],
      }
    }

    const nextStage = getNextStage(path.currentStage)
    if (!nextStage) {
      return {
        canEvolve: false,
        nextStage: null,
        requirements: [],
        unmetRequirements: [],
      }
    }

    // 获取当前阶段对应晋升到下一阶段所需的阈值模板
    const thresholdTemplate = STAGE_THRESHOLDS[path.currentStage as Exclude<EvolutionStage, 'harvest'>]
    const timeDays = daysSince(path.updatedAt)

    // 用当前实际值填充阈值模板中的 current 字段
    const requirements: EvolutionRequirement[] = thresholdTemplate.map(t => {
      let current = 0
      switch (t.type) {
        case 'proficiency':
          current = currentValues.proficiency
          break
        case 'count':
          current = currentValues.count
          break
        case 'time':
          current = timeDays
          break
        case 'milestone':
          current = currentValues.milestone ?? 0
          break
      }
      return { ...t, current }
    })

    const unmetRequirements = requirements.filter(r => r.current < r.target)

    return {
      canEvolve: unmetRequirements.length === 0,
      nextStage,
      requirements,
      unmetRequirements,
    }
  }

  // ---- 进化操作 ----

  /**
   * 将物品晋升至下一阶段
   * @param pathId 进化路径 ID
   * @param currentValues 当前物品的实际数值
   * @returns 进化结果
   */
  function evolveItem(
    pathId: string,
    currentValues: { proficiency: number; count: number; milestone?: number },
  ): { success: boolean; path?: EvolutionPath; nextStage?: EvolutionStage } {
    const progress = checkProgress(pathId, currentValues)
    if (!progress.canEvolve || !progress.nextStage) {
      return { success: false }
    }

    const path = paths.value.find(p => p.id === pathId)
    if (!path) {
      return { success: false }
    }

    const nextStage = progress.nextStage

    // 推进阶段
    path.currentStage = nextStage
    path.updatedAt = nowISO()

    // 记录新阶段条目
    path.stages.push(createStageEntry(nextStage, progress.requirements))

    return { success: true, path, nextStage }
  }

  // ---- 统计 ----

  /** 进化统计（响应式计算） */
  const getEvolutionStats = computed<EvolutionStats>(() => {
    const all = paths.value
    const totalPaths = all.length
    const completedPaths = all.filter(p => p.currentStage === 'harvest').length
    const activePaths = totalPaths - completedPaths

    const stageDistribution: Record<EvolutionStage, number> = {
      seed: 0,
      sprout: 0,
      bloom: 0,
      fruit: 0,
      harvest: 0,
    }

    for (const p of all) {
      stageDistribution[p.currentStage]++
    }

    return {
      totalPaths,
      activePaths,
      completedPaths,
      stageDistribution,
    }
  })

  /**
   * 获取当前可进化的物品列表
   * @param itemData 物品名称到当前数值的映射
   * @returns 可进化的进化路径列表
   */
  function getAvailableEvolutions(
    itemData: Record<string, { proficiency: number; count: number; milestone?: number }>,
  ): EvolutionPath[] {
    return paths.value.filter(p => {
      const values = itemData[p.itemName]
      if (!values) return false
      return checkProgress(p.id, values).canEvolve
    })
  }

  // ---- 持久化 ----

  /** 从存储加载进化路径数据 */
  async function load(): Promise<void> {
    const saved = storage.getKV<EvolutionPath[]>(BAG_STORAGE_KEYS.EVOLUTION_PATHS, [])
    paths.value = saved
  }

  /** 将进化路径数据持久化到存储 */
  async function persist(): Promise<void> {
    storage.setKV(BAG_STORAGE_KEYS.EVOLUTION_PATHS, paths.value)
  }

  // ============================================================
  // 导出
  // ============================================================

  return {
    // 状态
    paths,

    // 路径管理
    addPath,
    removePath,
    getPath,

    // 进化
    checkProgress,
    evolveItem,

    // 统计
    getEvolutionStats,
    getAvailableEvolutions,

    // 持久化
    load,
    persist,

    // 常量
    EVOLUTION_STAGE_META,
    STAGE_THRESHOLDS,
  }
}