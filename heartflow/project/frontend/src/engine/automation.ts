// ============================================================
// 自动化执行引擎
// 管理自动化流程的触发、执行、定时调度与历史记录
// 支持条件分支、参数化操作、流程模板
// ============================================================

import { storage } from '../engine/storage'
import { emitOsNotification } from './os-notification'
import { decideForProactive, emitOperationGate } from '../modules/operation-mode/gate'
import { getLocalDateKey } from '../utils/time'
import type { FocusSession } from '../types'

// 共享类型统一收口到 src/types/automation，避免与 modules/operation-mode/gate 互相 import 成环
import type {
  TriggerType,
  ActionType,
  ConditionOperator,
  FlowCondition,
  ActionParams,
  FlowStep,
  SavedFlow,
  ExecutionRecord,
  FlowTemplate,
} from '../types/automation'

export type {
  TriggerType,
  ActionType,
  ConditionOperator,
  FlowCondition,
  ActionParams,
  FlowStep,
  SavedFlow,
  ExecutionRecord,
} from '../types/automation'

// ---- 条件评估 ----

/** 评估一个条件节点（导出纯函数以便时区口径回归测试直接覆盖） */
export function evaluateCondition(condition: FlowCondition): boolean {
  const { type, left, operator, right } = condition
  switch (type) {
    case 'time': {
      // 比较当前时间（HH:MM 格式）
      const now = new Date()
      const current = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      return compare(current, operator, right)
    }
    case 'tag': {
      // 比较标签（用于检查今日专注标签）
      // completedAt/startedAt 为 UTC ISO 时间戳，今日边界与记录边界须同取本地日历日键
      const today = getLocalDateKey()
      const allSessions = storage.getSessions()
      const todaySessions = allSessions.filter((s: FocusSession) => {
        const raw = s.completedAt || s.startedAt
        return !!raw && getLocalDateKey(new Date(raw)) === today
      })
      const tags = new Set(todaySessions.flatMap((s: FocusSession) => s.tags || []))
      return tags.has(right)
    }
    case 'count': {
      // 比较今日专注次数（同上：本地日历日口径）
      const today = getLocalDateKey()
      const allSessions = storage.getSessions()
      const todayCount = allSessions.filter((s: FocusSession) => {
        const raw = s.completedAt || s.startedAt
        return !!raw && getLocalDateKey(new Date(raw)) === today && s.status === 'completed'
      }).length
      return compare(String(todayCount), operator, right)
    }
    case 'variable': {
      // 比较变量（从存储引擎中读取）
      try {
        const val = storage.getKV<string>(`hf:var:${left}`, '0')
        return compare(val, operator, right)
      } catch {
        return false
      }
    }
    default:
      return false
  }
}

function compare(left: string, operator: ConditionOperator, right: string): boolean {
  const l = parseFloat(left)
  const r = parseFloat(right)
  if (!isNaN(l) && !isNaN(r)) {
    switch (operator) {
      case 'eq': return l === r
      case 'neq': return l !== r
      case 'gt': return l > r
      case 'gte': return l >= r
      case 'lt': return l < r
      case 'lte': return l <= r
    }
  }
  // 字符串比较
  switch (operator) {
    case 'eq': return left === right
    case 'neq': return left !== right
    case 'gt': return left > right
    case 'gte': return left >= right
    case 'lt': return left < right
    case 'lte': return left <= right
  }
}

// ---- 执行引擎 ----

export class AutomationEngine {
  private timers = new Map<string, ReturnType<typeof setInterval>>()
  private history: ExecutionRecord[] = []

  constructor() {
    this.loadHistory()
  }

  private loadHistory() {
    try {
      this.history = storage.getKV('hf:automation_history', [])
    } catch { this.history = [] }
  }

  private persistHistory() {
    try {
      storage.setKV('hf:automation_history', this.history.slice(0, 100))
    } catch {}
  }

