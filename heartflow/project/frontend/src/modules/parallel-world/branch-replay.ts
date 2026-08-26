// ============================================================
// 平行世界 · 分支回放引擎（P19-6）
// 蓝图：
//   分支演化回放、关键决策点标记、多种回放速度、
//   事件驱动回放、回放状态管理、标记跳转
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '@/engine/storage'
import type { WorldBranch, Checkpoint } from './types'

// ============================================================
// 类型定义
// ============================================================

/** 回放速度 */
export type ReplaySpeed = '0.25x' | '0.5x' | '1x' | '2x' | '4x' | '8x'

/** 回放状态 */
export type ReplayState = 'idle' | 'playing' | 'paused' | 'completed' | 'stopped'

/** 回放事件 */
export interface ReplayEvent {
  id: string
  /** 事件类型 */
  type: 'branch-created' | 'branch-switched' | 'checkpoint-created' | 'checkpoint-deleted' | 'branch-merged' | 'branch-deleted' | 'marker'
  /** 事件时间戳 */
  timestamp: string
  /** 关联分支 ID */
  branchId?: string
  /** 关联检查点 ID */
  checkpointId?: string
  /** 事件标签 */
  label: string
  /** 事件描述 */
  description: string
  /** 事件数据快照 */
  snapshot: {
    branches: WorldBranch[]
    checkpoints: Checkpoint[]
    activeBranchId: string
  }
  /** 是否为关键决策点 */
  isDecisionPoint: boolean
}

/** 回放标记 */
export interface ReplayMarker {
  id: string
  /** 对应的事件索引 */
  eventIndex: number
  /** 标记标签 */
  label: string
  /** 标记描述 */
  description: string
  /** 标记颜色 */
  color: string
  /** 关联的分支 ID */
  branchId?: string
  /** 创建时间 */
  createdAt: string
}

/** 分支回放 */
export interface BranchReplay {
  id: string
  /** 回放名称 */
  name: string
  /** 回放描述 */
  description: string
  /** 事件列表 */
  events: ReplayEvent[]
  /** 标记列表 */
  markers: ReplayMarker[]
  /** 当前回放速度 */
  speed: ReplaySpeed
  /** 当前回放状态 */
  state: ReplayState
  /** 当前事件索引 */
  currentEventIndex: number
  /** 总事件数 */
  totalEvents: number
  /** 回放开始时间 */
  startedAt: string
  /** 回放结束时间 */
  endedAt?: string
  /** 回放范围 [开始分支ID, 结束分支ID] */
  scope: {
    branchIds: string[]
  }
}

// ============================================================
// 速度映射
// ============================================================

/** 回放速度对应的延迟（毫秒） */
const SPEED_DELAY_MAP: Record<ReplaySpeed, number> = {
  '0.25x': 4000,
  '0.5x': 2000,
  '1x': 1000,
  '2x': 500,
  '4x': 250,
  '8x': 125,
}

/** 回放速度标签 */
const SPEED_LABELS: Record<ReplaySpeed, string> = {
  '0.25x': '0.25 倍速',
  '0.5x': '0.5 倍速',
  '1x': '正常速度',
  '2x': '2 倍速',
  '4x': '4 倍速',
  '8x': '8 倍速',
}

// ---- 存储键 ----

const REPLAY_STORAGE_KEYS = {
  PLAYS: 'hf:parallel-world:replays',
  MARKERS: 'hf:parallel-world:replay-markers',
} as const

// ---- 标记颜色预设 ----

const MARKER_COLORS = [
  '#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF',
  '#FF8C42', '#9B5DE5', '#F15BB5', '#00BBF9',
]

// ---- ID 生成 ----

function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

// ============================================================
// useBranchReplay — 分支回放引擎
// ============================================================

