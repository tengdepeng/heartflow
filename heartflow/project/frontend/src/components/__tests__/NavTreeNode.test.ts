// ============================================================
// NavTreeNode 单测
// ----------------------------------------------------------
// 聚焦「侧栏内移动房间移不回去」的 DOM 层证据：
// 空分组头（children 为空、无 path）必须照常渲染，并带 data-node-id
// —— 拖拽落点判定走 document.elementFromPoint(...).closest('.nav-item-core')
//    再取 data-node-id，DOM 里没有这个节点就等于落点不存在。
// ============================================================
import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import NavTreeNode from '../NavTreeNode.vue'

/** 与 NavTreeNode.vue 的 props.node 结构保持一致（SFC 内类型导出不便直接引入） */
interface NavTreeNodeData {
  id: string
  name: string
  icon: string
  color: string
  path: string
  group: string
  children: NavTreeNodeData[]
}

function groupHead(id: string, name: string, children: NavTreeNodeData[] = []): NavTreeNodeData {
  return {
    id,
    name,
    icon: '·',
    color: '#b89a6a',
    path: '', // 无 path = 分组头
    group: 'world',
    children,
  }
}

function room(id: string, name: string, path: string): NavTreeNodeData {
  return { id, name, icon: '◆', color: '#b89a6a', path, group: 'world', children: [] }
}

function mountNode(node: NavTreeNodeData, expandedIds: string[] = []) {
  return mount(NavTreeNode, {
    props: {
      node,
      depth: 0,
      activeId: '',
      adjacentIds: [],
      expandedIds: new Set(expandedIds),
      toggleExpand: () => {},
      draggable: !!node.path,
    },
    global: {
      stubs: { 'router-link': { template: '<a><slot /></a>' } },
    },
  })
}

describe('NavTreeNode · 空分组头', () => {
  it('空分组头照常渲染，且带 data-node-id（拖拽落点存在）', () => {
    const wrapper = mountNode(groupHead('tax-slot-screen', '屏风'))
    const core = wrapper.find('.nav-item-core')
    expect(core.exists()).toBe(true)
    // 落点判定的唯一依据：节点带 data-node-id
    expect(core.attributes('data-node-id')).toBe('tax-slot-screen')
    // 用户可见：分组名 + 空态提示
    expect(wrapper.text()).toContain('屏风')
    expect(wrapper.text()).toContain('空 · 拖到此处')
    // 带 is-empty-group / is-group-head 类，供弱化样式与落点高亮使用
    expect(core.classes()).toContain('is-empty-group')
    expect(core.classes()).toContain('is-group-head')
  })

  it('非空分组头不显示空态提示，展开后显示子房间', () => {
    const node = groupHead('tax-slot-screen', '屏风', [room('reward', '劳酬', '/reward')])
    const wrapper = mountNode(node, ['tax-slot-screen'])
    expect(wrapper.text()).not.toContain('空 · 拖到此处')
    expect(wrapper.text()).toContain('劳酬')
    expect(wrapper.find('.nav-item-core').classes()).not.toContain('is-empty-group')
    // 折叠态显示子项数量徽标
    const collapsed = mountNode(node)
    expect(collapsed.find('.nav-child-count').text()).toBe('1')
  })

  it('房间节点不是分组头，也不显示空态提示', () => {
    const wrapper = mountNode(room('reward', '劳酬', '/reward'))
    const core = wrapper.find('.nav-item-core')
    expect(core.attributes('data-node-id')).toBe('reward')
    expect(core.classes()).not.toContain('is-group-head')
    expect(core.classes()).not.toContain('is-empty-group')
    // 房间可拖（有拖拽手柄）
    expect(wrapper.find('.nav-grip').exists()).toBe(true)
  })

  it('空分组头没有拖拽手柄（分组头不可作为拖拽源，只能作落点）', () => {
    const wrapper = mountNode(groupHead('tax-custom-ug-1', '新分组'))
    expect(wrapper.find('.nav-grip').exists()).toBe(false)
  })
})

// ============================================================
// 真实拖拽链路回归（反形式主义）：
// 此前 navDrag 写在组件 setup 内 → 每实例各持一份 → 目标节点永远收不到
// targetId → is-drop-target 永不出现 → 用户看不到落点、以为拖不动。
// 这里挂两个独立实例、共享模块级 navDrag，模拟「从 A 拖、悬停 B」，
// 断言 B 立即出现落点高亮、松手 emit moveNode(A,B)。直接测真实组件，不镜像。
// ============================================================
describe('NavTreeNode · 真实拖拽落点高亮（共享态）', () => {
  it('A 拖拽悬停 B 时 B 高亮、松手 emit moveNode(A,B)', async () => {
    const a = mountNode(room('reward', '劳酬', '/reward'))
    const b = mountNode(room('garden', '花园', '/garden'))

    // jsdom 无布局，elementFromPoint 直接返回 B 的核心节点
    const bCore = b.find('.nav-item-core').element as HTMLElement
    const spy = vi.spyOn(document, 'elementFromPoint').mockReturnValue(bCore)

    const grip = a.find('.nav-grip')
    await grip.trigger('pointerdown', { pointerId: 1, clientX: 0, clientY: 0 })
    await grip.trigger('pointermove', { pointerId: 1, clientX: 10, clientY: 10 })

    // 目标节点 B 必须出现落点高亮，源节点 A 处于拖拽中
    expect(b.find('.nav-item-core').classes()).toContain('is-drop-target')
    expect(a.find('.nav-item-core').classes()).toContain('is-dragging')

    await grip.trigger('pointerup', { pointerId: 1, clientX: 10, clientY: 10 })

    // 松手 → 真实 moveNode 事件上抛，拖动端到端打通
    const ev = a.emitted('moveNode')
    expect(ev).toBeTruthy()
    expect(ev![0]).toEqual(['reward', 'garden'])

    spy.mockRestore()
  })
})
