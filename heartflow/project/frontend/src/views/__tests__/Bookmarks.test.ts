// ============================================================
// Bookmarks 视图测试 (v2: 抽屉柜 / 入口册 / 标签云)
// 组件已从旧结构重设计为 hf:bookmarks_v2 + 三视图，测试同步对齐
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'

const mockStore: Record<string, any> = {}
const mockGetKV = vi.fn((_key: string, def: any) => mockStore[_key] ?? def)
const mockSetKV = vi.fn((key: string, val: any) => { mockStore[key] = val })

vi.mock('../../engine/storage', () => ({
  storage: { getKV: (...args: any[]) => (mockGetKV as any)(...args), setKV: (...args: any[]) => (mockSetKV as any)(...args) },
}))

const K = 'hf:bookmarks_v2'

function mkbm(over: any = {}) {
  return {
    bookmark_id: over.bookmark_id || 'bm_1',
    url: over.url || 'https://example.com',
    title: over.title || '示例',
    description: over.description || '',
    folder: over.folder || '',
    folder_color: over.folder_color || '',
    favicon: over.favicon || '📎',
    tags: over.tags || [],
    created_at: over.created_at || '2026-01-01T00:00:00Z',
    last_visited_at: over.last_visited_at || '',
    visit_count: over.visit_count || 0,
    related_room_ids: [],
    related_note_ids: [],
    note: over.note || '',
    status: over.status || 'active',
  }
}

async function getWrapper() {
  const { default: Bookmarks } = await import('../Bookmarks.vue')
  return mount(Bookmarks)
}

async function switchToList(wrapper: any) {
  const btn = wrapper.findAll('button').find((b: any) => b.text().includes('入口册'))
  if (btn) { await btn.trigger('click'); await nextTick() }
}

describe('Bookmarks 视图 (v2)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore[K] = []
  })

  it('渲染标题', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('书签入口架')
  })

  it('空状态底部统计', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('共 0 个书签')
  })

  it('列表视图显示书签行', async () => {
    mockStore[K] = [mkbm({ title: '示例', url: 'https://example.com' })]
    const wrapper = await getWrapper()
    await switchToList(wrapper)
    const rows = wrapper.findAll('.entry-row')
    expect(rows).toHaveLength(1)
    expect(rows[0].text()).toContain('示例')
  })

  it('统计信息含活跃/归档', async () => {
    mockStore[K] = [mkbm({ bookmark_id: 'a', title: 'A' }), mkbm({ bookmark_id: 'b', title: 'B' })]
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('共 2 个书签（2 活跃 · 0 归档）')
  })

  it('搜索过滤（标题/URL）', async () => {
    mockStore[K] = [
      mkbm({ bookmark_id: 'a', title: 'Vue.js', url: 'https://vue.com' }),
      mkbm({ bookmark_id: 'b', title: 'React', url: 'https://react.com' }),
    ]
    const wrapper = await getWrapper()
    await switchToList(wrapper)
    const input = wrapper.find('.search-input')
    await input.setValue('Vue')
    const rows = wrapper.findAll('.entry-row')
    expect(rows).toHaveLength(1)
    expect(rows[0].text()).toContain('Vue.js')
  })

  it('分类下拉过滤', async () => {
    mockStore[K] = [
      mkbm({ bookmark_id: 'a', title: 'A', folder: '工具' }),
      mkbm({ bookmark_id: 'b', title: 'B', folder: '学习' }),
    ]
    const wrapper = await getWrapper()
    await switchToList(wrapper)
    const select = wrapper.find('.folder-select')
    await select.setValue('工具')
    const rows = wrapper.findAll('.entry-row')
    expect(rows).toHaveLength(1)
    expect(rows[0].text()).toContain('A')
  })

  it('文件夹统计', async () => {
    mockStore[K] = [
      mkbm({ bookmark_id: 'a', title: 'A', folder: '工具' }),
      mkbm({ bookmark_id: 'b', title: 'B', folder: '工具' }),
      mkbm({ bookmark_id: 'c', title: 'C', folder: '学习' }),
    ]
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('工具 (2)')
    expect(wrapper.text()).toContain('学习 (1)')
  })

  it('添加书签（自动补全 https）', async () => {
    const wrapper = await getWrapper()
    const addBtn = wrapper.findAll('button.bm-btn').find(b => b.text().includes('新书签'))
    await addBtn!.trigger('click')
    await nextTick()
    const inputs = wrapper.findAll('.form-input')
    await inputs[0].setValue('example.com')
    await inputs[1].setValue('示例')
    const saveBtn = wrapper.findAll('button.bm-btn').find(b => b.text().includes('放入抽屉'))
    await saveBtn!.trigger('click')
    await nextTick()
    expect(mockSetKV).toHaveBeenCalled()
    const saved = mockStore[K]
    expect(saved).toHaveLength(1)
    expect(saved[0].url).toBe('https://example.com')
    expect(saved[0].title).toBe('示例')
  })

  it('抽屉视图删除书签', async () => {
    mockStore[K] = [mkbm({ bookmark_id: 'x', title: 'X', folder: '工具' })]
    const wrapper = await getWrapper()
    const drawerHeader = wrapper.find('.drawer-header')
    await drawerHeader.trigger('click')
    await nextTick()
    const card = wrapper.find('.bookmark-card')
    expect(card.exists()).toBe(true)
    // 翻转卡片露出删除按钮
    await card.trigger('click')
    await nextTick()
    const delBtn = wrapper.find('.del-btn-text')
    expect(delBtn.exists()).toBe(true)
    await delBtn.trigger('click')
    await nextTick()
    expect(mockStore[K]).toHaveLength(0)
  })
})
