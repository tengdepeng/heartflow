// ============================================================
// 情绪花房 · 花园环境系统
// 根据情绪记录动态生成花房的空间布局、环境光效、花朵位置
// ============================================================

import type { EmotionRecord, EmotionType, EmotionAmbientMood } from './types'
import { EMOTION_FLOWERS } from './types'

// ---- 花园配置 ----

export interface GardenConfig {
  /** 画布宽度 */
  width: number
  /** 画布高度 */
  height: number
  /** 地面高度占比 */
  groundRatio: number
  /** 花朵最大数量 */
  maxFlowers: number
  /** 花朵间距最小值 */
  minSpacing: number
}

export const DEFAULT_GARDEN_CONFIG: GardenConfig = {
  width: 800,
  height: 500,
  groundRatio: 0.7,
  maxFlowers: 30,
  minSpacing: 40,
}

// ---- 环境状态 ----

export type SkyCondition = 'clear' | 'cloudy' | 'rain' | 'storm' | 'sunset' | 'night'
export type GroundCondition = 'lush' | 'dry' | 'wet' | 'frost'

export interface GardenEnvironment {
  /** 天空状态 */
  sky: SkyCondition
  /** 地面状态 */
  ground: GroundCondition
  /** 环境光颜色 */
  ambientLight: string
  /** 天空渐变（顶部色，底部色） */
  skyGradient: [string, string]
  /** 粒子效果类型 */
  particleType: 'none' | 'sparkle' | 'rain' | 'petal' | 'snow'
  /** 粒子颜色 */
  particleColor: string
  /** 花朵摇曳幅度 */
  swayIntensity: number
}

// ---- 花朵位置 ----

export interface FlowerPosition {
  /** 花朵 ID */
  id: string
  /** 所属情绪记录 ID */
  recordId: string
  /** 情绪类型 */
  type: EmotionType
  /** X 坐标 (0-1 归一化) */
  x: number
  /** Y 坐标 (0-1 归一化，0=顶部) */
  y: number
  /** 花朵大小倍率 */
  scale: number
  /** 旋转角度 (deg) */
  rotation: number
  /** 是否盛开 */
  bloomed: boolean
  /** 透明度 */
  opacity: number
  /** 深度层级 (0=最远, 1=最近) */
  depth: number
  /** 创建时间 */
  createdAt: string
}

// ---- 环境计算 ----

/**
 * 根据情绪氛围计算花园环境
 * 蓝图：normal=晴天翠绿, warm=日落暖光, dim=阴雨湿润, bright=晴朗闪烁
 */
export function computeEnvironment(mood: EmotionAmbientMood): GardenEnvironment {
  switch (mood) {
    case 'bright':
      return {
        sky: 'clear',
        ground: 'lush',
        ambientLight: '#fef9e0',
        skyGradient: ['#87ceeb', '#e0f0ff'],
        particleType: 'sparkle',
        particleColor: '#ffeaa7',
        swayIntensity: 0.3,
      }
    case 'warm':
      return {
        sky: 'sunset',
        ground: 'lush',
        ambientLight: '#fff3e0',
        skyGradient: ['#ff9a76', '#fef9e0'],
        particleType: 'petal',
        particleColor: '#f5d060',
        swayIntensity: 0.5,
      }
    case 'dim':
      return {
        sky: 'rain',
        ground: 'wet',
        ambientLight: '#d0d8e0',
        skyGradient: ['#8899aa', '#c0c8d0'],
        particleType: 'rain',
        particleColor: '#a0b8d0',
        swayIntensity: 0.8,
      }
    case 'normal':
    default:
      return {
        sky: 'clear',
        ground: 'lush',
        ambientLight: '#f5f0e8',
        skyGradient: ['#a8d8ea', '#e8f0f8'],
        particleType: 'none',
        particleColor: 'transparent',
        swayIntensity: 0.4,
      }
  }
}

/**
 * 根据情绪类型获取花朵生长阶段
 * 蓝图：新记录=花苞，多次同类型=盛开，长期未记录=凋谢
 */
