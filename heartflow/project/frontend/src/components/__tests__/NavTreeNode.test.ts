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

function room(id: string, name: string, path: string, icon = '◆'): NavTreeNodeData {
  return { id, name, icon, color: '#b89a6a', path, group: 'world', children: [] }
}

function mountNode(node: NavTreeNodeData, expandedIds: string[] = [], draggable = !!node.path) {
  return mount(NavTreeNode, {
    props: {
      node,
      depth: 0,
      activeId: '',
      adjacentIds: [],
      expandedIds: new Set(expandedIds),
      toggleExpand: () => {},
      draggable,
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

  it('图片型自定义图标（data-uri）渲染 <img> 而非字形', () => {
    const wrapper = mountNode(room('reward', '劳酬', '/reward', 'data:image/png;base64,AAA'))
    const img = wrapper.find('.nav-icon-img img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe('data:image/png;base64,AAA')
    // 不应再渲染「纯字形」span（图片分支的包裹 span 带 .nav-icon-img，须排除）
    expect(wrapper.find('.nav-icon:not(.nav-icon-img)').exists()).toBe(false)
  })

  it('分组头不可作为拖拽源（draggable=false 时仍只有落点、无手柄）', () => {
    // 旧断言：分组头无手柄。Item 1 后分组头可拖（draggable=true 时带手柄），
    // 此处保留「draggable=false 仍无手柄」的边界断言，避免无差别渲染手柄。
    const wrapper = mountNode(groupHead('tax-custom-ug-1', '新分组'))
    expect(wrapper.find('.nav-grip').exists()).toBe(false)
  })

  it('Item 1：分组头 draggable=true 时带拖拽手柄（可作重排源）', () => {
    const wrapper = mountNode(groupHead('tax-domain-time', '时间 · 记忆'), [], true)
    expect(wrapper.find('.nav-grip').exists()).toBe(true)
    expect(wrapper.find('.nav-item-core').classes()).toContain('is-group-head')
  })

  it('Item 1：分组头拖到另一分组头 → emit moveNode(税域A, 税域B)', async () => {
    const a = mountNode(groupHead('tax-domain-time', '时间'), [], true)
    const b = mountNode(groupHead('tax-domain-work', '工作'), [], true)

    // 落点 B 是分组头（带 is-group-head 类），满足「分组头之间才重排」
    const bCore = b.find('.nav-item-core').element as HTMLElement
    const spy = vi.spyOn(document, 'elementFromPoint').mockReturnValue(bCore)

    const grip = a.find('.nav-grip')
    await grip.trigger('pointerdown', { pointerId: 3, clientX: 0, clientY: 0 })
    await grip.trigger('pointermove', { pointerId: 3, clientX: 10, clientY: 10 })

    expect(b.find('.nav-item-core').classes()).toContain('is-drop-target')
    expect(a.find('.nav-item-core').classes()).toContain('is-dragging')

    await grip.trigger('pointerup', { pointerId: 3, clientX: 10, clientY: 10 })

    const ev = a.emitted('moveNode')
    expect(ev).toBeTruthy()
    expect(ev![0]).toEqual(['tax-domain-time', 'tax-domain-work'])

    spy.mockRestore()
  })

  it('Item 1：分组头拖到「房间项」不产生落点（仅分组头之间重排）', async () => {
    const a = mountNode(groupHead('tax-domain-time', '时间'), [], true)
    const roomNode = mountNode(room('reward', '劳酬', '/reward'))

    const rCore = roomNode.find('.nav-item-core').element as HTMLElement
    const spy = vi.spyOn(document, 'elementFromPoint').mockReturnValue(rCore)

    const grip = a.find('.nav-grip')
    await grip.trigger('pointerdown', { pointerId: 4, clientX: 0, clientY: 0 })
    await grip.trigger('pointermove', { pointerId: 4, clientX: 5, clientY: 5 })

    // 分组头拖到房间：落点应被清空（itemIsGroup 为 false）
    expect(a.emitted('moveNode')).toBeFalsy()
    spy.mockRestore()
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

  it('把房间拖入「空自定义分组头」也能 emit moveNode(room, tax-custom-ug-x)', async () => {
    // 用户实测：「从屏风移动前院两个就移动不回去」「新建分组也有问题」。
    // 根因之一是空分组头此前不渲染 → 落点不存在；现空组头照常渲染并带
    // data-node-id，这里断言拖到空组头能正确上抛 moveNode(房间, 分组头id)，
    // 让 App.vue onMoveNode 走 addRoomToGroup 把房间归入该自定义分组。
    const r = mountNode(room('reward', '劳酬', '/reward'))
    const emptyGroup = mountNode(groupHead('tax-custom-ug-1', '新分组'))

    const gCore = emptyGroup.find('.nav-item-core').element as HTMLElement
    expect(gCore.getAttribute('data-node-id')).toBe('tax-custom-ug-1')
    const spy = vi.spyOn(document, 'elementFromPoint').mockReturnValue(gCore)

    const grip = r.find('.nav-grip')
    await grip.trigger('pointerdown', { pointerId: 2, clientX: 0, clientY: 0 })
    await grip.trigger('pointermove', { pointerId: 2, clientX: 5, clientY: 5 })

    // 空组头必须出现落点高亮（证明落点命中，而非「看不见」）
    expect(emptyGroup.find('.nav-item-core').classes()).toContain('is-drop-target')
    expect(emptyGroup.find('.nav-item-core').classes()).toContain('is-empty-group')

    await grip.trigger('pointerup', { pointerId: 2, clientX: 5, clientY: 5 })

    const ev = r.emitted('moveNode')
    expect(ev).toBeTruthy()
    expect(ev![0]).toEqual(['reward', 'tax-custom-ug-1'])

    spy.mockRestore()
  })
})
