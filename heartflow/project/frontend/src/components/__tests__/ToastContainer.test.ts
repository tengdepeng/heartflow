// ============================================================
// ToastContainer 组件测试
// ============================================================
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'

// 模拟 toast 模块
const mockDismiss = vi.fn()
const mockToasts = vi.fn()

vi.mock('../../modules/toast', () => ({
  useToast: () => ({
    toasts: mockToasts(),
    dismiss: mockDismiss,
  }),
}))

// 动态 import 让 mock 生效
async function getWrapper(toastList: any[]) {
  mockToasts.mockReturnValue(toastList)
  const { default: ToastContainer } = await import('../ToastContainer.vue')
  return mount(ToastContainer, {
    attachTo: document.body,
  })
}

describe('ToastContainer', () => {
  beforeEach(() => {
    mockDismiss.mockClear()
    mockToasts.mockClear()
    // 清除 body 中可能残留的 teleport 内容
    document.body.innerHTML = ''
  })

  it('无 toast 时渲染空容器', async () => {
    await getWrapper([])
    const items = document.querySelectorAll('.toast-item')
    expect(items).toHaveLength(0)
  })

  it('渲染 success 类型 toast', async () => {
    await getWrapper([
      { id: '1', type: 'success', text: '操作成功' },
    ])
    expect(document.body.textContent).toContain('操作成功')
    expect(document.body.textContent).toContain('✓')
  })

  it('渲染 error 类型 toast', async () => {
    await getWrapper([
      { id: '2', type: 'error', text: '出错了' },
    ])
    expect(document.body.textContent).toContain('出错了')
    expect(document.body.textContent).toContain('✕')
  })

  it('渲染 info 类型 toast', async () => {
    await getWrapper([
      { id: '3', type: 'info', text: '提示信息' },
    ])
    expect(document.body.textContent).toContain('提示信息')
    expect(document.body.textContent).toContain('ℹ')
  })

  it('渲染多条 toast', async () => {
    await getWrapper([
      { id: '1', type: 'success', text: '第一条' },
      { id: '2', type: 'error', text: '第二条' },
      { id: '3', type: 'info', text: '第三条' },
    ])
    const items = document.querySelectorAll('.toast-item')
    expect(items).toHaveLength(3)
  })

  it('点击关闭按钮调用 dismiss', async () => {
    await getWrapper([
      { id: '1', type: 'success', text: '关闭我' },
    ])
    const btn = document.querySelector('.toast-close')!
    ;(btn as HTMLElement).click()
    expect(mockDismiss).toHaveBeenCalledWith('1')
  })

  it('点击 toast 本身调用 dismiss', async () => {
    await getWrapper([
      { id: '2', type: 'error', text: '点击我' },
    ])
    const item = document.querySelector('.toast-item')!
    ;(item as HTMLElement).click()
    expect(mockDismiss).toHaveBeenCalledWith('2')
  })

  it('unknown 类型回退渲染', async () => {
    await getWrapper([
      { id: '4', type: 'unknown' as any, text: '未知类型' },
    ])
    expect(document.body.textContent).toContain('未知类型')
  })
})