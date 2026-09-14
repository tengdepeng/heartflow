import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import CommandPalette from '../CommandPalette.vue'
import type { CommandItem } from '../../modules/command-palette/types'

function items(): CommandItem[] {
  return [
    { id: 'act:home', kind: 'action', label: '回到首页', hint: '/', run: vi.fn() },
    { id: 'room:crystal', kind: 'room', label: '结晶阁', keywords: 'crystal /crystal', hint: '/crystal', run: vi.fn() },
    { id: 'page:settings', kind: 'page', label: '设置', keywords: '/settings', hint: '/settings', run: vi.fn() },
  ]
}

function mountPalette(visible = true) {
  return mount(CommandPalette, {
    props: { visible, items: items() },
    global: { stubs: { teleport: true } },
  })
}

describe('CommandPalette 命令面板', () => {
  it('隐藏时不渲染', () => {
    const wrapper = mountPalette(false)
    expect(wrapper.find('.cp-panel').exists()).toBe(false)
  })

  it('空查询展示动作优先 + 房间/页面的推荐入口', async () => {
    const wrapper = mountPalette()
    expect(wrapper.find('.cp-panel').attributes('aria-label')).toBe('命令面板')
    expect(wrapper.text()).toContain('回到首页')
    expect(wrapper.text()).toContain('结晶阁')
    expect(wrapper.text()).toContain('设置')
    expect(wrapper.find('.cp-item').text()).toContain('动作')
  })

  it('输入过滤并高亮命中', async () => {
    const wrapper = mountPalette()
    await wrapper.find('input').setValue('结晶')
    const html = wrapper.find('.cp-list').html()
    expect(html).toContain('<mark>结晶</mark>')
    expect(wrapper.text()).toContain('结晶阁')
    expect(wrapper.text()).not.toContain('回到首页')
    expect(wrapper.text()).not.toContain('设置')
  })

  it('无匹配显示空态', async () => {
    const wrapper = mountPalette()
    await wrapper.find('input').setValue('zzz不存在')
    expect(wrapper.text()).toContain('没有匹配项')
  })

  it('Enter 触发选中并 emit select', async () => {
    const wrapper = mountPalette()
    const input = wrapper.find('input')
    await input.trigger('keydown', { key: 'Enter' })
    const emitted = wrapper.emitted('select') as CommandItem[][] | undefined
    expect(emitted).toBeTruthy()
    expect(emitted![0][0].id).toBe('act:home')
  })

  it('↑↓ 键盘导航移动选中', async () => {
    const wrapper = mountPalette()
    const input = wrapper.find('input')
    await input.trigger('keydown', { key: 'ArrowDown' })
    await input.trigger('keydown', { key: 'Enter' })
    const emitted = wrapper.emitted('select') as CommandItem[][] | undefined
    expect(emitted![0][0].id).toBe('room:crystal')
    await input.trigger('keydown', { key: 'ArrowUp' })
    await input.trigger('keydown', { key: 'Enter' })
    expect(emitted![1][0].id).toBe('act:home')
  })

  it('Escape emit close', async () => {
    const wrapper = mountPalette()
    await wrapper.find('input').trigger('keydown', { key: 'Escape' })
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('点击选项 emit select', async () => {
    const wrapper = mountPalette()
    await wrapper.findAll('.cp-item')[1].trigger('click')
    const emitted = wrapper.emitted('select') as CommandItem[][] | undefined
    expect(emitted![0][0].id).toBe('room:crystal')
  })
})
