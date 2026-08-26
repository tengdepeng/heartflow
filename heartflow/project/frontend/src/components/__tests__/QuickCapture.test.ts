import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import QuickCapture from '../QuickCapture.vue'

describe('QuickCapture 组件（P0-2）', () => {
  it('输入时实时预览 #标签', async () => {
    const wrapper = mount(QuickCapture)
    await wrapper.find('textarea').setValue('想法 #项目 #灵感')
    expect(wrapper.findAll('.qc-tag').length).toBe(2)
  })

  it('回车提交 emit capture 并清空草稿', async () => {
    const wrapper = mount(QuickCapture)
    const ta = wrapper.find('textarea')
    await ta.setValue('记一笔 #随手')
    await ta.trigger('keydown', { key: 'Enter' })
    const emitted = wrapper.emitted('capture') as unknown[][]
    expect(emitted).toBeTruthy()
    expect(emitted[0][0]).toBe('记一笔 #随手')
    expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe('')
  })

  it('空内容不提交', async () => {
    const wrapper = mount(QuickCapture)
    const ta = wrapper.find('textarea')
    await ta.setValue('   ')
    await ta.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('capture')).toBeFalsy()
  })
})
