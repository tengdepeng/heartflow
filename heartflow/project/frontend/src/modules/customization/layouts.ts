// ============================================================
// 应用空间 · 布局模板与主题系统
// 布局模板库 + 主题系统 + 空间快照
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'

// ---- 类型定义 ----

/** 布局类型 */
export type LayoutType = 'grid' | 'list' | 'masonry' | 'freeform' | 'radial' | 'spiral' | 'honeycomb'

/** 布局模板 */
export interface LayoutTemplate {
  id: string
  name: string
  type: LayoutType
  description: string
  /** 列数（grid模式） */
  columns?: number
  /** 间距 */
  gap: number
  /** 各房间的位置配置 */
  roomPositions: RoomPosition[]
  /** 是否为预设 */
  preset: boolean
  /** 缩略图描述 */
  thumbnail?: string
}

/** 房间位置 */
export interface RoomPosition {
  roomId: string
  x: number
  y: number
  width: number
  height: number
  zIndex?: number
}

/** 主题类型 */
export type ThemeMode = 'light' | 'dark' | 'auto'

/** 主题色系 */
export type ThemeAccent = 'blue' | 'purple' | 'green' | 'orange' | 'rose' | 'teal' | 'amber' | 'custom'

/** 主题定义 */
export interface Theme {
  id: string
  name: string
  mode: ThemeMode
  accent: ThemeAccent
  /** 主色调 */
  primaryColor: string
  /** 背景色 */
  backgroundColor: string
  /** 表面色 */
  surfaceColor: string
  /** 文字色 */
  textColor: string
  /** 次要文字色 */
  mutedTextColor: string
  /** 边框色 */
  borderColor: string
  /** 阴影 */
  shadow: string
  /** 圆角 */
  borderRadius: number
  /** 字体 */
  fontFamily: string
  /** 是否为预设 */
  preset: boolean
}

/** 空间快照 */
export interface SpaceSnapshot {
  id: string
  name: string
  description: string
  /** 快照时间 */
  timestamp: string
  /** 关联的空间配置 ID */
  spaceConfigId: string
  /** 布局模板 ID */
  layoutTemplateId: string
  /** 主题 ID */
  themeId: string
  /** 房间位置快照 */
  roomPositions: RoomPosition[]
  /** 标签 */
  tags: string[]
}

// ---- 元数据 ----

export const LAYOUT_TYPE_META: Record<LayoutType, { label: string; icon: string; desc: string }> = {
  grid: { label: '网格', icon: '⊞', desc: '规整的网格布局，适合多房间展示' },
  list: { label: '列表', icon: '☰', desc: '垂直列表布局，适合线性浏览' },
  masonry: { label: '瀑布流', icon: '▥', desc: '错落有致的瀑布流布局' },
  freeform: { label: '自由', icon: '✦', desc: '完全自由的拖拽布局' },
  radial: { label: '放射', icon: '⊙', desc: '以中心为圆心的放射状布局' },
  spiral: { label: '螺旋', icon: '◎', desc: '黄金螺旋布局，优雅的视觉流动' },
  honeycomb: { label: '蜂巢', icon: '⬡', desc: '六边形蜂巢布局，紧密高效' },
}

export const THEME_ACCENT_META: Record<ThemeAccent, { label: string; color: string }> = {
  blue: { label: '蔚蓝', color: '#6c9cf5' },
  purple: { label: '紫韵', color: '#a78bfa' },
  green: { label: '翠微', color: '#34d399' },
  orange: { label: '暖橙', color: '#f6b26b' },
  rose: { label: '玫红', color: '#f472b6' },
  teal: { label: '青碧', color: '#2dd4bf' },
  amber: { label: '琥珀', color: '#f0c040' },
  custom: { label: '自定义', color: '#ffffff' },
}

// ---- 预设布局模板 ----

