// ============================================================
// 逐日心锚 · 照片地图（Photo Map）单元测试
// 纯函数为主；时间戳取 12:00Z（东八区当日 20:00），规避 UTC 偏移漂移。
// ============================================================

process.env.TZ = 'Asia/Shanghai'

import { describe, expect, it, vi } from 'vitest'
import { createMockStorage } from '../../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../../engine/storage/core'
import type { PhotoEntry } from '../photo-diary'
import type { Place } from '../../map/map'

const D1 = '2026-10-01'
const D2 = '2026-10-03'

function setup(kvStore: Record<string, any> = {}) {
  vi.resetModules()
  const mock = createMockStorage()
  mock.setItem('heartflow:storage', JSON.stringify({ version: 10, kvStore, sessions: [], crystals: [] }))
  ;(globalThis as any).localStorage = mock
  invalidateCache()
  return mock
}

async function loadModule() {
  return await import('../photo-map')
}

// ---- 夹具 ----

function ph(over: Partial<PhotoEntry> = {}): PhotoEntry {
  return {
    id: 'p1',
    date: D1,
    images: ['A', 'B'],
    thumbs: ['a', 'b'],
    captions: ['', ''],
    caption: '',
    createdAt: `${D1}T12:00:00.000Z`,
    ...over,
  }
}

function place(over: Partial<Place> = {}): Place {
  return {
    id: 'pl1',
    name: '西湖',
    city: '杭州',
    type: 'travel',
    note: '',
    visitCount: 1,
    at: D1,
    lng: 120.15,
    lat: 30.25,
    _expanded: false,
    ...over,
  }
}

// ---- placeVisitDate ----

describe('placeVisitDate 到访日期', () => {
  it('纯日期串原样返回（不做 UTC 解析）', async () => {
    const { placeVisitDate } = await loadModule()
    expect(placeVisitDate(place({ at: D1 }))).toBe(D1)
  })

  it('ISO 时间戳按本地日历键切日', async () => {
    const { placeVisitDate } = await loadModule()
    expect(placeVisitDate(place({ at: `${D1}T12:00:00.000Z` }))).toBe(D1)
  })

  it('空串 / 非法值返回空串', async () => {
    const { placeVisitDate } = await loadModule()
    expect(placeVisitDate(place({ at: '' }))).toBe('')
    expect(placeVisitDate(place({ at: 'not-a-date' }))).toBe('')
  })
})

// ---- expandEntry ----

describe('expandEntry 展开照片', () => {
  it('逐张展开并保留下标 / 说明 / 缩略图', async () => {
    const { expandEntry } = await loadModule()
    const out = expandEntry(
      ph({ images: ['FULL1', 'FULL2'], thumbs: ['T1', ''], captions: ['第一张', ''] }),
    )
    expect(out).toHaveLength(2)
    expect(out[0]).toEqual({ entryId: 'p1', date: D1, index: 0, thumb: 'T1', caption: '第一张' })
    // thumb 缺失回退到原图
    expect(out[1].thumb).toBe('FULL2')
    expect(out[1].caption).toBe('')
  })
})

// ---- buildPhotoMapPins ----