export function useBranchReplay() {
  // ---- 状态 ----

  const replays = ref<BranchReplay[]>([])
  const currentReplayId = ref<string | null>(null)
  const replayTimer = ref<ReturnType<typeof setInterval> | null>(null)

  // ---- 派生状态 ----

  /** 当前回放 */
  const currentReplay = computed<BranchReplay | null>(() => {
    if (!currentReplayId.value) return null
    return replays.value.find(r => r.id === currentReplayId.value) ?? null
  })

  /** 当前事件 */
  const currentEvent = computed<ReplayEvent | null>(() => {
    const replay = currentReplay.value
    if (!replay || replay.events.length === 0) return null
    return replay.events[replay.currentEventIndex] ?? null
  })

  /** 当前回放进度 (0-1) */
  const replayProgress = computed(() => {
    const replay = currentReplay.value
    if (!replay || replay.totalEvents === 0) return 0
    return (replay.currentEventIndex + 1) / replay.totalEvents
  })

  /** 是否正在回放 */
  const isPlaying = computed(() => currentReplay.value?.state === 'playing')

  /** 是否暂停 */
  const isPaused = computed(() => currentReplay.value?.state === 'paused')

  // ---- 持久化 ----

  function loadReplays(): void {
    const saved = storage.getKV<BranchReplay[]>(REPLAY_STORAGE_KEYS.PLAYS, [])
    if (saved && saved.length > 0) {
      replays.value = saved
    }
  }

  function saveReplays(): void {
    storage.setKV(REPLAY_STORAGE_KEYS.PLAYS, replays.value)
  }

  // ============================================================
  // 回放管理
  // ============================================================

  /**
   * 从分支和检查点数据构建回放事件
   */
  function buildReplayEvents(
    branches: WorldBranch[],
    checkpoints: Checkpoint[],
  ): ReplayEvent[] {
    const events: ReplayEvent[] = []
    const branchMap = new Map<string, WorldBranch>()

    // 收集所有带时间戳的实体
    const timeline: Array<{
      type: 'branch' | 'checkpoint'
      timestamp: string
      branch?: WorldBranch
      checkpoint?: Checkpoint
    }> = []

    for (const b of branches) {
      timeline.push({ type: 'branch', timestamp: b.createdAt, branch: b })
    }
    for (const cp of checkpoints) {
      timeline.push({ type: 'checkpoint', timestamp: cp.createdAt, checkpoint: cp })
    }

    // 按时间排序
    timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    for (const item of timeline) {
      if (item.type === 'branch' && item.branch) {
        const b = item.branch
        branchMap.set(b.id, b)

        const isDecisionPoint = b.parentBranchId !== undefined

        events.push({
          id: generateId('evt'),
          type: 'branch-created',
          timestamp: b.createdAt,
          branchId: b.id,
          label: `创建分支「${b.name}」`,
          description: b.parentBranchId
            ? `从「${branchMap.get(b.parentBranchId)?.name ?? '未知'}」分出平行分支「${b.name}」`
            : `创建根分支「${b.name}」`,
          snapshot: {
            branches: JSON.parse(JSON.stringify([...branchMap.values()])),
            checkpoints: JSON.parse(JSON.stringify(checkpoints.filter(cp => new Date(cp.createdAt).getTime() <= new Date(b.createdAt).getTime()))),
            activeBranchId: b.isActive ? b.id : (branches.find(br => br.isActive)?.id ?? ''),
          },
          isDecisionPoint,
        })
      }

      if (item.type === 'checkpoint' && item.checkpoint) {
        const cp = item.checkpoint
        const branch = branchMap.get(cp.branchId)

        events.push({
          id: generateId('evt'),
          type: 'checkpoint-created',
          timestamp: cp.createdAt,
          branchId: cp.branchId,
          checkpointId: cp.id,
          label: `检查点「${cp.label}」`,
          description: `在「${branch?.name ?? '未知'}」分支上创建检查点: ${cp.description || cp.label}`,
          snapshot: {
            branches: JSON.parse(JSON.stringify([...branchMap.values()])),
            checkpoints: JSON.parse(JSON.stringify(checkpoints.filter(cp2 => new Date(cp2.createdAt).getTime() <= new Date(cp.createdAt).getTime()))),
            activeBranchId: branches.find(br => br.isActive)?.id ?? '',
          },
          isDecisionPoint: cp.tags.length > 0 && cp.tags.includes('decision'),
        })
      }
    }

    return events
  }

  /**
   * 创建新的回放会话
   */
  function createReplay(
    name: string,
    description: string,
    branches: WorldBranch[],
    checkpoints: Checkpoint[],
    branchIds?: string[],
  ): BranchReplay {
    const filteredBranches = branchIds && branchIds.length > 0
      ? branches.filter(b => branchIds.includes(b.id))
      : branches

    const filteredCheckpoints = branchIds && branchIds.length > 0
      ? checkpoints.filter(cp => branchIds.includes(cp.branchId))
      : checkpoints

    const events = buildReplayEvents(filteredBranches, filteredCheckpoints)

    const replay: BranchReplay = {
      id: generateId('replay'),
      name,
      description,
      events,
      markers: [],
      speed: '1x',
      state: 'idle',
      currentEventIndex: 0,
      totalEvents: events.length,
      startedAt: new Date().toISOString(),
      scope: {
        branchIds: filteredBranches.map(b => b.id),
      },
    }

    replays.value = [replay, ...replays.value]
    saveReplays()
    return replay
  }

  /**
   * 删除回放
   */
  function deleteReplay(replayId: string): boolean {
    const idx = replays.value.findIndex(r => r.id === replayId)
    if (idx === -1) return false

    // 停止正在进行的回放
    if (currentReplayId.value === replayId) {
      stopReplayInternal()
    }

    replays.value.splice(idx, 1)
    saveReplays()
    return true
  }

  /**
   * 获取回放
   */
  function getReplay(replayId: string): BranchReplay | undefined {
    return replays.value.find(r => r.id === replayId)
  }

  // ============================================================
  // 回放控制
  // ============================================================

  /**
   * 开始回放
   */
  function startReplay(replayId: string): BranchReplay | null {
    const replay = replays.value.find(r => r.id === replayId)
    if (!replay || replay.events.length === 0) return null

    // 停止当前回放
    if (currentReplayId.value) {
      stopReplayInternal()
    }

    currentReplayId.value = replayId
    replay.state = 'playing'
    replay.startedAt = new Date().toISOString()
    replay.currentEventIndex = 0

    // 启动定时器
    startReplayTimer(replay)

    return replay
  }

  /**
   * 暂停回放
   */
  function pauseReplay(): boolean {
    const replay = currentReplay.value
    if (!replay || replay.state !== 'playing') return false

    clearReplayTimer()
    replay.state = 'paused'
    return true
  }

  /**
   * 恢复回放
   */
  function resumeReplay(): boolean {
    const replay = currentReplay.value
    if (!replay || replay.state !== 'paused') return false

    replay.state = 'playing'
    startReplayTimer(replay)
    return true
  }

  /**
   * 停止回放
   */
  function stopReplay(): boolean {
    const replay = currentReplay.value
    if (!replay) return false

    stopReplayInternal()
    return true
  }

  /**
   * 内部停止回放
   */
  function stopReplayInternal(): void {
    clearReplayTimer()

    if (currentReplayId.value) {
      const replay = replays.value.find(r => r.id === currentReplayId.value)
      if (replay) {
        replay.state = 'stopped'
        replay.endedAt = new Date().toISOString()
      }
    }

    currentReplayId.value = null
  }

  // ---- 定时器管理 ----

  function startReplayTimer(replay: BranchReplay): void {
    clearReplayTimer()

    const delay = SPEED_DELAY_MAP[replay.speed]

    replayTimer.value = setInterval(() => {
      if (replay.state !== 'playing') return

      if (replay.currentEventIndex < replay.events.length - 1) {
        replay.currentEventIndex++
      } else {
        // 回放完成
        clearReplayTimer()
        replay.state = 'completed'
        replay.endedAt = new Date().toISOString()
      }
    }, delay)
  }

  function clearReplayTimer(): void {
    if (replayTimer.value !== null) {
      clearInterval(replayTimer.value)
      replayTimer.value = null
    }
  }

  // ============================================================
  // 回放速度
  // ============================================================

  /**
   * 设置回放速度
   */
  function setSpeed(speed: ReplaySpeed): boolean {
    const replay = currentReplay.value
    if (!replay) return false

    replay.speed = speed

    // 如果正在播放，重新设置定时器
    if (replay.state === 'playing') {
      startReplayTimer(replay)
    }

    return true
  }

  /**
   * 获取当前速度标签
   */
  function getSpeedLabel(speed?: ReplaySpeed): string {
    return SPEED_LABELS[speed ?? '1x']
  }

  // ============================================================
  // 回放标记
  // ============================================================

  /**
   * 添加标记
   */
  function addMarker(
    label: string,
    description: string = '',
    color?: string,
    branchId?: string,
  ): ReplayMarker | null {
    const replay = currentReplay.value
    if (!replay) return null

    const marker: ReplayMarker = {
      id: generateId('marker'),
      eventIndex: replay.currentEventIndex,
      label,
      description,
      color: color ?? MARKER_COLORS[replay.markers.length % MARKER_COLORS.length],
      branchId: branchId ?? currentEvent.value?.branchId,
      createdAt: new Date().toISOString(),
    }

    replay.markers.push(marker)

    // 在事件中插入标记事件
    const event = replay.events[replay.currentEventIndex]
    if (event) {
      const markerEvent: ReplayEvent = {
        id: generateId('evt_marker'),
        type: 'marker',
        timestamp: new Date().toISOString(),
        label: `[标记] ${label}`,
        description: description || `决策点标记: ${label}`,
        snapshot: event.snapshot,
        isDecisionPoint: true,
      }
      replay.events.splice(replay.currentEventIndex + 1, 0, markerEvent)
      replay.totalEvents = replay.events.length
    }

    saveReplays()
    return marker
  }

  /**
   * 跳转到指定标记
   */
  function jumpToMarker(markerId: string): boolean {
    const replay = currentReplay.value
    if (!replay) return false

    const marker = replay.markers.find(m => m.id === markerId)
    if (!marker) return false

    replay.currentEventIndex = marker.eventIndex
    return true
  }

  /**
   * 获取当前回放的所有标记
   */
  function getMarkers(): ReplayMarker[] {
    return currentReplay.value?.markers ?? []
  }

  /**
   * 删除标记
   */
  function removeMarker(markerId: string): boolean {
    const replay = currentReplay.value
    if (!replay) return false

    const idx = replay.markers.findIndex(m => m.id === markerId)
    if (idx === -1) return false

    replay.markers.splice(idx, 1)
    saveReplays()
    return true
  }

  // ============================================================
  // 事件导航
  // ============================================================

  /**
   * 跳转到指定事件索引
   */
  function jumpToEvent(eventIndex: number): boolean {
    const replay = currentReplay.value
    if (!replay) return false
    if (eventIndex < 0 || eventIndex >= replay.events.length) return false

    replay.currentEventIndex = eventIndex
    return true
  }

  /**
   * 跳转到下一个事件
   */
  function nextEvent(): boolean {
    const replay = currentReplay.value
    if (!replay) return false
    if (replay.currentEventIndex >= replay.events.length - 1) return false

    replay.currentEventIndex++
    return true
  }

  /**
   * 跳转到上一个事件
   */
  function previousEvent(): boolean {
    const replay = currentReplay.value
    if (!replay) return false
    if (replay.currentEventIndex <= 0) return false

    replay.currentEventIndex--
    return true
  }

  /**
   * 跳转到第一个事件
   */
  function jumpToStart(): boolean {
    const replay = currentReplay.value
    if (!replay) return false

    replay.currentEventIndex = 0
    return true
  }

  /**
   * 跳转到最后一个事件
   */
  function jumpToEnd(): boolean {
    const replay = currentReplay.value
    if (!replay) return false

    replay.currentEventIndex = replay.events.length - 1
    return true
  }

  // ============================================================
  // 事件查询
  // ============================================================

  /**
   * 获取所有回放事件
   */
  function getReplayEvents(): ReplayEvent[] {
    return currentReplay.value?.events ?? []
  }

  /**
   * 获取指定分支的回放事件
   */
  function getEventsForBranch(branchId: string): ReplayEvent[] {
    const replay = currentReplay.value
    if (!replay) return []
    return replay.events.filter(e => e.branchId === branchId)
  }

  /**
   * 获取所有决策点事件
   */
  function getDecisionPoints(): ReplayEvent[] {
    const replay = currentReplay.value
    if (!replay) return []
    return replay.events.filter(e => e.isDecisionPoint)
  }

  /**
   * 获取事件范围（从开始到当前）
   */
  function getEventsInRange(startIndex: number, endIndex: number): ReplayEvent[] {
    const replay = currentReplay.value
    if (!replay) return []
    return replay.events.slice(startIndex, endIndex + 1)
  }

  // ============================================================
  // 回放统计
  // ============================================================

  function getReplayStats(): {
    totalReplays: number
    completedReplays: number
    totalEvents: number
    totalMarkers: number
    averageSpeed: string
  } {
    const completed = replays.value.filter(r => r.state === 'completed').length
    const totalEvents = replays.value.reduce((sum, r) => sum + r.totalEvents, 0)
    const totalMarkers = replays.value.reduce((sum, r) => sum + r.markers.length, 0)

    return {
      totalReplays: replays.value.length,
      completedReplays: completed,
      totalEvents,
      totalMarkers,
      averageSpeed: '1x',
    }
  }

  // ---- 清理 ----

  function destroy(): void {
    clearReplayTimer()
    currentReplayId.value = null
  }

  // ---- 初始化 ----

  loadReplays()

  // ============================================================
  // 返回
  // ============================================================

  return {
    // 状态
    replays,
    currentReplayId,
    currentReplay,
    currentEvent,
    replayProgress,
    isPlaying,
    isPaused,

    // 回放管理
    createReplay,
    deleteReplay,
    getReplay,
    buildReplayEvents,

    // 回放控制
    startReplay,
    pauseReplay,
    resumeReplay,
    stopReplay,

    // 速度
    setSpeed,
    getSpeedLabel,

    // 标记
    addMarker,
    jumpToMarker,
    getMarkers,
    removeMarker,

    // 事件导航
    jumpToEvent,
    nextEvent,
    previousEvent,
    jumpToStart,
    jumpToEnd,

    // 事件查询
    getReplayEvents,
    getEventsForBranch,
    getDecisionPoints,
    getEventsInRange,

    // 统计
    getReplayStats,

    // 生命周期
    destroy,
    loadReplays,
  }
}

export { SPEED_DELAY_MAP, SPEED_LABELS, REPLAY_STORAGE_KEYS }