// ============================================================
// 插件能力 API 文档数据源测试
// 验证 getCapabilityApiDocs() 从真实常量派生的七段文档结构：
// 权限模型 / 沙箱三级模型 / 分级映射 / 能力 API 引用 / 门控流程 /
// Manifest 规范 / 实时可用能力。
// ============================================================
import { describe, expect, it, beforeEach } from 'vitest'

import { createMockStorage } from '../../../engine/storage/__tests__/test-utils'

async function freshEnv(): Promise<void> {
  ;(globalThis as any).localStorage = createMockStorage()
  const { invalidateCache } = await import('../../../engine/storage/core')
  invalidateCache()
}

async function getDocs() {
  const { getCapabilityApiDocs } = await import('../capability-docs')
  return getCapabilityApiDocs()
}

describe('插件能力 API 文档数据源', () => {
  beforeEach(async () => {
    await freshEnv()
  })

  it('聚合完整文档结构：七段数据齐全', async () => {
    const docs = await getDocs()
    expect(docs.permissionModel.length).toBe(8)
    expect(docs.sandboxModel.length).toBe(3)
    expect(docs.tierMapping.length).toBe(3)
    expect(docs.capabilityApis.length).toBeGreaterThanOrEqual(7)
    expect(docs.runtimeGates.length).toBe(7)
    expect(docs.manifestSpec.length).toBeGreaterThanOrEqual(6)
    expect(Array.isArray(docs.liveCapabilities)).toBe(true)
  })

  it('权限模型派生真实沙箱权限：read:current → context/session 读，最低 L0', async () => {
    const docs = await getDocs()
    const row = docs.permissionModel.find(p => p.permission === 'read:current')
    expect(row).toBeDefined()
    expect(row!.label).toContain('读取当前上下文')
    expect(row!.sandboxPermissions).toContain('context:read')
    expect(row!.sandboxPermissions).toContain('session:read')
    expect(row!.requiredTier).toBe('L0')
  })

  it('network 权限映射 network:access 且最低要求 L2，filesystem 映射 file 读写', async () => {
    const docs = await getDocs()
    const net = docs.permissionModel.find(p => p.permission === 'network')
    expect(net!.sandboxPermissions).toEqual(['network:access'])
    expect(net!.requiredTier).toBe('L2')

    const fs = docs.permissionModel.find(p => p.permission === 'filesystem')
    expect(fs!.sandboxPermissions).toContain('file:read')
    expect(fs!.sandboxPermissions).toContain('file:write')
    expect(fs!.requiredTier).toBe('L2')

    const write = docs.permissionModel.find(p => p.permission === 'write:data')
    expect(write!.requiredTier).toBe('L1')
  })

  it('沙箱三级模型：L2 权限集超集 L1 超集 L0，资源限制递增', async () => {
    const docs = await getDocs()
    const [l0, l1, l2] = docs.sandboxModel
    expect(l0.tier).toBe('L0')
    expect(l1.tier).toBe('L1')
    expect(l2.tier).toBe('L2')
    // 累进权限集
    expect(l2.permissions.length).toBeGreaterThan(l1.permissions.length)
    expect(l1.permissions.length).toBeGreaterThan(l0.permissions.length)
    // 资源限制递增（内存上限）
    expect(l1.limits.maxMemoryMB).toBeGreaterThan(l0.limits.maxMemoryMB)
    expect(l2.limits.maxMemoryMB).toBeGreaterThan(l1.limits.maxMemoryMB)
    expect(l0.label).toContain('只读')
  })

  it('分级映射 official→L2 / community→L1 / experimental→L0', async () => {
    const docs = await getDocs()
    const map = Object.fromEntries(docs.tierMapping.map(t => [t.pluginTier, t.sandboxTier]))
    expect(map.official).toBe('L2')
    expect(map.community).toBe('L1')
    expect(map.experimental).toBe('L0')
  })

  it('能力 API 引用覆盖可调用面并绑定真实签名', async () => {
    const docs = await getDocs()
    const names = docs.capabilityApis.map(a => a.name)
    expect(names.some(n => n.includes('invokePluginCapability'))).toBe(true)
    expect(names.some(n => n.includes('registerPluginCapability'))).toBe(true)
    expect(names.some(n => n.includes('runGuarded'))).toBe(true)
    expect(names.some(n => n.includes('startGuard'))).toBe(true)
    // 每个条目含签名与说明
    for (const api of docs.capabilityApis) {
      expect(api.signature.length).toBeGreaterThan(0)
      expect(api.description.length).toBeGreaterThan(0)
    }
  })

  it('门控流程包含权杖门控与沙箱守卫前置，顺序 1..7', async () => {
    const docs = await getDocs()
    expect(docs.runtimeGates.map(g => g.order)).toEqual([1, 2, 3, 4, 5, 6, 7])
    const reasons = docs.runtimeGates.map(g => g.failReason)
    expect(reasons).toContain('permission-denied')
    expect(reasons).toContain('plugin-disabled')
    expect(reasons).toContain('sandbox-not-created')
    expect(reasons).toContain('sandbox-inactive')
    expect(reasons).toContain('impl-missing')
  })

  it('Manifest 规范列出核心字段与可选能力/贡献点', async () => {
    const docs = await getDocs()
    const spec = Object.fromEntries(docs.manifestSpec.map(f => [f.field, f]))
    expect(spec.meta).toBeDefined()
    expect(spec.permissions.required).toBe(true)
    expect(spec.capabilities.required).toBe(false)
    expect(spec['contributes.rooms'].required).toBe(false)
  })

  it('实时可用能力包含内置核心能力且结构完整', async () => {
    const docs = await getDocs()
    const ids = docs.liveCapabilities.map(c => `${c.pluginId}:${c.capability.id}`)
    expect(ids).toContain('core-timer:start-focus')
    expect(ids).toContain('core-timer:start-rest')
    expect(ids).toContain('core-crystal:crystal-stats')
    expect(ids).toContain('core-constitution:lookup-article')
    for (const c of docs.liveCapabilities) {
      expect(c.pluginId).toBeTruthy()
      expect(c.pluginName).toBeTruthy()
      expect(c.pluginTier).toBeTruthy()
      expect(c.capability.id).toBeTruthy()
      expect(c.capability.keywords.length).toBeGreaterThan(0)
      expect(c.capability.permission).toBeTruthy()
    }
  })
})