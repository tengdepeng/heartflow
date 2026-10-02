// ============================================================
// 时间块日规划面板测试（INCR-414 · TimeBlockPanel.vue）
// 空态 · 新增待办 · 自动排程 · 手动建块校验 · 排入下一空档 · 移除/完成
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

const mockStore: Record<string, any> = {}

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (key: string, def: any) => mockStore[key] ?? def,
    setKV: (key: string, val: any) => { mockStore[key] = val },
  },
}))

async function mountPanel() {
  localStorage.clear()
  const { default: TimeBlockPanel } = await import('../TimeBlockPanel.vue')
  const wrapper = mount(TimeBlockPanel)
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('TimeBlockPanel 时间块日规划', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore['hf:clepsydra_plan_tasks'] = []
    mockStore['hf:clepsydra_time_blocks'] = []
  })

  it('空态：标题 + 待规划空提示 + 时间轴空提示', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('.tbp').exists()).toBe(true)
    expect(wrapper.text()).toContain('时间块日规划')
    expect(wrapper.text()).toContain('当天的待办都已排上时间轴')
    expect(wrapper.text()).toContain('时间轴还空着')
  })

  it('新增待办出现在待规划池', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('.tbp-input').setValue('写周报')
    await wrapper.find('.tbp-btn--primary').trigger('click')
    await wrapper.vm.$nextTick()
    const tasks = wrapper.findAll('.tbp-task')
    expect(tasks.length).toBe(1)
    expect(tasks[0].text()).toContain('写周报')
    expect(tasks[0].text()).toContain('30′') // 默认预估 30 分钟
    // 持久化（mock storage 直接存数组对象）
    expect(mockStore['hf:clepsydra_plan_tasks'].length).toBe(1)
  })

  it('自动排程把待办放入时间轴并刷新覆盖率', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('.tbp-input').setValue('深度工作')
    await wrapper.find('.tbp-btn--primary').trigger('click')
    await wrapper.vm.$nextTick()

    // 自动排程按钮应可用
    const autoBtn = wrapper.find('.tbp-btn--auto')
    expect((autoBtn.element as HTMLButtonElement).disabled).toBe(false)
    await autoBtn.trigger('click')
    await wrapper.vm.$nextTick()

    // 时间轴出现一个块
    const blocks = wrapper.findAll('.tbp-block')
    expect(blocks.length).toBe(1)
    expect(blocks[0].text()).toContain('深度工作')
    // 覆盖率文本更新（已排 >= 0.5h）
    expect(wrapper.text()).toContain('已排')
    expect(wrapper.text()).toContain('覆盖率')
    // 已生成自动排程提示
    expect(wrapper.text()).toContain('自动排程已放入 1 个时间块')
    // 持久化时间块
    expect(mockStore['hf:clepsydra_time_blocks'].length).toBe(1)
  })

  it('手动建块：合法时间生成时间块', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('.tbp-input--time').setValue('10:00')
    await (wrapper.findAll('.tbp-input--num')[1]).setValue(45)
    await (wrapper.findAll('.tbp-input')[4]).setValue('晨间复盘')
    await (wrapper.findAll('.tbp-btn--primary')[1]).trigger('click')
    await wrapper.vm.$nextTick()
    const blocks = wrapper.findAll('.tbp-block')
    expect(blocks.length).toBe(1)
    expect(blocks[0].text()).toContain('晨间复盘')
    expect(blocks[0].text()).toContain('10:00')
    expect(wrapper.find('.tbp-form-error').exists()).toBe(false)
  })

  it('手动建块：非法时间显示错误且不生成块', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('.tbp-input--time').setValue('99:99')
    await (wrapper.findAll('.tbp-input')[4]).setValue('坏时间')
    await (wrapper.findAll('.tbp-btn--primary')[1]).trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.tbp-form-error').exists()).toBe(true)
    expect(wrapper.find('.tbp-form-error').text()).toContain('HH:MM')
    expect(wrapper.findAll('.tbp-block').length).toBe(0)
  })

  it('排入按钮把单个待办放入下一空档', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('.tbp-input').setValue('读书')
    await wrapper.find('.tbp-btn--primary').trigger('click')
    await wrapper.vm.$nextTick()
    const placeBtn = wrapper.find('.tbp-task-place')
    expect(placeBtn.exists()).toBe(true)
    await placeBtn.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('.tbp-block').length).toBe(1)
    expect(wrapper.find('.tbp-block').text()).toContain('读书')
  })

  it('标记完成与移除时间块', async () => {
    const wrapper = await mountPanel()
    // 先排入一个块
    await wrapper.find('.tbp-input').setValue('运动')
    await wrapper.find('.tbp-btn--primary').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.find('.tbp-task-place').trigger('click')
    await wrapper.vm.$nextTick()

    const block = wrapper.find('.tbp-block')
    // 标记完成
    await block.find('.tbp-block-btn').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.tbp-block').classes()).toContain('tbp-block--done')

    // 移除块（最后一个按钮）
    const delBtn = wrapper.findAll('.tbp-block-btn')[3]
    await delBtn.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('.tbp-block').length).toBe(0)
  })
})
