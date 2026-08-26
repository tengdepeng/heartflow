// ============================================================
// 镜面对话系统 · 执行流测试
// 覆盖：executePlan / executeMirrorInput / planMirrorInput
// ============================================================

import { describe, expect, it } from 'vitest'
import {
  executePlan,
  planMirrorInput,
  executeMirrorInput,
} from '../executor'
import type {
  ActionHandlerRegistry,
} from '../executor'
import type {
  ExecutionPlan,
  StepResult,
} from '../types'

// ---- 测试辅助函数 ----

function makeFullHandlers(success: boolean = true): ActionHandlerRegistry {
  const handler = (params: Record<string, unknown>): StepResult => {
    const action = (params._action as string) || 'respond'
    return { order: 0, action: action as any, success, data: params }
  }
  return {
    'start-focus': handler,
    'create-note': handler,
    'log-emotion': handler,
    'create-anchor': handler,
    'complete-anchor': handler,
    'list-anchors': handler,
    'create-plan': handler,
    'list-notes': handler,
    'show-stats': handler,
    'start-rest': handler,
    'navigate': handler,
    'respond': handler,
  }
}

describe('镜我执行流 (executor)', () => {

  // ---- executePlan ----

  describe('executePlan', () => {
    it('执行单步计划成功', async () => {
      const plan: ExecutionPlan = {
        taskId: 'test-1',
        steps: [
          { order: 1, action: 'respond', params: { message: 'hello' }, description: '测试' },
        ],
        response: 'hello',
        success: true,
      }

      const handlers: ActionHandlerRegistry = {
        'respond': (_params) => ({ order: 1, action: 'respond', success: true, data: { message: 'hello' } }),
      } as ActionHandlerRegistry

      const result = await executePlan(plan, handlers)
      expect(result.success).toBe(true)
      expect(result.stepsExecuted).toBe(1)
      expect(result.stepsTotal).toBe(1)
    })

    it('执行多步计划全部成功', async () => {
      const plan: ExecutionPlan = {
        taskId: 'test-2',
        steps: [
          { order: 1, action: 'create-note', params: { title: 'A' }, description: 'step 1' },
          { order: 2, action: 'create-note', params: { title: 'B' }, description: 'step 2' },
          { order: 3, action: 'respond', params: { message: 'done' }, description: 'step 3' },
        ],
        response: 'done',
        success: true,
      }

      const handlers = makeFullHandlers(true)
      const result = await executePlan(plan, handlers)
      expect(result.success).toBe(true)
      expect(result.stepsExecuted).toBe(3)
      expect(result.stepsTotal).toBe(3)
      expect(result.stepResults).toHaveLength(3)
    })

    it('步骤失败时整体 success 为 false', async () => {
      const plan: ExecutionPlan = {
        taskId: 'test-3',
        steps: [
          { order: 1, action: 'create-note', params: {}, description: 'step 1' },
          { order: 2, action: 'respond', params: {}, description: 'step 2' },
        ],
        response: 'partial',
        success: true,
      }

      let callCount = 0
      const handlers: ActionHandlerRegistry = {
        'create-note': (_params) => {
          callCount++
          return { order: 1, action: 'create-note', success: false, error: '模拟失败' }
        },
        'respond': (_params) => {
          callCount++
          return { order: 2, action: 'respond', success: true }
        },
      } as ActionHandlerRegistry

      const result = await executePlan(plan, handlers)
      expect(result.success).toBe(false)
      expect(result.stepsExecuted).toBe(1) // 只有 respond 成功
      expect(result.stepsTotal).toBe(2)
    })

    it('缺少处理器时标记失败', async () => {
      const plan: ExecutionPlan = {
        taskId: 'test-4',
        steps: [
          { order: 1, action: 'start-focus', params: {}, description: 'no handler' },
        ],
        response: 'fail',
        success: true,
      }

      const handlers = {} as ActionHandlerRegistry
      const result = await executePlan(plan, handlers)
      expect(result.success).toBe(false)
      expect(result.stepsExecuted).toBe(0)
      expect(result.stepResults[0].error).toContain('未找到处理器')
    })

    it('处理器抛出异常时捕获并标记失败', async () => {
      const plan: ExecutionPlan = {
        taskId: 'test-5',
        steps: [
          { order: 1, action: 'create-note', params: {}, description: 'throws' },
        ],
        response: 'error',
        success: true,
      }

      const handlers = {
        'create-note': (_params: Record<string, unknown>): StepResult => {
          throw new Error('测试异常')
        },
      } as unknown as ActionHandlerRegistry

      const result = await executePlan(plan, handlers)
      expect(result.success).toBe(false)
      expect(result.stepResults[0].error).toBe('测试异常')
    })

    it('空步骤计划返回成功', async () => {
      const plan: ExecutionPlan = {
        taskId: 'test-empty',
        steps: [],
        response: 'empty',
        success: true,
      }

      const result = await executePlan(plan, {} as ActionHandlerRegistry)
      expect(result.success).toBe(true)
      expect(result.stepsExecuted).toBe(0)
      expect(result.stepsTotal).toBe(0)
    })
  })

  // ---- planMirrorInput ----

  describe('planMirrorInput', () => {
    it('"开始专注"生成包含 start-focus 的计划', () => {
      const { plan, parsedTask } = planMirrorInput('开始专注')
      expect(plan).not.toBeNull()
      expect(parsedTask).not.toBeNull()
      expect(parsedTask!.intent).toBe('focus')
      expect(plan!.steps[0].action).toBe('start-focus')
    })

    it('"记录笔记"生成包含 create-note 的计划', () => {
      const { plan, parsedTask } = planMirrorInput('记录笔记')
      expect(plan).not.toBeNull()
      expect(parsedTask!.intent).toBe('note')
      expect(plan!.steps[0].action).toBe('create-note')
    })

    it('"记录情绪"生成包含 log-emotion 的计划', () => {
      const { plan, parsedTask } = planMirrorInput('记录情绪')
      expect(plan).not.toBeNull()
      expect(parsedTask!.intent).toBe('emotion')
      expect(plan!.steps[0].action).toBe('log-emotion')
    })

    it('"设立锚点"生成包含 create-anchor 的计划', () => {
      const { plan, parsedTask } = planMirrorInput('设立锚点：读完三本书')
      expect(plan).not.toBeNull()
      expect(parsedTask!.intent).toBe('anchor')
      expect(plan!.steps[0].action).toBe('create-anchor')
    })

    it('"休息一下"生成包含 start-rest 的计划', () => {
      const { plan, parsedTask } = planMirrorInput('休息一下')
      expect(plan).not.toBeNull()
      expect(parsedTask!.intent).toBe('rest')
      expect(plan!.steps[0].action).toBe('start-rest')
    })

    it('"反思"生成包含 show-stats 的计划', () => {
      const { plan, parsedTask } = planMirrorInput('反思一下')
      expect(plan).not.toBeNull()
      expect(parsedTask!.intent).toBe('reflect')
      expect(plan!.steps[0].action).toBe('show-stats')
    })

    it('"学习"生成包含 respond 的计划', () => {
      const { plan, parsedTask } = planMirrorInput('学习 TypeScript')
      expect(plan).not.toBeNull()
      expect(parsedTask!.intent).toBe('learn')
      expect(plan!.steps[0].action).toBe('respond')
    })

    it('"制定计划"生成包含 create-plan 的计划', () => {
      const { plan, parsedTask } = planMirrorInput('制定计划')
      expect(plan).not.toBeNull()
      expect(parsedTask!.intent).toBe('plan')
      expect(plan!.steps[0].action).toBe('create-plan')
    })

    it('"去锚点"生成包含 navigate 的计划', () => {
      const { plan, parsedTask } = planMirrorInput('去锚点')
      expect(plan).not.toBeNull()
      expect(parsedTask!.intent).toBe('explore')
      expect(plan!.steps[0].action).toBe('navigate')
    })

    it('"统计"生成包含 show-stats 的计划', () => {
      const { plan, parsedTask } = planMirrorInput('统计一下')
      expect(plan).not.toBeNull()
      expect(parsedTask!.intent).toBe('explore')
      expect(plan!.steps[0].action).toBe('show-stats')
    })

    it('无匹配输入返回 null 计划', () => {
      const { plan, parsedTask, response } = planMirrorInput('xyz123')
      expect(plan).toBeNull()
      expect(parsedTask).toBeNull()
      expect(response).toContain('不太确定')
    })

    it('"创造"生成包含 create-note 的计划', () => {
      const { plan, parsedTask } = planMirrorInput('写一篇文章')
      expect(plan).not.toBeNull()
      expect(parsedTask!.intent).toBe('create')
      expect(plan!.steps[0].action).toBe('create-note')
    })

    it('计划包含正确的 taskId', () => {
      const { plan } = planMirrorInput('开始专注')
      expect(plan!.taskId).toBeTruthy()
      expect(plan!.taskId).toMatch(/^mirror_/)
    })

    it('计划包含 response 文本', () => {
      const { plan, response } = planMirrorInput('开始专注')
      expect(plan!.response).toBeTruthy()
      expect(response).toBe(plan!.response)
    })
  })

  // ---- executeMirrorInput ----

  describe('executeMirrorInput', () => {
    it('完整流程：解析 → 计划 → 执行', async () => {
      const handlers = makeFullHandlers(true)
      const { result, response, parsedTask } = await executeMirrorInput('开始专注', handlers)

      expect(parsedTask).not.toBeNull()
      expect(parsedTask!.intent).toBe('focus')
      expect(result.success).toBe(true)
      expect(result.stepsTotal).toBeGreaterThan(0)
      expect(response).toBeTruthy()
    })

    it('无匹配输入返回通用回应', async () => {
      const handlers = makeFullHandlers(true)
      const { result, response, parsedTask } = await executeMirrorInput('xyz', handlers)

      expect(parsedTask).toBeNull()
      expect(result.stepsTotal).toBe(0)
      expect(response).toContain('不太确定')
    })

    it('情感记录完整流程', async () => {
      const handlers = makeFullHandlers(true)
      const { result, parsedTask } = await executeMirrorInput('我很开心', handlers)

      expect(parsedTask).not.toBeNull()
      expect(parsedTask!.intent).toBe('emotion')
      expect(result.success).toBe(true)
    })

    it('休息指令完整流程', async () => {
      const handlers = makeFullHandlers(true)
      const { result, parsedTask } = await executeMirrorInput('休息一下', handlers)

      expect(parsedTask).not.toBeNull()
      expect(parsedTask!.intent).toBe('rest')
      expect(result.success).toBe(true)
    })

    it('锚点创建完整流程', async () => {
      const handlers = makeFullHandlers(true)
      const { result, parsedTask } = await executeMirrorInput('设立锚点', handlers)

      expect(parsedTask).not.toBeNull()
      expect(parsedTask!.intent).toBe('anchor')
      expect(result.success).toBe(true)
    })
  })
})