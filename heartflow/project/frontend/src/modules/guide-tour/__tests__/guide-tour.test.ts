// ============================================================
// 全局 UI · 分步引导蒙层（INCR-500）测试
// 覆盖：默认完成态 / 开始-推进-回退-完成流程 / 跳过 / 重置 /
//       未知引导兜底 / 气泡几何纯函数（居中·方位·视口夹取）
// 键 hf:guide_tour，本地私有、不触云。
// ============================================================
import { describe, expect, it, beforeEach } from 'vitest'
import {
  useGuideTour,
  reloadGuideTour,
  computeTooltip,
  clampTooltip,
  GUIDE_TOURS,
  DEFAULT_GUIDE_TOUR,
} from '../guide-tour'
import { storage } from '../../../engine/storage'

const KEY = 'hf:guide_tour'
const TOUR_ID = 'touchpoints-tour'

describe('guide-tour · 分步引导蒙层', () => {
  beforeEach(() => {
    storage.setKV(KEY, '')
    reloadGuideTour()
  })

  it('默认无已完成引导，内置触角引导含 4 步', () => {
    const { completed, tours } = useGuideTour()
    expect(completed.value).toEqual([])
    expect(DEFAULT_GUIDE_TOUR.completed).toEqual([])
    const tour = GUIDE_TOURS.find((t) => t.id === TOUR_ID)
    expect(tour).toBeTruthy()
    expect(tour!.steps).toHaveLength(4)
    expect(tours.value).toHaveLength(GUIDE_TOURS.length)
  })

  it('start 激活首步，next/prev 在范围内推进回退', () => {
    const g = useGuideTour()
    expect(g.start(TOUR_ID)).toBe(true)
    expect(g.isActive.value).toBe(true)
    expect(g.index.value).toBe(0)
    expect(g.activeStep.value?.id).toBe('notify')
    expect(g.total.value).toBe(4)
    expect(g.isLast.value).toBe(false)

    g.next()
    expect(g.index.value).toBe(1)
    expect(g.activeStep.value?.id).toBe('glow')

    g.next()
    g.next()
    expect(g.index.value).toBe(3)
    expect(g.isLast.value).toBe(true)

    g.prev()
    expect(g.index.value).toBe(2)

    g.prev()
    g.prev()
    g.prev()
    expect(g.index.value).toBe(0) // 不越界
  })

  it('末步 next 触发完成：标记已读、关闭并落盘', () => {
    const g = useGuideTour()
    g.start(TOUR_ID)
    for (let i = 0; i < 3; i++) g.next() // 到末步
    expect(g.isLast.value).toBe(true)
    g.next() // 完成
    expect(g.isActive.value).toBe(false)
    expect(g.isCompleted(TOUR_ID)).toBe(true)
    expect(storage.getKV(KEY, null)).toEqual({ completed: [TOUR_ID] })

    reloadGuideTour()
    expect(useGuideTour().isCompleted(TOUR_ID)).toBe(true)
  })

  it('skip 视同完成，reset 可清除完成态', () => {
    const g = useGuideTour()
    g.start(TOUR_ID)
    g.skip()
    expect(g.isActive.value).toBe(false)
    expect(g.isCompleted(TOUR_ID)).toBe(true)

    g.reset(TOUR_ID)
    expect(g.isCompleted(TOUR_ID)).toBe(false)
    expect(storage.getKV(KEY, null)).toEqual({ completed: [] })
  })

  it('未知引导 id 无法开始', () => {
    const g = useGuideTour()
    expect(g.start('not-a-tour')).toBe(false)
    expect(g.isActive.value).toBe(false)
  })

  it('clampTooltip 将坐标夹取进视口', () => {
    expect(clampTooltip(-100, -100, { width: 200, height: 100 }, { width: 400, height: 300 }, 12)).toEqual({
      left: 12,
      top: 12,
    })
    expect(clampTooltip(9999, 9999, { width: 200, height: 100 }, { width: 400, height: 300 }, 12)).toEqual({
      left: 188,
      top: 188,
    })
  })

  it('computeTooltip：空矩形居中，bottom 方位落在目标下方', () => {
    const vp = { width: 800, height: 600 }
    expect(computeTooltip({ left: 0, top: 0, width: 0, height: 0 }, { width: 200, height: 100 }, vp, 'center')).toEqual({
      left: 300,
      top: 250,
    })
    expect(
      computeTooltip({ left: 100, top: 100, width: 100, height: 40 }, { width: 200, height: 80 }, vp, 'bottom', 14),
    ).toEqual({ left: 50, top: 154 })
  })
})
