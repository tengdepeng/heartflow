// ============================================================
// 装修工坊 · 高级定制引擎
// 高级主题定制、材质预设、动画配置、空间快照对比
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'

// ============================================================
// 类型定义
// ============================================================

/** 材质类型 */
export type MaterialType = 'glass' | 'metal' | 'wood' | 'stone' | 'fabric' | 'ceramic' | 'crystal' | 'paper'

/** 材质预设 */
export interface MaterialPreset {
  id: string
  name: string
  type: MaterialType
  /** 主色 */
  color: string
  /** 辅色 */
  accentColor: string
  /** 纹理模式 */
  texturePattern: 'smooth' | 'rough' | 'patterned' | 'gradient' | 'noise'
  /** 透明度 0-1 */
  opacity: number
  /** 发光强度 0-1 */
  glowIntensity: number
  /** 边框样式 */
  borderStyle: 'none' | 'solid' | 'dashed' | 'dotted' | 'double'
  /** 圆角半径 */
  borderRadius: number
}

/** 动画预设 */
export interface AnimationPreset {
  id: string
  name: string
  /** 入场动画 */
  enterAnimation: string
  /** 出场动画 */
  leaveAnimation: string
  /** 悬停动画 */
  hoverAnimation: string
  /** 持续时间（毫秒） */
  duration: number
  /** 缓动函数 */
  easing: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear' | 'spring'
  /** 是否启用视差 */
  parallaxEnabled: boolean
}

/** 主题配置 */
export interface ThemeConfig {
  id: string
  name: string
  /** 主色调 */
  primaryColor: string
  /** 辅色调 */
  secondaryColor: string
  /** 背景色 */
  backgroundColor: string
  /** 表面色 */
  surfaceColor: string
  /** 文字色 */
  textColor: string
  /** 文字辅色 */
  textSecondaryColor: string
  /** 边框色 */
  borderColor: string
  /** 阴影色 */
  shadowColor: string
  /** 材质预设 */
  materialPreset: MaterialPreset
  /** 动画预设 */
  animationPreset: AnimationPreset
  /** 字体 */
  fontFamily: string
  /** 字体大小 */
  fontSize: number
  /** 是否暗色模式 */
  isDark: boolean
  /** 创建时间 */
  createdAt: string
  /** 更新时间 */
  updatedAt: string
}

/** 空间快照 */
export interface SpaceSnapshot {
  id: string
  name: string
  description: string
  /** 关联的主题配置 */
  themeId: string
  /** 关联的布局配置 */
  layoutId: string
  /** 创建时间 */
  createdAt: string
  /** 截图数据（base64） */
  thumbnail?: string
}

/** 材质类型元数据 */
export const MATERIAL_TYPE_META: Record<MaterialType, { label: string; icon: string }> = {
  glass: { label: '玻璃', icon: '🪟' },
  metal: { label: '金属', icon: '🔩' },
  wood: { label: '木质', icon: '🪵' },
  stone: { label: '石材', icon: '🪨' },
  fabric: { label: '布艺', icon: '🧵' },
  ceramic: { label: '陶瓷', icon: '🏺' },
  crystal: { label: '水晶', icon: '💎' },
  paper: { label: '纸艺', icon: '📄' },
}

/** 预设材质库 */
export const MATERIAL_PRESETS: MaterialPreset[] = [
  {
    id: 'mat-clear-glass', name: '清透玻璃', type: 'glass',
    color: 'rgba(255,255,255,0.15)', accentColor: 'rgba(255,255,255,0.3)',
    texturePattern: 'smooth', opacity: 0.85, glowIntensity: 0.2,
    borderStyle: 'solid', borderRadius: 12,
  },
  {
    id: 'mat-frosted-glass', name: '磨砂玻璃', type: 'glass',
    color: 'rgba(255,255,255,0.1)', accentColor: 'rgba(255,255,255,0.2)',
    texturePattern: 'noise', opacity: 0.7, glowIntensity: 0.1,
    borderStyle: 'solid', borderRadius: 16,
  },
  {
    id: 'mat-brushed-metal', name: '拉丝金属', type: 'metal',
    color: '#3a3d47', accentColor: '#5a5d67',
    texturePattern: 'patterned', opacity: 1, glowIntensity: 0.05,
    borderStyle: 'solid', borderRadius: 8,
  },
  {
    id: 'mat-dark-wood', name: '深色木纹', type: 'wood',
    color: '#4a3728', accentColor: '#6a5748',
    texturePattern: 'patterned', opacity: 1, glowIntensity: 0,
    borderStyle: 'solid', borderRadius: 6,
  },
  {
    id: 'mat-marble', name: '大理石', type: 'stone',
    color: '#e8e4e0', accentColor: '#d0ccc8',
    texturePattern: 'noise', opacity: 1, glowIntensity: 0.03,
    borderStyle: 'solid', borderRadius: 4,
  },
  {
    id: 'mat-velvet', name: '天鹅绒', type: 'fabric',
    color: '#2a1f3d', accentColor: '#4a3f5d',
    texturePattern: 'gradient', opacity: 1, glowIntensity: 0,
    borderStyle: 'none', borderRadius: 8,
  },
  {
    id: 'mat-crystal', name: '水晶', type: 'crystal',
    color: 'rgba(180,220,255,0.2)', accentColor: 'rgba(200,240,255,0.4)',
    texturePattern: 'smooth', opacity: 0.6, glowIntensity: 0.4,
    borderStyle: 'solid', borderRadius: 12,
  },
  {
    id: 'mat-washi', name: '和纸', type: 'paper',
    color: '#f5f0e8', accentColor: '#e8e0d0',
    texturePattern: 'patterned', opacity: 0.9, glowIntensity: 0.1,
    borderStyle: 'solid', borderRadius: 2,
  },
]

