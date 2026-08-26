// ============================================================
// Bag 行囊视图测试
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, computed } from 'vue'
import { DEFAULT_CATEGORIES, DEFAULT_EVOLUTION } from '../../modules/bag/defaults'

// =============================================================
// Mock 数据 — 使用 ref 确保 Vue 模板自动追踪响应式变更
// =============================================================

const searchQueryRef = ref('')
const showAddEvolutionRef = ref(false)
const editingCategoryRef = ref<any>(null)
const editFormItemsRef = ref<any[]>([])
const newEvoFormRef = ref<any>({
  icon: '🌟', title: '', date: '2026-07-27', levelLabel: '新增', levelClass: 'new',
})

const mockSavedCategories = ref<any[]>(JSON.parse(JSON.stringify(DEFAULT_CATEGORIES)))
const mockEvolution = ref<any[]>(JSON.parse(JSON.stringify(DEFAULT_EVOLUTION)))

const CATEGORY_TYPES_MOCK = [
  { value: 'language', icon: '🔤', label: '语言', color: '#60a0c8', bgColor: 'rgba(96, 160, 200, 0.06)' },
  { value: 'framework', icon: '🧩', label: '框架', color: '#8ab87a', bgColor: 'rgba(138, 184, 122, 0.06)' },
  { value: 'tool', icon: '🔧', label: '工具', color: '#c8a060', bgColor: 'rgba(200, 160, 96, 0.06)' },
  { value: 'design', icon: '🎨', label: '设计', color: '#d080a0', bgColor: 'rgba(208, 128, 160, 0.06)' },
  { value: 'softskill', icon: '💬', label: '软技能', color: '#a0c0d0', bgColor: 'rgba(160, 192, 208, 0.06)' },
  { value: 'domain', icon: '📚', label: '领域知识', color: '#c0a080', bgColor: 'rgba(192, 160, 128, 0.06)' },
  { value: 'certification', icon: '🏅', label: '资质', color: '#e8c060', bgColor: 'rgba(232, 192, 96, 0.06)' },
]

const mockSetSearchQuery = vi.fn((q: string) => { searchQueryRef.value = q })
const mockOpenEditModal = vi.fn((cat: any) => {
  editingCategoryRef.value = cat
  editFormItemsRef.value = JSON.parse(JSON.stringify(cat.items))
})
const mockCloseModal = vi.fn(() => {
  editingCategoryRef.value = null
  editFormItemsRef.value = []
})
const mockAddItemToEdit = vi.fn(() => {
  editFormItemsRef.value.push({ name: '', proficiency: 1, note: '' })
})
const mockRemoveItemFromEdit = vi.fn((idx: number) => {
  editFormItemsRef.value.splice(idx, 1)
})
const mockSaveCategoryItems = vi.fn()
const mockHandleProficiencyClick = vi.fn()
const mockSyncLevelClass = vi.fn()
const mockAddEvolution = vi.fn()

// categories computed: 从savedCategories映射
const mockCategories = computed(() => {
  return mockSavedCategories.value.map((cat: any) => ({
    ...cat,
    items: cat.items.map((item: any) => ({
      name: item.name,
      proficiency: item.proficiency,
      note: item.note,
    })),
  }))
})

// overview computed
const mockOverview = computed(() => {
  const cats = mockCategories.value
  const totalItems = cats.reduce((sum: number, c: any) => sum + c.items.length, 0)
  const avgProficiency = Math.round(cats.reduce((sum: number, c: any) => sum + c.proficiency, 0) / cats.length)
  const masteredItems = cats.filter((c: any) => c.proficiency >= 80).length
  return { totalItems, avgProficiency, masteredItems }
})

// filteredCategories computed
const mockFilteredCategories = computed(() => {
  const q = searchQueryRef.value.trim().toLowerCase()
  if (!q) return mockCategories.value
  return mockCategories.value.filter((cat: any) => {
    const nameMatch = cat.name.toLowerCase().includes(q)
    const itemMatch = cat.items.some((item: any) => item.name.toLowerCase().includes(q))
    return nameMatch || itemMatch
  })
})

