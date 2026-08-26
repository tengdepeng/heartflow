// ============================================================
// 心流工坊 · 房间模板系统
// 管理房间布局模板、空间模板组合、预设场景
// 支持模板的创建、应用、导入导出、批量操作
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'
import { getAllRooms, type RoomNode } from '../../engine/room-graph'

// ============================================================
// 类型定义
// ============================================================

/** 模板类型 */
export type TemplateType = 'single' | 'combo' | 'layout' | 'scene'

/** 模板分类 */
export type TemplateCategory =
  | 'focus'      // 专注类
  | 'relax'       // 放松类
  | 'work'        // 工作类
  | 'learn'       // 学习类
  | 'social'      // 社交类
  | 'health'      // 健康类
  | 'creative'    // 创意类
  | 'review'      // 回顾类
  | 'custom'      // 自定义

/** 房间布局模板 */
export interface RoomLayoutTemplate {
  /** 布局ID */
  layoutId: string
  /** 布局名称 */
  name: string
  /** 布局描述 */
  description: string
  /** 布局类型 */
  type: 'grid' | 'list' | 'masonry' | 'timeline' | 'canvas' | 'custom'
  /** 列数 */
  columns: number
  /** 间距 */
  gap: number
  /** 内边距 */
  padding: number
  /** 是否显示标题 */
  showTitle: boolean
  /** 是否显示图标 */
  showIcon: boolean
  /** 卡片尺寸 */
  cardSize: 'small' | 'medium' | 'large'
  /** 自定义样式 */
  customStyle?: Record<string, string>
}

/** 空间模板 */
export interface SpaceTemplate {
  /** 模板ID */
  id: string
  /** 模板名称 */
  name: string
  /** 模板描述 */
  description: string
  /** 模板类型 */
  type: TemplateType
  /** 模板分类 */
  category: TemplateCategory
  /** 包含的房间ID列表 */
  roomIds: string[]
  /** 布局模板ID */
  layoutId?: string
  /** 预设标签 */
  tags: string[]
  /** 是否为内置模板 */
  builtIn: boolean
  /** 创建时间 */
  createdAt: string
  /** 更新时间 */
  updatedAt: string
  /** 使用次数 */
  useCount: number
  /** 图标 */
  icon: string
  /** 颜色 */
  color: string
}

/** 空间场景预设 */
export interface SpaceScenePreset {
  /** 场景ID */
  id: string
  /** 场景名称 */
  name: string
  /** 场景描述 */
  description: string
  /** 关联的模板ID */
  templateId?: string
  /** 房间配置映射 */
  roomConfigs: Record<string, RoomSceneConfig>
  /** 氛围设置 */
  atmosphere: SceneAtmosphere
  /** 创建时间 */
  createdAt: string
}

/** 房间场景配置 */
export interface RoomSceneConfig {
  roomId: string
  visible: boolean
  order: number
  group?: string
  customName?: string
  customIcon?: string
}

/** 场景氛围 */
export interface SceneAtmosphere {
  theme: 'light' | 'dark' | 'auto'
  background: string
  blur: number
  opacity: number
  animation: 'none' | 'fade' | 'slide' | 'scale'
}

// ============================================================
// 常量
// ============================================================

const STORAGE_KEYS = {
  templates: 'hf_space_templates',
  layouts: 'hf_room_layouts',
  scenes: 'hf_space_scenes',
  activeTemplate: 'hf_active_template',
} as const

/** 预设布局模板 */
const PRESET_LAYOUTS: RoomLayoutTemplate[] = [
  {
    layoutId: 'grid-default',
    name: '标准网格',
    description: '等间距网格布局，适合一般房间展示',
    type: 'grid',
    columns: 3,
    gap: 16,
    padding: 24,
    showTitle: true,
    showIcon: true,
    cardSize: 'medium',
  },
  {
    layoutId: 'grid-compact',
    name: '紧凑网格',
    description: '高密度网格布局，适合大量房间展示',
    type: 'grid',
    columns: 4,
    gap: 8,
    padding: 16,
    showTitle: true,
    showIcon: true,
    cardSize: 'small',
  },
  {
    layoutId: 'list-comfortable',
    name: '舒适列表',
    description: '大间距列表布局，适合浏览模式',
    type: 'list',
    columns: 1,
    gap: 12,
    padding: 24,
    showTitle: true,
    showIcon: true,
    cardSize: 'large',
  },
  {
    layoutId: 'masonry-default',
    name: '瀑布流',
    description: '自适应瀑布流布局，适合混合内容',
    type: 'masonry',
    columns: 3,
    gap: 12,
    padding: 20,
    showTitle: true,
    showIcon: true,
    cardSize: 'medium',
  },
  {
    layoutId: 'timeline-vertical',
    name: '时间线',
    description: '纵向时间线布局，适合回顾类内容',
    type: 'timeline',
    columns: 1,
    gap: 24,
    padding: 32,
    showTitle: true,
    showIcon: false,
    cardSize: 'large',
  },
  {
    layoutId: 'canvas-free',
    name: '自由画布',
    description: '自由拖拽画布，适合创意布局',
    type: 'canvas',
    columns: 1,
    gap: 0,
    padding: 0,
    showTitle: false,
    showIcon: false,
    cardSize: 'medium',
  },
]

