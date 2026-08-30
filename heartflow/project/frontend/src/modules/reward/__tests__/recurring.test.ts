// ============================================================
// recurring 周期/重复记账引擎测试（INCR-22）
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { store, mockGetKV, mockSetKV } = vi.hoisted(() => {
  const store: Record<string, unknown> = {}
  return {
    store,
    mockGetKV: vi.fn((k: string, d?: unknown): unknown => store[k] ?? d),
    mockSetKV: vi.fn((k: string, v: unknown): void => {
      store[k] = v
    }),
  }
})

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: mockGetKV,
    setKV: mockSetKV,
  },
}))

import {
  nextOccurrence,
  nextOccurrenceAfter,
  occurrencesInRange,
  dueRules,
  toRecurringDraft,
  useRecurring,
  type RecurringRule,
} from '../recurring'

function rule(o: Partial<RecurringRule> = {}): RecurringRule {
  return {
    id: o.id ?? 'r1',
    name: o.name ?? '房租',
    type: o.type ?? 'expense',
    amount: o.amount ?? 3000,
    category: o.category ?? 'social',
    account: o.account ?? 'cash',
    freq: o.freq ?? 'monthly',
    interval: o.interval ?? 1,
    startAt: o.startAt ?? '2026-01-05',
    active: o.active ?? true,
    nextRunAt: o.nextRunAt ?? o.startAt ?? '2026-01-05',
  }
}

describe('nextOccurrence 周期推进', () => {
  it('daily 按日推进', () => {
    expect(nextOccurrence({ freq: 'daily', interval: 1 }, '2026-08-01')).toBe('2026-08-02')
    expect(nextOccurrence({ freq: 'daily', interval: 3 }, '2026-08-01')).toBe('2026-08-04')
  })

  it('weekly 按周推进（跨月）', () => {
    expect(nextOccurrence({ freq: 'weekly', interval: 1 }, '2026-08-29')).toBe('2026-09-05')
    expect(nextOccurrence({ freq: 'weekly', interval: 2 }, '2026-08-01')).toBe('2026-08-15')
  })

  it('monthly 保留起始日', () => {
    expect(nextOccurrence({ freq: 'monthly', interval: 1 }, '2026-01-05')).toBe('2026-02-05')
    expect(nextOccurrence({ freq: 'monthly', interval: 2 }, '2026-01-05')).toBe('2026-03-05')
  })

  it('monthly 月末越界截断到当月末日', () => {
    expect(nextOccurrence({ freq: 'monthly', interval: 1 }, '2026-01-31')).toBe('2026-02-28')
    expect(nextOccurrence({ freq: 'monthly', interval: 1 }, '2026-02-28')).toBe('2026-03-28')
    expect(nextOccurrence({ freq: 'monthly', interval: 1 }, '2024-01-31')).toBe('2024-02-29') // 闰年
  })

  it('monthly 跨年', () => {
    expect(nextOccurrence({ freq: 'monthly', interval: 1 }, '2026-12-10')).toBe('2027-01-10')
  })

  it('yearly 按年推进', () => {
    expect(nextOccurrence({ freq: 'yearly', interval: 1 }, '2026-03-15')).toBe('2027-03-15')
    expect(nextOccurrence({ freq: 'yearly', interval: 2 }, '2026-03-15')).toBe('2028-03-15')
  })

  it('interval 非法值按 1 处理', () => {
    expect(nextOccurrence({ freq: 'daily', interval: 0 }, '2026-08-01')).toBe('2026-08-02')
  })
})

