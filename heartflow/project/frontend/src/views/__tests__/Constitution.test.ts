// ============================================================
// 心流 Constitution（宪法编辑视图）测试
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

// ============================================================
// 测试数据工厂
// ============================================================
function createMockRules(count: number) {
  const types = ['behavior', 'ritual', 'limit', 'value']
  const titles = [
    '每日冥想', '晨间日记', '晚间复盘', '番茄工作法', '数字排毒',
    '感恩练习', '阅读时光', '运动打卡', '健康饮食', '正念呼吸',
    '周计划制定', '月目标回顾', '季度总结', '年度规划', '社交连接',
    '创意时间', '学习新技能', '整理空间', '早睡早起', '减少屏幕时间',
    '每日步行', '喝水提醒', '站立办公', '眼保健操', '音乐欣赏',
    '艺术创作', '志愿服务', '家庭时光', '独处时间', '自然接触',
    '断舍离', '信息摄入控制', '睡眠追踪', '情绪记录', '人际反思',
    '财务规划', '技能分享', '感恩拜访',
  ]
  const descriptions = [
    '每天坚持冥想练习，提升专注力',
    '记录每日所思所感，整理思绪',
    '回顾一天的经历和收获，持续成长',
    '使用番茄工作法提高效率',
    '定期远离数字设备，回归内心',
    '表达对生活的感恩，培养积极心态',
    '每天安排阅读时间，拓展视野',
    '坚持运动锻炼，保持身心健康',
    '保持健康的饮食习惯，滋养身体',
    '练习正念呼吸法，平静内心',
    '每周制定详细计划，确保方向',
    '回顾月度目标完成情况，调整策略',
    '总结季度成果，规划下一步',
    '规划年度目标，把握大方向',
    '与朋友和家人保持联系，维系关系',
    '安排创意时间，激发灵感',
    '学习一项新技能，持续进步',
    '整理工作和生活空间，保持秩序',
    '保持规律的作息，充沛精力',
    '减少不必要的屏幕时间，保护视力',
    '每天步行锻炼，保持活力',
    '定时喝水提醒，保持水分',
    '尝试站立办公，改善体态',
    '做眼保健操，放松眼睛',
    '欣赏音乐放松心情，调节情绪',
    '进行艺术创作，表达自我',
    '参与志愿服务，回馈社会',
    '陪伴家人，珍惜时光',
    '享受独处时光，自我对话',
    '接触大自然，汲取能量',
    '定期断舍离，轻装上阵',
    '控制信息摄入量，避免过载',
    '追踪睡眠质量，优化作息',
    '记录情绪变化，了解自我',
    '反思人际关系，改善沟通',
    '规划个人财务，稳健理财',
    '分享技能和经验，共同成长',
    '向他人表达感谢，传递温暖',
  ]

  return Array.from({ length: count }, (_, i) => ({
    id: `rule-${i + 1}`,
    title: titles[i],
    description: descriptions[i] ?? `自动生成的规则描述 ${i + 1}`,
    type: types[i % 4],
    enabled: i % 3 !== 0,
    order: i + 1,
    articleNumber: i + 1,
    isDefault: i < 20,
    tracking:
      types[i % 4] === 'behavior' || types[i % 4] === 'ritual'
        ? { count: 3, target: 5, period: 'daily' as const, lastReset: null }
        : undefined,
  }))
}

// ============================================================
// Mock Stores
// ============================================================
const mockMutableRules = createMockRules(38)

const mockConstitution = {
  name: '心流宪法',
  version: '1.0.0',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-06-15T00:00:00.000Z',
  preamble:
    '这是心流世界的根基契约，一切运行皆以此为准。它定义了世界的价值观、行为准则和不可动摇的底线。',
  immutableRules: [
    {
      id: 'im-1',
      icon: '\u{1F3DB}\uFE0F',
      title: '心流至上',
      description: '每次使用必须进入心流状态，一切设计以心流体验为核心。',
    },
    {
      id: 'im-2',
      icon: '\u{1F512}',
      title: '隐私神圣',
      description: '用户数据完全本地存储，未经明确授权不得上传至任何服务器。',
    },
    {
      id: 'im-3',
      icon: '\u{1F3A8}',
      title: '极简美学',
      description: '界面保持简洁优雅，减少认知负担，让用户专注于当下。',
    },
    {
      id: 'im-4',
      icon: '\u{1F331}',
      title: '渐进成长',
      description: '功能引导由浅入深，尊重用户的学习节奏，不强制使用任何功能。',
    },
  ],
  mutableRules: mockMutableRules,
  get enabledMutableCount() {
    return this.mutableRules.filter((r: any) => r.enabled).length
  },
  get totalMutableCount() {
    return this.mutableRules.length
  },
  addRule: vi.fn(),
  updateRule: vi.fn(),
  removeRule: vi.fn(),
  reorderRules: vi.fn(),
  exportConstitution: vi.fn(() => JSON.stringify({ name: '心流宪法' })),
  importConstitution: vi.fn(() => true),
  toggleRule: vi.fn(),
  trackOnce: vi.fn(),
  initTracking: vi.fn(),
}

