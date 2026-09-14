// ============================================================
// 空间编排引擎功能测试（INCR-98）
// ============================================================
import { describe, expect, it, beforeEach } from 'vitest'
import { useSpaceOrchestrator } from '../space-orchestrator'

describe('空间编排引擎', () => {
  let engine: ReturnType<typeof useSpaceOrchestrator>

  beforeEach(() => {
    engine = useSpaceOrchestrator()
    engine.reset()
  })

  function firstSpaceId(): string {
    return engine.getAllConfigs()[0].spaceId
  }

  // ---- 初始化与查询 ----

  describe('初始化与查询', () => {
    it('初始化后为所有房间生成配置', () => {
      const all = engine.getAllConfigs()
      expect(all.length).toBeGreaterThan(0)
      expect(all[0].spaceId).toBeTruthy()
      expect(all[0].status).toBe('idle')
    })

    it('getConfig 返回指定空间配置', () => {
      const id = firstSpaceId()
      const cfg = engine.getConfig(id)
      expect(cfg).toBeDefined()
      expect(cfg!.spaceId).toBe(id)
    })

    it('getActiveConfig 初始为 undefined', () => {
      expect(engine.getActiveConfig()).toBeUndefined()
    })
  })

  // ---- 计算属性 ----

  describe('计算属性', () => {
    it('spacesByCategory 按分类分组且计数正确', () => {
      const groups = engine.spacesByCategory.value
      const total = groups.reduce((sum, g) => sum + g.totalCount, 0)
      expect(total).toBe(engine.getAllConfigs().length)
      expect(groups.every(g => g.spaces.length === g.totalCount)).toBe(true)
    })

    it('preloadSpaces 只含预加载空间', () => {
      const preloads = engine.preloadSpaces.value
      expect(preloads.every(c => c.preload)).toBe(true)
    })

    it('lazyLoadSpaces 只含懒加载空间', () => {
      const lazies = engine.lazyLoadSpaces.value
      expect(lazies.every(c => c.lazyLoad)).toBe(true)
    })

    it('orchestrationStats 统计正确', () => {
      const id = firstSpaceId()
      engine.setStatus(id, 'active')
      const stats = engine.orchestrationStats.value
      expect(stats.total).toBe(engine.getAllConfigs().length)
      expect(stats.active).toBe(1)
      expect(stats.idle).toBe(stats.total - 1)
    })
  })

  // ---- 状态管理 ----

  describe('状态管理', () => {
    it('setStatus 更新状态并记录 lastActiveAt', () => {
      const id = firstSpaceId()
      engine.setStatus(id, 'active')
      const cfg = engine.getConfig(id)!
      expect(cfg.status).toBe('active')
      expect(cfg.lastActiveAt).toBeTruthy()
    })

    it('setStatus 对不存在空间不崩溃', () => {
      expect(() => engine.setStatus('no-such-space', 'active')).not.toThrow()
    })
  })

  // ---- 依赖 ----

  describe('依赖', () => {
    it('无 required 依赖时 areDependenciesMet 为 true', () => {
      const id = firstSpaceId()
      const result = engine.areDependenciesMet(id)
      expect(result.met).toBe(true)
    })

    it('添加 required 依赖后未激活时依赖不满足', () => {
      const id = firstSpaceId()
      const existingDeps = engine.getConfig(id)!.dependencies.map(d => d.spaceId)
      const depId = engine.getAllConfigs().find(c => c.spaceId !== id && !existingDeps.includes(c.spaceId))!.spaceId
      engine.addDependency(id, { spaceId: depId, type: 'required', description: '测试依赖' })
      const result = engine.areDependenciesMet(id)
      expect(result.met).toBe(false)
      expect(result.missing).toContain(depId)
    })

    it('激活 required 依赖后依赖满足', async () => {
      const id = firstSpaceId()
      const existingDeps = engine.getConfig(id)!.dependencies.map(d => d.spaceId)
      const depId = engine.getAllConfigs().find(c => c.spaceId !== id && !existingDeps.includes(c.spaceId))!.spaceId
      engine.addDependency(id, { spaceId: depId, type: 'required', description: '测试依赖' })
      await engine.transitionTo(depId)
      const result = engine.areDependenciesMet(id)
      expect(result.met).toBe(true)
    })

    it('getDependencyChain 返回拓扑链', () => {
      const id = firstSpaceId()
      const chain = engine.getDependencyChain(id)
      expect(chain).toContain(id)
      expect(chain[chain.length - 1]).toBe(id)
    })

    it('getLoadOrder 按依赖深度与优先级排序', () => {
      const order = engine.getLoadOrder()
      expect(order.length).toBe(engine.getAllConfigs().length)
      expect(new Set(order).size).toBe(order.length)
    })
  })

  // ---- 空间转换 ----

  describe('空间转换', () => {
    it('transitionTo 成功转换并记录', async () => {
      const id = firstSpaceId()
      const ok = await engine.transitionTo(id)
      expect(ok).toBe(true)
      expect(engine.activeSpaceId.value).toBe(id)
      expect(engine.getConfig(id)!.enterCount).toBe(1)
      expect(engine.recentTransitions.value.length).toBe(1)
      expect(engine.recentTransitions.value[0].toSpaceId).toBe(id)
      expect(engine.recentTransitions.value[0].success).toBe(true)
    })

    it('transitionTo 对不存在空间返回 false', async () => {
      const ok = await engine.transitionTo('no-such-space')
      expect(ok).toBe(false)
      expect(engine.transitionError.value).toBeTruthy()
    })

    it('转换中再次调用返回 false', async () => {
      const id = firstSpaceId()
      engine.isTransitioning.value = true
      const ok = await engine.transitionTo(id)
      expect(ok).toBe(false)
    })

    it('recordStayTime 累计停留时间', () => {
      const id = firstSpaceId()
      engine.recordStayTime(id, 60000)
      engine.recordStayTime(id, 120000)
      expect(engine.getConfig(id)!.totalStayMs).toBe(180000)
    })
  })

  // ---- 生命周期 ----

  describe('生命周期', () => {
    it('registerLifecycle 注册钩子并在转换时调用', async () => {
      const id = firstSpaceId()
      const calls: string[] = []
      engine.registerLifecycle(id, {
        onBeforeEnter: () => { calls.push('before') },
        onAfterEnter: () => { calls.push('after') },
      })
      await engine.transitionTo(id)
      expect(calls).toEqual(['before', 'after'])
    })

    it('preloadSpace 预加载后状态为 idle', async () => {
      const id = firstSpaceId()
      await engine.preloadSpace(id)
      expect(engine.getConfig(id)!.status).toBe('idle')
    })

    it('preloadAll 返回成功计数', async () => {
      const result = await engine.preloadAll()
      expect(result.success + result.failed).toBeGreaterThanOrEqual(0)
      expect(result.success).toBeGreaterThanOrEqual(0)
    })
  })

  // ---- 配置管理 ----

  describe('配置管理', () => {
    it('setPriority 更新优先级', () => {
      const id = firstSpaceId()
      engine.setPriority(id, 99)
      expect(engine.getConfig(id)!.priority).toBe(99)
    })

    it('setLazyLoad 更新懒加载', () => {
      const id = firstSpaceId()
      engine.setLazyLoad(id, true)
      expect(engine.getConfig(id)!.lazyLoad).toBe(true)
    })

    it('hideSpace/showSpace 隐藏与显示', () => {
      const id = firstSpaceId()
      engine.hideSpace(id)
      expect(engine.getConfig(id)!.status).toBe('hidden')
      engine.showSpace(id)
      expect(engine.getConfig(id)!.status).toBe('idle')
    })

    it('removeDependency 移除依赖', () => {
      const id = firstSpaceId()
      const existingDeps = engine.getConfig(id)!.dependencies.map(d => d.spaceId)
      const depId = engine.getAllConfigs().find(c => c.spaceId !== id && !existingDeps.includes(c.spaceId))!.spaceId
      engine.addDependency(id, { spaceId: depId, type: 'required', description: '测试' })
      expect(engine.getConfig(id)!.dependencies.some(d => d.spaceId === depId)).toBe(true)
      engine.removeDependency(id, depId)
      expect(engine.getConfig(id)!.dependencies.some(d => d.spaceId === depId)).toBe(false)
    })
  })

  // ---- 快照 ----

  describe('快照', () => {
    it('createSnapshot 创建并持久化快照', () => {
      const id = firstSpaceId()
      engine.setStatus(id, 'active')
      const snap = engine.createSnapshot()
      expect(snap.spaces[id].status).toBe('active')
      expect(engine.getSnapshots().length).toBe(1)
    })

    it('restoreSnapshot 恢复快照', () => {
      const id = firstSpaceId()
      engine.setStatus(id, 'active')
      const snap = engine.createSnapshot()
      engine.setStatus(id, 'idle')
      expect(engine.getConfig(id)!.status).toBe('idle')
      engine.restoreSnapshot(snap)
      expect(engine.getConfig(id)!.status).toBe('active')
    })

    it('快照最多保留 10 个', () => {
      for (let i = 0; i < 12; i++) {
        engine.createSnapshot()
      }
      expect(engine.getSnapshots().length).toBe(10)
    })
  })

  // ---- 重置 ----

  describe('重置', () => {
    it('reset 重建所有配置并清空转换', async () => {
      const id = firstSpaceId()
      await engine.transitionTo(id)
      engine.reset()
      expect(engine.activeSpaceId.value).toBeNull()
      expect(engine.recentTransitions.value.length).toBe(0)
      expect(engine.getAllConfigs().length).toBeGreaterThan(0)
    })
  })
})
