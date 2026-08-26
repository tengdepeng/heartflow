// ============================================================
// 数据可视化 · Canvas 2D 渲染管线（P16-12）
// 渲染上下文管理、图层系统、帧调度、绘制命令队列
// ============================================================

import { ref, computed } from 'vue'

// ============================================================
// 类型定义
// ============================================================

/** 渲染上下文配置 */
export interface CanvasContextConfig {
  /** Canvas 宽度 */
  width: number
  /** Canvas 高度 */
  height: number
  /** 设备像素比 */
  devicePixelRatio: number
  /** 是否启用抗锯齿 */
  antialias: boolean
  /** 背景色 */
  backgroundColor: string
  /** 是否透明背景 */
  transparent: boolean
}

/** 图层类型 */
export type LayerType = 'background' | 'grid' | 'data' | 'annotation' | 'overlay' | 'custom'

/** 图层配置 */
export interface LayerConfig {
  /** 图层 ID */
  id: string
  /** 图层名称 */
  name: string
  /** 图层类型 */
  type: LayerType
  /** 图层 z-index（越大越靠前） */
  zIndex: number
  /** 是否可见 */
  visible: boolean
  /** 图层不透明度 (0-1) */
  opacity: number
  /** 混合模式 */
  blendMode: GlobalCompositeOperation
  /** 裁剪区域（可选） */
  clipRegion?: { x: number; y: number; width: number; height: number }
  /** 自定义元数据 */
  metadata?: Record<string, unknown>
}

/** 绘制命令类型 */
export type DrawCommandType =
  | 'rect'
  | 'circle'
  | 'line'
  | 'path'
  | 'text'
  | 'image'
  | 'arc'
  | 'polygon'
  | 'bezier'
  | 'clear'

/** 绘制命令 */
export interface DrawCommand {
  id: string
  /** 命令类型 */
  type: DrawCommandType
  /** 所属图层 ID */
  layerId: string
  /** 绘制参数 */
  params: Record<string, unknown>
  /** 绘制顺序（同图层内） */
  order: number
  /** 是否启用 */
  enabled: boolean
}

/** 视图变换 */
export interface CanvasViewTransform {
  translateX: number
  translateY: number
  scale: number
  rotation: number
}

/** 渲染统计 */
export interface RenderStats {
  /** 帧数 */
  frameCount: number
  /** 上一帧耗时 (ms) */
  lastFrameTime: number
  /** 平均帧耗时 (ms) */
  averageFrameTime: number
  /** 当前 FPS */
  fps: number
  /** 总绘制命令数 */
  totalCommands: number
  /** 可见图层数 */
  visibleLayers: number
  /** 脏区域数量 */
  dirtyRegionCount: number
}

/** 脏区域 */
export interface DirtyRegion {
  x: number
  y: number
  width: number
  height: number
}

/** 帧调度模式 */
export type FrameScheduleMode = 'continuous' | 'on-demand' | 'throttled'

/** 帧调度配置 */
export interface FrameScheduleConfig {
  /** 调度模式 */
  mode: FrameScheduleMode
  /** 目标 FPS（throttled 模式） */
  targetFps: number
  /** 最大帧预算 (ms) */
  maxFrameBudget: number
  /** 是否启用脏区域优化 */
  dirtyRegionOptimization: boolean
}

/** 渲染管线状态 */
export interface CanvasRendererState {
  layers: LayerConfig[]
  commands: DrawCommand[]
  viewTransform: CanvasViewTransform
  stats: RenderStats
  isRunning: boolean
  dirtyRegions: DirtyRegion[]
}

// ============================================================
// 默认配置
// ============================================================

export const DEFAULT_CANVAS_CONTEXT_CONFIG: CanvasContextConfig = {
  width: 800,
  height: 600,
  devicePixelRatio: 2,
  antialias: true,
  backgroundColor: '#1a1612',
  transparent: false,
}

