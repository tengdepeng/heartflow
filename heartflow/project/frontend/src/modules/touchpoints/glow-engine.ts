// ============================================================
// 殿堂触角 · 锁屏光痕引擎
// 管理锁屏光痕主题、动画参数、定时调度
// ============================================================

import { ref, computed } from 'vue'
import type { GlowConfig, GlowTheme } from './types'
import { GLOW_THEME_META, DEFAULT_GLOW_CONFIG, TOUCHPOINTS_STORAGE_KEYS } from './types'
import { storage } from '../../engine/storage'

/** 从存储加载光痕配置 */
function loadGlowConfig(): GlowConfig {
  try {
    const raw = storage.getKV<string>(TOUCHPOINTS_STORAGE_KEYS.glow, '')
    if (raw) {
      const parsed = JSON.parse(raw)
      return { ...DEFAULT_GLOW_CONFIG, ...parsed }
    }
  } catch {
    // 数据损坏时使用默认配置
  }
  return { ...DEFAULT_GLOW_CONFIG }
}

/** 持久化光痕配置 */
function saveGlowConfig(config: GlowConfig): void {
  storage.setKV(TOUCHPOINTS_STORAGE_KEYS.glow, JSON.stringify(config))
}

/** 响应式光痕配置 */
const glowConfig = ref<GlowConfig>(loadGlowConfig())

/** 当前主题的元数据 */
const currentThemeMeta = computed(() => GLOW_THEME_META[glowConfig.value.theme])

/** 当前使用的调色板 */
const currentPalette = computed(() => {
  if (glowConfig.value.theme === 'custom' && glowConfig.value.customPalette) {
    return glowConfig.value.customPalette
  }
  return currentThemeMeta.value.palette
})

/** CSS 渐变字符串（用于渲染） */
const gradientCSS = computed(() => {
  const palette = currentPalette.value
  const stops = palette.map((color, i) => `${color} ${Math.round((i / (palette.length - 1)) * 100)}%`).join(', ')
  return `linear-gradient(135deg, ${stops})`
})

/** 光痕动画时长（考虑速度系数） */
const animationDuration = computed(() => {
  const base = currentThemeMeta.value.speed
  const intensityFactor = 1 + (1 - glowConfig.value.intensity) * 0.5
  return Math.round(base * intensityFactor)
})

export function useGlowEngine() {
  /** 获取当前光痕配置 */
  function getConfig(): GlowConfig {
    return { ...glowConfig.value }
  }

  /** 更新光痕配置 */
  function updateConfig(partial: Partial<GlowConfig>): GlowConfig {
    glowConfig.value = { ...glowConfig.value, ...partial }
    saveGlowConfig(glowConfig.value)
    return { ...glowConfig.value }
  }

  /** 切换光痕启用状态 */
  function toggle(): boolean {
    glowConfig.value.enabled = !glowConfig.value.enabled
    saveGlowConfig(glowConfig.value)
    return glowConfig.value.enabled
  }

  /** 设置光痕主题 */
  function setTheme(theme: GlowTheme): void {
    const meta = GLOW_THEME_META[theme]
    glowConfig.value = {
      ...glowConfig.value,
      theme,
      speed: meta.speed,
      intensity: meta.intensity,
    }
    saveGlowConfig(glowConfig.value)
  }

  /** 设置光痕强度 (0-1) */
  function setIntensity(intensity: number): void {
    glowConfig.value.intensity = Math.max(0, Math.min(1, intensity))
    saveGlowConfig(glowConfig.value)
  }

  /** 设置动画速度 */
  function setSpeed(speed: number): void {
    glowConfig.value.speed = Math.max(1000, Math.min(30000, speed))
    saveGlowConfig(glowConfig.value)
  }

  /** 设置自定义调色板 */
  function setCustomPalette(palette: string[]): void {
    if (palette.length < 2) return
    glowConfig.value.customPalette = palette
    saveGlowConfig(glowConfig.value)
  }

  /** 设置定时调度 */
  function setSchedule(start?: string, end?: string): void {
    glowConfig.value.scheduleStart = start
    glowConfig.value.scheduleEnd = end
    saveGlowConfig(glowConfig.value)
  }

  /** 检查当前时间是否在调度范围内 */
  function isInSchedule(): boolean {
    const { scheduleStart, scheduleEnd } = glowConfig.value
    if (!scheduleStart || !scheduleEnd) return true
    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const [sh, sm] = scheduleStart.split(':').map(Number)
    const [eh, em] = scheduleEnd.split(':').map(Number)
    const startMinutes = sh * 60 + sm
    const endMinutes = eh * 60 + em
    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes
    }
    // 跨天调度（如 22:00 - 06:00）
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes
  }

  /** 判断光痕是否应该激活 */
  function shouldActivate(isFocusMode = false): boolean {
    if (!glowConfig.value.enabled) return false
    if (!isInSchedule()) return false
    if (isFocusMode && !glowConfig.value.enhanceOnFocus) return false
    return true
  }

  /** 重置为默认配置 */
  function reset(): GlowConfig {
    glowConfig.value = { ...DEFAULT_GLOW_CONFIG }
    saveGlowConfig(glowConfig.value)
    return { ...glowConfig.value }
  }

  return {
    config: glowConfig,
    currentThemeMeta,
    currentPalette,
    gradientCSS,
    animationDuration,
    getConfig,
    updateConfig,
    toggle,
    setTheme,
    setIntensity,
    setSpeed,
    setCustomPalette,
    setSchedule,
    isInSchedule,
    shouldActivate,
    reset,
  }
}