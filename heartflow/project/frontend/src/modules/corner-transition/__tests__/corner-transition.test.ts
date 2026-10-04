// ============================================================
// corner-transition · 角落缩放展开转场引擎测试
// 覆盖：几何原点（象限/像素/CSS 值）/ 固定角落 / 夹取 / 持久化偏好
// ============================================================
import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockStore: Record<string, any> = {}
vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: (k: string, def: any) => (k in mockStore ? mockStore[k] : def),
    setKV: (k: string, v: any) => {
      mockStore[k] = v
    },
  },
}))

import {
  useCornerTransition,
  reloadCornerTransition,
  cornerOrigin,
  originCorner,
  originPoint,
  originStyle,
  clampDuration,
  clampScale,
  DEFAULT_CORNER_TRANSITION,
  MIN_DURATION,
  MAX_DURATION,
  MIN_SCALE,
  MAX_SCALE,
} from '../corner-transition'

const KEY = 'hf:corner_transition'

// 容器 200×200，位于视口 (0,0)
const container = { left: 0, top: 0, width: 200, height: 200 }

describe('corner-transition · 角落缩放展开', () => {
  beforeEach(() => {
    Object.keys(mockStore).forEach((k) => delete mockStore[k])
    reloadCornerTransition()
  })

  it('originCorner：按触发元素中心落在容器的象限判定生长角落', () => {
    expect(originCorner({ left: 10, top: 10, width: 20, height: 20 }, container)).toBe('top-left')
    expect(originCorner({ left: 170, top: 10, width: 20, height: 20 }, container)).toBe('top-right')
    expect(originCorner({ left: 10, top: 170, width: 20, height: 20 }, container)).toBe('bottom-left')
    expect(originCorner({ left: 170, top: 170, width: 20, height: 20 }, container)).toBe('bottom-right')
  })

  it('originPoint：触发元素中心在容器内的像素坐标（夹取到容器范围）', () => {
    expect(originPoint({ left: 10, top: 20, width: 20, height: 20 }, container)).toEqual({ x: 20, y: 30 })
    // 越界夹取
    expect(originPoint({ left: -50, top: -50, width: 20, height: 20 }, container)).toEqual({ x: 0, y: 0 })
    expect(originPoint({ left: 500, top: 500, width: 20, height: 20 }, container)).toEqual({ x: 200, y: 200 })
  })

  it('originStyle：拼成 transform-origin CSS 值', () => {
    expect(originStyle({ left: 10, top: 20, width: 20, height: 20 }, container)).toBe('20px 30px')
  })

  it('cornerOrigin：固定角落返回百分比值', () => {
    expect(cornerOrigin('top-left')).toBe('0% 0%')
    expect(cornerOrigin('top-right')).toBe('100% 0%')
    expect(cornerOrigin('bottom-left')).toBe('0% 100%')
    expect(cornerOrigin('bottom-right')).toBe('100% 100%')
  })

  it('clampDuration / clampScale 夹取范围与非法值回落', () => {
    expect(clampDuration(10)).toBe(MIN_DURATION)
    expect(clampDuration(9999)).toBe(MAX_DURATION)
    expect(clampDuration(Number.NaN, 300)).toBe(300)
    expect(clampScale(0)).toBe(MIN_SCALE)
    expect(clampScale(5)).toBe(MAX_SCALE)
    expect(clampScale(0.345)).toBe(0.35)
  })

  it('useCornerTransition：设置并持久化偏好', () => {
    const c = useCornerTransition()
    c.setDuration(400)
    c.setScaleFrom(0.2)
    c.setMode('bottom-right')
    expect(c.durationMs.value).toBe(400)
    expect(c.scaleFrom.value).toBe(0.2)
    expect(c.mode.value).toBe('bottom-right')
    expect(mockStore[KEY].durationMs).toBe(400)
    expect(mockStore[KEY].mode).toBe('bottom-right')
  })

  it('非法 mode 回落，reload 后保留已存偏好', () => {
    const c = useCornerTransition()
    c.setMode('nonsense' as never)
    expect(c.mode.value).toBe(DEFAULT_CORNER_TRANSITION.mode)
    mockStore[KEY] = { durationMs: 500, scaleFrom: 0.3, mode: 'top-left' }
    reloadCornerTransition()
    expect(c.durationMs.value).toBe(500)
    expect(c.scaleFrom.value).toBe(0.3)
    expect(c.mode.value).toBe('top-left')
  })

  it('reset 恢复默认并落盘', () => {
    const c = useCornerTransition()
    c.setDuration(500)
    c.reset()
    expect(c.durationMs.value).toBe(DEFAULT_CORNER_TRANSITION.durationMs)
    expect(mockStore[KEY].durationMs).toBe(DEFAULT_CORNER_TRANSITION.durationMs)
  })
})
