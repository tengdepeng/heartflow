// ============================================================
// ask-book 引擎测试（读书 #5 AI 问书）
// 覆盖：伴读系统提示词 · 消息构建 · 可用性探测（fail-closed） · 问书状态编排
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'

const mockChat = vi.fn()
const mockIsEnabled = vi.fn(() => true)
const mockHasProvider = vi.fn(() => true)

vi.mock('@/engine/ai', () => ({
  aiEngine: { chat: (...args: unknown[]) => mockChat(...args) },
  isAIEngineEnabled: () => mockIsEnabled(),
  hasUsableProvider: () => mockHasProvider(),
}))

import {
  buildAskBookSystemPrompt,
  buildAskBookMessages,
  isAskBookAvailable,
  useAskBook,
  ASK_BOOK_QUICK_QUESTIONS,
} from '../ask-book'

function okResponse(text: string) {
  return {
    text,
    model: 'test-model',
    tokenUsage: { prompt: 10, completion: 20, total: 30 },
    latency: 100,
    success: true,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockIsEnabled.mockReturnValue(true)
  mockHasProvider.mockReturnValue(true)
})

describe('buildAskBookSystemPrompt', () => {
  it('基础提示词包含「紧扣原文、不臆测、简洁温暖」约束', () => {
    const prompt = buildAskBookSystemPrompt()
    expect(prompt).toContain('伴读')
    expect(prompt).toContain('不编造原文没有的信息')
    expect(prompt).toContain('不臆测')
    expect(prompt).not.toContain('【用户正在读的原文')
  })

  it('传入原文时附上原文与书名', () => {
    const prompt = buildAskBookSystemPrompt({ bookTitle: '活着', passage: '人是为了活着本身而活着。' })
    expect(prompt).toContain('【用户正在读的原文·《活着》】')
    expect(prompt).toContain('人是为了活着本身而活着。')
  })

  it('仅有原文无书名时不出现书名括号', () => {
    const prompt = buildAskBookSystemPrompt({ passage: '正文片段' })
    expect(prompt).toContain('【用户正在读的原文】')
    expect(prompt).toContain('正文片段')
    expect(prompt).not.toContain('《')
  })

  it('空白原文不附上下文', () => {
    expect(buildAskBookSystemPrompt({ passage: '   ' })).not.toContain('【用户正在读的原文')
  })
})

describe('buildAskBookMessages', () => {
  it('首条为 system（含原文），末条为当前问题', () => {
    const messages = buildAskBookMessages({
      bookTitle: '活着',
      passage: '人是为了活着本身而活着。',
      question: '作者想表达什么？',
    })
    expect(messages).toHaveLength(2)
    expect(messages[0].role).toBe('system')
    expect(messages[0].content).toContain('人是为了活着本身而活着。')
    expect(messages[1]).toEqual({ role: 'user', content: '作者想表达什么？' })
  })

  it('追问时历史轮次插入 system 与当前问题之间', () => {
    const messages = buildAskBookMessages({
      passage: '正文',
      question: '那又怎样？',
      history: [
        { role: 'user', content: '这段在说什么？' },
        { role: 'assistant', content: '讲的是活着。' },
      ],
    })
    expect(messages).toHaveLength(4)
    expect(messages[1]).toEqual({ role: 'user', content: '这段在说什么？' })
    expect(messages[2]).toEqual({ role: 'assistant', content: '讲的是活着。' })
    expect(messages[3].role).toBe('user')
  })

  it('当前问题首尾空白被裁剪', () => {
    const messages = buildAskBookMessages({ passage: '正文', question: '  问题  ' })
    expect(messages[messages.length - 1].content).toBe('问题')
  })
})

describe('isAskBookAvailable', () => {
  it('引擎启用且有可用提供商时可用', async () => {
    await expect(isAskBookAvailable()).resolves.toBe(true)
  })

  it('引擎未启用时不可用', async () => {
    mockIsEnabled.mockReturnValue(false)
    await expect(isAskBookAvailable()).resolves.toBe(false)
  })

  it('无可用提供商时不可用', async () => {
    mockHasProvider.mockReturnValue(false)
    await expect(isAskBookAvailable()).resolves.toBe(false)
  })
})

