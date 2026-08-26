// ============================================================
// Toast 消息提示模块
// 全局响应式 toasts 队列，提供 showToast 与 useToast
// ============================================================

import { ref } from 'vue'

export interface ToastMessage {
  id: number
  text: string
  type: 'success' | 'error' | 'info'
}

let nextId = 0
const toasts = ref<ToastMessage[]>([])

/** 显示一条 Toast 消息，3 秒后自动消失 */
export function showToast(text: string, type: ToastMessage['type'] = 'success'): void {
  const id = nextId++
  toasts.value.push({ id, text, type })
  setTimeout(() => {
    dismissToast(id)
  }, 3000)
}

/** 手动关闭指定 Toast */
function dismissToast(id: number): void {
  toasts.value = toasts.value.filter(t => t.id !== id)
}

/** 在组件中获取响应式 toasts 数组和 dismiss 方法 */
export function useToast() {
  function dismiss(id: number) {
    dismissToast(id)
  }
  return { toasts, dismiss }
}