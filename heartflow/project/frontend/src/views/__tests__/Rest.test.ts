// ============================================================
// Rest 息壤视图测试
// 休憩管理：支持休憩方式编辑、记录、搜索、建议
// ============================================================
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'

// ---- 类型定义 ----
interface RestPractice {
  id: string
  name: string
  icon: string
  color: string
  description: string
  recovery: number
  tags: string[]
}

interface BreakRecord {
  id: string
  activity: string
  duration: number
  mood: number
  note?: string
  date: string
}

// ---- Mock 数据 ----
const DEFAULT_PRACTICES: RestPractice[] = [
  { id: 'meditation', name: '冥想', icon: '🧘', color: '#8ab87a', description: '静坐冥想，观察呼吸与思绪', recovery: 85, tags: ['身心', '专注'] },
  { id: 'nap', name: '小憩', icon: '😴', color: '#7ab89a', description: '短暂休息，为大脑充电', recovery: 70, tags: ['恢复', '精力'] },
  { id: 'walk', name: '散步', icon: '🚶', color: '#8ac4a0', description: '户外漫步，亲近自然', recovery: 75, tags: ['运动', '户外'] },
  { id: 'music', name: '听音乐', icon: '🎵', color: '#a0c4a8', description: '沉浸于旋律，放松心情', recovery: 65, tags: ['艺术', '放松'] },
  { id: 'reading', name: '闲读', icon: '📖', color: '#8ab0c4', description: '轻松阅读，不做笔记', recovery: 60, tags: ['学习', '休闲'] },
  { id: 'tea', name: '品茶', icon: '🍵', color: '#c4a07a', description: '一杯热茶，慢慢品味', recovery: 55, tags: ['仪式', '慢生活'] },
  { id: 'stretch', name: '拉伸', icon: '🤸', color: '#7ac4a8', description: '舒展身体，缓解久坐疲劳', recovery: 80, tags: ['运动', '身体'] },
  { id: 'dayoff', name: '休假', icon: '🏖', color: '#8ac4b8', description: '完整的一天彻底放松', recovery: 95, tags: ['长假', '身心'] },
]

const mockRecords: BreakRecord[] = [
  { id: 'r1', activity: 'meditation', duration: 15, mood: 4, note: '很放松', date: '2026-07-27' },
  { id: 'r2', activity: 'walk', duration: 30, mood: 5, note: '公园散步', date: '2026-07-26' },
]

// ---- Storage Mock ----
const mockKV = new Map<string, any>()
mockKV.set('rest:practices', DEFAULT_PRACTICES.map(p => ({ ...p })))
mockKV.set('rest:break_records', mockRecords.map(r => ({ ...r })))

const mockGetKV = vi.fn((key: string, fallback?: any) => mockKV.get(key) ?? fallback)
const mockSetKV = vi.fn((key: string, val: any) => { mockKV.set(key, val) })

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (key: string, fallback?: any) => mockGetKV(key, fallback),
    setKV: (key: string, val: any) => mockSetKV(key, val),
    getConfig: () => ({
      display: {
        trendNoteCount: 20,
        titleTruncateLength: 8,
        excerptTruncateLength: 80,
        tagDisplayCount: 2,
        statsWindowDays: 30,
        searchResultLimit: 10,
        dreamStorageLimit: 100,
        cleanupThresholdDays: 30,
        moveTrajectoryCount: 20,
        healthRecentSleepCount: 14,
        healthRecentExerciseCount: 30,
        healthRecentMealCount: 5,
        noteMaxLength: 100,
        uploadImageMaxBytes: 5242880,
        uploadVideoMaxBytes: 104857600,
      },
      health: {
        exerciseTarget: 150,
        sleepTarget: 7,
        sleepMinThreshold: 6,
        sleepCriticalThreshold: 5,
        sleepExcellentThreshold: 7.5,
      },
      worklog: {
        overtimeRate: 1.5,
        nightRate: 1.3,
        defaultStart: '09:00',
        defaultEnd: '18:00',
        trendDays: 30,
        trendMonths: 6,
        recentShiftLimit: 15,
      },
    }),
    setConfig: vi.fn(),
  },
}))

