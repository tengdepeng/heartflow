// ============================================================
// 心流工坊 · 可插拔引擎层 — 统一视图桥接层
// P22: 统一桥接层 — 聚合 AI/呈现/存储三大引擎状态
// ============================================================

import { computed, ref } from 'vue'

// ---- AI 引擎 ----
import { aiEngine } from './ai'
import { getAIEngineConfig, isAIEngineEnabled } from './ai/config'
import type {
  AIEngineStats,
  AIEngineState,
} from './ai/types'
import { modelManager } from './ai/model-manager'

// ---- 呈现引擎 ----
import {
  sceneRenderer,
  PERFORMANCE_PROFILES,
  ANIMATION_PRESETS,
  getPresetKeys,
} from './rendering'
import type {
  PerformanceLevel,
  RenderPhase,
  VisualEffectType,
  BlendMode,
} from './rendering/types'
import { RENDER_PHASE_ORDER } from './rendering/types'

// ---- 存储引擎 ----
import { loadSchema, SCHEMA_VERSION, getStorageBackend } from './storage/core'

// ============================================================
// 类型别名（兼容蓝图定义）
// ============================================================

// AIModelInfo 和 ProviderConfig 为蓝图兼容类型别名，保留供未来扩展使用
// type AIModelInfo = AIModelConfig
// type ProviderConfig = AIProviderConfig

// ============================================================
// 桥接层导出类型
// ============================================================

/** 引擎总览 */
export interface EngineOverview {
  aiEnabled: boolean
  rendererReady: boolean
  storageSize: number
  schemaVersion: number
  aiState: AIEngineState
  performanceLevel: PerformanceLevel
  storageBackend: string
}

/** AI 引擎桥接状态 */
export interface AIEngineBridgeStatus {
  enabled: boolean
  activeProvider: string | null
  availableProviders: string[]
  modelCount: number
  providerCount: number
}

/** 呈现引擎桥接状态 */
export interface RendererBridgeStatus {
  performanceLevel: PerformanceLevel
  activePipeline: {
    targetFPS: number
    vsync: boolean
    performanceMonitor: boolean
  }
  availablePresets: string[]
  animationPresetCount: number
}

/** 存储引擎桥接总览 */
export interface StorageBridgeOverview {
  schemaVersion: number
  storageKeys: string[]
  totalKVEntries: number
  storageBackend: string
  storageSize: number
}

/** 存储健康状态 */
export interface StorageHealth {
  backendName: string
  schemaVersion: number
  dataIntegrity: {
    hasConfig: boolean
    hasSessions: boolean
    hasCrystals: boolean
    hasCarriers: boolean
    hasConstitution: boolean
    hasAdvisors: boolean
    hasEmotions: boolean
    hasNotes: boolean
    hasAnchors: boolean
    hasGoals: boolean
    hasRelations: boolean
    hasLedger: boolean
    hasKVStore: boolean
  }
}

/** 引擎层建议 */
export interface EngineRecommendation {
  category: 'ai' | 'rendering' | 'storage'
  suggestion: string
  priority: 'high' | 'medium' | 'low'
}

// ============================================================
// 内部响应式标记
// ============================================================

/** 桥接层刷新版本号，触发所有 computed 重算 */
const bridgeVersion = ref(0)

/** 最后一次刷新时间 */
const lastRefreshAt = ref<string | null>(null)

// ============================================================
// 本地工具函数
// ============================================================

/** 获取当前 Schema 版本号 */
function getSchemaVersion(): number {
  return loadSchema().version
}

/** 创建 useModelManager 组合式函数（包装全局单例） */
function useModelManager() {
  return modelManager
}

/** 估算存储大小（字节） */
function estimateStorageSize(): number {
  try {
    const schema = loadSchema()
    const json = JSON.stringify(schema)
    // 估算：每个字符约 2 字节（UTF-16）
    return json.length * 2
  } catch {
    return 0
  }
}

/** 计算 KV 条目总数 */
function countKVEntries(): number {
  const schema = loadSchema()
  if (!schema.kvStore) return 0
  return Object.keys(schema.kvStore).length
}

// ============================================================
// 计算属性：引擎总览
// ============================================================

