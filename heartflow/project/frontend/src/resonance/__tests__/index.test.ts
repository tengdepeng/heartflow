// ============================================================
// 共鸣协议层 · 测试
// 测试注册表、模块发现、依赖检查等核心机制
// ============================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useResonance, defineModule, success, failure } from '../index'
import type { ModuleIdentity, InterfaceType, IResonanceProtocol } from '../types'

describe('共鸣协议层 · 注册表', () => {
  let resonance: IResonanceProtocol

  beforeEach(() => {
    resonance = useResonance()
    resonance.initialize()
  })

  afterEach(() => {
    resonance.destroy()
  })

  // ========== 模块注册 ==========

  it('register: 注册一个模块应返回 success', () => {
    const mod: ModuleIdentity = {
      id: 'test-module',
      name: '测试模块',
      version: '1.0.0',
      description: '用于测试的模块',
      provides: ['capability'],
      requires: [],
    }
    const result = resonance.register(mod, {})
    expect(result.success).toBe(true)
  })

  it('register: 重复注册同一模块应返回 failure', () => {
    const mod: ModuleIdentity = {
      id: 'dup-module',
      name: '重复模块',
      version: '1.0.0',
      description: '',
      provides: ['capability'],
      requires: [],
    }
    resonance.register(mod, {})
    const result = resonance.register(mod, {})
    expect(result.success).toBe(false)
    expect(result.error).toContain('已注册')
  })

  it('register: 依赖不满足时应返回 failure', () => {
    const mod: ModuleIdentity = {
      id: 'dependent-module',
      name: '依赖模块',
      version: '1.0.0',
      description: '',
      provides: [],
      requires: ['ai'], // AI 接口尚无提供者
    }
    const result = resonance.register(mod, {})
    expect(result.success).toBe(false)
    expect(result.error).toContain('依赖')
  })

  it('register: 依赖满足时应注册成功', () => {
    // 先注册一个提供 AI 接口的模块
    const provider: ModuleIdentity = {
      id: 'ai-provider',
      name: 'AI 提供商',
      version: '1.0.0',
      description: '',
      provides: ['ai'],
      requires: [],
    }
    resonance.register(provider, {})

    // 再注册依赖 AI 的模块
    const consumer: ModuleIdentity = {
      id: 'ai-consumer',
      name: 'AI 消费者',
      version: '1.0.0',
      description: '',
      provides: [],
      requires: ['ai'],
    }
    const result = resonance.register(consumer, {})
    expect(result.success).toBe(true)
  })

  // ========== 注销 ==========

  it('unregister: 注销已注册的模块', () => {
    const mod: ModuleIdentity = {
      id: 'to-unregister',
      name: '待注销',
      version: '1.0.0',
      description: '',
      provides: [],
      requires: [],
    }
    resonance.register(mod, {})
    expect(resonance.isRegistered('to-unregister')).toBe(true)

    const result = resonance.unregister('to-unregister')
    expect(result.success).toBe(true)
    expect(resonance.isRegistered('to-unregister')).toBe(false)
  })

  it('unregister: 注销不存在的模块应返回 failure', () => {
    const result = resonance.unregister('nonexistent')
    expect(result.success).toBe(false)
  })

  // ========== 模块发现 ==========

  it('findById: 按 ID 查找已注册模块', () => {
    const mod: ModuleIdentity = {
      id: 'find-me',
      name: '找到我',
      version: '1.0.0',
      description: '模块描述',
      provides: ['interaction', 'capability'],
      requires: [],
    }
    resonance.register(mod, {})

    const found = resonance.findById('find-me')
    expect(found).toBeDefined()
    expect(found!.identity.name).toBe('找到我')
    expect(found!.identity.provides).toEqual(['interaction', 'capability'])
  })

  it('findById: 查找不存在的模块应返回 undefined', () => {
    const found = resonance.findById('does-not-exist')
    expect(found).toBeUndefined()
  })

  it('findByInterface: 按接口类型查找', () => {
    const mod1: ModuleIdentity = {
      id: 'interaction-mod',
      name: '交互模块',
      version: '1.0.0', description: '', provides: ['interaction'], requires: [],
    }
    const mod2: ModuleIdentity = {
      id: 'capability-mod',
      name: '能力模块',
      version: '1.0.0', description: '', provides: ['capability'], requires: [],
    }
    const mod3: ModuleIdentity = {
      id: 'both-mod',
      name: '两者都提供',
      version: '1.0.0', description: '', provides: ['interaction', 'capability'], requires: [],
    }
    resonance.register(mod1, {})
    resonance.register(mod2, {})
    resonance.register(mod3, {})

    const interactionModules = resonance.findByInterface('interaction')
    expect(interactionModules).toHaveLength(2)
    expect(interactionModules.map(m => m.identity.id)).toContain('interaction-mod')
    expect(interactionModules.map(m => m.identity.id)).toContain('both-mod')
  })

  it('query: 按过滤器查询', () => {
    const mod1: ModuleIdentity = {
      id: 'timer-module',
      name: '计时器',
      version: '1.0.0', description: '专注计时功能', provides: ['capability'], requires: [],
    }
    const mod2: ModuleIdentity = {
      id: 'ai-module',
      name: 'AI 引擎',
      version: '1.0.0', description: 'AI 对话能力', provides: ['ai'], requires: [],
    }
    resonance.register(mod1, {})
    resonance.register(mod2, {})

    // 按名称关键词搜索
    const results = resonance.query({ nameKeyword: '计时' })
    expect(results).toHaveLength(1)
    expect(results[0].identity.id).toBe('timer-module')
  })

  it('getAll: 返回所有已注册模块', () => {
    expect(resonance.getAll()).toHaveLength(0)

    resonance.register({
      id: 'a', name: 'A', version: '1.0.0', description: '', provides: [], requires: [],
    }, {})
    resonance.register({
      id: 'b', name: 'B', version: '1.0.0', description: '', provides: [], requires: [],
    }, {})

    expect(resonance.getAll()).toHaveLength(2)
  })

  // ========== 状态查询 ==========

  it('getState: 返回正确的注册表状态', () => {
    const state = resonance.getState()
    expect(state.moduleCount).toBe(0)
    expect(state.activeModuleCount).toBe(0)
    expect(state.initialized).toBe(true)

    resonance.register({
      id: 'm1', name: 'M1', version: '1.0.0', description: '',
      provides: ['interaction', 'capability'], requires: [],
    }, {})
    resonance.register({
      id: 'm2', name: 'M2', version: '1.0.0', description: '',
      provides: ['ai', 'knowledge'], requires: [],
    }, {})

    const updatedState = resonance.getState()
    expect(updatedState.moduleCount).toBe(2)
    expect(updatedState.activeModuleCount).toBe(2)
    expect(updatedState.interfaceCounts.interaction).toBe(1)
    expect(updatedState.interfaceCounts.ai).toBe(1)
    expect(updatedState.interfaceCounts.capability).toBe(1)
    expect(updatedState.interfaceCounts.knowledge).toBe(1)
    expect(updatedState.interfaceCounts.automation).toBe(0)
    expect(updatedState.lastRegisteredAt).toBeGreaterThan(0)
  })

  it('isInterfaceAvailable: 检查接口是否可用', () => {
    expect(resonance.isInterfaceAvailable('interaction')).toBe(false)

    resonance.register({
      id: 'interaction-mod', name: '交互', version: '1.0.0', description: '',
      provides: ['interaction'], requires: [],
    }, {})

    expect(resonance.isInterfaceAvailable('interaction')).toBe(true)
  })

  it('isRegistered: 检查模块是否已注册', () => {
    expect(resonance.isRegistered('test')).toBe(false)

    resonance.register({
      id: 'test', name: 'Test', version: '1.0.0', description: '', provides: [], requires: [],
    }, {})

    expect(resonance.isRegistered('test')).toBe(true)
  })

  // ========== 状态更新 ==========

  it('updateStatus: 更新模块状态', () => {
    resonance.register({
      id: 'status-mod', name: '状态模块', version: '1.0.0', description: '',
      provides: [], requires: [],
    }, {})

    const result = resonance.updateStatus('status-mod', 'error', '发生错误')
    expect(result.success).toBe(true)

    const mod = resonance.findById('status-mod')
    expect(mod!.status).toBe('error')
    expect(mod!.error).toBe('发生错误')
  })

  it('updateStatus: 更新不存在的模块应返回 failure', () => {
    const result = resonance.updateStatus('nonexistent', 'error')
    expect(result.success).toBe(false)
  })

  // ========== 非活跃模块不影响发现 ==========

  it('findByInterface: 非活跃模块不应出现在结果中', () => {
    resonance.register({
      id: 'inactive-mod', name: '非活跃', version: '1.0.0', description: '',
      provides: ['interaction'], requires: [],
    }, {})
    resonance.updateStatus('inactive-mod', 'inactive')

    const results = resonance.findByInterface('interaction')
    expect(results).toHaveLength(0)
  })

  // ========== 生命周期 ==========

  it('destroy: 销毁后所有模块清空', () => {
    resonance.register({
      id: 'temp', name: 'Temp', version: '1.0.0', description: '', provides: [], requires: [],
    }, {})

    resonance.destroy()
    expect(resonance.getAll()).toHaveLength(0)
    expect(resonance.getState().initialized).toBe(false)
  })
})

