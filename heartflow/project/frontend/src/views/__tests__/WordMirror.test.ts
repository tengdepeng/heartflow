// ============================================================
// WordMirror 视图测试 - 字镜阁
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

// ---- 模拟 storage ----
const mockStore: Record<string, any> = {}
const mockGetKV = vi.fn((_key: string, def: any) => mockStore[_key] ?? def)
const mockSetKV = vi.fn((key: string, val: any) => { mockStore[key] = val })

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (...args: any[]) => (mockGetKV as any)(...args),
    setKV: (...args: any[]) => (mockSetKV as any)(...args),
  },
}))

// ---- 模拟 pinia ----
vi.mock('pinia', () => ({
  storeToRefs: (store: any) => store,
  defineStore: () => () => ({}),
  setActivePinia: () => {},
  createPinia: () => ({}),
}))

async function getWrapper() {
  const { default: WordMirror } = await import('../WordMirror.vue')
  return mount(WordMirror, {
    global: {
      stubs: {
        Teleport: true,
        Transition: true,
      },
    },
  })
}

describe('WordMirror 字镜阁', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockStore).forEach(k => delete mockStore[k])
  })

  it('渲染标题', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('字镜阁')
    expect(wrapper.text()).toContain('字里行间，映照自我')
  })

  it('显示文字分析区域', async () => {
    const wrapper = await getWrapper()
    const textarea = wrapper.find('.wm-input')
    expect(textarea.exists()).toBe(true)
    expect(textarea.attributes('placeholder')).toContain('粘贴一段文字')
  })

  it('映照按钮初始禁用', async () => {
    const wrapper = await getWrapper()
    const analyzeBtn = wrapper.find('.wm-btn')
    expect(analyzeBtn.exists()).toBe(true)
    expect(analyzeBtn.attributes('disabled')).toBeDefined()
  })

  it('显示词汇自习室区域', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('词汇自习室')
  })

  it('显示词汇统计概览', async () => {
    const wrapper = await getWrapper()
    // 切换到词汇自习室 tab
    const vocabTab = wrapper.findAll('.wm-tab').find(btn => btn.text() === '词汇自习室')
    if (vocabTab) await vocabTab.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('总词汇')
    expect(wrapper.text()).toContain('熟记')
    expect(wrapper.text()).toContain('学习中')
  })

  it('显示添加词汇表单', async () => {
    const wrapper = await getWrapper()
    // 切换到词汇自习室 tab
    const vocabTab = wrapper.findAll('.wm-tab').find(btn => btn.text() === '词汇自习室')
    if (vocabTab) await vocabTab.trigger('click')
    await wrapper.vm.$nextTick()
    const inputs = wrapper.findAll('.wm-form-input')
    expect(inputs.length).toBeGreaterThanOrEqual(2)
    expect(wrapper.text()).toContain('添加')
  })

  it('显示搜索和筛选区域', async () => {
    const wrapper = await getWrapper()
    // 切换到词汇自习室 tab
    const vocabTab = wrapper.findAll('.wm-tab').find(btn => btn.text() === '词汇自习室')
    if (vocabTab) await vocabTab.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('全部')
    const select = wrapper.find('.wm-filter-select')
    expect(select.exists()).toBe(true)
  })

  it('渲染词源与语义网络面板', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.wnp').exists()).toBe(true)
    expect(wrapper.text()).toContain('词源与语义网络')
    expect(wrapper.text()).toContain('词源追溯')
  })

  it('词源网络面板显示词典规模统计', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.wnp-stats').exists()).toBe(true)
    expect(wrapper.text()).toContain('词典规模')
  })

  it('词汇自习室渲染词根词缀拆解面板', async () => {
    const wrapper = await getWrapper()
    const vocabTab = wrapper.findAll('.wm-tab').find(btn => btn.text() === '词汇自习室')
    if (vocabTab) await vocabTab.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.wroot').exists()).toBe(true)
    expect(wrapper.text()).toContain('词根词缀拆解')
  })

  it('词根拆解输入单词显示部件', async () => {
    const wrapper = await getWrapper()
    const vocabTab = wrapper.findAll('.wm-tab').find(btn => btn.text() === '词汇自习室')
    if (vocabTab) await vocabTab.trigger('click')
    await wrapper.vm.$nextTick()
    const input = wrapper.find('.wroot-input')
    await input.setValue('transport')
    await input.trigger('keyup.enter')
    expect(wrapper.text()).toContain('trans')
    expect(wrapper.find('.wroot-legend').exists()).toBe(true)
  })

  it('词汇自习室渲染词汇游戏面板', async () => {
    const wrapper = await getWrapper()
    const vocabTab = wrapper.findAll('.wm-tab').find(btn => btn.text() === '词汇自习室')
    if (vocabTab) await vocabTab.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.wgp').exists()).toBe(true)
    expect(wrapper.text()).toContain('词汇游戏')
  })

  it('词汇游戏面板提供游戏类型选择', async () => {
    const wrapper = await getWrapper()
    const vocabTab = wrapper.findAll('.wm-tab').find(btn => btn.text() === '词汇自习室')
    if (vocabTab) await vocabTab.trigger('click')
    await wrapper.vm.$nextTick()
    const types = wrapper.findAll('.wgp-chip')
    expect(types.length).toBeGreaterThan(0)
  })

  // ============================================================
  // 集成：字镜档案面板 WordMirrorArchivePanel（INCR-289 补挂载孤儿组件）
  // 引擎 modules/word-mirror/word-mirror-analytics.ts 的纯函数
  // （wordMirrorOverview / wordProficiencyRows / wordStatusRows /
  //   wordMirrorRhythm / wordRecentlyPracticed / wordMirrorHealth /
  //   wordMirrorInsights）应用库内仅本组件消费
  //   （rg 排除 __tests__ 后仅 WordMirrorArchivePanel 引用）→ 应用库内唯一。
  // 零 props 自持读桥：经 useWordMirror()（word-mirror-store 模块级单例，
  //   键 hf:word_history/hf:word_mirror）读 words/history，宿主 WordMirror.vue
  //   同样 onMounted(wm.load()) 从 storage 载入 → 同一份模块级数据，无需传参。
  // 挂载于词汇自习室 tab 末尾（WordGamesPanel 后）。
  // 注：①模块级单例 words/history，mount 时 onMounted load() 从 mockStore 重载
  //   → 断言前 await nextTick；②isStale 依赖 DEFAULT_STALE_THRESHOLD_DAYS，
  //   种子用旧 createdAt+无 lastReviewedAt 触发生疏；③wordMirrorOverview 中
  //   staleCount 亦基于 isStale；④稀有 index.ts 仅 re-export store，分析引擎
  //   无其他生产消费方。
  // ============================================================
  describe('集成：字镜档案面板', () => {
    const mkWord = (over: any = {}) => ({
      id: over.id || 'w1',
      word: over.word || 'test',
      definition: over.definition || '释义',
      proficiency: over.proficiency ?? 3,
      favorite: over.favorite ?? false,
      createdAt: over.createdAt || '2026-01-01T00:00:00Z',
      lastReviewedAt: over.lastReviewedAt,
    })

    async function toVocab(wrapper: any) {
      const vocabTab = wrapper.findAll('.wm-tab').find((btn: any) => btn.text() === '词汇自习室')
      if (vocabTab) await vocabTab.trigger('click')
      await wrapper.vm.$nextTick()
    }

    it('无词汇无历史时渲染空态（字镜未启）', async () => {
      const wrapper = await getWrapper()
      await toVocab(wrapper)
      const wmap = wrapper.find('.wmap-archive')
      expect(wmap.exists()).toBe(true)
      expect(wmap.find('.wmap-title').text()).toContain('字镜档案')
      expect(wmap.find('.wmap-badge-neutral').text()).toBe('字镜未启')
      expect(wmap.find('.wmap-empty').exists()).toBe(true)
    })

    it('有词汇时渲染概览与健康（总词汇·精通·平均熟练）', async () => {
      mockStore['hf:word_mirror'] = [
        mkWord({ id: 'a', word: 'serene', proficiency: 5, favorite: true, lastReviewedAt: new Date().toISOString() }),
        mkWord({ id: 'b', word: 'lucid', proficiency: 4, lastReviewedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString() }),
        mkWord({ id: 'c', word: 'opaque', proficiency: 2, createdAt: '2025-01-01T00:00:00Z' }),
      ]
      const wrapper = await getWrapper()
      await toVocab(wrapper)
      const wmap = wrapper.find('.wmap-archive')
      expect(wmap.find('.wmap-badge-neutral').exists()).toBe(false)
      expect(wmap.find('.wmap-badge-gold').exists()).toBe(true)
      // 概览：总词汇 3 · 精通 2 · 收藏 1 · 生疏 1 · 平均熟练 3.67
      const cells = wmap.findAll('.wmap-cell').map(c => c.text())
      expect(cells.some(t => t.startsWith('3') && t.includes('总词汇'))).toBe(true)
      expect(cells.some(t => t.startsWith('2') && t.includes('精通'))).toBe(true)
      expect(cells.some(t => t.startsWith('1') && t.includes('收藏'))).toBe(true)
      expect(cells.some(t => t.startsWith('1') && t.includes('生疏'))).toBe(true)
      expect(cells.some(t => t.startsWith('3.67') && t.includes('平均熟练'))).toBe(true)
    })

    it('熟练度分布与词条状态行渲染', async () => {
      mockStore['hf:word_mirror'] = [
        mkWord({ id: 'a', word: 'serene', proficiency: 5, lastReviewedAt: new Date().toISOString() }),
        mkWord({ id: 'b', word: 'lucid', proficiency: 4, lastReviewedAt: new Date().toISOString() }),
        mkWord({ id: 'c', word: 'opaque', proficiency: 2, createdAt: '2025-01-01T00:00:00Z' }),
      ]
      const wrapper = await getWrapper()
      await toVocab(wrapper)
      const wmap = wrapper.find('.wmap-archive')
      const titles = wmap.findAll('.wmap-block-title').map(t => t.text())
      expect(titles).toContain('熟练度分布')
      const rows = wmap.findAll('.wmap-row').map(r => r.text())
      expect(rows.some(t => t.startsWith('Lv2'))).toBe(true)
      expect(rows.some(t => t.startsWith('Lv4'))).toBe(true)
      expect(rows.some(t => t.startsWith('Lv5'))).toBe(true)
      expect(rows.some(t => t.includes('已精通'))).toBe(true)
      expect(rows.some(t => t.includes('待复习'))).toBe(true)
    })

    it('复习节律与近期打磨词渲染', async () => {
      mockStore['hf:word_mirror'] = [
        mkWord({ id: 'a', word: 'serene', proficiency: 5, lastReviewedAt: new Date().toISOString() }),
        mkWord({ id: 'b', word: 'lucid', proficiency: 3, lastReviewedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString() }),
      ]
      const wrapper = await getWrapper()
      await toVocab(wrapper)
      const wmap = wrapper.find('.wmap-archive')
      const texts = wmap.findAll('.wmap-block-title').map(t => t.text())
      expect(texts).toContain('复习节律')
      expect(texts).toContain('近期打磨词')
      // 复习覆盖 100%（两词都有 lastReviewedAt）
      const cells = wmap.findAll('.wmap-cell').map(c => c.text())
      expect(cells.some(t => t.includes('复习覆盖') && t.startsWith('100%'))).toBe(true)
      const tags = wmap.findAll('.wmap-tag').map(t => t.text())
      expect(tags).toContain('serene')
    })

    it('温和回看建议与健康徽章呈现（含「近一周没有复习」）', async () => {
      mockStore['hf:word_mirror'] = [
        mkWord({ id: 'a', word: 'serene', proficiency: 5, favorite: true, lastReviewedAt: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString() }),
      ]
      const wrapper = await getWrapper()
      await toVocab(wrapper)
      const wmap = wrapper.find('.wmap-archive')
      const insights = wmap.findAll('.wmap-insight').map(i => i.text())
      expect(insights.some(t => t.includes('近一周没有复习'))).toBe(true)
      expect(insights.some(t => t.includes('字镜'))).toBe(true)
      expect(wmap.find('.wmap-health-num').exists()).toBe(true)
    })
  })
})