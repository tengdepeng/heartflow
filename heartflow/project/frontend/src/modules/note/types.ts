// ============================================================
// 笔记 · 类型定义
// ============================================================

import type { Note } from '../../types'

/** 便签显示模式 */
export type NoteDisplayMode = 'sticky' | 'minimized' | 'board'

/** 扩展 Note：添加便签定位和显示状态 */
export interface StickyNote extends Note {
  /** 便签在屏幕上的 X 坐标（百分比 0-100） */
  stickyX: number
  /** 便签在屏幕上的 Y 坐标（百分比 0-100） */
  stickyY: number
  /** 显示模式 */
  displayMode: NoteDisplayMode
  /** 便签颜色（十六进制，不含 #） */
  color: string
  /** 是否置顶 */
  pinned: boolean
}

/** 笔记面板视图模式 */
export type NoteViewMode = 'grid' | 'list'

/** 默认便签颜色 */
export const STICKY_COLORS = [
  'f4d03f', // 暖黄
  'f5b041', // 橙黄
  'f1948a', // 粉红
  '85c1e9', // 天蓝
  '82e0aa', // 薄荷
  'd7bde2', // 淡紫
  'f0b27a', // 杏色
  'a3e4d7', // 青绿
]