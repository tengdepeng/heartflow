// ============================================================
// storage/advisor 领域模块测试
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
  const { getAdvisors, setAdvisors, getAdvisorMessages, setAdvisorMessages, getAdvisorResetDate, setAdvisorResetDate } = await import('../advisor')
  return { getAdvisors, setAdvisors, getAdvisorMessages, setAdvisorMessages, getAdvisorResetDate, setAdvisorResetDate }
}

afterEach(() => { delete (globalThis as any).localStorage })

describe('storage/advisor', () => {
  it('getAdvisors 首次返回空数组', async () => {
    const { getAdvisors } = await freshModule()
    expect(getAdvisors()).toEqual([])
  })

  it('setAdvisors 写入后返回新数据', async () => {
    const { getAdvisors, setAdvisors } = await freshModule()
    const advisors = [
      { id: 'a1', name: '幕僚甲', role: 'guardian' as const, personality: 'steady' as const, state: 'slumber' as const, affinity: 0, level: 1, totalInteractions: 0, createdAt: '2026-01-01T00:00:00Z', lastActiveAt: null, unlocked: true },
    ]
    setAdvisors(advisors)
    expect(getAdvisors()).toHaveLength(1)
    expect(getAdvisors()[0].name).toBe('幕僚甲')
  })

  it('getAdvisorMessages 首次返回空数组', async () => {
    const { getAdvisorMessages } = await freshModule()
    expect(getAdvisorMessages()).toEqual([])
  })

  it('setAdvisorMessages 写入后返回新数据', async () => {
    const { getAdvisorMessages, setAdvisorMessages } = await freshModule()
    const msgs = [{ id: 'm1', text: '你好', at: '2026-01-01T00:00:00Z', trigger: 'morning' }]
    setAdvisorMessages(msgs)
    expect(getAdvisorMessages()).toHaveLength(1)
    expect(getAdvisorMessages()[0].text).toBe('你好')
  })

  it('getAdvisorResetDate 首次返回 null', async () => {
    const { getAdvisorResetDate } = await freshModule()
    expect(getAdvisorResetDate()).toBeNull()
  })

  it('setAdvisorResetDate 写入后返回新值', async () => {
    const { getAdvisorResetDate, setAdvisorResetDate } = await freshModule()
    setAdvisorResetDate('2026-01-15')
    expect(getAdvisorResetDate()).toBe('2026-01-15')
  })

  it('setAdvisorResetDate 可设为 null', async () => {
    const { getAdvisorResetDate, setAdvisorResetDate } = await freshModule()
    setAdvisorResetDate('2026-01-15')
    setAdvisorResetDate(null)
    expect(getAdvisorResetDate()).toBeNull()
  })
})