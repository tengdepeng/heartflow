// ============================================================
// GrowthGarden 视图测试 - 成长庭院
// 现绑定：modules/goal（目标花园）/ modules/garden（点缀）/ modules/seasonal（光茧）
// 采用真实实现 + 模拟 storage；storage 状态用 vi.hoisted 保证在 import 前就绪。
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

// ---- 模拟 storage（vi.hoisted 确保在 import 前初始化） ----
const h = vi.hoisted(() => {
  const mockStore: Record<string, any> = {}
  const mockGetKV = (key: string, def: any) => mockStore[key] ?? def
  const mockSetKV = (key: string, val: any) => { mockStore[key] = val }
  return { mockStore, mockGetKV, mockSetKV }
})

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (...args: any[]) => (h.mockGetKV as any)(...args),
    setKV: (...args: any[]) => (h.mockSetKV as any)(...args),
    getGoals: () => h.mockStore['__goals'] ?? [],
    setGoals: (v: any) => { h.mockStore['__goals'] = v },
  },
}))

// ---- 模拟 useViewEntrance ----
vi.mock('../../composables/useViewEntrance', () => ({
  useViewEntrance: () => ({ entranceRef: ref(null), entranceClass: ref('') }),
}))

// 真实模块（依赖已模拟的 storage）
import { useGoal } from '../../modules/goal'
import { useGardenFlourish } from '../../modules/garden'
import { useCocoonStore } from '../../modules/seasonal/cocoon-store'
import { useJournalStore } from '../../modules/seasonal/journal-store'

async function getWrapper() {
  const { default: GrowthGarden } = await import('../GrowthGarden.vue')
  return mount(GrowthGarden, {
    global: { stubs: { Teleport: true, Transition: true } },
  })
}

describe('GrowthGarden 成长庭院', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(h.mockStore).forEach(k => delete h.mockStore[k])
    if (typeof localStorage !== 'undefined') localStorage.clear()
    useGoal().load()
    const f = useGardenFlourish()
    f.seeds.value = []
    f.habits.value = []
    f.compass.value = []
    useCocoonStore().cocoons.value = []
    ;(window as any).confirm = vi.fn(() => true)
  })

  it('渲染标题"成长庭院"', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('成长庭院')
  })

  it('统计概览显示四个维度（目标/已开花/生长中/休眠）', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('目标')
    expect(wrapper.text()).toContain('已开花')
    expect(wrapper.text()).toContain('生长中')
    expect(wrapper.text()).toContain('休眠')
  })

  it('渲染成长气象面板', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.gmp').exists()).toBe(true)
    expect(wrapper.text()).toContain('成长气象')
    expect(wrapper.text()).toContain('目标开花率')
  })

  it('成长气象面板聚合目标与习惯数据', async () => {
    useGoal().create('读完十本书', 'target', 'growth')
    const f = useGardenFlourish()
    f.plantSeed('晨跑')
    f.addHabit('晨跑')
    f.habits.value[0].ticks = [new Date().toISOString().slice(0, 10)]
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('种子发芽率')
    expect(wrapper.text()).toContain('光茧')
  })

  it('无目标时显示空状态', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('还没有目标')
  })

  it('种下目标后出现在目标花园', async () => {
    const wrapper = await getWrapper()
    const input = wrapper.find('.gw-goal-form-row input')
    await input.setValue('学会放手')
    await wrapper.find('.gw-goal-form-row .gw-btn').trigger('click')
    expect(wrapper.text()).toContain('学会放手')
  })

  it('渲染种子 / 习惯 / 罗盘 区域标题', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('种子')
    expect(wrapper.text()).toContain('习惯追踪')
    expect(wrapper.text()).toContain('人生罗盘')
  })

  it('种下种子后显示种子文本', async () => {
    const wrapper = await getWrapper()
    const seedInput = wrapper.findAll('.gw-seed-row input')[0]
    await seedInput.setValue('每天走路')
    await wrapper.findAll('.gw-seed-row .gw-btn')[0].trigger('click')
    expect(wrapper.text()).toContain('每天走路')
  })

  it('开花目标显示"记录蜕变光茧"钩子', async () => {
    useGoal().goals.value.push({
      id: 'g1', title: '完成书稿', description: '', tier: 'target', domain: 'growth',
      status: 'bloom', parentId: undefined, order: 0, anchorCount: 0, anchorDone: 0,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    })
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('记录蜕变光茧')
  })

  it('渲染心愿清单面板', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.wlp-panel').exists()).toBe(true)
    expect(wrapper.text()).toContain('心愿清单')
    expect(wrapper.text()).toContain('习惯联动解锁')
  })

  it('心愿清单可添加心愿并显示统计', async () => {
    const wrapper = await getWrapper()
    const input = wrapper.find('.wlp-add-form input')
    await input.setValue('去一次远方旅行')
    await wrapper.find('.wlp-add-form').trigger('submit')
    expect(wrapper.text()).toContain('去一次远方旅行')
    expect(wrapper.find('.wlp-stat-num').text()).toBe('1')
  })
})

