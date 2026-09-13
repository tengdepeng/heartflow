// ============================================================
// Archive 数据档案馆视图测试
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

// ---- mock storage ----
const mockStore: Record<string, any> = {}
const mockStorageVersion = ref(0)
const mockGetSessions = vi.fn(() => [])
const mockGetAnchors = vi.fn(() => [])
const mockGetNotes = vi.fn(() => [])
const mockGetEmotions = vi.fn(() => [])
const mockGetCrystals = vi.fn(() => [])
const mockGetGoals = vi.fn(() => [])
const mockGetCarriers = vi.fn(() => [])
const mockGetRelations = vi.fn(() => [])
const mockGetLedger = vi.fn(() => [])

vi.mock('../../engine/storage', () => ({
  storage: {
    getSessions: (...args: any[]) => (mockGetSessions as any)(...args),
    getAnchors: (...args: any[]) => (mockGetAnchors as any)(...args),
    getNotes: (...args: any[]) => (mockGetNotes as any)(...args),
    getEmotions: (...args: any[]) => (mockGetEmotions as any)(...args),
    getCrystals: (...args: any[]) => (mockGetCrystals as any)(...args),
    getGoals: (...args: any[]) => (mockGetGoals as any)(...args),
    getCarriers: (...args: any[]) => (mockGetCarriers as any)(...args),
    getRelations: (...args: any[]) => (mockGetRelations as any)(...args),
    getLedger: (...args: any[]) => (mockGetLedger as any)(...args),
    getKV: (key: string, def: any) => mockStore[key] ?? def,
    setKV: (key: string, val: any) => { mockStore[key] = val },
    // notes-state persist 依赖 setNotes（自动归档台归档笔记时写库）
    setNotes: (val: any) => { mockStore['hf:notes'] = val },
  },
  storageVersion: mockStorageVersion,
}))

// ---- mock useDataPort ----
const mockDownloadJSON = vi.fn()
const mockDownloadData = vi.fn()
const mockImportData = vi.fn()

vi.mock('../../composables/useDataPort', () => ({
  useDataPort: () => ({
    downloadJSON: mockDownloadJSON,
    downloadMarkdown: vi.fn(),
    exportAllJSON: vi.fn(),
    exportTimelineMarkdown: vi.fn(),
    exportData: vi.fn(),
    downloadData: mockDownloadData,
    importJSON: vi.fn(),
    importData: mockImportData,
  }),
}))

// ---- mock data-port ----
const mockGetImportCountEntries = vi.fn((counts: any) => [
  { key: 'sessions', label: '专注记录', count: counts.sessions ?? 0 },
  { key: 'notes', label: '笔记', count: counts.notes ?? 0 },
])

vi.mock('../../engine/data-port', () => ({
  getImportCountEntries: (...args: any[]) => (mockGetImportCountEntries as any)(...args),
  // ImportCounts 是类型，无需运行时导出
}))

// ---- mock constitution-effect（自动归档台门控：data:auto-archive）----
const mockIsTargetActive = vi.fn(() => false)
vi.mock('../../engine/constitution-effect', () => ({
  isTargetActive: (...args: any[]) => (mockIsTargetActive as any)(...args),
  isConstitutionEffectReady: () => true,
}))

/** 预置留光阁冥想/释怀数据到 mock 存储（JSON 字符串，与 pavilion.ts 读取方式一致） */
function seedLightData(options: { meditations?: any[]; releases?: any[] } = {}) {
  if (options.meditations !== undefined) {
    mockStore['hf:light:meditations'] = JSON.stringify(options.meditations)
  }
  if (options.releases !== undefined) {
    mockStore['hf:light:releases'] = JSON.stringify(options.releases)
  }
}

async function getWrapper() {
  const { default: Archive } = await import('../Archive.vue')
  return mount(Archive, {
    global: {
      plugins: [createPinia()],
    },
  })
}

