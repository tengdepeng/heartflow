// ============================================================
// 阅览殿 · 悬浮迷你播放器（INCR-502）测试
// 覆盖：默认启用 / 启用开关持久化 / 唤起与收起 / 关闭停播 /
//       控制回调转发 / 实时播放态同步与进度百分比
// 偏好存 hf:mini_player，运行态不落盘。
// ============================================================
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { useMiniPlayer, reloadMiniPlayer } from '../mini-player'
import { storage } from '../../../engine/storage'

const KEY = 'hf:mini_player'

describe('mini-player · 悬浮迷你播放器', () => {
  beforeEach(() => {
    storage.setKV(KEY, '')
    reloadMiniPlayer()
    // 重置运行态
    const mp = useMiniPlayer()
    mp.detach()
    mp.dismiss()
  })

  it('默认启用，初始不可见', () => {
    const mp = useMiniPlayer()
    expect(mp.enabled.value).toBe(true)
    expect(mp.visible.value).toBe(false)
    expect(mp.canControl.value).toBe(false)
  })

  it('open 唤起迷你条并记忆标题（落盘）', () => {
    const mp = useMiniPlayer()
    mp.open('《活着》')
    expect(mp.visible.value).toBe(true)
    expect(mp.title.value).toBe('《活着》')
    expect(mp.lastTitle.value).toBe('《活着》')
    expect(storage.getKV(KEY, null)).toMatchObject({ lastTitle: '《活着》' })
  })

  it('dismiss 仅收起不停播，close 转发 stop 并清空进度', () => {
    const mp = useMiniPlayer()
    const stop = vi.fn()
    const toggle = vi.fn()
    mp.attach({ toggle, stop })

    mp.open('《诗经》')
    mp.sync({ playing: true, index: 1, total: 4 })
    mp.dismiss()
    expect(mp.visible.value).toBe(false)
    expect(stop).not.toHaveBeenCalled()

    mp.open('《诗经》')
    mp.close()
    expect(stop).toHaveBeenCalledTimes(1)
    expect(mp.visible.value).toBe(false)
    expect(mp.progress.value).toEqual({ index: 0, total: 0 })
  })

  it('toggle 转发给宿主控制回调', () => {
    const mp = useMiniPlayer()
    const toggle = vi.fn()
    mp.attach({ toggle, stop: vi.fn() })
    expect(mp.canControl.value).toBe(true)
    mp.toggle()
    expect(toggle).toHaveBeenCalledTimes(1)
    mp.detach()
    mp.toggle()
    expect(toggle).toHaveBeenCalledTimes(1)
  })

  it('sync 同步播放态与进度百分比', () => {
    const mp = useMiniPlayer()
    mp.sync({ playing: true, index: 3, total: 4 })
    expect(mp.playing.value).toBe(true)
    expect(mp.progressPct.value).toBe(75)
    mp.sync({ playing: false, index: 0, total: 0 })
    expect(mp.playing.value).toBe(false)
    expect(mp.progressPct.value).toBe(0)
  })

  it('setEnabled(false) 落盘、收起并阻止唤起', () => {
    const mp = useMiniPlayer()
    expect(mp.setEnabled(false)).toBe(false)
    expect(storage.getKV(KEY, null)).toMatchObject({ enabled: false })
    mp.open('《楚辞》')
    expect(mp.visible.value).toBe(false)

    reloadMiniPlayer()
    expect(useMiniPlayer().enabled.value).toBe(false)
  })
})
