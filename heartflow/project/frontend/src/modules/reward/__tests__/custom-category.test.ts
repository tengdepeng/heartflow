// ============================================================
// custom-category 自定义分类引擎测试（INCR-23）
// 内置种子合并/覆盖、层级级联、元数据解析、存储读写
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { store, mockGetKV, mockSetKV } = vi.hoisted(() => {
  const store: Record<string, unknown> = {}
  return {
    store,
    mockGetKV: vi.fn((k: string, d?: unknown): unknown => store[k] ?? d),
    mockSetKV: vi.fn((k: string, v: unknown): void => {
      store[k] = v
    }),
  }
})

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: mockGetKV,
    setKV: mockSetKV,
  },
}))

import {
  useCustomCategories,
  resetCategoryRegistry,
  buildMerged,
  customOnly,
  descendantIds,
  resolveMeta,
  resolveMetaAny,
  categoryOptions,
  categoryLabelAny,
  categoryIconAny,
  categoryColor,
  categoryOptionsFor,
  type CustomCategory,
} from '../custom-category'

const CATEGORIES_KEY = 'hf:reward_custom_categories'

function cat(o: Partial<CustomCategory> = {}): CustomCategory {
  return {
    id: o.id ?? 'c1',
    name: o.name ?? '测试',
    kind: o.kind ?? 'expense',
    icon: o.icon ?? '📦',
    color: o.color ?? '#8a9a7a',
    parentId: o.parentId ?? null,
    ...o,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  delete store[CATEGORIES_KEY]
  resetCategoryRegistry()
})

describe('buildMerged 内置种子合并', () => {
  it('无自定义时返回 12 个内置分类（5收入+5支出+tool/course 遗留键）', () => {
    const merged = buildMerged([])
    expect(merged.length).toBe(12)
    expect(merged.filter(c => c.kind === 'income').map(c => c.id).sort()).toEqual(
      ['freelance', 'gift', 'investment', 'other-income', 'salary'],
    )
    expect(merged.filter(c => c.kind === 'expense').map(c => c.id).sort()).toEqual(
      ['course', 'health', 'learning', 'other-expense', 'social', 'tool', 'tools'],
    )
    expect(merged.every(c => c.builtin)).toBe(true)
  })

  it('用户新增分类按 id 追加，builtin 保持未定义', () => {
    const merged = buildMerged([cat({ id: 'pet', name: '宠物' })])
    expect(merged.map(c => c.id)).toContain('pet')
    const pet = merged.find(c => c.id === 'pet')!
    expect(pet.builtin).toBeUndefined()
    expect(pet.name).toBe('宠物')
  })

  it('覆盖内置分类保留 builtin 标记（不可删除）', () => {
    const merged = buildMerged([cat({ id: 'salary', name: '月薪', builtin: false })])
    const salary = merged.find(c => c.id === 'salary')!
    expect(salary.name).toBe('月薪')
    expect(salary.builtin).toBe(true)
  })
})

describe('customOnly 持久化过滤', () => {
  it('内置原样条目不落库', () => {
    const merged = buildMerged([])
    expect(customOnly(merged)).toEqual([])
  })

  it('覆盖的内置条目与新增条目落库', () => {
    const merged = buildMerged([
      cat({ id: 'salary', name: '月薪' }),
      cat({ id: 'pet', name: '宠物' }),
    ])
    const only = customOnly(merged)
    expect(only.map(c => c.id).sort()).toEqual(['pet', 'salary'])
  })
})

describe('descendantIds 级联后代', () => {
  const cats = [
    cat({ id: 'food', name: '餐饮' }),
    cat({ id: 'takeout', name: '外卖', parentId: 'food' }),
    cat({ id: 'delivery', name: '跑腿', parentId: 'takeout' }),
    cat({ id: 'health', name: '健康' }),
  ]
  it('无后代时只返回自身', () => {
    expect(descendantIds(cats, 'health')).toEqual(['health'])
  })
  it('返回自身及全部子孙（含深层）', () => {
    expect(descendantIds(cats, 'food').sort()).toEqual(['delivery', 'food', 'takeout'])
  })
})

describe('resolveMeta / resolveMetaAny 元数据解析', () => {
  const cats = buildMerged([])
  it('按 kind+id 命中返回分类元信息', () => {
    expect(resolveMeta('income', cats, 'salary')).toEqual({
      label: '薪资',
      icon: '💰',
      color: '#8a9a7a',
    })
    expect(resolveMeta('expense', cats, 'tool')).toMatchObject({ label: '工具' })
  })
  it('未命中回退为原样展示', () => {
    expect(resolveMeta('income', cats, 'tool')).toEqual({
      label: 'tool',
      icon: '📋',
      color: '#94a3b8',
    })
  })
  it('resolveMetaAny 不分收支类型解析（tool/course 遗留键兼容）', () => {
    expect(resolveMetaAny(cats, 'tool').label).toBe('工具')
    expect(resolveMetaAny(cats, 'course').label).toBe('学习')
    expect(resolveMetaAny(cats, 'salary').label).toBe('薪资')
    expect(resolveMetaAny(cats, 'unknown-key').label).toBe('unknown-key')
  })
})

