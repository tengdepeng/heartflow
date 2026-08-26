// ============================================================
// AI 桥接层测试
// 测试 useAIBridge composable 的状态聚合和操作
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { checkExternalAIGate } from '../external-gate'

// ---- Mock tauri-bridge ----

const mockAiConfigure = vi.fn()
const mockAiGetStatus = vi.fn()
const mockAiAnalyzeSentiment = vi.fn()
const mockAiGenerateSummary = vi.fn()
const mockAiSuggestActions = vi.fn()

vi.mock('../../tauri-bridge', () => ({
  aiChat: vi.fn(),
  aiConfigure: (...args: any[]) => mockAiConfigure(...args),
  aiGetStatus: (...args: any[]) => mockAiGetStatus(...args),
  aiAnalyzeSentiment: (...args: any[]) => mockAiAnalyzeSentiment(...args),
  aiGenerateSummary: (...args: any[]) => mockAiGenerateSummary(...args),
  aiSuggestActions: (...args: any[]) => mockAiSuggestActions(...args),
}))

// ---- Mock AI Engine ----

const mockEngineInitialize = vi.fn()
const mockEngineStats = {
  state: 'idle',
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  totalTokens: 0,
  averageLatency: 0,
  lastActivityAt: null,
}

vi.mock('../index', () => ({
  aiEngine: {
    initialize: () => mockEngineInitialize(),
    get stats() { return mockEngineStats },
    reset: vi.fn(),
  },
  getAIEngineConfig: vi.fn(() => ({
    enabled: true,
    activeProviderId: 'default',
    providers: {
      default: {
        type: 'openai',
        name: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-test',
        model: {
          model: 'gpt-4o-mini',
          temperature: 0.7,
          maxTokens: 1024,
          contextWindow: 8192,
          topP: 0.9,
          frequencyPenalty: 0.3,
          presencePenalty: 0.3,
        },
        timeout: 30000,
        maxRetries: 2,
        retryDelay: 1000,
      },
    },
    memory: { maxRounds: 10, enableSummarization: true, summaryThreshold: 8, preserveSystemPrompt: true },
    streamEnabled: false,
    debugMode: false,
  })),
  isAIEngineEnabled: vi.fn(() => true),
  hasUsableProvider: vi.fn(() => true),
  makeConversationId: vi.fn(),
}))

// ---- Mock Provider ----

const mockRegisterProvider = vi.fn()
const mockUnregisterProvider = vi.fn()
const mockGetProvider = vi.fn()

vi.mock('../provider', () => ({
  registerProvider: (...args: any[]) => mockRegisterProvider(...args),
  unregisterProvider: (...args: any[]) => mockUnregisterProvider(...args),
  getProvider: (...args: any[]) => mockGetProvider(...args),
}))

// ---- Mock 外部 AI 出口闸（默认放行；下方 describe 块单独验证拦截）----
vi.mock('../external-gate', () => ({
  checkExternalAIGate: vi.fn(() => null),
  isLocalAIModelHost: vi.fn(() => false),
  isExternalAIConsented: vi.fn(() => false),
}))

// ---- 测试 ----

let useAIBridge: any

beforeEach(async () => {
  vi.clearAllMocks()
  vi.mocked(checkExternalAIGate).mockReturnValue(null)
  // 重置默认 mock 返回值
  mockAiConfigure.mockResolvedValue({ success: true })
  mockAiGetStatus.mockResolvedValue({
    success: true,
    data: {
      configured: true,
      model_name: 'gpt-4o-mini',
      model_url: 'https://api.openai.com/v1/chat/completions',
      max_tokens: 1024,
      temperature: 0.7,
    },
  })
  mockAiAnalyzeSentiment.mockResolvedValue({
    success: true,
    data: '{"sentiment":"positive","confidence":0.9,"keywords":["测试"],"summary":"积极"}',
  })
  mockAiGenerateSummary.mockResolvedValue({
    success: true,
    data: '摘要内容',
  })
  mockAiSuggestActions.mockResolvedValue({
    success: true,
    data: '[{"action":"行动1","category":"分类","priority":"high"}]',
  })

  const mod = await import('../ai-bridge')
  useAIBridge = mod.useAIBridge
})

