// ============================================================
// 劳酬 · 自定义分类引擎（INCR-23）
// 分类 CRUD(增删改/命名/配色/图标) + 多级层级(parentId) + 兼容既有 5收入+5支出键位迁移。
// 内置种子以既有键位(salary/tools/...)为 id，历史记录/预算/周期规则不受增删改影响；
// 纯函数负责合并/解析/树化，useCustomCategories 持有响应式合并列表并持久化用户覆盖。
// ============================================================
import { ref } from 'vue'
import { storage } from '../../engine/storage'
import { REWARD_STORAGE_KEYS } from './types'

export type CategoryKind = 'income' | 'expense'

export interface CustomCategory {
  id: string
  name: string
  kind: CategoryKind
  icon: string
  color: string
  /** 上级分类 id；null/缺省为顶级（多级层级） */
  parentId?: string | null
  /** 内置种子不可删除；可改色/名/图标（以覆盖形式持久化） */
  builtin?: boolean
  /** 遗留兼容键（表单历史 tool/course）：仅用于历史记录标签解析，不提供为可选项 */
  legacy?: boolean
}

export interface CategoryOption {
  value: string
  label: string
  icon: string
  color: string
  kind: CategoryKind
  /** 层级深度，0 为顶级；用于缩进展示 */
  depth: number
}

export interface CategoryMeta {
  label: string
  icon: string
  color: string
}

const CATEGORIES_KEY = REWARD_STORAGE_KEYS.CUSTOM_CATEGORIES

/** 内置种子：既有 5收入+5支出 键位 + Reward 表单遗留 tool/course 键，保证历史记录解析 */
const BUILTIN_SEED: CustomCategory[] = [
  { id: 'salary', name: '薪资', kind: 'income', icon: '💰', color: '#8a9a7a', builtin: true },
  { id: 'freelance', name: '自由职业', kind: 'income', icon: '✍️', color: '#6b9fc4', builtin: true },
  { id: 'investment', name: '投资收益', kind: 'income', icon: '📈', color: '#f0c040', builtin: true },
  { id: 'gift', name: '赠予', kind: 'income', icon: '🎁', color: '#d98c7a', builtin: true },
  { id: 'other-income', name: '其他', kind: 'income', icon: '📋', color: '#94a3b8', builtin: true },
  { id: 'tools', name: '工具', kind: 'expense', icon: '🔧', color: '#e0a96d', builtin: true },
  { id: 'learning', name: '学习', kind: 'expense', icon: '📚', color: '#6b9fc4', builtin: true },
  { id: 'health', name: '健康', kind: 'expense', icon: '💊', color: '#8a9a7a', builtin: true },
  { id: 'social', name: '社交', kind: 'expense', icon: '🤝', color: '#d98c7a', builtin: true },
  { id: 'other-expense', name: '其他', kind: 'expense', icon: '📋', color: '#94a3b8', builtin: true },
  // Reward 表单遗留键（与 tools/learning 同义），仅供历史记录标签解析，不作为可选项
  { id: 'tool', name: '工具', kind: 'expense', icon: '🔧', color: '#e0a96d', builtin: true, legacy: true },
  { id: 'course', name: '学习', kind: 'expense', icon: '📚', color: '#6b9fc4', builtin: true, legacy: true },
]

// ---- 纯函数 ----

/** 合并内置种子与用户自定义（按 id 覆盖；用户新增追加在后） */
export function buildMerged(custom: CustomCategory[]): CustomCategory[] {
  const map = new Map<string, CustomCategory>()
  for (const c of BUILTIN_SEED) map.set(c.id, { ...c })
  for (const c of custom) {
    const prev = map.get(c.id)
    map.set(c.id, { ...prev, ...c, builtin: prev?.builtin ?? c.builtin })
  }
  return [...map.values()]
}

/** 只保留需持久化的条目（用户新增，或对内置种子的覆盖）；内置原样条目不落库 */
export function customOnly(cats: CustomCategory[]): CustomCategory[] {
  const seed = new Map(BUILTIN_SEED.map(c => [c.id, c]))
  return cats.filter(c => {
    const s = seed.get(c.id)
    if (!s) return true
    return (
      s.name !== c.name ||
      s.icon !== c.icon ||
      s.color !== c.color ||
      (c.parentId ?? null) !== (s.parentId ?? null)
    )
  })
}

/** 某分类及其所有后代 id（用于级联删除） */
export function descendantIds(cats: CustomCategory[], id: string): string[] {
  const out = new Set([id])
  let changed = true
  while (changed) {
    changed = false
    for (const c of cats) {
      if (c.parentId && out.has(c.parentId) && !out.has(c.id)) {
        out.add(c.id)
        changed = true
      }
    }
  }
  return [...out]
}

