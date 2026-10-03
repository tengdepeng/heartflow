// ============================================================
// 殿堂触角 · 标准正态分位数 normalQuantile 单元测试（INCR-465）
//
// 为什么需要这个文件：ab-test-engine.ts 的 normalQuantile 是 Acklam 有理逼近的
// 错误实现（三处结构性错误，见下），导致 estimateSampleSize 返回值偏高约 3.6 倍
// （0.2/0.05/0.05/0.8 算出 3955，正确值 1094），且该错误值已经上盘到 ABTestPanel
// 的「样本进度」行在误导用户；testSignificance 的置信区间 z 值同样走这里，CI 偏宽。
//
// 三处结构性错误（系数值本身是对的，错的是求值结构）：
//   ① 中央区 Horner 从 a[5]/b[4] 起步 —— 系数按降幂存放，必须从 a[0]/b[0] 起步；
//   ② 中央区自变量写成 0.180625 - q² —— 那是 Wichura AS241 的口径，
//      配 Acklam 的 a/b 系数会把误差从 1.15e-9 放大到 8e-4（p=0.8 处实测）；
//   ③ 尾区写成 sqrt(-ln r)，少因子 2，且符号取反条件（q<0 ? -val : val）与
//      Acklam 相反 —— 两者叠加后 z(0.975) 变成 -1.96（符号错）、z(0.95) 误差 1.2e-7。
//
// 分支覆盖是硬要求：p∈[0.02425, 0.97575] 走中央区，之外走尾区。
// 只测尾区会漏掉②③ —— 两者都在中央区。
//
// 参考值来自 Wichura AS241（与 Acklam 完全独立的另一套有理逼近，双精度下误差 ~1e-16），
// 已对教科书标准值 Φ⁻¹(0.975)=1.959963984540 等交叉校验到 1e-16。
// ============================================================

import { describe, expect, it } from 'vitest'
import { estimateSampleSize, normalQuantile } from '../ab-test-engine'

/**
 * 绝对容差取 5e-9 而不是 1e-9：Acklam 标称的 1.15e-9 是**相对**误差，
 * 在 |x|≈2.58 处换算成绝对误差就是 ~2.9e-9，绝对 1e-9 对有理逼近本身不成立
 * （要做到绝对 1e-9 得再叠一步 Halley 迭代，对样本量估算没有实际意义）。
 * 相对容差 1.5e-9 才是这个算法的真实契约，实测全域最大相对误差 1.1288e-9。
 */
const ABS_TOL = 5e-9
const REL_TOL = 1.5e-9

interface QuantileCase {
  p: number
  expected: number
  /** 该 p 落在哪条分支 —— 两个分支都必须被断言覆盖 */
  branch: 'central' | 'tail'
}

const QUANTILE_CASES: QuantileCase[] = [
  // ---- 尾区（p < 0.02425 或 p > 0.97575）----
  { p: 0.001, expected: -3.090232306168, branch: 'tail' },
  { p: 0.005, expected: -2.575829303549, branch: 'tail' },
  { p: 0.01, expected: -2.326347874041, branch: 'tail' },
  { p: 0.99, expected: 2.326347874041, branch: 'tail' },
  { p: 0.995, expected: 2.575829303549, branch: 'tail' },
  { p: 0.999, expected: 3.090232306168, branch: 'tail' },
  // ---- 中央区（0.02425 ≤ p ≤ 0.97575）----
  { p: 0.025, expected: -1.959963984540, branch: 'central' },
  { p: 0.05, expected: -1.644853626951, branch: 'central' },
  { p: 0.1, expected: -1.281551565545, branch: 'central' },
  { p: 0.2, expected: -0.841621233573, branch: 'central' },
  { p: 0.3, expected: -0.524400512708, branch: 'central' },
  { p: 0.4, expected: -0.253347103136, branch: 'central' },
  { p: 0.6, expected: 0.253347103136, branch: 'central' },
  { p: 0.7, expected: 0.524400512708, branch: 'central' },
  { p: 0.8, expected: 0.841621233573, branch: 'central' },
  { p: 0.9, expected: 1.281551565545, branch: 'central' },
  { p: 0.95, expected: 1.644853626951, branch: 'central' },
  { p: 0.975, expected: 1.959963984540, branch: 'central' },
]