afterEach(() => {
  vi.mocked(checkExternalAIGate).mockReturnValue(null)
})

describe('useAIBridge — 初始化', () => {
  it('initialize 初始化引擎并注册 Tauri Provider', async () => {
    const bridge = useAIBridge()

    await bridge.initialize()

    expect(mockEngineInitialize).toHaveBeenCalled()
    expect(mockRegisterProvider).toHaveBeenCalled()
    // 注册的 provider ID 应该是 __tauri_agent__
    expect(mockRegisterProvider.mock.calls[0][0]).toBe('__tauri_agent__')
  })

  it('initialize 后 summary 反映后端状态', async () => {
    const bridge = useAIBridge()

    await bridge.initialize()

    expect(bridge.summary.value.backendConfigured).toBe(true)
    expect(bridge.summary.value.backendModel).toBe('gpt-4o-mini')
    expect(bridge.summary.value.engineEnabled).toBe(true)
  })

  it('initialize 后 isBackendReady 为 true', async () => {
    const bridge = useAIBridge()

    await bridge.initialize()

    expect(bridge.isBackendReady.value).toBe(true)
  })

  it('无活跃提供商配置时不注册 Tauri Provider', async () => {
    const { getAIEngineConfig } = await import('../index')
    ;(getAIEngineConfig as any).mockReturnValueOnce({
      enabled: true,
      activeProviderId: 'default',
      providers: {
        default: {
          type: 'openai',
          name: 'OpenAI',
          baseUrl: 'https://api.openai.com/v1',
          apiKey: '', // 空 API Key
          model: { model: 'gpt-4o-mini', temperature: 0.7, maxTokens: 1024, contextWindow: 8192, topP: 0.9, frequencyPenalty: 0.3, presencePenalty: 0.3 },
          timeout: 30000,
          maxRetries: 2,
          retryDelay: 1000,
        },
      },
      memory: { maxRounds: 10, enableSummarization: true, summaryThreshold: 8, preserveSystemPrompt: true },
      streamEnabled: false,
      debugMode: false,
    })

    const bridge = useAIBridge()
    await bridge.initialize()

    // 空 API Key 时不注册
    expect(mockRegisterProvider).not.toHaveBeenCalled()
  })
})

describe('useAIBridge — dispose', () => {
  it('清理资源', async () => {
    const bridge = useAIBridge()
    await bridge.initialize()

    bridge.dispose()

    expect(mockUnregisterProvider).toHaveBeenCalledWith('__tauri_agent__')
    expect(bridge.tauriProvider.value).toBeNull()
    expect(bridge.backendStatus.value).toBeNull()
  })
})

describe('useAIBridge — 配置同步', () => {
  it('syncConfigToBackend 同步配置并刷新状态', async () => {
    const bridge = useAIBridge()
    await bridge.initialize()

    const connected = await bridge.syncConfigToBackend()

    expect(connected).toBe(true)
    expect(mockAiConfigure).toHaveBeenCalled()
    expect(mockAiGetStatus).toHaveBeenCalled()
  })

  it('syncConfigToBackend 无 provider 时返回 false', async () => {
    const bridge = useAIBridge()
    // 未初始化，无 provider

    const connected = await bridge.syncConfigToBackend()

    expect(connected).toBe(false)
  })

  it('setProviderConfig 更新 provider 配置', async () => {
    const bridge = useAIBridge()
    await bridge.initialize()

    const newConfig = {
      type: 'openai' as const,
      baseUrl: 'https://new-api.example.com/v1',
      apiKey: 'sk-new',
      model: { model: 'gpt-4', temperature: 0.5, maxTokens: 2048, contextWindow: 8192, topP: 0.9, frequencyPenalty: 0.3, presencePenalty: 0.3 },
      timeout: 30000,
      maxRetries: 2,
      retryDelay: 1000,
    }

    bridge.setProviderConfig(newConfig)
    expect(bridge.tauriProvider.value.config.apiKey).toBe('sk-new')
  })
})

