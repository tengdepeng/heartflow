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
    mockStore['hf:eye_break_logs'] = []
    mockStore['hf:eye_break_last_rest'] = 0
    delete mockStore['hf:eye_shield_config']
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
    // 注：INCR-351 起 PropertySecurityPanel / PsychologicalSafetyPanel 整簇常驻挂载，
    // 故「反诈骗核验」「心理安全光笺」文本始终存在，不再作为「未切到安全台」的判定依据；
    // 治理能力由下方次级标签断言覆盖。
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

  it('数据主权子标签渲染数据引渡仪式面板（INCR-406 真实引擎全链路）', async () => {
    const wrapper = await getWrapper()
    // useDataExtradition 扫描 localStorage 中以 hf:<module> 为前缀的键，种子情绪/时计模块
    localStorage.setItem('hf:emotion:seed', JSON.stringify({ mood: 'calm' }))
    localStorage.setItem('hf:timer:seed', JSON.stringify({ secs: 300 }))
    const subTabs = wrapper.findAll('.guard-sub-tab')
    await subTabs[4].trigger('click')
    await wrapper.vm.$nextTick()
    // 引渡仪式面板挂载于数据主权子标签
    expect(wrapper.text()).toContain('数据引渡仪式')
    expect(wrapper.text()).toContain('准备')
    expect(wrapper.text()).toContain('完成')
    // 引擎扫描识别出种子模块
    expect(wrapper.text()).toContain('情绪花房')
    expect(wrapper.text()).toContain('更漏·专注计时')
    localStorage.removeItem('hf:emotion:seed')
    localStorage.removeItem('hf:timer:seed')
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

  // ============================================================
  // 批量收口：审计时间线面板（INCR-176）
  // ============================================================

  it('集成渲染审计时间线面板 AuditTimelinePanel', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.findComponent({ name: 'AuditTimelinePanel' }).exists()).toBe(true)
  })

  // ============================================================
  // 批量收口：合规审查面板（INCR-176）
  // ============================================================

  it('集成渲染合规审查面板 ComplianceReviewPanel', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.findComponent({ name: 'ComplianceReviewPanel' }).exists()).toBe(true)
  })

  // ============================================================
  // 集成：用眼休息调度面板（INCR-261 补挂载孤儿组件）
  // 引擎 modules/eye-shield 的 useEyeBreakScheduler 为全库唯一消费方
  // （守护室已挂 EyeShieldPanel 配置端：eyeBreakMinutes 开关/间隔，但无实时
  // 调度执行端；EyeBreakSchedulerPanel 恰补「20-20-20 配置 → 倒计时 → 完成/稍后
  // → 今日节律」闭环）；lastRestAt/records 走 storage 键 hf:eye_break_last_rest、
  // hf:eye_break_logs（getKV/setKV），useEyeBreakScheduler 每次调用新建局部 ref
  // → 无模块级污染；面板零 props、onMounted 自动 start()（scope dispose 清理
  // interval）。宿主 GuardRoom 的 mount 为全量渲染，故此处直接 mount 面板本体
  // 覆盖调度交互流（fake timers 接管 interval，避免残留定时器）。
  // ============================================================

  it('渲染用眼休息调度面板骨架（关闭态提示）', async () => {
    mockStore['hf:eye_shield_config'] = { eyeBreakMinutes: 0 }
    const wrapper = await getWrapper()
    expect(wrapper.find('.gsp-panel').exists()).toBe(true)
    expect(wrapper.text()).toContain('🕐 用眼休息调度')
    expect(wrapper.text()).toContain('20-20-20 · 专注休息节律')
    // 关闭态：提示去「护眼盾」开启
    expect(wrapper.text()).toContain('20-20-20 用眼休息已关闭')
    expect(wrapper.text()).toContain('在「护眼盾」配置里开启')
    expect(wrapper.find('.gsp-count').exists()).toBe(false)
  })

  it('开启态显示实时倒计时与动作按钮', async () => {
    mockStore['hf:eye_shield_config'] = { eyeBreakMinutes: 20 }
    const wrapper = await getWrapper()
    expect(wrapper.find('.gsp-disabled').exists()).toBe(false)
    expect(wrapper.find('.gsp-count').exists()).toBe(true)
    expect(wrapper.text()).toContain('距下次放松')
    expect(wrapper.text()).toContain('今日休息')
    expect(wrapper.text()).toContain('0')
    // onMounted 自动开始计时 → 显示暂停按钮
    expect(wrapper.text()).toContain('⏸ 暂停计时')
  })

  it('暂停与恢复计时', async () => {
    mockStore['hf:eye_shield_config'] = { eyeBreakMinutes: 20 }
    const wrapper = await getWrapper()
    await wrapper.findAll('button.gsp-btn').find(b => b.text().includes('暂停'))!.trigger('click')
    expect(wrapper.text()).toContain('▶ 开始计时')
    await wrapper.findAll('button.gsp-btn').find(b => b.text().includes('开始'))!.trigger('click')
    expect(wrapper.text()).toContain('⏸ 暂停计时')
  })

  it('到点提醒：完成休息记录并写回存储', async () => {
    mockStore['hf:eye_shield_config'] = { eyeBreakMinutes: 20 }
    // lastRestAt 设为很久前 → 已到休息点
    mockStore['hf:eye_break_last_rest'] = Date.now() - 25 * 60_000
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('该起来眺望 6 米外 20 秒了')
    expect(wrapper.text()).toContain('起身走动，闭目或望向远处')
    const doneBtn = wrapper.findAll('button.gsp-btn').find(b => b.text().includes('完成休息'))!
    await doneBtn.trigger('click')
    // 记录写回 hf:eye_break_logs（kind=rest）
    expect(mockStore['hf:eye_break_logs']).toHaveLength(1)
    expect(mockStore['hf:eye_break_logs'][0].kind).toBe('rest')
    expect(mockStore['hf:eye_break_last_rest']).toBeGreaterThan(0)
    // 今日休息计数 +1
    expect(wrapper.text()).toContain('1')
  })

  it('到点提醒：稍后五分钟记录 defer', async () => {
    mockStore['hf:eye_shield_config'] = { eyeBreakMinutes: 20 }
    mockStore['hf:eye_break_last_rest'] = Date.now() - 25 * 60_000
    const wrapper = await getWrapper()
    const deferBtn = wrapper.findAll('button.gsp-btn').find(b => b.text().includes('稍后'))!
    await deferBtn.trigger('click')
    expect(mockStore['hf:eye_break_logs']).toHaveLength(1)
    expect(mockStore['hf:eye_break_logs'][0].kind).toBe('defer')
    expect(wrapper.text()).toContain('稍后')
  })

  it('今日节律统计显示休息与稍后计数', async () => {
    mockStore['hf:eye_shield_config'] = { eyeBreakMinutes: 20 }
    // 三类事件均落在「今日」内并钳制在当前时刻之后，避免凌晨跨午夜导致持续天数越界
    const dayBase = new Date(); dayBase.setHours(0, 0, 0, 0)
    const t0 = dayBase.getTime()
    const cap = Date.now()
    mockStore['hf:eye_break_logs'] = [
      { id: 'eb1', at: Math.min(t0 + 3_600_000, cap), kind: 'rest' },
      { id: 'eb2', at: Math.min(t0 + 7_200_000, cap), kind: 'defer' },
      { id: 'eb3', at: Math.min(t0 + 10_800_000, cap), kind: 'rest' },
    ]
    const wrapper = await getWrapper()
    const stats = wrapper.findAll('.gsp-stat')
    expect(stats[0].text()).toContain('2')
    expect(stats[0].text()).toContain('今日休息')
    expect(stats[1].text()).toContain('1')
    expect(stats[1].text()).toContain('稍后')
    expect(stats[2].text()).toContain('上次休息')
  })
})