/** 预设空间模板 */
const PRESET_TEMPLATES: SpaceTemplate[] = [
  {
    id: 'tmpl-morning-routine',
    name: '晨间仪式',
    description: '早晨启动套装：锚点 + 身体温室 + 逐日心锚',
    type: 'combo',
    category: 'focus',
    roomIds: ['anchor', 'body', 'goals'],
    layoutId: 'grid-compact',
    tags: ['早晨', '专注', '健康'],
    builtIn: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    useCount: 0,
    icon: '🌅',
    color: '#f59e6c',
  },
  {
    id: 'tmpl-deep-work',
    name: '深度工作',
    description: '专注工作场景：更漏 + 工痕 + 业脉',
    type: 'combo',
    category: 'work',
    roomIds: ['worklog', 'scar', 'career'],
    layoutId: 'grid-default',
    tags: ['工作', '专注', '生产力'],
    builtIn: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    useCount: 0,
    icon: '💼',
    color: '#6b9fc4',
  },
  {
    id: 'tmpl-evening-review',
    name: '晚间回顾',
    description: '晚间回顾场景：时间长廊 + 思绪书房 + 留光阁',
    type: 'combo',
    category: 'review',
    roomIds: ['timeline', 'study', 'archive'],
    layoutId: 'timeline-vertical',
    tags: ['回顾', '反思', '写作'],
    builtIn: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    useCount: 0,
    icon: '🌙',
    color: '#7c6cf5',
  },
  {
    id: 'tmpl-relax-care',
    name: '身心放松',
    description: '自我关怀：情绪花房 + 息壤 + 身体温室',
    type: 'combo',
    category: 'relax',
    roomIds: ['garden', 'rest', 'body'],
    layoutId: 'masonry-default',
    tags: ['放松', '情绪', '健康'],
    builtIn: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    useCount: 0,
    icon: '🧘',
    color: '#8a9a7a',
  },
  {
    id: 'tmpl-learning',
    name: '求知之旅',
    description: '学习探索：字镜阁 + 藏象阁 + 阅览殿',
    type: 'combo',
    category: 'learn',
    roomIds: ['word-mirror', 'wisdom', 'reading'],
    layoutId: 'grid-default',
    tags: ['学习', '阅读', '词汇'],
    builtIn: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    useCount: 0,
    icon: '📚',
    color: '#f0c040',
  },
  {
    id: 'tmpl-social-connect',
    name: '羁绊维系',
    description: '社交连接：羁绊之厅 + 根脉之庭 + 幕僚阁',
    type: 'combo',
    category: 'social',
    roomIds: ['relations', 'roots', 'advisors'],
    layoutId: 'list-comfortable',
    tags: ['社交', '关系', '家人'],
    builtIn: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    useCount: 0,
    icon: '💝',
    color: '#d98c7a',
  },
  {
    id: 'tmpl-creative-flow',
    name: '创意心流',
    description: '创意表达：逸趣阁 + 留光阁 + 平行世界',
    type: 'combo',
    category: 'creative',
    roomIds: ['play', 'archive', 'parallel'],
    layoutId: 'canvas-free',
    tags: ['创意', '游戏', '实验'],
    builtIn: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    useCount: 0,
    icon: '🎨',
    color: '#f59e6c',
  },
  {
    id: 'tmpl-health-track',
    name: '健康追踪',
    description: '健康管理：身体温室 + 动律之间 + 身体智慧',
    type: 'combo',
    category: 'health',
    roomIds: ['body', 'movement', 'body-wisdom'],
    layoutId: 'grid-default',
    tags: ['健康', '运动', '身体'],
    builtIn: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    useCount: 0,
    icon: '💪',
    color: '#8a9a7a',
  },
]

