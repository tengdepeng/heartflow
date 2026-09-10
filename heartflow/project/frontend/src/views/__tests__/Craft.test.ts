// ============================================================
// Craft 匠庐视图测试
// ============================================================
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, computed } from 'vue'

// =============================================================
// Mock 数据定义
// =============================================================

const mockWorks = ref<any[]>([])
const mockSearchQuery = ref('')
const mockFilterStatus = ref<any>('')

const mockSetSearchQuery = vi.fn((q: string) => { mockSearchQuery.value = q })
const mockSetFilterStatus = vi.fn((s: any) => { mockFilterStatus.value = s })
const mockAddWork = vi.fn()
const mockUpdateWork = vi.fn()
const mockRemoveWork = vi.fn()

// filteredWorks: 根据搜索和筛选过滤作品
const mockFilteredWorks = computed(() => {
  return mockWorks.value.filter((w) => {
    if (mockFilterStatus.value && w.status !== mockFilterStatus.value) return false
    if (mockSearchQuery.value) {
      const q = mockSearchQuery.value.toLowerCase()
      return (
        w.name.toLowerCase().includes(q) ||
        w.description.toLowerCase().includes(q) ||
        (w.tags || []).some((t: string) => t.toLowerCase().includes(q))
      )
    }
    return true
  })
})

// stats: 根据作品列表计算统计
const mockStats = computed(() => {
  const totalWorks = mockWorks.value.length
  const byStatus: Record<string, number> = { draft: 0, refining: 0, completed: 0, archived: 0 }
  let totalEvolution = 0
  for (const w of mockWorks.value) {
    byStatus[w.status]++
    totalEvolution += w.evolution
  }
  return {
    totalWorks,
    byStatus,
    totalCompleted: byStatus.completed,
    averageEvolution: totalWorks > 0 ? Math.round(totalEvolution / totalWorks) : 0,
  }
})

// =============================================================
// Mock 模块
// =============================================================

// 1. Mock useCraftStore
vi.mock('../../modules/craft', () => ({
  useCraftStore: () => ({
    get works() { return mockWorks.value },
    get searchQuery() { return mockSearchQuery.value },
    get filterStatus() { return mockFilterStatus.value },
    get filteredWorks() { return mockFilteredWorks.value },
    get stats() { return mockStats.value },
    setSearchQuery: mockSetSearchQuery,
    setFilterStatus: mockSetFilterStatus,
    addWork: mockAddWork,
    updateWork: mockUpdateWork,
    removeWork: mockRemoveWork,
  }),
}))

// 2. Mock useConfigStore
const mockConfig = ref<any>({
  craft: { tagDisplayCount: 2, messageTimeout: 3000 },
  background: { type: 'default', presetScene: 'none', dataUrl: null },
})
const mockGetScenePresets = vi.fn(() => [])
const mockSaveCurrentAsPreset = vi.fn()
const mockApplyScenePreset = vi.fn()
const mockDeleteScenePreset = vi.fn()
const mockRenameScenePreset = vi.fn()

vi.mock('../../stores/config', () => ({
  useConfigStore: () => ({
    get config() { return mockConfig.value },
    getScenePresets: mockGetScenePresets,
    saveCurrentAsPreset: mockSaveCurrentAsPreset,
    applyScenePreset: mockApplyScenePreset,
    deleteScenePreset: mockDeleteScenePreset,
    renameScenePreset: mockRenameScenePreset,
  }),
}))

// 3. Mock useRoomNavigation
const mockEnterRoom = vi.fn()
vi.mock('../../composables/useRoomNavigation', () => ({
  useRoomNavigation: () => ({
    enterRoom: mockEnterRoom,
  }),
}))

// 4. Mock getRoom
vi.mock('../../engine/room-graph', () => ({
  getRoom: vi.fn(() => ({
    id: 'craft',
    name: '匠庐',
    icon: '🔧',
    description: '工作成果与作品集',
  })),
}))

