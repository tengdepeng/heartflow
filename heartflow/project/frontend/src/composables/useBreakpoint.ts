// ============================================================
// 视口断点单例（布局决策真源 · 640 / 1024）
// 与设备能力解耦：布局用 useBreakpoint()，原生能力用 hasCapability()
// 约定：手机 <640 / 平板 640–1023 / 桌面 ≥1024
// ============================================================
import { computed, ref } from 'vue'

export type Breakpoint = 'phone' | 'tablet' | 'desktop'

// 模块级单例：全应用共享同一 ref + 一个 resize 监听
const viewportWidth = ref(
  typeof window !== 'undefined' ? window.innerWidth : 1280,
)

const breakpoint = computed<Breakpoint>(() => {
  const w = viewportWidth.value
  if (w < 640) return 'phone'
  if (w < 1024) return 'tablet'
  return 'desktop'
})

let _listenerAttached = false
function ensureResizeListener() {
  if (_listenerAttached || typeof window === 'undefined') return
  _listenerAttached = true
  window.addEventListener('resize', () => {
    viewportWidth.value = window.innerWidth
  })
}

/**
 * 视口断点（布局决策）。响应式，组件内直接解构使用。
 * 例：const { isPhone, isTablet, isDesktop } = useBreakpoint()
 */
export function useBreakpoint() {
  ensureResizeListener()
  const isPhone = computed(() => breakpoint.value === 'phone')
  const isTablet = computed(() => breakpoint.value === 'tablet')
  const isDesktop = computed(() => breakpoint.value === 'desktop')
  return { viewportWidth, breakpoint, isPhone, isTablet, isDesktop }
}

/** 非响应式读取（事件回调 / 非组件上下文内） */
export function getBreakpointNow(): Breakpoint {
  const w = typeof window !== 'undefined' ? window.innerWidth : viewportWidth.value
  if (w < 640) return 'phone'
  if (w < 1024) return 'tablet'
  return 'desktop'
}
