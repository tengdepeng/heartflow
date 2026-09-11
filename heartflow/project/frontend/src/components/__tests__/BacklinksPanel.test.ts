// ============================================================
// BacklinksPanel 组件测试（INCR-229 薄委托化：纯 Props 契约）
// 组件不再自读 storage/study 引擎，全部数据由宿主注入。
// ============================================================
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import BacklinksPanel from '../BacklinksPanel.vue'
import type { NoteLink } from '../../modules/study/note-links'
import type { Note } from '../../types'

const notes: Note[] = [
  { id: 'a', title: '笔记A', content: '出链段落内容 ^blk1', tags: [], createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'b', title: '笔记B', content: '内容B', tags: [], createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: 'c', title: '笔记C', content: '第一段\n\n第二段', tags: [], createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
]

const backlinks: NoteLink[] = [
  { id: 'l1', sourceId: 'b', targetId: 'a', createdAt: '2026-01-01T00:00:00.000Z' },
]
const outgoing: NoteLink[] = [
  { id: 'l2', sourceId: 'a', targetId: 'c', createdAt: '2026-01-01T00:00:00.000Z', blockId: 'blk1' },
]

function mountPanel(props: Partial<{ noteId: string; notes: Note[]; outgoing: NoteLink[]; backlinks: NoteLink[] }> = {}) {
  return mount(BacklinksPanel, {
    props: {
      noteId: 'a',
      notes,
      outgoing: [],
      backlinks: [],
      ...props,
    },
  })
}

describe('BacklinksPanel（薄委托化）', () => {
  it('展示反向链接标题', () => {
    const wrapper = mountPanel({ backlinks })
    expect(wrapper.text()).toContain('笔记B')
    expect(wrapper.text()).toContain('反向链接')
    expect(wrapper.text()).toContain('被引用')
  })

  it('展示本笔记出链', () => {
    const wrapper = mountPanel({ outgoing })
    expect(wrapper.text()).toContain('本笔记引用')
    expect(wrapper.text()).toContain('笔记C')
  })

  it('出链块锚点展示被引用段落文本', () => {
    const wrapper = mountPanel({ outgoing })
    // l2 携带块锚点 blk1（锚点写在本笔记 a 的正文，展示该出链所引用的段落）
    expect(wrapper.text()).toContain('出链段落内容')
  })

  it('无链接时不渲染面板内容', () => {
    const wrapper = mountPanel()
    expect(wrapper.find('.backlinks-panel').exists()).toBe(false)
  })

  it('反向链接项点击发出 open 事件（带来源 id）', async () => {
    const wrapper = mountPanel({ backlinks })
    await wrapper.find('.bl-item').trigger('click')
    expect(wrapper.emitted('open')?.[0]).toEqual(['b'])
  })

  it('出链项点击发出 open 事件（带目标 id）', async () => {
    const wrapper = mountPanel({ outgoing })
    await wrapper.find('.bl-item').trigger('click')
    expect(wrapper.emitted('open')?.[0]).toEqual(['c'])
  })

  it('死链（目标笔记不存在）显示占位文案', () => {
    const dead: NoteLink[] = [{ id: 'ld', sourceId: 'ghost', targetId: 'a', createdAt: '2026-01-01T00:00:00.000Z' }]
    const wrapper = mountPanel({ backlinks: dead })
    expect(wrapper.text()).toContain('（已不存在的笔记）')
  })
})