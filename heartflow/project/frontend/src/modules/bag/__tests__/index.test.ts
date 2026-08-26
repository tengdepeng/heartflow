// ============================================================
// 行囊 · Pinia Store 测试
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useBagStore } from '../index'
import { CATEGORY_TYPES, DEFAULT_CATEGORIES, DEFAULT_EVOLUTION } from '../defaults'

// 使用 vi.hoisted 确保 mock 工厂在模块作用域提升时正确捕获外部变量
const { mockKVStore, mockGetKV, mockSetKV } = vi.hoisted(() => {
  const mockKVStore: Record<string, any> = {}
  const mockGetKV = vi.fn((key: string, def: any) => mockKVStore[key] ?? def)
  const mockSetKV = vi.fn((key: string, val: any) => { mockKVStore[key] = val })
  return { mockKVStore, mockGetKV, mockSetKV }
})

vi.mock('../../../engine/storage/kv', () => ({
  getKV: (key: string, def: any) => mockGetKV(key, def),
  setKV: (key: string, val: any) => mockSetKV(key, val),
}))

describe('useBagStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    // 每个测试用例前重置存储数据为默认值（深拷贝避免引用污染）
    mockKVStore['bag:categories'] = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES))
    mockKVStore['bag:evolution'] = JSON.parse(JSON.stringify(DEFAULT_EVOLUTION))
  })

  // ============================================================
  // 1. Store 初始化
  // ============================================================
  it('初始化时从 storage 加载分类和成长轨迹', () => {
    const store = useBagStore()
    expect(mockGetKV).toHaveBeenCalledWith('bag:categories', DEFAULT_CATEGORIES)
    expect(mockGetKV).toHaveBeenCalledWith('bag:evolution', DEFAULT_EVOLUTION)
    expect(store.categories.length).toBe(7)
    expect(store.evolution.length).toBe(4)
  })

  // ============================================================
  // 2. Overview 计算属性
  // ============================================================
  it('计算概览统计 totalItems', () => {
    const store = useBagStore()
    // 5 + 5 + 4 + 4 + 3 + 4 + 3 = 28
    expect(store.overview.totalItems).toBe(28)
  })

  it('计算概览统计 avgProficiency（四舍五入）', () => {
    const store = useBagStore()
    // (65 + 72 + 58 + 45 + 38 + 55 + 42) / 7 = 375 / 7 ≈ 53.57 → 54
    expect(store.overview.avgProficiency).toBe(54)
  })

  it('计算概览统计 masteredItems（proficiency >= 80 的分类数）', () => {
    const store = useBagStore()
    // 默认数据中无 proficiency >= 80 的分类
    expect(store.overview.masteredItems).toBe(0)
  })

  // ============================================================
  // 2.5. CategoryDistribution 类型聚合
  // ============================================================
  it('categoryDistribution 返回 7 个类型条目', () => {
    const store = useBagStore()
    expect(store.categoryDistribution.length).toBe(7)
  })

  it('categoryDistribution 按 categoryType 聚合计算 itemCount', () => {
    const store = useBagStore()
    // 'design' 对应 references(4) + inspirations(3) = 7
    const design = store.categoryDistribution.find(c => c.value === 'design')
    expect(design).toBeDefined()
    expect(design!.itemCount).toBe(7)
    // 'tool' 对应 tools(5)
    const tool = store.categoryDistribution.find(c => c.value === 'tool')
    expect(tool).toBeDefined()
    expect(tool!.itemCount).toBe(5)
  })

  it('categoryDistribution 按 categoryType 聚合计算平均 proficiency', () => {
    const store = useBagStore()
    // 'design' 对应 references(55) + inspirations(42) → round((55+42)/2) = 49
    const design = store.categoryDistribution.find(c => c.value === 'design')
    expect(design).toBeDefined()
    expect(design!.proficiency).toBe(49)
    // 'tool' 对应 tools(65)
    const tool = store.categoryDistribution.find(c => c.value === 'tool')
    expect(tool).toBeDefined()
    expect(tool!.proficiency).toBe(65)
  })

  it('categoryDistribution 包含正确的 icon/label/color/bgColor', () => {
    const store = useBagStore()
    const framework = store.categoryDistribution.find(c => c.value === 'framework')
    expect(framework).toBeDefined()
    expect(framework!.icon).toBe('🧩')
    expect(framework!.label).toBe('框架')
    expect(framework!.color).toBe('#8ab87a')
  })

  it('categoryDistribution 与 CATEGORY_TYPES 顺序一致', () => {
    const store = useBagStore()
    store.categoryDistribution.forEach((cd, i) => {
      expect(cd.value).toBe(CATEGORY_TYPES[i].value)
    })
  })

  // ============================================================
  // 3. Search 过滤
  // ============================================================
  it('searchQuery 按分类名过滤', () => {
    const store = useBagStore()
    store.setSearchQuery('工具')
    expect(store.filteredCategories.length).toBe(1)
    expect(store.filteredCategories[0].name).toBe('工具')
  })

  it('搜索按物品名匹配', () => {
    const store = useBagStore()
    store.setSearchQuery('VS Code')
    expect(store.filteredCategories.length).toBe(1)
    expect(store.filteredCategories[0].name).toBe('工具')
  })

  it('搜索无匹配时返回空数组', () => {
    const store = useBagStore()
    store.setSearchQuery('xyz_not_exist')
    expect(store.filteredCategories.length).toBe(0)
  })

  it('清空搜索词恢复全部分类', () => {
    const store = useBagStore()
    store.setSearchQuery('工具')
    expect(store.filteredCategories.length).toBe(1)
    store.setSearchQuery('')
    expect(store.filteredCategories.length).toBe(7)
  })

  it('搜索不区分大小写', () => {
    const store = useBagStore()
    store.setSearchQuery('vs code')
    expect(store.filteredCategories.length).toBe(1)
    expect(store.filteredCategories[0].name).toBe('工具')
  })

  // ============================================================
  // 4. Edit Modal
  // ============================================================
  it('openEditModal 设置编辑状态并深拷贝物品列表', () => {
    const store = useBagStore()
    const cat = store.categories[0]
    store.openEditModal(cat)
    expect(store.editingCategory).toEqual(cat)
    expect(store.editFormItems.length).toBe(cat.items.length)
    // 验证深拷贝：修改编辑表单不影响原始数据
    store.editFormItems[0].name = 'Modified'
    expect(store.categories[0].items[0].name).not.toBe('Modified')
  })

  it('closeModal 清除编辑状态', () => {
    const store = useBagStore()
    store.openEditModal(store.categories[0])
    store.closeModal()
    expect(store.editingCategory).toBeNull()
    expect(store.editFormItems.length).toBe(0)
  })

  it('addItemToEdit 增加一行空白编辑行', () => {
    const store = useBagStore()
    store.openEditModal(store.categories[0])
    const initialLen = store.editFormItems.length
    store.addItemToEdit()
    expect(store.editFormItems.length).toBe(initialLen + 1)
    // 新增行应有默认值
    const newItem = store.editFormItems[store.editFormItems.length - 1]
    expect(newItem.name).toBe('')
    expect(newItem.proficiency).toBe(1)
    expect(newItem.note).toBe('')
  })

  it('removeItemFromEdit 移除指定索引的编辑行', () => {
    const store = useBagStore()
    store.openEditModal(store.categories[0])
    const initialLen = store.editFormItems.length
    store.removeItemFromEdit(0)
    expect(store.editFormItems.length).toBe(initialLen - 1)
  })

  it('removeItemFromEdit 移除中间行不影响其他行', () => {
    const store = useBagStore()
    store.openEditModal(store.categories[0])
    const secondItem = store.editFormItems[1]
    store.removeItemFromEdit(0)
    expect(store.editFormItems[0]).toEqual(secondItem)
  })

  it('saveCategoryItems 持久化修改并关闭模态框', () => {
    const store = useBagStore()
    store.openEditModal(store.categories[0])
    store.editFormItems[0].name = 'VSCode 新版本'
    store.saveCategoryItems()
    // 验证持久化调用
    expect(mockSetKV).toHaveBeenCalledWith('bag:categories', expect.any(Array))
    // 验证模态框关闭
    expect(store.editingCategory).toBeNull()
    // 验证编辑表单已清空
    expect(store.editFormItems.length).toBe(0)
  })

  it('saveCategoryItems 在 editingCategory 为 null 时直接返回', () => {
    const store = useBagStore()
    store.saveCategoryItems()
    // 未打开编辑模态框时不应调用 setKV
    expect(mockSetKV).not.toHaveBeenCalled()
  })

  // ============================================================
  // 5. Evolution 成长轨迹
  // ============================================================
  it('addEvolution 添加新成长轨迹并持久化', () => {
    const store = useBagStore()
    store.showAddEvolution = true
    store.newEvoForm.title = '测试成长'
    store.addEvolution()
    expect(store.evolution.length).toBe(5)
    expect(mockSetKV).toHaveBeenCalledWith('bag:evolution', expect.any(Array))
    // 表单应重置
    expect(store.showAddEvolution).toBe(false)
    expect(store.newEvoForm.title).toBe('')
  })

  it('addEvolution 空标题不添加', () => {
    const store = useBagStore()
    const len = store.evolution.length
    store.newEvoForm.title = ''
    store.addEvolution()
    expect(store.evolution.length).toBe(len)
    // 不应调用 setKV
    expect(mockSetKV).not.toHaveBeenCalledWith('bag:evolution', expect.any(Array))
  })

  it('addEvolution 空白标题不添加', () => {
    const store = useBagStore()
    const len = store.evolution.length
    store.newEvoForm.title = '   '
    store.addEvolution()
    expect(store.evolution.length).toBe(len)
  })

  it('syncLevelClass 将中文等级映射为 CSS class', () => {
    const store = useBagStore()
    store.newEvoForm.levelLabel = '精通'
    store.syncLevelClass()
    expect(store.newEvoForm.levelClass).toBe('master')
    store.newEvoForm.levelLabel = '进阶'
    store.syncLevelClass()
    expect(store.newEvoForm.levelClass).toBe('advanced')
    store.newEvoForm.levelLabel = '入门'
    store.syncLevelClass()
    expect(store.newEvoForm.levelClass).toBe('beginner')
    store.newEvoForm.levelLabel = '新增'
    store.syncLevelClass()
    expect(store.newEvoForm.levelClass).toBe('new')
  })

  it('syncLevelClass 未知等级默认映射为 new', () => {
    const store = useBagStore()
    store.newEvoForm.levelLabel = '未知等级'
    store.syncLevelClass()
    expect(store.newEvoForm.levelClass).toBe('new')
  })

  it('resetEvoForm 重置表单到默认值', () => {
    const store = useBagStore()
    store.newEvoForm.title = '测试'
    store.newEvoForm.icon = '🎯'
    store.resetEvoForm()
    expect(store.newEvoForm.title).toBe('')
    expect(store.newEvoForm.icon).toBe('🌟')
    expect(store.newEvoForm.levelLabel).toBe('新增')
    expect(store.newEvoForm.levelClass).toBe('new')
  })
})