// ---- Config Store Mock ----
const mockConfigStore = {
  config: {
    theme: 'dark',
    activeStylePack: 'default',
    timer: {
      defaultDuration: 25,
      breakDuration: 5,
      longBreakDuration: 15,
      sessionsBeforeLongBreak: 4,
      autoStart: false,
    },
    interaction: {
      keyboardShortcuts: true,
      hapticFeedback: false,
      soundEnabled: true,
    },
    locale: 'zh-CN',
    advisorEnabled: true,
    advisorResetDate: null,
    lastVisitDate: null,
    background: {
      type: 'default' as const,
      presetScene: 'none' as const,
      dataUrl: null,
      mimeType: null,
      fileName: null,
      updatedAt: null,
    },
    gestures: {
      bindings: {} as any,
      sampleInterval: 100,
      longPressThreshold: 500,
      minMoveDistance: 10,
    },
    stats: {
      showPanel: true,
      showTrendChart: true,
      dailyGoal: 120,
      weeklyGoal: 600,
    },
    transitionDuration: 300,
    astrolabe: {} as any,
    lifecycle: {} as any,
    advisor: {} as any,
    health: {
      exerciseTarget: 150,
      sleepTarget: 7,
      sleepMinThreshold: 6,
      sleepCriticalThreshold: 5,
      sleepExcellentThreshold: 7.5,
    },
    worklog: {
      overtimeRate: 1.5,
      nightRate: 1.3,
      defaultStart: '09:00',
      defaultEnd: '18:00',
      trendDays: 30,
      trendMonths: 6,
      recentShiftLimit: 15,
    },
    display: {
      statsWindowDays: 30,
      trendNoteCount: 20,
      titleTruncateLength: 8,
      excerptTruncateLength: 80,
      tagDisplayCount: 2,
      searchResultLimit: 10,
      dreamStorageLimit: 100,
      cleanupThresholdDays: 30,
      moveTrajectoryCount: 20,
      healthRecentSleepCount: 14,
      healthRecentExerciseCount: 30,
      healthRecentMealCount: 5,
      noteMaxLength: 100,
      uploadImageMaxBytes: 5242880,
      uploadVideoMaxBytes: 104857600,
    },
    visualization: {
      activeMetaphor: 'water',
      builtinPaletteId: 'default',
      customPalette: null,
    },
    sanctuaryExitDuration: 5000,
    automationHistoryLimit: 100,
    craft: {
      recentLimit: 10,
      tagDisplayCount: 5,
      messageTimeout: 3000,
    },
    ai: {} as any,
    complianceOverride: {} as any,
  },
}

vi.mock('../../stores/config', () => ({
  useConfigStore: () => mockConfigStore,
}))

// storeToRefs 在真实 Pinia 中会把 store 的 state 包成 ref；
// 但本测试用普通对象 mock useConfigStore，storeToRefs(plain) 会返回空对象，
// 导致 configBridge.config 为 undefined。此处补一个最小实现，使其行为贴合真实 Pinia。
vi.mock('pinia', async () => {
  const { ref } = await import('vue')
  return {
    storeToRefs: (store: any) => {
      const out: Record<string, any> = {}
      for (const key of Object.keys(store)) out[key] = ref(store[key])
      return out
    },
  }
})

// ---- 辅助：挂载组件 ----
async function getWrapper() {
  const { default: Rest } = await import('../Rest.vue')
  return mount(Rest, {
    global: {
      stubs: {
        'router-link': {
          template: '<a class="router-link-stub"><slot /></a>',
        },
      },
    },
  })
}