// categoryDistribution computed
const mockCategoryDistribution = computed(() => {
  return CATEGORY_TYPES_MOCK.map((typeInfo) => {
    const matched = mockCategories.value.filter((c: any) => {
      return (c.categoryType || 'tool') === typeInfo.value
    })
    const itemCount = matched.reduce((sum: number, c: any) => sum + c.items.length, 0)
    const proficiency = matched.length > 0
      ? Math.round(matched.reduce((sum: number, c: any) => sum + c.proficiency, 0) / matched.length)
      : 0
    return { ...typeInfo, itemCount, proficiency }
  })
})

// =============================================================
// Mock 模块
// 返回 ref 对象而非 getter 返回值，确保组件解构后模板仍能追踪变更
// =============================================================

vi.mock('../../modules/bag', () => ({
  useBagStore: () => ({
    searchQuery: searchQueryRef,
    showAddEvolution: showAddEvolutionRef,
    editingCategory: editingCategoryRef,
    editFormItems: editFormItemsRef,
    newEvoForm: newEvoFormRef,
    savedCategories: mockSavedCategories,
    evolution: mockEvolution,
    get categories() { return mockCategories.value },
    overview: mockOverview,
    filteredCategories: mockFilteredCategories,
    categoryDistribution: mockCategoryDistribution,
    setSearchQuery: mockSetSearchQuery,
    openEditModal: mockOpenEditModal,
    closeModal: mockCloseModal,
    addItemToEdit: mockAddItemToEdit,
    removeItemFromEdit: mockRemoveItemFromEdit,
    saveCategoryItems: mockSaveCategoryItems,
    handleProficiencyClick: mockHandleProficiencyClick,
    syncLevelClass: mockSyncLevelClass,
    addEvolution: mockAddEvolution,
  }),
  useBagAnalytics: () => ({
    calculateSkillRadar: () => ({ labels: [], datasets: [] }),
    calculateSkillHealth: () => ({ overall: 0, dimensions: {} }),
    getGrowthTrend: () => [],
    recordGrowthPoint: vi.fn(),
    predictProficiency: () => [],
  }),
  CATEGORY_TYPES: CATEGORY_TYPES_MOCK,
}))

// =============================================================
// 挂载辅助函数
// =============================================================

async function getWrapper() {
  const { default: Bag } = await import('../Bag.vue')
  return mount(Bag, {
    global: {
      stubs: {
        'router-link': {
          template: '<a><slot /></a>',
        },
      },
    },
  })
}

// =============================================================
// 测试套件
// =============================================================