/** 模板分类标签 */
export const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  focus: '专注',
  relax: '放松',
  work: '工作',
  learn: '学习',
  social: '社交',
  health: '健康',
  creative: '创意',
  review: '回顾',
  custom: '自定义',
}

/** 模板分类图标 */
export const CATEGORY_ICONS: Record<TemplateCategory, string> = {
  focus: '🎯',
  relax: '😌',
  work: '💼',
  learn: '📖',
  social: '👥',
  health: '❤️',
  creative: '✨',
  review: '📝',
  custom: '🔧',
}

// ============================================================
// 可组合函数
// ============================================================

export function useRoomTemplates() {
  // ---- 状态 ----
  const templates = ref<SpaceTemplate[]>(
    storage.getKV<SpaceTemplate[]>(STORAGE_KEYS.templates, [...PRESET_TEMPLATES]),
  )
  const layouts = ref<RoomLayoutTemplate[]>(
    storage.getKV<RoomLayoutTemplate[]>(STORAGE_KEYS.layouts, [...PRESET_LAYOUTS]),
  )
  const scenes = ref<SpaceScenePreset[]>(
    storage.getKV<SpaceScenePreset[]>(STORAGE_KEYS.scenes, []),
  )
  const activeTemplateId = ref<string | null>(
    storage.getKV<string | null>(STORAGE_KEYS.activeTemplate, null),
  )

  // ---- Computed ----

  /** 内置模板 */
  const builtInTemplates = computed<SpaceTemplate[]>(() =>
    templates.value.filter(t => t.builtIn),
  )

  /** 自定义模板 */
  const customTemplates = computed<SpaceTemplate[]>(() =>
    templates.value.filter(t => !t.builtIn),
  )

  /** 按分类分组 */
  const templatesByCategory = computed<Record<TemplateCategory, SpaceTemplate[]>>(() => {
    const result: Record<string, SpaceTemplate[]> = {}
    for (const t of templates.value) {
      if (!result[t.category]) result[t.category] = []
      result[t.category].push(t)
    }
    return result as Record<TemplateCategory, SpaceTemplate[]>
  })

  /** 当前活跃模板 */
  const activeTemplate = computed<SpaceTemplate | undefined>(() =>
    activeTemplateId.value
      ? templates.value.find(t => t.id === activeTemplateId.value)
      : undefined,
  )

  /** 模板统计 */
  const templateStats = computed(() => ({
    total: templates.value.length,
    builtIn: builtInTemplates.value.length,
    custom: customTemplates.value.length,
    totalUses: templates.value.reduce((sum, t) => sum + t.useCount, 0),
    mostUsed: [...templates.value].sort((a, b) => b.useCount - a.useCount).slice(0, 5),
  }))

  // ---- 模板 CRUD ----

  /** 创建模板 */
  function createTemplate(
    name: string,
    overrides: Partial<Omit<SpaceTemplate, 'id' | 'name' | 'createdAt' | 'updatedAt' | 'useCount'>> = {},
  ): SpaceTemplate {
    const now = new Date().toISOString()
    const template: SpaceTemplate = {
      id: `tmpl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name,
      description: overrides.description ?? '',
      type: overrides.type ?? 'combo',
      category: overrides.category ?? 'custom',
      roomIds: overrides.roomIds ?? [],
      layoutId: overrides.layoutId ?? 'grid-default',
      tags: overrides.tags ?? [],
      builtIn: false,
      createdAt: now,
      updatedAt: now,
      useCount: 0,
      icon: overrides.icon ?? '📦',
      color: overrides.color ?? '#6b9fc4',
    }
    templates.value.push(template)
    persist()
    return template
  }

  /** 更新模板 */
  function updateTemplate(id: string, updates: Partial<SpaceTemplate>): SpaceTemplate | null {
    const idx = templates.value.findIndex(t => t.id === id)
    if (idx === -1) return null

    const template = templates.value[idx]
    if (template.builtIn) {
      // 内置模板不允许修改，创建副本
      return cloneBuiltInTemplate(id, updates)
    }

    Object.assign(template, {
      ...updates,
      updatedAt: new Date().toISOString(),
    })
    persist()
    return template
  }

  /** 克隆内置模板 */
  function cloneBuiltInTemplate(id: string, overrides: Partial<SpaceTemplate> = {}): SpaceTemplate | null {
    const source = templates.value.find(t => t.id === id)
    if (!source) return null

    const now = new Date().toISOString()
    const clone: SpaceTemplate = {
      ...source,
      id: `tmpl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: `${source.name}（副本）`,
      builtIn: false,
      createdAt: now,
      updatedAt: now,
      useCount: 0,
      ...overrides,
    }
    templates.value.push(clone)
    persist()
    return clone
  }

  /** 删除模板 */
  function deleteTemplate(id: string): boolean {
    const template = templates.value.find(t => t.id === id)
    if (!template || template.builtIn) return false

    const idx = templates.value.findIndex(t => t.id === id)
    if (idx === -1) return false

    templates.value.splice(idx, 1)
    if (activeTemplateId.value === id) {
      activeTemplateId.value = null
    }
    persist()
    return true
  }

  /** 应用模板 */
  function applyTemplate(id: string): boolean {
    const template = templates.value.find(t => t.id === id)
    if (!template) return false

    template.useCount++
    activeTemplateId.value = id
    persist()
    return true
  }

  // ---- 模板搜索 ----

  /** 搜索模板 */
  function searchTemplates(query: string): SpaceTemplate[] {
    if (!query.trim()) return templates.value
    const lower = query.toLowerCase()
    return templates.value.filter(t =>
      t.name.toLowerCase().includes(lower) ||
      t.description.toLowerCase().includes(lower) ||
      t.tags.some(tag => tag.toLowerCase().includes(lower)),
    )
  }

  /** 按分类筛选 */
  function filterByCategory(category: TemplateCategory | 'all'): SpaceTemplate[] {
    if (category === 'all') return templates.value
    return templates.value.filter(t => t.category === category)
  }

  /** 按标签筛选 */
  function filterByTag(tag: string): SpaceTemplate[] {
    return templates.value.filter(t => t.tags.includes(tag))
  }

  // ---- 布局管理 ----

  /** 获取所有布局 */
  function getAllLayouts(): RoomLayoutTemplate[] {
    return layouts.value
  }

  /** 获取布局 */
  function getLayout(layoutId: string): RoomLayoutTemplate | undefined {
    return layouts.value.find(l => l.layoutId === layoutId)
  }

  /** 创建布局 */
  function createLayout(
    name: string,
    overrides: Partial<Omit<RoomLayoutTemplate, 'layoutId' | 'name'>> = {},
  ): RoomLayoutTemplate {
    const layout: RoomLayoutTemplate = {
      layoutId: `layout_${Date.now()}`,
      name,
      description: overrides.description ?? '',
      type: overrides.type ?? 'grid',
      columns: overrides.columns ?? 3,
      gap: overrides.gap ?? 16,
      padding: overrides.padding ?? 24,
      showTitle: overrides.showTitle ?? true,
      showIcon: overrides.showIcon ?? true,
      cardSize: overrides.cardSize ?? 'medium',
      customStyle: overrides.customStyle,
    }
    layouts.value.push(layout)
    persist()
    return layout
  }

  /** 更新布局 */
  function updateLayout(layoutId: string, updates: Partial<RoomLayoutTemplate>): RoomLayoutTemplate | null {
    const layout = layouts.value.find(l => l.layoutId === layoutId)
    if (!layout) return null
    Object.assign(layout, updates)
    persist()
    return layout
  }

  /** 删除布局 */
  function deleteLayout(layoutId: string): boolean {
    const idx = layouts.value.findIndex(l => l.layoutId === layoutId)
    if (idx === -1) return false
    layouts.value.splice(idx, 1)
    persist()
    return true
  }

  // ---- 场景预设 ----

  /** 创建场景预设 */
  function createScene(
    name: string,
    overrides: Partial<Omit<SpaceScenePreset, 'id' | 'name' | 'createdAt'>> = {},
  ): SpaceScenePreset {
    const scene: SpaceScenePreset = {
      id: `scene_${Date.now()}`,
      name,
      description: overrides.description ?? '',
      templateId: overrides.templateId,
      roomConfigs: overrides.roomConfigs ?? {},
      atmosphere: overrides.atmosphere ?? {
        theme: 'auto',
        background: 'transparent',
        blur: 0,
        opacity: 1,
        animation: 'none',
      },
      createdAt: new Date().toISOString(),
    }
    scenes.value.push(scene)
    persist()
    return scene
  }

  /** 获取场景 */
  function getScene(sceneId: string): SpaceScenePreset | undefined {
    return scenes.value.find(s => s.id === sceneId)
  }

  /** 删除场景 */
  function deleteScene(sceneId: string): boolean {
    const idx = scenes.value.findIndex(s => s.id === sceneId)
    if (idx === -1) return false
    scenes.value.splice(idx, 1)
    persist()
    return true
  }

  // ---- 导入导出 ----

  /** 导出模板（JSON） */
  function exportTemplate(id: string): string | null {
    const template = templates.value.find(t => t.id === id)
    if (!template) return null
    return JSON.stringify(template, null, 2)
  }

  /** 导入模板 */
  function importTemplate(json: string): SpaceTemplate | null {
    try {
      const data = JSON.parse(json)
      if (!data.name || !Array.isArray(data.roomIds)) return null

      const now = new Date().toISOString()
      const template: SpaceTemplate = {
        ...data,
        id: `tmpl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        builtIn: false,
        createdAt: now,
        updatedAt: now,
        useCount: 0,
      }
      templates.value.push(template)
      persist()
      return template
    } catch {
      return null
    }
  }

  /** 批量导出 */
  function exportAll(): string {
    return JSON.stringify(templates.value, null, 2)
  }

  // ---- 房间验证 ----

  /** 验证模板中的房间是否存在 */
  function validateTemplateRooms(template: SpaceTemplate): { valid: boolean; missing: string[] } {
    const rooms = getAllRooms()
    const roomIds = new Set(rooms.map(r => r.id))
    const missing = template.roomIds.filter(id => !roomIds.has(id))
    return { valid: missing.length === 0, missing }
  }

  /** 获取模板包含的房间节点 */
  function getTemplateRooms(templateId: string): RoomNode[] {
    const template = templates.value.find(t => t.id === templateId)
    if (!template) return []

    const rooms = getAllRooms()
    const roomMap = new Map(rooms.map(r => [r.id, r]))
    return template.roomIds
      .map(id => roomMap.get(id))
      .filter((r): r is RoomNode => r !== undefined)
  }

  // ---- 标签管理 ----

  /** 获取所有标签 */
  function getAllTags(): string[] {
    const tagSet = new Set<string>()
    for (const t of templates.value) {
      for (const tag of t.tags) {
        tagSet.add(tag)
      }
    }
    return [...tagSet].sort()
  }

  /** 添加标签 */
  function addTag(templateId: string, tag: string): void {
    const template = templates.value.find(t => t.id === templateId)
    if (!template || template.tags.includes(tag)) return
    template.tags.push(tag)
    template.updatedAt = new Date().toISOString()
    persist()
  }

  /** 移除标签 */
  function removeTag(templateId: string, tag: string): void {
    const template = templates.value.find(t => t.id === templateId)
    if (!template) return
    template.tags = template.tags.filter(t => t !== tag)
    template.updatedAt = new Date().toISOString()
    persist()
  }

  // ---- 重置 ----

  function reset(): void {
    templates.value = [...PRESET_TEMPLATES]
    layouts.value = [...PRESET_LAYOUTS]
    scenes.value = []
    activeTemplateId.value = null
    persist()
  }

  // ---- 持久化 ----

  function persist(): void {
    storage.setKV(STORAGE_KEYS.templates, templates.value)
    storage.setKV(STORAGE_KEYS.layouts, layouts.value)
    storage.setKV(STORAGE_KEYS.scenes, scenes.value)
    storage.setKV(STORAGE_KEYS.activeTemplate, activeTemplateId.value)
  }

  return {
    // 状态
    templates,
    layouts,
    scenes,
    activeTemplateId,

    // 计算属性
    builtInTemplates,
    customTemplates,
    templatesByCategory,
    activeTemplate,
    templateStats,

    // 模板 CRUD
    createTemplate,
    updateTemplate,
    cloneBuiltInTemplate,
    deleteTemplate,
    applyTemplate,

    // 搜索筛选
    searchTemplates,
    filterByCategory,
    filterByTag,

    // 布局
    getAllLayouts,
    getLayout,
    createLayout,
    updateLayout,
    deleteLayout,

    // 场景
    createScene,
    getScene,
    deleteScene,

    // 导入导出
    exportTemplate,
    importTemplate,
    exportAll,

    // 验证
    validateTemplateRooms,
    getTemplateRooms,

    // 标签
    getAllTags,
    addTag,
    removeTag,

    // 管理
    reset,
    persist,
  }
}