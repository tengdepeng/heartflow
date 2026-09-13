// ============================================================
// CanvasRoom · 浮动便签层集成测试（INCR-302 补挂载 CanvasNotes）
// CanvasNotes 零 props 自持读桥（modules/note 单例 store）；
// 双击 emit('edit') 由 App.vue 的 NoteLayer 全局编辑器承接（此处断言组件事件）；
// note store 为模块级单例 → 每用例 vi.resetModules() 隔离。
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMockStorage } from '../../../engine/storage/__tests__/test-utils'

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

async function mountRoom() {
  const { default: CanvasRoom } = await import('../CanvasRoom.vue')
  const wrapper = mount(CanvasRoom, {
    props: { renderMode: 'full', intensity: 1 },
    global: {
      stubs: {
        CrystalDetail: true,
        CanvasCarrier: true,
        CrystalLanding: true,
      },
    },
  })
  return wrapper
}

async function setupNoteStore() {
  const { getNoteStore } = await import('../../note')
  const store = getNoteStore()
  store.load()
  return store
}

beforeEach(async () => {
  vi.resetModules()
  ;(globalThis as any).localStorage = createMockStorage()
  const { invalidateCache } = await import('../../../engine/storage/core')
  invalidateCache()
  setActivePinia(createPinia())
})

describe('集成：浮动便签层（CanvasNotes → CanvasRoom）', () => {
  it('渲染便签层与空态', async () => {
    const wrapper = await mountRoom()
    const layer = wrapper.find('.canvas-notes')
    expect(layer.exists()).toBe(true)
    expect(wrapper.find('.cn-empty').exists()).toBe(true)
    expect(wrapper.find('.cn-empty').text()).toContain('暂无浮动画布笔记')
    expect(wrapper.findAll('.canvas-note').length).toBe(0)
    wrapper.unmount()
  })

  it('创建便签后按浮动模式渲染（标题/正文），board 模式排除', async () => {
    const store = await setupNoteStore()
    store.create('待办清单', '洗衣服')
    const boardNote = store.create('面板模式', '不浮动')
    store.moveToBoard(boardNote.id)
    const wrapper = await mountRoom()
    const notes = wrapper.findAll('.canvas-note')
    expect(notes.length).toBe(1)
    expect(notes[0].find('.cn-title').text()).toBe('待办清单')
    expect(notes[0].find('.cn-text').text()).toContain('洗衣服')
    expect(wrapper.find('.cn-empty').exists()).toBe(false)
    wrapper.unmount()
  })

  it('置顶便签加 pinned 类并保持浮动', async () => {
    const store = await setupNoteStore()
    const note = store.create('置顶测试', '内容')
    const wrapper = await mountRoom()
    const canvasNote = wrapper.find('.canvas-note')
    // 初始未置顶
    expect(canvasNote.classes()).not.toContain('canvas-note--pinned')
    // 点击置顶按钮（title=置顶）
    await canvasNote.find('.cn-btn[title="置顶"]').trigger('click')
    expect(wrapper.find('.canvas-note').classes()).toContain('canvas-note--pinned')
    expect(store.getStickyById(note.id)?.pinned).toBe(true)
    wrapper.unmount()
  })

  it('最小化后加 minimized 类', async () => {
    const store = await setupNoteStore()
    store.create('最小化测试', '内容')
    const wrapper = await mountRoom()
    const canvasNote = wrapper.find('.canvas-note')
    expect(canvasNote.classes()).not.toContain('canvas-note--minimized')
    await canvasNote.find('.cn-btn[title="最小化"]').trigger('click')
    expect(wrapper.find('.canvas-note').classes()).toContain('canvas-note--minimized')
    wrapper.unmount()
  })

  it('关闭便签移回面板模式，浮动列表回归空态', async () => {
    const store = await setupNoteStore()
    store.create('关闭测试', '内容')
    const wrapper = await mountRoom()
    expect(wrapper.findAll('.canvas-note').length).toBe(1)
    await wrapper.find('.canvas-note .cn-btn-close').trigger('click')
    expect(wrapper.findAll('.canvas-note').length).toBe(0)
    expect(wrapper.find('.cn-empty').exists()).toBe(true)
    wrapper.unmount()
  })

  it('双击便签派发 edit 事件（交由 NoteLayer 全局编辑器）', async () => {
    const store = await setupNoteStore()
    const note = store.create('双击测试', '打开编辑器')
    const wrapper = await mountRoom()
    const notesComp = wrapper.findComponent({ name: 'CanvasNotes' })
    expect(notesComp.exists()).toBe(true)
    await wrapper.find('.canvas-note').trigger('dblclick')
    const emitted = notesComp.emitted('edit')
    expect(emitted).toBeTruthy()
    const payload = emitted![0][0] as { id: string } | undefined
    expect(payload?.id).toBe(note.id)
    wrapper.unmount()
  })
})
