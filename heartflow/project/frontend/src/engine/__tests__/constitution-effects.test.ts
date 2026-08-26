// ============================================================
// 宪法效果定义 · 测试
// ============================================================

import { describe, expect, it } from 'vitest'
import type { MutableRule } from '../../types'
import {
  DEFAULT_EFFECT_MAP,
  type ConstitutionEffect,
  getEffectsByRuleId,
  getEffectsByTarget,
  getActiveEffects,
  getInactiveEffects,
  groupEffectsByTarget,
  ruleHasRuntimeEffect,
} from '../constitution-effects'

function makeRule(overrides: Partial<MutableRule> = {}): MutableRule {
  return {
    id: 'test-rule',
    title: '测试规则',
    description: '',
    type: 'value',
    order: 0,
    enabled: true,
    ...overrides,
  }
}

describe('DEFAULT_EFFECT_MAP', () => {
  it('包含至少 30 条效果定义', () => {
    expect(DEFAULT_EFFECT_MAP.length).toBeGreaterThanOrEqual(30)
  })

  it('每条效果都有必需的字段', () => {
    for (const effect of DEFAULT_EFFECT_MAP) {
      expect(effect.ruleId).toBeTruthy()
      expect(effect.target).toBeTruthy()
      expect(effect.type).toBeTruthy()
      expect(effect.description).toBeTruthy()
      expect(effect.scope).toBeTruthy()
    }
  })

  it('所有 ruleId 以 elastic- 开头', () => {
    for (const effect of DEFAULT_EFFECT_MAP) {
      expect(effect.ruleId).toMatch(/^elastic-/)
    }
  })

  it('所有 target 格式为 category:name', () => {
    for (const effect of DEFAULT_EFFECT_MAP) {
      expect(effect.target).toMatch(/^[a-z-]+:[a-z-]+$/)
    }
  })

  it('所有 type 为有效值', () => {
    const validTypes = ['enable', 'disable', 'reduce', 'increase', 'set']
    for (const effect of DEFAULT_EFFECT_MAP) {
      expect(validTypes).toContain(effect.type)
    }
  })
})

describe('getEffectsByRuleId', () => {
  it('返回指定规则的所有效果', () => {
    const effects = getEffectsByRuleId('elastic-flow-first')
    expect(effects.length).toBeGreaterThanOrEqual(2)
    expect(effects.every(e => e.ruleId === 'elastic-flow-first')).toBe(true)
  })

  it('返回 target 为 advisor:enabled 和 ui:notification 的效果', () => {
    const effects = getEffectsByRuleId('elastic-flow-first')
    const targets = effects.map(e => e.target)
    expect(targets).toContain('advisor:enabled')
    expect(targets).toContain('ui:notification')
  })

  it('不存在的 ruleId 返回空数组', () => {
    expect(getEffectsByRuleId('non-existent')).toEqual([])
  })
})

describe('getEffectsByTarget', () => {
  it('返回指定目标的所有效果', () => {
    const effects = getEffectsByTarget('data:auto-archive')
    expect(effects.length).toBeGreaterThanOrEqual(3)
    expect(effects.every(e => e.target === 'data:auto-archive')).toBe(true)
  })

  it('返回的 effects 类型均为 disable', () => {
    const effects = getEffectsByTarget('data:auto-archive')
    expect(effects.every(e => e.type === 'disable')).toBe(true)
  })

  it('不存在的 target 返回空数组', () => {
    expect(getEffectsByTarget('nonexistent:target' as any)).toEqual([])
  })
})

describe('getActiveEffects', () => {
  it('返回已启用规则对应的效果', () => {
    const rules: MutableRule[] = [
      makeRule({ id: 'elastic-flow-first', enabled: true }),
      makeRule({ id: 'elastic-data-driven', enabled: true }),
      makeRule({ id: 'elastic-exploration', enabled: false }),
    ]
    const effects = getActiveEffects(rules)
    // 所有效果应来自已启用的规则
    const enabledIds = new Set(rules.filter(r => r.enabled).map(r => r.id))
    expect(effects.every(e => enabledIds.has(e.ruleId))).toBe(true)
  })

  it('没有规则启用时返回空数组', () => {
    const rules: MutableRule[] = [
      makeRule({ id: 'elastic-flow-first', enabled: false }),
      makeRule({ id: 'elastic-data-driven', enabled: false }),
    ]
    expect(getActiveEffects(rules)).toEqual([])
  })

  it('所有规则启用时返回所有效果', () => {
    // 收集所有唯一 ruleId
    const allIds = [...new Set(DEFAULT_EFFECT_MAP.map(e => e.ruleId))]
    const rules: MutableRule[] = allIds.map(id => makeRule({ id, enabled: true }))
    const effects = getActiveEffects(rules)
    expect(effects.length).toBe(DEFAULT_EFFECT_MAP.length)
  })
})

