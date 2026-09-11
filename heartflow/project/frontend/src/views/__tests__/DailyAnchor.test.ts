// ============================================================
// DailyAnchor 逐日心锚视图测试
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, computed } from 'vue'
import type { Anchor } from '../../modules/anchor/types'
import { emitRoomSignal, clearRoomSignals } from '../../modules/room-resonance'

// ---- 模拟锚点数据 ----
const mockAnchorData = ref<Anchor[]>([])

const mockAnchor = {
  anchors: mockAnchorData,
  load: vi.fn(),
  driftPending: vi.fn(),
  poolAnchors: computed(() => mockAnchorData.value.filter(a => a.stage === 'pool')),
  getAnchorsByScale: vi.fn((_scale: string) =>
    mockAnchorData.value.filter(a => a.stage === 'active' || !a.stage)
  ),
  addToPool: vi.fn((text: string) => {
    const a: Anchor = {
      id: `pool_${Date.now()}`,
      text,
      done: false,
      targetDate: '',
      createdAt: new Date().toISOString(),
      priority: 'can',
      stage: 'pool',
      driftCount: 0,
    }
    mockAnchorData.value.unshift(a)
    return a
  }),
  placeFromPool: vi.fn((id: string, priority?: Anchor['priority']) => {
    const a = mockAnchorData.value.find(x => x.id === id)
    if (a) {
      a.stage = 'active'
      a.targetDate = '2026-07-20'
      a.priority = priority ?? a.priority
    }
  }),
  placeAllFromPool: vi.fn((priority?: Anchor['priority']) => {
    for (const a of mockAnchorData.value) {
      if (a.stage === 'pool') {
        a.stage = 'active'
        a.targetDate = '2026-07-20'
        a.priority = priority ?? a.priority
      }
    }
  }),
  remove: vi.fn((id: string) => {
    mockAnchorData.value = mockAnchorData.value.filter(a => a.id !== id)
  }),
  markDone: vi.fn((id: string) => {
    const a = mockAnchorData.value.find(x => x.id === id)
    if (a) {
      a.done = true
      a.doneAt = new Date().toISOString()
    }
  }),
  markUndone: vi.fn((id: string) => {
    const a = mockAnchorData.value.find(x => x.id === id)
    if (a) {
      a.done = false
      a.doneAt = undefined
    }
  }),
  postponeToTomorrow: vi.fn(),
  returnToPool: vi.fn(),
  // ---- 补齐 useAnchor 后续新增 API（与真实 composable 同步，避免 mock 腐烂导致整文件崩溃）----
  todayAnchors: computed(() => mockAnchorData.value.filter(a => (a.stage ?? 'active') === 'active')),
  pending: computed(() => mockAnchorData.value.filter(a => (a.stage ?? 'active') === 'active' && !a.done)),
  done: computed(() => mockAnchorData.value.filter(a => (a.stage ?? 'active') === 'active' && a.done)),
  allAnchors: computed(() => [...mockAnchorData.value]),
  anchorThreads: computed(() => []),
  scaleDistribution: computed(() => ({})),
  getTagTrend: vi.fn(() => []),
  addRaw: vi.fn(),
  addTag: vi.fn(),
  removeTag: vi.fn(),
  setPriority: vi.fn(),
  update: vi.fn(),
}

const mockReviewData = ref<any>(null)
const mockSelection = ref<{ mode: string; selectedIds: Set<string> }>({ mode: 'none', selectedIds: new Set() })

