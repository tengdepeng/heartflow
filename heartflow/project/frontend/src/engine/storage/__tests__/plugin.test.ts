// ============================================================
// storage/plugin 领域模块测试
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
  const { getPluginRegistry, setPluginRegistry } = await import('../plugin')
  return { getPluginRegistry, setPluginRegistry }
}

afterEach(() => { delete (globalThis as any).localStorage })

describe('storage/plugin', () => {
  it('getPluginRegistry 首次返回空对象', async () => {
    const { getPluginRegistry } = await freshModule()
    expect(getPluginRegistry()).toEqual({})
  })

  it('setPluginRegistry 写入后返回新数据', async () => {
    const { getPluginRegistry, setPluginRegistry } = await freshModule()
    const registry = { 'plugin-1': { enabled: true, permissions: ['storage:read'] } }
    setPluginRegistry(registry)
    expect(getPluginRegistry()['plugin-1']).toBeDefined()
    expect(getPluginRegistry()['plugin-1'].enabled).toBe(true)
  })

  it('setPluginRegistry 替换已有数据', async () => {
    const { getPluginRegistry, setPluginRegistry } = await freshModule()
    setPluginRegistry({ 'old': { enabled: true, permissions: [] } })
    setPluginRegistry({ 'new': { enabled: false, permissions: ['ui:write'] } })
    expect(getPluginRegistry()).toHaveProperty('new')
    expect(getPluginRegistry()).not.toHaveProperty('old')
  })

  it('setPluginRegistry 写入空对象', async () => {
    const { getPluginRegistry, setPluginRegistry } = await freshModule()
    setPluginRegistry({ 'temp': { enabled: true, permissions: [] } })
    setPluginRegistry({})
    expect(getPluginRegistry()).toEqual({})
  })

  it('setPluginRegistry 写入包含 permissions 数组', async () => {
    const { getPluginRegistry, setPluginRegistry } = await freshModule()
    const perms = ['storage:read', 'storage:write', 'ui:toast', 'event:listen']
    setPluginRegistry({ 'plugin-1': { enabled: true, permissions: perms } })
    expect(getPluginRegistry()['plugin-1'].permissions).toHaveLength(4)
    expect(getPluginRegistry()['plugin-1'].permissions).toEqual(perms)
  })

  it('setPluginRegistry 写入多个插件', async () => {
    const { getPluginRegistry, setPluginRegistry } = await freshModule()
    setPluginRegistry({
      'a': { enabled: true, permissions: [] },
      'b': { enabled: false, permissions: ['storage:read'] },
      'c': { enabled: true, permissions: ['ui:write', 'event:listen'] },
    })
    expect(Object.keys(getPluginRegistry())).toHaveLength(3)
  })

  it('setPluginRegistry 写入后保留 enabled 状态', async () => {
    const { getPluginRegistry, setPluginRegistry } = await freshModule()
    setPluginRegistry({ 'plugin-1': { enabled: false, permissions: [] } })
    expect(getPluginRegistry()['plugin-1'].enabled).toBe(false)
  })
})