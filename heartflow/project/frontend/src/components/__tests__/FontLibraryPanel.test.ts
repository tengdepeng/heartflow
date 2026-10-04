// ============================================================
// FontLibraryPanel · 字体库面板（INCR-501）测试
// 覆盖：结构渲染 / 默认激活项 / 正文字体选择落盘 / 恢复默认。
// 依赖真实 font-library 引擎 + 真实 storage（jsdom）。
// ============================================================
import { describe, expect, it, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { storage } from '../../engine/storage'
import { reloadFontLibrary, FONT_PRESETS } from '../../modules/font-library/font-library'
import FontLibraryPanel from '../FontLibraryPanel.vue'

const KEY = 'hf:font_library'

describe('FontLibraryPanel · 字体库', () => {
  beforeEach(() => {
    storage.setKV(KEY, '')
    reloadFontLibrary()
  })

  it('渲染标题与正文/标题两组各 7 张预设卡', () => {
    const w = mount(FontLibraryPanel)
    expect(w.text()).toContain('字体库')
    expect(w.findAll('.flp-group')).toHaveLength(2)
    expect(w.findAll('.flp-card')).toHaveLength(FONT_PRESETS.length * 2)
  })

  it('默认正文黑体 / 标题宋体各一张激活卡', () => {
    const w = mount(FontLibraryPanel)
    const grids = w.findAll('.flp-grid')
    expect(grids[0].findAll('.flp-card.is-active')).toHaveLength(1)
    expect(grids[1].findAll('.flp-card.is-active')).toHaveLength(1)
    expect(grids[0].find('.flp-card.is-active').text()).toContain('黑体')
    expect(grids[1].find('.flp-card.is-active').text()).toContain('宋体')
  })

  it('选择正文字体落盘并更新当前项', async () => {
    const w = mount(FontLibraryPanel)
    const bodyGrid = w.findAll('.flp-grid')[0]
    const kai = bodyGrid.findAll('.flp-card').find((c) => c.text().includes('楷体'))!
    await kai.trigger('click')
    await w.vm.$nextTick()
    expect(storage.getKV(KEY, null)).toMatchObject({ bodyId: 'kai' })
    expect(w.text()).toContain('当前：楷体')
  })

  it('恢复默认还原正文黑体 / 标题宋体', async () => {
    const w = mount(FontLibraryPanel)
    const bodyGrid = w.findAll('.flp-grid')[0]
    await bodyGrid.findAll('.flp-card').find((c) => c.text().includes('等宽'))!.trigger('click')
    await w.vm.$nextTick()
    await w.find('.flp-reset').trigger('click')
    await w.vm.$nextTick()
    expect(storage.getKV(KEY, null)).toEqual({ bodyId: 'sans', headingId: 'serif' })
  })
})
