// ============================================================
// AI 引擎 · 对话记忆管理测试
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

beforeEach(async () => {
  mockStorage()
  storage.clear()
  const { clearAllConversationCache } = await import('../memory')
  clearAllConversationCache()
})

describe('makeConversationId', () => {
  it('基于幕僚 ID 生成对话 ID', async () => {
    const { makeConversationId } = await import('../memory')
    expect(makeConversationId('advisor_1')).toBe('advisor_advisor_1')
    expect(makeConversationId('test')).toBe('advisor_test')
  })
})

describe('getConversationMessages', () => {
  it('新对话返回空数组', async () => {
    const { getConversationMessages } = await import('../memory')
    const msgs = getConversationMessages('test_conv')
    expect(msgs).toEqual([])
  })

  it('返回缓存中的消息', async () => {
    const { addMessage, getConversationMessages } = await import('../memory')
    addMessage('conv1', { role: 'user', content: '你好' })
    addMessage('conv1', { role: 'assistant', content: '你好！' })
    const msgs = getConversationMessages('conv1')
    expect(msgs).toHaveLength(2)
    expect(msgs[0].content).toBe('你好')
    expect(msgs[1].content).toBe('你好！')
  })

  it('不同对话独立存储', async () => {
    const { addMessage, getConversationMessages } = await import('../memory')
    addMessage('conv_a', { role: 'user', content: 'A' })
    addMessage('conv_b', { role: 'user', content: 'B' })
    expect(getConversationMessages('conv_a')).toHaveLength(1)
    expect(getConversationMessages('conv_b')).toHaveLength(1)
  })
})

describe('addMessage', () => {
  it('添加消息时自动添加时间戳', async () => {
    const { addMessage, getConversationMessages } = await import('../memory')
    addMessage('conv', { role: 'user', content: '测试' })
    const msgs = getConversationMessages('conv')
    expect(msgs[0].timestamp).toBeDefined()
    expect(msgs[0].timestamp!.length).toBeGreaterThan(0)
  })
})

describe('setSystemPrompt / getSystemPrompt', () => {
  it('设置和获取系统提示词', async () => {
    const { setSystemPrompt, getSystemPrompt } = await import('../memory')
    setSystemPrompt('conv', '你是一个助手')
    expect(getSystemPrompt('conv')).toBe('你是一个助手')
  })

  it('多次设置会替换旧的系统提示词', async () => {
    const { setSystemPrompt, getSystemPrompt, getConversationMessages } = await import('../memory')
    setSystemPrompt('conv', '旧提示词')
    setSystemPrompt('conv', '新提示词')
    expect(getSystemPrompt('conv')).toBe('新提示词')
    // 应该只有一条系统提示词
    const msgs = getConversationMessages('conv')
    const systemMsgs = msgs.filter(m => m.role === 'system')
    expect(systemMsgs).toHaveLength(1)
  })

  it('无系统提示词时返回 null', async () => {
    const { getSystemPrompt } = await import('../memory')
    expect(getSystemPrompt('nonexistent')).toBeNull()
  })
})

describe('clearConversation', () => {
  it('清除对话记忆', async () => {
    const { addMessage, clearConversation, getConversationMessages } = await import('../memory')
    addMessage('conv', { role: 'user', content: 'test' })
    clearConversation('conv')
    expect(getConversationMessages('conv')).toEqual([])
  })

  it('清除不存在的对话不会报错', async () => {
    const { clearConversation } = await import('../memory')
    expect(() => clearConversation('nonexistent')).not.toThrow()
  })
})

describe('getConversationSnapshot', () => {
  it('返回正确的快照结构', async () => {
    const { addMessage, getConversationSnapshot } = await import('../memory')
    addMessage('conv', { role: 'user', content: '你好' })
    addMessage('conv', { role: 'assistant', content: '回应' })
    const snapshot = getConversationSnapshot('conv')
    expect(snapshot.conversationId).toBe('conv')
    expect(snapshot.messages).toHaveLength(2)
    expect(snapshot.totalRounds).toBe(1)
    expect(snapshot.updatedAt).toBeDefined()
  })

  it('advisorId 从 conversationId 提取', async () => {
    const { getConversationSnapshot } = await import('../memory')
    const snapshot = getConversationSnapshot('advisor_test123')
    expect(snapshot.advisorId).toBe('test123')
  })
})

describe('getConversationSummary / setConversationSummary', () => {
  it('初始摘要为空字符串', async () => {
    const { getConversationSummary } = await import('../memory')
    expect(getConversationSummary('conv')).toBe('')
  })

  it('设置和获取摘要', async () => {
    const { setConversationSummary, getConversationSummary } = await import('../memory')
    setConversationSummary('conv', '这是对话摘要')
    expect(getConversationSummary('conv')).toBe('这是对话摘要')
  })
})

