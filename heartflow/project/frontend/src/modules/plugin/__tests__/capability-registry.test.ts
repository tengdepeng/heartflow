// ============================================================
// 插件能力门控测试
// 验证蓝图 L1912「插件可开关」/ L10612「经能力扩展对话分身」
// 核心断言：同一个能力，插件启用时可调用、禁用/权限回收后即刻失效。
// ============================================================
import { describe, expect, it, beforeEach, vi } from 'vitest'

// 镜我对话依赖 vue-router（navigate 步骤用到），单元测试中桩掉
const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }))
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

import { createMockStorage } from '../../../engine/storage/__tests__/test-utils'

type Registry = Record<string, { enabled: boolean; permissions: string[]; granted?: string[] }>

/** core-timer 的声明权限 */
const TIMER_DECL = ['read:current', 'write:data']

async function freshEnv(): Promise<void> {
  ;(globalThis as any).localStorage = createMockStorage()
  const { invalidateCache } = await import('../../../engine/storage/core')
  invalidateCache()
}

async function setRegistry(reg: Registry): Promise<void> {
  const { setPluginRegistry } = await import('../../../engine/storage/plugin')
  setPluginRegistry(reg)
}

describe('插件能力注册表 · 门控', () => {
  beforeEach(async () => {
    await freshEnv()
    const reg = await import('../capability-registry')
    reg.__resetCapabilityRegistry()
  })

  it('无注册表记录时，core-timer 默认启用且能力在可用清单中', async () => {
    const r = await import('../capability-registry')
    expect(r.resolvePluginState('core-timer').enabled).toBe(true)
    expect(
      r.listAvailableCapabilities().some(
        c => c.pluginId === 'core-timer' && c.capability.id === 'start-focus',
      ),
    ).toBe(true)
  })

  it('插件禁用 → plugin-disabled，且能力从可用清单消失', async () => {
    await setRegistry({
      'core-timer': { enabled: false, permissions: TIMER_DECL, granted: TIMER_DECL },
    })
    const r = await import('../capability-registry')
    r.registerPluginCapability('core-timer', 'start-focus', () => ({ probed: true }))

    const res = r.invokePluginCapability('core-timer', 'start-focus')
    expect(res.ok).toBe(false)
    expect(res.reason).toBe('plugin-disabled')
    expect(r.listAvailableCapabilities().some(c => c.pluginId === 'core-timer')).toBe(false)
  })

  it('权限被回收 → permission-denied', async () => {
    await setRegistry({
      'core-timer': { enabled: true, permissions: TIMER_DECL, granted: ['read:current'] },
    })
    const r = await import('../capability-registry')
    r.registerPluginCapability('core-timer', 'start-focus', () => ({ probed: true }))

    const res = r.invokePluginCapability('core-timer', 'start-focus')
    expect(res.ok).toBe(false)
    expect(res.reason).toBe('permission-denied')
  })

  it('启用且已授权 → 调用成功并返回实现结果', async () => {
    await setRegistry({
      'core-timer': { enabled: true, permissions: TIMER_DECL, granted: TIMER_DECL },
    })
    const r = await import('../capability-registry')
    r.registerPluginCapability('core-timer', 'start-focus', args => ({ echoed: args.duration }))

    const res = r.invokePluginCapability<{ echoed: number }>('core-timer', 'start-focus', {
      duration: 30,
    })
    expect(res.ok).toBe(true)
    expect(res.value?.echoed).toBe(30)
  })

  it('未注册实现 → impl-missing', async () => {
    await setRegistry({
      'core-timer': { enabled: true, permissions: TIMER_DECL, granted: TIMER_DECL },
    })
    const r = await import('../capability-registry')
    const res = r.invokePluginCapability('core-timer', 'start-focus')
    expect(res.ok).toBe(false)
    expect(res.reason).toBe('impl-missing')
  })

  it('未声明能力 → capability-not-found', async () => {
    const r = await import('../capability-registry')
    const res = r.invokePluginCapability('core-timer', 'no-such-capability')
    expect(res.ok).toBe(false)
    expect(res.reason).toBe('capability-not-found')
  })

  it('关键词命中能力；插件禁用后同一句话不再命中', async () => {
    const r = await import('../capability-registry')
    expect(r.findCapabilityByKeyword('我想开始专注')?.capability.id).toBe('start-focus')

    await setRegistry({
      'core-timer': { enabled: false, permissions: TIMER_DECL, granted: TIMER_DECL },
    })
    expect(r.findCapabilityByKeyword('我想开始专注')).toBeNull()
  })

  it('实现抛异常 → error（不吞错、不崩调用方）', async () => {
    await setRegistry({
      'core-timer': { enabled: true, permissions: TIMER_DECL, granted: TIMER_DECL },
    })
    const r = await import('../capability-registry')
    r.registerPluginCapability('core-timer', 'start-focus', () => {
      throw new Error('boom')
    })
    const res = r.invokePluginCapability('core-timer', 'start-focus')
    expect(res.ok).toBe(false)
    expect(res.reason).toBe('error')
    expect(res.error).toContain('boom')
  })
})

describe('插件能力 · 端到端（镜我对话 → core-timer）', () => {
  beforeEach(async () => {
    await freshEnv()
    // 能力实现会调用 useTimer()（Pinia store），测试环境需显式激活 Pinia
    const { setActivePinia, createPinia } = await import('pinia')
    setActivePinia(createPinia())
    const reg = await import('../capability-registry')
    const impls = await import('../capability-impls')
    reg.__resetCapabilityRegistry()
    impls.__resetCorePluginCapabilities()
    impls.registerCorePluginCapabilities()
  })

  it('插件启用 → 对话「开始专注」真实启动计时', async () => {
    await setRegistry({
      'core-timer': { enabled: true, permissions: TIMER_DECL, granted: TIMER_DECL },
    })
    const { useMirrorDialogue } = await import('../../mirror/useMirrorDialogue')
    const { useTimer } = await import('../../../resonance/bridges/timer')
    const m = useMirrorDialogue()

    const res = await m.send('开始专注', { overrideIntent: 'focus' })

    expect(res.result.success).toBe(true)
    expect(res.result.stepResults[0].action).toBe('start-focus')
    expect(res.result.stepResults[0].success).toBe(true)
    // 真实副作用：计时器已进入专注态（证明能力实现真的被执行，而非空转）
    expect(useTimer().isFocusing).toBe(true)
  })

  it('插件禁用 → 同一句话失败，明确提示插件已禁用，且计时器未启动', async () => {
    await setRegistry({
      'core-timer': { enabled: false, permissions: TIMER_DECL, granted: TIMER_DECL },
    })
    const { useMirrorDialogue } = await import('../../mirror/useMirrorDialogue')
    const { useTimer } = await import('../../../resonance/bridges/timer')
    const m = useMirrorDialogue()

    const res = await m.send('开始专注', { overrideIntent: 'focus' })

    expect(res.result.stepResults[0].success).toBe(false)
    expect(res.result.stepResults[0].error).toContain('已禁用')
    // 门控在前：实现根本没被执行
    expect(useTimer().isFocusing).toBe(false)
  })
})
