// ============================================================
// 数据可视化基础框架 · SVG 工具函数
// 曲线插值、坐标轴生成、SVG 元素创建
// ============================================================

import type { Point2D, Interpolator, ChartSize, AxisConfig, LegendConfig, DataPoint } from './types'

// ============================================================
// 曲线插值
// ============================================================

/** Catmull-Rom 样条插值（经过所有点，平滑曲线） */
export function catmullRomInterpolate(points: Point2D[], tension = 0.5): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`
  }

  let d = `M ${points[0].x} ${points[0].y}`

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(i + 2, points.length - 1)]

    const cp1x = p1.x + (p2.x - p0.x) / 6 * tension
    const cp1y = p1.y + (p2.y - p0.y) / 6 * tension
    const cp2x = p2.x - (p3.x - p1.x) / 6 * tension
    const cp2y = p2.y - (p3.y - p1.y) / 6 * tension

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
  }

  return d
}

/** 线性插值（折线） */
export function linearInterpolate(points: Point2D[]): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`

  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x} ${points[i].y}`
  }
  return d
}

/** 阶梯插值（step-before） */
export function stepInterpolate(points: Point2D[], mode: 'before' | 'after' = 'before'): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`

  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    if (mode === 'before') {
      d += ` L ${curr.x} ${prev.y}`
    } else {
      d += ` L ${prev.x} ${curr.y}`
    }
    d += ` L ${curr.x} ${curr.y}`
  }
  return d
}

/** 获取插值函数 */
export function getInterpolator(type: 'catmull-rom' | 'linear' | 'step-before' | 'step-after'): Interpolator {
  switch (type) {
    case 'catmull-rom':
      return (pts: Point2D[]) => catmullRomInterpolate(pts)
    case 'linear':
      return linearInterpolate
    case 'step-before':
      return (pts: Point2D[]) => stepInterpolate(pts, 'before')
    case 'step-after':
      return (pts: Point2D[]) => stepInterpolate(pts, 'after')
  }
}

// ============================================================
// SVG 元素创建
// ============================================================

/** 创建 SVG 命名空间元素 */
export function createSvgElement<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number | undefined> = {},
): SVGElementTagNameMap[K] {
  const ns = 'http://www.w3.org/2000/svg'
  const el = document.createElementNS(ns, tag) as SVGElementTagNameMap[K]
  for (const [key, val] of Object.entries(attrs)) {
    if (val !== undefined) {
      el.setAttribute(key, String(val))
    }
  }
  return el
}

/** 创建 SVG 根元素 */
export function createSvgRoot(size: ChartSize): SVGSVGElement {
  const svg = createSvgElement('svg', {
    width: size.width,
    height: size.height,
    viewBox: `0 0 ${size.width} ${size.height}`,
    xmlns: 'http://www.w3.org/2000/svg',
  })
  return svg
}

// ============================================================
// 坐标轴
// ============================================================

/** 生成坐标轴路径 */
export function generateAxisPaths(
  size: ChartSize,
  config: AxisConfig,
): { xAxis: string; yAxis: string; xTicks: string[]; yTicks: string[]; xLabels: string[]; yLabels: string[] } {
  const { padding } = size
  const plotW = size.width - padding.left - padding.right
  const plotH = size.height - padding.top - padding.bottom

  const x0 = padding.left
  const y0 = padding.top
  const x1 = padding.left + plotW
  const y1 = padding.top + plotH

  // 轴线
  const xAxis = `M ${x0} ${y1} L ${x1} ${y1}`
  const yAxis = `M ${x0} ${y0} L ${x0} ${y1}`

  // 刻度线 + 标签
  const xTicks: string[] = []
  const yTicks: string[] = []
  const xLabels: string[] = []
  const yLabels: string[] = []

  const tickLen = 5

  // X 轴刻度
  const xTickCount = config.tickCount ?? 5
  for (let i = 0; i < xTickCount; i++) {
    const t = i / (xTickCount - 1)
    const x = x0 + t * plotW
    xTicks.push(`M ${x} ${y1} L ${x} ${y1 + tickLen}`)
    const label = config.tickFormat ? config.tickFormat(t) : `${t}`
    xLabels.push(`<text x="${x}" y="${y1 + tickLen + 14}" text-anchor="middle" font-size="11">${label}</text>`)
  }

  // Y 轴刻度
  const yTickCount = config.tickCount ?? 5
  for (let i = 0; i < yTickCount; i++) {
    const t = i / (yTickCount - 1)
    const y = y1 - t * plotH
    yTicks.push(`M ${x0 - tickLen} ${y} L ${x0} ${y}`)
    const label = config.tickFormat ? config.tickFormat(1 - t) : `${1 - t}`
    yLabels.push(`<text x="${x0 - tickLen - 6}" y="${y + 4}" text-anchor="end" font-size="11">${label}</text>`)
  }

  return { xAxis, yAxis, xTicks, yTicks, xLabels, yLabels }
}

