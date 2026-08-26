// ============================================================
// 数据可视化 · 图表交互增强引擎（P15-3）
// 缩放/平移、标注系统、导出引擎、动画过渡、响应式断点
// ============================================================

import { ref, computed } from 'vue'
import type { ChartSize } from './types'

// ============================================================
// 类型定义
// ============================================================

/** 视口变换状态 */
export interface ViewportTransform {
  /** 缩放级别 (0.1 ~ 10) */
  scale: number
  /** X 轴平移偏移（像素） */
  translateX: number
  /** Y 轴平移偏移（像素） */
  translateY: number
}

/** 缩放配置 */
export interface ZoomConfig {
  /** 最小缩放 */
  minScale: number
  /** 最大缩放 */
  maxScale: number
  /** 缩放步长（滚轮每次） */
  step: number
  /** 是否启用平滑缩放 */
  smooth: boolean
  /** 双击缩放倍数 */
  doubleClickScale: number
}

/** 平移配置 */
export interface PanConfig {
  /** 是否启用平移 */
  enabled: boolean
  /** 平移边界限制 */
  bounds?: { minX: number; minY: number; maxX: number; maxY: number }
  /** 惯性滑行阻尼 (0-1) */
  inertia: number
}

/** 标注类型 */
export type AnnotationType = 'text' | 'arrow' | 'rect' | 'circle' | 'line' | 'marker'

/** 标注项 */
export interface Annotation {
  id: string
  type: AnnotationType
  /** 锚点位置（图表坐标） */
  x: number
  y: number
  /** 文本内容（text 类型） */
  text?: string
  /** 颜色 */
  color: string
  /** 字体大小 */
  fontSize?: number
  /** 不透明度 */
  opacity: number
  /** 箭头终点（arrow 类型） */
  endX?: number
  endY?: number
  /** 矩形宽高（rect 类型） */
  width?: number
  height?: number
  /** 圆形半径（circle 类型） */
  radius?: number
  /** 线段终点（line 类型） */
  lineEndX?: number
  lineEndY?: number
  /** 创建时间 */
  createdAt: string
  /** 自定义标签 */
  label?: string
  /** 是否锁定（不可编辑） */
  locked: boolean
  /** 所属分组 */
  group?: string
}

/** 标注样式配置 */
export interface AnnotationStyleConfig {
  defaultColor: string
  defaultFontSize: number
  defaultOpacity: number
  markerSize: number
  arrowHeadSize: number
}

/** 导出格式 */
export type ExportFormat = 'png' | 'svg' | 'jpeg'

/** 导出配置 */
export interface ExportConfig {
  format: ExportFormat
  /** 导出缩放倍率（用于高清导出） */
  scale: number
  /** 背景色 */
  backgroundColor: string
  /** JPEG 质量 (0-1) */
  quality: number
  /** 是否包含标注 */
  includeAnnotations: boolean
  /** 文件名前缀 */
  filenamePrefix: string
}

/** 导出结果 */
export interface ExportResult {
  /** 导出数据（PNG/JPEG 为 data URL，SVG 为字符串） */
  data: string
  /** 文件名 */
  filename: string
  /** 格式 */
  format: ExportFormat
  /** 尺寸 */
  width: number
  height: number
}

/** 动画过渡类型 */
export type TransitionType = 'fade' | 'slide' | 'scale' | 'morph' | 'reveal'

/** 动画配置 */
export interface TransitionConfig {
  /** 过渡类型 */
  type: TransitionType
  /** 持续时间 (ms) */
  duration: number
  /** 缓动函数 */
  easing: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear'
  /** 延迟 (ms) */
  delay: number
  /** 是否交错动画 */
  stagger: boolean
  /** 交错间隔 (ms) */
  staggerDelay: number
}

/** 动画状态 */
export interface TransitionState {
  /** 是否正在过渡 */
  active: boolean
  /** 当前进度 (0-1) */
  progress: number
  /** 过渡类型 */
  type: TransitionType
  /** 开始时间 */
  startedAt: number | null
}

