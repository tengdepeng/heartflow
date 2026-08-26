import { beforeEach, describe, expect, it, vi } from 'vitest'

// 守护修复：CanvasNotes / NoteLayer / NoteBoard 之前各自调用 useNote() 新建独立状态，
// 导致"画布新建的便签在编辑器保存时失效"。统一改用 getNoteStore() 单例后，必须保证
// 跨组件拿到的是同一份响应式状态。
describe('note store 单例一致性', () => {
  beforeEach(() => {
    vi.resetModules()
    try {
      localStorage.clear()
    } catch {
      /* 某些环境下 localStorage 不可用，忽略 */
    }
  })

  it('getNoteStore 多次调用返回同一实例', async () => {
    const { getNoteStore } = await import('../index')
    const a = getNoteStore()
    const b = getNoteStore()
    expect(a).toBe(b)
  })

  it('在单例 A 新建的便签，可从单例 B 读到（画布创建 → 编辑器保存闭环）', async () => {
    const { getNoteStore } = await import('../index')
    const a = getNoteStore()
    const created = a.create('标题', '内容', ['t'])
    const b = getNoteStore()
    expect(b.getNoteById(created.id)).toBeDefined()
    expect(b.getNoteById(created.id)?.title).toBe('标题')

    // 从 B 更新，A 也能看到 —— 证明状态共享
    b.update(created.id, { title: '改后' })
    expect(a.getNoteById(created.id)?.title).toBe('改后')
  })

  it('便签位置更新在单例间同步', async () => {
    const { getNoteStore } = await import('../index')
    const a = getNoteStore()
    const created = a.create('p', 'c')
    a.updateStickyPosition(created.id, 42, 17)
    const b = getNoteStore()
    expect(b.getStickyById(created.id)?.stickyX).toBe(42)
    expect(b.getStickyById(created.id)?.stickyY).toBe(17)
  })
})
