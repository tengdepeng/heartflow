// ============================================================
// 应用市场 · 插件链测试
// 覆盖：插件类市场条目安装 → 同步进插件存储（含房间贡献）；卸载 → 移出
// ============================================================
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAppMarket, MARKET_ITEMS } from '../app-market'
import { usePluginStore } from '../../../stores/plugin'

function mockLocalStorage() {
  const store = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v) },
    removeItem: (k: string) => { store.delete(k) },
    clear: () => store.clear(),
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  setActivePinia(createPinia())
  mockLocalStorage()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const QUOTE_ITEM_ID = 'plg-quote-daily'

describe('应用市场 · 插件类条目联动插件存储', () => {
  it('插件类条目携带 pluginManifest（含房间贡献）', () => {
    const item = MARKET_ITEMS.find(i => i.id === QUOTE_ITEM_ID)
    expect(item).toBeDefined()
    expect(item?.type).toBe('plugin')
    expect(item?.pluginManifest?.meta.id).toBe(QUOTE_ITEM_ID)
    expect(item?.pluginManifest?.contributes?.rooms?.[0]?.id).toBe('quote-daily-room')
  })

  it('安装插件类条目后写入插件存储（可被 syncPluginRooms 注册房间）', () => {
    const market = useAppMarket()
    const store = usePluginStore()
    store.init()

    expect(market.installItem(QUOTE_ITEM_ID)).toBe(true)
    vi.advanceTimersByTime(600)

    expect(market.installedIds.value.has(QUOTE_ITEM_ID)).toBe(true)
    const p = store.plugins.find(x => x.manifest.meta.id === QUOTE_ITEM_ID)
    expect(p).toBeDefined()
    expect(p?.enabled).toBe(true)
    expect(p?.manifest.contributes?.rooms).toHaveLength(1)
  })

  it('重复安装不会重复写入插件存储', () => {
    const market = useAppMarket()
    const store = usePluginStore()
    store.init()

    market.installItem(QUOTE_ITEM_ID)
    vi.advanceTimersByTime(600)
    expect(market.installItem(QUOTE_ITEM_ID)).toBe(false)
    expect(store.plugins.filter(x => x.manifest.meta.id === QUOTE_ITEM_ID)).toHaveLength(1)
  })

  it('卸载插件类条目后从插件存储移除', () => {
    const market = useAppMarket()
    const store = usePluginStore()
    store.init()

    market.installItem(QUOTE_ITEM_ID)
    vi.advanceTimersByTime(600)
    expect(store.plugins.some(x => x.manifest.meta.id === QUOTE_ITEM_ID)).toBe(true)

    expect(market.uninstallItem(QUOTE_ITEM_ID)).toBe(true)
    expect(store.plugins.some(x => x.manifest.meta.id === QUOTE_ITEM_ID)).toBe(false)
  })

  it('非插件类条目安装不影响插件存储', () => {
    const market = useAppMarket()
    const store = usePluginStore()
    store.init()
    const before = store.plugins.length

    expect(market.installItem('tpl-minimal-dashboard')).toBe(true)
    vi.advanceTimersByTime(600)

    expect(store.plugins.length).toBe(before)
  })
})
