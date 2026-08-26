// ============================================================
// HomeBackgroundMedia 首页背景媒体组件测试
// ============================================================
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import HomeBackgroundMedia from '../HomeBackgroundMedia.vue'
import { useBackgroundPreviewAudio } from '../../modules/background'
import type { BackgroundMediaConfig } from '../../types'

const basePreset: BackgroundMediaConfig = {
  type: 'preset',
  presetScene: 'forest-dawn',
  dataUrl: null,
  mimeType: null,
  fileName: null,
  updatedAt: null,
}

const baseImage: BackgroundMediaConfig = {
  type: 'image',
  presetScene: 'none',
  dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  mimeType: 'image/png',
  fileName: 'test.png',
  updatedAt: '2025-06-15T10:30:00Z',
}

const baseVideo: BackgroundMediaConfig = {
  type: 'video',
  presetScene: 'none',
  dataUrl: 'https://example.com/test.mp4',
  mimeType: 'video/mp4',
  fileName: 'test.mp4',
  updatedAt: '2025-06-15T10:30:00Z',
}

const baseDefault: BackgroundMediaConfig = {
  type: 'default',
  presetScene: 'none',
  dataUrl: null,
  mimeType: null,
  fileName: null,
  updatedAt: null,
}

describe('HomeBackgroundMedia', () => {
  beforeEach(() => {
    // 隔离模块级音频路由单例，避免测试间泄漏
    useBackgroundPreviewAudio().setPreviewOwnsAudio(false)
  })

  // ---- preset 场景 ----
  it('preset 场景渲染背景容器', () => {
    const wrapper = mount(HomeBackgroundMedia, {
      props: { background: basePreset },
    })
    expect(wrapper.find('.home-background-media').exists()).toBe(true)
    expect(wrapper.find('.preset-scene').exists()).toBe(true)
  })

  it('preset 场景渲染 gradient 渐变层', () => {
    const wrapper = mount(HomeBackgroundMedia, {
      props: { background: basePreset },
    })
    expect(wrapper.find('.preset-scene__gradient').exists()).toBe(true)
  })

  it('preset 场景渲染粒子元素', () => {
    const wrapper = mount(HomeBackgroundMedia, {
      props: { background: basePreset },
    })
    // forest-dawn 场景有辉光粒子
    const particles = wrapper.findAll('.particle')
    expect(particles.length).toBeGreaterThan(0)
  })

  it('forest-dawn 场景渲染树木 SVG', () => {
    const wrapper = mount(HomeBackgroundMedia, {
      props: { background: basePreset },
    })
    const trees = wrapper.find('.preset-scene__svg--trees')
    expect(trees.exists()).toBe(true)
  })

  it('coast-starlight 场景渲染海浪 SVG', () => {
    const wrapper = mount(HomeBackgroundMedia, {
      props: {
        background: { ...basePreset, presetScene: 'coast-starlight' },
      },
    })
    expect(wrapper.find('.preset-scene__svg--waves').exists()).toBe(true)
    expect(wrapper.find('.preset-scene--coast-starlight').exists()).toBe(true)
  })

  it('渲染遮罩层 veil', () => {
    const wrapper = mount(HomeBackgroundMedia, {
      props: { background: basePreset },
    })
    expect(wrapper.find('.home-background-media__veil').exists()).toBe(true)
  })

  it('渲染 grain 纹理层', () => {
    const wrapper = mount(HomeBackgroundMedia, {
      props: { background: basePreset },
    })
    expect(wrapper.find('.home-background-media__grain').exists()).toBe(true)
  })

  // ---- image 类型 ----
  it('image 类型渲染 img 标签', () => {
    const wrapper = mount(HomeBackgroundMedia, {
      props: { background: baseImage },
    })
    const img = wrapper.find('img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe(baseImage.dataUrl)
    expect(img.attributes('alt')).toContain('test.png')
  })

  it('image 类型渲染 veil 遮罩层', () => {
    const wrapper = mount(HomeBackgroundMedia, {
      props: { background: baseImage },
    })
    expect(wrapper.find('.home-background-media__veil').exists()).toBe(true)
  })

  // ---- video 类型 ----
  it('video 类型渲染 video 标签且默认静音', () => {
    const wrapper = mount(HomeBackgroundMedia, {
      props: { background: baseVideo },
    })
    const video = wrapper.find('video')
    expect(video.exists()).toBe(true)
    expect(video.attributes('src')).toBe(baseVideo.dataUrl)
    expect(video.attributes('autoplay')).toBeDefined()
    expect(video.attributes('loop')).toBeDefined()
    // 未显式设置 muted 时默认静音播放
    expect((video.element as HTMLVideoElement).muted).toBe(true)
  })

  it('video 类型设置 muted=false 时保留原声', () => {
    const wrapper = mount(HomeBackgroundMedia, {
      props: { background: { ...baseVideo, muted: false } },
    })
    const video = wrapper.find('video')
    expect((video.element as HTMLVideoElement).muted).toBe(false)
  })

  it('video 类型应用默认播放速度 playbackRate=1', () => {
    const wrapper = mount(HomeBackgroundMedia, {
      props: { background: baseVideo },
    })
    const video = wrapper.find('video')
    expect((video.element as HTMLVideoElement).playbackRate).toBe(1)
  })

  it('背景配置界面打开（previewOwnsAudio）时，全局背景让出声音而静音', () => {
    // 模拟进入「殿堂设置」：预览接管音频，全局背景必须静音，避免两路同源回声
    const { setPreviewOwnsAudio } = useBackgroundPreviewAudio()
    setPreviewOwnsAudio(true)
    const wrapper = mount(HomeBackgroundMedia, {
      props: { background: { ...baseVideo, muted: false } },
    })
    const video = wrapper.find('video')
    expect((video.element as HTMLVideoElement).muted).toBe(true)
    setPreviewOwnsAudio(false)
  })

  it('video 类型渲染 veil 遮罩层', () => {
    const wrapper = mount(HomeBackgroundMedia, {
      props: { background: baseVideo },
    })
    expect(wrapper.find('.home-background-media__veil--video').exists()).toBe(true)
  })

  it('video 类型即使默认静音也会调用 play()（避免画面静止）', () => {
    // 默认导入的视频背景为静音（videoMuted=true），此前因仅 !videoMuted 才 play，
    // 静音视频不播放、停在第一帧。回归：媒体可见即 play()。
    const playSpy = vi
      .spyOn(HTMLMediaElement.prototype, 'play')
      .mockImplementation(() => Promise.resolve())
    mount(HomeBackgroundMedia, {
      props: { background: baseVideo },
    })
    expect(playSpy).toHaveBeenCalled()
    playSpy.mockRestore()
  })

  // ---- default 类型 ----
  it('default 类型不渲染任何背景元素', () => {
    const wrapper = mount(HomeBackgroundMedia, {
      props: { background: baseDefault },
    })
    // 当 type 为 default 且 presetScene 为 none 时，组件不渲染任何内容
    expect(wrapper.find('.home-background-media').exists()).toBe(false)
  })

  // ---- 事件 ----
  it('image 加载错误触发 loadError 事件', async () => {
    const wrapper = mount(HomeBackgroundMedia, {
      props: { background: baseImage },
      attrs: {
        // 在 img 上模拟 error 事件
      },
    })
    const img = wrapper.find('img')
    await img.trigger('error')
    expect(wrapper.emitted('loadError')).toHaveLength(1)
  })

  it('video 加载错误触发 loadError 事件', async () => {
    const wrapper = mount(HomeBackgroundMedia, {
      props: { background: baseVideo },
    })
    const video = wrapper.find('video')
    await video.trigger('error')
    expect(wrapper.emitted('loadError')).toHaveLength(1)
  })
})