export const DEFAULT_FRAME_SCHEDULE_CONFIG: FrameScheduleConfig = {
  mode: 'on-demand',
  targetFps: 60,
  maxFrameBudget: 16,
  dirtyRegionOptimization: true,
}

export const DEFAULT_VIEW_TRANSFORM: CanvasViewTransform = {
  translateX: 0,
  translateY: 0,
  scale: 1,
  rotation: 0,
}

// ============================================================
// 图层预设
// ============================================================

export const PRESET_LAYERS: Record<LayerType, Omit<LayerConfig, 'id' | 'name'>> = {
  background: { type: 'background', zIndex: 0, visible: true, opacity: 1, blendMode: 'source-over' },
  grid: { type: 'grid', zIndex: 10, visible: true, opacity: 0.5, blendMode: 'source-over' },
  data: { type: 'data', zIndex: 20, visible: true, opacity: 1, blendMode: 'source-over' },
  annotation: { type: 'annotation', zIndex: 30, visible: true, opacity: 1, blendMode: 'source-over' },
  overlay: { type: 'overlay', zIndex: 40, visible: true, opacity: 1, blendMode: 'source-over' },
  custom: { type: 'custom', zIndex: 50, visible: true, opacity: 1, blendMode: 'source-over' },
}

// ============================================================
// 工具函数
// ============================================================

let cmdIdCounter = 0
function generateCmdId(): string {
  return `cmd_${Date.now().toString(36)}_${(cmdIdCounter++).toString(36)}`
}

let layerIdCounter = 0
function generateLayerId(): string {
  return `layer_${Date.now().toString(36)}_${(layerIdCounter++).toString(36)}`
}

