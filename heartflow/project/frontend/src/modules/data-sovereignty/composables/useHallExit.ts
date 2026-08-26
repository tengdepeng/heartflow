// ============================================================
// 数据主权与遗忘退场 · 大厅退出状态组合式函数
// 封装 6 种大厅退出状态的 UI 状态管理和过渡动画控制
// ============================================================

import { ref, computed } from 'vue'
import {
  getSovereigntyConfig,
  updateSovereigntyConfig,
  HALL_EXIT_STATES,
  getHallExitStateInfo,
} from '../sovereignty-engine'
import type { HallExitState } from '../types'

export function useHallExit() {
  const config = getSovereigntyConfig()

  // ---- 状态 ----

  /** 当前选中的退出状态 */
  const selectedExitState = ref<HallExitState>(config.value.preferredExitState)

  /** 是否显示退出过渡动画 */
  const showExitTransition = ref(false)

  /** 过渡动画进行中 */
  const isTransitioning = ref(false)

  /** 过渡动画已结束 */
  const transitionComplete = ref(false)

  /** 是否显示退出状态选择器 */
  const showExitStatePicker = ref(false)

  // ---- 计算属性 ----

  /** 大厅退出状态列表 */
  const exitStates = computed(() => HALL_EXIT_STATES)

  /** 当前退出状态信息 */
  const currentExitStateInfo = computed(() => getHallExitStateInfo(selectedExitState.value))

  /** 退出过渡动画是否启用 */
  const exitTransitionEnabled = computed({
    get: () => config.value.exitTransitionEnabled,
    set: (v: boolean) => updateSovereigntyConfig({ exitTransitionEnabled: v }),
  })

  // ---- 方法 ----

  /**
   * 选择退出状态
   */
  function selectExitState(state: HallExitState) {
    selectedExitState.value = state
    config.value.preferredExitState = state
    updateSovereigntyConfig({ preferredExitState: state })
  }

  /**
   * 触发退出过渡动画
   * 返回 Promise，在动画完成后 resolve
   */
  function triggerExitTransition(): Promise<void> {
    return new Promise((resolve) => {
      isTransitioning.value = true
      transitionComplete.value = false
      showExitTransition.value = true

      const duration = currentExitStateInfo.value.transitionDuration
      setTimeout(() => {
        transitionComplete.value = true
        setTimeout(() => {
          isTransitioning.value = false
          showExitTransition.value = false
          resolve()
        }, 500)
      }, duration)
    })
  }

  /**
   * 重置退出状态
   */
  function resetExitState() {
    showExitTransition.value = false
    isTransitioning.value = false
    transitionComplete.value = false
  }

  /**
   * 获取退出状态颜色（CSS 变量值）
   */
  function getExitStateColor(state?: HallExitState): string {
    const info = state ? getHallExitStateInfo(state) : currentExitStateInfo.value
    return info.color
  }

  /**
   * 获取退出状态诗歌
   */
  function getExitStatePoem(state?: HallExitState): string {
    const info = state ? getHallExitStateInfo(state) : currentExitStateInfo.value
    return info.poem
  }

  return {
    // 状态
    selectedExitState,
    showExitTransition,
    isTransitioning,
    transitionComplete,
    showExitStatePicker,

    // 计算属性
    exitStates,
    currentExitStateInfo,
    exitTransitionEnabled,

    // 方法
    selectExitState,
    triggerExitTransition,
    resetExitState,
    getExitStateColor,
    getExitStatePoem,
  }
}