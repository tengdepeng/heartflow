import { describe, it, expect, beforeEach, vi } from 'vitest'
import { chunkText, useReadingTts } from '../tts'

describe('tts · chunkText 句块切分', () => {
  it('按句末标点切分', () => {
    const chunks = chunkText('第一句话。第二句话！第三句话？')
    expect(chunks).toEqual(['第一句话。', '第二句话！', '第三句话？'])
  })

  it('过滤空白，长句按长度二次切分', () => {
    expect(chunkText('   \n  ')).toEqual([])
    const long = '字'.repeat(400)
    const chunks = chunkText(long)
    expect(chunks.length).toBeGreaterThan(1)
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(180)
    expect(chunks.join('')).toBe(long)
  })
})

describe('tts · useReadingTts 状态机', () => {
  const spoken: string[] = []
  let endHandlers: (() => void)[] = []

  beforeEach(() => {
    spoken.length = 0
    endHandlers = []
    // Mock speechSynthesis 环境
    class MockUtterance {
      text: string
      rate = 1
      lang = ''
      onend: (() => void) | null = null
      onerror: (() => void) | null = null
      constructor(text: string) { this.text = text }
    }
    ;(globalThis as Record<string, unknown>).SpeechSynthesisUtterance = MockUtterance
    const synth = {
      speak(u: InstanceType<typeof MockUtterance>) {
        spoken.push(u.text)
        if (u.onend) endHandlers.push(u.onend)
      },
      pause: vi.fn(),
      resume: vi.fn(),
      cancel: vi.fn(),
    }
    ;(globalThis as Record<string, unknown>).window = globalThis
    ;(globalThis as Record<string, unknown>).speechSynthesis = synth
  })

  it('speak 排队朗读，句块结束自动续读', () => {
    const tts = useReadingTts()
    expect(tts.supported.value).toBe(true)
    expect(tts.speak('甲。乙。丙。')).toBe(true)
    expect(tts.state.value).toBe('playing')
    expect(tts.progress.value.total).toBe(3)
    expect(spoken).toEqual(['甲。'])
    // 第一块读完 → 自动读第二块
    endHandlers.shift()?.()
    expect(spoken).toEqual(['甲。', '乙。'])
    endHandlers.shift()?.()
    endHandlers.shift()?.()
    expect(tts.state.value).toBe('idle')
  })

  it('空文本与不朗读时返回 false', () => {
    const tts = useReadingTts()
    expect(tts.speak('   ')).toBe(false)
    expect(tts.state.value).toBe('idle')
  })

  it('speak 暴露句块列表供逐句滚动高亮（INCR-515）', () => {
    const tts = useReadingTts()
    expect(tts.sentences.value).toEqual([])
    tts.speak('甲。乙。丙。')
    expect(tts.sentences.value).toEqual(['甲。', '乙。', '丙。'])
  })

  it('setRate 钳制在 0.5 ~ 2.0', () => {
    const tts = useReadingTts()
    tts.setRate(5)
    expect(tts.rate.value).toBe(2)
    tts.setRate(0.1)
    expect(tts.rate.value).toBe(0.5)
  })
})
