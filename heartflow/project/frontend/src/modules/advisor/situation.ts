// ============================================================
// 幕僚 · 情境感知上下文构建（纯函数，无 Vue 依赖）
// 蓝图第四部分·三「专属知识库」+ 情境感知的消费点：
// 把天色时段、幕僚当前活动态、用户授权的殿堂痕迹，组装成
// 一段注入系统提示词的文本，让幕僚"有情境、有记忆感"。
//
// 纯函数设计：本模块不引入 vue，可被 engine 层或 store 层调用；
// 时段判定逻辑与 daily-life 的 detectTimeSlot 保持一致（单一事实来源
// 在 types.TIME_SLOT_META），避免两份时间槽算法漂移。
// ============================================================

import type { TimeSlot, ActivityType } from './types'
import { TIME_SLOT_META, ACTIVITY_META } from './types'

/**
 * 根据小时判定当前作息时段（纯函数）。
 * hour 缺省取当前系统小时，便于在运行时直接调用；测试可显式传入。
 */
export function detectTimeSlot(hour: number = new Date().getHours()): TimeSlot {
  for (const [slot, meta] of Object.entries(TIME_SLOT_META)) {
    const [start, end] = meta.hourRange
    if (start <= end) {
      if (hour >= start && hour < end) return slot as TimeSlot
    } else {
      // 跨午夜区间（如 night [22,1]）
      if (hour >= start || hour < end) return slot as TimeSlot
    }
  }
  return 'afternoon'
}

/** 幕僚情境上下文输入（各字段均已在调用方取得，本模块只负责拼装） */
export interface AdvisorSituationInput {
  /** 当前天色时段（缺省则省略该句） */
  timeSlot?: TimeSlot
  /** 幕僚当前活动类型列表（缺省/空则省略该句） */
  activities?: ActivityType[]
  /** 已按知识库范围裁剪好的殿堂痕迹文本（缺省/空则省略该段） */
  knowledge?: string
}

/**
 * 把情境输入拼装成注入系统提示词的文本段落。
 * 任意子项缺失都安全省略，绝不输出空标题或占位符。
 */
export function buildAdvisorSituationContext(input: AdvisorSituationInput): string {
  const parts: string[] = []

  if (input.timeSlot) {
    const m = TIME_SLOT_META[input.timeSlot]
    if (m) parts.push(`天色时段：${m.label}（${m.vibe}）。`)
  }

  if (input.activities && input.activities.length) {
    const labels = input.activities.map(a => ACTIVITY_META[a]?.label ?? a)
    if (labels.length) parts.push(`你正在：${labels.join('、')}。`)
  }

  const kb = input.knowledge?.trim()
  if (kb) {
    parts.push(`你被授权可参考的用户近期殿堂痕迹：\n${kb}`)
  }

  return parts.join('\n')
}