describe('buildPhotoMapPins 落点生成', () => {
  it('照片日期与地点到访日期一致 → 落点', async () => {
    const { buildPhotoMapPins } = await loadModule()
    const pins = buildPhotoMapPins([ph({ date: D1 })], [place({ at: D1 })])
    expect(pins).toHaveLength(1)
    expect(pins[0].placeId).toBe('pl1')
    expect(pins[0].name).toBe('西湖')
    expect(pins[0].city).toBe('杭州')
    expect(pins[0].visitDate).toBe(D1)
    expect(pins[0].photos).toHaveLength(2)
  })

  it('日期不匹配的地点不成落点', async () => {
    const { buildPhotoMapPins } = await loadModule()
    expect(buildPhotoMapPins([ph({ date: D1 })], [place({ at: D2 })])).toHaveLength(0)
  })

  it('缺经纬度 / 缺到访日期的地点被跳过', async () => {
    const { buildPhotoMapPins } = await loadModule()
    const pins = buildPhotoMapPins(
      [ph({ date: D1 })],
      [
        place({ id: 'no-coord', lng: undefined, lat: undefined }),
        place({ id: 'no-date', at: '' }),
      ],
    )
    expect(pins).toHaveLength(0)
  })

  it('无照片的日期不产生落点', async () => {
    const { buildPhotoMapPins } = await loadModule()
    expect(buildPhotoMapPins([], [place({ at: D1 })])).toHaveLength(0)
  })

  it('按到访日期倒序排列', async () => {
    const { buildPhotoMapPins } = await loadModule()
    const pins = buildPhotoMapPins(
      [ph({ id: 'pa', date: D1 }), ph({ id: 'pb', date: D2 })],
      [place({ id: 'older', at: D1 }), place({ id: 'newer', at: D2 })],
    )
    expect(pins.map(p => p.placeId)).toEqual(['newer', 'older'])
  })

  it('同一天多个地点各自成落点（无法自动消歧）', async () => {
    const { buildPhotoMapPins } = await loadModule()
    const pins = buildPhotoMapPins(
      [ph({ date: D1 })],
      [place({ id: 'x' }), place({ id: 'y', name: '灵隐寺' })],
    )
    expect(pins.map(p => p.placeId).sort()).toEqual(['x', 'y'])
    expect(pins.every(p => p.photos.length === 2)).toBe(true)
  })
})

// ---- photoMapStats ----

describe('photoMapStats 统计', () => {
  it('落点数 / 城市数（去重）/ 照片数', async () => {
    const { buildPhotoMapPins, photoMapStats } = await loadModule()
    const pins = buildPhotoMapPins(
      [ph({ id: 'p1', date: D1, images: ['A', 'B'] }), ph({ id: 'p2', date: D2, images: ['C'] })],
      [
        place({ id: 'h1', at: D1, city: '杭州' }),
        place({ id: 'h2', at: D2, city: '杭州' }),
        place({ id: 's1', at: D2, city: '上海', name: '外滩' }),
      ],
    )
    expect(photoMapStats(pins)).toEqual({ placeCount: 3, cityCount: 2, photoCount: 4 })
  })

  it('空落点 → 全零', async () => {
    const { photoMapStats } = await loadModule()
    expect(photoMapStats([])).toEqual({ placeCount: 0, cityCount: 0, photoCount: 0 })
  })
})

// ---- pinsCentroid ----

describe('pinsCentroid 质心', () => {
  it('空落点返回 null', async () => {
    const { pinsCentroid } = await loadModule()
    expect(pinsCentroid([])).toBeNull()
  })

  it('返回经纬度均值', async () => {
    const { buildPhotoMapPins, pinsCentroid } = await loadModule()
    const pins = buildPhotoMapPins(
      [ph({ date: D1 })],
      [
        place({ id: 'a', at: D1, lng: 100, lat: 20 }),
        place({ id: 'b', at: D1, lng: 120, lat: 40 }),
      ],
    )
    expect(pinsCentroid(pins)).toEqual({ lng: 110, lat: 30 })
  })
})

// ---- usePhotoMap 组合式接线 ----

describe('usePhotoMap 组合式接线', () => {
  it('从照片日记与地图室地点读取并生成落点 / 统计', async () => {
    setup({
      'hf:anchor:photo_diary': [ph({ date: D1, images: ['A', 'B'] })],
      'hf:map_places_v2': [place({ at: D1, lng: 120.15, lat: 30.25 })],
    })
    const { usePhotoMap } = await loadModule()
    const map = usePhotoMap()
    map.refresh()

    expect(map.pins.value).toHaveLength(1)
    expect(map.pins.value[0].name).toBe('西湖')
    expect(map.stats.value).toEqual({ placeCount: 1, cityCount: 1, photoCount: 2 })
  })

  it('无地点数据 → 空落点', async () => {
    setup({ 'hf:anchor:photo_diary': [ph({ date: D1 })] })
    const { usePhotoMap } = await loadModule()
    const map = usePhotoMap()
    map.refresh()
    expect(map.pins.value).toHaveLength(0)
    expect(map.stats.value.placeCount).toBe(0)
  })
})
