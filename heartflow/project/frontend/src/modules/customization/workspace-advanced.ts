// ============================================================
// 应用空间 · 高级布局与快照对比引擎
// 高级布局模板、主题深度定制、空间快照对比合并
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'

// ============================================================
// 类型定义
// ============================================================

/** 高级布局模板 */
export interface AdvancedLayoutTemplate {
  id: string
  name: string
  description: string
  /** 布局类型 */
  type: 'dashboard' | 'split-pane' | 'sidebar' | 'grid-masonry' | 'focus-mode' | 'canvas-free'
  /** 区域配置 */
  zones: LayoutZone[]
  /** 响应式断点 */
  responsive: ResponsiveBreakpoint[]
  /** 是否支持拖拽 */
  draggable: boolean
  /** 是否支持调整大小 */
  resizable: boolean
  /** 预设图标 */
  icon: string
  /** 创建时间 */
  createdAt: string
}

/** 布局区域 */
export interface LayoutZone {
  id: string
  name: string
  /** 位置 */
  position: 'top' | 'bottom' | 'left' | 'right' | 'center' | 'floating'
  /** 宽度百分比 */
  width: number
  /** 高度百分比 */
  height: number
  /** x偏移 */
  x: number
  /** y偏移 */
  y: number
  /** 最小宽度 */
  minWidth: number
  /** 最小高度 */
  minHeight: number
  /** 最大宽度 */
  maxWidth: number
  /** 最大高度 */
  maxHeight: number
  /** 是否可折叠 */
  collapsible: boolean
  /** 默认折叠 */
  defaultCollapsed: boolean
  /** 允许放置的组件 */
  allowedComponents: string[]
}

/** 响应式断点 */
export interface ResponsiveBreakpoint {
  name: string
  /** 最小宽度 */
  minWidth: number
  /** 列数 */
  columns: number
  /** 区域可见性 */
  zoneVisibility: Record<string, boolean>
}

/** 主题深度配置 */
export interface DeepThemeConfig {
  id: string
  name: string
  /** 基础色板 */
  palette: ThemePalette
  /** 字体配置 */
  typography: TypographyConfig
  /** 间距配置 */
  spacing: SpacingConfig
  /** 边框配置 */
  borders: BorderConfig
  /** 阴影配置 */
  shadows: ShadowConfig
  /** 动画配置 */
  animations: AnimationConfig
  /** 是否激活 */
  active: boolean
  /** 创建时间 */
  createdAt: string
}

/** 色板 */
export interface ThemePalette {
  primary: string
  primaryLight: string
  primaryDark: string
  secondary: string
  secondaryLight: string
  secondaryDark: string
  accent: string
  background: string
  surface: string
  surfaceAlt: string
  text: string
  textSecondary: string
  textMuted: string
  border: string
  divider: string
  success: string
  warning: string
  error: string
  info: string
}

/** 字体配置 */
export interface TypographyConfig {
  fontFamily: string
  headingFont: string
  baseSize: number
  scale: 'minor-second' | 'major-second' | 'minor-third' | 'major-third' | 'perfect-fourth'
  lineHeight: number
  letterSpacing: number
  headingWeight: number
}

/** 间距配置 */
export interface SpacingConfig {
  unit: number
  /** 紧凑/标准/宽松 */
  density: 'compact' | 'standard' | 'spacious'
}

/** 边框配置 */
export interface BorderConfig {
  radius: number
  radiusLg: number
  radiusSm: number
  width: number
  style: 'solid' | 'dashed' | 'dotted' | 'none'
}

/** 阴影配置 */
export interface ShadowConfig {
  sm: string
  md: string
  lg: string
  xl: string
  inner: string
}

/** 动画配置 */
export interface AnimationConfig {
  duration: number
  easing: string
  reducedMotion: boolean
}

/** 空间快照对比 */
export interface SnapshotComparison {
  id: string
  /** 快照A */
  snapshotAId: string
  /** 快照B */
  snapshotBId: string
  /** 差异列表 */
  differences: SnapshotDiff[]
  /** 对比时间 */
  comparedAt: string
}

/** 快照差异 */
export interface SnapshotDiff {
  /** 路径 */
  path: string
  /** 类型 */
  type: 'added' | 'removed' | 'modified'
  /** 旧值 */
  oldValue?: unknown
  /** 新值 */
  newValue?: unknown
  /** 描述 */
  description: string
}