const mockConfig = {
  config: {
    complianceOverride: {
      forbiddenPatterns: false,
      notificationBlocked: true,
      advisorEnabled: false,
      comparativePhrases: false,
      personification: false,
      autoStartOverwrite: false,
      hapticFeedbackOverwrite: false,
      dataDriven: false,
    },
  },
  updateComplianceOverride: vi.fn(),
}

// ============================================================
// Mock 模块
// ============================================================
vi.mock('../../stores/constitution', async () => ({
  ...(await vi.importActual<typeof import('../../stores/constitution')>('../../stores/constitution')),
  useConstitutionStore: () => mockConstitution,
}))

vi.mock('../../stores/config', () => ({
  useConfigStore: () => mockConfig,
}))

vi.mock('../../modules/toast', () => ({
  showToast: vi.fn(),
}))

// ---- 合规守卫面板引擎 mock（引擎含模块级 ref，mock 以隔离跨用例污染）----
const mockGenerateReport = vi.fn()
const mockGetAuditLog = vi.fn()
const mockGetAuditStats = vi.fn()
const mockDetectConflicts = vi.fn()

vi.mock('../../modules/constitution/compliance-baseline', () => ({
  useComplianceBaseline: () => ({
    generateReport: mockGenerateReport,
    getAuditLog: mockGetAuditLog,
    getAuditStats: mockGetAuditStats,
    detectConflicts: mockDetectConflicts,
  }),
}))

// 面板在整份测试中都会挂载，需给予所有用例可用的默认返回（模块级，避免渲染期报错）
mockGetAuditLog.mockReturnValue([])
mockGetAuditStats.mockReturnValue({ totalEntries: 0, byType: {}, firstEntryAt: '', lastEntryAt: '', recentChanges: 0 })
mockDetectConflicts.mockReturnValue([])
mockGenerateReport.mockReturnValue({
  generatedAt: '2025-01-01T00:00:00.000Z',
  constitutionVersion: '1.0.0',
  totalRules: 38,
  enabledRules: 25,
  score: 100,
  violations: [],
  warnings: [],
  conflicts: [],
  auditSummary: { totalEntries: 0, byType: {}, firstEntryAt: '', lastEntryAt: '', recentChanges: 0 },
  health: 'healthy',
})

// ============================================================
// Wrapper 工厂
// ============================================================
async function createWrapper() {
  const { default: Constitution } = await import('../Constitution.vue')
  return mount(Constitution, {
    global: {
      plugins: [createPinia()],
      stubs: { teleport: true },
    },
  })
}

