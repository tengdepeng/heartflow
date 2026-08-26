// ============================================================
// 三层空间 · 切换面板开关（单例）
// 切换面板(SwitchPanel) 与 触发器(useLayerSwitchTrigger) 共用同一 isOpen 状态，
// 解耦「谁触发」与「面板渲染」，便于键盘/手势/未来入口各自打开。
// ============================================================

import { ref } from 'vue'

/** 面板是否打开（模块级单例，所有消费者共享） */
const isOpen = ref(false)

export function useLayerSwitch() {
  return {
    isOpen,
    open: () => {
      isOpen.value = true
    },
    close: () => {
      isOpen.value = false
    },
    toggle: () => {
      isOpen.value = !isOpen.value
    },
  }
}
