// ============================================================
// P23 引擎统一视图桥接层测试
// 测试 engine-bridge 模块导出的所有计算属性与操作方法：
//   初始化、引擎状态、统计信息、渲染器能力、
//   存储健康、性能配置、建议生成、操作方法
// ============================================================

import { describe, expect, it, beforeEach, vi } from 'vitest'

// ============================================================
// 共享 mock 状态（vi.hoisted 确保在 mock 工厂之前执行）
// ============================================================

const { mockAiEngine, mockSceneRenderer, mockLoadSchema, mockGetStorageBackend,
  getAiConfig, setAiConfig } = vi.hoisted(() => {
  // ---- mock AI 引擎 ----
  let _aiState = 'idle' as string
  let _aiStats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    totalTokens: 0,
    averageLatency: 0,
    lastActivityAt: null as string | null,
    state: 'idle' as string,
  }

  const mockAiEngine = {
    get state() { return _aiState },
    get stats() { return { ..._aiStats } },
    setState: (s: string) => { _aiState = s; _aiStats.state = s },
    setStats: (s: any) => { _aiStats = { ..._aiStats, ...s } },
    checkConnection: vi.fn().mockResolvedValue(true),
  }

  // ---- mock 呈现引擎 ----
  let _rendererConfig = {
    targetFPS: 60,
    maxFrameTime: 33,
    vsync: true,
    performanceMonitor: true,
    autoSort: true,
    frameSkipThreshold: 50,
  }
  let _rendererStats = {
    totalFrames: 0,
    currentFPS: 0,
    averageFPS: 0,
    minFPS: 0,
    maxFPS: 0,
    skippedFrames: 0,
    averageFrameTime: 0,
    phaseTimings: {} as Record<string, number>,
    rendererTimings: {} as Record<string, number>,
    lastRenderAt: null as string | null,
  }
  let _renderers: any[] = []

  const mockSceneRenderer = {
    getConfig: vi.fn(() => ({ ..._rendererConfig })),
    getStats: vi.fn(() => ({ ..._rendererStats })),
    getAllRenderers: vi.fn(() => [..._renderers]),
    setConfig: (c: any) => { _rendererConfig = { ..._rendererConfig, ...c } },
    setStats: (s: any) => { _rendererStats = { ..._rendererStats, ...s } },
    setRenderers: (r: any[]) => { _renderers = r },
  }

  // ---- mock 存储 ----
  let _schema: any = null
  const mockLoadSchema = vi.fn(() => {
    if (!_schema) {
      _schema = {
        version: 9,
        sessions: [],
        crystals: [],
        carriers: [],
        constitution: null,
        advisors: [],
        config: { theme: 'dark' },
        emotions: [],
        notes: [],
        anchors: [],
        goals: [],
        relations: [],
        advisorMessages: [],
        ledger: [],
        tagCategories: [],
        scenePresets: [],
        kvStore: {},
      }
    }
    return _schema
  })
  const mockGetStorageBackend = vi.fn(() => 'localStorage')

  // ---- mock AI 配置 ----
  let _aiConfig = {
    enabled: false,
    activeProviderId: 'default',
    providers: {} as Record<string, any>,
    memory: { maxRounds: 10, enableSummarization: true, summaryThreshold: 8, preserveSystemPrompt: true },
    streamEnabled: false,
    debugMode: false,
  }
  const getAiConfig = () => _aiConfig
  const setAiConfig = (c: any) => { _aiConfig = { ..._aiConfig, ...c } }

  return { mockAiEngine, mockSceneRenderer, mockLoadSchema, mockGetStorageBackend,
    getAiConfig, setAiConfig }
})

// ============================================================
// 辅助函数
// ============================================================

