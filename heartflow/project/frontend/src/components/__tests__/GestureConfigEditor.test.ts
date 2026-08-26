// ============================================================
// GestureConfigEditor 手势配置编辑器组件测试
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import GestureConfigEditor from '../GestureConfigEditor.vue'
import type { GestureBindings } from '../../modules/gesture/contracts'

const defaultBindings: GestureBindings = {
  'tap': 'toggleFocusTimer',
  'long-press': 'doNothing',
  'circle-cw': 'enterSafeIsland',
  'circle-ccw': 'exitSafeIsland',
  'cross': 'finishFocusSession',
  'wave': 'doNothing',
  'horizontal-swipe-left': 'doNothing',
  'horizontal-swipe-right': 'doNothing',
}

describe('GestureConfigEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('渲染手势配置卡片容器', () => {
    const wrapper = mount(GestureConfigEditor, {
      props: { bindings: defaultBindings },
    })
    expect(wrapper.find('.gesture-config-card').exists()).toBe(true)
  })

  it('默认显示前4个手势', () => {
    const wrapper = mount(GestureConfigEditor, {
      props: { bindings: defaultBindings },
    })
    const rows = wrapper.findAll('.gesture-config-row')
    expect(rows.length).toBe(4)
  })

  it('渲染所有手势名称', () => {
    const wrapper = mount(GestureConfigEditor, {
      props: { bindings: defaultBindings },
    })
    const names = wrapper.findAll('.gesture-name')
    expect(names.length).toBe(4)
    expect(names[0].text()).toBe('轻点')
    expect(names[1].text()).toBe('长按')
  })

  it('渲染每个手势的 select 下拉框', () => {
    const wrapper = mount(GestureConfigEditor, {
      props: { bindings: defaultBindings },
    })
    const selects = wrapper.findAll('.gesture-select')
    expect(selects.length).toBe(4)
  })

  it('select 下拉框显示当前绑定值', () => {
    const wrapper = mount(GestureConfigEditor, {
      props: { bindings: defaultBindings },
    })
    const selects = wrapper.findAll('.gesture-select')
    // tap 对应 toggleFocusTimer
    expect((selects[0].element as HTMLSelectElement).value).toBe('toggleFocusTimer')
    // long-press 对应 doNothing
    expect((selects[1].element as HTMLSelectElement).value).toBe('doNothing')
  })

  it('每个 select 都有5个选项', () => {
    const wrapper = mount(GestureConfigEditor, {
      props: { bindings: defaultBindings },
    })
    const selects = wrapper.findAll('.gesture-select')
    for (const select of selects) {
      const options = select.findAll('option')
      expect(options.length).toBe(5)
    }
  })

  it('修改 select 触发 change 事件', async () => {
    const wrapper = mount(GestureConfigEditor, {
      props: { bindings: defaultBindings },
    })
    const select = wrapper.find('.gesture-select')
    await select.setValue('finishFocusSession')
    expect(wrapper.emitted('change')).toHaveLength(1)
    // change 事件参数为 [gesture, action]
    const changeEvent = wrapper.emitted('change')![0]
    expect(changeEvent[0]).toBe('tap')
    expect(changeEvent[1]).toBe('finishFocusSession')
  })

  it('修改后显示"已更新"标签', async () => {
    const wrapper = mount(GestureConfigEditor, {
      props: { bindings: defaultBindings },
    })
    // 初始没有"已更新"标签
    expect(wrapper.find('.gesture-updated').exists()).toBe(false)
    // 修改 select
    const select = wrapper.find('.gesture-select')
    await select.setValue('enterSafeIsland')
    // 修改后出现"已更新"标签
    expect(wrapper.find('.gesture-updated').exists()).toBe(true)
    expect(wrapper.find('.gesture-updated').text()).toBe('已更新')
  })

  it('渲染展开/收起按钮', () => {
    const wrapper = mount(GestureConfigEditor, {
      props: { bindings: defaultBindings },
    })
    const toggleBtn = wrapper.find('.gesture-toggle')
    expect(toggleBtn.exists()).toBe(true)
    expect(toggleBtn.text()).toContain('展开更多')
  })

  it('点击展开按钮后显示所有8个手势', async () => {
    const wrapper = mount(GestureConfigEditor, {
      props: { bindings: defaultBindings },
    })
    await wrapper.find('.gesture-toggle').trigger('click')
    const rows = wrapper.findAll('.gesture-config-row')
    expect(rows.length).toBe(8)
    expect(wrapper.find('.gesture-toggle').text()).toContain('收起')
  })
})