// ============================================================
// 插件沙箱 · 运行时接线层 测试
// ============================================================
import { describe, expect, it, beforeEach, vi } from 'vitest'

// 沙箱引擎使用全局单例（sandboxIsolator / runtimeGuard），
// 运行时接线复用单例，故测试直接基于真实单例 + 显式重置沙箱集合。
import { sandboxIsolator, runtimeGuard } from '../sandbox'
import type { PluginManifest } from '../types'
import {
  PluginSandboxRuntime,
  recommendSandboxTier,
  pluginPermissionsToSandbox,
  TIER_TO_SANDBOX,
} from '../sandbox/runtime-wiring'

// 无 storage 依赖，注入空读取源前先 mock 以防 engine 触发副作用
vi.mock('../../../engine/storage', () => ({
  storage: { getKV: () => '', setKV: () => {} },
}))

function makeManifest(over: Partial<PluginManifest> = {}): PluginManifest {
  return {
    meta: {
      id: 'demo-sandbox-plugin',
      name: '沙箱测试插件',
      version: '1.0.0',
      description: '单元测试',
      author: '心流工坊',
      tier: 'community',
      category: 'other',
      icon: '🧪',
    },
    permissions: ['read:current', 'write:data'],
    sandbox: { isolateFS: true, isolateNetwork: true, isolateDOM: true },
    entry: 'community:demo',
    hooks: [],
    ...over,
  }
}

let plugins: any[]

/** 在测试间清理沙箱单例状态 */
function resetSandboxState() {
  for (const env of sandboxIsolator.getAllSandboxes()) {
    sandboxIsolator.destroySandbox(env.id)
  }
  runtimeGuard.reset()
}

describe('recommendSandboxTier 分级映射', () => {
  it('official→L2 / community→L1 / experimental→L0', () => {
    expect(recommendSandboxTier('official')).toBe('L2')
    expect(recommendSandboxTier('community')).toBe('L1')
    expect(recommendSandboxTier('experimental')).toBe('L0')
    expect(recommendSandboxTier('unknown')).toBe('L1')
  })

  it('TIER_TO_SANDBOX 常量完整覆盖三分级', () => {
    expect(TIER_TO_SANDBOX['official']).toBe('L2')
    expect(TIER_TO_SANDBOX['community']).toBe('L1')
    expect(TIER_TO_SANDBOX['experimental']).toBe('L0')
  })
})

describe('pluginPermissionsToSandbox 权限映射', () => {
  it('read:current → context/session 读取', () => {
    const sp = pluginPermissionsToSandbox(['read:current'])
    expect(sp).toContain('context:read')
    expect(sp).toContain('session:read')
  })

  it('write:data 展开读写，network 展开网络访问', () => {
    const sp = pluginPermissionsToSandbox(['write:data', 'network'])
    expect(sp).toContain('data:write')
    expect(sp).toContain('data:read')
    expect(sp).toContain('network:access')
  })

  it('去重：重复声明不产生重复沙箱权限', () => {
    const sp = pluginPermissionsToSandbox(['read:current', 'read:current'])
    expect(new Set(sp).size).toBe(sp.length)
  })
})