vi.mock('../../modules/anchor', () => ({
  useAnchor: () => mockAnchor,
  useAnchorReview: () => ({
    generateReview: vi.fn(() => ({
      id: 'review_001',
      period: 'daily',
      range: { start: '2026-07-20', end: '2026-07-20' },
      totalAnchors: 0,
      completedCount: 0,
      completionRate: 0,
      mustCompletionRate: 0,
      canCompletionRate: 0,
      floatCompletionRate: 0,
      avgCompletionTime: 0,
      fastestCompletion: 0,
      slowestCompletion: 0,
      totalDrifts: 0,
      avgDailyAnchors: 0,
      mostProductiveDay: { date: '', count: 0 },
      topTags: [],
      topCategories: [],
      priorityDistribution: { must: 0, can: 0, float: 0 },
      dailyTrend: [],
      reflectionNotes: [],
      suggestions: [],
      generatedAt: new Date().toISOString(),
    })),
    getStreakStats: vi.fn(() => ({ currentStreak: 0, longestStreak: 0 })),
    reviewData: mockReviewData,
  }),
  useAnchorBatch: () => ({
    selection: mockSelection,
    clearSelection: vi.fn(),
    toggleSelection: vi.fn(),
    selectAll: vi.fn(),
    invertSelection: vi.fn(),
    selectByFilter: vi.fn(),
    isSelected: vi.fn(() => false),
    getSelectedCount: vi.fn(() => 0),
  }),
  REVIEW_PERIOD_META: {
    daily: { key: 'daily', label: '日回顾', days: 1, icon: '📅' },
    weekly: { key: 'weekly', label: '周回顾', days: 7, icon: '📊' },
    monthly: { key: 'monthly', label: '月回顾', days: 30, icon: '🌙' },
    quarterly: { key: 'quarterly', label: '季回顾', days: 90, icon: '🗓️' },
    yearly: { key: 'yearly', label: '年回顾', days: 365, icon: '🎯' },
  },
  BATCH_OPERATION_LABELS: {
    complete: '批量完成', postpone: '批量推迟', setPriority: '批量设置优先级',
    addTag: '批量添加标签', removeTag: '批量移除标签', setCategory: '批量设置分类',
    moveToPool: '批量放回锚点池', placeFromPool: '批量安放', delete: '批量删除', duplicate: '批量复制',
  },
  BATCH_OPERATION_ICONS: {
    complete: '✅', postpone: '⏭️', setPriority: '⭐',
    addTag: '🏷️', removeTag: '🏷️', setCategory: '📁',
    moveToPool: '🔙', placeFromPool: '📤', delete: '🗑️', duplicate: '📋',
  },
}))

vi.mock('../../modules/anchor/types', () => ({
  PRIORITY_COLORS: { must: '#f0c040', can: '#80b8d0', float: 'rgba(255,255,255,0.3)' },
  PRIORITY_LABELS: { must: '必锚', can: '可锚', float: '浮锚' },
}))

const mockKVStore: Record<string, any> = {}
vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: vi.fn((key: string, defaultValue: any) => {
      return key in mockKVStore ? mockKVStore[key] : defaultValue
    }),
    setKV: vi.fn((key: string, value: any) => {
      mockKVStore[key] = value
    }),
  },
}))

// ---- 辅助函数 ----
async function createWrapper() {
  const { default: DailyAnchor } = await import('../DailyAnchor.vue')
  return mount(DailyAnchor, { attachTo: document.body })
}

