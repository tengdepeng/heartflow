// ============================================================
// 全局 UI · 分步引导蒙层（Guide Tour / Coachmark，INCR-500）
// ------------------------------------------------------------
// 借鉴 96 APK「组件岛」raw 新手教程
// status_bar_tutorial_1~4 / how_install / custom_wallpaper_introduction
// / introduction_1~3：逐目标高亮 + 气泡说明的分步引导。
// 纯本地、零网络；完成态存 hf:guide_tour。
// 落点：触角 Touchpoints.vue（GuideTourPanel + GuideTourOverlay）。
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'

const STORAGE_KEY = 'hf:guide_tour'

export type TourPlacement = 'top' | 'bottom' | 'left' | 'right' | 'center'

export interface TourStep {
  id: string
  /** 目标元素 CSS 选择器；页面上找不到时居中展示 */
  target: string
  title: string
  content: string
  placement: TourPlacement
}

export interface TourDef {
  id: string
  name: string
  desc: string
  steps: TourStep[]
}

export interface GuideTourState {
  /** 已完成的引导 id（不再自动提示） */
  completed: string[]
}

export const DEFAULT_GUIDE_TOUR: GuideTourState = { completed: [] }

/** 内置引导：触角页速览（4 步，锚点由 data-tour 提供） */
export const GUIDE_TOURS: TourDef[] = [
  {
    id: 'touchpoints-tour',
    name: '触角速览',
    desc: '4 步了解触角页的核心开关',
    steps: [
      {
        id: 'notify',
        target: '[data-tour="notify"]',
        title: '通知设置',
        content: '在这里决定哪些时刻允许系统通知提醒你，专注完成、幕僚问候都可单独开关。',
        placement: 'bottom',
      },
      {
        id: 'glow',
        target: '[data-tour="glow"]',
        title: '锁屏光痕',
        content: '锁屏时留下一道柔和光晕动画，让每一次专注都被温柔记录。',
        placement: 'bottom',
      },
      {
        id: 'greeting',
        target: '[data-tour="greeting"]',
        title: '幕僚问候浮窗',
        content: '幕僚会在合适时机浮窗问候，浮窗大小与位置都可以按喜好调整。',
        placement: 'bottom',
      },
      {
        id: 'strategy',
        target: '[data-tour="strategy"]',
        title: '触达策略',
        content: '智能调度通知触达时机，避免过度打扰——把注意力留给真正重要的事。',
        placement: 'top',
      },
    ],
  },
]

// ---- 纯函数：几何计算（供蒙层定位气泡） ----

export interface Rect {
  left: number
  top: number
  width: number
  height: number
}

export interface Size {
  width: number
  height: number
}

export interface Point {
  left: number
  top: number
}

/** 把气泡坐标夹取进视口内（留出 margin 边距） */
export function clampTooltip(x: number, y: number, size: Size, vp: Size, margin = 12): Point {
  const maxX = Math.max(margin, vp.width - size.width - margin)
  const maxY = Math.max(margin, vp.height - size.height - margin)
  return {
    left: Math.min(Math.max(margin, x), maxX),
    top: Math.min(Math.max(margin, y), maxY),
  }
}

/** 依据目标矩形与方位算出气泡左上角坐标（center 或空矩形则视口居中） */
export function computeTooltip(
  rect: Rect,
  size: Size,
  vp: Size,
  placement: TourPlacement,
  gap = 14,
  margin = 12,
): Point {
  const empty = rect.width <= 0 || rect.height <= 0
  if (placement === 'center' || empty) {
    return clampTooltip((vp.width - size.width) / 2, (vp.height - size.height) / 2, size, vp, margin)
  }
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  let x = cx - size.width / 2
  let y = cy - size.height / 2
  switch (placement) {
    case 'top':
      y = rect.top - size.height - gap
      break
    case 'bottom':
      y = rect.top + rect.height + gap
      break
    case 'left':
      x = rect.left - size.width - gap
      break
    case 'right':
      x = rect.left + rect.width + gap
      break
  }
  return clampTooltip(x, y, size, vp, margin)
}

// ---- 运行态 ----
const state = ref<GuideTourState>({ ...DEFAULT_GUIDE_TOUR })
const activeId = ref<string | null>(null)
const index = ref(0)

function load(): void {
  try {
    const saved = storage.getKV<GuideTourState | null>(STORAGE_KEY, null)
    state.value = saved && Array.isArray(saved.completed)
      ? { completed: [...saved.completed] }
      : { ...DEFAULT_GUIDE_TOUR, completed: [] }
  } catch {
    state.value = { ...DEFAULT_GUIDE_TOUR, completed: [] }
  }
}

function persist(): void {
  storage.setKV(STORAGE_KEY, state.value)
}

load()

export function reloadGuideTour(): void {
  load()
  activeId.value = null
  index.value = 0
}

export function useGuideTour() {
  const tours = computed(() => GUIDE_TOURS)
  const completed = computed(() => state.value.completed)
  const isActive = computed(() => activeId.value !== null)
  const activeTour = computed(() => GUIDE_TOURS.find((t) => t.id === activeId.value) ?? null)
  const activeStep = computed<TourStep | null>(() => activeTour.value?.steps[index.value] ?? null)
  const total = computed(() => activeTour.value?.steps.length ?? 0)
  const isLast = computed(() => total.value > 0 && index.value >= total.value - 1)

  function isCompleted(id: string): boolean {
    return state.value.completed.includes(id)
  }

  function start(id: string): boolean {
    const tour = GUIDE_TOURS.find((t) => t.id === id)
    if (!tour || tour.steps.length === 0) return false
    activeId.value = id
    index.value = 0
    return true
  }

  function next(): void {
    if (!activeTour.value) return
    if (isLast.value) {
      finish()
      return
    }
    index.value += 1
  }

  function prev(): void {
    if (index.value > 0) index.value -= 1
  }

  function markCompleted(id: string): void {
    if (!state.value.completed.includes(id)) {
      state.value = { completed: [...state.value.completed, id] }
      persist()
    }
  }

  /** 完成：标记已读并关闭 */
  function finish(): void {
    if (activeId.value) markCompleted(activeId.value)
    activeId.value = null
    index.value = 0
  }

  /** 跳过：同样标记已读（不再自动提示），仅语义区别于完成 */
  function skip(): void {
    finish()
  }

  /** 重置某条引导的完成态 */
  function reset(id: string): void {
    state.value = { completed: state.value.completed.filter((c) => c !== id) }
    persist()
  }

  return {
    tours,
    completed,
    isActive,
    activeTour,
    activeStep,
    index,
    total,
    isLast,
    isCompleted,
    start,
    next,
    prev,
    finish,
    skip,
    reset,
  }
}