/** 响应式断点 */
export interface ResponsiveBreakpoint {
  name: string
  minWidth: number
  maxWidth: number
  /** 该断点下的图表尺寸缩放比例 */
  scaleFactor: number
  /** 该断点下的字体缩放比例 */
  fontSizeScale: number
  /** 是否简化标注 */
  simplifyAnnotations: boolean
  /** 是否隐藏网格 */
  hideGrid: boolean
  /** 是否减少刻度 */
  reduceTicks: boolean
}

/** 响应式配置 */
export interface ResponsiveConfig {
  /** 是否启用响应式 */
  enabled: boolean
  /** 断点列表 */
  breakpoints: ResponsiveBreakpoint[]
  /** 容器最小宽度 */
  minWidth: number
  /** 容器最小高度 */
  minHeight: number
  /** 是否保持宽高比 */
  maintainAspectRatio: boolean
  /** 宽高比 */
  aspectRatio: number
}

/** 图表交互引擎状态 */
export interface ChartInteractionState {
  viewport: ViewportTransform
  annotations: Annotation[]
  zoomConfig: ZoomConfig
  panConfig: PanConfig
  exportConfig: ExportConfig
  transitionConfig: TransitionConfig
  transitionState: TransitionState
  responsiveConfig: ResponsiveConfig
  currentBreakpoint: string | null
}

// ============================================================
// 默认配置
// ============================================================

export const DEFAULT_ZOOM_CONFIG: ZoomConfig = {
  minScale: 0.1,
  maxScale: 10,
  step: 0.1,
  smooth: true,
  doubleClickScale: 2,
}

export const DEFAULT_PAN_CONFIG: PanConfig = {
  enabled: true,
  inertia: 0.92,
}

export const DEFAULT_ANNOTATION_STYLE: AnnotationStyleConfig = {
  defaultColor: '#f0d6b0',
  defaultFontSize: 13,
  defaultOpacity: 0.9,
  markerSize: 8,
  arrowHeadSize: 8,
}

export const DEFAULT_EXPORT_CONFIG: ExportConfig = {
  format: 'png',
  scale: 2,
  backgroundColor: '#1a1612',
  quality: 0.95,
  includeAnnotations: true,
  filenamePrefix: 'chart',
}

export const DEFAULT_TRANSITION_CONFIG: TransitionConfig = {
  type: 'fade',
  duration: 400,
  easing: 'ease-in-out',
  delay: 0,
  stagger: false,
  staggerDelay: 50,
}

/** 预设响应式断点 */
export const PRESET_BREAKPOINTS: ResponsiveBreakpoint[] = [
  {
    name: 'mobile',
    minWidth: 0,
    maxWidth: 639,
    scaleFactor: 0.6,
    fontSizeScale: 0.75,
    simplifyAnnotations: true,
    hideGrid: true,
    reduceTicks: true,
  },
  {
    name: 'tablet',
    minWidth: 640,
    maxWidth: 1023,
    scaleFactor: 0.8,
    fontSizeScale: 0.85,
    simplifyAnnotations: false,
    hideGrid: false,
    reduceTicks: true,
  },
  {
    name: 'desktop',
    minWidth: 1024,
    maxWidth: 1599,
    scaleFactor: 1.0,
    fontSizeScale: 1.0,
    simplifyAnnotations: false,
    hideGrid: false,
    reduceTicks: false,
  },
  {
    name: 'wide',
    minWidth: 1600,
    maxWidth: Infinity,
    scaleFactor: 1.0,
    fontSizeScale: 1.1,
    simplifyAnnotations: false,
    hideGrid: false,
    reduceTicks: false,
  },
]

export const DEFAULT_RESPONSIVE_CONFIG: ResponsiveConfig = {
  enabled: true,
  breakpoints: PRESET_BREAKPOINTS,
  minWidth: 200,
  minHeight: 150,
  maintainAspectRatio: true,
  aspectRatio: 16 / 9,
}

// ============================================================
// 工具函数
// ============================================================

/** 生成唯一 ID */
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