describe('normalQuantile · 标准分位数', () => {
  it.each(QUANTILE_CASES)('Φ⁻¹($p) = $expected（$branch 分支）', ({ p, expected }) => {
    const actual = normalQuantile(p)
    const abs = Math.abs(actual - expected)
    const rel = expected === 0 ? abs : abs / Math.abs(expected)
    expect(abs).toBeLessThanOrEqual(ABS_TOL)
    expect(rel).toBeLessThanOrEqual(REL_TOL)
  })

  it('中央区与尾区两个分支都被覆盖到', () => {
    const branches = new Set(QUANTILE_CASES.map(c => c.branch))
    expect([...branches].sort()).toEqual(['central', 'tail'])
    // 防止有人把整张表改成单一分支后用例静默退化
    expect(QUANTILE_CASES.filter(c => c.branch === 'central').length).toBeGreaterThanOrEqual(5)
    expect(QUANTILE_CASES.filter(c => c.branch === 'tail').length).toBeGreaterThanOrEqual(5)
  })

  it('p = 0.5 应当精确落在原点', () => {
    expect(normalQuantile(0.5)).toBe(0)
  })

  it('边界：p ≤ 0 → -Infinity，p ≥ 1 → +Infinity', () => {
    expect(normalQuantile(0)).toBe(-Infinity)
    expect(normalQuantile(-0.1)).toBe(-Infinity)
    expect(normalQuantile(1)).toBe(Infinity)
    expect(normalQuantile(1.1)).toBe(Infinity)
  })

  it('奇偶对称：Φ⁻¹(p) ≈ -Φ⁻¹(1 - p)', () => {
    // 容差取 12 位（|diff| < 5e-13）而不是严格相等 / 15 位：
    // ① 0.8 与 0.2 在二进制浮点里并非严格互补（0.8-0.5 与 0.2-0.5 差 1 ULP）；
    // ② 更重要 —— 若把容差钉到 ULP 级，Horner 换成数学等价的显式多项式求和就会红，
    //    那是把测试绑死在实现细节而非数值语义。12 位足以抓住符号错/结构错。
    for (const p of [0.001, 0.005, 0.025, 0.1, 0.2, 0.3, 0.4, 0.49]) {
      expect(normalQuantile(p)).toBeCloseTo(-normalQuantile(1 - p), 12)
    }
  })

  it('全域严格单调递增（旧实现在 power 0.8 → 0.95 区间是非单调的）', () => {
    let prev = -Infinity
    let monotone = true
    for (let i = 0; i <= 2000; i++) {
      const p = 1e-6 + (i / 2000) * (1 - 2e-6)
      const v = normalQuantile(p)
      if (!(v > prev)) { monotone = false; break }
      prev = v
    }
    expect(monotone).toBe(true)
  })

  it('z 值符号：上尾为正、下尾为负（旧实现改完 Horner 后符号会整体翻转）', () => {
    expect(normalQuantile(0.975)).toBeGreaterThan(0)
    expect(normalQuantile(0.995)).toBeGreaterThan(0)
    expect(normalQuantile(0.95)).toBeGreaterThan(0)
    expect(normalQuantile(0.025)).toBeLessThan(0)
    expect(normalQuantile(0.005)).toBeLessThan(0)
  })
})

describe('estimateSampleSize · 修正后的基准值', () => {
  it('0.2 基线 / MDE 0.05 / α 0.05 / 功效 0.8 → 1094（旧实现给出 3955）', () => {
    expect(estimateSampleSize(0.2, 0.05, 0.05, 0.8)).toBe(1094)
  })

  it('统计教材口径核算：z(0.975)=1.96、z(0.8)=0.8416 手算也是 1094', () => {
    // n = (z_α·√(2·p̄·q̄) + z_β·√(p1q1 + p2q2))² / MDE²
    // p1=0.2, p2=0.25, p̄=0.225, q̄=0.775
    const zAlpha = 1.959963984540054
    const zBeta = 0.8416212335729143
    const term = zAlpha * Math.sqrt(2 * 0.225 * 0.775)
      + zBeta * Math.sqrt(0.2 * 0.8 + 0.25 * 0.75)
    expect(Math.ceil(term ** 2 / 0.0025)).toBe(1094)
  })

  it('功效越高样本越多：0.95 严格大于 0.8（旧实现此处非单调）', () => {
    expect(estimateSampleSize(0.1, 0.05, 0.05, 0.95))
      .toBeGreaterThan(estimateSampleSize(0.1, 0.05, 0.05, 0.8))
  })

  it('显著性水平越严样本越多：α=0.01 严格大于 α=0.05', () => {
    expect(estimateSampleSize(0.2, 0.05, 0.01, 0.8))
      .toBeGreaterThan(estimateSampleSize(0.2, 0.05, 0.05, 0.8))
  })
})
