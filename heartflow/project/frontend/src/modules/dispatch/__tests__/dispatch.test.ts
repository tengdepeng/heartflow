// ============================================================
// dispatch · 镜我 · 幕僚调度测试
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  detectStrategy,
  createDispatch,
  splitOrderDetail,
  summarize,
  useDispatch,
} from '../dispatch'

const { mockKV } = vi.hoisted(() => ({ mockKV: new Map<string, unknown>() }))
vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: <T,>(k: string, def: T): T => (mockKV.has(k) ? (mockKV.get(k) as T) : def),
    setKV: (k: string, v: unknown): void => void mockKV.set(k, v),
  },
}))
beforeEach(() => mockKV.clear())

describe('detectStrategy 策略判定', () => {
  it('单幕僚 → 单一策略', () => {
    expect(detectStrategy('做年报', ['甲'])).toBe('single')
  })

  it('多幕僚且调令无先后依赖 → 并行', () => {
    expect(detectStrategy('甲负责资料，乙负责排版', ['甲', '乙'])).toBe('parallel')
  })

  it('多幕僚且调令含先后连接词 → 串行', () => {
    expect(detectStrategy('先拟大纲，再成文', ['甲', '乙'])).toBe('serial')
  })
})

describe('createDispatch', () => {
  it('建立初始排队态，步骤数与幕僚数一致', () => {
    const rec = createDispatch('统稿', ['甲', '乙'])
    expect(rec.status).toBe('queued')
    expect(rec.steps).toHaveLength(2)
    expect(rec.steps.every((s) => s.status === 'pending')).toBe(true)
    expect(rec.strategy).toBe('parallel')
  })
})

describe('splitOrderDetail 分句归属', () => {
  it('按分句拆解并归属到指定幕僚', () => {
    const order = '甲负责资料，乙负责排版'
    expect(splitOrderDetail(order, '甲')).toContain('资料')
    expect(splitOrderDetail(order, '乙')).toContain('排版')
  })
})

describe('useDispatch 状态流转', () => {
  it('调度可发起、推进、汇总、中止、删除', () => {
    const d = useDispatch()
    const rec = d.issue('先拟大纲；再成文', ['甲', '乙'])
    expect(d.records.value).toHaveLength(1)

    expect(d.begin(rec.id)).toBe(true)
    const afterBegin = d.records.value[0]
    expect(afterBegin.status).toBe('running')
    expect(afterBegin.steps[0].status).toBe('working')

    // 串行推进第一步
    expect(d.finishStep(rec.id, '大纲完成')).toBe(true)
    const afterStep1 = d.records.value[0]
    expect(afterStep1.steps[0].status).toBe('done')
    expect(afterStep1.steps[1].status).toBe('working')
    expect(afterStep1.status).toBe('running')

    // 串行推进第二步 → 全部完成
    expect(d.finishStep(rec.id, '成文完成')).toBe(true)
    const done = d.records.value[0]
    expect(done.status).toBe('done')
    expect(done.steps.every((s) => s.status === 'done')).toBe(true)

    const sum = d.summary((r) => summarize(r, r.result))[rec.id]
    expect(sum.total).toBe(2)
    expect(sum.done).toBe(2)
    expect(sum.increments).toEqual(['大纲完成', '成文完成'])
  })

  it('中途中止会置为 halted，不覆盖完成态', () => {
    const d = useDispatch()
    const rec = d.issue('搬砖', ['甲'])
    d.begin(rec.id)
    expect(d.halt(rec.id, '人手不足')).toBe(true)
    expect(d.records.value[0].status).toBe('halted')
    expect(d.finishStep(rec.id, 'x')).toBe(false)
  })

  it('持久化到本地键', () => {
    const d = useDispatch()
    d.issue('清扫', ['甲'])
    expect(mockKV.has('mirror.dispatch.records')).toBe(true)
  })
})