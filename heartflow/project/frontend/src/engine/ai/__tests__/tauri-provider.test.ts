// ============================================================
// Tauri AI 提供商测试
// 测试 TauriAIProvider 的 AIProvider 接口实现
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { AIProviderConfig, AIMessage } from '../types'

// ---- Mock tauri-bridge ----

const mockAiChat = vi.fn()
const mockAiConfigure = vi.fn()
const mockAiGetStatus = vi.fn()
const mockAiAnalyzeSentiment = vi.fn()
const mockAiGenerateSummary = vi.fn()
const mockAiSuggestActions = vi.fn()

vi.mock('../../tauri-bridge', () => ({
  aiChat: (...args: any[]) => mockAiChat(...args),
  aiConfigure: (...args: any[]) => mockAiConfigure(...args),
  aiGetStatus: (...args: any[]) => mockAiGetStatus(...args),
  aiAnalyzeSentiment: (...args: any[]) => mockAiAnalyzeSentiment(...args),
  aiGenerateSummary: (...args: any[]) => mockAiGenerateSummary(...args),
  aiSuggestActions: (...args: any[]) => mockAiSuggestActions(...args),
}))

// 出口闸默认放行，避免影响既有「远程 baseUrl 期望成功」用例；拦截场景在下方单独覆盖
vi.mock('../external-gate', () => ({
  checkExternalAIGate: vi.fn(() => null),
  isLocalAIModelHost: vi.fn(() => false),
  isExternalAIConsented: vi.fn(() => false),
}))

import { checkExternalAIGate } from '../external-gate'
import { loadSchema, saveSchema } from '../../storage/core'

// ---- 辅助函数 ----

function makeConfig(overrides: Partial<AIProviderConfig> = {}): AIProviderConfig {
  return {
    type: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: 'sk-test-key',
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
    ...overrides,
  }
}

function makeMessages(): AIMessage[] {
  return [
    { role: 'system', content: '你是一个助手' },
    { role: 'user', content: '你好' },
  ]
}

// ---- 测试 ----

let TauriAIProvider: any

beforeEach(async () => {
  vi.clearAllMocks()
  const mod = await import('../tauri-provider')
  TauriAIProvider = mod.TauriAIProvider
})

describe('TauriAIProvider — 构造与基础属性', () => {
  it('正确设置 id、displayName 和 type', () => {
    const config = makeConfig()
    const provider = new TauriAIProvider('tauri-1', config)
    expect(provider.id).toBe('tauri-1')
    expect(provider.displayName).toBe('Tauri AI Agent')
    expect(provider.type).toBe('tauri')
  })

  it('使用 config.name 作为 displayName', () => {
    const config = makeConfig({ name: 'My Backend AI' })
    const provider = new TauriAIProvider('tauri-2', config)
    expect(provider.displayName).toBe('My Backend AI')
  })

  it('config 可读写', () => {
    const config = makeConfig()
    const provider = new TauriAIProvider('tauri-3', config)
    expect(provider.config.apiKey).toBe('sk-test-key')

    const newConfig = makeConfig({ apiKey: 'sk-new-key' })
    provider.config = newConfig
    expect(provider.config.apiKey).toBe('sk-new-key')
  })
})

