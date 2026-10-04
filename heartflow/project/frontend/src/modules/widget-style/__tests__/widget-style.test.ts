import { describe, it, expect, beforeEach, vi } from 'vitest'

const { store, mockGetKV, mockSetKV } = vi.hoisted(() => {
  const store: Record<string, any> = {}
  return {
    store,
    mockGetKV: vi.fn((k: string, def: any) => (k in store ? store[k] : def)),
    mockSetKV: vi.fn((k: string, val: any) => {
      store[k] = val
    }),
  }
})

vi.mock('../../../engine/storage', () => ({
  storage: { getKV: mockGetKV, setKV: mockSetKV },
}))

import {
  useWidgetStyle,
  reloadWidgetStyle,
  STYLE_VARIANTS,
  WIDGET_KINDS,
  DEFAULT_STYLE_ID,
  DEFAULT_STYLE_BY_KIND,
} from '../widget-style'

describe('useWidgetStyle', () => {
  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k])
    vi.clearAllMocks()
    useWidgetStyle().resetAll()
  })

  it('默认所有组件为简约款式', () => {
    const s = useWidgetStyle()
    expect(STYLE_VARIANTS.length).toBe(3)
    expect(Object.keys(s.styles.value)).toEqual(WIDGET_KINDS.map((k) => k.id))
    for (const k of WIDGET_KINDS) expect(s.styleOf(k.id)).toBe(DEFAULT_STYLE_ID)
  })

  it('设置款式并持久化', () => {
    const s = useWidgetStyle()
    expect(s.setStyle('pomodoro', 'pixel')).toBe(true)
    expect(s.styleOf('pomodoro')).toBe('pixel')
    expect((store['hf:widget_style'] as any).styles.pomodoro).toBe('pixel')
  })

  it('拒绝未知组件与未知款式', () => {
    const s = useWidgetStyle()
    expect(s.setStyle('nope', 'pixel')).toBe(false)
    expect(s.setStyle('pomodoro', 'nope')).toBe(false)
    expect(s.styleOf('pomodoro')).toBe(DEFAULT_STYLE_ID)
  })

  it('单组件复位', () => {
    const s = useWidgetStyle()
    s.setStyle('weather', 'skeuomorph')
    s.resetKind('weather')
    expect(s.styleOf('weather')).toBe(DEFAULT_STYLE_ID)
  })

  it('全部复位', () => {
    const s = useWidgetStyle()
    s.setStyle('quote', 'pixel')
    s.setStyle('quick-note', 'skeuomorph')
    s.resetAll()
    expect(s.styles.value).toEqual(DEFAULT_STYLE_BY_KIND)
  })

  it('加载时过滤非法款式并补齐缺省', () => {
    store['hf:widget_style'] = { styles: { pomodoro: 'pixel', weather: 'bogus' } }
    reloadWidgetStyle()
    const s = useWidgetStyle()
    expect(s.styleOf('pomodoro')).toBe('pixel')
    expect(s.styleOf('weather')).toBe(DEFAULT_STYLE_ID)
    expect(s.styleOf('quote')).toBe(DEFAULT_STYLE_ID)
  })
})
