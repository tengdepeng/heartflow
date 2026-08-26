// ============================================================
// CognitionHall 释光阁 · 素镜视图测试
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

// ---- 模拟存储 ----
const mockStore: Record<string, any> = {}

const mockGetSessions = vi.fn(() => mockStore['sessions'] ?? [])
const mockGetKV = vi.fn((key: string, def: any) => mockStore[key] ?? def)
const mockSetKV = vi.fn((key: string, val: any) => { mockStore[key] = val })

vi.mock('../../engine/storage', () => ({
  storage: {
    getSessions: (...args: any[]) => (mockGetSessions as any)(...args),
    getKV: (...args: any[]) => (mockGetKV as any)(...args),
    setKV: (...args: any[]) => (mockSetKV as any)(...args),
  },
}))

// ---- 辅助函数 ----
const LIGHT_LABELS = ['前提之光', '框架之光', '情感之光', '缺席之光']

function makeSession(overrides: Record<string, any> = {}) {
  return {
    id: `s${Date.now()}`,
    status: 'completed',
    elapsed: 1800000,
    mode: 'focus',
    tags: ['思考'],
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    ...overrides,
  }
}

async function createWrapper() {
  const { default: CognitionHall } = await import('../CognitionHall.vue')
  return mount(CognitionHall)
}

