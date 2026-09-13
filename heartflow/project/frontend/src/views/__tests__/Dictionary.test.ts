// ============================================================
// Dictionary 视图测试
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'

// spy on URL.createObjectURL
const mockCreateObjectURL = vi.fn(() => 'blob:test')
const mockRevokeObjectURL = vi.fn()
vi.stubGlobal('URL', new Proxy(URL, {
  construct(target, args: any[]) { return new (target as any)(...args) },
  apply(target: any, thisArg: any, args: any[]) { return target.call(thisArg, ...args) },
  get(target, prop) {
    if (prop === 'createObjectURL') return mockCreateObjectURL
    if (prop === 'revokeObjectURL') return mockRevokeObjectURL
    return (target as any)[prop]
  },
}))

// 模拟 Pinia store（使用 getter 而非 computed，避免模板渲染时序列化 ComputedRef）
const mockEntries = ref<any[]>([])

function getCategories(): string[] {
  const cats = new Set(mockEntries.value.map((e: any) => e.category).filter(Boolean))
  return [...cats].sort()
}
function getLatestWord(): string {
  return mockEntries.value[mockEntries.value.length - 1]?.word || '暂无'
}

const mockStore = {
  get entries() { return mockEntries.value },
  get categories() { return getCategories() },
  get latestWord() { return getLatestWord() },
  get totalCount() { return mockEntries.value.length },
  get categoryCount() { return getCategories().length },
  get archivedEntries() { return mockEntries.value.filter((e: any) => e.status === 'archived') },
  get activeEntries() { return mockEntries.value.filter((e: any) => e.status !== 'archived') },
  addEntry: vi.fn((word: string, definition: string, category: string, tags?: string[]) => {
    mockEntries.value.push({
      id: `dict_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      word,
      definition,
      category,
      tags: tags || [],
      createdAt: new Date().toISOString(),
      status: 'active',
    })
  }),
  updateEntry: vi.fn((id: string, fields: any) => {
    const e = mockEntries.value.find(x => x.id === id)
    if (e) {
      if (fields.word !== undefined) e.word = fields.word
      if (fields.definition !== undefined) e.definition = fields.definition
      if (fields.category !== undefined) e.category = fields.category
    }
  }),
  deleteEntry: vi.fn((id: string) => {
    mockEntries.value = mockEntries.value.filter((e: any) => e.id !== id)
  }),
  archiveEntry: vi.fn((id: string) => {
    const e = mockEntries.value.find((x: any) => x.id === id)
    if (e) e.status = 'archived'
  }),
  unarchiveEntry: vi.fn((id: string) => {
    const e = mockEntries.value.find((x: any) => x.id === id)
    if (e) e.status = 'active'
  }),
  filterEntries: vi.fn((search?: string, category?: string) => {
    return mockEntries.value.filter((e: any) => {
      if (search && !e.word.toLowerCase().includes(search.toLowerCase())
        && !e.definition.toLowerCase().includes(search.toLowerCase())) return false
      if (category && e.category !== category) return false
      return true
    }).sort((a: any, b: any) => a.word.localeCompare(b.word, 'zh'))
  }),
  exportDict: vi.fn(() => JSON.stringify(mockEntries.value, null, 2)),
  importDict: vi.fn((json: string) => {
    const imported = JSON.parse(json)
    const existing = new Set(mockEntries.value.map((x: any) => x.word))
    let added = 0
    for (const item of imported) {
      if (item.word && !existing.has(item.word)) {
        mockEntries.value.push(item)
        existing.add(item.word)
        added++
      }
    }
    return { added, skipped: imported.length - added }
  }),
}

vi.mock('../../stores/dictionary', () => ({
  useDictionaryStore: () => mockStore,
}))

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: vi.fn((key: string, fallback?: any) => {
      const store: Record<string, any> = { 'hf:poetry_favorites': [] }
      return store[key] ?? fallback
    }),
    setKV: vi.fn(),
    getConfig: () => ({
      display: { trendNoteCount: 20, titleTruncateLength: 8, excerptTruncateLength: 80, tagDisplayCount: 2, statsWindowDays: 30, searchResultLimit: 10, dreamStorageLimit: 100, cleanupThresholdDays: 30, moveTrajectoryCount: 20, healthRecentSleepCount: 14, healthRecentExerciseCount: 30, healthRecentMealCount: 5, noteMaxLength: 100, uploadImageMaxBytes: 5242880, uploadVideoMaxBytes: 104857600 },
      health: { exerciseTarget: 150, sleepTarget: 7, sleepMinThreshold: 6, sleepCriticalThreshold: 5, sleepExcellentThreshold: 7.5 },
      worklog: { overtimeRate: 1.5, nightRate: 1.3, defaultStart: '09:00', defaultEnd: '18:00', trendDays: 30, trendMonths: 6, recentShiftLimit: 15 },
    }),
    setConfig: vi.fn(),
  },
}))

async function getWrapper() {
  const { default: Dictionary } = await import('../Dictionary.vue')
  return mount(Dictionary, {
    global: {
      stubs: {
        HandwritingPanel: { template: '<div class="hwp-stub" />' },
      },
    },
  })
}

describe('Dictionary 视图', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEntries.value = []
  })

  it('渲染标题', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('殿堂辞典')
  })

  it('空状态显示提示', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('还没有词条')
  })

  it('有词条时显示列表', async () => {
    mockEntries.value = [
      { id: 'd1', word: '心流', definition: '完全沉浸的状态', category: '心理', createdAt: '2026-01-01' },
    ]
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('心流')
    expect(wrapper.text()).toContain('完全沉浸的状态')
    expect(wrapper.text()).toContain('心理')
  })

  it('搜索过滤词条', async () => {
    mockEntries.value = [
      { id: 'd1', word: '心流', definition: 'Flow', category: '', createdAt: '2026-01-01' },
      { id: 'd2', word: '冥想', definition: 'Meditation', category: '', createdAt: '2026-01-01' },
    ]
    const wrapper = await getWrapper()
    const input = wrapper.find('.search-input')
    await input.setValue('心流')
    const cards = wrapper.findAll('.entry-card')
    expect(cards).toHaveLength(1)
    expect(cards[0].text()).toContain('心流')
  })

  it('分类过滤词条', async () => {
    mockEntries.value = [
      { id: 'd1', word: '心流', definition: 'Flow', category: '心理', createdAt: '2026-01-01' },
      { id: 'd2', word: 'Vue', definition: 'Framework', category: '技术', createdAt: '2026-01-01' },
    ]
    const wrapper = await getWrapper()
    const select = wrapper.find('.cat-select')
    await select.setValue('心理')
    const cards = wrapper.findAll('.entry-card')
    expect(cards).toHaveLength(1)
    expect(cards[0].text()).toContain('心流')
  })

  it('显示统计信息', async () => {
    mockEntries.value = [
      { id: 'd1', word: '心流', definition: 'Flow', category: '心理', createdAt: '2026-01-01' },
      { id: 'd2', word: '冥想', definition: 'Med', category: '心理', createdAt: '2026-01-01' },
    ]
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('共 2 条词条')
    expect(wrapper.text()).toContain('1 个分类')
  })

  it('点击"新词条"打开编辑器', async () => {
    const wrapper = await getWrapper()
    const buttons = wrapper.findAll('button.dc-btn')
    await buttons[0].trigger('click')
    expect(wrapper.find('.modal-overlay').exists()).toBe(true)
    expect(wrapper.text()).toContain('新词条')
  })

  it('保存新词条', async () => {
    const wrapper = await getWrapper()
    const buttons = wrapper.findAll('button.dc-btn')
    await buttons[0].trigger('click')
    const inputs = wrapper.findAll('.modal-input')
    await inputs[0].setValue('测试词条')
    const textarea = wrapper.find('.modal-textarea')
    await textarea.setValue('测试释义')
    const saveBtn = wrapper.findAll('.modal-actions button.dc-btn')
    await saveBtn[0].trigger('click')
    expect(mockStore.addEntry).toHaveBeenCalledWith('测试词条', '测试释义', '', [])
  })

  it('删除词条', async () => {
    mockEntries.value = [
      { id: 'd1', word: '待删除', definition: 'x', category: '', createdAt: '2026-01-01' },
    ]
    const wrapper = await getWrapper()
    await wrapper.find('.del-btn').trigger('click')
    expect(mockStore.deleteEntry).toHaveBeenCalled()
  })

  it('搜索不区分大小写', async () => {
    mockEntries.value = [
      { id: 'd1', word: 'Vue', definition: 'A framework', category: '', createdAt: '2026-01-01' },
    ]
    const wrapper = await getWrapper()
    const input = wrapper.find('.search-input')
    await input.setValue('vue')
    const cards = wrapper.findAll('.entry-card')
    expect(cards).toHaveLength(1)
  })

  it('搜索匹配释义', async () => {
    mockEntries.value = [
      { id: 'd1', word: '心流', definition: 'Flow state', category: '', createdAt: '2026-01-01' },
    ]
    const wrapper = await getWrapper()
    const input = wrapper.find('.search-input')
    await input.setValue('Flow')
    const cards = wrapper.findAll('.entry-card')
    expect(cards).toHaveLength(1)
  })

  it('渲染 HandwritingPanel 手写查字面板', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.hwp-stub').exists()).toBe(true)
  })

  it('渲染自定义字库面板', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.chp').exists()).toBe(true)
    expect(wrapper.text()).toContain('自定义字库')
    expect(wrapper.text()).toContain('字库还是空的')
  })

  it('自定义字库可添加汉字', async () => {
    const wrapper = await getWrapper()
    await wrapper.find('.chp-char').setValue('㵘')
    await wrapper.find('input[placeholder="释义"]').setValue('大水之意')
    await wrapper.find('.chp-add-btn').trigger('click')
    expect(wrapper.text()).toContain('㵘')
  })

  // ============================================================
  // 集成：诗词卡片面板（INCR-205：补挂载孤儿面板 PoetryPanel）
  // ============================================================

  it('渲染诗词卡片面板含今日一诗与检索', async () => {
    const wrapper = await getWrapper()
    const panel = wrapper.find('.poetry')
    expect(panel.exists()).toBe(true)
    expect(wrapper.text()).toContain('诗词卡片')
    expect(wrapper.text()).toContain('今日一诗')
    // 今日诗词 + 操作按钮
    expect(wrapper.find('.poetry-card').exists()).toBe(true)
    expect(wrapper.find('.poetry-card-title').exists()).toBe(true)
    expect(wrapper.find('.poetry-fav').exists()).toBe(true)
    expect(wrapper.findAll('.poetry-btn').length).toBe(2)
  })

  it('搜索诗词列表', async () => {
    const wrapper = await getWrapper()
    await wrapper.find('.poetry-input').setValue('春')
    const items = wrapper.findAll('.poetry-item')
    expect(items.length).toBeGreaterThan(0)
    expect(wrapper.text()).toContain('春晓')
  })

  it('切换随机诗词', async () => {
    const wrapper = await getWrapper()
    await wrapper.findAll('.poetry-btn')[1].trigger('click')
    expect(wrapper.find('.poetry-card').exists()).toBe(true)
  })

  // ============================================================
  // 集成：汉字档案画廊面板（INCR-206：补挂载孤儿面板 HanziGalleryPanel）
  // ============================================================

  it('渲染汉字档案画廊三入口与档案概览', async () => {
    const wrapper = await getWrapper()
    const panel = wrapper.find('.hgp')
    expect(panel.exists()).toBe(true)
    expect(wrapper.text()).toContain('查字台')
    // 三 tab
    expect(wrapper.findAll('.hgp-tab').length).toBe(3)
    expect(wrapper.text()).toContain('拼音')
    expect(wrapper.text()).toContain('部首')
    expect(wrapper.text()).toContain('笔画')
    // 档案概览
    expect(wrapper.text()).toContain('汉字档案')
    expect(wrapper.findAll('.hgp-metric').length).toBe(4)
    expect(wrapper.text()).toContain('总字')
    expect(wrapper.text()).toContain('部首')
    expect(wrapper.text()).toContain('均画')
    expect(wrapper.text()).toContain('简字')
  })

  it('拼音查字输入后展示结果网格', async () => {
    const wrapper = await getWrapper()
    await wrapper.find('.hgp-input').setValue('xin')
    const chars = wrapper.findAll('.hgp-char')
    expect(chars.length).toBeGreaterThan(0)
  })

  it('收录汉字到殿堂词库', async () => {
    const wrapper = await getWrapper()
    await wrapper.find('.hgp-input').setValue('xin')
    const charBtn = wrapper.findAll('.hgp-char')[0]
    await charBtn.trigger('click')
    const collectBtn = wrapper.find('.hgp-collect')
    expect(collectBtn.exists()).toBe(true)
    await collectBtn.trigger('click')
    expect(mockStore.addEntry).toHaveBeenCalled()
  })

  // ============================================================
  // 集成：每日荐字面板（INCR-224：补挂载孤儿面板 DailyWordPanel）
  // ============================================================

  it('渲染每日荐字面板（含标题与今日推荐包）', async () => {
    mockEntries.value = [
      { id: 'd1', word: '心流', definition: '完全沉浸的状态', category: '心理', createdAt: '2026-01-01' },
    ]
    const wrapper = await getWrapper()
    await nextTick()
    expect(wrapper.find('.dwp').exists()).toBe(true)
    expect(wrapper.text()).toContain('每日荐字')
    // 挂载即自动生成今日推荐包
    expect(wrapper.find('.dwp-pack').exists()).toBe(true)
    expect(wrapper.find('.dwp-reason').exists()).toBe(true)
  })

  it('空词库时"换一批"按钮禁用', async () => {
    const wrapper = await getWrapper()
    await nextTick()
    const refresh = wrapper.find('.dwp-refresh')
    expect(refresh.exists()).toBe(true)
    expect(refresh.attributes('disabled')).toBeDefined()
  })

  it('有词条时"换一批"按钮可用且可重新生成', async () => {
    mockEntries.value = [
      { id: 'd1', word: '心流', definition: '完全沉浸的状态', category: '心理', createdAt: '2026-01-01' },
    ]
    const wrapper = await getWrapper()
    await nextTick()
    const refresh = wrapper.find('.dwp-refresh')
    expect(refresh.attributes('disabled')).toBeUndefined()
    await refresh.trigger('click')
    await nextTick()
    expect(wrapper.find('.dwp-pack').exists()).toBe(true)
  })

  it('每日荐字统计随推荐生成更新', async () => {
    const wrapper = await getWrapper()
    await nextTick()
    expect(wrapper.find('.dwp-stats').exists()).toBe(true)
    expect(wrapper.text()).toContain('累计推荐')
  })

  // ============================================================
  // 集成：词源网络面板（INCR-305：补挂载孤儿面板 EtymologyNetworkPanel）
  // 零 props 自持读桥：modules/word-mirror/etymology 的 useEtymologyNetwork()
  // （etymologies/getEtymology/getRootRelatives/getDictionarySize/
  //  getEtymologiesByLanguage/searchEtymologies，存储键 hf:word_networks）。
  // 宿主 Dictionary 内 etymology 零消费方（字镜阁 WordNetworkPanel 属跨宿主，
  // 殿堂辞典仅消费 hanzi/wisdom-poetry/daily-recommendation 引擎）→ 引擎唯一。
  // 引擎无模块级 ref（etymologies 为实例内 ref），setup 时经异步 load() 读库
  // （mock getKV 对 hf:word_networks 返回 fallback [] → 仅内置 57 条，源注释
  // 「55 条」与实际不符，运行时为准）；
  // load 的 await 微任务先于 getWrapper 的续延 → await 后已落库。
  // onMounted 自动选中在 load 落库前执行（load 异步）→ 初始无详情，搜索驱动。
  // 内置首词「心」：字根分解 1 chip / 同源词 4 钮（芯沁吣杺）/ 共享词根 5 钮
  // （思意志爱德，均含组件根「心」）。
  // ============================================================
  describe('集成：词源网络（EtymologyNetworkPanel）', () => {
    it('渲染面板头部与词典规模（内置 57 条）', async () => {
      const wrapper = await getWrapper()
      await nextTick()
      expect(wrapper.find('.enp').exists()).toBe(true)
      expect(wrapper.find('.enp-title').text()).toBe('🔍 词源网络')
      expect(wrapper.find('.enp-size').text()).toContain('词典 57 条')
      expect(wrapper.find('.enp-input').exists()).toBe(true)
      // 初始未选中 → 无详情，等待搜索驱动
      expect(wrapper.find('.enp-detail').exists()).toBe(false)
    })

    it('搜索「心」并点击结果进入词源详情', async () => {
      const wrapper = await getWrapper()
      await nextTick()
      await wrapper.find('.enp-input').setValue('心')
      await nextTick()
      const results = wrapper.findAll('.enp-result')
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].find('.enp-result-word').text()).toBe('心')
      await results[0].trigger('click')
      await nextTick()
      const detail = wrapper.find('.enp-detail')
      expect(detail.exists()).toBe(true)
      expect(detail.find('.enp-word').text()).toBe('心')
      expect(detail.find('.enp-lang').text()).toBe('甲骨文')
      expect(detail.text()).toContain('象形字，甲骨文像心脏之形')
      // 字根分解
      expect(detail.find('.enp-chip').text()).toContain('心(独体象形)')
      // 同源词 4 钮（芯沁吣杺）
      const cognates = detail.findAll('.enp-cognate')
      expect(cognates.length).toBe(4)
      expect(cognates.map((b) => b.text()).join('')).toContain('芯')
      // 共享词根 5 钮（思意志爱德）
      expect(detail.findAll('.enp-relative').length).toBe(5)
    })

    it('共享词根跳转：从「心」点「思」切换详情', async () => {
      const wrapper = await getWrapper()
      await nextTick()
      await wrapper.find('.enp-input').setValue('心')
      await nextTick()
      await wrapper.findAll('.enp-result')[0].trigger('click')
      await nextTick()
      const relBtn = wrapper.findAll('.enp-relative')[0]
      expect(relBtn.find('b').text()).toBe('思')
      await relBtn.trigger('click')
      await nextTick()
      expect(wrapper.find('.enp-word').text()).toBe('思')
      expect(wrapper.find('.enp-lang').text()).toBe('金文')
      expect(wrapper.text()).toContain('从心囟声')
    })

    it('搜索无结果时显示未找到提示', async () => {
      const wrapper = await getWrapper()
      await nextTick()
      await wrapper.find('.enp-input').setValue('不存在的字词')
      await nextTick()
      const none = wrapper.find('.enp-none')
      expect(none.exists()).toBe(true)
      expect(none.text()).toContain('未找到「不存在的字词」的词源')
    })

    it('词源分布统计：三种语言分组与占比条', async () => {
      const wrapper = await getWrapper()
      await nextTick()
      const stats = wrapper.find('.enp-stats')
      expect(stats.exists()).toBe(true)
      const rows = stats.findAll('.enp-lang-row')
      expect(rows.length).toBe(3)
      const names = rows.map((r) => r.find('.enp-lang-name').text())
      expect(names).toContain('甲骨文')
      expect(names).toContain('金文')
      expect(names).toContain('说文')
      // 占比条宽度存在
      expect(rows[0].find('.enp-lang-bar i').attributes('style')).toMatch(/width:\s*\d+%/)
    })
  })
})