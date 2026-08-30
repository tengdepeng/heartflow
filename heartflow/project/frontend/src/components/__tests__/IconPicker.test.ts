import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import IconPicker from '../IconPicker.vue'

describe('IconPicker', () => {
  it('默认显示 ✦ 字形预览', () => {
    const w = mount(IconPicker, { props: { modelValue: null } })
    expect(w.find('.ip-preview-glyph').text()).toBe('✦')
  })

  it('图片型 modelValue 渲染 <img> 预览', () => {
    const w = mount(IconPicker, { props: { modelValue: 'data:image/png;base64,AAA' } })
    const img = w.find('.ip-preview-img img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe('data:image/png;base64,AAA')
  })

  it('点击字形面板触发 change 并携带该字形', async () => {
    const w = mount(IconPicker, { props: { modelValue: null } })
    const glyphBtn = w.findAll('.ip-glyph').find((b) => b.text() === '📖')
    expect(glyphBtn).toBeTruthy()
    await glyphBtn!.trigger('click')
    expect(w.emitted('change')).toBeTruthy()
    expect(w.emitted('change')![0]).toEqual(['📖'])
    expect(w.emitted('update:modelValue')![0]).toEqual(['📖'])
  })

  it('清除按钮触发 change 并携带 null', async () => {
    const w = mount(IconPicker, { props: { modelValue: '📖' } })
    await w.find('.ip-btn-ghost').trigger('click')
    expect(w.emitted('change')![0]).toEqual([null])
  })
})