describe('getRecentAdvisorConversation', () => {
  it('返回空对话时为空数组', async () => {
    const { getRecentAdvisorConversation } = await import('../memory')
    expect(getRecentAdvisorConversation('empty_advisor')).toEqual([])
  })

  it('返回包含系统提示词和最近消息', async () => {
    const { addMessage, setSystemPrompt, getRecentAdvisorConversation } = await import('../memory')
    // 通过幕僚 ID 添加消息
    setSystemPrompt('advisor_test', '系统提示')
    addMessage('advisor_test', { role: 'user', content: '消息1' })
    addMessage('advisor_test', { role: 'assistant', content: '回应1' })
    addMessage('advisor_test', { role: 'user', content: '消息2' })
    addMessage('advisor_test', { role: 'assistant', content: '回应2' })

    const recent = getRecentAdvisorConversation('test')
    // 包含系统提示 + 所有消息（未超过 maxRounds=10）
    expect(recent.length).toBeGreaterThanOrEqual(5)
    expect(recent[0].role).toBe('system')
    expect(recent[0].content).toBe('系统提示')
  })

  it('超过 maxRounds 时裁剪', async () => {
    const { addMessage, setSystemPrompt, getRecentAdvisorConversation } = await import('../memory')
    setSystemPrompt('advisor_crop', '系统提示')
    // 添加 15 轮对话（30 条消息）
    for (let i = 0; i < 15; i++) {
      addMessage('advisor_crop', { role: 'user', content: `消息${i}` })
      addMessage('advisor_crop', { role: 'assistant', content: `回应${i}` })
    }
    // 默认 maxRounds=10，所以保留系统提示 + 最近 10 轮（20 条消息）
    const recent = getRecentAdvisorConversation('crop')
    expect(recent[0].role).toBe('system')
    // 10 轮 = 20 条 chat 消息 + 1 条系统提示 = 21
    expect(recent).toHaveLength(21)
    // 最后一条消息应是最近的
    expect(recent[recent.length - 1].content).toBe('回应14')
  })

  it('可自定义 maxRounds', async () => {
    const { addMessage, getRecentAdvisorConversation } = await import('../memory')
    for (let i = 0; i < 6; i++) {
      addMessage('advisor_custom', { role: 'user', content: `u${i}` })
      addMessage('advisor_custom', { role: 'assistant', content: `a${i}` })
    }
    // 12 条 chat 消息 = 6 轮，limit=3 时应保留 6 条
    const recent = getRecentAdvisorConversation('custom', 3)
    expect(recent).toHaveLength(6)
    expect(recent[0].content).toBe('u3')
  })
})

describe('缓存管理', () => {
  it('clearAllConversationCache 清除所有缓存', async () => {
    const { addMessage, getConversationMessages, clearAllConversationCache } = await import('../memory')
    addMessage('c1', { role: 'user', content: 'a' })
    addMessage('c2', { role: 'user', content: 'b' })
    clearAllConversationCache()
    // 清除缓存后，getConversationMessages 重新从 storage 加载
    // 因为 storage 中仍有数据，所以仍能读取
    expect(getConversationMessages('c1')).toHaveLength(1)
  })

  it('clearConversationCache 清除指定对话缓存', async () => {
    const { addMessage, getConversationMessages, clearConversationCache } = await import('../memory')
    addMessage('c1', { role: 'user', content: 'a' })
    clearConversationCache('c1')
    // 清除缓存后重新加载
    expect(getConversationMessages('c1')).toHaveLength(1)
  })
})

describe('统计', () => {
  it('getTotalConversationCount 返回对话总数', async () => {
    const { addMessage, getTotalConversationCount } = await import('../memory')
    addMessage('c1', { role: 'user', content: 'a' })
    addMessage('c2', { role: 'user', content: 'b' })
    addMessage('c3', { role: 'user', content: 'c' })
    expect(getTotalConversationCount()).toBe(3)
  })

  it('getConversationMessageCount 返回消息数量', async () => {
    const { addMessage, getConversationMessageCount } = await import('../memory')
    addMessage('c1', { role: 'user', content: 'a' })
    addMessage('c1', { role: 'assistant', content: 'b' })
    addMessage('c1', { role: 'user', content: 'c' })
    expect(getConversationMessageCount('c1')).toBe(3)
  })

  it('空对话返回 0', async () => {
    const { getConversationMessageCount } = await import('../memory')
    expect(getConversationMessageCount('nonexistent')).toBe(0)
  })
})