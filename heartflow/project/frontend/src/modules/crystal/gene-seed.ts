// ============================================================
// 时间种子·遗传体系
// 每个时间结晶都携带基因，可遗传变异
// ============================================================

export interface GeneSeed {
  version: number
  /** 基因亲本 ID（结晶的 sessionId） */
  parentId: string | null
  /** 代际 */
  generation: number
  /** 基因序列（决定结晶外观和属性） */
  genes: {
    color: string          // 颜色基因
    shape: 'round' | 'sharp' | 'branch' | 'cloud'  // 形状基因
    intensity: number      // 强度基因 (0-1)
    luminescence: number   // 发光基因 (0-1)
    complexity: number     // 复杂度基因 (0-1)
    resilience: number     // 韧性基因 (0-1)
  }
  /** 显性基因占比 */
  dominance: number
  /** 突变率 */
  mutationRate: number
}

/** 默认基因 */
export const DEFAULT_GENES: GeneSeed['genes'] = {
  color: '#a07c8c',
  shape: 'round',
  intensity: 0.5,
  luminescence: 0.5,
  complexity: 0.3,
  resilience: 0.5,
}

/** 根据父代基因创建子代种子 */
export function createChildSeed(
  parentGenes: GeneSeed['genes'],
  parentId: string,
  generation: number,
  mutationRate: number = 0.15,
): GeneSeed {
  const childGenes = { ...parentGenes }

  // 对每个基因位，以 mutationRate 概率发生突变
  for (const key of Object.keys(childGenes) as (keyof GeneSeed['genes'])[]) {
    if (Math.random() < mutationRate) {
      if (typeof childGenes[key] === 'number') {
        // 数值型基因：随机偏移 ±0.3
        const numVal = (childGenes[key] as number) + (Math.random() - 0.5) * 0.6
        ;(childGenes as any)[key] = Math.max(0, Math.min(1, numVal))
      } else if (key === 'color') {
        // 颜色基因：随机偏移色相
        const newColor = shiftHue(childGenes[key] as string, Math.random() * 60 - 30)
        if (newColor) { ;(childGenes as any)[key] = newColor }
      } else if (key === 'shape') {
        // 形状基因：随机突变到其他形状
        const shapes: GeneSeed['genes']['shape'][] = ['round', 'sharp', 'branch', 'cloud']
        ;(childGenes as any)[key] = shapes[Math.floor(Math.random() * shapes.length)]
      }
    }
  }

  // 计算显性基因占比（与父代的相似度）
  let matchCount = 0
  let totalCount = 0
  for (const key of Object.keys(childGenes) as (keyof GeneSeed['genes'])[]) {
    totalCount++
    if (key === 'color') {
      if (childGenes[key] === parentGenes[key]) matchCount++
    } else if (typeof childGenes[key] === 'number') {
      if (Math.abs((childGenes[key] as number) - (parentGenes[key] as number)) < 0.1) matchCount++
    } else {
      if (childGenes[key] === parentGenes[key]) matchCount++
    }
  }

  const childMutationRate = Math.min(0.5, mutationRate + (Math.random() - 0.5) * 0.1)

  return {
    version: 1,
    parentId,
    generation: generation + 1,
    genes: childGenes,
    dominance: matchCount / totalCount,
    mutationRate: childMutationRate,
  }
}

/** 创建初始种子（无父代） */
export function createInitialSeed(): GeneSeed {
  return {
    version: 1,
    parentId: null,
    generation: 0,
    genes: { ...DEFAULT_GENES },
    dominance: 1,
    mutationRate: 0.15,
  }
}

/** 从专注数据生成种子 */
export function createSeedFromSession(
  elapsedSeconds: number,
  tags: string[],
  focusScore: number,
): GeneSeed {
  const intensity = Math.min(1, elapsedSeconds / (3600 * 2)) // 2小时达最大强度
  const luminescence = Math.min(1, focusScore / 100)
  const complexity = Math.min(1, tags.length / 5)
  const resilience = (intensity + luminescence) / 2
  const hue = (elapsedSeconds * 0.1) % 360
  const color = `hsl(${hue}, 70%, 60%)`

  return {
    version: 1,
    parentId: null,
    generation: 0,
    genes: {
      color,
      shape: intensity > 0.7 ? 'sharp' : intensity > 0.4 ? 'round' : 'cloud',
      intensity,
      luminescence,
      complexity,
      resilience,
    },
    dominance: 1,
    mutationRate: 0.15,
  }
}

/** 辅助：HSL色相偏移 */
function shiftHue(color: string, degrees: number): string | null {
  // 支持 hex 和 hsl 格式
  if (color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16)
    const g = parseInt(color.slice(3, 5), 16)
    const b = parseInt(color.slice(5, 7), 16)
    const [h, s, l] = rgbToHsl(r, g, b)
    return hslToHex((h + degrees + 360) % 360, s, l)
  }
  return null
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0, l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return [h * 360, s * 100, l * 100]
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const a = s * Math.min(l, 1 - l)
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))))
  }
  return `#${f(0).toString(16).padStart(2, '0')}${f(8).toString(16).padStart(2, '0')}${f(4).toString(16).padStart(2, '0')}`
}

/** 根据基因生成结晶外观配置 */
export function geneToCrystalVisual(seed: GeneSeed): {
  color: string; shape: string; glowIntensity: string; complexity: string
} {
  const g = seed.genes
  return {
    color: g.color,
    shape: g.shape,
    glowIntensity: `rgba(124, 108, 240, ${g.luminescence * 0.5 + 0.1})`,
    complexity: `${Math.round(g.complexity * 3 + 1)}`,
  }
}