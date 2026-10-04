// ============================================================
// VoiceLibraryPanel · 朗读音色库面板（INCR-504）测试
// 覆盖：13 款渲染 / 默认选中「我」/ 点选切换 / 恢复默认 /
//       试听调用本地 TTS / 系统音色计数
// 依赖真实 voice-library 引擎 + 真实 storage（jsdom）。
// 通过注入假 speechSynthesis 令 supported=true，行为确定可测。
// ============================================================
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { storage } from '../../engine/storage'
import { reloadVoiceLibrary } from '../../modules/reading/voice-library'
import VoiceLibraryPanel from '../VoiceLibraryPanel.vue'

const KEY = 'hf:reading_voice'

class MockUtterance {
  text: string
  rate = 1
  pitch = 1
  lang = ''
  voice: unknown = null
  onend: (() => void) | null = null
  onerror: (() => void) | null = null
  constructor(text: string) { this.text = text }
}

const speakSpy = vi.fn()

function installSpeechEnv(voices: { name: string; lang: string; voiceURI: string }[]): void {
  speakSpy.mockClear()
  ;(globalThis as Record<string, unknown>).SpeechSynthesisUtterance = MockUtterance
  const synth = {
    speak: (u: MockUtterance) => speakSpy(u.text),
    pause: vi.fn(),
    resume: vi.fn(),
    cancel: vi.fn(),
    getVoices: () => voices,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }
  ;(globalThis as Record<string, unknown>).window = globalThis
  ;(globalThis as Record<string, unknown>).speechSynthesis = synth
}

describe('VoiceLibraryPanel · 朗读音色库', () => {
  beforeEach(() => {
    storage.setKV(KEY, '')
    reloadVoiceLibrary()
    installSpeechEnv([
      { name: 'Huihui', lang: 'zh-CN', voiceURI: 'zh-huihui' },
      { name: 'Xiaoxiao', lang: 'zh-CN', voiceURI: 'zh-xiaoxiao' },
    ])
  })

  it('渲染 13 款音色，默认选中「我」', () => {
    const w = mount(VoiceLibraryPanel)
    expect(w.findAll('.vlp-card')).toHaveLength(13)
    expect(w.find('.vlp-card.is-active .vlp-name').text()).toBe('我')
    expect(w.find('.vlp-current').text()).toContain('音高')
  })

  it('点击音色卡切换当前音色并即时展示参数', async () => {
    const w = mount(VoiceLibraryPanel)
    await w.findAll('.vlp-card')[5].trigger('click') // female-6 元气
    expect(w.find('.vlp-card.is-active .vlp-name').text()).toBe('元气')
    expect(w.find('.vlp-current').text()).toContain('元气')
    // 选择已落盘
    expect(storage.getKV(KEY, null)).toEqual({ presetId: 'female-6' })
  })

  it('恢复默认回到「我」', async () => {
    const w = mount(VoiceLibraryPanel)
    await w.findAll('.vlp-card')[10].trigger('click') // mysterious
    await w.find('.vlp-reset').trigger('click')
    expect(w.find('.vlp-card.is-active .vlp-name').text()).toBe('我')
  })

  it('试听以当前音色参数调用本地 TTS', async () => {
    const w = mount(VoiceLibraryPanel)
    await w.findAll('.vlp-card')[0].trigger('click') // female-1
    await w.find('.vlp-preview').trigger('click')
    expect(speakSpy).toHaveBeenCalledTimes(1)
    expect(speakSpy.mock.calls[0][0]).toContain('心流所至')
  })

  it('展示系统音色数量', async () => {
    const w = mount(VoiceLibraryPanel)
    await nextTick()
    expect(w.find('.vlp-sys').text()).toContain('2')
  })
})
