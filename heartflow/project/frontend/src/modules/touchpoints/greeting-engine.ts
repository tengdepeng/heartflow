// ============================================================
// 殿堂触角 · 幕僚问候浮窗引擎
// 管理问候浮窗的位置、动画、调度、内容生成
// ============================================================

import { ref, computed } from 'vue'
import type { FloatingConfig, FloatingPosition, FloatingAnimation, GreetingPeriod, GreetingTemplate } from './types'
import { DEFAULT_FLOATING_CONFIG, DEFAULT_GREETING_TEMPLATES, TOUCHPOINTS_STORAGE_KEYS } from './types'
import { storage } from '../../engine/storage'

/** 从存储加载浮窗配置 */
function loadFloatingConfig(): FloatingConfig {
  try {
    const raw = storage.getKV<string>(TOUCHPOINTS_STORAGE_KEYS.floating, '')
    if (raw) {
      const parsed = JSON.parse(raw)
      return { ...DEFAULT_FLOATING_CONFIG, ...parsed }
    }
  } catch {
    // 数据损坏时使用默认配置
  }
  return { ...DEFAULT_FLOATING_CONFIG }
}

/** 持久化浮窗配置 */
function saveFloatingConfig(config: FloatingConfig): void {
  storage.setKV(TOUCHPOINTS_STORAGE_KEYS.floating, JSON.stringify(config))
}

/** 响应式浮窗配置 */
const floatingConfig = ref<FloatingConfig>(loadFloatingConfig())

/** 浮窗是否可见 */
const isVisible = ref(false)

/** 上次显示时间戳 */
let lastShownAt = 0

/** 根据当前时间判断时段 */
function detectPeriod(): GreetingPeriod {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 21) return 'evening'
  return 'night'
}

/** 获取当前时段 */
const currentPeriod = computed<GreetingPeriod>(() => {
  if (floatingConfig.value.greetingMode === 'auto') return detectPeriod()
  return floatingConfig.value.greetingMode
})

/** 获取当前问候模板 */
const currentTemplate = computed<GreetingTemplate | undefined>(() => {
  const templates = floatingConfig.value.customGreetings ?? DEFAULT_GREETING_TEMPLATES
  return templates.find(t => t.period === currentPeriod.value)
    ?? templates.find(t => t.period === 'morning')
})

/** 随机选取问候语 */
const currentGreeting = computed(() => {
  const template = currentTemplate.value
  if (!template) return { message: '你好', subtitle: '' }
  const msgIdx = Math.floor(Math.random() * template.messages.length)
  const subIdx = Math.floor(Math.random() * template.subtitles.length)
  return {
    message: template.messages[msgIdx] ?? '你好',
    subtitle: template.subtitles[subIdx] ?? '',
  }
})

export function useGreetingEngine() {
  /** 获取当前浮窗配置 */
  function getConfig(): FloatingConfig {
    return { ...floatingConfig.value }
  }

  /** 更新浮窗配置 */
  function updateConfig(partial: Partial<FloatingConfig>): FloatingConfig {
    floatingConfig.value = { ...floatingConfig.value, ...partial }
    saveFloatingConfig(floatingConfig.value)
    return { ...floatingConfig.value }
  }

  /** 切换浮窗启用状态 */
  function toggle(): boolean {
    floatingConfig.value.enabled = !floatingConfig.value.enabled
    saveFloatingConfig(floatingConfig.value)
    return floatingConfig.value.enabled
  }

  /** 设置浮窗位置 */
  function setPosition(position: FloatingPosition): void {
    floatingConfig.value.position = position
    saveFloatingConfig(floatingConfig.value)
  }

  /** 设置动画类型 */
  function setAnimation(animation: FloatingAnimation): void {
    floatingConfig.value.animation = animation
    saveFloatingConfig(floatingConfig.value)
  }

  /** 设置显示时长 */
  function setDisplayDuration(ms: number): void {
    floatingConfig.value.displayDuration = Math.max(0, ms)
    saveFloatingConfig(floatingConfig.value)
  }

  /** 设置问候时段模式 */
  function setGreetingMode(mode: GreetingPeriod): void {
    floatingConfig.value.greetingMode = mode
    saveFloatingConfig(floatingConfig.value)
  }

  /** 显示浮窗 */
  function show(): void {
    if (!floatingConfig.value.enabled) return
    isVisible.value = true
    lastShownAt = Date.now()
    // 自动关闭
    if (floatingConfig.value.displayDuration > 0) {
      setTimeout(() => {
        if (Date.now() - lastShownAt >= floatingConfig.value.displayDuration - 100) {
          isVisible.value = false
        }
      }, floatingConfig.value.displayDuration)
    }
  }

  /** 隐藏浮窗 */
  function hide(): void {
    isVisible.value = false
  }

  /** 获取问候语（带参数替换） */
  function getGreeting(params?: Record<string, string | number>): { message: string; subtitle: string } {
    let { message, subtitle } = currentGreeting.value
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        message = message.replace(`{${k}}`, String(v))
        subtitle = subtitle.replace(`{${k}}`, String(v))
      }
    }
    return { message, subtitle }
  }

  /** 重置为默认配置 */
  function reset(): FloatingConfig {
    floatingConfig.value = { ...DEFAULT_FLOATING_CONFIG }
    isVisible.value = false
    saveFloatingConfig(floatingConfig.value)
    return { ...floatingConfig.value }
  }

  return {
    config: floatingConfig,
    isVisible,
    currentPeriod,
    currentGreeting,
    getConfig,
    updateConfig,
    toggle,
    setPosition,
    setAnimation,
    setDisplayDuration,
    setGreetingMode,
    show,
    hide,
    getGreeting,
    reset,
  }
}