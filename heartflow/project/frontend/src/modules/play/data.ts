// ============================================================
// 逸趣阁 · 数据常量
// ============================================================

import type { PlayTab, FilterOption } from './types'

/** Tab 标签定义 */
export const PLAY_TABS: PlayTab[] = [
  { key: 'game', label: '游戏', icon: '🎮' },
  { key: 'toy', label: '玩具', icon: '🧸' },
  { key: 'model', label: '模型', icon: '🗿' },
  { key: 'other', label: '其他', icon: '📦' },
]

/** 玩具收藏状态筛选 */
export const TOY_FILTERS: FilterOption[] = [
  { key: 'all', label: '全部' },
  { key: 'mint', label: '全新' },
  { key: 'light', label: '轻微' },
  { key: 'used', label: '常用' },
  { key: 'display', label: '展示' },
]

/** 模型状态标签映射 */
export const STATUS_LABEL_MAP: Record<string, string> = {
  sealed: '未开封',
  display: '展示',
  opened: '拆盒',
}

/** 收藏价值标签映射 */
export const VALUE_LABEL_MAP: Record<string, string> = {
  mint: '全新',
  light: '轻微',
  used: '常用',
  display: '展示',
}

/** 获取收藏价值标签 */
export function valueLabel(v: string): string {
  return VALUE_LABEL_MAP[v] || v
}

/** 获取状态标签 */
export function statusLabel(s: string): string {
  return STATUS_LABEL_MAP[s] || s
}

/** 格式化日期（YY/MM/DD） */
export function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear() % 100}/${d.getMonth() + 1}/${d.getDate()}`
}