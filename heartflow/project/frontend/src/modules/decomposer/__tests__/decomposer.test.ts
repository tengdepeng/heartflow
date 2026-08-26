// ============================================================
// decomposer · 镜我 · 任务拆解器测试
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  detectIntent,
  inferQuadrant,
  decompose,
  summarizePlan,
  useDecomposer,
} from '../decomposer'

// 与 INTENT_META.study 对齐的步骤数（保持测试可读）
const INTENT_STUDY_COUNT = 4

const { mockKV } = vi.hoisted(() => ({ mockKV: new Map<string, unknown>() }))
vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: <T,>(k: string, def: T): T => (mockKV.has(k) ? (mockKV.get(k) as T) : def),
    setKV: (k: string, v: unknown): void => void mockKV.set(k, v),
  },
}))
beforeEach(() => mockKV.clear())

describe('detectIntent 意图识别', () => {
  it('按关键词归类到对应意图', () => {
    expect(detectIntent('写一篇论文的初稿')).toBe('output')
    expect(detectIntent('背单词复习')).toBe('study')
    expect(detectIntent('写个脚本部署')).toBe('coding')
    expect(detectIntent('会议准备')).toBe('meeting')
    expect(detectIntent('锻炼健身')).toBe('health')
  })

  it('无法判定的归为 generic，不武断归类', () => {
    expect(detectIntent('随便看看')).toBe('generic')
  })
})

describe('inferQuadrant 紧急 / 重要 判定', () => {
  it('含语境词即标记对应轴', () => {
    expect(inferQuadrant('今天交稿，很重要')).toEqual({ urgency: true, importance: true })
    expect(inferQuadrant('整理杂物')).toEqual({ urgency: false, importance: false })
  })
})

describe('decompose 拆解', () => {
  it('已带分句的任务按显式子任务拆出', () => {
    const plan = decompose('收集资料，写初稿；修改')
    expect(plan.source).toBe('explicit')
    expect(plan.steps.length).toBeGreaterThanOrEqual(3)
    expect(plan.steps[0].title).toContain('资料')
  })

  it('未分句的任务用意图模板补齐步骤，首步承接目标', () => {
    const plan = decompose('学习非线性代数')
    expect(plan.intent).toBe('study')
    expect(plan.source).toBe('template')
    expect(plan.steps).toHaveLength(INTENT_STUDY_COUNT)
    expect(plan.steps[0].detail).toContain('非线性代数')
  })

  it('陈列而非叙事：步骤只列动作，不含因果/总结连接词', () => {
    const plan = decompose('做一个项目')
    const banned = ['所以', '因此', '可见', '最优', '更好', '建议你']
    for (const b of banned) expect(plan.steps.join(' ')).not.toContain(b)
  })
})

describe('summarizePlan / useDecomposer', () => {
  it('汇总展示待办进度与高优先级步骤', () => {
    const plan = decompose('学习非线性代数')
    const sum = summarizePlan(plan)
    expect(sum.total).toBe(plan.steps.length)
    expect(sum.done).toBe(0)
    expect(sum.top.every((s) => s.priority === 'high')).toBe(true)
  })

  it('状态可推进与翻转，并持久化本地', () => {
    const d = useDecomposer()
    const plan = d.decomposeAndSave('整理房间')
    expect(d.plans.value).toHaveLength(1)
    expect(mockKV.has('mirror.decomposer.plans')).toBe(true)

    const step = plan.steps[0]
    expect(d.toggleStep(plan.id, step.id)).toBe(true)
    expect(d.plans.value[0].steps[0].status).toBe('doing')
    expect(d.setStep(plan.id, step.id, 'done')).toBe(true)
    expect(d.plans.value[0].steps[0].status).toBe('done')
  })
})