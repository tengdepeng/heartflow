// ============================================================
// GuardRoom 视图测试
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, computed } from 'vue'

// 模拟 storage (用于 GuardRoom 直接访问的部分)
const mockStore: Record<string, any> = {}
const mockGetKV = vi.fn((_key: string, def: any) => mockStore[_key] ?? def)
const mockSetKV = vi.fn((key: string, val: any) => { mockStore[key] = val })

vi.mock('../../engine/storage', () => ({
  storage: { getKV: (...args: any[]) => (mockGetKV as any)(...args), setKV: (...args: any[]) => (mockSetKV as any)(...args) },
}))

// ---- 模拟 health store ----
const mockBodyLogs = ref<any[]>([])
const mockGuardHeartRateLogs = ref<any[]>([])
const mockAddGuardHeartRateLog = vi.fn()

vi.mock('../../stores/health', () => ({
  useHealthStore: () => ({
    bodyLogs: mockBodyLogs,
    guardHeartRateLogs: mockGuardHeartRateLogs,
    addGuardHeartRateLog: (...args: any[]) => mockAddGuardHeartRateLog(...args),
    $reset: () => {},
  }),
}))

// ---- 模拟 config store ----
const mockConfigState = { advisorEnabled: true }
const mockConfig = computed(() => ({ ...mockConfigState }))
const mockUpdateAdvisor = vi.fn((v: boolean) => { mockConfigState.advisorEnabled = v })

vi.mock('../../stores/config', () => ({
  useConfigStore: () => ({
    config: mockConfig,
    updateAdvisorEnabled: mockUpdateAdvisor,
    $reset: () => {},
  }),
}))

// ---- 模拟 perception store ----
const mockPerceptionEnv = ref({
  hour: 12,
  timeOfDay: 'afternoon' as const,
  isDark: false,
  isOnline: true,
  batteryLevel: 0.85,
  isCharging: false,
  deviceIdleMs: 0,
  isUserIdle: false,
  isLowPower: false,
  activeApp: null,
  activeWindowTitle: null,
  isFocusing: false,
  ambientLight: 500,
  isScreenAwake: true,
  systemTheme: null,
  systemVolume: null,
  healthSummary: null,
  source: 'web' as const,
  lastUpdated: Date.now(),
})

vi.mock('../../stores/perception', () => ({
  usePerceptionStore: () => ({
    environment: mockPerceptionEnv,
    isDark: computed(() => mockPerceptionEnv.value.isDark),
    isLowPower: computed(() => mockPerceptionEnv.value.isLowPower),
    timeOfDay: computed(() => mockPerceptionEnv.value.timeOfDay),
    setEnvironment: vi.fn(),
    patchEnvironment: vi.fn(),
    $reset: () => {},
  }),
}))

// ---- 模拟 pinia ----
vi.mock('pinia', () => ({
  storeToRefs: (store: any) => {
    const result: Record<string, any> = {}
    for (const key of Object.keys(store)) {
      if (key.startsWith('$')) continue
      result[key] = store[key]
    }
    return result
  },
  defineStore: () => () => ({}),
  setActivePinia: () => {},
  createPinia: () => ({}),
}))

// 标签索引: govern=0, security=1, health=2, psyche=3
async function clickTab(wrapper: any, index: number) {
  const tabs = wrapper.findAll('.guard-tab')
  await tabs[index].trigger('click')
}

async function getWrapper() {
  const { default: GuardRoom } = await import('../GuardRoom.vue')
  return mount(GuardRoom)
}

