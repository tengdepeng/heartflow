// ============================================================
// 数据可视化基础框架 · barrel export
// ============================================================

// 类型
export type {
  VisualElementType,
  PointConfig,
  LineConfig,
  SurfaceConfig,
  BarConfig,
  RingConfig,
  MappingMode,
  MappingRule,
  ColorMapping,
  MetaphorType,
  MetaphorConfig,
  MetaphorPalette,
  VisualizationStylePack,
  ChartSize,
  AxisConfig,
  LegendConfig,
  Point2D,
  DataPoint,
  Interpolator,
} from './types'

// SVG 工具
export {
  catmullRomInterpolate,
  linearInterpolate,
  stepInterpolate,
  getInterpolator,
  createSvgElement,
  createSvgRoot,
  generateAxisPaths,
  generateGridLines,
  generateLegend,
  mapDataToPlot,
  generateBarRects,
  generateArcPath,
  generateRingSectors,
  generateAreaPath,
  renderAxisAsString,
  getPointsBBox,
  scalePointsToFit,
} from './svg'

// 色彩工具
export {
  hexToRgb,
  rgbToRgba,
  rgbToHex,
  lerpColor,
  lerpColorMulti,
  generateGradientStops,
  generateColorScale,
  getColorFromMapping,
  applyMappingRule,
  getSemanticColor,
  adjustOpacity,
  lightenColor,
  darkenColor,
  PALETTE_GOLD,
  PALETTE_COOL,
  PALETTE_NATURE,
  BUILTIN_PALETTES,
} from './color'

// 隐喻系统
export {
  METAPHOR_LIGHT,
  METAPHOR_INK,
  METAPHOR_WOOD,
  METAPHOR_FIRE,
  METAPHOR_WATER,
  METAPHOR_EARTH,
  METAPHOR_METAL,
  METAPHOR_MIST,
  METAPHOR_STAR,
  METAPHOR_CRYSTAL,
  METAPHOR_MAP,
  getMetaphor,
  getAllMetaphorTypes,
  getAllMetaphors,
} from './metaphors'

// 配置管理
export {
  getEffectiveMetaphor,
  getBuiltinPaletteIds,
  getBuiltinPalette,
} from './config'
export type { VisualizationConfigSource } from './config'

// 风格包引擎
export {
  createStylePack,
  registerBuiltInPack,
  applyStylePack,
  exportStylePack,
  importStylePack,
  getStylePack,
  deleteStylePack,
  getAllStylePacks,
  getCustomStylePacks,
} from './style-packs'

// 预设风格包
export {
  PACK_GOLDEN_HOUR,
  PACK_OCEAN_DEEP,
  PACK_FOREST_CANOPY,
  PACK_DESERT_DUSK,
  PACK_AURORA_SKY,
  PACK_SAKURA_MIST,
  PACK_MIDNIGHT_STAR,
  PACK_CRYSTAL_CAVE,
  PACK_EMBER_GLOW,
  PACK_MONO_INK,
  PRESET_STYLE_PACKS,
  getPresetPack,
} from './style-packs/presets'

// 维度映射引擎
export {
  getDimensionMappings,
  getMappingByDimension,
  getMappingByVisualDimension,
  applyDimensionMapping,
  applyAllMappings,
} from './dimension-mapping'
export type {
  DataDimension,
  VisualDimension,
  TrendDirection,
  TextureDensity,
  DimensionMappingDef,
  DirectionResult,
  TextureResult,
  GlowResult,
  PositionResult,
  DimensionMappingResult,
  VisualConfigContext,
  ActiveMappings,
  DimensionData,
} from './dimension-mapping'

// 七维映射规则引擎（模块〇：蓝图定义）
export {
  SevenDimensionEngine,
  createSevenDimensionEngine,
  applyDataSourceFilter,
  getShapeAtomRenderParams,
  applySizeMapping,
  applyEnhancedColorMapping,
  applyRelationMapping,
  applyTimeMapping,
  getInteractionConfigs,
  createInteractionEvent,
  parseNaturalLanguage,
  nlpConfigToSevenDimensionConfig,
  getAllShapeAtomTypes,
  getAllSizeMappingModes,
  getAllColorMappingModes,
  getAllRelationMappingModes,
  getAllTimeMappingModes,
  getAllInteractionTypes,
  SHAPE_ATOM_LABELS,
  SIZE_MAPPING_LABELS,
  COLOR_MAPPING_LABELS,
  RELATION_MAPPING_LABELS,
  TIME_MAPPING_LABELS,
  INTERACTION_LABELS,
} from './dimension-mapping/seven-dimensions'
export type {
  DataSourceMode,
  TimeRangeFilter,
  FacetingConfig,
  DataSourceFilterConfig,
  DataSourceFilterResult,
  FacetingGroup,
  ShapeAtomType,
  ShapeAtomConfig,
  ShapeAtomRenderParams,
  SizeMappingMode,
  SizeMappingConfig,
  SizeMappingResult,
  ColorMappingMode,
  CategoryColorConfig,
  ContinuousColorConfig,
  TimePeriodColorConfig,
  UnifiedColorConfig,
  CustomColorBarConfig,
  EnhancedColorMappingConfig,
  ColorMappingResult,
  RelationMappingMode,
  RelationMappingConfig,
  RelationMappingResult,
  TimeMappingMode,
  TimeMappingConfig,
  TimeMappingResult,
  InteractionType,
  InteractionConfig,
  InteractionMappingConfig,
  InteractionEvent,
  SevenDimensionDataItem,
  SevenDimensionConfig,
  SevenDimensionRenderParams,
  SevenDimensionOutput,
  NLParsedConfig,
} from './dimension-mapping/seven-dimensions'

