// ============================================================
// BacklinksPanel 组件测试
// ============================================================
import { describe, expect, it, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import BacklinksPanel from '../BacklinksPanel.vue'
import { useStudy } from '../../modules/study'
import { useNoteLinks, connect } from '../../modules/study/note-links'

describe('BacklinksPanel', () => {
  beforeEach(async () => {
    ;(globalThis as any).localStorage = createMockStorage()
    const { invalidateCache } = await import('../../engine/storage/core')
    invalidateCache()
    useNoteLinks().links.value = []
  })

  it('展示反向链接标题', async () => {
    const study = useStudy()
    study.load()
    const a = study.create('笔记A', '内容A')
    const b = study.create('笔记B', '内容B')
    connect(b.id, a.id) // b 引用 a → a 的反向链接来自 b
    const wrapper = mount(BacklinksPanel, { props: { noteId: a.id } })
    expect(wrapper.text()).toContain('笔记B')
    expect(wrapper.text()).toContain('反向链接')
  })

  it('无链接时不渲染面板', () => {
    const study = useStudy()
    study.load()
    const a = study.create('孤立笔记', '内容')
    const wrapper = mount(BacklinksPanel, { props: { noteId: a.id } })
    expect(wrapper.find('.backlinks-panel').exists()).toBe(false)
  })

  it('点击反向链接发出 open 事件', async () => {
    const study = useStudy()
    study.load()
    const a = study.create('笔记A', '内容A')
    const b = study.create('笔记B', '内容B')
    connect(b.id, a.id)
    const wrapper = mount(BacklinksPanel, { props: { noteId: a.id } })
    await wrapper.find('.bl-item').trigger('click')
    expect(wrapper.emitted('open')?.[0]).toEqual([b.id])
  })
})
