// ============================================================
// 共鸣协议层 · 自动化引擎接口 (IAutomationEngine)
// 定义自动化流程、触发、执行的统一契约
// 不实现具体功能，只定规则
// ============================================================

import type { ResonanceResult, ResonanceEventListener } from './types'

/** 触发条件类型 */
export type TriggerType = 'manual' | 'timer' | 'event' | 'device' | 'condition'

/** 原子操作类型 */
export type ActionType = 'focus' | 'pause' | 'navigate' | 'note' | 'sound' | 'dim' | 'notify' | 'custom'

/** 自动化流程步骤 */
export interface FlowStep {
  /** 步骤类型 */
  type: 'trigger' | 'action' | 'condition'
  /** 步骤标识 */
  key: string
  /** 步骤标签 */
  label: string
  /** 图标 */
  icon?: string
  /** 操作参数（仅 action 类型） */
  params?: Record<string, unknown>
  /** 条件为真时的子步骤 */
  thenSteps?: FlowStep[]
  /** 条件为假时的子步骤 */
  elseSteps?: FlowStep[]
  /** 条件表达式（仅 condition 类型） */
  condition?: {
    type: 'time' | 'tag' | 'count' | 'variable'
    left: string
    operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte'
    right: string
  }
}

/** 自动化流程定义 */
export interface FlowDefinition {
  /** 流程唯一 ID */
  id: string
  /** 流程名称 */
  name: string
  /** 执行者标识 */
  actor: string
  /** 流程步骤 */
  steps: FlowStep[]
  /** 创建时间 */
  createdAt: string
  /** 定时触发表达式（仅 timer 类型） */
  cron?: string
  /** 事件名称（仅 event 类型） */
  eventName?: string
  /** 流程描述 */
  description?: string
  /** 是否启用 */
  enabled: boolean
}

/** 执行记录 */
export interface ExecutionRecord {
  /** 记录 ID */
  id: string
  /** 流程名称 */
  flowName: string
  /** 执行时间 */
  at: string
  /** 执行状态 */
  status: 'ok' | 'warn' | 'error'
  /** 错误信息 */
  message?: string
  /** 逐步骤详情 */
  details?: Array<{ step: string; status: string; message?: string }>
  /** 执行耗时（毫秒） */
  durationMs?: number
}

/** 自动化流程模板 */
export interface FlowTemplate {
  /** 模板 ID */
  id: string
  /** 模板名称 */
  name: string
  /** 模板描述 */
  description: string
  /** 图标 */
  icon: string
  /** 默认执行者 */
  actor: string
  /** 步骤 */
  steps: FlowStep[]
}

/**
 * 自动化引擎接口
 * 所有自动化引擎实现必须遵守此契约
 */
export interface IAutomationEngine {
  /** 引擎标识 */
  readonly engineId: string
  /** 引擎名称 */
  readonly engineName: string

  // ---- 生命周期 ----
  /** 初始化引擎 */
  initialize(): void
  /** 销毁引擎，释放所有定时器 */
  destroy(): void

  // ---- 流程管理 ----
  /** 注册一个流程 */
  registerFlow(flow: FlowDefinition): ResonanceResult<void>
  /** 注销一个流程 */
  unregisterFlow(flowId: string): ResonanceResult<void>
  /** 获取所有已注册流程 */
  getFlows(): FlowDefinition[]
  /** 获取单个流程 */
  getFlow(flowId: string): FlowDefinition | undefined
  /** 启用/禁用流程 */
  setFlowEnabled(flowId: string, enabled: boolean): ResonanceResult<void>

  // ---- 执行 ----
  /** 手动执行一个流程 */
  execute(flowId: string, trigger: TriggerType): Promise<ResonanceResult<ExecutionRecord>>
  /** 获取执行历史 */
  getHistory(limit?: number): ExecutionRecord[]
  /** 清空执行历史 */
  clearHistory(): void

  // ---- 定时器 ----
  /** 启动定时器流程 */
  startTimer(flowId: string, cronExpression: string): ResonanceResult<void>
  /** 停止定时器流程 */
  stopTimer(flowId: string): ResonanceResult<void>
  /** 是否正在运行定时器 */
  isTimerRunning(flowId: string): boolean

  // ---- 事件 ----
  /** 注册执行事件监听器 */
  onExecution(listener: ResonanceEventListener<ExecutionRecord>): void
  /** 移除执行事件监听器 */
  offExecution(listener: ResonanceEventListener<ExecutionRecord>): void
}

/**
 * 流程模板接口
 * 供外部提供预置流程模板
 */
export interface IFlowTemplateProvider {
  /** 提供者标识 */
  readonly providerId: string
  /** 获取模板列表 */
  getTemplates(): FlowTemplate[]
  /** 从模板创建流程 */
  createFromTemplate(templateId: string, overrides?: Partial<FlowDefinition>): FlowDefinition | undefined
}