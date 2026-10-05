// ============================================================
// 逐日心锚 · 庆祝动画 + 智能提醒 + 日历导出
// 蓝图：庆祝动画、智能提醒、日历导出
// ============================================================

import { ref } from 'vue'
import { storage } from '@/engine/storage'
import type { Anchor } from './types'
import { isTargetActive } from '@/engine/constitution-effect'
import { getLocalDateKey } from '@/utils/time'

// ---- 庆祝效果 ----

export interface CelebrationEffect {
  id: string
  type: 'particle' | 'firework' | 'ripple' | 'glow' | 'confetti' | 'star-burst'
  anchorId: string
  anchorText: string
  intensity: 'subtle' | 'moderate' | 'grand'
  duration: number // 毫秒
  /** 粒子配置 */
  config: CelebrationConfig
  triggeredAt: string
}

export interface CelebrationConfig {
  particleCount: number
  colors: string[]
  spread: number // 扩散范围
  gravity: number // 重力
  speed: number // 初始速度
  size: { min: number; max: number }
  /** 是否播放音效 */
  soundEnabled: boolean
}

export interface CelebrationHistory {
  id: string
  anchorId: string
  anchorText: string
  effectType: CelebrationEffect['type']
  triggeredAt: string
  /** 完成时的场景 */
  context: {
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'
    dayOfWeek: number
    streakAnchor: boolean // 是否连续完成
    firstOfDay: boolean // 当天第一个完成
    lastOfDay: boolean // 当天最后一个完成
    milestone: boolean // 是否为里程碑
  }
}

export interface CelebrationMilestone {
  type: 'total' | 'streak' | 'weekly' | 'monthly' | 'category'
  threshold: number
  label: string
  description: string
  effectType: CelebrationEffect['type']
  intensity: CelebrationEffect['intensity']
}

// ---- 智能提醒 ----

export interface ReminderRule {
  id: string
  /** 提醒类型 */
  type: 'time' | 'priority' | 'deadline' | 'drift' | 'idle' | 'streak'
  /** 是否启用 */
  enabled: boolean
  /** 是否为 App 默认规则（非用户显式创建）。宪法行为提醒门控（behavior:reminder）仅抑制默认诱导型提醒，用户自建规则不受影响 */
  isDefault?: boolean
  /** 触发条件 */
  condition: ReminderCondition
  /** 提醒消息模板 */
  messageTemplate: string
  /** 优先级 */
  priority: 'low' | 'medium' | 'high'
  /** 重复规则 */
  repeat?: 'once' | 'daily' | 'until_done'
}

export interface ReminderCondition {
  /** 提前时间（分钟） */
  advanceMinutes?: number
  /** 锚点优先级 */
  anchorPriority?: Anchor['priority'][]
  /** 最大漂移次数 */
  maxDriftCount?: number
  /** 空闲天数 */
  idleDays?: number
  /** 连续天数 */
  streakDays?: number
  /** 每日提醒时间（HH:mm） */
  timeOfDay?: string
}

export interface ReminderRecord {
  id: string
  ruleId: string
  anchorId: string
  anchorText: string
  message: string
  triggeredAt: string
  acknowledged: boolean
  acknowledgedAt?: string
  snoozedUntil?: string
}

// ---- 日历导出 ----

export interface CalendarExport {
  format: 'ics' | 'json'
  content: string
  filename: string
  anchorCount: number
  generatedAt: string
}

export interface CalendarEvent {
  uid: string
  summary: string
  description: string
  startDate: string
  endDate: string
  priority: string
  status: string
  tags: string[]
}

// ---- 存储键 ----

const CELEBRATION_KEYS = {
  HISTORY: 'hf:anchor:celebration_history',
  REMINDERS: 'hf:anchor:reminder_records',
  RULES: 'hf:anchor:reminder_rules',
} as const

// ---- 里程碑定义 ----

