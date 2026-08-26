// ============================================================
// useConstitutionEffect 宪法效果 composable · 测试
// 聚焦于不依赖 resonance bridges 的纯函数部分
// ============================================================

import { describe, expect, it } from 'vitest'
import { useRuleEffectPreview } from '../useConstitutionEffect'
import { getEffectsByRuleId } from '../../engine/constitution-effects'
import { getTargetLabel, getEffectTypeLabel } from '../../engine/constitution-effect'

describe('useRuleEffectPreview', () => {
  it('有效 ruleId 返回预览效果列表', () => {
    const { effects, hasEffects, effectCount } = useRuleEffectPreview('elastic-flow-first')
    const engineEffects = getEffectsByRuleId('elastic-flow-first')

    expect(effectCount).toBe(engineEffects.length)
    expect(hasEffects).toBe(true)
    expect(effects.value.length).toBe(engineEffects.length)

    for (const preview of effects.value) {
      expect(preview.target).toBeTruthy()
      expect(preview.targetLabel).toBeTruthy()
      expect(preview.targetLabel).not.toBe(preview.target) // 应该是中文标签
      expect(preview.typeLabel).toBeTruthy()
      expect(preview.description).toBeTruthy()
      expect(preview.scope).toBeTruthy()
    }
  })

  it('无效 ruleId 返回空列表', () => {
    const { effects, hasEffects, effectCount } = useRuleEffectPreview('non-existent-rule')
    expect(effectCount).toBe(0)
    expect(hasEffects).toBe(false)
    expect(effects.value).toEqual([])
  })

  it('每个效果的 targetLabel 匹配 getTargetLabel', () => {
    const { effects } = useRuleEffectPreview('elastic-flow-first')
    for (const preview of effects.value) {
      expect(preview.targetLabel).toBe(getTargetLabel(preview.target))
    }
  })

  it('每个效果的 typeLabel 匹配 getEffectTypeLabel', () => {
    const engineEffects = getEffectsByRuleId('elastic-data-driven')
    const { effects } = useRuleEffectPreview('elastic-data-driven')
    for (let i = 0; i < effects.value.length; i++) {
      const e = engineEffects[i]
      expect(effects.value[i].typeLabel).toBe(getEffectTypeLabel(e.type, e.value))
    }
  })
})