// ============================================================
// 天星盘 · 类型定义
// 星图导航仪 — 古代星图与现代空间导航的融合
// ============================================================

/** 星盘配置 */
export interface AstrolabeConfig {
  /** 长按呼出阈值（ms） */
  longPressDuration: number
  /** 最近访问最大数量 */
  maxRecentRooms: number
  /** 搜索延迟（ms） */
  searchDebounce: number
  /** 是否启用键盘快捷键 */
  enableKeyboardShortcuts: boolean
  /** 快捷键：呼出星盘 */
  summonKey: 'k' | 'space' | 'slash'
  /** 是否启用长按手势 */
  enableLongPress: boolean
}

/** 星盘搜索状态 */
export interface AstrolabeSearchState {
  /** 搜索文本 */
  query: string
  /** 当前选中索引 */
  selectedIndex: number
  /** 是否聚焦搜索框 */
  isFocused: boolean
}

/** 星盘可见性状态 */
export interface AstrolabeVisibility {
  /** 是否可见 */
  visible: boolean
  /** 呼出方式 */
  trigger: 'long-press' | 'keyboard' | 'unknown'
  /** 打开时间戳 */
  openedAt: number | null
}

/** 天星盘导航模块状态 */
export interface AstrolabeState {
  /** 可见性 */
  visibility: AstrolabeVisibility
  /** 搜索状态 */
  search: AstrolabeSearchState
  /** 动画状态 */
  animating: boolean
}

/** 默认星盘配置 */
export const DEFAULT_ASTROLABE_CONFIG: AstrolabeConfig = {
  longPressDuration: 600,
  maxRecentRooms: 8,
  searchDebounce: 150,
  enableKeyboardShortcuts: true,
  summonKey: 'k',
  enableLongPress: true,
}