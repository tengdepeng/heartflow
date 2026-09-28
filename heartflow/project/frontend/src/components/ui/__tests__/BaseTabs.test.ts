import { describe, expect, it } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import BaseTabs from '../BaseTabs.vue'
import type { TabOption } from '../BaseTabs.vue'

const opts: TabOption[] = [
  { key: 'a', label: '甲' },
  { key: 'b', label: '乙' },
  { key: 'c', label: '丙', disabled: true },
]

describe('BaseTabs', () => {
  it('渲染全部 tab 且首选项激活，含滑动指示器', () => {
    const w = mount(BaseTabs, { props: { modelValue: 'a', options: opts } })
    const tabs = w.findAll('.hf-tab')
    expect(tabs).toHaveLength(3)
    expect(tabs[0].classes()).toContain('is-active')
    expect(tabs[0].attributes('aria-selected')).toBe('true')
    expect(w.find('.hf-tabs__indicator').exists()).toBe(true)
  })

  it('点击非激活 tab 触发 update:modelValue 与 change', async () => {
    const w = mount(BaseTabs, { props: { modelValue: 'a', options: opts } })
    await w.findAll('.hf-tab')[1].trigger('click')
    expect(w.emitted('update:modelValue')?.[0]).toEqual(['b'])
    expect(w.emitted('change')?.[0]).toEqual(['b'])
  })

  it('点击已激活项不重复触发', async () => {
    const w = mount(BaseTabs, { props: { modelValue: 'a', options: opts } })
    await w.findAll('.hf-tab')[0].trigger('click')
    expect(w.emitted('update:modelValue')).toBeUndefined()
  })

  it('禁用 tab 不触发', async () => {
    const w = mount(BaseTabs, { props: { modelValue: 'a', options: opts } })
    await w.findAll('.hf-tab')[2].trigger('click')
    expect(w.emitted('update:modelValue')).toBeUndefined()
  })

  it('挂载后指示器标记为 ready（防首帧闪现）', async () => {
    const w = mount(BaseTabs, { props: { modelValue: 'a', options: opts } })
    await flushPromises()
    expect(w.find('.hf-tabs__indicator').classes()).toContain('is-ready')
  })

  it('支持 underline 变体', () => {
    const w = mount(BaseTabs, { props: { modelValue: 'a', options: opts, variant: 'underline' } })
    expect(w.find('.hf-tabs').classes()).toContain('hf-tabs--underline')
  })

  it('切换 modelValue 后激活项随之更新', async () => {
    const w = mount(BaseTabs, { props: { modelValue: 'a', options: opts } })
    await w.setProps({ modelValue: 'b' })
    await flushPromises()
    expect(w.findAll('.hf-tab')[1].classes()).toContain('is-active')
  })
})
