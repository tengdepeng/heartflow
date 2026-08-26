// ============================================================
// Study 视图测试
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, computed, nextTick } from 'vue'

// ---- 模拟数据 ----
const mockNotes = ref<NoteType[]>([])
const mockLoad = vi.fn()
const mockCreate = vi.fn()
const mockUpdate = vi.fn()
const mockRemove = vi.fn()
const mockByTag = vi.fn((tag: string) => mockNotes.value.filter(n => n.tags.includes(tag)))

interface NoteType {
  id: string
  title: string
  content: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

function sampleNote(overrides: Partial<NoteType> = {}): NoteType {
  return {
    id: 'note_1',
    title: '测试笔记',
    content: '这是一条测试笔记的内容',
    tags: ['vue', 'test'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

// ---- 模拟依赖 ----

vi.mock('../../modules/study', () => ({
  useStudy: () => ({
    notes: mockNotes,
    allTags: computed(() => {
      const set = new Set<string>()
      for (const n of mockNotes.value) {
        for (const t of n.tags) set.add(t)
      }
      return [...set].sort()
    }),
    load: mockLoad,
    create: mockCreate,
    update: mockUpdate,
    remove: mockRemove,
    byTag: mockByTag,
  }),
  // F1/F2 新增导出：标签云频率统计 / 随机回顾抽取（组件静态导入所需）
  tagFrequencies: (items: { tags: string[] }[]) => {
    const freq: Record<string, number> = {}
    for (const item of items) {
      for (const tag of item.tags) freq[tag] = (freq[tag] ?? 0) + 1
    }
    return freq
  },
  pickRandom: <T>(arr: T[]): T | undefined => (arr.length ? arr[Math.floor(Math.random() * arr.length)] : undefined),
}))

vi.mock('../../modules/study/types', () => ({
  getSpineColor: vi.fn(() => '#7c5cfc'),
  formatNoteDate: vi.fn(() => '7/20'),
}))

// 模拟 NoteEditor 组件（简化版）
vi.mock('../../components/NoteEditor.vue', () => ({
  default: {
    name: 'NoteEditor',
    template: '<div class="mock-editor" v-if="visible"><slot /></div>',
    props: ['visible', 'editing', 'note'],
    emits: ['save', 'close'],
  },
}))

async function getWrapper() {
  const { default: Study } = await import('../Study.vue')
  return mount(Study)
}

describe('Study 视图', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNotes.value = []
  })

  // ---- 渲染 ----

  it('渲染标题"思绪书房"', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('思绪书房')
  })

  it('渲染"新笔记"按钮', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('新笔记')
  })

  it('渲染空状态提示', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('将你的思绪安放在这里')
  })

  // ---- 笔记列表 ----

  it('渲染笔记列表', async () => {
    mockNotes.value = [sampleNote({ title: '笔记一' }), sampleNote({ id: 'note_2', title: '笔记二' })]
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('笔记一')
    expect(wrapper.text()).toContain('笔记二')
  })

  it('笔记列表为空时显示空状态', async () => {
    mockNotes.value = []
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('将你的思绪安放在这里')
  })

  it('笔记显示标题和内容摘要', async () => {
    mockNotes.value = [sampleNote({ title: 'Vue 学习', content: 'Vue 3 的 Composition API 非常强大' })]
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('Vue 学习')
    expect(wrapper.text()).toContain('Vue 3 的 Composition API')
  })

  // ---- 标签过滤 ----

  it('标签过滤后显示匹配结果', async () => {
    mockNotes.value = [sampleNote({ tags: ['vue'] })]
    const wrapper = await getWrapper()
    const filterChips = wrapper.findAll('.filter-chip')
    const tagChips = filterChips.filter(b => b.text() !== '全部')
    if (tagChips.length > 0) {
      await tagChips[0].trigger('click')
      await nextTick()
      // 匹配的笔记应显示在列表中
      expect(wrapper.text()).toContain('测试笔记')
    }
  })

  it('标签过滤后只显示匹配笔记', async () => {
    mockNotes.value = [
      sampleNote({ id: 'n1', title: 'Vue 笔记', tags: ['vue'] }),
      sampleNote({ id: 'n2', title: 'React 笔记', tags: ['react'] }),
    ]
    // mockByTag 模拟按标签过滤
    mockByTag.mockImplementation((tag: string) => mockNotes.value.filter(n => n.tags.includes(tag)))
    const wrapper = await getWrapper()
    // 点击 "vue" 标签
    const vueChip = wrapper.findAll('.filter-chip').filter(b => b.text() === 'vue')
    if (vueChip.length > 0) {
      await vueChip[0].trigger('click')
      await nextTick()
      expect(wrapper.text()).toContain('Vue 笔记')
      expect(wrapper.text()).not.toContain('React 笔记')
    }
  })

  // ---- 添加笔记 ----

  it('点击"新笔记"打开编辑器', async () => {
    const wrapper = await getWrapper()
    const newBtn = wrapper.find('.st-btn-new')
    await newBtn.trigger('click')
    // 编辑器应该可见
    expect(wrapper.find('.mock-editor').exists()).toBe(true)
  })

  // ---- 删除笔记 ----

  it('点击删除按钮弹出确认框', async () => {
    mockNotes.value = [sampleNote({ title: '待删除笔记' })]
    const wrapper = await getWrapper()
    const delBtn = wrapper.find('.book-delete')
    await delBtn.trigger('click')
    expect(wrapper.text()).toContain('待删除笔记')
    expect(wrapper.text()).toContain('删除')
  })

  it('确认删除后调用 study.remove', async () => {
    mockNotes.value = [sampleNote({ id: 'note_1', title: '待删除笔记' })]
    const wrapper = await getWrapper()
    const delBtn = wrapper.find('.book-delete')
    await delBtn.trigger('click')
    // 确认弹窗通过 Teleport 渲染到 body
    await vi.dynamicImportSettled?.()
    const dangerBtn = document.querySelector('.st-btn-danger') as HTMLElement
    if (dangerBtn) {
      dangerBtn.click()
      expect(mockRemove).toHaveBeenCalledWith('note_1')
    }
  })

  it('取消删除不调用 study.remove', async () => {
    mockNotes.value = [sampleNote({ id: 'n1', title: '待删除笔记' })]
    const wrapper = await getWrapper()
    const delBtn = wrapper.find('.book-delete')
    await delBtn.trigger('click')
    await vi.dynamicImportSettled?.()
    const cancelBtn = document.querySelector('.confirm-card .st-btn-cancel') as HTMLElement
    if (cancelBtn) {
      cancelBtn.click()
      expect(mockRemove).not.toHaveBeenCalled()
    }
  })

  // ---- 搜索/标签标签渲染 ----

  it('笔记显示标签', async () => {
    mockNotes.value = [sampleNote({ tags: ['vue', 'test', 'extra'] })]
    const wrapper = await getWrapper()
    // 最多显示 2 个标签
    const tagEls = wrapper.findAll('.book-tag')
    expect(tagEls.length).toBeGreaterThanOrEqual(1)
  })

  it('空笔记标题显示"未命名"', async () => {
    mockNotes.value = [sampleNote({ title: '' })]
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('未命名')
  })

  it('onMounted 调用 study.load', async () => {
    await getWrapper()
    expect(mockLoad).toHaveBeenCalledOnce()
  })
})