/** 限制值在范围内 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** 缓动函数映射 */
const EASING_FUNCTIONS: Record<TransitionConfig['easing'], (t: number) => number> = {
  'ease': (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  'ease-in': (t: number) => t * t,
  'ease-out': (t: number) => t * (2 - t),
  'ease-in-out': (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  'linear': (t: number) => t,
}

// ============================================================
// 图表交互引擎 Composable
// ============================================================

export function useChartInteraction() {
  // ---- 视口状态 ----
  const viewport = ref<ViewportTransform>({
    scale: 1,
    translateX: 0,
    translateY: 0,
  })

  // ---- 缩放配置 ----
  const zoomConfig = ref<ZoomConfig>({ ...DEFAULT_ZOOM_CONFIG })

  // ---- 平移配置 ----
  const panConfig = ref<PanConfig>({ ...DEFAULT_PAN_CONFIG })

  // ---- 标注列表 ----
  const annotations = ref<Annotation[]>([])

  // ---- 标注样式 ----
  const annotationStyle = ref<AnnotationStyleConfig>({ ...DEFAULT_ANNOTATION_STYLE })

  // ---- 导出配置 ----
  const exportConfig = ref<ExportConfig>({ ...DEFAULT_EXPORT_CONFIG })

  // ---- 动画配置 ----
  const transitionConfig = ref<TransitionConfig>({ ...DEFAULT_TRANSITION_CONFIG })

  // ---- 动画状态 ----
  const transitionState = ref<TransitionState>({
    active: false,
    progress: 0,
    type: 'fade',
    startedAt: null,
  })

  // ---- 响应式配置 ----
  const responsiveConfig = ref<ResponsiveConfig>({ ...DEFAULT_RESPONSIVE_CONFIG })

  // ---- 当前断点 ----
  const currentBreakpoint = ref<string | null>(null)

  // ---- 拖拽状态（内部） ----
  let isDragging = false
  let dragStartX = 0
  let dragStartY = 0
  let dragStartTranslateX = 0
  let dragStartTranslateY = 0
  let velocityX = 0
  let velocityY = 0
  let lastDragTime = 0
  let inertiaAnimationId: number | null = null

  // ---- 动画帧 ID（内部） ----
  let transitionAnimationId: number | null = null

  // ============================================================
  // 缩放控制
  // ============================================================

  /** 按步长缩放 */
  function zoomIn(step?: number): void {
    const s = step ?? zoomConfig.value.step
    setScale(viewport.value.scale + s)
  }

  function zoomOut(step?: number): void {
    const s = step ?? zoomConfig.value.step
    setScale(viewport.value.scale - s)
  }

  /** 设置缩放级别 */
  function setScale(scale: number, originX?: number, originY?: number): void {
    const newScale = clamp(scale, zoomConfig.value.minScale, zoomConfig.value.maxScale)

    if (originX !== undefined && originY !== undefined) {
      // 以指定点为中心缩放
      const ratio = newScale / viewport.value.scale
      viewport.value = {
        scale: newScale,
        translateX: originX - ratio * (originX - viewport.value.translateX),
        translateY: originY - ratio * (originY - viewport.value.translateY),
      }
    } else {
      viewport.value = {
        ...viewport.value,
        scale: newScale,
      }
    }
  }

  /** 处理滚轮缩放 */
  function handleWheel(event: WheelEvent, containerRect: DOMRect): void {
    const delta = -event.deltaY * 0.001
    const newScale = clamp(
      viewport.value.scale + delta * zoomConfig.value.step * 10,
      zoomConfig.value.minScale,
      zoomConfig.value.maxScale,
    )

    // 鼠标相对容器位置
    const originX = event.clientX - containerRect.left
    const originY = event.clientY - containerRect.top

    setScale(newScale, originX, originY)
  }

  /** 双击缩放 */
  function handleDoubleClick(clientX: number, clientY: number, containerRect: DOMRect): void {
    const isZoomed = viewport.value.scale > 1.05
    const targetScale = isZoomed ? 1 : zoomConfig.value.doubleClickScale

    const originX = clientX - containerRect.left
    const originY = clientY - containerRect.top

    setScale(targetScale, originX, originY)
  }

  /** 适应视图 */
  function fitToView(chartWidth: number, chartHeight: number, containerWidth: number, containerHeight: number): void {
    const scaleX = containerWidth / chartWidth
    const scaleY = containerHeight / chartHeight
    const fitScale = Math.min(scaleX, scaleY, zoomConfig.value.maxScale)

    viewport.value = {
      scale: fitScale,
      translateX: (containerWidth - chartWidth * fitScale) / 2,
      translateY: (containerHeight - chartHeight * fitScale) / 2,
    }
  }

  /** 重置视图 */
  function resetView(): void {
    cancelInertia()
    viewport.value = {
      scale: 1,
      translateX: 0,
      translateY: 0,
    }
  }

  // ============================================================
  // 平移控制
  // ============================================================

  /** 开始拖拽 */
  function startPan(clientX: number, clientY: number): void {
    if (!panConfig.value.enabled) return

    cancelInertia()
    isDragging = true
    dragStartX = clientX
    dragStartY = clientY
    dragStartTranslateX = viewport.value.translateX
    dragStartTranslateY = viewport.value.translateY
    lastDragTime = Date.now()
    velocityX = 0
    velocityY = 0
  }

  /** 拖拽中 */
  function pan(clientX: number, clientY: number): void {
    if (!isDragging) return

    const now = Date.now()
    const dt = Math.max(now - lastDragTime, 1)
    const dx = clientX - dragStartX
    const dy = clientY - dragStartY

    // 计算速度
    velocityX = (dx - (viewport.value.translateX - dragStartTranslateX)) / dt
    velocityY = (dy - (viewport.value.translateY - dragStartTranslateY)) / dt

    let newTx = dragStartTranslateX + dx
    let newTy = dragStartTranslateY + dy

    // 边界限制
    if (panConfig.value.bounds) {
      const { minX, minY, maxX, maxY } = panConfig.value.bounds
      newTx = clamp(newTx, minX, maxX)
      newTy = clamp(newTy, minY, maxY)
    }

    viewport.value = {
      ...viewport.value,
      translateX: newTx,
      translateY: newTy,
    }

    lastDragTime = now
  }

  /** 结束拖拽 */
  function endPan(): void {
    if (!isDragging) return
    isDragging = false

    // 惯性滑行
    const inertia = panConfig.value.inertia
    if (inertia > 0 && (Math.abs(velocityX) > 0.1 || Math.abs(velocityY) > 0.1)) {
      applyInertia(velocityX * 16, velocityY * 16, inertia)
    }
  }

  /** 惯性滑行动画 */
  function applyInertia(vx: number, vy: number, damping: number): void {
    cancelInertia()

    const step = (): void => {
      const newVx = vx * damping
      const newVy = vy * damping

      // 速度足够小时停止
      if (Math.abs(newVx) < 0.01 && Math.abs(newVy) < 0.01) {
        return
      }

      let newTx = viewport.value.translateX + newVx
      let newTy = viewport.value.translateY + newVy

      if (panConfig.value.bounds) {
        const { minX, minY, maxX, maxY } = panConfig.value.bounds
        newTx = clamp(newTx, minX, maxX)
        newTy = clamp(newTy, minY, maxY)

        // 碰到边界停止
        if (newTx === minX || newTx === maxX) vx = 0
        if (newTy === minY || newTy === maxY) vy = 0
      }

      viewport.value = {
        ...viewport.value,
        translateX: newTx,
        translateY: newTy,
      }

      vx = newVx
      vy = newVy
      inertiaAnimationId = requestAnimationFrame(step)
    }

    inertiaAnimationId = requestAnimationFrame(step)
  }

  /** 取消惯性动画 */
  function cancelInertia(): void {
    if (inertiaAnimationId !== null) {
      cancelAnimationFrame(inertiaAnimationId)
      inertiaAnimationId = null
    }
  }

  /** 是否正在拖拽 */
  const isPanning = computed(() => isDragging)

  // ============================================================
  // 标注系统
  // ============================================================

  /** 添加标注 */
  function addAnnotation(
    type: AnnotationType,
    x: number,
    y: number,
    options?: Partial<Omit<Annotation, 'id' | 'type' | 'x' | 'y' | 'createdAt'>>,
  ): Annotation {
    const annotation: Annotation = {
      id: generateId('anno'),
      type,
      x,
      y,
      color: options?.color ?? annotationStyle.value.defaultColor,
      fontSize: options?.fontSize ?? annotationStyle.value.defaultFontSize,
      opacity: options?.opacity ?? annotationStyle.value.defaultOpacity,
      createdAt: new Date().toISOString(),
      locked: options?.locked ?? false,
      text: options?.text,
      label: options?.label,
      group: options?.group,
      endX: options?.endX,
      endY: options?.endY,
      width: options?.width,
      height: options?.height,
      radius: options?.radius,
      lineEndX: options?.lineEndX,
      lineEndY: options?.lineEndY,
    }

    annotations.value = [...annotations.value, annotation]
    return annotation
  }

  /** 移除标注 */
  function removeAnnotation(id: string): boolean {
    const idx = annotations.value.findIndex(a => a.id === id)
    if (idx === -1) return false
    annotations.value = annotations.value.filter(a => a.id !== id)
    return true
  }

  /** 更新标注 */
  function updateAnnotation(id: string, partial: Partial<Omit<Annotation, 'id' | 'createdAt'>>): Annotation | null {
    const idx = annotations.value.findIndex(a => a.id === id)
    if (idx === -1) return null

    const updated = {
      ...annotations.value[idx],
      ...partial,
    }
    annotations.value = [
      ...annotations.value.slice(0, idx),
      updated,
      ...annotations.value.slice(idx + 1),
    ]
    return updated
  }

  /** 移动标注位置 */
  function moveAnnotation(id: string, x: number, y: number): boolean {
    return updateAnnotation(id, { x, y }) !== null
  }

  /** 获取标注 */
  function getAnnotation(id: string): Annotation | undefined {
    return annotations.value.find(a => a.id === id)
  }

  /** 按分组获取标注 */
  function getAnnotationsByGroup(group: string): Annotation[] {
    return annotations.value.filter(a => a.group === group)
  }

  /** 锁定/解锁标注 */
  function toggleAnnotationLock(id: string): boolean {
    const anno = annotations.value.find(a => a.id === id)
    if (!anno) return false
    updateAnnotation(id, { locked: !anno.locked })
    return !anno.locked
  }

  /** 清空所有标注 */
  function clearAnnotations(): void {
    annotations.value = []
  }

  /** 批量删除标注 */
  function removeAnnotations(ids: string[]): number {
    const before = annotations.value.length
    annotations.value = annotations.value.filter(a => !ids.includes(a.id))
    return before - annotations.value.length
  }

  /** 将标注渲染为 SVG 字符串 */
  function renderAnnotationsAsSvg(): string {
    const parts: string[] = []
    const markerSize = annotationStyle.value.markerSize
    const arrowSize = annotationStyle.value.arrowHeadSize

    for (const anno of annotations.value) {
      const { id, type, x, y, color, opacity, fontSize, text } = anno

      switch (type) {
        case 'text':
          parts.push(
            `<text id="${id}" x="${x}" y="${y}" fill="${color}" opacity="${opacity}" font-size="${fontSize ?? annotationStyle.value.defaultFontSize}" font-family="sans-serif">${text ?? ''}</text>`,
          )
          break

        case 'marker':
          parts.push(
            `<circle id="${id}" cx="${x}" cy="${y}" r="${markerSize}" fill="${color}" opacity="${opacity}" />`,
          )
          if (text) {
            parts.push(
              `<text x="${x}" y="${y - markerSize - 4}" fill="${color}" opacity="${opacity}" font-size="${fontSize ?? annotationStyle.value.defaultFontSize}" text-anchor="middle" font-family="sans-serif">${text}</text>`,
            )
          }
          break

        case 'arrow':
          if (anno.endX !== undefined && anno.endY !== undefined) {
            parts.push(
              `<line id="${id}" x1="${x}" y1="${y}" x2="${anno.endX}" y2="${anno.endY}" stroke="${color}" opacity="${opacity}" stroke-width="1.5" marker-end="url(#arrowhead_${id})" />`,
            )
            parts.push(
              `<defs><marker id="arrowhead_${id}" markerWidth="${arrowSize}" markerHeight="${arrowSize}" refX="${arrowSize}" refY="${arrowSize / 2}" orient="auto"><polygon points="0 0, ${arrowSize} ${arrowSize / 2}, 0 ${arrowSize}" fill="${color}" /></marker></defs>`,
            )
          }
          break

        case 'rect':
          if (anno.width !== undefined && anno.height !== undefined) {
            parts.push(
              `<rect id="${id}" x="${x}" y="${y}" width="${anno.width}" height="${anno.height}" fill="none" stroke="${color}" opacity="${opacity}" stroke-width="1.5" stroke-dasharray="4,3" rx="2" />`,
            )
          }
          break

        case 'circle':
          parts.push(
            `<circle id="${id}" cx="${x}" cy="${y}" r="${anno.radius ?? 20}" fill="none" stroke="${color}" opacity="${opacity}" stroke-width="1.5" stroke-dasharray="4,3" />`,
          )
          break

        case 'line':
          if (anno.lineEndX !== undefined && anno.lineEndY !== undefined) {
            parts.push(
              `<line id="${id}" x1="${x}" y1="${y}" x2="${anno.lineEndX}" y2="${anno.lineEndY}" stroke="${color}" opacity="${opacity}" stroke-width="1.5" />`,
            )
          }
          break
      }

      // 标签
      if (anno.label) {
        parts.push(
          `<text x="${x}" y="${y + 18}" fill="${color}" opacity="0.7" font-size="10" text-anchor="middle" font-family="sans-serif">${anno.label}</text>`,
        )
      }
    }

    return parts.join('')
  }

  /** 标注数量 */
  const annotationCount = computed(() => annotations.value.length)

  /** 未锁定的标注 */
  const unlockedAnnotations = computed(() => annotations.value.filter(a => !a.locked))

  // ============================================================
  // 导出引擎
  // ============================================================

  /** 导出图表为 SVG 字符串 */
  function exportAsSvg(svgElement: SVGSVGElement): string {
    const clone = svgElement.cloneNode(true) as SVGSVGElement

    // 如果包含标注，追加标注
    if (exportConfig.value.includeAnnotations) {
      const annoGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      annoGroup.setAttribute('class', 'chart-annotations')
      annoGroup.innerHTML = renderAnnotationsAsSvg()
      clone.appendChild(annoGroup)
    }

    // 设置背景色
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    bgRect.setAttribute('width', '100%')
    bgRect.setAttribute('height', '100%')
    bgRect.setAttribute('fill', exportConfig.value.backgroundColor)
    clone.insertBefore(bgRect, clone.firstChild)

    const serializer = new XMLSerializer()
    const svgString = serializer.serializeToString(clone)

    return svgString
  }

  /** 导出为数据 URL */
  async function exportAsDataUrl(
    svgElement: SVGSVGElement,
    width: number,
    height: number,
  ): Promise<ExportResult> {
    const format = exportConfig.value.format
    const exportScale = exportConfig.value.scale
    const scaledWidth = width * exportScale
    const scaledHeight = height * exportScale

    const svgString = exportAsSvg(svgElement)

    // 通过 Canvas 渲染
    const canvas = document.createElement('canvas')
    canvas.width = scaledWidth
    canvas.height = scaledHeight
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      throw new Error('无法获取 Canvas 2D 上下文')
    }

    // 填充背景
    ctx.fillStyle = exportConfig.value.backgroundColor
    ctx.fillRect(0, 0, scaledWidth, scaledHeight)

    // 将 SVG 绘制到 Canvas
    const img = new Image()
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)

    return new Promise((resolve, reject) => {
      img.onload = () => {
        ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight)
        URL.revokeObjectURL(url)

        const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png'
        const data = canvas.toDataURL(mimeType, exportConfig.value.quality)

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
        const ext = format === 'jpeg' ? 'jpg' : format
        const filename = `${exportConfig.value.filenamePrefix}_${timestamp}.${ext}`

        resolve({
          data,
          filename,
          format,
          width: scaledWidth,
          height: scaledHeight,
        })
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('SVG 渲染失败'))
      }
      img.src = url
    })
  }

  /** 触发下载 */
  function downloadExport(result: ExportResult): void {
    const link = document.createElement('a')
    link.download = result.filename
    link.href = result.data
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  /** 一键导出并下载 */
  async function exportAndDownload(
    svgElement: SVGSVGElement,
    width: number,
    height: number,
  ): Promise<ExportResult> {
    const result = await exportAsDataUrl(svgElement, width, height)
    downloadExport(result)
    return result
  }

  // ============================================================
  // 动画过渡
  // ============================================================

  /** 开始过渡动画 */
  function startTransition(type?: TransitionType): void {
    cancelTransition()

    if (type) {
      transitionConfig.value = { ...transitionConfig.value, type }
    }

    transitionState.value = {
      active: true,
      progress: 0,
      type: transitionConfig.value.type,
      startedAt: Date.now(),
    }

    const config = transitionConfig.value
    const easingFn = EASING_FUNCTIONS[config.easing]

    const animate = (): void => {
      if (!transitionState.value.active || transitionState.value.startedAt === null) return

      const elapsed = Date.now() - transitionState.value.startedAt
      const rawProgress = Math.min(elapsed / config.duration, 1)
      const easedProgress = easingFn(rawProgress)

      transitionState.value = {
        ...transitionState.value,
        progress: easedProgress,
      }

      if (rawProgress < 1) {
        transitionAnimationId = requestAnimationFrame(animate)
      } else {
        transitionState.value = {
          ...transitionState.value,
          active: false,
          progress: 1,
        }
      }
    }

    // 延迟开始
    if (config.delay > 0) {
      setTimeout(() => {
        if (transitionState.value.active) {
          transitionAnimationId = requestAnimationFrame(animate)
        }
      }, config.delay)
    } else {
      transitionAnimationId = requestAnimationFrame(animate)
    }
  }

  /** 取消过渡动画 */
  function cancelTransition(): void {
    if (transitionAnimationId !== null) {
      cancelAnimationFrame(transitionAnimationId)
      transitionAnimationId = null
    }
    transitionState.value = {
      active: false,
      progress: 0,
      type: transitionConfig.value.type,
      startedAt: null,
    }
  }

  /** 获取交错延迟（用于子元素动画） */
  function getStaggerDelay(index: number): number {
    if (!transitionConfig.value.stagger) return 0
    return index * transitionConfig.value.staggerDelay
  }

  /** 获取当前过渡的 CSS 样式 */
  function getTransitionStyle(): Record<string, string> {
    const config = transitionConfig.value
    const style: Record<string, string> = {}

    switch (config.type) {
      case 'fade':
        style.transition = `opacity ${config.duration}ms ${config.easing}`
        style.opacity = transitionState.value.active ? '0' : '1'
        break
      case 'slide':
        style.transition = `transform ${config.duration}ms ${config.easing}, opacity ${config.duration}ms ${config.easing}`
        style.transform = transitionState.value.active ? 'translateY(10px)' : 'translateY(0)'
        style.opacity = transitionState.value.active ? '0' : '1'
        break
      case 'scale':
        style.transition = `transform ${config.duration}ms ${config.easing}, opacity ${config.duration}ms ${config.easing}`
        style.transform = transitionState.value.active ? 'scale(0.95)' : 'scale(1)'
        style.opacity = transitionState.value.active ? '0' : '1'
        break
      case 'morph':
        style.transition = `all ${config.duration}ms ${config.easing}`
        break
      case 'reveal':
        style.transition = `clip-path ${config.duration}ms ${config.easing}`
        style.clipPath = transitionState.value.active ? 'inset(0 100% 0 0)' : 'inset(0 0 0 0)'
        break
    }

    return style
  }

  /** 是否正在过渡 */
  const isTransitioning = computed(() => transitionState.value.active)

  // ============================================================
  // 响应式断点
  // ============================================================

  /** 根据容器宽度计算响应式断点 */
  function computeBreakpoint(containerWidth: number): ResponsiveBreakpoint | null {
    if (!responsiveConfig.value.enabled) return null

    const clampedWidth = Math.max(containerWidth, responsiveConfig.value.minWidth)

    for (const bp of responsiveConfig.value.breakpoints) {
      if (clampedWidth >= bp.minWidth && clampedWidth <= bp.maxWidth) {
        return bp
      }
    }

    return null
  }

  /** 更新响应式断点 */
  function updateBreakpoint(containerWidth: number): void {
    const bp = computeBreakpoint(containerWidth)
    currentBreakpoint.value = bp?.name ?? null
  }

  /** 根据断点计算图表尺寸 */
  function computeResponsiveSize(
    baseWidth: number,
    baseHeight: number,
    containerWidth: number,
    containerHeight: number,
  ): ChartSize {
    const bp = computeBreakpoint(containerWidth)

    let width = baseWidth
    let height = baseHeight

    if (bp) {
      width = baseWidth * bp.scaleFactor
      height = baseHeight * bp.scaleFactor
    }

    // 限制在容器内
    const clampedWidth = Math.min(width, containerWidth)
    const clampedHeight = responsiveConfig.value.maintainAspectRatio
      ? clampedWidth / responsiveConfig.value.aspectRatio
      : Math.min(height, containerHeight)

    return {
      width: Math.max(clampedWidth, responsiveConfig.value.minWidth),
      height: Math.max(clampedHeight, responsiveConfig.value.minHeight),
      padding: { top: 20, right: 20, bottom: 30, left: 40 },
    }
  }

  /** 获取当前断点的字体缩放 */
  function getFontSizeScale(): number {
    const bp = currentBreakpoint.value
    if (!bp) return 1

    const found = responsiveConfig.value.breakpoints.find(b => b.name === bp)
    return found?.fontSizeScale ?? 1
  }

  /** 是否应简化标注 */
  function shouldSimplifyAnnotations(): boolean {
    const bp = currentBreakpoint.value
    if (!bp) return false

    const found = responsiveConfig.value.breakpoints.find(b => b.name === bp)
    return found?.simplifyAnnotations ?? false
  }

  // ============================================================
  // 清理
  // ============================================================

  /** 销毁引擎，清理所有动画和事件 */
  function destroy(): void {
    cancelInertia()
    cancelTransition()
    isDragging = false
  }

  return {
    // 视口
    viewport,
    zoomConfig,
    panConfig,

    // 缩放
    zoomIn,
    zoomOut,
    setScale,
    handleWheel,
    handleDoubleClick,
    fitToView,
    resetView,

    // 平移
    startPan,
    pan,
    endPan,
    isPanning,

    // 标注
    annotations,
    annotationStyle,
    annotationCount,
    unlockedAnnotations,
    addAnnotation,
    removeAnnotation,
    updateAnnotation,
    moveAnnotation,
    getAnnotation,
    getAnnotationsByGroup,
    toggleAnnotationLock,
    clearAnnotations,
    removeAnnotations,
    renderAnnotationsAsSvg,

    // 导出
    exportConfig,
    exportAsSvg,
    exportAsDataUrl,
    downloadExport,
    exportAndDownload,

    // 动画
    transitionConfig,
    transitionState,
    isTransitioning,
    startTransition,
    cancelTransition,
    getStaggerDelay,
    getTransitionStyle,

    // 响应式
    responsiveConfig,
    currentBreakpoint,
    computeBreakpoint,
    updateBreakpoint,
    computeResponsiveSize,
    getFontSizeScale,
    shouldSimplifyAnnotations,

    // 生命周期
    destroy,
  }
}