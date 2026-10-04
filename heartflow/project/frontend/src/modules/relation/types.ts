// ============================================================
// 羁绊之厅 · 类型定义
// ============================================================

import { CATEGORY_PALETTE } from '../../theme/categoryColors'

export interface Person {
  id: string
  name: string
  /** 关系类型: family/lover/friend/colleague/mentor/other */
  relation: 'family' | 'lover' | 'friend' | 'colleague' | 'mentor' | 'other'
  /** 自定义标签 */
  tags: string[]
  /** 自由笔记 */
  notes: string
  /** 联系频率 (0-1) */
  closeness: number
  /** 专属色调 */
  color: string
  /** 最近联系日期 */
  lastContact: string | null
  /** 重要日期（生日等） */
  importantDates: { label: string; date: string }[]
  /** 是否已逝 */
  deceased?: boolean
  /** 是否留座（失联/逝者保留位置） */
  isSeat?: boolean
  /** 留座原因 */
  seatReason?: string
  /** 纪念文字 */
  memorial?: string
  /** 留座时间 */
  seattedAt?: string
  createdAt: string
  updatedAt: string
}

export const RELATION_LABELS: Record<Person['relation'], string> = {
  family: '家人',
  lover: '伴侣',
  friend: '朋友',
  colleague: '同事',
  mentor: '导师',
  other: '其他',
}

export const RELATION_COLORS: Record<Person['relation'], string> = {
  family: '#f0c040',
  lover: CATEGORY_PALETTE[5],
  friend: CATEGORY_PALETTE[8],
  colleague: CATEGORY_PALETTE[11],
  mentor: CATEGORY_PALETTE[7],
  other: '#555',
}