const DEFAULT_MILESTONES: CelebrationMilestone[] = [
  {
    type: 'total',
    threshold: 1,
    label: '第一个锚点',
    description: '完成了第一个锚点！这趟旅程正式开始',
    effectType: 'confetti',
    intensity: 'grand',
  },
  {
    type: 'total',
    threshold: 10,
    label: '十锚之旅',
    description: '你已经完成了10个锚点，稳健前行',
    effectType: 'firework',
    intensity: 'moderate',
  },
  {
    type: 'total',
    threshold: 50,
    label: '五十锚里程碑',
    description: '半个百锚！你正在建造一座坚固的灯塔',
    effectType: 'star-burst',
    intensity: 'grand',
  },
  {
    type: 'total',
    threshold: 100,
    label: '百锚成就',
    description: '一百个锚点！你的时间之舟已留下深深的航迹',
    effectType: 'star-burst',
    intensity: 'grand',
  },
  {
    type: 'total',
    threshold: 365,
    label: '一年之锚',
    description: '365个锚点，整整一年的坚持',
    effectType: 'star-burst',
    intensity: 'grand',
  },
  {
    type: 'streak',
    threshold: 3,
    label: '连续三天',
    description: '连续三天完成锚点，节奏感开始形成',
    effectType: 'glow',
    intensity: 'subtle',
  },
  {
    type: 'streak',
    threshold: 7,
    label: '一周连胜',
    description: '连续七天！习惯正在养成',
    effectType: 'firework',
    intensity: 'moderate',
  },
  {
    type: 'streak',
    threshold: 30,
    label: '月度连胜',
    description: '连续三十天！你已经建立了强大的自律体系',
    effectType: 'star-burst',
    intensity: 'grand',
  },
  {
    type: 'weekly',
    threshold: 10,
    label: '十周之锚',
    description: '本周完成了10个锚点',
    effectType: 'ripple',
    intensity: 'subtle',
  },
  {
    type: 'monthly',
    threshold: 30,
    label: '月满之锚',
    description: '本月完成了30个锚点，月满而盈',
    effectType: 'firework',
    intensity: 'moderate',
  },
]

// ---- 默认提醒规则 ----

const DEFAULT_REMINDER_RULES: Omit<ReminderRule, 'id'>[] = [
  {
    type: 'time',
    enabled: true,
    condition: { timeOfDay: '09:00' },
    messageTemplate: '早上好！今天有 {count} 个锚点在等待你',
    priority: 'low',
    repeat: 'daily',
  },
  {
    type: 'time',
    enabled: true,
    condition: { timeOfDay: '21:00' },
    messageTemplate: '夜晚了，回顾一下今天的锚点完成情况吧',
    priority: 'low',
    repeat: 'daily',
  },
  {
    type: 'deadline',
    enabled: true,
    condition: { advanceMinutes: 60 },
    messageTemplate: '"{anchorText}" 将在 1 小时后到期',
    priority: 'medium',
    repeat: 'once',
  },
  {
    type: 'deadline',
    enabled: true,
    condition: { advanceMinutes: 15 },
    messageTemplate: '"{anchorText}" 即将到期，只剩 15 分钟',
    priority: 'high',
    repeat: 'once',
  },
  {
    type: 'drift',
    enabled: true,
    condition: { maxDriftCount: 3 },
    messageTemplate: '"{anchorText}" 已经漂移了 {count} 次，要不要重新考虑它的优先级？',
    priority: 'medium',
    repeat: 'once',
  },
  {
    type: 'idle',
    enabled: true,
    condition: { idleDays: 3 },
    messageTemplate: '已经 {days} 天没有完成锚点了，要不要从一个小目标开始？',
    priority: 'medium',
    repeat: 'daily',
  },
  {
    type: 'streak',
    enabled: true,
    condition: { streakDays: 5 },
    messageTemplate: '你已经连续 {days} 天完成锚点！继续保持！',
    priority: 'low',
    repeat: 'daily',
  },
  {
    type: 'priority',
    enabled: true,
    condition: { anchorPriority: ['must'] },
    messageTemplate: '今天还有 {count} 个必锚没有完成',
    priority: 'high',
    repeat: 'daily',
  },
]

// ============================================================
// useCelebration
// ============================================================