// ============================================================
describe('Rest 息壤视图', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockKV.set('rest:practices', DEFAULT_PRACTICES.map(p => ({ ...p })))
    mockKV.set('rest:break_records', mockRecords.map(r => ({ ...r })))
  })

  afterEach(() => {
    // 清理 Teleport 残留的弹窗 DOM
    document.body.querySelector('.rest-modal-overlay')?.remove()
  })

  // ==================== 1. 渲染头部 ====================

  it('渲染头部标题和子标题', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('息壤')
    expect(wrapper.text()).toContain('工作间歇与休假')
    expect(wrapper.text()).toContain('在奔忙的日常中，留一片滋养身心的休憩之地。')
  })

  // ==================== 2. 概览统计 ====================

  it('渲染概览统计（休息日、平均恢复度、小憩次数）', async () => {
    const wrapper = await getWrapper()
    // 标签文字
    expect(wrapper.text()).toContain('休息日')
    expect(wrapper.text()).toContain('平均恢复度')
    expect(wrapper.text()).toContain('小憩次数')
    // 8 项恢复力值: 85+70+75+65+60+55+80+95 = 585, 平均 = 73.125, 四舍五入 = 73
    expect(wrapper.text()).toContain('73%')
    // 2 条 mock 记录
    expect(wrapper.text()).toContain('2')
  })

  // ==================== 3. 休憩方式卡片 ====================

  it('渲染8种休憩方式卡片', async () => {
    const wrapper = await getWrapper()
    const cards = wrapper.findAll('.rest-practice-card')
    expect(cards.length).toBe(8)
    // 验证每种方式名称
    const names = ['冥想', '小憩', '散步', '听音乐', '闲读', '品茶', '拉伸', '休假']
    names.forEach(n => {
      expect(wrapper.text()).toContain(n)
    })
  })

  // ==================== 4. 搜索过滤 ====================

  it('搜索过滤功能（按活动名称或记录内容）', async () => {
    const wrapper = await getWrapper()
    const input = wrapper.find('.rest-search-input')
    await input.setValue('冥想')

    // 仅显示匹配的冥想卡片（检查 practices 区域）
    const practicesGrid = wrapper.find('.rest-practices-grid')
    expect(practicesGrid.text()).toContain('冥想')
    // 其他方式卡片不应出现在 practices 区域
    expect(practicesGrid.text()).not.toContain('散步')
    expect(practicesGrid.text()).not.toContain('听音乐')
    expect(practicesGrid.text()).not.toContain('闲读')
    expect(practicesGrid.text()).not.toContain('品茶')
    expect(practicesGrid.text()).not.toContain('拉伸')
    expect(practicesGrid.text()).not.toContain('休假')
  })

  // ==================== 5. 搜索清除 ====================

  it('搜索清除按钮', async () => {
    const wrapper = await getWrapper()
    const input = wrapper.find('.rest-search-input')

    // 输入搜索词
    await input.setValue('品茶')
    expect(wrapper.find('.rest-search-clear').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('散步')

    // 点击清除按钮
    await wrapper.find('.rest-search-clear').trigger('click')
    // 清除后所有卡片应恢复
    expect(wrapper.text()).toContain('品茶')
    expect(wrapper.text()).toContain('散步')
    expect(wrapper.text()).toContain('冥想')
    expect(wrapper.text()).toContain('听音乐')
  })

  // ==================== 6. 休憩记录列表 ====================

  it('渲染休憩记录列表（默认有记录）', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('近期休憩')

    // 根据 mockRecords，应显示冥想（15 分钟）和散步（30 分钟）
    expect(wrapper.text()).toContain('冥想')
    expect(wrapper.text()).toContain('散步')
    expect(wrapper.text()).toContain('15 分钟')
    expect(wrapper.text()).toContain('30 分钟')
    // 心情显示
    expect(wrapper.text()).toContain('不错')
    expect(wrapper.text()).toContain('很好')
  })

  // ==================== 7. 打开记录表单 ====================

  it('打开休憩记录表单', async () => {
    const wrapper = await getWrapper()
    // 初始状态表单应隐藏
    expect(wrapper.find('.rest-form').exists()).toBe(false)

    // 点击切换按钮
    await wrapper.find('.rest-form-toggle').trigger('click')
    expect(wrapper.find('.rest-form').exists()).toBe(true)
    // 按钮文字应变化
    expect(wrapper.find('.rest-form-toggle').text()).toContain('收起记录')

    // 再次点击收起
    await wrapper.find('.rest-form-toggle').trigger('click')
    expect(wrapper.find('.rest-form').exists()).toBe(false)
  })

  // ==================== 8. 添加休憩记录 ====================

  it('添加休憩记录', async () => {
    const wrapper = await getWrapper()
    // 打开表单
    await wrapper.find('.rest-form-toggle').trigger('click')

    // 选择活动类型
    const select = wrapper.find('.rff-select')
    await select.setValue('meditation')

    // 设置时长
    const durationInput = wrapper.find('input[type="number"]')
    await durationInput.setValue(20)

    // 点击保存
    await wrapper.find('.rfa-btn--primary').trigger('click')

    // 验证 setKV 被调用（持久化数据）
    expect(mockSetKV).toHaveBeenCalledWith('rest:break_records', expect.any(Array))
    const savedRecords = mockSetKV.mock.calls[0][1] as BreakRecord[]
    expect(savedRecords.length).toBe(3) // 原有 2 条 + 新增 1 条
    expect(savedRecords[savedRecords.length - 1].activity).toBe('meditation')
    expect(savedRecords[savedRecords.length - 1].duration).toBe(20)

    // 表单应关闭
    expect(wrapper.find('.rest-form').exists()).toBe(false)
  })

  // ==================== 9. 打开编辑弹窗 ====================

  it('打开休憩方式编辑弹窗', async () => {
    const wrapper = await getWrapper()

    // 点击第一张卡片（冥想）
    await wrapper.findAll('.rest-practice-card')[0].trigger('click')

    // 弹窗通过 Teleport 渲染到 body
    const modalOverlay = document.body.querySelector('.rest-modal-overlay')
    expect(modalOverlay).not.toBeNull()
    expect(modalOverlay!.textContent).toContain('编辑休憩方式')
    // 名称输入框应包含"冥想"（input value 不反映在 textContent 中，检查 HTML）
    const nameInput = modalOverlay!.querySelector('.rmf-input') as HTMLInputElement
    expect(nameInput.value).toBe('冥想')

    // 点击取消关闭弹窗
    const cancelBtn = modalOverlay!.querySelector('.rma-btn--cancel') as HTMLButtonElement
    cancelBtn.click()
    // 等待 Vue 更新
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(document.body.querySelector('.rest-modal-overlay')).toBeNull()
  })

  // ==================== 10. 编辑休憩方式 ====================

  it('编辑休憩方式', async () => {
    const wrapper = await getWrapper()

    // 点击第一张卡片（冥想）打开弹窗
    await wrapper.findAll('.rest-practice-card')[0].trigger('click')

    const modalOverlay = document.body.querySelector('.rest-modal-overlay')
    expect(modalOverlay).not.toBeNull()

    // 修改名称
    const inputs = modalOverlay!.querySelectorAll('.rmf-input')
    const nameInput = inputs[0] as HTMLInputElement
    nameInput.value = '深度冥想'
    nameInput.dispatchEvent(new Event('input'))

    // 修改恢复力
    const recoveryInput = inputs[1] as HTMLInputElement
    recoveryInput.value = '90'
    recoveryInput.dispatchEvent(new Event('input'))

    // 点击保存
    const saveBtn = modalOverlay!.querySelector('.rma-btn--primary') as HTMLButtonElement
    saveBtn.click()

    // 等待 Vue 更新
    await new Promise(resolve => setTimeout(resolve, 0))

    // 弹窗应关闭
    expect(document.body.querySelector('.rest-modal-overlay')).toBeNull()

    // 验证 setKV 被调用（持久化编辑后的实践数据）
    expect(mockSetKV).toHaveBeenCalledWith('rest:practices', expect.any(Array))
    const savedPractices = mockSetKV.mock.calls.find(
      call => call[0] === 'rest:practices'
    )?.[1] as RestPractice[]
    const edited = savedPractices.find(p => p.id === 'meditation')
    expect(edited).toBeDefined()
    expect(edited!.name).toBe('深度冥想')
    expect(edited!.recovery).toBe(90)

    // 界面上应显示更新后的名称
    expect(wrapper.text()).toContain('深度冥想')
  })

  // ==================== 11. 恢复力建议 ====================

  it('恢复力建议卡片显示', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('休憩建议')

    // 验证 6 张建议卡片
    const tipCards = wrapper.findAll('.rest-tip-card')
    expect(tipCards.length).toBe(6)

    // 验证关键建议内容
    expect(wrapper.text()).toContain('番茄工作法')
    expect(wrapper.text()).toContain('自然接触')
    expect(wrapper.text()).toContain('补水提醒')
    expect(wrapper.text()).toContain('呼吸调节')
    expect(wrapper.text()).toContain('数字排毒')
    expect(wrapper.text()).toContain('睡眠规律')
  })

  // ==================== 12. 底部导航链接 ====================

  it('底部导航链接存在', async () => {
    const wrapper = await getWrapper()
    const navLinks = wrapper.findAll('.rest-nav-link')
    expect(navLinks.length).toBe(4)

    // 验证导航文本
    expect(wrapper.text()).toContain('返回更漏')
    expect(wrapper.text()).toContain('回到家的')
    expect(wrapper.text()).toContain('匠庐')
    expect(wrapper.text()).toContain('行囊')
  })

  // ==================== 13. 面包屑导航 ====================

  it('面包屑导航存在', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('家')
    expect(wrapper.text()).toContain('更漏')
    expect(wrapper.text()).toContain('息壤')
  })

  // ==================== 14. 底部铭文 ====================

  it('底部铭文"息者 · 养也"', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('息者')
    expect(wrapper.text()).toContain('养也')
  })
})

