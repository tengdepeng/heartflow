// ============================================================
// 回答分支导航引擎测试（INCR-478）
// 覆盖：变体构造 / 计数 / 下标钳制 / 摘要 / 不可变追加 / 不可变切换
// ============================================================
import { describe, it, expect } from 'vitest'
import {
  createVariant,
  variantList,
  variantCount,
  activeVariantIndex,
  hasMultipleVariants,
  variantSummary,
  appendVariant,
  switchVariant,
} from '../dialogue-branches'
import type { DialogueEntry, ExecutionResult } from '../types'

function result(message: string): ExecutionResult {
  return { success: true, stepsExecuted: 1, stepsTotal: 1, message, stepResults: [] }
}

function mirrorEntry(overrides: Partial<DialogueEntry> = {}): DialogueEntry {
  return {
    id: 'm1',
    role: 'mirror',
    text: '原始回答',
    timestamp: 1000,
    executionResult: result('原始回答'),
    ...overrides,
  }
}

describe('createVariant', () => {
  it('携带文本与可选执行结果/出处', () => {
    const v = createVariant('新回答', { executionResult: result('新回答') })
    expect(v.text).toBe('新回答')
    expect(v.executionResult?.message).toBe('新回答')
    expect(v.id).toMatch(/^var_/)
    expect(typeof v.createdAt).toBe('number')
  })
})

describe('计数与下标', () => {
  it('无 variants 时视为单变体', () => {
    const e = mirrorEntry()
    expect(variantCount(e)).toBe(1)
    expect(activeVariantIndex(e)).toBe(0)
    expect(hasMultipleVariants(e)).toBe(false)
    expect(variantList(e)).toHaveLength(1)
  })

  it('缺省激活下标为最后一个，越界被钳制', () => {
    const e = mirrorEntry({
      variants: [createVariant('a'), createVariant('b'), createVariant('c')],
    })
    expect(variantCount(e)).toBe(3)
    expect(activeVariantIndex(e)).toBe(2)
    expect(activeVariantIndex({ ...e, activeVariant: 99 })).toBe(2)
    expect(activeVariantIndex({ ...e, activeVariant: -5 })).toBe(0)
  })

  it('多分支时 hasMultipleVariants 为真', () => {
    const e = appendVariant(mirrorEntry(), createVariant('另一版'))
    expect(hasMultipleVariants(e)).toBe(true)
  })
})

describe('variantSummary', () => {
  it('给出 1 基下标与总数', () => {
    const e = appendVariant(mirrorEntry(), createVariant('另一版'))
    expect(variantSummary(e)).toEqual({ index: 1, total: 2, label: '第 2 / 2 个回答' })
  })
})

describe('appendVariant', () => {
  it('把原展示态纳入变体 0，新变体置末并切换，且不可变', () => {
    const original = mirrorEntry({ sources: [{ domain: 'note', id: 'n1', label: '旧出处', date: '2026-01-01', domainLabel: '笔记' }] })
    const next = appendVariant(original, createVariant('第二版', { executionResult: result('第二版') }))

    expect(next).not.toBe(original)
    expect(variantCount(next)).toBe(2)
    expect(activeVariantIndex(next)).toBe(1)
    // 展示字段同步到激活变体
    expect(next.text).toBe('第二版')
    expect(next.executionResult?.message).toBe('第二版')
    expect(next.sources).toBeUndefined()
    // 原条目未被改写
    expect(original.text).toBe('原始回答')
    expect(original.variants).toBeUndefined()
    expect(original.activeVariant).toBeUndefined()
  })

  it('连续追加累积变体', () => {
    let e = mirrorEntry()
    e = appendVariant(e, createVariant('v2'))
    e = appendVariant(e, createVariant('v3'))
    expect(variantCount(e)).toBe(3)
    expect(activeVariantIndex(e)).toBe(2)
    expect(e.text).toBe('v3')
  })
})

describe('switchVariant', () => {
  it('切换展示字段到目标变体且不可变', () => {
    const first = mirrorEntry()
    const two = appendVariant(first, createVariant('第二版', { executionResult: result('第二版') }))
    const back = switchVariant(two, 0)

    expect(back).not.toBe(two)
    expect(activeVariantIndex(back)).toBe(0)
    expect(back.text).toBe('原始回答')
    expect(back.executionResult?.message).toBe('原始回答')
    // two 未被改写
    expect(two.text).toBe('第二版')
    expect(activeVariantIndex(two)).toBe(1)
  })

  it('越界下标被钳制', () => {
    const e = appendVariant(mirrorEntry(), createVariant('第二版'))
    expect(activeVariantIndex(switchVariant(e, 9))).toBe(1)
    expect(activeVariantIndex(switchVariant(e, -9))).toBe(0)
  })

  it('单变体切换恒为自身', () => {
    const e = mirrorEntry()
    expect(switchVariant(e, 0).text).toBe('原始回答')
  })
})