// 5. Mock storage（CraftMaterialsPanel 直引 @/engine/storage，补隔离返回空材料库，INCR-209）
vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (key: string, fallback?: any) => {
      const store: Record<string, any> = {
        'craft:materials': [],
        'craft:usages': [],
      }
      return store[key] ?? fallback
    },
    setKV: vi.fn(),
    getConfig: () => ({
      display: { trendNoteCount: 20, titleTruncateLength: 8, excerptTruncateLength: 80, tagDisplayCount: 2, statsWindowDays: 30, searchResultLimit: 10, dreamStorageLimit: 100, cleanupThresholdDays: 30, moveTrajectoryCount: 20, healthRecentSleepCount: 14, healthRecentExerciseCount: 30, healthRecentMealCount: 5, noteMaxLength: 100, uploadImageMaxBytes: 5242880, uploadVideoMaxBytes: 104857600 },
      health: { exerciseTarget: 150, sleepTarget: 7, sleepMinThreshold: 6, sleepCriticalThreshold: 5, sleepExcellentThreshold: 7.5 },
      worklog: { overtimeRate: 1.5, nightRate: 1.3, defaultStart: '09:00', defaultEnd: '18:00', trendDays: 30, trendMonths: 6, recentShiftLimit: 15 },
    }),
    setConfig: vi.fn(),
  },
}))

// =============================================================
// 样本数据
// =============================================================

const sampleWorks = [
  {
    id: 'w1', name: '作品一', icon: '🎨', description: '第一个作品',
    color: '#b8a080', status: 'completed', type: 'design', date: '2026-07',
    evolution: 80, tags: ['vue', '前端'], createdAt: '2026-07-01', updatedAt: '2026-07-01',
  },
  {
    id: 'w2', name: '作品二', icon: '📝', description: '第二个作品',
    color: '#7c5cfc', status: 'refining', type: 'writing', date: '2026-06',
    evolution: 45, tags: ['写作'], createdAt: '2026-06-15', updatedAt: '2026-06-20',
  },
  {
    id: 'w3', name: '作品三', icon: '💻', description: '第三个作品',
    color: '#4f8cff', status: 'draft', type: 'code', date: '2026-05',
    evolution: 20, tags: [], createdAt: '2026-05-01', updatedAt: '2026-05-10',
  },
]

// =============================================================
// 挂载辅助函数
// =============================================================

async function getWrapper() {
  const { default: Craft } = await import('../Craft.vue')
  return mount(Craft, {
    attachTo: document.body,
  })
}

// =============================================================
// 测试套件
// =============================================================

