import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'

const mockStore: Record<string, any> = {}
vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (k: string, def: any) => (k in mockStore ? mockStore[k] : def),
    setKV: (k: string, val: any) => {
      mockStore[k] = val
    },
  },
}))

import RadialMenuPanel from '../RadialMenuPanel.vue'
import { useRadialMenu, MAX_ACTIONS } from '../../modules/radial-menu'

describe('RadialMenuPanel', () => {
  beforeEach(() => {
    Object.keys(mockStore).forEach((k) => delete mockStore[k])
    useRadialMenu().resetActions()
  })

  it('渲染标题、动作数与默认动作', () => {
    const w = mount(RadialMenuPanel)
    expect(w.text()).toContain('径向扇形菜单')
    expect(w.text()).toContain('6 个动作')
    expect(w.findAll('.rdm-action').length).toBe(6)
    expect(w.findAll('.rdm-chip').length).toBe(6)
  })

  it('默认收起，点击中心按钮展开扇形', async () => {
    const w = mount(RadialMenuPanel)
    expect(w.find('.rdm-stage').classes()).not.toContain('is-open')
    await w.find('.rdm-fab').trigger('click')
    expect(w.find('.rdm-stage').classes()).toContain('is-open')
    expect(w.find('.rdm-fab').attributes('aria-expanded')).toBe('true')
  })

  it('点击动作触发反馈并收起菜单', async () => {
    const w = mount(RadialMenuPanel)
    await w.find('.rdm-fab').trigger('click')
    await w.findAll('.rdm-action')[0].trigger('click')
    expect(w.find('.rdm-feedback').classes()).toContain('is-active')
    expect(w.find('.rdm-stage').classes()).not.toContain('is-open')
  })

  it('通过输入新增动作', async () => {
    const w = mount(RadialMenuPanel)
    await w.find('.rdm-input').setValue('整理桌面')
    await w.find('.rdm-add-btn').trigger('click')
    expect(w.findAll('.rdm-action').length).toBe(7)
    expect(w.text()).toContain('整理桌面')
    expect(w.text()).toContain('7 个动作')
  })

  it('删除动作', async () => {
    const w = mount(RadialMenuPanel)
    await w.findAll('.rdm-chip-del')[0].trigger('click')
    expect(w.findAll('.rdm-action').length).toBe(5)
  })

  it('恢复默认动作', async () => {
    const w = mount(RadialMenuPanel)
    await w.find('.rdm-input').setValue('临时')
    await w.find('.rdm-add-btn').trigger('click')
    expect(w.findAll('.rdm-action').length).toBe(7)
    await w.find('.rdm-reset').trigger('click')
    expect(w.findAll('.rdm-action').length).toBe(6)
  })

  it('动作达上限时禁用新增', async () => {
    const w = mount(RadialMenuPanel)
    const engine = useRadialMenu()
    while (engine.actions.value.length < MAX_ACTIONS) engine.addAction('x')
    await w.vm.$nextTick()
    expect(w.findAll('.rdm-action').length).toBe(MAX_ACTIONS)
    expect(w.find('.rdm-add-btn').attributes('disabled')).toBeDefined()
  })
})
