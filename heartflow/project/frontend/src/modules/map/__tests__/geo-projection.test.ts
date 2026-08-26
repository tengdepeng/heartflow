// ============================================================
// 地图室 · 地理正射投影测试
// ============================================================
import { describe, expect, it } from 'vitest'
import {
  projectGeo,
  longitudeDelta,
  sphereOutline,
  sortByDepth,
} from '../geo-projection'
import type { ProjectedPoint } from '../geo-projection'

describe('longitudeDelta', () => {
  it('经度差归一化到 [-180, 180)', () => {
    expect(longitudeDelta(20, 0)).toBeCloseTo(20)
    expect(longitudeDelta(-20, 0)).toBeCloseTo(-20)
    expect(longitudeDelta(-200, 0)).toBeCloseTo(160)
    expect(longitudeDelta(200, 0)).toBeCloseTo(-160)
  })
})

describe('projectGeo 几何性质', () => {
  it('中央点落在球心，深度最近', () => {
    const p = projectGeo(0, 0, 100)
    expect(p.x).toBeCloseTo(0)
    expect(p.y).toBeCloseTo(0)
    expect(p.visible).toBe(true)
    expect(p.z).toBeCloseTo(0)
  })

  it('任意投影点位于球面轮廓范围内', () => {
    for (const lng of [0, 60, 120, 180, -170]) {
      for (const lat of [-80, -30, 0, 30, 80]) {
        const p = projectGeo(lng, lat, 80, { cx: 100, cy: 100 })
        const dist = Math.hypot(p.x - 100, p.y - 100)
        expect(dist).toBeLessThanOrEqual(80 + 1e-6)
      }
    }
  })

  it('赤道上经度 +90° 朝右投影', () => {
    const p = projectGeo(90, 0, 80)
    expect(p.y).toBeCloseTo(0)
    expect(p.x).toBeGreaterThan(0)
  })

  it('北纬 90° 投影到球面顶端', () => {
    const p = projectGeo(0, 90, 100)
    expect(p.x).toBeCloseTo(0)
    expect(p.y).toBeLessThan(0)
  })
})

describe('projectGeo 可见性与深度', () => {
  it('背面不可见', () => {
    const back = projectGeo(180, 0, 80)
    expect(back.visible).toBe(false)
  })

  it('中心平移对应关系：centerLng 面向观察者', () => {
    // 当地图中央经度＝该点经度，该点应可见且靠近中心
    const p = projectGeo(120, 0, 80, { centerLng: 120 })
    expect(p.visible).toBe(true)
    expect(Math.hypot(p.x, p.y)).toBeLessThan(1)
  })

  it('深度单调：中心最近、边缘更远', () => {
    const center = projectGeo(0, 0, 80)
    const edge = projectGeo(60, 0, 80)
    expect(center.z).toBeLessThan(edge.z)
  })
})

describe('sphereOutline / sortByDepth', () => {
  it('球面轮廓为封闭圆', () => {
    const outline = sphereOutline(50, 50, 40, 4)
    expect(outline[0].x).toBeCloseTo(outline[outline.length - 1].x, 5)
    expect(outline[0].y).toBeCloseTo(outline[outline.length - 1].y, 5)
    expect(outline.length).toBe(5)
  })

  it('按深度升序排序（近者在前）', () => {
    const pts: Array<ProjectedPoint & { id: number }> = [
      { x: 0, y: 0, z: 0.9, visible: true, id: 1 },
      { x: 0, y: 0, z: 0.1, visible: true, id: 2 },
      { x: 0, y: 0, z: 0.5, visible: true, id: 3 },
    ]
    sortByDepth(pts)
    expect(pts.map(p => p.id)).toEqual([2, 3, 1])
  })
})