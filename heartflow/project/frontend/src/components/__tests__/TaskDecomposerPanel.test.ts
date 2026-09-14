// ============================================================
// TaskDecomposerPanel 任务拆解面板测试（INCR-87）
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

// ---- Storage Mock ----
const mockKV = new Map<string, any>()
const mockGetKV = vi.fn((key: string, fallback?: any) => mockKV.get(key) ?? fallback)
const mockSetKV = vi.fn((key: string, val: any) => { mockKV.set(key, val) })

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (key: string, fallback?: any) => mockGetKV(key, fallback),
    setKV: (key: string, val: any) => mockSetKV(key, val),
  },
}))

import TaskDecomposerPanel from '../TaskDecomposerPanel.vue'

async function mountPanel() {
  const wrapper = mount(TaskDecomposerPanel)
  await nextTick()
  return wrapper
}

describe('TaskDecomposerPanel 任务拆解', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockKV.clear()
  })

  it('标题徽标渲染：空态显示 0 份计划', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('任务拆解')
    expect(wrapper.text()).toContain('0 份计划')
    expect(wrapper.text()).toContain('还没有拆解计划')
  })

  it('拆解预览：输入任务后展示意图与步骤', async () => {
    const wrapper = await mountPanel()
    const input = wrapper.find('input.tdp-input')
    await input.setValue('推进一个长期项目')
    await wrapper.find('button.tdp-btn--primary').trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('项目推进')
    expect(wrapper.text()).toContain('界定范围')
    expect(wrapper.text()).toContain('制定里程碑')
  })

  it('拆解预览：编码任务识别为编程实现', async () => {
    const wrapper = await mountPanel()
    const input = wrapper.find('input.tdp-input')
    await input.setValue('写个脚本部署到服务器')
    await wrapper.find('button.tdp-btn--primary').trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('编程实现')
    expect(wrapper.text()).toContain('明确需求')
    expect(wrapper.text()).toContain('测试验证')
  })

  it('保存计划：写入列表并持久化', async () => {
    const wrapper = await mountPanel()
    const input = wrapper.find('input.tdp-input')
    await input.setValue('整理房间')
    await wrapper.find('button.tdp-btn--primary').trigger('click')
    await nextTick()
    const btns = wrapper.findAll('button.tdp-btn')
    await btns[btns.length - 1]!.trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('1 份计划')
    expect(wrapper.text()).toContain('整理房间')
    expect(mockKV.get('mirror.decomposer.plans')).toBeDefined()
  })

  it('步骤切换：点击步骤芯片推进状态', async () => {
    const wrapper = await mountPanel()
    const input = wrapper.find('input.tdp-input')
    await input.setValue('整理房间')
    await wrapper.find('button.tdp-btn--primary').trigger('click')
    await nextTick()
    const btns2 = wrapper.findAll('button.tdp-btn')
    await btns2[btns2.length - 1]!.trigger('click')
    await nextTick()
    await wrapper.find('button.tdp-step-chip').trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('◐ 定下目标')
    await wrapper.find('button.tdp-step-chip').trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('1/4 步完成')
  })

  it('删除计划：列表清空', async () => {
    const wrapper = await mountPanel()
    const input = wrapper.find('input.tdp-input')
    await input.setValue('整理房间')
    await wrapper.find('button.tdp-btn--primary').trigger('click')
    await nextTick()
    const btns3 = wrapper.findAll('button.tdp-btn')
    await btns3[btns3.length - 1]!.trigger('click')
    await nextTick()
    await wrapper.find('button.tdp-link').trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('0 份计划')
    expect(wrapper.text()).toContain('还没有拆解计划')
  })
})
