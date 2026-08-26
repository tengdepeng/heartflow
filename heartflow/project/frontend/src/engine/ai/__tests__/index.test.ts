// ============================================================
// AI 引擎 · 主类测试
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { AIMessage, AIResponse, AIProviderConfig } from '../types'

// ---- Mock 辅助函数 ----

function makeProviderConfig(overrides: Partial<AIProviderConfig> = {}): AIProviderConfig {
  return {
    type: 'openai',
    baseUrl: 'https://api.example.com/v1',
    apiKey: 'sk-test',
    model: { model: 'gpt-4o-mini', temperature: 0.7, maxTokens: 1024, contextWindow: 8192, topP: 0.9, frequencyPenalty: 0, presencePenalty: 0 },
    timeout: 10000,
    maxRetries: 1,
    retryDelay: 500,
    ...overrides,
  }
}

function makeSuccessResponse(text = 'AI 回应'): AIResponse {
  return {
    text,
    model: 'gpt-4o-mini',
    tokenUsage: { prompt: 10, completion: 5, total: 15 },
    latency: 100,
    success: true,
  }
}

function makeErrorResponse(error = '模拟错误'): AIResponse {
  return {
    text: '',
    model: 'gpt-4o-mini',
    tokenUsage: { prompt: 0, completion: 0, total: 0 },
    latency: 0,
    success: false,
    error,
  }
}

// ---- Mock 提供商 ----

class MockProvider {
  readonly id: string
  readonly displayName = 'Mock Provider'
  readonly type = 'openai'
  config: AIProviderConfig

  constructor(id: string, config: AIProviderConfig) {
    this.id = id
    this.config = config
  }

  checkConnection = vi.fn<() => Promise<boolean>>().mockResolvedValue(true)
  chat = vi.fn<(messages: AIMessage[], signal?: AbortSignal) => Promise<AIResponse>>()
    .mockResolvedValue(makeSuccessResponse())
  chatStream = vi.fn<(messages: AIMessage[], callbacks: any, signal?: AbortSignal) => Promise<void>>()
    .mockImplementation(async (_messages, callbacks) => {
      callbacks.onToken('测')
      callbacks.onToken('试')
      callbacks.onComplete('测试')
    })
  estimateTokens = vi.fn<(messages: AIMessage[]) => number>().mockReturnValue(10)
}

// ---- Mock 依赖模块 ----

vi.mock('../config', async () => {
  let mockEnabled = false
  let mockConfig = {
    enabled: false,
    activeProviderId: 'default',
    providers: {} as Record<string, AIProviderConfig>,
    memory: { maxRounds: 10, enableSummarization: true, summaryThreshold: 8, preserveSystemPrompt: true },
    streamEnabled: false,
    debugMode: false,
  }
  return {
    getAIEngineConfig: vi.fn(() => mockConfig),
    setAIEngineConfig: vi.fn((cfg: any) => { mockConfig = cfg }),
    patchAIEngineConfig: vi.fn((patch: any) => { mockConfig = { ...mockConfig, ...patch }; return mockConfig }),
    isAIEngineEnabled: vi.fn(() => mockEnabled),
    setAIEngineEnabled: vi.fn((v: boolean) => { mockEnabled = v }),
    hasUsableProvider: vi.fn(() => true),
    getProviderConfig: vi.fn(() => mockConfig.providers[mockConfig.activeProviderId] ?? null),
    setProviderConfig: vi.fn((id: string, cfg: AIProviderConfig) => { mockConfig.providers[id] = cfg }),
    removeProviderConfig: vi.fn(() => true),
    switchActiveProvider: vi.fn(() => true),
    listProviderIds: vi.fn(() => Object.keys(mockConfig.providers)),
    getActiveProviderConfig: vi.fn(() => mockConfig.providers[mockConfig.activeProviderId] ?? null),
    getMemoryConfig: vi.fn(() => mockConfig.memory),
    setMemoryConfig: vi.fn((m: any) => { mockConfig.memory = m }),
  }
})

