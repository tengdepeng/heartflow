// ============================================================
// 安全岛 · 视图桥接层（P22-6）
// 全局系统状态层，聚合激活状态、会话追踪、统计
// ============================================================

import { ref, computed } from 'vue'

// ============================================================
// 类型定义
// ============================================================

/** 安全岛激活状态 */
export interface SanctuaryState {
  isActive: boolean
  activationCount: number
  currentSessionStart: string | null
  sessionDuration: number
}

/** 触发配置 */
export interface TriggerConfig {
  tapCount: number
  windowMs: number
  autoExit: boolean
  progress: number
}

/** 安全岛会话记录 */
export interface SanctuarySession {
  id: string
  startTime: string
  endTime: string | null
  duration: number
  reason: string
}

/** 安全岛统计 */
export interface SanctuaryStats {
  totalActivations: number
  totalDuration: number
  avgDuration: number
  lastActivation: string | null
  sessionsToday: number
  longestSession: number
  shortestSession: number
}

/** 安全岛建议 */
export interface SanctuaryRecommendation {
  type: 'usage' | 'pattern' | 'wellness'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  action?: string
}

// ============================================================
// useSanctuaryBridge Composable
// ============================================================

export function useSanctuaryBridge() {
  // ---- 状态 ----
  const isActive = ref(false)
  const activationCount = ref(0)
  const currentSessionStart = ref<string | null>(null)
  const sessionTimer = ref<ReturnType<typeof setInterval> | null>(null)
  const sessionDuration = ref(0)

  // 触发配置
  const tapCount = ref(5)
  const windowMs = ref(2000)
  const autoExit = ref(false)
  const triggerProgress = ref(0)

  // 会话历史
  const sessions = ref<SanctuarySession[]>([])

  // ---- 计算属性 ----

  /** 安全岛状态 */
  const sanctuaryState = computed<SanctuaryState>(() => ({
    isActive: isActive.value,
    activationCount: activationCount.value,
    currentSessionStart: currentSessionStart.value,
    sessionDuration: sessionDuration.value,
  }))

  /** 触发配置 */
  const triggerConfig = computed<TriggerConfig>(() => ({
    tapCount: tapCount.value,
    windowMs: windowMs.value,
    autoExit: autoExit.value,
    progress: triggerProgress.value,
  }))

  /** 会话统计 */
  const sessionStats = computed<SanctuaryStats>(() => {
    const completed = sessions.value.filter(s => s.endTime !== null)
    const totalDuration = completed.reduce((sum, s) => sum + s.duration, 0)
    const durations = completed.map(s => s.duration)

    const today = new Date().toISOString().slice(0, 10)
    const sessionsToday = sessions.value.filter(s => s.startTime.slice(0, 10) === today).length

    return {
      totalActivations: activationCount.value,
      totalDuration,
      avgDuration: completed.length > 0 ? Math.round(totalDuration / completed.length) : 0,
      lastActivation: completed.length > 0 ? completed[completed.length - 1].startTime : null,
      sessionsToday,
      longestSession: durations.length > 0 ? Math.max(...durations) : 0,
      shortestSession: durations.length > 0 ? Math.min(...durations) : 0,
    }
  })

  /** 激活历史 */
  const activationHistory = computed<SanctuarySession[]>(() => {
    return sessions.value
      .filter(s => s.endTime !== null)
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
  })

  /** 使用建议 */
  const recommendations = computed<SanctuaryRecommendation[]>(() => {
    const recs: SanctuaryRecommendation[] = []
    const stats = sessionStats.value

    // 1. 使用频率建议
    if (stats.totalActivations === 0) {
      recs.push({
        type: 'usage',
        priority: 'high',
        title: '初次体验安全岛',
        description: '五击屏幕任意位置即可激活安全岛，进入一个宁静的暂停空间',
        action: '尝试五击激活',
      })
    } else if (stats.sessionsToday === 0) {
      recs.push({
        type: 'usage',
        priority: 'medium',
        title: '今天还没有使用安全岛',
        description: '当你感到压力或需要片刻宁静时，安全岛随时为你敞开',
        action: '五击激活安全岛',
      })
    }

    // 2. 使用模式建议
    if (stats.totalActivations > 0 && stats.avgDuration < 30) {
      recs.push({
        type: 'pattern',
        priority: 'medium',
        title: '尝试延长停留时间',
        description: `平均停留时长 ${stats.avgDuration} 秒，建议多停留一会儿，深度体验呼吸练习`,
        action: '在安全岛中停留更久',
      })
    }

    if (stats.totalActivations >= 5 && stats.sessionsToday >= 3) {
      recs.push({
        type: 'pattern',
        priority: 'low',
        title: '你今天已经多次使用安全岛',
        description: '频繁激活可能意味着你需要更系统的压力管理策略',
        action: '考虑安排固定的放松时间',
      })
    }

    // 3. 健康建议
    if (stats.longestSession > 120) {
      recs.push({
        type: 'wellness',
        priority: 'low',
        title: '最长停留超过 2 分钟',
        description: '你在安全岛中找到了深度宁静。继续保持这个习惯',
        action: '保持当前节奏',
      })
    }

    if (stats.totalActivations > 0 && stats.totalActivations < 5) {
      recs.push({
        type: 'wellness',
        priority: 'low',
        title: '建立安全岛使用习惯',
        description: '将安全岛融入日常，在感受到压力或需要专注前使用它',
        action: '每天使用 1-2 次安全岛',
      })
    }

    return recs.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 }
      return order[a.priority] - order[b.priority]
    })
  })

  // ---- 操作方法 ----

  /** 激活安全岛 */
  function activate(reason: string = '用户触发'): void {
    if (isActive.value) return

    isActive.value = true
    activationCount.value++
    currentSessionStart.value = new Date().toISOString()
    sessionDuration.value = 0

    // 创建会话记录
    const session: SanctuarySession = {
      id: `sanc-${Date.now()}`,
      startTime: currentSessionStart.value,
      endTime: null,
      duration: 0,
      reason,
    }
    sessions.value.push(session)

    // 启动计时器
    if (sessionTimer.value) clearInterval(sessionTimer.value)
    sessionTimer.value = setInterval(() => {
      sessionDuration.value++
    }, 1000)
  }

  /** 退出安全岛 */
  function deactivate(): void {
    if (!isActive.value) return

    isActive.value = false

    // 停止计时器
    if (sessionTimer.value) {
      clearInterval(sessionTimer.value)
      sessionTimer.value = null
    }

    // 完成当前会话
    const currentSession = sessions.value.find(s => s.endTime === null)
    if (currentSession) {
      currentSession.endTime = new Date().toISOString()
      currentSession.duration = sessionDuration.value
    }

    currentSessionStart.value = null
    sessionDuration.value = 0
  }

  /** 配置触发器 */
  function configureTrigger(config: Partial<TriggerConfig>): void {
    if (config.tapCount !== undefined) tapCount.value = config.tapCount
    if (config.windowMs !== undefined) windowMs.value = config.windowMs
    if (config.autoExit !== undefined) autoExit.value = config.autoExit
    if (config.progress !== undefined) triggerProgress.value = config.progress
  }

  /** 更新触发进度 */
  function updateProgress(progress: number): void {
    triggerProgress.value = Math.min(1, Math.max(0, progress))
  }

  /** 获取会话历史 */
  function getSessionHistory(limit: number = 20): SanctuarySession[] {
    return activationHistory.value.slice(0, limit)
  }

  /** 获取今日会话 */
  function getTodaySessions(): SanctuarySession[] {
    const today = new Date().toISOString().slice(0, 10)
    return sessions.value.filter(s => s.startTime.slice(0, 10) === today)
  }

  /** 重置统计 */
  function resetStats(): void {
    if (isActive.value) deactivate()
    activationCount.value = 0
    sessions.value = []
    sessionDuration.value = 0
    triggerProgress.value = 0
  }

  return {
    // 状态
    isActive,
    sanctuaryState,
    triggerConfig,
    sessionStats,
    activationHistory,
    recommendations,

    // 操作
    activate,
    deactivate,
    configureTrigger,
    updateProgress,
    getSessionHistory,
    getTodaySessions,
    resetStats,
  }
}