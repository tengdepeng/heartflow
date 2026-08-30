import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isImageIcon, GLYPH_PALETTE, fileToDataUri } from '../icon'

describe('isImageIcon', () => {
  it('图片型（data-uri / http(s) / 相对路径 / blob）返回 true', () => {
    expect(isImageIcon('data:image/png;base64,abc')).toBe(true)
    expect(isImageIcon('https://x.com/a.png')).toBe(true)
    expect(isImageIcon('http://x.com/a.png')).toBe(true)
    expect(isImageIcon('/icons/a.png')).toBe(true)
    expect(isImageIcon('blob:https://x/abc')).toBe(true)
  })

  it('字形（emoji/字符）/ null / undefined / 纯文本返回 false', () => {
    expect(isImageIcon('📖')).toBe(false)
    expect(isImageIcon('✦')).toBe(false)
    expect(isImageIcon('icon.png')).toBe(false)
    expect(isImageIcon(null)).toBe(false)
    expect(isImageIcon(undefined)).toBe(false)
    expect(isImageIcon('')).toBe(false)
  })
})

describe('GLYPH_PALETTE', () => {
  it('为非空且含默认字形 ✦', () => {
    expect(GLYPH_PALETTE.length).toBeGreaterThan(0)
    expect(GLYPH_PALETTE).toContain('✦')
  })
})

describe('fileToDataUri', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('读取 File 为 data-uri', async () => {
    const fakeResult = 'data:image/png;base64,ZZZ'
    class FakeReader {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      readAsDataURL() {
        // 模拟异步读完后触发 onload
        queueMicrotask(() => this.onload && this.onload())
      }
      get result() {
        return fakeResult
      }
      error = null
    }
    vi.stubGlobal('FileReader', FakeReader as unknown as typeof FileReader)

    const file = new File(['x'], 'a.png', { type: 'image/png' })
    const uri = await fileToDataUri(file)
    expect(uri).toBe(fakeResult)
  })
})