describe('categoryOptions 树化选项', () => {
  const cats = buildMerged([
    cat({ id: 'food', name: '餐饮' }),
    cat({ id: 'takeout', name: '外卖', parentId: 'food' }),
    cat({ id: 'pet', name: '宠物' }),
  ])
  it('父在前、子带深度缩进', () => {
    const opts = categoryOptions('expense', cats)
    const idx = (id: string) => opts.findIndex(o => o.value === id)
    expect(idx('food')).toBeLessThan(idx('takeout'))
    expect(opts.find(o => o.value === 'takeout')!.depth).toBe(1)
    expect(opts.find(o => o.value === 'food')!.depth).toBe(0)
  })
  it('只返回对应收支类型', () => {
    const incomeOpts = categoryOptions('income', cats)
    expect(incomeOpts.every(o => o.kind === 'income')).toBe(true)
  })

  it('遗留兼容键 tool/course 不出现在选项中（仅历史标签解析用）', () => {
    const opts = categoryOptions('expense', buildMerged([]))
    const ids = opts.map(o => o.value)
    expect(ids).toContain('tools')
    expect(ids).toContain('learning')
    expect(ids).not.toContain('tool')
    expect(ids).not.toContain('course')
  })
})

describe('useCustomCategories 存储读写', () => {
  it('create 新增分类并仅持久化用户新增（内置不落库）', () => {
    const cc = useCustomCategories()
    cc.create({ name: '宠物', kind: 'expense', icon: '🐾', color: '#c46a5a' })
    expect(cc.categories.value.some(c => c.id === '宠物')).toBe(true)
    const persisted = mockSetKV.mock.calls.find(call => call[0] === CATEGORIES_KEY)
    expect(persisted).toBeTruthy()
    const saved = persisted![1] as CustomCategory[]
    expect(saved.map(c => c.id)).toEqual(['宠物'])
  })

  it('update 覆盖内置分类（改色/改名）并持久化覆盖', () => {
    const cc = useCustomCategories()
    cc.update('salary', { name: '月薪', color: '#f0c040' })
    const salary = cc.categories.value.find(c => c.id === 'salary')!
    expect(salary.name).toBe('月薪')
    expect(salary.builtin).toBe(true) // 内置不可删除，但可覆盖
    const saved = (mockSetKV.mock.calls.find(call => call[0] === CATEGORIES_KEY)![1] as CustomCategory[])
    expect(saved.map(c => c.id)).toEqual(['salary'])
  })

  it('remove 拒绝删除内置分类', () => {
    const cc = useCustomCategories()
    cc.remove('salary')
    expect(cc.categories.value.some(c => c.id === 'salary')).toBe(true)
  })

  it('remove 级联删除自定义分类及其后代', () => {
    const cc = useCustomCategories()
    cc.create({ name: '餐饮', kind: 'expense', icon: '🍜', color: '#c46a5a' })
    cc.create({ name: '外卖', kind: 'expense', icon: '🛵', color: '#e0a96d', parentId: '餐饮' })
    cc.remove('餐饮')
    expect(cc.categories.value.some(c => c.id === '餐饮')).toBe(false)
    expect(cc.categories.value.some(c => c.id === '外卖')).toBe(false)
  })

  it('create 同名分类 id 自动加后缀去重', () => {
    const cc = useCustomCategories()
    cc.create({ name: '宠物', kind: 'expense', icon: '🐾', color: '#c46a5a' })
    const second = cc.create({ name: '宠物', kind: 'expense', icon: '🐱', color: '#c46a5a' })
    expect(second.id).toBe('宠物-2')
  })

  it('load 重读外部写入', () => {
    store[CATEGORIES_KEY] = [cat({ id: 'ext', name: '外部' })]
    const cc = useCustomCategories()
    expect(cc.categories.value.some(c => c.id === 'ext')).toBe(true)
  })
})

describe('全局解析器（响应式，随注册表变化）', () => {
  it('categoryLabelAny 解析内置与用户新增', () => {
    const cc = useCustomCategories()
    cc.create({ name: '宠物', kind: 'expense', icon: '🐾', color: '#c46a5a' })
    expect(categoryLabelAny('宠物')).toBe('宠物')
    expect(categoryLabelAny('tool')).toBe('工具')
  })

  it('categoryColor 按 kind 解析颜色，未知回退灰色', () => {
    expect(categoryColor('expense', 'social')).toBe('#d98c7a')
    expect(categoryColor('income', 'nope')).toBe('#94a3b8')
  })

  it('categoryIconAny 未命中回退 📋', () => {
    expect(categoryIconAny('salary')).toBe('💰')
    expect(categoryIconAny('missing')).toBe('📋')
  })

  it('categoryOptionsFor 返回带深度选项且随增删刷新', () => {
    const cc = useCustomCategories()
    expect(categoryOptionsFor('income').map(o => o.value)).toContain('salary')
    cc.create({ name: '副业', kind: 'income', icon: '💻', color: '#6b9fc4' })
    expect(categoryOptionsFor('income').some(o => o.value === '副业')).toBe(true)
  })
})
