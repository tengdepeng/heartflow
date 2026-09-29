// ============================================================
// 小组件快照同步（首页画布 / 系统桌面小窗 / Android 系统小组件共用）
// 统一出口：任何一处数据变化都走这里推送，避免三处各写一份 watch。
//   startWidgetSnapshotSync()  —— 视图挂载时开一次自动监听
//   pushWidgetSnapshotNow()    —— 卡片内操作（记心情/存便签/勾选心锚）后立即推
// ============================================================

import { computed, watch } from 'vue'
import { useTimerStore } from '../../stores'
import { useWishAnchor } from '../../modules/wish-anchor'
import { useHappyBox } from '../../modules/emotion/happy-box'
import { storage } from '../../engine/storage'
import { useDesktopWidget } from './index'
import { composeWidgetSnapshot } from './snapshot'

/** 便签存储键（与 WidgetBox 原实现同键，迁移不改数据结构） */
export const WIDGET_NOTE_KEY = 'hf:touchpoints:newnote'

/** 模块级：同一窗口上下文内只挂一次监听 */
let started = false

/** 取当前便签文本 */
export function readWidgetNote(): string {
  return storage.getKV<string>(WIDGET_NOTE_KEY, '')
}

/** 组合并推送一次快照（Android AppWidgetProvider 读的就是这份 JSON） */
export function pushWidgetSnapshotNow(): void {
  const { pushSystemWidgetSnapshot } = useDesktopWidget()
  const wishAnchor = useWishAnchor()
  const happyBox = useHappyBox()
  const timer = useTimerStore()

  const anchors = wishAnchor.views.value.filter(v => !v.done)
  const planned = timer.session?.plannedDuration ?? 1
  const elapsed = timer.elapsed ?? timer.session?.elapsed ?? 0
  const status = timer.isRunning
    ? '⏳ 专注进行中'
    : timer.session?.status === 'completed'
      ? '✅ 本轮已完成'
      : timer.session?.status === 'interrupted'
        ? '⏸ 已中断'
        : '🔒 等待开始'

  pushSystemWidgetSnapshot(
    composeWidgetSnapshot.build({
      anchors: anchors.map(a => ({ title: a.title, daysLeft: a.daysLeft })),
      timer: {
        status,
        clock: formatClock(elapsed),
        progress: Math.round(Math.min(100, (elapsed / planned) * 100)),
      },
      emotion: { todayCount: happyBox.todayCount.value, lastMood: '' },
      note: readWidgetNote(),
    }),
  )
}

function formatClock(ms: number): string {
  const total = Math.floor(Math.max(0, ms) / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** 视图挂载时调用：数据变化即自动同步一次 */
export function startWidgetSnapshotSync(): void {
  if (started) return
  started = true
  const wishAnchor = useWishAnchor()
  const happyBox = useHappyBox()
  const timer = useTimerStore()

  const anchors = computed(() => wishAnchor.views.value.filter(v => !v.done))
  const todayMoodCount = computed(() => happyBox.todayCount.value)
  const season = computed(() => composeWidgetSnapshot.seasonOf())
  const quote = computed(() => composeWidgetSnapshot.quoteOfDay())

  watch(
    [
      quote,
      anchors,
      todayMoodCount,
      season,
      () => timer.isRunning,
      () => timer.elapsed,
      () => timer.session?.status,
    ],
    () => pushWidgetSnapshotNow(),
    { immediate: true },
  )
}
