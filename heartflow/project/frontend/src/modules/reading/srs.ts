// ============================================================
// 阅览殿 · 间隔重复（Spaced Repetition）
// 蓝图模块19：复用笔记"知识年轮"艾宾浩斯引擎，提供三选一回顾体验
// （认识 / 模糊 / 忘记），拒绝连续打卡压力。SRS 调度数据留在笔记模块
// 的 RING_KV_KEY，不触碰共享 notes 数组。
// ============================================================

import { computed } from 'vue'
import { useNote } from '../note'
import {
  isForgotten,
  computeRingStats,
  type ReviewGrade,
  type KnowledgeRing,
} from '../note/knowledge-ring'

export type SrsGrade = ReviewGrade

/** 复习队列条目 */
export interface SrsReviewItem {
  noteId: string
  title: string
  rings: number
  luminance: number
  nextReviewAt: string
  /** 距下次回顾天数（负数=已逾期） */
  daysUntil: number
  forgotten: boolean
}

export const SRS_GRADE_LABELS: Record<SrsGrade, string> = {
  know: '认识',
  fuzzy: '模糊',
  forget: '忘记',
}

export function useReadingSrs() {
  const note = useNote()

  /** 待复习队列（到期或逾期的年轮） */
  const reviewQueue = computed<SrsReviewItem[]>(() =>
    note.dueRings.value.map(r => ({
      noteId: r.noteId,
      title: r.title,
      rings: r.rings,
      luminance: r.luminance,
      nextReviewAt: r.nextReviewAt,
      daysUntil: daysBetween(new Date().toISOString(), r.nextReviewAt),
      forgotten: isForgotten(r),
    }))
  )

  /** 年轮统计（总/待复习/已遗忘/重逢/均值） */
  const stats = computed(() => computeRingStats(note.knowledgeRings.value))

  /**
   * 记忆光泽曲线：按年轮层数（掌握度）分布的聚合曲线。
   * 没有逐笔记历史时点，以"掌握度分布"近似呈现群体记忆形态。
   */
  const memoryCurve = computed<{ level: number; count: number }[]>(() => {
    const rings = note.knowledgeRings.value
    const maxLevel = rings.reduce((m, r) => Math.max(m, r.rings), 0)
    const out: { level: number; count: number }[] = []
    for (let lvl = 0; lvl <= maxLevel; lvl++) {
      out.push({ level: lvl, count: rings.filter(r => r.rings === lvl).length })
    }
    return out
  })

  /** 三选一回顾 */
  function review(noteId: string, grade: SrsGrade): KnowledgeRing | undefined {
    return note.reviewRingGrade(noteId, grade)
  }

  /** 为尚未纳入复习的笔记建立年轮 */
  function ensureRing(noteId: string) {
    return note.initRing(noteId)
  }

  return {
    reviewQueue,
    stats,
    memoryCurve,
    review,
    ensureRing,
    SRS_GRADE_LABELS,
  }
}

function daysBetween(fromISO: string, toISO: string): number {
  return Math.floor((new Date(toISO).getTime() - new Date(fromISO).getTime()) / 86400000)
}
