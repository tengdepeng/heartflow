// ============================================================
// AI 引擎 · 提供商抽象层测试
// ============================================================
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import type { AIMessage, AIProviderConfig } from '../types'

// 出口闸默认放行，避免影响既有「远程 baseUrl 期望成功」用例；拦截场景在下方单独覆盖
vi.mock('../external-gate', () => ({
  checkExternalAIGate: vi.fn(() => null),
  isLocalAIModelHost: vi.fn(() => false),
  isExternalAIConsented: vi.fn(() => false),
}))

import { checkExternalAIGate } from '../external-gate'

function makeConfig(overrides: Partial<AIProviderConfig> = {}): AIProviderConfig {
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

describe('createProvider 工厂函数', () => {
  it('openai 类型创建 OpenAICompatibleProvider', async () => {
    const { createProvider } = await import('../provider')
    const provider = createProvider('test', makeConfig({ type: 'openai' }))
    expect(provider.type).toBe('openai')
    expect(provider.id).toBe('test')
  })

  it('local 类型创建 LocalProvider', async () => {
    const { createProvider } = await import('../provider')
    const provider = createProvider('local', makeConfig({ type: 'local', baseUrl: 'http://localhost:11434', apiKey: '' }))
    expect(provider.type).toBe('local')
    expect(provider.id).toBe('local')
  })

  it('custom 类型创建 OpenAICompatibleProvider', async () => {
    const { createProvider } = await import('../provider')
    const provider = createProvider('custom', makeConfig({ type: 'custom' }))
    expect(provider.type).toBe('openai') // custom 回退到 openai 工厂
  })
})

describe('提供商注册表', () => {
  beforeEach(async () => {
    const { clearProviders } = await import('../provider')
    clearProviders()
  })

  it('registerProvider / getProvider', async () => {
    const { createProvider, registerProvider, getProvider } = await import('../provider')
    const provider = createProvider('p1', makeConfig())
    registerProvider('p1', provider)
    expect(getProvider('p1')).toBe(provider)
  })

  it('getProvider 对不存在的 ID 返回 undefined', async () => {
    const { getProvider } = await import('../provider')
    expect(getProvider('nonexistent')).toBeUndefined()
  })

  it('unregisterProvider 移除注册', async () => {
    const { createProvider, registerProvider, unregisterProvider, getProvider } = await import('../provider')
    const provider = createProvider('p1', makeConfig())
    registerProvider('p1', provider)
    expect(unregisterProvider('p1')).toBe(true)
    expect(getProvider('p1')).toBeUndefined()
  })

  it('unregisterProvider 对不存在的返回 false', async () => {
    const { unregisterProvider } = await import('../provider')
    expect(unregisterProvider('nonexistent')).toBe(false)
  })

  it('getAllProviders 返回所有注册的提供商', async () => {
    const { createProvider, registerProvider, getAllProviders } = await import('../provider')
    registerProvider('a', createProvider('a', makeConfig()))
    registerProvider('b', createProvider('b', makeConfig()))
    expect(getAllProviders()).toHaveLength(2)
  })
})

describe('OpenAICompatibleProvider estimateTokens', () => {
  it('估算空消息列表', async () => {
    const { OpenAICompatibleProvider } = await import('../provider')
    const provider = new OpenAICompatibleProvider('test', makeConfig())
    expect(provider.estimateTokens([])).toBe(3)
  })

  it('估算单条消息', async () => {
    const { OpenAICompatibleProvider } = await import('../provider')
    const provider = new OpenAICompatibleProvider('test', makeConfig())
    const tokens = provider.estimateTokens([{ role: 'user', content: 'hello' }])
    // 5/4=1.25 -> 2 + 4 + 3 = 9
    expect(tokens).toBe(9)
  })

  it('估算多条消息', async () => {
    const { OpenAICompatibleProvider } = await import('../provider')
    const provider = new OpenAICompatibleProvider('test', makeConfig())
    const tokens = provider.estimateTokens([
      { role: 'system', content: 'You are a helper' },
      { role: 'user', content: 'Hello' },
    ])
    // (16/4=4+4) + (5/4=2+4) + 3 = 8+6+3 = 17
    expect(tokens).toBe(17)
  })
})

describe('LocalProvider estimateTokens', () => {
  it('估算与 OpenAI 兼容实现一致', async () => {
    const { LocalProvider, OpenAICompatibleProvider } = await import('../provider')
    const local = new LocalProvider('local', makeConfig({ type: 'local' }))
    const openai = new OpenAICompatibleProvider('openai', makeConfig())
    const msgs: AIMessage[] = [{ role: 'user', content: '测试消息' }]
    expect(local.estimateTokens(msgs)).toBe(openai.estimateTokens(msgs))
  })
})

describe('OpenAICompatibleProvider checkConnection', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('API 可用时返回 true', async () => {
    const { OpenAICompatibleProvider } = await import('../provider')
    const provider = new OpenAICompatibleProvider('test', makeConfig())

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
    } as Response)

    const result = await provider.checkConnection()
    expect(result).toBe(true)
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.example.com/v1/models',
      expect.objectContaining({
        headers: expect.objectContaining({ 'Authorization': 'Bearer sk-test' }),
      }),
    )
  })

  it('API 不可用时返回 false', async () => {
    const { OpenAICompatibleProvider } = await import('../provider')
    const provider = new OpenAICompatibleProvider('test', makeConfig())

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
    } as Response)

    const result = await provider.checkConnection()
    expect(result).toBe(false)
  })

  it('网络错误时返回 false', async () => {
    const { OpenAICompatibleProvider } = await import('../provider')
    const provider = new OpenAICompatibleProvider('test', makeConfig())

    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    const result = await provider.checkConnection()
    expect(result).toBe(false)
  })
})