export function getFlowerStage(
  _record: EmotionRecord,
  sameTypeCount: number,
  daysSinceLast: number,
): { bloomed: boolean; scale: number; opacity: number } {
  // 同一类型记录越多，花朵越大
  const scale = Math.min(0.6 + sameTypeCount * 0.08, 1.2)

  // 超过 7 天未记录该情绪，开始凋谢
  if (daysSinceLast > 14) {
    return { bloomed: false, scale: scale * 0.6, opacity: 0.3 }
  }
  if (daysSinceLast > 7) {
    return { bloomed: false, scale: scale * 0.8, opacity: 0.5 }
  }

  // 最近 3 天内有记录，盛开
  const isRecent = daysSinceLast <= 3
  return { bloomed: isRecent, scale, opacity: isRecent ? 1.0 : 0.7 }
}

// ---- 空间布局算法 ----

/**
 * 使用泊松盘采样生成花朵位置
 * 确保花朵之间不重叠，且分布自然
 */
function poissonDiskSample(
  count: number,
  config: GardenConfig,
  existingPositions: { x: number; y: number }[] = [],
): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [...existingPositions]
  const minDist = config.minSpacing / Math.min(config.width, config.height)
  const maxAttempts = 30

  for (let i = 0; i < count; i++) {
    let bestX = 0
    let bestY = 0
    let bestDist = 0
    let found = false

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // 随机候选位置（地面区域，留边距）
      const cx = 0.05 + Math.random() * 0.9
      const cy = config.groundRatio - 0.05 + Math.random() * (1 - config.groundRatio - 0.05)

      // 计算与已有位置的最小距离
      let minD = Infinity
      for (const p of positions) {
        const dx = cx - p.x
        const dy = cy - p.y
        const d = Math.sqrt(dx * dx + dy * dy)
        if (d < minD) minD = d
      }

      if (minD > minDist && minD > bestDist) {
        bestX = cx
        bestY = cy
        bestDist = minD
        found = true
        if (minD > minDist * 2) break // 足够好，提前结束
      }
    }

    if (found) {
      positions.push({ x: bestX, y: bestY })
    } else {
      // 如果找不到合适位置，随机放置
      positions.push({
        x: 0.05 + Math.random() * 0.9,
        y: config.groundRatio + Math.random() * (1 - config.groundRatio - 0.1),
      })
    }
  }

  return positions.slice(existingPositions.length)
}

// ---- 花朵布局生成 ----

/**
 * 根据情绪记录生成花园花朵布局
 * 蓝图：同类型情绪聚集成花丛，不同类型分区域
 */
export function generateFlowerLayout(
  records: EmotionRecord[],
  config: GardenConfig = DEFAULT_GARDEN_CONFIG,
): FlowerPosition[] {
  if (records.length === 0) return []

  // 按情绪类型分组
  const typeGroups = new Map<EmotionType, EmotionRecord[]>()
  for (const r of records) {
    if (!typeGroups.has(r.type)) typeGroups.set(r.type, [])
    typeGroups.get(r.type)!.push(r)
  }

  const emotionTypes = ['happy', 'calm', 'sad', 'anxious', 'angry'] as EmotionType[]
  const now = Date.now()
  const dayMs = 86400000

  // 为每种情绪类型分配区域（从左到右分布）
  const typeCount = emotionTypes.filter(t => typeGroups.has(t)).length
  if (typeCount === 0) return []

  const flowers: FlowerPosition[] = []
  let typeIndex = 0

  for (const type of emotionTypes) {
    const group = typeGroups.get(type)
    if (!group || group.length === 0) continue

    // 该类型的区域范围
    const zoneStart = typeIndex / typeCount
    const zoneEnd = (typeIndex + 1) / typeCount
    const zoneWidth = zoneEnd - zoneStart

    // 取最近 N 条记录生成花朵
    const recentRecords = group.slice(0, config.maxFlowers)
    const sameTypeCount = group.length

    // 为该类型生成花朵位置
    const flowerCount = Math.min(recentRecords.length, Math.floor(config.maxFlowers / typeCount))
    const zoneConfig: GardenConfig = {
      ...config,
      width: config.width * zoneWidth,
      minSpacing: config.minSpacing * 0.8,
    }

    const rawPositions = poissonDiskSample(flowerCount, zoneConfig)

    for (let i = 0; i < Math.min(flowerCount, recentRecords.length); i++) {
      const record = recentRecords[i]
      const daysSinceLast = Math.floor((now - new Date(record.createdAt).getTime()) / dayMs)
      const stage = getFlowerStage(record, sameTypeCount, daysSinceLast)

      const pos = rawPositions[i] || { x: 0.5, y: 0.5 }

      flowers.push({
        id: `flower_${record.id}`,
        recordId: record.id,
        type: record.type,
        x: zoneStart + pos.x * zoneWidth,
        y: pos.y,
        scale: stage.scale,
        rotation: (record.id.charCodeAt(0) * 7 + i * 13) % 360,
        bloomed: stage.bloomed,
        opacity: stage.opacity,
        depth: 0.3 + (i / recentRecords.length) * 0.7,
        createdAt: record.createdAt,
      })
    }

    typeIndex++
  }

  return flowers
}

