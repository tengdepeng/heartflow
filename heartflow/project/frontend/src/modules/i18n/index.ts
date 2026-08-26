// ============================================================
// 国际化核心模块
// 提供 useI18n composable 用于组件内翻译
// ============================================================

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { SupportedLocale, TranslationMap } from './types'
import { getLocaleMap, isLocaleRegistered, SUPPORTED_LANGUAGES } from './types'
import { storage } from '../../engine/storage'

// 注册内置翻译（模块级别副作用导入，确保翻译在运行时可用）
import './zh-CN'
import './en'
import './ja'

/** 当前 locale（响应式） */
const currentLocale = ref<SupportedLocale>(
  isLocaleRegistered(storage.getConfig().locale)
    ? (storage.getConfig().locale as SupportedLocale)
    : 'zh-CN',
)

/** 当前翻译映射 */
const currentMap = computed<TranslationMap>(() => getLocaleMap(currentLocale.value))

/** 持久化当前 locale */
function persistLocale(locale: SupportedLocale): void {
  const config = storage.getConfig()
  config.locale = locale
  storage.setConfig(config)
}

/** 切换语言 */
export function setLocale(locale: SupportedLocale): void {
  if (!isLocaleRegistered(locale)) return
  currentLocale.value = locale
  persistLocale(locale)
}

/** 获取当前 locale */
export function getLocale(): SupportedLocale {
  return currentLocale.value
}

/** 获取语言列表 */
export function getSupportedLanguages() {
  return SUPPORTED_LANGUAGES
}

/**
 * 翻译函数：按 key 查找翻译，支持插值参数
 * 未找到 key 时返回原 key（便于开发阶段发现遗漏）
 */
export function t(key: string, params?: Record<string, string | number>): string {
  let text = currentMap.value[key]
  if (text === undefined) return key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{${k}}`, String(v))
    }
  }
  return text
}

/**
 * 带复数形式的翻译
 * 当 count 为 1 时使用 singleKey，否则使用 pluralKey
 */
export function tPlural(
  singleKey: string,
  pluralKey: string,
  count: number,
  params?: Record<string, string | number>,
): string {
  const key = count === 1 ? singleKey : pluralKey
  return t(key, { count, ...params })
}

// ============================================================
// Pinia Store（可选，用于组件内响应式调用）
// ============================================================

export const useI18nStore = defineStore('i18n', () => {
  const locale = ref(currentLocale.value)
  const map = computed(() => getLocaleMap(locale.value))

  function translate(key: string, params?: Record<string, string | number>): string {
    let text = map.value[key]
    if (text === undefined) return key
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(`{${k}}`, String(v))
      }
    }
    return text
  }

  function switchLocale(newLocale: SupportedLocale): void {
    if (!isLocaleRegistered(newLocale)) return
    locale.value = newLocale
    currentLocale.value = newLocale
    persistLocale(newLocale)
  }

  return {
    locale,
    map,
    translate,
    switchLocale,
    supportedLanguages: SUPPORTED_LANGUAGES,
  }
})

/**
 * Vue composable：在组件中使用
 * ```ts
 * const { t } = useI18n()
 * console.log(t('common.save')) // "保存" / "Save"
 * console.log(t('time.minutesAgo', { n: 5 })) // "5分钟前" / "5 min ago"
 * ```
 */
export function useI18n() {
  return {
    t,
    tPlural,
    locale: currentLocale,
    setLocale,
    getLocale,
    supportedLanguages: SUPPORTED_LANGUAGES,
  }
}