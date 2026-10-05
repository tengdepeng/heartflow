// ============================================================
// AskBookPanel 组件测试（读书 #5 AI 问书）
// 覆盖：未就绪态 · 就绪态 · 快捷问题 · 提问提交 · 回答/错误展示 · 关闭
// ============================================================
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'

const available = ref(false)
const asking = ref(false)
const answer = ref('')
const error = ref<string | null>(null)
const history = ref<Array<{ role: string; content: string }>>([])
const mockRefresh = vi.fn(async () => { available.value = true; return true })
const mockAsk = vi.fn(async () => true)
const mockReset = vi.fn()

vi.mock('../../modules/reading/ask-book', () => ({
  ASK_BOOK_QUICK_QUESTIONS: ['这段在说什么？', '作者想表达什么？'],
  useAskBook: () => ({
    available,
    asking,
    answer,
    error,
    history,
    callCount: ref(0),
    refreshAvailability: mockRefresh,
    ask: mockAsk,
    reset: mockReset,
  }),
}))

async function getWrapper(props: Record<string, unknown> = {}) {
  const { default: AskBookPanel } = await import('../AskBookPanel.vue')
  const wrapper = mount(AskBookPanel, {
    props: { passage: '人是为了活着本身而活着。', bookTitle: '活着', ...props },
  })
  await Promise.resolve()
  await wrapper.vm.$nextTick()
  return wrapper
}

beforeEach(() => {
  vi.clearAllMocks()
  available.value = false
  asking.value = false
  answer.value = ''
  error.value = null
  history.value = []
  mockRefresh.mockImplementation(async () => { available.value = true; return true })
  mockAsk.mockImplementation(async () => true)
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('AskBookPanel', () => {
  it('挂载时探测本地 AI 可用性', async () => {
    await getWrapper()
    expect(mockRefresh).toHaveBeenCalledTimes(1)
  })

  it('未就绪时显示提示且不渲染快捷问题/输入框', async () => {
    available.value = false
    mockRefresh.mockImplementation(async () => { available.value = false; return false })
    const wrapper = await getWrapper()
    expect(wrapper.find('.abk-badge.off').exists()).toBe(true)
    expect(wrapper.find('.abk-hint').text()).toContain('本地 AI 引擎')
    expect(wrapper.find('.abk-quick').exists()).toBe(false)
    expect(wrapper.find('.abk-input').exists()).toBe(false)
  })

  it('就绪时显示徽标、快捷问题与输入框', async () => {
    available.value = true
    const wrapper = await getWrapper()
    expect(wrapper.find('.abk-badge.on').exists()).toBe(true)
    expect(wrapper.findAll('.abk-chip')).toHaveLength(2)
    expect(wrapper.find('.abk-input').exists()).toBe(true)
    expect(wrapper.find('.abk-passage').text()).toContain('活着')
  })

  it('点击快捷问题填入输入框', async () => {
    available.value = true
    const wrapper = await getWrapper()
    await wrapper.findAll('.abk-chip')[0].trigger('click')
    expect((wrapper.find('.abk-input').element as HTMLTextAreaElement).value).toBe('这段在说什么？')
  })

  it('提交时以原文与书名调用 ask', async () => {
    available.value = true
    const wrapper = await getWrapper()
    await wrapper.find('.abk-input').setValue('作者为什么这样说？')
    await wrapper.find('.abk-send').trigger('click')
    expect(mockAsk).toHaveBeenCalledTimes(1)
    expect(mockAsk).toHaveBeenCalledWith('作者为什么这样说？', {
      bookTitle: '活着',
      passage: '人是为了活着本身而活着。',
    })
  })

  it('空输入时发送按钮禁用且不调用 ask', async () => {
    available.value = true
    const wrapper = await getWrapper()
    const send = wrapper.find('.abk-send')
    expect((send.element as HTMLButtonElement).disabled).toBe(true)
    await send.trigger('click')
    expect(mockAsk).not.toHaveBeenCalled()
  })

  it('回答写入后渲染伴读内容', async () => {
    available.value = true
    answer.value = '这句话在强调活着本身的意义。'
    const wrapper = await getWrapper()
    expect(wrapper.find('.abk-answer-text').text()).toContain('活着本身的意义')
  })

  it('错误写入后渲染错误提示', async () => {
    available.value = true
    error.value = '模型离线'
    const wrapper = await getWrapper()
    expect(wrapper.find('.abk-error').text()).toBe('模型离线')
  })

  it('点击关闭按钮 emit close', async () => {
    available.value = true
    const wrapper = await getWrapper()
    await wrapper.find('.abk-close').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('有历史时显示清空对话并调用 reset', async () => {
    available.value = true
    history.value = [{ role: 'user', content: '问' }, { role: 'assistant', content: '答' }]
    const wrapper = await getWrapper()
    const reset = wrapper.find('.abk-reset')
    expect(reset.exists()).toBe(true)
    await reset.trigger('click')
    expect(mockReset).toHaveBeenCalledTimes(1)
  })
})