function buildMockSchema(): any {
  return {
    version: 9,
    sessions: [{ id: 's1', status: 'completed', mode: 'focus', startedAt: '2026-01-01T00:00:00Z', elapsed: 1500000, plannedDuration: 1500000, pausedDuration: 0, pausedAt: null, completedAt: '2026-01-01T00:25:00Z', tags: [], note: '', carrierId: null }],
    crystals: [{ id: 'c1', sessionId: 's1', color: '#fff', intensity: 0.8, createdAt: '2026-01-01T00:30:00Z', shape: 'sphere', tags: [], insight: '' }],
    carriers: [],
    constitution: { id: 'con1', title: '', content: '', createdAt: '', updatedAt: '' },
    advisors: [{ id: 'a1', name: '测试幕僚', role: 'sage', personality: {}, affinity: 50, avatar: '', unlocked: true, createdAt: '' }],
    config: { theme: 'dark', ai: { enabled: false, activeProviderId: 'default', providers: { default: { type: 'openai', baseUrl: '', apiKey: '', model: { model: 'gpt-4o-mini', temperature: 0.7, maxTokens: 1024, contextWindow: 8192, topP: 0.9, frequencyPenalty: 0.3, presencePenalty: 0.3 }, timeout: 30000, maxRetries: 2, retryDelay: 1000 } }, memory: { maxRounds: 10, enableSummarization: true, summaryThreshold: 8, preserveSystemPrompt: true }, streamEnabled: false, debugMode: false } },
    emotions: [],
    notes: [],
    anchors: [],
    goals: [],
    relations: [],
    advisorMessages: [],
    ledger: [],
    tagCategories: [],
    scenePresets: [],
    kvStore: { key1: 'value1', key2: 'value2' },
  }
}

function resetAllMockState() {
  mockAiEngine.setState('idle')
  mockAiEngine.setStats({ totalRequests: 0, successfulRequests: 0, failedRequests: 0, totalTokens: 0, averageLatency: 0, lastActivityAt: null })
  mockSceneRenderer.setConfig({ targetFPS: 60, maxFrameTime: 33, vsync: true, performanceMonitor: true, autoSort: true, frameSkipThreshold: 50 })
  mockSceneRenderer.setStats({ totalFrames: 0, currentFPS: 0, averageFPS: 0, minFPS: 0, maxFPS: 0, skippedFrames: 0, averageFrameTime: 0, phaseTimings: {}, rendererTimings: {}, lastRenderAt: null })
  mockSceneRenderer.setRenderers([])
  mockLoadSchema.mockReturnValue(buildMockSchema())
  mockGetStorageBackend.mockReturnValue('localStorage')
  setAiConfig({
    enabled: false,
    activeProviderId: 'default',
    providers: {} as Record<string, any>,
    memory: { maxRounds: 10, enableSummarization: true, summaryThreshold: 8, preserveSystemPrompt: true },
    streamEnabled: false,
    debugMode: false,
  })
}

// ============================================================
// vi.mock 声明
// ============================================================

vi.mock('../ai', () => ({
  aiEngine: mockAiEngine,
}))

vi.mock('../ai/config', () => ({
  getAIEngineConfig: vi.fn(() => {
    const config = getAiConfig()
    // 如果没有配置，初始化默认
    if (Object.keys(config.providers).length === 0) {
      config.providers = {
        default: {
          type: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1',
          apiKey: '', model: { model: 'gpt-4o-mini', temperature: 0.7, maxTokens: 1024, contextWindow: 8192, topP: 0.9, frequencyPenalty: 0.3, presencePenalty: 0.3 },
          timeout: 30000, maxRetries: 2, retryDelay: 1000,
        },
      }
    }
    return { ...config }
  }),
  isAIEngineEnabled: vi.fn(() => getAiConfig().enabled),
}))

vi.mock('../ai/model-manager', () => ({
  modelManager: {
    getGlobalStats: vi.fn(() => ({
      totalModels: 0,
      activeModels: 0,
      totalRequests: 0,
      totalTokens: 0,
    })),
  },
}))