// ---- 测试 ----
describe('DailyAnchor 逐日心锚视图', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAnchorData.value = []
    Object.keys(mockKVStore).forEach(k => delete mockKVStore[k])
  })

  // ------- 渲染标题 -------
  it('渲染页面标题和副标题', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.text()).toContain('逐日心锚')
    expect(wrapper.text()).toContain('今日安放台')
    expect(wrapper.text()).toContain('先把脑子里的悬念放在这里')
  })

  // ------- 今日统计卡片 -------
  it('渲染今日统计概览卡片', async () => {
    mockAnchorData.value = [
      { id: 'a1', text: '任务A', done: false, targetDate: '2026-07-20', createdAt: '', priority: 'must', stage: 'active', driftCount: 0 },
      { id: 'a2', text: '任务B', done: true, targetDate: '2026-07-20', createdAt: '', priority: 'can', stage: 'active', driftCount: 0, doneAt: '2026-07-20T10:00:00Z' },
    ]
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()
    const cards = wrapper.findAll('.overview-card')
    expect(cards.length).toBeGreaterThanOrEqual(3)
    expect(wrapper.text()).toContain('池中念头')
    expect(wrapper.text()).toContain('今天待锚')
    expect(wrapper.text()).toContain('今天已锚定')
  })

  // ------- 锚点池 -------
  it('锚点池为空时显示提示文字', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.text()).toContain('把此刻浮着的念头轻轻放进这里')
  })

  it('锚点池有项目时渲染池中项目', async () => {
    mockAnchorData.value = [
      { id: 'p1', text: '池中念头A', done: false, targetDate: '', createdAt: '2026-07-20T08:00:00Z', priority: 'can', stage: 'pool', driftCount: 0 },
      { id: 'p2', text: '池中念头B', done: false, targetDate: '', createdAt: '2026-07-20T08:01:00Z', priority: 'must', stage: 'pool', driftCount: 0 },
    ]
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('池中念头A')
    expect(wrapper.text()).toContain('池中念头B')
    // 批量操作按钮
    const poolBtns = wrapper.findAll('.pool-btn')
    expect(poolBtns.length).toBeGreaterThanOrEqual(3)
  })

  // ------- 快速输入 -------
  it('快速输入框可输入内容并调用 addToPool', async () => {
    const wrapper = await createWrapper()
    const input = wrapper.find('.anchor-input')
    await input.setValue('快速输入测试')
    const addBtn = wrapper.find('.btn-add')
    await addBtn.trigger('click')
    expect(mockAnchor.addToPool).toHaveBeenCalledWith('快速输入测试')
  })

  it('快速预设按钮点击后填充输入框', async () => {
    const wrapper = await createWrapper()
    const pills = wrapper.findAll('.quick-pill')
    expect(pills.length).toBeGreaterThanOrEqual(1)
    await pills[0].trigger('click')
    const input = wrapper.find('.anchor-input') as any
    expect((input.element as HTMLInputElement).value).toBeTruthy()
  })

  // ------- 六级尺度切换 -------
  it('渲染尺度切换按钮（日/周/月/年+回顾+批量）', async () => {
    const wrapper = await createWrapper()
    const tabs = wrapper.findAll('.scale-tab')
    expect(tabs.length).toBe(6)
    expect(tabs[0].text()).toContain('日')
    expect(tabs[1].text()).toContain('周')
    expect(tabs[2].text()).toContain('月')
    expect(tabs[3].text()).toContain('年')
    expect(tabs[4].text()).toContain('回顾')
    expect(tabs[5].text()).toContain('批量')
  })

  it('点击尺度切换按钮切换激活状态', async () => {
    const wrapper = await createWrapper()
    const tabs = wrapper.findAll('.scale-tab')
    // 默认日激活
    expect(tabs[0].classes()).toContain('active')
    // 点击周
    await tabs[1].trigger('click')
    expect(tabs[1].classes()).toContain('active')
    expect(tabs[0].classes()).not.toContain('active')
    // 点击月
    await tabs[2].trigger('click')
    expect(tabs[2].classes()).toContain('active')
    expect(tabs[1].classes()).not.toContain('active')
    // 点击年
    await tabs[3].trigger('click')
    expect(tabs[3].classes()).toContain('active')
    expect(tabs[2].classes()).not.toContain('active')
  })

  // ------- 待完成列表 -------
  it('有待完成锚点时渲染待完成列表', async () => {
    mockAnchorData.value = [
      { id: 'a1', text: '待完成任务', done: false, targetDate: '2026-07-20', createdAt: '2026-07-20T08:00:00Z', priority: 'must', stage: 'active', driftCount: 0 },
    ]
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('待完成任务')
    expect(wrapper.text()).toContain('停留中的锚点')
    // 操作按钮
    expect(wrapper.text()).toContain('完成')
    expect(wrapper.text()).toContain('推迟')
    expect(wrapper.text()).toContain('放回池子')
  })

  it('点击完成按钮调用 markDone', async () => {
    mockAnchorData.value = [
      { id: 'a1', text: '可完成的任务', done: false, targetDate: '2026-07-20', createdAt: '2026-07-20T08:00:00Z', priority: 'can', stage: 'active', driftCount: 0 },
    ]
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()
    const doneBtn = wrapper.find('.anchor-action--done')
    await doneBtn.trigger('click')
    expect(mockAnchor.markDone).toHaveBeenCalledWith('a1')
  })

  // ------- 已完成列表 -------
  it('有已完成锚点时渲染已完成列表', async () => {
    mockAnchorData.value = [
      { id: 'a1', text: '已完成任务', done: true, targetDate: '2026-07-20', createdAt: '2026-07-20T08:00:00Z', priority: 'can', stage: 'active', driftCount: 0, doneAt: '2026-07-20T10:30:00Z' },
    ]
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('已完成任务')
    expect(wrapper.text()).toContain('已安放')
    expect(wrapper.text()).toContain('恢复')
  })

  it('已完成列表点击恢复按钮调用 markUndone', async () => {
    mockAnchorData.value = [
      { id: 'a1', text: '恢复测试', done: true, targetDate: '2026-07-20', createdAt: '2026-07-20T08:00:00Z', priority: 'can', stage: 'active', driftCount: 0, doneAt: '2026-07-20T10:30:00Z' },
    ]
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()
    // 查找恢复按钮（在已完成的卡片中）
    // 恢复是第一个按钮，完成是第二个，但因为有 done-card 过滤，找到所有 secondary 按钮
    // 恢复按钮文本是"恢复"
    const restoreBtn = wrapper.findAll('.anchor-action--secondary').find(el => el.text().includes('恢复'))
    expect(restoreBtn).toBeTruthy()
    await restoreBtn!.trigger('click')
    expect(mockAnchor.markUndone).toHaveBeenCalledWith('a1')
  })

  // ------- 空状态 -------
  it('没有任何锚点时显示空状态提示', async () => {
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('今天还没有锚点')
    expect(wrapper.text()).toContain('可以先在这里放下一件事')
  })

  // ------- 池中放入锚点后空状态消失 -------
  it('池中有锚点时池子空提示消失', async () => {
    mockAnchorData.value = [
      { id: 'p1', text: '一个念头', done: false, targetDate: '', createdAt: '', priority: 'can', stage: 'pool', driftCount: 0 },
    ]
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).not.toContain('把此刻浮着的念头轻轻放进这里')
  })

  // ------- 锚点池批量操作 -------
  it('点击"都放到必锚"调用 placeAllFromPool', async () => {
    mockAnchorData.value = [
      { id: 'p1', text: '念头A', done: false, targetDate: '', createdAt: '', priority: 'can', stage: 'pool', driftCount: 0 },
    ]
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()
    const mustBtn = wrapper.findAll('.pool-btn').find(el => el.text().includes('必锚'))
    expect(mustBtn).toBeTruthy()
    await mustBtn!.trigger('click')
    expect(mockAnchor.placeAllFromPool).toHaveBeenCalledWith('must')
  })

  // ------- 年尺度视图 -------
  it('切换到年尺度时显示年度统计区块', async () => {
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()
    // 切换到年尺度
    const tabs = wrapper.findAll('.scale-tab')
    await tabs[3].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('年度统计')
    expect(wrapper.text()).toContain('总锚点数')
    expect(wrapper.text()).toContain('已完成')
    expect(wrapper.text()).toContain('完成率')
  })

  it('年尺度显示今年锚点统计', async () => {
    mockAnchorData.value = [
      { id: 'a1', text: '今年任务A', done: false, targetDate: '2026-07-20', createdAt: '2026-07-20T08:00:00Z', priority: 'must', stage: 'active', driftCount: 0 },
      { id: 'a2', text: '今年任务B', done: true, targetDate: '2026-06-15', createdAt: '2026-06-15T08:00:00Z', priority: 'can', stage: 'active', driftCount: 0, doneAt: '2026-06-15T10:00:00Z' },
    ]
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()
    // 切换到年尺度
    const tabs = wrapper.findAll('.scale-tab')
    await tabs[3].trigger('click')
    await wrapper.vm.$nextTick()
    // 应该显示今年锚点
    expect(wrapper.text()).toContain('今年任务A')
    expect(wrapper.text()).toContain('今年任务B')
    // 年度统计卡片
    const statCards = wrapper.findAll('.year-stat-card')
    expect(statCards.length).toBe(3)
    expect(statCards[0].text()).toContain('2')
    expect(statCards[1].text()).toContain('1')
    expect(statCards[2].text()).toContain('50%')
  })

  // ------- 手札日记 -------
  it('锚点卡片上有手札按钮', async () => {
    mockAnchorData.value = [
      { id: 'a1', text: '测试任务', done: false, targetDate: '2026-07-20', createdAt: '2026-07-20T08:00:00Z', priority: 'must', stage: 'active', driftCount: 0 },
    ]
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()
    // 查找手札按钮
    const journalBtn = wrapper.findAll('.anchor-action--journal')
    expect(journalBtn.length).toBeGreaterThanOrEqual(1)
    expect(journalBtn[0].text()).toContain('手札')
  })

  it('点击手札按钮展开手札编辑器', async () => {
    mockAnchorData.value = [
      { id: 'a1', text: '可写手札的任务', done: false, targetDate: '2026-07-20', createdAt: '2026-07-20T08:00:00Z', priority: 'can', stage: 'active', driftCount: 0 },
    ]
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()
    // 点击手札按钮
    const journalBtn = wrapper.find('.anchor-action--journal')
    await journalBtn.trigger('click')
    await wrapper.vm.$nextTick()
    // 手札编辑器应该出现
    expect(wrapper.find('.journal-section').exists()).toBe(true)
    expect(wrapper.text()).toContain('可写手札的任务')
    expect(wrapper.find('.journal-textarea').exists()).toBe(true)
    expect(wrapper.text()).toContain('保存手札')
  })

  it('在手札编辑器中输入内容并保存', async () => {
    mockAnchorData.value = [
      { id: 'a1', text: '保存测试', done: false, targetDate: '2026-07-20', createdAt: '2026-07-20T08:00:00Z', priority: 'can', stage: 'active', driftCount: 0 },
    ]
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()
    // 点击手札按钮
    const journalBtn = wrapper.find('.anchor-action--journal')
    await journalBtn.trigger('click')
    await wrapper.vm.$nextTick()
    // 输入内容
    const textarea = wrapper.find('.journal-textarea')
    await textarea.setValue('这是一条手札笔记')
    // 点击保存
    const saveBtn = wrapper.find('.journal-save-btn')
    await saveBtn.trigger('click')
    await wrapper.vm.$nextTick()
    // 保存提示出现
    expect(wrapper.text()).toContain('已保存')
    // 验证 storage.setKV 被调用
    const { storage } = await import('../../engine/storage')
    expect(storage.setKV).toHaveBeenCalledWith('anchor_journals', expect.any(Array))
  })

  // ------- 完成庆祝接入（P18-4） -------
  it('点击完成按钮调用 onMarkDone，仍触发底层 markDone', async () => {
    mockAnchorData.value = [
      { id: 'a1', text: '完成庆祝测试', done: false, targetDate: '2026-07-20', createdAt: '2026-07-20T08:00:00Z', priority: 'can', stage: 'active', driftCount: 0 },
    ]
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()
    const doneBtn = wrapper.find('.anchor-action--done')
    await doneBtn.trigger('click')
    expect(mockAnchor.markDone).toHaveBeenCalledWith('a1')
  })

  it('挂载庆祝渲染组件（AnchorCelebration 已接入）', async () => {
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()
    // 组件经 Teleport 渲染到 body，验证其包裹层存在即说明已接入
    expect(document.body.querySelector('.celeb-layer')).toBeTruthy()
  })

  // ------- 关联心锚聚类可视化（P18-4） -------
  it('点击锚点主区展开关联心锚面板', async () => {
    mockAnchorData.value = [
      { id: 'a1', text: '关联主锚', done: false, targetDate: '2026-07-20', createdAt: '2026-07-20T08:00:00Z', priority: 'can', stage: 'active', driftCount: 0, tags: ['健康'] },
      { id: 'a2', text: '关联副锚', done: false, targetDate: '2026-07-20', createdAt: '2026-07-20T08:01:00Z', priority: 'can', stage: 'active', driftCount: 0, tags: ['健康'] },
    ]
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()
    // 面板默认不显示
    expect(wrapper.find('.related-section').exists()).toBe(false)
    // 点击主区
    const main = wrapper.find('.anchor-main')
    await main.trigger('click')
    await wrapper.vm.$nextTick()
    // 面板出现且含关联项
    expect(wrapper.find('.related-section').exists()).toBe(true)
    expect(wrapper.text()).toContain('关联副锚')
  })
})