export const engineOverview = computed<EngineOverview>(() => {
  // 触发响应式依赖
  void bridgeVersion.value

  const config = getAIEngineConfig()
  const rendererStats = sceneRenderer.getStats()

  return {
    aiEnabled: config.enabled,
    rendererReady: rendererStats.totalFrames > 0 || sceneRenderer.getAllRenderers().length > 0,
    storageSize: estimateStorageSize(),
    schemaVersion: getSchemaVersion(),
    aiState: aiEngine.state,
    performanceLevel: (sceneRenderer.getConfig().targetFPS >= 60
      ? 'high'
      : sceneRenderer.getConfig().targetFPS >= 30
        ? 'balanced'
        : 'powersave') as PerformanceLevel,
    storageBackend: getStorageBackend(),
  }
})

// ============================================================
// 计算属性：AI 引擎状态
// ============================================================

export const aiEngineStatus = computed<AIEngineBridgeStatus>(() => {
  void bridgeVersion.value

  const config = getAIEngineConfig()
  const providerIds = Object.keys(config.providers)
  const mgr = useModelManager()
  const globalStats = mgr.getGlobalStats()

  return {
    enabled: isAIEngineEnabled(),
    activeProvider: config.activeProviderId,
    availableProviders: providerIds,
    modelCount: globalStats.totalModels,
    providerCount: providerIds.length,
  }
})

// ============================================================
// 计算属性：AI 引擎统计
// ============================================================

export const aiStats = computed<AIEngineStats>(() => {
  void bridgeVersion.value
  return aiEngine.stats
})

// ============================================================
// 计算属性：呈现引擎状态
// ============================================================

export const rendererStatus = computed<RendererBridgeStatus>(() => {
  void bridgeVersion.value

  const config = sceneRenderer.getConfig()
  const presets = getPresetKeys()

  // 根据目标帧率推断性能等级
  let perfLevel: PerformanceLevel
  if (config.targetFPS >= 60) {
    perfLevel = 'high'
  } else if (config.targetFPS >= 30) {
    perfLevel = 'balanced'
  } else {
    perfLevel = 'powersave'
  }

  return {
    performanceLevel: perfLevel,
    activePipeline: {
      targetFPS: config.targetFPS,
      vsync: config.vsync,
      performanceMonitor: config.performanceMonitor,
    },
    availablePresets: presets,
    animationPresetCount: Object.keys(ANIMATION_PRESETS).length,
  }
})

// ============================================================
// 计算属性：呈现引擎能力
// ============================================================

/** 所有支持的渲染阶段 */
const SUPPORTED_PHASES: RenderPhase[] = [...RENDER_PHASE_ORDER]

/** 所有可用的视觉效果类型 */
const AVAILABLE_EFFECTS: VisualEffectType[] = [
  'blur', 'glow', 'shadow', 'gradient', 'particle', 'filter', 'overlay',
]

/** 所有可用的混合模式 */
const AVAILABLE_BLEND_MODES: BlendMode[] = [
  'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
  'color-dodge', 'color-burn', 'soft-light', 'hard-light', 'difference', 'exclusion',
]

export const rendererCapabilities = computed(() => {
  void bridgeVersion.value

  return {
    supportedPhases: SUPPORTED_PHASES,
    availableEffects: AVAILABLE_EFFECTS,
    blendModes: AVAILABLE_BLEND_MODES,
  }
})

// ============================================================
// 计算属性：存储引擎总览
// ============================================================

export const storageOverview = computed<StorageBridgeOverview>(() => {
  void bridgeVersion.value

  const schema = loadSchema()
  const storageKeys = Object.keys(schema).filter(
    (k) => k !== 'version' && k !== 'config',
  )

  return {
    schemaVersion: getSchemaVersion(),
    storageKeys,
    totalKVEntries: countKVEntries(),
    storageBackend: getStorageBackend(),
    storageSize: estimateStorageSize(),
  }
})

// ============================================================
// 计算属性：存储健康
// ============================================================