// 材质工坊引擎
export {
  createMaterial,
  editMaterial,
  saveMaterial,
  getMaterialLibrary,
  getMaterial,
  deleteMaterial,
  clearMaterialStore,
  getMaterialCount,
} from './workshop'
export type {
  VisualMaterial,
  MaterialCreateConfig,
  MaterialUpdates,
} from './workshop'

// 组件市场注册表
export {
  registerComponent,
  registerComponents,
  getComponent,
  getComponentsByCategory,
  getAllComponents,
  installComponent,
  uninstallComponent,
  toggleComponent,
  updateComponent,
  removeComponent,
  getInstalledComponents,
  getComponentCount,
  getInstalledCount,
  getCategoryDisplay,
  searchComponents,
  clearRegistry,
  initBuiltinComponents,
} from './component-market'
export type {
  ComponentMarketItem,
  ComponentRegistration,
  ComponentUpdates,
} from './component-market'

// 组件市场组合式（INCR-435：响应式 + 持久化桥接）
export { useComponentMarket, MARKET_STORAGE_KEY } from './component-market/useComponentMarket'
export type { ComponentOverrides, ComponentCategoryTab, ComponentCategoryKey } from './component-market/useComponentMarket'

// ---- 图表交互增强引擎（P15-3） ----
export {
  useChartInteraction,
  DEFAULT_ZOOM_CONFIG,
  DEFAULT_PAN_CONFIG,
  DEFAULT_ANNOTATION_STYLE,
  DEFAULT_EXPORT_CONFIG,
  DEFAULT_TRANSITION_CONFIG,
  DEFAULT_RESPONSIVE_CONFIG,
  PRESET_BREAKPOINTS,
} from './chart-interaction'
export type {
  ViewportTransform,
  ZoomConfig,
  PanConfig,
  AnnotationType,
  Annotation,
  AnnotationStyleConfig,
  ExportFormat,
  ExportConfig,
  ExportResult,
  TransitionType,
  TransitionConfig,
  TransitionState,
  ResponsiveBreakpoint,
  ResponsiveConfig,
  ChartInteractionState,
} from './chart-interaction'

// ---- Canvas 2D 渲染管线（P16-12） ----
export {
  useCanvasRenderer,
  DEFAULT_CANVAS_CONTEXT_CONFIG,
  DEFAULT_FRAME_SCHEDULE_CONFIG,
  DEFAULT_VIEW_TRANSFORM,
  PRESET_LAYERS,
} from './canvas-renderer'
export type {
  CanvasContextConfig,
  LayerType,
  LayerConfig,
  DrawCommandType,
  DrawCommand,
  CanvasViewTransform,
  RenderStats,
  DirtyRegion,
  FrameScheduleMode,
  FrameScheduleConfig,
  CanvasRendererState,
} from './canvas-renderer'

// ---- 数据源连接器框架（P16-12） ----
export {
  useTransformPipeline,
  useDataSourceConnector,
  DEFAULT_DATA_SOURCE_CONFIG,
} from './datasource-connector'
export type {
  DataSourceType,
  ConnectionStatus,
  DataFormat,
  DataSourceConfig,
  TransformOperation,
  FilterCondition,
  SortRule,
  AggregateRule,
  GroupRule,
  PaginateRule,
  ProjectRule,
  JoinRule,
  TransformStep,
  TransformPipelineConfig,
  ConnectionRecord,
  CacheEntry,
  DataSourceError,
  DataCallback,
  DataSubscription,
  ConnectorState,
} from './datasource-connector'

// ---- 仪表盘布局引擎（P16-12） ----
export {
  useDashboardLayout,
  DEFAULT_LAYOUT_CONFIG,
  DEFAULT_BREAKPOINTS,
  DEFAULT_PANEL_CONFIG,
  PRESET_TEMPLATES,
} from './dashboard-layout'

// ---- 数据视觉工坊 · 本地数据源适配器（M1 接线） ----
export {
  useVisualizationStudio,
  loadVisualizationSubjects,
  buildDefaultConfig,
  mapSessionsToItems,
  mapNotesToItems,
  mapEmotionsToItems,
  mapAnchorsToItems,
  VIZ_SUBJECTS,
} from './studio-data'
export type {
  VizSubject,
  VizSubjectDescriptor,
} from './studio-data'
export type {
  PanelType,
  SizeUnit,
  GridPosition,
  PanelSize,
  PanelConfig,
  DashboardBreakpoint,
  DashboardLayoutConfig,
  DashboardTemplate,
  LayoutSnapshot,
  DragState,
  ResizeState,
  DashboardLayoutState,
} from './dashboard-layout'

// ---- 视图桥接层（INCR-388 接线） ----
export { useVisualizationBridge } from './visualization-bridge'
export type { VisualizationState } from './visualization-bridge'