/** 空间快照（增强版） */
export interface EnhancedSnapshot {
  id: string
  name: string
  description: string
  /** 关联的布局模板 */
  layoutId: string
  /** 关联的主题 */
  themeId: string
  /** 组件状态快照 */
  componentStates: Record<string, unknown>
  /** 区域配置 */
  zoneConfigs: Record<string, { collapsed: boolean; width: number; height: number }>
  /** 标签 */
  tags: string[]
  /** 创建时间 */
  createdAt: string
  /** 是否为里程碑 */
  isMilestone: boolean
}

// ============================================================
// 预设
// ============================================================

/** 高级布局模板 */
export const ADVANCED_LAYOUT_TEMPLATES: Omit<AdvancedLayoutTemplate, 'id' | 'createdAt'>[] = [
  {
    name: '仪表盘视图',
    description: '多面板数据概览，适合监控和分析场景',
    type: 'dashboard',
    zones: [
      { id: 'header', name: '顶栏', position: 'top', width: 100, height: 8, x: 0, y: 0, minWidth: 100, minHeight: 6, maxWidth: 100, maxHeight: 12, collapsible: false, defaultCollapsed: false, allowedComponents: ['stats', 'search', 'notifications'] },
      { id: 'main-top-left', name: '主区左上', position: 'center', width: 50, height: 42, x: 0, y: 8, minWidth: 30, minHeight: 20, maxWidth: 70, maxHeight: 60, collapsible: false, defaultCollapsed: false, allowedComponents: ['chart', 'dashboard', 'summary'] },
      { id: 'main-top-right', name: '主区右上', position: 'center', width: 50, height: 42, x: 50, y: 8, minWidth: 30, minHeight: 20, maxWidth: 70, maxHeight: 60, collapsible: false, defaultCollapsed: false, allowedComponents: ['chart', 'dashboard', 'list'] },
      { id: 'main-bottom', name: '主区底部', position: 'center', width: 100, height: 50, x: 0, y: 50, minWidth: 100, minHeight: 30, maxWidth: 100, maxHeight: 70, collapsible: true, defaultCollapsed: false, allowedComponents: ['table', 'log', 'timeline'] },
    ],
    responsive: [
      { name: 'desktop', minWidth: 1200, columns: 12, zoneVisibility: { header: true, 'main-top-left': true, 'main-top-right': true, 'main-bottom': true } },
      { name: 'tablet', minWidth: 768, columns: 8, zoneVisibility: { header: true, 'main-top-left': true, 'main-top-right': true, 'main-bottom': true } },
      { name: 'mobile', minWidth: 320, columns: 4, zoneVisibility: { header: true, 'main-top-left': true, 'main-top-right': false, 'main-bottom': true } },
    ],
    draggable: true,
    resizable: true,
    icon: '📊',
  },
  {
    name: '分屏视窗',
    description: '左右分栏，适合对比和编辑场景',
    type: 'split-pane',
    zones: [
      { id: 'sidebar', name: '侧边栏', position: 'left', width: 25, height: 100, x: 0, y: 0, minWidth: 15, minHeight: 100, maxWidth: 40, maxHeight: 100, collapsible: true, defaultCollapsed: false, allowedComponents: ['nav', 'tree', 'menu'] },
      { id: 'main', name: '主区域', position: 'center', width: 75, height: 100, x: 25, y: 0, minWidth: 40, minHeight: 100, maxWidth: 85, maxHeight: 100, collapsible: false, defaultCollapsed: false, allowedComponents: ['editor', 'viewer', 'form'] },
    ],
    responsive: [
      { name: 'desktop', minWidth: 1024, columns: 12, zoneVisibility: { sidebar: true, main: true } },
      { name: 'mobile', minWidth: 320, columns: 4, zoneVisibility: { sidebar: false, main: true } },
    ],
    draggable: true,
    resizable: true,
    icon: '🗂️',
  },
  {
    name: '专注模式',
    description: '全屏沉浸式体验，无干扰专注',
    type: 'focus-mode',
    zones: [
      { id: 'focus', name: '专注区', position: 'center', width: 100, height: 92, x: 0, y: 0, minWidth: 100, minHeight: 80, maxWidth: 100, maxHeight: 100, collapsible: false, defaultCollapsed: false, allowedComponents: ['timer', 'editor', 'meditation'] },
      { id: 'status-bar', name: '状态栏', position: 'bottom', width: 100, height: 8, x: 0, y: 92, minWidth: 100, minHeight: 5, maxWidth: 100, maxHeight: 10, collapsible: true, defaultCollapsed: false, allowedComponents: ['status', 'progress'] },
    ],
    responsive: [
      { name: 'all', minWidth: 320, columns: 4, zoneVisibility: { focus: true, 'status-bar': true } },
    ],
    draggable: false,
    resizable: false,
    icon: '🎯',
  },
  {
    name: '画布自由',
    description: '自由排列组件，适合创意工作流',
    type: 'canvas-free',
    zones: [
      { id: 'canvas', name: '画布', position: 'center', width: 100, height: 100, x: 0, y: 0, minWidth: 100, minHeight: 100, maxWidth: 100, maxHeight: 100, collapsible: false, defaultCollapsed: false, allowedComponents: ['*'] },
    ],
    responsive: [
      { name: 'all', minWidth: 320, columns: 4, zoneVisibility: { canvas: true } },
    ],
    draggable: true,
    resizable: true,
    icon: '🎨',
  },
  {
    name: '瀑布流',
    description: '自适应卡片网格，适合浏览和发现',
    type: 'grid-masonry',
    zones: [
      { id: 'grid', name: '网格区', position: 'center', width: 100, height: 100, x: 0, y: 0, minWidth: 100, minHeight: 100, maxWidth: 100, maxHeight: 100, collapsible: false, defaultCollapsed: false, allowedComponents: ['card', 'image', 'note'] },
    ],
    responsive: [
      { name: 'desktop', minWidth: 1200, columns: 4, zoneVisibility: { grid: true } },
      { name: 'tablet', minWidth: 768, columns: 3, zoneVisibility: { grid: true } },
      { name: 'mobile', minWidth: 320, columns: 2, zoneVisibility: { grid: true } },
    ],
    draggable: true,
    resizable: false,
    icon: '🧱',
  },
]

