import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePluginStore } from './plugin'

describe('plugin store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    // mock localStorage
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v) },
      removeItem: (k: string) => { store.delete(k) },
      clear: () => store.clear(),
    })
    // mock window.matchMedia (used by platform.ts detectPWA)
    Object.defineProperty(globalThis, 'window', {
      value: { matchMedia: () => ({ matches: false }) },
      writable: true, configurable: true,
    })
  })

  it('初始化后包含全部核心插件', () => {
    const store = usePluginStore()
    store.init()
    expect(store.plugins.length).toBeGreaterThanOrEqual(5)
    expect(store.plugins[0].id).toBe('core-timer')
  })

  it('安装新插件', () => {
    const store = usePluginStore()
    store.init()
    const before = store.plugins.length
    store.installPlugin({
      meta: { id: 'test-plugin', name: '测试插件', version: '1.0.0', description: '测试', tier: 'experimental', category: 'other', icon: '🧪' },
      permissions: ['read:current'],
      sandbox: { isolateFS: true, isolateNetwork: true, isolateDOM: true },
      entry: 'test:plugin',
    })
    expect(store.plugins.length).toBe(before + 1)
    const p = store.plugins.find(p => p.id === 'test-plugin')
    expect(p).toBeDefined()
    expect(p!.enabled).toBe(true)
  })

  it('卸载插件后移除', () => {
    const store = usePluginStore()
    store.init()
    const before = store.plugins.length
    store.installPlugin({
      meta: { id: 'temp-plugin', name: '临时', version: '1.0.0', description: '', tier: 'experimental', category: 'other', icon: '🕳' },
      permissions: ['read:current'],
      sandbox: { isolateFS: true, isolateNetwork: true, isolateDOM: true },
      entry: 'temp:plugin',
    })
    expect(store.plugins.length).toBe(before + 1)
    store.uninstallPlugin('temp-plugin')
    expect(store.plugins.length).toBe(before)
    expect(store.plugins.find(p => p.id === 'temp-plugin')).toBeUndefined()
  })

  it('禁止卸载核心插件', () => {
    const store = usePluginStore()
    store.init()
    const before = store.plugins.length
    store.uninstallPlugin('core-timer')
    expect(store.plugins.length).toBe(before)
  })

  it('启用/禁用插件', () => {
    const store = usePluginStore()
    store.init()
    store.installPlugin({
      meta: { id: 'tog-plugin', name: '切换', version: '1.0.0', description: '', tier: 'community', category: 'other', icon: '🔘' },
      permissions: ['read:current'],
      sandbox: { isolateFS: true, isolateNetwork: true, isolateDOM: true },
      entry: 'tog:plugin',
    })
    expect(store.plugins.find(p => p.id === 'tog-plugin')!.enabled).toBe(true)
    store.disable('tog-plugin')
    expect(store.plugins.find(p => p.id === 'tog-plugin')!.enabled).toBe(false)
    store.enable('tog-plugin')
    expect(store.plugins.find(p => p.id === 'tog-plugin')!.enabled).toBe(true)
  })

  it('核心插件不可禁用', () => {
    const store = usePluginStore()
    store.init()
    const result = store.disable('core-timer')
    expect(result).toBe(false)
    expect(store.plugins.find(p => p.id === 'core-timer')!.enabled).toBe(true)
  })

  it('enabledPlugins 只返回已启用插件', () => {
    const store = usePluginStore()
    store.init()
    store.installPlugin({
      meta: { id: 'off-plugin', name: '关闭', version: '1.0.0', description: '', tier: 'community', category: 'other', icon: '🔌' },
      permissions: ['read:current'],
      sandbox: { isolateFS: true, isolateNetwork: true, isolateDOM: true },
      entry: 'off:plugin',
    })
    store.disable('off-plugin')
    expect(store.enabledPlugins.every(p => p.enabled)).toBe(true)
    expect(store.disabledPlugins.some(p => p.id === 'off-plugin')).toBe(true)
  })

  it('init 只执行一次', () => {
    const store = usePluginStore()
    store.init()
    const first = store.plugins.length
    store.init()
    expect(store.plugins.length).toBe(first)
  })

  it('第三方插件安装后持久化，重启（新 store init）后恢复', () => {
    const store = usePluginStore()
    store.init()
    store.installPlugin({
      meta: { id: 'persist-plugin', name: '持久化', version: '1.0.0', description: '', tier: 'community', category: 'note', icon: '💾' },
      permissions: ['read:current'],
      sandbox: { isolateFS: true, isolateNetwork: true, isolateDOM: true },
      entry: 'persist:plugin',
      contributes: {
        rooms: [{ id: 'persist-room', path: '/persist-room', name: '持久化房', icon: '💾', color: '#8fa3bf' }],
      },
    })
    // 模拟应用重启：新 pinia + 新 store 实例，从同一 localStorage 重建
    setActivePinia(createPinia())
    const store2 = usePluginStore()
    store2.init()
    const restored = store2.plugins.find(p => p.id === 'persist-plugin')
    expect(restored).toBeDefined()
    expect(restored!.enabled).toBe(true)
    expect(restored!.manifest.contributes?.rooms?.[0].id).toBe('persist-room')
    expect(store2.enabledPlugins.some(p => p.id === 'persist-plugin')).toBe(true)
  })

  it('第三方插件禁用状态在重启后保留', () => {
    const store = usePluginStore()
    store.init()
    store.installPlugin({
      meta: { id: 'keep-off-plugin', name: '保持关闭', version: '1.0.0', description: '', tier: 'community', category: 'other', icon: '🔕' },
      permissions: ['read:current'],
      sandbox: { isolateFS: true, isolateNetwork: true, isolateDOM: true },
      entry: 'keep-off:plugin',
    })
    store.disable('keep-off-plugin')
    setActivePinia(createPinia())
    const store2 = usePluginStore()
    store2.init()
    const restored = store2.plugins.find(p => p.id === 'keep-off-plugin')
    expect(restored).toBeDefined()
    expect(restored!.enabled).toBe(false)
  })

  it('卸载后注册表条目清理，重启后不复活', () => {
    const store = usePluginStore()
    store.init()
    store.installPlugin({
      meta: { id: 'ghost-plugin', name: '幽灵', version: '1.0.0', description: '', tier: 'community', category: 'other', icon: '👻' },
      permissions: ['read:current'],
      sandbox: { isolateFS: true, isolateNetwork: true, isolateDOM: true },
      entry: 'ghost:plugin',
    })
    store.uninstallPlugin('ghost-plugin')
    setActivePinia(createPinia())
    const store2 = usePluginStore()
    store2.init()
    expect(store2.plugins.find(p => p.id === 'ghost-plugin')).toBeUndefined()
  })
})