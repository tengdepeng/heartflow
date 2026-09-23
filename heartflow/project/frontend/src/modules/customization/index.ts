// ============================================================
// 应用空间自定义引擎 · 导出入口
// ============================================================

export type {
  CustomDimension,
  DimensionConfig,
  SpaceConfig,
  SpacePreset,
  DimensionMeta,
} from './types'

// ---- 超级自定义 · 视觉强度（宪法第二条） ----
export { useAppearance, initAppearance } from './useAppearance'

// ---- 超级自定义 · 单房间风格覆盖（全局为主 + 单房间可覆盖） ----
export { useRoomStyle } from './useRoomStyle'
export type { RoomStyleOverride } from './useRoomStyle'

// ---- 超级自定义 · 统一房间壳层外观（全局优先 + 单房间可覆盖） ----
export {
  useRoomShellAppearance,
  applyRoomShellAppearance,
  CONTENT_PAD_PX,
} from './useRoomShellAppearance'
export type {
  ContentPadDensity,
  HeaderAlign,
  TitleScale,
} from './useRoomShellAppearance'

// ---- 超级自定义 · 界面自动隐藏（沉浸模式） ----
export { useChromeAutoHide } from './useChromeAutoHide'

export {
  DIMENSION_META,
} from './types'

export {
  getSpaceConfigs,
  saveSpaceConfigs,
  getActiveConfigId,
  setActiveConfigId,
  getActiveConfig,
  createSpaceConfig,
  updateSpaceConfig,
  deleteSpaceConfig,
  duplicateSpaceConfig,
} from './engine'

export {
  SPACE_PRESETS,
  getPresetById,
  applyPreset,
} from './presets'

// ---- 交互配置引擎 ----
export {
  createRule,
  createConfig,
  addRuleToConfig,
  removeRuleFromConfig,
  updateRule,
  sortRulesByPriority,
  filterRulesByScene,
  detectConflicts,
  exportConfig,
  importConfig,
  INTERACTION_LABELS,
  ACTION_LABELS,
  DEFAULT_SETTINGS,
} from './interaction-engine'
export type {
  InteractionType,
  InteractionAction,
  InteractionRule,
  InteractionConfig,
  InteractionSettings,
  RuleConflict,
} from './interaction-engine'

// ---- 布局模板与主题系统 ----
export { useLayoutTemplates, useThemeSystem, useSpaceSnapshots, LAYOUT_TYPE_META, THEME_ACCENT_META, CUSTOMIZATION_ADVANCED_STORAGE_KEYS } from './layouts'
export type { LayoutType, LayoutTemplate, RoomPosition, ThemeMode, ThemeAccent, Theme, SpaceSnapshot } from './layouts'

// ---- 高级定制引擎 ----
export { useCustomizationAdvanced, MATERIAL_PRESETS, ANIMATION_PRESETS, MATERIAL_TYPE_META } from './customization-advanced'
export type {
  MaterialType,
  MaterialPreset,
  AnimationPreset,
  ThemeConfig,
} from './customization-advanced'

// ---- 应用空间高级引擎 ----
export { useWorkspaceAdvanced, ADVANCED_LAYOUT_TEMPLATES, PRESET_PALETTES, LAYOUT_TYPE_ADVANCED_META } from './workspace-advanced'
export type {
  AdvancedLayoutTemplate,
  LayoutZone,
  ResponsiveBreakpoint,
  DeepThemeConfig,
  ThemePalette,
  TypographyConfig,
  SpacingConfig,
  BorderConfig,
  ShadowConfig,
  AnimationConfig,
  SnapshotComparison,
  SnapshotDiff,
  EnhancedSnapshot,
} from './workspace-advanced'

// ---- 装修预览引擎（P15-1） ----
export { usePreviewEngine, DEFAULT_PREVIEW_CONFIG } from './preview-engine'
export type {
  PreviewState,
  UndoEntry,
  RenovationRecord,
  BatchOperation,
  StyleMigration,
  PreviewConfig,
} from './preview-engine'

// ---- 环境模板系统 & 场景序列（P17-2） ----
export {
  BUILTIN_TEMPLATES,
  BUILTIN_SEQUENCES,
  ATMOSPHERE_LABELS,
  ATMOSPHERE_COLORS,
  createTemplate,
  updateTemplate,
  createSequence,
  addStep,
  removeStep,
  reorderSteps,
  getSequenceDuration,
  getCurrentStep,
  advanceStep,
  createSnapshot,
} from './environment-templates'
export type {
  EnvironmentTemplate,
  AtmospherePreset,
  SceneStep,
  SceneTrigger,
  SceneSequence,
  EnvironmentSnapshot,
} from './environment-templates'

// ---- 载体动画引擎 & 材质混合（P17-2） ----
export {
  CARRIER_ANIMATION_PRESETS,
  MORPH_LABELS,
  MORPH_ICONS,
  GLOW_LABELS,
  MATERIAL_LABELS,
  MATERIAL_CSS,
  EASING_LABELS,
  EASING_CSS,
  BUILTIN_ANIMATION_SEQUENCES,
  createAnimationConfig,
  generateAnimationKeyframes,
  generateAnimationCSS,
  blendMaterials,
  generateBlendCSS,
  getMorphTransition,
  createAnimationSequence,
} from './carrier-advanced'

// ---- P21-2: 视图桥接层 ----
export { useCustomizationBridge } from './customization-bridge'
export type { CustomizationBridgeState } from './customization-bridge'
export type {
  CarrierVisualMorph,
  CarrierGlowEffect,
  CarrierMaterial,
  CarrierAnimationConfig,
  AnimationEasing,
  AnimationPreset as CarrierAnimationPreset,
  MaterialBlend,
  MorphTransition,
  AnimationSequence,
  AnimationStep,
} from './carrier-advanced'