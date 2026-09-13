// ============================================================
// 插件能力铺开测试 · 其余核心插件（core-crystal / core-constitution）
// 与镜我对话「能力路由」兜底（蓝图 L10612）
//
// 核心断言：
// 1. 能力读的是真实存储（结晶数量 / 宪法条款），不是假数据；
// 2. 同一句话，插件启用时经能力回应、禁用时回落通用兜底。
// ============================================================
import { describe, expect, it, beforeEach, vi } from 'vitest'

// useMirrorDialogue 依赖 vue-router（navigate 步骤），单元测试中桩掉
const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }))
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

import { createMockStorage } from '../../../engine/storage/__tests__/test-utils'
import type { Constitution, TimeCrystal } from '../../../types'

type Registry = Record<string, { enabled: boolean; permissions: string[]; granted?: string[] }>

const CRYSTAL_DECL = ['read:history', 'write:data']
const CONST_DECL = ['read:history', 'write:data', 'export:data']
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

/** 激活 Pinia + 重置并注册全部核心能力实现（幂等） */
async function bootCapabilities(): Promise<void> {
  const { setActivePinia, createPinia } = await import('pinia')
  setActivePinia(createPinia())
  const reg = await import('../capability-registry')
  const impls = await import('../capability-impls')
  reg.__resetCapabilityRegistry()
  impls.__resetCorePluginCapabilities()
  impls.registerCorePluginCapabilities()
}

const DAY = 24 * 60 * 60 * 1000
const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * DAY).toISOString()

function makeCrystal(id: string, daysAgo: number, tags: string[]): TimeCrystal {
  return {
    id,
    sessionId: `s-${id}`,
    color: '#fff',
    intensity: 1,
    createdAt: iso(daysAgo),
    shape: 'sphere',
    tags,
    insight: null,
  }
}

function makeConstitution(): Constitution {
  return {
    version: '1.0',
    name: '心流宪法',
    preamble: '本地私有，超级自定义。',
    immutableRules: [
      { id: 'r1', title: '本地私有', description: '数据不出本机', icon: '🔒', type: 'value' },
      { id: 'r2', title: '超级自定义', description: '一切可改', icon: '🎛', type: 'value' },
      { id: 'r3', title: '克制', description: '不打扰、不评判', icon: '🌙', type: 'value' },
    ],
    mutableRules: [
      {
        id: 'm5',
        title: '每日复盘',
        description: '睡前回看今天',
        enabled: true,
        type: 'ritual',
        order: 5,
        articleNumber: 5,
      },
    ],
    createdAt: '',
    updatedAt: '',
  }
}

describe('核心插件能力 · core-crystal.crystal-stats', () => {
  beforeEach(async () => {
    await freshEnv()
    await bootCapabilities()
  })

  it('读取真实结晶数量与近七天/标签', async () => {
    await setRegistry({ 'core-crystal': { enabled: true, permissions: CRYSTAL_DECL, granted: CRYSTAL_DECL } })
    const { storage } = await import('../../../engine/storage')
    storage.setCrystals([
      makeCrystal('c1', 1, ['写作']),
      makeCrystal('c2', 2, ['写作', '阅读']),
      makeCrystal('c3', 30, ['阅读']),
    ])

    const r = await import('../capability-registry')
    const res = r.invokePluginCapability<{
      total: number
      thisWeek: number
      topTags: string[]
      summary: string
    }>('core-crystal', 'crystal-stats')

    expect(res.ok).toBe(true)
    expect(res.value?.total).toBe(3)
    expect(res.value?.thisWeek).toBe(2)
    expect(res.value?.topTags).toContain('写作')
    expect(res.value?.summary).toContain('3 颗时间结晶')
    expect(res.value?.summary).toContain('最近七天 2 颗')
  })

  it('空结晶架给引导语，不输出零值噪音', async () => {
    await setRegistry({ 'core-crystal': { enabled: true, permissions: CRYSTAL_DECL, granted: CRYSTAL_DECL } })
    const r = await import('../capability-registry')
    const res = r.invokePluginCapability<{ total: number; summary: string }>(
      'core-crystal',
      'crystal-stats',
    )
    expect(res.ok).toBe(true)
    expect(res.value?.total).toBe(0)
    expect(res.value?.summary).toContain('还空着')
  })

  it('权限被回收 → permission-denied', async () => {
    await setRegistry({ 'core-crystal': { enabled: true, permissions: CRYSTAL_DECL, granted: ['write:data'] } })
    const r = await import('../capability-registry')
    const res = r.invokePluginCapability('core-crystal', 'crystal-stats')
    expect(res.ok).toBe(false)
    expect(res.reason).toBe('permission-denied')
  })
})