describe('Bag 行囊视图', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    searchQueryRef.value = ''
    showAddEvolutionRef.value = false
    editingCategoryRef.value = null
    editFormItemsRef.value = []
    newEvoFormRef.value = { icon: '🌟', title: '', date: '2026-07-27', levelLabel: '新增', levelClass: 'new' }
    mockSavedCategories.value = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES))
    mockEvolution.value = JSON.parse(JSON.stringify(DEFAULT_EVOLUTION))
  })

  // ============================
  // 渲染
  // ============================

  it('渲染头部标题、子标题、描述', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('行囊')
    expect(wrapper.text()).toContain('工作技能与工具')
    expect(wrapper.text()).toContain('随身携带的能力与资源')
  })

  it('渲染概览统计（总物品、平均熟练度、已精通）', async () => {
    const wrapper = await getWrapper()
    // 默认 7 个分类，物品总数 5+5+4+4+3+4+3 = 28
    expect(wrapper.text()).toContain('28')
    // 平均熟练度 round((65+72+58+45+38+55+42)/7) = round(375/7) = 54
    expect(wrapper.text()).toContain('54%')
    // 已精通（proficiency >= 80 的分类数）= 0
    expect(wrapper.text()).toContain('0')
  })

  it('渲染7个分类卡片', async () => {
    const wrapper = await getWrapper()
    const cards = wrapper.findAll('.bag-category-card')
    expect(cards.length).toBe(7)
    // 验证每个分类名称
    const names = ['工具', '知识', '技能', '素材', '珍藏', '参考', '灵感']
    names.forEach(n => expect(wrapper.text()).toContain(n))
  })

  // ============================
  // 搜索过滤
  // ============================

  it('搜索过滤功能（输入关键词后分类减少）', async () => {
    const wrapper = await getWrapper()
    const input = wrapper.find('.bag-search-input')
    await input.setValue('工具')
    // 只有"工具"分类匹配
    let cards = wrapper.findAll('.bag-category-card')
    expect(cards.length).toBe(1)
    expect(cards[0].text()).toContain('工具')

    // 按物品名搜索
    await input.setValue('VS Code')
    cards = wrapper.findAll('.bag-category-card')
    expect(cards.length).toBe(1)
    expect(cards[0].text()).toContain('工具')

    // 搜索无匹配关键词
    await input.setValue('xyz_not_exist')
    cards = wrapper.findAll('.bag-category-card')
    expect(cards.length).toBe(0)
  })

  it('搜索清除按钮', async () => {
    const wrapper = await getWrapper()
    // 初始无搜索词，清除按钮不可见
    expect(wrapper.find('.bag-search-clear').exists()).toBe(false)

    const input = wrapper.find('.bag-search-input')
    await input.setValue('工具')
    // 有搜索词后清除按钮可见
    expect(wrapper.find('.bag-search-clear').exists()).toBe(true)

    // 点击清除按钮
    await wrapper.find('.bag-search-clear').trigger('click')
    const cards = wrapper.findAll('.bag-category-card')
    expect(cards.length).toBe(7)
  })

  // ============================
  // 成长轨迹
  // ============================

  it('空状态下显示成长轨迹提示', async () => {
    mockEvolution.value = []
    const wrapper = await getWrapper()
    expect(wrapper.find('.bag-evo-empty').exists()).toBe(true)
    expect(wrapper.text()).toContain('尚未记录成长轨迹')
  })

  it('成长轨迹渲染（默认4条）', async () => {
    const wrapper = await getWrapper()
    const items = wrapper.findAll('.bag-evo-item')
    expect(items.length).toBe(4)
    expect(wrapper.text()).toContain('掌握 TypeScript 高级类型')
    expect(wrapper.text()).toContain('完成 Vue 3 组合式 API 项目')
    expect(wrapper.text()).toContain('阅读《设计模式》并实践')
    expect(wrapper.text()).toContain('配置新的开发环境工具链')
  })

  // ============================
  // 物品编辑模态框
  // ============================

  it('打开物品编辑模态框', async () => {
    const wrapper = await getWrapper()
    // 点击一个物品标签打开模态框
    const firstTag = wrapper.find('.bcc-tag')
    await firstTag.trigger('click')

    expect(mockOpenEditModal).toHaveBeenCalled()
  })

  it('编辑模态框添加物品', async () => {
    const wrapper = await getWrapper()
    // 打开模态框
    const firstTag = wrapper.find('.bcc-tag')
    await firstTag.trigger('click')

    // 点击"添加物品"按钮
    const addBtn = wrapper.find('.bag-modal-add-item')
    await addBtn.trigger('click')

    expect(mockAddItemToEdit).toHaveBeenCalled()
  })

  it('删除物品', async () => {
    const wrapper = await getWrapper()
    // 打开模态框
    const firstTag = wrapper.find('.bcc-tag')
    await firstTag.trigger('click')

    // 点击第一个物品的移除按钮
    const removeBtn = wrapper.find('.bmir-remove')
    await removeBtn.trigger('click')

    expect(mockRemoveItemFromEdit).toHaveBeenCalledWith(0)
  })

  it('编辑模态框提交保存', async () => {
    const wrapper = await getWrapper()
    // 打开模态框
    const firstTag = wrapper.find('.bcc-tag')
    await firstTag.trigger('click')

    // 点击保存
    const saveBtn = wrapper.find('.bag-modal-save')
    await saveBtn.trigger('click')

    expect(mockSaveCategoryItems).toHaveBeenCalled()
  })

  // ============================
  // 底部导航
  // ============================

  it('底部导航链接存在', async () => {
    const wrapper = await getWrapper()
    const footerNav = wrapper.find('.bag-footer-nav')
    const navLinks = footerNav.findAll('a')
    // 4个底部导航链接
    expect(navLinks.length).toBe(4)
    expect(footerNav.text()).toContain('返回更漏')
    expect(footerNav.text()).toContain('回到家的')
    expect(footerNav.text()).toContain('匠庐')
    expect(footerNav.text()).toContain('业脉')
  })
})