  /** 执行一个流程 */
  async execute(flow: SavedFlow, _trigger: TriggerType): Promise<ExecutionRecord> {
    const details: { step: string; status: string; message?: string }[] = []
    const record: ExecutionRecord = {
      id: `exec_${Date.now()}`,
      flowName: flow.name,
      at: new Date().toISOString(),
      status: 'ok',
      details,
    }

    // ---- 三级操作模式门控 ----
    // 非静默模式：不自动执行，转为待确认/建议事件，并记录为 warn（不报错，不执行）。
    const decision = decideForProactive()
    if (decision !== 'execute') {
      const message = decision === 'confirm'
        ? `操作模式=执行前确认，已暂停自动执行「${flow.name}」，待你确认`
        : `操作模式=仅建议，未自动执行「${flow.name}」`
      record.status = 'warn'
      record.message = message
      details.push({ step: '操作模式门控', status: 'skipped', message })
      emitOperationGate({
        kind: 'automation',
        decision,
        message,
        flow,
      })
      this.history.unshift(record)
      this.persistHistory()
      return record
    }

    try {
      for (const step of flow.steps) {
        await this.executeStep(step, details)
      }
    } catch (e: any) {
      record.status = 'error'
      record.message = e.message
      details.push({ step: '流程', status: 'error', message: e.message })
    }

    this.history.unshift(record)
    this.persistHistory()
    return record
  }

  /** 执行单个步骤（支持条件分支） */
  private async executeStep(step: FlowStep, details: { step: string; status: string; message?: string }[]): Promise<void> {
    if (step.type === 'condition' && step.condition) {
      const result = evaluateCondition(step.condition)
      details.push({
        step: step.label,
        status: result ? 'ok' : 'skipped',
        message: `${step.condition.left} ${step.condition.operator} ${step.condition.right} = ${result}`,
      })
      if (result && step.thenSteps) {
        for (const sub of step.thenSteps) {
          await this.executeStep(sub, details)
        }
      } else if (!result && step.elseSteps) {
        for (const sub of step.elseSteps) {
          await this.executeStep(sub, details)
        }
      }
    } else if (step.type === 'action') {
      try {
        await this.executeAction(step.key as ActionType, step.params)
        details.push({ step: step.label, status: 'ok' })
      } catch (e: any) {
        details.push({ step: step.label, status: 'error', message: e.message })
        throw e
      }
    } else {
      details.push({ step: step.label, status: 'ok' })
    }
  }

  /** 执行单个原子操作（支持参数化） */
  private async executeAction(action: ActionType, params?: ActionParams): Promise<void> {
    switch (action) {
      case 'focus':
        window.dispatchEvent(new CustomEvent('hf:automation', {
          detail: { action: 'startFocus', duration: params?.duration },
        }))
        break
      case 'pause':
        window.dispatchEvent(new CustomEvent('hf:automation', { detail: { action: 'pauseFocus' } }))
        break
      case 'room':
        window.dispatchEvent(new CustomEvent('hf:automation', {
          detail: { action: 'navigate', room: params?.room || 'study' },
        }))
        break
      case 'note':
        window.dispatchEvent(new CustomEvent('hf:automation', {
          detail: { action: 'quickNote', text: params?.noteText || '' },
        }))
        break
      case 'sound':
        window.dispatchEvent(new CustomEvent('hf:automation', {
          detail: { action: 'playSound', sound: params?.sound || 'rain' },
        }))
        break
      case 'dim':
        break
      case 'notify':
        // 宪法第5条端到端 fail-closed：统一入口内部已门控 isOsNotificationBlocked
        emitOsNotification({ title: '心流工坊', options: { body: params?.message || '你的自动化流程已触发' } })
        break
    }
  }

  /** 启动定时器流程 */
  startTimerFlow(flow: SavedFlow, intervalMs: number) {
    if (this.timers.has(flow.id)) return
    const timer = setInterval(() => {
      this.execute(flow, 'timer')
    }, intervalMs)
    this.timers.set(flow.id, timer)
  }

  /** 停止定时器流程 */
  stopTimerFlow(flowId: string) {
    const timer = this.timers.get(flowId)
    if (timer) { clearInterval(timer); this.timers.delete(flowId) }
  }

  /** 获取执行历史 */
  getHistory(): ExecutionRecord[] { return this.history }

  /** 清理所有定时器 */
  destroy() {
    for (const timer of this.timers.values()) clearInterval(timer)
    this.timers.clear()
  }
}

/** 全局单例 */
export const automationEngine = new AutomationEngine()

// ---- 流程模板 ----

export type { FlowTemplate } from '../types/automation'