describe('Craft 匠庐视图', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockWorks.value = []
    mockSearchQuery.value = ''
    mockFilterStatus.value = ''
    mockConfig.value = {
      craft: { tagDisplayCount: 2, messageTimeout: 3000 },
      background: { type: 'default', presetScene: 'none', dataUrl: null },
    }
  })

  afterEach(() => {
    // 清理 Teleport 残留的 DOM
    document.querySelectorAll('.modal-overlay').forEach(el => el.remove())
  })

  // ============================
  // 1. 渲染头部
  // ============================

  it('渲染头部标题和面包屑', async () => {
    const wrapper = await getWrapper()
    // 标题
    expect(wrapper.find('.craft-title').text()).toBe('匠庐')
    // 面包屑：有「家」链接
    expect(wrapper.text()).toContain('家')
    // 面包屑：有当前房间名
    expect(wrapper.text()).toContain('匠庐')
    // 子标题
    expect(wrapper.text()).toContain('工作成果与作品集')
  })

  // ============================
  // 2. 统计概览
  // ============================

  it('渲染统计概览4个卡片', async () => {
    mockWorks.value = sampleWorks
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()

    // 限定主统计概览容器（CraftStatsOverview，排除材料库面板的 .mat-stats 统计，INCR-209）
    const overview = wrapper.find('.stats-overview:not(.mat-stats)')
    expect(overview.exists()).toBe(true)
    const cards = overview.findAll('.stat-card')
    expect(cards).toHaveLength(4)

    // 总作品 = 3
    expect(cards[0].text()).toContain('3')
    expect(cards[0].text()).toContain('总作品')

    // 已完成 = 1
    expect(cards[1].text()).toContain('1')
    expect(cards[1].text()).toContain('已完成')

    // 平均进化 = round((80+45+20)/3) = 48
    expect(cards[2].text()).toContain('48%')
    expect(cards[2].text()).toContain('平均进化')

    // 打磨中 = 1
    expect(cards[3].text()).toContain('1')
    expect(cards[3].text()).toContain('打磨中')
  })

  // ============================
  // 3. 作品卡片网格
  // ============================

  it('渲染作品卡片网格（mock 3个作品）', async () => {
    mockWorks.value = sampleWorks
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()

    const cards = wrapper.findAll('.work-card')
    expect(cards).toHaveLength(3)

    expect(cards[0].text()).toContain('作品一')
    expect(cards[1].text()).toContain('作品二')
    expect(cards[2].text()).toContain('作品三')

    // 验证卡片内容：状态标签、类型标签、进化值
    expect(cards[0].text()).toContain('已完成')
    expect(cards[0].text()).toContain('设计')
    expect(cards[0].text()).toContain('80%')
  })

  // ============================
  // 4. 搜索过滤
  // ============================

  it('搜索过滤功能', async () => {
    mockWorks.value = sampleWorks
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()

    // 初始显示 3 个作品
    expect(wrapper.findAll('.work-card')).toHaveLength(3)

    const input = wrapper.find('.craft-search-input')
    await input.setValue('作品一')

    // 搜索后只显示匹配的作品
    const cards = wrapper.findAll('.work-card')
    expect(cards).toHaveLength(1)
    expect(cards[0].text()).toContain('作品一')

    // 验证 setSearchQuery 被调用
    expect(mockSetSearchQuery).toHaveBeenCalled()
  })

  // ============================
  // 5. 空状态
  // ============================

  it('空状态显示', async () => {
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()

    const empties = wrapper.findAll('.hf-empty')
    const empty = empties.find((e) => e.text().includes('还没有作品'))
    expect(empty).toBeTruthy()
    expect(empty!.text()).toContain('还没有作品')
  })

  it('空状态：搜索无结果时显示不同提示', async () => {
    mockWorks.value = sampleWorks
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()

    // 搜索不存在的关键词
    const input = wrapper.find('.craft-search-input')
    await input.setValue('不存在的作品')
    await wrapper.vm.$nextTick()

    const empties = wrapper.findAll('.hf-empty')
    const empty = empties.find((e) => e.text().includes('没有匹配的作品'))
    expect(empty).toBeTruthy()
    expect(empty!.text()).toContain('没有匹配的作品')
  })

  // ============================
  // 6. 打开新增作品模态框
  // ============================

  it('打开新增作品模态框', async () => {
    const wrapper = await getWrapper()
    await wrapper.find('.craft-btn--primary').trigger('click')
    await wrapper.vm.$nextTick()

    // 模态框通过 Teleport 到 body
    const overlay = document.querySelector('.modal-overlay')
    expect(overlay).not.toBeNull()
    expect(overlay!.textContent).toContain('新作品')
    expect(overlay!.textContent).toContain('创建作品')
  })

  // ============================
  // 7. 保存新增作品
  // ============================

  it('保存新增作品', async () => {
    const wrapper = await getWrapper()
    // 打开模态框
    await wrapper.find('.craft-btn--primary').trigger('click')
    await wrapper.vm.$nextTick()

    // 填写名称（使用 InputEvent 确保 v-model 能正确捕获）
    const nameInput = document.querySelector('.modal-body .form-input') as HTMLInputElement
    expect(nameInput).not.toBeNull()
    nameInput!.value = '新建作品'
    nameInput!.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))
    await wrapper.vm.$nextTick()

    // 点击创建按钮
    const saveBtn = document.querySelector('.modal-footer .deco-btn--primary') as HTMLButtonElement
    expect(saveBtn).not.toBeNull()
    expect(saveBtn!.disabled).toBe(false) // 确认按钮已启用
    saveBtn!.click()

    await wrapper.vm.$nextTick()

    expect(mockAddWork).toHaveBeenCalledTimes(1)
    const savedWork = mockAddWork.mock.calls[0][0]
    expect(savedWork.name).toBe('新建作品')
    expect(savedWork.status).toBe('draft')
    expect(savedWork.type).toBe('writing')
    expect(savedWork.icon).toBe('🔨')

    // 保存后模态框关闭
    expect(document.querySelector('.modal-overlay')).toBeNull()
  })

  // ============================
  // 8. 编辑作品
  // ============================

  it('编辑作品', async () => {
    mockWorks.value = sampleWorks
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()

    // 点击第一个作品的编辑按钮
    const editBtns = wrapper.findAll('.work-btn--edit')
    expect(editBtns.length).toBeGreaterThan(0)
    await editBtns[0].trigger('click')
    await wrapper.vm.$nextTick()

    // 模态框出现
    const overlay = document.querySelector('.modal-overlay')
    expect(overlay).not.toBeNull()
    expect(overlay!.textContent).toContain('编辑作品')
    // 表单预填了作品数据
    const nameInput = document.querySelector('.modal-body .form-input') as HTMLInputElement
    expect(nameInput!.value).toBe('作品一')
  })

  // ============================
  // 9. 删除作品
  // ============================

  it('删除作品', async () => {
    mockWorks.value = [sampleWorks[0]]
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()

    // Mock confirm 返回 true
    const originalConfirm = window.confirm
    window.confirm = vi.fn(() => true)

    try {
      await wrapper.find('.work-btn--delete').trigger('click')
      expect(mockRemoveWork).toHaveBeenCalledWith('w1')
    } finally {
      window.confirm = originalConfirm
    }
  })

  it('删除作品取消时不移除', async () => {
    mockWorks.value = [sampleWorks[0]]
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()

    // Mock confirm 返回 false
    const originalConfirm = window.confirm
    window.confirm = vi.fn(() => false)

    try {
      await wrapper.find('.work-btn--delete').trigger('click')
      expect(mockRemoveWork).not.toHaveBeenCalled()
    } finally {
      window.confirm = originalConfirm
    }
  })

  // ============================
  // 10. 光质展架
  // ============================

  it('渲染光质展架9个形态', async () => {
    const wrapper = await getWrapper()
    const badges = wrapper.findAll('.light-form-badge')
    expect(badges).toHaveLength(9)

    // 验证部分光质名称
    const names = ['温煦', '清冽', '晶透', '雾隐', '余烬', '极光', '玉润', '鎏金', '虚空']
    names.forEach((name) => {
      expect(wrapper.text()).toContain(name)
    })
  })

  // ============================
  // 11. 状态筛选 Chips
  // ============================

  it('状态筛选 chips 存在', async () => {
    mockWorks.value = sampleWorks
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()

    const chips = wrapper.findAll('.filter-chip')
    // 全部 + 草稿 + 打磨中 + 已完成 + 归档 = 5
    expect(chips).toHaveLength(5)
    expect(chips[0].text()).toContain('全部')
    expect(chips[1].text()).toContain('草稿')
    expect(chips[2].text()).toContain('打磨中')
    expect(chips[3].text()).toContain('已完成')
    expect(chips[4].text()).toContain('归档')
  })

  it('点击筛选 chip 切换状态过滤', async () => {
    mockWorks.value = sampleWorks
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()

    // 点击「已完成」chip
    const chips = wrapper.findAll('.filter-chip')
    await chips[3].trigger('click')

    expect(mockSetFilterStatus).toHaveBeenCalledWith('completed')
  })

  // ============================
  // 12. 底部铭文
  // ============================

  it('底部铭文存在', async () => {
    const wrapper = await getWrapper()
    const colophon = wrapper.find('.craft-colophon')
    expect(colophon.exists()).toBe(true)
    expect(colophon.text()).toContain('匠人匠心')
  })
})

