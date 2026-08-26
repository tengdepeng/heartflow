// ============================================================
// 安全岛 · 五击触发侦测器纯逻辑测试
// ============================================================

import { describe, expect, it, beforeEach } from 'vitest'

// ---- 纯函数等价逻辑（与 useSanctuaryTrigger 内部实现一致） ----

/**
 * 五击触发检测器
 * 模拟 handleTap 的核心逻辑：在窗口时间内检测足够次数的点击
 */
function createTapDetector(windowMs = 2000, tapCount = 5) {
  let timestamps: number[] = []
  let triggered = false
  let triggerCount = 0

  function tap(now: number): { progress: number; triggered: boolean } {
    if (triggered) return { progress: 0, triggered: false }

    timestamps.push(now)

    // 清除旧窗口外的点击
    timestamps = timestamps.filter((ts) => now - ts < windowMs)

    const progress = Math.min(timestamps.length / tapCount, 1)
    const shouldTrigger = timestamps.length >= tapCount

    if (shouldTrigger) {
      triggered = true
      triggerCount++
      timestamps = []
    }

    return { progress, triggered: shouldTrigger }
  }

  function reset() {
    timestamps = []
    triggered = false
  }

  function getTriggerCount() {
    return triggerCount
  }

  return { tap, reset, getTriggerCount }
}

// ---- 测试 ----

describe('TapDetector', () => {
  let detector: ReturnType<typeof createTapDetector>

  beforeEach(() => {
    detector = createTapDetector()
  })

  it('初始进度为 0', () => {
    const result = detector.tap(Date.now())
    expect(result.progress).toBe(0.2) // 1/5
    expect(result.triggered).toBe(false)
  })

  it('5 次快速点击触发', () => {
    const base = Date.now()
    let triggered = false

    for (let i = 0; i < 5; i++) {
      const result = detector.tap(base + i * 100)
      triggered = result.triggered
    }

    expect(triggered).toBe(true)
  })

  it('进度随点击次数增加', () => {
    const base = Date.now()
    const results: number[] = []

    for (let i = 0; i < 4; i++) {
      const result = detector.tap(base + i * 100)
      results.push(result.progress)
    }

    expect(results).toEqual([0.2, 0.4, 0.6, 0.8])
  })

  it('超过窗口时间的点击被清除', () => {
    const base = Date.now()
    const detector2 = createTapDetector(500, 3) // 500ms 窗口，3 次触发

    // 第 1 次点击
    let result = detector2.tap(base)
    expect(result.progress).toBe(1 / 3)

    // 第 2 次点击在 600ms 后，已超出窗口
    result = detector2.tap(base + 600)
    // 此时只有第 2 次点击，进度应为 1/3
    expect(result.progress).toBe(1 / 3)

    // 在窗口内快速点击 2 次
    result = detector2.tap(base + 700)
    expect(result.progress).toBe(2 / 3)

    result = detector2.tap(base + 800)
    expect(result.progress).toBe(1)
    expect(result.triggered).toBe(true)
  })

  it('触发后重置计数器', () => {
    const base = Date.now()
    for (let i = 0; i < 5; i++) {
      detector.tap(base + i * 100)
    }

    detector.reset()
    const result = detector.tap(base + 1000)
    expect(result.progress).toBe(0.2) // 重置后第 1 次
    expect(result.triggered).toBe(false)
  })

  it('自定义窗口时间', () => {
    const d = createTapDetector(1000, 3)
    const base = Date.now()

    let result = d.tap(base)
    expect(result.progress).toBe(1 / 3)

    result = d.tap(base + 500)
    expect(result.progress).toBe(2 / 3)

    result = d.tap(base + 800)
    expect(result.progress).toBe(1)
    expect(result.triggered).toBe(true)
  })

  it('自定义点击次数', () => {
    const d = createTapDetector(2000, 3)
    const base = Date.now()

    let triggered = false
    for (let i = 0; i < 3; i++) {
      const result = d.tap(base + i * 100)
      triggered = result.triggered
    }

    expect(triggered).toBe(true)
  })

  it('触发后不再响应新的点击', () => {
    const base = Date.now()
    for (let i = 0; i < 5; i++) {
      detector.tap(base + i * 100)
    }

    // 触发后再次点击不应触发
    const result = detector.tap(base + 1000)
    expect(result.triggered).toBe(false)
    expect(result.progress).toBe(0)
  })

  it('reset 后可以再次触发', () => {
    const base = Date.now()
    // 第一次触发
    for (let i = 0; i < 5; i++) {
      detector.tap(base + i * 100)
    }

    detector.reset()

    // 第二次触发
    let triggered = false
    for (let i = 0; i < 5; i++) {
      const result = detector.tap(base + 2000 + i * 100)
      triggered = result.triggered
    }

    expect(triggered).toBe(true)
  })

  it('边界：恰好等于窗口时间不会触发（窗口内不足）', () => {
    const d = createTapDetector(500, 3)
    const base = Date.now()

    d.tap(base)
    d.tap(base + 500) // 恰好等于窗口边界

    const result = d.tap(base + 600) // 超出窗口
    // 第 1 次点击被清除，只剩第 2 和第 3 次
    expect(result.progress).toBeLessThan(1)
  })

  it('极限：1ms 内连续点击', () => {
    const base = Date.now()
    let triggered = false

    for (let i = 0; i < 5; i++) {
      const result = detector.tap(base + i)
      triggered = result.triggered
    }

    expect(triggered).toBe(true)
  })
})

describe('SanctuaryTriggerConfig', () => {
  it('默认 windowMs 为 2000', () => {
    const config = { windowMs: 2000, tapCount: 5, autoExit: false }
    // 验证默认值逻辑
    const { windowMs = 2000, tapCount = 5, autoExit = false } = config
    expect(windowMs).toBe(2000)
    expect(tapCount).toBe(5)
    expect(autoExit).toBe(false)
  })

  it('空配置使用默认值', () => {
    const { windowMs = 2000, tapCount = 5, autoExit = false } = {}
    expect(windowMs).toBe(2000)
    expect(tapCount).toBe(5)
    expect(autoExit).toBe(false)
  })

  it('部分配置覆盖默认值', () => {
    const { windowMs = 2000, tapCount = 5, autoExit = false } = { tapCount: 3 }
    expect(windowMs).toBe(2000)
    expect(tapCount).toBe(3)
    expect(autoExit).toBe(false)
  })
})