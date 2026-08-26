import { describe, it, expect, beforeEach } from 'vitest'
import { useAdaptiveQuality } from '../useAdaptiveQuality'
import { storage } from '@/engine/storage'

describe('useAdaptiveQuality', () => {
  beforeEach(() => {
    storage.setKV('hf:adaptive-tier', null)
  })

  it('默认跟随自动探测档', () => {
    const q = useAdaptiveQuality()
    expect(q.override.value).toBeNull()
    expect(q.effectiveTier.value).toBe(q.detectedTier)
    expect(q.profile.value.dprCap).toBeGreaterThan(0)
  })

  it('覆盖为 low → 生效 low 档且持久化', () => {
    const q = useAdaptiveQuality()
    q.setOverride('low')
    expect(q.effectiveTier.value).toBe('low')
    expect(q.profile.value.dprCap).toBe(1)
    expect(q.profile.value.particleScale).toBe(0.4)
    expect(q.profile.value.animationEnabled).toBe(false)
    expect(storage.getKV<unknown>('hf:adaptive-tier', null)).toBe('low')
  })

  it('覆盖为 high → 最高 DPR', () => {
    const q = useAdaptiveQuality()
    q.setOverride('high')
    expect(q.profile.value.dprCap).toBe(2)
    expect(q.profile.value.particleScale).toBe(1)
  })

  it('覆盖置空 → 回到自动档', () => {
    const q = useAdaptiveQuality()
    q.setOverride('low')
    q.setOverride(null)
    expect(q.effectiveTier.value).toBe(q.detectedTier)
    expect(storage.getKV<unknown>('hf:adaptive-tier', null)).toBeNull()
  })
})