describe('useAIBridge — AI 能力', () => {
  it('analyzeSentiment 调用后端情感分析', async () => {
    const bridge = useAIBridge()
    await bridge.initialize()

    const result = await bridge.analyzeSentiment('今天很开心')

    expect(result).not.toBeNull()
    expect(result.sentiment).toBe('positive')
    expect(result.confidence).toBe(0.9)
    expect(mockAiAnalyzeSentiment).toHaveBeenCalledWith('今天很开心')
  })

  it('analyzeSentiment 无 provider 时返回 null', async () => {
    const bridge = useAIBridge()

    const result = await bridge.analyzeSentiment('test')

    expect(result).toBeNull()
  })

  it('generateSummary 调用后端生成摘要', async () => {
    const bridge = useAIBridge()
    await bridge.initialize()

    const summary = await bridge.generateSummary(['条目1', '条目2'])

    expect(summary).toBe('摘要内容')
    expect(mockAiGenerateSummary).toHaveBeenCalledWith(['条目1', '条目2'])
  })

  it('generateSummary 无 provider 时返回 null', async () => {
    const bridge = useAIBridge()

    const summary = await bridge.generateSummary(['条目1'])

    expect(summary).toBeNull()
  })

  it('suggestActions 调用后端建议行动', async () => {
    const bridge = useAIBridge()
    await bridge.initialize()

    const suggestions = await bridge.suggestActions('今天心情低落')

    expect(suggestions).toHaveLength(1)
    expect(suggestions[0].action).toBe('行动1')
    expect(mockAiSuggestActions).toHaveBeenCalledWith('今天心情低落')
  })

  it('suggestActions 无 provider 时返回空数组', async () => {
    const bridge = useAIBridge()

    const suggestions = await bridge.suggestActions('test')

    expect(suggestions).toEqual([])
  })
})

describe('useAIBridge — 直通', () => {
  it('getTauriProvider 返回 provider 实例', async () => {
    const bridge = useAIBridge()
    await bridge.initialize()

    const provider = bridge.getTauriProvider()
    expect(provider).not.toBeNull()
    expect(provider.type).toBe('tauri')
  })

  it('aiEngine 直通', async () => {
    const bridge = useAIBridge()
    expect(bridge.aiEngine).toBeDefined()
  })

  it('getAIEngineConfig 直通', async () => {
    const bridge = useAIBridge()
    const config = bridge.getAIEngineConfig()
    expect(config.enabled).toBe(true)
  })

  it('isAIEngineEnabled 直通', async () => {
    const bridge = useAIBridge()
    expect(bridge.isAIEngineEnabled()).toBe(true)
  })
})

describe('useAIBridge — 出口闸 · 外部 AI 同意闸', () => {
  it('analyzeSentiment 未授权远程端点时返回 null 且不调用后端', async () => {
    vi.mocked(checkExternalAIGate).mockReturnValue('外部 AI 端点未授权')
    const bridge = useAIBridge()
    await bridge.initialize()

    const result = await bridge.analyzeSentiment('今天很开心')

    expect(result).toBeNull()
    expect(mockAiAnalyzeSentiment).not.toHaveBeenCalled()
  })

  it('generateSummary 未授权远程端点时返回 null 且不调用后端', async () => {
    vi.mocked(checkExternalAIGate).mockReturnValue('外部 AI 端点未授权')
    const bridge = useAIBridge()
    await bridge.initialize()

    const summary = await bridge.generateSummary(['条目1', '条目2'])

    expect(summary).toBeNull()
    expect(mockAiGenerateSummary).not.toHaveBeenCalled()
  })

  it('suggestActions 未授权远程端点时返回空数组 且不调用后端', async () => {
    vi.mocked(checkExternalAIGate).mockReturnValue('外部 AI 端点未授权')
    const bridge = useAIBridge()
    await bridge.initialize()

    const suggestions = await bridge.suggestActions('今天心情低落')

    expect(suggestions).toEqual([])
    expect(mockAiSuggestActions).not.toHaveBeenCalled()
  })

  it('出口闸放行时后端能力正常透传', async () => {
    vi.mocked(checkExternalAIGate).mockReturnValue(null)
    const bridge = useAIBridge()
    await bridge.initialize()

    const result = await bridge.analyzeSentiment('今天很开心')
    expect(result).not.toBeNull()
    expect(mockAiAnalyzeSentiment).toHaveBeenCalledWith('今天很开心')
  })
})