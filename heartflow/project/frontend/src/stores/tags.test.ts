import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTagsStore } from './tags'

describe('tags store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v) },
      removeItem: (k: string) => { store.delete(k) },
      clear: () => store.clear(),
    })
    Object.defineProperty(globalThis, 'window', {
      value: { matchMedia: () => ({ matches: false }) },
      writable: true, configurable: true,
    })
  })

  it('初始状态标签列表为空', () => {
    const store = useTagsStore()
    expect(store.allTags).toEqual([])
    expect(store.categories).toEqual([])
  })

  it('addTag 添加自定义标签', () => {
    const store = useTagsStore()
    store.addTag('work')
    expect(store.allTags).toContain('work')
  })

  it('removeTag 移除自定义标签', () => {
    const store = useTagsStore()
    store.addTag('work')
    store.addTag('personal')
    store.removeTag('work')
    expect(store.allTags).not.toContain('work')
    expect(store.allTags).toContain('personal')
  })

  it('重复添加标签不产生重复', () => {
    const store = useTagsStore()
    store.addTag('test')
    store.addTag('test')
    expect(store.allTags.filter(t => t === 'test').length).toBe(1)
  })

  it('getTagColor 为同一标签返回相同颜色', () => {
    const store = useTagsStore()
    const c1 = store.getTagColor('work')
    const c2 = store.getTagColor('work')
    expect(c1).toBe(c2)
  })

  it('getTagColor 不同标签可能返回不同颜色', () => {
    const store = useTagsStore()
    const c1 = store.getTagColor('work')
    const c2 = store.getTagColor('life')
    // 颜色可能相同（哈希碰撞），但至少不是 undefined 或空
    expect(c1).toBeTruthy()
    expect(c2).toBeTruthy()
  })

  describe('树形分类', () => {
    it('addCategory 添加根分类', () => {
      const store = useTagsStore()
      const cat = store.addCategory('工作', '#ff0000')
      expect(cat.name).toBe('工作')
      expect(cat.color).toBe('#ff0000')
      expect(store.categories.length).toBe(1)
    })

    it('addCategory 添加到子分类', () => {
      const store = useTagsStore()
      const parent = store.addCategory('工作', '#ff0000')
      const child = store.addCategory('编程', '#00ff00', parent.id)
      expect(child.name).toBe('编程')
      expect(store.categories[0].children.length).toBe(1)
    })

    it('removeCategory 删除分类不报错', () => {
      const store = useTagsStore()
      const cat1 = store.addCategory('工作', '#ff0000')
      store.addCategory('生活', '#00ff00')
      // 删除操作不应抛出异常
      expect(() => store.removeCategory(cat1.id)).not.toThrow()
      // 删除不存在的分类不应抛出异常
      expect(() => store.removeCategory('nonexistent')).not.toThrow()
    })

    it('renameCategory 重命名分类', () => {
      const store = useTagsStore()
      const cat = store.addCategory('工作', '#ff0000')
      store.renameCategory(cat.id, '职业')
      expect(store.categories[0].name).toBe('职业')
    })

    it('recolorCategory 更改分类颜色', () => {
      const store = useTagsStore()
      const cat = store.addCategory('工作', '#ff0000')
      store.recolorCategory(cat.id, '#00ff00')
      expect(store.categories[0].color).toBe('#00ff00')
    })

    it('assignTagToCategory 分配标签到分类', () => {
      const store = useTagsStore()
      const cat = store.addCategory('工作', '#ff0000')
      store.assignTagToCategory(cat.id, 'coding')
      expect(store.categories[0].tags).toContain('coding')
    })

    it('unassignTagFromCategory 取消分配标签', () => {
      const store = useTagsStore()
      const cat = store.addCategory('工作', '#ff0000')
      store.assignTagToCategory(cat.id, 'coding')
      store.unassignTagFromCategory(cat.id, 'coding')
      expect(store.categories[0].tags).not.toContain('coding')
    })

    it('getCategoryForTag 返回标签所属分类', () => {
      const store = useTagsStore()
      const cat = store.addCategory('工作', '#ff0000')
      store.assignTagToCategory(cat.id, 'coding')
      expect(store.getCategoryForTag('coding')).toBe('工作')
    })

    it('getCategoryForTag 无匹配时返回 null', () => {
      const store = useTagsStore()
      expect(store.getCategoryForTag('nonexistent')).toBeNull()
    })

    it('分配标签到不存在的分类无副作用', () => {
      const store = useTagsStore()
      store.assignTagToCategory('invalid-id', 'coding')
      expect(store.categories.length).toBe(0)
    })
  })
})