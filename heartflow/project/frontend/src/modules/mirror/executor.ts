// ============================================================
// 镜面对话系统 · 执行流
// 将解析后的任务转换为执行计划，并逐步执行
// 蓝图要求：完整的 execution flow
// ============================================================

import { parseTask } from './parser'
import type {
  ParsedTask,
  ExecutionAction,
  ExecutionStep,
  ExecutionPlan,
  ExecutionResult,
  StepResult,
  IntentCategory,
} from './types'

// ---- 执行处理器类型 ----

/** 执行处理器：接收参数，返回执行结果 */
export type ActionHandler = (params: Record<string, unknown>) => StepResult | Promise<StepResult>

/** 执行处理器注册表 */
export type ActionHandlerRegistry = Record<ExecutionAction, ActionHandler>

// ---- 意图到执行操作的映射 ----

/** 意图 → 执行步骤生成器 */
function intentToPlan(task: ParsedTask): ExecutionPlan {
  const steps: ExecutionStep[] = []
  let response = ''

  switch (task.intent) {
    case 'focus': {
      const duration = (task.params.duration as number) || 25
      const taskName = (task.params.taskName as string) || ''
      steps.push({
        order: 1,
        action: 'start-focus',
        params: { duration, taskName },
        description: taskName
          ? `启动专注「${taskName}」，${duration} 分钟`
          : `启动 ${duration} 分钟专注计时`,
      })
      response = taskName
        ? `已为你启动「${taskName}」专注计时，${duration} 分钟。`
        : `已启动 ${duration} 分钟专注计时。`
      break
    }

    case 'note': {
      const content = (task.params.content as string) || task.raw
      const title = (task.params.title as string) || ''
      steps.push({
        order: 1,
        action: 'create-note',
        params: { title: title || content.slice(0, 30), content },
        description: `创建笔记"${title || content.slice(0, 20)}"`,
      })
      response = title
        ? `已记录笔记「${title}」。`
        : `已记下你的想法。`
      break
    }

    case 'emotion': {
      const type = (task.params.type as string) || 'calm'
      const note = (task.params.note as string) || ''
      steps.push({
        order: 1,
        action: 'log-emotion',
        params: { type, note },
        description: `记录情绪：${type}`,
      })
      const typeLabels: Record<string, string> = {
        happy: '开心', sad: '难过', anxious: '焦虑',
        angry: '愤怒', calm: '平静',
      }
      const label = typeLabels[type] || type
      response = note
        ? `已记录情绪「${label}」：${note}`
        : `已记录情绪「${label}」。`
      break
    }

    case 'anchor': {
      const title = (task.params.title as string) || ''
      const targetDate = (task.params.targetDate as string) || ''
      if (title) {
        steps.push({
          order: 1,
          action: 'create-anchor',
          params: { title, targetDate },
          description: `创建锚点"${title}"`,
        })
        response = targetDate
          ? `已设立锚点「${title}」，截止 ${targetDate}。`
          : `已设立锚点「${title}」。`
      } else {
        steps.push({
          order: 1,
          action: 'list-anchors',
          params: {},
          description: '列出当前锚点',
        })
        response = '已为你列出当前锚点。'
      }
      break
    }

    case 'plan': {
      const content = (task.params.content as string) || task.raw
      steps.push({
        order: 1,
        action: 'create-plan',
        params: { content },
        description: `创建计划"${content.slice(0, 30)}"`,
      })
      response = `已记录你的计划。`
      break
    }

    case 'reflect': {
      steps.push({
        order: 1,
        action: 'show-stats',
        params: { timeRange: task.params.timeRange || 'today' },
        description: '显示统计数据',
      })
      response = '以下是最近的记录：'
      break
    }

    case 'learn': {
      const topic = (task.params.topic as string) || task.raw
      steps.push({
        order: 1,
        action: 'respond',
        params: {
          message: `关于「${topic}」，建议你创建一个学习锚点，记录学习进度。`,
        },
        description: '回应学习意图',
      })
      response = `关于「${topic}」，建议你创建一个学习锚点，记录学习进度。`
      break
    }

    case 'create': {
      const content = (task.params.content as string) || task.raw
      steps.push({
        order: 1,
        action: 'create-note',
        params: { title: '创作笔记', content },
        description: `创建创作笔记"${content.slice(0, 20)}"`,
      })
      response = `已记录你的创作想法。`
      break
    }

    case 'rest': {
      const duration = (task.params.duration as number) || 5
      steps.push({
        order: 1,
        action: 'start-rest',
        params: { duration },
        description: `休息 ${duration} 分钟`,
      })
      response = `休息 ${duration} 分钟吧，放松一下。`
      break
    }

    case 'explore': {
      const roomTarget = task.params.roomTarget as string
      const query = task.params.query as string
      if (roomTarget) {
        steps.push({
          order: 1,
          action: 'navigate',
          params: { target: roomTarget },
          description: `导航到"${roomTarget}"`,
        })
        response = `正在前往「${roomTarget}」。`
      } else if (query) {
        steps.push({
          order: 1,
          action: 'show-stats',
          params: { query },
          description: `查询统计"${query}"`,
        })
        response = `正在查询数据...`
      } else {
        steps.push({
          order: 1,
          action: 'show-stats',
          params: {},
          description: '显示数据概览',
        })
        response = '这是你的数据概览：'
      }
      break
    }

    default: {
      // unknown — 回退为通用回应
      steps.push({
        order: 1,
        action: 'respond',
        params: { message: '收到你的消息。你可以说「开始专注」、「记录笔记」、「记录情绪」等来使用镜我系统。' },
        description: '通用回应',
      })
      response = '收到你的消息。你可以说「开始专注」、「记录笔记」、「记录情绪」等来使用镜我系统。'
      break
    }
  }

  return {
    taskId: task.id,
    steps,
    response,
    success: true,
  }
}