// ============================================================
// 测试套件
// ============================================================
describe('Constitution 心流宪法视图', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    // 重置 mutableRules 数据以确保每个测试用例数据独立
    mockConstitution.mutableRules = createMockRules(38)
  })

  // ------------------------------------------------------------------
  // 1. 渲染圣约卷轴标题和版本
  // ------------------------------------------------------------------
  it('渲染圣约卷轴标题和版本', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.find('.scroll-title').text()).toBe('心流宪法')
    expect(wrapper.find('.scroll-version').text()).toBe('v1.0.0')
    expect(wrapper.text()).toContain('世界的根基 · 不可动摇的契约')
  })

  // ------------------------------------------------------------------
  // 2. 渲染序言段落
  // ------------------------------------------------------------------
  it('渲染序言段落', async () => {
    const wrapper = await createWrapper()
    const preambleText = wrapper.find('.parchment-text')
    expect(preambleText.exists()).toBe(true)
    expect(preambleText.text()).toContain('这是心流世界的根基契约')
  })

  // ------------------------------------------------------------------
  // 3. 渲染4个核心条款卡片
  // ------------------------------------------------------------------
  it('渲染4个核心条款卡片', async () => {
    const wrapper = await createWrapper()
    const cards = wrapper.findAll('.pillar-card')
    expect(cards.length).toBe(4)
    expect(cards[0].text()).toContain('第I条')
    expect(cards[1].text()).toContain('第II条')
    expect(cards[2].text()).toContain('第III条')
    expect(cards[3].text()).toContain('第IV条')
    expect(cards[0].text()).toContain('心流至上')
    expect(cards[1].text()).toContain('隐私神圣')
    expect(cards[2].text()).toContain('极简美学')
    expect(cards[3].text()).toContain('渐进成长')
  })

  // ------------------------------------------------------------------
  // 4. 渲染弹性宪法搜索栏
  // ------------------------------------------------------------------
  it('渲染弹性宪法搜索栏', async () => {
    const wrapper = await createWrapper()
    const searchInput = wrapper.find('.filter-search')
    expect(searchInput.exists()).toBe(true)
    expect(searchInput.attributes('placeholder')).toContain('搜索')
  })

  // ------------------------------------------------------------------
  // 5. 类型筛选按钮存在
  // ------------------------------------------------------------------
  it('类型筛选按钮存在', async () => {
    const wrapper = await createWrapper()
    const chips = wrapper.findAll('.filter-type-group .filter-chip')
    expect(chips.length).toBe(5) // 全部 + 4 种类型
    const labels = chips.map((c) => c.text())
    expect(labels).toEqual(['全部', '行为', '仪式', '限制', '价值观'])
  })

  // ------------------------------------------------------------------
  // 6. 渲染默认弹性规则列表（38条）
  // ------------------------------------------------------------------
  it('渲染默认弹性规则列表（38条）', async () => {
    const wrapper = await createWrapper()
    const items = wrapper.findAll('.scroll-item')
    expect(items.length).toBe(38)
  })

  // ------------------------------------------------------------------
  // 7. 搜索过滤功能
  // ------------------------------------------------------------------
  it('搜索过滤功能', async () => {
    const wrapper = await createWrapper()

    // 初始状态应显示全部 38 条
    expect(wrapper.findAll('.scroll-item').length).toBe(38)

    // 在搜索框中输入关键词
    const searchInput = wrapper.find('.filter-search')
    await searchInput.setValue('冥想')
    await wrapper.vm.$nextTick()

    // 验证过滤后只显示匹配的规则（"每日冥想"含"冥想"）
    const items = wrapper.findAll('.scroll-item')
    expect(items.length).toBeGreaterThan(0)
    expect(items.length).toBeLessThan(38)
    items.forEach((item) => {
      expect(item.text()).toContain('冥想')
    })
  })

  // ------------------------------------------------------------------
  // 8. 类型筛选功能
  // ------------------------------------------------------------------
  it('类型筛选功能', async () => {
    const wrapper = await createWrapper()

    // 初始状态显示全部 38 条
    expect(wrapper.findAll('.scroll-item').length).toBe(38)

    // 点击"行为"类型筛选按钮
    const chips = wrapper.findAll('.filter-type-group .filter-chip')
    await chips[1].trigger('click') // "行为" 是第2个（索引1）
    await wrapper.vm.$nextTick()

    // 验证只显示 behavior 类型的规则（约10条）
    const items = wrapper.findAll('.scroll-item')
    expect(items.length).toBeGreaterThan(0)
    expect(items.length).toBeLessThan(38)
    expect(items.length).toBe(10) // 38条中 type=behavior 的有10条
  })

  // ------------------------------------------------------------------
  // 9. 打开新增规则模态框
  // ------------------------------------------------------------------
  it('打开新增规则模态框', async () => {
    const wrapper = await createWrapper()

    // 点击"添加戒律"按钮
    const addBtn = wrapper
      .findAll('button')
      .filter((b) => b.text().includes('添加戒律'))[0]
    await addBtn.trigger('click')
    await wrapper.vm.$nextTick()

    // 验证模态框已打开，且处于新增模式
    expect((wrapper.vm as any).showModal).toBe(true)
    expect((wrapper.vm as any).isEditing).toBe(false)

    // 页面中应出现"添加戒律"标题
    expect(wrapper.text()).toContain('添加戒律')
  })

  // ------------------------------------------------------------------
  // 10. 保存新增规则
  // ------------------------------------------------------------------
  it('保存新增规则', async () => {
    const wrapper = await createWrapper()

    // 打开添加模态框
    const addBtn = wrapper
      .findAll('button')
      .filter((b) => b.text().includes('添加戒律'))[0]
    await addBtn.trigger('click')
    await wrapper.vm.$nextTick()

    // 填写表单
    const titleInput = wrapper.find('.form-input')
    await titleInput.setValue('测试新规则')

    const descTextarea = wrapper.find('.form-textarea')
    await descTextarea.setValue('这是一条测试规则描述')

    // 提交表单
    const form = wrapper.find('.modal-form')
    await form.trigger('submit.prevent')
    await wrapper.vm.$nextTick()

    // 验证 addRule 被调用，且参数正确
    expect(mockConstitution.addRule).toHaveBeenCalledTimes(1)
    expect(mockConstitution.addRule).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '测试新规则',
        description: '这是一条测试规则描述',
        type: 'behavior',
        enabled: true,
      }),
    )

    // 验证模态框已关闭
    expect((wrapper.vm as any).showModal).toBe(false)
  })

  // ------------------------------------------------------------------
  // 11. 编辑规则
  // ------------------------------------------------------------------
  it('编辑规则', async () => {
    const wrapper = await createWrapper()

    // 点击第一条规则的编辑按钮
    const editBtn = wrapper.find('.scroll-item-btn--edit')
    await editBtn.trigger('click')
    await wrapper.vm.$nextTick()

    // 验证模态框已打开，且处于编辑模式
    expect((wrapper.vm as any).showModal).toBe(true)
    expect((wrapper.vm as any).isEditing).toBe(true)

    // 修改标题
    const titleInput = wrapper.find('.form-input')
    await titleInput.setValue('修改后的规则标题')

    // 提交表单
    const form = wrapper.find('.modal-form')
    await form.trigger('submit.prevent')
    await wrapper.vm.$nextTick()

    // 验证 updateRule 被调用
    expect(mockConstitution.updateRule).toHaveBeenCalledTimes(1)
    expect(mockConstitution.updateRule).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        title: '修改后的规则标题',
      }),
    )

    // 验证模态框已关闭
    expect((wrapper.vm as any).showModal).toBe(false)
  })

  // ------------------------------------------------------------------
  // 12. 删除规则确认弹窗
  // ------------------------------------------------------------------
  it('删除规则确认弹窗', async () => {
    const wrapper = await createWrapper()

    // 找到非默认规则的删除按钮（isDefault=false 的规则才有删除按钮）
    const deleteBtns = wrapper.findAll('.scroll-item-btn--delete')
    expect(deleteBtns.length).toBeGreaterThan(0)

    // 点击第一个删除按钮
    await deleteBtns[0].trigger('click')
    await wrapper.vm.$nextTick()

    // 验证删除确认弹窗已打开
    expect((wrapper.vm as any).showDeleteConfirm).toBe(true)
    expect(wrapper.text()).toContain('确认删除')

    // 点击确认删除按钮（stylus-btn-danger）
    const confirmBtn = wrapper.find('.stylus-btn-danger')
    await confirmBtn.trigger('click')
    await wrapper.vm.$nextTick()

    // 验证 removeRule 被调用
    expect(mockConstitution.removeRule).toHaveBeenCalledTimes(1)
    expect(mockConstitution.removeRule).toHaveBeenCalledWith(expect.any(String))

    // 验证弹窗已关闭
    expect((wrapper.vm as any).showDeleteConfirm).toBe(false)
  })

  // ------------------------------------------------------------------
  // 13. 合规覆盖7个toggle存在（含第4条·只给原材料）
  // ------------------------------------------------------------------
  it('合规覆盖7个toggle存在', async () => {
    const wrapper = await createWrapper()
    const toggles = wrapper.findAll('.toggle-switch')
    expect(toggles.length).toBe(8)

    // 验证每个覆盖项的标签文本
    expect(wrapper.text()).toContain('文案中立性检测')
    expect(wrapper.text()).toContain('幕僚主动问候')
    expect(wrapper.text()).toContain('比较性文案检测')
    expect(wrapper.text()).toContain('拟人化检测')
    expect(wrapper.text()).toContain('计时器默认自动开始')
    expect(wrapper.text()).toContain('触觉反馈默认开启')
    expect(wrapper.text()).toContain('第4条·只给原材料')
    expect(wrapper.text()).toContain('允许远程 AI 端点')
  })

  // ------------------------------------------------------------------
  // 14. 导出按钮存在
  // ------------------------------------------------------------------
  it('导出按钮存在', async () => {
    const wrapper = await createWrapper()
    const exportBtn = wrapper.find('button[title="导出宪法"]')
    expect(exportBtn.exists()).toBe(true)
    expect(exportBtn.text()).toContain('导出')
  })

  // ------------------------------------------------------------------
  // 15. C2-EXT · 中性检测词表本地扩展区块（零外网 / 本地 KV）
  // ------------------------------------------------------------------
  it('中性检测词表本地扩展区块渲染', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.find('.neutral-ext-section').exists()).toBe(true)
    // 三类卡片：评价性 / 比较性 / 拟人化
    expect(wrapper.findAll('.neutral-ext-card').length).toBe(3)
    // 覆盖率 pill 渲染内置基线规模
    expect(wrapper.text()).toContain('评价性 内置 15')
    expect(wrapper.text()).toContain('比较性 内置 6')
    expect(wrapper.text()).toContain('拟人化 内置 17')
  })

  it('添加本地词后标签出现并可移除', async () => {
    const wrapper = await createWrapper()
    const input = wrapper.find('.neutral-ext-card .neutral-ext-input')
    await input.setValue('务必完成')
    const form = wrapper.find('.neutral-ext-card .neutral-ext-add')
    await form.trigger('submit')
    await wrapper.vm.$nextTick()

    // 评价性卡片应出现该标签
    const firstCard = wrapper.find('.neutral-ext-card')
    expect(firstCard.text()).toContain('务必完成')

    // 移除
    const delBtn = firstCard.find('.neutral-tag-del')
    await delBtn.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.neutral-ext-card').text()).not.toContain('务必完成')
  })
})

