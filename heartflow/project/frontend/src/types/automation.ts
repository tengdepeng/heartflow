// ============================================================
// 自动化流程 · 共享类型
// 供 engine/automation（执行引擎）与 modules/operation-mode/gate（门控）
// 共同引用，避免二者互相 import 形成循环依赖。
// ============================================================

/** 触发条件类型 */
export type TriggerType = 'manual' | 'timer' | 'event' | 'device'
/** 原子操作类型 */
export type ActionType = 'focus' | 'pause' | 'room' | 'note' | 'sound' | 'dim' | 'notify'

/** 条件比较运算符 */
export type ConditionOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte'

/** 条件节点 */
export interface FlowCondition {
  /** 条件类型: time(时间), tag(标签), count(计数), variable(变量) */
  type: 'time' | 'tag' | 'count' | 'variable'
  /** 左操作数 */
  left: string
  /** 比较运算符 */
  operator: ConditionOperator
  /** 右操作数 */
  right: string
}

/** 操作参数 */
export interface ActionParams {
  /** 目标房间名（room 操作） */
  room?: string
  /** 通知消息（notify 操作） */
  message?: string
  /** 环境音类型（sound 操作） */
  sound?: string
  /** 亮度级别（dim 操作）0-100 */
  dimLevel?: number
  /** 专注时长（focus 操作）毫秒 */
  duration?: number
  /** 快速笔记内容（note 操作） */
  noteText?: string
}

export interface FlowStep {
  type: 'trigger' | 'action' | 'condition'
  key: string
  icon: string
  label: string
  /** 操作参数（仅 action 类型） */
  params?: ActionParams
  /** 条件表达式（仅 condition 类型） */
  condition?: FlowCondition
  /** 条件为真时的子步骤 */
  thenSteps?: FlowStep[]
  /** 条件为假时的子步骤 */
  elseSteps?: FlowStep[]
}

export interface SavedFlow {
  id: string
  name: string
  actor: string
  steps: FlowStep[]
  createdAt: string
  /** 定时触发的cron表达式（仅timer类型） */
  cron?: string
  /** 事件名称（仅event类型） */
  eventName?: string
  /** 流程描述 */
  description?: string
}

export interface ExecutionRecord {
  id: string
  flowName: string
  at: string
  status: 'ok' | 'warn' | 'error'
  message?: string
  /** 逐步骤执行详情 */
  details?: { step: string; status: string; message?: string }[]
}

export interface FlowTemplate {
  id: string
  name: string
  description: string
  icon: string
  /** 默认演员 */
  actor: string
  steps: FlowStep[]
}
