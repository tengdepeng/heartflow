// ============================================================
// 插件加载器 · loader.ts 测试
// 覆盖：API 注册、插件加载/卸载、权限检查、外部 manifest 创建
// ============================================================
import { describe, expect, it, beforeEach } from 'vitest'
import {
  registerPluginAPI,
  getPluginAPI,
  getRegisteredAPIs,
  loadPlugin,
  unloadPlugin,
  getLoadedPlugins,
  hasPluginPermission,
  createExternalManifest,
  __resetLoader,
} from '../loader'
import type { PluginManifest } from '../types'

// 每个测试前重置模块级状态
beforeEach(() => {
  __resetLoader()
})

// ============================================================
// 1. registerPluginAPI / getPluginAPI / getRegisteredAPIs
// ============================================================
describe('插件 API 注册', () => {
  it('registerPluginAPI 注册后可获取', () => {
    registerPluginAPI('test:api', { foo: 'bar' })
    expect(getPluginAPI('test:api')).toEqual({ foo: 'bar' })
  })

  it('getPluginAPI 获取不存在的 API 返回 null', () => {
    expect(getPluginAPI('nonexistent')).toBeNull()
  })

  it('getRegisteredAPIs 列出所有已注册 API', () => {
    registerPluginAPI('api:a', {})
    registerPluginAPI('api:b', {})
    const apis = getRegisteredAPIs()
    expect(apis).toContain('api:a')
    expect(apis).toContain('api:b')
    expect(apis).toHaveLength(2)
  })

  it('getPluginAPI 泛型类型推断', () => {
    interface TestAPI { greet: () => string }
    registerPluginAPI('typed', { greet: () => 'hello' })
    const api = getPluginAPI<TestAPI>('typed')
    expect(api?.greet()).toBe('hello')
  })
})

// ============================================================
// 2. loadPlugin
// ============================================================
function makeManifest(overrides: Partial<PluginManifest> = {}): PluginManifest {
  return {
    meta: {
      id: 'test-plugin',
      name: '测试插件',
      version: '1.0.0',
      description: '测试用',
      tier: 'community',
      category: 'other',
      icon: '🧪',
    },
    permissions: ['read_sessions'],
    sandbox: { isolateFS: true, isolateNetwork: true, isolateDOM: true },
    entry: 'test:plugin',
    hooks: [],
    ...overrides,
  }
}

describe('loadPlugin', () => {
  it('成功加载插件', async () => {
    const manifest = makeManifest()
    const runtime = await loadPlugin(manifest)

    expect(runtime.id).toBe('test-plugin')
    expect(runtime.name).toBe('测试插件')
    expect(runtime.version).toBe('1.0.0')
    expect(runtime.loaded).toBe(true)
    expect(runtime.enabled).toBe(false)
    expect(runtime.manifest).toBe(manifest)
    expect(runtime.installedAt).toBeDefined()
  })

  it('重复加载抛出错误', async () => {
    const manifest = makeManifest()
    await loadPlugin(manifest)
    await expect(loadPlugin(manifest)).rejects.toThrow('插件 test-plugin 已加载')
  })

  it('official 插件沙箱隔离文件系统和网络', async () => {
    const manifest = makeManifest({
      meta: { ...makeManifest().meta, tier: 'official', id: 'off-plugin' },
    })
    const runtime = await loadPlugin(manifest)
    expect(runtime.sandbox.isolateFS).toBe(true)
    expect(runtime.sandbox.isolateNetwork).toBe(true)
    expect(runtime.sandbox.isolateDOM).toBe(true) // official !== experimental → true
  })

  it('community 插件沙箱不隔离文件系统和网络', async () => {
    const manifest = makeManifest() // community by default
    const runtime = await loadPlugin(manifest)
    expect(runtime.sandbox.isolateFS).toBe(false)
    expect(runtime.sandbox.isolateNetwork).toBe(false)
    expect(runtime.sandbox.isolateDOM).toBe(true) // community !== experimental → true
  })

  it('experimental 插件沙箱不隔离 DOM', async () => {
    const manifest = makeManifest({
      meta: { ...makeManifest().meta, tier: 'experimental', id: 'exp-plugin' },
    })
    const runtime = await loadPlugin(manifest)
    expect(runtime.sandbox.isolateDOM).toBe(false) // experimental === experimental → false
  })

  it('加载后 hooks 为空 Map', async () => {
    const manifest = makeManifest({ hooks: ['onTimerStart', 'onTimerEnd'] })
    const runtime = await loadPlugin(manifest)
    expect(runtime.hooks).toBeInstanceOf(Map)
    expect(runtime.hooks.size).toBe(0)
  })
})