// ============================================================
// 集成：合规守卫 · 宪法体检（INCR-282 补挂载 ConstitutionGuardianPanel）
// ============================================================
describe('集成：合规守卫 · 宪法体检', () => {
  const baseStats = {
    byType: {},
    firstEntryAt: '',
    lastEntryAt: '',
  }
  const healthyReport = {
    generatedAt: '2025-01-01T00:00:00.000Z',
    constitutionVersion: '1.0.0',
    totalRules: 38,
    enabledRules: 25,
    score: 100,
    violations: [],
    warnings: [],
    conflicts: [],
    auditSummary: { totalEntries: 0, recentChanges: 0, ...baseStats },
    health: 'healthy',
  }

  beforeEach(() => {
    mockGetAuditLog.mockReset()
    mockGetAuditLog.mockReturnValue([])
    mockGetAuditStats.mockReset()
    mockGetAuditStats.mockReturnValue({ totalEntries: 0, recentChanges: 0, ...baseStats })
    mockDetectConflicts.mockReset()
    mockDetectConflicts.mockReturnValue([])
    mockGenerateReport.mockReset()
    mockGenerateReport.mockReturnValue(healthyReport)
  })

  it('渲染合规守卫面板标题与初始提示', async () => {
    const wrapper = await createWrapper()
    const panel = wrapper.find('.cgr-panel')
    expect(panel.exists()).toBe(true)
    expect(panel.text()).toContain('合规守卫 · 宪法体检报告')
    expect(panel.text()).toContain('运行合规检查')
    // 初始未运行检查：显示提示而非报告
    expect(panel.find('[data-testid="cgr-report"]').exists()).toBe(false)
    expect(panel.text()).toContain('点击下方按钮')
  })

  it('展示空审计日志与无冲突提示', async () => {
    const wrapper = await createWrapper()
    const panel = wrapper.find('.cgr-panel')
    expect(panel.text()).toContain('暂无审计记录')
    expect(panel.text()).toContain('未发现规则冲突')
    expect(panel.text()).toContain('共 0 条')
    expect(panel.text()).toContain('近 7 天 0 条')
  })

  it('触发运行后展示评分与健康徽章', async () => {
    const wrapper = await createWrapper()
    const btn = wrapper.findAll('button').find((b) => b.text().includes('运行合规检查'))
    await btn!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(mockGenerateReport).toHaveBeenCalledTimes(1)
    const panel = wrapper.find('.cgr-panel')
    const report = panel.find('[data-testid="cgr-report"]')
    expect(report.exists()).toBe(true)
    expect(report.text()).toContain('100')
    expect(report.text()).toContain('规则总数 38')
    expect(wrapper.find('.cgr-badge').text()).toBe('健康')
  })

  it('展示违规项与严重度标签', async () => {
    mockGenerateReport.mockReturnValue({
      ...healthyReport,
      score: 45,
      health: 'critical',
      violations: [
        {
          ruleId: 'rule-1',
          ruleTitle: '测试',
          coreValue: '心流第一',
          description: '规则「测试」包含推送关键词',
          severity: 'critical',
          suggestion: '请移除',
        },
      ],
    })
    const wrapper = await createWrapper()
    const btn = wrapper.findAll('button').find((b) => b.text().includes('运行合规检查'))
    await btn!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.cgr-badge').text()).toBe('危险')
    expect(wrapper.text()).toContain('严重')
    expect(wrapper.text()).toContain('规则「测试」包含推送关键词')
  })

  it('展示审计日志条目与统计', async () => {
    mockGetAuditLog.mockReturnValue([
      { id: 'a1', eventType: 'rule_added', description: '新增规则：专注', timestamp: '2025-01-01T00:00:00.000Z' },
    ])
    mockGetAuditStats.mockReturnValue({ totalEntries: 1, recentChanges: 1, ...baseStats })
    const wrapper = await createWrapper()
    const panel = wrapper.find('.cgr-panel')
    expect(panel.text()).toContain('rule_added')
    expect(panel.text()).toContain('新增规则：专注')
    expect(panel.text()).toContain('共 1 条')
  })
})

