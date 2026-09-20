// ============================================================
// 阅览殿 · 古籍竖排面板测试
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

async function mountPanel(kvStore: Record<string, any> = {}) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore,
    sessions: [],
    crystals: [],
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../ClassicalVerticalPanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('ClassicalVerticalPanel 古籍竖排', () => {
  it('空状态提示', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('古籍竖排')
    expect(wrapper.text()).toContain('还没有古籍')
  })

  it('录入古籍并持久化', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('.cv-title').setValue('山海经·卷三')
    await wrapper.find('.cv-textarea').setValue('南山经之首曰鹊山。其首曰招摇之山。')
    await wrapper.find('.cv-btn-primary').trigger('click')
    expect(wrapper.text()).toContain('山海经·卷三')
    const saved = JSON.parse((globalThis as any).localStorage.getItem('heartflow:storage'))
    expect(saved.kvStore['hf:reading:classical_books'].length).toBe(1)
    expect(saved.kvStore['hf:reading:classical_books'][0].title).toBe('山海经·卷三')
  })

  it('选中古籍渲染竖排栏', async () => {
    const wrapper = await mountPanel({
      'hf:reading:classical_books': [
        {
          id: 'book_1',
          title: '论语·学而',
          author: '孔子弟子',
          dynasty: '春秋',
          originalText: '学而时习之，不亦说乎。',
          annotations: [],
        },
      ],
    })
    await wrapper.find('.cv-book').trigger('click')
    expect(wrapper.text()).toContain('论语·学而')
    expect(wrapper.findAll('.cv-column').length).toBeGreaterThan(0)
  })

  it('添加注疏并持久化', async () => {
    const wrapper = await mountPanel({
      'hf:reading:classical_books': [
        {
          id: 'book_1',
          title: '论语·学而',
          author: '孔子弟子',
          dynasty: '春秋',
          originalText: '学而时习之，不亦说乎。',
          annotations: [],
        },
      ],
    })
    await wrapper.find('.cv-book').trigger('click')
    await wrapper.find('.cv-ann-add input').setValue('朱熹')
    await wrapper.findAll('.cv-ann-add input')[1].setValue('宋')
    await wrapper.find('.cv-ann-content-input').setValue('既学而又时时习之，则所学者熟。')
    await wrapper.find('.cv-ann-add .cv-btn').trigger('click')
    expect(wrapper.text()).toContain('朱熹')
    const saved = JSON.parse((globalThis as any).localStorage.getItem('heartflow:storage'))
    expect(saved.kvStore['hf:reading:classical_books'][0].annotations.length).toBe(1)
  })

  it('删除古籍', async () => {
    const wrapper = await mountPanel({
      'hf:reading:classical_books': [
        {
          id: 'book_1',
          title: '论语·学而',
          author: '孔子弟子',
          dynasty: '春秋',
          originalText: '学而时习之。',
          annotations: [],
        },
      ],
    })
    await wrapper.find('.cv-book-del').trigger('click')
    expect(wrapper.text()).toContain('还没有古籍')
    const saved = JSON.parse((globalThis as any).localStorage.getItem('heartflow:storage'))
    expect(saved.kvStore['hf:reading:classical_books'].length).toBe(0)
  })

  it('影印对照切换注疏增强/纯文本（并入 ClassicalVerticalReader 能力）', async () => {
    const wrapper = await mountPanel({
      'hf:reading:classical_books': [
        {
          id: 'book_1',
          title: '论语·学而',
          author: '孔子弟子',
          dynasty: '春秋',
          originalText: '学而时习之，不亦说乎。',
          annotations: [
            { id: 'a1', annotator: '朱熹', dynasty: '宋', content: '既学而又时时习之。' },
          ],
        },
      ],
    })
    const annEl = () => wrapper.find('.cv-annotations').element as HTMLElement
    await wrapper.find('.cv-book').trigger('click')
    await wrapper.vm.$nextTick()
    expect(annEl().style.display).toBe('')
    // 切纯文本 → 隐藏注疏分层
    await wrapper.findAll('.cv-view-tab')[0].trigger('click')
    await wrapper.vm.$nextTick()
    expect(annEl().style.display).toBe('none')
    // 切回注疏增强 → 恢复
    await wrapper.findAll('.cv-view-tab')[1].trigger('click')
    await wrapper.vm.$nextTick()
    expect(annEl().style.display).toBe('')
  })
})
