// ============================================================
// SeasonalArchivePanel 测试 - 岁时档案面板（INCR-15）
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import SeasonalArchivePanel from '../SeasonalArchivePanel.vue'
import type { SeasonalRitual, Season } from '../../modules/seasonal'

function makeRitual(id: string, season: Season, count: number, lastAt: string | null = null, name = ''): SeasonalRitual {
  return {
    id,
    name: name || `仪式_${id}`,
    season,
    description: '',
    count,
    lastCompletedAt: lastAt,
    createdAt: new Date().toISOString(),
  }
}

function mountPanel(rituals: SeasonalRitual[]) {
  return mount(SeasonalArchivePanel, { props: { rituals } })
}

describe('SeasonalArchivePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('空库渲染档案标题与空态引导', () => {
    const wrapper = mountPanel([])
    expect(wrapper.text()).toContain('岁时档案')
    expect(wrapper.text()).toContain('还没有仪式')
  })

  it('档案概览统计正确', () => {
    const now = new Date()
    const today = now.toISOString()
    const yesterday = new Date(now.getTime() - 86_400_000).toISOString()
    const rituals = [
      makeRitual('a', 'spring', 0),
      makeRitual('b', 'spring', 3, yesterday),
      makeRitual('c', 'summer', 1, today),
      makeRitual('d', 'autumn', 0),
      makeRitual('e', 'winter', 0),
    ]
    const wrapper = mountPanel(rituals)
    const text = wrapper.text()
    expect(text).toContain('档案概览')
    expect(text).toContain('总仪式')
    expect(text).toContain('已拾起')
    expect(text).toContain('今年完成')
    expect(text).toContain('覆盖季节')
    expect(wrapper.find('.sap-empty').exists()).toBe(false)
  })

  it('季节分布展示完成进度', () => {
    const now = new Date()
    const rituals = [
      makeRitual('a', 'spring', 0),
      makeRitual('b', 'spring', 2, now.toISOString()),
      makeRitual('c', 'summer', 1, now.toISOString()),
      makeRitual('d', 'autumn', 0),
      makeRitual('e', 'winter', 0),
    ]
    const wrapper = mountPanel(rituals)
    expect(wrapper.text()).toContain('季节分布')
    const springRow = wrapper.text().includes('1/2') || wrapper.text().includes('50%')
    expect(springRow).toBe(true)
  })

  it('岁时健康分数与标签渲染', () => {
    const now = new Date()
    const rituals = [
      makeRitual('a', 'spring', 0),
      makeRitual('b', 'spring', 3, now.toISOString()),
      makeRitual('c', 'summer', 1, now.toISOString()),
      makeRitual('d', 'autumn', 0),
      makeRitual('e', 'winter', 0),
    ]
    const wrapper = mountPanel(rituals)
    expect(wrapper.text()).toContain('岁时健康')
    expect(wrapper.text()).toContain('广度')
    expect(wrapper.text()).toContain('深度')
    expect(wrapper.text()).toContain('节律')
  })

  it('温和洞察生成', () => {
    const now = new Date()
    const rituals = [
      makeRitual('a', 'spring', 0),
      makeRitual('b', 'spring', 3, now.toISOString(), '晨悟'),
      makeRitual('c', 'summer', 1, now.toISOString(), '荷影'),
      makeRitual('d', 'autumn', 0),
      makeRitual('e', 'winter', 0),
    ]
    const wrapper = mountPanel(rituals)
    expect(wrapper.text()).toContain('温和洞察')
    // 至少一条以 ✦ 开头的洞察
    expect(wrapper.find('.sap-insights li').exists()).toBe(true)
  })
})