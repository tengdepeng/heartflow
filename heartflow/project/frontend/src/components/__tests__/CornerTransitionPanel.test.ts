// ============================================================
// CornerTransitionPanel · 角落缩放展开转场面板测试
// 覆盖：渲染 / 点击角落弹出弹层 / 关闭收起 / 参数调节 / 恢复默认
// ============================================================
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'

const mockStore: Record<string, any> = {}
vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (k: string, def: any) => (k in mockStore ? mockStore[k] : def),
    setKV: (k: string, v: any) => {
      mockStore[k] = v
    },
  },
}))

import CornerTransitionPanel from '../CornerTransitionPanel.vue'
import { useCornerTransition, DEFAULT_CORNER_TRANSITION } from '../../modules/corner-transition'

describe('CornerTransitionPanel', () => {
  beforeEach(() => {
    Object.keys(mockStore).forEach((k) => delete mockStore[k])
    useCornerTransition().reset()
  })

  it('渲染标题与四个角落触发按钮，初始无弹层', () => {
    const w = mount(CornerTransitionPanel)
    expect(w.text()).toContain('角落缩放展开')
    expect(w.findAll('.ctp-trigger').length).toBe(4)
    expect(w.find('.cgm-panel').exists()).toBe(false)
    w.unmount()
  })

  it('点击角落按钮弹出弹层，标题含该角落标签', async () => {
    const w = mount(CornerTransitionPanel)
    await w.findAll('.ctp-trigger')[0].trigger('click')
    await w.vm.$nextTick()
    expect(w.find('.cgm-panel').exists()).toBe(true)
    expect(w.find('.ctp-modal-title').text()).toContain('左上')
    w.unmount()
  })

  it('关闭按钮收起弹层', async () => {
    const w = mount(CornerTransitionPanel)
    await w.findAll('.ctp-trigger')[2].trigger('click')
    await w.vm.$nextTick()
    expect(w.find('.cgm-panel').exists()).toBe(true)
    await w.find('.cgm-close').trigger('click')
    await w.vm.$nextTick()
    expect(w.find('.cgm-panel').exists()).toBe(false)
    w.unmount()
  })

  it('调整时长与起始缩放写入模块状态', async () => {
    const w = mount(CornerTransitionPanel)
    const ranges = w.findAll('.ctp-range')
    await ranges[0].setValue('400')
    await ranges[1].setValue('0.2')
    expect(useCornerTransition().durationMs.value).toBe(400)
    expect(useCornerTransition().scaleFrom.value).toBe(0.2)
    w.unmount()
  })

  it('切换原点模式并可恢复默认', async () => {
    const w = mount(CornerTransitionPanel)
    await w.find('.ctp-select').setValue('bottom-right')
    expect(useCornerTransition().mode.value).toBe('bottom-right')
    await w.find('.ctp-reset').trigger('click')
    expect(useCornerTransition().mode.value).toBe(DEFAULT_CORNER_TRANSITION.mode)
    expect(useCornerTransition().durationMs.value).toBe(DEFAULT_CORNER_TRANSITION.durationMs)
    w.unmount()
  })
})
