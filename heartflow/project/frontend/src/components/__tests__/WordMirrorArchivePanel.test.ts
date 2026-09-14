// ============================================================
// 字镜档案面板测试（INCR-50）
// 覆盖空态（字镜未启）与填充态（概览/熟练度/状态/节律/打磨/健康/洞察）
// 纯函数经 direct subpath 真实引入；words/history 数据 mock 于 word-mirror-store
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

const mock = vi.hoisted(() => {
  const state = { words: [] as any[], history: [] as any[] }
  return { state }
})

vi.mock('../../modules/word-mirror/word-mirror-store', () => ({
  useWordMirror: () => ({
    words: ref(mock.state.words),
    history: ref(mock.state.history),
  }),
}))

const DAY = 24 * 60 * 60 * 1000
const NOW = new Date()
function daysAgo(d: number): string {
  return new Date(NOW.getTime() - d * DAY).toISOString()
}

function word(overrides: Record<string, any> = {}) {
  return {
    id: `w_${Math.random().toString(36).slice(2, 6)}`,
    word: '词',
    definition: '释义',
    proficiency: 3,
    favorite: false,
    createdAt: daysAgo(10),
    ...overrides,
  }
}

function hitem(overrides: Record<string, any> = {}) {
  return {
    id: `h_${Math.random().toString(36).slice(2, 6)}`,
    text: '一段文字',
    topWords: ['字'],
    mood: '平静',
    at: daysAgo(1),
    ...overrides,
  }
}

async function mountPanel() {
  const { default: WordMirrorArchivePanel } = await import('../WordMirrorArchivePanel.vue')
  const wrapper = mount(WordMirrorArchivePanel)
  await wrapper.vm.$nextTick()
  return wrapper
}

beforeEach(() => {
  mock.state.words = []
  mock.state.history = []
})

describe('WordMirrorArchivePanel 空态', () => {
  it('无词汇且无分析历史时显示「字镜未启」引导', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('.wmap-archive').exists()).toBe(true)
    expect(wrapper.find('.wmap-badge-neutral').text()).toBe('字镜未启')
    expect(wrapper.text()).toContain('字镜还是空的')
    expect(wrapper.find('.wmap-block').exists()).toBe(false)
  })
})

describe('WordMirrorArchivePanel 填充态', () => {
  beforeEach(() => {
    // 6 词：精通3(5/5/4) + 学习中1(3) + 生疏2(2 距25天 / 1 无复习 距40天)
    mock.state.words = [
      word({ word: '澄', proficiency: 5, favorite: true, lastReviewedAt: daysAgo(1) }),
      word({ word: '澈', proficiency: 5, lastReviewedAt: daysAgo(2) }),
      word({ word: '映', proficiency: 4, lastReviewedAt: daysAgo(3) }),
      word({ word: '照', proficiency: 3, lastReviewedAt: daysAgo(4) }),
      word({ word: '蒙', proficiency: 2, lastReviewedAt: daysAgo(25) }),
      word({ word: '尘', proficiency: 1, createdAt: daysAgo(40) }),
    ]
    mock.state.history = [
      hitem({ at: daysAgo(1) }),
      hitem({ at: daysAgo(5) }),
    ]
  })

  it('渲染标题与字镜健康徽章', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('.wmap-title').text()).toBe('✨ 字镜档案')
    const badge = wrapper.find('.wmap-badge')
    expect(badge.exists()).toBe(true)
    expect(['字镜初磨', '字迹初现', '映字渐明', '字镜清明']).toContain(badge.text())
  })

  it('渲染字镜概览八格', async () => {
    const wrapper = await mountPanel()
    const block = wrapper.findAll('.wmap-block')[0]
    const nums = block.findAll('.wmap-cell-num')
    // 总 6 / 精通 3 / 收藏 1 / 生疏 2 / 平均熟练 3.33 / 已复习 5 / 近7天 4 / 文字分析 2
    expect(nums[0].text()).toContain('6')
    expect(nums[1].text()).toContain('3')
    expect(nums[2].text()).toContain('1')
    expect(nums[3].text()).toContain('2')
    expect(nums[4].text()).toContain('3.33')
    expect(nums[5].text()).toContain('5')
    expect(nums[6].text()).toContain('4')
    expect(nums[7].text()).toContain('2')
  })

  it('渲染熟练度分布五行', async () => {
    const wrapper = await mountPanel()
    const block = wrapper.findAll('.wmap-block')[1]
    expect(block.find('.wmap-block-title').text()).toBe('熟练度分布')
    const rows = block.findAll('.wmap-row')
    expect(rows.length).toBe(5)
    expect(rows[0].text()).toContain('Lv1')
    expect(rows[4].text()).toContain('Lv5')
  })

  it('渲染词条状态分布', async () => {
    const wrapper = await mountPanel()
    const block = wrapper.findAll('.wmap-block')[2]
    expect(block.find('.wmap-block-title').text()).toBe('词条状态')
    const rows = block.findAll('.wmap-row')
    expect(rows.length).toBe(3)
    const text = block.text()
    expect(text).toContain('已精通')
    expect(text).toContain('学习中')
    expect(text).toContain('待复习')
  })

  it('渲染复习节律五格', async () => {
    const wrapper = await mountPanel()
    const block = wrapper.findAll('.wmap-block')[3]
    expect(block.find('.wmap-block-title').text()).toBe('复习节律')
    const nums = block.findAll('.wmap-cell-num')
    // 近7天 4 / 近30天 5 / 覆盖 83% / 最久 25天 / 生疏 2
    expect(nums[0].text()).toContain('4')
    expect(nums[1].text()).toContain('5')
    expect(nums[2].text()).toContain('83%')
    expect(nums[3].text()).toContain('25天')
    expect(nums[4].text()).toContain('2')
  })

  it('渲染近期打磨词', async () => {
    const wrapper = await mountPanel()
    const block = wrapper.findAll('.wmap-block')[4]
    expect(block.find('.wmap-block-title').text()).toBe('近期打磨词')
    const tags = block.findAll('.wmap-tag')
    expect(tags.length).toBe(5)
    expect(tags[0].text()).toBe('澄')
  })

  it('渲染字镜健康评分与三维度', async () => {
    const wrapper = await mountPanel()
    const block = wrapper.findAll('.wmap-block')[5]
    expect(block.find('.wmap-health-num').text()).toBe('29')
    expect(block.text()).toContain('字迹初现')
    const nums = block.findAll('.wmap-hbar-num')
    // 广度 4 / 厚度 56 / 延续 28
    expect(nums[0].text()).toContain('4')
    expect(nums[1].text()).toContain('56')
    expect(nums[2].text()).toContain('28')
  })

  it('渲染温和回看建议', async () => {
    const wrapper = await mountPanel()
    const insights = wrapper.findAll('.wmap-insight')
    expect(insights.length).toBeGreaterThan(0)
    expect(wrapper.text()).toContain('字镜')
  })
})
