// ============================================================
// MirrorDialogue 组件测试
// 覆盖：渲染、消息列表、意图反馈、空状态、输入交互、歧义消解
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import type { DialogueEntry, ParsedTask } from '../../modules/mirror/types'

// ---- 模拟数据 ----

const dialogueRef = ref<DialogueEntry[]>([])
const isProcessingRef = ref(false)
const isAmbiguousRef = ref(false)
const candidatesRef = ref<ParsedTask[]>([])
const mockSend = vi.fn()
const mockRegenerate = vi.fn()

// ---- 模拟 useMirrorDialogue ----
vi.mock('../../modules/mirror/useMirrorDialogue', () => ({
  useMirrorDialogue: () => ({
    dialogue: dialogueRef,
    isProcessing: isProcessingRef,
    isAmbiguous: isAmbiguousRef,
    candidates: candidatesRef,
    send: mockSend,
    regenerate: mockRegenerate,
  }),
}))

// ---- 模拟 INTENT_INFO ----
vi.mock('../../modules/mirror/intents', () => ({
  INTENT_INFO: {
    focus:    { category: 'focus',    label: '专注', icon: '🎯', description: '启动计时器' },
    note:     { category: 'note',     label: '笔记', icon: '📝', description: '记录笔记' },
    emotion:  { category: 'emotion',  label: '情绪', icon: '🌸', description: '记录情绪' },
    anchor:   { category: 'anchor',   label: '锚点', icon: '⚓', description: '设立锚点' },
    plan:     { category: 'plan',     label: '计划', icon: '📋', description: '制定计划' },
    reflect:  { category: 'reflect',  label: '反思', icon: '🪞', description: '回顾' },
    learn:    { category: 'learn',    label: '学习', icon: '📚', description: '学习' },
    create:   { category: 'create',   label: '创造', icon: '🎨', description: '创作' },
    rest:     { category: 'rest',     label: '休息', icon: '☕', description: '休息' },
    explore:  { category: 'explore',  label: '探索', icon: '🔍', description: '探索' },
    unknown:  { category: 'unknown',  label: '未知', icon: '❓', description: '未知' },
  },
}))

// ---- 辅助函数 ----

function makeUserEntry(overrides: Partial<DialogueEntry> = {}): DialogueEntry {
  return {
    id: 'dlg_1',
    role: 'user',
    text: '开始专注 25 分钟',
    timestamp: Date.now(),
    ...overrides,
  }
}

function makeMirrorEntry(overrides: Partial<DialogueEntry> = {}): DialogueEntry {
  return {
    id: 'dlg_2',
    role: 'mirror',
    text: '已启动 25 分钟专注计时。',
    timestamp: Date.now(),
    executionResult: {
      success: true,
      stepsExecuted: 1,
      stepsTotal: 1,
      message: '已启动 25 分钟专注计时。',
      stepResults: [{ order: 1, action: 'start-focus', success: true }],
    },
    ...overrides,
  }
}

async function getWrapper(visible = true) {
  const { default: MirrorDialogue } = await import('../MirrorDialogue.vue')
  return mount(MirrorDialogue, {
    props: { visible },
  })
}

