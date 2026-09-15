// ============================================================
// 装修工坊 · 环境模板管理（可持久化薄委托）
// 包装 environment-templates 的纯函数模板引擎，
// 持有自定义模板状态并明文 JSON 落盘 hf:customization:env_templates
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'
import {
  createTemplate as engineCreateTemplate,
  updateTemplate as engineUpdateTemplate,
  BUILTIN_TEMPLATES,
  ATMOSPHERE_LABELS,
  ATMOSPHERE_COLORS,
} from './environment-templates'
import type { EnvironmentTemplate, AtmospherePreset } from './environment-templates'

/** 自定义模板存储键 */
export const TEMPLATE_STORAGE_KEY = 'hf:customization:env_templates'

/** 可选氛围列表（供创建下拉） */
export const ATMOSPHERE_OPTIONS: AtmospherePreset[] = Object.keys(ATMOSPHERE_COLORS) as AtmospherePreset[]

/** 密度中文标签 */
export const DENSITY_LABELS = {
  compact: '紧凑',
  standard: '标准',
  spacious: '宽敞',
} as const

/** 字体中文标签 */
export const FONT_LABELS = {
  serif: '衬线',
  'sans-serif': '无衬线',
  monospace: '等宽',
} as const

/** 过渡中文标签 */
export const TEMPLATE_TRANSITION_LABELS = {
  fade: '淡入',
  slide: '滑入',
  none: '无',
} as const

function loadCustomTemplates(): EnvironmentTemplate[] {
  try {
    const raw = storage.getKV<string>(TEMPLATE_STORAGE_KEY, '[]')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function useEnvironmentTemplates() {
  const customTemplates = ref<EnvironmentTemplate[]>(loadCustomTemplates())

  function persist() {
    storage.setKV(TEMPLATE_STORAGE_KEY, JSON.stringify(customTemplates.value))
  }

  /** 内置 + 自定义的完整模板列表 */
  const templates = computed<EnvironmentTemplate[]>(() => [...BUILTIN_TEMPLATES, ...customTemplates.value])

  const builtinCount = computed(() => BUILTIN_TEMPLATES.length)
  const customCount = computed(() => customTemplates.value.length)

  /** 创建自定义模板 */
  function create(
    name: string,
    atmosphere: AtmospherePreset,
    options: { description?: string; density?: 'compact' | 'standard' | 'spacious'; fontPreference?: 'serif' | 'sans-serif' | 'monospace'; transition?: 'fade' | 'slide' | 'none'; tags?: string[] } = {},
  ): EnvironmentTemplate | null {
    if (!name.trim()) return null
    const tpl = engineCreateTemplate(name.trim(), atmosphere, options)
    customTemplates.value.push(tpl)
    persist()
    return tpl
  }

  /** 更新自定义模板 */
  function update(
    id: string,
    updates: Partial<Pick<EnvironmentTemplate, 'name' | 'description' | 'atmosphere' | 'density' | 'fontPreference' | 'transition' | 'tags'>>,
  ): boolean {
    const idx = customTemplates.value.findIndex(t => t.id === id)
    if (idx === -1) return false
    customTemplates.value[idx] = engineUpdateTemplate(customTemplates.value[idx], updates)
    persist()
    return true
  }

  /** 删除自定义模板 */
  function remove(id: string): boolean {
    const idx = customTemplates.value.findIndex(t => t.id === id)
    if (idx === -1) return false
    customTemplates.value.splice(idx, 1)
    persist()
    return true
  }

  /** 按 id 查找（含内置） */
  function getById(id: string): EnvironmentTemplate | null {
    return templates.value.find(t => t.id === id) || null
  }

  /** 氛围中文标签 */
  function atmosphereLabel(atmosphere: AtmospherePreset): string {
    return ATMOSPHERE_LABELS[atmosphere] || atmosphere
  }

  return {
    templates,
    customTemplates,
    builtinCount,
    customCount,
    BUILTIN_TEMPLATES,
    ATMOSPHERE_LABELS,
    ATMOSPHERE_OPTIONS,
    DENSITY_LABELS,
    FONT_LABELS,
    TEMPLATE_TRANSITION_LABELS,
    create,
    update,
    remove,
    getById,
    atmosphereLabel,
  }
}

export type { EnvironmentTemplate, AtmospherePreset }