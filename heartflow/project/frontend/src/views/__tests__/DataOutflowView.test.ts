// ============================================================
// 数据流出日志路由视图测试（M7）
// ============================================================
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

async function createWrapper() {
  const { default: DataOutflowView } = await import('../DataOutflowView.vue')
  return mount(DataOutflowView, { global: {} })
}

describe('DataOutflowView 数据流出日志路由', () => {
  it('渲染标题与副标题', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.text()).toContain('数据流出日志')
    expect(wrapper.text()).toContain('守护室')
  })

  it('空态提示出现（尚无流出记录）', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.find('.dov-empty').exists()).toBe(true)
    expect(wrapper.text()).toContain('还没有数据离开本设备')
  })
})