vi.mock('../provider', async () => {
  const registry = new Map<string, MockProvider>()
  return {
    createProvider: vi.fn((id: string, config: AIProviderConfig) => new MockProvider(id, config)),
    registerProvider: vi.fn((id: string, provider: MockProvider) => { registry.set(id, provider) }),
    getProvider: vi.fn((id: string) => registry.get(id)),
    unregisterProvider: vi.fn((id: string) => registry.delete(id)),
    getAllProviders: vi.fn(() => Array.from(registry.values())),
    clearProviders: vi.fn(() => registry.clear()),
  }
})

vi.mock('../prompt', () => ({
  buildAdvisorSystemPrompt: vi.fn(() => '你是一个友善的幕僚，名为小镜。'),
  buildDingyinSystemPrompt: vi.fn(() => '你是一个定音锤总结助手。'),
  buildAnnualDialoguePrompt: vi.fn(() => '你是一个年度对话助手。'),
}))

vi.mock('../memory', () => {
  const store = new Map<string, AIMessage[]>()
  return {
    makeConversationId: vi.fn((advisorId: string) => `advisor_${advisorId}`),
    addMessage: vi.fn((convId: string, msg: AIMessage) => {
      if (!store.has(convId)) store.set(convId, [])
      store.get(convId)!.push(msg)
    }),
    setSystemPrompt: vi.fn((convId: string, prompt: string) => {
      if (!store.has(convId)) store.set(convId, [])
      const msgs = store.get(convId)!
      const idx = msgs.findIndex(m => m.role === 'system')
      if (idx >= 0) msgs[idx] = { role: 'system', content: prompt }
      else msgs.unshift({ role: 'system', content: prompt })
    }),
    clearConversation: vi.fn((convId: string) => { store.delete(convId) }),
    getRecentAdvisorConversation: vi.fn((_advisorId: string, _maxRounds?: number) => {
      return store.get(`advisor_${_advisorId}`) ?? []
    }),
    getConversationMessages: vi.fn((convId: string) => store.get(convId) ?? []),
    clearAllConversationCache: vi.fn(() => store.clear()),
    clearConversationCache: vi.fn((convId: string) => { store.delete(convId) }),
  }
})

// ---- 测试 ----

beforeEach(async () => {
  const { aiEngine } = await import('../index')
  aiEngine.reset()
})

describe('AIEngine 状态与统计', () => {
  it('初始状态为 idle', async () => {
    const { aiEngine } = await import('../index')
    expect(aiEngine.state).toBe('idle')
  })

  it('初始统计值为零', async () => {
    const { aiEngine } = await import('../index')
    const stats = aiEngine.stats
    expect(stats.totalRequests).toBe(0)
    expect(stats.successfulRequests).toBe(0)
    expect(stats.failedRequests).toBe(0)
    expect(stats.totalTokens).toBe(0)
    expect(stats.averageLatency).toBe(0)
    expect(stats.lastActivityAt).toBeNull()
    expect(stats.state).toBe('idle')
  })

  it('stats 返回的是副本', async () => {
    const { aiEngine } = await import('../index')
    const s1 = aiEngine.stats
    const s2 = aiEngine.stats
    expect(s1).not.toBe(s2)
  })
})

describe('AIEngine initialize', () => {
  beforeEach(async () => {
    const config = await import('../config')
    vi.mocked(config.setAIEngineEnabled).mockClear()
    const memory = await import('../memory')
    vi.mocked(memory.clearAllConversationCache).mockClear()
  })

  it('disabled 时不初始化提供商', async () => {
    const { aiEngine } = await import('../index')
    const config = await import('../config')
    vi.mocked(config.isAIEngineEnabled).mockReturnValue(false)

    aiEngine.initialize()

    const provider = await import('../provider')
    expect(vi.mocked(provider.clearProviders)).not.toHaveBeenCalled()
  })

  it('enabled 时注册提供商', async () => {
    const { aiEngine } = await import('../index')
    const config = await import('../config')
    vi.mocked(config.isAIEngineEnabled).mockReturnValue(true)
    vi.mocked(config.getAIEngineConfig).mockReturnValue({
      enabled: true,
      activeProviderId: 'default',
      providers: { default: makeProviderConfig() },
      memory: { maxRounds: 10, enableSummarization: true, summaryThreshold: 8, preserveSystemPrompt: true },
      streamEnabled: false,
      debugMode: false,
    })

    aiEngine.initialize()

    const provider = await import('../provider')
    expect(vi.mocked(provider.clearProviders)).toHaveBeenCalled()
    expect(vi.mocked(provider.createProvider)).toHaveBeenCalledWith('default', expect.any(Object))
    expect(vi.mocked(provider.registerProvider)).toHaveBeenCalled()
  })
})

