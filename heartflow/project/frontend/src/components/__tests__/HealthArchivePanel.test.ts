import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'
import '../../modules/body-wisdom'

function mockStorage() {
  const s = createMockStorage()
  s.setItem('heartflow:storage', JSON.stringify({ version: 10, kvStore: {}, sessions: [], crystals: [] }))
  ;(globalThis as any).localStorage = s
  invalidateCache()
  return s
}

interface P {
  meridianLogs?: { hour: number; feeling: string; at: string; organ?: string; name?: string; date?: string }[]
  wisdomLogs?: { id: string; content: string; at: string; mood?: string; insight?: string }[]
}

async function mountPanel(overrides: P = {}) {
  vi.resetModules()
  const storageMock = mockStorage()
  const mod = await import('../HealthArchivePanel.vue')
  const wrapper = mount(mod.default, {
    props: {
      meridianLogs: overrides.meridianLogs ?? [],
      wisdomLogs: overrides.wisdomLogs ?? [],
    },
  })
  await wrapper.vm.$nextTick()
  return { wrapper, storageMock }
}

describe('HealthArchivePanel 健康档案面板 · 适配与生成', () => {
  it('记录某时辰经络感受后应可生成档案（数据背书）', async () => {
    const storageMock = mockStorage()
    invalidateCache()
    const { useHealthAnalysis } = await import('../../modules/body-wisdom/health-analysis')
    const h = useHealthAnalysis()
    const report = h.generateReport(
      [
        { id: 'm1', meridian: 'heart' as const, feeling: 'good' as const, recordedAt: '2026-08-27T08:00:00Z', hour: 11 },
        { id: 'm2', meridian: 'liver' as const, feeling: 'bad' as const, recordedAt: '2026-08-27T09:00:00Z', hour: 1 },
      ],
      [
        { id: 'w1', mood: 'calm' as const, insight: '', recordedAt: '2026-08-27T08:00:00Z' },
      ],
    )
    expect(report.overallScore).toBeGreaterThan(0)
    expect(report.meridianDetails.some(d => d.meridian === 'heart')).toBe(true)
    const kv = JSON.parse((storageMock.getItem('heartflow:storage') as string)).kvStore
    expect(JSON.parse(kv['hf:body-wisdom:health-analysis']).length).toBeGreaterThan(0)
  })

  it('空状态给出守候文案且无报告', async () => {
    const { wrapper } = await mountPanel()
    expect(wrapper.text()).toContain('健康档案')
    expect(wrapper.text()).toContain('尚无健康档案')
  })

  it('同一面板挂载时适配 store 经络记录并生成档案', async () => {
    const { wrapper, storageMock } = await mountPanel({
      meridianLogs: [
        { hour: 11, feeling: 'good', at: '2026-08-27T08:00:00Z', name: '心', organ: '心' },
        { hour: 1, feeling: 'bad', at: '2026-08-27T09:00:00Z', name: '肝', organ: '肝' },
      ],
      wisdomLogs: [{ id: 'w1', content: '', at: '2026-08-27T08:00:00Z', mood: 'happy' }],
    })
    // 无报告时生成按钮可用，点击生成后呈现综合分
    const btn = wrapper.find('.hcarch-gen')
    expect(btn.exists()).toBe(true)
    expect((btn as any).attributes('disabled')).toBeUndefined()
    await (btn as any).trigger('click')
    await wrapper.vm.$nextTick()
    const kv = JSON.parse((storageMock.getItem('heartflow:storage') as string)).kvStore
    expect(JSON.parse(kv['hf:body-wisdom:health-analysis'])).toHaveLength(1)
  })
})