// ============================================================
// 存钱计划引擎测试（INCR-30）
// ============================================================
import { describe, it, expect } from 'vitest'
import {
  buildPlan,
  planProgress,
  weekDepositAmount,
  weekPlanTotal,
  weeksDeposited,
  applyDeposit,
  applyWeek,
  nextWeek,
  SAVING_MODE_META,
  type SavingPlan,
} from '../saving-plan'

function basePlan(o: Partial<SavingPlan> = {}): SavingPlan {
  return {
    id: 'p1',
    mode: 'accumulate',
    name: '旅游基金',
    targetAmount: 10000,
    baseAmount: 0,
    currentAmount: 0,
    deposits: [],
    createdAt: '2026-08-01T00:00:00.000Z',
    weeksDone: [],
    done: false,
    ...o,
  }
}

describe('52 周公式', () => {
  it('第 week 周应存 = base * week', () => {
    expect(weekDepositAmount(10, 1)).toBe(10)
    expect(weekDepositAmount(10, 52)).toBe(520)
    expect(weekDepositAmount(0, 10)).toBe(0)
  })

  it('全期总目标 = base * Σ(1..52) = base * 1378', () => {
    expect(weekPlanTotal(10)).toBe(13780)
    expect(weekPlanTotal(5)).toBe(6890)
  })
})

describe('planProgress 进度', () => {
  it('未达标给出差额与百分比', () => {
    const p = planProgress({ currentAmount: 2500, targetAmount: 10000, done: false })
    expect(p.percent).toBe(25)
    expect(p.remaining).toBe(7500)
    expect(p.done).toBe(false)
  })

  it('达标后 done=true，百分比封顶 100', () => {
    const p = planProgress({ currentAmount: 12000, targetAmount: 10000, done: true })
    expect(p.done).toBe(true)
    expect(p.percent).toBe(100)
    expect(p.remaining).toBe(-2000)
  })

  it('已存≥目标时即使未标 done 也判完成', () => {
    const p = planProgress({ currentAmount: 10000, targetAmount: 10000, done: false })
    expect(p.done).toBe(true)
  })
})

describe('applyDeposit 存款推进', () => {
  it('追加存款后 currentAmount 同步、满额自动完成', () => {
    const p = applyDeposit(basePlan(), 4000, '2026-08-05')
    expect(p.currentAmount).toBe(4000)
    const p2 = applyDeposit(p, 6000, '2026-08-20')
    expect(p2.currentAmount).toBe(10000)
    expect(p2.done).toBe(true)
    expect(p2.completedAt).toBe('2026-08-20')
  })
})

describe('52 周挑战推进', () => {
  it('applyWeek 标记第 w 周并按该周应存额入账', () => {
    const plan = basePlan({ mode: '52week', baseAmount: 10, targetAmount: 13780 })
    const p = applyWeek(plan, 1)
    expect(p.weeksDone).toEqual([1])
    expect(p.deposits.length).toBe(1)
    expect(p.deposits[0].amount).toBe(10)
    expect(p.currentAmount).toBe(10)

    const p3 = applyWeek(p, 3)
    expect(p3.deposits.length).toBe(2)
    expect(p3.currentAmount).toBe(40) // 10 + 30
  })

  it('重复标记同一周不重复入账', () => {
    const plan = basePlan({ mode: '52week', baseAmount: 10, targetAmount: 13780 })
    const p = applyWeek(plan, 2)
    const p2 = applyWeek(p, 2)
    expect(p2.deposits.length).toBe(1)
    expect(p2.currentAmount).toBe(20)
  })

  it('非 52week 模式 applyWeek 不生效', () => {
    const p = applyWeek(basePlan(), 5)
    expect(p.weeksDone).toEqual([])
  })

  it('weeksDeposited 按已完成周累计', () => {
    expect(weeksDeposited({ weeksDone: [1, 2], baseAmount: 10 })).toBe(30) // 10+20
  })
})

describe('nextWeek 找下一个待完成周', () => {
  it('返回最小未完成周；全完成后返回 null', () => {
    expect(nextWeek({ weeksDone: [1, 3], baseAmount: 10 })).toBe(2)
    expect(nextWeek({ weeksDone: [], baseAmount: 10 })).toBe(1)
    const full = Array.from({ length: 52 }, (_, i) => i + 1)
    expect(nextWeek({ weeksDone: full, baseAmount: 10 })).toBe(null)
  })
})

describe('buildPlan 建计划', () => {
  it('攒钱模式用 targetAmount', () => {
    const p = buildPlan({ mode: 'accumulate', name: '新车', targetAmount: 50000 })
    expect(p.targetAmount).toBe(50000)
    expect(p.baseAmount).toBe(0)
    expect(p.mode).toBe('accumulate')
  })

  it('52week 模式目标由基础额折算', () => {
    const p = buildPlan({ mode: '52week', name: '周卡', baseAmount: 10 })
    expect(p.targetAmount).toBe(13780)
    expect(p.baseAmount).toBe(10)
  })

  it('心愿模式保留 targetDate', () => {
    const p = buildPlan({ mode: 'wish', name: '相机', targetAmount: 8000, targetDate: '2026-12-31' })
    expect(p.targetDate).toBe('2026-12-31')
    expect(p.done).toBe(false)
  })
})

describe('元数据', () => {
  it('三种模式均有中文标签', () => {
    expect(SAVING_MODE_META.accumulate.label).toBe('攒钱')
    expect(SAVING_MODE_META['52week'].label).toBe('52周')
    expect(SAVING_MODE_META.wish.label).toBe('心愿')
  })
})