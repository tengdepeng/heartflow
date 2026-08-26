// ============================================================
// 天星盘 · 模块入口
// 星图导航仪 — 搜索、最近访问、长按呼出、快捷键
// ============================================================

export { default as Astrolabe } from './Astrolabe.vue'
export { useAstrolabe, recordNavigation } from './useAstrolabe'
export type {
  AstrolabeConfig,
  AstrolabeSearchState,
  AstrolabeVisibility,
  AstrolabeState,
} from './types'
export { DEFAULT_ASTROLABE_CONFIG } from './types'