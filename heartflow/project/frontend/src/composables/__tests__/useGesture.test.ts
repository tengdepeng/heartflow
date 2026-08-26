// ============================================================
// useGesture 手势识别 composable · 测试
// ============================================================

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'

describe('useGesture', () => {
  let el: { addEventListener: any; removeEventListener: any; getBoundingClientRect: any; style: any }
  let elRef: any

  beforeEach(() => {
    el = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600, x: 0, y: 0 })),
      style: {},
    }
    elRef = ref(el)
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  async function fresh() {
    const { useGesture } = await import('../useGesture')
    const g = useGesture(elRef, vi.fn())
    g.attach()
    return g
  }

  it('导出 gesture ref 和 attach/detach', async () => {
    const g = await fresh()
    expect(g.gesture).toBeDefined()
    expect(g.gesture.value).toBeNull()
    expect(typeof g.attach).toBe('function')
    expect(typeof g.detach).toBe('function')
  })

  it('attach 绑定 pointer 事件到元素', async () => {
    const { useGesture } = await import('../useGesture')
    const g = useGesture(elRef, vi.fn())
    g.attach()
    expect(el.addEventListener).toHaveBeenCalledWith('pointerdown', expect.any(Function), expect.any(Object))
    expect(el.addEventListener).toHaveBeenCalledWith('pointermove', expect.any(Function), expect.any(Object))
    expect(el.addEventListener).toHaveBeenCalledWith('pointerup', expect.any(Function), expect.any(Object))
  })

  it('detach 移除事件监听', async () => {
    const { useGesture } = await import('../useGesture')
    const g = useGesture(elRef, vi.fn())
    g.attach()
    g.detach()
    expect(el.removeEventListener).toHaveBeenCalled()
  })

  it('多次 attach/detach 不报错', async () => {
    const g = await fresh()
    g.detach()
    g.attach()
    g.detach()
    expect(g.gesture).toBeDefined()
  })

  it('gesture 初始为 null', async () => {
    const g = await fresh()
    expect(g.gesture.value).toBeNull()
  })
})