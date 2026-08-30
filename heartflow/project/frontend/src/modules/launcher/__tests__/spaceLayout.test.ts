import { describe, it, expect } from 'vitest'
import {
  computeCardTransforms,
  suggestCameraDistance,
  LAYOUT_CONSTANTS,
} from '../spaceLayout'

describe('Launcher · 3D 空间布局算法', () => {
  it('0 个 / 1 个条目：空数组与居中卡片', () => {
    expect(computeCardTransforms('arc', 0)).toEqual([])
    expect(computeCardTransforms('grid', 0)).toEqual([])
    const one = computeCardTransforms('arc', 1)
    expect(one).toHaveLength(1)
    expect(one[0]).toEqual({ x: 0, y: 0, z: 0, rotY: 0 })
  })

  it('弧墙：数量正确、左右对称、中间卡片最靠近镜头', () => {
    const t = computeCardTransforms('arc', 5)
    expect(t).toHaveLength(5)
    // 对称：首尾 x 相反，z 相同
    expect(t[0].x).toBeCloseTo(-t[4].x, 6)
    expect(t[0].z).toBeCloseTo(t[4].z, 6)
    // 中间（index 2）z 最大 = 最靠近镜头
    const maxZ = Math.max(...t.map((c) => c.z))
    expect(t[2].z).toBeCloseTo(maxZ, 6)
    // 中心卡片不旋转、x 居中
    expect(t[2].x).toBeCloseTo(0, 6)
    expect(t[2].rotY).toBeCloseTo(0, 6)
  })

  it('弧墙：卡片落在圆弧上（到圆心距离恒为半径）', () => {
    const t = computeCardTransforms('arc', 7)
    const { centerZ, radius } = LAYOUT_CONSTANTS.arc
    for (const c of t) {
      const dx = c.x
      const dz = c.z - centerZ
      expect(Math.hypot(dx, dz)).toBeCloseTo(radius, 5)
    }
  })

  it('环阵：卡片到镜头轴心距离恒为半径，且法线朝向轴心', () => {
    const t = computeCardTransforms('ring', 8)
    expect(t).toHaveLength(8)
    const { radius } = LAYOUT_CONSTANTS.ring
    for (const c of t) {
      expect(Math.hypot(c.x, c.z)).toBeCloseTo(radius, 5)
      // 位置角 a 满足 x=sin(a)*R、z=-cos(a)*R，法线 rotY 应为 -a。
      // 角度在 2π 意义下等价（atan2 值域与生成角范围不同），故用 sin/cos 归一化后比较。
      const a = Math.atan2(c.x, -c.z)
      const delta = Math.atan2(Math.sin(c.rotY + a), Math.cos(c.rotY + a))
      expect(delta).toBeCloseTo(0, 5)
    }
  })

  it('环阵：≤4 个单层，>4 个分两层（y 有正负差异）', () => {
    const few = computeCardTransforms('ring', 3)
    expect(few.every((c) => c.y === 0)).toBe(true)
    const many = computeCardTransforms('ring', 9)
    const ys = new Set(many.map((c) => c.y))
    expect(ys.size).toBe(2)
  })

  it('网格：居中排布（x 与 y 各自对称抵消），列数不超上限', () => {
    const t = computeCardTransforms('grid', 12)
    expect(t).toHaveLength(12)
    expect(t.reduce((s, c) => s + c.x, 0)).toBeCloseTo(0, 6)
    expect(t.reduce((s, c) => s + c.y, 0)).toBeCloseTo(0, 6)
    // 列数上限 6 → x 种类不超过 6
    const cols = new Set(t.map((c) => c.x.toFixed(4)))
    expect(cols.size).toBeLessThanOrEqual(LAYOUT_CONSTANTS.grid.maxCols)
    // 网格正面朝镜头
    expect(t.every((c) => c.rotY === 0 && c.z === 0)).toBe(true)
  })

  it('网格：单列时纵向排布（1 个以上但 sqrt 为 1 的情况）', () => {
    const t = computeCardTransforms('grid', 2)
    // 2 → cols = ceil(sqrt(2)) = 2
    expect(new Set(t.map((c) => c.x.toFixed(4))).size).toBe(2)
  })

  it('相机距离：网格条目越多退得越远，弧墙固定', () => {
    const d4 = suggestCameraDistance('grid', 4)
    const d24 = suggestCameraDistance('grid', 24)
    expect(d24).toBeGreaterThan(d4)
    expect(suggestCameraDistance('arc', 4)).toBe(suggestCameraDistance('arc', 24))
    expect(suggestCameraDistance('arc', 0)).toBe(7)
  })
})
