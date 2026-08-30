import { describe, it, expect, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import NoteEditor from '../NoteEditor.vue'
import type { Note } from '../../types'

function makeNote(over: Partial<Note> = {}): Note {
  return {
    id: 'note-a',
    title: '笔记A',
    content: '正文',
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    archived: false,
    isAtomic: false,
    ...over,
  }
}

// 编辑器整体用 <Teleport to="body"> 包裹，按钮与浮层会被 portal 到 document.body，
// 故用 document 全局查询而非 wrapper.find。每例后在 afterEach 卸载并清理 body 残留。
let wrapper: ReturnType<typeof mount> | null = null

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.querySelectorAll('.modal-overlay, .link-picker-overlay').forEach(el => el.remove())
})

function findBtn(text: string): HTMLButtonElement | undefined {
  return Array.from(document.querySelectorAll('button')).find(b => (b.textContent || '').includes(text))
}

describe('NoteEditor 双向链接插入 UI', () => {
  it('渲染「插入双链」按钮', () => {
    wrapper = mount(NoteEditor, {
      props: { visible: true, editing: true, note: makeNote() },
      attachTo: document.body,
    })
    expect(findBtn('插入双链')).toBeTruthy()
  })

  it('点击「插入双链」弹出链接选择浮层', async () => {
    wrapper = mount(NoteEditor, {
      props: { visible: true, editing: true, note: makeNote() },
      attachTo: document.body,
    })
    const btn = findBtn('插入双链')!
    expect(btn).toBeTruthy()
    btn.click()
    await flushPromises()
    await new Promise(r => setTimeout(r, 0))
    // 浮层根节点 + 搜索框
    expect(document.querySelector('.link-picker')).toBeTruthy()
    expect(document.querySelector('.lp-search')).toBeTruthy()
  })

  it('插入块锚点按钮与插入双链按钮并存（编辑态工具区完整）', () => {
    wrapper = mount(NoteEditor, {
      props: { visible: true, editing: true, note: makeNote() },
      attachTo: document.body,
    })
    const texts = Array.from(document.querySelectorAll('.editor-tools .tool-btn')).map(b => (b.textContent || '').trim())
    expect(texts.some(t => t.includes('插入双链'))).toBe(true)
    expect(texts.some(t => t.includes('插入块锚点'))).toBe(true)
  })
})
