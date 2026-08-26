// ============================================================
// 家 · 环境气味维度（气候层第五维）单元测试
// 蓝图第一层「环境系统」：环境含 光/声音/动态/触觉暗示/气味暗示
// ============================================================

import { describe, expect, it, beforeEach } from 'vitest'
import { storage } from '../../../engine/storage'
import {
  ATMOSPHERE_PRESETS,
  SCENT_PROFILES,
  SCENT_PROFILE_MAP,
  parseScentLayer,
} from '../home-atmosphere-engine'
import type { AtmosphereScent } from '../home-atmosphere-engine'
import { useHomeAtmosphereEngine } from '../home-atmosphere-engine'

const STORAGE_KEYS = ['hf:home:atmosphere', 'hf:home:transitions', 'hf:home:dashboard', 'hf:home:activities']

beforeEach(() => {
  for (const key of STORAGE_KEYS) storage.setKV(key, key.includes('atmosphere') ? '' : '[]')
})

describe('气味维度 · 数据模型', () => {
  it('SCENT_PROFILES 提供 8 个语义气味符号', () => {
    expect(SCENT_PROFILES.length).toBe(8)
    const ids = SCENT_PROFILES.map(p => p.id)
    expect(ids).toContain('earth-oldpaper')
    expect(ids).toContain('warm-food')
    expect(ids).toContain('clean-fabric')
  })

  it('SCENT_PROFILE_MAP 与 SCENT_PROFILES 一致', () => {
    expect(Object.keys(SCENT_PROFILE_MAP).length).toBe(SCENT_PROFILES.length)
    for (const p of SCENT_PROFILES) {
      expect(SCENT_PROFILE_MAP[p.id]).toBe(p)
    }
  })

  it('每个气味符号都有合法调性与落色', () => {
    const tones = ['earthy', 'woody', 'leather', 'herbal', 'warm', 'floral', 'fresh', 'mineral']
    for (const p of SCENT_PROFILES) {
      expect(tones).toContain(p.tone)
      expect(p.color).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })
})

describe('气味维度 · 预设播种', () => {
  it('全部 6 个氛围预设都带 scentHints', () => {
    expect(ATMOSPHERE_PRESETS.length).toBe(6)
    for (const preset of ATMOSPHERE_PRESETS) {
      expect(Array.isArray(preset.scentHints)).toBe(true)
      expect(preset.scentHints.length).toBeGreaterThan(0)
    }
  })

  it('厨房预设主打暖食与烟火气味', () => {
    const kitchen = ATMOSPHERE_PRESETS.find(p => p.name === '烟火厨房')!
    expect(kitchen.scentHints.some(s => s.symbolId === 'warm-food')).toBe(true)
  })

  it('衣帽间预设带洁净布料与皮革帆布', () => {
    const wardrobe = ATMOSPHERE_PRESETS.find(p => p.name === '衣香鬓影')!
    const ids = wardrobe.scentHints.map(s => s.symbolId)
    expect(ids).toContain('clean-fabric')
    expect(ids).toContain('leather-canvas')
  })

  it('预设引用的 symbolId 都在 SCENT_PROFILE_MAP 中', () => {
    for (const preset of ATMOSPHERE_PRESETS) {
      for (const h of preset.scentHints) {
        expect(SCENT_PROFILE_MAP[h.symbolId]).toBeTruthy()
      }
    }
  })

  it('强度被夹在 0-1 区间', () => {
    for (const preset of ATMOSPHERE_PRESETS) {
      for (const h of preset.scentHints) {
        expect(h.intensity).toBeGreaterThanOrEqual(0)
        expect(h.intensity).toBeLessThanOrEqual(1)
      }
    }
  })
})

describe('气味维度 · 解析与消费', () => {
  it('parseScentLayer 将 hints 解析为带 label/color 的展示项', () => {
    const hints: AtmosphereScent[] = [
      { symbolId: 'warm-food', intensity: 0.6 },
      { symbolId: 'earth-oldpaper', intensity: 0.3 },
    ]
    const parsed = parseScentLayer(hints)
    expect(parsed.length).toBe(2)
    expect(parsed[0].label).toBe('暖食与烟火')
    expect(parsed[0].color).toBe('#d98a4a')
    expect(parsed[0].intensity).toBe(0.6)
    expect(parsed[0].tone).toBe('warm')
  })

  it('parseScentLayer 跳过未知 symbolId', () => {
    const hints: AtmosphereScent[] = [
      { symbolId: 'warm-food', intensity: 0.5 },
      { symbolId: 'does-not-exist', intensity: 0.5 },
    ]
    const parsed = parseScentLayer(hints)
    expect(parsed.length).toBe(1)
    expect(parsed[0].symbolId).toBe('warm-food')
  })

  it('parseScentLayer 将越界强度夹回 0-1', () => {
    const parsed = parseScentLayer([{ symbolId: 'herb', intensity: 2 }])
    expect(parsed[0].intensity).toBe(1)
    const parsedLow = parseScentLayer([{ symbolId: 'herb', intensity: -1 }])
    expect(parsedLow[0].intensity).toBe(0)
  })

  it('parseScentLayer 对空/undefined 返回空数组', () => {
    expect(parseScentLayer(undefined)).toEqual([])
    expect(parseScentLayer([])).toEqual([])
  })

  it('激活预设后 activeScentHints 返回解析后的气味', () => {
    const engine = useHomeAtmosphereEngine()
    // 取一个带气味的预设并激活
    const kitchen = engine.presets.value.find(p => p.name === '烟火厨房')!
    engine.activatePreset(kitchen.id)
    expect(engine.activeScentHints.value.length).toBeGreaterThan(0)
    expect(engine.activeScentHints.value[0].label).toBe('暖食与烟火')
  })

  it('未激活预设时 activeScentHints 为空', () => {
    const engine = useHomeAtmosphereEngine()
    expect(engine.activePresetId.value).toBeNull()
    expect(engine.activeScentHints.value).toEqual([])
  })
})