describe('核心插件能力 · core-constitution.lookup-article', () => {
  beforeEach(async () => {
    await freshEnv()
    await bootCapabilities()
  })

  it('按编号返回真实条款（不可变）', async () => {
    await setRegistry({ 'core-constitution': { enabled: true, permissions: CONST_DECL, granted: CONST_DECL } })
    const { storage } = await import('../../../engine/storage')
    storage.setConstitution(makeConstitution())

    const r = await import('../capability-registry')
    const res = r.invokePluginCapability<{ found: boolean; title: string; summary: string }>(
      'core-constitution',
      'lookup-article',
      { query: '宪法第 3 条是什么' },
    )
    expect(res.ok).toBe(true)
    expect(res.value?.found).toBe(true)
    expect(res.value?.title).toBe('克制')
    expect(res.value?.summary).toContain('第 3 条')
    expect(res.value?.summary).toContain('不打扰、不评判')
  })

  it('按编号返回真实条款（弹性条款 articleNumber）', async () => {
    await setRegistry({ 'core-constitution': { enabled: true, permissions: CONST_DECL, granted: CONST_DECL } })
    const { storage } = await import('../../../engine/storage')
    storage.setConstitution(makeConstitution())

    const r = await import('../capability-registry')
    const res = r.invokePluginCapability<{ found: boolean; title: string }>(
      'core-constitution',
      'lookup-article',
      { query: '第 5 条' },
    )
    expect(res.ok).toBe(true)
    expect(res.value?.found).toBe(true)
    expect(res.value?.title).toBe('每日复盘')
  })

  it('未生成宪法 → found=false 且明确告知', async () => {
    await setRegistry({ 'core-constitution': { enabled: true, permissions: CONST_DECL, granted: CONST_DECL } })
    const r = await import('../capability-registry')
    const res = r.invokePluginCapability<{ found: boolean; summary: string }>(
      'core-constitution',
      'lookup-article',
      { query: '宪法第 3 条' },
    )
    expect(res.ok).toBe(true)
    expect(res.value?.found).toBe(false)
    expect(res.value?.summary).toContain('还没有生成')
  })

  it('无编号 → 汇总条款总数', async () => {
    await setRegistry({ 'core-constitution': { enabled: true, permissions: CONST_DECL, granted: CONST_DECL } })
    const { storage } = await import('../../../engine/storage')
    storage.setConstitution(makeConstitution())

    const r = await import('../capability-registry')
    const res = r.invokePluginCapability<{ total: number; summary: string }>(
      'core-constitution',
      'lookup-article',
      { query: '宪法里有什么' },
    )
    expect(res.ok).toBe(true)
    expect(res.value?.total).toBe(4) // 3 不可变 + 1 弹性
    expect(res.value?.summary).toContain('不可变 3 条')
  })
})

describe('核心插件能力 · core-timer.start-rest', () => {
  beforeEach(async () => {
    await freshEnv()
    await bootCapabilities()
  })

  it('启用 → 可调用；禁用 → plugin-disabled', async () => {
    await setRegistry({ 'core-timer': { enabled: true, permissions: TIMER_DECL, granted: TIMER_DECL } })
    const r = await import('../capability-registry')
    expect(r.invokePluginCapability('core-timer', 'start-rest').ok).toBe(true)

    await setRegistry({ 'core-timer': { enabled: false, permissions: TIMER_DECL, granted: TIMER_DECL } })
    const blocked = r.invokePluginCapability('core-timer', 'start-rest')
    expect(blocked.ok).toBe(false)
    expect(blocked.reason).toBe('plugin-disabled')
  })
})

describe('镜我对话 · 能力路由兜底（蓝图 L10612）', () => {
  beforeEach(async () => {
    await freshEnv()
    await bootCapabilities()
  })

  it('问结晶数量 → 经 core-crystal 能力回应真实数字', async () => {
    await setRegistry({ 'core-crystal': { enabled: true, permissions: CRYSTAL_DECL, granted: CRYSTAL_DECL } })
    const { storage } = await import('../../../engine/storage')
    storage.setCrystals([makeCrystal('c1', 1, ['写作']), makeCrystal('c2', 3, ['阅读'])])

    const { useMirrorDialogue } = await import('../../mirror/useMirrorDialogue')
    const m = useMirrorDialogue()
    const res = await m.send('我有多少时间结晶')

    expect(res.result.success).toBe(true)
    expect(res.result.stepResults[0]?.action).toBe('respond')
    expect((res.result.stepResults[0]?.data as { capability?: string })?.capability).toBe('crystal-stats')
    expect(res.response).toContain('2 颗时间结晶')
  })

  it('问宪法条款 → 经 core-constitution 能力回应真实内容', async () => {
    await setRegistry({ 'core-constitution': { enabled: true, permissions: CONST_DECL, granted: CONST_DECL } })
    const { storage } = await import('../../../engine/storage')
    storage.setConstitution(makeConstitution())

    const { useMirrorDialogue } = await import('../../mirror/useMirrorDialogue')
    const m = useMirrorDialogue()
    const res = await m.send('宪法第 2 条是什么')

    expect((res.result.stepResults[0]?.data as { capability?: string })?.capability).toBe('lookup-article')
    expect(res.response).toContain('超级自定义')
  })

  it('插件禁用 → 不再命中能力，回落通用兜底', async () => {
    await setRegistry({ 'core-crystal': { enabled: false, permissions: CRYSTAL_DECL, granted: CRYSTAL_DECL } })
    const { storage } = await import('../../../engine/storage')
    storage.setCrystals([makeCrystal('c1', 1, ['写作'])])

    const { useMirrorDialogue } = await import('../../mirror/useMirrorDialogue')
    const m = useMirrorDialogue()
    const res = await m.send('我有多少时间结晶')

    expect(res.result.stepResults.length).toBe(0)
    expect(res.response).toContain('不太确定')
  })
})