describe('OpenAICompatibleProvider chat', () => {
  afterEach(() => { delete (globalThis as any).fetch })

  it('成功响应返回 AIResponse', async () => {
    const { OpenAICompatibleProvider } = await import('../provider')
    const provider = new OpenAICompatibleProvider('test', makeConfig())

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: '你好，用户！' } }],
        model: 'gpt-4o-mini',
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      }),
    } as Response)

    const result = await provider.chat([{ role: 'user', content: '你好' }])
    expect(result.success).toBe(true)
    expect(result.text).toBe('你好，用户！')
    expect(result.model).toBe('gpt-4o-mini')
    expect(result.tokenUsage.total).toBe(15)
  })

  it('HTTP 错误时返回错误信息', async () => {
    const { OpenAICompatibleProvider } = await import('../provider')
    const provider = new OpenAICompatibleProvider('test', makeConfig())

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: () => Promise.resolve('Invalid API key'),
    } as Response)

    const result = await provider.chat([{ role: 'user', content: 'hi' }])
    expect(result.success).toBe(false)
    expect(result.error).toContain('401')
  })

  it('网络异常时返回错误信息', async () => {
    const { OpenAICompatibleProvider } = await import('../provider')
    const provider = new OpenAICompatibleProvider('test', makeConfig())

    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network failure'))

    const result = await provider.chat([{ role: 'user', content: 'hi' }])
    expect(result.success).toBe(false)
    expect(result.error).toContain('Network failure')
  })

  it('AbortError 时返回取消信息', async () => {
    const { OpenAICompatibleProvider } = await import('../provider')
    const provider = new OpenAICompatibleProvider('test', makeConfig())

    const abortError = new Error('The operation was aborted')
    abortError.name = 'AbortError'
    globalThis.fetch = vi.fn().mockRejectedValue(abortError)

    const result = await provider.chat([{ role: 'user', content: 'hi' }])
    expect(result.success).toBe(false)
    expect(result.error).toContain('取消')
  })

  it('发送请求时包含正确的请求体', async () => {
    const { OpenAICompatibleProvider } = await import('../provider')
    const provider = new OpenAICompatibleProvider('test', makeConfig())

    let requestBody: any = null
    globalThis.fetch = vi.fn().mockImplementation(async (_url: string, options: any) => {
      requestBody = JSON.parse(options.body)
      return {
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'ok' } }],
          model: 'gpt-4o-mini',
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        }),
      } as Response
    })

    await provider.chat([{ role: 'user', content: 'test' }])
    expect(requestBody.model).toBe('gpt-4o-mini')
    expect(requestBody.temperature).toBe(0.7)
    expect(requestBody.max_tokens).toBe(1024)
    expect(requestBody.messages).toHaveLength(1)
    expect(requestBody.messages[0].content).toBe('test')
  })
})

describe('LocalProvider checkConnection', () => {
  afterEach(() => { delete (globalThis as any).fetch })

  it('Ollama 可用时返回 true', async () => {
    const { LocalProvider } = await import('../provider')
    const config = makeConfig({ type: 'local', baseUrl: 'http://localhost:11434', apiKey: '' })
    const provider = new LocalProvider('local', config)

    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true } as Response)

    const result = await provider.checkConnection()
    expect(result).toBe(true)
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:11434/api/tags',
      expect.any(Object),
    )
  })

  it('Ollama 不可用时返回 false', async () => {
    const { LocalProvider } = await import('../provider')
    const config = makeConfig({ type: 'local', baseUrl: 'http://localhost:11434', apiKey: '' })
    const provider = new LocalProvider('local', config)

    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'))

    const result = await provider.checkConnection()
    expect(result).toBe(false)
  })
})

describe('LocalProvider chat', () => {
  afterEach(() => { delete (globalThis as any).fetch })

  it('成功响应返回 AIResponse', async () => {
    const { LocalProvider } = await import('../provider')
    const config = makeConfig({ type: 'local', baseUrl: 'http://localhost:11434', apiKey: '' })
    const provider = new LocalProvider('local', config)

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        message: { content: '本地模型回复' },
        model: 'llama3',
        prompt_eval_count: 20,
        eval_count: 10,
      }),
    } as Response)

    const result = await provider.chat([
      { role: 'system', content: '你是助手' },
      { role: 'user', content: '你好' },
    ])
    expect(result.success).toBe(true)
    expect(result.text).toBe('本地模型回复')
    expect(result.tokenUsage.total).toBe(30)
  })

  it('HTTP 错误时返回错误信息', async () => {
    const { LocalProvider } = await import('../provider')
    const config = makeConfig({ type: 'local', baseUrl: 'http://localhost:11434', apiKey: '' })
    const provider = new LocalProvider('local', config)

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    } as Response)

    const result = await provider.chat([{ role: 'user', content: 'hi' }])
    expect(result.success).toBe(false)
    expect(result.error).toContain('500')
  })
})