// ============================================================
// 网格
// ============================================================

/** 生成网格线 */
export function generateGridLines(
  size: ChartSize,
  tickCount: number,
  color = 'rgba(255,255,255,0.06)',
  dashArray = '4,4',
): string[] {
  const { padding } = size
  const plotW = size.width - padding.left - padding.right
  const plotH = size.height - padding.top - padding.bottom

  const x0 = padding.left
  const y0 = padding.top
  const x1 = padding.left + plotW
  const y1 = padding.top + plotH

  const lines: string[] = []

  // 水平网格线
  for (let i = 0; i < tickCount; i++) {
    const t = i / (tickCount - 1)
    const y = y1 - t * plotH
    lines.push(`<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="${color}" stroke-dasharray="${dashArray}" />`)
  }

  // 垂直网格线
  for (let i = 0; i < tickCount; i++) {
    const t = i / (tickCount - 1)
    const x = x0 + t * plotW
    lines.push(`<line x1="${x}" y1="${y0}" x2="${x}" y2="${y1}" stroke="${color}" stroke-dasharray="${dashArray}" />`)
  }

  return lines
}

// ============================================================
// 图例
// ============================================================

/** 生成图例 SVG 片段 */
export function generateLegend(
  items: { label: string; color: string; shape?: 'circle' | 'line' | 'rect' }[],
  config: LegendConfig,
): string {
  const itemW = config.itemWidth ?? 120
  const itemGap = config.itemGap ?? 16
  const totalW = items.length * itemW + (items.length - 1) * itemGap

  let xStart = 0
  if (config.position === 'top' || config.position === 'bottom') {
    xStart = (config.itemWidth ?? 120) > totalW ? 0 : 0 // 实际放置由外部布局决定
  }

  let parts: string[] = []
  items.forEach((item, i) => {
    const x = xStart + i * (itemW + itemGap)
    const y = 0
    const shape = item.shape ?? 'circle'

    let shapeSvg = ''
    if (shape === 'circle') {
      shapeSvg = `<circle cx="${x + 6}" cy="${y + 6}" r="4" fill="${item.color}" />`
    } else if (shape === 'line') {
      shapeSvg = `<line x1="${x}" y1="${y + 6}" x2="${x + 12}" y2="${y + 6}" stroke="${item.color}" stroke-width="2" />`
    } else {
      shapeSvg = `<rect x="${x + 2}" y="${y + 2}" width="8" height="8" rx="1" fill="${item.color}" />`
    }

    parts.push(`${shapeSvg}<text x="${x + 14}" y="${y + 10}" font-size="11" fill="currentColor">${item.label}</text>`)
  })

  return parts.join('')
}

// ============================================================
// 数据点转换
// ============================================================

/** 将数据点映射到绘图区域坐标 */
export function mapDataToPlot(
  data: DataPoint[],
  size: ChartSize,
  yDomain: [number, number],
): Point2D[] {
  const { padding } = size
  const plotW = size.width - padding.left - padding.right
  const plotH = size.height - padding.top - padding.bottom

  const [yMin, yMax] = yDomain
  const yRange = yMax - yMin || 1

  return data.map((d, i) => ({
    x: padding.left + (data.length > 1 ? (i / (data.length - 1)) * plotW : plotW / 2),
    y: padding.top + plotH - ((d.value - yMin) / yRange) * plotH,
    label: d.label,
    value: d.value,
    color: d.color,
    metadata: d.metadata,
  }))
}

