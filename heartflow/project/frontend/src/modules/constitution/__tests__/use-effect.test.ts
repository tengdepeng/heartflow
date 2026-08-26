// ============================================================
// useEffect 宪法效果消费原语 · 测试（A2.2）
// 验证：结构完整、挂载后读取真实宪法状态、规则变化时响应式刷新。
// 复用 engine/__tests__/constitution-soft-effects.test.ts 的 Pinia + localStorage mock 装置。
// ============================================================

import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { storage } from '../../../engine/storage'
import {
  initConstitutionEffect,
  refreshConstitutionEffect,
} from '../../../engine/constitution-effect'
import { useConstitutionStore } from '../../../stores/constitution'
import { DEFAULT_EFFECT_MAP } from '../../../engine/constitution-effects'
import { useEffect, type UseEffectResult } from '../use-effect'

/** 把 useEffect 结果挂到 vm 上便于断言的探针组件工厂 */
function makeProbe(target: Parameters<typeof useEffect>[0]) {
  return defineComponent({
    setup() {
      const eff = useEffect(target)
      return { eff }
    },
    render() {
      return h('div')
    },
  })
}

let stopEffect: (() => void) | null = null

beforeEach(() => {
  const memoryStorage = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (k: string) => memoryStorage.get(k) ?? null,
      setItem: (k: string, v: string) => { memoryStorage.set(k, v) },
      removeItem: (k: string) => { memoryStorage.delete(k) },
    },
    configurable: true,
  })
  setActivePinia(createPinia())
  storage.clear()
})

afterEach(() => {
  stopEffect?.()
  stopEffect = null
})

describe('useEffect 原语结构', () => {
  it('返回完整订阅结构（target/active/multiplier/value/state/refresh）', () => {
    const wrapper = mount(makeProbe('ui:particle-density'))
    const eff = (wrapper.vm as unknown as { eff: UseEffectResult }).eff
    expect(eff.target).toBe('ui:particle-density')
    expect(typeof eff.active.value).toBe('boolean')
    expect(typeof eff.multiplier.value).toBe('number')
    expect(eff.value.value === null || typeof eff.value.value === 'number').toBe(true)
    expect(Array.isArray(eff.state.value.sources)).toBe(true)
    expect(typeof eff.refresh).toBe('function')
    wrapper.unmount()
  })
})

describe('useEffect 读取真实宪法状态（默认宪法）', () => {
  it('ui:particle-density 默认活跃、倍率/数值 0.4、来源非空', () => {
    stopEffect = initConstitutionEffect()
    refreshConstitutionEffect()

    const wrapper = mount(makeProbe('ui:particle-density'))
    const eff = (wrapper.vm as unknown as { eff: UseEffectResult }).eff

    expect(eff.active.value).toBe(true)
    expect(eff.multiplier.value).toBeCloseTo(0.4, 5)
    expect(eff.value.value).toBeCloseTo(0.4, 5)
    expect(eff.state.value.active).toBe(true)
    expect(eff.state.value.sources.length).toBeGreaterThan(0)
    wrapper.unmount()
  })

  it('enable 类型目标（ui:silence）活跃但数值为 null', () => {
    stopEffect = initConstitutionEffect()
    refreshConstitutionEffect()

    const wrapper = mount(makeProbe('ui:silence'))
    const eff = (wrapper.vm as unknown as { eff: UseEffectResult }).eff
    expect(eff.active.value).toBe(true)
    expect(eff.value.value).toBeNull()
    wrapper.unmount()
  })
})

describe('useEffect 响应式刷新（A2.2 核心契约）', () => {
  it('关闭 ui:particle-density 全部来源规则 → onEffectEvent 驱动 active 转 false、倍率回退 1', async () => {
    stopEffect = initConstitutionEffect()
    refreshConstitutionEffect()

    const wrapper = mount(makeProbe('ui:particle-density'))
    const eff = (wrapper.vm as unknown as { eff: UseEffectResult }).eff
    expect(eff.active.value).toBe(true)

    // 以 DEFAULT_EFFECT_MAP 为事实源，禁用该目标的所有来源规则（不硬编码具体规则 ID）
    const target = 'ui:particle-density'
    const sourceRuleIds = [
      ...new Set(DEFAULT_EFFECT_MAP.filter(e => e.target === target).map(e => e.ruleId)),
    ]
    const constitutionStore = useConstitutionStore()
    for (const id of sourceRuleIds) {
      const rule = constitutionStore.mutableRules.find(r => r.id === id)
      if (rule) rule.enabled = false
    }

    // 引擎 watch → notify → onEffectEvent → refresh；双 tick 确保异步刷新落定
    await nextTick()
    await nextTick()

    expect(eff.active.value).toBe(false)
    expect(eff.multiplier.value).toBe(1)
    expect(eff.value.value).toBeNull()
    wrapper.unmount()
  })
})
