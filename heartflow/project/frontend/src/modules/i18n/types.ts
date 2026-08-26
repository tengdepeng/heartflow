// ============================================================
// 国际化类型定义
// ============================================================

/** 翻译键值映射 */
export type TranslationMap = Record<string, string>

/** 支持的语言标识 */
export type SupportedLocale = 'zh-CN' | 'en' | 'ja'

/** 语言元数据 */
export interface LanguageMeta {
  /** 语言标识 */
  locale: SupportedLocale
  /** 显示名称（本地化） */
  label: string
  /** 英文名称 */
  labelEn: string
}

/** 内置语言列表 */
export const SUPPORTED_LANGUAGES: LanguageMeta[] = [
  { locale: 'zh-CN', label: '中文', labelEn: 'Chinese' },
  { locale: 'en', label: 'English', labelEn: 'English' },
  { locale: 'ja', label: '日本語', labelEn: 'Japanese' },
]

/** 翻译模块注册表 */
const registry = new Map<SupportedLocale, TranslationMap>()

/** 注册翻译 */
export function registerLocale(locale: SupportedLocale, map: TranslationMap): void {
  registry.set(locale, map)
}

/** 获取翻译映射 */
export function getLocaleMap(locale: SupportedLocale): TranslationMap {
  return registry.get(locale) ?? {}
}

/** 获取所有已注册的 locale 标识 */
export function getRegisteredLocales(): SupportedLocale[] {
  return [...registry.keys()]
}

/** 判断某 locale 是否已注册 */
export function isLocaleRegistered(locale: string): locale is SupportedLocale {
  return registry.has(locale as SupportedLocale)
}