/** 限制值在范围内 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

// ============================================================
// 绘制命令执行器
// ============================================================

/** 在 Canvas 2D 上下文上执行单个绘制命令 */
function executeDrawCommand(ctx: CanvasRenderingContext2D, command: DrawCommand): void {
  if (!command.enabled) return

  const p = command.params

  switch (command.type) {
    case 'rect': {
      const { x, y, width, height, fill, stroke, strokeWidth, rx, ry } = p as Record<string, number | string | undefined>
      ctx.beginPath()
      if (rx !== undefined && ry !== undefined) {
        roundRect(ctx, x as number, y as number, width as number, height as number, rx as number, ry as number)
      } else {
        ctx.rect(x as number, y as number, width as number, height as number)
      }
      if (fill !== undefined) {
        ctx.fillStyle = fill as string
        ctx.fill()
      }
      if (stroke !== undefined) {
        ctx.strokeStyle = stroke as string
        ctx.lineWidth = (strokeWidth as number) ?? 1
        ctx.stroke()
      }
      break
    }

    case 'circle': {
      const { cx, cy, radius, fill, stroke, strokeWidth } = p as Record<string, number | string | undefined>
      ctx.beginPath()
      ctx.arc(cx as number, cy as number, radius as number, 0, Math.PI * 2)
      if (fill !== undefined) {
        ctx.fillStyle = fill as string
        ctx.fill()
      }
      if (stroke !== undefined) {
        ctx.strokeStyle = stroke as string
        ctx.lineWidth = (strokeWidth as number) ?? 1
        ctx.stroke()
      }
      break
    }

    case 'line': {
      const { x1, y1, x2, y2, stroke, strokeWidth, dashArray, lineCap } = p as Record<string, number | string | number[] | undefined>
      ctx.beginPath()
      ctx.moveTo(x1 as number, y1 as number)
      ctx.lineTo(x2 as number, y2 as number)
      if (dashArray) {
        ctx.setLineDash(dashArray as number[])
      }
      ctx.strokeStyle = stroke as string
      ctx.lineWidth = (strokeWidth as number) ?? 1
      ctx.lineCap = (lineCap as CanvasLineCap) ?? 'butt'
      ctx.stroke()
      ctx.setLineDash([])
      break
    }

    case 'path': {
      const { points, fill, stroke, strokeWidth, closePath } = p as Record<string, unknown>
      if (!Array.isArray(points) || points.length < 2) return
      ctx.beginPath()
      ctx.moveTo((points[0] as { x: number; y: number }).x, (points[0] as { x: number; y: number }).y)
      for (let i = 1; i < (points as Array<{ x: number; y: number }>).length; i++) {
        ctx.lineTo((points as Array<{ x: number; y: number }>)[i].x, (points as Array<{ x: number; y: number }>)[i].y)
      }
      if (closePath) ctx.closePath()
      if (fill !== undefined) {
        ctx.fillStyle = fill as string
        ctx.fill()
      }
      if (stroke !== undefined) {
        ctx.strokeStyle = stroke as string
        ctx.lineWidth = (strokeWidth as number) ?? 1
        ctx.stroke()
      }
      break
    }

    case 'text': {
      const { text, x, y, fill, font, fontSize, textAlign, textBaseline, maxWidth } = p as Record<string, number | string | undefined>
      if (font) ctx.font = font as string
      if (fontSize) ctx.font = `${fontSize as number}px sans-serif`
      ctx.fillStyle = (fill as string) ?? '#ffffff'
      ctx.textAlign = (textAlign as CanvasTextAlign) ?? 'start'
      ctx.textBaseline = (textBaseline as CanvasTextBaseline) ?? 'alphabetic'
      ctx.fillText(text as string, x as number, y as number, maxWidth as number | undefined)
      break
    }

    case 'arc': {
      const { cx, cy, radius, startAngle, endAngle, counterclockwise, fill, stroke, strokeWidth } = p as Record<string, number | string | boolean | undefined>
      ctx.beginPath()
      ctx.arc(
        cx as number, cy as number, radius as number,
        (startAngle as number) ?? 0, (endAngle as number) ?? Math.PI * 2,
        (counterclockwise as boolean) ?? false,
      )
      if (fill !== undefined) {
        ctx.fillStyle = fill as string
        ctx.fill()
      }
      if (stroke !== undefined) {
        ctx.strokeStyle = stroke as string
        ctx.lineWidth = (strokeWidth as number) ?? 1
        ctx.stroke()
      }
      break
    }

    case 'polygon': {
      const { points, fill, stroke, strokeWidth } = p as Record<string, unknown>
      if (!Array.isArray(points) || points.length < 3) return
      ctx.beginPath()
      ctx.moveTo((points[0] as { x: number; y: number }).x, (points[0] as { x: number; y: number }).y)
      for (let i = 1; i < (points as Array<{ x: number; y: number }>).length; i++) {
        ctx.lineTo((points as Array<{ x: number; y: number }>)[i].x, (points as Array<{ x: number; y: number }>)[i].y)
      }
      ctx.closePath()
      if (fill !== undefined) {
        ctx.fillStyle = fill as string
        ctx.fill()
      }
      if (stroke !== undefined) {
        ctx.strokeStyle = stroke as string
        ctx.lineWidth = (strokeWidth as number) ?? 1
        ctx.stroke()
      }
      break
    }

    case 'bezier': {
      const { x1, y1, cp1x, cp1y, cp2x, cp2y, x2, y2, stroke, strokeWidth } = p as Record<string, number | string | undefined>
      ctx.beginPath()
      ctx.moveTo(x1 as number, y1 as number)
      ctx.bezierCurveTo(cp1x as number, cp1y as number, cp2x as number, cp2y as number, x2 as number, y2 as number)
      ctx.strokeStyle = stroke as string
      ctx.lineWidth = (strokeWidth as number) ?? 1
      ctx.stroke()
      break
    }

    case 'clear': {
      const { x, y, width, height } = p as Record<string, number>
      ctx.clearRect(x ?? 0, y ?? 0, width, height)
      break
    }
  }
}

