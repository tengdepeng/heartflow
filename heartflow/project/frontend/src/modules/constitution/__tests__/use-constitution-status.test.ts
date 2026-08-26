import { describe, it, expect, beforeAll, vi } from 'vitest'
import {
  computeConstitutionStatus,
  computeConstitutionSummary,
  buildStatusPayload,
  snapshotConstitutionStatus,
  persistStatusSnapshot,
  CONSTITUTION_STATUS_SNAPSHOT_KEY,
} from '../use-constitution-status'
import { EFFECT_CONSUMER_MAP } from '../effect-consumer-map'
import { storage } from '../../../engine/storage'
import type { EffectTarget } from '../../../engine/constitution-effects'

const expectedTotal = EFFECT_CONSUMER_MAP.length
const expectedResolved = EFFECT_CONSUMER_MAP.filter(c => c.consumed).length
const expectedRuntimeConsumed = EFFECT_CONSUMER_MAP.filter(c => c.consumed && c.mechanism !== 'declared').length
const expectedDeclarative = EFFECT_CONSUMER_MAP.filter(c => !c.consumed || c.mechanism === 'declared').length

describe('computeConstitutionStatus — 三态名实对照', () => {
  it('总数与账本一致', () => {
    const items = computeConstitutionStatus(() => false)
    expect(items.length).toBe(expectedTotal)
    // 每条 target 唯一
    expect(new Set(items.map(i => i.target)).size).toBe(expectedTotal)
  })

  it('声明式条目数 = declared + 待接线 条目数（名实诚实，永不误判生效中）', () => {
    const items = computeConstitutionStatus(() => true)
    const declarative = items.filter(i => i.state === 'declarative')
    expect(declarative.length).toBe(expectedDeclarative)
    // 即便 resolver 全部返回 true，声明式（含 declared）仍不可标 active
    expect(declarative.every(i => i.active === false)).toBe(true)
    expect(declarative.every(i => i.mechanism === 'declared' || i.consumed === false)).toBe(true)
  })

  it('resolver 全 true → 全部运行时消费项归为 active，声明式恒不 active', () => {
    const items = computeConstitutionStatus(() => true)
    const summary = computeConstitutionSummary(items)
    expect(summary.activeCount).toBe(expectedRuntimeConsumed)
    expect(summary.wiredIdleCount).toBe(0)
    expect(summary.declarativeCount).toBe(expectedDeclarative)
    expect(summary.consumedCount).toBe(expectedResolved)
  })

  it('resolver 全 false → 全部运行时消费项归为 wired-idle', () => {
    const items = computeConstitutionStatus(() => false)
    const summary = computeConstitutionSummary(items)
    expect(summary.activeCount).toBe(0)
    expect(summary.wiredIdleCount).toBe(expectedRuntimeConsumed)
    expect(summary.declarativeCount).toBe(expectedDeclarative)
  })

  it('resolver 按 target 选择性激活', () => {
    const only: EffectTarget[] = ['ui:particle-density', 'stats:show-panel']
    const items = computeConstitutionStatus(t => only.includes(t))
    const summary = computeConstitutionSummary(items)
    expect(summary.activeCount).toBe(only.length)
    expect(summary.wiredIdleCount).toBe(expectedRuntimeConsumed - only.length)
    const activeTargets = items.filter(i => i.state === 'active').map(i => i.target)
    expect(activeTargets.sort()).toEqual([...only].sort())
  })

  it('每条条目携带来源与审计 note（声明式 note 可能为空）', () => {
    const items = computeConstitutionStatus(() => true)
    for (const item of items) {
      expect(typeof item.label).toBe('string')
      expect(item.consumer.length).toBeGreaterThan(0)
      // consumed 项必须声明真实消费位置（名实诚实）
      if (item.consumed) {
        expect(item.consumer).not.toContain('未接线')
      }
    }
  })
})

describe('buildStatusPayload — 导出结构', () => {
  it('结构完整且 note 归一为 null', () => {
    const items = computeConstitutionStatus(() => true)
    const summary = computeConstitutionSummary(items)
    const payload = buildStatusPayload(items, summary)
    expect(payload.schema).toBe('heartflow.constitution.status/v1')
    expect(typeof payload.generatedAt).toBe('string')
    expect(payload.summary).toEqual(summary)
    expect(payload.items.length).toBe(expectedTotal)
    expect(payload.items.every(i => i.note === null || typeof i.note === 'string')).toBe(true)
    // 序列化可逆
    expect(() => JSON.parse(JSON.stringify(payload))).not.toThrow()
  })
})

describe('snapshotConstitutionStatus / persistStatusSnapshot — P2.2 跨端接续', () => {
  beforeAll(() => {
    // storage 是 localStorage-backed 单例，提供 stub 以在 node 下可读写
    vi.stubGlobal('localStorage', {
      _data: {} as Record<string, string>,
      get length() { return Object.keys((this as any)._data).length },
      key(i: number) { return Object.keys((this as any)._data)[i] ?? null },
      getItem(k: string) { return (this as any)._data[k] ?? null },
      setItem(k: string, v: string) { (this as any)._data[k] = v },
      removeItem(k: string) { delete (this as any)._data[k] },
      clear() { (this as any)._data = {} },
    })
  })

  it('snapshotConstitutionStatus 返回与 buildStatusPayload 同源的自描述快照', () => {
    const snap = snapshotConstitutionStatus()
    expect(snap.schema).toBe('heartflow.constitution.status/v1')
    expect(snap.items.length).toBe(expectedTotal)
    expect(snap.summary.total).toBe(expectedTotal)
  })

  it('persistStatusSnapshot 把快照写入本地 KV（守宪法第1条·本地私有）', () => {
    persistStatusSnapshot()
    const stored = storage.getKV<unknown>(CONSTITUTION_STATUS_SNAPSHOT_KEY, null)
    expect(stored).not.toBeNull()
    expect((stored as any).schema).toBe('heartflow.constitution.status/v1')
    expect((stored as any).items.length).toBe(expectedTotal)
  })
})