describe('AIEngine checkConnection', () => {
  it('无提供商时返回 false', async () => {
    const { aiEngine } = await import('../index')
    const provider = await import('../provider')
    vi.mocked(provider.getProvider).mockReturnValue(undefined as any)

    const result = await aiEngine.checkConnection('nonexistent')
    expect(result).toBe(false)
  })

  it('有提供商时委托给 provider.checkConnection', async () => {
    const { aiEngine } = await import('../index')
    const mockProv = new MockProvider('p1', makeProviderConfig())
    const provider = await import('../provider')
    vi.mocked(provider.getProvider).mockReturnValue(mockProv as any)

    const result = await aiEngine.checkConnection('p1')
    expect(result).toBe(true)
    expect(mockProv.checkConnection).toHaveBeenCalled()
  })
})

describe('AIEngine chat', () => {
  beforeEach(async () => {
    const config = await import('../config')
    vi.mocked(config.isAIEngineEnabled).mockReturnValue(true)
  })

  it('引擎未启用时返回 disabled 错误', async () => {
    const { aiEngine } = await import('../index')
    const config = await import('../config')
    vi.mocked(config.isAIEngineEnabled).mockReturnValue(false)

    const result = await aiEngine.chat([{ role: 'user', content: 'hi' }])
    expect(result.success).toBe(false)
    expect(result.error).toContain('未启用')
  })

  it('无提供商时返回错误', async () => {
    const { aiEngine } = await import('../index')
    const provider = await import('../provider')
    vi.mocked(provider.getProvider).mockReturnValue(undefined as any)

    const result = await aiEngine.chat([{ role: 'user', content: 'hi' }])
    expect(result.success).toBe(false)
    expect(result.error).toContain('未找到')
  })

  it('成功调用返回 AIResponse', async () => {
    const { aiEngine } = await import('../index')
    const mockProv = new MockProvider('p1', makeProviderConfig())
    mockProv.chat.mockResolvedValue(makeSuccessResponse('你好，用户！'))
    const provider = await import('../provider')
    vi.mocked(provider.getProvider).mockReturnValue(mockProv as any)

    const result = await aiEngine.chat([{ role: 'user', content: '你好' }])
    expect(result.success).toBe(true)
    expect(result.text).toBe('你好，用户！')
    expect(mockProv.chat).toHaveBeenCalled()
  })

  it('失败时更新统计', async () => {
    const { aiEngine } = await import('../index')
    const mockProv = new MockProvider('p1', makeProviderConfig())
    mockProv.chat.mockResolvedValue(makeErrorResponse('API 错误'))
    const provider = await import('../provider')
    vi.mocked(provider.getProvider).mockReturnValue(mockProv as any)

    const result = await aiEngine.chat([{ role: 'user', content: 'hi' }])
    expect(result.success).toBe(false)
    expect(aiEngine.state).toBe('error')
    expect(aiEngine.stats.failedRequests).toBe(1)
  })

  it('成功时更新统计', async () => {
    const { aiEngine } = await import('../index')
    const mockProv = new MockProvider('p1', makeProviderConfig())
    mockProv.chat.mockResolvedValue(makeSuccessResponse('OK'))
    const provider = await import('../provider')
    vi.mocked(provider.getProvider).mockReturnValue(mockProv as any)

    await aiEngine.chat([{ role: 'user', content: 'hi' }])
    expect(aiEngine.state).toBe('connected')
    expect(aiEngine.stats.successfulRequests).toBe(1)
    expect(aiEngine.stats.totalTokens).toBe(15)
    expect(aiEngine.stats.totalRequests).toBe(1)
    expect(aiEngine.stats.lastActivityAt).not.toBeNull()
  })
})

