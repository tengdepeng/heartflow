// ============================================================
// 房间级锁遮罩组件测试（INCR-469）
// 覆盖：未配置不渲染 / 已锁定渲染遮罩 / 错误口令提示 /
//       正确口令解锁 / 提示展示 / 切换房间重置输入
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

const { store, mockGetKV, mockSetKV } = vi.hoisted(() => {
  const store: Record<string, unknown> = {}
  return {
    store,
    mockGetKV: vi.fn((k: string, d?: unknown): unknown => store[k] ?? d),
    mockSetKV: vi.fn((k: string, v: unknown): void => {
      store[k] = v
    }),
  }
})

vi.mock('../../engine/storage', () => ({
  storage: { getKV: mockGetKV, setKV: mockSetKV },
}))

vi.mock('../../engine/room-graph', () => ({
  getAllRooms: () => [
    { id: 'reward', name: '劳酬' },
    { id: 'vault', name: '保险库' },
  ],
}))

import RoomLockGate from '../RoomLockGate.vue'
import { resetRoomLockStore, fingerprintRoomPassword, ROOM_LOCK_STORAGE_KEY } from '../../modules/room-lock'

function seedLock(roomId: string, pwd: string, hint?: string): void {
  const salt = 's1'
  store[ROOM_LOCK_STORAGE_KEY] = {
    [roomId]: { enabled: true, passwordHash: fingerprintRoomPassword(pwd, salt), salt, hint },
  }
  resetRoomLockStore()
}

beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k]
  resetRoomLockStore()
})

describe('RoomLockGate', () => {
  it('未配置房间锁时不渲染遮罩', () => {
    const wrapper = mount(RoomLockGate, { props: { roomId: 'reward' } })
    expect(wrapper.find('.rlg-mask').exists()).toBe(false)
  })

  it('已配置且未解锁时渲染遮罩并显示房间名', () => {
    seedLock('reward', 'pw')
    const wrapper = mount(RoomLockGate, { props: { roomId: 'reward' } })
    expect(wrapper.find('.rlg-mask').exists()).toBe(true)
    expect(wrapper.text()).toContain('劳酬 已锁定')
  })

  it('错误口令显示提示且仍锁定', async () => {
    seedLock('reward', 'pw')
    const wrapper = mount(RoomLockGate, { props: { roomId: 'reward' } })
    await wrapper.find('.rlg-input').setValue('bad')
    await wrapper.find('form').trigger('submit')
    await nextTick()
    expect(wrapper.find('.rlg-err').exists()).toBe(true)
    expect(wrapper.find('.rlg-mask').exists()).toBe(true)
  })

  it('正确口令解锁后遮罩消失', async () => {
    seedLock('reward', 'pw')
    const wrapper = mount(RoomLockGate, { props: { roomId: 'reward' } })
    await wrapper.find('.rlg-input').setValue('pw')
    await wrapper.find('form').trigger('submit')
    await nextTick()
    expect(wrapper.find('.rlg-mask').exists()).toBe(false)
  })

  it('展示密码提示', () => {
    seedLock('reward', 'pw', '我的生日')
    const wrapper = mount(RoomLockGate, { props: { roomId: 'reward' } })
    expect(wrapper.find('.rlg-hint').text()).toContain('我的生日')
  })

  it('切换房间时清空输入并重判锁定', async () => {
    seedLock('reward', 'pw')
    const wrapper = mount(RoomLockGate, { props: { roomId: 'reward' } })
    await wrapper.find('.rlg-input').setValue('half')
    await wrapper.setProps({ roomId: 'vault' })
    await nextTick()
    // 保险库未配置锁 → 遮罩消失
    expect(wrapper.find('.rlg-mask').exists()).toBe(false)
    // 切回已锁房间 → 遮罩重现且输入已清空
    await wrapper.setProps({ roomId: 'reward' })
    await nextTick()
    expect(wrapper.find('.rlg-mask').exists()).toBe(true)
    expect((wrapper.find('.rlg-input').element as HTMLInputElement).value).toBe('')
  })
})