describe('OpenAICompatibleProvider chatStream', () => {
  afterEach(() => { delete (globalThis as any).fetch })

  it('流式输出完整回调', async () => {
    const { OpenAICompatibleProvider } = await import('../provider')
    const provider = new OpenAICompatibleProvider('test', makeConfig())

    const chunks = [
      'data: {"choices":[{"delta":{"content":"你"}}]}\n',
      'data: {"choices":[{"delta":{"content":"好"}}]}\n',
      'data: [DONE]\n',
    ]

    // 模拟 ReadableStream
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk))
        }
        controller.close()
      },
    })

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: stream,
    } as Response)

    const tokens: string[] = []
    let fullText = ''

    await provider.chatStream(
      [{ role: 'user', content: 'hi' }],
      {
        onToken: (token) => { tokens.push(token) },
        onComplete: (text) => { fullText = text },
        onError: () => { throw new Error('不应触发 onError') },
      },
    )

    expect(tokens).toEqual(['你', '好'])
    expect(fullText).toBe('你好')
  })

  it('HTTP 错误时触发 onError', async () => {
    const { OpenAICompatibleProvider } = await import('../provider')
    const provider = new OpenAICompatibleProvider('test', makeConfig())

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      text: () => Promise.resolve('Rate limited'),
    } as Response)

    let error: Error | null = null
    await provider.chatStream(
      [{ role: 'user', content: 'hi' }],
      {
        onToken: () => {},
        onComplete: () => { throw new Error('不应触发 onComplete') },
        onError: (e) => { error = e },
      },
    )

    expect(error).not.toBeNull()
    expect(error!.message).toContain('429')
  })
})

describe('出口闸 · 外部 AI 同意闸（宪法第 I 条 fail-closed）', () => {
  const BLOCKED = '外部 AI 端点未授权：需在宪法页面显式开启「允许远程 AI 端点」'

  beforeEach(() => {
    vi.mocked(checkExternalAIGate).mockReturnValue(null)
  })
  afterEach(() => {
    vi.mocked(checkExternalAIGate).mockReturnValue(null)
  })

  it('未授权外部端点时 chat 拦截且不发起 fetch', async () => {
    const { OpenAICompatibleProvider } = await import('../provider')
    vi.mocked(checkExternalAIGate).mockReturnValue(BLOCKED)
    const provider = new OpenAICompatibleProvider('test', makeConfig())
    const fetchSpy = (globalThis.fetch = vi.fn())

    const result = await provider.chat([{ role: 'user', content: 'hi' }])

    expect(result.success).toBe(false)
    expect(result.error).toBe(BLOCKED)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('未授权外部端点时 checkConnection 返回 false 且不探测', async () => {
    const { OpenAICompatibleProvider } = await import('../provider')
    vi.mocked(checkExternalAIGate).mockReturnValue(BLOCKED)
    const provider = new OpenAICompatibleProvider('test', makeConfig())
    const fetchSpy = (globalThis.fetch = vi.fn())

    const result = await provider.checkConnection()

    expect(result).toBe(false)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('未授权外部端点时 chatStream 触发 onError', async () => {
    const { OpenAICompatibleProvider } = await import('../provider')
    vi.mocked(checkExternalAIGate).mockReturnValue(BLOCKED)
    const provider = new OpenAICompatibleProvider('test', makeConfig())
    const onError = vi.fn()

    await provider.chatStream(
      [{ role: 'user', content: 'hi' }],
      { onToken: vi.fn(), onComplete: vi.fn(), onError },
    )

    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: BLOCKED }))
  })

  it('未授权外部端点时 LocalProvider chat 同样拦截', async () => {
    const { LocalProvider } = await import('../provider')
    vi.mocked(checkExternalAIGate).mockReturnValue(BLOCKED)
    const config = makeConfig({ type: 'local', baseUrl: 'http://192.168.1.50:11434', apiKey: '' })
    const provider = new LocalProvider('local', config)
    const fetchSpy = (globalThis.fetch = vi.fn())

    const result = await provider.chat([{ role: 'user', content: 'hi' }])

    expect(result.success).toBe(false)
    expect(result.error).toBe(BLOCKED)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('出口闸放行时（本地或已同意）正常发起请求', async () => {
    const { OpenAICompatibleProvider } = await import('../provider')
    const provider = new OpenAICompatibleProvider('test', makeConfig())
    const fetchSpy = (globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: 'ok' } }],
        model: 'gpt-4o-mini',
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      }),
    } as Response))

    const result = await provider.chat([{ role: 'user', content: 'hi' }])

    expect(result.success).toBe(true)
    expect(fetchSpy).toHaveBeenCalled()
  })
})