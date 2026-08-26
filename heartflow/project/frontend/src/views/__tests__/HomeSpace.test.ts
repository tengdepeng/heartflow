// ============================================================
// HomeSpace 视图测试
// 空间地图展示：主链路流 + 房间邻接地图
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const { mockPush } = vi.hoisted(() => ({
  mockPush: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useRoute: () => ({ path: '/home-space', query: {}, params: {} }),
  RouterLink: { template: '<a><slot/></a>' },
}))

vi.mock('../../engine/storage', () => ({
  storage: {
    getSessions: () => [],
    getAnchors: () => [],
    getNotes: () => [],
    getEmotions: () => [],
    getPluginRegistry: () => ({}),
    getConstitution: () => null,
    getCrystals: () => [],
    getCarriers: () => [],
    getKV: <T>(_key: string, defaultValue: T): T => defaultValue,
    setKV: vi.fn(),
  },
  storageVersion: { value: 0 },
}))

async function getWrapper() {
  const { default: HomeSpace } = await import('../HomeSpace.vue')
  return mount(HomeSpace, {
    global: {
      plugins: [createPinia()],
    },
  })
}

describe('HomeSpace 空间地图视图', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('渲染标题', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('家')
    expect(wrapper.text()).toContain('原点')
  })

  it('显示殿堂状况统计', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('殿堂状况')
    // 六个殿堂状况卡片 + 四个今日跨房间聚合卡片（F6）
    const cards = wrapper.findAll('.status-card')
    expect(cards.length).toBe(10)
  })

  it('显示今日专注', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('今日专注')
  })

  it('显示心锚留存', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('心锚留存')
  })

  it('显示笔记总数', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('笔记总数')
  })

  it('显示情绪记录', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('情绪记录')
  })

  it('显示访客模式', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('访客模式')
  })

  it('访客模式切换', async () => {
    const wrapper = await getWrapper()
    const buttons = wrapper.findAll('button')
    const visitorBtn = buttons.find(b => b.text().includes('开启访客模式'))
    if (visitorBtn) {
      await visitorBtn.trigger('click')
      expect(wrapper.text()).toContain('访客模式已开启')
    }
  })
})

describe('HomeSpace 场景切换', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('渲染场景切换栏（11个标签）', async () => {
    const wrapper = await getWrapper()
    const tabs = wrapper.findAll('.scene-tab')
    expect(tabs.length).toBe(11)
    // 验证场景标签内容
    expect(tabs[0].text()).toContain('玄关')
    expect(tabs[4].text()).toContain('卧室')
  })

  it('初始场景为玄关', async () => {
    const wrapper = await getWrapper()
    // 第一个场景标签（玄关）应处于激活状态
    const tabs = wrapper.findAll('.scene-tab')
    expect(tabs[0].classes()).toContain('active')
    // 玄关组件应被渲染（检查标题和副标题）
    expect(wrapper.text()).toContain('玄关')
    expect(wrapper.text()).toContain('一日之计')
  })

  it('场景面板显示氛围标签', async () => {
    const wrapper = await getWrapper()
    // 玄关氛围层应存在
    expect(wrapper.find('.entrance-atmos').exists()).toBe(true)
  })

  it('场景面板显示功能入口按钮', async () => {
    const wrapper = await getWrapper()
    // 玄关有两个导航按钮：走向客厅、走向厨房
    const navBtns = wrapper.findAll('.nav-btn')
    expect(navBtns.length).toBeGreaterThanOrEqual(1)
    expect(navBtns[0].text()).toContain('走向客厅')
  })

  it('点击场景标签切换场景', async () => {
    const wrapper = await getWrapper()
    // 点击卧室标签（第5个，index=4）
    const tabs = wrapper.findAll('.scene-tab')
    await tabs[4].trigger('click')

    // 卧室标签应激活
    expect(tabs[4].classes()).toContain('active')
    // 玄关标签不再激活
    expect(tabs[0].classes()).not.toContain('active')
    // 卧室组件应被渲染（检查标题）
    expect(wrapper.text()).toContain('卧室')
    // 卧室应显示睡眠相关健康数据（身体温室汇聚）
    expect(wrapper.text()).toContain('睡眠概况')
  })
})