// ---- 测试 ----
describe('CognitionHall 释光阁 · 素镜视图', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore['sessions'] = []
    mockStore['hf:cognition_reflections'] = []
  })

  // ------- 渲染标题 -------
  it('渲染标题"释光阁"和描述', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.text()).toContain('释光阁')
    expect(wrapper.text()).toContain('素镜')
    expect(wrapper.text()).toContain('释光 · 素镜 · 回看自我')
  })

  // ------- 渲染释光仪区域 -------
  it('渲染释光仪区域和提示文字', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.text()).toContain('释光仪')
    expect(wrapper.text()).toContain('放上一件你想回看的事')
    expect(wrapper.find('.cog-input').exists()).toBe(true)
  })

  // ------- 渲染释光仪四个按钮 -------
  it('渲染四个释光仪按钮', async () => {
    const wrapper = await createWrapper()
    const lightBtns = wrapper.findAll('.cog-light-btn')
    expect(lightBtns.length).toBe(4)
    LIGHT_LABELS.forEach(label => {
      expect(wrapper.text()).toContain(label)
    })
  })

  // ------- 点击释光仪按钮并在输入主题后显示结果 -------
  it('输入主题后点击释光仪按钮显示光线结果', async () => {
    const wrapper = await createWrapper()
    const textarea = wrapper.find('.cog-input')
    await textarea.setValue('反复出现的某个想法')
    // 点击第一个释光按钮
    const lightBtns = wrapper.findAll('.cog-light-btn')
    await lightBtns[0].trigger('click')
    await wrapper.vm.$nextTick()
    // 应该有 light-result 出现
    const resultDiv = wrapper.find('.cog-light-result')
    expect(resultDiv.exists()).toBe(true)
    expect(resultDiv.text()).toBeTruthy()
  })

  // ------- 未输入主题时点击释光仪按钮不显示结果 -------
  it('未输入主题时点击释光仪按钮不显示结果', async () => {
    const wrapper = await createWrapper()
    const lightBtns = wrapper.findAll('.cog-light-btn')
    await lightBtns[0].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.cog-light-result').exists()).toBe(false)
  })

  // ------- 素镜回看 - 输入并查看记录 -------
  it('素镜回看输入行为后点击查看记录显示结果', async () => {
    const wrapper = await createWrapper()
    // 找到素镜回看的 textarea（第二个 cog-input）
    const inputs = wrapper.findAll('.cog-input')
    expect(inputs.length).toBeGreaterThanOrEqual(2)
    // 素镜回看的 textarea 是第二个
    const behaviorInput = inputs[1]
    await behaviorInput.setValue('我反复刷手机然后又停下来')
    const viewBtn = wrapper.findAll('button.cog-btn').filter(b => b.text().includes('查看记录'))
    expect(viewBtn.length).toBe(1)
    await viewBtn[0].trigger('click')
    const resultDiv = wrapper.find('.cog-light-result')
    expect(resultDiv.exists()).toBe(true)
    expect(resultDiv.text()).toBeTruthy()
  })

  // ------- 素镜回看 - 空输入时按钮禁用 -------
  it('素镜回看输入为空时查看记录按钮禁用', async () => {
    const wrapper = await createWrapper()
    // 找到素镜回看的按钮
    const viewBtns = wrapper.findAll('button.cog-btn').filter(b => b.text().includes('查看记录'))
    expect(viewBtns.length).toBe(1)
    expect(viewBtns[0].attributes('disabled')).toBeDefined()
  })

  // ------- 渲染认知光图 -------
  it('渲染认知光图三个维度', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.text()).toContain('认知光图')
    expect(wrapper.text()).toContain('广度')
    expect(wrapper.text()).toContain('深度')
    expect(wrapper.text()).toContain('弹性')
    expect(wrapper.text()).toContain('基于最近')
  })

  // ------- 认知光图基于 session 数据计算 -------
  it('认知光图在有 session 数据时显示正确提示', async () => {
    mockStore['sessions'] = [
      makeSession({ id: 's1', elapsed: 3600000, tags: ['思考', '写作'], mode: 'focus' }),
      makeSession({ id: 's2', elapsed: 1800000, tags: ['阅读'], mode: 'focus' }),
    ]
    const wrapper = await createWrapper()
    expect(wrapper.text()).toContain('基于最近 2 条记录自动评估')
  })

  // ------- 空状态显示 -------
  it('无反思笔记时显示空状态提示', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.text()).toContain('还没有反思记录')
    expect(wrapper.text()).toContain('从上面的释光仪开始吧')
  })

  // ------- 添加反思笔记 -------
  it('填写标题和内容并保存反思笔记', async () => {
    const wrapper = await createWrapper()
    // 找到标题输入框（第一个 .cog-input 在反思区域）
    const allInputs = wrapper.findAll('.cog-input')
    // 释光仪区域有一个 textarea，素镜区域有一个 textarea，反思区域有 input + textarea
    // 所以 total .cog-input 中，index 0=释光仪, 1=素镜, 2=反思标题, 3=反思正文
    const titleInput = allInputs[2]
    const bodyTextarea = allInputs[3]
    await titleInput.setValue('重要反思')
    await bodyTextarea.setValue('今天意识到自己需要改变')
    const saveBtn = wrapper.findAll('button.cog-btn').filter(b => b.text().includes('保存反思'))
    expect(saveBtn.length).toBe(1)
    await saveBtn[0].trigger('click')
    expect(mockSetKV).toHaveBeenCalledWith('hf:cognition_reflections', expect.any(Array))
    const saved = mockStore['hf:cognition_reflections']
    expect(saved.length).toBe(1)
    expect(saved[0].title).toBe('重要反思')
    expect(saved[0].body).toBe('今天意识到自己需要改变')
  })

  // ------- 添加反思笔记（无标题） -------
  it('仅填写内容不填标题也可以保存反思', async () => {
    const wrapper = await createWrapper()
    const allInputs = wrapper.findAll('.cog-input')
    const bodyTextarea = allInputs[3]
    await bodyTextarea.setValue('只有内容没有标题')
    const saveBtn = wrapper.findAll('button.cog-btn').filter(b => b.text().includes('保存反思'))
    await saveBtn[0].trigger('click')
    const saved = mockStore['hf:cognition_reflections']
    expect(saved.length).toBe(1)
    expect(saved[0].body).toBe('只有内容没有标题')
  })

  // ------- 删除反思笔记 -------
  it('删除反思笔记', async () => {
    mockStore['hf:cognition_reflections'] = [
      { id: 'r1', title: '反思1', body: '内容1', at: new Date().toISOString() },
      { id: 'r2', title: '反思2', body: '内容2', at: new Date().toISOString() },
    ]
    const wrapper = await createWrapper()
    // 找到删除按钮
    const delBtns = wrapper.findAll('.cog-tiny-btn')
    expect(delBtns.length).toBe(2)
    await delBtns[0].trigger('click')
    const saved = mockStore['hf:cognition_reflections']
    expect(saved.length).toBe(1)
    expect(saved[0].id).toBe('r2')
  })

  // ------- 加载已有反思笔记 -------
  it('加载已有反思笔记', async () => {
    mockStore['hf:cognition_reflections'] = [
      { id: 'r1', title: '昨日反思', body: '昨天的事情', at: new Date().toISOString() },
    ]
    const wrapper = await createWrapper()
    expect(wrapper.text()).toContain('昨日反思')
    expect(wrapper.text()).toContain('昨天的事情')
  })

  // ------- 集成：留光阁归档面板（P2 收口）-------
  it('集成渲染留光阁记录面板（冥想记录区块）', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.text()).toContain('冥想记录')
    expect(wrapper.text()).toContain('释怀记录')
  })
})