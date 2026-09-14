// ============================================================
// 书房气象档案面板测试（INCR-49）
// 覆盖空态（书房未启）与填充态（概览/节奏/温故/健康/洞察）
// 纯函数经 direct subpath 真实引入；notes 数据 mock 于 study barrel
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

const mock = vi.hoisted(() => {
  const state = { notes: [] as any[] }
  return { state }
})

vi.mock('../../modules/study', () => ({
  useStudy: () => ({
    notes: ref(mock.state.notes),
  }),
}))

const DAY = 24 * 60 * 60 * 1000
const NOW = new Date()
function daysAgo(d: number): string {
  return new Date(NOW.getTime() - d * DAY).toISOString()
}

function note(overrides: Record<string, any> = {}) {
  return {
    id: `n_${Math.random().toString(36).slice(2, 6)}`,
    title: '一篇笔记',
    content: '',
    tags: [] as string[],
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
    ...overrides,
  }
}

async function mountPanel() {
  const { default: StudyWeatherPanel } = await import('../StudyWeatherPanel.vue')
  const wrapper = mount(StudyWeatherPanel)
  await wrapper.vm.$nextTick()
  return wrapper
}

beforeEach(() => {
  mock.state.notes = []
})

describe('StudyWeatherPanel 空态', () => {
  it('无笔记时显示「书房未启」引导', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('.swp-archive').exists()).toBe(true)
    expect(wrapper.find('.swp-badge-neutral').text()).toBe('书房未启')
    expect(wrapper.text()).toContain('书房还空着')
    expect(wrapper.find('.swp-block').exists()).toBe(false)
  })
})

describe('StudyWeatherPanel 填充态', () => {
  beforeEach(() => {
    // 近 6 天每天一篇，10 标签 + 300 字 → 健康 100 笔耕不辍
    mock.state.notes = Array.from({ length: 6 }, (_, i) =>
      note({
        title: `笔记${i + 1}`,
        content: 'x'.repeat(300),
        tags: ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'],
        createdAt: daysAgo(i),
        updatedAt: daysAgo(i),
      }),
    )
  })

  it('渲染标题与书房健康徽章', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('.swp-title').text()).toBe('✨ 书房气象档案')
    const badge = wrapper.find('.swp-badge')
    expect(badge.exists()).toBe(true)
    expect(['墨迹初干', '刚动笔', '渐入书境', '笔耕不辍']).toContain(badge.text())
  })

  it('渲染藏书概览八格', async () => {
    const wrapper = await mountPanel()
    const block = wrapper.findAll('.swp-block')[0]
    const nums = block.findAll('.swp-cell-num')
    // 总 6 / 活跃 6 / 归档 0 / 速记 0 / 标签 10 / 近7天 6 / 日均 / 总字数 1800
    expect(nums[0].text()).toContain('6')
    expect(nums[1].text()).toContain('6')
    expect(nums[2].text()).toContain('0')
    expect(nums[4].text()).toContain('10')
    expect(nums[5].text()).toContain('6')
    expect(nums[7].text()).toContain('1800')
  })

  it('渲染落字节奏四格与高频标签', async () => {
    const wrapper = await mountPanel()
    const block = wrapper.findAll('.swp-block')[1]
    const nums = block.findAll('.swp-cell-num')
    // 连续 6 / 近7天 6 / 最长连续 6
    expect(nums[0].text()).toContain('6')
    expect(nums[1].text()).toContain('6')
    expect(nums[2].text()).toContain('6')
    const tags = block.findAll('.swp-tag')
    expect(tags.length).toBeGreaterThan(0)
    expect(tags[0].text()).toContain('· 6')
  })

  it('渲染温故建议', async () => {
    // 覆盖默认数据：加一条久未翻动的笔记
    mock.state.notes.push(
      note({
        title: '搁置的旧稿',
        content: 'y'.repeat(200),
        tags: ['旧'],
        createdAt: daysAgo(60),
        updatedAt: daysAgo(35),
      }),
    )
    const wrapper = await mountPanel()
    const block = wrapper.findAll('.swp-block')[2]
    expect(block.find('.swp-block-title').text()).toBe('温故建议')
    expect(block.text()).toContain('搁置的旧稿')
    expect(block.text()).toContain('天')
  })

  it('渲染书房健康评分与三维度', async () => {
    const wrapper = await mountPanel()
    const block = wrapper.findAll('.swp-block')[3]
    expect(block.find('.swp-health-num').text()).toBe('100')
    expect(block.text()).toContain('笔耕不辍')
    const nums = block.findAll('.swp-hbar-num')
    // 节奏 40 / 广度 30 / 深耕 30
    expect(nums[0].text()).toContain('40')
    expect(nums[1].text()).toContain('30')
    expect(nums[2].text()).toContain('30')
  })

  it('渲染温和洞察', async () => {
    const wrapper = await mountPanel()
    const insights = wrapper.findAll('.swp-insight')
    expect(insights.length).toBeGreaterThan(0)
    expect(wrapper.text()).toContain('书房')
  })
})
