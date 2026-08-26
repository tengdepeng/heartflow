import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

const HISTORY_KEY = 'hf:body-wisdom:constitution-trend-history'
const SCORES_KEY = 'hf:body-wisdom:wellness-scores'
const CHANGELOG_KEY = 'hf:body-wisdom:constitution-change-log'

function trendPoint(date: string, type: string, label: string, score: number) {
  return {
    date,
    type,
    label,
    scores: { [type]: score, balanced: 0.2 },
    primaryScore: score,
    stability: 0.8,
  }
}

async function mountPanel(kv: Record<string, any> = {}) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore: kv,
    sessions: [],
    crystals: [],
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../ConstitutionTrendPanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('ConstitutionTrendPanel 体质趋势', () => {
  it('空状态提示', async () => {
    const wrapper = await mountPanel({})
    expect(wrapper.text()).toContain('体质趋势')
    expect(wrapper.text()).toContain('暂无体质记录')
  })

  it('展示体质稳定性', async () => {
    const wrapper = await mountPanel({
      [HISTORY_KEY]: [
        trendPoint('2026-08-01T00:00:00.000Z', 'qi-deficiency', '气虚质', 0.6),
        trendPoint('2026-08-08T00:00:00.000Z', 'qi-deficiency', '气虚质', 0.62),
        trendPoint('2026-08-15T00:00:00.000Z', 'qi-deficiency', '气虚质', 0.65),
      ],
    })
    expect(wrapper.text()).toContain('稳定')
    expect(wrapper.text()).toContain('气虚质')
  })

  it('展示最近趋势方向', async () => {
    const wrapper = await mountPanel({
      [HISTORY_KEY]: [
        trendPoint('2026-07-01T00:00:00.000Z', 'qi-deficiency', '气虚质', 0.5),
        trendPoint('2026-07-08T00:00:00.000Z', 'qi-deficiency', '气虚质', 0.55),
        trendPoint('2026-07-15T00:00:00.000Z', 'qi-deficiency', '气虚质', 0.6),
        trendPoint('2026-07-22T00:00:00.000Z', 'qi-deficiency', '气虚质', 0.65),
        trendPoint('2026-07-29T00:00:00.000Z', 'qi-deficiency', '气虚质', 0.7),
      ],
    })
    expect(wrapper.text()).toContain('改善')
  })

  it('展示养生评分', async () => {
    const wrapper = await mountPanel({
      [SCORES_KEY]: [{
        overall: 82,
        dimensions: { physical: 80, emotional: 85, seasonal: 70, meridian: 75, lifestyle: 90 },
        labels: { physical: '体质', emotional: '情绪', seasonal: '季节适配', meridian: '经络', lifestyle: '作息' },
        change: 5,
        trend: 'improving',
        assessedAt: '2026-08-20T00:00:00.000Z',
      }],
    })
    expect(wrapper.text()).toContain('养生评分')
    expect(wrapper.text()).toContain('82')
    expect(wrapper.text()).toContain('体质')
    expect(wrapper.text()).toContain('情绪')
  })

  it('展示体质转变记录', async () => {
    const wrapper = await mountPanel({
      [CHANGELOG_KEY]: [{
        hasChanged: true,
        previousType: 'qi-deficiency',
        currentType: 'balanced',
        changeType: 'gradual',
        direction: 'improved',
        confidence: 0.85,
        detectedAt: '2026-08-10T00:00:00.000Z',
        recommendations: ['体质正在改善'],
      }],
    })
    expect(wrapper.text()).toContain('体质转变记录')
    expect(wrapper.text()).toContain('气虚质')
    expect(wrapper.text()).toContain('平和质')
    expect(wrapper.text()).toContain('改善')
  })
})
