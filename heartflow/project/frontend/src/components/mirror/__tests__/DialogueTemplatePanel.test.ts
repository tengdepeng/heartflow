import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../../engine/storage/core'

const TEMPLATES_KEY = 'hf:mirror_templates'
const FEEDBACK_KEY = 'hf:mirror_intent_feedback'
const LEARNING_KEY = 'hf:mirror_learning_model'

async function mountPanel(kv: Record<string, any> = {}) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore: kv,
    sessions: [],
    crystals: [],
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../DialogueTemplatePanel.vue')
  const wrapper = mount(mod.default)
  return wrapper
}

function makeTemplate(overrides: Record<string, any> = {}) {
  return {
    id: 'tpl_test',
    type: 'morning_checkin',
    name: '测试模板',
    description: '一段描述',
    icon: '🌅',
    prompts: ['问题一', '问题二'],
    expectedIntents: ['plan', 'focus'],
    usageCount: 0,
    ...overrides,
  }
}

describe('DialogueTemplatePanel 对话模板', () => {
  it('默认展示全部内置模板', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('晨间签到')
    expect(wrapper.text()).toContain('晚间反思')
    expect(wrapper.text()).toContain('周回顾')
    expect(wrapper.text()).toContain('全部模板')
  })

  it('无反馈时不展示意图学习统计', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('.dtp-learn').exists()).toBe(false)
  })

  it('有反馈时展示意图学习统计', async () => {
    const wrapper = await mountPanel({
      [FEEDBACK_KEY]: [{ input: '你好', parsedIntent: 'plan', confirmed: true, feedbackAt: '2026-01-01' }],
      [LEARNING_KEY]: {
        keywordWeights: { plan: { 你好: 1 } },
        totalFeedback: 1,
        correctionRate: 0,
        lastTrainedAt: '2026-01-01',
      },
    })
    expect(wrapper.text()).toContain('已学习 1 条反馈')
    expect(wrapper.text()).toContain('覆盖 1 类意图')
  })

  it('点击模板卡片展开详情', async () => {
    const wrapper = await mountPanel({
      [TEMPLATES_KEY]: [makeTemplate()],
    })
    await wrapper.find('.dtp-card').trigger('click')
    expect(wrapper.find('.dtp-detail').exists()).toBe(true)
    expect(wrapper.text()).toContain('问题一')
    expect(wrapper.text()).toContain('问题二')
  })

  it('使用模板记录使用次数', async () => {
    const wrapper = await mountPanel({
      [TEMPLATES_KEY]: [makeTemplate()],
    })
    await wrapper.find('.dtp-card').trigger('click')
    await wrapper.find('.dtp-use').trigger('click')
    expect(wrapper.find('.dtp-detail').exists()).toBe(false)
    const raw = (globalThis as any).localStorage.getItem('heartflow:storage')
    const data = JSON.parse(raw)
    expect(data.kvStore[TEMPLATES_KEY][0].usageCount).toBe(1)
  })
})