describe('TauriAIProvider — checkConnection', () => {
  it('同步配置后检查后端状态', async () => {
    mockAiConfigure.mockResolvedValueOnce({ success: true })
    mockAiGetStatus.mockResolvedValueOnce({
      success: true,
      data: {
        configured: true,
        model_name: 'gpt-4o-mini',
        model_url: 'https://api.openai.com/v1/chat/completions',
        max_tokens: 1024,
        temperature: 0.7,
      },
    })

    const provider = new TauriAIProvider('tauri', makeConfig())
    const connected = await provider.checkConnection()

    expect(connected).toBe(true)
    expect(mockAiConfigure).toHaveBeenCalled()
    expect(mockAiGetStatus).toHaveBeenCalled()
  })

  it('后端未配置时返回 false', async () => {
    mockAiConfigure.mockResolvedValueOnce({ success: true })
    mockAiGetStatus.mockResolvedValueOnce({
      success: true,
      data: {
        configured: false,
        model_name: 'gpt-3.5-turbo',
        model_url: 'https://api.openai.com/v1/chat/completions',
        max_tokens: 2048,
        temperature: 0.7,
      },
    })

    const provider = new TauriAIProvider('tauri', makeConfig())
    const connected = await provider.checkConnection()

    expect(connected).toBe(false)
  })

  it('getStatus 失败时返回 false', async () => {
    mockAiConfigure.mockResolvedValueOnce({ success: true })
    mockAiGetStatus.mockResolvedValueOnce({ success: false, error: '连接失败' })

    const provider = new TauriAIProvider('tauri', makeConfig())
    const connected = await provider.checkConnection()

    expect(connected).toBe(false)
  })
})

describe('TauriAIProvider — chat', () => {
  it('成功调用 AI 对话', async () => {
    mockAiConfigure.mockResolvedValueOnce({ success: true })
    mockAiChat.mockResolvedValueOnce({
      success: true,
      data: '你好！有什么可以帮助你的？',
    })

    const provider = new TauriAIProvider('tauri', makeConfig())
    const response = await provider.chat(makeMessages())

    expect(response.success).toBe(true)
    expect(response.text).toBe('你好！有什么可以帮助你的？')
    expect(response.model).toBe('gpt-4o-mini')
    expect(response.tokenUsage.total).toBeGreaterThan(0)
    expect(mockAiChat).toHaveBeenCalledWith([
      { role: 'system', content: '你是一个助手' },
      { role: 'user', content: '你好' },
    ])
  })

  it('AI 调用失败时返回错误', async () => {
    mockAiConfigure.mockResolvedValueOnce({ success: true })
    mockAiChat.mockResolvedValueOnce({
      success: false,
      error: 'API 请求失败',
    })

    const provider = new TauriAIProvider('tauri', makeConfig())
    const response = await provider.chat(makeMessages())

    expect(response.success).toBe(false)
    expect(response.error).toBe('API 请求失败')
    expect(response.text).toBe('')
  })

  it('网络异常时返回错误', async () => {
    mockAiConfigure.mockResolvedValueOnce({ success: true })
    mockAiChat.mockRejectedValueOnce(new Error('网络错误'))

    const provider = new TauriAIProvider('tauri', makeConfig())
    const response = await provider.chat(makeMessages())

    expect(response.success).toBe(false)
    expect(response.error).toBe('网络错误')
  })

  it('取消信号触发时返回取消错误', async () => {
    mockAiConfigure.mockResolvedValueOnce({ success: true })
    const controller = new AbortController()
    controller.abort()

    const provider = new TauriAIProvider('tauri', makeConfig())
    const response = await provider.chat(makeMessages(), controller.signal)

    expect(response.success).toBe(false)
    expect(response.error).toBe('请求被取消')
  })

  it('baseUrl 不以 /chat/completions 结尾时自动追加', async () => {
    mockAiConfigure.mockResolvedValueOnce({ success: true })
    mockAiChat.mockResolvedValueOnce({ success: true, data: 'OK' })

    const config = makeConfig({ baseUrl: 'https://api.example.com/v1' })
    const provider = new TauriAIProvider('tauri', config)
    await provider.chat(makeMessages())

    // 验证配置同步时 baseUrl 被正确转换为 model_url（allow_external_ai 随 consent 下发）
    expect(mockAiConfigure).toHaveBeenCalledWith({
      model_url: 'https://api.example.com/v1/chat/completions',
      api_key: 'sk-test-key',
      model_name: 'gpt-4o-mini',
      max_tokens: 1024,
      temperature: 0.7,
      allow_external_ai: false,
    })
  })
})

