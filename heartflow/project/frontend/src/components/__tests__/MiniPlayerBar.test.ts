// ============================================================
// MiniPlayerBar · 悬浮迷你播放器（INCR-502）测试
// 覆盖：初始隐藏 / 唤起后浮出并显示标题 / 播放暂停转发 /
//       收起不停播 / 关闭停播并隐藏 / 进度展示
// 依赖真实 mini-player 引擎（模块级单例）+ 真实 storage。
// ============================================================
import { describe, expect, it, beforeEach, vi } from 'vitest'
import type { Mock } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { storage } from '../../engine/storage'
import { useMiniPlayer, reloadMiniPlayer } from '../../modules/reading/mini-player'
import MiniPlayerBar from '../MiniPlayerBar.vue'

const KEY = 'hf:mini_player'

describe('MiniPlayerBar · 悬浮迷你播放器', () => {
  let toggle: Mock<() => void>
  let stop: Mock<() => void>

  beforeEach(() => {
    storage.setKV(KEY, '')
    reloadMiniPlayer()
    const mp = useMiniPlayer()
    mp.dismiss()
    toggle = vi.fn<() => void>()
    stop = vi.fn<() => void>()
    mp.attach({ toggle, stop })
  })

  it('初始隐藏，未播放时不渲染浮条', () => {
    const w = mount(MiniPlayerBar)
    expect(w.find('.mpb-bar').exists()).toBe(false)
  })

  it('唤起后浮出并显示标题与进度', async () => {
    const mp = useMiniPlayer()
    const w = mount(MiniPlayerBar)
    mp.open('《活着》')
    mp.sync({ playing: true, index: 1, total: 4 })
    await nextTick()
    expect(w.find('.mpb-bar').exists()).toBe(true)
    expect(w.find('.mpb-title').text()).toBe('《活着》')
    expect(w.find('.mpb-count').text()).toBe('2/4')
    expect(w.find('.mpb-fill').attributes('style')).toContain('25%')
  })

  it('播放/暂停按钮转发给宿主控制回调', async () => {
    const mp = useMiniPlayer()
    const w = mount(MiniPlayerBar)
    mp.open('《诗经》')
    await nextTick()
    await w.find('.mpb-toggle').trigger('click')
    expect(toggle).toHaveBeenCalledTimes(1)
  })

  it('收起仅隐藏不停播', async () => {
    const mp = useMiniPlayer()
    const w = mount(MiniPlayerBar)
    mp.open('《楚辞》')
    await nextTick()
    await w.find('.mpb-dismiss').trigger('click')
    await nextTick()
    expect(w.find('.mpb-bar').exists()).toBe(false)
    expect(stop).not.toHaveBeenCalled()
  })

  it('关闭会停止播放并隐藏', async () => {
    const mp = useMiniPlayer()
    const w = mount(MiniPlayerBar)
    mp.open('《论语》')
    await nextTick()
    await w.find('.mpb-close').trigger('click')
    await nextTick()
    expect(stop).toHaveBeenCalledTimes(1)
    expect(w.find('.mpb-bar').exists()).toBe(false)
  })
})