describe('nextOccurrenceAfter / occurrencesInRange', () => {
  it('nextOccurrenceAfter 返回严格晚于 after 的下一次出现', () => {
    const r = rule({ freq: 'monthly', interval: 1, startAt: '2026-01-05' })
    expect(nextOccurrenceAfter(r, '2026-01-05')).toBe('2026-02-05')
    expect(nextOccurrenceAfter(r, '2026-04-05')).toBe('2026-05-05')
    expect(nextOccurrenceAfter(r, '2026-04-01')).toBe('2026-04-05')
  })

  it('occurrencesInRange 返回闭区间内所有出现日', () => {
    const r = rule({ freq: 'weekly', interval: 1, startAt: '2026-08-03' })
    expect(occurrencesInRange(r, '2026-08-10', '2026-08-31')).toEqual([
      '2026-08-10',
      '2026-08-17',
      '2026-08-24',
      '2026-08-31',
    ])
  })

  it('occurrencesInRange 起点早于 startAt 时从 startAt 开始', () => {
    const r = rule({ freq: 'monthly', interval: 1, startAt: '2026-05-20' })
    expect(occurrencesInRange(r, '2026-01-01', '2026-07-01')).toEqual([
      '2026-05-20',
      '2026-06-20',
    ])
  })
})

describe('dueRules / toRecurringDraft', () => {
  it('dueRules 只返回启用且到期的规则', () => {
    const due = rule({ id: 'a', nextRunAt: '2026-08-20' })
    const future = rule({ id: 'b', nextRunAt: '2026-09-01' })
    const off = rule({ id: 'c', active: false, nextRunAt: '2026-07-01' })
    const asOf = '2026-08-29'
    expect(dueRules([due, future, off], asOf).map(r => r.id)).toEqual(['a'])
  })

  it('dueRules 只返回到期规则（保持输入顺序，排序由面板层负责）', () => {
    const late = rule({ id: 'a', nextRunAt: '2026-08-01' })
    const early = rule({ id: 'b', nextRunAt: '2026-07-01' })
    expect(dueRules([late, early], '2026-08-29').map(r => r.id)).toEqual(['a', 'b'])
  })

  it('toRecurringDraft 生成账单草稿', () => {
    const r = rule({ type: 'income', amount: 12000, category: 'salary', name: '工资' })
    expect(toRecurringDraft(r, '2026-08-05')).toEqual({
      type: 'income',
      amount: 12000,
      category: 'salary',
      description: '工资',
      account: 'cash',
      at: '2026-08-05',
    })
  })
})

describe('useRecurring 存储读写', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete store['hf:reward_recurring']
  })

  it('create 新增规则并持久化，nextRunAt 初始为 startAt', () => {
    const rec = useRecurring()
    const created = rec.create({
      name: '房租',
      type: 'expense',
      amount: 3000,
      category: 'social',
      account: 'cash',
      freq: 'monthly',
      interval: 1,
      startAt: '2026-08-05',
      active: true,
    })
    expect(rec.rules.value.length).toBe(1)
    expect(created.nextRunAt).toBe('2026-08-05')
    expect(created.id).toBeTruthy()
    expect(mockSetKV).toHaveBeenCalledWith('hf:reward_recurring', rec.rules.value)
  })

  it('update 局部更新并持久化', () => {
    const rec = useRecurring()
    const created = rec.create({
      name: '订阅',
      type: 'expense',
      amount: 30,
      category: 'tools',
      account: 'cash',
      freq: 'monthly',
      interval: 1,
      startAt: '2026-08-01',
      active: true,
    })
    rec.update(created.id, { amount: 45, active: false })
    expect(rec.rules.value[0].amount).toBe(45)
    expect(rec.rules.value[0].active).toBe(false)
  })

  it('remove 删除规则并持久化', () => {
    const rec = useRecurring()
    const a = rec.create({
      name: 'A',
      type: 'expense',
      amount: 1,
      category: 'tools',
      account: 'cash',
      freq: 'daily',
      interval: 1,
      startAt: '2026-08-01',
      active: true,
    })
    const b = rec.create({
      name: 'B',
      type: 'income',
      amount: 2,
      category: 'salary',
      account: 'cash',
      freq: 'daily',
      interval: 1,
      startAt: '2026-08-01',
      active: true,
    })
    rec.remove(a.id)
    expect(rec.rules.value.map(r => r.id)).toEqual([b.id])
  })

  it('load 重读外部写入', () => {
    store['hf:reward_recurring'] = [rule({ id: 'ext' })]
    const rec = useRecurring()
    expect(rec.rules.value.map(r => r.id)).toEqual(['ext'])
  })
})
