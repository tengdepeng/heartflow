// ============================================================
// AI 引擎 · 配置管理测试
// ============================================================
import { describe, expect, it, beforeEach } from 'vitest'
import { storage } from '../../storage'

function mockStorage() {
  const store = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v) },
      removeItem: (k: string) => { store.delete(k) },
      clear: () => { store.clear() },
    },
    configurable: true,
    writable: true,
  })
  return store
}

beforeEach(() => {
  mockStorage()
  storage.clear()
})

describe('AI 引擎配置管理', () => {
  it('getAIEngineConfig 首次调用时嵌入默认配置', async () => {
    const { getAIEngineConfig } = await import('../config')
    const cfg = getAIEngineConfig()
    expect(cfg.enabled).toBe(false)
    expect(cfg.providers.default).toBeDefined()
    expect(cfg.memory.maxRounds).toBe(10)
  })

  it('getAIEngineConfig 返回持久化的配置', async () => {
    const { getAIEngineConfig, setAIEngineConfig } = await import('../config')
    const cfg = getAIEngineConfig()
    cfg.enabled = true
    setAIEngineConfig(cfg)
    const reloaded = getAIEngineConfig()
    expect(reloaded.enabled).toBe(true)
  })

  it('patchAIEngineConfig 局部更新', async () => {
    const { patchAIEngineConfig } = await import('../config')
    const updated = patchAIEngineConfig({ enabled: true, debugMode: true })
    expect(updated.enabled).toBe(true)
    expect(updated.debugMode).toBe(true)
    // 未修改的字段保持不变
    expect(updated.streamEnabled).toBe(false)
  })

  it('getProviderConfig / setProviderConfig', async () => {
    const { getProviderConfig, setProviderConfig } = await import('../config')
    const provider = {
      type: 'openai' as const,
      baseUrl: 'https://custom.example.com/v1',
      apiKey: 'sk-test',
      model: { model: 'gpt-4', temperature: 0.5, maxTokens: 512, contextWindow: 4096, topP: 0.9, frequencyPenalty: 0, presencePenalty: 0 },
      timeout: 10000,
      maxRetries: 1,
      retryDelay: 500,
    }
    setProviderConfig('custom', provider)
    const loaded = getProviderConfig('custom')
    expect(loaded).not.toBeNull()
    expect(loaded!.baseUrl).toBe('https://custom.example.com/v1')
    expect(loaded!.apiKey).toBe('sk-test')
  })

  it('removeProviderConfig 删除提供商', async () => {
    const { setProviderConfig, removeProviderConfig, getProviderConfig } = await import('../config')
    const provider = {
      type: 'openai' as const,
      baseUrl: 'https://x.com/v1',
      apiKey: 'sk-test',
      model: { model: 'gpt-4', temperature: 0.5, maxTokens: 512, contextWindow: 4096, topP: 0.9, frequencyPenalty: 0, presencePenalty: 0 },
      timeout: 10000,
      maxRetries: 1,
      retryDelay: 500,
    }
    setProviderConfig('to-remove', provider)
    expect(removeProviderConfig('to-remove')).toBe(true)
    expect(getProviderConfig('to-remove')).toBeNull()
  })

  it('removeProviderConfig 对不存在的提供商返回 false', async () => {
    const { removeProviderConfig } = await import('../config')
    expect(removeProviderConfig('nonexistent')).toBe(false)
  })

  it('switchActiveProvider 切换激活提供商', async () => {
    const { switchActiveProvider, getAIEngineConfig, setProviderConfig } = await import('../config')
    const provider = {
      type: 'openai' as const,
      baseUrl: 'https://other.com/v1',
      apiKey: 'sk-other',
      model: { model: 'gpt-4', temperature: 0.5, maxTokens: 512, contextWindow: 4096, topP: 0.9, frequencyPenalty: 0, presencePenalty: 0 },
      timeout: 10000,
      maxRetries: 1,
      retryDelay: 500,
    }
    setProviderConfig('other', provider)
    expect(switchActiveProvider('other')).toBe(true)
    expect(getAIEngineConfig().activeProviderId).toBe('other')
  })

  it('switchActiveProvider 对不存在的提供商返回 false', async () => {
    const { switchActiveProvider } = await import('../config')
    expect(switchActiveProvider('nonexistent')).toBe(false)
  })

  it('isAIEngineEnabled / setAIEngineEnabled', async () => {
    const { isAIEngineEnabled, setAIEngineEnabled } = await import('../config')
    expect(isAIEngineEnabled()).toBe(false)
    setAIEngineEnabled(true)
    expect(isAIEngineEnabled()).toBe(true)
  })

  it('hasUsableProvider 检查 API Key', async () => {
    const { hasUsableProvider, setProviderConfig } = await import('../config')
    // 默认无 API Key
    expect(hasUsableProvider()).toBe(false)
    // 设置一个有 API Key 的提供商
    const provider = {
      type: 'openai' as const,
      baseUrl: 'https://x.com/v1',
      apiKey: 'sk-valid',
      model: { model: 'gpt-4', temperature: 0.5, maxTokens: 512, contextWindow: 4096, topP: 0.9, frequencyPenalty: 0, presencePenalty: 0 },
      timeout: 10000,
      maxRetries: 1,
      retryDelay: 500,
    }
    setProviderConfig('valid', provider)
    expect(hasUsableProvider()).toBe(true)
  })

  it('hasUsableProvider 对 local 类型视为可用', async () => {
    const { hasUsableProvider, setProviderConfig } = await import('../config')
    const localProvider = {
      type: 'local' as const,
      baseUrl: 'http://localhost:11434',
      apiKey: '',
      model: { model: 'llama3', temperature: 0.5, maxTokens: 512, contextWindow: 4096, topP: 0.9, frequencyPenalty: 0, presencePenalty: 0 },
      timeout: 60000,
      maxRetries: 1,
      retryDelay: 500,
    }
    setProviderConfig('local-model', localProvider)
    expect(hasUsableProvider()).toBe(true)
  })

  it('listProviderIds 列出所有提供商 ID', async () => {
    const { listProviderIds, setProviderConfig } = await import('../config')
    const provider = {
      type: 'openai' as const,
      baseUrl: 'https://x.com/v1',
      apiKey: 'sk-x',
      model: { model: 'gpt-4', temperature: 0.5, maxTokens: 512, contextWindow: 4096, topP: 0.9, frequencyPenalty: 0, presencePenalty: 0 },
      timeout: 10000,
      maxRetries: 1,
      retryDelay: 500,
    }
    setProviderConfig('p1', provider)
    setProviderConfig('p2', provider)
    const ids = listProviderIds()
    expect(ids).toContain('p1')
    expect(ids).toContain('p2')
  })

  it('getActiveProviderConfig 返回当前激活的提供商', async () => {
    const { getActiveProviderConfig, setProviderConfig, switchActiveProvider } = await import('../config')
    const provider = {
      type: 'openai' as const,
      baseUrl: 'https://active.com/v1',
      apiKey: 'sk-active',
      model: { model: 'gpt-4', temperature: 0.5, maxTokens: 512, contextWindow: 4096, topP: 0.9, frequencyPenalty: 0, presencePenalty: 0 },
      timeout: 10000,
      maxRetries: 1,
      retryDelay: 500,
    }
    setProviderConfig('active', provider)
    switchActiveProvider('active')
    const active = getActiveProviderConfig()
    expect(active).not.toBeNull()
    expect(active!.baseUrl).toBe('https://active.com/v1')
  })

  it('getMemoryConfig / setMemoryConfig', async () => {
    const { getMemoryConfig, setMemoryConfig } = await import('../config')
    expect(getMemoryConfig().maxRounds).toBe(10)
    setMemoryConfig({ maxRounds: 5, enableSummarization: false, summaryThreshold: 3, preserveSystemPrompt: true })
    expect(getMemoryConfig().maxRounds).toBe(5)
    expect(getMemoryConfig().enableSummarization).toBe(false)
  })
})