// ============================================================
// 集成：安全/守护面板簇（INCR-351 整簇挂载孤儿组件）
// 宿主 GuardRoom 全量 mount；6 面板零 props 直驱，引擎均来自 modules/safety：
//   SecurityDashboardPanel   → useSecurityDashboard/useIncidentResponse/useAuditLog
//   SecurityIncidentPanel     → useIncidentResponse(+态势/规则)
//   CryptoGuardPanel          → useCryptoGuard（挂载仅读 storage，crypto.subtle 仅在点击生成密钥时异步调用）
//   DataSecurityPanel         → useDataSecurity（整库加密/备份/自毁）
//   PropertySecurityPanel     → usePropertySecurity（反诈骗/SOS/假来电）
//   PsychologicalSafetyPanel  → usePsychologicalSafety（光笺/情绪检测）
// 各 use* 为 per-instance（每次调用读 storage）→ 无模块级污染；
// storage 已由顶部 vi.mock('../../engine/storage') 接管（getKV/setKV）。
// ============================================================
describe('集成：安全/守护面板簇（INCR-351）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore['hf:contacts'] = []
  })

  it('整簇 6 面板均挂载进 GuardRoom', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.findComponent({ name: 'SecurityDashboardPanel' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'SecurityIncidentPanel' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'CryptoGuardPanel' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'DataSecurityPanel' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'PropertySecurityPanel' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'PsychologicalSafetyPanel' }).exists()).toBe(true)
  })

  it('安全态势面板渲染评分与事件录入', async () => {
    const wrapper = await getWrapper()
    const panel = wrapper.find('.sdp')
    expect(panel.exists()).toBe(true)
    expect(panel.find('.sdp-title').text()).toContain('安全态势')
    expect(panel.text()).toContain('安全评分')
    expect(panel.text()).toContain('事件录入')
  })

  it('安全事件响应面板渲染态势与规则', async () => {
    const wrapper = await getWrapper()
    const panel = wrapper.find('.sip-panel')
    expect(panel.exists()).toBe(true)
    expect(panel.find('.sip-title').text()).toContain('安全事件响应')
    expect(panel.text()).toContain('事件')
    expect(panel.text()).toContain('规则')
  })

  it('加密守护面板渲染密钥状态', async () => {
    const wrapper = await getWrapper()
    const panel = wrapper.find('.cgp')
    expect(panel.exists()).toBe(true)
    expect(panel.find('.cgp-title').text()).toContain('加密守护')
    expect(panel.text()).toContain('加密状态')
    expect(panel.text()).toContain('AES')
  })

  it('数据安全面板渲染加密与备份', async () => {
    const wrapper = await getWrapper()
    const panel = wrapper.find('.data-security-panel')
    expect(panel.exists()).toBe(true)
    expect(panel.find('.panel-title').text()).toBe('数据安全')
    expect(panel.text()).toContain('数据加密')
  })

  it('财产安全面板渲染反诈骗核验', async () => {
    const wrapper = await getWrapper()
    const panel = wrapper.find('.property-security-panel')
    expect(panel.exists()).toBe(true)
    expect(panel.find('.panel-title').text()).toBe('财产安全')
    expect(panel.text()).toContain('反诈骗核验')
  })

  it('心理安全面板渲染光笺开关', async () => {
    const wrapper = await getWrapper()
    const panel = wrapper.find('.psychological-safety-panel')
    expect(panel.exists()).toBe(true)
    expect(panel.find('.panel-title').text()).toBe('心理安全')
    expect(panel.text()).toContain('心理安全光笺')
  })
})