// =============================================================
// 集成：目标成长状态机面板（INCR-212：补挂载孤儿面板 GoalGrowthStateMachinePanel）
// =============================================================

describe('集成：目标成长状态机面板', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(h.mockStore).forEach(k => delete h.mockStore[k])
    if (typeof localStorage !== 'undefined') localStorage.clear()
    useGoal().load()
    const f = useGardenFlourish()
    f.seeds.value = []
    f.habits.value = []
    f.compass.value = []
    useCocoonStore().cocoons.value = []
    useJournalStore().entries.value = []
    ;(window as any).confirm = vi.fn(() => true)
  })

  it('渲染生命周期导览四个阶段（种子/发芽/生长中/已开花）', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.gsm').exists()).toBe(true)
    expect(wrapper.text()).toContain('目标 · 成长状态机')
    expect(wrapper.findAll('.gsm-stage').length).toBe(4)
    expect(wrapper.text()).toContain('种子')
    expect(wrapper.text()).toContain('已开花')
  })

  it('无目标时显示空态提示', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('暂无目标可检视')
  })

  it('创建目标后可检视可用转换与健康度', async () => {
    useGoal().create('读完十本书', 'target', 'growth')
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('.gsm-pick-btn').length).toBeGreaterThan(0)
    expect(wrapper.text()).toContain('读完十本书')
    expect(wrapper.find('.gsm-pick-btn').exists()).toBe(true)
    await wrapper.find('.gsm-pick-btn').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('可用转换')
    expect(wrapper.text()).toContain('健康度')
  })
})

// =============================================================
// 集成：蜕变光茧 + 季节日志面板（INCR-235：补挂载孤儿组件 SeasonalDepthPanel）
// =============================================================

describe('集成：蜕变光茧 + 季节日志面板', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(h.mockStore).forEach(k => delete h.mockStore[k])
    if (typeof localStorage !== 'undefined') localStorage.clear()
    useGoal().load()
    const f = useGardenFlourish()
    f.seeds.value = []
    f.habits.value = []
    f.compass.value = []
    useCocoonStore().cocoons.value = []
    useJournalStore().entries.value = []
    ;(window as any).confirm = vi.fn(() => true)
  })

  it('渲染面板骨架与空态提示', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.sdp').exists()).toBe(true)
    expect(wrapper.text()).toContain('蜕变光茧')
    expect(wrapper.text()).toContain('还没有光茧')
  })

  it('有光茧时渲染统计与光茧列表', async () => {
    useCocoonStore().createCocoon('学会非线性代数')
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('.sdp-stat').length).toBe(4)
    expect(wrapper.text()).toContain('学会非线性代数')
    expect(wrapper.text()).toContain('已化蝶')
  })

  it('通过表单孕育光茧并出现在列表', async () => {
    const wrapper = await getWrapper()
    await wrapper.find('.sdp-input').setValue('练习瑜伽')
    await wrapper.find('.sdp-submit').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('练习瑜伽')
    expect(wrapper.findAll('.sdp-cocoon').length).toBe(1)
  })

  it('可推进光茧阶段并回退', async () => {
    useCocoonStore().createCocoon('进阶框架')
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    await wrapper.find('.sdp-advance').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('破茧')
  })

  it('写入季节日志后显示在季节日志区块', async () => {
    const wrapper = await getWrapper()
    const inputs = wrapper.findAll('.sdp-input')
    await inputs[1].setValue('秋日回顾')
    await wrapper.find('.sdp-textarea').setValue('这个秋天收获颇多')
    await wrapper.findAll('.sdp-submit')[1].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('季节日志')
    expect(wrapper.text()).toContain('秋日回顾')
  })
})
