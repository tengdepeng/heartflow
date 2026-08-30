// ============================================================
// NoteSearchPanel 组件测试（INCR-02：思绪书房全库检索）
// ============================================================
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import NoteSearchPanel from '../NoteSearchPanel.vue'
import type { Note } from '../../types'

function mk(id: string, title: string, content: string, tags: string[] = []): Note {
  return { id, title, content, tags, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
}

describe('NoteSearchPanel', () => {
  it('展示标题与统计（笔记数/词条数）', () => {
    const wrapper = mount(NoteSearchPanel, { props: { notes: [mk('1', '晨间随笔', '今天阳光很好。')] } })
    expect(wrapper.text()).toContain('全库检索')
    expect(wrapper.text()).toContain('1 笔记')
  })

  it('搜索命中标题并高亮', async () => {
    const notes = [mk('1', 'React 笔记', 'hooks 相关'), mk('2', '书法练习', '每天练字')]
    const wrapper = mount(NoteSearchPanel, { props: { notes } })
    await wrapper.find('input').setValue('React')
    expect(wrapper.text()).toContain('React 笔记')
    expect(wrapper.find('mark').exists()).toBe(true)
  })

  it('搜索命中正文内容', async () => {
    const notes = [mk('1', '日记', '今天学习了间隔重复算法，收获很多。'), mk('2', '杂记', '今天吃了火锅')]
    const wrapper = mount(NoteSearchPanel, { props: { notes } })
    await wrapper.find('input').setValue('间隔重复')
    expect(wrapper.text()).toContain('日记')
    expect(wrapper.find('mark').exists()).toBe(true)
  })

  it('无结果展示空态', async () => {
    const wrapper = mount(NoteSearchPanel, { props: { notes: [mk('1', '晨间随笔', '今天阳光很好。')] } })
    await wrapper.find('input').setValue('zzzzzzzzzz')
    expect(wrapper.text()).toContain('没有匹配')
  })

  it('点击结果发出 open 事件', async () => {
    const notes = [mk('1', 'React 笔记', 'hooks 相关')]
    const wrapper = mount(NoteSearchPanel, { props: { notes } })
    await wrapper.find('input').setValue('React')
    await wrapper.find('.nsearch-result').trigger('click')
    expect(wrapper.emitted('open')?.[0]).toEqual(['1'])
  })

  it('标签可被检索', async () => {
    const notes = [mk('1', '读书摘录', '一些想法', ['哲学']), mk('2', '随笔', '无标签')]
    const wrapper = mount(NoteSearchPanel, { props: { notes } })
    await wrapper.find('input').setValue('哲学')
    expect(wrapper.text()).toContain('读书摘录')
  })

  it('XSS 安全：恶意内容不被渲染为 HTML', async () => {
    const evil = '<img src=x onerror=alert(1)>'
    const notes = [mk('1', '笔记', evil)]
    const wrapper = mount(NoteSearchPanel, { props: { notes } })
    await wrapper.find('input').setValue('onerror')
    // 不渲染 img 元素；alert 不应成为可执行属性
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.html()).not.toContain('<img src=x onerror=alert(1)>')
  })
})