// ============================================================
// PlayGallery 逸趣阁视图测试
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

const mockStore: Record<string, any> = {}
const mockGetKV = vi.fn((_key: string, def: any) => mockStore[_key] ?? def)
const mockSetKV = vi.fn((key: string, val: any) => { mockStore[key] = val })

vi.mock('../../engine/storage', () => ({
  storage: { getKV: (...args: any[]) => (mockGetKV as any)(...args), setKV: (...args: any[]) => (mockSetKV as any)(...args) },
}))

async function getWrapper() {
  const { default: PlayGallery } = await import('../PlayGallery.vue')
  return mount(PlayGallery)
}

function makeGame(overrides: Record<string, any> = {}) {
  return {
    id: `gm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: '测试游戏',
    platform: 'PC',
    hours: 10,
    at: '2026-06-15T00:00:00.000Z',
    ...overrides,
  }
}

function makeToy(overrides: Record<string, any> = {}) {
  return {
    id: `ty_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: '测试玩具',
    note: '',
    value: 'mint',
    at: '2026-06-15T00:00:00.000Z',
    ...overrides,
  }
}

describe('PlayGallery 逸趣阁视图', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore['hf:play_v2'] = null
  })

  // ---- 渲染 ----

  it('渲染标题"逸趣阁"和统计', async () => {
    mockStore['hf:play_v2'] = {
      games: [
        makeGame({ id: 'g1', name: '游戏A', hours: 20, platform: 'PC' }),
        makeGame({ id: 'g2', name: '游戏B', hours: 5, platform: 'Switch' }),
      ],
      toys: [],
      models: [],
      others: [],
    }
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('逸趣阁')
    expect(wrapper.text()).toContain('2') // 游戏数
    expect(wrapper.text()).toContain('25') // 总时长 20+5
  })

  it('空状态显示提示', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('还没有记录')
  })

  it('有数据时显示统计概览', async () => {
    mockStore['hf:play_v2'] = {
      games: [
        makeGame({ id: 'g1', name: '游戏A', hours: 30, platform: 'PS5' }),
        makeGame({ id: 'g2', name: '游戏B', hours: 10, platform: 'PC' }),
        makeGame({ id: 'g3', name: '游戏C', hours: 5, platform: 'PC' }),
      ],
      toys: [makeToy({ id: 't1', name: '手办A' })],
      models: [],
      others: [],
    }
    const wrapper = await getWrapper()
    // 游戏数 3，总时长 45，藏品数 4
    expect(wrapper.text()).toContain('3')
    expect(wrapper.text()).toContain('45')
    expect(wrapper.text()).toContain('4')
  })

  // ---- 集成：逸趣档案（INCR-47）----

  it('集成渲染逸趣档案空态引导', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.pap-archive').exists()).toBe(true)
    expect(wrapper.text()).toContain('逸趣档案')
    expect(wrapper.find('.pap-badge-neutral').text()).toBe('逸趣未启')
    expect(wrapper.text()).toContain('还没有可供陈列的逸趣记录')
  })

  it('集成渲染逸趣档案填充态', async () => {
    mockStore['hf:play_v2'] = {
      games: [
        makeGame({ id: 'g1', name: '游戏A', hours: 30, platform: 'PS5' }),
        makeGame({ id: 'g2', name: '游戏B', hours: 10, platform: 'PC' }),
      ],
      toys: [makeToy({ id: 't1', name: '手办A' })],
      models: [],
      others: [],
    }
    const wrapper = await getWrapper()
    expect(wrapper.find('.pap-archive').exists()).toBe(true)
    expect(wrapper.text()).toContain('逸趣档案')
    expect(wrapper.text()).toContain('品类分布')
    expect(wrapper.text()).toContain('收藏节律')
  })

  // ---- 游戏排序 ----

  it('游戏排序默认按时长降序', async () => {
    mockStore['hf:play_v2'] = {
      games: [
        makeGame({ id: 'g1', name: '游戏A', hours: 5, at: '2026-01-01T00:00:00.000Z' }),
        makeGame({ id: 'g2', name: '游戏B', hours: 20, at: '2026-06-01T00:00:00.000Z' }),
        makeGame({ id: 'g3', name: '游戏C', hours: 10, at: '2026-03-01T00:00:00.000Z' }),
      ],
      toys: [],
      models: [],
      others: [],
    }
    const wrapper = await getWrapper()
    const cards = wrapper.findAll('.game-card')
    expect(cards.length).toBe(3)
    // 默认按时长降序: 20h, 10h, 5h
    expect(cards[0].text()).toContain('20h')
    expect(cards[1].text()).toContain('10h')
    expect(cards[2].text()).toContain('5h')
  })

  it('点击排序按钮切换到名称排序', async () => {
    mockStore['hf:play_v2'] = {
      games: [
        makeGame({ id: 'g1', name: '游戏C', hours: 5, at: '2026-01-01T00:00:00.000Z' }),
        makeGame({ id: 'g2', name: '游戏A', hours: 20, at: '2026-06-01T00:00:00.000Z' }),
        makeGame({ id: 'g3', name: '游戏B', hours: 10, at: '2026-03-01T00:00:00.000Z' }),
      ],
      toys: [],
      models: [],
      others: [],
    }
    const wrapper = await getWrapper()
    // 游戏 tab 下只有游戏排序按钮，取第一个（名称）
    const sortBtns = wrapper.findAll('.sort-btn')
    const nameBtn = sortBtns[0] // "名称"按钮
    await nameBtn.trigger('click')
    await wrapper.vm.$nextTick()
    const cards = wrapper.findAll('.game-card')
    // 切换到名称排序，默认降序(Z-A): 游戏C, 游戏B, 游戏A
    expect(cards[0].text()).toContain('游戏C')
    expect(cards[1].text()).toContain('游戏B')
    expect(cards[2].text()).toContain('游戏A')
  })

  // ---- 全局搜索 ----

  it('全局搜索过滤游戏列表', async () => {
    mockStore['hf:play_v2'] = {
      games: [
        makeGame({ id: 'g1', name: '塞尔达传说', platform: 'Switch', hours: 50 }),
        makeGame({ id: 'g2', name: '艾尔登法环', platform: 'PS5', hours: 80 }),
        makeGame({ id: 'g3', name: '星露谷物语', platform: 'PC', hours: 30 }),
      ],
      toys: [],
      models: [],
      others: [],
    }
    const wrapper = await getWrapper()
    const input = wrapper.find('.search-input')
    await input.setValue('塞尔达')
    await wrapper.vm.$nextTick()
    // 检查游戏卡片列表，而不是整个 wrapper（因为"最常玩"和"最近添加"仍会显示未过滤数据）
    const cards = wrapper.findAll('.game-card')
    expect(cards.length).toBe(1)
    expect(cards[0].text()).toContain('塞尔达传说')
  })

  it('全局搜索按平台过滤游戏', async () => {
    mockStore['hf:play_v2'] = {
      games: [
        makeGame({ id: 'g1', name: '游戏A', platform: 'PS5', hours: 20 }),
        makeGame({ id: 'g2', name: '游戏B', platform: 'Switch', hours: 15 }),
      ],
      toys: [],
      models: [],
      others: [],
    }
    const wrapper = await getWrapper()
    const input = wrapper.find('.search-input')
    await input.setValue('Switch')
    await wrapper.vm.$nextTick()
    const cards = wrapper.findAll('.game-card')
    expect(cards.length).toBe(1)
    expect(cards[0].text()).toContain('游戏B')
  })

  // ---- 添加游戏 ----

  it('添加游戏后显示在列表中', async () => {
    const wrapper = await getWrapper()
    // 在游戏 tab 的 add-row 中找到输入框
    const addRow = wrapper.find('.add-row')
    const inputs = addRow.findAll('.pg-input')
    const nameInput = inputs[0]
    const platformInput = inputs[1]
    const hoursInput = inputs[2]
    const addBtn = wrapper.find('.pg-btn')

    await nameInput.setValue('新游戏')
    await platformInput.setValue('PC')
    await hoursInput.setValue('15')
    await addBtn.trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('新游戏')
    expect(wrapper.text()).toContain('15h')
    // 验证 setKV 被调用
    expect(mockSetKV).toHaveBeenCalled()
  })

  it('添加游戏后总时长更新', async () => {
    mockStore['hf:play_v2'] = {
      games: [makeGame({ id: 'g1', name: '已有游戏', hours: 10, platform: 'PC' })],
      toys: [],
      models: [],
      others: [],
    }
    const wrapper = await getWrapper()
    const addRow = wrapper.find('.add-row')
    const inputs = addRow.findAll('.pg-input')
    const nameInput = inputs[0]
    const platformInput = inputs[1]
    const hoursInput = inputs[2]
    const addBtn = wrapper.find('.pg-btn')

    await nameInput.setValue('新游戏')
    await platformInput.setValue('Switch')
    await hoursInput.setValue('25')
    await addBtn.trigger('click')
    await wrapper.vm.$nextTick()

    // 总时长应为 10 + 25 = 35
    expect(wrapper.text()).toContain('35')
  })

  // ---- 平台分布 ----

  it('有游戏时显示平台分布', async () => {
    mockStore['hf:play_v2'] = {
      games: [
        makeGame({ id: 'g1', name: '游戏A', platform: 'PC', hours: 20 }),
        makeGame({ id: 'g2', name: '游戏B', platform: 'Switch', hours: 15 }),
        makeGame({ id: 'g3', name: '游戏C', platform: 'PC', hours: 10 }),
      ],
      toys: [],
      models: [],
      others: [],
    }
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('平台分布')
    expect(wrapper.text()).toContain('PC')
    expect(wrapper.text()).toContain('Switch')
  })

  it('平台分布显示正确游戏数和时长', async () => {
    mockStore['hf:play_v2'] = {
      games: [
        makeGame({ id: 'g1', name: '游戏A', platform: 'PC', hours: 20 }),
        makeGame({ id: 'g2', name: '游戏B', platform: 'PC', hours: 15 }),
        makeGame({ id: 'g3', name: '游戏C', platform: 'Switch', hours: 30 }),
      ],
      toys: [],
      models: [],
      others: [],
    }
    const wrapper = await getWrapper()
    // PC: 2款 35h, Switch: 1款 30h
    expect(wrapper.text()).toContain('2款')
    expect(wrapper.text()).toContain('35h')
    expect(wrapper.text()).toContain('1款')
    expect(wrapper.text()).toContain('30h')
  })

  // ---- 时间种子彩蛋 ----

  describe('时间种子彩蛋', () => {
    beforeEach(() => {
      mockStore['hf:play_seeds'] = null
    })

    it('种子输入表单存在', async () => {
      const wrapper = await getWrapper()
      const seedForm = wrapper.find('.seed-form')
      expect(seedForm.exists()).toBe(true)
      const input = seedForm.find('.pg-input')
      expect(input.exists()).toBe(true)
      const moodPicker = wrapper.find('.mood-picker')
      expect(moodPicker.exists()).toBe(true)
    })

    it('种植种子后显示在列表中', async () => {
      const wrapper = await getWrapper()
      const seedForm = wrapper.find('.seed-form')
      const input = seedForm.find('.pg-input')
      await input.setValue('今天心情不错，种下一颗种子')
      const plantBtn = seedForm.find('.pg-btn')
      await plantBtn.trigger('click')
      await wrapper.vm.$nextTick()
      // 种子卡片应出现在列表中（默认收起，仅显示心情和日期）
      const seedCard = wrapper.find('.seed-card')
      expect(seedCard.exists()).toBe(true)
      // 点击展开种子内容
      const header = seedCard.find('.seed-card-header')
      await header.trigger('click')
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).toContain('今天心情不错，种下一颗种子')
    })

    it('心情选择器按钮存在', async () => {
      const wrapper = await getWrapper()
      const moodBtns = wrapper.findAll('.mood-btn')
      expect(moodBtns.length).toBe(5)
    })

    // ---- 生长阶段 ----

    it('新种植的种子处于"种子"阶段', async () => {
      const wrapper = await getWrapper()
      const seedForm = wrapper.find('.seed-form')
      const input = seedForm.find('.pg-input')
      await input.setValue('测试生长阶段')
      const plantBtn = seedForm.find('.pg-btn')
      await plantBtn.trigger('click')
      await wrapper.vm.$nextTick()
      // 检查阶段标签
      const stageLabel = wrapper.find('.seed-stage-label')
      expect(stageLabel.exists()).toBe(true)
      expect(stageLabel.text()).toBe('种子')
    })

    it('新种植的种子有进度条', async () => {
      const wrapper = await getWrapper()
      const seedForm = wrapper.find('.seed-form')
      const input = seedForm.find('.pg-input')
      await input.setValue('测试进度条')
      const plantBtn = seedForm.find('.pg-btn')
      await plantBtn.trigger('click')
      await wrapper.vm.$nextTick()
      const progressBar = wrapper.find('.seed-progress-bar')
      expect(progressBar.exists()).toBe(true)
      const progressFill = wrapper.find('.seed-progress-fill')
      expect(progressFill.exists()).toBe(true)
    })

    it('种子有浇水按钮', async () => {
      const wrapper = await getWrapper()
      const seedForm = wrapper.find('.seed-form')
      const input = seedForm.find('.pg-input')
      await input.setValue('测试浇水')
      const plantBtn = seedForm.find('.pg-btn')
      await plantBtn.trigger('click')
      await wrapper.vm.$nextTick()
      const waterBtn = wrapper.find('.seed-water-btn')
      expect(waterBtn.exists()).toBe(true)
    })

    it('浇水后按钮变为已浇水状态', async () => {
      const wrapper = await getWrapper()
      const seedForm = wrapper.find('.seed-form')
      const input = seedForm.find('.pg-input')
      await input.setValue('测试浇水状态')
      const plantBtn = seedForm.find('.pg-btn')
      await plantBtn.trigger('click')
      await wrapper.vm.$nextTick()
      const waterBtn = wrapper.find('.seed-water-btn')
      expect(waterBtn.attributes('disabled')).toBeUndefined()
      await waterBtn.trigger('click')
      await wrapper.vm.$nextTick()
      // 浇水后按钮应 disabled
      expect(waterBtn.attributes('disabled')).toBeDefined()
    })

    it('展开种子显示生长元数据', async () => {
      const wrapper = await getWrapper()
      const seedForm = wrapper.find('.seed-form')
      const input = seedForm.find('.pg-input')
      await input.setValue('测试元数据')
      const plantBtn = seedForm.find('.pg-btn')
      await plantBtn.trigger('click')
      await wrapper.vm.$nextTick()
      const header = wrapper.find('.seed-card-header')
      await header.trigger('click')
      await wrapper.vm.$nextTick()
      // 展开后应显示生长阶段、已种下、浇水等元数据
      expect(wrapper.text()).toContain('生长阶段')
      expect(wrapper.text()).toContain('已种下')
      expect(wrapper.text()).toContain('浇水')
    })

    it('不同心情的种子生长阶段计算正确', async () => {
      const wrapper = await getWrapper()
      const seedForm = wrapper.find('.seed-form')
      const input = seedForm.find('.pg-input')
      await input.setValue('开心种子')
      // 选择 happy 心情
      const moodBtns = wrapper.findAll('.mood-btn')
      await moodBtns[0].trigger('click') // happy
      await wrapper.vm.$nextTick()
      const plantBtn = seedForm.find('.pg-btn')
      await plantBtn.trigger('click')
      await wrapper.vm.$nextTick()
      // 应能正常渲染，包含阶段标签
      const stageLabel = wrapper.find('.seed-stage-label')
      expect(stageLabel.exists()).toBe(true)
    })
  })
})