// ============================================================
// Study 视图测试
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, computed, nextTick } from 'vue'
import { storage } from '../../engine/storage'

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

// 笔记分析仪表盘（INCR-172）：视图测试中以 stub 模拟（依赖 modules/note 真实存储，引擎已有 modules/note 单元测试背书）
vi.mock('../../components/NoteAnalyticsPanel.vue', () => ({
  default: {
    name: 'NoteAnalyticsPanel',
    template: '<div class="note-analytics-stub" data-test="note-analytics">笔记分析</div>',
    props: ['notes'],
  },
}))

// 知识图谱档案（INCR-230 薄委托化）：视图测试中以 stub 模拟（面板渲染由组件专项 Props 测试背书）
vi.mock('../../components/KnowledgeGraphPanel.vue', () => ({
  default: {
    name: 'KnowledgeGraphPanel',
    template: '<div class="kgp-stub" data-test="kgp">知识图谱</div>',
    props: ['notes'],
  },
}))

// 双向链接引擎（INCR-229 薄委托化）：视图测试 mock 链接数据，面板逻辑由组件专项测试背书
const mockLinks: Record<string, { backlinks: any[]; outgoing: any[] }> = {}
vi.mock('../../modules/study/note-links', () => ({
  useNoteLinks: () => ({
    getBacklinks: (id: string) => mockLinks[id]?.backlinks ?? [],
    getOutgoingLinks: (id: string) => mockLinks[id]?.outgoing ?? [],
  }),
  getBlockContent: (_c: string, _b: string) => null,
}))

