// ============================================================
// 逸趣阁 · 类型定义
// ============================================================

/** 游戏记录 */
export interface Game {
  id: string
  name: string
  platform: string
  hours: number
  at: string
}

/** 玩具收藏 */
export interface Toy {
  id: string
  name: string
  note: string
  value: 'mint' | 'light' | 'used' | 'display'
  at: string
}

/** 模型/手办 */
export interface Model {
  id: string
  name: string
  series: string
  status: 'sealed' | 'display' | 'opened'
  at: string
}

/** 其他收藏 */
export interface Other {
  id: string
  name: string
  cat: string
  at: string
}

/** 全部逸趣数据 */
export interface PlayData {
  games: Game[]
  toys: Toy[]
  models: Model[]
  others: Other[]
}

/** Tab 定义 */
export interface PlayTab {
  key: string
  label: string
  icon: string
}

/** 月度统计项 */
export interface MonthlyStat {
  month: string
  hours: number
}

/** 时长分布桶 */
export interface DistBuckets {
  lt10: number
  mid: number
  high: number
  extreme: number
}

/** 筛选选项 */
export interface FilterOption {
  key: string
  label: string
}

/** 系列分组 */
export interface ModelGroup {
  series: string
  items: Model[]
}

/** 最近添加项 */
export interface RecentItem {
  id: string
  name: string
  icon: string
  sub: string
  at: string
}

/** 平台分布项 */
export interface PlatformDistItem {
  platform: string
  count: number
  hours: number
}