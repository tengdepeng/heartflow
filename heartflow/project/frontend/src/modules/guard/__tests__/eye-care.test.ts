// ============================================================
// 护眼模式 / 白噪音 模块测试
// 将 storage 调用 mock 到内存 store，验证状态持久化与预设行为。
// AudioContext / document 在 node 测试环境不可用，仅验证状态层。
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockGetKV, mockSetKV, store } = vi.hoisted(() => {
  const store: Record<string, any> = {}
  const mockGetKV = vi.fn((k: string, d: any) => store[k] ?? d)
  const mockSetKV = vi.fn((k: string, v: any) => { store[k] = v })
  return { mockGetKV, mockSetKV, store }
})

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: (...a: any[]) => (mockGetKV as any)(...a),
    setKV: (...a: any[]) => (mockSetKV as any)(...a),
  },
}))

import { useEyeCare, EYE_PRESETS } from '../eye-care'
import { useWhiteNoise, NOISE_SCENES } from '../white-noise'

describe('护眼模式 eye-care', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(store).forEach(k => delete store[k])
    const api = useEyeCare()
    api.reset()
  })

  it('默认状态：关闭且全 0', () => {
    const api = useEyeCare()
    expect(api.enabled.value).toBe(false)
    expect(api.blueLight.value).toBe(0)
    expect(api.grayscale.value).toBe(0)
    expect(api.brightness.value).toBe(0)
  })

  it('load 读取已持久化状态', () => {
    store['hf:eye_care'] = { enabled: true, blueLight: 40, grayscale: 20, brightness: 30 }
    const api = useEyeCare()
    api.load()
    expect(api.enabled.value).toBe(true)
    expect(api.blueLight.value).toBe(40)
    expect(api.grayscale.value).toBe(20)
    expect(api.brightness.value).toBe(30)
  })

  it('toggleEnabled 切换并持久化', () => {
    const api = useEyeCare()
    api.toggleEnabled()
    expect(api.enabled.value).toBe(true)
    expect(store['hf:eye_care'].enabled).toBe(true)
    api.toggleEnabled()
    expect(api.enabled.value).toBe(false)
  })

  it('setBlueLight / setGrayscale / setBrightness 持久化', () => {
    const api = useEyeCare()
    api.setBlueLight(60)
    api.setGrayscale(50)
    api.setBrightness(40)
    expect(store['hf:eye_care']).toMatchObject({ blueLight: 60, grayscale: 50, brightness: 40 })
  })

  it('applyPreset 应用预设并开启', () => {
    const api = useEyeCare()
    api.applyPreset('night')
    expect(api.enabled.value).toBe(true)
    expect(api.blueLight.value).toBe(45)
    expect(api.brightness.value).toBe(25)
    expect(store['hf:eye_care'].enabled).toBe(true)
  })

  it('applyPreset 未知 id 不生效', () => {
    const api = useEyeCare()
    api.applyPreset('unknown')
    expect(api.enabled.value).toBe(false)
  })

  it('EYE_PRESETS 包含三档预设', () => {
    expect(EYE_PRESETS.map(p => p.id)).toEqual(['night', 'extreme', 'focus'])
  })

  it('reset 还原为关闭', () => {
    const api = useEyeCare()
    api.applyPreset('extreme')
    api.reset()
    expect(api.enabled.value).toBe(false)
    expect(api.blueLight.value).toBe(0)
    expect(api.grayscale.value).toBe(0)
    expect(api.brightness.value).toBe(0)
  })
})

describe('白噪音 white-noise', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(store).forEach(k => delete store[k])
    // 重置模块级单例 ref（stopAll 清空播放态，volume 手动归位）
    const api = useWhiteNoise()
    api.stopAll()
    api.volume.value = 0.5
  })

  it('NOISE_SCENES 包含六种场景', () => {
    expect(NOISE_SCENES).toHaveLength(6)
    expect(NOISE_SCENES.map(s => s.id)).toEqual(['white', 'pink', 'brown', 'rain', 'ocean', 'forest'])
  })

  it('默认状态：未播放、音量 0.5', () => {
    const api = useWhiteNoise()
    expect(api.playing.value).toBe(false)
    expect(api.currentSceneId.value).toBeNull()
    expect(api.volume.value).toBe(0.5)
  })

  it('load 恢复音量与上次场景选中态', () => {
    store['hf:white_noise_volume'] = 0.8
    store['hf:white_noise'] = { id: 'rain' }
    const api = useWhiteNoise()
    api.load()
    expect(api.volume.value).toBe(0.8)
    expect(api.currentSceneId.value).toBe('rain')
  })

  it('load 忽略非法场景 id', () => {
    store['hf:white_noise'] = { id: 'not-a-scene' }
    const api = useWhiteNoise()
    api.load()
    expect(api.currentSceneId.value).toBeNull()
  })

  it('setVolume 持久化', () => {
    const api = useWhiteNoise()
    api.setVolume(0.3)
    expect(store['hf:white_noise_volume']).toBe(0.3)
  })

  it('无 AudioContext 环境下 toggleScene 安全返回', () => {
    const api = useWhiteNoise()
    api.toggleScene('white')
    expect(api.playing.value).toBe(false)
    expect(api.currentSceneId.value).toBeNull()
  })

  it('stopAll 清空播放状态', () => {
    const api = useWhiteNoise()
    api.stopAll()
    expect(api.playing.value).toBe(false)
    expect(api.currentSceneId.value).toBeNull()
  })
})
