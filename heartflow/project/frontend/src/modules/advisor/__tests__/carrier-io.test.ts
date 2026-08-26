import { describe, it, expect } from 'vitest'
import {
  sanitizeCarrier,
  exportCarrierFile,
  parseCarrierFile,
  CARRIER_FILE_SCHEMA,
} from '../carrier-io'
import type { AdvisorCarrier, AdvisorProfile } from '../../../types/advisor'
import { advisorCarrierStageOf } from '../../../types/advisor'

describe('carrier-io · 载体本地 IO', () => {
  it('sanitizeCarrier 接受合法官方几何', () => {
    const c = sanitizeCarrier({ kind: 'official-geometry', geometry: 'orb', formLabel: '玉珠' })
    expect(c).toBeDefined()
    expect(c!.kind).toBe('official-geometry')
    expect(c!.geometry).toBe('orb')
    expect(c!.formLabel).toBe('玉珠')
  })

  it('sanitizeCarrier 拒绝非法 kind', () => {
    expect(sanitizeCarrier({ kind: 'bogus' })).toBeUndefined()
  })

  it('sanitizeCarrier 拒绝官方几何但无 geometry', () => {
    expect(sanitizeCarrier({ kind: 'official-geometry' })).toBeUndefined()
  })

  it('sanitizeCarrier 拒绝 user-image 但无 imageData', () => {
    expect(sanitizeCarrier({ kind: 'user-image' })).toBeUndefined()
  })

  it('sanitizeCarrier 接受合法 user-image', () => {
    const c = sanitizeCarrier({ kind: 'user-image', imageData: 'data:image/png;base64,AAA' })
    expect(c).toBeDefined()
    expect(c!.kind).toBe('user-image')
    expect(c!.imageData).toBe('data:image/png;base64,AAA')
  })

  it('sanitizeCarrier 规整生命阶段覆盖', () => {
    const c = sanitizeCarrier({
      kind: 'official-geometry',
      geometry: 'orb',
      stages: {
        birth: { kind: 'official-geometry', geometry: 'seed' },
        bogus: { kind: 'official-geometry', geometry: 'orb' },
      },
    } as Record<string, unknown>)
    expect(c).toBeDefined()
    expect(c!.stages?.birth?.geometry).toBe('seed')
    expect(Object.keys(c!.stages ?? {}).sort()).toEqual(['birth'])
  })

  it('export/parse 往返一致（含生命阶段）', () => {
    const carrier: AdvisorCarrier = {
      kind: 'official-geometry',
      geometry: 'crystal',
      formLabel: '暖光灯笼',
      stages: { legacy: { kind: 'user-image', imageData: 'data:image/png;base64,XYZ' } },
    }
    const text = exportCarrierFile(carrier, '测试载体')
    const parsed = parseCarrierFile(text)
    expect(parsed.schema).toBe(CARRIER_FILE_SCHEMA)
    expect(parsed.name).toBe('测试载体')
    expect(parsed.carrier.geometry).toBe('crystal')
    expect(parsed.carrier.stages?.legacy?.imageData).toBe('data:image/png;base64,XYZ')
  })

  it('parseCarrierFile 拒绝非法格式', () => {
    expect(() => parseCarrierFile('not json')).toThrow()
    expect(() => parseCarrierFile(JSON.stringify({ schema: 'wrong', carrier: { kind: 'official-geometry', geometry: 'orb' } }))).toThrow()
  })
})

describe('advisorCarrierStageOf · 幕僚载体生命周期推导', () => {
  function base(over: Partial<AdvisorProfile> = {}): AdvisorProfile {
    return {
      id: 'x', name: 'x', role: 'companion', personality: 'steady', state: 'awake',
      affinity: 0, level: 0, totalInteractions: 0,
      createdAt: new Date().toISOString(), lastActiveAt: null, unlocked: true,
      ...over,
    } as AdvisorProfile
  }
  const DAY = 86_400_000

  it('退休幕僚 → legacy（传承/归档）', () => {
    expect(advisorCarrierStageOf(base({ retired: true }))).toBe('legacy')
  })
  it('新生（<30d）→ birth', () => {
    expect(advisorCarrierStageOf(base({ createdAt: new Date().toISOString() }))).toBe('birth')
  })
  it('30–180d → growth', () => {
    const created = new Date(Date.now() - 60 * DAY).toISOString()
    expect(advisorCarrierStageOf(base({ createdAt: created }))).toBe('growth')
  })
  it('180–365d → mature', () => {
    const created = new Date(Date.now() - 200 * DAY).toISOString()
    expect(advisorCarrierStageOf(base({ createdAt: created }))).toBe('mature')
  })
  it('≥365d：高亲密度 → mature，低亲密度 → aging（久疏）', () => {
    const created = new Date(Date.now() - 400 * DAY).toISOString()
    expect(advisorCarrierStageOf(base({ createdAt: created, affinity: 60 }))).toBe('mature')
    expect(advisorCarrierStageOf(base({ createdAt: created, affinity: 10 }))).toBe('aging')
  })
})