/** 预设动画库 */
export const ANIMATION_PRESETS: AnimationPreset[] = [
  {
    id: 'anim-gentle', name: '轻柔', enterAnimation: 'fadeIn', leaveAnimation: 'fadeOut',
    hoverAnimation: 'scaleUp', duration: 300, easing: 'ease-out', parallaxEnabled: false,
  },
  {
    id: 'anim-flow', name: '流动', enterAnimation: 'slideUp', leaveAnimation: 'slideDown',
    hoverAnimation: 'glow', duration: 400, easing: 'ease-in-out', parallaxEnabled: true,
  },
  {
    id: 'anim-bounce', name: '弹跳', enterAnimation: 'bounceIn', leaveAnimation: 'bounceOut',
    hoverAnimation: 'bounce', duration: 500, easing: 'spring', parallaxEnabled: false,
  },
  {
    id: 'anim-crystal', name: '结晶', enterAnimation: 'scaleIn', leaveAnimation: 'scaleOut',
    hoverAnimation: 'sparkle', duration: 600, easing: 'ease-out', parallaxEnabled: true,
  },
  {
    id: 'anim-instant', name: '即时', enterAnimation: 'none', leaveAnimation: 'none',
    hoverAnimation: 'none', duration: 0, easing: 'linear', parallaxEnabled: false,
  },
]

/** 存储键 */
const THEME_STORAGE_KEY = 'hf:customization:themes'
const SNAPSHOT_STORAGE_KEY = 'hf:customization:snapshots'

// ============================================================
// 高级定制引擎
// ============================================================

