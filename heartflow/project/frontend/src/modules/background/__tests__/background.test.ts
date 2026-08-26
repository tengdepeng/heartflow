import { describe, it, expect, beforeEach } from 'vitest'
import { useBackgroundVideoSync } from '../index'

describe('useBackgroundVideoSync · 预览前台抑制全局视频解码', () => {
  beforeEach(() => {
    const s = useBackgroundVideoSync()
    s.setPreviewActive(false)
    s.setPreviewFollows(false)
  })

  it('设置页打开且预览独立播放时，抑制全局解码（避免双路同源软解卡顿）', () => {
    const s = useBackgroundVideoSync()
    s.setPreviewActive(true)
    expect(s.globalDecodingSuppressed.value).toBe(true)
  })

  it('开启与全局实时同步时不抑制全局（全局需驱动预览）', () => {
    const s = useBackgroundVideoSync()
    s.setPreviewActive(true)
    s.setPreviewFollows(true)
    expect(s.globalDecodingSuppressed.value).toBe(false)
  })

  it('设置页关闭时恢复全局解码', () => {
    const s = useBackgroundVideoSync()
    s.setPreviewActive(true)
    s.setPreviewActive(false)
    expect(s.globalDecodingSuppressed.value).toBe(false)
  })

  it('同步开启中关闭设置页仍恢复全局解码', () => {
    const s = useBackgroundVideoSync()
    s.setPreviewActive(true)
    s.setPreviewFollows(true)
    s.setPreviewActive(false)
    expect(s.globalDecodingSuppressed.value).toBe(false)
  })
})
