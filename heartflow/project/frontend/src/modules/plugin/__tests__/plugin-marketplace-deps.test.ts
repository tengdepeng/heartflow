// ============================================================
// 插件市场 依赖解析引擎 测试（模块级纯函数 + 真实注册表依赖图）
// ============================================================
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../engine/storage', () => ({
  storage: { getKV: () => '', setKV: () => {} },
}))

import { pluginMarketplaceRegistry } from '../plugin-registry'
import {
  resolveDependencies,
  getDependencyTree,
  type DependencyNode,
} from '../plugin-marketplace'

describe('resolveDependencies 依赖解析', () => {
  it('注册表依赖图中的目标依赖均在注册表中可解析', () => {
    const graph = pluginMarketplaceRegistry.getDependencyGraph()
    for (const node of graph) {
      for (const d of node.dependencies) {
        expect(graph.some(g => g.id === d.pluginId), `缺失 ${node.id} → ${d.pluginId}`).toBe(true)
      }
    }
  })

  it('解析「每日回顾」：安装顺序先依赖后自身', () => {
    const res = resolveDependencies(pluginMarketplaceRegistry.getDependencyGraph(), 'community-daily-review')
    expect(res.resolved).toBe(true)
    expect(res.installOrder[0]).toBe('community-pomodoro-stats')
    expect(res.installOrder[res.installOrder.length - 1]).toBe('community-daily-review')
    expect(res.missing).toEqual([])
    expect(res.conflicts).toEqual([])
    expect(res.cycles).toEqual([])
  })

  it('解析「知识卡片」：串联依赖（番茄钟 → 每日回顾 → 知识卡片）', () => {
    const res = resolveDependencies(pluginMarketplaceRegistry.getDependencyGraph(), 'community-knowledge-cards')
    expect(res.resolved).toBe(true)
    const order = res.installOrder
    expect(order.includes('community-pomodoro-stats')).toBe(true)
    expect(order.includes('community-daily-review')).toBe(true)
    expect(order.lastIndexOf('community-knowledge-cards')).toBe(order.length - 1)
  })

  it('无依赖插件的安装顺序仅含自身', () => {
    const res = resolveDependencies(pluginMarketplaceRegistry.getDependencyGraph(), 'community-theme-switcher')
    expect(res.resolved).toBe(true)
    expect(res.installOrder).toEqual(['community-theme-switcher'])
  })

  it('缺失必选依赖时解析失败并记录 missing', () => {
    const graph: DependencyNode[] = [
      { id: 'app', version: '1.0.0', dependencies: [
        { pluginId: 'missing-dep', minVersion: '1.0.0', optional: false, description: '' },
      ] },
    ]
    const res = resolveDependencies(graph, 'app')
    expect(res.resolved).toBe(false)
    expect(res.missing.map(m => m.pluginId)).toEqual(['missing-dep'])
  })

  it('可选依赖缺失不阻塞解析', () => {
    const graph: DependencyNode[] = [
      { id: 'app', version: '1.0.0', dependencies: [
        { pluginId: 'opt-dep', minVersion: '1.0.0', optional: true, description: '' },
      ] },
    ]
    const res = resolveDependencies(graph, 'app')
    expect(res.resolved).toBe(true)
    expect(res.installOrder).toEqual(['app'])
  })

  it('版本不满足时记录版本冲突', () => {
    const graph: DependencyNode[] = [
      { id: 'dep', version: '1.0.0', dependencies: [] },
      { id: 'app', version: '2.0.0', dependencies: [
        { pluginId: 'dep', minVersion: '2.0.0', optional: false, description: '' },
      ] },
    ]
    const res = resolveDependencies(graph, 'app')
    expect(res.resolved).toBe(false)
    expect(res.conflicts).toHaveLength(1)
    expect(res.conflicts[0]).toMatchObject({
      pluginId: 'dep',
      requiredBy: 'app',
      requiredVersion: '2.0.0',
      actualVersion: '1.0.0',
    })
  })

  it('循环依赖被检测', () => {
    const graph: DependencyNode[] = [
      { id: 'a', version: '1.0.0', dependencies: [{ pluginId: 'b', minVersion: '1.0.0', optional: false, description: '' }] },
      { id: 'b', version: '1.0.0', dependencies: [{ pluginId: 'a', minVersion: '1.0.0', optional: false, description: '' }] },
    ]
    const res = resolveDependencies(graph, 'a')
    expect(res.resolved).toBe(false)
    expect(res.cycles.length).toBeGreaterThan(0)
  })
})

describe('getDependencyTree 依赖树', () => {
  it('构建嵌套依赖树', () => {
    const tree = getDependencyTree(pluginMarketplaceRegistry.getDependencyGraph(), 'community-daily-review')
    expect(tree.id).toBe('community-daily-review')
    expect(tree.dependencies[0].id).toBe('community-pomodoro-stats')
    expect(tree.dependencies[0].dependencies).toEqual([])
  })

  it('未注册 ID 返回空树', () => {
    const tree = getDependencyTree(pluginMarketplaceRegistry.getDependencyGraph(), 'no-such-plugin')
    expect(tree).toEqual({ id: 'no-such-plugin', version: '0.0.0', dependencies: [] })
  })
})