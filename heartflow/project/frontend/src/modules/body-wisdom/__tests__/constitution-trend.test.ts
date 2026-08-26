// ============================================================
// 藏象阁 · 体质趋势单例（getConstitutionTrendStore）测试
// 跨组件共享趋势状态 + load() 存储重载
// ============================================================

import { describe, expect, it, beforeEach } from 'vitest'
import type { ConstitutionAnalysis } from '../types'
import { CONSTITUTION_META } from '../types'
import { useConstitutionTrend, getConstitutionTrendStore } from '../constitution-trend'
import { storage } from '../../../engine/storage'

const TREND_STORAGE_KEYS = {
  trendHistory: 'hf:body-wisdom:constitution-trend-history',
  wellnessScores: 'hf:body-wisdom:wellness-scores',
  changeLog: 'hf:body-wisdom:constitution-change-log',
}

function createAnalysis(type: string = 'balanced'): ConstitutionAnalysis {
  const scores: Record<string, number> = {
    balanced: 0.8,
    'qi-deficiency': 0.3,
    'yang-deficiency': 0.2,
    'yin-deficiency': 0.1,
    'phlegm-dampness': 0.1,
    'damp-heat': 0.1,
    'blood-stasis': 0.05,
    'qi-stagnation': 0.1,
    allergic: 0.05,
  }
  return {
    type: type as any,
    label: CONSTITUTION_META[type as keyof typeof CONSTITUTION_META]?.label ?? type,
    scores: scores as any,
    characteristics: ['面色润泽'],
    recommendations: ['保持良好习惯'],
    analyzedAt: new Date().toISOString(),
  }
}

describe('getConstitutionTrendStore - 单例', () => {
  beforeEach(() => {
    storage.setKV(TREND_STORAGE_KEYS.trendHistory, [])
    storage.setKV(TREND_STORAGE_KEYS.wellnessScores, [])
    storage.setKV(TREND_STORAGE_KEYS.changeLog, [])
  })

  it('多次调用返回同一实例', () => {
    const a = getConstitutionTrendStore()
    const b = getConstitutionTrendStore()
    expect(a).toBe(b)
  })

  it('通过单例添加趋势点并持久化', () => {
    const store = getConstitutionTrendStore()
    store.addTrendPoint(createAnalysis('balanced'))
    expect(store.trendHistory.value).toHaveLength(1)
    expect(store.trendHistory.value[0].type).toBe('balanced')
    // 持久化到存储
    const saved = storage.getKV<unknown[]>('hf:body-wisdom:constitution-trend-history', [])
    expect(saved).toHaveLength(1)
  })

  it('load() 从存储重载状态（跨实例同步）', () => {
    // 用一个独立实例写入存储
    const writer = useConstitutionTrend()
    writer.addTrendPoint(createAnalysis('qi-deficiency'))

    // 单例 load() 后能看到外部写入
    const store = getConstitutionTrendStore()
    store.load()
    expect(store.trendHistory.value).toHaveLength(1)
    expect(store.trendHistory.value[0].type).toBe('qi-deficiency')
  })
})
