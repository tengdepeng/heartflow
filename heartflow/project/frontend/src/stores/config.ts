// ============================================================
// 配置状态管理
// ============================================================

import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { AppConfig, ScenePreset, SurfaceState, WorldShellType, FloatingLayerState } from '../types'
import { storage } from '../engine/storage'
import { unlocked } from '../engine/storage/unlock-state'
import type { GestureAction } from '../modules/gesture/contracts'
import type { GestureType } from '../modules/gesture/types'

// 记录用户显式设置过的合规覆盖字段（优先级高于宪法推导）
const userTouchedOverrideKeys = new Set<string>()

export const useConfigStore = defineStore('config', () => {
  const config = ref<AppConfig>(storage.getConfig())
  // reload/重启后从持久化的用户触碰标记恢复优先级集合，使引擎推导不再覆盖用户手动设置
  if (Array.isArray(config.value.overrideUserTouched)) {
    for (const k of config.value.overrideUserTouched) userTouchedOverrideKeys.add(k)
  } else {
    config.value.overrideUserTouched = []
  }

  // 自动持久化
  watch(config, (val) => {
    storage.setConfig(val)
  }, { deep: true })

  /**
   * 解锁后重新同步真实配置。
   * 根因：加密启动时 store 在创建时仅取一次 storage.getConfig()，
   * 此时处于锁屏态 → loadSchema() 返回 createDefaultSchema()（operationMode:'silent'）。
   * 解锁后 _schemaCache 已水合为真实配置，但 store 不会自动重新读取，
   * 导致设置面板显示默认值、改一次才「恢复」——即「幕僚设置卡死/重置」。
   * 此处监听解锁态，解锁即把 config 重新同步为 storage.getConfig() 的真实值。
   */
  function syncConfigFromStorage() {
    const real = storage.getConfig()
    // 重建用户触碰标记集合，使已持久化的合规覆盖优先级在解锁后依然生效
    userTouchedOverrideKeys.clear()
    if (Array.isArray(real.overrideUserTouched)) {
      for (const k of real.overrideUserTouched) userTouchedOverrideKeys.add(k)
    } else {
      real.overrideUserTouched = []
    }
    config.value = real
  }

  watch(unlocked, (val) => {
    if (val) syncConfigFromStorage()
  }, { immediate: true })

  const VALID_THEMES: AppConfig['theme'][] = ['light', 'dark', 'system']

  function updateTheme(theme: AppConfig['theme']) {
    // 边界保护：非法主题值回落到当前有效值（无则默认 system），避免脏值落入配置并持久化
    config.value.theme = VALID_THEMES.includes(theme)
      ? theme
      : (VALID_THEMES.includes(config.value.theme) ? config.value.theme : 'system')
  }

  function updateTimer(updates: Partial<AppConfig['timer']>) {
    config.value.timer = { ...config.value.timer, ...updates }
  }

  function updateAdvisorEnabled(enabled: boolean) {
    config.value.advisorEnabled = enabled
  }

  function updateOperationMode(mode: AppConfig['operationMode']) {
    const VALID: AppConfig['operationMode'][] = ['silent', 'confirm', 'suggest']
    config.value.operationMode = VALID.includes(mode) ? mode : 'silent'
  }

  /** 设置应用品牌图标（app 自身 logo）；null 回退默认 ✦ */
  function updateAppBrandIcon(icon: string | null) {
    config.value.appBrandIcon = icon || null
  }

  function updateBackgroundMedia(background: AppConfig['background']) {
    config.value.background = { ...background }
  }

  function resetBackgroundMedia() {
    config.value.background = {
      type: 'default',
      presetScene: 'none',
      dataUrl: null,
      mimeType: null,
      fileName: null,
      updatedAt: null,
    }
  }

  function setPresetScene(scene: AppConfig['background']['presetScene']) {
    config.value.background = {
      type: 'preset',
      presetScene: scene,
      dataUrl: null,
      mimeType: null,
      fileName: null,
      updatedAt: null,
    }
  }

  // ---- 场景预设管理 ----

  /** 获取所有场景预设 */
  function getScenePresets(): ScenePreset[] {
    return storage.getScenePresets()
  }

  /** 将当前背景保存为场景预设 */
  function saveCurrentAsPreset(name: string): ScenePreset | null {
    if (!name.trim()) return null
    return storage.addScenePreset(name.trim(), config.value.background)
  }

  /** 应用场景预设到当前背景 */
  function applyScenePreset(id: string): boolean {
    const presets = storage.getScenePresets()
    const preset = presets.find(p => p.id === id)
    if (!preset) return false
    config.value.background = { ...preset.background }
    return true
  }

  /** 删除场景预设 */
  function deleteScenePreset(id: string): boolean {
    return storage.removeScenePreset(id)
  }

  /** 重命名场景预设 */
  function renameScenePreset(id: string, name: string): boolean {
    if (!name.trim()) return false
    return storage.renameScenePreset(id, name.trim())
  }

  function updateGestureBinding(gesture: GestureType, action: GestureAction) {
    config.value.gestures.bindings[gesture] = action
  }

  function replaceGestureBindings(bindings: AppConfig['gestures']['bindings']) {
    config.value.gestures.bindings = { ...bindings }
  }

  function updateStats(updates: Partial<AppConfig['stats']>) {
    config.value.stats = { ...config.value.stats, ...updates }
  }

  function updateTransitionDuration(duration: number) {
    config.value.transitionDuration = duration
  }

  function updateVisualization(updates: Partial<AppConfig['visualization']>) {
    config.value.visualization = { ...config.value.visualization, ...updates }
  }

  /** 更新宪法合规覆盖开关（用户显式设置，标记为已触碰，优先级高于宪法推导） */
  function updateComplianceOverride(key: keyof AppConfig['complianceOverride'], value: boolean) {
    config.value.complianceOverride[key] = value
    userTouchedOverrideKeys.add(key)
    const arr = config.value.overrideUserTouched
    if (!arr.includes(key)) arr.push(key)
  }

  /** 引擎推导写入（不标记为用户显式覆盖，可被后续用户手动覆盖） */
  function applyDerivedComplianceOverride(key: keyof AppConfig['complianceOverride'], value: boolean) {
    config.value.complianceOverride[key] = value
  }

  /** 该合规覆盖字段是否已被用户显式设置（优先级高于宪法推导） */
  function isOverrideUserTouched(key: keyof AppConfig['complianceOverride']): boolean {
    return userTouchedOverrideKeys.has(key)
  }

  function setSurfaceState(value: SurfaceState) {
    config.value.worldShell.surfaceState = value
  }

  function setActiveShell(value: WorldShellType) {
    config.value.worldShell.activeShell = value
  }

  function setFloatingLayer(id: string, visible: boolean, opts?: Partial<FloatingLayerState>) {
    const layers = config.value.worldShell.floatingLayers
    const existing = layers.find((l) => l.id === id)
    if (existing) {
      existing.visible = visible
      if (opts) Object.assign(existing, opts)
    } else {
      layers.push({ id, visible, ...opts })
    }
  }

  function removeFloatingLayer(id: string) {
    config.value.worldShell.floatingLayers = config.value.worldShell.floatingLayers.filter((l) => l.id !== id)
  }

  return {
    config,
    updateTheme,
    updateTimer,
    updateAdvisorEnabled,
    updateOperationMode,
    updateAppBrandIcon,
    updateBackgroundMedia,
    resetBackgroundMedia,
    setPresetScene,
    getScenePresets,
    saveCurrentAsPreset,
    applyScenePreset,
    deleteScenePreset,
    renameScenePreset,
    updateGestureBinding,
    replaceGestureBindings,
    updateStats,
    updateTransitionDuration,
    updateVisualization,
    updateComplianceOverride,
    applyDerivedComplianceOverride,
    isOverrideUserTouched,
    setSurfaceState,
    setActiveShell,
    setFloatingLayer,
    removeFloatingLayer,
  }
})
