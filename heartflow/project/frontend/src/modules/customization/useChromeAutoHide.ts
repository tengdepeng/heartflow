// ============================================================
// 超级自定义 · 界面自动隐藏（沉浸模式）
// 中央共享「界面显隐」状态 + 全局活动监听。
//
// 设计要点：
// - 模块级单例 chromeVisible：所有需要跟随显隐的界面元素
//   （侧边栏、星盘按钮、画布控制簇、笔记板 FAB、移动端上下栏）
//   共享同一份可见性，互不冲突。
// - 任意用户活动（指针移动 / 按下 / 按键 / 触摸 / 滚轮 / 滚动）会重置空闲计时；
//   空闲超过 IDLE_MS 且 autoHideChrome 开启时，界面自动隐藏（chromeHidden = true）。
// - 与 useAppearance.autoHideChrome 联动：开关关闭时界面恒显；开启时进入沉浸自动隐藏。
// ============================================================

import { ref, computed } from 'vue'
import { useAppearance } from './useAppearance'

/** 界面是否可见（活动 → true；空闲超时 → false） */
const chromeVisible = ref(true)

/** 侧栏是否应处于自动隐藏态（侧栏显示后无操作超时 → 吸附最近边框滑出隐藏；与 chromeHidden 解耦） */
const sidebarAutoHidden = ref(false)

/** 侧栏是否处于「用户显式展开、保持常驻」态。
 *  用户点 ≡ 展开后置 true：此后不自动收起（sidebarAutoHidden 不被空闲计时置真），
 *  侧栏保持打开直到用户再次点 ≡ 收起。避免「打开侧栏后稍作停顿即被沉浸自动隐藏吞掉点击」。 */
const sidebarPinned = ref(false)

let idleTimer: ReturnType<typeof setTimeout> | null = null
let sidebarIdleTimer: ReturnType<typeof setTimeout> | null = null
let initialized = false

const { autoHideChrome, autoHideDelay } = useAppearance()

/** 派生：界面是否应处于隐藏态（开关开启 且 当前不可见） */
const chromeHidden = computed(() => autoHideChrome.value && !chromeVisible.value)

/** 记录一次用户活动：立即显示界面并重启空闲计时（时长取设置项，实时生效） */
function poke(): void {
  if (!chromeVisible.value) chromeVisible.value = true
  if (idleTimer) clearTimeout(idleTimer)
  idleTimer = setTimeout(() => {
    if (autoHideChrome.value) chromeVisible.value = false
  }, Math.max(500, autoHideDelay.value))
}

/** 侧栏活动：显示侧栏并重启侧栏专属空闲计时（独立于 chrome 计时，互不打架） */
function pokeSidebar(): void {
  if (sidebarAutoHidden.value) sidebarAutoHidden.value = false
  if (sidebarIdleTimer) clearTimeout(sidebarIdleTimer)
  // 显式展开（pinned）后不启动自动收起计时：侧栏保持常驻，直至用户主动收起（setSidebarPinned(false)）
  if (sidebarPinned.value) return
  sidebarIdleTimer = setTimeout(() => {
    if (autoHideChrome.value) sidebarAutoHidden.value = true
  }, Math.max(500, autoHideDelay.value))
}

/** 显式展开 / 收起侧栏时由 App.vue 调用：展开即 pinned（常驻、不自动收起），收起即 unpin（恢复空闲自动隐藏） */
function setSidebarPinned(v: boolean): void {
  sidebarPinned.value = v
  if (v) {
    // 展开：立即清掉可能的自动隐藏残留，保持可见
    if (sidebarAutoHidden.value) sidebarAutoHidden.value = false
    if (sidebarIdleTimer) clearTimeout(sidebarIdleTimer)
  }
}

/** 启动全局活动监听（App.vue onMounted 调用一次） */
function initChromeAutoHide(): void {
  if (initialized) return
  initialized = true
  const events: Array<keyof WindowEventMap> = [
    'pointermove',
    'pointerdown',
    'keydown',
    'touchstart',
    'wheel',
    'scroll',
    'resize',
  ]
  events.forEach((e) => window.addEventListener(e, () => { poke(); pokeSidebar() }, { passive: true }))
  poke()
  pokeSidebar()
}

export function useChromeAutoHide() {
  return {
    chromeVisible,
    chromeHidden,
    sidebarAutoHidden,
    sidebarPinned,
    autoHideChrome,
    poke,
    pokeSidebar,
    setSidebarPinned,
    initChromeAutoHide,
  }
}
