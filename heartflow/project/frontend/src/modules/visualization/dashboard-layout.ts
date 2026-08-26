// ============================================================
// 数据可视化 · 仪表盘布局引擎（P16-12）
// 网格布局、面板管理、响应式断点、布局持久化、模板系统
// ============================================================

import { ref, computed } from 'vue'

// ============================================================
// 类型定义
// ============================================================

/** 面板类型 */
export type PanelType = 'chart' | 'text' | 'metric' | 'table' | 'image' | 'custom'

/** 面板尺寸单位 */
export type SizeUnit = 'px' | 'fr' | '%'

/** 网格位置 */
export interface GridPosition {
  /** 列起始位置（1-based） */
  col: number
  /** 行起始位置（1-based） */
  row: number
  /** 列跨度 */
  colSpan: number
  /** 行跨度 */
  rowSpan: number
}

/** 面板尺寸 */
export interface PanelSize {
  width: number
  height: number
  /** 最小宽度 */
  minWidth?: number
  /** 最小高度 */
  minHeight?: number
  /** 最大宽度 */
  maxWidth?: number
  /** 最大高度 */
  maxHeight?: number
}

/** 面板配置 */
export interface PanelConfig {
  id: string
  /** 面板标题 */
  title: string
  /** 面板类型 */
  type: PanelType
  /** 网格位置 */
  position: GridPosition
  /** 面板尺寸 */
  size?: PanelSize
  /** 关联的数据源 ID */
  dataSourceId?: string
  /** 关联的图表配置 */
  chartConfig?: Record<string, unknown>
  /** 是否显示标题栏 */
  showHeader?: boolean
  /** 是否可拖拽 */
  draggable?: boolean
  /** 是否可缩放 */
  resizable?: boolean
  /** 是否可折叠 */
  collapsible?: boolean
  /** 是否已折叠 */
  collapsed?: boolean
  /** 自定义元数据 */
  metadata?: Record<string, unknown>
  /** 面板 z-index */
  zIndex?: number
  /** 面板样式 */
  style?: Record<string, string>
  /** 创建时间 */
  createdAt?: string
  /** 更新时间 */
  updatedAt?: string
}

/** 响应式断点配置 */
export interface DashboardBreakpoint {
  name: string
  /** 最小宽度 */
  minWidth: number
  /** 列数 */
  columns: number
  /** 行高 */
  rowHeight: number
  /** 间距 */
  gap: number
  /** 外边距 */
  margin: number
}

/** 仪表盘布局配置 */
export interface DashboardLayoutConfig {
  /** 布局 ID */
  id: string
  /** 布局名称 */
  name: string
  /** 布局描述 */
  description?: string
  /** 列数 */
  columns: number
  /** 行高（px） */
  rowHeight: number
  /** 间距（px） */
  gap: number
  /** 外边距（px） */
  margin: number
  /** 面板列表 */
  panels: PanelConfig[]
  /** 响应式断点 */
  breakpoints?: DashboardBreakpoint[]
  /** 背景色 */
  backgroundColor?: string
  /** 是否启用响应式 */
  responsive?: boolean
  /** 是否启用紧凑模式 */
  compact?: boolean
  /** 是否自动填充空白 */
  autoFill?: boolean
  /** 全局面板默认配置 */
  panelDefaults?: Partial<PanelConfig>
  /** 创建时间 */
  createdAt?: string
  /** 更新时间 */
  updatedAt?: string
}

/** 布局模板 */
export interface DashboardTemplate {
  id: string
  name: string
  description: string
  /** 模板缩略图描述 */
  thumbnail?: string
  /** 预设列数 */
  columns: number
  /** 预设面板布局（不含数据绑定） */
  panels: Array<{
    type: PanelType
    position: GridPosition
    title: string
    size?: PanelSize
  }>
  /** 适用场景 */
  tags: string[]
}

/** 布局快照 */
export interface LayoutSnapshot {
  id: string
  layoutId: string
  panels: PanelConfig[]
  createdAt: string
  label?: string
}

/** 拖拽状态 */
export interface DragState {
  active: boolean
  panelId: string | null
  startX: number
  startY: number
  currentX: number
  currentY: number
  originalPosition: GridPosition | null
}

/** 调整大小状态 */
export interface ResizeState {
  active: boolean
  panelId: string | null
  direction: 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | null
  startX: number
  startY: number
  currentX: number
  currentY: number
  originalPosition: GridPosition | null
}

/** 布局引擎状态 */
export interface DashboardLayoutState {
  layout: DashboardLayoutConfig
  drag: DragState
  resize: ResizeState
  snapshots: LayoutSnapshot[]
  isDirty: boolean
}

// ============================================================
// 默认配置
// ============================================================

