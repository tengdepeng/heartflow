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
  useWidgetHotzone,
  reloadWidgetHotzone,
  DEFAULT_HOTZONES,
  MAX_HOTZONES,
  MIN_ZONE_SIZE,
} from '../widget-hotzone'

describe('useWidgetHotzone', () => {
  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k])
    vi.clearAllMocks()
    useWidgetHotzone().reset()
  })

  it('默认两个热区', () => {
    const h = useWidgetHotzone()
    expect(h.zones.value.length).toBe(DEFAULT_HOTZONES.length)
    expect(h.zones.value[0].label).toBe(DEFAULT_HOTZONES[0].label)
  })

  it('新增热区并封顶', () => {
    const h = useWidgetHotzone()
    while (h.canAdd.value) h.addZone()
    expect(h.zones.value.length).toBe(MAX_HOTZONES)
    expect(h.addZone()).toBeNull()
  })

  it('按 id 移除', () => {
    const h = useWidgetHotzone()
    const id = h.zones.value[0].id
    expect(h.removeZone(id)).toBe(true)
    expect(h.zones.value.some((z) => z.id === id)).toBe(false)
    expect(h.removeZone('missing')).toBe(false)
  })

  it('移动时夹取使热区不越界', () => {
    const h = useWidgetHotzone()
    const id = h.zones.value[0].id
    h.moveZone(id, 999, -5)
    const z = h.zones.value.find((v) => v.id === id)!
    expect(z.x).toBe(100 - z.w)
    expect(z.y).toBe(0)
  })

  it('缩放时夹取最小尺寸', () => {
    const h = useWidgetHotzone()
    const id = h.zones.value[0].id
    h.resizeZone(id, 0, 0)
    const z = h.zones.value.find((v) => v.id === id)!
    expect(z.w).toBe(MIN_ZONE_SIZE)
    expect(z.h).toBe(MIN_ZONE_SIZE)
  })

  it('更新标签与动作并持久化', () => {
    const h = useWidgetHotzone()
    const id = h.zones.value[0].id
    h.updateZone(id, { label: ' 打开日历 ', action: 'openCalendar' })
    const z = h.zones.value.find((v) => v.id === id)!
    expect(z.label).toBe('打开日历')
    expect(z.action).toBe('openCalendar')
    expect((store['hf:widget_hotzone'] as any).zones.length).toBe(h.zones.value.length)
  })

  it('清空与复位', () => {
    const h = useWidgetHotzone()
    h.clearAll()
    expect(h.zones.value.length).toBe(0)
    h.reset()
    expect(h.zones.value.length).toBe(DEFAULT_HOTZONES.length)
  })

  it('加载时清洗非法条目', () => {
    store['hf:widget_hotzone'] = {
      zones: [
        { id: 'a', label: '', action: '', x: 90, y: 90, w: 30, h: 30 },
        'bad',
        { id: 'b', label: '好', action: 'x', x: 10, y: 10, w: 20, h: 20 },
      ],
    }
    reloadWidgetHotzone()
    const h = useWidgetHotzone()
    expect(h.zones.value.length).toBe(2)
    expect(h.zones.value[0].label).toBe('未命名热区')
    expect(h.zones.value[0].x).toBe(70)
  })
})
