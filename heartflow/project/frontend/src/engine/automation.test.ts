import { describe, it, expect } from 'vitest'
import { automationEngine, getFlowTemplates } from './automation'
import type { SavedFlow } from './automation'

describe('automation engine', () => {
  describe('getFlowTemplates', () => {
    it('返回 5 个模板', () => {
      const templates = getFlowTemplates()
      expect(templates.length).toBe(5)
    })

    it('每个模板有完整结构', () => {
      const templates = getFlowTemplates()
      for (const t of templates) {
        expect(t.id).toBeTruthy()
        expect(t.name).toBeTruthy()
        expect(t.description).toBeTruthy()
        expect(t.icon).toBeTruthy()
        expect(Array.isArray(t.steps)).toBe(true)
        expect(t.steps.length).toBeGreaterThan(0)
      }
    })

    it('模板步骤包含必要字段', () => {
      const templates = getFlowTemplates()
      for (const t of templates) {
        for (const s of t.steps) {
          expect(s.key).toBeTruthy()
          expect(s.type).toBeTruthy()
          expect(s.label).toBeTruthy()
        }
      }
    })
  })

  describe('automationEngine.execute', () => {
    it('执行空流程返回 ok', async () => {
      const flow: SavedFlow = {
        id: 'test-flow',
        name: '测试流程',
        actor: 'sprite',
        steps: [],
        createdAt: new Date().toISOString(),
      }
      const result = await automationEngine.execute(flow, 'manual')
      expect(result.status).toBe('ok')
      expect(result.flowName).toBe('测试流程')
    })

    it('执行简单步骤流程', async () => {
      const flow: SavedFlow = {
        id: 'simple-flow',
        name: '简单流程',
        actor: 'sprite',
        steps: [
          { type: 'trigger', key: 'manual', icon: '▶', label: '手动触发' },
        ],
        createdAt: new Date().toISOString(),
      }
      const result = await automationEngine.execute(flow, 'manual')
      expect(result.status).toBe('ok')
      expect(result.details).toBeDefined()
      expect(result.details!.length).toBeGreaterThan(0)
    })

    it('执行后记录历史', async () => {
      const flow: SavedFlow = {
        id: 'hist-flow',
        name: '历史流程',
        actor: 'sprite',
        steps: [],
        createdAt: new Date().toISOString(),
      }
      const before = automationEngine.getHistory().length
      await automationEngine.execute(flow, 'manual')
      expect(automationEngine.getHistory().length).toBe(before + 1)
    })
  })

  describe('定时器管理', () => {
    it('startTimerFlow 和 stopTimerFlow 正常工作', () => {
      const flow: SavedFlow = {
        id: 'timer-flow',
        name: '定时流程',
        actor: 'sprite',
        steps: [],
        createdAt: new Date().toISOString(),
      }
      // 启动定时器不应报错
      expect(() => automationEngine.startTimerFlow(flow, 60000)).not.toThrow()
      // 重复启动不应报错
      expect(() => automationEngine.startTimerFlow(flow, 60000)).not.toThrow()
      // 停止定时器
      expect(() => automationEngine.stopTimerFlow(flow.id)).not.toThrow()
    })
  })

  describe('destroy', () => {
    it('destroy 清理所有定时器', () => {
      const flow: SavedFlow = {
        id: 'timer-flow-2',
        name: '定时流程2',
        actor: 'sprite',
        steps: [],
        createdAt: new Date().toISOString(),
      }
      automationEngine.startTimerFlow(flow, 60000)
      expect(() => automationEngine.destroy()).not.toThrow()
    })
  })

  describe('getFlowTemplates', () => {
    it('返回预置流程模板列表', () => {
      const templates = getFlowTemplates()
      expect(templates.length).toBeGreaterThanOrEqual(5)
    })

    it('每个模板包含必要字段', () => {
      const templates = getFlowTemplates()
      for (const t of templates) {
        expect(t.id).toBeTruthy()
        expect(t.name).toBeTruthy()
        expect(t.actor).toBeTruthy()
        expect(t.steps.length).toBeGreaterThan(0)
      }
    })

    it('晨间启动模板包含 action 步骤', () => {
      const templates = getFlowTemplates()
      const morning = templates.find(t => t.id === 'morning-routine')
      expect(morning).toBeDefined()
      expect(morning!.steps.some(s => s.type === 'action')).toBe(true)
    })

    it('情绪检查模板包含 condition 步骤', () => {
      const templates = getFlowTemplates()
      const emotion = templates.find(t => t.id === 'emotion-check')
      expect(emotion).toBeDefined()
      expect(emotion!.steps.some(s => s.type === 'condition')).toBe(true)
    })
  })

  describe('条件分支流程', () => {
    it('condition then 分支执行', async () => {
      const flow: SavedFlow = {
        id: 'cond-flow',
        name: '条件流程',
        actor: 'sprite',
        steps: [
          {
            type: 'condition', key: 'test-cond', icon: '❓', label: '条件判断',
            condition: { type: 'count', left: '今日专注次数', operator: 'gte', right: '0' },
            thenSteps: [
              { type: 'action', key: 'notify', icon: '💬', label: '通知', params: { message: '条件满足' } },
            ],
            elseSteps: [
              { type: 'action', key: 'notify', icon: '💬', label: '否则通知', params: { message: '条件不满足' } },
            ],
          },
        ],
        createdAt: new Date().toISOString(),
      }
      const result = await automationEngine.execute(flow, 'manual')
      expect(result.status).toBe('ok')
    })
  })
})