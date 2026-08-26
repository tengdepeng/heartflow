// ============================================================
// DreamNook 视图测试
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

// 模拟 Pinia store（使用 getter 而非 computed，避免模板渲染时序列化 ComputedRef）
const mockDreams = ref<any[]>([])

function getAllTags(): string[] {
  const set = new Set<string>()
  mockDreams.value.forEach((d: any) => d.tags.forEach((t: string) => set.add(t)))
  return [...set].sort()
}
function getTagRank(): [string, number][] {
  const map = new Map<string, number>()
  mockDreams.value.forEach((d: any) => d.tags.forEach((t: string) => map.set(t, (map.get(t) || 0) + 1)))
  return [...map.entries()].sort((a, b) => b[1] - a[1])
}

const mockStore = {
  get dreams() { return mockDreams.value },
  get totalCount() { return mockDreams.value.length },
  get thisMonthCount() {
    const m = new Date().getMonth()
    const y = new Date().getFullYear()
    return mockDreams.value.filter((d: any) => {
      const date = new Date(d.at)
      return date.getMonth() === m && date.getFullYear() === y
    }).length
  },
  get allTags() { return getAllTags() },
  tagCount: vi.fn((tag: string) => mockDreams.value.filter((d: any) => d.tags.includes(tag)).length),
  get tagRank() { return getTagRank() },
  get archivedDreams() { return mockDreams.value.filter((d: any) => d.archived) },
  recordDream: vi.fn((content: string, title: string, mood: string, tags: string[], dreamDate?: string) => {
    mockDreams.value.unshift({
      id: `dr${Date.now()}${Math.random().toString(36).slice(2, 5)}`,
      title: title.trim(),
      content: content.trim(),
      mood,
      tags,
      dreamDate: dreamDate || null,
      at: new Date().toISOString(),
      archived: false,
    })
  }),
  deleteDream: vi.fn((id: string) => {
    mockDreams.value = mockDreams.value.filter((d: any) => d.id !== id)
  }),
  archiveDream: vi.fn((id: string) => {
    const d = mockDreams.value.find((d: any) => d.id === id)
    if (d) d.archived = true
  }),
  unarchiveDream: vi.fn((id: string) => {
    const d = mockDreams.value.find((d: any) => d.id === id)
    if (d) d.archived = false
  }),
  filterDreams: vi.fn((search?: string, mood?: string, tag?: string) => {
    return mockDreams.value.filter((d: any) => {
      if (search && !d.title.includes(search) && !d.content.includes(search)) return false
      if (mood && d.mood !== mood) return false
      if (tag && !d.tags.includes(tag)) return false
      return true
    })
  }),
  moodLabel: vi.fn((mood: string) => {
    const map: Record<string, string> = { happy: '😊', fear: '😨', sad: '😢', curious: '🤔', confused: '🌀', neutral: '☁️' }
    return map[mood] || '☁️'
  }),
  linkParallelWorld: vi.fn((dreamId: string, worldId: string) => {
    const d = mockDreams.value.find((d: any) => d.id === dreamId)
    if (d) d.relatedParallelWorldId = worldId
  }),
  exportDreams: vi.fn(() => JSON.stringify(mockDreams.value, null, 2)),
  importDreams: vi.fn((json: string) => {
    const imported = JSON.parse(json)
    const existing = new Set(mockDreams.value.map((x: any) => x.id))
    let added = 0
    for (const item of imported) {
      if (item.id && !existing.has(item.id)) {
        mockDreams.value.push(item)
        existing.add(item.id)
        added++
      }
    }
    return { added, skipped: imported.length - added }
  }),
}

vi.mock('../../stores/dreamNook', () => ({
  useDreamNookStore: () => mockStore,
  DREAM_REALM_ID: 'dream-realm',
}))

async function getWrapper() {
  const { default: DreamNook } = await import('../DreamNook.vue')
  return mount(DreamNook)
}