// 双向链接面板（INCR-229）：视图级用 stub 断言挂载；面板渲染逻辑由组件专项测试确认
vi.mock('../../components/BacklinksPanel.vue', () => ({
  default: {
    name: 'BacklinksPanel',
    template: '<div class="backlinks-stub" data-test="backlinks" />',
    props: ['noteId', 'notes', 'outgoing', 'backlinks'],
    emits: ['open'],
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

  // ---- 笔记分析仪表盘（INCR-172：补挂载孤儿面板）----

  it('有笔记时集成渲染笔记分析仪表盘', async () => {
    mockNotes.value = [sampleNote({ title: '第一则', tags: ['a'] }), sampleNote({ id: 'n2', title: '第二则', tags: ['b'] })]
    const wrapper = await getWrapper()
    const panel = wrapper.find('.note-analytics-stub')
    expect(panel.exists()).toBe(true)
    expect(panel.text()).toContain('笔记分析')
  })

  it('无笔记时不渲染笔记分析仪表盘', async () => {
    mockNotes.value = []
    const wrapper = await getWrapper()
    expect(wrapper.find('.note-analytics-stub').exists()).toBe(false)
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
      // 书架作用域断言：匹配的笔记应显示、不匹配的应被过滤
      const bookTitles = wrapper.findAll('.book-title').map(b => b.text())
      expect(bookTitles).toContain('Vue 笔记')
      expect(bookTitles).not.toContain('React 笔记')
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

  // ---- 书房气象档案（INCR-198） ----

  it('渲染书房气象档案（空态引导）', async () => {
    mockNotes.value = []
    const wrapper = await getWrapper()
    expect(wrapper.find('.swp-archive').exists()).toBe(true)
    expect(wrapper.text()).toContain('书房气象档案')
    // 空态徽标 + 引导语
    expect(wrapper.text()).toContain('书房未启')
    expect(wrapper.find('.swp-empty').exists()).toBe(true)
    expect(wrapper.text()).toContain('书房还空着')
  })

  it('书房气象注入笔记后展示概览/节奏/温故建议/健康/洞察', async () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 86400000).toISOString()
    mockNotes.value = [
      sampleNote({ id: 'old', title: '搁置的笔记', updatedAt: fiveDaysAgo, createdAt: fiveDaysAgo }),
      sampleNote({ id: 'fresh', title: '今日新笔', tags: ['vue', 'test'] }),
    ]
    const wrapper = await getWrapper()
    // 概览 / 节奏 / 健康区块
    expect(wrapper.text()).toContain('藏书概览')
    expect(wrapper.text()).toContain('落字节奏')
    expect(wrapper.text()).toContain('书房健康')
    // 温故建议命中搁置 5 天的笔记
    expect(wrapper.find('.swp-suggest').exists()).toBe(true)
    expect(wrapper.text()).toContain('搁置的笔记')
    // 温和洞察
    expect(wrapper.find('.swp-insights').exists()).toBe(true)
  })

  // ============================================================
  // 双向链接（INCR-229：薄委托化挂载 BacklinksPanel 至随机回顾弹窗）
  // ============================================================

  it('随机回顾弹窗注入笔记后展示双向链接面板', async () => {
    mockNotes.value = [sampleNote({ id: 'note_seed', title: '种子笔记' })]
    const wrapper = await getWrapper()
    // 触发随机回顾 → 弹窗出现
    const recallBtn = wrapper.find('.st-btn-random')
    expect(recallBtn.exists()).toBe(true)
    await recallBtn.trigger('click')
    await nextTick()
    // 随机回顾弹窗经 Teleport 渲染到 body
    const recallCard = document.querySelector('.recall-card') as HTMLElement | null
    expect(recallCard).not.toBeNull()
    // 弹窗中挂载反链 stub（有笔记时 v-if，backlinks/outgoing 来自宿主计算的空数据）
    expect(recallCard!.querySelector('.recall-links-title')).not.toBeNull()
    expect(recallCard!.querySelector('.backlinks-stub')).not.toBeNull()
    // 空链接时展示兜底文案
    expect(recallCard!.textContent).toContain('这篇笔记还没有双向链接')
  })

  it('随机回顾弹窗的拉黑面板接收宿主注入的链接数据', async () => {
    // 清理上一用例 Teleport 到 body 的残留弹窗
    document.querySelectorAll('.recall-card').forEach(el => el.remove())
    mockNotes.value = [sampleNote({ id: 'note_seed', title: '种子笔记' })]
    mockLinks['note_seed'] = {
      backlinks: [{ id: 'l1', sourceId: 'note_a', targetId: 'note_seed' }],
      outgoing: [],
    }
    const { default: Study } = await import('../Study.vue')
    const w = mount(Study, { attachTo: document.body })
    await w.find('.st-btn-random').trigger('click')
    await nextTick()
    const panel = w.findComponent({ name: 'BacklinksPanel' })
    expect(panel.exists()).toBe(true)
    expect(panel.props('noteId')).toBe('note_seed')
    expect(panel.props('backlinks')).toHaveLength(1)
    // 有链接时空态兜底文案消失
    expect(w.find('.recall-links-empty').exists()).toBe(false)
    w.unmount()
  })

  // ============================================================
  // 知识图谱档案（INCR-230：薄委托化挂载 KnowledgeGraphPanel 至思绪书房）
  // ============================================================

  it('有笔记时渲染知识图谱面板', async () => {
    mockNotes.value = [sampleNote({ id: 'note_seed', title: '种子笔记', tags: ['甲'] })]
    const wrapper = await getWrapper()
    expect(wrapper.findComponent({ name: 'KnowledgeGraphPanel' }).exists()).toBe(true)
    expect(wrapper.find('.kgp-stub').exists()).toBe(true)
  })

  it('知识图谱面板接收宿主注入的笔记列表', async () => {
    mockNotes.value = [
      sampleNote({ id: 'n1', title: '甲', tags: ['甲'] }),
      sampleNote({ id: 'n2', title: '乙', tags: ['甲'] }),
    ]
    const wrapper = await getWrapper()
    const panel = wrapper.findComponent({ name: 'KnowledgeGraphPanel' })
    expect(panel.props('notes').length).toBe(2)
    expect(panel.props('notes')[0].tags).toContain('甲')
  })

  // ============================================================
  // 版本历史面板（INCR-263：薄委托化挂载 VersionHistoryPanel 至思绪书房）
  // 引擎 useVersionHistory 走真实 storage（hf:note_versions / hf:note_version_config）
  // ============================================================

  describe('集成：版本历史面板', () => {
    const K_VERSIONS = 'hf:note_versions'
    const K_CONFIG = 'hf:note_version_config'

    function makeVersion(noteId: string, versionNumber: number, overrides: Record<string, any> = {}) {
      return {
        id: `ver_${noteId}_${versionNumber}`,
        noteId,
        versionNumber,
        title: '测试笔记',
        content: '初始内容',
        tags: ['vue'],
        createdAt: new Date(`2026-09-0${versionNumber}T08:00:00.000Z`).toISOString(),
        description: versionNumber === 1 ? '初始版本' : `手动保存 (v${versionNumber})，变更 2 字符`,
        autoSaved: false,
        isMilestone: false,
        changeSize: 4,
        ...overrides,
      }
    }

    function seedVersions(versions: any[]) {
      storage.setKV(K_VERSIONS, versions)
    }

    beforeEach(() => {
      storage.removeKV(K_VERSIONS)
      storage.removeKV(K_CONFIG)
    })

    it('渲染骨架与概览统计', async () => {
      mockNotes.value = [sampleNote()]
      const wrapper = await getWrapper()
      expect(wrapper.find('.vhp-panel').exists()).toBe(true)
      expect(wrapper.text()).toContain('版本历史')
      expect(wrapper.text()).toContain('自动保存 · 对比 · 恢复')
      // 四格统计
      const stats = wrapper.findAll('.vhp-stat')
      expect(stats.length).toBe(4)
      expect(wrapper.text()).toContain('总版本')
      expect(wrapper.text()).toContain('有版本笔记')
      expect(wrapper.text()).toContain('里程碑')
      expect(wrapper.text()).toContain('总字符')
      // 笔记选择器
      expect(wrapper.find('.vhp-select').exists()).toBe(true)
    })

    it('无版本数据时统计为 0 且选择笔记显示空提示', async () => {
      mockNotes.value = [sampleNote({ id: 'note_1', title: '未版本笔记' })]
      const wrapper = await getWrapper()
      const nums = wrapper.findAll('.vhp-stat-num').map(n => n.text())
      expect(nums[0]).toBe('0')
      expect(nums[1]).toBe('0')
      expect(nums[2]).toBe('0')
      // 选择笔记 → 无版本提示
      await wrapper.find('.vhp-select').setValue('note_1')
      await nextTick()
      expect(wrapper.text()).toContain('这篇笔记还没有版本')
    })

    it('种子版本按版本号渲染列表', async () => {
      mockNotes.value = [sampleNote({ id: 'note_1', title: '版本笔记' })]
      seedVersions([
        makeVersion('note_1', 1),
        makeVersion('note_1', 2, { content: '新增的一段内容', changeSize: 7 }),
      ])
      const wrapper = await getWrapper()
      await wrapper.find('.vhp-select').setValue('note_1')
      await nextTick()
      const versions = wrapper.findAll('.vhp-version')
      expect(versions.length).toBe(2)
      expect(wrapper.text()).toContain('v1')
      expect(wrapper.text()).toContain('v2')
      expect(wrapper.text()).toContain('初始版本')
      expect(wrapper.text()).toContain('+7 字')
    })

    it('存为里程碑生成里程碑版本', async () => {
      mockNotes.value = [sampleNote({ id: 'note_1', title: '里程碑笔记' })]
      seedVersions([makeVersion('note_1', 1)])
      const wrapper = await getWrapper()
      await wrapper.find('.vhp-select').setValue('note_1')
      await nextTick()
      // 填里程碑标签后点击「存为里程碑」
      await wrapper.find('.vhp-input').setValue('首个版本')
      await wrapper.find('.vhp-head-actions .vhp-btn').trigger('click')
      await nextTick()
      const persisted = (storage.getKV(K_VERSIONS, []) as any[])
      expect(persisted.length).toBe(2)
      const last = persisted[persisted.length - 1]
      expect(last.isMilestone).toBe(true)
      expect(last.milestoneLabel).toBe('首个版本')
      // 列表渲染里程碑徽标
      expect(wrapper.text()).toContain('★ 首个版本')
    })

    it('查看差异渲染相似度与变更行', async () => {
      mockNotes.value = [sampleNote({ id: 'note_1', title: '差异笔记' })]
      seedVersions([
        makeVersion('note_1', 1, { content: '第一行\n第二行' }),
        makeVersion('note_1', 2, { content: '第一行\n修改后的行' }),
      ])
      const wrapper = await getWrapper()
      await wrapper.find('.vhp-select').setValue('note_1')
      await nextTick()
      // 点击第二个版本的「查看差异」
      const v2 = wrapper.findAll('.vhp-version')[1]!
      const diffBtn = v2.findAll('button').find(b => b.text().includes('查看差异'))!
      await diffBtn.trigger('click')
      await nextTick()
      expect(wrapper.find('.vhp-diff').exists()).toBe(true)
      expect(wrapper.text()).toContain('相似度')
      expect(wrapper.text()).toContain('变更 1 行')
    })

    it('恢复版本回写宿主更新笔记', async () => {
      mockNotes.value = [sampleNote({ id: 'note_1', title: '恢复笔记' })]
      seedVersions([
        makeVersion('note_1', 1, { title: '旧标题', content: '旧内容', tags: ['old'] }),
        makeVersion('note_1', 2, { title: '新标题', content: '新内容', tags: ['new'] }),
      ])
      const wrapper = await getWrapper()
      await wrapper.find('.vhp-select').setValue('note_1')
      await nextTick()
      const v1 = wrapper.findAll('.vhp-version')[0]!
      const restoreBtn = v1.findAll('button').find(b => b.text().includes('恢复此版本'))!
      await restoreBtn.trigger('click')
      await nextTick()
      expect(mockUpdate).toHaveBeenCalledWith(
        'note_1',
        expect.objectContaining({ title: '旧标题', content: '旧内容', tags: ['old'] }),
      )
    })

    it('删除版本从存储移除', async () => {
      mockNotes.value = [sampleNote({ id: 'note_1', title: '删除笔记' })]
      seedVersions([
        makeVersion('note_1', 1),
        makeVersion('note_1', 2),
      ])
      const wrapper = await getWrapper()
      await wrapper.find('.vhp-select').setValue('note_1')
      await nextTick()
      const v1 = wrapper.findAll('.vhp-version')[0]!
      const delBtn = v1.findAll('button').find(b => b.text().includes('删除'))!
      await delBtn.trigger('click')
      await nextTick()
      const persisted = (storage.getKV(K_VERSIONS, []) as any[])
      expect(persisted.length).toBe(1)
      expect(persisted[0].versionNumber).toBe(2)
    })

    it('清空本笔记版本后显示空提示', async () => {
      mockNotes.value = [sampleNote({ id: 'note_1', title: '清空笔记' })]
      seedVersions([
        makeVersion('note_1', 1),
        makeVersion('note_1', 2),
      ])
      const wrapper = await getWrapper()
      await wrapper.find('.vhp-select').setValue('note_1')
      await nextTick()
      const clearBtn = wrapper.findAll('.vhp-head-actions .vhp-btn')[1]!
      await clearBtn.trigger('click')
      await nextTick()
      expect((storage.getKV(K_VERSIONS, []) as any[]).length).toBe(0)
      expect(wrapper.text()).toContain('这篇笔记还没有版本')
    })

    it('标记与取消里程碑', async () => {
      mockNotes.value = [sampleNote({ id: 'note_1', title: '标记笔记' })]
      seedVersions([makeVersion('note_1', 1)])
      const wrapper = await getWrapper()
      await wrapper.find('.vhp-select').setValue('note_1')
      await nextTick()
      // 标记里程碑
      const v1 = wrapper.findAll('.vhp-version')[0]!
      const markBtn = v1.findAll('button').find(b => b.text().includes('标记里程碑'))!
      await markBtn.trigger('click')
      await nextTick()
      let persisted = (storage.getKV(K_VERSIONS, []) as any[])
      expect(persisted[0].isMilestone).toBe(true)
      // 里程碑徽标（标签沿用版本描述）
      expect(wrapper.find('.vhp-badge').exists()).toBe(true)
      expect(wrapper.text()).toContain('★ 初始版本')
      // 取消里程碑
      const unmarkBtn = wrapper.findAll('.vhp-version')[0]!.findAll('button').find(b => b.text().includes('取消里程碑'))!
      await unmarkBtn.trigger('click')
      await nextTick()
      persisted = (storage.getKV(K_VERSIONS, []) as any[])
      expect(persisted[0].isMilestone).toBe(false)
    })

    it('配置面板更新与恢复默认', async () => {
      mockNotes.value = [sampleNote()]
      const wrapper = await getWrapper()
      // 展开配置
      await wrapper.find('.vhp-config-toggle').trigger('click')
      await nextTick()
      expect(wrapper.find('.vhp-config-body').exists()).toBe(true)
      // 修改每篇最大版本数 → 持久化
      const maxInput = wrapper.findAll('.vhp-config-body input[type="number"]')[0]!
      await maxInput.setValue('30')
      await maxInput.trigger('change')
      await nextTick()
      const config = (storage.getKV(K_CONFIG, {}) as Record<string, any>)
      expect(config.maxVersionsPerNote).toBe(30)
      // 恢复默认设置
      const resetBtn = wrapper.findAll('.vhp-btn').find(b => b.text().includes('恢复默认设置'))!
      await resetBtn.trigger('click')
      await nextTick()
      const resetConfig = (storage.getKV(K_CONFIG, {}) as Record<string, any>)
      expect(resetConfig.maxVersionsPerNote).toBe(50)
    })
  })
})