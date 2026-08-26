// ============================================================
// 思绪书房 · 类型定义
// ============================================================

import type { Note } from '../../types'

export type { Note }

/** 书脊颜色映射（基于首标签 hash） */
export const SPINE_COLORS = [
  '#a07c8c', '#6b9fc4', '#5ab8a0', '#8a9a7a',
  '#e0a96d', '#d98c7a', '#c46a5a', '#a07c8c',
  '#5ab8a0', '#7a9a8a', '#f0c040', '#d98c7a',
]

export function getSpineColor(tags: string[]): string {
  if (tags.length === 0) return '#555'
  const hash = tags[0].split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return SPINE_COLORS[hash % SPINE_COLORS.length]
}

/** 格式化时间为可读文本 */
export function formatNoteDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return `今天 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }
  return `${d.getMonth() + 1}/${d.getDate()}`
}
