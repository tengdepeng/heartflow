// ============================================================
// 镜我 · 语音输入模块（P16-13）
// 基于 Web Speech API 的语音识别与实时转录
// ============================================================

import { ref, computed } from 'vue'

// ============================================================
// Web Speech API 类型声明（TypeScript 内置类型不完整）
// ============================================================

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  onspeechstart: (() => void) | null
  onspeechend: (() => void) | null
  onaudiostart: (() => void) | null
  onaudioend: (() => void) | null
  onsoundstart: (() => void) | null
  onsoundend: (() => void) | null
  abort(): void
  start(): void
  stop(): void
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  isFinal: boolean
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message: string
}

// ============================================================
// 类型定义
// ============================================================

/** 语音识别状态 */
export type VoiceInputStatus = 'idle' | 'listening' | 'processing' | 'error' | 'unsupported'

/** 语音输入配置 */
export interface VoiceInputConfig {
  /** 识别语言 */
  lang: string
  /** 是否连续识别 */
  continuous: boolean
  /** 是否显示中间结果 */
  interimResults: boolean
  /** 最大静音时间（ms），超时自动停止 */
  silenceTimeout: number
  /** 最大识别时长（ms），超时自动停止 */
  maxDuration: number
  /** 是否自动重启（错误恢复） */
  autoRestart: boolean
  /** 最大自动重启次数 */
  maxAutoRestarts: number
}

/** 语音识别结果片段 */
export interface VoiceSegment {
  /** 文本内容 */
  text: string
  /** 是否为最终结果 */
  isFinal: boolean
  /** 置信度 */
  confidence: number
  /** 时间戳 */
  timestamp: number
}

/** 语音输入会话 */
export interface VoiceSession {
  /** 会话 ID */
  id: string
  /** 开始时间 */
  startTime: number
  /** 结束时间 */
  endTime: number | null
  /** 识别片段 */
  segments: VoiceSegment[]
  /** 完整文本 */
  fullText: string
  /** 持续时间（ms） */
  duration: number
  /** 语言 */
  lang: string
}

/** 语音识别错误 */
export interface VoiceError {
  type: 'not-supported' | 'not-allowed' | 'no-speech' | 'audio-capture' | 'network' | 'aborted' | 'timeout' | 'unknown'
  message: string
  timestamp: number
}

/** 支持的语言列表 */
export interface VoiceLanguage {
  code: string
  name: string
  nativeName: string
}

// ============================================================
// 支持的语言
// ============================================================

