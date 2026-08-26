// ============================================================
// DingyinFourActs 定音锤四幕视图测试
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

const mockFourActs = [
  {
    id: 'act_what_you_did',
    title: '你做过的事',
    icon: '📜',
    summary: '3 条证据，来自 2 个角落',
    detailLines: [
      '专注完成 12 次，累计 4 小时',
      '笔记 8 篇',
      '时间结晶 3 颗',
    ],
    progress: 0.6,
    color: '#f0c040',
    hammerState: 'idle',
  },
  {
    id: 'act_how_you_treat_others',
    title: '你如何对待别人',
    icon: '🤝',
    summary: '2 条证据，来自 1 个角落',
    detailLines: [
      '人物卡片 5 张',
      '朋友 3 位，家人 2 位',
    ],
    progress: 0.5,
    color: '#d98c7a',
    hammerState: 'idle',
  },
  {
    id: 'act_how_you_grow',
    title: '你如何成长',
    icon: '🌱',
    summary: '3 条证据，来自 2 个角落',
    detailLines: [
      '目标 4 个（愿景 1，目标 2，计划 1）',
      '已开花 1 个，生长中 2 个',
      '自律习惯 3 个',
    ],
    progress: 0.4,
    color: '#8a9a7a',
    hammerState: 'idle',
  },
  {
    id: 'act_inner_voice',
    title: '你内心真正的声音',
    icon: '🔮',
    summary: '2 条证据，来自 2 个角落',
    detailLines: [
      '情绪记录 15 次',
      '平均睡眠 7.5 小时（5 次记录）',
    ],
    progress: 0.5,
    color: '#a07c8c',
    hammerState: 'idle',
  },
]

const mockGetFourActs = vi.fn(() => mockFourActs)
const mockGetFourActsProgress = vi.fn(() => ({ completed: 1, total: 4 }))
const mockGetIronLawResponse = vi.fn(() => '我把我看到的东西放在这里了。')
const mockKnockAndGetFreshness = vi.fn(() => ({
  lastKnockedAt: null,
  newEvidenceCount: 0,
  hasSignificantChange: false,
  suggestionReason: null,
}))
const mockCheckFreshness = vi.fn(() => ({
  lastKnockedAt: null,
  newEvidenceCount: 0,
  hasSignificantChange: false,
  suggestionReason: null,
}))

vi.mock('../../modules/mirror/dingyin-engine', () => ({
  gatherFourActs: mockGetFourActs,
  getIronLawResponse: mockGetIronLawResponse,
  getFourActsProgress: mockGetFourActsProgress,
  knockAndGetFreshness: mockKnockAndGetFreshness,
  checkFreshness: mockCheckFreshness,
}))

// 模拟路由
const mockPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useRoute: () => ({ path: '/dingyin-four-acts' }),
}))

async function getWrapper() {
  const { default: DingyinFourActs } = await import('../DingyinFourActs.vue')
  return mount(DingyinFourActs, {
    global: {
      mocks: {
        $router: { push: mockPush },
      },
    },
  })
}

describe('DingyinFourActs 视图', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ---- 渲染 ----

  it('渲染页面标题"定音锤"和"四幕"', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('定音锤')
    expect(wrapper.text()).toContain('四幕')
  })

  it('渲染 4 个 .dingyin-act-card 卡片', async () => {
    const wrapper = await getWrapper()
    const cards = wrapper.findAll('.dingyin-act-card')
    expect(cards.length).toBe(4)
  })

  it('每个卡片显示正确的标题', async () => {
    const wrapper = await getWrapper()
    const cards = wrapper.findAll('.dingyin-act-card')
    const titles = ['你做过的事', '你如何对待别人', '你如何成长', '你内心真正的声音']
    titles.forEach((title, i) => {
      expect(cards[i].text()).toContain(title)
    })
  })

  it('每个卡片显示进度条 (.dingyin-progress-fill)', async () => {
    const wrapper = await getWrapper()
    const fills = wrapper.findAll('.dingyin-progress-fill')
    expect(fills.length).toBe(4)
  })

  it('每个卡片显示进度环 (SVG circle)', async () => {
    const wrapper = await getWrapper()
    const circles = wrapper.findAll('.dingyin-act-card .dingyin-ring-fill')
    expect(circles.length).toBe(4)
  })

  it('每个卡片显示摘要文本', async () => {
    const wrapper = await getWrapper()
    const cards = wrapper.findAll('.dingyin-act-card')
    const summaries = ['3 条证据，来自 2 个角落', '2 条证据，来自 1 个角落', '3 条证据，来自 2 个角落', '2 条证据，来自 2 个角落']
    summaries.forEach((s, i) => {
      expect(cards[i].text()).toContain(s)
    })
  })

  // ---- 展开/收起 ----

  it('点击卡片可展开详情', async () => {
    const wrapper = await getWrapper()
    const firstCard = wrapper.findAll('.dingyin-act-card')[0]
    await firstCard.trigger('click')

    const detailLines = wrapper.findAll('.dingyin-detail-line')
    expect(detailLines.length).toBeGreaterThan(0)
    expect(detailLines[0].text()).toContain('专注完成 12 次')
  })

  it('再次点击卡片可收起详情', async () => {
    const wrapper = await getWrapper()
    const firstCard = wrapper.findAll('.dingyin-act-card')[0]

    await firstCard.trigger('click')
    let detailLines = wrapper.findAll('.dingyin-detail-line')
    expect(detailLines.length).toBeGreaterThan(0)

    await firstCard.trigger('click')
    detailLines = wrapper.findAll('.dingyin-detail-line')
    expect(detailLines.length).toBe(0)
  })

  // ---- 汇总进度 ----

  it('显示汇总进度（1/4）', async () => {
    const wrapper = await getWrapper()
    const summaryText = wrapper.find('.dingyin-summary-progress')
    expect(summaryText.text()).toMatch(/1.*4/)
  })

  // ---- 返回按钮 ----

  it('返回按钮存在', async () => {
    const wrapper = await getWrapper()
    const backBtn = wrapper.find('.dingyin-back-btn')
    expect(backBtn.exists()).toBe(true)
  })

  it('点击返回按钮调用 router.push 返回', async () => {
    const wrapper = await getWrapper()
    const backBtn = wrapper.find('.dingyin-back-btn')
    await backBtn.trigger('click')
    expect(mockPush).toHaveBeenCalled()
  })

  // ---- 铁律回应 ----

  it('铁律回应文本存在', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('我把我看到的东西放在这里了。')
  })

  // ---- 其他 ----

  it('存在氛围背景 (.dfa-atmos)', async () => {
    const wrapper = await getWrapper()
    const atmos = wrapper.find('.dfa-atmos')
    expect(atmos.exists()).toBe(true)
  })

  it('副标题存在', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('定音锤')
    expect(wrapper.text()).toContain('四幕')
  })
})