const PRESET_LAYOUTS: LayoutTemplate[] = [
  {
    id: 'layout_grid_3x3',
    name: '经典九宫格',
    type: 'grid',
    description: '3x3 网格布局，经典规整，一目了然',
    columns: 3,
    gap: 16,
    roomPositions: [],
    preset: true,
  },
  {
    id: 'layout_grid_2xN',
    name: '双列流',
    type: 'grid',
    description: '2列网格布局，适合内容较多的空间',
    columns: 2,
    gap: 20,
    roomPositions: [],
    preset: true,
  },
  {
    id: 'layout_radial_core',
    name: '核心放射',
    type: 'radial',
    description: '以核心房间为中心的放射状布局',
    gap: 24,
    roomPositions: [],
    preset: true,
  },
  {
    id: 'layout_spiral_golden',
    name: '黄金螺旋',
    type: 'spiral',
    description: '遵循黄金比例的螺旋布局，视觉流动自然',
    gap: 18,
    roomPositions: [],
    preset: true,
  },
  {
    id: 'layout_honeycomb_nest',
    name: '蜂巢工坊',
    type: 'honeycomb',
    description: '六边形蜂巢布局，空间利用率高',
    gap: 12,
    roomPositions: [],
    preset: true,
  },
  {
    id: 'layout_freeform_canvas',
    name: '自由画布',
    type: 'freeform',
    description: '完全自由的拖拽布局，随心所欲',
    gap: 0,
    roomPositions: [],
    preset: true,
  },
  {
    id: 'layout_masonry_cascade',
    name: '层叠瀑布',
    type: 'masonry',
    description: '瀑布流布局，错落有致',
    columns: 3,
    gap: 16,
    roomPositions: [],
    preset: true,
  },
  {
    id: 'layout_list_compact',
    name: '紧凑列表',
    type: 'list',
    description: '紧凑的垂直列表，最大化信息密度',
    gap: 8,
    roomPositions: [],
    preset: true,
  },
]

// ---- 预设主题 ----

