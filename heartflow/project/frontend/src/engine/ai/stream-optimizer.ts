// ============================================================
// AI 引擎 · 流式优化器
// 蓝图定义：
//   可插拔引擎层 — AI引擎增强
//   优化流式响应：缓冲管理、令牌批处理、重连逻辑、错误恢复
// ============================================================

import type { AIStreamCallbacks } from './types'

// ---- 流式配置 ----

export interface StreamConfig {
  /** 缓冲区大小（字符数） */
  bufferSize: number
  /** 缓冲区刷新间隔 (ms) */
  flushInterval: number
  /** 最大重连次数 */
  maxReconnect: number
  /** 重连延迟 (ms) */
  reconnectDelay: number
  /** 是否启用令牌批处理 */
  batchTokens: boolean
  /** 批处理大小（令牌数） */
  batchSize: number
  /** 是否启用去重 */
  deduplicate: boolean
  /** 是否启用超时 */
  timeout: number
}

// ---- 流式统计 ----

export interface StreamStats {
  /** 总字符数 */
  totalChars: number
  /** 总令牌数 */
  totalTokens: number
  /** 缓冲区刷新次数 */
  flushCount: number
  /** 重连次数 */
  reconnectCount: number
  /** 总耗时 (ms) */
  totalDuration: number
  /** 首个令牌延迟 (ms) */
  firstTokenLatency: number
  /** 平均令牌间隔 (ms) */
  avgTokenInterval: number
  /** 是否完成 */
  completed: boolean
  /** 错误信息 */
  error?: string
}

// ---- 默认配置 ----

export const DEFAULT_STREAM_CONFIG: StreamConfig = {
  bufferSize: 256,
  flushInterval: 50,
  maxReconnect: 3,
  reconnectDelay: 1000,
  batchTokens: true,
  batchSize: 4,
  deduplicate: true,
  timeout: 60000,
}

// ---- 流式优化器 ----

export class StreamOptimizer {
  private config: StreamConfig
  private buffer: string[] = []
  private stats: StreamStats
  private flushTimer: ReturnType<typeof setTimeout> | null = null
  private lastTokenTime = 0
  private tokenDeltas: number[] = []
  private abortController: AbortController | null = null
  private reconnectAttempts = 0

  constructor(config: Partial<StreamConfig> = {}) {
    this.config = { ...DEFAULT_STREAM_CONFIG, ...config }
    this.stats = this.createEmptyStats()
  }

  // ---- 流式处理 ----

  /** 创建流式请求包装器 */
  wrapStream(
    callbacks: AIStreamCallbacks,
    retryFn?: (signal: AbortSignal) => Promise<void>,
  ): AIStreamCallbacks {
    this.stats = this.createEmptyStats()
    this.buffer = []
    this.tokenDeltas = []
    this.buffer = []
    this.reconnectAttempts = 0
    this.lastTokenTime = performance.now()

    const startTime = performance.now()
    let firstToken = true

    return {
      onToken: (token: string) => {
        const now = performance.now()

        if (firstToken) {
          firstToken = false
          this.stats.firstTokenLatency = now - startTime
        } else {
          const delta = now - this.lastTokenTime
          this.tokenDeltas.push(delta)
        }
        this.lastTokenTime = now

        this.stats.totalChars += token.length
        this.stats.totalTokens++

        if (this.config.batchTokens) {
          this.buffer.push(token)
          if (this.buffer.length >= this.config.batchSize) {
            this.flushBuffer(callbacks.onToken)
          }
        } else {
          callbacks.onToken(token)
        }
      },

      onComplete: (text: string) => {
        // 刷新剩余缓冲区
        if (this.buffer.length > 0) {
          this.flushBuffer(callbacks.onToken)
        }

        this.stats.totalDuration = performance.now() - startTime
        if (this.tokenDeltas.length > 0) {
          this.stats.avgTokenInterval = this.tokenDeltas.reduce((s, d) => s + d, 0) / this.tokenDeltas.length
        }
        this.stats.completed = true

        this.clearFlushTimer()
        callbacks.onComplete(text)
      },

      onError: async (err: Error) => {
        this.stats.error = err.message

        // 尝试重连
        if (this.reconnectAttempts < this.config.maxReconnect && retryFn) {
          this.reconnectAttempts++
          this.stats.reconnectCount++
          this.clearFlushTimer()

          setTimeout(async () => {
            try {
              this.abortController = new AbortController()
              await retryFn(this.abortController.signal)
            } catch (retryErr) {
              callbacks.onError(retryErr as Error)
            }
          }, this.config.reconnectDelay)
          return
        }

        this.clearFlushTimer()
        callbacks.onError(err)
      },
    }
  }

  // ---- 缓冲区管理 ----

  private flushBuffer(onToken: (token: string) => void): void {
    if (this.buffer.length === 0) return

    const text = this.buffer.join('')
    this.buffer = []
    this.stats.flushCount++

    onToken(text)
  }

  /** 手动刷新缓冲区 */
  flush(onToken: (token: string) => void): void {
    this.flushBuffer(onToken)
  }

  // ---- 定时刷新 ----

  /** 启动定时刷新 */
  startAutoFlush(onToken: (token: string) => void): void {
    this.clearFlushTimer()
    this.flushTimer = setInterval(() => {
      this.flushBuffer(onToken)
    }, this.config.flushInterval)
  }

  /** 停止定时刷新 */
  stopAutoFlush(onToken: (token: string) => void): void {
    this.clearFlushTimer()
    this.flushBuffer(onToken)
  }

  private clearFlushTimer(): void {
    if (this.flushTimer !== null) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }
  }

  // ---- 去重 ----

  /** 对完整响应进行去重（移除重复的连续 token） */
  deduplicateTokens(tokens: string[]): string[] {
    if (!this.config.deduplicate) return tokens
    const result: string[] = []
    for (const token of tokens) {
      if (result.length === 0 || result[result.length - 1] !== token) {
        result.push(token)
      }
    }
    return result
  }

  // ---- 超时控制 ----

  /** 创建带超时的 AbortController */
  createTimeoutController(): AbortController {
    this.abortController = new AbortController()
    setTimeout(() => {
      this.abortController?.abort()
    }, this.config.timeout)
    return this.abortController
  }

  /** 取消当前请求 */
  cancel(): void {
    this.abortController?.abort()
    this.clearFlushTimer()
    this.buffer = []
  }

  // ---- 统计 ----

  /** 获取流式统计 */
  getStats(): StreamStats {
    return { ...this.stats }
  }

  /** 获取当前缓冲区内容 */
  getBufferContent(): string {
    return this.buffer.join('')
  }

  /** 更新配置 */
  updateConfig(partial: Partial<StreamConfig>): void {
    this.config = { ...this.config, ...partial }
  }

  /** 重置 */
  reset(): void {
    this.stats = this.createEmptyStats()
    this.buffer = []
    this.reconnectAttempts = 0
    this.clearFlushTimer()
  }

  private createEmptyStats(): StreamStats {
    return {
      totalChars: 0,
      totalTokens: 0,
      flushCount: 0,
      reconnectCount: 0,
      totalDuration: 0,
      firstTokenLatency: 0,
      avgTokenInterval: 0,
      completed: false,
    }
  }
}