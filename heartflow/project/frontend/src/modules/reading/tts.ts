// ============================================================
// 听书 · 本地 TTS 引擎（蓝图 APK 2.209 微信读书 → 阅览殿「听书」）
// 基于 Web Speech API（speechSynthesis），全程本地、无云端依赖：
//   - 长文按句切分排队朗读（规避单条 utterance 长度限制）
//   - 支持 0.5x ~ 2.0x 倍速
//   - 暂停 / 续播 / 停止
// 环境不支持（或 WebView2 无语音包）时 supported=false，UI 优雅降级。
// ============================================================

import { computed, ref } from 'vue'

export type TtsState = 'idle' | 'playing' | 'paused'

/** 朗读音色参数（INCR-504 音色库）：叠加在用户倍速之上 */
export interface TtsVoiceOptions {
  /** 音高 0.5 ~ 1.5 */
  pitch?: number
  /** 语速系数，实际 rate = 倍速 × rateScale */
  rateScale?: number
  /** 指定系统音色 URI（来自 speechSynthesis.getVoices） */
  voiceURI?: string
}

/** 单句最大长度（超出再按逗号/空格二次切分） */
const MAX_CHUNK = 180

/** 按 URI 从系统音色表里取音色（环境不支持时返回 null） */
export function resolveSystemVoice(voiceURI: string): SpeechSynthesisVoice | null {
  if (!voiceURI || typeof window === 'undefined' || !('speechSynthesis' in window)) return null
  const synth = window.speechSynthesis as SpeechSynthesis | undefined
  if (!synth || typeof synth.getVoices !== 'function') return null
  return synth.getVoices().find((v) => v.voiceURI === voiceURI) ?? null
}

/** 把整篇文本按空行切成非空段落（与沉浸阅读器同一分段口径，供读↔听定位对齐） */
export function splitParagraphs(text: string): string[] {
  return text.split(/\n+/).filter(p => p.trim())
}

/** 把单段文本切成句块：先按句末标点，再按长度二次切分 */
function splitSentences(text: string): string[] {
  const sentences = text
    .split(/(?<=[。！？!?；;.\n])/)
    .map(s => s.trim())
    .filter(Boolean)
  const chunks: string[] = []
  for (const s of sentences) {
    if (s.length <= MAX_CHUNK) {
      chunks.push(s)
      continue
    }
    // 超长句：按逗号/空格再切，仍超长则硬切
    const parts = s.split(/(?<=[，,、\s])/).filter(Boolean)
    let buf = ''
    for (const p of parts) {
      if ((buf + p).length > MAX_CHUNK && buf) {
        chunks.push(buf)
        buf = p
      } else {
        buf += p
      }
      while (buf.length > MAX_CHUNK) {
        chunks.push(buf.slice(0, MAX_CHUNK))
        buf = buf.slice(MAX_CHUNK)
      }
    }
    if (buf) chunks.push(buf)
  }
  return chunks
}

/** 段落 → 句块切分结果：chunks 与 paraOfChunk 等长，后者记录每块所属段落下标 */
export interface ChunkedText {
  chunks: string[]
  paraOfChunk: number[]
}

/** 把段落列表切成朗读句块，并记录每块所属段落（读↔听续接的定位基础） */
export function chunkParagraphs(paragraphs: string[]): ChunkedText {
  const chunks: string[] = []
  const paraOfChunk: number[] = []
  paragraphs.forEach((para, pi) => {
    for (const c of splitSentences(para)) {
      chunks.push(c)
      paraOfChunk.push(pi)
    }
  })
  return { chunks, paraOfChunk }
}

/** 把长文切成适合朗读的句块：先按句末标点，再按长度二次切分 */
export function chunkText(text: string): string[] {
  return chunkParagraphs(splitParagraphs(text)).chunks
}

/** 段落下标 → 起读句块下标（越界回落 0，从头读） */
export function chunkIndexForParagraph(paraOfChunk: number[], paraIndex: number): number {
  if (paraOfChunk.length === 0) return 0
  const target = Math.max(0, Math.floor(paraIndex))
  const i = paraOfChunk.findIndex(p => p >= target)
  return i >= 0 ? i : 0
}

