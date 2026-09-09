// ============================================================
// effect-consumer-map 宪法效果消费账本 · 测试（A2.1）
// 验证：45 个目标全覆盖、与 CONSUMED_TARGETS 真实消费语义一致、关键修正项正确。
// 本表为「宪法之实」的单一事实源，任何接线/误标都必须在此暴露。
// ============================================================

import { describe, expect, it } from 'vitest'
import {
  EFFECT_CONSUMER_MAP,
  CONSUMED_TARGET_SET,
  getEffectConsumer,
  getPendingTargets,
} from '../effect-consumer-map'
import { CONSUMED_TARGETS, DEFAULT_EFFECT_MAP } from '../../../engine/constitution-effects'

describe('消费账本完整性', () => {
  it('枚举全部 45 个 EffectTarget 且无重复', () => {
    expect(EFFECT_CONSUMER_MAP.length).toBe(45)
    const uniq = new Set(EFFECT_CONSUMER_MAP.map(c => c.target))
    expect(uniq.size).toBe(45)
  })

  it('每条记录 label 由引擎 getTargetLabel 提供（非空、非 target 本身）', () => {
    for (const c of EFFECT_CONSUMER_MAP) {
      expect(c.label).toBeTruthy()
      expect(c.label).not.toBe(c.target)
    }
  })
})

describe('与 CONSUMED_TARGETS 的真实消费语义一致', () => {
  it('账本 consumed 集合与 CONSUMED_TARGETS 完全相等', () => {
    expect(CONSUMED_TARGET_SET.size).toBe(CONSUMED_TARGETS.size)
    for (const t of CONSUMED_TARGETS) {
      expect(CONSUMED_TARGET_SET.has(t)).toBe(true)
    }
    for (const t of CONSUMED_TARGET_SET) {
      expect(CONSUMED_TARGETS.has(t)).toBe(true)
    }
  })

  it('已解析 45 个、待接线 0 个（32 运行时真实消费 + 13 诚实声明式 declared）', () => {
    const resolved = EFFECT_CONSUMER_MAP.filter(c => c.consumed)
    expect(resolved.length).toBe(45)
    expect(getPendingTargets().length).toBe(0)
    const declared = EFFECT_CONSUMER_MAP.filter(c => c.mechanism === 'declared')
    expect(declared.length).toBe(13)
    const runtime = EFFECT_CONSUMER_MAP.filter(c => c.consumed && c.mechanism !== 'declared')
    expect(runtime.length).toBe(32)
  })

  it('已消费条目 mechanism 不得为 pending', () => {
    for (const c of EFFECT_CONSUMER_MAP) {
      if (c.consumed) expect(c.mechanism).not.toBe('pending')
    }
  })
})

describe('关键修正项（A2.4 诚实度）', () => {
  it('ui:notification 已补录为已消费（治理门控 + 推送通道）', () => {
    const c = getEffectConsumer('ui:notification')
    expect(c).toBeDefined()
    expect(c!.consumed).toBe(true)
    expect(c!.consumer).toContain('push-channel')
  })

  it('sanctuary:enable 诚实声明式封口（声明式，不影响运行时，不在引擎 CONSUMED_TARGETS）', () => {
    const c = getEffectConsumer('sanctuary:enable')
    expect(c).toBeDefined()
    expect(c!.consumed).toBe(true)
    expect(c!.mechanism).toBe('declared')
    // 仍保持与引擎真实运行时消费语义一致：安全岛走规则级门控，非 isTargetActive 运行时消费
    expect(CONSUMED_TARGETS.has('sanctuary:enable')).toBe(false)
  })

  it('已解析目标查得到记录、未知目标返回 undefined', () => {
    expect(getEffectConsumer('ui:particle-density')?.consumed).toBe(true)
    expect(getEffectConsumer('sanctuary:auto-exit')?.consumed).toBe(true)
    expect(getEffectConsumer('sanctuary:auto-exit')?.mechanism).toBe('declared')
    expect(getEffectConsumer('not-a-target' as never)).toBeUndefined()
  })

  it('behavior:reminder 已接线为 module-gate（A2 批②）', () => {
    const c = getEffectConsumer('behavior:reminder')
    expect(c).toBeDefined()
    expect(c!.consumed).toBe(true)
    expect(c!.mechanism).toBe('module-gate')
    expect(c!.consumer).toContain('celebration')
  })

  it('data:cleanup 已接线为 module-gate（任务② B 类样板）', () => {
    const c = getEffectConsumer('data:cleanup')
    expect(c).toBeDefined()
    expect(c!.consumed).toBe(true)
    expect(c!.mechanism).toBe('module-gate')
    expect(c!.consumer).toContain('manual-cleanup')
    // 与引擎真实运行时消费语义一致：门控后由 isCleanupEnabled 驱动入口
    expect(CONSUMED_TARGETS.has('data:cleanup')).toBe(true)
  })
})

// A2-EXT P1b · 反漂移 CI：账本与引擎定义同源
// 账本是 EffectTarget 类型（45）的完整审计镜像；DEFAULT_EFFECT_MAP 是其中"有默认
// effect 的规则映射"（去重 35，为类型的子集）。本组断言守「引擎定义的 effect 不漏审计」：
// 任何在 DEFAULT_EFFECT_MAP 新增/改写的 target，若账本未登记，此处必红。
// （账本不捏造非法 target 由 vue-tsc 编译期保证，无需运行时重复。）
describe('反漂移：引擎定义不漏审计（A2-EXT P1b）', () => {
  it('DEFAULT_EFFECT_MAP 的每个 target 都被账本审计（防漏审计漂移）', () => {
    const bookSet = new Set(EFFECT_CONSUMER_MAP.map(c => c.target))
    const definedTargets = new Set(DEFAULT_EFFECT_MAP.map(e => e.target))
    for (const t of definedTargets) {
      expect(bookSet.has(t), `引擎定义 target 未入账本: ${t}`).toBe(true)
    }
  })
})
