import { describe, it, expect, beforeEach } from 'vitest'
import { createMockStorage } from '../../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../../engine/storage/core'
import {
  CURATED_SPOTS,
  filterByProvince,
  searchSpots,
  sortByDarkness,
  bortleLabel,
  useStargazingSpots,
} from '../stargazing-spots'

beforeEach(() => {
  const m = createMockStorage()
  ;(globalThis as any).localStorage = m
  invalidateCache()
})

describe('CURATED_SPOTS 数据完整性', () => {
  it('数量充足且每条字段完整、坐标合法', () => {
    expect(CURATED_SPOTS.length).toBeGreaterThanOrEqual(30)
    for (const s of CURATED_SPOTS) {
      expect(s.id).toBeTruthy()
      expect(s.name).toBeTruthy()
      expect(s.province).toBeTruthy()
      expect(s.desc).toBeTruthy()
      expect(s.lat).toBeGreaterThanOrEqual(-90)
      expect(s.lat).toBeLessThanOrEqual(90)
      expect(s.lng).toBeGreaterThanOrEqual(-180)
      expect(s.lng).toBeLessThanOrEqual(180)
      expect(s.altitude).toBeGreaterThanOrEqual(0)
      expect(s.bortle).toBeGreaterThanOrEqual(1)
      expect(s.bortle).toBeLessThanOrEqual(9)
    }
  })

  it('id 唯一', () => {
    const ids = CURATED_SPOTS.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('纯函数', () => {
  it('filterByProvince 精确匹配省，空串返回全部', () => {
    const r = filterByProvince(CURATED_SPOTS, '西藏')
    expect(r.length).toBeGreaterThan(0)
    expect(r.every(s => s.province === '西藏')).toBe(true)
    expect(filterByProvince(CURATED_SPOTS, '')).toBe(CURATED_SPOTS)
  })

  it('searchSpots 按名称/省/描述不区分大小写，空白返回全部', () => {
    expect(searchSpots(CURATED_SPOTS, '丽江').length).toBeGreaterThan(0)
    expect(searchSpots(CURATED_SPOTS, '西藏').length).toBeGreaterThan(0)
    expect(searchSpots(CURATED_SPOTS, '银河').length).toBeGreaterThan(0)
    expect(searchSpots(CURATED_SPOTS, '   ')).toBe(CURATED_SPOTS) // 纯空白返回全部
    expect(searchSpots(CURATED_SPOTS, '不存在xyz').length).toBe(0)
  })

  it('sortByDarkness 升序最暗在前、降序反之', () => {
    const asc = sortByDarkness(CURATED_SPOTS, true)
    for (let i = 1; i < asc.length; i++) {
      expect(asc[i].bortle).toBeGreaterThanOrEqual(asc[i - 1].bortle)
    }
    const desc = sortByDarkness(CURATED_SPOTS, false)
    expect(desc[0].bortle).toBeGreaterThanOrEqual(desc[desc.length - 1].bortle)
  })

  it('bortleLabel 暗夜/城市映射', () => {
    expect(bortleLabel(1)).toContain('暗空')
    expect(bortleLabel(9)).toContain('城市')
  })
})

describe('useStargazingSpots 观测地选择', () => {
  it('setSpot 选中并驱动坐标，无效 id 忽略，clearSpot 复位', () => {
    const { setSpot, clearSpot, selectedId, selectedSpot, observingCoords, provinces } =
      useStargazingSpots()
    clearSpot() // 复位，避免跨测试泄漏

    expect(selectedId.value).toBeNull()
    const target = CURATED_SPOTS[0]
    setSpot(target.id)
    expect(selectedId.value).toBe(target.id)
    expect(selectedSpot.value?.id).toBe(target.id)
    const c = observingCoords()
    expect(c.latDeg).toBe(target.lat)
    expect(c.lngDeg).toBe(target.lng)

    setSpot('bogus-id')
    expect(selectedId.value).toBe(target.id) // 无效 id 不改变

    clearSpot()
    expect(selectedId.value).toBeNull()
    const c2 = observingCoords()
    expect(c2.latDeg).toBe(39.9)
    expect(c2.lngDeg).toBe(116.4)

    expect(provinces.value.length).toBeGreaterThan(0)
  })
})
