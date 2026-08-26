// ============================================================
// 呈现引擎 · 场景渲染器
// 蓝图定义：
//   管理渲染管线：prepare → layout → paint → composite → animate
//   支持渲染器注册、优先级调度、帧率控制、性能监控
// ============================================================

import type {
  Renderer,
  RenderContext,
  RenderPipelineConfig,
  RenderStats,
  RenderPhase,
  AnimationEntry,
  EasingType,
  PerformanceConfig,
  PerformanceLevel,
} from './types'
import { RENDER_PHASE_ORDER } from './types'

// ---- 默认配置 ----

export const DEFAULT_PIPELINE_CONFIG: RenderPipelineConfig = {
  targetFPS: 60,
  maxFrameTime: 33,
  vsync: true,
  performanceMonitor: true,
  autoSort: true,
  frameSkipThreshold: 50,
}

export const PERFORMANCE_PROFILES: Record<PerformanceLevel, PerformanceConfig> = {
  high: {
    level: 'high',
    targetFPS: 60,
    particlesEnabled: true,
    blurEnabled: true,
    shadowEnabled: true,
    antialiasEnabled: true,
    maxEffects: 50,
    maxAnimations: 100,
  },
  balanced: {
    level: 'balanced',
    targetFPS: 30,
    particlesEnabled: true,
    blurEnabled: false,
    shadowEnabled: true,
    antialiasEnabled: false,
    maxEffects: 20,
    maxAnimations: 50,
  },
  powersave: {
    level: 'powersave',
    targetFPS: 15,
    particlesEnabled: false,
    blurEnabled: false,
    shadowEnabled: false,
    antialiasEnabled: false,
    maxEffects: 5,
    maxAnimations: 10,
  },
}

// ---- 缓动函数 ----