const PRESET_THEMES: Theme[] = [
  {
    id: 'theme_dusk',
    name: '暮光',
    mode: 'dark',
    accent: 'blue',
    primaryColor: '#6c9cf5',
    backgroundColor: '#0f1117',
    surfaceColor: '#1a1d27',
    textColor: '#e4e6ed',
    mutedTextColor: '#7a7f8c',
    borderColor: '#2a2d37',
    shadow: '0 2px 12px rgba(0,0,0,0.3)',
    borderRadius: 8,
    fontFamily: 'system-ui',
    preset: true,
  },
  {
    id: 'theme_forest',
    name: '深林',
    mode: 'dark',
    accent: 'green',
    primaryColor: '#34d399',
    backgroundColor: '#0d1f17',
    surfaceColor: '#152a20',
    textColor: '#d4ede0',
    mutedTextColor: '#6b8a7a',
    borderColor: '#1f3d2e',
    shadow: '0 2px 12px rgba(0,0,0,0.3)',
    borderRadius: 8,
    fontFamily: 'system-ui',
    preset: true,
  },
  {
    id: 'theme_lavender',
    name: '薰衣草',
    mode: 'dark',
    accent: 'purple',
    primaryColor: '#a78bfa',
    backgroundColor: '#1a1525',
    surfaceColor: '#261f35',
    textColor: '#e8e0f5',
    mutedTextColor: '#8a7f9c',
    borderColor: '#352d45',
    shadow: '0 2px 12px rgba(0,0,0,0.3)',
    borderRadius: 8,
    fontFamily: 'system-ui',
    preset: true,
  },
  {
    id: 'theme_sunset',
    name: '落日',
    mode: 'dark',
    accent: 'orange',
    primaryColor: '#f6b26b',
    backgroundColor: '#1f1810',
    surfaceColor: '#2a2018',
    textColor: '#f5e8d4',
    mutedTextColor: '#8a7a6b',
    borderColor: '#3d2e1f',
    shadow: '0 2px 12px rgba(0,0,0,0.3)',
    borderRadius: 8,
    fontFamily: 'system-ui',
    preset: true,
  },
  {
    id: 'theme_pearl',
    name: '珍珠白',
    mode: 'light',
    accent: 'blue',
    primaryColor: '#4a90d9',
    backgroundColor: '#f8f9fa',
    surfaceColor: '#ffffff',
    textColor: '#2c3e50',
    mutedTextColor: '#7f8c8d',
    borderColor: '#e0e4e8',
    shadow: '0 2px 12px rgba(0,0,0,0.08)',
    borderRadius: 8,
    fontFamily: 'system-ui',
    preset: true,
  },
  {
    id: 'theme_rose_garden',
    name: '玫瑰园',
    mode: 'dark',
    accent: 'rose',
    primaryColor: '#f472b6',
    backgroundColor: '#1f1018',
    surfaceColor: '#2a1822',
    textColor: '#f5d4e8',
    mutedTextColor: '#8a6b7a',
    borderColor: '#3d1f2e',
    shadow: '0 2px 12px rgba(0,0,0,0.3)',
    borderRadius: 8,
    fontFamily: 'system-ui',
    preset: true,
  },
  {
    id: 'theme_ocean',
    name: '深海',
    mode: 'dark',
    accent: 'teal',
    primaryColor: '#2dd4bf',
    backgroundColor: '#0d1f1f',
    surfaceColor: '#152a2a',
    textColor: '#d4f0ed',
    mutedTextColor: '#6b8a8a',
    borderColor: '#1f3d3d',
    shadow: '0 2px 12px rgba(0,0,0,0.3)',
    borderRadius: 8,
    fontFamily: 'system-ui',
    preset: true,
  },
  {
    id: 'theme_amber_glow',
    name: '琥珀光',
    mode: 'dark',
    accent: 'amber',
    primaryColor: '#f0c040',
    backgroundColor: '#1f1a0d',
    surfaceColor: '#2a2515',
    textColor: '#f5edc0',
    mutedTextColor: '#8a7f6b',
    borderColor: '#3d351f',
    shadow: '0 2px 12px rgba(0,0,0,0.3)',
    borderRadius: 8,
    fontFamily: 'system-ui',
    preset: true,
  },
]

// ---- 存储键 ----

const LAYOUTS_KEY = 'hf:customization:layouts'
const THEMES_KEY = 'hf:customization:themes'
const SNAPSHOTS_KEY = 'hf:customization:snapshots'
const ACTIVE_LAYOUT_KEY = 'hf:customization:active_layout'
const ACTIVE_THEME_KEY = 'hf:customization:active_theme'

// ---- 响应式状态 ----

const layouts = ref<LayoutTemplate[]>(loadLayouts())
const themes = ref<Theme[]>(loadThemes())
const snapshots = ref<SpaceSnapshot[]>(loadSnapshots())
const activeLayoutId = ref<string>(loadActiveLayout())
const activeThemeId = ref<string>(loadActiveTheme())

function loadLayouts(): LayoutTemplate[] {
  try {
    const saved = storage.getKV<LayoutTemplate[]>(LAYOUTS_KEY, [])
    return [...PRESET_LAYOUTS, ...saved.filter(l => !l.preset)]
  } catch { return [...PRESET_LAYOUTS] }
}

function loadThemes(): Theme[] {
  try {
    const saved = storage.getKV<Theme[]>(THEMES_KEY, [])
    return [...PRESET_THEMES, ...saved.filter(t => !t.preset)]
  } catch { return [...PRESET_THEMES] }
}

function loadSnapshots(): SpaceSnapshot[] {
  try { return storage.getKV<SpaceSnapshot[]>(SNAPSHOTS_KEY, []) }
  catch { return [] }
}

function loadActiveLayout(): string {
  try { return storage.getKV<string>(ACTIVE_LAYOUT_KEY, 'layout_grid_3x3') }
  catch { return 'layout_grid_3x3' }
}