describe('DreamNook 视图', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDreams.value = []
  })

  it('渲染标题', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('梦乡小筑')
  })

  it('空状态显示统计', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('总梦境')
    expect(wrapper.text()).toContain('0')
  })

  it('有梦境时显示列表', async () => {
    mockDreams.value = [
      { id: 'd1', title: '飞翔的梦', content: '在天空飞翔', mood: 'happy', tags: [], at: '2026-01-01T00:00:00Z' },
    ]
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('飞翔的梦')
    expect(wrapper.text()).toContain('在天空飞翔')
  })

  it('显示梦境统计', async () => {
    mockDreams.value = [
      { id: 'd1', title: '梦A', content: '内容', mood: 'happy', tags: [], at: '2026-01-01T00:00:00Z' },
      { id: 'd2', title: '梦B', content: '内容', mood: 'fear', tags: [], at: '2026-01-05T00:00:00Z' },
    ]
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('2')
  })

  it('搜索过滤梦境', async () => {
    mockDreams.value = [
      { id: 'd1', title: '飞翔', content: '天空', mood: 'happy', tags: [], at: '2026-01-01T00:00:00Z' },
      { id: 'd2', title: '潜水', content: '海洋', mood: 'curious', tags: [], at: '2026-01-01T00:00:00Z' },
    ]
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    const searchInput = wrapper.find('[placeholder="搜索标题或内容…"]')
    await searchInput.setValue('飞翔')
    await wrapper.vm.$nextTick()
    const cards = wrapper.findAll('.dream-card')
    expect(cards).toHaveLength(1)
    expect(cards[0].text()).toContain('飞翔')
  })

  it('保留梦境到 store', async () => {
    const wrapper = await getWrapper()
    const inputs = wrapper.findAll('.dn-input')
    await inputs[0].setValue('测试梦')
    const textarea = wrapper.find('.dn-textarea')
    await textarea.setValue('梦境内容')
    // 保存梦境按钮（唯一不带 ghost-btn 的 dn-btn）
    await wrapper.find('button.dn-btn:not(.dn-ghost-btn)').trigger('click')
    expect(mockStore.recordDream).toHaveBeenCalled()
    expect(mockDreams.value).toHaveLength(1)
    expect(mockDreams.value[0].title).toBe('测试梦')
  })

  it('删除梦境', async () => {
    mockDreams.value = [
      { id: 'd1', title: '待删除', content: '内容', mood: 'neutral', tags: [], at: '2026-01-01T00:00:00Z' },
      { id: 'd2', title: '保留', content: '内容', mood: 'neutral', tags: [], at: '2026-01-01T00:00:00Z' },
    ]
    const wrapper = await getWrapper()
    const cards = wrapper.findAll('.dream-card')
    await cards[0].trigger('click')
    const delBtns = wrapper.findAll('.tiny-btn')
    // 删除按钮是最后一个 .tiny-btn（归档→发送→删除）
    await delBtns[delBtns.length - 1].trigger('click')
    expect(mockStore.deleteDream).toHaveBeenCalled()
  })

  it('情绪过滤', async () => {
    mockDreams.value = [
      { id: 'd1', title: '愉快梦', content: '内容', mood: 'happy', tags: [], at: '2026-01-01T00:00:00Z' },
      { id: 'd2', title: '恐惧梦', content: '内容', mood: 'fear', tags: [], at: '2026-01-01T00:00:00Z' },
    ]
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    const selects = wrapper.findAll('select')
    const moodFilters = selects.filter(s => s.text().includes('全部情绪'))
    if (moodFilters.length > 0) {
      await moodFilters[0].setValue('happy')
    }
    await wrapper.vm.$nextTick()
    const cards = wrapper.findAll('.dream-card')
    expect(cards).toHaveLength(1)
    expect(cards[0].text()).toContain('愉快')
  })

  it('→ 梦境区 映照到平行世界·梦境区（#87 双向联动来源侧）', async () => {
    mockDreams.value = [
      { id: 'd1', title: '梦', content: '内容', mood: 'neutral', tags: [], at: '2026-01-01T00:00:00Z' },
    ]
    const wrapper = await getWrapper()
    // 操作按钮仅在卡片展开后渲染
    await wrapper.find('.dream-card').trigger('click')
    await wrapper.vm.$nextTick()
    const sendBtn = wrapper.find('.send-btn')
    expect(sendBtn.text()).toContain('梦境区')
    await sendBtn.trigger('click')
    expect(mockStore.linkParallelWorld).toHaveBeenCalledWith('d1', 'dream-realm')
  })
})