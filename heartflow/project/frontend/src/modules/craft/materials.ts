// ============================================================
// 匠庐 · 材料管理系统
// 管理创作材料的增删改查、使用记录、统计与持久化
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '@/engine/storage'

// ============================================================
// 类型定义
// ============================================================

export type MaterialRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

export interface Material {
  id: string
  name: string
  icon: string
  rarity: MaterialRarity
  quantity: number
  unit: string
  maxQuantity: number
  description: string
  tags: string[]
  obtainedAt: string
  updatedAt: string
}

export interface MaterialUsage {
  materialId: string
  workId: string
  quantity: number
  usedAt: string
}

export interface MaterialStats {
  totalMaterials: number
  totalQuantity: number
  byRarity: Record<MaterialRarity, number>
  lowStock: Material[]
  recentlyObtained: Material[]
}

// ============================================================
// 常量
// ============================================================

export const MATERIAL_RARITY_META: Record<MaterialRarity, { label: string; color: string; multiplier: number }> = {
  common:    { label: '普通',   color: '#9CA3AF', multiplier: 1 },
  uncommon:  { label: '非凡',   color: '#22C55E', multiplier: 1.5 },
  rare:      { label: '稀有',   color: '#6b9fc4', multiplier: 2 },
  epic:      { label: '史诗',   color: '#a07c8c', multiplier: 3 },
  legendary: { label: '传说',   color: '#e0a96d', multiplier: 5 },
}

export const CRAFT_STORAGE_KEYS = {
  MATERIALS: 'craft:materials',
  USAGES: 'craft:usages',
} as const

export const DEFAULT_MATERIALS: Material[] = [
  {
    id: 'inspiration-fragment',
    name: '灵感碎片',
    icon: 'sparkles',
    rarity: 'common',
    quantity: 0,
    unit: '片',
    maxQuantity: 100,
    description: '闪耀着微弱光芒的灵感碎片，是最基础的创作素材，随处可见却不可或缺',
    tags: ['灵感', '基础'],
    obtainedAt: '',
    updatedAt: '',
  },
  {
    id: 'time-crystal',
    name: '时间结晶',
    icon: 'gem',
    rarity: 'uncommon',
    quantity: 0,
    unit: '颗',
    maxQuantity: 50,
    description: '在专注时光中凝结而成的晶体，蕴含着时间的沉淀与耐心',
    tags: ['时间', '沉淀'],
    obtainedAt: '',
    updatedAt: '',
  },
  {
    id: 'focus-essence',
    name: '专注精华',
    icon: 'flask-conical',
    rarity: 'rare',
    quantity: 0,
    unit: '滴',
    maxQuantity: 30,
    description: '深度专注状态下提炼的精华，每一滴都承载着极致的注意力',
    tags: ['专注', '精华'],
    obtainedAt: '',
    updatedAt: '',
  },
  {
    id: 'creative-spark',
    name: '创意火花',
    icon: 'flame',
    rarity: 'uncommon',
    quantity: 0,
    unit: '朵',
    maxQuantity: 60,
    description: '思维碰撞中迸发的火花，点燃创作的热情与想象力',
    tags: ['创意', '灵感'],
    obtainedAt: '',
    updatedAt: '',
  },
  {
    id: 'craftsman-hammer',
    name: '匠心之锤',
    icon: 'hammer',
    rarity: 'epic',
    quantity: 0,
    unit: '把',
    maxQuantity: 10,
    description: '千锤百炼的匠心凝聚而成的神锤，能将粗糙的创意打磨成精品',
    tags: ['匠心', '打磨'],
    obtainedAt: '',
    updatedAt: '',
  },
  {
    id: 'knowledge-spring',
    name: '知识之泉',
    icon: 'book-open',
    rarity: 'rare',
    quantity: 0,
    unit: '卷',
    maxQuantity: 40,
    description: '从浩瀚书海中汲取的知识甘泉，源源不断地滋养创作根基',
    tags: ['知识', '积累'],
    obtainedAt: '',
    updatedAt: '',
  },
  {
    id: 'tranquility-dew',
    name: '宁静之露',
    icon: 'droplets',
    rarity: 'uncommon',
    quantity: 0,
    unit: '滴',
    maxQuantity: 50,
    description: '清晨第一缕宁静中凝结的露珠，抚平浮躁，带来澄明心境',
    tags: ['宁静', '心境'],
    obtainedAt: '',
    updatedAt: '',
  },
  {
    id: 'breakthrough-star',
    name: '突破之星',
    icon: 'star',
    rarity: 'legendary',
    quantity: 0,
    unit: '颗',
    maxQuantity: 5,
    description: '突破创作瓶颈时从天际坠落的星辰，蕴含着改变一切的力量',
    tags: ['突破', '传奇'],
    obtainedAt: '',
    updatedAt: '',
  },
]