// =============================================================
// 展品架视觉演化
// =============================================================

function getExhibitionGlowLevel(evolution: number): 'dim' | 'faint' | 'glowing' | 'radiant' {
  if (evolution >= 75) return 'radiant'
  if (evolution >= 50) return 'glowing'
  if (evolution >= 25) return 'faint'
  return 'dim'
}

describe('展品架视觉演化', () => {
  it('进化程度影响展品发光等级', () => {
    expect(getExhibitionGlowLevel(0)).toBe('dim')
    expect(getExhibitionGlowLevel(25)).toBe('faint')
    expect(getExhibitionGlowLevel(50)).toBe('glowing')
    expect(getExhibitionGlowLevel(75)).toBe('radiant')
    expect(getExhibitionGlowLevel(100)).toBe('radiant')
  })
})

describe('半成品工作台', () => {
  it('显示进化程度低于 50% 的作品', async () => {
    mockWorks.value = [
      { id: 'w1', name: '成品', evolution: 80, status: 'completed', icon: '🎨', description: '完成作品', color: '#b8a080', type: 'design', date: '2026-07', tags: [] },
      { id: 'w2', name: '半成品', evolution: 30, status: 'refining', icon: '📝', description: '打磨中', color: '#7c5cfc', type: 'writing', date: '2026-06', tags: [] },
      { id: 'w3', name: '草稿', evolution: 10, status: 'draft', icon: '💻', description: '草稿', color: '#4f8cff', type: 'code', date: '2026-05', tags: [] },
      { id: 'w4', name: '归档', evolution: 20, status: 'archived', icon: '📦', description: '已归档', color: '#8a9aa8', type: 'code', date: '2026-04', tags: [] },
    ]
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()

    const wipCards = wrapper.findAll('.wip-card')
    // 应该只显示 2 个半成品（evolution < 50 且不是 archived）
    expect(wipCards.length).toBe(2)
    expect(wipCards[0].text()).toContain('半成品')
    expect(wipCards[1].text()).toContain('草稿')
  })

  it('无半成品时显示空状态', async () => {
    mockWorks.value = [
      { id: 'w1', name: '成品', evolution: 80, status: 'completed', icon: '🎨', description: '完成作品', color: '#b8a080', type: 'design', date: '2026-07', tags: [] },
      { id: 'w4', name: '归档', evolution: 20, status: 'archived', icon: '📦', description: '已归档', color: '#8a9aa8', type: 'code', date: '2026-04', tags: [] },
    ]
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.wip-bench').exists()).toBe(false)
    const empties = wrapper.findAll('.hf-empty')
    const empty = empties.find((e) => e.text().includes('没有正在打磨的半成品'))
    expect(empty).toBeTruthy()
    expect(empty!.text()).toContain('没有正在打磨的半成品')
  })
})

