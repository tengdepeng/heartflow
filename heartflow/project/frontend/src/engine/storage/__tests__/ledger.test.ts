// ============================================================
// storage/ledger 领域模块测试
// ============================================================
import { describe, it, expect, vi, afterEach } from 'vitest'

function createMockStorage() {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
}

let mockLocalStorage: ReturnType<typeof createMockStorage>

async function freshModule() {
  mockLocalStorage = createMockStorage()
  ;(globalThis as any).localStorage = mockLocalStorage
  const { invalidateCache } = await import('../core')
  invalidateCache()
  const { getLedger, addLedgerRecord, removeLedgerRecord } = await import('../ledger')
  return { getLedger, addLedgerRecord, removeLedgerRecord }
}

afterEach(() => { delete (globalThis as any).localStorage })

describe('storage/ledger', () => {
  it('getLedger 首次返回空数组', async () => {
    const { getLedger } = await freshModule()
    expect(getLedger()).toEqual([])
  })

  it('addLedgerRecord 追加一条记录', async () => {
    const { getLedger, addLedgerRecord } = await freshModule()
    addLedgerRecord({ id: 'l1', type: 'income', amount: 1000, category: 'salary', note: '', at: '2026-01-01T00:00:00Z' })
    expect(getLedger()).toHaveLength(1)
    expect(getLedger()[0].amount).toBe(1000)
  })

  it('addLedgerRecord 支持多条记录', async () => {
    const { getLedger, addLedgerRecord } = await freshModule()
    addLedgerRecord({ id: 'l1', type: 'income', amount: 1000, category: 'salary', note: '', at: '' })
    addLedgerRecord({ id: 'l2', type: 'expense', amount: 500, category: 'food', note: '', at: '' })
    expect(getLedger()).toHaveLength(2)
  })

  it('removeLedgerRecord 删除指定记录', async () => {
    const { getLedger, addLedgerRecord, removeLedgerRecord } = await freshModule()
    addLedgerRecord({ id: 'l1', type: 'income', amount: 1000, category: 'salary', note: '', at: '' })
    addLedgerRecord({ id: 'l2', type: 'expense', amount: 500, category: 'food', note: '', at: '' })
    removeLedgerRecord('l1')
    expect(getLedger()).toHaveLength(1)
    expect(getLedger()[0].id).toBe('l2')
  })

  it('removeLedgerRecord 对不存在的 id 不报错', async () => {
    const { getLedger, addLedgerRecord, removeLedgerRecord } = await freshModule()
    addLedgerRecord({ id: 'l1', type: 'income', amount: 100, category: 'salary', note: '', at: '' })
    removeLedgerRecord('nonexistent')
    expect(getLedger()).toHaveLength(1)
  })

  it('removeLedgerRecord 在空列表上不报错', async () => {
    const { removeLedgerRecord } = await freshModule()
    expect(() => removeLedgerRecord('x')).not.toThrow()
  })

  it('addLedgerRecord 添加空记录（只有 id）不报错', async () => {
    const { getLedger, addLedgerRecord } = await freshModule()
    expect(() => addLedgerRecord({ id: 'minimal' } as any)).not.toThrow()
    const ledger = getLedger()
    expect(ledger).toHaveLength(1)
    expect(ledger[0].id).toBe('minimal')
  })

  it('removeLedgerRecord 删除后再次添加相同 id 的记录正常', async () => {
    const { getLedger, addLedgerRecord, removeLedgerRecord } = await freshModule()
    addLedgerRecord({ id: 'l1', type: 'income', amount: 1000, category: 'salary', note: '', at: '2026-01-01T00:00:00Z' })
    removeLedgerRecord('l1')
    expect(getLedger()).toEqual([])
    addLedgerRecord({ id: 'l1', type: 'expense', amount: 500, category: 'food', note: '', at: '2026-01-02T00:00:00Z' })
    expect(getLedger()).toHaveLength(1)
    expect(getLedger()[0].id).toBe('l1')
    expect(getLedger()[0].amount).toBe(500)
  })
})