/** 获取预置流程模板 */
export function getFlowTemplates(): FlowTemplate[] {
  return [
    {
      id: 'morning-routine',
      name: '晨间启动',
      description: '到点了，先进入思绪书房，再开始专注',
      icon: '🌅',
      actor: 'sprite',
      steps: [
        { type: 'trigger', key: 'timer', icon: '⏰', label: '定时触发' },
        { type: 'action', key: 'room', icon: '🚪', label: '进入思绪书房', params: { room: 'study' } },
        { type: 'action', key: 'focus', icon: '⏱️', label: '开始专注', params: { duration: 1500000 } },
        { type: 'action', key: 'sound', icon: '🔊', label: '播放雨声', params: { sound: 'rain' } },
      ],
    },
    {
      id: 'break-reminder',
      name: '定时休息提醒',
      description: '每小时提醒你暂停专注，起身活动',
      icon: '🧘',
      actor: 'bell',
      steps: [
        { type: 'trigger', key: 'timer', icon: '⏰', label: '定时触发' },
        { type: 'action', key: 'notify', icon: '💬', label: '弹窗提醒', params: { message: '该休息一下了，起来走走吧 🌿' } },
        { type: 'action', key: 'pause', icon: '⏸', label: '暂停专注' },
        { type: 'action', key: 'sound', icon: '🔊', label: '播放轻音乐', params: { sound: 'lofi' } },
      ],
    },
    {
      id: 'evening-wind-down',
      name: '晚间收尾',
      description: '结束一天的工作，进入安全岛放松',
      icon: '🌙',
      actor: 'shadow',
      steps: [
        { type: 'trigger', key: 'timer', icon: '⏰', label: '定时触发' },
        { type: 'condition', key: 'today-has-sessions', icon: '❓', label: '今日是否有专注？',
          condition: { type: 'count', left: '今日专注次数', operator: 'gt', right: '0' },
          thenSteps: [
            { type: 'action', key: 'note', icon: '📝', label: '快速记录今日总结', params: { noteText: '今日专注记录已自动生成' } },
          ],
          elseSteps: [
            { type: 'action', key: 'notify', icon: '💬', label: '温柔提醒', params: { message: '今天还没有专注记录，可以花几分钟回顾一下 📝' } },
          ],
        },
        { type: 'action', key: 'room', icon: '🚪', label: '进入安全岛', params: { room: 'sanctuary' } },
        { type: 'action', key: 'notify', icon: '💬', label: '晚安提醒', params: { message: '晚安，今天辛苦了 🌙' } },
      ],
    },
    {
      id: 'focus-boost',
      name: '专注冲刺',
      description: '进入书房、播放白噪音、开始25分钟专注',
      icon: '⚡',
      actor: 'gear',
      steps: [
        { type: 'trigger', key: 'manual', icon: '👆', label: '手动触发' },
        { type: 'action', key: 'room', icon: '🚪', label: '进入思绪书房', params: { room: 'study' } },
        { type: 'action', key: 'sound', icon: '🔊', label: '播放白噪音', params: { sound: 'white-noise' } },
        { type: 'action', key: 'focus', icon: '⏱️', label: '专注25分钟', params: { duration: 1500000 } },
        { type: 'action', key: 'dim', icon: '🔅', label: '调暗灯光' },
      ],
    },
    {
      id: 'emotion-check',
      name: '情绪检查',
      description: '今天专注够了？不够就提醒，够了就奖励',
      icon: '💖',
      actor: 'droplet',
      steps: [
        { type: 'trigger', key: 'event', icon: '📡', label: '定时触发' },
        { type: 'condition', key: 'enough-focus', icon: '❓', label: '今日专注是否达标？',
          condition: { type: 'count', left: '今日专注次数', operator: 'gte', right: '2' },
          thenSteps: [
            { type: 'action', key: 'notify', icon: '💬', label: '奖励通知', params: { message: '今天专注达标了！去休息一下吧 🎉' } },
            { type: 'action', key: 'sound', icon: '🔊', label: '播放轻松音乐', params: { sound: 'lofi' } },
          ],
          elseSteps: [
            { type: 'action', key: 'notify', icon: '💬', label: '鼓励提醒', params: { message: '今天还可以再专注一次 🌱' } },
          ],
        },
      ],
    },
  ]
}