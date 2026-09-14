import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import TransformPipelinePanel from '../TransformPipelinePanel.vue'

// ---- 受控引擎 mock（mock 副作用函数需同步更新 ref，见 INCR-103/boot 教训）----
const steps = ref<any[]>([])
const stepCount = ref(0)
const enabledStepCount = ref(0)
const addStep = vi.fn()
const removeStep = vi.fn()
const toggleStep = vi.fn()
const clear = vi.fn()
const execute = vi.fn()

function refreshCounts() {
  stepCount.value = steps.value.length
  enabledStepCount.value = steps.value.filter((s: any) => s.enabled).length
}

vi.mock('../../modules/visualization/datasource-connector', () => ({
  useTransformPipeline: () => ({
    steps,
    stepCount,
    enabledStepCount,
    addStep,
    removeStep,
    toggleStep,
    execute,
    clear,
  }),
}))

const BOOT_STEPS = [
  { id: 's1', operation: 'filter', enabled: true, config: { field: 'score', operator: 'gte', value: 60 } },
  { id: 's2', operation: 'sort', enabled: true, config: { field: 'score', direction: 'desc' } },
  { id: 's3', operation: 'limit', enabled: false, config: 5 },
]

beforeEach(() => {
  steps.value = BOOT_STEPS.map(s => ({ ...s }))
  refreshCounts()
  addStep.mockReset()
  removeStep.mockReset()
  toggleStep.mockReset()
  clear.mockReset()
  execute.mockReset()
})

function mountPanel() {
  return mount(TransformPipelinePanel, {
    global: { stubs: { transition: false } },
  })
}

const RESULT_ROWS = [
  { date: '08-01', domain: '工作', duration: 120, score: 88 },
  { date: '08-03', domain: '成长', duration: 95, score: 92 },
]

describe('TransformPipelinePanel 数据变换流水线', () => {
  it('渲染初始管线步骤、操作名与配置摘要', async () => {
    const wrapper = mountPanel()
    const ops = wrapper.findAll('.tpp-step-op').map(n => n.text())
    expect(ops).toEqual(['过滤', '排序', '截取'])
    expect(wrapper.text()).toContain('当 score gte 60')
    expect(wrapper.text()).toContain('按 score 降序')
    expect(wrapper.text()).toContain('仅保留前 5 行')
  })

  it('统计条显示步骤数与启用数', () => {
    const wrapper = mountPanel()
    expect(wrapper.text()).toContain('步骤 3')
    expect(wrapper.text()).toContain('启用 2')
  })

  it('执行调用引擎并展示 输入→输出 行数', async () => {
    execute.mockReturnValue(RESULT_ROWS)
    const wrapper = mountPanel()
    await wrapper.find('.tpp-run .tpp-btn--primary').trigger('click')
    expect(execute).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('输入 7 行 → 输出 2 行')
    // 结果预览表渲染
    expect(wrapper.findAll('.tpp-table tbody tr')).toHaveLength(2)
    expect(wrapper.text()).toContain('88')
  })

  it('停止的步骤以 is-off 标记显示', () => {
    const wrapper = mountPanel()
    expect(wrapper.findAll('.tpp-step')[2].classes()).toContain('is-off')
  })

  it('移除步骤调用引擎 removeStep 并刷新清单', async () => {
    removeStep.mockImplementation((id: string) => {
      steps.value = steps.value.filter((s: any) => s.id !== id)
      refreshCounts()
      return true
    })
    const wrapper = mountPanel()
    await wrapper.findAll('.tpp-step-remove')[0].trigger('click')
    expect(removeStep).toHaveBeenCalledWith('s1')
    const ops = wrapper.findAll('.tpp-step-op').map(n => n.text())
    expect(ops).toEqual(['排序', '截取'])
    expect(wrapper.text()).toContain('步骤 2')
  })

  it('启停步骤调用引擎 toggleStep', async () => {
    toggleStep.mockImplementation((id: string) => {
      steps.value = steps.value.map((s: any) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
      refreshCounts()
      return true
    })
    const wrapper = mountPanel()
    await wrapper.findAll('.tpp-step-toggle')[2].trigger('click') // limit 停用 → 启用
    expect(toggleStep).toHaveBeenCalledWith('s3')
    expect(wrapper.findAll('.tpp-step')[2].classes()).not.toContain('is-off')
  })

  it('空管线展示占位文案', async () => {
    steps.value = []
    refreshCounts()
    const wrapper = mountPanel()
    expect(wrapper.text()).toContain('管线为空')
  })

  it('添加过滤器步骤调用引擎并关闭表单', async () => {
    addStep.mockImplementation((op: string, config: unknown) => {
      const id = `new_${steps.value.length}`
      steps.value = [...steps.value, { id, operation: op, enabled: true, config }]
      refreshCounts()
      return { id, operation: op, enabled: true, config }
    })
    const wrapper = mountPanel()
    await wrapper.findAll('.tpp-chip')[0].trigger('click') // ＋ 过滤
    expect(wrapper.find('.tpp-form').exists()).toBe(true)
    await wrapper.find('.tpp-form .tpp-btn--primary').trigger('submit')
    expect(addStep).toHaveBeenCalledWith('filter', expect.objectContaining({ field: 'score', operator: 'gte' }))
    expect(wrapper.find('.tpp-form').exists()).toBe(false)
    const ops = wrapper.findAll('.tpp-step-op').map(n => n.text())
    expect(ops).toHaveLength(4)
  })

  it('清空管线调用引擎 clear 并复位结果', async () => {
    clear.mockImplementation(() => {
      steps.value = []
      refreshCounts()
    })
    const wrapper = mountPanel()
    execute.mockReturnValue(RESULT_ROWS)
    await wrapper.find('.tpp-run .tpp-btn--primary').trigger('click')
    expect(wrapper.text()).toContain('输出 2 行')
    const btns = wrapper.findAll('.tpp-run .tpp-btn')
    await btns[1].trigger('click') // 清空管线
    expect(clear).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('管线为空')
    expect(wrapper.text()).not.toContain('输出 2 行')
  })
})