describe('AIEngine chatStream', () => {
  beforeEach(async () => {
    const config = await import('../config')
    vi.mocked(config.isAIEngineEnabled).mockReturnValue(true)
  })

  it('引擎未启用时触发 onError', async () => {
    const { aiEngine } = await import('../index')
    const config = await import('../config')
    vi.mocked(config.isAIEngineEnabled).mockReturnValue(false)

    const onError = vi.fn()
    await aiEngine.chatStream(
      [{ role: 'user', content: 'hi' }],
      { onToken: vi.fn(), onComplete: vi.fn(), onError },
    )
    expect(onError).toHaveBeenCalled()
  })

  it('无提供商时触发 onError', async () => {
    const { aiEngine } = await import('../index')
    const provider = await import('../provider')
    vi.mocked(provider.getProvider).mockReturnValue(undefined as any)

    const onError = vi.fn()
    await aiEngine.chatStream(
      [{ role: 'user', content: 'hi' }],
      { onToken: vi.fn(), onComplete: vi.fn(), onError },
    )
    expect(onError).toHaveBeenCalled()
  })

  it('成功流式输出', async () => {
    const { aiEngine } = await import('../index')
    const mockProv = new MockProvider('p1', makeProviderConfig())
    const provider = await import('../provider')
    vi.mocked(provider.getProvider).mockReturnValue(mockProv as any)

    const onToken = vi.fn()
    const onComplete = vi.fn()

    await aiEngine.chatStream(
      [{ role: 'user', content: 'hi' }],
      { onToken, onComplete, onError: vi.fn() },
    )

    expect(onToken).toHaveBeenCalled()
    expect(onComplete).toHaveBeenCalled()
  })
})

describe('AIEngine 幕僚集成方法', () => {
  beforeEach(async () => {
    const config = await import('../config')
    vi.mocked(config.isAIEngineEnabled).mockReturnValue(true)
  })

  describe('getAdvisorReply', () => {
    it('成功时返回 AI 回应', async () => {
      const { aiEngine } = await import('../index')
      const mockProv = new MockProvider('p1', makeProviderConfig())
      mockProv.chat.mockResolvedValue(makeSuccessResponse('幕僚回应'))
      const provider = await import('../provider')
      vi.mocked(provider.getProvider).mockReturnValue(mockProv as any)

      const result = await aiEngine.getAdvisorReply(
        'advisor1', '小镜', 'scholar' as any, 'steady' as any, 60, '你好', 5,
      )
      expect(result).toBe('幕僚回应')
    })

    it('失败时返回空字符串', async () => {
      const { aiEngine } = await import('../index')
      const mockProv = new MockProvider('p1', makeProviderConfig())
      mockProv.chat.mockResolvedValue(makeErrorResponse('错误'))
      const provider = await import('../provider')
      vi.mocked(provider.getProvider).mockReturnValue(mockProv as any)

      const result = await aiEngine.getAdvisorReply(
        'advisor1', '小镜', 'scholar' as any, 'steady' as any, 60, '你好', 5,
      )
      expect(result).toBe('')
    })
  })

  describe('getDingyinReply', () => {
    it('成功时返回定音锤总结', async () => {
      const { aiEngine } = await import('../index')
      const mockProv = new MockProvider('p1', makeProviderConfig())
      mockProv.chat.mockResolvedValue(makeSuccessResponse('你已完成 5 次专注'))
      const provider = await import('../provider')
      vi.mocked(provider.getProvider).mockReturnValue(mockProv as any)

      const result = await aiEngine.getDingyinReply('a1', '小镜', 'steady' as any, 'focus_complete', 5)
      expect(result).toBe('你已完成 5 次专注')
    })

    it('失败时返回空字符串', async () => {
      const { aiEngine } = await import('../index')
      const mockProv = new MockProvider('p1', makeProviderConfig())
      mockProv.chat.mockResolvedValue(makeErrorResponse('错误'))
      const provider = await import('../provider')
      vi.mocked(provider.getProvider).mockReturnValue(mockProv as any)

      const result = await aiEngine.getDingyinReply('a1', '小镜', 'steady' as any, 'focus_complete', 5)
      expect(result).toBe('')
    })
  })

  describe('getAnnualDialogueReply', () => {
    it('成功时返回年度对话开场', async () => {
      const { aiEngine } = await import('../index')
      const mockProv = new MockProvider('p1', makeProviderConfig())
      mockProv.chat.mockResolvedValue(makeSuccessResponse('回顾这一年...'))
      const provider = await import('../provider')
      vi.mocked(provider.getProvider).mockReturnValue(mockProv as any)

      const result = await aiEngine.getAnnualDialogueReply('a1', '小镜', 'steady' as any, 'annual')
      expect(result).toBe('回顾这一年...')
    })

    it('季度对话也返回正确', async () => {
      const { aiEngine } = await import('../index')
      const mockProv = new MockProvider('p1', makeProviderConfig())
      mockProv.chat.mockResolvedValue(makeSuccessResponse('这个季度...'))
      const provider = await import('../provider')
      vi.mocked(provider.getProvider).mockReturnValue(mockProv as any)

      const result = await aiEngine.getAnnualDialogueReply('a1', '小镜', 'steady' as any, 'quarterly')
      expect(result).toBe('这个季度...')
    })

    it('失败时返回空字符串', async () => {
      const { aiEngine } = await import('../index')
      const mockProv = new MockProvider('p1', makeProviderConfig())
      mockProv.chat.mockResolvedValue(makeErrorResponse('错误'))
      const provider = await import('../provider')
      vi.mocked(provider.getProvider).mockReturnValue(mockProv as any)

      const result = await aiEngine.getAnnualDialogueReply('a1', '小镜', 'steady' as any, 'annual')
      expect(result).toBe('')
    })
  })
})

