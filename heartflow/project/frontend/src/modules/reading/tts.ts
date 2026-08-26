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

/** 单句最大长度（超出再按逗号/空格二次切分） */
const MAX_CHUNK = 180

/** 把长文切成适合朗读的句块：先按句末标点，再按长度二次切分 */
export function chunkText(text: string): string[] {
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

/** 当前环境是否支持本地 TTS */
export function isTtsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined'
}

export function useReadingTts() {
  const state = ref<TtsState>('idle')
  const rate = ref(1)
  /** 当前朗读进度：第几块 / 共几块（供 UI 展示） */
  const progress = ref({ index: 0, total: 0 })

  const supported = computed(isTtsSupported)

  let chunks: string[] = []
  let cursor = 0
  let stopped = true

  function speakCurrent(): void {
    if (stopped || cursor >= chunks.length) {
      state.value = 'idle'
      progress.value = { index: chunks.length, total: chunks.length }
      return
    }
    const utter = new SpeechSynthesisUtterance(chunks[cursor])
    utter.rate = rate.value
    utter.lang = 'zh-CN'
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

  /** 从头朗读文本。空文本或不支持时返回 false。 */
  function speak(text: string): boolean {
    if (!supported.value) return false
    const list = chunkText(text)
    if (list.length === 0) return false
    stop()
    chunks = list
    cursor = 0
    stopped = false
    state.value = 'playing'
    progress.value = { index: 0, total: chunks.length }
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

  return { state, rate, progress, supported, speak, pause, resume, stop, setRate }
}
