import { describe, it, expect } from 'vitest'
import { PerfGovernor, type PerfTierSpec } from '../perf-governor'

// 测试用档位：评估窗口压小，便于在少量帧内触发降级/回升
const TEST_SPEC: PerfTierSpec = {
  dpr: [1, 0.75, 0.5],
  shadow: [2048, 1024],
  lowFps: 45,
  highFps: 57,
  evalWindowMs: 100,
}

/** 用固定帧间隔驱动 governor：low=true 时每帧 100ms（≈10fps），否则 8ms（≈125fps） */
function drive(g: PerfGovernor, frames: number, low: boolean, startTs = 1000) {
  let ts = startTs
  let lastSnap = g.sample(ts)
  for (let i = 1; i < frames; i++) {
    ts += low ? 100 : 8
    const s = g.sample(ts)
    if (s) lastSnap = s
  }
  return lastSnap
}

describe('PerfGovernor 自适应画质调控器', () => {
  it('健康帧率：恒不降级（强机零变化）', () => {
    const g = new PerfGovernor(2, TEST_SPEC)
    const snap = drive(g, 200, false) // 大量高帧
    expect(g.dprTierLevel).toBe(0)
    expect(g.shadowTierLevel).toBe(0)
    // 健康帧率下全程不产生任何画质快照（首帧 sample 返回 null 且永不降级/回升）
    expect(snap).toBeNull()
  })

  it('持续低帧：逐级降 DPR → 触底后降阴影精度', () => {
    const g = new PerfGovernor(2, TEST_SPEC)
    // 200 帧 × 100ms：evalWindow 100ms → 每帧评估，lowStreak≥2 即降级。
    // DPR 三档需 2 次降级，阴影还需 1 次 → 共 3 次降级应全部到达。
    const snap = drive(g, 200, true)
    expect(g.dprTierLevel).toBe(2) // DPR 触底
    expect(g.shadowTierLevel).toBe(1) // 阴影降到 1024
    expect(snap).toBeDefined()
    expect(snap!.dpr).toBeCloseTo(2 * 0.5, 5) // baseline 2 × 0.5
    expect(snap!.shadowMapSize).toBe(1024)
  })

  it('低帧仅降 DPR 不越级：未触底前不降阴影', () => {
    const g = new PerfGovernor(2, TEST_SPEC)
    // 少量低帧：仅够降 1 档 DPR，未到 DPR 触底、也未轮到阴影降级
    const snap = drive(g, 7, true)
    expect(g.dprTierLevel).toBeGreaterThan(0)
    expect(g.dprTierLevel).toBeLessThan(2)
    expect(g.shadowTierLevel).toBe(0) // 阴影档位未动
    expect(snap!.dpr).toBeCloseTo(2 * 0.75, 5) // baseline 2 × 0.75
  })

  it('回升：低帧降满后喂高帧，带迟滞逐级回弹（回升更保守）', () => {
    const g = new PerfGovernor(2, TEST_SPEC)
    drive(g, 200, true) // 先降到 DPR 触底 + 阴影降一档
    expect(g.dprTierLevel).toBe(2)
    expect(g.shadowTierLevel).toBe(1)
    // 回升：高帧（8ms），highStreak≥4 才回弹一级，需较多帧
    drive(g, 600, false)
    expect(g.dprTierLevel).toBe(0) // DPR 回到满血
    expect(g.shadowTierLevel).toBe(0) // 阴影也回到满血
  })

  it('中间帧率带：不抖动（不降级也不回升）', () => {
    const g = new PerfGovernor(2, TEST_SPEC)
    // 50fps 落在 [lowFps45, highFps57] 中间带，应稳定无变化
    let ts = 1000
    for (let i = 0; i < 100; i++) {
      ts += 20 // 50fps
      g.sample(ts)
    }
    expect(g.dprTierLevel).toBe(0)
    expect(g.shadowTierLevel).toBe(0)
  })

  it('标签页切回的大时间间隙（dt>1000ms）被忽略，不误判降级', () => {
    const g = new PerfGovernor(2, TEST_SPEC)
    g.sample(1000)
    // 模拟切走 5 秒后回来：单帧 dt=5000ms 超出阈值，应被忽略
    const snap = g.sample(6000)
    expect(snap).toBeNull()
    expect(g.dprTierLevel).toBe(0)
  })
})
