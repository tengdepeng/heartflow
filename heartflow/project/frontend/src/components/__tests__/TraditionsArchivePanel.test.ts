// ============================================================
// TraditionsArchivePanel 测试 - 文明档案面板（INCR-16）
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import TraditionsArchivePanel from '../TraditionsArchivePanel.vue'
import type { FolkloreEntry } from '../../modules/traditions'

function makeEntry(
  id: string,
  category: FolkloreEntry['category'],
  region: string,
  practiceCount: number,
  source: FolkloreEntry['source'] = 'personal',
  over: Partial<FolkloreEntry> = {},
): FolkloreEntry {
  const now = new Date().toISOString()
  return {
    id,
    name: `条目_${id}`,
    category,
    region,
    description: `${id} 的描述`,
    steps: ['备料'],
    materials: ['竹'],
    meanings: ['祈福'],
    inheritor: undefined,
    tags: ['民俗'],
    endangered: false,
    recordedAt: now,
    lastPracticedAt: undefined,
    practiceCount,
    source,
    mediaUrls: [],
    ...over,
  }
}

function mountPanel(entries: FolkloreEntry[]) {
  return mount(TraditionsArchivePanel, { props: { entries } })
}

describe('TraditionsArchivePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('空库渲染档案标题与空态引导', () => {
    const wrapper = mountPanel([])
    expect(wrapper.text()).toContain('文明档案')
    expect(wrapper.text()).toContain('文明的根系还是一片空地')
  })

  it('档案概览统计正确', () => {
    const entries = [
      makeEntry('e1', 'handicraft', '江南', 0),
      makeEntry('e2', 'culinary', '徽州', 3, 'family', { endangered: true }),
      makeEntry('e3', 'seasonal', '江南', 1),
      makeEntry('e4', 'ancestral', '成都', 0, 'community'),
    ]
    const wrapper = mountPanel(entries)
    const text = wrapper.text()
    expect(text).toContain('档案概览')
    expect(text).toContain('总记录')
    expect(text).toContain('累计实践')
    expect(text).toContain('覆盖类别')
    expect(text).toContain('覆盖地域')
    expect(wrapper.find('.trp-empty').exists()).toBe(false)
  })

  it('技艺与仪式分布渲染', () => {
    const entries = [
      makeEntry('e1', 'handicraft', '江南', 1),
      makeEntry('e2', 'culinary', '徽州', 0, 'family'),
      makeEntry('e3', 'seasonal', '江南', 0),
      makeEntry('e4', 'ancestral', '成都', 0, 'community'),
    ]
    const wrapper = mountPanel(entries)
    expect(wrapper.text()).toContain('技艺分布')
    expect(wrapper.text()).toContain('仪式分布')
    expect(wrapper.text()).toContain('手工艺')
    expect(wrapper.text()).toContain('岁时节令')
  })

  it('地域与来源分布渲染（来源措辞本地化）', () => {
    const entries = [
      makeEntry('e1', 'handicraft', '江南', 0),
      makeEntry('e2', 'culinary', '徽州', 0, 'family'),
      makeEntry('e3', 'seasonal', '成都', 0, 'community'),
      makeEntry('e4', 'ancestral', '洛阳', 0, 'public'),
    ]
    const wrapper = mountPanel(entries)
    const text = wrapper.text()
    expect(text).toContain('地域分布')
    expect(text).toContain('来源分布')
    expect(text).toContain('江南')
    expect(text).toContain('徽州')
    // 宪法安全：不出现「社区/公共」社交措辞
    expect(text).not.toContain('社区')
    expect(text).not.toContain('公共')
    expect(text).toContain('邻里')
    expect(text).toContain('文献')
  })

  it('实践分档渲染', () => {
    const entries = [
      makeEntry('e1', 'handicraft', '江南', 0),
      makeEntry('e2', 'culinary', '徽州', 3, 'family'),
      makeEntry('e3', 'seasonal', '江南', 1),
      makeEntry('e4', 'ancestral', '成都', 0),
    ]
    const wrapper = mountPanel(entries)
    const text = wrapper.text()
    expect(text).toContain('实践分档')
    expect(text).toContain('未实践')
    expect(text).toContain('偶有实践')
    expect(text).toContain('常践常新')
  })

  it('文明健康分数与标签渲染', () => {
    const entries = [
      makeEntry('e1', 'handicraft', '江南', 0),
      makeEntry('e2', 'culinary', '徽州', 3, 'family'),
      makeEntry('e3', 'seasonal', '江南', 1),
      makeEntry('e4', 'ancestral', '成都', 0),
    ]
    const wrapper = mountPanel(entries)
    expect(wrapper.text()).toContain('文明健康')
    expect(wrapper.text()).toContain('广度')
    expect(wrapper.text()).toContain('传承')
    expect(wrapper.text()).toContain('延续')
  })

  it('温和洞察生成', () => {
    const entries = [
      makeEntry('e1', 'handicraft', '江南', 0),
      makeEntry('e2', 'culinary', '徽州', 3, 'family'),
      makeEntry('e3', 'seasonal', '江南', 1),
      makeEntry('e4', 'ancestral', '成都', 0),
    ]
    const wrapper = mountPanel(entries)
    expect(wrapper.text()).toContain('温和洞察')
    expect(wrapper.find('.trp-insights li').exists()).toBe(true)
  })
})