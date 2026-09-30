// ============================================================
// 桌面收纳空间（DeskSpaces）集成测试
// 覆盖：空桌面只有「新建空间」/ 新建即开面板 / 从候选收纳房间 /
//       移出 / 点击直达房间路由 / 改名换图标 / 删除空间
// 依赖：真实 room-graph（房间图全量作候选）+ storage mock 持久化；
//       模块级单例 → 每例 vi.resetModules + 动态导入隔离。
// ============================================================

import { describe, expect, it, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { getAllRooms } from '../../engine/room-graph'

const { store, mockGetKV, mockSetKV, push } = vi.hoisted(() => {
  const store: Record<string, any> = {}
  const mockGetKV = vi.fn((k: string, d: any) => (k in store ? store[k] : d))
  const mockSetKV = vi.fn((k: string, v: any) => { store[k] = v })
  const push = vi.fn(async () => {})
  return { store, mockGetKV, mockSetKV, push }
})

vi.mock('@/engine/storage', () => ({
  storage: {
    getKV: (...a: any[]) => (mockGetKV as any)(...a),
    setKV: (...a: any[]) => (mockSetKV as any)(...a),
  },
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: (...a: any[]) => (push as any)(...a) }),
}))

async function prepare() {
  vi.resetModules()
  Object.keys(store).forEach((k) => delete store[k])
  const mod = await import('../DeskSpaces.vue')
  return mount(mod.default)
}

const firstRoom = getAllRooms()[0]

describe('DeskSpaces · 桌面收纳空间', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('空桌面只给「＋ 空间」入口，没有收纳文件夹', async () => {
    const w = await prepare()
    expect(w.find('.ds-new').exists()).toBe(true)
    expect(w.findAll('.ds-folder').length).toBe(0)
    expect(w.find('.ds-panel').exists()).toBe(false)
  })

  it('新建空间：桌面出现文件夹，并直接打开该空间', async () => {
    const w = await prepare()
    await w.find('.ds-new').trigger('click')

    expect(w.findAll('.ds-folder').length).toBe(1)
    expect(w.find('.ds-panel').exists()).toBe(true)
    expect(w.find('.ds-empty').exists()).toBe(true) // 空空间引导
    expect(mockSetKV).toHaveBeenCalled()
  })

  it('从候选里收纳房间：进入空间网格并持久化为 ID 引用', async () => {
    const w = await prepare()
    await w.find('.ds-new').trigger('click')

    const picks = w.findAll('.ds-pick')
    expect(picks.length).toBeGreaterThan(0)
    // 候选按房间图顺序，首项即 getAllRooms()[0]
    await picks[0].trigger('click')

    expect(w.findAll('.ds-item').length).toBe(1)
    expect(w.find('.ds-item-name').text()).toBe(firstRoom.name)
    // 存的是 ID 引用，不是房间数据副本
    const calls = mockSetKV.mock.calls
    const saved = calls[calls.length - 1][1] as any[]
    expect(saved[0].roomIds).toEqual([firstRoom.id])
  })

  it('点收纳项直达对应房间路由', async () => {
    const w = await prepare()
    await w.find('.ds-new').trigger('click')
    await w.findAll('.ds-pick')[0].trigger('click')
    await w.find('.ds-item').trigger('click')

    expect(push).toHaveBeenCalledWith(firstRoom.path)
    expect(w.find('.ds-panel').exists()).toBe(false) // 跳走即关闭
  })

  it('可把房间移出空间，回到空态引导', async () => {
    const w = await prepare()
    await w.find('.ds-new').trigger('click')
    await w.findAll('.ds-pick')[0].trigger('click')
    expect(w.findAll('.ds-item').length).toBe(1)

    await w.find('.ds-item-out').trigger('click')
    expect(w.findAll('.ds-item').length).toBe(0)
    expect(w.find('.ds-empty').exists()).toBe(true)
  })

  it('改名与换图标即时生效，删除空间回到空桌面', async () => {
    const w = await prepare()
    await w.find('.ds-new').trigger('click')

    // 改名
    const input = w.find('.ds-name')
    await input.setValue('晨间')
    await input.trigger('change')
    expect(w.find('.ds-folder-name').text()).toBe('晨间')

    // 换图标（样式面板第一个 emoji）
    await w.findAll('.ds-foot-btn')[1].trigger('click')
    const emoji = w.findAll('.ds-emoji')[1]
    const picked = emoji.text()
    await emoji.trigger('click')
    expect(w.find('.ds-head-icon').text()).toBe(picked)

    // 删除
    await w.find('.ds-btn-danger').trigger('click')
    expect(w.findAll('.ds-folder').length).toBe(0)
    expect(w.find('.ds-panel').exists()).toBe(false)
  })
})
