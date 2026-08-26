import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

// 隔离真实 storage，避免测试环境依赖本地持久化
vi.mock('../../../engine/storage', () => ({
  storage: {
    getNotes: () => [],
    getSessions: () => [],
    getKV: () => undefined,
    setKV: () => {},
  },
}))

import Hallway from '../Hallway.vue'

const rooms = [
  { id: 'living', name: '客厅', icon: '🛋' },
  { id: 'study', name: '书房', icon: '📚' },
]

describe('Hallway 移动端可达性', () => {
  it('点击门扉 emit navigate', async () => {
    const wrapper = mount(Hallway, { props: { currentRoomId: 'living', rooms } })
    const doors = wrapper.findAll('.room-door')
    expect(doors.length).toBe(2)
    await doors[1].trigger('click')
    expect(wrapper.emitted('navigate')).toEqual([['study']])
  })

  it('键盘 Enter / Space 也能 emit navigate（移动端无障碍）', async () => {
    const wrapper = mount(Hallway, { props: { currentRoomId: 'living', rooms } })
    const door = wrapper.findAll('.room-door')[1]
    await door.trigger('keydown', { key: 'Enter' })
    await door.trigger('keydown', { key: ' ', code: 'Space' })
    const nav = wrapper.emitted('navigate')
    expect(nav).toEqual([['study'], ['study']])
  })

  it('门扉具备 role=button 与可聚焦（tabindex=0）', () => {
    const wrapper = mount(Hallway, { props: { currentRoomId: 'living', rooms } })
    const door = wrapper.findAll('.room-door')[0]
    expect(door.attributes('role')).toBe('button')
    expect(door.attributes('tabindex')).toBe('0')
    expect(door.attributes('aria-label')).toBe('进入客厅')
  })
})
