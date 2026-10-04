// ============================================================
// 阅览殿 · 朗读音色库（INCR-504）测试
// 覆盖：默认音色 / 选择持久化 / 未知 id 回落 / 夹取纯函数 /
//       系统音色匹配 / 音色参数叠加倍速
// 键 hf:reading_voice，本地私有、不触云。
// ============================================================
import { describe, expect, it, beforeEach } from 'vitest'
import {
  useVoiceLibrary,
  reloadVoiceLibrary,
  voicePreset,
  clampPitch,
  clampRateScale,
  matchSystemVoice,
  applyVoicePreset,
  VOICE_PRESETS,
  DEFAULT_VOICE_ID,
  MIN_PITCH,
  MAX_PITCH,
  MIN_RATE_SCALE,
  MAX_RATE_SCALE,
} from '../voice-library'
import { storage } from '../../../engine/storage'

const KEY = 'hf:reading_voice'

describe('voice-library · 朗读音色库', () => {
  beforeEach(() => {
    storage.setKV(KEY, '')
    reloadVoiceLibrary()
  })

  it('默认音色为「我」（me），13 款预设', () => {
    const { currentId, current } = useVoiceLibrary()
    expect(currentId.value).toBe(DEFAULT_VOICE_ID)
    expect(current.value.id).toBe('me')
    expect(VOICE_PRESETS).toHaveLength(13)
  })

  it('setPreset 选择后落盘，重载仍生效', () => {
    const { setPreset, current } = useVoiceLibrary()
    expect(setPreset('female-6')).toBe('female-6')
    expect(current.value.label).toBe('元气')
    expect(storage.getKV(KEY, null)).toEqual({ presetId: 'female-6' })

    reloadVoiceLibrary()
    expect(useVoiceLibrary().currentId.value).toBe('female-6')
  })

  it('未知 id 回落到默认音色', () => {
    const { setPreset } = useVoiceLibrary()
    expect(setPreset('not-a-voice')).toBe(DEFAULT_VOICE_ID)
    expect(voicePreset('not-a-voice').id).toBe(DEFAULT_VOICE_ID)
  })

  it('reset 恢复默认音色', () => {
    const { setPreset, reset, currentId } = useVoiceLibrary()
    setPreset('mysterious')
    expect(reset()).toBe(DEFAULT_VOICE_ID)
    expect(currentId.value).toBe(DEFAULT_VOICE_ID)
  })

  it('clampPitch / clampRateScale 夹取并兜底', () => {
    expect(clampPitch(0.1)).toBe(MIN_PITCH)
    expect(clampPitch(9)).toBe(MAX_PITCH)
    expect(clampPitch(Number.NaN, 1.1)).toBe(1.1)
    expect(clampRateScale(0.1)).toBe(MIN_RATE_SCALE)
    expect(clampRateScale(9)).toBe(MAX_RATE_SCALE)
  })

  it('matchSystemVoice 优先中文音色并命中关键词', () => {
    const voices = [
      { name: 'Microsoft David', lang: 'en-US' },
      { name: 'Huihui Online', lang: 'zh-CN' },
      { name: 'Xiaoxiao', lang: 'zh-CN' },
    ]
    const preset = voicePreset('female-1') // match 含 Huihui
    expect(matchSystemVoice(voices, preset)?.name).toBe('Huihui Online')
    expect(matchSystemVoice([], preset)).toBeNull()
    // 无关键词命中时回落首个中文音色
    const p2 = voicePreset('me')
    expect(matchSystemVoice(voices, p2)?.lang).toBe('zh-CN')
  })

  it('applyVoicePreset 将音色语速系数叠加到倍速', () => {
    const preset = voicePreset('mysterious') // pitch 0.85 rateScale 0.85
    const { pitch, rate } = applyVoicePreset(preset, 1.5)
    expect(pitch).toBeCloseTo(0.85, 5)
    expect(rate).toBeCloseTo(1.275, 5)
  })
})
