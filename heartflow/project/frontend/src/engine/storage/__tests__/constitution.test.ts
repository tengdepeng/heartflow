// ============================================================
// storage/constitution 领域模块测试
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
  const { getConstitution, setConstitution } = await import('../constitution')
  return { getConstitution, setConstitution }
}

afterEach(() => { delete (globalThis as any).localStorage; vi.restoreAllMocks() })

describe('storage/constitution', () => {
  it('getConstitution 首次返回 null', async () => {
    const { getConstitution } = await freshModule()
    expect(getConstitution()).toBeNull()
  })

  it('setConstitution 写入后返回新数据', async () => {
    const { getConstitution, setConstitution } = await freshModule()
    const constitution = { version: '1.0', name: '宪法', preamble: '序言', immutableRules: [], mutableRules: [], createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' }
    setConstitution(constitution)
    expect(getConstitution()).not.toBeNull()
    expect(getConstitution()!.name).toBe('宪法')
  })

  it('setConstitution 覆盖已有数据', async () => {
    const { getConstitution, setConstitution } = await freshModule()
    setConstitution({ version: '1.0', name: '旧', preamble: '', immutableRules: [], mutableRules: [], createdAt: '', updatedAt: '' })
    setConstitution({ version: '2.0', name: '新', preamble: '新序言', immutableRules: [], mutableRules: [], createdAt: '', updatedAt: '' })
    expect(getConstitution()!.name).toBe('新')
  })

  it('setConstitution 写入包含 immutableRules', async () => {
    const { getConstitution, setConstitution } = await freshModule()
    setConstitution({ version: '1.0', name: '宪法', preamble: '序言', immutableRules: [{ id: 'r1', title: '规则', description: '不可变规则', icon: '📜', type: 'value' }], mutableRules: [], createdAt: '', updatedAt: '' })
    const result = getConstitution()!
    expect(result.immutableRules).toHaveLength(1)
    expect(result.immutableRules[0].title).toBe('规则')
  })

  it('setConstitution 写入包含 mutableRules', async () => {
    const { getConstitution, setConstitution } = await freshModule()
    setConstitution({ version: '1.0', name: '宪法', preamble: '序言', immutableRules: [], mutableRules: [{ id: 'm1', title: '可变规则', description: '描述', enabled: true, type: 'ritual', order: 1 }], createdAt: '', updatedAt: '' })
    const result = getConstitution()!
    expect(result.mutableRules).toHaveLength(1)
    expect(result.mutableRules[0].title).toBe('可变规则')
  })

  it('setConstitution 写入空 rules 不报错', async () => {
    const { setConstitution } = await freshModule()
    expect(() => setConstitution({ version: '1.0', name: 'x', preamble: '', immutableRules: [], mutableRules: [], createdAt: '', updatedAt: '' })).not.toThrow()
  })
})