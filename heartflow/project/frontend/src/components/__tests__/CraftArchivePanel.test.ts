// ============================================================
// 匠庐档案面板测试（INCR-48）
// 覆盖空态（匠庐未启）与填充态（概览/状态/类型/进化/节律/健康/洞察/标签）
// 纯函数经 direct subpath 真实引入；works 数据 mock 于 craft barrel
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

const mock = vi.hoisted(() => {
  const state = { works: [] as any[] }
  return { state }
})

vi.mock('../../modules/craft', () => ({
  useCraftStore: () => ({
    get works() { return mock.state.works },
  }),
}))

const DAY = 24 * 60 * 60 * 1000
const NOW = new Date()
function daysAgo(d: number): string {
  return new Date(NOW.getTime() - d * DAY).toISOString()
}

function work(overrides: Record<string, any> = {}) {
  return {
    id: `w_${Math.random().toString(36).slice(2, 6)}`,
    name: '作品',
    icon: '🎨',
    description: '',
    color: '#b8a080',
    status: 'draft',
    type: 'writing',
    date: '',
    evolution: 10,
    tags: [] as string[],
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
    ...overrides,
  }
}

async function mountPanel() {
  const { default: CraftArchivePanel } = await import('../CraftArchivePanel.vue')
  const wrapper = mount(CraftArchivePanel)
  await wrapper.vm.$nextTick()
  return wrapper
}

beforeEach(() => {
  mock.state.works = []
})

describe('CraftArchivePanel 空态', () => {
  it('无作品时显示「匠庐未启」引导', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('.cap-archive').exists()).toBe(true)
    expect(wrapper.find('.cap-badge-neutral').text()).toBe('匠庐未启')
    expect(wrapper.text()).toContain('炉火尚温')
    expect(wrapper.find('.cap-block').exists()).toBe(false)
  })
})

describe('CraftArchivePanel 填充态', () => {
  beforeEach(() => {
    mock.state.works = [
      work({ id: 'w1', name: '作品一', status: 'completed', type: 'design', evolution: 80, icon: '🎨', tags: ['前端'], createdAt: daysAgo(5), updatedAt: daysAgo(5) }),
      work({ id: 'w2', name: '作品二', status: 'refining', type: 'writing', evolution: 45, icon: '📝', tags: ['写作'], createdAt: daysAgo(50), updatedAt: daysAgo(50) }),
      work({ id: 'w3', name: '作品三', status: 'draft', type: 'code', evolution: 20, icon: '💻', tags: [], createdAt: daysAgo(120), updatedAt: daysAgo(120) }),
    ]
  })

  it('渲染标题与匠庐健康徽章', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('.cap-title').text()).toBe('✨ 匠庐档案')
    const badge = wrapper.find('.cap-badge')
    expect(badge.exists()).toBe(true)
    expect(['朴石初开', '方起炉火', '巧思渐成', '匠心大成']).toContain(badge.text())
  })

  it('渲染匠心概览六格', async () => {
    const wrapper = await mountPanel()
    const nums = wrapper.findAll('.cap-cell-num')
    // 总作品 3 / 平均进化 48 / 已完成 1 / 打磨中 2 / 归档 0 / 打磨事件 0
    expect(nums[0].text()).toContain('3')
    expect(nums[1].text()).toContain('48')
    expect(nums[2].text()).toContain('1')
    expect(nums[3].text()).toContain('2')
    expect(nums[4].text()).toContain('0')
    expect(wrapper.text()).toContain('进化之最是「作品一」')
  })

  it('渲染状态分布四行', async () => {
    const wrapper = await mountPanel()
    // 状态(4) + 类型(5) + 进化(5) = 14 行
    const statusBlock = wrapper.findAll('.cap-block')[1]
    expect(statusBlock.findAll('.cap-row').length).toBe(4)
    expect(statusBlock.text()).toContain('已完成')
    expect(statusBlock.text()).toContain('打磨中')
  })

  it('渲染手艺类型五行（含图标）', async () => {
    const wrapper = await mountPanel()
    const typeBlock = wrapper.findAll('.cap-block')[2]
    expect(typeBlock.findAll('.cap-row').length).toBe(5)
    expect(typeBlock.text()).toContain('写作')
    expect(typeBlock.text()).toContain('代码')
    expect(typeBlock.text()).toContain('设计')
  })

  it('渲染进化分档五档（胚料→成品）', async () => {
    const wrapper = await mountPanel()
    const evoBlock = wrapper.findAll('.cap-block')[3]
    expect(evoBlock.findAll('.cap-row').length).toBe(5)
    expect(evoBlock.text()).toContain('胚料')
    expect(evoBlock.text()).toContain('细琢')
    expect(evoBlock.text()).toContain('打磨')
  })

  it('渲染创作节律五格', async () => {
    const wrapper = await mountPanel()
    const rhythmCells = wrapper.findAll('.cap-block')[4].findAll('.cap-cell-num')
    // 近30天 1 / 近90天 2 / 近7天活跃 1 / 受打磨作品 0 / 距上次 5
    expect(rhythmCells[0].text()).toContain('1')
    expect(rhythmCells[1].text()).toContain('2')
    expect(rhythmCells[2].text()).toContain('1')
    expect(rhythmCells[3].text()).toContain('0')
    expect(rhythmCells[4].text()).toContain('5')
  })

  it('渲染匠庐健康评分与三维度', async () => {
    const wrapper = await mountPanel()
    const healthBlock = wrapper.findAll('.cap-block')[5]
    expect(healthBlock.find('.cap-health-num').text()).toBe('42')
    expect(healthBlock.text()).toContain('方起炉火')
    const nums = healthBlock.findAll('.cap-hbar-num')
    // 精进 22 / 完成 10 / 持续 10
    expect(nums[0].text()).toContain('22')
    expect(nums[1].text()).toContain('10')
    expect(nums[2].text()).toContain('10')
  })

  it('渲染高频标签', async () => {
    const wrapper = await mountPanel()
    const tagBlock = wrapper.findAll('.cap-block')[6]
    expect(tagBlock.find('.cap-block-title').text()).toBe('高频标签')
    expect(tagBlock.text()).toContain('前端')
    expect(tagBlock.text()).toContain('写作')
  })

  it('渲染温和洞察', async () => {
    const wrapper = await mountPanel()
    const insights = wrapper.findAll('.cap-insight')
    expect(insights.length).toBeGreaterThan(0)
    expect(wrapper.text()).toContain('匠心沉淀')
  })
})