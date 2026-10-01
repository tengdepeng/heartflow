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
import { useTaskManager, buildQuadrantBoard } from '../tasks'
import { activityMarks, heatmapCells } from '../touchpoints/widget-calendar'
import { invoke } from '@tauri-apps/api/core'

/** 便签存储键（与 WidgetBox 原实现同键，迁移不改数据结构） */
export const WIDGET_NOTE_KEY = 'hf:touchpoints:newnote'

/** 模块级：同一窗口上下文内只挂一次监听 */
let started = false

/** 取当前便签文本 */
export function readWidgetNote(): string {
  return storage.getKV<string>(WIDGET_NOTE_KEY, '')
}

/** 组合并推送一次快照（Android AppWidgetProvider 读的就是这份 JSON） */
export function pushWidgetSnapshotNow(throttled = false): void {
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
      quadrant: buildQuadrantBoard(useTaskManager().tasks.value)
        .map(c => ({ label: c.label, active: c.stats.active })),
      // 日历热力图：6 周 × 7 天 = 42 日活跃度（专注分钟 + 速记条数），周序在前，
      // 与安卓 HeartflowHeatmapWidgetProvider 读 widget_data.json.activityHeatmap 一致。
      activityHeatmap: heatmapCells(6, activityMarks()).map(c => c.count),
    }),
  )
  // 写完快照立即触发 Android 原生 widget 即时刷新（桌面/web 端无对应命令，静默容错）
  void refreshAndroidWidgets(throttled)
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
  // 四象限：任务增删改时即时推送（签名变化即触发）
  const quadrantSig = computed(() =>
    buildQuadrantBoard(useTaskManager().tasks.value)
      .map(c => `${c.label}:${c.stats.active}`)
      .join('|'),
  )

  watch(
    [
      quote,
      anchors,
      todayMoodCount,
      season,
      quadrantSig,
      () => timer.isRunning,
      () => timer.elapsed,
      () => timer.session?.status,
    ],
    // 自动监听走节流（番茄钟每秒 tick 不必每秒广播刷新）
    () => pushWidgetSnapshotNow(true),
    { immediate: true },
  )
}

/** Android 广播刷新最小间隔（ms）：番茄钟每秒 tick 不必每秒广播刷新全部 widget */
const REFRESH_MIN_INTERVAL = 5_000

/** 上次广播刷新时间戳（模块级，节流用） */
let lastRefreshAt = 0

/**
 * 数据写入 widget_data.json 后，立即触发 Android 原生 widget 即时刷新。
 * 机制：invoke Kotlin @TauriPlugin 命令（HeartflowWidgetsPlugin）→
 * 对全部 7 个 Provider 广播 ACTION_APPWIDGET_UPDATE，跳过系统 30min 刷新周期。
 * 桌面 / web 端无对应命令，invoke 被 reject，静默忽略。
 */
export async function refreshAndroidWidgets(allowThrottle = false): Promise<void> {
  const now = Date.now()
  if (allowThrottle && now - lastRefreshAt < REFRESH_MIN_INTERVAL) return
  lastRefreshAt = now
  try {
    await invoke('plugin:heartflowWidgets|refreshWidgets')
  } catch {
    /* 桌面 / web 端无原生命令，静默忽略 */
  }
}
