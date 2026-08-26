// ============================================================
// 今日聚合 · 跨房间「今日」状态纯函数
// 汇聚锚点(DailyAnchor) / 冥想·光(LightPavilion) / 运动(MovementRoom)
// 三房间今日计数，供首页空间 HomeSpace 的「今日」区块使用。
// 纯本地汇聚，无日历云同步；不读写存储，仅做统计聚合。
// ============================================================

import type { Anchor } from '../anchor/types'
import type { MeditationRecord, ReleaseEntry } from '../light/types'
import type { MovementRecord } from '../movement/types'
import { getLocalDateKey } from '../../utils/time'

/** 今日跨房间聚合结果 */
export interface TodayRoomStats {
  /** 今日心锚（已安放 · 活跃）总数 */
  anchorToday: number
  /** 今日心锚已完成数 */
  anchorDone: number
  /** 今日心锚未完成数 */
  anchorPending: number
  /** 今日冥想次数 */
  meditationToday: number
  /** 今日释怀次数 */
  releaseToday: number
  /** 今日律动（运动）次数 */
  movementToday: number
}

/** UTC 日期键（留光阁以 toISOString().split('T')[0] 落库，须同口径比对） */
export function getUtcDateKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/**
 * 聚合各房间今日计数。
 * @param params.anchors    全部心锚（含各阶段）
 * @param params.meditations 全部冥想记录
 * @param params.releases   全部释怀记录
 * @param params.movements  全部运动记录
 * @param params.now        可选「当前时刻」覆盖（便于测试固定基准日）
 */
export function aggregateTodayRoomStats(params: {
  anchors: Anchor[]
  meditations: MeditationRecord[]
  releases: ReleaseEntry[]
  movements: MovementRecord[]
  now?: Date
}): TodayRoomStats {
  const { anchors, meditations, releases, movements } = params
  const now = params.now ?? new Date()
  const localKey = getLocalDateKey(now)
  const utcKey = getUtcDateKey(now)

  const todayActiveAnchors = anchors.filter(
    a => a.targetDate === localKey && (a.stage ?? 'active') === 'active',
  )
  const anchorToday = todayActiveAnchors.length
  const anchorDone = todayActiveAnchors.filter(a => a.done).length

  const meditationToday = meditations.filter(m => m.date === utcKey).length
  const releaseToday = releases.filter(r => r.date === utcKey).length
  const movementToday = movements.filter(m => m.date === localKey).length

  return {
    anchorToday,
    anchorDone,
    anchorPending: anchorToday - anchorDone,
    meditationToday,
    releaseToday,
    movementToday,
  }
}
