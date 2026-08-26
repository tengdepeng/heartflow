// ============================================================
// useTemplateMarket 模块测试
// 顾问人设 / 语气数据层：从 storage 载入、写入并持久化
// ============================================================
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetKV, mockSetKV, store } = vi.hoisted(() => {
  const store: Record<string, any> = {}
  const mockGetKV = vi.fn((k: string, d: any) => store[k] ?? d)
  const mockSetKV = vi.fn((k: string, v: any) => {
    store[k] = v
  })
  return { mockGetKV, mockSetKV, store }
})

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: (...a: any[]) => (mockGetKV as any)(...a),
    setKV: (...a: any[]) => (mockSetKV as any)(...a),
  },
}))

import { useTemplateMarket } from '../template-market'

const PERSONA_KEY = 'hf:advisor_persona'
const TONE_KEY = 'hf:advisor_tone'

describe('useTemplateMarket 顾问人设/语气数据层', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 清空存储与模块级单例，避免用例间状态泄漏
    Object.keys(store).forEach((k) => delete store[k])
    useTemplateMarket().load()
  })

  it('load 从存储读取 persona / tone', () => {
    store[PERSONA_KEY] = 'wise-elder'
    store[TONE_KEY] = 'gentle'

    const m = useTemplateMarket()
    m.load()
    expect(m.persona.value).toBe('wise-elder')
    expect(m.tone.value).toBe('gentle')
    expect(mockGetKV).toHaveBeenCalledWith(PERSONA_KEY, '')
    expect(mockGetKV).toHaveBeenCalledWith(TONE_KEY, '')
  })

  it('空存储时返回默认空字符串', () => {
    const m = useTemplateMarket()
    m.load()
    expect(m.persona.value).toBe('')
    expect(m.tone.value).toBe('')
  })

  it('setPersona 写入并持久化到存储', () => {
    const m = useTemplateMarket()
    m.setPersona('accountability-partner')
    expect(m.persona.value).toBe('accountability-partner')
    expect(mockSetKV).toHaveBeenCalledWith(PERSONA_KEY, 'accountability-partner')
  })

  it('setTone 写入并持久化到存储', () => {
    const m = useTemplateMarket()
    m.setTone('direct')
    expect(m.tone.value).toBe('direct')
    expect(mockSetKV).toHaveBeenCalledWith(TONE_KEY, 'direct')
  })

  it('applyAdvisor 仅写入存在的字段，行为与原裸调用一致', () => {
    const m = useTemplateMarket()
    m.applyAdvisor({ persona: 'creative-spark', tone: 'playful' })
    expect(store[PERSONA_KEY]).toBe('creative-spark')
    expect(store[TONE_KEY]).toBe('playful')

    // 仅传入 tone 时，persona 不被改写
    m.applyAdvisor({ tone: 'calm' })
    expect(store[TONE_KEY]).toBe('calm')
    expect(store[PERSONA_KEY]).toBe('creative-spark')

    // 空对象不触发任何写入
    mockSetKV.mockClear()
    m.applyAdvisor({})
    expect(mockSetKV).not.toHaveBeenCalled()
  })

  it('单例共享：多次调用返回同一份状态', () => {
    const a = useTemplateMarket()
    const b = useTemplateMarket()
    a.setPersona('mindful-observer')
    expect(b.persona.value).toBe('mindful-observer')
  })
})