// ============================================================
// 集成：隐私仪表盘 PrivacyDashboardPanel（INCR-284 补挂载孤儿组件）
// 引擎 modules/safety/privacy-dashboard.ts 的 usePrivacyDashboard 为应用库内唯一
// （rg 排除 __tests__、safety barrel 后仅本组件消费）。零 props，自持读 storage.getKV，
// 存储键 hf:privacy:exposures/permissions/audits/scores/warnings/lock_state/config。
// 引擎 refs 为 per-instance（每次 use 时 loadExposures() 读 storage）→ 无模块级污染，
// 测试仅需在 mount 前 seed mockStore['hf:privacy:*']。
// 注意：GuardRoom 全量 mount，断言须 .pdp 作用域隔离；permission 区 .pdp-stats 为第二个。
// ============================================================
describe('集成：隐私仪表盘', () => {
  const PRIV = 'hf:privacy'

  function clearPrivacy() {
    ;['exposures', 'permissions', 'audits', 'scores', 'warnings', 'lock_state', 'config'].forEach(
      (k) => delete mockStore[`${PRIV}:${k}`],
    )
  }

  const now = new Date().toISOString()

  const exposures = [
    {
      category: 'health', label: '健康数据', description: '心率与情绪轨迹', sensitivity: 'critical',
      storageLocation: 'local', encrypted: false, estimatedCount: 120, estimatedSize: 4096,
      exposureStatus: 'breached', recentAccessCount: 3, lastAccessedAt: now,
      relatedModules: ['health'], riskScore: 90,
    },
    {
      category: 'emotion', label: '情绪数据', description: '每日情绪记录', sensitivity: 'internal',
      storageLocation: 'encrypted_local', encrypted: true, estimatedCount: 200, estimatedSize: 8192,
      exposureStatus: 'safe', recentAccessCount: 1, lastAccessedAt: now,
      relatedModules: ['emotion'], riskScore: 12,
    },
  ]

  const permissions = [
    {
      id: 'p1', name: '情绪读取', description: '读取情绪记录', module: 'emotion', dataCategories: ['emotion'],
      level: 'read', granted: true, grantedAt: now, grantedBy: 'user', revocable: true,
      lastUsedAt: now, riskLevel: 'high',
    },
    {
      id: 'p2', name: '定位权限', description: '访问位置', module: 'location', dataCategories: ['location'],
      level: 'write', granted: true, grantedAt: now, grantedBy: 'user', revocable: true,
      lastUsedAt: null, riskLevel: 'critical',
    },
    {
      id: 'p3', name: '系统日志', description: '读写系统日志', module: 'system', dataCategories: ['system'],
      level: 'read', granted: false, grantedAt: null, grantedBy: 'user', revocable: true,
      lastUsedAt: null, riskLevel: 'low',
    },
  ]

  const audits = [
    {
      id: 'a1', auditedAt: now, totalPermissions: 3, grantedPermissions: 2,
      highRiskPermissions: 2, unusedPermissions: 1, overGrantedPermissions: 1,
      permissions, recommendations: ['建议撤销未使用的高风险权限', '定期复核授权清单'],
    },
  ]

  const scores = [
    {
      total: 85, grade: 'B',
      dimensions: [
        { name: '暴露面控制', score: 80, weight: 1, items: [] },
        { name: '权限规范', score: 90, weight: 1, items: [] },
      ],
      scoredAt: now, trend: 'stable', delta: 0,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    clearPrivacy()
  })

  it('无种子数据时引擎自动初始化暴露面并渲染填充仪表盘', async () => {
    const wrapper = await getWrapper()
    const pdp = wrapper.find('.pdp-panel')
    expect(pdp.find('.pdp-title').text()).toBe('🔐 隐私仪表盘')
    // 空态「数据未显影」为理论兜底：usePrivacyDashboard 初始化时 exposures 为空会
    // 自动 initializeExposures() 扫描并填充各数据类别 → hasData 恒为真 → 走填充态
    expect(pdp.find('.pdp-badge-neutral').exists()).toBe(false)
    expect(pdp.find('.pdp-block').exists()).toBe(true)
    expect(pdp.findAll('.pdp-exposure').length).toBeGreaterThan(0)
  })

  it('有数据暴露面时渲染概览与徽章并标记需关注', async () => {
    mockStore['hf:privacy:exposures'] = exposures
    const wrapper = await getWrapper()
    const pdp = wrapper.find('.pdp-panel')
    // 有 breached 类别且无预警 → overallStatus=warning → 徽章「需关注」
    expect(pdp.find('.pdp-badge').text()).toBe('需关注')
    expect(pdp.findAll('.pdp-block-title').map((t) => t.text())).toContain('数据暴露面')
    // 概览统计：总 2 / 安全 1 / 需关注 0 / 已泄露 1
    const stats = pdp.find('.pdp-stats').findAll('.pdp-stat-num')
    expect(stats.map((s) => s.text())).toEqual(['2', '1', '0', '1'])
    expect(pdp.findAll('.pdp-exposure').length).toBe(2)
    expect(pdp.find('.pdp-status--breached').exists()).toBe(true)
    expect(pdp.find('.pdp-status--safe').exists()).toBe(true)
  })

  it('渲染隐私评分维度与权限审计建议', async () => {
    mockStore['hf:privacy:exposures'] = exposures
    mockStore['hf:privacy:scores'] = scores
    mockStore['hf:privacy:permissions'] = permissions
    mockStore['hf:privacy:audits'] = audits
    const wrapper = await getWrapper()
    const pdp = wrapper.find('.pdp-panel')
    // 隐私评分：85 分 / B 级 / 趋势平稳 / 两个维度
    expect(pdp.find('.pdp-score-num').text()).toBe('85')
    expect(pdp.find('.pdp-score-grade').text()).toBe('B')
    expect(pdp.find('.pdp-score-meta').text()).toContain('良好')
    expect(pdp.find('.pdp-score-meta').text()).toContain('平稳')
    expect(pdp.findAll('.pdp-dim').length).toBe(2)
    // 权限审计：总 3 / 已授权 2 / 高风险 2 / 未使用 1（第二个 .pdp-stats 块）
    const auditStats = pdp.findAll('.pdp-stats')[1].findAll('.pdp-stat-num')
    expect(auditStats.map((s) => s.text())).toEqual(['3', '2', '2', '1'])
    expect(pdp.findAll('.pdp-rec').length).toBe(2)
    expect(pdp.text()).toContain('建议撤销未使用的高风险权限')
  })

  it('泄露预警展示警告卡片与危险徽章', async () => {
    mockStore['hf:privacy:exposures'] = exposures
    mockStore['hf:privacy:warnings'] = [
      {
        id: 'w1', level: 'critical', title: '检测到健康数据外发的可疑链路',
        description: '疑似后台同步将健康数据发往外部服务', affectedCategories: ['health'],
        probability: 0.85, impact: 'severe', recommendations: ['立即断开并锁定'],
        warnedAt: now, acknowledged: false, resolved: false, autoGenerated: true,
      },
    ]
    const wrapper = await getWrapper()
    const pdp = wrapper.find('.pdp-panel')
    // 存在 critical 未解决预警 → overallStatus=danger → 徽章「危险」
    expect(pdp.find('.pdp-badge').text()).toBe('危险')
    expect(pdp.findAll('.pdp-warning').length).toBe(1)
    expect(pdp.find('.pdp-warning--critical').exists()).toBe(true)
    expect(pdp.text()).toContain('检测到健康数据外发')
  })

  it('一键锁定可锁定与解锁并写回存储', async () => {
    mockStore['hf:privacy:permissions'] = [permissions[1]] // 使 hasData 为真
    mockStore['hf:privacy:lock_state'] = {
      locked: false, lockedAt: null, reason: '', scope: 'all', duration: 0,
      expiresAt: null, unlockMethod: 'password', lockedBy: '',
    }
    const wrapper = await getWrapper()
    const pdp = wrapper.find('.pdp-panel')
    expect(pdp.find('.pdp-lock-status').text()).toBe('未锁定')
    // 立即锁定
    await pdp.find('.pdp-lock .pdp-btn').trigger('click')
    await wrapper.vm.$nextTick()
    expect(pdp.find('.pdp-lock-status').text()).toBe('已锁定')
    expect(mockStore['hf:privacy:lock_state'].locked).toBe(true)
    // 解锁
    await pdp.find('.pdp-lock .pdp-btn').trigger('click')
    await wrapper.vm.$nextTick()
    expect(pdp.find('.pdp-lock-status').text()).toBe('未锁定')
    expect(mockStore['hf:privacy:lock_state'].locked).toBe(false)
  })
})