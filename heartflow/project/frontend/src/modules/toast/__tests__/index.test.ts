// ============================================================
// Toast 消息模块 · 测试
// ============================================================

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

describe('toast 模块', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.resetModules()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  async function fresh() {
    vi.resetModules()
    return await import('../index')
  }

  it('showToast 添加一条 success 消息', async () => {
    const mod = await fresh()
    const toast = mod.useToast()
    mod.showToast('操作成功', 'success')
    expect(toast.toasts.value).toHaveLength(1)
    expect(toast.toasts.value[0].text).toBe('操作成功')
    expect(toast.toasts.value[0].type).toBe('success')
  })

  it('showToast 添加一条 error 消息', async () => {
    const mod = await fresh()
    const toast = mod.useToast()
    mod.showToast('出错了', 'error')
    expect(toast.toasts.value[0].type).toBe('error')
  })

  it('showToast 默认类型为 success', async () => {
    const mod = await fresh()
    const toast = mod.useToast()
    mod.showToast('默认')
    expect(toast.toasts.value[0].type).toBe('success')
  })

  it('showToast 多条消息依次添加', async () => {
    const mod = await fresh()
    const toast = mod.useToast()
    mod.showToast('第一条', 'info')
    mod.showToast('第二条', 'success')
    mod.showToast('第三条', 'error')
    expect(toast.toasts.value).toHaveLength(3)
    expect(toast.toasts.value[0].text).toBe('第一条')
    expect(toast.toasts.value[1].text).toBe('第二条')
  })

  it('showToast 3 秒后自动消失', async () => {
    const mod = await fresh()
    const toast = mod.useToast()
    mod.showToast('临时消息', 'success')
    expect(toast.toasts.value).toHaveLength(1)
    vi.advanceTimersByTime(3000)
    expect(toast.toasts.value).toHaveLength(0)
  })

  it('useToast 返回 toasts 和 dismiss', async () => {
    const mod = await fresh()
    const toast = mod.useToast()
    expect(toast.toasts).toBeDefined()
    expect(typeof toast.dismiss).toBe('function')
  })

  it('dismiss 手动关闭指定消息', async () => {
    const mod = await fresh()
    const toast = mod.useToast()
    mod.showToast('消息1', 'info')
    mod.showToast('消息2', 'success')
    const id = toast.toasts.value[0].id
    toast.dismiss(id)
    expect(toast.toasts.value).toHaveLength(1)
    expect(toast.toasts.value[0].text).toBe('消息2')
  })

  it('每条消息有唯一 id', async () => {
    const mod = await fresh()
    const toast = mod.useToast()
    mod.showToast('a', 'info')
    mod.showToast('b', 'success')
    mod.showToast('c', 'error')
    const ids = toast.toasts.value.map((t: any) => t.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(3)
  })
})