/** 预设色板 */
export const PRESET_PALETTES: Record<string, ThemePalette> = {
  'ocean-depths': {
    primary: '#0ea5e9', primaryLight: '#38bdf8', primaryDark: '#0369a1',
    secondary: '#8b5cf6', secondaryLight: '#a78bfa', secondaryDark: '#6d28d9',
    accent: '#f59e0b',
    background: '#0f172a', surface: '#1e293b', surfaceAlt: '#334155',
    text: '#f1f5f9', textSecondary: '#cbd5e1', textMuted: '#64748b',
    border: '#334155', divider: '#1e293b',
    success: '#22c55e', warning: '#f59e0b', error: '#ef4444', info: '#3b82f6',
  },
  'forest-canopy': {
    primary: '#22c55e', primaryLight: '#4ade80', primaryDark: '#15803d',
    secondary: '#a3e635', secondaryLight: '#bef264', secondaryDark: '#65a30d',
    accent: '#fbbf24',
    background: '#0a1a0a', surface: '#1a2e1a', surfaceAlt: '#2a3e2a',
    text: '#ecfdf5', textSecondary: '#d1fae5', textMuted: '#6b7280',
    border: '#2a3e2a', divider: '#1a2e1a',
    success: '#22c55e', warning: '#f59e0b', error: '#ef4444', info: '#3b82f6',
  },
  'sunset-warm': {
    primary: '#f97316', primaryLight: '#fb923c', primaryDark: '#c2410c',
    secondary: '#eab308', secondaryLight: '#facc15', secondaryDark: '#a16207',
    accent: '#06b6d4',
    background: '#1c1917', surface: '#292524', surfaceAlt: '#44403c',
    text: '#fef3c7', textSecondary: '#fde68a', textMuted: '#78716c',
    border: '#44403c', divider: '#292524',
    success: '#22c55e', warning: '#f59e0b', error: '#ef4444', info: '#3b82f6',
  },
  'minimal-mono': {
    primary: '#6b7280', primaryLight: '#9ca3af', primaryDark: '#4b5563',
    secondary: '#9ca3af', secondaryLight: '#d1d5db', secondaryDark: '#6b7280',
    accent: '#111827',
    background: '#ffffff', surface: '#f9fafb', surfaceAlt: '#f3f4f6',
    text: '#111827', textSecondary: '#4b5563', textMuted: '#9ca3af',
    border: '#e5e7eb', divider: '#f3f4f6',
    success: '#22c55e', warning: '#f59e0b', error: '#ef4444', info: '#3b82f6',
  },
}

