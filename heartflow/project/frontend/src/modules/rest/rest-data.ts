// ============================================================
// 息壤 · 休息数据层
// 为 Rest.vue 提供标准化的存取接口，
// 替代视图内直接的 storage.getKV('rest:practices') /
// storage.getKV('rest:break_records') / storage.setKV(...) 裸调用。
//
// 同时管理两类数据：
//   - 休憩方式 practicesData（键 rest:practices）
//   - 休息记录 breakRecords（键 rest:break_records）
// 二者相互独立，使用各自的 ref 与存储键。
// ============================================================

import { ref } from 'vue'
import { storage } from '../../engine/storage'
import type { RestPractice, BreakRecord } from './types'

/** 默认休憩方式（12 种） */
export const DEFAULT_PRACTICES: RestPractice[] = [
  {
    id: 'meditation',
    name: '冥想',
    icon: '🧘',
    color: '#8ab87a',
    description: '静坐冥想，观察呼吸与思绪',
    recovery: 85,
    tags: ['身心', '专注'],
  },
  {
    id: 'nap',
    name: '小憩',
    icon: '😴',
    color: '#7ab89a',
    description: '短暂休息，为大脑充电',
    recovery: 70,
    tags: ['恢复', '精力'],
  },
  {
    id: 'walk',
    name: '散步',
    icon: '🚶',
    color: '#8ac4a0',
    description: '户外漫步，亲近自然',
    recovery: 75,
    tags: ['运动', '户外'],
  },
  {
    id: 'music',
    name: '听音乐',
    icon: '🎵',
    color: '#a0c4a8',
    description: '沉浸于旋律，放松心情',
    recovery: 65,
    tags: ['艺术', '放松'],
  },
  {
    id: 'reading',
    name: '闲读',
    icon: '📖',
    color: '#8ab0c4',
    description: '轻松阅读，不做笔记',
    recovery: 60,
    tags: ['学习', '休闲'],
  },
  {
    id: 'tea',
    name: '品茶',
    icon: '🍵',
    color: '#c4a07a',
    description: '一杯热茶，慢慢品味',
    recovery: 55,
    tags: ['仪式', '慢生活'],
  },
  {
    id: 'stretch',
    name: '拉伸',
    icon: '🤸',
    color: '#7ac4a8',
    description: '舒展身体，缓解久坐疲劳',
    recovery: 80,
    tags: ['运动', '身体'],
  },
  {
    id: 'dayoff',
    name: '休假',
    icon: '🏖',
    color: '#8ac4b8',
    description: '完整的一天彻底放松',
    recovery: 95,
    tags: ['长假', '身心'],
  },
  {
    id: 'breathing',
    name: '深呼吸',
    icon: '🌬',
    color: '#7a8a7a',
    description: '4-7-8 呼吸法，平复心绪',
    recovery: 75,
    tags: ['身心', '专注'],
  },
  {
    id: 'journal',
    name: '日记',
    icon: '✍️',
    color: '#b0a0c0',
    description: '写下今日思绪，释放内心',
    recovery: 60,
    tags: ['表达', '内省'],
  },
  {
    id: 'garden',
    name: '园艺',
    icon: '🌱',
    color: '#c8a060',
    description: '照料植物，感受生命生长',
    recovery: 70,
    tags: ['户外', '自然'],
  },
  {
    id: 'social',
    name: '社交',
    icon: '💬',
    color: '#8aba8a',
    description: '与朋友轻松交谈，享受陪伴',
    recovery: 65,
    tags: ['连接', '情绪'],
  },
]

const PRACTICES_KEY = 'rest:practices'
const BREAK_RECORDS_KEY = 'rest:break_records'

// 模块级单例：所有消费方共享同一份休息数据
const practicesData = ref<RestPractice[]>([])
const breakRecords = ref<BreakRecord[]>([])

/**
 * 将存储中的休憩方式按默认定义补全（原视图初始化逻辑）：
 * 若存储里恰好 8 条（旧版默认值），直接采用；
 * 否则以默认定义为基底，逐项用存储值覆盖。
 */
function initPractices(): RestPractice[] {
  const saved = storage.getKV<RestPractice[]>(PRACTICES_KEY, DEFAULT_PRACTICES)
  return saved.length === 8
    ? saved
    : DEFAULT_PRACTICES.map((def, i) => ({ ...def, ...(saved[i] ?? {}) }))
}

/**
 * 休息数据层：休憩方式 + 休息记录的读取 / 写入
 */
export function useRest() {
  /** 从存储载入休憩方式与休息记录 */
  function load(): void {
    practicesData.value = initPractices()
    breakRecords.value = storage.getKV<BreakRecord[]>(BREAK_RECORDS_KEY, [])
  }

  /** 整体持久化休憩方式与休息记录 */
  function save(): void {
    storage.setKV(PRACTICES_KEY, practicesData.value)
    storage.setKV(BREAK_RECORDS_KEY, breakRecords.value)
  }

  /** 仅持久化休憩方式 */
  function savePractices(): void {
    storage.setKV(PRACTICES_KEY, practicesData.value)
  }

  /** 仅持久化休息记录 */
  function saveBreakRecords(): void {
    storage.setKV(BREAK_RECORDS_KEY, breakRecords.value)
  }

  return { practicesData, breakRecords, load, save, savePractices, saveBreakRecords }
}
