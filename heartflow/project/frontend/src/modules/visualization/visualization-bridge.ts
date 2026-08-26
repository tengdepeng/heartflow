// ============================================================
// Visualization 桥接层
// 简化透传：直接暴露各 composable 的原始 API
// ============================================================

import { computed, ref } from 'vue'
import {
  useChartInteraction,
  useCanvasRenderer,
  useDataSourceConnector,
  useDashboardLayout,
} from './index'
import type {
  Annotation,
  AnnotationType,
  ViewportTransform,
  ExportResult,
  LayerConfig,
  LayerType,
  DrawCommandType,
  DataSourceConfig,
  DashboardBreakpoint,
} from './index'

// ---- 聚合类型 ----

export interface VisualizationState {
  viewport: ViewportTransform
  annotationCount: number
  isPanning: boolean
  isTransitioning: boolean
  fps: number
  layerCount: number
  commandCount: number
  dirtyRegionCount: number
  connectedSources: number
  totalSources: number
  errorSources: number
  panelCount: number
  maxRow: number
  currentBreakpoint: DashboardBreakpoint | null
}

// ---- 桥接 ----

export function useVisualizationBridge() {
  const interaction = useChartInteraction()
  const canvas = useCanvasRenderer()
  const dataSource = useDataSourceConnector()
  const layout = useDashboardLayout()
  const isLoading = ref(false)

  // ---- 聚合状态 ----

  const state = computed<VisualizationState>(() => ({
    viewport: interaction.viewport.value,
    annotationCount: interaction.annotationCount.value,
    isPanning: interaction.isPanning.value,
    isTransitioning: interaction.isTransitioning.value,
    fps: canvas.stats.value.fps,
    layerCount: canvas.sortedLayers.value.length,
    commandCount: canvas.sortedCommands.value.length,
    dirtyRegionCount: canvas.dirtyRegions.value.length,
    connectedSources: dataSource.connectedSources.value.length,
    totalSources: dataSource.sources.value.length,
    errorSources: dataSource.errorSources.value.length,
    panelCount: layout.panelCount.value,
    maxRow: layout.maxRow.value,
    currentBreakpoint: layout.currentBreakpoint.value,
  }))

  // ---- 操作 ----

  // 交互
  function zoomIn(step?: number): void { interaction.zoomIn(step) }
  function zoomOut(step?: number): void { interaction.zoomOut(step) }
  function resetView(): void { interaction.resetView() }

  function addAnnotation(
    type: AnnotationType,
    x: number,
    y: number,
    options?: Record<string, unknown>,
  ): Annotation {
    return interaction.addAnnotation(type, x, y, options)
  }

  function removeAnnotation(id: string): boolean {
    return interaction.removeAnnotation(id)
  }

  function clearAnnotations(): void {
    interaction.clearAnnotations()
  }

  function exportChart(
    svgElement: SVGSVGElement,
    width: number,
    height: number,
  ): Promise<ExportResult> {
    return interaction.exportAndDownload(svgElement, width, height)
  }

  // 画布
  function bindCanvasElement(el: HTMLCanvasElement): void {
    canvas.bindCanvas(el)
  }

  function createLayer(
    name: string,
    type?: LayerType,
    options?: Record<string, unknown>,
  ): LayerConfig {
    return canvas.createLayer(name, type, options)
  }

  function removeLayer(layerId: string): void {
    canvas.removeLayer(layerId)
  }

  function addCommand(
    type: DrawCommandType,
    layerId: string,
    data: Record<string, unknown>,
    options?: Record<string, unknown>,
  ): void {
    canvas.addCommand(type, layerId, data, options)
  }

  function removeCommand(commandId: string): void {
    canvas.removeCommand(commandId)
  }

  function startRendering(): void { canvas.startRendering() }
  function stopRendering(): void { canvas.stopRendering() }

  // 数据源
  function registerSource(config: DataSourceConfig): void {
    dataSource.registerSource(config)
  }

  async function connectSource(sourceId: string): Promise<void> {
    await dataSource.connectSource(sourceId)
  }

  async function fetchData(sourceId: string): Promise<unknown> {
    return dataSource.fetchData(sourceId)
  }

  function clearCache(): void {
    dataSource.clearAllCache()
  }

  return {
    // 状态
    isLoading,
    state,
    // 交互
    viewport: interaction.viewport,
    annotations: interaction.annotations,
    zoomIn,
    zoomOut,
    resetView,
    addAnnotation,
    removeAnnotation,
    clearAnnotations,
    exportChart,
    // 画布
    layers: canvas.sortedLayers,
    commands: canvas.sortedCommands,
    bindCanvas: bindCanvasElement,
    createLayer,
    removeLayer,
    addCommand,
    removeCommand,
    startRendering,
    stopRendering,
    // 数据源
    sources: dataSource.sources,
    connectedSources: dataSource.connectedSources,
    registerSource,
    connectSource,
    fetchData,
    clearCache,
    // 布局 - 直通原始 composable
    layout,
    // 子模块直通
    interaction,
    canvas,
    dataSource,
  }
}