// ============================================================
// Composable
// ============================================================

export function useCraftMaterials() {
  // ---- 状态 ----
  const materials = ref<Material[]>([])
  const usages = ref<MaterialUsage[]>([])

  // ---- 持久化 ----
  async function load() {
    const savedMaterials = storage.getKV<Material[]>(CRAFT_STORAGE_KEYS.MATERIALS, DEFAULT_MATERIALS)
    const savedUsages = storage.getKV<MaterialUsage[]>(CRAFT_STORAGE_KEYS.USAGES, [])
    materials.value = savedMaterials
    usages.value = savedUsages
  }

  async function persist() {
    storage.setKV(CRAFT_STORAGE_KEYS.MATERIALS, materials.value)
    storage.setKV(CRAFT_STORAGE_KEYS.USAGES, usages.value)
  }

  // ---- 材料 CRUD ----

  function addMaterial(material: Material): boolean {
    if (materials.value.some(m => m.id === material.id)) return false
    const now = new Date().toISOString()
    materials.value.push({
      ...material,
      obtainedAt: material.obtainedAt || now,
      updatedAt: now,
    })
    persist()
    return true
  }

  function updateMaterial(id: string, updates: Partial<Material>): boolean {
    const material = materials.value.find(m => m.id === id)
    if (!material) return false
    Object.assign(material, updates, { updatedAt: new Date().toISOString() })
    persist()
    return true
  }

  function removeMaterial(id: string): boolean {
    const idx = materials.value.findIndex(m => m.id === id)
    if (idx === -1) return false
    materials.value.splice(idx, 1)
    persist()
    return true
  }

  function getMaterial(id: string): Material | undefined {
    return materials.value.find(m => m.id === id)
  }

  // ---- 使用记录 ----

  function recordUsage(materialId: string, workId: string, quantity: number): boolean {
    const material = getMaterial(materialId)
    if (!material || material.quantity < quantity) return false

    material.quantity -= quantity
    material.updatedAt = new Date().toISOString()

    usages.value.push({
      materialId,
      workId,
      quantity,
      usedAt: new Date().toISOString(),
    })

    persist()
    return true
  }

  // ---- 统计 ----

  const getStats = computed<MaterialStats>(() => {
    const totalMaterials = materials.value.length
    const totalQuantity = materials.value.reduce((sum, m) => sum + m.quantity, 0)

    const byRarity: Record<MaterialRarity, number> = {
      common: 0,
      uncommon: 0,
      rare: 0,
      epic: 0,
      legendary: 0,
    }
    for (const m of materials.value) {
      byRarity[m.rarity]++
    }

    const lowStock = materials.value.filter(m => m.quantity < m.maxQuantity * 0.2)

    const recentlyObtained = [...materials.value]
      .filter(m => m.obtainedAt)
      .sort((a, b) => b.obtainedAt.localeCompare(a.obtainedAt))
      .slice(0, 5)

    return {
      totalMaterials,
      totalQuantity,
      byRarity,
      lowStock,
      recentlyObtained,
    }
  })

  // ---- 低库存材料 ----

  const getLowStockMaterials = computed<Material[]>(() => {
    return materials.value.filter(m => m.quantity < m.maxQuantity * 0.2)
  })

  // ---- 作品材料查询 ----

  function getMaterialsForWork(workId: string): (MaterialUsage & { material?: Material })[] {
    return usages.value
      .filter(u => u.workId === workId)
      .map(u => ({
        ...u,
        material: getMaterial(u.materialId),
      }))
  }

  // ---- 初始化 ----
  load()

  return {
    // state
    materials,
    usages,
    // actions
    addMaterial,
    updateMaterial,
    removeMaterial,
    getMaterial,
    recordUsage,
    // computed
    getStats,
    getLowStockMaterials,
    // queries
    getMaterialsForWork,
    // persistence
    load,
    persist,
    // constants
    MATERIAL_RARITY_META,
    CRAFT_STORAGE_KEYS,
  }
}