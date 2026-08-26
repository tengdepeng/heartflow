// ============================================================
// 视图入场动画 composable
// 提供统一的分段入场动画，各视图只需在模板中加 data-enter 属性
// 支持与 App.vue 路由过渡动画协调（路由过渡完成后触发入场）
// ============================================================

import { ref, onMounted, nextTick, inject } from 'vue'
import type { InjectionKey, Ref } from 'vue'

export const ROUTE_TRANSITION_DONE_KEY: InjectionKey<Ref<boolean>> =
  Symbol('routeTransitionDone')

export interface EntranceOptions {
  /** 是否启用入场动画，默认 true */
  enabled?: boolean
  /** 基础延迟（ms），默认 0 */
  baseDelay?: number
  /** 每段间隔（ms），默认 80 */
  staggerMs?: number
  /** 是否等待路由过渡完成后再触发入场，默认 true */
  waitForRouteTransition?: boolean
}

/**
 * 视图入场动画
 *
 * 用法：
 * 1. 在视图中调用 `useViewEntrance()`
 * 2. 在模板中需要分段动画的元素上添加 `data-enter` 属性
 * 3. 在 CSS 中定义 `.enter-from` 和 `.enter-to` 状态
 *
 * 示例：
 * ```vue
 * <section data-enter>...</section>
 * <section data-enter>...</section>
 * ```
 *
 * CSS：
 * ```css
 * .view-entrance .enter-from { opacity: 0; transform: translateY(16px); }
 * .view-entrance .enter-to   { opacity: 1; transform: translateY(0); }
 * ```
 */
export function useViewEntrance(options: EntranceOptions = {}) {
  const {
    enabled = true,
    baseDelay = 0,
    staggerMs = 80,
    waitForRouteTransition = true,
  } = options

  const entered = ref(false)
  const entranceClass = ref('enter-from')
  const entranceRef = ref<HTMLElement | null>(null)

  /** 注入路由过渡完成状态（由 App.vue 提供） */
  const routeTransitionDone = inject(ROUTE_TRANSITION_DONE_KEY, null)

  function triggerEntrance() {
    if (!enabled) {
      entranceClass.value = 'enter-to'
      entered.value = true
      return
    }

    nextTick(() => {
      requestAnimationFrame(() => {
        entranceClass.value = 'enter-to'
        entered.value = true
      })
    })
  }

  onMounted(() => {
    if (waitForRouteTransition && routeTransitionDone?.value === false) {
      // 路由过渡尚未完成，等待信号
      const unwatch = routeTransitionDone!
      // 用轮询或 watch 都可以，这里用 setTimeout 轮询避免额外依赖
      const poll = setInterval(() => {
        if (unwatch.value === true) {
          clearInterval(poll)
          setTimeout(triggerEntrance, baseDelay)
        }
      }, 50)
    } else {
      // 直接触发
      setTimeout(triggerEntrance, baseDelay)
    }
  })

  return {
    /** 是否已入场 */
    entered,
    /** 当前入场状态类名：'enter-from' | 'enter-to' */
    entranceClass,
    /** 根元素 ref，用于绑定视图根元素 */
    entranceRef,
    /** 分段间隔（ms），供外部计算 data-enter 偏移 */
    staggerMs,
    /** 手动触发入场 */
    triggerEntrance,
  }
}

/**
 * 计算单个元素的入场延迟（基于 data-enter 索引）
 */
export function getEnterDelay(el: HTMLElement, staggerMs: number): number {
  const idx = Number(el.getAttribute('data-enter') ?? '0')
  return idx * staggerMs
}