vi.mock('../rendering', () => {
  const PERFORMANCE_PROFILES = {
    high: { level: 'high', targetFPS: 60, particlesEnabled: true, blurEnabled: true, shadowEnabled: true, antialiasEnabled: true, maxEffects: 50, maxAnimations: 100 },
    balanced: { level: 'balanced', targetFPS: 30, particlesEnabled: true, blurEnabled: false, shadowEnabled: true, antialiasEnabled: false, maxEffects: 20, maxAnimations: 50 },
    powersave: { level: 'powersave', targetFPS: 15, particlesEnabled: false, blurEnabled: false, shadowEnabled: false, antialiasEnabled: false, maxEffects: 5, maxAnimations: 10 },
  }
  const ANIMATION_PRESETS: Record<string, any> = {
    'fade-in': { name: 'Fade In', duration: 300, easing: 'ease-out', properties: [{ name: 'opacity', from: 0, to: 1 }] },
    'slide-up': { name: 'Slide Up', duration: 400, easing: 'ease-out', properties: [{ name: 'translateY', from: 20, to: 0, unit: 'px' }] },
    'bounce': { name: 'Bounce', duration: 600, easing: 'bounce', properties: [{ name: 'scale', from: 0.8, to: 1 }] },
  }
  return {
    sceneRenderer: mockSceneRenderer,
    PERFORMANCE_PROFILES,
    ANIMATION_PRESETS,
    getPresetKeys: vi.fn(() => Object.keys(ANIMATION_PRESETS)),
  }
})

vi.mock('../rendering/types', () => ({
  RENDER_PHASE_ORDER: ['prepare', 'layout', 'paint', 'composite', 'animate'],
}))

vi.mock('../storage/core', () => {
  const SCHEMA_VERSION = 9
  return {
    loadSchema: mockLoadSchema,
    SCHEMA_VERSION,
    getStorageBackend: mockGetStorageBackend,
  }
})

// ============================================================
// P23 引擎统一视图桥接层
// ============================================================