export function useCustomizationAdvanced() {
  const themes = ref<ThemeConfig[]>(loadThemes())
  const snapshots = ref<SpaceSnapshot[]>(loadSnapshots())
  const activeThemeId = ref<string | null>(null)
  const activeMaterialId = ref<string>('mat-clear-glass')
  const activeAnimationId = ref<string>('anim-gentle')

  // ---- 持久化 ----

  function loadThemes(): ThemeConfig[] {
    try {
      const raw = storage.getKV<string>(THEME_STORAGE_KEY, '[]')
      return JSON.parse(raw)
    } catch { return [] }
  }

  function saveThemes() {
    storage.setKV(THEME_STORAGE_KEY, JSON.stringify(themes.value))
  }

  function loadSnapshots(): SpaceSnapshot[] {
    try {
      const raw = storage.getKV<string>(SNAPSHOT_STORAGE_KEY, '[]')
      return JSON.parse(raw)
    } catch { return [] }
  }

  function saveSnapshots() {
    storage.setKV(SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshots.value))
  }

  // ---- 主题管理 ----

  /** 创建主题 */
  function createTheme(name: string, isDark: boolean = false): ThemeConfig {
    const material = MATERIAL_PRESETS[0]
    const animation = ANIMATION_PRESETS[0]
    const theme: ThemeConfig = {
      id: `theme_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      primaryColor: isDark ? '#6c9cf5' : '#3b82f6',
      secondaryColor: isDark ? '#f59e6c' : '#f97316',
      backgroundColor: isDark ? '#0f1117' : '#f8fafc',
      surfaceColor: isDark ? '#1a1d27' : '#ffffff',
      textColor: isDark ? '#e4e6ed' : '#1e293b',
      textSecondaryColor: isDark ? '#7a7f8c' : '#64748b',
      borderColor: isDark ? '#2a2d37' : '#e2e8f0',
      shadowColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)',
      materialPreset: { ...material },
      animationPreset: { ...animation },
      fontFamily: 'Noto Sans SC',
      fontSize: 15,
      isDark,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    themes.value.push(theme)
    saveThemes()
    return theme
  }

  /** 更新主题 */
  function updateTheme(themeId: string, updates: Partial<ThemeConfig>): boolean {
    const theme = themes.value.find(t => t.id === themeId)
    if (!theme) return false
    Object.assign(theme, updates, { updatedAt: new Date().toISOString() })
    saveThemes()
    return true
  }

  /** 删除主题 */
  function deleteTheme(themeId: string): boolean {
    const idx = themes.value.findIndex(t => t.id === themeId)
    if (idx === -1) return false
    themes.value.splice(idx, 1)
    saveThemes()
    return true
  }

  /** 复制主题 */
  function duplicateTheme(themeId: string): ThemeConfig | null {
    const theme = themes.value.find(t => t.id === themeId)
    if (!theme) return null
    const copy: ThemeConfig = {
      ...JSON.parse(JSON.stringify(theme)),
      id: `theme_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: `${theme.name} (副本)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    themes.value.push(copy)
    saveThemes()
    return copy
  }

  /** 激活主题 */
  function activateTheme(themeId: string): boolean {
    const theme = themes.value.find(t => t.id === themeId)
    if (!theme) return false
    activeThemeId.value = themeId
    return true
  }

  /** 获取当前激活主题 */
  const activeTheme = computed(() => {
    if (!activeThemeId.value) return themes.value[0] || null
    return themes.value.find(t => t.id === activeThemeId.value) || null
  })

  // ---- 材质管理 ----

  /** 应用材质预设 */
  function applyMaterial(materialId: string): boolean {
    const material = MATERIAL_PRESETS.find(m => m.id === materialId)
    if (!material) return false
    activeMaterialId.value = materialId
    return true
  }

  /** 获取当前材质 */
  const activeMaterial = computed(() => {
    return MATERIAL_PRESETS.find(m => m.id === activeMaterialId.value) || MATERIAL_PRESETS[0]
  })

  // ---- 动画管理 ----

  /** 应用动画预设 */
  function applyAnimation(animationId: string): boolean {
    const animation = ANIMATION_PRESETS.find(a => a.id === animationId)
    if (!animation) return false
    activeAnimationId.value = animationId
    return true
  }

  /** 获取当前动画 */
  const activeAnimation = computed(() => {
    return ANIMATION_PRESETS.find(a => a.id === activeAnimationId.value) || ANIMATION_PRESETS[0]
  })

  // ---- 空间快照 ----

  /** 创建空间快照 */
  function createSnapshot(name: string, description: string): SpaceSnapshot {
    const snapshot: SpaceSnapshot = {
      id: `snap_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      description,
      themeId: activeThemeId.value || '',
      layoutId: '',
      createdAt: new Date().toISOString(),
    }
    snapshots.value.push(snapshot)
    saveSnapshots()
    return snapshot
  }

  /** 删除快照 */
  function deleteSnapshot(snapshotId: string): boolean {
    const idx = snapshots.value.findIndex(s => s.id === snapshotId)
    if (idx === -1) return false
    snapshots.value.splice(idx, 1)
    saveSnapshots()
    return true
  }

  /** 从快照恢复 */
  function restoreSnapshot(snapshotId: string): boolean {
    const snapshot = snapshots.value.find(s => s.id === snapshotId)
    if (!snapshot) return false
    if (snapshot.themeId) {
      activateTheme(snapshot.themeId)
    }
    return true
  }

  // ---- 导出导入 ----

  /** 导出主题为 JSON */
  function exportTheme(themeId: string): string | null {
    const theme = themes.value.find(t => t.id === themeId)
    if (!theme) return null
    return JSON.stringify(theme, null, 2)
  }

  /** 从 JSON 导入主题 */
  function importTheme(json: string): ThemeConfig | null {
    try {
      const data = JSON.parse(json) as ThemeConfig
      data.id = `theme_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
      data.createdAt = new Date().toISOString()
      data.updatedAt = new Date().toISOString()
      themes.value.push(data)
      saveThemes()
      return data
    } catch { return null }
  }

  return {
    // 状态
    themes,
    snapshots,
    activeThemeId,
    activeMaterialId,
    activeAnimationId,

    // 计算属性
    activeTheme,
    activeMaterial,
    activeAnimation,

    // 主题
    createTheme,
    updateTheme,
    deleteTheme,
    duplicateTheme,
    activateTheme,

    // 材质/动画
    applyMaterial,
    applyAnimation,

    // 快照
    createSnapshot,
    deleteSnapshot,
    restoreSnapshot,

    // 导出导入
    exportTheme,
    importTheme,
  }
}