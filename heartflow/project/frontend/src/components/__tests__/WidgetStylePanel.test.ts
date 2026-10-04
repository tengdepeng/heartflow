import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'

const mockStore: Record<string, any> = {}
vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (k: string, def: any) => (k in mockStore ? mockStore[k] : def),
    setKV: (k: string, val: any) => {
      mockStore[k] = val
    },
  },
}))

import WidgetStylePanel from '../WidgetStylePanel.vue'
import { useWidgetStyle, WIDGET_KINDS, STYLE_VARIANTS, DEFAULT_STYLE_ID } from '../../modules/widget-style'

describe('WidgetStylePanel', () => {
  beforeEach(() => {
    Object.keys(mockStore).forEach((k) => delete mockStore[k])
    useWidgetStyle().resetAll()
  })

  it('渲染标题与全部组件卡片', () => {
    const w = mount(WidgetStylePanel)
    expect(w.text()).toContain('组件款式 / 皮肤矩阵')
    expect(w.findAll('.wsp-card').length).toBe(WIDGET_KINDS.length)
    expect(w.findAll('.wsp-variants').length).toBe(WIDGET_KINDS.length)
    expect(w.findAll('.wsp-variants')[0].findAll('button').length).toBe(STYLE_VARIANTS.length)
    w.unmount()
  })

  it('默认选中简约款式', () => {
    const w = mount(WidgetStylePanel)
    const firstCard = w.findAll('.wsp-card')[0]
    const active = firstCard.findAll('.wsp-variants button').filter((b) => b.classes().includes('active'))
    expect(active.length).toBe(1)
    expect(active[0].text()).toBe('简约')
    w.unmount()
  })

  it('切换款式写入引擎', async () => {
    const w = mount(WidgetStylePanel)
    const firstCard = w.findAll('.wsp-card')[0]
    await firstCard.findAll('.wsp-variants button')[2].trigger('click')
    expect(useWidgetStyle().styleOf(WIDGET_KINDS[0].id)).toBe(STYLE_VARIANTS[2].id)
    expect(firstCard.find('.wsp-preview').classes()).toContain('is-pixel')
    w.unmount()
  })

  it('单组件复位', async () => {
    const w = mount(WidgetStylePanel)
    const firstCard = w.findAll('.wsp-card')[0]
    await firstCard.findAll('.wsp-variants button')[1].trigger('click')
    await firstCard.find('.wsp-kind-reset').trigger('click')
    expect(useWidgetStyle().styleOf(WIDGET_KINDS[0].id)).toBe(DEFAULT_STYLE_ID)
    w.unmount()
  })

  it('全部恢复默认', async () => {
    const w = mount(WidgetStylePanel)
    await w.findAll('.wsp-card')[0].findAll('.wsp-variants button')[2].trigger('click')
    await w.findAll('.wsp-card')[1].findAll('.wsp-variants button')[1].trigger('click')
    await w.find('.wsp-reset').trigger('click')
    const s = useWidgetStyle()
    for (const k of WIDGET_KINDS) expect(s.styleOf(k.id)).toBe(DEFAULT_STYLE_ID)
    w.unmount()
  })
})
