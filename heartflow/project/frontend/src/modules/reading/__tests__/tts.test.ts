import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  chunkText,
  chunkParagraphs,
  splitParagraphs,
  chunkIndexForParagraph,
  paragraphIndexForChunk,
  useReadingTts,
} from '../tts'

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

describe('tts · 段落↔句块映射（INCR-526 读↔听续接）', () => {
  it('splitParagraphs 与阅读器同口径（按空行切段）', () => {
    expect(splitParagraphs('甲\n\n乙\n丙')).toEqual(['甲', '乙', '丙'])
    expect(splitParagraphs('   \n  ')).toEqual([])
  })

  it('chunkParagraphs 记录每块所属段落下标', () => {
    const { chunks, paraOfChunk } = chunkParagraphs(['甲。乙。', '丙。'])
    expect(chunks).toEqual(['甲。', '乙。', '丙。'])
    expect(paraOfChunk).toEqual([0, 0, 1])
  })

  it('chunkText 与 chunkParagraphs 口径一致', () => {
    const text = '甲。乙。\n丙。'
    expect(chunkText(text)).toEqual(chunkParagraphs(splitParagraphs(text)).chunks)
  })

  it('chunkIndexForParagraph 定位该段首块，越界回落 0', () => {
    const { paraOfChunk } = chunkParagraphs(['甲。乙。', '丙。', '丁。'])
    expect(chunkIndexForParagraph(paraOfChunk, 0)).toBe(0)
    expect(chunkIndexForParagraph(paraOfChunk, 1)).toBe(2)
    expect(chunkIndexForParagraph(paraOfChunk, 2)).toBe(3)
    expect(chunkIndexForParagraph(paraOfChunk, 9)).toBe(0)
    expect(chunkIndexForParagraph([], 0)).toBe(0)
  })

  it('paragraphIndexForChunk 回推段落下标并夹取到末段', () => {
    const { paraOfChunk } = chunkParagraphs(['甲。乙。', '丙。'])
    expect(paragraphIndexForChunk(paraOfChunk, 0)).toBe(0)
    expect(paragraphIndexForChunk(paraOfChunk, 1)).toBe(0)
    expect(paragraphIndexForChunk(paraOfChunk, 2)).toBe(1)
    expect(paragraphIndexForChunk(paraOfChunk, 99)).toBe(1)
    expect(paragraphIndexForChunk([], 0)).toBe(0)
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

  it('speak 支持从指定句块起读（读→听续接）', () => {
    const tts = useReadingTts()
    expect(tts.speak('甲。\n乙。', undefined, 1)).toBe(true)
    expect(tts.progress.value.index).toBe(1)
    expect(tts.paraOfChunk.value).toEqual([0, 1])
    expect(spoken).toEqual(['乙。'])
  })

  it('speak 起读下标越界时夹取到末块', () => {
    const tts = useReadingTts()
    tts.speak('甲。乙。', undefined, 99)
    expect(tts.progress.value.index).toBe(1)
    expect(spoken).toEqual(['乙。'])
  })

  it('setRate 钳制在 0.5 ~ 2.0', () => {
    const tts = useReadingTts()
    tts.setRate(5)
    expect(tts.rate.value).toBe(2)
    tts.setRate(0.1)
    expect(tts.rate.value).toBe(0.5)
  })
})