// ============================================================
// ZeitgeistPanel 时令元数据 · 孤儿组件集成（INCR-256）
// 消费 useZeitgeist（hf:zeitgeist_pref / hf:zeitgeist_last），经 storage getKV/setKV 读写。
// ============================================================
describe('ZeitgeistPanel 时令元数据集成', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAnchorData.value = []
    Object.keys(mockKVStore).forEach(k => delete mockKVStore[k])
  })

  it('渲染时令元数据面板骨架', async () => {
    const wrapper = await createWrapper()
    const text = wrapper.text()
    expect(text).toContain('时令元数据')
    expect(text).toContain('当前时令')
    expect(text).toContain('十二时辰')
    expect(text).toContain('时令采集')
    expect(text).toContain('偏好')
  })

  it('十二时辰环渲染 12 个时辰按钮', async () => {
    const wrapper = await createWrapper()
    const ringItems = wrapper.findAll('.zgp-ring-item')
    expect(ringItems.length).toBe(12)
    expect(wrapper.text()).toContain('子')
    expect(wrapper.text()).toContain('亥')
  })

  it('尚未采集时显示空态提示', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.text()).toContain('尚未采集')
    expect(wrapper.text()).toContain('采集当前时令')
  })

  it('点击「采集当前时令」写入最近采集快照', async () => {
    const wrapper = await createWrapper()
    await wrapper.find('.zgp-collect').trigger('click')
    const { storage } = await import('../../engine/storage')
    expect(storage.setKV).toHaveBeenCalledWith(
      'hf:zeitgeist_last',
      expect.objectContaining({
        date: expect.any(String),
        weekday: expect.any(String),
        shichen: expect.any(String),
        season: expect.any(String),
        weather: null,
      }),
    )
  })

  it('选择天气预设后采集写入对应天气', async () => {
    const wrapper = await createWrapper()
    const rainBtn = wrapper.findAll('.zgp-weather-item').find(b => b.text().includes('雨'))
    expect(rainBtn).toBeTruthy()
    await rainBtn!.trigger('click')
    expect(rainBtn!.classes()).toContain('on')
    await wrapper.find('.zgp-collect').trigger('click')
    const { storage } = await import('../../engine/storage')
    expect(storage.setKV).toHaveBeenCalledWith(
      'hf:zeitgeist_last',
      expect.objectContaining({ weather: 'rain' }),
    )
  })

  it('切换自动采集偏好持久化到存储', async () => {
    const wrapper = await createWrapper()
    const checkbox = wrapper.find('.zgp-pref input')
    await checkbox.setValue(false)
    const { storage } = await import('../../engine/storage')
    expect(storage.setKV).toHaveBeenCalledWith(
      'hf:zeitgeist_pref',
      expect.objectContaining({ autoCollect: false }),
    )
  })
})