// ============================================================
// 3. unloadPlugin
// ============================================================
describe('unloadPlugin', () => {
  it('卸载已加载的插件', async () => {
    const manifest = makeManifest()
    await loadPlugin(manifest)
    const result = unloadPlugin('test-plugin')
    expect(result).toBe(true)
  })

  it('卸载不存在的插件返回 false', () => {
    expect(unloadPlugin('nonexistent')).toBe(false)
  })

  it('卸载后 getLoadedPlugins 不再包含该插件', async () => {
    const manifest = makeManifest()
    await loadPlugin(manifest)
    expect(getLoadedPlugins()).toHaveLength(1)
    unloadPlugin('test-plugin')
    expect(getLoadedPlugins()).toHaveLength(0)
  })
})

// ============================================================
// 4. getLoadedPlugins
// ============================================================
describe('getLoadedPlugins', () => {
  it('初始为空', () => {
    expect(getLoadedPlugins()).toEqual([])
  })

  it('加载多个插件后返回所有', async () => {
    const m1 = makeManifest({ meta: { ...makeManifest().meta, id: 'p1', name: 'P1' } })
    const m2 = makeManifest({ meta: { ...makeManifest().meta, id: 'p2', name: 'P2' } })
    await loadPlugin(m1)
    await loadPlugin(m2)
    const loaded = getLoadedPlugins()
    expect(loaded).toHaveLength(2)
    expect(loaded.map(p => p.id).sort()).toEqual(['p1', 'p2'])
  })
})

// ============================================================
// 5. hasPluginPermission
// ============================================================
describe('hasPluginPermission', () => {
  it('official 插件拥有所有权限', async () => {
    const manifest = makeManifest({
      meta: { ...makeManifest().meta, tier: 'official', id: 'off-plugin' },
    })
    await loadPlugin(manifest)
    expect(hasPluginPermission('off-plugin', 'network')).toBe(true)
    expect(hasPluginPermission('off-plugin', 'filesystem')).toBe(true)
    expect(hasPluginPermission('off-plugin', 'read:history')).toBe(true)
  })

  it('community 插件按 manifest.permissions 检查', async () => {
    const manifest = makeManifest({
      permissions: ['read_sessions', 'read_notes'],
    })
    await loadPlugin(manifest)
    expect(hasPluginPermission('test-plugin', 'read_sessions')).toBe(true)
    expect(hasPluginPermission('test-plugin', 'read_notes')).toBe(true)
    expect(hasPluginPermission('test-plugin', 'network')).toBe(false)
    expect(hasPluginPermission('test-plugin', 'write:data')).toBe(false)
  })

  it('experimental 插件没有任何权限', async () => {
    const manifest = makeManifest({
      meta: { ...makeManifest().meta, tier: 'experimental', id: 'exp-plugin' },
    })
    await loadPlugin(manifest)
    expect(hasPluginPermission('exp-plugin', 'read_sessions')).toBe(false)
    expect(hasPluginPermission('exp-plugin', 'read:current')).toBe(false)
  })

  it('不存在的插件返回 false', () => {
    expect(hasPluginPermission('nonexistent', 'read:current')).toBe(false)
  })
})

// ============================================================
// 6. createExternalManifest
// ============================================================
describe('createExternalManifest', () => {
  it('创建社区插件 manifest', () => {
    const manifest = createExternalManifest(
      'ext-1',
      '外部插件',
      '2.0.0',
      '一个外部插件',
      '作者名',
    )

    expect(manifest.meta.id).toBe('ext-1')
    expect(manifest.meta.name).toBe('外部插件')
    expect(manifest.meta.version).toBe('2.0.0')
    expect(manifest.meta.description).toBe('一个外部插件')
    expect(manifest.meta.author).toBe('作者名')
    expect(manifest.meta.tier).toBe('community')
    expect(manifest.meta.category).toBe('other')
    expect(manifest.meta.icon).toBe('🧩')
    expect(manifest.permissions).toEqual(['read_sessions', 'read_notes'])
    expect(manifest.sandbox).toEqual({ isolateFS: true, isolateNetwork: true, isolateDOM: true })
    expect(manifest.entry).toBe('')
    expect(manifest.hooks).toEqual([])
  })
})