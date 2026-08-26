// ============================================================
// useReading 模块测试
// 阅读内容数据层：正文 + 摘录的读取 / 写入
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

import { useReading } from '../reading-content'

const TEXT_KEY = 'hf:reading_text'
const EXCERPTS_KEY = 'hf:reading_excerpts'

function sampleExcerpt() {
  return {
    id: 'e1',
    source: '当前文本',
    text: '摘录内容',
    note: '备注',
    createdAt: new Date().toISOString(),
  }
}

describe('useReading 阅读内容数据层', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(store).forEach((k) => delete store[k])
    // 重置模块级单例
    useReading().load()
  })

  it('load 从存储读取正文与摘录', () => {
    store[TEXT_KEY] = '正文A'
    store[EXCERPTS_KEY] = [sampleExcerpt()]
    const r = useReading()
    r.load()
    expect(r.readingText.value).toBe('正文A')
    expect(r.excerpts.value.length).toBe(1)
    expect(mockGetKV).toHaveBeenCalledWith(TEXT_KEY, '')
    expect(mockGetKV).toHaveBeenCalledWith(EXCERPTS_KEY, [])
  })

  it('save 整体持久化正文与摘录', () => {
    const r = useReading()
    r.readingText.value = '正文B'
    r.excerpts.value = [sampleExcerpt()]
    r.save()
    expect(mockSetKV).toHaveBeenCalledWith(TEXT_KEY, '正文B')
    expect(mockSetKV).toHaveBeenCalledWith(EXCERPTS_KEY, expect.arrayContaining([expect.objectContaining({ id: 'e1' })]))
  })

  it('saveText 仅持久化正文', () => {
    const r = useReading()
    r.readingText.value = '仅正文'
    r.saveText()
    expect(mockSetKV).toHaveBeenCalledWith(TEXT_KEY, '仅正文')
    expect(mockSetKV).not.toHaveBeenCalledWith(EXCERPTS_KEY, expect.anything())
  })

  it('saveExcerpts 仅持久化摘录', () => {
    const r = useReading()
    r.excerpts.value = [sampleExcerpt()]
    r.saveExcerpts()
    expect(mockSetKV).toHaveBeenCalledWith(EXCERPTS_KEY, expect.arrayContaining([expect.objectContaining({ id: 'e1' })]))
    expect(mockSetKV).not.toHaveBeenCalledWith(TEXT_KEY, expect.anything())
  })

  it('空存储时返回默认空值', () => {
    const r = useReading()
    r.load()
    expect(r.readingText.value).toBe('')
    expect(r.excerpts.value).toEqual([])
  })
})
