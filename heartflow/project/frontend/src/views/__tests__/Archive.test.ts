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
    mockGetNotes.mockReturnValue([{ id: 'n1' }] as any)

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
})