describe('TauriAIProvider — chatStream', () => {
  it('成功时触发 onToken 和 onComplete', async () => {
    mockAiConfigure.mockResolvedValueOnce({ success: true })
    mockAiChat.mockResolvedValueOnce({
      success: true,
      data: '流式回复内容',
    })

    const onToken = vi.fn()
    const onComplete = vi.fn()
    const onError = vi.fn()

    const provider = new TauriAIProvider('tauri', makeConfig())
    await provider.chatStream(makeMessages(), { onToken, onComplete, onError })

    expect(onToken).toHaveBeenCalledWith('流式回复内容')
    expect(onComplete).toHaveBeenCalledWith('流式回复内容')
    expect(onError).not.toHaveBeenCalled()
  })

  it('失败时触发 onError', async () => {
    mockAiConfigure.mockResolvedValueOnce({ success: true })
    mockAiChat.mockResolvedValueOnce({
      success: false,
      error: '调用失败',
    })

    const onToken = vi.fn()
    const onComplete = vi.fn()
    const onError = vi.fn()

    const provider = new TauriAIProvider('tauri', makeConfig())
    await provider.chatStream(makeMessages(), { onToken, onComplete, onError })

    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: '调用失败' }))
    expect(onToken).not.toHaveBeenCalled()
    expect(onComplete).not.toHaveBeenCalled()
  })
})

describe('TauriAIProvider — estimateTokens', () => {
  it('正确估算消息 token 数', () => {
    const provider = new TauriAIProvider('tauri', makeConfig())
    const tokens = provider.estimateTokens([
      { role: 'user', content: '你好世界' }, // 4 chars = 1 token + 4 role = 5
    ])
    expect(tokens).toBeGreaterThan(0)
    // 4 chars / 4 = 1 + 4(role) + 3(extra) = 8
    expect(tokens).toBe(8)
  })
})

describe('TauriAIProvider — analyzeSentiment', () => {
  it('成功解析情感分析结果', async () => {
    mockAiConfigure.mockResolvedValueOnce({ success: true })
    mockAiAnalyzeSentiment.mockResolvedValueOnce({
      success: true,
      data: '{"sentiment":"positive","confidence":0.9,"keywords":["开心","顺利"],"summary":"积极情绪"}',
    })

    const provider = new TauriAIProvider('tauri', makeConfig())
    const result = await provider.analyzeSentiment('今天很开心')

    expect(result).not.toBeNull()
    expect(result!.sentiment).toBe('positive')
    expect(result!.confidence).toBe(0.9)
    expect(result!.keywords).toEqual(['开心', '顺利'])
    expect(result!.summary).toBe('积极情绪')
  })

  it('处理 markdown 代码块包裹的 JSON', async () => {
    mockAiConfigure.mockResolvedValueOnce({ success: true })
    mockAiAnalyzeSentiment.mockResolvedValueOnce({
      success: true,
      data: '```json\n{"sentiment":"neutral","confidence":0.5,"keywords":["普通"],"summary":"中性"}\n```',
    })

    const provider = new TauriAIProvider('tauri', makeConfig())
    const result = await provider.analyzeSentiment('普通的一天')

    expect(result).not.toBeNull()
    expect(result!.sentiment).toBe('neutral')
  })

  it('API 失败时返回 null', async () => {
    mockAiConfigure.mockResolvedValueOnce({ success: true })
    mockAiAnalyzeSentiment.mockResolvedValueOnce({ success: false, error: '错误' })

    const provider = new TauriAIProvider('tauri', makeConfig())
    const result = await provider.analyzeSentiment('test')

    expect(result).toBeNull()
  })

  it('JSON 解析失败时返回 null', async () => {
    mockAiConfigure.mockResolvedValueOnce({ success: true })
    mockAiAnalyzeSentiment.mockResolvedValueOnce({
      success: true,
      data: '这不是有效的 JSON',
    })

    const provider = new TauriAIProvider('tauri', makeConfig())
    const result = await provider.analyzeSentiment('test')

    expect(result).toBeNull()
  })
})

