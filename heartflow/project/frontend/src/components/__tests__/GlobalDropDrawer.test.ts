import { mount } from '@vue/test-utils'
import { describe, expect, it, afterEach } from 'vitest'
import type { ComponentOptions } from 'vue'
import GlobalDropDrawer from '../GlobalDropDrawer.vue'

/** 记录挂载实例：afterEach 统一 unmount，避免 Teleport 节点与 window 监听跨用例残留 */
const mounted: Array<{ unmount: () => void }> = []
function mountDrawer(options?: Parameters<typeof mount>[1]) {
  const w = mount(GlobalDropDrawer as unknown as ComponentOptions, options)
  mounted.push(w)
  return w
}
/**
 * 内容全部在 Teleport 内，不在 wrapper 的 DOM 树里，
 * 所以断言与触发都走原生 document（也更贴近真实点击路径）
 */
function clickGrip(side: 'left' | 'right') {
  const el = document.querySelector<HTMLElement>(`.gdd-grip--${side}`)
  el?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
}
const panel = () => document.body.querySelector('.gdd-panel')

afterEach(() => {
  while (mounted.length) {
    try { mounted.pop()?.unmount() } catch { /* noop */ }
  }
  document.body.querySelectorAll('.gdd-panel, .gdd-mask, .gdd-grip').forEach((n) => n.remove())
})

describe('GlobalDropDrawer', () => {
  it('渲染左右两个把手，初始不展开', () => {
    mountDrawer()
    expect(document.body.querySelectorAll('.gdd-grip')).toHaveLength(2)
    expect(panel()).toBeNull()
  })

  it('点击把手展开面板（具备 dialog 语义与无障碍名称）', async () => {
    const w = mountDrawer({ props: { label: '快捷面板' } })
    clickGrip('left')
    await w.vm.$nextTick()
    expect(panel()).not.toBeNull()
    expect(panel()?.getAttribute('role')).toBe('dialog')
    expect(panel()?.getAttribute('aria-label')).toBe('快捷面板')
  })

  it('右侧把手同样能唤出同一面板', async () => {
    const w = mountDrawer()
    clickGrip('right')
    await w.vm.$nextTick()
    expect(panel()).not.toBeNull()
    expect(panel()?.classList.contains('gdd-panel--right')).toBe(true)
  })

  it('默认插槽内容渲染进面板', async () => {
    const w = mountDrawer({ slots: { default: '<p class="mine">自定义内容</p>' } })
    clickGrip('right')
    await w.vm.$nextTick()
    expect(panel()?.querySelector('.mine')?.textContent).toBe('自定义内容')
  })

  it('Escape 关闭面板', async () => {
    const w = mountDrawer()
    clickGrip('left')
    await w.vm.$nextTick()
    expect(panel()).not.toBeNull()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await w.vm.$nextTick()
    expect(panel()).toBeNull()
  })

  it('点击遮罩关闭面板', async () => {
    const w = mountDrawer()
    clickGrip('left')
    await w.vm.$nextTick()
    const mask = document.body.querySelector('.gdd-mask')
    expect(mask).not.toBeNull()
    mask?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await w.vm.$nextTick()
    expect(panel()).toBeNull()
  })
})