describe('跨房间共鸣联动（双向收口）', () => {
  beforeEach(() => {
    clearRoomSignals()
    mockAnchorData.value = []
    Object.keys(mockKVStore).forEach(k => delete mockKVStore[k])
  })

  it('其他房间发射信号时，渲染「其他房间的光痕」联动条并过滤本房回声', async () => {
    emitRoomSignal({ room: 'study', kind: 'note', label: '在读《心流》', detail: '思绪书房', ts: Date.now(), strength: 0.6 })
    emitRoomSignal({ room: 'guard-room', kind: 'security', label: '守护已开启', ts: Date.now(), strength: 0.4 })
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()
    const strip = wrapper.find('.cross-room-strip')
    expect(strip.exists()).toBe(true)
    expect(wrapper.text()).toContain('其他房间的光痕')
    expect(wrapper.text()).toContain('思绪书房')
    expect(wrapper.text()).toContain('在读《心流》')
    expect(wrapper.text()).toContain('守护室')
    expect(wrapper.text()).toContain('守护已开启')
    // 本房回声不出现在光痕条（只显示其他房间）
    expect(strip.text()).not.toContain('逐日心锚')
    clearRoomSignals()
  })

  it('无任何其他房间信号时，光痕条不渲染', async () => {
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.cross-room-strip').exists()).toBe(false)
    clearRoomSignals()
  })
})