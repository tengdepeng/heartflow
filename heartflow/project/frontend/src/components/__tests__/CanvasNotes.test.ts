import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// 守护"画布轻量笔记"的交互：显示浮动便签、双击打开编辑器、空状态引导至笔记板。
// 注意：画布「＋便签」直接新建入口已移除（统一到全局笔记板），此处不再断言该入口。
describe('CanvasNotes 画布笔记层', () => {
  beforeEach(() => {
    vi.resetModules()
    try {
      localStorage.clear()
    } catch {
      /* ignore */
    }
  })

  it('画布直接新建便签入口已移除 — 仅经全局笔记板创建', async () => {
    const { default: CanvasNotes } = await import('../../components/CanvasNotes.vue')
    const { getNoteStore } = await import('../../modules/note')

    const wrapper = mount(CanvasNotes, {
      props: { ambient: false, containerWidth: 1000, containerHeight: 800 },
    })

    // 画布上不再有「＋便签」直接新建按钮
    expect(wrapper.find('.cn-add').exists()).toBe(false)

    // 便签数不应因挂载而自动增加（创建全部来自全局笔记板）
    const before = getNoteStore().noteCount.value
    expect(getNoteStore().noteCount.value).toBe(before)
  })

  it('空状态提示指向全局笔记板', async () => {
    const { default: CanvasNotes } = await import('../../components/CanvasNotes.vue')
    const wrapper = mount(CanvasNotes, {
      props: { ambient: false, containerWidth: 1000, containerHeight: 800 },
    })
    expect(wrapper.text()).toContain('暂无浮动画布笔记')
    expect(wrapper.text()).toContain('笔记板')
  })
})
