import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

function makeMark(overrides: Record<string, any> = {}, dayOffset = 0) {
  const d = new Date()
  d.setDate(d.getDate() - dayOffset)
  return {
    id: 's_' + Math.random().toString(36).slice(2, 7),
    bodyPart: '臂',
    severity: 3 as const,
    description: '一道深刻的工痕',
    scarType: 'cut' as const,
    at: d.toISOString(),
    ...overrides,
  }
}

async function mountPanel(marks: Record<string, any>[] = []) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore: { scars: marks },
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../ScarVisualizationPanel.vue')
  const wrapper = mount(mod.default)
  await flushPromises()
  return wrapper
}

describe('ScarVisualizationPanel 伤痕可视化', () => {
  it('空状态提示尚无伤痕记录', async () => {
    const wrapper = await mountPanel([])
    expect(wrapper.text()).toContain('还没有伤痕记录')
    expect(wrapper.find('.svp-body').exists()).toBe(false)
  })

  it('有伤痕时渲染身体分布图与部位列表', async () => {
    const marks = [
      makeMark({ id: 'a', bodyPart: '臂', severity: 4, at: new Date(Date.now() - 1 * 86400000).toISOString() }),
      makeMark({ id: 'b', bodyPart: '臂', severity: 2, at: new Date(Date.now() - 9 * 86400000).toISOString() }),
      makeMark({ id: 'c', bodyPart: '胸', severity: 5, at: new Date(Date.now() - 2 * 86400000).toISOString() }),
      makeMark({ id: 'd', bodyPart: '腿', severity: 3, at: new Date(Date.now() - 4 * 86400000).toISOString() }),
    ]
    const wrapper = await mountPanel(marks)
    expect(wrapper.findAll('.svp-body-node').length).toBe(3)
    expect(wrapper.findAll('.svp-body-row').length).toBe(3)
    expect(wrapper.text()).toContain('手臂')
    expect(wrapper.text()).toContain('胸部')
  })

  it('渲染严重度雷达与类型分布', async () => {
    const marks = [
      makeMark({ id: 'a', bodyPart: 'arm', severity: 4, scarType: 'cut' }),
      makeMark({ id: 'b', bodyPart: 'arm', severity: 2, scarType: 'impact' }),
      makeMark({ id: 'c', bodyPart: 'chest', severity: 5, scarType: 'burn' }),
      makeMark({ id: 'd', bodyPart: 'leg', severity: 3, scarType: 'wear' }),
    ]
    const wrapper = await mountPanel(marks)
    expect(wrapper.find('.svp-radar-svg').exists()).toBe(true)
    expect(wrapper.findAll('.svp-type').length).toBe(4)
    expect(wrapper.text()).toContain('割裂')
  })

  it('未愈合伤痕进入愈合时间线，跨季度生成成长曲线', async () => {
    const marks = [
      makeMark({ id: 'a', bodyPart: '臂', at: new Date(Date.now() - 3 * 86400000).toISOString() }),
      makeMark({ id: 'b', bodyPart: '胸', at: new Date(Date.now() - 5 * 86400000).toISOString() }),
      makeMark({ id: 'c', bodyPart: '腿', at: new Date(Date.now() - 200 * 86400000).toISOString() }),
    ]
    const wrapper = await mountPanel(marks)
    expect(wrapper.findAll('.svp-tl-item').length).toBe(2)
    expect(wrapper.findAll('.svp-curve-col').length).toBeGreaterThan(0)
  })
})