describe('共鸣协议层 · 辅助函数', () => {
  it('defineModule: 创建模块标识', () => {
    const mod = defineModule({
      id: 'my-module',
      name: '我的模块',
      version: '2.0.0',
      description: '这是一个测试模块',
      provides: ['capability', 'ai'],
      requires: ['data-transfer'],
    })

    expect(mod.id).toBe('my-module')
    expect(mod.name).toBe('我的模块')
    expect(mod.version).toBe('2.0.0')
    expect(mod.description).toBe('这是一个测试模块')
    expect(mod.provides).toEqual(['capability', 'ai'])
    expect(mod.requires).toEqual(['data-transfer'])
  })

  it('defineModule: 使用默认值', () => {
    const mod = defineModule({ id: 'minimal', name: '最小模块' })
    expect(mod.id).toBe('minimal')
    expect(mod.version).toBe('1.0.0')
    expect(mod.provides).toEqual([])
    expect(mod.requires).toEqual([])
  })

  it('success: 创建成功响应', () => {
    const result = success({ key: 'value' })
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ key: 'value' })
  })

  it('success: 无数据', () => {
    const result = success()
    expect(result.success).toBe(true)
    expect(result.data).toBeUndefined()
  })

  it('failure: 创建失败响应', () => {
    const result = failure('出错了')
    expect(result.success).toBe(false)
    expect(result.error).toBe('出错了')
  })
})