const EASING_FUNCTIONS: Record<EasingType, (t: number) => number> = {
  'linear': (t: number) => t,
  'ease-in': (t: number) => t * t,
  'ease-out': (t: number) => t * (2 - t),
  'ease-in-out': (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  'bounce': (t: number) => {
    if (t < 1 / 2.75) return 7.5625 * t * t
    if (t < 2 / 2.75) { t -= 1.5 / 2.75; return 7.5625 * t * t + 0.75 }
    if (t < 2.5 / 2.75) { t -= 2.25 / 2.75; return 7.5625 * t * t + 0.9375 }
    t -= 2.625 / 2.75; return 7.5625 * t * t + 0.984375
  },
  'elastic': (t: number) => {
    if (t === 0 || t === 1) return t
    return Math.pow(2, -10 * t) * Math.sin((t - 1) * (2 * Math.PI) / 0.3) + 1
  },
  'cubic-bezier': (t: number) => t,
}

// ---- 场景渲染器 ----

export class SceneRenderer {
  private renderers = new Map<string, Renderer>()
  private animations = new Map<string, AnimationEntry>()
  private config: RenderPipelineConfig
  private stats: RenderStats
  private rafId: number | null = null
  private lastFrameTime = 0
  private frameCount = 0
  private running = false
  private frameTimes: number[] = []

  constructor(config: Partial<RenderPipelineConfig> = {}) {
    this.config = { ...DEFAULT_PIPELINE_CONFIG, ...config }
    this.stats = this.createEmptyStats()
  }

  // ---- 渲染器管理 ----

  /** 注册渲染器 */
  register(renderer: Renderer): void {
    if (this.renderers.has(renderer.id)) {
      throw new Error(`渲染器 ${renderer.id} 已存在`)
    }
    this.renderers.set(renderer.id, renderer)
  }

  /** 注销渲染器 */
  unregister(rendererId: string): boolean {
    const renderer = this.renderers.get(rendererId)
    if (renderer?.cleanup) {
      renderer.cleanup()
    }
    return this.renderers.delete(rendererId)
  }

  /** 获取渲染器 */
  getRenderer(rendererId: string): Renderer | undefined {
    return this.renderers.get(rendererId)
  }

  /** 获取所有渲染器 */
  getAllRenderers(): Renderer[] {
    return [...this.renderers.values()]
  }

  /** 启用/禁用渲染器 */
  setRendererEnabled(rendererId: string, enabled: boolean): void {
    const renderer = this.renderers.get(rendererId)
    if (renderer) {
      renderer.enabled = enabled
    }
  }

  // ---- 渲染管线 ----

  /** 启动渲染管线 */
  start(): void {
    if (this.running) return
    this.running = true
    this.lastFrameTime = performance.now()
    this.frameCount = 0
    this.scheduleFrame()
  }

  /** 停止渲染管线 */
  stop(): void {
    this.running = false
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  /** 渲染一帧 */
  private scheduleFrame(): void {
    if (!this.running) return
    this.rafId = requestAnimationFrame((timestamp) => {
      this.renderFrame(timestamp)
      this.scheduleFrame()
    })
  }

  private async renderFrame(timestamp: number): Promise<void> {
    const deltaTime = timestamp - this.lastFrameTime
    this.lastFrameTime = timestamp

    // 帧率控制
    if (deltaTime > this.config.frameSkipThreshold) {
      this.stats.skippedFrames++
      return
    }

    this.frameCount++
    this.stats.totalFrames++
    this.frameTimes.push(deltaTime)
    if (this.frameTimes.length > 60) {
      this.frameTimes.shift()
    }

    // 更新帧率统计
    const avgFrameTime = this.frameTimes.reduce((s, t) => s + t, 0) / this.frameTimes.length
    this.stats.currentFPS = avgFrameTime > 0 ? 1000 / avgFrameTime : 0
    this.stats.averageFrameTime = avgFrameTime
    this.stats.averageFPS = this.stats.totalFrames > 0
      ? (this.stats.averageFPS * (this.stats.totalFrames - 1) + this.stats.currentFPS) / this.stats.totalFrames
      : this.stats.currentFPS
    this.stats.minFPS = Math.min(this.stats.minFPS || Infinity, this.stats.currentFPS)
    this.stats.maxFPS = Math.max(this.stats.maxFPS, this.stats.currentFPS)

    const context: RenderContext = {
      timestamp,
      deltaTime,
      fps: this.stats.currentFPS,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      isFirstFrame: this.frameCount === 1,
      phase: 'prepare',
      frameId: this.frameCount,
    }

    // 按管线阶段顺序执行
    for (const phase of RENDER_PHASE_ORDER) {
      context.phase = phase
      const phaseStart = performance.now()
      const phaseRenderers = this.getSortedRenderers(phase)

      for (const renderer of phaseRenderers) {
        if (!renderer.enabled) continue
        const rendererStart = performance.now()
        try {
          await renderer.render(context)
        } catch (err) {
          console.error(`[Rendering] 渲染器 ${renderer.id} 出错:`, err)
        }
        this.stats.rendererTimings[renderer.id] =
          (this.stats.rendererTimings[renderer.id] || 0) + (performance.now() - rendererStart)
      }

      this.stats.phaseTimings[phase] = performance.now() - phaseStart
    }

    this.stats.lastRenderAt = new Date().toISOString()
  }

  /** 按优先级排序渲染器 */
  private getSortedRenderers(phase: RenderPhase): Renderer[] {
    const phaseRenderers = [...this.renderers.values()]
      .filter(r => r.phase === phase)

    if (!this.config.autoSort) return phaseRenderers

    // 拓扑排序（处理依赖关系）
    return this.topologicalSort(phaseRenderers)
  }

  private topologicalSort(renderers: Renderer[]): Renderer[] {
    const sorted: Renderer[] = []
    const visited = new Set<string>()
    const visiting = new Set<string>()

    function visit(r: Renderer): void {
      if (visited.has(r.id)) return
      if (visiting.has(r.id)) {
        throw new Error(`渲染器循环依赖: ${r.id}`)
      }
      visiting.add(r.id)
      if (r.dependencies) {
        for (const depId of r.dependencies) {
          const dep = renderers.find(rr => rr.id === depId)
          if (dep) visit(dep)
        }
      }
      visiting.delete(r.id)
      visited.add(r.id)
      sorted.push(r)
    }

    // 按优先级排序再拓扑排序
    const sortedByPrio = [...renderers].sort((a, b) => b.priority - a.priority)
    for (const r of sortedByPrio) {
      visit(r)
    }

    return sorted
  }

  // ---- 动画管理 ----

  /** 添加动画 */
  addAnimation(entry: AnimationEntry): void {
    if (this.animations.size >= (this.config.performanceMonitor ? 100 : 50)) {
      console.warn('[Rendering] 动画数量已达上限')
      return
    }
    this.animations.set(entry.id, { ...entry, state: 'idle', progress: 0, startedAt: 0 })
  }

  /** 启动动画 */
  startAnimation(animationId: string): void {
    const anim = this.animations.get(animationId)
    if (!anim) return
    anim.state = 'running'
    anim.startedAt = performance.now()
    anim.progress = 0
    anim.onStart?.()
  }

  /** 暂停动画 */
  pauseAnimation(animationId: string): void {
    const anim = this.animations.get(animationId)
    if (anim && anim.state === 'running') {
      anim.state = 'paused'
    }
  }

  /** 恢复动画 */
  resumeAnimation(animationId: string): void {
    const anim = this.animations.get(animationId)
    if (anim && anim.state === 'paused') {
      anim.state = 'running'
      anim.startedAt = performance.now() - anim.progress * anim.duration
    }
  }

  /** 取消动画 */
  cancelAnimation(animationId: string): void {
    const anim = this.animations.get(animationId)
    if (anim) {
      anim.state = 'idle'
      anim.progress = 0
      anim.onCancel?.()
    }
  }

  /** 移除动画 */
  removeAnimation(animationId: string): boolean {
    const anim = this.animations.get(animationId)
    if (anim?.state === 'running') {
      anim.onCancel?.()
    }
    return this.animations.delete(animationId)
  }

  /** 更新动画进度 */
  updateAnimations(timestamp: number): void {
    for (const anim of this.animations.values()) {
      if (anim.state !== 'running') continue

      const elapsed = timestamp - anim.startedAt
      anim.progress = Math.min(1, elapsed / anim.duration)

      const easedProgress = EASING_FUNCTIONS[anim.easing](anim.progress)
      anim.onUpdate?.(easedProgress)

      if (anim.progress >= 1) {
        if (anim.loop && (anim.loopCount === -1 || anim.loopCount > 0)) {
          anim.progress = 0
          anim.startedAt = timestamp
          if (anim.loopCount > 0) anim.loopCount--
          if (anim.reverse) {
            anim.properties.forEach(p => {
              const tmp = p.from
              p.from = p.to
              p.to = tmp
            })
          }
        } else {
          anim.state = 'completed'
          anim.onComplete?.()
        }
      }
    }
  }

  /** 获取动画 */
  getAnimation(animationId: string): AnimationEntry | undefined {
    return this.animations.get(animationId)
  }

  /** 获取所有动画 */
  getAllAnimations(): AnimationEntry[] {
    return [...this.animations.values()]
  }

  // ---- 统计与配置 ----

  /** 获取渲染统计 */
  getStats(): RenderStats {
    return { ...this.stats }
  }

  /** 重置统计 */
  resetStats(): void {
    this.stats = this.createEmptyStats()
    this.frameTimes = []
  }

  /** 更新管线配置 */
  updateConfig(partial: Partial<RenderPipelineConfig>): void {
    this.config = { ...this.config, ...partial }
  }

  /** 获取当前配置 */
  getConfig(): RenderPipelineConfig {
    return { ...this.config }
  }

  // ---- 内部方法 ----

  private createEmptyStats(): RenderStats {
    return {
      totalFrames: 0,
      currentFPS: 0,
      averageFPS: 0,
      minFPS: 0,
      maxFPS: 0,
      skippedFrames: 0,
      averageFrameTime: 0,
      phaseTimings: {
        prepare: 0,
        layout: 0,
        paint: 0,
        composite: 0,
        animate: 0,
      },
      rendererTimings: {},
      lastRenderAt: null,
    }
  }
}

/** 全局单例 */
export const sceneRenderer = new SceneRenderer()