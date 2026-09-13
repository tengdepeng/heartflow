// ============================================================
// SeasonalRituals 岁时阁视图测试
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

// ---- 模拟存储 ----
const mockStore: Record<string, any> = {}
const mockGetKV = vi.fn((_key: string, def: any) => mockStore[_key] ?? def)
const mockSetKV = vi.fn((key: string, val: any) => { mockStore[key] = val })

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (...args: any[]) => (mockGetKV as any)(...args),
    setKV: (...args: any[]) => (mockSetKV as any)(...args),
  },
}))

// ---- 辅助函数 ----
async function createWrapper() {
  const { default: SeasonalRituals } = await import('../SeasonalRituals.vue')
  return mount(SeasonalRituals, { attachTo: document.body })
}

function makeRitual(overrides: Record<string, any> = {}) {
  return {
    id: `sr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: '默认仪式',
    season: 'spring',
    description: '',
    tags: [],
    count: 0,
    lastCompletedAt: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

// ---- 测试 ----
describe('SeasonalRituals 岁时阁视图', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore['hf:seasonal_rituals'] = []
    mockStore['hf:rituals'] = []
    mockStore['hf:life_rituals'] = []
  })

  // ------- 渲染标题和统计卡片 -------
  it('渲染标题和统计卡片', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.text()).toContain('岁时阁')
    expect(wrapper.text()).toContain('总仪式')
    expect(wrapper.text()).toContain('今年完成')
    expect(wrapper.text()).toContain('连续天数')
    // 季节统计卡片
    expect(wrapper.find('.sr-season-stats-section').exists()).toBe(true)
    expect(wrapper.text()).toContain('季节完成统计')
  })

  // ------- 显示季节标签 -------
  it('显示季节标签', async () => {
    mockStore['hf:seasonal_rituals'] = [
      makeRitual({ id: 'r1', name: '踏青', season: 'spring' }),
      makeRitual({ id: 'r2', name: '游泳', season: 'summer' }),
    ]
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()
    // 默认 activeSeason 是 'spring'，显示春仪式
    expect(wrapper.text()).toContain('踏青')
    expect(wrapper.text()).not.toContain('游泳')
    // 点击夏标签
    const tabs = wrapper.findAll('.sr-season-tab')
    expect(tabs.length).toBe(4)
    await tabs[1].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('游泳')
    expect(wrapper.text()).not.toContain('踏青')
  })

  // ------- 添加仪式后显示 -------
  it('添加仪式后显示', async () => {
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()
    // 填写表单
    const nameInput = wrapper.find('.sr-add-form .sr-input')
    await nameInput.setValue('清明祭扫')
    // 选择季节
    const select = wrapper.find('.sr-add-form .sr-select')
    await select.setValue('spring')
    // 点击添加
    const addBtn = wrapper.find('.sr-btn')
    await addBtn.trigger('click')
    await wrapper.vm.$nextTick()
    // 验证添加后显示
    expect(wrapper.text()).toContain('清明祭扫')
    // 验证存储被调用
    expect(mockSetKV).toHaveBeenCalled()
    const saved = mockStore['hf:seasonal_rituals']
    expect(saved.length).toBe(1)
    expect(saved[0].name).toBe('清明祭扫')
  })

  // ------- 排序切换工作 -------
  it('排序按钮组存在', async () => {
    const wrapper = await createWrapper()
    const sortBtns = wrapper.findAll('.sr-sort-btn')
    expect(sortBtns.length).toBe(3)
    expect(sortBtns[0].text()).toContain('名称')
    expect(sortBtns[1].text()).toContain('完成次数')
    expect(sortBtns[2].text()).toContain('最近完成')
  })

  it('默认按完成次数降序排列', async () => {
    mockStore['hf:seasonal_rituals'] = [
      makeRitual({ id: 'r1', name: '仪式A', season: 'spring', count: 1 }),
      makeRitual({ id: 'r2', name: '仪式B', season: 'spring', count: 5 }),
      makeRitual({ id: 'r3', name: '仪式C', season: 'spring', count: 3 }),
    ]
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()
    // 默认排序：count desc，所以顺序是 仪式B(5) → 仪式C(3) → 仪式A(1)
    const cards = wrapper.findAll('.sr-ritual-card-name')
    expect(cards.length).toBe(3)
    expect(cards[0].text()).toBe('仪式B')
    expect(cards[1].text()).toBe('仪式C')
    expect(cards[2].text()).toBe('仪式A')
  })

  it('点击排序按钮切换排序', async () => {
    mockStore['hf:seasonal_rituals'] = [
      makeRitual({ id: 'r1', name: '仪式A', season: 'spring', count: 1 }),
      makeRitual({ id: 'r2', name: '仪式B', season: 'spring', count: 5 }),
      makeRitual({ id: 'r3', name: '仪式C', season: 'spring', count: 3 }),
    ]
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()
    // 点击"名称"排序按钮 → 默认降序：仪式C → 仪式B → 仪式A
    const sortBtns = wrapper.findAll('.sr-sort-btn')
    await sortBtns[0].trigger('click') // 名称
    await wrapper.vm.$nextTick()
    const cards1 = wrapper.findAll('.sr-ritual-card-name')
    expect(cards1[0].text()).toBe('仪式C')
    expect(cards1[1].text()).toBe('仪式B')
    expect(cards1[2].text()).toBe('仪式A')
    // 再次点击"名称" → 切换为升序：仪式A → 仪式B → 仪式C
    await sortBtns[0].trigger('click')
    await wrapper.vm.$nextTick()
    const cards2 = wrapper.findAll('.sr-ritual-card-name')
    expect(cards2[0].text()).toBe('仪式A')
    expect(cards2[1].text()).toBe('仪式B')
    expect(cards2[2].text()).toBe('仪式C')
  })

  it('点击排序按钮显示激活状态和箭头', async () => {
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()
    // 默认 active 的是 "完成次数"（count）
    const sortBtns = wrapper.findAll('.sr-sort-btn')
    expect(sortBtns[1].classes()).toContain('active')
    expect(sortBtns[1].find('.sr-sort-arrow').exists()).toBe(true)
    // 点击"名称"按钮
    await sortBtns[0].trigger('click')
    await wrapper.vm.$nextTick()
    expect(sortBtns[0].classes()).toContain('active')
    expect(sortBtns[0].find('.sr-sort-arrow').exists()).toBe(true)
    expect(sortBtns[1].classes()).not.toContain('active')
  })

  // ------- 年度俯瞰面板（INCR-196） -------
  it('渲染年度俯瞰面板（空态引导）', async () => {
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.syo-archive').exists()).toBe(true)
    expect(wrapper.text()).toContain('年度俯瞰')
    // 空态：无仪式时给出守候引导
    expect(wrapper.find('.syo-empty').exists()).toBe(true)
  })

  it('年度俯瞰注入仪式后展示月度分布与洞察', async () => {
    const year = new Date().getFullYear()
    mockStore['hf:seasonal_rituals'] = [
      makeRitual({ id: 'r1', name: '踏青', count: 3, lastCompletedAt: `${year}-03-15T00:00:00Z` }),
    ]
    mockStore['hf:rituals'] = [{ id: 'p1', name: '晨读', date: `${year}-04-10`, note: '', icon: '🕯' }]
    mockStore['hf:life_rituals'] = [{ id: 'l1', name: '婚礼', date: `${year}-05-20`, note: '', icon: '💒', type: '婚礼' }]

    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.syo-archive').exists()).toBe(true)
    // 月度分布热力格
    expect(wrapper.find('.syo-heat-cell').exists()).toBe(true)
    // 统计格：四季仪式 / 最活跃月 / 生命仪礼 / 私人仪式
    expect(wrapper.text()).toContain('四季仪式')
    expect(wrapper.text()).toContain('生命仪礼')
    expect(wrapper.text()).toContain('私人仪式')
    // 温和洞察
    expect(wrapper.find('.syo-insight').exists()).toBe(true)
  })
})

// ============================================================
// 蜕变光茧动画测试
// ============================================================
describe('蜕变光茧动画', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 清理前一个测试残留的 Teleport DOM
    document.querySelector('.cocoon-overlay')?.remove()
    mockStore['hf:life_rituals'] = [
      { id: 'lr1', name: '诞生', date: '2026-01-01', note: '', icon: '👶', type: '诞生' },
    ]
  })

  it('完成生命仪礼后显示光茧动画覆盖层', async () => {
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()

    // 确认生命仪礼卡片存在
    expect(wrapper.text()).toContain('诞生')
    expect(wrapper.text()).toContain('2026-01-01')

    // 点击蝴蝶按钮完成仪礼
    const completeBtn = wrapper.find('.sr-life-complete-btn')
    expect(completeBtn.exists()).toBe(true)
    await completeBtn.trigger('click')
    await wrapper.vm.$nextTick()

    // 光茧覆盖层应该出现
    const overlay = document.querySelector('.cocoon-overlay')
    expect(overlay).not.toBeNull()
    expect(overlay!.querySelector('.cocoon-svg')).not.toBeNull()

    // 状态应为 cocooning
    expect((wrapper.vm as any).cocoonState).toBe('cocooning')
    const label = overlay!.querySelector('.cocoon-state-label')
    expect(label).not.toBeNull()
    expect(label!.textContent).toBe('蜕变中...')
  })

  it('完成后的仪礼标记为已蜕变', async () => {
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()

    // 触发完成
    const completeBtn = wrapper.find('.sr-life-complete-btn')
    await completeBtn.trigger('click')
    await wrapper.vm.$nextTick()

    // 直接标记 done（模拟动画完成后的效果）
    const vm = wrapper.vm as any
    const ritual = vm.prCtx.lifeRituals.value[0]
    ritual.done = true
    await wrapper.vm.$nextTick()

    // 仪礼应标记为已蜕变
    expect(vm.prCtx.lifeRituals.value[0].done).toBe(true)
    expect(wrapper.text()).toContain('已蜕变')
  })

  it('光茧动画状态机初始与切换', async () => {
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()

    // 初始状态: 无覆盖层 (idle)
    expect(document.querySelector('.cocoon-overlay')).toBeNull()

    // 触发完成 -> cocooning
    const completeBtn = wrapper.find('.sr-life-complete-btn')
    await completeBtn.trigger('click')
    await wrapper.vm.$nextTick()

    // 覆盖层出现
    let overlay = document.querySelector('.cocoon-overlay')
    expect(overlay).not.toBeNull()
    expect(overlay!.querySelector('.cocoon-svg')).not.toBeNull()
    expect(overlay!.querySelector('.cocoon-state-label')!.textContent).toBe('蜕变中...')

    // 通过 overlay 的点击关闭 (模拟 @click 回调)
    // 直接调用 overlay 的 click 方法触发 Vue 事件
    ;(overlay! as HTMLElement).click()
    await wrapper.vm.$nextTick()
    overlay = document.querySelector('.cocoon-overlay')
    expect(overlay).toBeNull()
  })

  it('光茧覆盖层点击可关闭', async () => {
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()

    // 触发完成
    const completeBtn = wrapper.find('.sr-life-complete-btn')
    await completeBtn.trigger('click')
    await wrapper.vm.$nextTick()

    // 确认覆盖层存在
    const overlay = document.querySelector('.cocoon-overlay')
    expect(overlay).not.toBeNull()
    expect(overlay!.querySelector('.cocoon-state-label')).not.toBeNull()
    expect(overlay!.querySelector('.cocoon-state-label')!.textContent).toBe('蜕变中...')

    // 点击覆盖层关闭
    ;(overlay! as HTMLElement).click()
    await wrapper.vm.$nextTick()

    // 覆盖层应消失
    expect(document.querySelector('.cocoon-overlay')).toBeNull()
  })
})

// ============================================================
// 集成：岁时气象面板 SeasonalHealthPanel（INCR-253 补挂载孤儿组件）
// 消费 seasonal/seasonal-analytics 纯函数（seasonalOverview/seasonRows/
// seasonHealth/seasonalInsights）由宿主注入 :rituals，无全局 store、无模块级 ref；
// 空仪式 → 全 0 + 圆环 0，种子完成仪式(count>0, 今年内) → 得分>0 + 已拾起/覆盖季节上数 + 洞察。
// ============================================================
describe('集成：岁时气象面板', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore['hf:seasonal_rituals'] = []
    mockStore['hf:rituals'] = []
    mockStore['hf:life_rituals'] = []
  })

  it('空仪式下渲染岁岁气象面板（标题/三轴/五指标归零/四季分布/无数值洞察）', async () => {
    const wrapper = await createWrapper()
    const panel = wrapper.find('.shp')
    expect(panel.exists()).toBe(true)
    expect(panel.find('.shp-title').text()).toContain('岁时气象')
    // 三轴（广度/深度/节律）
    const axes = panel.findAll('.shp-axis')
    expect(axes.length).toBe(3)
    expect(panel.text()).toContain('广度')
    expect(panel.text()).toContain('深度')
    expect(panel.text()).toContain('节律')
    // 五指标全 0
    const metrics = panel.findAll('.shp-metric')
    expect(metrics.length).toBe(5)
    for (const m of metrics) expect(m.find('b').text()).toBe('0')
    // 圆环得分 0/100，四季分布 4 行
    expect(panel.find('.shp-ring-num').text()).toContain('0')
    expect(panel.findAll('.shp-season').length).toBe(4)
    // 空态仅一条温和提醒（无任何「已拾起」式统计洞察）
    const insights = panel.findAll('.shp-insights li')
    expect(insights.length).toBe(1)
    expect(insights[0].text()).toContain('还没有仪式')
  })

  it('种子完成仪式后得分提升、已拾起/覆盖季节上数并给出洞察', async () => {
    mockStore['hf:seasonal_rituals'] = [
      { id: 'a', name: '夏至除湿', season: 'summer', description: '', tags: [], count: 2, lastCompletedAt: '2026-08-01T12:00:00.000Z', createdAt: '2024-01-01T00:00:00.000Z' } as any,
      { id: 'b', name: '冬至进补', season: 'winter', description: '', tags: [], count: 1, lastCompletedAt: '2026-07-20T12:00:00.000Z', createdAt: '2024-01-01T00:00:00.000Z' } as any,
    ]
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()
    const panel = wrapper.find('.shp')
    // 得分 > 0
    const score = parseInt(panel.find('.shp-ring-num').text(), 10)
    expect(score).toBeGreaterThan(0)
    // 已拾起 = count>0 的仪式数 = 2；覆盖季节 = 2
    const metrics = panel.findAll('.shp-metric')
    expect(metrics[1].find('b').text()).toBe('2')
    expect(metrics[3].find('b').text()).toBe('2')
    // 洞察出现
    expect(panel.find('.shp-insights').exists()).toBe(true)
    expect(panel.text()).toContain('已拾起')
  })
})

// ============================================================
// 集成：此刻时令 DiaryAutoMeta（INCR-304 补挂载孤儿组件）
// 零 props 自持读桥：modules/zeitgeist 的 useZeitgeist()（pref/updatePref/
// collectNow/lastMeta，存储键 hf:zeitgeist_pref / hf:zeitgeist_last）。
// 宿主 SeasonalRituals 内 zeitgeist 零消费方（ZeitgeistPanel 仅在 DailyAnchor
// 跨宿主消费）→ 引擎唯一；组件无模块级 ref，setup 时经 lastMeta() 读库，
// 故在 createWrapper 前预置 mockStore 即可。
// 徽章顺序：.zim-chip[0] 天气(.zim-chip-btn) / [1] 时辰(.zim-branch+.zim-sub+.zim-element)
// / [2] 节气(.zim-sub 图标 + .zim-branch 名) / [3] 季节(.zim-season)。
// ============================================================
describe('集成：此刻时令（DiaryAutoMeta）', () => {
  const FIXED_META = {
    date: '2026-09-14',
    weekday: '星期一',
    shichen: '申',
    shichenAlias: '晡时',
    shichenElement: '金',
    solarTerm: '白露',
    solarTermIcon: '💧',
    season: '秋',
    weather: 'sunny',
  }

  beforeEach(() => {
    delete mockStore['hf:zeitgeist_last']
    delete mockStore['hf:zeitgeist_pref']
  })

  it('预置时令元数据：渲染日期/时辰/节气/季节/天气四徽章', async () => {
    mockStore['hf:zeitgeist_last'] = { ...FIXED_META }
    const wrapper = await createWrapper()
    const zim = wrapper.find('.zim')
    expect(zim.exists()).toBe(true)
    // 开关行：日期 + 星期
    expect(zim.find('.zim-date').text()).toContain('2026-09-14')
    expect(zim.find('.zim-date').text()).toContain('星期一')
    // 四个徽章：天气/时辰/节气/季节
    const chips = zim.findAll('.zim-chip')
    expect(chips.length).toBe(4)
    expect(chips[0].find('.zim-chip-btn').text()).toContain('☀️')
    expect(chips[1].find('.zim-branch').text()).toBe('申')
    expect(chips[1].find('.zim-sub').text()).toBe('晡时')
    expect(chips[1].find('.zim-element').text()).toBe('金')
    expect(chips[2].find('.zim-sub').text()).toBe('💧')
    expect(chips[2].find('.zim-branch').text()).toBe('白露')
    expect(chips[3].classes()).toContain('zim-season')
    expect(chips[3].text()).toBe('秋')
  })

  it('空态：挂载即采集当前时令并显影徽章', async () => {
    const wrapper = await createWrapper()
    const zim = wrapper.find('.zim')
    // onMounted 自动 collectNow → meta 就绪：日期行 + 徽章条 + 刷新按钮
    expect(zim.find('.zim-date').text()).toContain('·')
    expect(zim.find('.zim-bar').exists()).toBe(true)
    expect(zim.findAll('.zim-chip').length).toBeGreaterThanOrEqual(3)
    expect(zim.find('.zim-refresh').text()).toBe('↻')
  })

  it('切换「自动记录时令」开关写入偏好', async () => {
    mockStore['hf:zeitgeist_pref'] = { autoCollect: true, defaultWeather: null }
    const wrapper = await createWrapper()
    const cb = wrapper.find('.zim-on input')
    expect((cb.element as HTMLInputElement).checked).toBe(true)
    await cb.setValue(false)
    expect(mockStore['hf:zeitgeist_pref']).toMatchObject({ autoCollect: false })
  })

  it('更换天气：选择器 7 预设，选雨后更新元数据与存储', async () => {
    mockStore['hf:zeitgeist_last'] = { ...FIXED_META }
    const wrapper = await createWrapper()
    const zim = wrapper.find('.zim')
    // 点击天气徽章进入编辑
    await zim.find('.zim-chip-btn').trigger('click')
    const picker = zim.find('.zim-picker')
    expect(picker.exists()).toBe(true)
    const weatherBtns = picker.findAll('.zim-w')
    expect(weatherBtns.length).toBe(7)
    // WEATHER_PRESETS 顺序：晴/多云/阴/雨/雪/风/雾 → 下标 3 为雨 🌧️
    await weatherBtns[3].trigger('click')
    expect(zim.find('.zim-chip-btn').text()).toContain('🌧️')
    expect(mockStore['hf:zeitgeist_last'].weather).toBe('rain')
  })
})