/** 布局类型元数据 */
export const LAYOUT_TYPE_ADVANCED_META: Record<AdvancedLayoutTemplate['type'], { label: string; icon: string; description: string }> = {
  'dashboard': { label: '仪表盘', icon: '📊', description: '多面板数据概览布局' },
  'split-pane': { label: '分屏', icon: '🗂️', description: '左右分栏对比布局' },
  'sidebar': { label: '侧边栏', icon: '📋', description: '侧边栏+主区域布局' },
  'grid-masonry': { label: '瀑布流', icon: '🧱', description: '自适应卡片网格' },
  'focus-mode': { label: '专注', icon: '🎯', description: '全屏沉浸式体验' },
  'canvas-free': { label: '自由画布', icon: '🎨', description: '自由排列组件' },
}

/** 存储键 */
const CUSTOMIZATION_ADVANCED_KEY = 'hf:customization:advanced'

// ============================================================
// 应用空间高级引擎
// ============================================================

export function useWorkspaceAdvanced() {
  // ---- 状态 ----
  const templates = ref<AdvancedLayoutTemplate[]>(loadTemplates())
  const themes = ref<DeepThemeConfig[]>(loadThemes())
  const snapshots = ref<EnhancedSnapshot[]>(loadSnapshots())
  const comparisons = ref<SnapshotComparison[]>(loadComparisons())
  const activeTemplateId = ref<string | null>(null)
  const activeThemeId = ref<string | null>(null)

  // ---- 持久化 ----

  function loadTemplates(): AdvancedLayoutTemplate[] {
    try {
      const raw = storage.getKV<string>(`${CUSTOMIZATION_ADVANCED_KEY}:templates`, '')
      if (!raw) return ADVANCED_LAYOUT_TEMPLATES.map((t, i) => ({ ...t, id: `layout_${i}`, createdAt: new Date().toISOString() }))
      return JSON.parse(raw)
    } catch {
      return ADVANCED_LAYOUT_TEMPLATES.map((t, i) => ({ ...t, id: `layout_${i}`, createdAt: new Date().toISOString() }))
    }
  }

  function saveTemplates() {
    storage.setKV(`${CUSTOMIZATION_ADVANCED_KEY}:templates`, JSON.stringify(templates.value))
  }

  function loadThemes(): DeepThemeConfig[] {
    try {
      const raw = storage.getKV<string>(`${CUSTOMIZATION_ADVANCED_KEY}:themes`, '[]')
      return JSON.parse(raw)
    } catch { return [] }
  }

  function saveThemes() {
    storage.setKV(`${CUSTOMIZATION_ADVANCED_KEY}:themes`, JSON.stringify(themes.value))
  }

  function loadSnapshots(): EnhancedSnapshot[] {
    try {
      const raw = storage.getKV<string>(`${CUSTOMIZATION_ADVANCED_KEY}:snapshots`, '[]')
      return JSON.parse(raw)
    } catch { return [] }
  }

  function saveSnapshots() {
    storage.setKV(`${CUSTOMIZATION_ADVANCED_KEY}:snapshots`, JSON.stringify(snapshots.value))
  }

  function loadComparisons(): SnapshotComparison[] {
    try {
      const raw = storage.getKV<string>(`${CUSTOMIZATION_ADVANCED_KEY}:comparisons`, '[]')
      return JSON.parse(raw)
    } catch { return [] }
  }

  function saveComparisons() {
    storage.setKV(`${CUSTOMIZATION_ADVANCED_KEY}:comparisons`, JSON.stringify(comparisons.value))
  }

  // ---- 布局模板 ----

  /** 激活布局模板 */
  function activateTemplate(templateId: string) {
    activeTemplateId.value = templateId
  }

  /** 创建自定义布局 */
  function createTemplate(
    name: string,
    type: AdvancedLayoutTemplate['type'],
    zones: LayoutZone[],
    responsive: ResponsiveBreakpoint[],
  ): AdvancedLayoutTemplate {
    const template: AdvancedLayoutTemplate = {
      id: `layout_custom_${Date.now()}`,
      name,
      description: '',
      type,
      zones,
      responsive,
      draggable: true,
      resizable: true,
      icon: '📐',
      createdAt: new Date().toISOString(),
    }
    templates.value.push(template)
    saveTemplates()
    return template
  }

  /** 删除模板 */
  function deleteTemplate(id: string) {
    templates.value = templates.value.filter(t => t.id !== id)
    if (activeTemplateId.value === id) activeTemplateId.value = null
    saveTemplates()
  }

  /** 激活的模板 */
  const activeTemplate = computed(() => {
    if (!activeTemplateId.value) return templates.value[0] ?? null
    return templates.value.find(t => t.id === activeTemplateId.value) ?? null
  })

  // ---- 主题深度配置 ----

  /** 从预设色板创建主题 */
  function createThemeFromPalette(
    name: string,
    paletteKey: string,
    fontFamily: string = 'Noto Sans SC',
  ): DeepThemeConfig {
    const palette = PRESET_PALETTES[paletteKey] ?? PRESET_PALETTES['ocean-depths']
    const theme: DeepThemeConfig = {
      id: `theme_${Date.now()}`,
      name,
      palette: { ...palette },
      typography: {
        fontFamily,
        headingFont: fontFamily,
        baseSize: 16,
        scale: 'major-second',
        lineHeight: 1.6,
        letterSpacing: 0,
        headingWeight: 700,
      },
      spacing: { unit: 4, density: 'standard' },
      borders: { radius: 8, radiusLg: 12, radiusSm: 4, width: 1, style: 'solid' },
      shadows: {
        sm: '0 1px 2px rgba(0,0,0,0.1)',
        md: '0 4px 6px rgba(0,0,0,0.1)',
        lg: '0 10px 15px rgba(0,0,0,0.1)',
        xl: '0 20px 25px rgba(0,0,0,0.15)',
        inner: 'inset 0 2px 4px rgba(0,0,0,0.05)',
      },
      animations: { duration: 200, easing: 'ease-in-out', reducedMotion: false },
      active: false,
      createdAt: new Date().toISOString(),
    }
    themes.value.push(theme)
    saveThemes()
    return theme
  }

  /** 激活主题 */
  function activateTheme(themeId: string) {
    for (const t of themes.value) t.active = false
    const theme = themes.value.find(t => t.id === themeId)
    if (theme) {
      theme.active = true
      activeThemeId.value = themeId
    }
    saveThemes()
  }

  /** 更新主题 */
  function updateTheme(themeId: string, partial: Partial<DeepThemeConfig>) {
    const theme = themes.value.find(t => t.id === themeId)
    if (theme) {
      Object.assign(theme, partial)
      saveThemes()
    }
  }

  /** 删除主题 */
  function deleteTheme(themeId: string) {
    themes.value = themes.value.filter(t => t.id !== themeId)
    if (activeThemeId.value === themeId) activeThemeId.value = null
    saveThemes()
  }

  /** 激活的主题 */
  const activeTheme = computed(() => {
    if (!activeThemeId.value) return themes.value.find(t => t.active) ?? null
    return themes.value.find(t => t.id === activeThemeId.value) ?? null
  })

  // ---- 空间快照 ----

  /** 创建增强快照 */
  function createSnapshot(
    name: string,
    description: string,
    componentStates: Record<string, unknown>,
    tags: string[] = [],
    isMilestone: boolean = false,
  ): EnhancedSnapshot {
    const snapshot: EnhancedSnapshot = {
      id: `snap_${Date.now()}`,
      name,
      description,
      layoutId: activeTemplateId.value ?? '',
      themeId: activeThemeId.value ?? '',
      componentStates,
      zoneConfigs: {},
      tags,
      createdAt: new Date().toISOString(),
      isMilestone,
    }
    snapshots.value.push(snapshot)
    saveSnapshots()
    return snapshot
  }

  /** 删除快照 */
  function deleteSnapshot(snapshotId: string) {
    snapshots.value = snapshots.value.filter(s => s.id !== snapshotId)
    saveSnapshots()
  }

  /** 恢复快照 */
  function restoreSnapshot(snapshotId: string): EnhancedSnapshot | null {
    const snapshot = snapshots.value.find(s => s.id === snapshotId)
    if (!snapshot) return null
    if (snapshot.layoutId) activateTemplate(snapshot.layoutId)
    if (snapshot.themeId) activateTheme(snapshot.themeId)
    return snapshot
  }

  /** 里程碑快照 */
  const milestoneSnapshots = computed(() =>
    snapshots.value.filter(s => s.isMilestone).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  )

  // ---- 快照对比 ----

  /** 对比两个快照 */
  function compareSnapshots(snapshotAId: string, snapshotBId: string): SnapshotComparison {
    const snapA = snapshots.value.find(s => s.id === snapshotAId)
    const snapB = snapshots.value.find(s => s.id === snapshotBId)
    const differences: SnapshotDiff[] = []

    if (snapA && snapB) {
      // 对比组件状态
      const allKeys = new Set([...Object.keys(snapA.componentStates), ...Object.keys(snapB.componentStates)])
      for (const key of allKeys) {
        const valA = snapA.componentStates[key]
        const valB = snapB.componentStates[key]
        if (valA === undefined && valB !== undefined) {
          differences.push({ path: `componentStates.${key}`, type: 'added', newValue: valB, description: `新增组件状态: ${key}` })
        } else if (valA !== undefined && valB === undefined) {
          differences.push({ path: `componentStates.${key}`, type: 'removed', oldValue: valA, description: `移除组件状态: ${key}` })
        } else if (JSON.stringify(valA) !== JSON.stringify(valB)) {
          differences.push({ path: `componentStates.${key}`, type: 'modified', oldValue: valA, newValue: valB, description: `修改组件状态: ${key}` })
        }
      }
      // 对比布局/主题
      if (snapA.layoutId !== snapB.layoutId) {
        differences.push({ path: 'layoutId', type: 'modified', oldValue: snapA.layoutId, newValue: snapB.layoutId, description: '布局模板变更' })
      }
      if (snapA.themeId !== snapB.themeId) {
        differences.push({ path: 'themeId', type: 'modified', oldValue: snapA.themeId, newValue: snapB.themeId, description: '主题配置变更' })
      }
    }

    const comparison: SnapshotComparison = {
      id: `cmp_${Date.now()}`,
      snapshotAId,
      snapshotBId,
      differences,
      comparedAt: new Date().toISOString(),
    }
    comparisons.value.push(comparison)
    saveComparisons()
    return comparison
  }

  /** 合并差异 */
  function mergeDifferences(comparisonId: string, diffPaths: string[], targetSnapshotId: string): EnhancedSnapshot | null {
    const comparison = comparisons.value.find(c => c.id === comparisonId)
    const target = snapshots.value.find(s => s.id === targetSnapshotId)
    const sourceB = comparison ? snapshots.value.find(s => s.id === comparison.snapshotBId) : null
    if (!comparison || !target || !sourceB) return null

    for (const diff of comparison.differences) {
      if (diffPaths.includes(diff.path)) {
        if (diff.type === 'added' || diff.type === 'modified') {
          // 应用新值
          const pathParts = diff.path.split('.')
          let obj: Record<string, unknown> = target.componentStates as Record<string, unknown>
          for (let i = 0; i < pathParts.length - 1; i++) {
            if (!obj[pathParts[i]]) obj[pathParts[i]] = {}
            obj = obj[pathParts[i]] as Record<string, unknown>
          }
          obj[pathParts[pathParts.length - 1]] = diff.newValue
        }
      }
    }
    saveSnapshots()
    return target
  }

  return {
    // 状态
    templates,
    themes,
    snapshots,
    comparisons,
    activeTemplateId,
    activeThemeId,

    // 计算属性
    activeTemplate,
    activeTheme,
    milestoneSnapshots,

    // 布局
    activateTemplate,
    createTemplate,
    deleteTemplate,

    // 主题
    createThemeFromPalette,
    activateTheme,
    updateTheme,
    deleteTheme,

    // 快照
    createSnapshot,
    deleteSnapshot,
    restoreSnapshot,

    // 对比
    compareSnapshots,
    mergeDifferences,
  }
}