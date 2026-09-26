// ============================================================
// 行囊 · Pinia Store（真实定义）
// ⚠️ 本文件由 index.ts 拆出：真实定义下沉到此处，index.ts 只做 re-export。
//    原因：bridge 从 barrel 取符号、barrel 又 re-export bridge，
//    构成 index ↔ bridge 循环依赖。新增符号请在此定义并由 index.ts 转发。
// ============================================================

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { BagItem, CategoryItem, EvolutionEntry, BagOverview } from './types'
import { CATEGORY_TYPES, DEFAULT_CATEGORIES, DEFAULT_EVOLUTION } from './defaults'
import { getKV, setKV } from '../../engine/storage/kv'

const CATEGORIES_KEY = 'bag:categories'
const EVOLUTION_KEY = 'bag:evolution'

/** 将存储中的旧数据（string[]）规范化为 BagItem[] */
function normalizeItem(item: any): BagItem {
  if (typeof item === 'string') {
    return { name: item, proficiency: 1 }
  }
  return { name: item.name || '', proficiency: item.proficiency ?? 1, note: item.note }
}

function normalizeCategory(cat: any): CategoryItem {
  return {
    id: cat.id,
    name: cat.name,
    icon: cat.icon,
    color: cat.color,
    proficiency: cat.proficiency ?? 0,
    categoryType: cat.categoryType ?? 'tool',
    items: (cat.items || []).map(normalizeItem),
  }
}

export const useBagStore = defineStore('bag', () => {
  // ---- 状态 ----
  const searchQuery = ref('')
  const editingCategory = ref<CategoryItem | null>(null)
  const editFormItems = ref<BagItem[]>([])
  const showAddEvolution = ref(false)
  const newEvoForm = ref<EvolutionEntry>({
    icon: '🌟',
    title: '',
    date: new Date().toISOString().slice(0, 10),
    levelLabel: '新增',
    levelClass: 'new',
  })

  // ---- 缓存数据 ----
  const savedCategories = getKV<CategoryItem[]>(CATEGORIES_KEY, DEFAULT_CATEGORIES)
  const evolution = getKV<EvolutionEntry[]>(EVOLUTION_KEY, DEFAULT_EVOLUTION)

  // ---- 计算属性 ----
  const categories = computed<CategoryItem[]>(() => {
    const saved = savedCategories
    if (saved.length === 7) {
      return saved.map(normalizeCategory)
    }
    return DEFAULT_CATEGORIES.map((def, i) => {
      const merged = { ...def, ...(saved[i] ?? {}) }
      return normalizeCategory(merged)
    })
  })

  const overview = computed<BagOverview>(() => {
    const cats = categories.value
    const totalItems = cats.reduce((sum, c) => sum + c.items.length, 0)
    const avgProficiency = Math.round(cats.reduce((sum, c) => sum + c.proficiency, 0) / cats.length)
    const masteredItems = cats.filter(c => c.proficiency >= 80).length
    return { totalItems, avgProficiency, masteredItems }
  })

  const filteredCategories = computed<CategoryItem[]>(() => {
    const q = searchQuery.value.trim().toLowerCase()
    if (!q) return categories.value
    return categories.value.filter(cat => {
      const nameMatch = cat.name.toLowerCase().includes(q)
      const itemMatch = cat.items.some(item => item.name.toLowerCase().includes(q))
      return nameMatch || itemMatch
    })
  })

  /** 按抽象类别类型聚合的分布统计 */
  const categoryDistribution = computed(() => {
    const cats = categories.value
    return CATEGORY_TYPES.map((typeInfo) => {
      const matched = cats.filter(c => c.categoryType === typeInfo.value)
      const itemCount = matched.reduce((sum, c) => sum + c.items.length, 0)
      const proficiency = matched.length > 0
        ? Math.round(matched.reduce((sum, c) => sum + c.proficiency, 0) / matched.length)
        : 0
      return {
        ...typeInfo,
        itemCount,
        proficiency,
      }
    })
  })

  // ---- 操作 ----

  function setSearchQuery(query: string) {
    searchQuery.value = query
  }

  function openEditModal(cat: CategoryItem) {
    editingCategory.value = cat
    editFormItems.value = JSON.parse(JSON.stringify(cat.items))
  }

  function closeModal() {
    editingCategory.value = null
    editFormItems.value = []
  }

  function addItemToEdit() {
    editFormItems.value.push({ name: '', proficiency: 1, note: '' })
  }

  function removeItemFromEdit(idx: number) {
    editFormItems.value.splice(idx, 1)
  }

  function saveCategoryItems() {
    if (!editingCategory.value) return
    const target = savedCategories.find((c: any) => c.id === editingCategory.value!.id)
    if (target) {
      target.items = editFormItems.value.map(item => ({ ...item }))
      setKV(CATEGORIES_KEY, savedCategories)
    }
    closeModal()
  }

  function handleProficiencyClick(event: MouseEvent, cat: CategoryItem) {
    const track = (event.currentTarget as HTMLElement).querySelector('.bcc-progress-track')
    if (!track) return
    const rect = track.getBoundingClientRect()
    const x = event.clientX - rect.left
    const pct = Math.round((x / rect.width) * 100)
    const stepped = Math.round(pct / 5) * 5
    const clamped = Math.max(0, Math.min(100, stepped))
    const target = savedCategories.find((c: any) => c.id === cat.id)
    if (target) {
      target.proficiency = clamped
      setKV(CATEGORIES_KEY, savedCategories)
    }
  }

  /** 键盘步进熟练度（Enter/方向键），与点击定位共用持久化逻辑 */
  function setProficiencyByStep(cat: CategoryItem, delta: number) {
    const target = savedCategories.find((c: any) => c.id === cat.id)
    if (!target) return
    target.proficiency = Math.max(0, Math.min(100, target.proficiency + delta))
    setKV(CATEGORIES_KEY, savedCategories)
  }

  function syncLevelClass() {
    const map: Record<string, string> = {
      '精通': 'master',
      '进阶': 'advanced',
      '入门': 'beginner',
      '新增': 'new',
    }
    newEvoForm.value.levelClass = map[newEvoForm.value.levelLabel] || 'new'
  }

  function resetEvoForm() {
    newEvoForm.value = {
      icon: '🌟',
      title: '',
      date: new Date().toISOString().slice(0, 10),
      levelLabel: '新增',
      levelClass: 'new',
    }
  }

  function addEvolution() {
    if (!newEvoForm.value.title.trim()) return
    evolution.push({ ...newEvoForm.value })
    setKV(EVOLUTION_KEY, evolution)
    showAddEvolution.value = false
    resetEvoForm()
  }

  return {
    // state
    searchQuery,
    editingCategory,
    editFormItems,
    showAddEvolution,
    newEvoForm,
    savedCategories,
    evolution,
    // getters
    categories,
    overview,
    filteredCategories,
    categoryDistribution,
    // actions
    setSearchQuery,
    openEditModal,
    closeModal,
    addItemToEdit,
    removeItemFromEdit,
    saveCategoryItems,
    handleProficiencyClick,
    setProficiencyByStep,
    syncLevelClass,
    resetEvoForm,
    addEvolution,
  }
})