// ============================================================
// 植被映射
// ============================================================
describe('植被映射', () => {
  it('每个休憩方式卡片显示植被标识', async () => {
    const wrapper = await getWrapper()
    const cards = wrapper.findAll('.rest-practice-card')
    for (const card of cards) {
      const veg = card.find('.rpc-vegetation')
      expect(veg.exists()).toBe(true)
      expect(veg.find('.rpc-veg-icon').exists()).toBe(true)
      expect(veg.find('.rpc-veg-name').exists()).toBe(true)
    }
  })

  it('冥想对应莲花', async () => {
    const wrapper = await getWrapper()
    // 冥想在第一张卡片，植被标识应包含"莲花"
    const firstCard = wrapper.findAll('.rest-practice-card')[0]
    const vegName = firstCard.find('.rpc-veg-name')
    expect(vegName.text()).toBe('莲花')
  })
})

// ============================================================
// 四季变化
// ============================================================
describe('四季变化', () => {
  it('显示季节标识', async () => {
    const wrapper = await getWrapper()
    const badge = wrapper.find('.rest-season-badge')
    expect(badge.exists()).toBe(true)
    // 展示当前季节
    const month = new Date().getMonth() + 1
    if (month >= 3 && month <= 5) expect(badge.text()).toBe('春季')
    else if (month >= 6 && month <= 8) expect(badge.text()).toBe('夏季')
    else if (month >= 9 && month <= 11) expect(badge.text()).toBe('秋季')
    else expect(badge.text()).toBe('冬季')
  })
})

// ============================================================
// 漫步功能
// ============================================================
describe('漫步功能', () => {
  it('渲染漫步按钮', async () => {
    const wrapper = await getWrapper()
    const btn = wrapper.find('.rest-stroll-btn')
    expect(btn.exists()).toBe(true)
    expect(btn.text()).toContain('漫步')
  })

  it('点击漫步按钮后显示随机活动', async () => {
    const wrapper = await getWrapper()
    const btn = wrapper.find('.rest-stroll-btn')
    await btn.trigger('click')
    // 按钮文字变为"漫步中..."
    expect(wrapper.find('.rest-stroll-btn').text()).toContain('漫步中')
    // 显示随机结果
    const result = wrapper.find('.rest-stroll-result')
    expect(result.exists()).toBe(true)
    expect(result.find('.rest-stroll-result-icon').exists()).toBe(true)
    expect(result.find('.rest-stroll-result-name').exists()).toBe(true)
  })
})