const GROWTH_STAGES = [
  { range: [0, 20], name: '蔓芽', icon: '🌱', color: '#8aba7a' },
  { range: [21, 40], name: '萌芽', icon: '🌿', color: '#6aba7a' },
  { range: [41, 60], name: '蕨叶', icon: '🌾', color: '#5aaa7a' },
  { range: [61, 80], name: '乔木', icon: '🌳', color: '#4a9a6a' },
  { range: [81, 100], name: '古木', icon: '🌲', color: '#3a8a5a' },
]

function getGrowthStage(proficiency: number) {
  return GROWTH_STAGES.find(s => proficiency >= s.range[0] && proficiency <= s.range[1]) || GROWTH_STAGES[0]
}

// =============================================================
// 物品类别映射
// =============================================================

describe('物品类别映射', () => {
  it('渲染 7 种物品类别映射卡片', async () => {
    const wrapper = await getWrapper()
    const cards = wrapper.findAll('.bcm-card')
    expect(cards.length).toBe(7)
  })

  it('每个类别卡片显示图标、标签和熟练度', async () => {
    const wrapper = await getWrapper()
    const firstCard = wrapper.find('.bcm-card')
    expect(firstCard.find('.bcm-icon').exists()).toBe(true)
    expect(firstCard.find('.bcm-label').exists()).toBe(true)
    expect(firstCard.find('.bcm-proficiency').exists()).toBe(true)
  })

  it('类别映射面板包含"语言"等 7 种类别', async () => {
    const wrapper = await getWrapper()
    const labels = ['语言', '框架', '工具', '设计', '软技能', '领域知识', '资质']
    labels.forEach(l => expect(wrapper.text()).toContain(l))
  })
})

// =============================================================
// 生长状态演化
// =============================================================

describe('生长状态演化', () => {
  it('getGrowthStage 根据熟练度返回正确阶段', () => {
    expect(getGrowthStage(0).name).toBe('蔓芽')
    expect(getGrowthStage(10).name).toBe('蔓芽')
    expect(getGrowthStage(20).name).toBe('蔓芽')
    expect(getGrowthStage(25).name).toBe('萌芽')
    expect(getGrowthStage(40).name).toBe('萌芽')
    expect(getGrowthStage(50).name).toBe('蕨叶')
    expect(getGrowthStage(60).name).toBe('蕨叶')
    expect(getGrowthStage(70).name).toBe('乔木')
    expect(getGrowthStage(80).name).toBe('乔木')
    expect(getGrowthStage(90).name).toBe('古木')
    expect(getGrowthStage(100).name).toBe('古木')
  })

  it('每个类别卡片显示生长状态', async () => {
    const wrapper = await getWrapper()
    const cards = wrapper.findAll('.bcm-card')
    for (const card of cards) {
      expect(card.find('.bcm-growth').exists()).toBe(true)
      expect(card.find('.bcm-growth-icon').exists()).toBe(true)
      expect(card.find('.bcm-growth-name').exists()).toBe(true)
    }
  })
})