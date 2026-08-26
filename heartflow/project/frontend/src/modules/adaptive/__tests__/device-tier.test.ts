import { describe, it, expect } from 'vitest'
import { classifyTier, detectDeviceTier } from '../device-tier'

describe('classifyTier', () => {
  it('high: 8 核 + 8G', () => {
    expect(classifyTier({ hardwareConcurrency: 8, deviceMemory: 8 })).toBe('high')
  })
  it('high: 强核 + 大内存 + 独显', () => {
    expect(classifyTier({ hardwareConcurrency: 16, deviceMemory: 32, webglRenderer: 'Apple M2 Pro' })).toBe('high')
  })
  it('mid: 4 核 + 4G', () => {
    expect(classifyTier({ hardwareConcurrency: 4, deviceMemory: 4 })).toBe('mid')
  })
  it('low: 2 核 + 2G', () => {
    expect(classifyTier({ hardwareConcurrency: 2, deviceMemory: 2 })).toBe('low')
  })
  it('缺省值(4核4G) → mid', () => {
    expect(classifyTier({})).toBe('mid')
  })
  it('软件渲染降级: 8核8G 但 SwiftShader → mid', () => {
    expect(classifyTier({ hardwareConcurrency: 8, deviceMemory: 8, webglRenderer: 'Google SwiftShader' })).toBe('mid')
  })
})

describe('detectDeviceTier', () => {
  it('jsdom 环境下返回合法档（缺省指标 → mid）', () => {
    const t = detectDeviceTier()
    expect(['low', 'mid', 'high']).toContain(t)
  })
})