export function useCelebration() {
  const history = ref<CelebrationHistory[]>([])
  const milestones = ref<CelebrationMilestone[]>(DEFAULT_MILESTONES)
  const activeEffect = ref<CelebrationEffect | null>(null)

  function loadHistory(): void {
    history.value = storage.getKV<CelebrationHistory[]>(CELEBRATION_KEYS.HISTORY, []) || []
  }

  function saveHistory(): void {
    storage.setKV(CELEBRATION_KEYS.HISTORY, history.value)
  }

  /** 判断当前时段 */
  function getTimeOfDay(): CelebrationHistory['context']['timeOfDay'] {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 12) return 'morning'
    if (hour >= 12 && hour < 18) return 'afternoon'
    if (hour >= 18 && hour < 22) return 'evening'
    return 'night'
  }

  /** 根据锚点完成情况选择庆祝效果 */
  function selectEffect(
    anchor: Anchor,
    context: CelebrationHistory['context'],
  ): CelebrationEffect {
    let intensity: CelebrationEffect['intensity'] = 'subtle'
    let type: CelebrationEffect['type'] = 'ripple'
    let particleCount = 20
    let colors = ['#6b9fc4', '#f0c040', '#8a9a7a']
    let soundEnabled = false

    // 根据优先级选择基础效果
    if (anchor.priority === 'must') {
      intensity = 'moderate'
      type = 'firework'
      particleCount = 50
    } else if (anchor.priority === 'can') {
      intensity = 'subtle'
      type = 'ripple'
      particleCount = 30
    } else {
      intensity = 'subtle'
      type = 'glow'
      particleCount = 15
    }

    // 根据场景增强
    if (context.milestone) {
      intensity = 'grand'
      type = 'star-burst'
      particleCount = 100
      colors = ['#f0c040', '#d98c7a', '#6b9fc4', '#8a9a7a', '#b5707a']
      soundEnabled = true
    } else if (context.streakAnchor) {
      intensity = 'moderate'
      type = 'confetti'
      particleCount = 60
    } else if (context.firstOfDay) {
      intensity = 'moderate'
      type = 'glow'
      particleCount = 40
    }

    // 根据时段调整颜色
    const timeOfDay = context.timeOfDay
    if (timeOfDay === 'morning') {
      colors = ['#f0c040', '#cf8b6b', '#e8c8a0']
    } else if (timeOfDay === 'night') {
      colors = ['#6b9fc4', '#b5707a', '#a07c8c']
    }

    const config: CelebrationConfig = {
      particleCount,
      colors,
      spread: intensity === 'grand' ? 200 : intensity === 'moderate' ? 150 : 100,
      gravity: 0.5,
      speed: intensity === 'grand' ? 800 : 500,
      size: { min: 4, max: intensity === 'grand' ? 16 : 10 },
      soundEnabled,
    }

    return {
      id: `celebration-${Date.now()}`,
      type,
      anchorId: anchor.id,
      anchorText: anchor.text,
      intensity,
      duration: intensity === 'grand' ? 3000 : intensity === 'moderate' ? 2000 : 1500,
      config,
      triggeredAt: new Date().toISOString(),
    }
  }

  /** 触发庆祝动画 */
  function triggerCelebration(anchor: Anchor, allAnchors: Anchor[]): CelebrationEffect | null {
    // 计算上下文
    const today = getLocalDateKey()
    const todayAnchors = allAnchors.filter(a => {
      const doneAt = a.doneAt || a.createdAt
      return a.done && !!doneAt && getLocalDateKey(new Date(doneAt)) === today
    })

    const context: CelebrationHistory['context'] = {
      timeOfDay: getTimeOfDay(),
      dayOfWeek: new Date().getDay(),
      streakAnchor: checkStreak(allAnchors) >= 3,
      firstOfDay: todayAnchors.length <= 1,
      lastOfDay: getTimeOfDay() === 'night',
      milestone: false,
    }

    // 检查里程碑
    const totalDone = allAnchors.filter(a => a.done).length
    const milestone = milestones.value.find(m => {
      if (m.type === 'total') return totalDone === m.threshold
      if (m.type === 'streak') return checkStreak(allAnchors) === m.threshold
      return false
    })

    if (milestone) {
      context.milestone = true
    }

    const effect = selectEffect(anchor, context)
    activeEffect.value = effect

    // 记录历史
    history.value.push({
      id: `celebration-history-${Date.now()}`,
      anchorId: anchor.id,
      anchorText: anchor.text,
      effectType: effect.type,
      triggeredAt: new Date().toISOString(),
      context,
    })
    saveHistory()

    // 自动清除效果
    setTimeout(() => {
      activeEffect.value = null
    }, effect.duration)

    return effect
  }

  /** 清除活跃效果 */
  function clearEffect(): void {
    activeEffect.value = null
  }

  /** 获取庆祝历史 */
  function getHistory(limit: number = 20): CelebrationHistory[] {
    return [...history.value]
      .sort((a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime())
      .slice(0, limit)
  }

  /** 添加自定义里程碑 */
  function addMilestone(milestone: Omit<CelebrationMilestone, 'id'>): CelebrationMilestone {
    const newMilestone: CelebrationMilestone = {
      ...milestone,
    }
    milestones.value.push(newMilestone)
    return newMilestone
  }

  return {
    history,
    milestones,
    activeEffect,
    loadHistory,
    triggerCelebration,
    clearEffect,
    getHistory,
    addMilestone,
  }
}

