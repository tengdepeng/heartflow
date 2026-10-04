import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'

const mockStore: Record<string, any> = {}
vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (k: string, def: any) => (k in mockStore ? mockStore[k] : def),
    setKV: (k: string, val: any) => {
      mockStore[k] = val
    },
  },
}))

import StandbyScenePanel from '../StandbyScenePanel.vue'
import { useStandbyScene, SCENES, DEFAULT_STANDBY } from '../../modules/standby-scene'

describe('StandbyScenePanel', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    Object.keys(mockStore).forEach((k) => delete mockStore[k])
    useStandbyScene().reset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('渲染标题、五场景与预览台', () => {
    const w = mount(StandbyScenePanel)
    expect(w.text()).toContain('空闲待机氛围场景')
    expect(w.findAll('.sbs-scene-btn').length).toBe(SCENES.length)
    expect(w.find('.sbs-scene').classes()).toContain(`is-${DEFAULT_STANDBY.scene}`)
    w.unmount()
  })

  it('点击场景切换预览', async () => {
    const w = mount(StandbyScenePanel)
    await w.findAll('.sbs-scene-btn')[3].trigger('click')
    expect(w.find('.sbs-scene').classes()).toContain(`is-${SCENES[3]}`)
    w.unmount()
  })

  it('启用开关可切换', async () => {
    const w = mount(StandbyScenePanel)
    const btn = w.find('.sbs-enable')
    expect(btn.text()).toContain('已启用')
    await btn.trigger('click')
    expect(btn.text()).toContain('已关闭')
    w.unmount()
  })

  it('立即预览弹出全屏场景，点击退出', async () => {
    const w = mount(StandbyScenePanel)
    expect(w.find('.sbs-overlay').exists()).toBe(false)
    await w.find('.sbs-preview').trigger('click')
    expect(w.find('.sbs-overlay').exists()).toBe(true)
    await w.find('.sbs-overlay').trigger('click')
    expect(w.find('.sbs-overlay').exists()).toBe(false)
    w.unmount()
  })

  it('静置超时自动浮现', async () => {
    const w = mount(StandbyScenePanel)
    vi.advanceTimersByTime(DEFAULT_STANDBY.idleSeconds * 1000)
    await w.vm.$nextTick()
    expect(w.find('.sbs-overlay').exists()).toBe(true)
    w.unmount()
  })

  it('关闭启用后静置不浮现', async () => {
    const w = mount(StandbyScenePanel)
    await w.find('.sbs-enable').trigger('click')
    vi.advanceTimersByTime(DEFAULT_STANDBY.idleSeconds * 1000 + 5000)
    await w.vm.$nextTick()
    expect(w.find('.sbs-overlay').exists()).toBe(false)
    w.unmount()
  })

  it('恢复默认', async () => {
    const w = mount(StandbyScenePanel)
    await w.findAll('.sbs-scene-btn')[1].trigger('click')
    expect(w.find('.sbs-scene').classes()).toContain(`is-${SCENES[1]}`)
    await w.find('.sbs-reset').trigger('click')
    expect(w.find('.sbs-scene').classes()).toContain(`is-${DEFAULT_STANDBY.scene}`)
    w.unmount()
  })
})