export const DEFAULT_LAYOUT_CONFIG: Omit<DashboardLayoutConfig, 'id' | 'name' | 'panels'> = {
  columns: 12,
  rowHeight: 60,
  gap: 12,
  margin: 16,
  responsive: true,
  compact: true,
  autoFill: true,
  backgroundColor: '#1a1612',
  panelDefaults: {
    showHeader: true,
    draggable: true,
    resizable: true,
    collapsible: true,
    collapsed: false,
    zIndex: 1,
  },
}

export const DEFAULT_BREAKPOINTS: DashboardBreakpoint[] = [
  { name: 'mobile', minWidth: 0, columns: 4, rowHeight: 50, gap: 8, margin: 8 },
  { name: 'tablet', minWidth: 640, columns: 8, rowHeight: 55, gap: 10, margin: 12 },
  { name: 'desktop', minWidth: 1024, columns: 12, rowHeight: 60, gap: 12, margin: 16 },
  { name: 'wide', minWidth: 1600, columns: 12, rowHeight: 70, gap: 16, margin: 24 },
]

export const DEFAULT_PANEL_CONFIG: Partial<PanelConfig> = {
  showHeader: true,
  draggable: true,
  resizable: true,
  collapsible: true,
  collapsed: false,
  zIndex: 1,
}

// ============================================================
// 预设模板
// ============================================================

export const PRESET_TEMPLATES: DashboardTemplate[] = [
  {
    id: 'template_overview',
    name: '总览',
    description: '适合展示整体关键指标和趋势',
    columns: 12,
    tags: ['概览', '管理', '报表'],
    panels: [
      { type: 'metric', position: { col: 1, row: 1, colSpan: 3, rowSpan: 1 }, title: '指标 1' },
      { type: 'metric', position: { col: 4, row: 1, colSpan: 3, rowSpan: 1 }, title: '指标 2' },
      { type: 'metric', position: { col: 7, row: 1, colSpan: 3, rowSpan: 1 }, title: '指标 3' },
      { type: 'metric', position: { col: 10, row: 1, colSpan: 3, rowSpan: 1 }, title: '指标 4' },
      { type: 'chart', position: { col: 1, row: 2, colSpan: 8, rowSpan: 3 }, title: '趋势图' },
      { type: 'chart', position: { col: 9, row: 2, colSpan: 4, rowSpan: 3 }, title: '分布图' },
      { type: 'table', position: { col: 1, row: 5, colSpan: 12, rowSpan: 3 }, title: '数据表' },
    ],
  },
  {
    id: 'template_analytics',
    name: '分析',
    description: '适合深度数据分析和多维对比',
    columns: 12,
    tags: ['分析', '对比', '洞察'],
    panels: [
      { type: 'chart', position: { col: 1, row: 1, colSpan: 6, rowSpan: 3 }, title: '趋势对比' },
      { type: 'chart', position: { col: 7, row: 1, colSpan: 6, rowSpan: 3 }, title: '分类对比' },
      { type: 'chart', position: { col: 1, row: 4, colSpan: 4, rowSpan: 2 }, title: '热力图' },
      { type: 'chart', position: { col: 5, row: 4, colSpan: 4, rowSpan: 2 }, title: '散点图' },
      { type: 'metric', position: { col: 9, row: 4, colSpan: 4, rowSpan: 2 }, title: '关键指标' },
      { type: 'table', position: { col: 1, row: 6, colSpan: 12, rowSpan: 2 }, title: '明细数据' },
    ],
  },
  {
    id: 'template_monitor',
    name: '监控',
    description: '适合实时监控和状态追踪',
    columns: 12,
    tags: ['监控', '实时', '状态'],
    panels: [
      { type: 'metric', position: { col: 1, row: 1, colSpan: 2, rowSpan: 1 }, title: 'CPU' },
      { type: 'metric', position: { col: 3, row: 1, colSpan: 2, rowSpan: 1 }, title: '内存' },
      { type: 'metric', position: { col: 5, row: 1, colSpan: 2, rowSpan: 1 }, title: '磁盘' },
      { type: 'metric', position: { col: 7, row: 1, colSpan: 2, rowSpan: 1 }, title: '网络' },
      { type: 'metric', position: { col: 9, row: 1, colSpan: 2, rowSpan: 1 }, title: 'QPS' },
      { type: 'metric', position: { col: 11, row: 1, colSpan: 2, rowSpan: 1 }, title: '延迟' },
      { type: 'chart', position: { col: 1, row: 2, colSpan: 12, rowSpan: 3 }, title: '实时趋势' },
      { type: 'table', position: { col: 1, row: 5, colSpan: 6, rowSpan: 2 }, title: '告警列表' },
      { type: 'chart', position: { col: 7, row: 5, colSpan: 6, rowSpan: 2 }, title: '状态分布' },
    ],
  },
  {
    id: 'template_report',
    name: '报表',
    description: '适合定期报告和数据汇总',
    columns: 12,
    tags: ['报表', '汇总', '周期'],
    panels: [
      { type: 'text', position: { col: 1, row: 1, colSpan: 12, rowSpan: 1 }, title: '报告标题' },
      { type: 'metric', position: { col: 1, row: 2, colSpan: 4, rowSpan: 1 }, title: '总计' },
      { type: 'metric', position: { col: 5, row: 2, colSpan: 4, rowSpan: 1 }, title: '同比增长' },
      { type: 'metric', position: { col: 9, row: 2, colSpan: 4, rowSpan: 1 }, title: '环比增长' },
      { type: 'chart', position: { col: 1, row: 3, colSpan: 6, rowSpan: 3 }, title: '月度趋势' },
      { type: 'chart', position: { col: 7, row: 3, colSpan: 6, rowSpan: 3 }, title: '分类占比' },
      { type: 'table', position: { col: 1, row: 6, colSpan: 12, rowSpan: 3 }, title: '详细数据' },
    ],
  },
  {
    id: 'template_blank',
    name: '空白',
    description: '从空白画布开始自由布局',
    columns: 12,
    tags: ['自定义', '空白'],
    panels: [],
  },
]

