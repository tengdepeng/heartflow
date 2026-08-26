// ============================================================
// Dictionary 视图测试
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

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

async function getWrapper() {
  const { default: Dictionary } = await import('../Dictionary.vue')
  return mount(Dictionary)
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
})