// ============================================================
// 集成：宪法生效 · 实时变量（INCR-296 补挂载 ConstitutionLiveVars）
// 面板 onMounted 读 getComputedStyle + isTargetActive；jsdom 下自定义 CSS 变量
// 一律返回空串 → 6 个数值型显示 '—'；2 个 enable 型目标（夜静调暗/数字安息日）
// 读 isTargetActive 显示真实开关态 0/1（引擎默认基准态含二者，值不依赖引擎初始化序）。
// ============================================================
describe('集成：宪法生效 · 实时变量', () => {
  it('渲染实时变量面板标题与 8 个变量项', async () => {
    const wrapper = await createWrapper()
    const panel = wrapper.find('.live-vars-panel')
    expect(panel.exists()).toBe(true)
    expect(panel.find('.lv-title').text()).toBe('宪法生效 · 实时变量')
    expect(panel.find('.lv-sub').text()).toContain('拨动上方戒律开关')
    expect(panel.findAll('.lv-item').length).toBe(8)
  })

  it('变量标签与键名完整', async () => {
    const wrapper = await createWrapper()
    const labels = wrapper.findAll('.lv-label').map((n) => n.text())
    expect(labels).toEqual([
      '粒子密度', '动画速度', '呼吸速度', '场景过渡',
      '夜静调暗', '数字安息日', '静默', '留白',
    ])
    const keys = wrapper.findAll('.lv-var').map((n) => n.text())
    expect(keys).toContain('--hf-particle-density')
    expect(keys).toContain('--hf-night-dim')
    expect(keys).toContain('--hf-sabbath')
    expect(keys).toContain('--hf-silence')
    expect(keys).toContain('--hf-empty-space')
  })

  it('数值型变量在 jsdom 中显示占位横线', async () => {
    const wrapper = await createWrapper()
    // jsdom 的 getComputedStyle 对未设置的 custom property 返回空串 → 回落 '—'
    const items = wrapper.findAll('.lv-item')
    for (const item of items) {
      const label = item.find('.lv-label').text()
      if (label === '夜静调暗' || label === '数字安息日') continue
      expect(item.find('.lv-value').text()).toBe('—')
    }
  })

  it('enable 型目标读 isTargetActive 显示真实开关态 0/1', async () => {
    const wrapper = await createWrapper()
    const night = wrapper
      .findAll('.lv-item')
      .find((n) => n.find('.lv-label').text() === '夜静调暗')!
    const sabbath = wrapper
      .findAll('.lv-item')
      .find((n) => n.find('.lv-label').text() === '数字安息日')!
    expect(night.find('.lv-value').text()).toMatch(/^[01]$/)
    expect(sabbath.find('.lv-value').text()).toMatch(/^[01]$/)
  })

  it('每个变量项渲染描述文本', async () => {
    const wrapper = await createWrapper()
    const descs = wrapper.findAll('.lv-desc').map((n) => n.text())
    expect(descs).toContain('界面粒子浓度倍率')
    expect(descs).toContain('夜间屏幕调暗强度')
    expect(descs).toContain('周日断联强度')
    expect(descs).toContain('抑制提示 0/1')
  })
})