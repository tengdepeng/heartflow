// ============================================================
// 天星盘 · 主题换肤器
// 用户自选「背景星图 × 搜索栏造型」，本地保存 —— 兑现宪法第2条「超级自定义」
// 模块级单例：设置页写入、星图读取，共享同一份响应式状态。
// ============================================================

import { ref, type Ref } from 'vue'
import { storage } from '../../engine/storage'

/** 背景星图方案（暗金为默认，与现有星盘外观一致） */
export type AstrolabeScheme =
  | 'dark-gold'
  | 'aurora'
  | 'cyber'
  | 'ink'
  | 'nordic'
  | 'rose'

/** 搜索栏造型 */
export type AstrolabeSearchStyle = 'glass' | 'capsule' | 'neon' | 'underline' | 'pixel'

export interface AstrolabeTheme {
  scheme: AstrolabeScheme
  search: AstrolabeSearchStyle
}

const STORAGE_KEY = 'astrolabe:theme'
const DEFAULT_THEME: AstrolabeTheme = { scheme: 'dark-gold', search: 'glass' }

/** 方案列表（供设置页渲染卡片；color 用于色点预览） */
export const ASTROLABE_SCHEMES: ReadonlyArray<{ value: AstrolabeScheme; label: string; color: string }> = [
  { value: 'dark-gold', label: '暗金古星图', color: '#d4af74' },
  { value: 'aurora', label: '极光深空', color: '#7fe3d4' },
  { value: 'cyber', label: '赛博霓虹', color: '#ff4fd8' },
  { value: 'ink', label: '水墨丹青', color: '#4a6b8a' },
  { value: 'nordic', label: '北欧极简', color: '#88c0d0' },
  { value: 'rose', label: '落日熔金', color: '#e8a060' },
]

/** 搜索栏造型列表 */
export const ASTROLABE_SEARCH_STYLES: ReadonlyArray<{ value: AstrolabeSearchStyle; label: string }> = [
  { value: 'glass', label: '玻璃' },
  { value: 'capsule', label: '胶囊' },
  { value: 'neon', label: '霓虹' },
  { value: 'underline', label: '下划线' },
  { value: 'pixel', label: '像素' },
]

function isTheme(v: unknown): v is AstrolabeTheme {
  if (!v || typeof v !== 'object') return false
  const t = v as Record<string, unknown>
  return (
    typeof t.scheme === 'string' &&
    typeof t.search === 'string' &&
    ASTROLABE_SCHEMES.some(s => s.value === t.scheme) &&
    ASTROLABE_SEARCH_STYLES.some(s => s.value === t.search)
  )
}

interface AstrolabeThemeApi {
  theme: Ref<AstrolabeTheme>
  setScheme: (scheme: AstrolabeScheme) => void
  setSearchStyle: (search: AstrolabeSearchStyle) => void
  setTheme: (patch: Partial<AstrolabeTheme>) => void
  resetTheme: () => void
  DEFAULT_THEME: AstrolabeTheme
}

// 模块级单例：首次调用时从本地 KV 读取，之后 Settings 与 Astrolabe 共享同一 ref
let singleton: AstrolabeThemeApi | null = null

export function useAstrolabeTheme(): AstrolabeThemeApi {
  if (!singleton) {
    const stored = storage.getKV<AstrolabeTheme>(STORAGE_KEY, DEFAULT_THEME)
    const theme = ref<AstrolabeTheme>(isTheme(stored) ? stored : DEFAULT_THEME)

    const persist = () => {
      try {
        storage.setKV(STORAGE_KEY, theme.value)
      } catch {
        // 存储不可用时静默忽略
      }
    }

    singleton = {
      theme,
      setScheme(scheme) {
        theme.value = { ...theme.value, scheme }
        persist()
      },
      setSearchStyle(search) {
        theme.value = { ...theme.value, search }
        persist()
      },
      setTheme(patch) {
        theme.value = { ...theme.value, ...patch }
        persist()
      },
      resetTheme() {
        theme.value = { ...DEFAULT_THEME }
        persist()
      },
      DEFAULT_THEME,
    }
  }
  return singleton
}
