// ============================================================
// 数据可视化基础框架 · 风格包引擎
// 风格包创建、应用、导入/导出
// ============================================================

import type { VisualizationStylePack, MetaphorConfig, MetaphorType } from '../types'
import { getMetaphor } from '../metaphors'

// ============================================================
// 内部状态
// ============================================================

/** 内置风格包注册表 */
const builtInRegistry = new Map<string, VisualizationStylePack>()

/** 用户自定义风格包 */
const customRegistry = new Map<string, VisualizationStylePack>()

// ============================================================
// 公共 API
// ============================================================

/**
 * 创建新的风格包
 *
 * @param id - 风格包唯一标识
 * @param name - 风格包显示名称
 * @param metaphor - 关联的视觉隐喻类型
 * @param overrides - 可选的自定义覆盖配置（部分覆盖隐喻默认配置）
 * @param description - 可选的风格包描述
 * @returns 新创建的 VisualizationStylePack 实例
 *
 * @example
 * ```ts
 * const pack = createStylePack('my-pack', '我的风格', 'light', {
 *   palette: { primary: '#ff0000' }
 * })
 * ```
 */
export function createStylePack(
  id: string,
  name: string,
  metaphor: MetaphorType,
  overrides?: Partial<MetaphorConfig>,
  description?: string,
): VisualizationStylePack {
  const pack: VisualizationStylePack = {
    id,
    name,
    description,
    metaphor,
    isBuiltIn: false,
    overrides,
  }

  customRegistry.set(id, pack)
  return pack
}

/**
 * 注册内置风格包（仅供 presets 内部使用）
 *
 * @param pack - 要注册的内置风格包
 */
export function registerBuiltInPack(pack: VisualizationStylePack): void {
  builtInRegistry.set(pack.id, { ...pack, isBuiltIn: true })
}

/**
 * 应用风格包，返回合并后的部分 MetaphorConfig
 *
 * 合并规则：
 * 1. 以隐喻的默认配置为基础
 * 2. 用风格包的 overrides 覆盖对应字段
 * 3. palette 字段做深度合并（仅覆盖存在的键）
 *
 * @param pack - 要应用的风格包
 * @returns 合并后的部分 MetaphorConfig，可直接与默认配置合并
 *
 * @example
 * ```ts
 * const config = applyStylePack(myPack)
 * // config 包含基础隐喻 + 风格包覆盖后的调色板等
 * ```
 */
export function applyStylePack(pack: VisualizationStylePack): Partial<MetaphorConfig> {
  const base = getMetaphor(pack.metaphor)
  const overrides = pack.overrides

  if (!overrides) {
    return { ...base }
  }

  // 从基础隐喻开始合并
  const result: Partial<MetaphorConfig> = {
    type: overrides.type ?? base.type,
    name: overrides.name ?? base.name,
    description: overrides.description ?? base.description,
  }

  // 深度合并 palette
  if (overrides.palette) {
    result.palette = {
      ...base.palette,
      ...overrides.palette,
    }
  } else {
    result.palette = { ...base.palette }
  }

  // 深度合并 defaults
  if (overrides.defaults) {
    const mergedDefaults = { ...base.defaults }
    for (const [key, val] of Object.entries(overrides.defaults)) {
      if (val) {
        mergedDefaults[key as keyof typeof mergedDefaults] = {
          ...mergedDefaults[key as keyof typeof mergedDefaults],
          ...val,
        } as Record<string, string>
      }
    }
    result.defaults = mergedDefaults
  } else {
    result.defaults = { ...base.defaults }
  }

  return result
}

/**
 * 将风格包导出为可序列化 JSON
 *
 * @param pack - 要导出的风格包
 * @returns 可安全 JSON.stringify 的纯对象
 *
 * @example
 * ```ts
 * const json = exportStylePack(myPack)
 * localStorage.setItem('style-pack', JSON.stringify(json))
 * ```
 */
export function exportStylePack(pack: VisualizationStylePack): Record<string, unknown> {
  return {
    id: pack.id,
    name: pack.name,
    description: pack.description,
    metaphor: pack.metaphor,
    isBuiltIn: pack.isBuiltIn,
    overrides: pack.overrides ? JSON.parse(JSON.stringify(pack.overrides)) : undefined,
  }
}

/**
 * 从 JSON 导入风格包（带校验）
 *
 * 校验规则：
 * - id 必须为非空字符串
 * - name 必须为非空字符串
 * - metaphor 必须是有效的 MetaphorType
 * - overrides 为可选字段
 *
 * @param json - 要导入的 JSON 对象
 * @returns 导入成功的 VisualizationStylePack
 * @throws 当 JSON 格式无效或字段不合法时抛出错误
 *
 * @example
 * ```ts
 * try {
 *   const pack = importStylePack(JSON.parse(rawJson))
 *   customRegistry.set(pack.id, pack)
 * } catch (e) {
 *   console.error('导入失败:', e)
 * }
 * ```
 */
export function importStylePack(json: Record<string, unknown>): VisualizationStylePack {
  const errors: string[] = []

  // 校验 id
  if (typeof json.id !== 'string' || json.id.trim().length === 0) {
    errors.push('id 必须为非空字符串')
  }

  // 校验 name
  if (typeof json.name !== 'string' || json.name.trim().length === 0) {
    errors.push('name 必须为非空字符串')
  }

  // 校验 metaphor
  const validMetaphors: MetaphorType[] = [
    'light', 'ink', 'wood', 'fire', 'water', 'earth', 'metal', 'mist', 'star', 'crystal',
  ]
  if (!validMetaphors.includes(json.metaphor as MetaphorType)) {
    errors.push(`metaphor 必须是有效的 MetaphorType（${validMetaphors.join(', ')}）`)
  }

  if (errors.length > 0) {
    throw new Error(`风格包导入校验失败：${errors.join('；')}`)
  }

  const pack: VisualizationStylePack = {
    id: json.id as string,
    name: json.name as string,
    description: typeof json.description === 'string' ? json.description : undefined,
    metaphor: json.metaphor as MetaphorType,
    isBuiltIn: false,
    overrides: json.overrides ? (json.overrides as Partial<MetaphorConfig>) : undefined,
  }

  customRegistry.set(pack.id, pack)
  return pack
}

/**
 * 根据 ID 获取风格包（优先查找内置包，再查找自定义包）
 *
 * @param id - 风格包 ID
 * @returns 找到的风格包，未找到时返回 undefined
 */
export function getStylePack(id: string): VisualizationStylePack | undefined {
  return builtInRegistry.get(id) ?? customRegistry.get(id)
}

/**
 * 删除自定义风格包
 *
 * @param id - 要删除的风格包 ID
 * @returns 是否成功删除
 */
export function deleteStylePack(id: string): boolean {
  return customRegistry.delete(id)
}

/**
 * 获取所有注册的风格包列表（内置 + 自定义）
 *
 * @returns 所有风格包数组
 */
export function getAllStylePacks(): VisualizationStylePack[] {
  return [...builtInRegistry.values(), ...customRegistry.values()]
}

/**
 * 获取所有自定义风格包列表
 *
 * @returns 自定义风格包数组
 */
export function getCustomStylePacks(): VisualizationStylePack[] {
  return [...customRegistry.values()]
}