describe('AIEngine resetConversation', () => {
  it('委托给 clearConversation', async () => {
    const { aiEngine } = await import('../index')
    const memory = await import('../memory')

    aiEngine.resetConversation('advisor1')
    expect(vi.mocked(memory.clearConversation)).toHaveBeenCalledWith('advisor_advisor1')
  })
})

describe('AIEngine resetStats', () => {
  it('重置统计信息', async () => {
    const { aiEngine } = await import('../index')

    // 先做一些操作改变状态
    const mockProv = new MockProvider('p1', makeProviderConfig())
    mockProv.chat.mockResolvedValue(makeSuccessResponse('OK'))
    const provider = await import('../provider')
    vi.mocked(provider.getProvider).mockReturnValue(mockProv as any)
    const config = await import('../config')
    vi.mocked(config.isAIEngineEnabled).mockReturnValue(true)

    await aiEngine.chat([{ role: 'user', content: 'hi' }])
    expect(aiEngine.stats.totalRequests).toBe(1)

    aiEngine.resetStats()
    const stats = aiEngine.stats
    expect(stats.totalRequests).toBe(0)
    expect(stats.successfulRequests).toBe(0)
    expect(stats.failedRequests).toBe(0)
    expect(stats.totalTokens).toBe(0)
    expect(stats.averageLatency).toBe(0)
    expect(stats.lastActivityAt).toBeNull()
  })
})

describe('aiEngine 全局单例', () => {
  it('单例可正常导入', async () => {
    const { aiEngine } = await import('../index')
    expect(aiEngine).toBeDefined()
    expect(aiEngine.state).toBe('idle')
  })
})

describe('便捷导出', () => {
  it('导出 makeConversationId', async () => {
    const mod = await import('../index')
    expect(mod.makeConversationId).toBeDefined()
  })

  it('导出 getAIEngineConfig', async () => {
    const mod = await import('../index')
    expect(mod.getAIEngineConfig).toBeDefined()
  })

  it('导出 isAIEngineEnabled', async () => {
    const mod = await import('../index')
    expect(mod.isAIEngineEnabled).toBeDefined()
  })

  it('导出 hasUsableProvider', async () => {
    const mod = await import('../index')
    expect(mod.hasUsableProvider).toBeDefined()
  })
})