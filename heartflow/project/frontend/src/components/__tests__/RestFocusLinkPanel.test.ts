// ============================================================
// RestFocusLinkPanel 专注联动面板测试（INCR-86）
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

import RestFocusLinkPanel from '../RestFocusLinkPanel.vue'

async function mountPanel() {
  const wrapper = mount(RestFocusLinkPanel)
  await nextTick()
  return wrapper
}

describe('RestFocusLinkPanel 专注联动', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockKV.clear()
  })

  it('标题徽标渲染：空态执行率 0%', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('专注联动')
    expect(wrapper.text()).toContain('执行率 0%')
    expect(wrapper.text()).toContain('0 条关联')
  })

  it('建议预览：默认 25 分钟 → 拉伸 5 分钟', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('button.rfl-btn').trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('建议休息 5 分钟')
    expect(wrapper.text()).toContain('拉伸')
  })

  it('建议预览：输入 90 分钟 → 散步 15 分钟', async () => {
    const wrapper = await mountPanel()
    const focusInput = wrapper.find('input[type="number"]')
    await focusInput.setValue(90)
    await wrapper.find('button.rfl-btn').trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('建议休息 15 分钟')
    expect(wrapper.text()).toContain('散步')
  })

  it('创建关联：写入列表并持久化', async () => {
    const wrapper = await mountPanel()
    const inputs = wrapper.findAll('input')
    await inputs[1].setValue('focus-001')
    await inputs[2].setValue(50)
    await wrapper.find('button.rfl-btn--primary').trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('已创建「focus-001」')
    expect(wrapper.text()).toContain('1 条关联')
    expect(wrapper.text()).toContain('1 条待休息')
    expect(mockKV.get('hf:rest_focus_links')).toBeDefined()
  })

  it('待休息列表展示建议活动与时长', async () => {
    const wrapper = await mountPanel()
    const inputs = wrapper.findAll('input')
    await inputs[1].setValue('focus-002')
    await inputs[2].setValue(25)
    await wrapper.find('button.rfl-btn--primary').trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('focus-002')
    expect(wrapper.text()).toContain('专注 25 分钟')
    expect(wrapper.text()).toContain('建议休息 5 分钟')
  })

  it('标记已休息：待休息清空且执行率提升', async () => {
    const wrapper = await mountPanel()
    const inputs = wrapper.findAll('input')
    await inputs[1].setValue('focus-003')
    await inputs[2].setValue(25)
    await wrapper.find('button.rfl-btn--primary').trigger('click')
    await nextTick()
    await wrapper.find('button.rfl-btn--small').trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('0 条待休息')
    expect(wrapper.text()).toContain('执行率 100%')
    expect(wrapper.text()).toContain('没有待休息的关联')
  })

  it('空态：无待休息时显示平衡提示', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('没有待休息的关联')
  })
})