// =============================================================
// 13. 匠庐档案面板（INCR-48）
// =============================================================

describe('匠庐档案面板', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockWorks.value = []
    mockSearchQuery.value = ''
    mockFilterStatus.value = ''
  })

  it('空态显示「匠庐未启」引导', async () => {
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()

    const archive = wrapper.find('.cap-archive')
    expect(archive.exists()).toBe(true)
    expect(archive.find('.cap-badge-neutral').text()).toBe('匠庐未启')
    expect(archive.text()).toContain('炉火尚温')
  })

  it('填充态渲染档案块（概览/健康/洞察）', async () => {
    mockWorks.value = sampleWorks
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()

    const archive = wrapper.find('.cap-archive')
    expect(archive.exists()).toBe(true)
    expect(archive.text()).toContain('匠心概览')
    expect(archive.text()).toContain('匠庐健康')
    // 作品三无标签，作品一 tags=['vue','前端']，作品二 tags=['写作']
    expect(archive.text()).toContain('高频标签')
    expect(archive.find('.cap-insight').exists()).toBe(true)
  })
})

// =============================================================
// 集成：材料库面板（INCR-209：补挂载孤儿面板 CraftMaterialsPanel）
// =============================================================

describe('集成：材料库面板', () => {
  it('渲染材料库含统计与空态', async () => {
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    const panel = wrapper.find('.craft-section')
    expect(panel.exists()).toBe(true)
    expect(wrapper.text()).toContain('材料库')
    // 统计 3 格
    expect(wrapper.text()).toContain('材料种类')
    expect(wrapper.text()).toContain('库存总量')
    expect(wrapper.text()).toContain('库存告急')
    // 空态引导
    expect(wrapper.find('.craft-empty').exists()).toBe(true)
    expect(wrapper.text()).toContain('材料库空空如也')
  })

  it('添加材料后出现在网格', async () => {
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    // 限定在材料添加表单内查找输入框，避免命中其他面板同名 class（INCR-209）
    const nameInput = wrapper.find('.mat-add-form .form-input[placeholder="材料名称"]')
    expect(nameInput.exists()).toBe(true)
    await nameInput.setValue('檀香木')
    const addBtn = wrapper.find('.mat-add-form .craft-btn--primary')
    expect(addBtn.attributes('disabled')).toBeUndefined()
    await addBtn.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.mat-grid').exists()).toBe(true)
    expect(wrapper.find('.craft-empty').exists()).toBe(false)
    expect(wrapper.text()).toContain('檀香木')
    expect(wrapper.findAll('.mat-card').length).toBe(1)
  })
})