// ============================================================
// ---- 宪法行为提醒门控（A2 批② · behavior:reminder）----

/**
 * 宪法「行为提醒」门控（behavior:reminder·disable 型）。
 * 当该目标活跃（宪法约束启用，默认即活跃）时，抑制 App 默认的「诱导型」提醒
 * （固定频率 time / 因间隔 idle / 鼓励 streak），落实「不强制提醒使用节律、不因间隔提醒用户」。
 * 仅作用于 isDefault 的 App 默认规则；用户显式自建的规则不受抑制——
 * 避免宪法陷阱（剥夺用户已明确的自主选择）。
 */
const REMINDER_NUDGE_TYPES: ReadonlyArray<ReminderRule['type']> = ['time', 'idle', 'streak']
export function isReminderSuppressedByConstitution(
  rule: ReminderRule,
  reminderActive: boolean,
): boolean {
  return (
    reminderActive &&
    rule.isDefault === true &&
    (REMINDER_NUDGE_TYPES as readonly string[]).includes(rule.type)
  )
}

// useSmartReminder
// ============================================================

export function useSmartReminder() {
  const rules = ref<ReminderRule[]>([])
  const records = ref<ReminderRecord[]>([])

  function loadAll(): void {
    const storedRules = storage.getKV<ReminderRule[]>(CELEBRATION_KEYS.RULES, [])
    if (storedRules && storedRules.length > 0) {
      rules.value = storedRules
    } else {
      rules.value = DEFAULT_REMINDER_RULES.map(r => ({
        ...r,
        id: `reminder-rule-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        isDefault: true,
      }))
      saveRules()
    }
    records.value = storage.getKV<ReminderRecord[]>(CELEBRATION_KEYS.REMINDERS, []) || []
  }

  function saveRules(): void {
    storage.setKV(CELEBRATION_KEYS.RULES, rules.value)
  }

  function saveRecords(): void {
    storage.setKV(CELEBRATION_KEYS.REMINDERS, records.value)
  }

  /** 向规则添加锚点上下文 */
  function formatMessage(template: string, context: Record<string, string | number>): string {
    let msg = template
    Object.entries(context).forEach(([key, value]) => {
      msg = msg.replace(`{${key}}`, String(value))
    })
    return msg
  }

  /** 检查并生成提醒 */
  function checkReminders(
    anchors: Anchor[],
    now: Date = new Date(),
  ): ReminderRecord[] {
    const newRecords: ReminderRecord[] = []
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    const pendingAnchors = anchors.filter(a => !a.done && a.stage !== 'pool')

    const reminderActive = isTargetActive('behavior:reminder')
    rules.value
      .filter(r => r.enabled)
      .filter(r => !isReminderSuppressedByConstitution(r, reminderActive))
      .forEach(rule => {
        let shouldTrigger = false
        let context: Record<string, string | number> = {}

        switch (rule.type) {
          case 'time':
            if (rule.condition.timeOfDay === currentTime) {
              shouldTrigger = true
              context = { count: pendingAnchors.length }
            }
            break

          case 'deadline':
            if (rule.condition.advanceMinutes) {
              pendingAnchors.forEach(anchor => {
                if (anchor.dueTime) {
                  const [dueH, dueM] = anchor.dueTime.split(':').map(Number)
                  const dueMinutes = dueH * 60 + dueM
                  const currentMinutes = now.getHours() * 60 + now.getMinutes()
                  if (dueMinutes - currentMinutes === rule.condition.advanceMinutes) {
                    shouldTrigger = true
                    context = { anchorText: anchor.text }
                  }
                }
              })
            }
            break

          case 'drift':
            if (rule.condition.maxDriftCount) {
              pendingAnchors.forEach(anchor => {
                if (anchor.driftCount >= rule.condition.maxDriftCount!) {
                  // 避免重复提醒
                  const alreadyReminded = records.value.some(
                    r => r.anchorId === anchor.id && r.ruleId === rule.id,
                  )
                  if (!alreadyReminded) {
                    shouldTrigger = true
                    context = { anchorText: anchor.text, count: anchor.driftCount }
                  }
                }
              })
            }
            break

          case 'idle':
            if (rule.condition.idleDays) {
              const lastDone = anchors
                .filter(a => a.done && a.doneAt)
                .sort((a, b) => new Date(b.doneAt!).getTime() - new Date(a.doneAt!).getTime())[0]

              if (lastDone?.doneAt) {
                const daysSince = Math.floor(
                  (now.getTime() - new Date(lastDone.doneAt).getTime()) / 86400000,
                )
                if (daysSince >= rule.condition.idleDays) {
                  shouldTrigger = true
                  context = { days: daysSince }
                }
              }
            }
            break

          case 'streak':
            if (rule.condition.streakDays) {
              const streak = checkStreak(anchors)
              if (streak >= rule.condition.streakDays) {
                shouldTrigger = true
                context = { days: streak }
              }
            }
            break

          case 'priority':
            if (rule.condition.anchorPriority) {
              const mustPendings = pendingAnchors.filter(
                a => rule.condition.anchorPriority!.includes(a.priority),
              )
              if (mustPendings.length > 0) {
                shouldTrigger = true
                context = { count: mustPendings.length }
              }
            }
            break
        }

        if (shouldTrigger && Object.keys(context).length > 0) {
          const record: ReminderRecord = {
            id: `reminder-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            ruleId: rule.id,
            anchorId: '',
            anchorText: '',
            message: formatMessage(rule.messageTemplate, context),
            triggeredAt: now.toISOString(),
            acknowledged: false,
          }
          newRecords.push(record)
        }
      })

    if (newRecords.length > 0) {
      records.value.push(...newRecords)
      saveRecords()
    }

    return newRecords
  }

  /** 确认提醒 */
  function acknowledgeReminder(recordId: string): void {
    const record = records.value.find(r => r.id === recordId)
    if (record) {
      record.acknowledged = true
      record.acknowledgedAt = new Date().toISOString()
      saveRecords()
    }
  }

  /** 延迟提醒 */
  function snoozeReminder(recordId: string, minutes: number = 30): void {
    const record = records.value.find(r => r.id === recordId)
    if (record) {
      const snoozeUntil = new Date(Date.now() + minutes * 60000)
      record.snoozedUntil = snoozeUntil.toISOString()
      saveRecords()
    }
  }

  /** 获取未确认的提醒 */
  function getPendingReminders(): ReminderRecord[] {
    return records.value.filter(r => !r.acknowledged && !r.snoozedUntil)
  }

  /** 添加/更新规则 */
  function updateRule(ruleId: string, updates: Partial<ReminderRule>): ReminderRule | undefined {
    const idx = rules.value.findIndex(r => r.id === ruleId)
    if (idx === -1) return undefined
    rules.value[idx] = { ...rules.value[idx], ...updates }
    saveRules()
    return rules.value[idx]
  }

  /** 切换规则启用状态 */
  function toggleRule(ruleId: string): ReminderRule | undefined {
    const rule = rules.value.find(r => r.id === ruleId)
    if (!rule) return undefined
    rule.enabled = !rule.enabled
    saveRules()
    return rule
  }

  return {
    rules,
    records,
    loadAll,
    checkReminders,
    acknowledgeReminder,
    snoozeReminder,
    getPendingReminders,
    updateRule,
    toggleRule,
  }
}