describe('Archive 数据档案馆视图', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    // 模块级单例（pavilion 冥想/释怀、notes-state 笔记）在首次 import 时读库；
    // 不重置模块注册表时后续用例的 seed 无法生效 → 每用例重置并动态 import
    vi.resetModules()
    vi.clearAllMocks()
    mockStorageVersion.value = 0
    // 默认所有数据域返回空数组
    mockGetSessions.mockReturnValue([])
    mockGetAnchors.mockReturnValue([])
    mockGetNotes.mockReturnValue([])
    mockGetEmotions.mockReturnValue([])
    mockGetCrystals.mockReturnValue([])
    mockGetGoals.mockReturnValue([])
    mockGetCarriers.mockReturnValue([])
    mockGetRelations.mockReturnValue([])
    mockGetLedger.mockReturnValue([])
    // 自动归档门控默认关闭（宪法 fail-closed）
    mockIsTargetActive.mockReturnValue(false)
    for (const k of Object.keys(mockStore)) delete mockStore[k]
  })

  it('渲染标题和描述', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('数据档案馆')
    expect(wrapper.text()).toContain('这里存放着你在这个世界留下的所有痕迹')
  })

  it('默认导出格式为 JSON', async () => {
    const wrapper = await getWrapper()
    const select = wrapper.find('.ar-select')
    expect((select.element as HTMLSelectElement).value).toBe('json')
  })

  it('可选择不同的导出格式', async () => {
    const wrapper = await getWrapper()
    const select = wrapper.find('.ar-select')
    const options = select.findAll('option')
    const formatValues = options.map(o => (o.element as HTMLOptionElement).value)
    expect(formatValues).toContain('json')
    expect(formatValues).toContain('md')
    expect(formatValues).toContain('csv')
    expect(formatValues).toContain('html')
    expect(formatValues).toContain('txt')
    // 切换到 Markdown
    await select.setValue('md')
    expect((select.element as HTMLSelectElement).value).toBe('md')
  })

  it('数据概览统计卡片渲染正确数量', async () => {
    mockGetSessions.mockReturnValue([{ id: 's1' }] as any)
    mockGetAnchors.mockReturnValue([{ id: 'a1' }, { id: 'a2' }] as any)
    mockGetNotes.mockReturnValue([{ id: 'n1' }] as any)
    mockGetEmotions.mockReturnValue([{ id: 'e1' }] as any)
    mockGetCrystals.mockReturnValue([{ id: 'c1' }] as any)
    mockGetGoals.mockReturnValue([{ id: 'g1' }] as any)
    mockGetCarriers.mockReturnValue([{ id: 'cr1' }] as any)
    mockGetRelations.mockReturnValue([{ id: 'r1' }] as any)
    mockGetLedger.mockReturnValue([{ id: 'l1' }] as any)
    // 健康档案面板消费 notes → 需合法 Note 字段（缺失字段会导致报告计算报错）
    mockGetNotes.mockReturnValue([{ id: 'n1', title: '笔记一', content: '内容', tags: [], createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z' }] as any)

    const wrapper = await getWrapper()
    const statCards = wrapper.findAll('.stat-card')
    expect(statCards.length).toBe(9) // 9 个数据域
    expect(wrapper.text()).toContain('专注记录')
    expect(wrapper.text()).toContain('时间结晶')
    expect(wrapper.text()).toContain('逐日心锚')
    expect(wrapper.text()).toContain('留光目标')
    expect(wrapper.text()).toContain('羁绊人物')
    expect(wrapper.text()).toContain('玉珠载体')
  })

  it('数据概览各卡片显示对应计数', async () => {
    mockGetSessions.mockReturnValue([{ id: 's1' }, { id: 's2' }, { id: 's3' }] as any)
    mockGetNotes.mockReturnValue([{ id: 'n1', title: '笔记一', content: '内容', tags: [], createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z' }] as any)

    const wrapper = await getWrapper()
    // 找到专注记录卡片（3 条）和笔记卡片（1 条）
    const statCards = wrapper.findAll('.stat-card')
    const sessionsCard = statCards.filter(c => c.text().includes('专注记录'))
    const notesCard = statCards.filter(c => c.text().includes('笔记'))
    expect(sessionsCard[0].text()).toContain('3')
    expect(notesCard[0].text()).toContain('1')
  })

  it('导出按钮可点击并调用对应导出方法', async () => {
    const wrapper = await getWrapper()
    const exportBtn = wrapper.find('.ar-btn')
    expect(exportBtn.exists()).toBe(true)
    await exportBtn.trigger('click')
    expect(mockDownloadJSON).toHaveBeenCalledTimes(1)
  })

  it('切换格式后导出调用对应方法', async () => {
    const wrapper = await getWrapper()
    const select = wrapper.find('.ar-select')
    await select.setValue('md')
    const exportBtn = wrapper.find('.ar-btn')
    await exportBtn.trigger('click')
    expect(mockDownloadData).toHaveBeenCalledWith('md')
  })

  it('Markdown 格式导出调用 downloadData', async () => {
    const wrapper = await getWrapper()
    const select = wrapper.find('.ar-select')
    await select.setValue('md')
    const exportBtn = wrapper.find('.ar-btn')
    await exportBtn.trigger('click')
    expect(mockDownloadData).toHaveBeenCalledWith('md')
  })

  it('CSV 格式导出调用 downloadData', async () => {
    const wrapper = await getWrapper()
    const select = wrapper.find('.ar-select')
    await select.setValue('csv')
    const exportBtn = wrapper.find('.ar-btn')
    await exportBtn.trigger('click')
    expect(mockDownloadData).toHaveBeenCalledWith('csv')
  })

  it('HTML 格式导出调用 downloadData', async () => {
    const wrapper = await getWrapper()
    const select = wrapper.find('.ar-select')
    await select.setValue('html')
    const exportBtn = wrapper.find('.ar-btn')
    await exportBtn.trigger('click')
    expect(mockDownloadData).toHaveBeenCalledWith('html')
  })

  it('纯文本格式导出调用 downloadData', async () => {
    const wrapper = await getWrapper()
    const select = wrapper.find('.ar-select')
    await select.setValue('txt')
    const exportBtn = wrapper.find('.ar-btn')
    await exportBtn.trigger('click')
    expect(mockDownloadData).toHaveBeenCalledWith('txt')
  })

  it('导入区域渲染正确', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('导入数据')
    expect(wrapper.text()).toContain('选择文件并导入')
    expect(wrapper.text()).toContain('支持 JSON、Markdown、CSV、TXT 格式导入')
  })

  // ------- 集成：归档管理统一入口（P2 收口）-------
  it('集成渲染归档管理区：留光阁记录面板与镜我对白会话面板', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('归档管理')
    expect(wrapper.text()).toContain('冥想记录')
    expect(wrapper.text()).toContain('镜我对白会话')
  })

  // ------- 集成：自动归档台（INCR-275 补挂载孤儿组件 AutoArchivePanel）-------
  it('自动归档台渲染标题与门控状态（未开启）', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('⚙️ 自动归档台')
    expect(wrapper.text()).toContain('⚪ 未开启')
    expect(wrapper.text()).toContain('宪法条款 data:auto-archive 未启用，系统不会静默动你的数据')
    expect(wrapper.text()).toContain('暂无已归档内容')
  })

  it('自动归档台门控开启后显示已开启状态', async () => {
    mockIsTargetActive.mockReturnValue(true)
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('🟢 已开启')
    expect(wrapper.text()).toContain('闲置超过阈值的冥想、释怀与笔记会自动归档，随时可还原')
  })

  it('自动归档台触发一轮归档：门控关闭时零动作（skipped）', async () => {
    mockIsTargetActive.mockReturnValue(false)
    seedLightData({
      meditations: [{ id: 'm1', type: 'breath', duration: 10, date: '2026-01-01', timestamp: '2026-01-01T00:00:00Z', archived: false }],
      releases: [{ id: 'r1', content: '旧释怀', method: 'write', date: '2026-01-01' }],
    })
    mockGetNotes.mockReturnValue([
      { id: 'n1', title: '旧笔记', content: '', tags: [], createdAt: '2026-01-01', updatedAt: '2026-01-01' },
    ] as any)
    const wrapper = await getWrapper()
    const runBtn = wrapper.find('.aap-run-btn')
    expect(runBtn.exists()).toBe(true)
    await runBtn.trigger('click')
    expect(wrapper.text()).toContain('未开启自动归档，未触碰任何数据')
    // 数据未被改动（仍活跃）
    const stored = JSON.parse(mockStore['hf:light:meditations'])
    expect(stored[0].archived).toBeFalsy()
  })

  it('自动归档台触发一轮归档：门控开启时归档闲置数据并展示还原列表', async () => {
    mockIsTargetActive.mockReturnValue(true)
    seedLightData({
      meditations: [
        { id: 'm1', type: 'breath', duration: 10, stateBefore: '', stateAfter: '', date: '2026-01-01', timestamp: '2026-01-01T00:00:00Z', archived: false },
        { id: 'm2', type: 'silent', duration: 20, stateBefore: '', stateAfter: '', date: '2026-09-10', timestamp: '2026-09-10T00:00:00Z', archived: false },
      ],
      releases: [{ id: 'r1', content: '旧释怀', method: 'write', date: '2026-01-01' }],
    })
    mockGetNotes.mockReturnValue([
      { id: 'n1', title: '旧笔记', content: '', tags: [], createdAt: '2026-01-01', updatedAt: '2026-01-01' },
    ] as any)
    const wrapper = await getWrapper()
    await wrapper.find('.aap-run-btn').trigger('click')
    // 归档汇总：m1（超阈值）+ r1（超阈值）+ n1（超阈值）= 3 条
    expect(wrapper.text()).toContain('归档 3 条')
    expect(wrapper.text()).toContain('已归档 · 可还原')
    expect(wrapper.text()).toContain('呼吸')
    expect(wrapper.text()).toContain('旧释怀')
    expect(wrapper.text()).toContain('旧笔记')
  })

  it('自动归档台还原归档的冥想', async () => {
    mockIsTargetActive.mockReturnValue(true)
    seedLightData({
      meditations: [
        { id: 'm1', type: 'breath', duration: 10, stateBefore: '', stateAfter: '', date: '2026-01-01', timestamp: '2026-01-01T00:00:00Z', archived: true },
      ],
    })
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('呼吸')
    const restoreBtn = wrapper.find('.aap-restore-btn')
    expect(restoreBtn.exists()).toBe(true)
    await restoreBtn.trigger('click')
    const stored = JSON.parse(mockStore['hf:light:meditations'])
    expect(stored[0].archived).toBe(false)
  })

  it('自动归档台审计日志展示最近巡检', async () => {
    mockStore['hf:auto-archive:log'] = [
      { thresholdDays: 90, archivedMeditations: 1, archivedReleases: 0, archivedNotes: 2, total: 3, ranAt: '2026-09-01T08:00:00.000Z' },
    ]
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('最近巡检')
    expect(wrapper.text()).toContain('归档 3 条')
  })

  // ============================================================
  // 集成：笔记健康档案面板（INCR-303 补挂载孤儿组件 NoteHealthArchivePanel）
  // 零 props 自持读桥：useStudy().notes（notes-state 模块级 ref，模块初始化时从
  // storage.getNotes 载入）+ useNoteAnalytics().generateReport 纯函数。
  // 宿主 Archive.vue 内 useNoteAnalytics/useStudy 无第二消费方（LightRecordsPanel /
  // DialogueSessionList / AutoArchivePanel 均不消费这两引擎）→ 引擎唯一。
  // 用例通过 mockGetNotes 注入笔记数据，vi.resetModules 保证每用例重新载入 notes-state。
  // 健康分推算（computeNoteHealth 维度加总 + 无 ring 时回顾健康 20）：
  //   n1 充实30+活跃20+标签20+标题10+回顾20=100 → excellent
  //   n2 充实22+活跃20+标签8+标题7+回顾20=77  → good
  //   n3 充实0+活跃0+标签0+标题0+回顾20=20    → critical
  //   平均 = round(197/3) = 66 → fair
  // ============================================================
  describe('集成：笔记健康档案', () => {
    function seedNotes() {
      mockGetNotes.mockReturnValue([
        { id: 'n1', title: '这是一篇内容充实的优秀笔记', content: '心'.repeat(2200), tags: ['心流', '成长', '记录', '观察'], createdAt: '2026-09-01T00:00:00.000Z', updatedAt: new Date().toISOString() },
        { id: 'n2', title: '今日所思', content: '字'.repeat(800), tags: ['日常'], createdAt: '2026-09-02T00:00:00.000Z', updatedAt: new Date().toISOString() },
        { id: 'n3', title: '', content: '', tags: [], createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2025-12-01T00:00:00.000Z' },
      ] as any)
    }

    it('空态：无笔记时呈现「书房未启」引导', async () => {
      const wrapper = await getWrapper()
      expect(wrapper.find('.nhap').exists()).toBe(true)
      expect(wrapper.find('.nhap-empty').exists()).toBe(true)
      expect(wrapper.find('.nhap-empty-title').text()).toBe('书房未启')
      expect(wrapper.find('.nhap-empty-desc').text()).toContain('写下第一篇笔记')
    })

    it('填充态：渲染健康档案标题与健康度徽章（平均 66 分 → fair）', async () => {
      seedNotes()
      const wrapper = await getWrapper()
      const nhap = wrapper.find('.nhap')
      expect(nhap.find('.nhap-head-title').text()).toBe('笔记健康档案')
      expect(nhap.find('.nhap-head-sub').text()).toBe('健康度 · 写作 · 标签 · 生命周期 · 质量')
      expect(nhap.find('.nhap-health-num').text()).toBe('66')
      expect(nhap.find('.nhap-badge').classes()).toContain('nhap-badge-fair')
    })

    it('健康度摘要：分级条 5 段 + 图例计数 + 关注提示', async () => {
      seedNotes()
      const wrapper = await getWrapper()
      const nhap = wrapper.find('.nhap')
      expect(nhap.findAll('.nhap-grade-seg').length).toBe(5)
      expect(nhap.findAll('.nhap-grade-item').length).toBe(5)
      const legend = nhap.find('.nhap-grade-legend').text()
      expect(legend).toContain('优秀 1')
      expect(legend).toContain('良好 1')
      expect(legend).toContain('严重 1')
      expect(nhap.find('.nhap-attention').text()).toContain('1 篇笔记需要关注')
    })

    it('写作统计：六格指标 + 字数分布条', async () => {
      seedNotes()
      const wrapper = await getWrapper()
      const nhap = wrapper.find('.nhap')
      // 首个 .nhap-block 即写作统计块（写作6+标签3+生命周期4+质量5=18 全格，故按块定位）
      const writingBlock = nhap.findAll('.nhap-block')[0]
      const stats = writingBlock.findAll('.nhap-stat')
      expect(stats.length).toBe(6)
      expect(stats[0].find('.nhap-stat-num').text()).toBe('3')
      expect(stats[0].find('.nhap-stat-label').text()).toBe('总笔记')
      expect(writingBlock.findAll('.nhap-dist-row').length).toBeGreaterThan(0)
    })

    it('标签分析：渲染去重后的 top 标签', async () => {
      seedNotes()
      const wrapper = await getWrapper()
      const nhap = wrapper.find('.nhap')
      const tags = nhap.findAll('.nhap-tag')
      expect(tags.length).toBe(5)
      const tagTexts = tags.map(t => t.text())
      expect(tagTexts.some(t => t.includes('心流'))).toBe(true)
      expect(tagTexts.some(t => t.includes('日常'))).toBe(true)
    })

    it('生命周期：活跃 3 / 归档 0 / 回收站 0', async () => {
      seedNotes()
      const wrapper = await getWrapper()
      const nhap = wrapper.find('.nhap')
      expect(nhap.text()).toContain('生命周期')
      // 全面板 .nhap-stat 顺序：写作6 + 标签3 + 生命周期4 + 质量5
      const stats = nhap.findAll('.nhap-stat')
      expect(stats[9].find('.nhap-stat-label').text()).toBe('活跃')
      expect(stats[9].find('.nhap-stat-num').text()).toBe('3')
      expect(stats[10].find('.nhap-stat-num').text()).toBe('0')
      expect(stats[11].find('.nhap-stat-num').text()).toBe('0')
    })

    it('待打磨：低分笔记进入打磨清单并附建议', async () => {
      seedNotes()
      const wrapper = await getWrapper()
      const nhap = wrapper.find('.nhap')
      const items = nhap.findAll('.nhap-attention-item')
      expect(items.length).toBeGreaterThanOrEqual(1)
      // 空笔记（critical 20 分）评分显示且建议非空
      expect(nhap.find('.nhap-attention-score').text()).toBe('20')
      expect(nhap.find('.nhap-attention-tip').text().length).toBeGreaterThan(0)
    })
  })
})