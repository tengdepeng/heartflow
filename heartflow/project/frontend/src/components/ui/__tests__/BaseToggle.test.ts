import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseToggle from '../BaseToggle.vue'

describe('BaseToggle', () => {
  it('渲染为 switch 角色且默认关闭', () => {
    const w = mount(BaseToggle)
    const btn = w.find('button')
    expect(btn.attributes('role')).toBe('switch')
    expect(btn.attributes('aria-checked')).toBe('false')
    expect(w.classes()).not.toContain('is-on')
  })

  it('点击切换 modelValue（emit update:modelValue）', async () => {
    const w = mount(BaseToggle, { props: { modelValue: false } })
    await w.find('button').trigger('click')
    expect(w.emitted('update:modelValue')?.[0]).toEqual([true])
    await w.setProps({ modelValue: true })
    expect(w.find('button').attributes('aria-checked')).toBe('true')
    expect(w.find('button').classes()).toContain('is-on')
  })

  it('disabled 时不触发切换', async () => {
    const w = mount(BaseToggle, { props: { modelValue: false, disabled: true } })
    await w.find('button').trigger('click')
    expect(w.emitted('update:modelValue')).toBeUndefined()
    expect(w.find('button').attributes('disabled')).toBeDefined()
  })

  it('渲染 label 与 aria-label', () => {
    const w = mount(BaseToggle, { props: { label: '深色模式', ariaLabel: '主题切换' } })
    expect(w.text()).toContain('深色模式')
    expect(w.find('button').attributes('aria-label')).toBe('主题切换')
  })
})