// ============================================================
// useCalendarExport
// ============================================================

export function useCalendarExport() {
  const exportResult = ref<CalendarExport | null>(null)

  /** 将锚点转换为日历事件 */
  function anchorsToEvents(anchors: Anchor[]): CalendarEvent[] {
    return anchors
      .filter(a => a.targetDate)
      .map(a => {
        const startDate = a.targetDate
        const endDate = a.dueTime
          ? `${startDate}T${a.dueTime}:00`
          : startDate

        return {
          uid: `anchor-${a.id}`,
          summary: `${a.done ? '✓ ' : '○ '}${a.text}`,
          description: [
            `优先级: ${a.priority}`,
            `阶段: ${a.stage || 'active'}`,
            a.notes ? `备注: ${a.notes}` : '',
            a.category ? `分类: ${a.category}` : '',
          ].filter(Boolean).join('\n'),
          startDate,
          endDate,
          priority: a.priority,
          status: a.done ? 'COMPLETED' : 'NEEDS-ACTION',
          tags: a.tags || [],
        }
      })
  }

  /** 导出为 ICS 格式 */
  function exportAsICS(anchors: Anchor[]): CalendarExport {
    const events = anchorsToEvents(anchors)

    let ics = 'BEGIN:VCALENDAR\n'
    ics += 'VERSION:2.0\n'
    ics += 'PRODID:-//HeartFlow//Anchor Calendar//CN\n'
    ics += 'CALSCALE:GREGORIAN\n'
    ics += 'METHOD:PUBLISH\n'
    ics += 'X-WR-CALNAME:心流工坊 · 逐日心锚\n'
    ics += 'X-WR-TIMEZONE:Asia/Shanghai\n'

    events.forEach(event => {
      ics += 'BEGIN:VEVENT\n'
      ics += `UID:${event.uid}\n`
      ics += `DTSTART;VALUE=DATE:${event.startDate.replace(/-/g, '')}\n`
      if (event.endDate !== event.startDate) {
        ics += `DTEND;VALUE=DATE:${event.endDate.replace(/-/g, '')}\n`
      } else {
        ics += `DTEND;VALUE=DATE:${event.startDate.replace(/-/g, '')}\n`
      }
      ics += `SUMMARY:${escapeICS(event.summary)}\n`
      ics += `DESCRIPTION:${escapeICS(event.description)}\n`
      ics += `STATUS:${event.status}\n`
      ics += `PRIORITY:${event.priority === 'must' ? '1' : event.priority === 'can' ? '5' : '9'}\n`
      if (event.tags.length > 0) {
        ics += `CATEGORIES:${event.tags.join(',')}\n`
      }
      ics += 'END:VEVENT\n'
    })

    ics += 'END:VCALENDAR\n'

    const result: CalendarExport = {
      format: 'ics',
      content: ics,
      filename: `heartflow-anchors-${getLocalDateKey()}.ics`,
      anchorCount: events.length,
      generatedAt: new Date().toISOString(),
    }

    exportResult.value = result
    return result
  }

  /** 导出为 JSON 格式 */
  function exportAsJSON(anchors: Anchor[]): CalendarExport {
    const events = anchorsToEvents(anchors)
    const json = JSON.stringify(
      { name: '心流工坊 · 逐日心锚', events, exportedAt: new Date().toISOString() },
      null,
      2,
    )

    const result: CalendarExport = {
      format: 'json',
      content: json,
      filename: `heartflow-anchors-${getLocalDateKey()}.json`,
      anchorCount: events.length,
      generatedAt: new Date().toISOString(),
    }

    exportResult.value = result
    return result
  }

  /** 导出指定日期范围的锚点 */
  function exportByDateRange(
    anchors: Anchor[],
    startDate: string,
    endDate: string,
    format: 'ics' | 'json' = 'ics',
  ): CalendarExport {
    const filtered = anchors.filter(a => {
      return a.targetDate >= startDate && a.targetDate <= endDate
    })

    return format === 'ics' ? exportAsICS(filtered) : exportAsJSON(filtered)
  }

  return { exportResult, exportAsICS, exportAsJSON, exportByDateRange }
}

// ============================================================
// 辅助函数
// ============================================================

/** 检查连续完成天数（按本地日历日） */
export function checkStreak(anchors: Anchor[]): number {
  const doneDates = new Set(
    anchors
      .filter(a => a.done && a.doneAt)
      .map(a => getLocalDateKey(new Date(a.doneAt!))),
  )

  let streak = 0
  const checkDate = new Date()

  while (doneDates.has(getLocalDateKey(checkDate))) {
    streak++
    checkDate.setDate(checkDate.getDate() - 1)
  }

  return streak
}

/** ICS 文本转义 */
function escapeICS(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}