function loadActiveTheme(): string {
  try { return storage.getKV<string>(ACTIVE_THEME_KEY, 'theme_dusk') }
  catch { return 'theme_dusk' }
}

function persistLayouts() {
  storage.setKV(LAYOUTS_KEY, layouts.value.filter(l => !l.preset))
}
function persistThemes() {
  storage.setKV(THEMES_KEY, themes.value.filter(t => !t.preset))
}
function persistSnapshots() { storage.setKV(SNAPSHOTS_KEY, snapshots.value) }
function persistActiveLayout() { storage.setKV(ACTIVE_LAYOUT_KEY, activeLayoutId.value) }
function persistActiveTheme() { storage.setKV(ACTIVE_THEME_KEY, activeThemeId.value) }

let counter = 0
function generateId(prefix: string): string {
  counter++
  return `${prefix}_${Date.now()}_${counter}`
}

// ---- 布局模板管理 ----

/**
 * 布局模板系统
 */
export function useLayoutTemplates() {
  /** 获取所有布局 */
  function getAllLayouts(): LayoutTemplate[] {
    return layouts.value
  }

  /** 获取预设布局 */
  function getPresetLayouts(): LayoutTemplate[] {
    return layouts.value.filter(l => l.preset)
  }

  /** 获取自定义布局 */
  function getCustomLayouts(): LayoutTemplate[] {
    return layouts.value.filter(l => !l.preset)
  }

  /** 按类型获取布局 */
  function getLayoutsByType(type: LayoutType): LayoutTemplate[] {
    return layouts.value.filter(l => l.type === type)
  }

  /** 获取布局详情 */
  function getLayout(id: string): LayoutTemplate | undefined {
    return layouts.value.find(l => l.id === id)
  }

  /** 创建自定义布局 */
  function createLayout(
    name: string,
    type: LayoutType,
    description: string,
    options?: { columns?: number; gap?: number },
  ): LayoutTemplate {
    const layout: LayoutTemplate = {
      id: generateId('layout'),
      name,
      type,
      description,
      columns: options?.columns,
      gap: options?.gap ?? 16,
      roomPositions: [],
      preset: false,
    }
    layouts.value.push(layout)
    persistLayouts()
    return layout
  }

  /** 更新布局 */
  function updateLayout(id: string, updates: Partial<LayoutTemplate>): boolean {
    const layout = layouts.value.find(l => l.id === id)
    if (!layout) return false
    Object.assign(layout, updates)
    persistLayouts()
    return true
  }

  /** 删除布局 */
  function deleteLayout(id: string): boolean {
    const idx = layouts.value.findIndex(l => l.id === id)
    if (idx < 0) return false
    if (layouts.value[idx].preset) return false // 不能删除预设
    layouts.value.splice(idx, 1)
    persistLayouts()
    return true
  }

  /** 设置房间位置 */
  function setRoomPositions(layoutId: string, positions: RoomPosition[]) {
    updateLayout(layoutId, { roomPositions: positions })
  }

  /** 获取当前活跃布局 */
  function getActiveLayout(): LayoutTemplate {
    return layouts.value.find(l => l.id === activeLayoutId.value) || layouts.value[0]
  }

  /** 设置活跃布局 */
  function setActiveLayout(id: string) {
    if (layouts.value.some(l => l.id === id)) {
      activeLayoutId.value = id
      persistActiveLayout()
    }
  }

  /** 克隆布局 */
  function cloneLayout(id: string, newName?: string): LayoutTemplate | null {
    const source = layouts.value.find(l => l.id === id)
    if (!source) return null
    const clone: LayoutTemplate = {
      ...source,
      id: generateId('layout'),
      name: newName || `${source.name} (副本)`,
      preset: false,
      roomPositions: source.roomPositions.map(p => ({ ...p })),
    }
    layouts.value.push(clone)
    persistLayouts()
    return clone
  }

  return {
    layouts: computed(() => layouts.value),
    getAllLayouts,
    getPresetLayouts,
    getCustomLayouts,
    getLayoutsByType,
    getLayout,
    createLayout,
    updateLayout,
    deleteLayout,
    setRoomPositions,
    getActiveLayout,
    setActiveLayout,
    cloneLayout,
  }
}

