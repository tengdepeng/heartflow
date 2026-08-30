// ============================================================
// 镜面对话系统 · 核心类型定义
// 蓝图要求：task parser + 11 intent categories + execution flow
// ============================================================

// ---- 11 意图分类 ----

/** 镜面对话 · 10 意图分类 */
export type IntentCategory =
  | 'focus'       // 专注 — 启动计时器、进入专注模式
  | 'note'        // 笔记 — 记录笔记、想法
  | 'emotion'     // 情绪 — 记录情绪波动
  | 'anchor'      // 锚点 — 设立/查看/完成锚点
  | 'plan'        // 计划 — 制定计划、安排日程
  | 'reflect'     // 反思 — 回顾、复盘、总结
  | 'learn'       // 学习 — 知识探索、技能练习
  | 'create'      // 创造 — 输出内容、创作
  | 'rest'        // 休息 — 放松、呼吸、暂停
  | 'explore'     // 探索 — 信息查询、统计分析、系统浏览
  | 'finance'     // 记账 — 打开劳酬空间（记账 v2：多账户/预算/流水/月结/导入）
  | 'unknown'     // 未识别 — 无法匹配任何意图

/** 意图元数据 */
export interface IntentMeta {
  /** 意图分类 */
  category: IntentCategory
  /** 中文标签 */
  label: string
  /** 图标 */
  icon: string
  /** 描述 */
  description: string
  /** 匹配关键词 */
  keywords: string[]
  /** 匹配正则模式 */
  patterns: RegExp[]
  /** 提取参数的正则 */
  paramExtractors: ParamExtractor[]
}

/** 参数提取器 */
export interface ParamExtractor {
  /** 参数名 */
  name: string
  /** 正则模式 */
  pattern: RegExp
  /** 值转换函数 */
  transform?: (match: string) => unknown
}

// ---- 解析结果 ----

/** 解析后的结构化任务 */
export interface ParsedTask {
  /** 任务唯一标识 */
  id: string
  /** 原始用户输入 */
  raw: string
  /** 识别到的意图 */
  intent: IntentCategory
  /** 置信度 (0-1) */
  confidence: number
  /** 提取的参数 */
  params: Record<string, unknown>
  /** 解析时间 */
  parsedAt: number
}

/** 多意图解析结果 */
export interface ParsedTaskResult {
  /** 所有候选任务，按置信度降序 */
  tasks: ParsedTask[]
  /** 最佳匹配 */
  best: ParsedTask | null
  /** 是否有歧义（多个候选置信度接近） */
  ambiguous: boolean
}

// ---- 执行流 ----

/** 执行操作类型 */
export type ExecutionAction =
  | 'start-focus'      // 启动专注
  | 'create-note'      // 创建笔记
  | 'log-emotion'       // 记录情绪
  | 'create-anchor'     // 创建锚点
  | 'complete-anchor'   // 完成锚点
  | 'list-anchors'      // 列出锚点
  | 'create-plan'       // 创建计划
  | 'list-notes'        // 列出笔记
  | 'show-stats'        // 显示统计
  | 'start-rest'        // 开始休息
  | 'navigate'          // 导航到房间
  | 'respond'           // 返回文字回应

/** 执行步骤 */
export interface ExecutionStep {
  /** 步骤序号 */
  order: number
  /** 执行操作 */
  action: ExecutionAction
  /** 操作参数 */
  params: Record<string, unknown>
  /** 步骤描述 */
  description: string
}

/** 执行计划 */
export interface ExecutionPlan {
  /** 任务 ID */
  taskId: string
  /** 执行步骤列表 */
  steps: ExecutionStep[]
  /** 回应文本（给用户的反馈） */
  response: string
  /** 是否成功 */
  success: boolean
  /** 错误信息 */
  error?: string
}

/** 执行结果 */
export interface ExecutionResult {
  /** 是否全部成功 */
  success: boolean
  /** 执行的步骤数 */
  stepsExecuted: number
  /** 总步骤数 */
  stepsTotal: number
  /** 用户级反馈 */
  message: string
  /** 各步骤结果 */
  stepResults: StepResult[]
}

/** 单步执行结果 */
export interface StepResult {
  /** 步骤序号 */
  order: number
  /** 执行操作 */
  action: ExecutionAction
  /** 是否成功 */
  success: boolean
  /** 输出数据 */
  data?: unknown
  /** 错误信息 */
  error?: string
}

// ---- 对话记录 ----

/** 对话条目 */
export interface DialogueEntry {
  id: string
  /** 方向：用户输入 / 镜我回应 */
  role: 'user' | 'mirror'
  /** 文本内容 */
  text: string
  /** 解析后的任务（仅用户输入） */
  parsedTask?: ParsedTask
  /** 执行结果（仅镜我回应） */
  executionResult?: ExecutionResult
  /** 时间戳 */
  timestamp: number
}