// ============================================================
// 工具函数
// ============================================================

let panelIdCounter = 0
function generatePanelId(): string {
  return `panel_${Date.now().toString(36)}_${(panelIdCounter++).toString(36)}`
}

let snapshotIdCounter = 0
function generateSnapshotId(): string {
  return `snap_${Date.now().toString(36)}_${(snapshotIdCounter++).toString(36)}`
}

/** 检查两个位置是否重叠 */
function positionsOverlap(a: GridPosition, b: GridPosition): boolean {
  return (
    a.col < b.col + b.colSpan &&
    a.col + a.colSpan > b.col &&
    a.row < b.row + b.rowSpan &&
    a.row + a.rowSpan > b.row
  )
}

/** 检查位置是否在布局范围内 */
function isPositionValid(position: GridPosition, columns: number): boolean {
  return position.col >= 1 && position.col + position.colSpan - 1 <= columns
}

/** 计算面板的紧凑位置 */
function findCompactPosition(
  panels: PanelConfig[],
  colSpan: number,
  rowSpan: number,
  columns: number,
  maxRow: number,
): GridPosition {
  // 从第一行开始逐行扫描
  for (let row = 1; row <= maxRow; row++) {
    for (let col = 1; col <= columns - colSpan + 1; col++) {
      const candidate: GridPosition = { col, row, colSpan, rowSpan }
      const hasOverlap = panels.some(p => positionsOverlap(candidate, p.position))
      if (!hasOverlap && isPositionValid(candidate, columns)) {
        return candidate
      }
    }
  }
  // 找不到合适位置，放在最底部
  return { col: 1, row: maxRow + 1, colSpan, rowSpan }
}

/** 获取布局最大行数 */
function getMaxRow(panels: PanelConfig[]): number {
  if (panels.length === 0) return 0
  return Math.max(...panels.map(p => p.position.row + p.position.rowSpan - 1))
}

// ============================================================
// 仪表盘布局引擎 Composable
// ============================================================

