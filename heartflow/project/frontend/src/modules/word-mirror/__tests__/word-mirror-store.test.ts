// ============================================================
// useWordMirror 模块测试
// 文字分析历史 (hf:word_history) & 词汇库 (hf:word_mirror) 数据层
// ============================================================
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetKV, mockSetKV, store } = vi.hoisted(() => {
  const store: Record<string, any> = {}
  const mockGetKV = vi.fn((k: string, d: any) => store[k] ?? d)
  const mockSetKV = vi.fn((k: string, v: any) => { store[k] = v })
  return { mockGetKV, mockSetKV, store }
})

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: (...args: any[]) => (mockGetKV as any)(...args),
    setKV: (...args: any[]) => (mockSetKV as any)(...args),
  },
}))

import { useWordMirror, type WordItem, type HItem } from '../word-mirror-store'

const HK = 'hf:word_history'
const WK = 'hf:word_mirror'

function sampleHistory(partial: Partial<HItem> = {}): HItem {
  return {
    id: 'h1',
    text: '今天天气真好',
    topWords: ['今', '天'],
    mood: '积极词汇',
    at: new Date().toISOString(),
    ...partial,
  }
}

function sampleWord(partial: Partial<WordItem> = {}): WordItem {
  return {
    id: 'w1',
    word: '息',
    definition: '呼吸、休止',
    proficiency: 1,
    favorite: false,
    createdAt: new Date().toISOString(),
    ...partial,
  }
}

describe('useWordMirror 文字分析历史 & 词汇库', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(store).forEach((k) => delete store[k])
    // 重置模块级单例
    useWordMirror().load()
  })

  it('load 从存储读取 history 与 words', () => {
    store[HK] = [sampleHistory()]
    store[WK] = [sampleWord()]
    const m = useWordMirror()
    m.load()
    expect(m.history.value).toHaveLength(1)
    expect(m.words.value).toHaveLength(1)
    expect(mockGetKV).toHaveBeenCalledWith(HK, [])
    expect(mockGetKV).toHaveBeenCalledWith(WK, [])
  })

  it('saveHistory 持久化到 hf:word_history', () => {
    const m = useWordMirror()
    m.history.value = [sampleHistory()]
    m.saveHistory()
    expect(mockSetKV).toHaveBeenCalledWith(HK, expect.any(Array))
    expect(store[HK]).toHaveLength(1)
  })

  it('saveWords 持久化到 hf:word_mirror', () => {
    const m = useWordMirror()
    m.words.value = [sampleWord()]
    m.saveWords()
    expect(mockSetKV).toHaveBeenCalledWith(WK, expect.any(Array))
    expect(store[WK]).toHaveLength(1)
  })

  it('空存储时返回默认空列表', () => {
    const m = useWordMirror()
    m.load()
    expect(m.history.value).toEqual([])
    expect(m.words.value).toEqual([])
  })

  it('load 重置单例，避免跨用例泄漏', () => {
    const m = useWordMirror()
    m.history.value = [sampleHistory()]
    m.words.value = [sampleWord()]
    m.load()
    expect(m.history.value).toEqual([])
    expect(m.words.value).toEqual([])
  })
})
