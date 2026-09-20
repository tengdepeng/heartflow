// ============================================================
// 数据可视化基础框架 · 材质工坊引擎
// 视觉材质的管理、编辑与存储
// ============================================================

import { storage } from '../../../engine/storage'
import type { MetaphorType, MetaphorPalette, MetaphorConfig } from '../types'

// ============================================================
// 类型定义
// ============================================================

/** 材质分类（蓝图声明：发光/水墨/自然/手工/几何/音波/纹理基底） */
export type MaterialGroup = 'glow' | 'ink' | 'nature' | 'handcraft' | 'geometry' | 'wave' | 'texture'

/** 视觉材质 */
export interface VisualMaterial {
  id: string
  name: string
  metaphor: MetaphorType
  palette: Partial<MetaphorPalette>
  elementDefaults: Partial<MetaphorConfig['defaults']>
  createdAt: number
  updatedAt: number
  /** 所属分类（预置材质必带） */
  group?: MaterialGroup
}

/** 材质创建配置 */
export interface MaterialCreateConfig {
  name: string
  metaphor: MetaphorType
  palette: Partial<MetaphorPalette>
  elementDefaults?: Partial<MetaphorConfig['defaults']>
  /** 所属分类 */
  group?: MaterialGroup
}

/** 材质更新字段 */
export type MaterialUpdates = Partial<Pick<VisualMaterial, 'name' | 'metaphor' | 'palette' | 'elementDefaults' | 'group'>>

// ============================================================
// 内部状态
// ============================================================

/** 材质存储（明文 JSON 落盘于 storage kvStore，无存储环境时降级为内存态） */
const materialStore = new Map<string, VisualMaterial>()

/** 材质库存储键 */
export const MATERIALS_STORAGE_KEY = 'hf:visualization:materials'

let loaded = false

/** 首次访问时从 storage 惰性恢复（避免并发写覆盖既有数据） */
function ensureLoaded(): void {
  if (loaded) return
  loaded = true
  try {
    const saved = storage.getKV<VisualMaterial[] | null>(MATERIALS_STORAGE_KEY, null)
    if (Array.isArray(saved)) {
      materialStore.clear()
      for (const m of saved) {
        if (m && typeof m.id === 'string') materialStore.set(m.id, m)
      }
    }
  } catch {
    /* 无存储环境（测试/降级）保持内存态 */
  }
}

/** 全量写回 storage（明文 JSON） */
function persistStore(): void {
  try {
    storage.setKV(MATERIALS_STORAGE_KEY, [...materialStore.values()])
  } catch {
    /* 无存储环境静默降级为内存态 */
  }
}

// ============================================================
// 公共 API
// ============================================================

/**
 * 创建新材质
 *
 * 生成唯一 ID 并记录创建时间戳。材质创建后自动存入内存存储。
 *
 * @param name - 材质名称
 * @param config - 材质创建配置
 * @returns 新创建的 VisualMaterial 实例
 *
 * @example
 * ```ts
 * const material = createMaterial('温暖琥珀', {
 *   name: '温暖琥珀',
 *   metaphor: 'light',
 *   palette: { primary: '#e8b84a', secondary: '#f0d080' },
 *   elementDefaults: { point: { radius: '6' } }
 * })
 * ```
 */
export function createMaterial(
  name: string,
  config: MaterialCreateConfig,
): VisualMaterial {
  ensureLoaded()
  const now = Date.now()
  const material: VisualMaterial = {
    id: generateMaterialId(),
    name,
    metaphor: config.metaphor,
    palette: { ...config.palette },
    elementDefaults: config.elementDefaults ? deepCloneDefaults(config.elementDefaults) : {},
    createdAt: now,
    updatedAt: now,
    group: config.group,
  }

  materialStore.set(material.id, material)
  persistStore()
  return material
}

/**
 * 编辑已有材质
 *
 * 对指定材质的字段进行部分更新，自动刷新 updatedAt 时间戳。
 * 只更新提供的字段，未提供的字段保持不变。
 *
 * @param materialId - 要编辑的材质 ID
 * @param updates - 需要更新的字段
 * @returns 更新后的 VisualMaterial
 * @throws 当材质 ID 不存在时抛出错误
 *
 * @example
 * ```ts
 * const updated = editMaterial('mat_abc123', {
 *   name: '新名称',
 *   palette: { primary: '#ff0000' }
 * })
 * ```
 */