describe('PluginSandboxRuntime 运行时接线', () => {
  beforeEach(() => {
    resetSandboxState()
    plugins = [
      {
        id: 'core-timer',
        name: '基础计时',
        manifest: {
          ...makeManifest(),
          meta: { ...makeManifest().meta, id: 'core-timer', name: '基础计时', tier: 'official', icon: '⏱️' },
        },
        enabled: true,
        granted: ['read:current', 'write:data'],
      },
      {
        id: 'community-x',
        name: '社区插件',
        manifest: makeManifest({
          meta: { ...makeManifest().meta, id: 'community-x', name: '社区插件' },
        }),
        enabled: false,
        granted: ['read:current'],
      },
    ]
  })

  it('enable 为插件创建激活沙箱，并按分级推荐等级', () => {
    const wiring = new PluginSandboxRuntime(() => plugins)
    expect(wiring.enable('core-timer')).toBe(true)

    const env = sandboxIsolator.getSandboxByPlugin('core-timer')
    expect(env).toBeDefined()
    expect(env!.active).toBe(true)
    expect(env!.tier).toBe('L2') // official
  })

  it('enable 未知插件返回 false，不产生沙箱', () => {
    const wiring = new PluginSandboxRuntime(() => plugins)
    expect(wiring.enable('no-such')).toBe(false)
    expect(sandboxIsolator.getAllSandboxes().length).toBe(0)
  })

  it('install 按 manifest 创建沙箱并激活', () => {
    const wiring = new PluginSandboxRuntime(() => plugins)
    const manifest = makeManifest({
      meta: { ...makeManifest().meta, id: 'fresh-plugin' },
    })
    expect(wiring.install(manifest)).toBe(true)
    const env = sandboxIsolator.getSandboxByPlugin('fresh-plugin')
    expect(env).toBeDefined()
    expect(env!.active).toBe(true)
    expect(env!.tier).toBe('L1') // community
  })

  it('uninstall 销毁对应沙箱', () => {
    const wiring = new PluginSandboxRuntime(() => plugins)
    wiring.install(makeManifest())
    expect(sandboxIsolator.getSandboxByPlugin('demo-sandbox-plugin')).toBeDefined()
    expect(wiring.uninstall('demo-sandbox-plugin')).toBe(true)
    expect(sandboxIsolator.getSandboxByPlugin('demo-sandbox-plugin')).toBeUndefined()
  })

  it('disable 将活跃沙箱置为休眠（保留审计）', () => {
    const wiring = new PluginSandboxRuntime(() => plugins)
    wiring.enable('core-timer')
    expect(wiring.disable('core-timer')).toBe(true)
    const env = sandboxIsolator.getSandboxByPlugin('core-timer')
    expect(env).toBeDefined()
    expect(env!.active).toBe(false)
  })

  it('runGuarded：沙箱存在且活跃时记录 API 调用', () => {
    const wiring = new PluginSandboxRuntime(() => plugins)
    wiring.enable('core-timer')

    const res = wiring.runGuarded('core-timer', 'start-focus')
    expect(res.ok).toBe(true)
    expect(res.reason).toBe('allowed')

    // 沙箱自带的 API 调用计数被更新
    const env = sandboxIsolator.getSandboxByPlugin('core-timer')
    expect(env!.apiCallCount.get('start-focus')).toBe(1)
  })

  it('runGuarded：沙箱未创建 / 未激活时拒绝', () => {
    const wiring = new PluginSandboxRuntime(() => plugins)
    // 未创建
    expect(wiring.runGuarded('core-timer', 'x').ok).toBe(false)
    // 已创建但停用
    wiring.enable('core-timer')
    wiring.disable('core-timer')
    expect(wiring.runGuarded('core-timer', 'x').reason).toBe('sandbox-inactive')
  })

  it('runGuarded：执行体抛错时返回 error', () => {
    const wiring = new PluginSandboxRuntime(() => plugins)
    wiring.enable('core-timer')
    const res = wiring.runGuarded('core-timer', 'boom', () => { throw new Error('runtime error') })
    expect(res.ok).toBe(false)
    expect(res.reason).toBe('error')
    expect(res.error).toContain('runtime error')
  })

  it('getSnapshot 聚合运行时信息（含等级分布/违规/降级/行明细）', () => {
    const wiring = new PluginSandboxRuntime(() => plugins)
    wiring.enable('core-timer')
    wiring.enable('core-timer') // 幂等不重复计数

    const snap = wiring.getSnapshot()
    expect(snap.totalSandboxes).toBe(1)
    expect(snap.activeSandboxes).toBe(1)
    expect(snap.tierDistribution.L2).toBe(1)
    expect(snap.tierDistribution.L1).toBe(0)
    expect(snap.guardRunning).toBe(false)

    const row = snap.rows.find(r => r.pluginId === 'core-timer')
    expect(row!.sandboxTier).toBe('L2')
    expect(row!.recommendedTier).toBe('L2')
    expect(row!.active).toBe(true)
    expect(row!.grantedPermissions).toBeGreaterThan(0)
  })

  it('getSnapshot 对未启用插件给出 recommendedTier 与未创建状态', () => {
    const wiring = new PluginSandboxRuntime(() => plugins)
    const snap = wiring.getSnapshot()
    const row = snap.rows.find(r => r.pluginId === 'community-x')
    expect(row!.recommendedTier).toBe('L1')
    expect(row!.sandboxTier).toBeNull()
    expect(row!.active).toBe(false)
  })

  it('startGuard / stopGuard 幂等控制守卫运行状态', () => {
    const wiring = new PluginSandboxRuntime(() => plugins)
    expect(wiring.startGuard()).toBe(true)
    expect(wiring.guardRunning).toBe(true)
    // 幂等
    expect(wiring.startGuard()).toBe(true)
    wiring.stopGuard()
    expect(wiring.guardRunning).toBe(false)
  })
})