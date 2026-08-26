// ============================================================
// Stores 入口 · 测试
// 验证所有 store 导出
// ============================================================

import { describe, expect, it, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'

describe('stores 入口', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    ;(globalThis as any).localStorage = createMockStorage()
    const { invalidateCache } = await import('../../engine/storage/core')
    invalidateCache()
  })

  it('导出所有 store 名称', async () => {
    const stores = await import('../index')
    expect(typeof stores.useTimerStore).toBe('function')
    expect(typeof stores.useConfigStore).toBe('function')
    expect(typeof stores.useConstitutionStore).toBe('function')
    expect(typeof stores.useStyleStore).toBe('function')
    expect(typeof stores.usePluginStore).toBe('function')
    expect(typeof stores.useRuntimeStore).toBe('function')
    expect(typeof stores.useAdvisorStore).toBe('function')
    expect(typeof stores.useTagsStore).toBe('function')
  })

  it('useTimerStore 创建后返回预期状态', async () => {
    const stores = await import('../index')
    const timer = stores.useTimerStore()
    expect(timer.session).toBeDefined()
    expect(timer.session.status).toBe('idle')
    expect(timer.isIdle).toBe(true)
  })

  it('useConfigStore 创建后返回默认配置', async () => {
    const stores = await import('../index')
    const config = stores.useConfigStore()
    expect(config.config).toBeDefined()
    expect(config.config.theme).toBe('dark')
  })

  it('useRuntimeStore 创建后返回预期状态', async () => {
    const stores = await import('../index')
    const runtime = stores.useRuntimeStore()
    expect(runtime.isSanctuaryActive).toBeDefined()
    expect(runtime.isSanctuaryActive).toBe(false)
  })

  it('useConstitutionStore 创建后不报错', async () => {
    const stores = await import('../index')
    const constit = stores.useConstitutionStore()
    expect(constit).toBeDefined()
  })

  it('useStyleStore 创建后不报错', async () => {
    const stores = await import('../index')
    const style = stores.useStyleStore()
    expect(style).toBeDefined()
  })

  it('usePluginStore 创建后不报错', async () => {
    const stores = await import('../index')
    const plugin = stores.usePluginStore()
    expect(plugin).toBeDefined()
  })
})