export function useDashboardLayout(initialConfig?: Partial<DashboardLayoutConfig>) {
  // ---- 布局配置 ----
  const layout = ref<DashboardLayoutConfig>({
    id: initialConfig?.id ?? `dashboard_${Date.now().toString(36)}`,
    name: initialConfig?.name ?? '未命名仪表盘',
    description: initialConfig?.description ?? '',
    columns: initialConfig?.columns ?? DEFAULT_LAYOUT_CONFIG.columns,
    rowHeight: initialConfig?.rowHeight ?? DEFAULT_LAYOUT_CONFIG.rowHeight,
    gap: initialConfig?.gap ?? DEFAULT_LAYOUT_CONFIG.gap,
    margin: initialConfig?.margin ?? DEFAULT_LAYOUT_CONFIG.margin,
    panels: initialConfig?.panels ?? [],
    breakpoints: initialConfig?.breakpoints ?? [...DEFAULT_BREAKPOINTS],
    responsive: initialConfig?.responsive ?? DEFAULT_LAYOUT_CONFIG.responsive,
    compact: initialConfig?.compact ?? DEFAULT_LAYOUT_CONFIG.compact,
    autoFill: initialConfig?.autoFill ?? DEFAULT_LAYOUT_CONFIG.autoFill,
    backgroundColor: initialConfig?.backgroundColor ?? DEFAULT_LAYOUT_CONFIG.backgroundColor,
    panelDefaults: { ...DEFAULT_LAYOUT_CONFIG.panelDefaults, ...initialConfig?.panelDefaults },
    createdAt: initialConfig?.createdAt ?? new Date().toISOString(),
    updatedAt: initialConfig?.updatedAt ?? new Date().toISOString(),
  })

  // ---- 拖拽状态 ----
  const drag = ref<DragState>({
    active: false,
    panelId: null,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    originalPosition: null,
  })

  // ---- 调整大小状态 ----
  const resize = ref<ResizeState>({
    active: false,
    panelId: null,
    direction: null,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    originalPosition: null,
  })

  // ---- 布局快照 ----
  const snapshots = ref<LayoutSnapshot[]>([])

  // ---- 脏标记 ----
  const isDirty = ref(false)

  // ---- 当前断点 ----
  const currentBreakpoint = ref<DashboardBreakpoint | null>(null)

  // ---- 派生状态 ----

  const panelCount = computed(() => layout.value.panels.length)

  const maxRow = computed(() => getMaxRow(layout.value.panels))

  const totalHeight = computed(() => {
    const mr = maxRow.value
    if (mr === 0) return 400
    return mr * layout.value.rowHeight + (mr - 1) * layout.value.gap + layout.value.margin * 2
  })

  const panelsByType = computed(() => {
    const map: Record<string, PanelConfig[]> = {}
    for (const panel of layout.value.panels) {
      const type = panel.type
      if (!map[type]) map[type] = []
      map[type].push(panel)
    }
    return map
  })

  // ============================================================
  // 面板管理
  // ============================================================

  /** 添加面板 */
  function addPanel(
    type: PanelType,
    title: string,
    position?: Partial<GridPosition>,
    options?: Partial<Omit<PanelConfig, 'id' | 'type' | 'title' | 'position'>>,
  ): PanelConfig {
    const defaults = layout.value.panelDefaults ?? {}
    const autoPos = layout.value.autoFill

    let pos: GridPosition
    if (position?.col && position?.row) {
      pos = {
        col: position.col,
        row: position.row,
        colSpan: position.colSpan ?? 4,
        rowSpan: position.rowSpan ?? 2,
      }
    } else if (autoPos) {
      const colSpan = position?.colSpan ?? 4
      const rowSpan = position?.rowSpan ?? 2
      pos = findCompactPosition(layout.value.panels, colSpan, rowSpan, layout.value.columns, maxRow.value + 1)
    } else {
      pos = { col: 1, row: maxRow.value + 1, colSpan: 4, rowSpan: 2 }
    }

    const panel: PanelConfig = {
      id: generatePanelId(),
      type,
      title,
      position: pos,
      showHeader: options?.showHeader ?? defaults.showHeader,
      draggable: options?.draggable ?? defaults.draggable,
      resizable: options?.resizable ?? defaults.resizable,
      collapsible: options?.collapsible ?? defaults.collapsible,
      collapsed: options?.collapsed ?? defaults.collapsed,
      zIndex: options?.zIndex ?? defaults.zIndex ?? 1,
      dataSourceId: options?.dataSourceId,
      chartConfig: options?.chartConfig,
      size: options?.size,
      style: options?.style,
      metadata: options?.metadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    layout.value = {
      ...layout.value,
      panels: [...layout.value.panels, panel],
      updatedAt: new Date().toISOString(),
    }
    isDirty.value = true

    return panel
  }

  /** 移除面板 */
  function removePanel(panelId: string): boolean {
    const before = layout.value.panels.length
    layout.value = {
      ...layout.value,
      panels: layout.value.panels.filter(p => p.id !== panelId),
      updatedAt: new Date().toISOString(),
    }
    isDirty.value = true
    return layout.value.panels.length < before
  }

  /** 更新面板 */
  function updatePanel(
    panelId: string,
    partial: Partial<Omit<PanelConfig, 'id'>>,
  ): PanelConfig | null {
    const idx = layout.value.panels.findIndex(p => p.id === panelId)
    if (idx === -1) return null

    const updated: PanelConfig = {
      ...layout.value.panels[idx],
      ...partial,
      updatedAt: new Date().toISOString(),
    }

    layout.value = {
      ...layout.value,
      panels: [
        ...layout.value.panels.slice(0, idx),
        updated,
        ...layout.value.panels.slice(idx + 1),
      ],
      updatedAt: new Date().toISOString(),
    }
    isDirty.value = true

    return updated
  }

  /** 获取面板 */
  function getPanel(panelId: string): PanelConfig | undefined {
    return layout.value.panels.find(p => p.id === panelId)
  }

  /** 获取指定类型的面板 */
  function getPanelsByType(type: PanelType): PanelConfig[] {
    return layout.value.panels.filter(p => p.type === type)
  }

  /** 复制面板 */
  function duplicatePanel(panelId: string, offsetCol: number = 1, offsetRow: number = 1): PanelConfig | null {
    const source = layout.value.panels.find(p => p.id === panelId)
    if (!source) return null

    const newPanel: PanelConfig = {
      ...source,
      id: generatePanelId(),
      title: `${source.title} (副本)`,
      position: {
        ...source.position,
        col: source.position.col + offsetCol,
        row: source.position.row + offsetRow,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    layout.value = {
      ...layout.value,
      panels: [...layout.value.panels, newPanel],
      updatedAt: new Date().toISOString(),
    }
    isDirty.value = true

    return newPanel
  }

  /** 清空所有面板 */
  function clearPanels(): void {
    layout.value = {
      ...layout.value,
      panels: [],
      updatedAt: new Date().toISOString(),
    }
    isDirty.value = true
  }

  // ============================================================
  // 面板位置与尺寸
  // ============================================================

  /** 移动面板 */
  function movePanel(
    panelId: string,
    newPosition: Partial<GridPosition>,
  ): PanelConfig | null {
    const panel = layout.value.panels.find(p => p.id === panelId)
    if (!panel) return null

    const updated: GridPosition = {
      ...panel.position,
      ...newPosition,
    }

    // 检查是否与其他面板重叠
    const hasOverlap = layout.value.panels
      .filter(p => p.id !== panelId)
      .some(p => positionsOverlap(updated, p.position))

    if (hasOverlap && !layout.value.compact) {
      return null
    }

    return updatePanel(panelId, { position: updated })
  }

  /** 调整面板大小 */
  function resizePanel(
    panelId: string,
    colSpan: number,
    rowSpan: number,
  ): PanelConfig | null {
    const panel = layout.value.panels.find(p => p.id === panelId)
    if (!panel) return null

    const size = panel.size
    const minColSpan = size?.minWidth ? Math.ceil(size.minWidth / (layout.value.columns > 0 ? layout.value.rowHeight : 60)) : 1
    const maxColSpan = size?.maxWidth ? Math.floor(size.maxWidth / (layout.value.columns > 0 ? layout.value.rowHeight : 60)) : layout.value.columns
    const minRowSpan = size?.minHeight ? Math.ceil(size.minHeight / layout.value.rowHeight) : 1
    const maxRowSpan = size?.maxHeight ? Math.floor(size.maxHeight / layout.value.rowHeight) : 20

    const clampedColSpan = Math.max(minColSpan, Math.min(colSpan, maxColSpan, layout.value.columns))
    const clampedRowSpan = Math.max(minRowSpan, Math.min(rowSpan, maxRowSpan))

    return updatePanel(panelId, {
      position: {
        ...panel.position,
        colSpan: clampedColSpan,
        rowSpan: clampedRowSpan,
      },
    })
  }

  /** 折叠/展开面板 */
  function togglePanelCollapse(panelId: string): boolean {
    const panel = layout.value.panels.find(p => p.id === panelId)
    if (!panel || !panel.collapsible) return false

    const updated = updatePanel(panelId, { collapsed: !panel.collapsed })
    return updated !== null
  }

  /** 置顶面板 */
  function bringToFront(panelId: string): boolean {
    const maxZ = Math.max(...layout.value.panels.map(p => p.zIndex ?? 1))
    return updatePanel(panelId, { zIndex: maxZ + 1 }) !== null
  }

  // ============================================================
  // 拖拽支持
  // ============================================================

  /** 开始拖拽 */
  function startDrag(panelId: string, clientX: number, clientY: number): void {
    const panel = layout.value.panels.find(p => p.id === panelId)
    if (!panel || !panel.draggable) return

    drag.value = {
      active: true,
      panelId,
      startX: clientX,
      startY: clientY,
      currentX: clientX,
      currentY: clientY,
      originalPosition: { ...panel.position },
    }
  }

  /** 拖拽中 */
  function updateDrag(clientX: number, clientY: number): void {
    if (!drag.value.active) return
    drag.value = {
      ...drag.value,
      currentX: clientX,
      currentY: clientY,
    }
  }

  /** 结束拖拽 */
  function endDrag(containerRect?: DOMRect): PanelConfig | null {
    if (!drag.value.active || !drag.value.panelId || !drag.value.originalPosition) {
      drag.value = { active: false, panelId: null, startX: 0, startY: 0, currentX: 0, currentY: 0, originalPosition: null }
      return null
    }

    const panelId = drag.value.panelId
    const panel = layout.value.panels.find(p => p.id === panelId)

    if (panel && containerRect) {
      // 计算新的网格位置
      const dx = drag.value.currentX - drag.value.startX
      const dy = drag.value.currentY - drag.value.startY

      const cellWidth = (containerRect.width - layout.value.margin * 2 - (layout.value.columns - 1) * layout.value.gap) / layout.value.columns
      const cellHeight = layout.value.rowHeight + layout.value.gap

      const colDelta = Math.round(dx / cellWidth)
      const rowDelta = Math.round(dy / cellHeight)

      const newCol = Math.max(1, Math.min(drag.value.originalPosition.col + colDelta, layout.value.columns - panel.position.colSpan + 1))
      const newRow = Math.max(1, drag.value.originalPosition.row + rowDelta)

      drag.value = { active: false, panelId: null, startX: 0, startY: 0, currentX: 0, currentY: 0, originalPosition: null }

      return movePanel(panelId, { col: newCol, row: newRow })
    }

    drag.value = { active: false, panelId: null, startX: 0, startY: 0, currentX: 0, currentY: 0, originalPosition: null }
    return null
  }

  /** 取消拖拽 */
  function cancelDrag(): void {
    if (drag.value.panelId && drag.value.originalPosition) {
      movePanel(drag.value.panelId, drag.value.originalPosition)
    }
    drag.value = { active: false, panelId: null, startX: 0, startY: 0, currentX: 0, currentY: 0, originalPosition: null }
  }

  // ============================================================
  // 调整大小支持
  // ============================================================

  /** 开始调整大小 */
  function startResize(
    panelId: string,
    direction: ResizeState['direction'],
    clientX: number,
    clientY: number,
  ): void {
    const panel = layout.value.panels.find(p => p.id === panelId)
    if (!panel || !panel.resizable || !direction) return

    resize.value = {
      active: true,
      panelId,
      direction,
      startX: clientX,
      startY: clientY,
      currentX: clientX,
      currentY: clientY,
      originalPosition: { ...panel.position },
    }
  }

  /** 调整大小中 */
  function updateResize(clientX: number, clientY: number): void {
    if (!resize.value.active) return
    resize.value = {
      ...resize.value,
      currentX: clientX,
      currentY: clientY,
    }
  }

  /** 结束调整大小 */
  function endResize(containerRect?: DOMRect): PanelConfig | null {
    if (!resize.value.active || !resize.value.panelId || !resize.value.originalPosition) {
      resize.value = { active: false, panelId: null, direction: null, startX: 0, startY: 0, currentX: 0, currentY: 0, originalPosition: null }
      return null
    }

    const panelId = resize.value.panelId
    const panel = layout.value.panels.find(p => p.id === panelId)

    if (panel && containerRect && resize.value.direction) {
      const dx = resize.value.currentX - resize.value.startX
      const dy = resize.value.currentY - resize.value.startY

      const cellWidth = (containerRect.width - layout.value.margin * 2 - (layout.value.columns - 1) * layout.value.gap) / layout.value.columns
      const cellHeight = layout.value.rowHeight + layout.value.gap

      const colDelta = Math.round(dx / cellWidth)
      const rowDelta = Math.round(dy / cellHeight)

      let newColSpan = resize.value.originalPosition.colSpan
      let newRowSpan = resize.value.originalPosition.rowSpan

      switch (resize.value.direction) {
        case 'e': newColSpan += colDelta; break
        case 'w': newColSpan -= colDelta; break
        case 's': newRowSpan += rowDelta; break
        case 'n': newRowSpan -= rowDelta; break
        case 'se': newColSpan += colDelta; newRowSpan += rowDelta; break
        case 'sw': newColSpan -= colDelta; newRowSpan += rowDelta; break
        case 'ne': newColSpan += colDelta; newRowSpan -= rowDelta; break
        case 'nw': newColSpan -= colDelta; newRowSpan -= rowDelta; break
      }

      resize.value = { active: false, panelId: null, direction: null, startX: 0, startY: 0, currentX: 0, currentY: 0, originalPosition: null }

      return resizePanel(panelId, Math.max(1, newColSpan), Math.max(1, newRowSpan))
    }

    resize.value = { active: false, panelId: null, direction: null, startX: 0, startY: 0, currentX: 0, currentY: 0, originalPosition: null }
    return null
  }

  /** 取消调整大小 */
  function cancelResize(): void {
    if (resize.value.panelId && resize.value.originalPosition) {
      movePanel(resize.value.panelId, resize.value.originalPosition)
    }
    resize.value = { active: false, panelId: null, direction: null, startX: 0, startY: 0, currentX: 0, currentY: 0, originalPosition: null }
  }

  // ============================================================
  // 布局快照
  // ============================================================

  /** 创建快照 */
  function createSnapshot(label?: string): LayoutSnapshot {
    const snapshot: LayoutSnapshot = {
      id: generateSnapshotId(),
      layoutId: layout.value.id,
      panels: JSON.parse(JSON.stringify(layout.value.panels)),
      createdAt: new Date().toISOString(),
      label,
    }
    snapshots.value = [...snapshots.value.slice(-50), snapshot]
    return snapshot
  }

  /** 恢复快照 */
  function restoreSnapshot(snapshotId: string): boolean {
    const snapshot = snapshots.value.find(s => s.id === snapshotId)
    if (!snapshot) return false

    layout.value = {
      ...layout.value,
      panels: JSON.parse(JSON.stringify(snapshot.panels)),
      updatedAt: new Date().toISOString(),
    }
    isDirty.value = true
    return true
  }

  /** 删除快照 */
  function removeSnapshot(snapshotId: string): boolean {
    const before = snapshots.value.length
    snapshots.value = snapshots.value.filter(s => s.id !== snapshotId)
    return snapshots.value.length < before
  }

  /** 获取快照 */
  function getSnapshot(snapshotId: string): LayoutSnapshot | undefined {
    return snapshots.value.find(s => s.id === snapshotId)
  }

  /** 清除所有快照 */
  function clearSnapshots(): void {
    snapshots.value = []
  }

  // ============================================================
  // 布局序列化
  // ============================================================

  /** 导出布局为 JSON */
  function exportLayout(): string {
    return JSON.stringify({
      ...layout.value,
      panels: layout.value.panels.map(p => ({
        ...p,
        // 排除内部状态
        zIndex: undefined,
      })),
    }, null, 2)
  }

  /** 从 JSON 导入布局 */
  function importLayout(json: string): boolean {
    try {
      const parsed = JSON.parse(json) as DashboardLayoutConfig
      if (!parsed.panels || !Array.isArray(parsed.panels)) {
        return false
      }

      layout.value = {
        ...DEFAULT_LAYOUT_CONFIG,
        ...parsed,
        id: parsed.id ?? `dashboard_${Date.now().toString(36)}`,
        panels: (parsed.panels).map(p => ({
          ...DEFAULT_PANEL_CONFIG,
          ...p,
          id: p.id ?? generatePanelId(),
        })),
        updatedAt: new Date().toISOString(),
      }
      isDirty.value = true
      return true
    } catch {
      return false
    }
  }

  /** 重置布局 */
  function resetLayout(): void {
    layout.value = {
      id: `dashboard_${Date.now().toString(36)}`,
      name: '未命名仪表盘',
      description: '',
      columns: DEFAULT_LAYOUT_CONFIG.columns,
      rowHeight: DEFAULT_LAYOUT_CONFIG.rowHeight,
      gap: DEFAULT_LAYOUT_CONFIG.gap,
      margin: DEFAULT_LAYOUT_CONFIG.margin,
      panels: [],
      breakpoints: [...DEFAULT_BREAKPOINTS],
      responsive: DEFAULT_LAYOUT_CONFIG.responsive,
      compact: DEFAULT_LAYOUT_CONFIG.compact,
      autoFill: DEFAULT_LAYOUT_CONFIG.autoFill,
      backgroundColor: DEFAULT_LAYOUT_CONFIG.backgroundColor,
      panelDefaults: { ...DEFAULT_LAYOUT_CONFIG.panelDefaults },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    snapshots.value = []
    isDirty.value = false
  }

  // ============================================================
  // 模板系统
  // ============================================================

  /** 应用模板 */
  function applyTemplate(templateId: string): boolean {
    const template = PRESET_TEMPLATES.find(t => t.id === templateId)
    if (!template) return false

    // 创建快照（如当前有面板）
    if (layout.value.panels.length > 0) {
      createSnapshot(`应用模板 "${template.name}" 前`)
    }

    const panels: PanelConfig[] = template.panels.map(p => ({
      id: generatePanelId(),
      type: p.type,
      title: p.title,
      position: { ...p.position },
      size: p.size ? { ...p.size } : undefined,
      showHeader: true,
      draggable: true,
      resizable: true,
      collapsible: true,
      collapsed: false,
      zIndex: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }))

    layout.value = {
      ...layout.value,
      columns: template.columns,
      panels,
      updatedAt: new Date().toISOString(),
    }
    isDirty.value = true
    return true
  }

  /** 获取模板 */
  function getTemplate(templateId: string): DashboardTemplate | undefined {
    return PRESET_TEMPLATES.find(t => t.id === templateId)
  }

  /** 获取所有模板 */
  function getAllTemplates(): DashboardTemplate[] {
    return PRESET_TEMPLATES
  }

  /** 获取按标签筛选的模板 */
  function getTemplatesByTag(tag: string): DashboardTemplate[] {
    return PRESET_TEMPLATES.filter(t => t.tags.includes(tag))
  }

  // ============================================================
  // 响应式管理
  // ============================================================

  /** 更新当前断点 */
  function updateBreakpoint(containerWidth: number): void {
    if (!layout.value.responsive || !layout.value.breakpoints) return

    const sorted = [...layout.value.breakpoints].sort((a, b) => b.minWidth - a.minWidth)
    const bp = sorted.find(b => containerWidth >= b.minWidth)
    currentBreakpoint.value = bp ?? null
  }

  /** 获取当前断点下的列数 */
  const effectiveColumns = computed(() => {
    if (currentBreakpoint.value) return currentBreakpoint.value.columns
    return layout.value.columns
  })

  /** 获取当前断点下的行高 */
  const effectiveRowHeight = computed(() => {
    if (currentBreakpoint.value) return currentBreakpoint.value.rowHeight
    return layout.value.rowHeight
  })

  // ============================================================
  // 布局配置
  // ============================================================

  /** 更新布局名称 */
  function setName(name: string): void {
    layout.value = {
      ...layout.value,
      name,
      updatedAt: new Date().toISOString(),
    }
  }

  /** 更新布局描述 */
  function setDescription(description: string): void {
    layout.value = {
      ...layout.value,
      description,
      updatedAt: new Date().toISOString(),
    }
  }

  /** 更新布局配置 */
  function updateLayoutConfig(
    partial: Partial<Pick<DashboardLayoutConfig, 'columns' | 'rowHeight' | 'gap' | 'margin' | 'backgroundColor' | 'responsive' | 'compact' | 'autoFill'>>,
  ): void {
    layout.value = {
      ...layout.value,
      ...partial,
      updatedAt: new Date().toISOString(),
    }
  }

  /** 紧凑布局：自动消除空白 */
  function compactLayout(): void {
    const sortedPanels = [...layout.value.panels].sort((a, b) =>
      a.position.row !== b.position.row
        ? a.position.row - b.position.row
        : a.position.col - b.position.col,
    )

    const compacted: PanelConfig[] = []
    let currentRow = 1

    for (const panel of sortedPanels) {
      const pos = findCompactPosition(
        compacted,
        panel.position.colSpan,
        panel.position.rowSpan,
        layout.value.columns,
        currentRow,
      )
      compacted.push({ ...panel, position: pos })
      currentRow = Math.max(currentRow, pos.row)
    }

    layout.value = {
      ...layout.value,
      panels: compacted,
      updatedAt: new Date().toISOString(),
    }
    isDirty.value = true
  }

  // ============================================================
  // 批量操作
  // ============================================================

  /** 批量更新面板 */
  function batchUpdatePanels(
    updates: Array<{ panelId: string; partial: Partial<PanelConfig> }>,
  ): PanelConfig[] {
    const panelMap = new Map(layout.value.panels.map(p => [p.id, p]))

    for (const { panelId, partial } of updates) {
      const panel = panelMap.get(panelId)
      if (panel) {
        panelMap.set(panelId, { ...panel, ...partial, updatedAt: new Date().toISOString() })
      }
    }

    layout.value = {
      ...layout.value,
      panels: Array.from(panelMap.values()),
      updatedAt: new Date().toISOString(),
    }
    isDirty.value = true

    return Array.from(panelMap.values())
  }

  /** 全选/取消全选面板 */
  function selectAllPanels(): string[] {
    return layout.value.panels.map(p => p.id)
  }

  /** 删除选中的面板 */
  function removeSelectedPanels(panelIds: string[]): number {
    const before = layout.value.panels.length
    layout.value = {
      ...layout.value,
      panels: layout.value.panels.filter(p => !panelIds.includes(p.id)),
      updatedAt: new Date().toISOString(),
    }
    isDirty.value = true
    return before - layout.value.panels.length
  }

  return {
    // 布局
    layout,
    drag,
    resize,
    snapshots,
    isDirty,
    currentBreakpoint,

    // 派生状态
    panelCount,
    maxRow,
    totalHeight,
    panelsByType,
    effectiveColumns,
    effectiveRowHeight,

    // 面板管理
    addPanel,
    removePanel,
    updatePanel,
    getPanel,
    getPanelsByType,
    duplicatePanel,
    clearPanels,

    // 面板位置与尺寸
    movePanel,
    resizePanel,
    togglePanelCollapse,
    bringToFront,

    // 拖拽支持
    startDrag,
    updateDrag,
    endDrag,
    cancelDrag,

    // 调整大小
    startResize,
    updateResize,
    endResize,
    cancelResize,

    // 快照
    createSnapshot,
    restoreSnapshot,
    removeSnapshot,
    getSnapshot,
    clearSnapshots,

    // 序列化
    exportLayout,
    importLayout,
    resetLayout,

    // 模板
    applyTemplate,
    getTemplate,
    getAllTemplates,
    getTemplatesByTag,
    PRESET_TEMPLATES,

    // 响应式
    updateBreakpoint,

    // 布局配置
    setName,
    setDescription,
    updateLayoutConfig,
    compactLayout,

    // 批量操作
    batchUpdatePanels,
    selectAllPanels,
    removeSelectedPanels,

    // 常量
    DEFAULT_LAYOUT_CONFIG,
    DEFAULT_BREAKPOINTS,
    DEFAULT_PANEL_CONFIG,
  }
}