describe('getInactiveEffects', () => {
  it('返回禁用规则对应的效果', () => {
    const rules: MutableRule[] = [
      makeRule({ id: 'elastic-flow-first', enabled: true }),
      makeRule({ id: 'elastic-exploration', enabled: false }),
    ]
    const effects = getInactiveEffects(rules)
    expect(effects.every(e => e.ruleId === 'elastic-exploration')).toBe(true)
  })

  it('没有规则禁用时返回空数组', () => {
    const rules: MutableRule[] = [
      makeRule({ id: 'elastic-flow-first', enabled: true }),
    ]
    expect(getInactiveEffects(rules)).toEqual([])
  })
})

describe('groupEffectsByTarget', () => {
  it('按 target 分组效果', () => {
    const effects: ConstitutionEffect[] = DEFAULT_EFFECT_MAP.filter(
      e => e.ruleId === 'elastic-flow-first'
    )
    const grouped = groupEffectsByTarget(effects)
    expect(grouped.size).toBeGreaterThanOrEqual(2)
    for (const [target, list] of grouped) {
      expect(list.every(e => e.target === target)).toBe(true)
    }
  })

  it('空数组返回空 Map', () => {
    const grouped = groupEffectsByTarget([])
    expect(grouped.size).toBe(0)
  })
})

describe('宪法效果覆盖完整性（无零条目死开关）', () => {
  // 蓝图定义 2 强制 + 50 弹性 = 52 条；弹性规则 id 均以 elastic- 开头，
  // 且 DEFAULT_EFFECT_MAP 全部为 elastic-*（见上文测试）。故覆盖全部 50 条弹性规则
  // 等价于「没有规则在 DEFAULT_EFFECT_MAP 中零条目」。
  const EXPECTED_ELASTIC_COUNT = 50

  it('DEFAULT_EFFECT_MAP 覆盖全部 50 条弹性规则', () => {
    const ids = [...new Set(DEFAULT_EFFECT_MAP.map(e => e.ruleId))]
    expect(ids.length).toBe(EXPECTED_ELASTIC_COUNT)
  })

  it('此前零条目的 9 条弹性规则现已各有 ≥1 效果', () => {
    const orphanIds = [
      'elastic-share-local',
      'elastic-no-disturb',
      'elastic-no-comparison',
      'elastic-seed-inherit',
      'elastic-seed-scope',
      'elastic-seed-revoke',
      'elastic-night-dim',
      'elastic-digital-sabbath',
      'elastic-long-dormancy',
    ]
    for (const id of orphanIds) {
      const effects = getEffectsByRuleId(id)
      expect(effects.length, `规则 ${id} 应至少有 1 条效果`).toBeGreaterThanOrEqual(1)
    }
  })

  it('第43-51条红线规则映射到的 target 类型合法', () => {
    const ids = [
      'elastic-share-local',
      'elastic-no-disturb',
      'elastic-no-comparison',
      'elastic-seed-inherit',
      'elastic-seed-scope',
      'elastic-seed-revoke',
      'elastic-night-dim',
      'elastic-digital-sabbath',
      'elastic-long-dormancy',
    ]
    for (const id of ids) {
      const effects = getEffectsByRuleId(id)
      for (const e of effects) {
        expect(e.target).toMatch(/^[a-z-]+:[a-z-]+$/)
        expect(['enable', 'disable', 'reduce', 'increase', 'set']).toContain(e.type)
      }
    }
  })
})

describe('ruleHasRuntimeEffect 诚实度契约（编辑器徽章依据）', () => {
  it('效果目标已被消费的规则判定为「生效中」', () => {
    // advisor:enabled / ui:notification 均在 CONSUMED_TARGETS 中
    expect(ruleHasRuntimeEffect('elastic-flow-first')).toBe(true)
    expect(ruleHasRuntimeEffect('elastic-no-disturb')).toBe(true) // ui:notification disable
    expect(ruleHasRuntimeEffect('elastic-night-dim')).toBe(true)        // scene:night-dim 已被 useNightDim 消费（overlay 真实生效）
    expect(ruleHasRuntimeEffect('elastic-digital-sabbath')).toBe(true)  // scene:sabbath 已被 useDigitalSabbath 消费
    expect(ruleHasRuntimeEffect('elastic-long-dormancy')).toBe(true)    // advisor:long-dormancy 已被 useLongDormancy 消费
    expect(ruleHasRuntimeEffect('elastic-seed-inherit')).toBe(true)     // seed:inherit 已被 seed-transfer.recordTransfer 门控拦截
    expect(ruleHasRuntimeEffect('elastic-seed-scope')).toBe(true)       // seed:scope 已被 seed-transfer 强制默认授权
    expect(ruleHasRuntimeEffect('elastic-seed-revoke')).toBe(true)      // seed:revoke 已被 seed-transfer.revokeTransfer 门控拦截
    expect(ruleHasRuntimeEffect('elastic-share-local')).toBe(true)      // share:local-only 已被 carrier-io/template/seed-share 门控拦截
  })

  it('效果目标未消费（声明式）的规则判定为「不影响运行时」', () => {
    // stats:comparison 等尚无对应运行时 UI（功能未建设），仍属声明式
    expect(ruleHasRuntimeEffect('elastic-no-comparison')).toBe(false)
  })

  it('不存在的规则返回 false', () => {
    expect(ruleHasRuntimeEffect('non-existent-rule')).toBe(false)
  })
})