// ============================================================
// 柱状图
// ============================================================

/** 生成柱状图矩形 SVG */
export function generateBarRects(
  bars: { x: number; y: number; width: number; height: number; color: string; radius?: number }[],
): string {
  return bars.map(b => {
    const r = b.radius ?? 2
    const { x, y, width: w, height: h, color: c } = b
    // 圆角矩形路径
    if (h <= 0) return ''
    return `<path d="M ${x} ${y + r} Q ${x} ${y} ${x + r} ${y} L ${x + w - r} ${y} Q ${x + w} ${y} ${x + w} ${y + r} L ${x + w} ${y + h} L ${x} ${y + h} Z" fill="${c}" />`
  }).join('')
}

// ============================================================
// 环状图
// ============================================================

/** 生成扇形路径（用于环状图） */
export function generateArcPath(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startAngle: number,
  endAngle: number,
): string {
  if (endAngle - startAngle >= 360) {
    // 完整圆环：外圈顺时针 + 内圈逆时针（nonzero 填充自然挖出环心空洞）。
    // 旧实现只取 outerR 画实心圆盘——既丢了 innerR（内圈描边被静默丢弃），
    // 也会让 ≥360° 的扇区渲染成实心圆而非环，与「环影」设计不符。
    const o = outerR
    const i = innerR
    return [
      `M ${cx - o} ${cy}`,
      `A ${o} ${o} 0 1 1 ${cx + o} ${cy}`,
      `A ${o} ${o} 0 1 1 ${cx - o} ${cy}`,
      'Z',
      `M ${cx - i} ${cy}`,
      `A ${i} ${i} 0 1 0 ${cx + i} ${cy}`,
      `A ${i} ${i} 0 1 0 ${cx - i} ${cy}`,
      'Z',
    ].join(' ')
  }

  const sRad = (startAngle * Math.PI) / 180
  const eRad = (endAngle * Math.PI) / 180

  const sx1 = cx + innerR * Math.cos(sRad)
  const sy1 = cy + innerR * Math.sin(sRad)
  const sx2 = cx + outerR * Math.cos(sRad)
  const sy2 = cy + outerR * Math.sin(sRad)
  const ex1 = cx + innerR * Math.cos(eRad)
  const ey1 = cy + innerR * Math.sin(eRad)
  const ex2 = cx + outerR * Math.cos(eRad)
  const ey2 = cy + outerR * Math.sin(eRad)

  const largeArc = endAngle - startAngle > 180 ? 1 : 0

  return [
    `M ${sx2} ${sy2}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${ex2} ${ey2}`,
    `L ${ex1} ${ey1}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${sx1} ${sy1}`,
    'Z',
  ].join(' ')
}

/** 生成环状图所有扇区 */
export function generateRingSectors(
  data: { value: number; color: string }[],
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  gap = 0,
): { path: string; color: string; startAngle: number; endAngle: number }[] {
  // 先判零/非有限再赋值：旧写法 `|| 1` 在前，使下方 `if (total === 0)` 恒为假（死代码）。
  const sum = data.reduce((s, d) => s + d.value, 0)
  if (!Number.isFinite(sum) || sum === 0) return []
  const total = sum

  // gap 为相邻扇区之间的角度间隙（度）。旧式 `gap * (data.length / 360)` 令间隙随 n 反向收缩
  // （n=2 时 1.2° 仅余 0.0067°），扇区实际紧贴、间隔不可见；单个扇区无相邻扇区，不施加间隙，
  // 整圈交由 generateArcPath 的环分支渲染（而非退化成实心圆盘）。
  const gapAngle = data.length > 1 ? gap : 0
  let currentAngle = -90 // 从 12 点方向开始

  return data.map(d => {
    const sliceAngle = (d.value / total) * 360
    // 间隙不得吞掉整个扇区（n 很大或 gap 过大时），下限归零
    const adjustedSlice = Math.max(0, sliceAngle - gapAngle)
    const startAngle = currentAngle
    const endAngle = currentAngle + adjustedSlice
    currentAngle += sliceAngle

    return {
      path: generateArcPath(cx, cy, innerR, outerR, startAngle, endAngle),
      color: d.color,
      startAngle,
      endAngle,
    }
  })
}

