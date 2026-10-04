// ============================================================
// 星空 · 月面地名导览（INCR-512）测试
// 覆盖：数据完整性 / 类型筛选 / 搜索 / 直径排序 /
//       正交投影可见性 / 显示半径上下限 / 背面判定。
// 纯本地静态数据，零网络。
// ============================================================
import { describe, it, expect } from 'vitest'
import {
  LUNAR_FEATURES,
  FEATURE_TYPE_ORDER,
  FEATURE_TYPE_LABEL,
  featuresByType,
  searchFeatures,
  sortByDiameter,
  projectToDisc,
  discRadius,
  isFarSide,
} from '../moon-atlas'

describe('LUNAR_FEATURES 数据完整性', () => {
  it('数量充足且每条字段完整、坐标合法', () => {
    expect(LUNAR_FEATURES.length).toBeGreaterThanOrEqual(30)
    for (const f of LUNAR_FEATURES) {
      expect(f.id).toBeTruthy()
      expect(f.name).toBeTruthy()
      expect(f.nameZh).toBeTruthy()
      expect(FEATURE_TYPE_ORDER).toContain(f.type)
      expect(f.lat).toBeGreaterThanOrEqual(-90)
      expect(f.lat).toBeLessThanOrEqual(90)
      expect(f.lon).toBeGreaterThanOrEqual(-180)
      expect(f.lon).toBeLessThanOrEqual(180)
      expect(f.diameter).toBeGreaterThan(0)
    }
  })

  it('id 唯一', () => {
    const ids = LUNAR_FEATURES.map((f) => f.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('每种类型都有中文标签', () => {
    for (const t of FEATURE_TYPE_ORDER) {
      expect(FEATURE_TYPE_LABEL[t]).toBeTruthy()
    }
  })
})

describe('纯函数', () => {
  it('featuresByType 按类型筛选，空串返回全部', () => {
    const craters = featuresByType('crater')
    expect(craters.length).toBeGreaterThan(0)
    expect(craters.every((f) => f.type === 'crater')).toBe(true)
    expect(featuresByType('')).toHaveLength(LUNAR_FEATURES.length)
  })

  it('searchFeatures 匹配中/拉丁名不区分大小写，空白返回全部', () => {
    expect(searchFeatures('tycho').length).toBeGreaterThan(0)
    expect(searchFeatures('静海').length).toBeGreaterThan(0)
    expect(searchFeatures('   ')).toHaveLength(LUNAR_FEATURES.length)
    expect(searchFeatures('不存在xyz')).toHaveLength(0)
  })

  it('sortByDiameter 默认降序、可升序', () => {
    const desc = sortByDiameter(LUNAR_FEATURES, true)
    for (let i = 1; i < desc.length; i++) {
      expect(desc[i].diameter).toBeLessThanOrEqual(desc[i - 1].diameter)
    }
    const asc = sortByDiameter(LUNAR_FEATURES, false)
    expect(asc[0].diameter).toBeLessThanOrEqual(asc[asc.length - 1].diameter)
  })

  it('projectToDisc：正对地心可见、背面不可见、极点映射', () => {
    const center = projectToDisc(0, 0)
    expect(center.x).toBeCloseTo(0, 6)
    expect(center.y).toBeCloseTo(0, 6)
    expect(center.visible).toBe(true)

    // 东经 90° → 单位盘右缘
    expect(projectToDisc(0, 90).x).toBeCloseTo(1, 6)
    // 背面（经度 180°）不可见
    expect(projectToDisc(0, 180).visible).toBe(false)
    // 北极 lat=90 → y=1
    expect(projectToDisc(90, 0).y).toBeCloseTo(1, 6)
  })

  it('discRadius 有上下限', () => {
    expect(discRadius(0)).toBeGreaterThanOrEqual(0.03)
    expect(discRadius(100000)).toBeLessThanOrEqual(0.42)
    // 直径越大半径越大
    expect(discRadius(1000)).toBeGreaterThan(discRadius(100))
  })

  it('isFarSide 以 |经度|>90° 判定背面', () => {
    expect(isFarSide({ id: 'x', name: 'X', nameZh: 'X', type: 'crater', lat: 0, lon: 120, diameter: 10 })).toBe(true)
    expect(isFarSide({ id: 'y', name: 'Y', nameZh: 'Y', type: 'crater', lat: 0, lon: 30, diameter: 10 })).toBe(false)
  })
})