describe('P23 引擎统一视图桥接层', () => {
  let bridge: any

  // ==========================================================
  // 初始化
  // ==========================================================
  describe('初始化', () => {
    beforeEach(async () => {
      vi.resetModules()
      resetAllMockState()
      bridge = await import('../engine-bridge')
    })

    it('engineOverview 存在', () => {
      expect(bridge.engineOverview.value).toBeDefined()
      expect(typeof bridge.engineOverview.value.aiEnabled).toBe('boolean')
      expect(typeof bridge.engineOverview.value.rendererReady).toBe('boolean')
      expect(typeof bridge.engineOverview.value.storageSize).toBe('number')
      expect(typeof bridge.engineOverview.value.schemaVersion).toBe('number')
      expect(bridge.engineOverview.value.aiState).toBeDefined()
      expect(bridge.engineOverview.value.performanceLevel).toBeDefined()
      expect(typeof bridge.engineOverview.value.storageBackend).toBe('string')
    })

    it('aiEngineStatus 有 enabled 字段', () => {
      expect(bridge.aiEngineStatus.value).toBeDefined()
      expect(typeof bridge.aiEngineStatus.value.enabled).toBe('boolean')
      expect(bridge.aiEngineStatus.value.activeProvider).toBeDefined()
      expect(Array.isArray(bridge.aiEngineStatus.value.availableProviders)).toBe(true)
      expect(typeof bridge.aiEngineStatus.value.modelCount).toBe('number')
      expect(typeof bridge.aiEngineStatus.value.providerCount).toBe('number')
    })

    it('rendererStatus 有 performanceLevel', () => {
      expect(bridge.rendererStatus.value).toBeDefined()
      expect(['high', 'balanced', 'powersave']).toContain(bridge.rendererStatus.value.performanceLevel)
      expect(bridge.rendererStatus.value.activePipeline).toBeDefined()
      expect(typeof bridge.rendererStatus.value.activePipeline.targetFPS).toBe('number')
      expect(typeof bridge.rendererStatus.value.activePipeline.vsync).toBe('boolean')
      expect(Array.isArray(bridge.rendererStatus.value.availablePresets)).toBe(true)
      expect(typeof bridge.rendererStatus.value.animationPresetCount).toBe('number')
    })

    it('storageOverview 有 schemaVersion', () => {
      expect(bridge.storageOverview.value).toBeDefined()
      expect(typeof bridge.storageOverview.value.schemaVersion).toBe('number')
      expect(Array.isArray(bridge.storageOverview.value.storageKeys)).toBe(true)
      expect(typeof bridge.storageOverview.value.totalKVEntries).toBe('number')
      expect(typeof bridge.storageOverview.value.storageBackend).toBe('string')
      expect(typeof bridge.storageOverview.value.storageSize).toBe('number')
    })

    it('storageHealth 有 backendName', () => {
      expect(bridge.storageHealth.value).toBeDefined()
      expect(typeof bridge.storageHealth.value.backendName).toBe('string')
      expect(typeof bridge.storageHealth.value.schemaVersion).toBe('number')
      expect(bridge.storageHealth.value.dataIntegrity).toBeDefined()
    })

    it('storageHealth 包含 dataIntegrity 域检查', () => {
      const di = bridge.storageHealth.value.dataIntegrity
      expect(typeof di.hasConfig).toBe('boolean')
      expect(typeof di.hasSessions).toBe('boolean')
      expect(typeof di.hasCrystals).toBe('boolean')
      expect(typeof di.hasCarriers).toBe('boolean')
      expect(typeof di.hasConstitution).toBe('boolean')
      expect(typeof di.hasAdvisors).toBe('boolean')
      expect(typeof di.hasEmotions).toBe('boolean')
      expect(typeof di.hasNotes).toBe('boolean')
      expect(typeof di.hasAnchors).toBe('boolean')
      expect(typeof di.hasGoals).toBe('boolean')
      expect(typeof di.hasRelations).toBe('boolean')
      expect(typeof di.hasLedger).toBe('boolean')
      expect(typeof di.hasKVStore).toBe('boolean')
    })
  })

  // ==========================================================
  // 引擎状态
  // ==========================================================
  describe('引擎状态', () => {
    beforeEach(async () => {
      vi.resetModules()
      resetAllMockState()
      mockAiEngine.setState('connected')
      mockAiEngine.setStats({ totalRequests: 10, successfulRequests: 8, failedRequests: 2, totalTokens: 5000, averageLatency: 350, lastActivityAt: new Date().toISOString() })
      mockSceneRenderer.setConfig({ targetFPS: 60, maxFrameTime: 33, vsync: true, performanceMonitor: true, autoSort: true, frameSkipThreshold: 50 })
      mockSceneRenderer.setStats({ totalFrames: 1000, currentFPS: 60, averageFPS: 58, minFPS: 45, maxFPS: 60, skippedFrames: 5, averageFrameTime: 17, phaseTimings: {}, rendererTimings: {}, lastRenderAt: new Date().toISOString() })
      mockSceneRenderer.setRenderers([{ id: 'r1', name: 'Test Renderer', phase: 'paint', priority: 50, enabled: true, target: '#app', render: vi.fn() }])
      bridge = await import('../engine-bridge')
    })

    it('aiEngineStatus 反映 AI 引擎已连接', () => {
      expect(bridge.aiEngineStatus.value.enabled).toBe(false)
      expect(bridge.aiEngineStatus.value.activeProvider).toBe('default')
      expect(bridge.aiEngineStatus.value.providerCount).toBeGreaterThanOrEqual(0)
    })

    it('rendererStatus 反映预设配置', () => {
      expect(bridge.rendererStatus.value.performanceLevel).toBe('high')
      expect(bridge.rendererStatus.value.activePipeline.targetFPS).toBe(60)
      expect(bridge.rendererStatus.value.activePipeline.vsync).toBe(true)
    })

    it('rendererStatus 反映渲染器数量', () => {
      expect(bridge.rendererStatus.value.availablePresets).toBeDefined()
    })

    it('storageOverview 反映数据', () => {
      expect(bridge.storageOverview.value.schemaVersion).toBe(9)
      expect(bridge.storageOverview.value.totalKVEntries).toBe(2)
      expect(bridge.storageOverview.value.storageBackend).toBe('localStorage')
    })

    it('engineOverview 反映 AI 状态', () => {
      expect(bridge.engineOverview.value.aiEnabled).toBe(false)
      expect(bridge.engineOverview.value.rendererReady).toBe(true)
      expect(bridge.engineOverview.value.aiState).toBe('connected')
      expect(bridge.engineOverview.value.performanceLevel).toBe('high')
      expect(bridge.engineOverview.value.storageBackend).toBe('localStorage')
    })
  })

  // ==========================================================
  // 统计信息
  // ==========================================================
  describe('统计信息', () => {
    beforeEach(async () => {
      vi.resetModules()
      resetAllMockState()
      mockAiEngine.setState('connected')
      mockAiEngine.setStats({
        totalRequests: 100,
        successfulRequests: 95,
        failedRequests: 5,
        totalTokens: 50000,
        averageLatency: 280,
        lastActivityAt: new Date().toISOString(),
      })
      mockSceneRenderer.setConfig({ targetFPS: 60, maxFrameTime: 33, vsync: true, performanceMonitor: true, autoSort: true, frameSkipThreshold: 50 })
      mockSceneRenderer.setStats({ totalFrames: 0, currentFPS: 0, averageFPS: 0, minFPS: 0, maxFPS: 0, skippedFrames: 0, averageFrameTime: 0, phaseTimings: {}, rendererTimings: {}, lastRenderAt: null })
      mockSceneRenderer.setRenderers([])
      bridge = await import('../engine-bridge')
    })

    it('aiStats 有 totalRequests 字段', () => {
      expect(bridge.aiStats.value).toBeDefined()
      expect(bridge.aiStats.value.totalRequests).toBe(100)
      expect(bridge.aiStats.value.successfulRequests).toBe(95)
      expect(bridge.aiStats.value.failedRequests).toBe(5)
      expect(bridge.aiStats.value.totalTokens).toBe(50000)
      expect(bridge.aiStats.value.averageLatency).toBe(280)
    })

    it('aiStats 有 lastActivityAt 和 state 字段', () => {
      expect(bridge.aiStats.value.lastActivityAt).toBeDefined()
      expect(bridge.aiStats.value.state).toBe('connected')
    })
  })

  // ==========================================================
  // 渲染器能力
  // ==========================================================
  describe('渲染器能力', () => {
    beforeEach(async () => {
      vi.resetModules()
      resetAllMockState()
      bridge = await import('../engine-bridge')
    })

    it('rendererCapabilities 包含 supportedPhases', () => {
      expect(bridge.rendererCapabilities.value).toBeDefined()
      expect(Array.isArray(bridge.rendererCapabilities.value.supportedPhases)).toBe(true)
      expect(bridge.rendererCapabilities.value.supportedPhases.length).toBe(5)
      expect(bridge.rendererCapabilities.value.supportedPhases).toContain('prepare')
      expect(bridge.rendererCapabilities.value.supportedPhases).toContain('layout')
      expect(bridge.rendererCapabilities.value.supportedPhases).toContain('paint')
      expect(bridge.rendererCapabilities.value.supportedPhases).toContain('composite')
      expect(bridge.rendererCapabilities.value.supportedPhases).toContain('animate')
    })

    it('rendererCapabilities 包含 availableEffects', () => {
      expect(Array.isArray(bridge.rendererCapabilities.value.availableEffects)).toBe(true)
      expect(bridge.rendererCapabilities.value.availableEffects.length).toBeGreaterThan(0)
    })

    it('rendererCapabilities 包含 blendModes', () => {
      expect(Array.isArray(bridge.rendererCapabilities.value.blendModes)).toBe(true)
      expect(bridge.rendererCapabilities.value.blendModes.length).toBeGreaterThan(0)
    })
  })

  // ==========================================================
  // 存储健康
  // ==========================================================
  describe('存储健康', () => {
    it('storageHealth 完整 schema 所有域检查为 true', async () => {
      vi.resetModules()
      resetAllMockState()
      bridge = await import('../engine-bridge')
      const di = bridge.storageHealth.value.dataIntegrity
      expect(di.hasConfig).toBe(true)
      expect(di.hasSessions).toBe(true)
      expect(di.hasCrystals).toBe(true)
      expect(di.hasCarriers).toBe(true)
      expect(di.hasConstitution).toBe(true)
      expect(di.hasAdvisors).toBe(true)
      expect(di.hasKVStore).toBe(true)
    })

    it('storageHealth 空 schema 部分域检查为 false', async () => {
      vi.resetModules()
      resetAllMockState()
      mockLoadSchema.mockReturnValue({
        version: 9,
        sessions: [],
        crystals: [],
        carriers: [],
        advisors: [],
        emotions: [],
        notes: [],
        anchors: [],
        goals: [],
        relations: [],
        advisorMessages: [],
        ledger: [],
        tagCategories: [],
        scenePresets: [],
        kvStore: null,
      })
      bridge = await import('../engine-bridge')
      const di = bridge.storageHealth.value.dataIntegrity
      expect(di.hasConfig).toBe(false)
      expect(di.hasConstitution).toBe(false)
      expect(di.hasKVStore).toBe(false)
    })
  })

  // ==========================================================
  // 性能配置
  // ==========================================================
  describe('性能配置', () => {
    it('performanceProfile 有 level 和 profile', async () => {
      vi.resetModules()
      resetAllMockState()
      mockSceneRenderer.setConfig({ targetFPS: 60, maxFrameTime: 33, vsync: true, performanceMonitor: true, autoSort: true, frameSkipThreshold: 50 })
      mockSceneRenderer.setStats({ totalFrames: 500, currentFPS: 58, averageFPS: 55, minFPS: 40, maxFPS: 60, skippedFrames: 10, averageFrameTime: 18, phaseTimings: {}, rendererTimings: {}, lastRenderAt: new Date().toISOString() })
      bridge = await import('../engine-bridge')
      expect(bridge.performanceProfile.value).toBeDefined()
      expect(['high', 'balanced', 'powersave']).toContain(bridge.performanceProfile.value.level)
      expect(bridge.performanceProfile.value.profile).toBeDefined()
      expect(typeof bridge.performanceProfile.value.currentFPS).toBe('number')
      expect(typeof bridge.performanceProfile.value.averageFPS).toBe('number')
      expect(Array.isArray(bridge.performanceProfile.value.optimizationsEnabled)).toBe(true)
    })

    it('performanceProfile 低帧率时为 powersave', async () => {
      vi.resetModules()
      resetAllMockState()
      mockSceneRenderer.setConfig({ targetFPS: 15, maxFrameTime: 66, vsync: false, performanceMonitor: false, autoSort: false, frameSkipThreshold: 100 })
      mockSceneRenderer.setStats({ totalFrames: 0, currentFPS: 0, averageFPS: 0, minFPS: 0, maxFPS: 0, skippedFrames: 0, averageFrameTime: 0, phaseTimings: {}, rendererTimings: {}, lastRenderAt: null })
      bridge = await import('../engine-bridge')
      expect(bridge.performanceProfile.value.level).toBe('powersave')
    })

    it('performanceProfile 中帧率时为 balanced', async () => {
      vi.resetModules()
      resetAllMockState()
      mockSceneRenderer.setConfig({ targetFPS: 30, maxFrameTime: 33, vsync: true, performanceMonitor: false, autoSort: false, frameSkipThreshold: 50 })
      mockSceneRenderer.setStats({ totalFrames: 0, currentFPS: 0, averageFPS: 0, minFPS: 0, maxFPS: 0, skippedFrames: 0, averageFrameTime: 0, phaseTimings: {}, rendererTimings: {}, lastRenderAt: null })
      bridge = await import('../engine-bridge')
      expect(bridge.performanceProfile.value.level).toBe('balanced')
    })
  })

  // ==========================================================
  // 建议生成
  // ==========================================================
  describe('建议生成', () => {
    it('AI 未配置时建议配置 API Key', async () => {
      vi.resetModules()
      resetAllMockState()
      // 设置 AI 启用但无 API Key
      setAiConfig({
        enabled: true,
        activeProviderId: 'default',
        providers: {
          default: {
            type: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1',
            apiKey: '', model: { model: 'gpt-4o-mini', temperature: 0.7, maxTokens: 1024, contextWindow: 8192, topP: 0.9, frequencyPenalty: 0.3, presencePenalty: 0.3 },
            timeout: 30000, maxRetries: 2, retryDelay: 1000,
          },
        },
      })
      bridge = await import('../engine-bridge')
      const aiRec = bridge.recommendations.value.find((r: any) => r.category === 'ai' && r.priority === 'high')
      expect(aiRec).toBeDefined()
      expect(aiRec.suggestion).toContain('API Key')
    })

    it('存储过大时建议清理', async () => {
      vi.resetModules()
      resetAllMockState()
      // 创建大数据 schema（需超过 5MB 阈值，JSON.stringify 长度 * 2 > 5*1024*1024）
      const largeSchema: any = buildMockSchema()
      largeSchema.kvStore = {}
      const padding = 'x'.repeat(200)
      for (let i = 0; i < 15000; i++) {
        largeSchema.kvStore[`key_${i}`] = `value_${i}_${padding}`
      }
      mockLoadSchema.mockReturnValue(largeSchema)
      bridge = await import('../engine-bridge')
      const storageRec = bridge.recommendations.value.find((r: any) => r.category === 'storage' && r.priority === 'medium')
      expect(storageRec).toBeDefined()
      expect(storageRec.suggestion).toContain('清理')
    })
  })

  // ==========================================================
  // 操作方法
  // ==========================================================
  describe('操作方法', () => {
    beforeEach(async () => {
      vi.resetModules()
      resetAllMockState()
      bridge = await import('../engine-bridge')
    })

    it('refreshAll 触发重算不抛出异常', () => {
      expect(() => bridge.refreshAll()).not.toThrow()
    })

    it('getStorageStats 返回统计信息', () => {
      const stats = bridge.getStorageStats()
      expect(stats).toBeDefined()
      expect(typeof stats.schemaVersion).toBe('number')
      expect(typeof stats.totalKeys).toBe('number')
      expect(typeof stats.totalKVEntries).toBe('number')
      expect(typeof stats.storageSize).toBe('number')
      expect(typeof stats.storageSizeFormatted).toBe('string')
    })

    it('getStorageStats 包含格式化的大小字符串', () => {
      const stats = bridge.getStorageStats()
      expect(stats.storageSizeFormatted).toBeDefined()
      expect(stats.storageSizeFormatted.length).toBeGreaterThan(0)
    })

    it('validateStorage 返回完整性检查结果', () => {
      const result = bridge.validateStorage()
      expect(result).toBeDefined()
      expect(typeof result.valid).toBe('boolean')
      expect(Array.isArray(result.issues)).toBe(true)
      expect(result.dataIntegrity).toBeDefined()
    })

    it('validateStorage 完整 schema 返回 valid: true', () => {
      const result = bridge.validateStorage()
      expect(result.valid).toBe(true)
      expect(result.issues.length).toBe(0)
    })

    it('validateStorage 缺失 config 返回 issues', async () => {
      vi.resetModules()
      resetAllMockState()
      const brokenSchema: any = buildMockSchema()
      delete brokenSchema.config
      mockLoadSchema.mockReturnValue(brokenSchema)
      bridge = await import('../engine-bridge')
      const result = bridge.validateStorage()
      expect(result.valid).toBe(false)
      expect(result.issues.length).toBeGreaterThan(0)
      const configIssue = result.issues.find((i: string) => i.includes('配置'))
      expect(configIssue).toBeDefined()
    })
  })
})