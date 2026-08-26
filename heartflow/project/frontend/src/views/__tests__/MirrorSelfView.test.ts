// ============================================================
// 镜我独立路由视图测试（M6）
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

// 桩掉镜我组件，避免拉起 advisor/timer/storage 重依赖
vi.mock('../../components/MirrorSelf.vue', () => ({
  default: { template: '<div class="mock-mirror-self" />' },
}))

async function createWrapper() {
  const { default: MirrorSelfView } = await import('../MirrorSelfView.vue')
  return mount(MirrorSelfView, { global: {} })
}

describe('MirrorSelfView 镜我独立路由', () => {
  it('渲染镜我标题与副标题', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.text()).toContain('镜我')
    expect(wrapper.text()).toContain('陈列而非叙事')
  })

  it('挂载镜我载体组件', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.find('.mock-mirror-self').exists()).toBe(true)
  })

  it('渲染「跨房间共鸣态势」小节（无他房信号时显示空态）', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.find('.msr-climate').exists()).toBe(true)
    expect(wrapper.text()).toContain('跨房间共鸣态势')
    // 测试环境仅镜我自身发射信号，已被过滤，故显示静默空态
    expect(wrapper.find('.msr-climate-empty').exists()).toBe(true)
  })

  it('渲染「近期反思」小节（无对话时显示空态）', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.find('.msr-reflections').exists()).toBe(true)
    expect(wrapper.text()).toContain('近期反思')
    expect(wrapper.find('.msr-reflect-empty').exists()).toBe(true)
  })

  it('进入房间时向跨房间态势注入镜我信号（不报错）', async () => {
    // 挂载即 onMounted 发射 mirror 信号；断言渲染未崩溃即可
    const wrapper = await createWrapper()
    expect(wrapper.find('.mirror-self-room').exists()).toBe(true)
  })
})