// ---- 花丛统计 ----

export interface FlowerCluster {
  type: EmotionType
  count: number
  bloomedCount: number
  dominantColor: string
  centerX: number
  centerY: number
}

/**
 * 获取花丛统计信息
 * 蓝图：每种情绪类型的花丛数量、盛开数、颜色
 */
export function getFlowerClusters(flowers: FlowerPosition[]): FlowerCluster[] {
  const clusters = new Map<EmotionType, FlowerCluster>()

  for (const f of flowers) {
    if (!clusters.has(f.type)) {
      clusters.set(f.type, {
        type: f.type,
        count: 0,
        bloomedCount: 0,
        dominantColor: EMOTION_FLOWERS[f.type].color,
        centerX: 0,
        centerY: 0,
      })
    }
    const c = clusters.get(f.type)!
    c.count++
    if (f.bloomed) c.bloomedCount++
    c.centerX += f.x
    c.centerY += f.y
  }

  for (const c of clusters.values()) {
    if (c.count > 0) {
      c.centerX /= c.count
      c.centerY /= c.count
    }
  }

  return [...clusters.values()]
}

// ---- 花园健康度 ----

export interface GardenHealth {
  /** 花园覆盖率 (0-1) */
  coverage: number
  /** 花朵多样性 (0-1) */
  diversity: number
  /** 盛开率 (0-1) */
  bloomRate: number
  /** 最近活跃度 (0-1) */
  recentActivity: number
  /** 整体健康评分 (0-100) */
  score: number
  /** 健康描述 */
  description: string
}

/**
 * 计算花园健康度
 * 蓝图：覆盖率+多样性+盛开率+活跃度 → 综合评分
 */
export function calculateGardenHealth(
  flowers: FlowerPosition[],
  records: EmotionRecord[],
  config: GardenConfig = DEFAULT_GARDEN_CONFIG,
): GardenHealth {
  const coverage = Math.min(flowers.length / config.maxFlowers, 1)
  const diversity = new Set(flowers.map(f => f.type)).size / 5
  const bloomRate = flowers.length > 0
    ? flowers.filter(f => f.bloomed).length / flowers.length
    : 0

  // 最近 7 天活跃度
  const now = Date.now()
  const weekMs = 7 * 86400000
  const recentCount = records.filter(r => now - new Date(r.createdAt).getTime() < weekMs).length
  const recentActivity = Math.min(recentCount / 14, 1) // 每天2条=满分

  const score = Math.round(
    (coverage * 25 + diversity * 25 + bloomRate * 25 + recentActivity * 25),
  )

  let description: string
  if (score >= 80) description = '花房繁茂，生机盎然'
  else if (score >= 60) description = '花园生长良好，偶有花苞待放'
  else if (score >= 40) description = '花房略显稀疏，需要更多关注'
  else if (score >= 20) description = '花园凋零，好久没有新花朵了'
  else description = '花园荒芜，是时候播下第一颗种子了'

  return { coverage, diversity, bloomRate, recentActivity, score, description }
}

// ---- LOD 降级 ----

export type LODLevel = 'high' | 'medium' | 'low'

/**
 * 根据花朵数量决定 LOD 等级
 */
export function getLODLevel(flowerCount: number): LODLevel {
  if (flowerCount <= 10) return 'high'
  if (flowerCount <= 25) return 'medium'
  return 'low'
}

/**
 * LOD 降级：减少渲染的花朵数量
 */
export function applyLOD(flowers: FlowerPosition[], level: LODLevel): FlowerPosition[] {
  switch (level) {
    case 'high':
      return flowers
    case 'medium':
      // 保留深度 > 0.3 的花朵（前景花），减少远景花
      return flowers.filter(f => f.depth > 0.3 || f.bloomed)
    case 'low':
      // 只保留盛开的花朵和最近的花
      return flowers.filter(f => f.bloomed || f.depth > 0.6)
  }
}