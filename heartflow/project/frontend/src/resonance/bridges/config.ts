// ============================================================
// 共鸣协议层 · Config 桥接器
// 将配置状态通过共振层暴露，替代直接 import useConfigStore
// ============================================================

import { reactive } from 'vue'
import { useConfigStore } from '../../stores/config'
import { storeToRefs } from 'pinia'

export function useConfig() {
  const store = useConfigStore()
  const { config } = storeToRefs(store)

  return reactive({
    config,

    // 主题/显示
    updateTheme: store.updateTheme?.bind(store),
    updateTimer: store.updateTimer?.bind(store),
    updateAdvisorEnabled: store.updateAdvisorEnabled?.bind(store),
    updateOperationMode: store.updateOperationMode?.bind(store),

    // 背景
    updateBackgroundMedia: store.updateBackgroundMedia?.bind(store),
    resetBackgroundMedia: store.resetBackgroundMedia?.bind(store),
    setPresetScene: store.setPresetScene?.bind(store),

    // 场景预设
    getScenePresets: store.getScenePresets?.bind(store),
    saveCurrentAsPreset: store.saveCurrentAsPreset?.bind(store),
    applyScenePreset: store.applyScenePreset?.bind(store),
    deleteScenePreset: store.deleteScenePreset?.bind(store),
    renameScenePreset: store.renameScenePreset?.bind(store),

    // 手势
    updateGestureBinding: store.updateGestureBinding?.bind(store),
    replaceGestureBindings: store.replaceGestureBindings?.bind(store),

    // 其他
    updateStats: store.updateStats?.bind(store),
    updateTransitionDuration: store.updateTransitionDuration?.bind(store),
    updateVisualization: store.updateVisualization?.bind(store),
    updateComplianceOverride: store.updateComplianceOverride?.bind(store),
  })
}