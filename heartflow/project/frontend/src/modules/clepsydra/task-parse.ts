// ============================================================
// 更漏 · 自然语言任务解析
// ------------------------------------------------------------
// 借鉴「时光序」：输入一句自然语言（如「25分钟学习」），
// 解析出时长 + 分类 + 备注，一键开启倒计时或工作计时。
// 纯函数，无依赖，可单测。
// ============================================================

import type { WorkCategory } from './clepsydra'

export interface ParsedTask {
  /** 解析出的时长（秒）；未匹配到为 0 */
  durationSeconds: number
  /** 分类（按关键词路由，未命中为 custom） */
  category: WorkCategory
  /** 去除时长与分类关键词后的备注 */
  note: string
  /** 是否命中时长（可据此判断能否建倒计时） */
  matched: boolean
}

/** 时长模式（按优先级：小时 → 分钟 → 秒） */
const DURATION_PATTERNS: { re: RegExp; unit: number }[] = [
  { re: /(\d+(?:\.\d+)?)\s*(?:小时|时|h|hr|hrs)/i, unit: 3600 },
  { re: /(\d+(?:\.\d+)?)\s*(?:分钟|分|min|mins|m)/i, unit: 60 },
  { re: /(\d+(?:\.\d+)?)\s*(?:秒|s)/i, unit: 1 },
]

/** 分类关键词路由（按顺序命中即停） */
const CATEGORY_KEYWORDS: Record<WorkCategory, string[]> = {
  study: ['学习', '读书', '阅读', '复习', '背单词', '上课', '课程', '论文', '备考', '外语'],
  project: ['项目', '工作', '开发', '写代码', '编程', '任务', '会议', '汇报', '方案', '加班', '需求'],
  create: ['创造', '写作', '写文章', '设计', '画画', '创作', '视频', '剪辑', '音乐', '摄影', '画画'],
  daily: ['日常', '家务', '整理', '打扫', '购物', '做饭', '洗衣', '通勤', '散步', '健身'],
  custom: [],
}

/** 解析一句自然语言任务描述 */
export function parseTaskText(text: string): ParsedTask | null {
  const raw = text.trim()
  if (!raw) return null

  let durationSeconds = 0
  let rest = raw
  for (const p of DURATION_PATTERNS) {
    const m = rest.match(p.re)
    if (m) {
      durationSeconds += Math.round(parseFloat(m[1]) * p.unit)
      rest = rest.replace(m[0], ' ').trim()
    }
  }

  let category: WorkCategory = 'custom'
  for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS) as [WorkCategory, string[]][]) {
    if (kws.some(k => rest.includes(k))) {
      category = cat
      break
    }
  }

  let note = rest
  for (const k of CATEGORY_KEYWORDS[category]) {
    note = note.split(k).join(' ').trim()
  }
  note = note.replace(/\s+/g, ' ').trim()

  return {
    durationSeconds,
    category,
    note,
    matched: durationSeconds > 0,
  }
}

/** 分类关键词表（供 UI 提示） */
export const TASK_CATEGORY_KEYWORDS: Record<WorkCategory, string[]> = CATEGORY_KEYWORDS
