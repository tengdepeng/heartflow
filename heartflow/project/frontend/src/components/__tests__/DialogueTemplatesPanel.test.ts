// ============================================================
// DialogueTemplatesPanel 对话模板面板测试（INCR-101）
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref, computed } from 'vue'

const mockTemplates = ref<any[]>([
  {
    id: 'tpl_morning_checkin',
    type: 'morning_checkin',
    name: '晨间签到',
    description: '开启新的一天，设定今日意图',
    icon: '🌅',
    prompts: ['今天感觉怎么样？', '今天最重要的三件事是什么？'],
    expectedIntents: ['plan', 'focus', 'emotion'],
    usageCount: 3,
  },
  {
    id: 'tpl_decision_help',
    type: 'decision_help',
    name: '决策辅助',
    description: '通过对话梳理思路，辅助决策',
    icon: '⚖️',
    prompts: ['你面临什么选择？'],
    expectedIntents: ['reflect', 'explore'],
    usageCount: 1,
  },
])

const mockRecommended = ref<any[]>([
  {
    id: 'tpl_morning_checkin',
    type: 'morning_checkin',
    name: '晨间签到',
    description: '开启新的一天，设定今日意图',
    icon: '🌅',
    prompts: [],
    expectedIntents: ['plan'],
    usageCount: 3,
  },
])

const mockRecordUsage = vi.fn()
const mockGetRecommendedTemplates = vi.fn(() => mockRecommended.value)
const mockPopularTemplates = computed(() =>
  [...mockTemplates.value].sort((a, b) => b.usageCount - a.usageCount),
)

vi.mock('../../modules/mirror/dialogue-persistence', () => ({
  useDialogueTemplates: () => ({
    templates: mockTemplates,
    getRecommendedTemplates: mockGetRecommendedTemplates,
    recordUsage: mockRecordUsage,
    popularTemplates: mockPopularTemplates,
  }),
}))

import DialogueTemplatesPanel from '../DialogueTemplatesPanel.vue'

async function mountPanel() {
  const wrapper = mount(DialogueTemplatesPanel)
  await nextTick()
  return wrapper
}

describe('DialogueTemplatesPanel 对话模板', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTemplates.value = [
      {
        id: 'tpl_morning_checkin',
        type: 'morning_checkin',
        name: '晨间签到',
        description: '开启新的一天，设定今日意图',
        icon: '🌅',
        prompts: ['今天感觉怎么样？', '今天最重要的三件事是什么？'],
        expectedIntents: ['plan', 'focus', 'emotion'],
        usageCount: 3,
      },
      {
        id: 'tpl_decision_help',
        type: 'decision_help',
        name: '决策辅助',
        description: '通过对话梳理思路，辅助决策',
        icon: '⚖️',
        prompts: ['你面临什么选择？'],
        expectedIntents: ['reflect', 'explore'],
        usageCount: 1,
      },
    ]
    mockRecommended.value = [
      {
        id: 'tpl_morning_checkin',
        type: 'morning_checkin',
        name: '晨间签到',
        description: '开启新的一天，设定今日意图',
        icon: '🌅',
        prompts: [],
        expectedIntents: ['plan'],
        usageCount: 3,
      },
    ]
  })

  it('渲染标题与模板列表', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('.dtp').exists()).toBe(true)
    expect(wrapper.text()).toContain('对话模板')
    expect(wrapper.text()).toContain('模板 · 推荐 · 使用')
    expect(wrapper.findAll('.dtp-tpl').length).toBe(2)
    expect(wrapper.text()).toContain('晨间签到')
    expect(wrapper.text()).toContain('决策辅助')
    expect(wrapper.text()).toContain('使用 3 次')
  })

  it('渲染推荐模板区块', async () => {
    const wrapper = await mountPanel()
    expect(mockGetRecommendedTemplates).toHaveBeenCalled()
    expect(wrapper.text()).toContain('此刻推荐')
    expect(wrapper.findAll('.dtp-rec').length).toBe(1)
    expect(wrapper.text()).toContain('晨间签到')
  })

  it('渲染意图标签（INTENT_INFO 映射）', async () => {
    const wrapper = await mountPanel()
    const intents = wrapper.findAll('.dtp-intent')
    expect(intents.length).toBe(5)
    expect(wrapper.text()).toContain('计划')
    expect(wrapper.text()).toContain('专注')
    expect(wrapper.text()).toContain('情绪')
    expect(wrapper.text()).toContain('反思')
    expect(wrapper.text()).toContain('探索')
  })

  it('使用模板调用 recordUsage', async () => {
    const wrapper = await mountPanel()
    const firstBtn = wrapper.find('.dtp-tpl .dtp-btn')
    await firstBtn.trigger('click')
    expect(mockRecordUsage).toHaveBeenCalledWith('morning_checkin')
  })

  it('渲染热门模板（按使用次数排序）', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('热门模板')
    const pops = wrapper.findAll('.dtp-pop')
    expect(pops.length).toBe(2)
    // 晨间签到(3次) 排在 决策辅助(1次) 之前
    expect(pops[0].text()).toContain('晨间签到')
    expect(pops[1].text()).toContain('决策辅助')
  })

  it('无模板时显示空态', async () => {
    mockTemplates.value = []
    mockRecommended.value = []
    const wrapper = await mountPanel()
    expect(wrapper.find('.dtp-empty').exists()).toBe(true)
    expect(wrapper.text()).toContain('暂无模板')
  })
})