export const SUPPORTED_LANGUAGES: VoiceLanguage[] = [
  { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文' },
  { code: 'en-US', name: 'English (US)', nativeName: 'English (US)' },
  { code: 'en-GB', name: 'English (UK)', nativeName: 'English (UK)' },
  { code: 'ja-JP', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko-KR', name: 'Korean', nativeName: '한국어' },
  { code: 'fr-FR', name: 'French', nativeName: 'Français' },
  { code: 'de-DE', name: 'German', nativeName: 'Deutsch' },
  { code: 'es-ES', name: 'Spanish', nativeName: 'Español' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)', nativeName: 'Português' },
]

// ============================================================
// 默认配置
// ============================================================

export const DEFAULT_VOICE_CONFIG: VoiceInputConfig = {
  lang: 'zh-CN',
  continuous: true,
  interimResults: true,
  silenceTimeout: 3000,
  maxDuration: 60000,
  autoRestart: true,
  maxAutoRestarts: 3,
}

// ============================================================
// 语音输入 Composable
// ============================================================

export function useVoiceInput(config?: Partial<VoiceInputConfig>) {
  // ---- 配置 ----
  const voiceConfig = ref<VoiceInputConfig>({
    ...DEFAULT_VOICE_CONFIG,
    ...config,
  })

  // ---- 状态 ----
  const status = ref<VoiceInputStatus>('idle')
  const isListening = ref(false)
  const isPaused = ref(false)
  const currentText = ref('')
  const interimText = ref('')
  const segments = ref<VoiceSegment[]>([])
  const sessions = ref<VoiceSession[]>([])
  const errors = ref<VoiceError[]>([])
  const currentSession = ref<VoiceSession | null>(null)
  const autoRestartCount = ref(0)

  // ---- 内部状态 ----
  let recognition: SpeechRecognition | null = null
  let silenceTimer: ReturnType<typeof setTimeout> | null = null
  let maxDurationTimer: ReturnType<typeof setTimeout> | null = null
  let sessionIdCounter = 0

  // ---- 派生状态 ----
  const isSupported = computed(() => {
    return typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  })

  const sessionCount = computed(() => sessions.value.length)

  const totalListeningTime = computed(() => {
    return sessions.value.reduce((sum, s) => sum + s.duration, 0)
  })

  const averageConfidence = computed(() => {
    const finalSegments = segments.value.filter(s => s.isFinal && s.confidence > 0)
    if (finalSegments.length === 0) return 0
    return Math.round(
      finalSegments.reduce((s, seg) => s + seg.confidence, 0) / finalSegments.length * 100,
    ) / 100
  })

  const canStart = computed(() => {
    return isSupported.value && (status.value === 'idle' || status.value === 'error')
  })

  // ============================================================
  // 语音识别初始化
  // ============================================================

  /** 初始化语音识别实例 */
  function initRecognition(): SpeechRecognition | null {
    if (!isSupported.value) {
      setStatus('unsupported')
      addError('not-supported', '浏览器不支持语音识别')
      return null
    }

    const SpeechRecognitionAPI = (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition

    if (!SpeechRecognitionAPI) {
      setStatus('unsupported')
      addError('not-supported', '浏览器不支持语音识别')
      return null
    }

    const rec = new (SpeechRecognitionAPI as new () => SpeechRecognition)()
    rec.lang = voiceConfig.value.lang
    rec.continuous = voiceConfig.value.continuous
    rec.interimResults = voiceConfig.value.interimResults
    rec.maxAlternatives = 1

    // 事件处理
    rec.onresult = handleResult
    rec.onerror = handleError
    rec.onend = handleEnd
    rec.onspeechstart = handleSpeechStart
    rec.onspeechend = handleSpeechEnd
    rec.onaudiostart = () => { /* 音频捕获开始 */ }
    rec.onaudioend = () => { /* 音频捕获结束 */ }
    rec.onsoundstart = () => { /* 检测到声音 */ }
    rec.onsoundend = () => { /* 声音结束 */ }

    return rec
  }

  // ============================================================
  // 事件处理
  // ============================================================

  /** 处理识别结果 */
  function handleResult(event: SpeechRecognitionEvent): void {
    resetSilenceTimer()

    let interimResult = ''

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i]
      const text = result[0].transcript
      const confidence = result[0].confidence
      const isFinal = result.isFinal

      const segment: VoiceSegment = {
        text,
        isFinal,
        confidence,
        timestamp: Date.now(),
      }

      segments.value = [...segments.value, segment]

      if (isFinal) {
        currentText.value += text
        interimResult = ''
      } else {
        interimResult += text
      }
    }

    interimText.value = interimResult

    // 更新当前会话
    if (currentSession.value) {
      currentSession.value = {
        ...currentSession.value,
        segments: segments.value,
        fullText: currentText.value + (interimResult ? ` ${interimResult}` : ''),
      }
    }
  }

  /** 处理错误 */
  function handleError(event: SpeechRecognitionErrorEvent): void {
    const errorMap: Record<string, VoiceError['type']> = {
      'not-allowed': 'not-allowed',
      'no-speech': 'no-speech',
      'audio-capture': 'audio-capture',
      'network': 'network',
      'aborted': 'aborted',
    }

    const errorType = errorMap[event.error] ?? 'unknown'
    addError(errorType, `语音识别错误：${event.error}${event.message ? ` - ${event.message}` : ''}`)

    if (event.error === 'not-allowed') {
      setStatus('error')
      return
    }

    if (event.error === 'no-speech') {
      resetSilenceTimer()
      return
    }

    // 自动重启
    if (voiceConfig.value.autoRestart && autoRestartCount.value < voiceConfig.value.maxAutoRestarts) {
      autoRestartCount.value++
      setTimeout(() => {
        if (status.value === 'listening' || status.value === 'error') {
          tryRestart()
        }
      }, 500)
    }
  }

  /** 处理识别结束 */
  function handleEnd(): void {
    // 如果是主动停止，不处理
    if (status.value === 'idle') return

    // 如果处于暂停状态，不处理
    if (isPaused.value) return

    // 自动重启
    if (voiceConfig.value.autoRestart && autoRestartCount.value < voiceConfig.value.maxAutoRestarts) {
      autoRestartCount.value++
      if (recognition && status.value === 'listening') {
        try {
          recognition.start()
        } catch {
          // 已在运行中
        }
      }
    } else {
      finalizeSession()
      setStatus('idle')
    }
  }

  /** 处理语音开始 */
  function handleSpeechStart(): void {
    resetSilenceTimer()
  }

  /** 处理语音结束 */
  function handleSpeechEnd(): void {
    resetSilenceTimer()
  }

  // ============================================================
  // 核心控制
  // ============================================================

  /** 开始录音 */
  function start(): boolean {
    if (!canStart.value) return false

    try {
      recognition = initRecognition()
      if (!recognition) return false

      recognition.start()
      setStatus('listening')
      isListening.value = true
      isPaused.value = false
      autoRestartCount.value = 0

      // 创建新会话
      const session: VoiceSession = {
        id: `voice_${Date.now().toString(36)}_${(sessionIdCounter++).toString(36)}`,
        startTime: Date.now(),
        endTime: null,
        segments: [],
        fullText: '',
        duration: 0,
        lang: voiceConfig.value.lang,
      }
      currentSession.value = session

      // 启动最大时长计时器
      startMaxDurationTimer()

      return true
    } catch (err) {
      addError('unknown', err instanceof Error ? err.message : '启动语音识别失败')
      setStatus('error')
      return false
    }
  }

  /** 停止录音 */
  function stop(): string {
    if (!recognition) return currentText.value

    try {
      recognition.stop()
    } catch {
      // 忽略停止错误
    }

    isListening.value = false
    isPaused.value = false
    clearTimers()

    finalizeSession()

    const finalText = currentText.value.trim()
    resetState()
    setStatus('idle')

    return finalText
  }

  /** 暂停录音 */
  function pause(): void {
    if (!recognition || !isListening.value) return

    try {
      recognition.stop()
    } catch {
      // 忽略停止错误
    }

    isPaused.value = true
    clearTimers()
  }

  /** 恢复录音 */
  function resume(): boolean {
    if (!isPaused.value) return false

    try {
      recognition = initRecognition()
      if (!recognition) return false

      recognition.start()
      isPaused.value = false
      startMaxDurationTimer()
      return true
    } catch {
      addError('unknown', '恢复语音识别失败')
      return false
    }
  }

  /** 取消录音（不保存结果） */
  function cancel(): void {
    if (recognition) {
      try {
        recognition.abort()
      } catch {
        // 忽略
      }
    }

    clearTimers()
    resetState()
    setStatus('idle')
  }

  /** 切换语言 */
  function setLanguage(lang: string): void {
    voiceConfig.value = { ...voiceConfig.value, lang }
    if (recognition) {
      recognition.lang = lang
    }
  }

  // ============================================================
  // 会话管理
  // ============================================================

  /** 完成当前会话 */
  function finalizeSession(): void {
    if (!currentSession.value) return

    const session: VoiceSession = {
      ...currentSession.value,
      endTime: Date.now(),
      fullText: currentText.value.trim(),
      duration: Date.now() - currentSession.value.startTime,
      segments: segments.value,
    }

    sessions.value = [...sessions.value.slice(-49), session]
    currentSession.value = null
  }

  /** 获取会话历史 */
  function getSessions(): VoiceSession[] {
    return sessions.value
  }

  /** 清除会话历史 */
  function clearSessions(): void {
    sessions.value = []
  }

  // ============================================================
  // 错误管理
  // ============================================================

  /** 添加错误 */
  function addError(type: VoiceError['type'], message: string): void {
    errors.value = [...errors.value.slice(-19), { type, message, timestamp: Date.now() }]
  }

  /** 清除错误 */
  function clearErrors(): void {
    errors.value = []
  }

  // ============================================================
  // 内部辅助
  // ============================================================

  /** 设置状态 */
  function setStatus(newStatus: VoiceInputStatus): void {
    status.value = newStatus
    if (newStatus !== 'listening') {
      isListening.value = false
    }
  }

  /** 尝试重启 */
  function tryRestart(): void {
    if (!recognition) return
    try {
      recognition.start()
    } catch {
      // 已在运行中
    }
  }

  /** 重置静音计时器 */
  function resetSilenceTimer(): void {
    if (silenceTimer) clearTimeout(silenceTimer)
    silenceTimer = setTimeout(() => {
      if (isListening.value && !isPaused.value) {
        stop()
      }
    }, voiceConfig.value.silenceTimeout)
  }

  /** 启动最大时长计时器 */
  function startMaxDurationTimer(): void {
    if (maxDurationTimer) clearTimeout(maxDurationTimer)
    maxDurationTimer = setTimeout(() => {
      if (isListening.value && !isPaused.value) {
        stop()
      }
    }, voiceConfig.value.maxDuration)
  }

  /** 清除所有计时器 */
  function clearTimers(): void {
    if (silenceTimer) {
      clearTimeout(silenceTimer)
      silenceTimer = null
    }
    if (maxDurationTimer) {
      clearTimeout(maxDurationTimer)
      maxDurationTimer = null
    }
  }

  /** 重置状态 */
  function resetState(): void {
    currentText.value = ''
    interimText.value = ''
    segments.value = []
    currentSession.value = null
    autoRestartCount.value = 0
    clearTimers()
  }

  /** 完全重置 */
  function reset(): void {
    if (recognition) {
      try {
        recognition.abort()
      } catch {
        // 忽略
      }
      recognition = null
    }
    resetState()
    sessions.value = []
    errors.value = []
    setStatus('idle')
  }

  return {
    // 配置
    voiceConfig,
    setLanguage,

    // 状态
    status,
    isListening,
    isPaused,
    currentText,
    interimText,
    segments,
    sessions,
    errors,
    currentSession,

    // 派生状态
    isSupported,
    sessionCount,
    totalListeningTime,
    averageConfidence,
    canStart,

    // 核心控制
    start,
    stop,
    pause,
    resume,
    cancel,

    // 会话管理
    getSessions,
    clearSessions,

    // 错误管理
    clearErrors,

    // 生命周期
    reset,

    // 常量
    DEFAULT_VOICE_CONFIG,
    SUPPORTED_LANGUAGES,
  }
}