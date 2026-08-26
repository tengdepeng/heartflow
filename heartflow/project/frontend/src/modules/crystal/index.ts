// ============================================================
// 结晶模块：专注完成 → 时间结晶自动生成 & 关联
// ============================================================

import type { FocusSession, TimeCrystal, CrystalShape } from '../../types'
import { storage } from '../../engine/storage'
import { createSeedFromSession, geneToCrystalVisual } from './gene-seed'
import type { GeneSeed } from './gene-seed'

let counter = 0
function uid(): string {
  return `crystal_${Date.now()}_${++counter}`
}

/**
 * 根据完成度决定结晶形状
 * 完美之晶 / 精雕 / 成色 / 初凝 / 残晶
 */
function pickShapeByIntensity(intensity: number): CrystalShape {
  if (intensity >= 0.9) return 'sphere'
  if (intensity >= 0.75) return 'dodecahedron'
  if (intensity >= 0.5) return 'octahedron'
  if (intensity >= 0.25) return 'tetrahedron'
  return 'irregular'
}

/** 带有基因种子的时间结晶 */
export interface TimeCrystalWithGene extends TimeCrystal {
  geneSeed: GeneSeed
}

/** 根据会话数据生成结晶 */
export function crystallizeSession(session: FocusSession): TimeCrystalWithGene {
  const intensity = Math.min(session.elapsed / session.plannedDuration, 1)
  const focusScore = Math.round(intensity * 100)
  // elapsed 单位是毫秒，转为秒
  const elapsedSeconds = Math.round(session.elapsed / 1000)
  const seed = createSeedFromSession(elapsedSeconds, session.tags, focusScore)

  const crystal: TimeCrystalWithGene = {
    id: uid(),
    sessionId: session.id,
    color: seed.genes.color,
    intensity,
    createdAt: new Date().toISOString(),
    shape: pickShapeByIntensity(intensity),
    tags: [...session.tags],
    insight: session.note || null,
    geneSeed: seed,
  }

  return crystal
}

/** 完成专注时：生成结晶并持久化 */
export function completeWithCrystal(session: FocusSession): TimeCrystalWithGene {
  const crystal = crystallizeSession(session)
  storage.addCrystal(crystal)
  return crystal
}

/** 更新结晶属性 */
export function update(id: string, data: Partial<TimeCrystal>): boolean {
  return storage.updateCrystal(id, data)
}

/** 删除结晶 */
export function remove(id: string): boolean {
  return storage.removeCrystal(id)
}

/** 获取当前已完成的专注次数（用于长休息判断） */
export function getCompletedSessionCount(): number {
  return storage.getSessions().filter(s => s.status === 'completed').length
}

/** 根据结晶的基因种子生成视觉配置 */
export function getCrystalVisuals(crystal: TimeCrystal): {
  color: string
  shape: string
  glowIntensity: string
  complexity: string
} {
  if ('geneSeed' in crystal && crystal.geneSeed) {
    return geneToCrystalVisual((crystal as TimeCrystalWithGene).geneSeed)
  }
  // 回退：无基因种子时根据已有属性生成
  return {
    color: crystal.color,
    shape: crystal.shape,
    glowIntensity: `rgba(124, 108, 240, 0.35)`,
    complexity: `${Math.round(crystal.intensity * 3 + 1)}`,
  }
}