describe('GuardRoom 视图', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore['hf:contacts'] = []
    mockStore['hf:guard_visits'] = []
    mockConfigState.advisorEnabled = true
    mockBodyLogs.value = []
    mockGuardHeartRateLogs.value = []
  })

  it('渲染标题', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('守护室')
  })

  it('显示联系人数量', async () => {
    mockStore['hf:contacts'] = [
      { id: 'c1', name: '张三', phone: '13800000000', priority: 'primary' },
    ]
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('1')
    await clickTab(wrapper, 2)
    expect(wrapper.text()).toContain('张三')
  })

  it('添加联系人', async () => {
    const wrapper = await getWrapper()
    await clickTab(wrapper, 2)
    const inputs = wrapper.findAll('.guard-input')
    await inputs[0].setValue('李四')
    await inputs[1].setValue('13900000000')
    const addBtn = wrapper.findAll('button.guard-btn').filter(b => b.text() === '添加')
    await addBtn[0].trigger('click')
    expect(mockSetKV).toHaveBeenCalled()
    expect(mockStore['hf:contacts']).toHaveLength(1)
    expect(mockStore['hf:contacts'][0].name).toBe('李四')
  })

  it('删除联系人', async () => {
    mockStore['hf:contacts'] = [
      { id: 'c1', name: '张三', phone: '13800000000', priority: 'primary' },
    ]
    const wrapper = await getWrapper()
    await clickTab(wrapper, 2)
    const delBtns = wrapper.findAll('.guard-del')
    await delBtns[1].trigger('click')
    expect(mockStore['hf:contacts']).toHaveLength(0)
  })

  it('显示访问记录', async () => {
    mockStore['hf:guard_visits'] = [
      { id: 'v1', at: '2026-07-20T10:00:00.000Z', action: '访问守护室' },
    ]
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('1')
    const subTabs = wrapper.findAll('.guard-sub-tab')
    await subTabs[3].trigger('click')
    expect(wrapper.text()).toContain('访问记录')
  })

  it('记录本次访问', async () => {
    const wrapper = await getWrapper()
    const subTabs = wrapper.findAll('.guard-sub-tab')
    await subTabs[3].trigger('click')
    const visitBtn = wrapper.findAll('button.guard-btn').filter(b => b.text().includes('记录本次访问'))
    await visitBtn[0].trigger('click')
    expect(mockStore['hf:guard_visits']).toHaveLength(1)
    expect(mockStore['hf:guard_visits'][0].action).toBe('访问守护室')
  })

  it('顾问开关默认打开', async () => {
    const wrapper = await getWrapper()
    await clickTab(wrapper, 3)
    expect(wrapper.text()).toContain('幕僚顾问')
    expect(wrapper.text()).toContain('开')
  })

  it('显示反诈骗核验区域', async () => {
    const wrapper = await getWrapper()
    await clickTab(wrapper, 1)
    const subTabs = wrapper.findAll('.guard-sub-tab')
    await subTabs[3].trigger('click')
    expect(wrapper.text()).toContain('反诈骗核验')
  })

  it('显示光笺按钮', async () => {
    const wrapper = await getWrapper()
    await clickTab(wrapper, 3)
    expect(wrapper.text()).toContain('打开光笺')
  })

  it('点击光笺按钮显示内容', async () => {
    const wrapper = await getWrapper()
    await clickTab(wrapper, 3)
    const letterBtn = wrapper.findAll('button.light-letter-btn')
    await letterBtn[0].trigger('click')
    expect(wrapper.text()).toContain('心理援助热线')
  })

  // ============================================================
  // 新增标签导航测试
  // ============================================================

  it('标签栏渲染 4 个标签', async () => {
    const wrapper = await getWrapper()
    const tabs = wrapper.findAll('.guard-tab')
    expect(tabs).toHaveLength(4)
    expect(tabs[0].text()).toContain('治理台')
    expect(tabs[1].text()).toContain('安全台')
    expect(tabs[2].text()).toContain('健康台')
    expect(tabs[3].text()).toContain('心理安全')
  })

  it('默认激活治理台标签', async () => {
    const wrapper = await getWrapper()
    const tabs = wrapper.findAll('.guard-tab')
    expect(tabs[0].classes()).toContain('active')
    expect(tabs[1].classes()).not.toContain('active')
    expect(tabs[2].classes()).not.toContain('active')
    expect(tabs[3].classes()).not.toContain('active')
    expect(wrapper.text()).toContain('数据全部本地存储')
    expect(wrapper.text()).toContain('存储空间')
    expect(wrapper.text()).not.toContain('反诈骗核验')
    expect(wrapper.text()).not.toContain('心理安全光笺')
    const subTabs = wrapper.findAll('.guard-sub-tab')
    expect(subTabs).toHaveLength(5)
    expect(subTabs[0].classes()).toContain('active')
  })

  it('点击标签切换可见内容', async () => {
    const wrapper = await getWrapper()
    await clickTab(wrapper, 1)
    const tabs = wrapper.findAll('.guard-tab')
    expect(tabs[1].classes()).toContain('active')
    expect(wrapper.text()).toContain('本地存储加密')
    expect(wrapper.text()).toContain('备份状态')
    expect(wrapper.text()).not.toContain('数据全部本地存储')
  })

  it('健康台显示身体数据概览占位', async () => {
    const wrapper = await getWrapper()
    await clickTab(wrapper, 2)
    expect(wrapper.text()).toContain('身体数据概览')
    expect(wrapper.text()).toContain('心率')
    expect(wrapper.text()).toContain('睡眠')
    expect(wrapper.text()).toContain('活动')
  })

  it('安全台显示紧急操作区域', async () => {
    const wrapper = await getWrapper()
    await clickTab(wrapper, 1)
    const subTabs = wrapper.findAll('.guard-sub-tab')
    await subTabs[3].trigger('click')
    expect(wrapper.text()).toContain('SOS')
    expect(wrapper.text()).toContain('假来电')
    expect(wrapper.text()).toContain('报平安')
  })

  it('心理安全显示幕僚顾问', async () => {
    const wrapper = await getWrapper()
    await clickTab(wrapper, 3)
    expect(wrapper.text()).toContain('幕僚顾问')
    expect(wrapper.text()).toContain('顾问弹窗')
  })

  it('统计概览在所有标签下均可见', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('紧急联系人')
    expect(wrapper.text()).toContain('幕僚顾问')
    expect(wrapper.text()).toContain('数据回流')
    expect(wrapper.text()).toContain('访问次数')
    await clickTab(wrapper, 1)
    expect(wrapper.text()).toContain('紧急联系人')
    expect(wrapper.text()).toContain('幕僚顾问')
    await clickTab(wrapper, 2)
    expect(wrapper.text()).toContain('紧急联系人')
    expect(wrapper.text()).toContain('访问次数')
    await clickTab(wrapper, 3)
    expect(wrapper.text()).toContain('紧急联系人')
    expect(wrapper.text()).toContain('访问次数')
  })

  // ============================================================
  // 次级标签导航测试
  // ============================================================

  it('治理台显示 5 个次级标签', async () => {
    const wrapper = await getWrapper()
    const subTabs = wrapper.findAll('.guard-sub-tab')
    expect(subTabs).toHaveLength(5)
    expect(subTabs[0].text()).toContain('数据治理')
    expect(subTabs[1].text()).toContain('存储治理')
    expect(subTabs[2].text()).toContain('权限治理')
    expect(subTabs[3].text()).toContain('隐私治理')
    expect(subTabs[4].text()).toContain('数据主权')
  })

  it('安全台显示 6 个次级标签', async () => {
    const wrapper = await getWrapper()
    await clickTab(wrapper, 1)
    const subTabs = wrapper.findAll('.guard-sub-tab')
    expect(subTabs).toHaveLength(6)
    expect(subTabs[0].text()).toContain('数据安全')
    expect(subTabs[1].text()).toContain('网络安全')
    expect(subTabs[2].text()).toContain('设备安全')
    expect(subTabs[3].text()).toContain('应急安全')
    expect(subTabs[4].text()).toContain('态势中心')
    expect(subTabs[5].text()).toContain('隐私加密')
  })

  it('次级标签切换内容', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('数据全部本地存储')
    const subTabs = wrapper.findAll('.guard-sub-tab')
    await subTabs[1].trigger('click')
    expect(wrapper.text()).toContain('情绪记录')
    expect(wrapper.text()).toContain('锚点数据')
    await subTabs[2].trigger('click')
    expect(wrapper.text()).toContain('幕僚访问权限')
    await subTabs[3].trigger('click')
    expect(wrapper.text()).toContain('匿名模式')
    expect(wrapper.text()).toContain('数据保留期')
  })

  it('数据主权子标签显示数据清单', async () => {
    const wrapper = await getWrapper()
    localStorage.setItem('hf:knowledge_test', JSON.stringify({ title: 'test' }))
    localStorage.setItem('hf:mood_test', JSON.stringify({ mood: 'happy' }))
    const subTabs = wrapper.findAll('.guard-sub-tab')
    await subTabs[4].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('数据主权')
    expect(wrapper.text()).toContain('数据清单')
    expect(wrapper.text()).toContain('选择性导出')
    localStorage.removeItem('hf:knowledge_test')
    localStorage.removeItem('hf:mood_test')
  })

  it('数据主权显示选择性导出选项', async () => {
    const wrapper = await getWrapper()
    const subTabs = wrapper.findAll('.guard-sub-tab')
    await subTabs[4].trigger('click')
    await wrapper.vm.$nextTick()
    const exportBtns = wrapper.findAll('button.guard-btn').filter(b => b.text().includes('导出选中'))
    expect(exportBtns.length).toBeGreaterThan(0)
    expect(exportBtns[0].attributes('disabled')).toBeDefined()
  })

  it('数据主权显示模块删除按钮', async () => {
    const wrapper = await getWrapper()
    localStorage.setItem('hf:knowledge_test', JSON.stringify({ title: 'test' }))
    localStorage.setItem('hf:mood_test', JSON.stringify({ mood: 'happy' }))
    const subTabs = wrapper.findAll('.guard-sub-tab')
    await subTabs[4].trigger('click')
    await wrapper.vm.$nextTick()
    const delBtns = wrapper.findAll('button.guard-del')
    expect(delBtns.length).toBeGreaterThan(0)
    localStorage.removeItem('hf:knowledge_test')
    localStorage.removeItem('hf:mood_test')
  })

  it('安全评分显示', async () => {
    const wrapper = await getWrapper()
    await clickTab(wrapper, 1)
    expect(wrapper.text()).toContain('安全评分')
    expect(wrapper.text()).toContain('安全评分详情')
    expect(wrapper.text()).toContain('数据本地存储')
    expect(wrapper.text()).toContain('匿名模式')
    expect(wrapper.text()).toContain('幕僚顾问')
    expect(wrapper.text()).toContain('数据回流关闭')
    expect(wrapper.text()).toContain('外部链接控制')
  })

  it('会话活动区域显示', async () => {
    const wrapper = await getWrapper()
    await clickTab(wrapper, 1)
    expect(wrapper.text()).toContain('会话活动')
    expect(wrapper.text()).toContain('当前状态')
  })

  it('网络安全子标签显示', async () => {
    const wrapper = await getWrapper()
    await clickTab(wrapper, 1)
    const subTabs = wrapper.findAll('.guard-sub-tab')
    await subTabs[1].trigger('click')
    expect(wrapper.text()).toContain('网络安全')
    expect(wrapper.text()).toContain('网络请求状态')
    expect(wrapper.text()).toContain('外部链接控制')
  })

  it('设备安全子标签显示', async () => {
    const wrapper = await getWrapper()
    await clickTab(wrapper, 1)
    const subTabs = wrapper.findAll('.guard-sub-tab')
    await subTabs[2].trigger('click')
    expect(wrapper.text()).toContain('设备安全')
    expect(wrapper.text()).toContain('当前设备')
    expect(wrapper.text()).toContain('解锁方式')
  })

  // ===== C3-1: 健康数据增强 =====

  it('健康台显示身体数据概览标题', async () => {
    const wrapper = await getWrapper()
    await clickTab(wrapper, 2)
    expect(wrapper.text()).toContain('身体数据概览')
  })

  it('健康台显示三张健康卡片', async () => {
    const wrapper = await getWrapper()
    await clickTab(wrapper, 2)
    const cards = wrapper.findAll('.health-card')
    expect(cards.length).toBe(3)
  })

  it('健康卡片显示心率区域', async () => {
    const wrapper = await getWrapper()
    await clickTab(wrapper, 2)
    const cards = wrapper.findAll('.health-card')
    expect(cards[0].text()).toContain('心率')
    expect(cards[0].text()).toContain('bpm')
  })

  it('健康卡片显示睡眠区域', async () => {
    const wrapper = await getWrapper()
    await clickTab(wrapper, 2)
    const cards = wrapper.findAll('.health-card')
    expect(cards[1].text()).toContain('睡眠')
    expect(cards[1].text()).toContain('h')
  })

  it('健康卡片显示活动区域', async () => {
    const wrapper = await getWrapper()
    await clickTab(wrapper, 2)
    const cards = wrapper.findAll('.health-card')
    expect(cards[2].text()).toContain('活动')
    expect(cards[2].text()).toContain('分/周')
  })

  it('心率卡片有手动输入框和记录按钮', async () => {
    const wrapper = await getWrapper()
    await clickTab(wrapper, 2)
    const heartInput = wrapper.find('.hc-input')
    expect(heartInput.exists()).toBe(true)
    const heartBtn = wrapper.find('.hc-btn')
    expect(heartBtn.exists()).toBe(true)
    expect(heartBtn.text()).toContain('记录')
  })

  it('心率输入后点击记录应保存数据', async () => {
    const wrapper = await getWrapper()
    await clickTab(wrapper, 2)
    const heartInput = wrapper.find('.hc-input')
    await heartInput.setValue(75)
    const heartBtn = wrapper.find('.hc-btn')
    await heartBtn.trigger('click')
    expect(mockAddGuardHeartRateLog).toHaveBeenCalledWith(75)
  })

  it('无数据时心率显示"--"', async () => {
    mockGuardHeartRateLogs.value = []
    const wrapper = await getWrapper()
    await clickTab(wrapper, 2)
    const cards = wrapper.findAll('.health-card')
    expect(cards[0].text()).toContain('--')
    expect(cards[0].text()).toContain('暂无数据')
  })

  it('无身体数据时睡眠显示"--"', async () => {
    mockBodyLogs.value = []
    const wrapper = await getWrapper()
    await clickTab(wrapper, 2)
    const cards = wrapper.findAll('.health-card')
    expect(cards[1].text()).toContain('--')
    expect(cards[1].text()).toContain('暂无数据')
  })

  it('有身体数据时睡眠显示平均值', async () => {
    mockBodyLogs.value = [
      { id: 's1', type: 'sleep', value: { hours: 8 }, at: '2026-07-29T08:00:00.000Z' },
      { id: 's2', type: 'sleep', value: { hours: 6 }, at: '2026-07-28T08:00:00.000Z' },
    ]
    const wrapper = await getWrapper()
    await clickTab(wrapper, 2)
    const cards = wrapper.findAll('.health-card')
    expect(cards[1].text()).toContain('7.0')
    expect(cards[1].text()).toContain('睡眠充足')
  })

  it('有运动数据时活动显示周总量', async () => {
    mockBodyLogs.value = [
      { id: 'e1', type: 'exercise', value: { minutes: 30 }, at: new Date().toISOString() },
      { id: 'e2', type: 'exercise', value: { minutes: 45 }, at: new Date().toISOString() },
    ]
    const wrapper = await getWrapper()
    await clickTab(wrapper, 2)
    const cards = wrapper.findAll('.health-card')
    expect(cards[2].text()).toContain('75')
  })

  it('睡眠卡片有迷你趋势图', async () => {
    mockBodyLogs.value = [
      { id: 's1', type: 'sleep', value: { hours: 7 }, at: '2026-07-29T08:00:00.000Z' },
    ]
    const wrapper = await getWrapper()
    await clickTab(wrapper, 2)
    const sleepCard = wrapper.findAll('.health-card')[1]
    const sparks = sleepCard.findAll('.hc-spark')
    expect(sparks.length).toBeGreaterThan(0)
  })

  it('健康数据提示信息显示', async () => {
    const wrapper = await getWrapper()
    await clickTab(wrapper, 2)
    expect(wrapper.text()).toContain('数据来自身体温室')
  })

  // ============================================================
  // 集成：实时异常检测面板（INCR-161：补挂载 claim-but-orphan 面板）
  // ============================================================

  it('集成渲染实时异常检测面板', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.adp-panel').exists()).toBe(true)
    expect(wrapper.text()).toContain('实时异常检测')
    expect(wrapper.text()).toContain('检测次数')
    expect(wrapper.text()).toContain('暂无严重未解决异常')
  })

  it('实时异常检测徽标展示空态计数', async () => {
    const wrapper = await getWrapper()
    const badge = wrapper.find('.adp-badge')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toContain('0 异常')
  })
})