// ============================================================
// DispatchPanel 幕僚调度面板测试（INCR-88）
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

import DispatchPanel from '../DispatchPanel.vue'

async function mountPanel() {
  const wrapper = mount(DispatchPanel)
  await nextTick()
  return wrapper
}

describe('DispatchPanel 幕僚调度', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockKV.clear()
  })

  it('标题徽标渲染：空态显示 0 次调令', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('幕僚调度')
    expect(wrapper.text()).toContain('0 次调令')
    expect(wrapper.text()).toContain('还没有调令')
  })

  it('下达调令：选择幕僚后创建记录并持久化', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('input.dsp-input').setValue('整理素材')
    await wrapper.find('button.dsp-advisor-chip').trigger('click')
    await wrapper.find('button.dsp-btn--primary').trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('已下达「整理素材」')
    expect(wrapper.text()).toContain('1 次调令')
    expect(mockKV.get('mirror.dispatch.records')).toBeDefined()
  })

  it('单幕僚调令判定为单一策略', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('input.dsp-input').setValue('整理素材')
    await wrapper.find('button.dsp-advisor-chip').trigger('click')
    await wrapper.find('button.dsp-btn--primary').trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('单一')
  })

  it('多幕僚含先后词判定为串行策略', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('input.dsp-input').setValue('先整理素材，再撰写初稿')
    const chips = wrapper.findAll('button.dsp-advisor-chip')
    await chips[0].trigger('click')
    await chips[1].trigger('click')
    await wrapper.find('button.dsp-btn--primary').trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('串行')
    expect(wrapper.text()).toContain('0/2 步完成')
  })

  it('开始执行后步骤进入执行中', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('input.dsp-input').setValue('整理素材')
    await wrapper.find('button.dsp-advisor-chip').trigger('click')
    await wrapper.find('button.dsp-btn--primary').trigger('click')
    await nextTick()
    await wrapper.find('button.dsp-btn--small').trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('执行中')
  })

  it('中止调令后状态为已中止', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('input.dsp-input').setValue('整理素材')
    await wrapper.find('button.dsp-advisor-chip').trigger('click')
    await wrapper.find('button.dsp-btn--primary').trigger('click')
    await nextTick()
    await wrapper.find('button.dsp-btn--small').trigger('click')
    await nextTick()
    await wrapper.find('button.dsp-btn--small').trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('已中止')
  })

  it('删除调令：列表清空', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('input.dsp-input').setValue('整理素材')
    await wrapper.find('button.dsp-advisor-chip').trigger('click')
    await wrapper.find('button.dsp-btn--primary').trigger('click')
    await nextTick()
    await wrapper.find('button.dsp-link').trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('0 次调令')
    expect(wrapper.text()).toContain('还没有调令')
  })
})