export function editMaterial(
  materialId: string,
  updates: MaterialUpdates,
): VisualMaterial {
  ensureLoaded()
  const existing = materialStore.get(materialId)
  if (!existing) {
    throw new Error(`材质不存在：${materialId}`)
  }

  const updated: VisualMaterial = {
    ...existing,
    updatedAt: Date.now(),
  }

  if (updates.name !== undefined) {
    updated.name = updates.name
  }
  if (updates.metaphor !== undefined) {
    updated.metaphor = updates.metaphor
  }
  if (updates.palette !== undefined) {
    updated.palette = { ...existing.palette, ...updates.palette }
  }
  if (updates.elementDefaults !== undefined) {
    updated.elementDefaults = deepMergeDefaults(existing.elementDefaults, updates.elementDefaults)
  }
  if (updates.group !== undefined) {
    updated.group = updates.group
  }

  materialStore.set(materialId, updated)
  persistStore()
  return updated
}

/**
 * 保存材质到存储
 *
 * 如果材质已存在则更新，否则新增。与 createMaterial/editMaterial 不同，
 * 此函数直接接受完整的 VisualMaterial 对象，适合从外部存储还原的场景。
 *
 * @param material - 要保存的 VisualMaterial 对象
 * @returns 保存后的 VisualMaterial
 */
export function saveMaterial(material: VisualMaterial): VisualMaterial {
  ensureLoaded()
  const now = Date.now()
  const existing = materialStore.get(material.id)

  const saved: VisualMaterial = {
    ...material,
    palette: { ...material.palette },
    elementDefaults: deepCloneDefaults(material.elementDefaults),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }

  materialStore.set(material.id, saved)
  persistStore()
  return saved
}

/**
 * 获取材质库列表
 *
 * 返回所有已创建的材质，按更新时间倒序排列（最新的在前）。
 *
 * @returns 材质数组，按更新时间降序排列
 *
 * @example
 * ```ts
 * const library = getMaterialLibrary()
 * library.forEach(m => console.log(m.name, m.metaphor))
 * ```
 */
export function getMaterialLibrary(): VisualMaterial[] {
  ensureLoaded()
  return [...materialStore.values()].sort((a, b) => b.updatedAt - a.updatedAt)
}

/**
 * 根据 ID 获取单个材质
 *
 * @param materialId - 材质 ID
 * @returns 对应的材质，未找到时返回 undefined
 */
export function getMaterial(materialId: string): VisualMaterial | undefined {
  ensureLoaded()
  return materialStore.get(materialId)
}

/**
 * 删除材质
 *
 * 从存储中移除指定材质。
 *
 * @param materialId - 要删除的材质 ID
 * @returns 是否成功删除（false 表示材质不存在）
 *
 * @example
 * ```ts
 * if (deleteMaterial('mat_abc123')) {
 *   console.log('材质已删除')
 * }
 * ```
 */
export function deleteMaterial(materialId: string): boolean {
  ensureLoaded()
  const removed = materialStore.delete(materialId)
  if (removed) persistStore()
  return removed
}

/**
 * 清空所有材质（主要用于测试）
 */
export function clearMaterialStore(): void {
  ensureLoaded()
  materialStore.clear()
  persistStore()
}

/**
 * 获取材质库中的材质数量
 *
 * @returns 材质数量
 */
export function getMaterialCount(): number {
  ensureLoaded()
  return materialStore.size
}

// ============================================================
// 内部工具函数
// ============================================================

/**
 * 生成唯一材质 ID
 * 格式：mat_ 前缀 + 8 位随机十六进制字符串
 */
function generateMaterialId(): string {
  const random = Math.random().toString(16).substring(2, 10)
  return `mat_${random}`
}

/**
 * 深拷贝 elementDefaults
 * 确保返回的新对象与原对象无引用关系
 */
function deepCloneDefaults(
  defaults: Partial<MetaphorConfig['defaults']>,
): Partial<MetaphorConfig['defaults']> {
  const cloned: Partial<MetaphorConfig['defaults']> = {}
  for (const [key, val] of Object.entries(defaults)) {
    if (val) {
      cloned[key as keyof typeof defaults] = { ...val } as Record<string, string>
    }
  }
  return cloned
}

/**
 * 深度合并 elementDefaults
 * 用更新的字段覆盖原字段，仅合并第一层
 */
function deepMergeDefaults(
  base: Partial<MetaphorConfig['defaults']>,
  updates: Partial<MetaphorConfig['defaults']>,
): Partial<MetaphorConfig['defaults']> {
  const merged = deepCloneDefaults(base)
  for (const [key, val] of Object.entries(updates)) {
    if (val) {
      merged[key as keyof typeof updates] = {
        ...(merged[key as keyof typeof updates] ?? {}),
        ...val,
      } as Record<string, string>
    }
  }
  return merged
}