export const storageHealth = computed<StorageHealth>(() => {
  void bridgeVersion.value

  const schema = loadSchema()

  return {
    backendName: getStorageBackend(),
    schemaVersion: getSchemaVersion(),
    dataIntegrity: {
      hasConfig: schema.config !== undefined && schema.config !== null,
      hasSessions: Array.isArray(schema.sessions),
      hasCrystals: Array.isArray(schema.crystals),
      hasCarriers: Array.isArray(schema.carriers),
      hasConstitution: schema.constitution !== undefined,
      hasAdvisors: Array.isArray(schema.advisors),
      hasEmotions: Array.isArray(schema.emotions),
      hasNotes: Array.isArray(schema.notes),
      hasAnchors: Array.isArray(schema.anchors),
      hasGoals: Array.isArray(schema.goals),
      hasRelations: Array.isArray(schema.relations),
      hasLedger: Array.isArray(schema.ledger),
      hasKVStore: schema.kvStore !== undefined && schema.kvStore !== null,
    },
  }
})

// ============================================================
// 计算属性：性能配置
// ============================================================

export const performanceProfile = computed(() => {
  void bridgeVersion.value

  const config = sceneRenderer.getConfig()
  const rendererStats = sceneRenderer.getStats()

  let level: PerformanceLevel
  if (config.targetFPS >= 60) {
    level = 'high'
  } else if (config.targetFPS >= 30) {
    level = 'balanced'
  } else {
    level = 'powersave'
  }

  const profile = PERFORMANCE_PROFILES[level]
  const optimizations: string[] = []

  if (profile.particlesEnabled) optimizations.push('粒子效果')
  if (profile.blurEnabled) optimizations.push('模糊效果')
  if (profile.shadowEnabled) optimizations.push('阴影渲染')
  if (profile.antialiasEnabled) optimizations.push('抗锯齿')
  if (config.autoSort) optimizations.push('渲染器自动排序')
  if (config.performanceMonitor) optimizations.push('性能监控')

  return {
    level,
    profile,
    currentFPS: rendererStats.currentFPS,
    averageFPS: rendererStats.averageFPS,
    optimizationsEnabled: optimizations,
  }
})

// ============================================================
// 计算属性：引擎层建议
// ============================================================

export const recommendations = computed<EngineRecommendation[]>(() => {
  void bridgeVersion.value

  const recs: EngineRecommendation[] = []
  const config = getAIEngineConfig()
  const rendererStats = sceneRenderer.getStats()
  const schema = loadSchema()

  // AI 引擎建议
  if (config.enabled && !config.providers[config.activeProviderId]?.apiKey) {
    recs.push({
      category: 'ai',
      suggestion: '当前激活的 AI 提供商尚未配置 API Key，建议在设置中完成配置以启用 AI 功能',
      priority: 'high',
    })
  }

  if (!config.enabled && Object.keys(config.providers).some((id) => config.providers[id].apiKey)) {
    recs.push({
      category: 'ai',
      suggestion: '已配置 API Key 但 AI 引擎未启用，建议开启 AI 引擎以使用智能幕僚功能',
      priority: 'medium',
    })
  }

  if (config.enabled && config.streamEnabled === false) {
    recs.push({
      category: 'ai',
      suggestion: '建议启用流式输出以获得更流畅的 AI 对话体验',
      priority: 'low',
    })
  }

  // 呈现引擎建议
  if (rendererStats.averageFPS < 30 && rendererStats.totalFrames > 0) {
    recs.push({
      category: 'rendering',
      suggestion: `当前平均帧率较低（${rendererStats.averageFPS.toFixed(1)} FPS），建议切换至 balanced 或 powersave 性能模式`,
      priority: 'high',
    })
  }

  if (rendererStats.skippedFrames > 0 && rendererStats.totalFrames > 0) {
    const skipRate = rendererStats.skippedFrames / rendererStats.totalFrames
    if (skipRate > 0.1) {
      recs.push({
        category: 'rendering',
        suggestion: `跳帧率过高（${(skipRate * 100).toFixed(1)}%），建议降低目标帧率或关闭部分视觉效果`,
        priority: 'medium',
      })
    }
  }

  const allRenderers = sceneRenderer.getAllRenderers()
  if (allRenderers.length === 0) {
    recs.push({
      category: 'rendering',
      suggestion: '未注册任何渲染器，呈现引擎尚未初始化',
      priority: 'medium',
    })
  }

  // 存储引擎建议
  const storageSize = estimateStorageSize()
  if (storageSize > 5 * 1024 * 1024) {
    recs.push({
      category: 'storage',
      suggestion: `存储数据量较大（${(storageSize / 1024 / 1024).toFixed(1)} MB），建议定期清理过期数据`,
      priority: 'medium',
    })
  }

  if (getSchemaVersion() < SCHEMA_VERSION) {
    recs.push({
      category: 'storage',
      suggestion: `存储 Schema 版本过旧（v${getSchemaVersion()}），将在下次保存时自动迁移至 v${SCHEMA_VERSION}`,
      priority: 'low',
    })
  }

  // 检查数据完整性
  if (!schema.config) {
    recs.push({
      category: 'storage',
      suggestion: '存储配置缺失，建议检查数据完整性',
      priority: 'high',
    })
  }

  return recs
})

