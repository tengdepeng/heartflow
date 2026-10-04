// ============================================================
// 全局 UI · 字体库（INCR-501）测试
// 覆盖：默认字族 / 正文·标题独立选择与持久化 / 未知 id 兜底 /
//       重置默认 / CSS 变量映射 / 写入 <html> 生效
// 键 hf:font_library，本地私有、不触云。
// ============================================================
import { describe, expect, it, beforeEach } from 'vitest'
import {
  useFontLibrary,
  reloadFontLibrary,
  fontPreset,
  fontCssVars,
  applyFonts,
  FONT_PRESETS,
  DEFAULT_FONT_LIBRARY,
} from '../font-library'
import { storage } from '../../../engine/storage'

const KEY = 'hf:font_library'

describe('font-library · 字体库', () => {
  beforeEach(() => {
    storage.setKV(KEY, '')
    reloadFontLibrary()
  })

  it('默认正文黑体 / 标题宋体，共 7 款预设', () => {
    const { bodyId, headingId } = useFontLibrary()
    expect(bodyId.value).toBe('sans')
    expect(headingId.value).toBe('serif')
    expect(FONT_PRESETS).toHaveLength(7)
    expect(DEFAULT_FONT_LIBRARY).toEqual({ bodyId: 'sans', headingId: 'serif' })
  })

  it('setBody / setHeading 独立落盘，重载仍生效', () => {
    const { setBody, setHeading, body, heading } = useFontLibrary()
    expect(setBody('kai')).toBe('kai')
    expect(setHeading('mono')).toBe('mono')
    expect(body.value.label).toBe('楷体')
    expect(heading.value.label).toBe('等宽')
    expect(storage.getKV(KEY, null)).toEqual({ bodyId: 'kai', headingId: 'mono' })

    reloadFontLibrary()
    const g = useFontLibrary()
    expect(g.bodyId.value).toBe('kai')
    expect(g.headingId.value).toBe('mono')
  })

  it('未知 id 回落首个预设', () => {
    const { setBody } = useFontLibrary()
    expect(setBody('not-a-font')).toBe(FONT_PRESETS[0].id)
    expect(fontPreset('not-a-font').id).toBe(FONT_PRESETS[0].id)
  })

  it('存储脏数据按角色各自兜底', () => {
    storage.setKV(KEY, { bodyId: 'ghost', headingId: 'kai' })
    reloadFontLibrary()
    const g = useFontLibrary()
    expect(g.bodyId.value).toBe('sans')
    expect(g.headingId.value).toBe('kai')
  })

  it('reset 恢复默认字族', () => {
    const { setBody, setHeading, reset, bodyId, headingId } = useFontLibrary()
    setBody('rounded')
    setHeading('mono')
    reset()
    expect(bodyId.value).toBe('sans')
    expect(headingId.value).toBe('serif')
  })

  it('fontCssVars 映射 4 个字体变量', () => {
    const vars = fontCssVars({ bodyId: 'sans', headingId: 'serif' })
    expect(Object.keys(vars).sort()).toEqual(
      ['--font-body-en', '--font-body-zh', '--font-heading-en', '--font-heading-zh'].sort(),
    )
    expect(vars['--font-body-zh']).toContain('Noto Sans SC')
    expect(vars['--font-heading-zh']).toContain('Noto Serif SC')
  })

  it('applyFonts 将字族写入 <html> 内联样式', () => {
    applyFonts({ bodyId: 'mono', headingId: 'kai' })
    const root = document.documentElement
    expect(root.style.getPropertyValue('--font-body-zh')).toContain('monospace')
    expect(root.style.getPropertyValue('--font-heading-zh')).toContain('Kaiti')
  })
})