describe('TauriAIProvider — generateSummary', () => {
  it('成功生成摘要', async () => {
    mockAiConfigure.mockResolvedValueOnce({ success: true })
    mockAiGenerateSummary.mockResolvedValueOnce({
      success: true,
      data: '这是今天的摘要内容。',
    })

    const provider = new TauriAIProvider('tauri', makeConfig())
    const summary = await provider.generateSummary(['条目1', '条目2', '条目3'])

    expect(summary).toBe('这是今天的摘要内容。')
    expect(mockAiGenerateSummary).toHaveBeenCalledWith(['条目1', '条目2', '条目3'])
  })

  it('API 失败时返回 null', async () => {
    mockAiConfigure.mockResolvedValueOnce({ success: true })
    mockAiGenerateSummary.mockResolvedValueOnce({ success: false })

    const provider = new TauriAIProvider('tauri', makeConfig())
    const summary = await provider.generateSummary(['条目1'])

    expect(summary).toBeNull()
  })
})

describe('TauriAIProvider — suggestActions', () => {
  it('成功解析行动建议', async () => {
    mockAiConfigure.mockResolvedValueOnce({ success: true })
    mockAiSuggestActions.mockResolvedValueOnce({
      success: true,
      data: '[{"action":"去散步","category":"健康","priority":"high"},{"action":"读书","category":"学习","priority":"medium"}]',
    })

    const provider = new TauriAIProvider('tauri', makeConfig())
    const suggestions = await provider.suggestActions('今天心情低落')

    expect(suggestions).toHaveLength(2)
    expect(suggestions[0].action).toBe('去散步')
    expect(suggestions[0].category).toBe('健康')
    expect(suggestions[0].priority).toBe('high')
  })

  it('API 失败时返回空数组', async () => {
    mockAiConfigure.mockResolvedValueOnce({ success: true })
    mockAiSuggestActions.mockResolvedValueOnce({ success: false })

    const provider = new TauriAIProvider('tauri', makeConfig())
    const suggestions = await provider.suggestActions('test')

    expect(suggestions).toEqual([])
  })

  it('JSON 解析失败时返回空数组', async () => {
    mockAiConfigure.mockResolvedValueOnce({ success: true })
    mockAiSuggestActions.mockResolvedValueOnce({
      success: true,
      data: '无效 JSON',
    })

    const provider = new TauriAIProvider('tauri', makeConfig())
    const suggestions = await provider.suggestActions('test')

    expect(suggestions).toEqual([])
  })
})

describe('TauriAIProvider — getStatus', () => {
  it('获取后端状态', async () => {
    const statusData = {
      configured: true,
      model_name: 'gpt-4o-mini',
      model_url: 'https://api.openai.com/v1/chat/completions',
      max_tokens: 1024,
      temperature: 0.7,
    }
    mockAiGetStatus.mockResolvedValueOnce({ success: true, data: statusData })

    const provider = new TauriAIProvider('tauri', makeConfig())
    const status = await provider.getStatus()

    expect(status).toEqual(statusData)
  })

  it('获取失败时返回 null', async () => {
    mockAiGetStatus.mockResolvedValueOnce({ success: false })

    const provider = new TauriAIProvider('tauri', makeConfig())
    const status = await provider.getStatus()

    expect(status).toBeNull()
  })
})