// ---- 执行引擎 ----

/**
 * 执行计划
 * @param plan 执行计划
 * @param handlers 执行处理器注册表
 * @returns 执行结果
 */
export async function executePlan(
  plan: ExecutionPlan,
  handlers: ActionHandlerRegistry,
): Promise<ExecutionResult> {
  const stepResults: StepResult[] = []
  let success = true

  for (const step of plan.steps) {
    const handler = handlers[step.action]
    if (!handler) {
      stepResults.push({
        order: step.order,
        action: step.action,
        success: false,
        error: `未找到处理器: ${step.action}`,
      })
      success = false
      continue
    }

    try {
      const result = await handler(step.params)
      stepResults.push({
        order: step.order,
        action: step.action,
        success: result.success,
        data: result.data,
        error: result.error,
      })
      if (!result.success) {
        success = false
      }
    } catch (err) {
      stepResults.push({
        order: step.order,
        action: step.action,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      })
      success = false
    }
  }

  return {
    success,
    stepsExecuted: stepResults.filter(s => s.success).length,
    stepsTotal: plan.steps.length,
    message: plan.response,
    stepResults,
  }
}

/**
 * 完整的镜我对话执行流：
 * 1. 解析用户输入 → ParsedTask
 * 2. 生成执行计划 → ExecutionPlan
 * 3. 执行计划 → ExecutionResult
 *
 * @param text 用户输入文本
 * @param handlers 执行处理器注册表
 * @returns 执行结果 + 回应文本
 */
export async function executeMirrorInput(
  text: string,
  handlers: ActionHandlerRegistry,
): Promise<{ result: ExecutionResult; response: string; parsedTask: ParsedTask | null }> {
  const parseResult = parseTask(text)
  const parsedTask = parseResult.best

  if (!parsedTask) {
    return {
      result: {
        success: true,
        stepsExecuted: 0,
        stepsTotal: 0,
        message: '收到你的消息，但我不太确定你想做什么。试试说「开始专注」或「记录笔记」？',
        stepResults: [],
      },
      response: '收到你的消息，但我不太确定你想做什么。试试说「开始专注」或「记录笔记」？',
      parsedTask: null,
    }
  }

  // 如果歧义，选择最高置信度
  const plan = intentToPlan(parsedTask)
  const result = await executePlan(plan, handlers)

  return {
    result,
    response: plan.response,
    parsedTask,
  }
}

/**
 * 同步版本：生成执行计划但不执行（由调用方自行执行）
 * @param text 用户输入文本
 * @returns 执行计划 + 解析后的任务
 */
export function planMirrorInput(text: string, forcedIntent?: IntentCategory): {
  plan: ExecutionPlan | null
  response: string
  parsedTask: ParsedTask | null
} {
  const parseResult = parseTask(text)
  let parsedTask = parseResult.best

  // 歧义消解：强制使用用户在歧义候选中选定的意图
  if (forcedIntent) {
    const forced = parseResult.tasks.find(t => t.intent === forcedIntent)
    if (forced) parsedTask = forced
  }

  if (!parsedTask) {
    return {
      plan: null,
      response: '收到你的消息，但我不太确定你想做什么。试试说「开始专注」或「记录笔记」？',
      parsedTask: null,
    }
  }

  const plan = intentToPlan(parsedTask)
  return { plan, response: plan.response, parsedTask }
}