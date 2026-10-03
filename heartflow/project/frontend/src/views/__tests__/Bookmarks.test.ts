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
    content_type: over.content_type,
    reading_time: over.reading_time,
    is_read: over.is_read,
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

  // ============================================================
  // 集成：收藏气象面板 BookmarkArchivePanel（INCR-288 补挂载孤儿组件）
  // 引擎 modules/bookmarks/bookmarks-analytics.ts 的纯函数
  // （collectionOverview / collectionRhythm / collectionHealth /
  //   revisitSuggestion / collectionInsights）应用库内仅本组件消费
  //   （rg 排除 __tests__ 后仅 BookmarkArchivePanel 引用）→ 应用库内唯一。
  // Props 契约 bookmarks: Bookmark[]，宿主 Bookmarks.vue 经 useBookmarks
  //   （modules/bookmarks，K='hf:bookmarks_v2'，加载时归一化 is_read/content_type/
  //   reading_time）持有同名数组，直接 :bookmarks="bookmarks" 薄委托 + @open="openBookmark"。
  // 注：Panel setup 先 refresh() 一次(空 props)，随 onMounted load() 填充 props 由
  //   deep watch 再次 refresh → 断言前须 await nextTick 等 watch flush。
  // 种子 mkbm 可直接传 is_read/content_type/reading_time，useBookmarks 归一化。
  // ============================================================
  describe('集成：收藏气象面板', () => {
    it('空态渲染面板且徽章「空书架」+ 空建议', async () => {
      const wrapper = await getWrapper()
      await nextTick()
      const bap = wrapper.find('.bap')
      expect(bap.exists()).toBe(true)
      expect(bap.find('.bap-title').text()).toContain('收藏气象')
      expect(bap.find('.bap-tag').text()).toBe('空书架')
      expect(bap.find('.bap-suggest-empty').exists()).toBe(true)
      // 温和洞察：收藏架还空着
      const ins = bap.findAll('.bap-insights li').map(i => i.text())
      expect(ins.some(t => t.includes('收藏架还空着'))).toBe(true)
    })

    it('概览指标反映收藏数据（全部 4 · 待读 1 · 分类 1 · 标签 1）', async () => {
      mockStore[K] = [
        mkbm({ bookmark_id: 'a', title: 'A', content_type: 'article', is_read: false, reading_time: 30 }),
        mkbm({ bookmark_id: 'b', title: 'B', content_type: 'video', is_read: true, visit_count: 3, folder: '休闲', tags: ['设计'] }),
        mkbm({ bookmark_id: 'c', title: 'C', content_type: 'other' }),
        mkbm({ bookmark_id: 'd', title: 'D', status: 'archived', content_type: 'image' }),
      ]
      const wrapper = await getWrapper()
      await nextTick()
      const bap = wrapper.find('.bap')
      const m = bap.findAll('.bap-metric').map(c => ({ label: c.find('span').text(), value: c.find('b').text() }))
      const v = (l: string) => m.find(x => x.label === l)?.value
      expect(v('全部')).toBe('4')
      expect(v('待读')).toBe('1')
      expect(v('分类')).toBe('1')
      expect(v('标签')).toBe('1')
      expect(v('小时')).toBe('0.5')
    })

    it('健康三轴与徽章（渐有条理）', async () => {
      mockStore[K] = [
        mkbm({ bookmark_id: 'a', title: 'A', is_read: false }),
        mkbm({ bookmark_id: 'b', title: 'B', is_read: true, visit_count: 3, folder: '休闲' }),
        mkbm({ bookmark_id: 'c', title: 'C', is_read: true }),
      ]
      const wrapper = await getWrapper()
      await nextTick()
      const bap = wrapper.find('.bap')
      expect(bap.find('.bap-tag').text()).toBe('渐有条理')
      const rows = bap.findAll('.bap-health-row')
      const rowText = rows.map(r => r.text())
      expect(rowText.some(t => t.startsWith('已读率'))).toBe(true)
      expect(rowText.some(t => t.startsWith('回访率'))).toBe(true)
      expect(rowText.some(t => t.startsWith('整理度'))).toBe(true)
    })

    it('今日最值得打开呈现待读推荐并可打开', async () => {
      mockStore[K] = [
        mkbm({ bookmark_id: 'a', title: '收藏的文章', url: 'https://paper.example', is_read: false, created_at: '2026-01-01T00:00:00Z' }),
      ]
      const wrapper = await getWrapper()
      await nextTick()
      const bap = wrapper.find('.bap')
      const main = bap.find('.bap-suggest-main')
      expect(main.exists()).toBe(true)
      expect(main.find('.bap-suggest-title').text()).toBe('收藏的文章')
      expect(main.find('.bap-suggest-reason').text()).toContain('待读箱')
      expect(main.find('.bap-open').exists()).toBe(true)
    })

    it('内容类型分布渲染文章/视频/图片行', async () => {
      mockStore[K] = [
        mkbm({ bookmark_id: 'a', title: 'A', content_type: 'article' }),
        mkbm({ bookmark_id: 'b', title: 'B', content_type: 'video' }),
        mkbm({ bookmark_id: 'c', title: 'C', content_type: 'image' }),
      ]
      const wrapper = await getWrapper()
      await nextTick()
      const bap = wrapper.find('.bap')
      const labels = bap.findAll('.bap-type-label').map(t => t.text())
      expect(labels).toContain('文章')
      expect(labels).toContain('视频')
      expect(labels).toContain('图片')
    })

    // INCR-447：收藏节奏区块（collectionRhythm 此前已计算却从未渲染），
    // 渲染 本周新收/本周回访/蒙尘/均龄(天)/常收类型 五项。
    it('收藏节奏区块渲染五项并反映近期数据（本周新收 1 / 蒙尘 1 / 常收 文章）', async () => {
      const recent = new Date(Date.now() - 1000).toISOString()
      mockStore[K] = [
        mkbm({ bookmark_id: 'a', title: 'A', content_type: 'article', is_read: false, created_at: recent }),
      ]
      const wrapper = await getWrapper()
      await nextTick()
      const bap = wrapper.find('.bap')
      const rhythm = bap.find('.bap-rhythm')
      expect(rhythm.exists()).toBe(true)
      const cells = rhythm.findAll('.bap-metric').map(c => ({ label: c.find('span').text(), value: c.find('b').text() }))
      const labels = cells.map(c => c.label)
      expect(labels).toContain('本周新收')
      expect(labels).toContain('本周回访')
      expect(labels).toContain('蒙尘')
      expect(labels).toContain('均龄(天)')
      expect(labels).toContain('常收')
      const rv = (l: string) => cells.find(x => x.label === l)?.value
      expect(rv('本周新收')).toBe('1')
      expect(rv('蒙尘')).toBe('1')
      expect(rv('常收')).toBe('文章')
    })
  })
})