/** 句块下标 → 段落下标（听→读续接，越界夹取到末段） */
export function paragraphIndexForChunk(paraOfChunk: number[], chunkIndex: number): number {
  if (paraOfChunk.length === 0) return 0
  const i = Math.max(0, Math.min(paraOfChunk.length - 1, Math.floor(chunkIndex)))
  return paraOfChunk[i] ?? 0
}

/** 当前环境是否支持本地 TTS */
export function isTtsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined'
}

export function useReadingTts() {
  const state = ref<TtsState>('idle')
  const rate = ref(1)
  /** 当前朗读进度：第几块 / 共几块（供 UI 展示） */
  const progress = ref({ index: 0, total: 0 })
  /** 当前朗读文本切分出的句块列表（供逐句滚动跟读高亮，INCR-515） */
  const sentences = ref<string[]>([])
  /** 与 sentences 等长：每块所属段落下标（INCR-526 读↔听续接：听→读回写段落位置） */
  const paraOfChunk = ref<number[]>([])

  const supported = computed(isTtsSupported)

  let chunks: string[] = []
  let cursor = 0
  let stopped = true
  /** 当前音色参数（INCR-504）：跨句块沿用，切音色即时生效 */
  let voiceOpts: TtsVoiceOptions = {}

  function speakCurrent(): void {
    if (stopped || cursor >= chunks.length) {
      state.value = 'idle'
      progress.value = { index: chunks.length, total: chunks.length }
      return
    }
    const utter = new SpeechSynthesisUtterance(chunks[cursor])
    const scale = voiceOpts.rateScale ?? 1
    utter.rate = Math.min(10, Math.max(0.1, rate.value * scale))
    utter.pitch = voiceOpts.pitch ?? 1
    utter.lang = 'zh-CN'
    const voice = voiceOpts.voiceURI ? resolveSystemVoice(voiceOpts.voiceURI) : null
    if (voice) utter.voice = voice
    utter.onend = () => {
      if (stopped) return
      cursor++
      progress.value = { index: cursor, total: chunks.length }
      speakCurrent()
    }
    utter.onerror = () => {
      if (stopped) return
      // 单句失败跳过，不中断整篇
      cursor++
      speakCurrent()
    }
    window.speechSynthesis.speak(utter)
  }

  /**
   * 朗读文本。可传入音色参数（INCR-504）与起读句块下标（INCR-526 读↔听续接）。
   * 空文本或不支持时返回 false。
   */
  function speak(text: string, opts?: TtsVoiceOptions, startChunk = 0): boolean {
    if (!supported.value) return false
    const { chunks: list, paraOfChunk: paras } = chunkParagraphs(splitParagraphs(text))
    if (list.length === 0) return false
    if (opts) voiceOpts = { ...voiceOpts, ...opts }
    stop()
    chunks = list
    paraOfChunk.value = paras
    cursor = Math.max(0, Math.min(list.length - 1, Math.floor(startChunk)))
    stopped = false
    sentences.value = list
    state.value = 'playing'
    progress.value = { index: cursor, total: chunks.length }
    speakCurrent()
    return true
  }

  function pause(): void {
    if (!supported.value || state.value !== 'playing') return
    window.speechSynthesis.pause()
    state.value = 'paused'
  }

  function resume(): void {
    if (!supported.value || state.value !== 'paused') return
    window.speechSynthesis.resume()
    state.value = 'playing'
  }

  function stop(): void {
    if (!supported.value) return
    stopped = true
    window.speechSynthesis.cancel()
    state.value = 'idle'
  }

  /** 调整倍速（0.5 ~ 2.0）。播放中即时生效：从当前句块重读。 */
  function setRate(r: number): void {
    rate.value = Math.min(2, Math.max(0.5, r))
    if (state.value === 'playing' && supported.value) {
      window.speechSynthesis.cancel()
      speakCurrent()
    }
  }

  /** 切换音色（INCR-504）。播放中即时生效：从当前句块重读。 */
  function setVoice(opts: TtsVoiceOptions): void {
    voiceOpts = { ...voiceOpts, ...opts }
    if (state.value === 'playing' && supported.value) {
      window.speechSynthesis.cancel()
      speakCurrent()
    }
  }

  return { state, rate, progress, sentences, paraOfChunk, supported, speak, pause, resume, stop, setRate, setVoice }
}