/** 按 kind+key 解析分类元信息（找不到回退为原样展示） */
export function resolveMeta(kind: CategoryKind, cats: CustomCategory[], key: string): CategoryMeta {
  const hit = cats.find(c => c.kind === kind && c.id === key)
  if (hit) return { label: hit.name, icon: hit.icon, color: hit.color }
  return { label: key, icon: '📋', color: '#94a3b8' }
}

/** 不分收支类型解析（面板展示用，兼容 tool/course 等任意键） */
export function resolveMetaAny(cats: CustomCategory[], key: string): CategoryMeta {
  const hit = cats.find(c => c.id === key)
  if (hit) return { label: hit.name, icon: hit.icon, color: hit.color }
  return { label: key, icon: '📋', color: '#94a3b8' }
}

/** 生成扁平选项列表（父在前、子带深度缩进），用于表单下拉与树化展示 */
export function categoryOptions(kind: CategoryKind, cats: CustomCategory[]): CategoryOption[] {
  const out: CategoryOption[] = []
  const walk = (c: CustomCategory, depth: number): void => {
    out.push({ value: c.id, label: c.name, icon: c.icon, color: c.color, kind: c.kind, depth })
    cats
      .filter(x => x.parentId === c.id)
      .forEach(x => walk(x, depth + 1))
  }
  cats
    .filter(c => c.kind === kind && !c.parentId && !c.legacy)
    .forEach(c => walk(c, 0))
  return out
}

function slug(name: string): string {
  return name.toLowerCase().trim().replace(/[^\w\u4e00-\u9fa5]+/g, '-') || 'cat'
}
function uniqueId(name: string, cats: CustomCategory[]): string {
  const base = slug(name)
  if (!cats.some(c => c.id === base)) return base
  let i = 2
  while (cats.some(c => c.id === `${base}-${i}`)) i++
  return `${base}-${i}`
}

// ---- 响应式注册表（跨组件共享单实例）----
const categoriesRef = ref<CustomCategory[]>(buildMerged([]))
let loaded = false

function ensureLoaded(): void {
  if (loaded) return
  categoriesRef.value = buildMerged(storage.getKV<CustomCategory[]>(CATEGORIES_KEY, []))
  loaded = true
}

/** 仅测试用：重置注册表缓存 */
export function resetCategoryRegistry(): void {
  loaded = false
  categoriesRef.value = buildMerged([])
}

export function useCustomCategories() {
  ensureLoaded()
  const cats = categoriesRef

  function persist(): void {
    storage.setKV(CATEGORIES_KEY, customOnly(cats.value))
  }

  function create(data: {
    name: string
    kind: CategoryKind
    icon: string
    color: string
    parentId?: string | null
  }): CustomCategory {
    const cat: CustomCategory = { id: uniqueId(data.name, cats.value), ...data, parentId: data.parentId ?? null }
    cats.value.push(cat)
    persist()
    return cat
  }

  function update(id: string, patch: Partial<CustomCategory>): void {
    const i = cats.value.findIndex(c => c.id === id)
    if (i >= 0) {
      const builtin = cats.value[i].builtin
      cats.value[i] = { ...cats.value[i], ...patch, builtin }
      persist()
    }
  }

  function remove(id: string): void {
    const target = cats.value.find(c => c.id === id)
    if (!target || target.builtin) return // 内置分类不可删除
    const dels = new Set(descendantIds(cats.value, id))
    cats.value = cats.value.filter(c => !dels.has(c.id))
    persist()
  }

  function load(): void {
    cats.value = buildMerged(storage.getKV<CustomCategory[]>(CATEGORIES_KEY, []))
  }

  return { categories: cats, create, update, remove, load }
}

// ---- 跨组件标签/图标/选项解析（响应式：随注册表变化）----
export function categoryLabel(kind: CategoryKind, key: string): string {
  ensureLoaded()
  return resolveMeta(kind, categoriesRef.value, key).label
}
export function categoryIcon(kind: CategoryKind, key: string): string {
  ensureLoaded()
  return resolveMeta(kind, categoriesRef.value, key).icon
}
export function categoryColor(kind: CategoryKind, key: string): string {
  ensureLoaded()
  return resolveMeta(kind, categoriesRef.value, key).color
}
export function categoryLabelAny(key: string): string {
  ensureLoaded()
  return resolveMetaAny(categoriesRef.value, key).label
}
export function categoryIconAny(key: string): string {
  ensureLoaded()
  return resolveMetaAny(categoriesRef.value, key).icon
}
export function categoryOptionsFor(kind: CategoryKind): CategoryOption[] {
  ensureLoaded()
  return categoryOptions(kind, categoriesRef.value)
}
