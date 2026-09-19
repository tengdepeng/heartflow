// ============================================================
// 思绪书房 · 就地写作助手面板 组件测试（INCR-366）
// 面板直引真实本地引擎 ai-assist（纯本地规则式，无存储/网络依赖）。
// ============================================================
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

async function getWrapper() {
  const { default: StudyAiAssistPanel } = await import('../StudyAiAssistPanel.vue')
  return mount(StudyAiAssistPanel)
}

async function setSource(wrapper: ReturnType<typeof mount>, text: string) {
  const src = wrapper.find('textarea[data-test="source"]')
  await src.setValue(text)
}

describe('StudyAiAssistPanel 就地写作助手', () => {
  beforeEach(() => {
    // 无持久化状态，仅清空 DOM 即可
  })

  it('渲染标题、输入框、四个操作按钮与初始禁用态', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('就地写作助手')
    expect(wrapper.find('textarea[data-test="source"]').exists()).toBe(true)
    // 空输入时操作按钮禁用
    for (const key of ['continue', 'expand', 'summarize', 'rewrite']) {
      expect(wrapper.find(`[data-test="${key}"]`).attributes('disabled')).toBeDefined()
    }
  })

  it('续写：追加一句承接并标记「已追加」', async () => {
    const wrapper = await getWrapper()
    await setSource(wrapper, '今天想通了一件事。')
    await wrapper.find('[data-test="continue"]').trigger('click')
    const out = wrapper.find('textarea[data-test="output"]')
    expect(out.exists()).toBe(true)
    const text = (out.element as HTMLTextAreaElement).value
    expect(text).toContain('今天想通了一件事。')
    expect(text).toMatch(/进一步想|顺着这个|回看这一段|如果把它放/)
    expect(wrapper.text()).toContain('已追加到原文末尾')
  })

  it('总结：替换原文并标记「已替换」', async () => {
    const wrapper = await getWrapper()
    await setSource(wrapper, '今天读了半本书。书里讲的是专注的方法。我记下了一个练习。')
    await wrapper.find('[data-test="summarize"]').trigger('click')
    const text = (wrapper.find('textarea[data-test="output"]').element as HTMLTextAreaElement).value
    expect(text).toContain('今天读了半本书')
    expect(text).toMatch(/要点：/)
    expect(wrapper.text()).toContain('已替换原文')
  })

  it('改语气：展示语气选择并默认正式', async () => {
    const wrapper = await getWrapper()
    await setSource(wrapper, '今天很累。')
    await wrapper.find('[data-test="rewrite"]').trigger('click')
    expect(wrapper.find('[data-test="tones"]').exists()).toBe(true)
    const text = (wrapper.find('textarea[data-test="output"]').element as HTMLTextAreaElement).value
    expect(text).toContain('此为记录')
  })

  it('清空按钮重置输入与结果', async () => {
    const wrapper = await getWrapper()
    await setSource(wrapper, '写一点字。')
    await wrapper.find('[data-test="expand"]').trigger('click')
    expect(wrapper.find('[data-test="output"]').exists()).toBe(true)
    await wrapper.find('[data-test="clear"]').trigger('click')
    expect(wrapper.find('[data-test="output"]').exists()).toBe(false)
    expect((wrapper.find('textarea[data-test="source"]').element as HTMLTextAreaElement).value).toBe('')
  })
})