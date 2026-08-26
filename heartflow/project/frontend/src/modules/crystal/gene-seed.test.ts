import { describe, it, expect } from 'vitest'
import { createInitialSeed, createChildSeed, createSeedFromSession, geneToCrystalVisual } from './gene-seed'

describe('gene-seed', () => {
  it('创建初始种子', () => {
    const seed = createInitialSeed()
    expect(seed.generation).toBe(0)
    expect(seed.parentId).toBeNull()
    expect(seed.genes.color).toBe('#a07c8c')
    expect(seed.genes.shape).toBe('round')
    expect(seed.genes.intensity).toBeGreaterThan(0)
    expect(seed.genes.luminescence).toBeGreaterThan(0)
    expect(seed.genes.complexity).toBeGreaterThan(0)
  })

  it('子代种子继承父代基因（突变率为0）', () => {
    const parent = createInitialSeed()
    const child = createChildSeed(parent.genes, 'test-session', parent.generation, 0)
    expect(child.generation).toBe(1)
    expect(child.parentId).toBe('test-session')
    expect(child.dominance).toBeGreaterThanOrEqual(0.5)
  })

  it('子代种子带突变率', () => {
    const parent = createInitialSeed()
    const child = createChildSeed(parent.genes, 'test-session', parent.generation, 0.5)
    expect(child.generation).toBe(1)
    // 突变率受随机偏移影响，但不超过传入值
    expect(child.mutationRate).toBeLessThanOrEqual(0.5)
    expect(child.mutationRate).toBeGreaterThanOrEqual(0.45)
  })

  it('从完整专注数据生成种子', () => {
    const seed = createSeedFromSession(1800, ['工作', '学习'], 80)
    expect(seed.genes.intensity).toBeGreaterThan(0)
    expect(seed.genes.luminescence).toBeGreaterThan(0)
  })

  it('从零专注时长生成种子（最小强度）', () => {
    const seed = createSeedFromSession(0, [], 0)
    expect(seed.genes.intensity).toBeGreaterThanOrEqual(0)
  })

  it('从超长专注时长生成种子', () => {
    const seed = createSeedFromSession(72000, ['深度工作'], 100)
    expect(seed.genes.intensity).toBeGreaterThan(0.8)
    expect(seed.genes.luminescence).toBeGreaterThan(0.5)
  })

  it('从无标签数据生成种子', () => {
    const seed = createSeedFromSession(600, [], 50)
    expect(seed.genes.intensity).toBeGreaterThan(0)
  })

  it('基因转换为视觉配置', () => {
    const seed = createInitialSeed()
    const visual = geneToCrystalVisual(seed)
    expect(visual.color).toBe('#a07c8c')
    expect(visual.shape).toBe('round')
    expect(visual.glowIntensity).toBeTruthy()
    expect(visual.complexity).toBeTruthy()
  })

  it('基因转换结果一致', () => {
    const seed = createInitialSeed()
    const visual1 = geneToCrystalVisual(seed)
    const visual2 = geneToCrystalVisual(seed)
    expect(visual1).toEqual(visual2)
  })
})