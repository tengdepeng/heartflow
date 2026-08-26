// ============================================================
// NoteEditor 内联双链跳转测试
// ============================================================
import { describe, expect, it, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { flushPromises } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import NoteEditor from '../NoteEditor.vue'
import { useStudy } from '../../modules/study'
import { useNoteLinks } from '../../modules/study/note-links'

describe('NoteEditor 内联双链', () => {
  beforeEach(async () => {
    ;(globalThis as any).localStorage = createMockStorage()
    const { invalidateCache } = await import('../../engine/storage/core')
    invalidateCache()
    useNoteLinks().links.value = []
  })

  it('预览区点击 [[标题]] 内联双链 → emit open(目标 id)', async () => {
    const study = useStudy()
    study.load()
    const target = study.create('目标笔记', '被引用的内容')
    const source = study.create('源笔记', `链接到 [[${target.title}]]`)

    const wrapper = mount(NoteEditor, {
      attachTo: document.body,
      props: {
        visible: false,
        editing: true,
        note: source,
      },
    })

    // 打开编辑器 → 触发 watch 填充 form
    await wrapper.setProps({ visible: true })
    await flushPromises()

    // 切到预览模式
    const previewTab = Array.from(document.querySelectorAll('.tab-btn')).find(
      el => el.textContent === '预览',
    ) as HTMLElement | undefined
    expect(previewTab).toBeTruthy()
    previewTab!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()

    const anchor = document.querySelector('.preview-area .wikilink') as HTMLElement | null
    expect(anchor).toBeTruthy()
    expect(anchor!.getAttribute('data-wikilink')).toBe(target.title)

    // 点击内联双链 → 应解析并 emit open
    anchor!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()

    const emitted = wrapper.emitted('open')
    expect(emitted).toBeTruthy()
    expect(emitted![0]).toEqual([target.id])

    wrapper.unmount()
  })

  it('预览区普通文本点击不 emit open', async () => {
    const study = useStudy()
    study.load()
    const source = study.create('纯文本笔记', '没有任何双链')

    const wrapper = mount(NoteEditor, {
      attachTo: document.body,
      props: { visible: false, editing: true, note: source },
    })

    await wrapper.setProps({ visible: true })
    await flushPromises()

    const previewTab = Array.from(document.querySelectorAll('.tab-btn')).find(
      el => el.textContent === '预览',
    ) as HTMLElement | undefined
    previewTab!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()

    const area = document.querySelector('.preview-area') as HTMLElement
    area.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()

    expect(wrapper.emitted('open')).toBeFalsy()
    wrapper.unmount()
  })
})