// ---- 主题系统 ----

/**
 * 主题系统
 */
export function useThemeSystem() {
  /** 获取所有主题 */
  function getAllThemes(): Theme[] {
    return themes.value
  }

  /** 获取预设主题 */
  function getPresetThemes(): Theme[] {
    return themes.value.filter(t => t.preset)
  }

  /** 获取自定义主题 */
  function getCustomThemes(): Theme[] {
    return themes.value.filter(t => !t.preset)
  }

  /** 获取主题详情 */
  function getTheme(id: string): Theme | undefined {
    return themes.value.find(t => t.id === id)
  }

  /** 创建自定义主题 */
  function createTheme(
    name: string,
    accent: ThemeAccent,
    mode: ThemeMode,
    overrides: Partial<Omit<Theme, 'id' | 'name' | 'accent' | 'mode' | 'preset'>>,
  ): Theme {
    const baseColor = THEME_ACCENT_META[accent].color
    const isDark = mode === 'dark' || (mode === 'auto' && true)

    const theme: Theme = {
      id: generateId('theme'),
      name,
      mode,
      accent,
      primaryColor: baseColor,
      backgroundColor: isDark ? '#0f1117' : '#f8f9fa',
      surfaceColor: isDark ? '#1a1d27' : '#ffffff',
      textColor: isDark ? '#e4e6ed' : '#2c3e50',
      mutedTextColor: isDark ? '#7a7f8c' : '#7f8c8d',
      borderColor: isDark ? '#2a2d37' : '#e0e4e8',
      shadow: isDark ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.08)',
      borderRadius: 8,
      fontFamily: 'system-ui',
      preset: false,
      ...overrides,
    }
    themes.value.push(theme)
    persistThemes()
    return theme
  }

  /** 更新主题 */
  function updateTheme(id: string, updates: Partial<Theme>): boolean {
    const theme = themes.value.find(t => t.id === id)
    if (!theme) return false
    Object.assign(theme, updates)
    persistThemes()
    return true
  }

  /** 删除主题 */
  function deleteTheme(id: string): boolean {
    const idx = themes.value.findIndex(t => t.id === id)
    if (idx < 0) return false
    if (themes.value[idx].preset) return false
    themes.value.splice(idx, 1)
    persistThemes()
    return true
  }

  /** 获取当前活跃主题 */
  function getActiveTheme(): Theme {
    return themes.value.find(t => t.id === activeThemeId.value) || themes.value[0]
  }

  /** 设置活跃主题 */
  function setActiveTheme(id: string) {
    if (themes.value.some(t => t.id === id)) {
      activeThemeId.value = id
      persistActiveTheme()
    }
  }

  /** 克隆主题 */
  function cloneTheme(id: string, newName?: string): Theme | null {
    const source = themes.value.find(t => t.id === id)
    if (!source) return null
    const clone: Theme = {
      ...source,
      id: generateId('theme'),
      name: newName || `${source.name} (副本)`,
      preset: false,
    }
    themes.value.push(clone)
    persistThemes()
    return clone
  }

  /** 将主题转换为 CSS 变量 */
  function themeToCSSVariables(theme: Theme): Record<string, string> {
    return {
      '--hf-primary': theme.primaryColor,
      '--hf-bg': theme.backgroundColor,
      '--hf-surface': theme.surfaceColor,
      '--hf-text': theme.textColor,
      '--hf-text-muted': theme.mutedTextColor,
      '--hf-border': theme.borderColor,
      '--hf-shadow': theme.shadow,
      '--hf-radius': `${theme.borderRadius}px`,
      '--hf-font': theme.fontFamily,
    }
  }

  return {
    themes: computed(() => themes.value),
    getAllThemes,
    getPresetThemes,
    getCustomThemes,
    getTheme,
    createTheme,
    updateTheme,
    deleteTheme,
    getActiveTheme,
    setActiveTheme,
    cloneTheme,
    themeToCSSVariables,
  }
}