/** 圆角矩形辅助函数 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  rx: number, ry: number,
): void {
  ctx.moveTo(x + rx, y)
  ctx.lineTo(x + w - rx, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + rx)
  ctx.lineTo(x + w, y + h - ry)
  ctx.quadraticCurveTo(x + w, y + h, x + w - rx, y + h)
  ctx.lineTo(x + rx, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - ry)
  ctx.lineTo(x, y + rx)
  ctx.quadraticCurveTo(x, y, x + rx, y)
  ctx.closePath()
}

// ============================================================
// Canvas 2D 渲染管线 Composable
// ============================================================

export function useCanvasRenderer() {
  // ---- 配置 ----
  const contextConfig = ref<CanvasContextConfig>({ ...DEFAULT_CANVAS_CONTEXT_CONFIG })
  const scheduleConfig = ref<FrameScheduleConfig>({ ...DEFAULT_FRAME_SCHEDULE_CONFIG })

  // ---- 状态 ----
  const layers = ref<LayerConfig[]>([])
  const commands = ref<DrawCommand[]>([])
  const viewTransform = ref<CanvasViewTransform>({ ...DEFAULT_VIEW_TRANSFORM })
  const isRunning = ref(false)
  const dirtyRegions = ref<DirtyRegion[]>([])

  // ---- 渲染统计 ----
  const stats = ref<RenderStats>({
    frameCount: 0,
    lastFrameTime: 0,
    averageFrameTime: 0,
    fps: 0,
    totalCommands: 0,
    visibleLayers: 0,
    dirtyRegionCount: 0,
  })

  // ---- 内部状态 ----
  let canvasCtx: CanvasRenderingContext2D | null = null
  let animationFrameId: number | null = null
  let frameTimeHistory: number[] = []
  let lastFpsUpdate = 0
  let fpsFrameCount = 0

  // ---- 派生状态 ----

  const sortedLayers = computed(() =>
    [...layers.value].sort((a, b) => a.zIndex - b.zIndex),
  )

  const visibleLayers = computed(() =>
    sortedLayers.value.filter(l => l.visible),
  )

  const sortedCommands = computed(() =>
    [...commands.value].sort((a, b) => a.order - b.order),
  )

  const commandsByLayer = computed(() => {
    const map: Record<string, DrawCommand[]> = {}
    for (const cmd of commands.value) {
      if (!map[cmd.layerId]) map[cmd.layerId] = []
      map[cmd.layerId].push(cmd)
    }
    return map
  })

  // ============================================================
  // Canvas 上下文管理
  // ============================================================

  /** 绑定 Canvas 元素 */
  function bindCanvas(canvas: HTMLCanvasElement): void {
    const dpr = contextConfig.value.devicePixelRatio
    const width = contextConfig.value.width
    const height = contextConfig.value.height

    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    const ctx = canvas.getContext('2d', {
      alpha: contextConfig.value.transparent,
    }) as CanvasRenderingContext2D | null

    if (!ctx) {
      throw new Error('无法获取 Canvas 2D 渲染上下文')
    }

    ctx.scale(dpr, dpr)
    canvasCtx = ctx
  }

  /** 解绑 Canvas */
  function unbindCanvas(): void {
    stopRendering()
    canvasCtx = null
  }

  /** 获取 Canvas 上下文 */
  function getContext(): CanvasRenderingContext2D | null {
    return canvasCtx
  }

  // ============================================================
  // 图层管理
  // ============================================================

  /** 创建图层 */
  function createLayer(
    name: string,
    type: LayerType = 'custom',
    options?: Partial<Omit<LayerConfig, 'id' | 'name' | 'type'>>,
  ): LayerConfig {
    const preset = PRESET_LAYERS[type]
    const layer: LayerConfig = {
      id: generateLayerId(),
      name,
      type,
      zIndex: options?.zIndex ?? preset.zIndex,
      visible: options?.visible ?? preset.visible,
      opacity: options?.opacity ?? preset.opacity,
      blendMode: options?.blendMode ?? preset.blendMode,
      clipRegion: options?.clipRegion,
      metadata: options?.metadata,
    }
    layers.value = [...layers.value, layer]
    return layer
  }

  /** 删除图层 */
  function removeLayer(layerId: string): boolean {
    const idx = layers.value.findIndex(l => l.id === layerId)
    if (idx === -1) return false
    layers.value = layers.value.filter(l => l.id !== layerId)
    // 同时删除该图层的所有命令
    commands.value = commands.value.filter(c => c.layerId !== layerId)
    return true
  }

  /** 更新图层 */
  function updateLayer(layerId: string, partial: Partial<LayerConfig>): LayerConfig | null {
    const idx = layers.value.findIndex(l => l.id === layerId)
    if (idx === -1) return null
    const updated = { ...layers.value[idx], ...partial }
    layers.value = [
      ...layers.value.slice(0, idx),
      updated,
      ...layers.value.slice(idx + 1),
    ]
    return updated
  }

  /** 设置图层可见性 */
  function setLayerVisible(layerId: string, visible: boolean): boolean {
    return updateLayer(layerId, { visible }) !== null
  }

  /** 设置图层不透明度 */
  function setLayerOpacity(layerId: string, opacity: number): boolean {
    return updateLayer(layerId, { opacity: clamp(opacity, 0, 1) }) !== null
  }

  /** 设置图层 z-index */
  function setLayerZIndex(layerId: string, zIndex: number): boolean {
    return updateLayer(layerId, { zIndex }) !== null
  }

  /** 获取图层 */
  function getLayer(layerId: string): LayerConfig | undefined {
    return layers.value.find(l => l.id === layerId)
  }

  /** 获取指定类型的图层 */
  function getLayersByType(type: LayerType): LayerConfig[] {
    return layers.value.filter(l => l.type === type)
  }

  /** 清空所有图层 */
  function clearLayers(): void {
    layers.value = []
    commands.value = []
  }

  // ============================================================
  // 绘制命令管理
  // ============================================================

  /** 添加绘制命令 */
  function addCommand(
    type: DrawCommandType,
    layerId: string,
    params: Record<string, unknown>,
    options?: Partial<Pick<DrawCommand, 'order' | 'enabled'>>,
  ): DrawCommand {
    const command: DrawCommand = {
      id: generateCmdId(),
      type,
      layerId,
      params,
      order: options?.order ?? commands.value.length,
      enabled: options?.enabled ?? true,
    }
    commands.value = [...commands.value, command]
    markDirty()
    return command
  }

  /** 批量添加绘制命令 */
  function addCommands(cmds: Array<{ type: DrawCommandType; layerId: string; params: Record<string, unknown>; order?: number }>): DrawCommand[] {
    const newCommands = cmds.map(c => ({
      id: generateCmdId(),
      type: c.type,
      layerId: c.layerId,
      params: c.params,
      order: c.order ?? commands.value.length,
      enabled: true,
    }))
    commands.value = [...commands.value, ...newCommands]
    markDirty()
    return newCommands
  }

  /** 移除绘制命令 */
  function removeCommand(commandId: string): boolean {
    const idx = commands.value.findIndex(c => c.id === commandId)
    if (idx === -1) return false
    commands.value = commands.value.filter(c => c.id !== commandId)
    markDirty()
    return true
  }

  /** 更新绘制命令 */
  function updateCommand(
    commandId: string,
    partial: Partial<Pick<DrawCommand, 'params' | 'order' | 'enabled'>>,
  ): DrawCommand | null {
    const idx = commands.value.findIndex(c => c.id === commandId)
    if (idx === -1) return null
    const updated = { ...commands.value[idx], ...partial }
    commands.value = [
      ...commands.value.slice(0, idx),
      updated,
      ...commands.value.slice(idx + 1),
    ]
    markDirty()
    return updated
  }

  /** 启用/禁用命令 */
  function setCommandEnabled(commandId: string, enabled: boolean): boolean {
    return updateCommand(commandId, { enabled }) !== null
  }

  /** 获取命令 */
  function getCommand(commandId: string): DrawCommand | undefined {
    return commands.value.find(c => c.id === commandId)
  }

  /** 获取图层中的所有命令 */
  function getCommandsForLayer(layerId: string): DrawCommand[] {
    return commands.value.filter(c => c.layerId === layerId)
  }

  /** 清空图层命令 */
  function clearLayerCommands(layerId: string): number {
    const before = commands.value.length
    commands.value = commands.value.filter(c => c.layerId !== layerId)
    markDirty()
    return before - commands.value.length
  }

  // ============================================================
  // 视图变换
  // ============================================================

  /** 设置视图变换 */
  function setViewTransform(transform: Partial<CanvasViewTransform>): void {
    viewTransform.value = { ...viewTransform.value, ...transform }
    markDirty()
  }

  /** 缩放视图 */
  function zoom(factor: number, centerX?: number, centerY?: number): void {
    const newScale = clamp(viewTransform.value.scale * factor, 0.1, 10)
    if (centerX !== undefined && centerY !== undefined) {
      const ratio = newScale / viewTransform.value.scale
      viewTransform.value = {
        ...viewTransform.value,
        scale: newScale,
        translateX: centerX - ratio * (centerX - viewTransform.value.translateX),
        translateY: centerY - ratio * (centerY - viewTransform.value.translateY),
      }
    } else {
      viewTransform.value = { ...viewTransform.value, scale: newScale }
    }
    markDirty()
  }

  /** 平移视图 */
  function pan(dx: number, dy: number): void {
    viewTransform.value = {
      ...viewTransform.value,
      translateX: viewTransform.value.translateX + dx,
      translateY: viewTransform.value.translateY + dy,
    }
    markDirty()
  }

  /** 重置视图变换 */
  function resetViewTransform(): void {
    viewTransform.value = { ...DEFAULT_VIEW_TRANSFORM }
    markDirty()
  }

  // ============================================================
  // 脏区域管理
  // ============================================================

  /** 标记整个画布为脏 */
  function markDirty(region?: DirtyRegion): void {
    if (region) {
      dirtyRegions.value = [...dirtyRegions.value, region]
    } else {
      dirtyRegions.value = [{
        x: 0, y: 0,
        width: contextConfig.value.width,
        height: contextConfig.value.height,
      }]
    }
  }

  /** 清除脏区域 */
  function clearDirtyRegions(): void {
    dirtyRegions.value = []
  }

  // ============================================================
  // 渲染管线
  // ============================================================

  /** 渲染单帧 */
  function renderFrame(): void {
    if (!canvasCtx) return

    const ctx = canvasCtx
    const startTime = performance.now()

    // 应用视图变换
    ctx.save()
    const { translateX, translateY, scale, rotation } = viewTransform.value
    ctx.translate(translateX, translateY)
    ctx.scale(scale, scale)
    if (rotation !== 0) {
      ctx.rotate(rotation * Math.PI / 180)
    }

    // 绘制背景
    if (!contextConfig.value.transparent) {
      ctx.fillStyle = contextConfig.value.backgroundColor
      ctx.fillRect(
        -translateX / scale,
        -translateY / scale,
        contextConfig.value.width / scale,
        contextConfig.value.height / scale,
      )
    }

    // 按图层顺序渲染
    const visLayers = visibleLayers.value
    for (const layer of visLayers) {
      ctx.save()

      // 设置图层属性
      ctx.globalAlpha = layer.opacity
      ctx.globalCompositeOperation = layer.blendMode

      // 裁剪区域
      if (layer.clipRegion) {
        ctx.beginPath()
        ctx.rect(layer.clipRegion.x, layer.clipRegion.y, layer.clipRegion.width, layer.clipRegion.height)
        ctx.clip()
      }

      // 执行该图层的命令
      const layerCommands = sortedCommands.value
        .filter(c => c.layerId === layer.id && c.enabled)
        .sort((a, b) => a.order - b.order)

      for (const cmd of layerCommands) {
        executeDrawCommand(ctx, cmd)
      }

      ctx.restore()
    }

    ctx.restore()

    // 更新统计
    const endTime = performance.now()
    const frameTime = endTime - startTime

    frameTimeHistory.push(frameTime)
    if (frameTimeHistory.length > 60) frameTimeHistory.shift()

    fpsFrameCount++
    const now = performance.now()
    if (now - lastFpsUpdate >= 1000) {
      stats.value = {
        ...stats.value,
        fps: Math.round(fpsFrameCount / ((now - lastFpsUpdate) / 1000)),
      }
      fpsFrameCount = 0
      lastFpsUpdate = now
    }

    stats.value = {
      frameCount: stats.value.frameCount + 1,
      lastFrameTime: frameTime,
      averageFrameTime: Math.round(
        frameTimeHistory.reduce((a, b) => a + b, 0) / frameTimeHistory.length,
      ),
      fps: stats.value.fps,
      totalCommands: commands.value.length,
      visibleLayers: visLayers.length,
      dirtyRegionCount: dirtyRegions.value.length,
    }

    clearDirtyRegions()
  }

  /** 开始持续渲染 */
  function startRendering(): void {
    if (isRunning.value) return
    isRunning.value = true

    const scheduleMode = scheduleConfig.value.mode
    if (scheduleMode === 'continuous') {
      const loop = (): void => {
        if (!isRunning.value) return
        renderFrame()
        animationFrameId = requestAnimationFrame(loop)
      }
      animationFrameId = requestAnimationFrame(loop)
    }
  }

  /** 停止渲染 */
  function stopRendering(): void {
    isRunning.value = false
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
  }

  /** 按需渲染（单帧） */
  function requestFrame(): void {
    if (scheduleConfig.value.mode === 'continuous') return
    renderFrame()
  }

  /** 请求渲染帧（节流模式） */
  function requestThrottledFrame(): void {
    if (scheduleConfig.value.mode !== 'throttled') {
      requestFrame()
      return
    }

    const targetInterval = 1000 / scheduleConfig.value.targetFps
    const now = performance.now()
    const lastFrameStart = frameTimeHistory.length > 0
      ? now - stats.value.lastFrameTime
      : Infinity

    if (lastFrameStart >= targetInterval) {
      requestFrame()
    } else {
      // 延迟渲染
      setTimeout(() => requestFrame(), targetInterval - lastFrameStart)
    }
  }

  // ============================================================
  // 便捷绘制方法
  // ============================================================

  /** 绘制矩形 */
  function drawRect(
    layerId: string,
    x: number, y: number, width: number, height: number,
    options?: { fill?: string; stroke?: string; strokeWidth?: number; rx?: number; ry?: number },
  ): DrawCommand {
    return addCommand('rect', layerId, { x, y, width, height, ...options })
  }

  /** 绘制圆形 */
  function drawCircle(
    layerId: string,
    cx: number, cy: number, radius: number,
    options?: { fill?: string; stroke?: string; strokeWidth?: number },
  ): DrawCommand {
    return addCommand('circle', layerId, { cx, cy, radius, ...options })
  }

  /** 绘制线段 */
  function drawLine(
    layerId: string,
    x1: number, y1: number, x2: number, y2: number,
    options?: { stroke?: string; strokeWidth?: number; dashArray?: number[]; lineCap?: CanvasLineCap },
  ): DrawCommand {
    return addCommand('line', layerId, { x1, y1, x2, y2, ...options })
  }

  /** 绘制文本 */
  function drawText(
    layerId: string,
    text: string, x: number, y: number,
    options?: { fill?: string; fontSize?: number; font?: string; textAlign?: CanvasTextAlign; textBaseline?: CanvasTextBaseline },
  ): DrawCommand {
    return addCommand('text', layerId, { text, x, y, ...options })
  }

  /** 绘制多边形 */
  function drawPolygon(
    layerId: string,
    points: Array<{ x: number; y: number }>,
    options?: { fill?: string; stroke?: string; strokeWidth?: number },
  ): DrawCommand {
    return addCommand('polygon', layerId, { points, ...options })
  }

  /** 绘制路径 */
  function drawPath(
    layerId: string,
    points: Array<{ x: number; y: number }>,
    options?: { fill?: string; stroke?: string; strokeWidth?: number; closePath?: boolean },
  ): DrawCommand {
    return addCommand('path', layerId, { points, ...options })
  }

  /** 绘制弧线 */
  function drawArc(
    layerId: string,
    cx: number, cy: number, radius: number,
    startAngle: number, endAngle: number,
    options?: { fill?: string; stroke?: string; strokeWidth?: number; counterclockwise?: boolean },
  ): DrawCommand {
    return addCommand('arc', layerId, { cx, cy, radius, startAngle, endAngle, ...options })
  }

  /** 绘制贝塞尔曲线 */
  function drawBezier(
    layerId: string,
    x1: number, y1: number,
    cp1x: number, cp1y: number,
    cp2x: number, cp2y: number,
    x2: number, y2: number,
    options?: { stroke?: string; strokeWidth?: number },
  ): DrawCommand {
    return addCommand('bezier', layerId, { x1, y1, cp1x, cp1y, cp2x, cp2y, x2, y2, ...options })
  }

  /** 清除画布区域 */
  function clearArea(
    layerId: string,
    x: number, y: number, width: number, height: number,
  ): DrawCommand {
    return addCommand('clear', layerId, { x, y, width, height })
  }

  // ============================================================
  // 配置管理
  // ============================================================

  /** 更新上下文配置 */
  function updateContextConfig(partial: Partial<CanvasContextConfig>): void {
    contextConfig.value = { ...contextConfig.value, ...partial }
  }

  /** 更新帧调度配置 */
  function updateScheduleConfig(partial: Partial<FrameScheduleConfig>): void {
    scheduleConfig.value = { ...scheduleConfig.value, ...partial }
  }

  /** 初始化预设图层 */
  function initPresetLayers(): LayerConfig[] {
    const created: LayerConfig[] = []
    const types: LayerType[] = ['background', 'grid', 'data', 'annotation', 'overlay']
    for (const type of types) {
      created.push(createLayer(type, type))
    }
    return created
  }

  /** 重置渲染管线 */
  function reset(): void {
    clearLayers()
    clearDirtyRegions()
    stats.value = {
      frameCount: 0,
      lastFrameTime: 0,
      averageFrameTime: 0,
      fps: 0,
      totalCommands: 0,
      visibleLayers: 0,
      dirtyRegionCount: 0,
    }
    resetViewTransform()
    clearDirtyRegions()
  }

  return {
    // 配置
    contextConfig,
    scheduleConfig,
    updateContextConfig,
    updateScheduleConfig,

    // 状态
    layers,
    commands,
    viewTransform,
    isRunning,
    dirtyRegions,
    stats,

    // 派生状态
    sortedLayers,
    visibleLayers,
    sortedCommands,
    commandsByLayer,

    // Canvas 管理
    bindCanvas,
    unbindCanvas,
    getContext,

    // 图层
    createLayer,
    removeLayer,
    updateLayer,
    setLayerVisible,
    setLayerOpacity,
    setLayerZIndex,
    getLayer,
    getLayersByType,
    clearLayers,
    initPresetLayers,

    // 命令
    addCommand,
    addCommands,
    removeCommand,
    updateCommand,
    setCommandEnabled,
    getCommand,
    getCommandsForLayer,
    clearLayerCommands,

    // 视图变换
    setViewTransform,
    zoom,
    pan,
    resetViewTransform,

    // 渲染
    startRendering,
    stopRendering,
    requestFrame,
    requestThrottledFrame,
    renderFrame,
    markDirty,
    clearDirtyRegions,

    // 便捷绘制
    drawRect,
    drawCircle,
    drawLine,
    drawText,
    drawPolygon,
    drawPath,
    drawArc,
    drawBezier,
    clearArea,

    // 生命周期
    reset,

    // 常量
    DEFAULT_CANVAS_CONTEXT_CONFIG,
    DEFAULT_FRAME_SCHEDULE_CONFIG,
    DEFAULT_VIEW_TRANSFORM,
    PRESET_LAYERS,
  }
}