describe('TauriAIProvider — 前后端 consent 同轴（allowExternalAI 下发后端）', () => {
  const setConsent = (value: boolean) => {
    const schema = loadSchema()
    schema.config.complianceOverride.allowExternalAI = value
    saveSchema(schema)
  }

  beforeEach(() => {
    vi.mocked(checkExternalAIGate).mockReturnValue(null) // 出口闸放行，走真实同步路径
    mockAiAnalyzeSentiment.mockResolvedValue({ success: true, data: '{}' })
    setConsent(false)
  })
  afterEach(() => {
    vi.mocked(checkExternalAIGate).mockReturnValue(null)
    setConsent(false)
  })

  it('已同意远程端点时 _syncConfig 将 allow_external_ai=true 下发后端', async () => {
    setConsent(true)
    const provider = new TauriAIProvider('tauri', makeConfig())

    await provider.analyzeSentiment('今天很开心')

    expect(mockAiConfigure).toHaveBeenCalled()
    const sent = (mockAiConfigure as any).mock.calls[0][0] as any
    expect(sent.allow_external_ai).toBe(true)
  })

  it('未同意时 _syncConfig 将 allow_external_ai=false 下发后端', async () => {
    setConsent(false)
    const provider = new TauriAIProvider('tauri', makeConfig())

    await provider.analyzeSentiment('今天很开心')

    expect(mockAiConfigure).toHaveBeenCalled()
    const sent = (mockAiConfigure as any).mock.calls[0][0] as any
    expect(sent.allow_external_ai).toBe(false)
  })
})

describe('createTauriAIProvider 工厂函数', () => {
  it('创建 TauriAIProvider 实例', async () => {
    const { createTauriAIProvider } = await import('../tauri-provider')
    const provider = createTauriAIProvider('tauri-factory', makeConfig())

    expect(provider.id).toBe('tauri-factory')
    expect(provider.type).toBe('tauri')
    expect(provider.displayName).toBe('Tauri AI Agent')
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

  it('未授权外部端点时 checkConnection 返回 false 且不同步配置', async () => {
    vi.mocked(checkExternalAIGate).mockReturnValue(BLOCKED)
    const provider = new TauriAIProvider('tauri', makeConfig())

    const connected = await provider.checkConnection()

    expect(connected).toBe(false)
    expect(mockAiConfigure).not.toHaveBeenCalled()
    expect(mockAiGetStatus).not.toHaveBeenCalled()
  })

  it('未授权外部端点时 chat 拦截且不发起调用', async () => {
    vi.mocked(checkExternalAIGate).mockReturnValue(BLOCKED)
    const provider = new TauriAIProvider('tauri', makeConfig())

    const response = await provider.chat(makeMessages())

    expect(response.success).toBe(false)
    expect(response.error).toBe(BLOCKED)
    expect(response.text).toBe('')
    expect(mockAiConfigure).not.toHaveBeenCalled()
    expect(mockAiChat).not.toHaveBeenCalled()
  })

  it('未授权外部端点时 analyzeSentiment 返回 null', async () => {
    vi.mocked(checkExternalAIGate).mockReturnValue(BLOCKED)
    const provider = new TauriAIProvider('tauri', makeConfig())

    const result = await provider.analyzeSentiment('今天很开心')

    expect(result).toBeNull()
    expect(mockAiAnalyzeSentiment).not.toHaveBeenCalled()
  })

  it('未授权外部端点时 generateSummary 返回 null', async () => {
    vi.mocked(checkExternalAIGate).mockReturnValue(BLOCKED)
    const provider = new TauriAIProvider('tauri', makeConfig())

    const summary = await provider.generateSummary(['条目1'])

    expect(summary).toBeNull()
    expect(mockAiGenerateSummary).not.toHaveBeenCalled()
  })

  it('未授权外部端点时 suggestActions 返回空数组', async () => {
    vi.mocked(checkExternalAIGate).mockReturnValue(BLOCKED)
    const provider = new TauriAIProvider('tauri', makeConfig())

    const suggestions = await provider.suggestActions('今天心情低落')

    expect(suggestions).toEqual([])
    expect(mockAiSuggestActions).not.toHaveBeenCalled()
  })

  it('出口闸放行时（本地或已同意）正常发起调用', async () => {
    mockAiChat.mockResolvedValueOnce({ success: true, data: '你好' })
    const provider = new TauriAIProvider('tauri', makeConfig())

    const response = await provider.chat(makeMessages())

    expect(response.success).toBe(true)
    expect(mockAiConfigure).toHaveBeenCalled()
    expect(mockAiChat).toHaveBeenCalled()
  })
})