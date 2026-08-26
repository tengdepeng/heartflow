// ============================================================
// storage/kv 领域模块测试
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

async function freshKV() {
  mockLocalStorage = createMockStorage()
  ;(globalThis as any).localStorage = mockLocalStorage
  const { invalidateCache } = await import('../core')
  invalidateCache()
  const { getKV, setKV } = await import('../kv')
  return { getKV, setKV }
}

afterEach(() => {
  delete (globalThis as any).localStorage
})

describe('storage/kv', () => {
  it('getKV 未设置时返回默认值', async () => {
    const { getKV } = await freshKV()
    expect(getKV('test.key', 'default')).toBe('default')
  })

  it('getKV 未设置时返回数组默认值', async () => {
    const { getKV } = await freshKV()
    expect(getKV('test.key', [])).toEqual([])
  })

  it('getKV 未设置时返回对象默认值', async () => {
    const { getKV } = await freshKV()
    expect(getKV('test.key', { foo: 1 })).toEqual({ foo: 1 })
  })

  it('setKV 后 getKV 返回设置的值', async () => {
    const { getKV, setKV } = await freshKV()
    setKV('user.name', 'Alice')
    expect(getKV('user.name', '')).toBe('Alice')
  })

  it('setKV 覆盖已存在的值', async () => {
    const { getKV, setKV } = await freshKV()
    setKV('score', 100)
    setKV('score', 200)
    expect(getKV('score', 0)).toBe(200)
  })

  it('setKV 存储数组', async () => {
    const { getKV, setKV } = await freshKV()
    const data = [{ id: 1, name: 'a' }, { id: 2, name: 'b' }]
    setKV('items', data)
    expect(getKV('items', [])).toEqual(data)
  })

  it('setKV 存储对象', async () => {
    const { getKV, setKV } = await freshKV()
    setKV('config', { dark: true, lang: 'zh' })
    expect(getKV('config', {})).toEqual({ dark: true, lang: 'zh' })
  })

  it('多个 key 互不干扰', async () => {
    const { getKV, setKV } = await freshKV()
    setKV('a', 1)
    setKV('b', 2)
    expect(getKV('a', 0)).toBe(1)
    expect(getKV('b', 0)).toBe(2)
    expect(getKV('c', 0)).toBe(0)
  })

  it('写入后应持久化到 localStorage', async () => {
    const { setKV } = await freshKV()
    setKV('hello', 'world')
    const raw = mockLocalStorage.getItem('heartflow:storage')
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw!)
    expect(parsed.kvStore.hello).toBe('world')
  })

  it('setKV 存储 undefined 值，getKV 返回默认值', async () => {
    const { getKV, setKV } = await freshKV()
    setKV('undefined.key', undefined)
    // JSON.stringify 会省略 undefined 值，因此 getKV 返回默认值
    expect(getKV('undefined.key', 'fallback')).toBe('fallback')
    expect(getKV('undefined.key', 0)).toBe(0)
    expect(getKV('undefined.key', null)).toBeNull()
  })

  it('getKV 不存在的 key 返回默认值，且默认值类型正确', async () => {
    const { getKV } = await freshKV()
    const numVal = getKV('nonexistent.num', 42)
    expect(numVal).toBe(42)
    expect(typeof numVal).toBe('number')

    const strVal = getKV('nonexistent.str', 'hello')
    expect(strVal).toBe('hello')
    expect(typeof strVal).toBe('string')

    const arrVal = getKV('nonexistent.arr', [1, 2, 3])
    expect(arrVal).toEqual([1, 2, 3])
    expect(Array.isArray(arrVal)).toBe(true)

    const boolVal = getKV('nonexistent.bool', true)
    expect(boolVal).toBe(true)
    expect(typeof boolVal).toBe('boolean')
  })

  it('setKV 后立即 getKV 返回最新值（时序测试）', async () => {
    const { getKV, setKV } = await freshKV()
    setKV('seq', 'a')
    expect(getKV('seq', '')).toBe('a')
    setKV('seq', 'b')
    expect(getKV('seq', '')).toBe('b')
    setKV('seq', 'c')
    expect(getKV('seq', '')).toBe('c')
  })
})