describe('ASK_BOOK_QUICK_QUESTIONS', () => {
  it('提供快捷问题列表', () => {
    expect(ASK_BOOK_QUICK_QUESTIONS.length).toBeGreaterThanOrEqual(3)
  })
})

describe('useAskBook', () => {
  it('refreshAvailability 探测并写入 available', async () => {
    const { available, refreshAvailability } = useAskBook()
    expect(available.value).toBe(false)
    await expect(refreshAvailability()).resolves.toBe(true)
    expect(available.value).toBe(true)
  })

  it('ask 成功写入 answer / history / callCount', async () => {
    mockChat.mockResolvedValue(okResponse('这句话在强调活着本身。'))
    const { ask, answer, history, error, callCount } = useAskBook()
    const ok = await ask('这段在说什么？', { bookTitle: '活着', passage: '人是为了活着本身而活着。' })
    expect(ok).toBe(true)
    expect(answer.value).toBe('这句话在强调活着本身。')
    expect(error.value).toBeNull()
    expect(callCount.value).toBe(1)
    expect(history.value).toHaveLength(2)
    expect(history.value[0]).toEqual({ role: 'user', content: '这段在说什么？' })
    expect(history.value[1]).toEqual({ role: 'assistant', content: '这句话在强调活着本身。' })
  })

  it('ask 传入的消息首条为 system 且含原文', async () => {
    mockChat.mockResolvedValue(okResponse('答'))
    const { ask } = useAskBook()
    await ask('问题', { passage: '选中的原文' })
    const messages = mockChat.mock.calls[0][0] as Array<{ role: string; content: string }>
    expect(messages[0].role).toBe('system')
    expect(messages[0].content).toContain('选中的原文')
  })

  it('ask 失败（success=false）写入 error 且不改 history', async () => {
    mockChat.mockResolvedValue({ text: '', model: '', tokenUsage: { prompt: 0, completion: 0, total: 0 }, latency: 0, success: false, error: '模型离线' })
    const { ask, answer, error, history } = useAskBook()
    const ok = await ask('问题', { passage: '原文' })
    expect(ok).toBe(false)
    expect(answer.value).toBe('')
    expect(error.value).toBe('模型离线')
    expect(history.value).toHaveLength(0)
  })

  it('ask 抛异常时 fail-closed 写入 error', async () => {
    mockChat.mockRejectedValue(new Error('网络中断'))
    const { ask, error } = useAskBook()
    const ok = await ask('问题', { passage: '原文' })
    expect(ok).toBe(false)
    expect(error.value).toBe('网络中断')
  })

  it('空问题直接返回 false 且不调用引擎', async () => {
    const { ask } = useAskBook()
    const ok = await ask('   ', { passage: '原文' })
    expect(ok).toBe(false)
    expect(mockChat).not.toHaveBeenCalled()
  })

  it('追问时带上历史轮次', async () => {
    mockChat.mockResolvedValue(okResponse('答一'))
    const { ask } = useAskBook()
    await ask('第一问', { passage: '原文' })
    mockChat.mockResolvedValue(okResponse('答二'))
    await ask('第二问', { passage: '原文' })
    const secondMessages = mockChat.mock.calls[1][0] as Array<{ role: string; content: string }>
    // system + (user第一问 + assistant答一) + user第二问
    expect(secondMessages).toHaveLength(4)
    expect(secondMessages[3]).toEqual({ role: 'user', content: '第二问' })
  })

  it('reset 清空问答与历史但保留可用性', async () => {
    mockChat.mockResolvedValue(okResponse('答'))
    const { ask, reset, answer, history, error, available } = useAskBook()
    available.value = true
    await ask('问题', { passage: '原文' })
    reset()
    expect(answer.value).toBe('')
    expect(history.value).toHaveLength(0)
    expect(error.value).toBeNull()
    expect(available.value).toBe(true)
  })
})