// ============================================================
// 操作方法
// ============================================================

/**
 * 刷新所有引擎状态
 * 触发 bridgeVersion 更新，使所有 computed 属性重新计算
 */
export function refreshAll(): void {
  bridgeVersion.value++
  lastRefreshAt.value = new Date().toISOString()
}

/**
 * 获取存储统计信息
 * @returns 包含 key 数量和体积的统计对象
 */
export function getStorageStats(): {
  schemaVersion: number
  totalKeys: number
  totalKVEntries: number
  storageSize: number
  storageSizeFormatted: string
} {
  const schema = loadSchema()
  const totalKeys = Object.keys(schema).filter((k) => k !== 'version').length
  const size = estimateStorageSize()

  let formatted: string
  if (size < 1024) {
    formatted = `${size} B`
  } else if (size < 1024 * 1024) {
    formatted = `${(size / 1024).toFixed(1)} KB`
  } else {
    formatted = `${(size / 1024 / 1024).toFixed(1)} MB`
  }

  return {
    schemaVersion: getSchemaVersion(),
    totalKeys,
    totalKVEntries: countKVEntries(),
    storageSize: size,
    storageSizeFormatted: formatted,
  }
}

/**
 * 验证存储完整性
 * @returns 验证结果，包含是否通过和详情
 */
export function validateStorage(): {
  valid: boolean
  issues: string[]
  dataIntegrity: StorageHealth['dataIntegrity']
} {
  const schema = loadSchema()
  const issues: string[] = []

  // 检查版本
  if (schema.version !== SCHEMA_VERSION) {
    issues.push(`Schema 版本不匹配: 当前 v${schema.version}, 期望 v${SCHEMA_VERSION}`)
  }

  // 检查配置
  if (!schema.config) {
    issues.push('存储配置缺失')
  }

  // 检查各数据域
  if (!Array.isArray(schema.sessions)) {
    issues.push('sessions 数据域格式异常')
  }
  if (!Array.isArray(schema.crystals)) {
    issues.push('crystals 数据域格式异常')
  }
  if (!Array.isArray(schema.carriers)) {
    issues.push('carriers 数据域格式异常')
  }
  if (!Array.isArray(schema.advisors)) {
    issues.push('advisors 数据域格式异常')
  }
  if (!Array.isArray(schema.emotions)) {
    issues.push('emotions 数据域格式异常')
  }
  if (!Array.isArray(schema.notes)) {
    issues.push('notes 数据域格式异常')
  }
  if (!Array.isArray(schema.anchors)) {
    issues.push('anchors 数据域格式异常')
  }
  if (!Array.isArray(schema.goals)) {
    issues.push('goals 数据域格式异常')
  }
  if (!Array.isArray(schema.relations)) {
    issues.push('relations 数据域格式异常')
  }
  if (!Array.isArray(schema.ledger)) {
    issues.push('ledger 数据域格式异常')
  }

  const dataIntegrity: StorageHealth['dataIntegrity'] = {
    hasConfig: schema.config !== undefined && schema.config !== null,
    hasSessions: Array.isArray(schema.sessions),
    hasCrystals: Array.isArray(schema.crystals),
    hasCarriers: Array.isArray(schema.carriers),
    hasConstitution: schema.constitution !== undefined,
    hasAdvisors: Array.isArray(schema.advisors),
    hasEmotions: Array.isArray(schema.emotions),
    hasNotes: Array.isArray(schema.notes),
    hasAnchors: Array.isArray(schema.anchors),
    hasGoals: Array.isArray(schema.goals),
    hasRelations: Array.isArray(schema.relations),
    hasLedger: Array.isArray(schema.ledger),
    hasKVStore: schema.kvStore !== undefined && schema.kvStore !== null,
  }

  return {
    valid: issues.length === 0,
    issues,
    dataIntegrity,
  }
}