// ============================================================
// 区域填充
// ============================================================

/** 生成区域填充路径（曲线下方区域） */
export function generateAreaPath(
  points: Point2D[],
  baseY: number,
  interpolator: Interpolator = catmullRomInterpolate,
): string {
  if (points.length === 0) return ''
  const top = interpolator(points)
  if (top === '') return ''

  const last = points[points.length - 1]
  const first = points[0]

  return `${top} L ${last.x} ${baseY} L ${first.x} ${baseY} Z`
}

// ============================================================
// 坐标轴标签（SVG 字符串）
// ============================================================

/** 生成坐标轴标签（带轴线） */
export function renderAxisAsString(
  size: ChartSize,
  axisConfig: AxisConfig,
  xLabel?: string,
  yLabel?: string,
): string {
  const { padding } = size
  const plotW = size.width - padding.left - padding.right
  const plotH = size.height - padding.top - padding.bottom
  const x0 = padding.left
  const y0 = padding.top
  const x1 = padding.left + plotW
  const y1 = padding.top + plotH

  const lines: string[] = []

  // 轴线
  lines.push(`<line x1="${x0}" y1="${y1}" x2="${x1}" y2="${y1}" stroke="currentColor" stroke-width="1" opacity="0.3" />`)
  lines.push(`<line x1="${x0}" y1="${y0}" x2="${x0}" y2="${y1}" stroke="currentColor" stroke-width="1" opacity="0.3" />`)

  // 网格
  if (axisConfig.grid?.show !== false) {
    const gridColor = axisConfig.grid?.color ?? 'rgba(255,255,255,0.06)'
    const gridDash = axisConfig.grid?.dashArray ?? '4,4'
    const tickCount = axisConfig.tickCount ?? 5
    for (let i = 1; i < tickCount; i++) {
      const t = i / (tickCount - 1)
      const gy = y1 - t * plotH
      lines.push(`<line x1="${x0}" y1="${gy}" x2="${x1}" y2="${gy}" stroke="${gridColor}" stroke-dasharray="${gridDash}" />`)
      const gx = x0 + t * plotW
      lines.push(`<line x1="${gx}" y1="${y0}" x2="${gx}" y2="${y1}" stroke="${gridColor}" stroke-dasharray="${gridDash}" />`)
    }
  }

  // 轴标签
  if (xLabel) {
    lines.push(`<text x="${x0 + plotW / 2}" y="${size.height - 4}" text-anchor="middle" font-size="12" opacity="0.5" fill="currentColor">${xLabel}</text>`)
  }
  if (yLabel) {
    lines.push(`<text x="${- (y0 + plotH / 2)}" y="14" text-anchor="middle" font-size="12" opacity="0.5" fill="currentColor" transform="rotate(-90)">${yLabel}</text>`)
  }

  return lines.join('')
}

// ============================================================
// 工具函数
// ============================================================

/** 计算点集的边界框 */
export function getPointsBBox(points: Point2D[]): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity
  for (const p of points) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }
  return { minX, minY, maxX, maxY }
}

/** 缩放点集到指定范围 */
export function scalePointsToFit(
  points: Point2D[],
  targetWidth: number,
  targetHeight: number,
  padding = 0,
): Point2D[] {
  if (points.length === 0) return []
  const bbox = getPointsBBox(points)
  const dataW = bbox.maxX - bbox.minX || 1
  const dataH = bbox.maxY - bbox.minY || 1
  const scaleX = (targetWidth - padding * 2) / dataW
  const scaleY = (targetHeight - padding * 2) / dataH
  const scale = Math.min(scaleX, scaleY)

  return points.map(p => ({
    x: (p.x - bbox.minX) * scale + padding,
    y: (p.y - bbox.minY) * scale + padding,
  }))
}