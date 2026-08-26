// ============================================================
// 三层空间 · 切换触发器（键盘 + 手势，三端适配、可自定义）
// - 键盘：config.switchTrigger.key（默认 'Backquote' 反引号）切换面板开关
// - 手势：在「空白区」长按 config.switchTrigger.longPressMs（默认 500ms）打开面板
//   空白区 = 非交互控件（按钮/链接/输入/导航/玉珠/笔记等）的区域，三端(pointer 事件)通用
// 宪法：触发方式用户可在装修工坊自定义（写入 config.switchTrigger）。
// ============================================================

import { onMounted, onUnmounted } from 'vue'
import { useConfigStore } from '../stores/config'
import { useLayerSwitch } from './useLayerSwitch'

const INTERACTIVE_SELECTOR =
  'button, a, input, textarea, select, [contenteditable], .floating-nav, .nav-bar, .sidebar-overlay, .switch-panel, .mirror-self-wrapper, .note-layer, .jade-stage, .orb-stage, .timer-controls, .home-focus'

export function useLayerSwitchTrigger() {
  const configStore = useConfigStore()
  const { toggle, open } = useLayerSwitch()

  function isTypingTarget(e: KeyboardEvent): boolean {
    const t = e.target as HTMLElement | null
    if (!t) return false
    const tag = t.tagName
    return tag === 'INPUT' || tag === 'TEXTAREA' || t.isContentEditable
  }

  function onKeydown(e: KeyboardEvent) {
    const key = configStore.config.worldShell.switchTrigger?.key
    if (!key) return
    if (e.code === key) {
      if (isTypingTarget(e)) return
      e.preventDefault()
      toggle()
    }
  }

  let pressTimer: number | undefined
  let startX = 0
  let startY = 0
  let moved = false

  function onPointerDown(e: PointerEvent) {
    const ms = configStore.config.worldShell.switchTrigger?.longPressMs ?? 0
    if (!ms) return
    const target = e.target as HTMLElement | null
    if (target && target.closest(INTERACTIVE_SELECTOR)) return // 控件区不触发
    startX = e.clientX
    startY = e.clientY
    moved = false
    pressTimer = window.setTimeout(() => {
      pressTimer = undefined
      if (!moved) open()
    }, ms)
  }

  function clearTimer() {
    if (pressTimer !== undefined) {
      clearTimeout(pressTimer)
      pressTimer = undefined
    }
  }

  function onPointerMove(e: PointerEvent) {
    if (pressTimer === undefined) return
    if (Math.abs(e.clientX - startX) > 12 || Math.abs(e.clientY - startY) > 12) {
      moved = true
      clearTimer()
    }
  }

  function onPointerUp() {
    clearTimer()
  }

  onMounted(() => {
    window.addEventListener('keydown', onKeydown)
    window.addEventListener('pointerdown', onPointerDown, { passive: true })
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerup', onPointerUp, { passive: true })
    window.addEventListener('pointercancel', onPointerUp, { passive: true })
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', onKeydown)
    window.removeEventListener('pointerdown', onPointerDown)
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onPointerUp)
  })
}
