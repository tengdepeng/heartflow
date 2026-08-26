import { describe, expect, it, vi } from 'vitest'

const dataPort = vi.hoisted(() => ({
  downloadJSON: vi.fn(),
  downloadMarkdown: vi.fn(),
  downloadData: vi.fn(),
  exportAllJSON: vi.fn(() => '{"sessions":[]}'),
  exportTimelineMarkdown: vi.fn(() => '# 时间线'),
  exportData: vi.fn(() => ({ sessions: [] })),
  importJSON: vi.fn(),
  importData: vi.fn(),
}))

vi.mock('../engine/data-port', () => dataPort)

import { useDataPort } from './useDataPort'

describe('useDataPort', () => {
  it('将 importJSON 原样转发给 engine data-port', () => {
    expect(useDataPort().importJSON).toBe(dataPort.importJSON)
  })

  it('不拦截 engine importJSON 的错误', () => {
    const error = new SyntaxError('invalid JSON')
    dataPort.importJSON.mockImplementationOnce(() => { throw error })
    expect(() => useDataPort().importJSON('{invalid')).toThrow(error)
  })

  it('将 importData 原样转发', () => {
    expect(useDataPort().importData).toBe(dataPort.importData)
  })

  it('将 downloadJSON 原样转发', () => {
    expect(useDataPort().downloadJSON).toBe(dataPort.downloadJSON)
  })

  it('将 downloadMarkdown 原样转发', () => {
    expect(useDataPort().downloadMarkdown).toBe(dataPort.downloadMarkdown)
  })

  it('将 downloadData 原样转发', () => {
    expect(useDataPort().downloadData).toBe(dataPort.downloadData)
  })

  it('exportAllJSON 转发并返回结果', () => {
    const result = useDataPort().exportAllJSON()
    expect(result).toBe('{"sessions":[]}')
  })

  it('exportTimelineMarkdown 转发并返回结果', () => {
    const result = useDataPort().exportTimelineMarkdown()
    expect(result).toBe('# 时间线')
  })

  it('exportData 转发并返回结果', () => {
    const result = useDataPort().exportData('json')
    expect(result).toEqual({ sessions: [] })
  })

  it('多次调用 useDataPort 返回同一组引用', () => {
    const a = useDataPort()
    const b = useDataPort()
    expect(a.importJSON).toBe(b.importJSON)
    expect(a.exportAllJSON).toBe(b.exportAllJSON)
  })
})