// ============================================================
// storage/config 领域模块测试
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

async function freshConfig() {
  mockLocalStorage = createMockStorage()
  ;(globalThis as any).localStorage = mockLocalStorage
  const { invalidateCache } = await import('../core')
  invalidateCache()
  const { getConfig, setConfig, getActiveStylePack, setActiveStylePack } = await import('../config')
  return { getConfig, setConfig, getActiveStylePack, setActiveStylePack }
}

afterEach(() => {
  delete (globalThis as any).localStorage
})

describe('storage/config', () => {
  it('getConfig 首次返回默认配置', async () => {
    const { getConfig } = await freshConfig()
    const config = getConfig()
    expect(config.theme).toBe('dark')
    expect(config.timer.defaultDuration).toBe(25)
    expect(config.locale).toBe('zh-CN')
  })

  it('setConfig 后 getConfig 返回更新后的配置', async () => {
    const { getConfig, setConfig } = await freshConfig()
    const config = getConfig()
    config.theme = 'light'
    setConfig(config)
    const updated = getConfig()
    expect(updated.theme).toBe('light')
  })

  it('setConfig 应保持其他字段不变', async () => {
    const { getConfig, setConfig } = await freshConfig()
    const config = getConfig()
    config.theme = 'light'
    setConfig(config)
    const updated = getConfig()
    expect(updated.locale).toBe('zh-CN')
    expect(updated.timer.defaultDuration).toBe(25)
  })

  it('getActiveStylePack 首次返回默认值', async () => {
    const { getActiveStylePack } = await freshConfig()
    expect(getActiveStylePack()).toBe('default-gravity')
  })

  it('setActiveStylePack 后 getActiveStylePack 返回新值', async () => {
    const { getActiveStylePack, setActiveStylePack } = await freshConfig()
    setActiveStylePack('custom-style')
    expect(getActiveStylePack()).toBe('custom-style')
  })

  it('setActiveStylePack 覆盖之前的值', async () => {
    const { getActiveStylePack, setActiveStylePack } = await freshConfig()
    setActiveStylePack('first')
    setActiveStylePack('second')
    expect(getActiveStylePack()).toBe('second')
  })

  it('配置写入应持久化到 localStorage', async () => {
    const { getConfig, setConfig } = await freshConfig()
    const config = getConfig()
    config.theme = 'light'
    setConfig(config)
    const raw = mockLocalStorage.getItem('heartflow:storage')
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw!)
    expect(parsed.config.theme).toBe('light')
  })

  it('setConfig 写入负数时长，其他字段不受影响', async () => {
    const { getConfig, setConfig } = await freshConfig()
    const original = getConfig()
    const modified = { ...original, timer: { ...original.timer, defaultDuration: -10 } }
    setConfig(modified)
    const result = getConfig()
    expect(result.timer.defaultDuration).toBe(-10)
    expect(result.timer.breakDuration).toBe(original.timer.breakDuration)
    expect(result.theme).toBe(original.theme)
    expect(result.locale).toBe(original.locale)
  })

  it('多次 setConfig 后 getConfig 返回最新值', async () => {
    const { getConfig, setConfig } = await freshConfig()
    const original = getConfig()

    const first = { ...original, theme: 'light' as const }
    setConfig(first)
    expect(getConfig().theme).toBe('light')

    const second = { ...getConfig(), locale: 'en-US' }
    setConfig(second)
    expect(getConfig().theme).toBe('light')
    expect(getConfig().locale).toBe('en-US')

    const third = { ...getConfig(), timer: { ...getConfig().timer, defaultDuration: 30 } }
    setConfig(third)
    expect(getConfig().theme).toBe('light')
    expect(getConfig().locale).toBe('en-US')
    expect(getConfig().timer.defaultDuration).toBe(30)
  })
})