describe('MirrorDialogue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    dialogueRef.value = []
    isProcessingRef.value = false
    isAmbiguousRef.value = false
    candidatesRef.value = []
    mockSend.mockResolvedValue({
      response: '已启动 25 分钟专注计时。',
      result: { success: true, stepsExecuted: 1, stepsTotal: 1, message: '已启动 25 分钟专注计时。', stepResults: [] },
      parsedTask: { id: 't1', raw: '开始专注 25 分钟', intent: 'focus', confidence: 0.8, params: {}, parsedAt: Date.now() },
      ambiguous: false,
    })
  })

  // ---- 渲染 ----

  it('visible=true 时渲染面板', async () => {
    const wrapper = await getWrapper(true)
    expect(wrapper.find('.mirror-dialogue-panel').exists()).toBe(true)
  })

  it('visible=false 时不渲染面板', async () => {
    const wrapper = await getWrapper(false)
    expect(wrapper.find('.mirror-dialogue-panel').exists()).toBe(false)
  })

  it('渲染顶部标题"镜我"', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.md-header-title').text()).toBe('镜我')
  })

  it('渲染关闭按钮', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.md-close-btn').exists()).toBe(true)
  })

  // ---- 空状态 ----

  it('无对话时显示空状态', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.md-empty').exists()).toBe(true)
    expect(wrapper.find('.md-empty-title').text()).toBe('与镜我对话')
  })

  it('空状态显示 6 个意图场景卡片', async () => {
    const wrapper = await getWrapper()
    const cards = wrapper.findAll('.md-scene-card')
    expect(cards).toHaveLength(6)
  })

  it('场景卡片包含"开始专注"', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('开始专注')
  })

  it('场景卡片包含"记录想法"', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('记录想法')
  })

  // ---- 点击场景卡片 ----

  it('点击场景卡片触发 send', async () => {
    const wrapper = await getWrapper()
    const firstCard = wrapper.find('.md-scene-card')
    await firstCard.trigger('click')
    expect(mockSend).toHaveBeenCalledTimes(1)
    expect(mockSend).toHaveBeenCalledWith('开始专注 25 分钟', expect.objectContaining({}))
  })

  // ---- 输入区域 ----

  it('渲染输入框', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.md-input').exists()).toBe(true)
  })

  it('渲染发送按钮', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.md-send-btn').exists()).toBe(true)
  })

  it('输入框为空时发送按钮禁用', async () => {
    const wrapper = await getWrapper()
    const btn = wrapper.find('.md-send-btn')
    expect(btn.attributes('disabled')).toBeDefined()
  })

  it('输入文本后发送按钮可用', async () => {
    const wrapper = await getWrapper()
    const input = wrapper.find('.md-input')
    await input.setValue('测试消息')
    const btn = wrapper.find('.md-send-btn')
    expect(btn.attributes('disabled')).toBeUndefined()
  })

  it('按 Enter 发送消息', async () => {
    const wrapper = await getWrapper()
    const input = wrapper.find('.md-input')
    await input.setValue('测试消息')
    await input.trigger('keydown.enter')
    expect(mockSend).toHaveBeenCalledWith('测试消息', expect.objectContaining({}))
  })

  it('点击发送按钮发送消息', async () => {
    const wrapper = await getWrapper()
    const input = wrapper.find('.md-input')
    await input.setValue('测试消息')
    await wrapper.find('.md-send-btn').trigger('click')
    expect(mockSend).toHaveBeenCalledWith('测试消息', expect.objectContaining({}))
  })

  it('发送后清空输入框', async () => {
    const wrapper = await getWrapper()
    const input = wrapper.find('.md-input')
    await input.setValue('测试消息')
    await input.trigger('keydown.enter')
    expect((input.element as HTMLInputElement).value).toBe('')
  })

  // ---- 处理中状态 ----

  it('处理中时输入框禁用', async () => {
    isProcessingRef.value = true
    const wrapper = await getWrapper()
    const input = wrapper.find('.md-input')
    expect(input.attributes('disabled')).toBeDefined()
  })

  it('处理中时显示动画点', async () => {
    isProcessingRef.value = true
    const wrapper = await getWrapper()
    expect(wrapper.find('.md-typing').exists()).toBe(true)
  })

  it('处理中时显示脉动点', async () => {
    isProcessingRef.value = true
    const wrapper = await getWrapper()
    expect(wrapper.find('.md-processing-dot').exists()).toBe(true)
  })

  // ---- 关闭按钮 ----

  it('点击关闭按钮触发 close 事件', async () => {
    const wrapper = await getWrapper()
    await wrapper.find('.md-close-btn').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  // ---- 对话消息 ----

  it('渲染用户消息气泡', async () => {
    dialogueRef.value = [makeUserEntry()]
    const wrapper = await getWrapper()
    expect(wrapper.find('.md-message--user').exists()).toBe(true)
    expect(wrapper.find('.md-message--user .md-bubble-text').text()).toBe('开始专注 25 分钟')
  })

  it('渲染镜我回应气泡', async () => {
    dialogueRef.value = [makeMirrorEntry()]
    const wrapper = await getWrapper()
    expect(wrapper.find('.md-message--mirror').exists()).toBe(true)
    expect(wrapper.find('.md-message--mirror .md-bubble-text').text()).toBe('已启动 25 分钟专注计时。')
  })

  it('用户消息带有意图标签', async () => {
    dialogueRef.value = [
      makeUserEntry({
        parsedTask: {
          id: 't1',
          raw: '开始专注 25 分钟',
          intent: 'focus',
          confidence: 0.85,
          params: {},
          parsedAt: Date.now(),
        },
      }),
    ]
    const wrapper = await getWrapper()
    expect(wrapper.find('.md-intent-tag').exists()).toBe(true)
    expect(wrapper.find('.md-intent-label').text()).toBe('专注')
    expect(wrapper.find('.md-intent-confidence').text()).toBe('85%')
  })

  it('用户消息无 parsedTask 时不显示意图标签', async () => {
    dialogueRef.value = [makeUserEntry()]
    const wrapper = await getWrapper()
    expect(wrapper.find('.md-intent-tag').exists()).toBe(false)
  })

  // ---- 执行结果 ----

  it('镜我回应显示执行结果', async () => {
    dialogueRef.value = [makeMirrorEntry()]
    const wrapper = await getWrapper()
    expect(wrapper.find('.md-exec-result').exists()).toBe(true)
    expect(wrapper.find('.md-exec-step').exists()).toBe(true)
  })

  it('执行成功显示对勾图标', async () => {
    dialogueRef.value = [makeMirrorEntry()]
    const wrapper = await getWrapper()
    expect(wrapper.find('.md-exec-step-icon').text()).toBe('✓')
    expect(wrapper.find('.md-exec-step--fail').exists()).toBe(false)
  })

  it('执行失败显示叉号图标', async () => {
    dialogueRef.value = [
      makeMirrorEntry({
        executionResult: {
          success: false,
          stepsExecuted: 0,
          stepsTotal: 1,
          message: '执行失败',
          stepResults: [{ order: 1, action: 'start-focus', success: false, error: '错误' }],
        },
      }),
    ]
    const wrapper = await getWrapper()
    expect(wrapper.find('.md-exec-step--fail').exists()).toBe(true)
    expect(wrapper.find('.md-exec-step--fail .md-exec-step-icon').text()).toBe('✗')
  })

  it('镜我回应无 executionResult 时不显示执行结果', async () => {
    dialogueRef.value = [
      makeMirrorEntry({ executionResult: undefined }),
    ]
    const wrapper = await getWrapper()
    expect(wrapper.find('.md-exec-result').exists()).toBe(false)
  })

  // ---- 知识出处（深度借鉴：作答标注出处） ----

  it('镜我回应带知识出处时渲染 📎 出处块', async () => {
    dialogueRef.value = [
      makeMirrorEntry({
        executionResult: undefined,
        sources: [
          { domain: 'note', id: 'n1', label: '晨间跑步笔记', date: '2026-09-01', domainLabel: '笔记' },
          { domain: 'anchor', id: 'a1', label: '今天专注学习', date: '2026-09-02', domainLabel: '心锚' },
        ],
      }),
    ]
    const wrapper = await getWrapper()
    const block = wrapper.find('.md-sources')
    expect(block.exists()).toBe(true)
    expect(block.text()).toContain('📎 作答依据')
    expect(block.text()).toContain('晨间跑步笔记')
    expect(wrapper.findAll('.md-source-item')).toHaveLength(2)
    expect(block.find('.md-source-domain').text()).toBe('笔记')
    expect(block.find('.md-source-date').text()).toBe('2026-09-01')
  })

  it('镜我回应无 sources 时不渲染出处块', async () => {
    dialogueRef.value = [makeMirrorEntry({ executionResult: undefined })]
    const wrapper = await getWrapper()
    expect(wrapper.find('.md-sources').exists()).toBe(false)
  })

  it('用户消息不渲染出处块', async () => {
    dialogueRef.value = [makeUserEntry()]
    const wrapper = await getWrapper()
    expect(wrapper.find('.md-sources').exists()).toBe(false)
  })

  // ---- 歧义候选 ----

  it('有歧义且多个候选时显示歧义面板', async () => {
    isAmbiguousRef.value = true
    candidatesRef.value = [
      { id: 't1', raw: '测试', intent: 'focus', confidence: 0.6, params: {}, parsedAt: Date.now() },
      { id: 't2', raw: '测试', intent: 'note', confidence: 0.55, params: {}, parsedAt: Date.now() },
    ]
    const wrapper = await getWrapper()
    expect(wrapper.find('.md-ambiguous').exists()).toBe(true)
    expect(wrapper.find('.md-ambiguous-hint').text()).toBe('你想要的是：')
  })

  it('显示最多 3 个歧义候选按钮', async () => {
    isAmbiguousRef.value = true
    candidatesRef.value = [
      { id: 't1', raw: '测试', intent: 'focus', confidence: 0.6, params: {}, parsedAt: Date.now() },
      { id: 't2', raw: '测试', intent: 'note', confidence: 0.55, params: {}, parsedAt: Date.now() },
      { id: 't3', raw: '测试', intent: 'emotion', confidence: 0.5, params: {}, parsedAt: Date.now() },
      { id: 't4', raw: '测试', intent: 'anchor', confidence: 0.45, params: {}, parsedAt: Date.now() },
    ]
    const wrapper = await getWrapper()
    expect(wrapper.findAll('.md-ambiguous-chip')).toHaveLength(3)
  })

  it('无歧义时不显示歧义面板', async () => {
    isAmbiguousRef.value = false
    const wrapper = await getWrapper()
    expect(wrapper.find('.md-ambiguous').exists()).toBe(false)
  })

  // ---- 多条消息 ----

  it('渲染多条对话消息', async () => {
    dialogueRef.value = [
      makeUserEntry({ id: 'dlg_1' }),
      makeMirrorEntry({ id: 'dlg_2' }),
      makeUserEntry({ id: 'dlg_3', text: '记录一个想法' }),
      makeMirrorEntry({ id: 'dlg_4', text: '已记下你的想法。' }),
    ]
    const wrapper = await getWrapper()
    const messages = wrapper.findAll('.md-message')
    expect(messages).toHaveLength(4)
  })

  it('有对话时不显示空状态', async () => {
    dialogueRef.value = [makeUserEntry()]
    const wrapper = await getWrapper()
    expect(wrapper.find('.md-empty').exists()).toBe(false)
  })

  // ---- 回答分支导航（INCR-478 · DeepSeek 式「Message N of M」） ----

  it('多分支镜我回应渲染分支导航与计数', async () => {
    dialogueRef.value = [
      makeMirrorEntry({
        text: '第二版',
        activeVariant: 1,
        variants: [
          { id: 'v0', text: '原始回答', createdAt: 1 },
          { id: 'v1', text: '第二版', createdAt: 2 },
        ],
      }),
    ]
    const wrapper = await getWrapper()
    const nav = wrapper.find('.md-branch-nav')
    expect(nav.exists()).toBe(true)
    expect(nav.find('.md-branch-label').text()).toBe('第 2 / 2 个回答')
  })

  it('单分支镜我回应不渲染分支导航', async () => {
    dialogueRef.value = [makeMirrorEntry()]
    const wrapper = await getWrapper()
    expect(wrapper.find('.md-branch-nav').exists()).toBe(false)
  })

  it('点击 ‹ 切换到上一个变体', async () => {
    dialogueRef.value = [
      makeMirrorEntry({
        text: '第二版',
        activeVariant: 1,
        variants: [
          { id: 'v0', text: '原始回答', createdAt: 1 },
          { id: 'v1', text: '第二版', createdAt: 2 },
        ],
      }),
    ]
    const wrapper = await getWrapper()
    await wrapper.find('.md-branch-nav .md-branch-btn').trigger('click')
    expect(dialogueRef.value[0].text).toBe('原始回答')
    expect(dialogueRef.value[0].activeVariant).toBe(0)
    expect(wrapper.find('.md-branch-label').text()).toBe('第 1 / 2 个回答')
  })

  it('点击「重新生成」调用 regenerate', async () => {
    dialogueRef.value = [makeUserEntry()]
    const wrapper = await getWrapper()
    const btn = wrapper.findAll('.md-msg-tool').find(b => b.text() === '重新生成')
    expect(btn).toBeTruthy()
    await btn!.trigger('click')
    expect(mockRegenerate).toHaveBeenCalledWith('开始专注 25 分钟', expect.objectContaining({}))
  })
})