// ---- 空间快照 ----

/**
 * 空间快照系统
 * 保存和恢复空间配置的完整状态
 */
export function useSpaceSnapshots() {
  /** 创建快照 */
  function createSnapshot(
    name: string,
    description: string,
    spaceConfigId: string,
    layoutTemplateId: string,
    themeId: string,
    roomPositions: RoomPosition[],
    tags: string[] = [],
  ): SpaceSnapshot {
    const snapshot: SpaceSnapshot = {
      id: generateId('snapshot'),
      name,
      description,
      timestamp: new Date().toISOString(),
      spaceConfigId,
      layoutTemplateId,
      themeId,
      roomPositions: roomPositions.map(p => ({ ...p })),
      tags,
    }
    snapshots.value.unshift(snapshot)
    if (snapshots.value.length > 50) {
      snapshots.value = snapshots.value.slice(0, 50)
    }
    persistSnapshots()
    return snapshot
  }

  /** 获取所有快照 */
  function getSnapshots(): SpaceSnapshot[] {
    return snapshots.value
  }

  /** 获取快照详情 */
  function getSnapshot(id: string): SpaceSnapshot | undefined {
    return snapshots.value.find(s => s.id === id)
  }

  /** 按标签搜索快照 */
  function searchSnapshots(tag: string): SpaceSnapshot[] {
    return snapshots.value.filter(s => s.tags.includes(tag))
  }

  /** 更新快照 */
  function updateSnapshot(id: string, updates: Partial<SpaceSnapshot>): boolean {
    const snapshot = snapshots.value.find(s => s.id === id)
    if (!snapshot) return false
    Object.assign(snapshot, updates)
    persistSnapshots()
    return true
  }

  /** 删除快照 */
  function deleteSnapshot(id: string): boolean {
    const idx = snapshots.value.findIndex(s => s.id === id)
    if (idx < 0) return false
    snapshots.value.splice(idx, 1)
    persistSnapshots()
    return true
  }

  /** 比较两个快照的差异 */
  function compareSnapshots(
    id1: string,
    id2: string,
  ): { added: RoomPosition[]; removed: RoomPosition[]; moved: RoomPosition[] } | null {
    const s1 = getSnapshot(id1)
    const s2 = getSnapshot(id2)
    if (!s1 || !s2) return null

    const roomIds1 = new Set(s1.roomPositions.map(p => p.roomId))
    const roomIds2 = new Set(s2.roomPositions.map(p => p.roomId))

    const added = s2.roomPositions.filter(p => !roomIds1.has(p.roomId))
    const removed = s1.roomPositions.filter(p => !roomIds2.has(p.roomId))
    const moved = s2.roomPositions.filter(p => {
      const old = s1.roomPositions.find(o => o.roomId === p.roomId)
      return old && (old.x !== p.x || old.y !== p.y)
    })

    return { added, removed, moved }
  }

  return {
    snapshots: computed(() => snapshots.value),
    createSnapshot,
    getSnapshots,
    getSnapshot,
    searchSnapshots,
    updateSnapshot,
    deleteSnapshot,
    compareSnapshots,
  }
}

// ---- 存储键 ----

export const CUSTOMIZATION_ADVANCED_STORAGE_KEYS = {
  LAYOUTS: LAYOUTS_KEY,
  THEMES: THEMES_KEY,
  SNAPSHOTS: SNAPSHOTS_KEY,
  ACTIVE_LAYOUT: ACTIVE_LAYOUT_KEY,
  ACTIVE_THEME: ACTIVE_THEME_KEY,
} as const