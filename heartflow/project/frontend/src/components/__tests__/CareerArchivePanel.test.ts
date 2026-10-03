import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import type { CareerContact, CareerProject, CareerConnection } from '../../modules/career/career'

// 不 mock career-analytics：组件测试应验证「分析引擎真实输出 → 模板绑定」的集成链路。
import CareerArchivePanel from '../CareerArchivePanel.vue'

const contacts: CareerContact[] = [
  { id: 'p1', name: '阿木', role: '设计师', tier: 'core', nodeType: 'colleague', affinity: 8, tags: [], note: '' },
  { id: 'p2', name: '林工', role: '工程师', tier: 'active', nodeType: 'peer', affinity: 6, tags: [], note: '' },
]

const projects: CareerProject[] = [
  { id: 'pr1', name: '试点', icon: '🧪', description: '', color: '#7ab87a', status: 'active', statusLabel: '进行中', partners: '', date: '' },
]

const connections: CareerConnection[] = [
  { id: 'c1', fromId: 'p1', toId: 'p2', type: 'strong' },
  { id: 'c2', fromId: 'p1', toId: 'p3', type: 'collaboration' },
  { id: 'c3', fromId: 'p2', toId: 'p3', type: 'mentorship' },
]

describe('CareerArchivePanel · INCR-445 连接类型分布接线', () => {
  it('存在连接时渲染「连接类型」区块并呈现各类型标签与图标', () => {
    const wrapper = mount(CareerArchivePanel, {
      props: { contacts, projects, connections },
    })
    const text = wrapper.text()
    expect(text).toContain('连接类型')
    // CAREER_CONN_META 标签：strong=紧密 / collaboration=协作 / mentorship=指导
    expect(text).toContain('紧密')
    expect(text).toContain('协作')
    expect(text).toContain('指导')
    // 图标随标签一同呈现（icon + label）
    expect(text).toContain('🧿')
    expect(text).toContain('🤝')
    expect(text).toContain('📖')
    wrapper.unmount()
  })

  it('连接为空时不渲染「连接类型」区块（v-if 守卫）', () => {
    const wrapper = mount(CareerArchivePanel, {
      props: { contacts, projects, connections: [] },
    })
    expect(wrapper.text()).not.toContain('连接类型')
    wrapper.unmount()
  })

  it('挂载即渲染业脉档案整体结构而不抛错（冒烟）', () => {
    const wrapper = mount(CareerArchivePanel, {
      props: { contacts, projects, connections },
    })
    expect(wrapper.find('section.cap').exists()).toBe(true)
    expect(wrapper.text()).toContain('业脉档案')
    wrapper.unmount()
  })
})