describe('共鸣协议层 · 8 类接口类型完整性', () => {
  it('所有 8 类接口类型定义完整', () => {
    const allTypes: InterfaceType[] = [
      'interaction',
      'capability',
      'ai',
      'knowledge',
      'data-transfer',
      'automation',
      'thread',
      'extension',
    ]
    expect(allTypes).toHaveLength(8)
  })

  it('注册表可正确统计所有接口类型', () => {
    const resonance = useResonance()
    resonance.initialize()

    // 注册一个提供所有接口的模块
    resonance.register({
      id: 'all-provider',
      name: '全能提供者',
      version: '1.0.0',
      description: '',
      provides: ['interaction', 'capability', 'ai', 'knowledge',
        'data-transfer', 'automation', 'thread', 'extension'],
      requires: [],
    }, {})

    const state = resonance.getState()
    expect(state.interfaceCounts.interaction).toBe(1)
    expect(state.interfaceCounts.capability).toBe(1)
    expect(state.interfaceCounts.ai).toBe(1)
    expect(state.interfaceCounts.knowledge).toBe(1)
    expect(state.interfaceCounts['data-transfer']).toBe(1)
    expect(state.interfaceCounts.automation).toBe(1)
    expect(state.interfaceCounts.thread).toBe(1)
    expect(state.interfaceCounts.extension).toBe(1)

    resonance.destroy()
  })
})