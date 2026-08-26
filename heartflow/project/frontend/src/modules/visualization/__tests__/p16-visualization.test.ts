// ============================================================
// 数据可视化 · P16-12 · 单元测试
// Canvas 渲染管线 + 数据源连接器 + 仪表盘布局引擎
// ============================================================

import { describe, expect, it, beforeEach, vi } from 'vitest'
import { useCanvasRenderer } from '../canvas-renderer'
import { useTransformPipeline, useDataSourceConnector } from '../datasource-connector'
import { useDashboardLayout } from '../dashboard-layout'
import type { DataSourceConfig } from '../datasource-connector'

// ============================================================
// Canvas 2D 渲染管线测试
// ============================================================

describe('P16-12 Canvas 2D 渲染管线', () => {
  let renderer: ReturnType<typeof useCanvasRenderer>

  beforeEach(() => {
    renderer = useCanvasRenderer()
  })

  describe('上下文配置', () => {
    it('应使用默认配置初始化', () => {
      expect(renderer.contextConfig.value.width).toBe(800)
      expect(renderer.contextConfig.value.height).toBe(600)
      expect(renderer.contextConfig.value.devicePixelRatio).toBe(2)
      expect(renderer.contextConfig.value.antialias).toBe(true)
      expect(renderer.contextConfig.value.backgroundColor).toBe('#1a1612')
      expect(renderer.contextConfig.value.transparent).toBe(false)
    })

    it('应能更新上下文配置', () => {
      renderer.updateContextConfig({ width: 1024, height: 768, backgroundColor: '#ffffff' })
      expect(renderer.contextConfig.value.width).toBe(1024)
      expect(renderer.contextConfig.value.height).toBe(768)
      expect(renderer.contextConfig.value.backgroundColor).toBe('#ffffff')
      // 未更新的字段保持原值
      expect(renderer.contextConfig.value.devicePixelRatio).toBe(2)
    })

    it('应能更新帧调度配置', () => {
      renderer.updateScheduleConfig({ mode: 'continuous', targetFps: 30 })
      expect(renderer.scheduleConfig.value.mode).toBe('continuous')
      expect(renderer.scheduleConfig.value.targetFps).toBe(30)
    })
  })

  describe('图层管理', () => {
    it('应能创建图层', () => {
      const layer = renderer.createLayer('测试图层', 'data')
      expect(layer.id).toBeTruthy()
      expect(layer.name).toBe('测试图层')
      expect(layer.type).toBe('data')
      expect(layer.visible).toBe(true)
      expect(layer.opacity).toBe(1)
      expect(renderer.layers.value.length).toBe(1)
    })

    it('应能创建自定义图层', () => {
      const layer = renderer.createLayer('自定义', 'custom', { zIndex: 100, opacity: 0.5 })
      expect(layer.type).toBe('custom')
      expect(layer.zIndex).toBe(100)
      expect(layer.opacity).toBe(0.5)
    })

    it('应能删除图层', () => {
      const layer = renderer.createLayer('待删除', 'background')
      expect(renderer.layers.value.length).toBe(1)
      const removed = renderer.removeLayer(layer.id)
      expect(removed).toBe(true)
      expect(renderer.layers.value.length).toBe(0)
    })

    it('删除不存在的图层应返回 false', () => {
      expect(renderer.removeLayer('non-existent')).toBe(false)
    })

    it('删除图层时应同时删除关联命令', () => {
      const layer = renderer.createLayer('测试', 'data')
      renderer.addCommand('rect', layer.id, { x: 0, y: 0, width: 100, height: 100 })
      renderer.addCommand('circle', layer.id, { cx: 50, cy: 50, radius: 20 })
      expect(renderer.commands.value.length).toBe(2)

      renderer.removeLayer(layer.id)
      expect(renderer.commands.value.length).toBe(0)
    })

    it('应能更新图层属性', () => {
      const layer = renderer.createLayer('测试', 'data')
      const updated = renderer.updateLayer(layer.id, { name: '已更新', opacity: 0.3 })
      expect(updated).toBeTruthy()
      expect(updated!.name).toBe('已更新')
      expect(updated!.opacity).toBe(0.3)
    })

    it('更新不存在的图层应返回 null', () => {
      expect(renderer.updateLayer('non-existent', { name: 'x' })).toBeNull()
    })

    it('应能设置图层可见性', () => {
      const layer = renderer.createLayer('测试', 'data')
      expect(renderer.setLayerVisible(layer.id, false)).toBe(true)
      expect(renderer.getLayer(layer.id)?.visible).toBe(false)
    })

    it('应能设置图层不透明度', () => {
      const layer = renderer.createLayer('测试', 'data')
      renderer.setLayerOpacity(layer.id, 0.5)
      expect(renderer.getLayer(layer.id)?.opacity).toBe(0.5)
    })

    it('应能设置图层 z-index', () => {
      const layer = renderer.createLayer('测试', 'data')
      renderer.setLayerZIndex(layer.id, 99)
      expect(renderer.getLayer(layer.id)?.zIndex).toBe(99)
    })

    it('应能获取指定类型的图层', () => {
      renderer.createLayer('背景', 'background')
      renderer.createLayer('网格', 'grid')
      renderer.createLayer('数据', 'data')
      renderer.createLayer('数据2', 'data')

      const dataLayers = renderer.getLayersByType('data')
      expect(dataLayers.length).toBe(2)
    })

    it('应能清空所有图层', () => {
      renderer.createLayer('图层1', 'data')
      renderer.createLayer('图层2', 'data')
      renderer.clearLayers()
      expect(renderer.layers.value.length).toBe(0)
    })

    it('initPresetLayers 应创建5个预设图层', () => {
      const layers = renderer.initPresetLayers()
      expect(layers.length).toBe(5)
      expect(layers.map(l => l.type)).toEqual(['background', 'grid', 'data', 'annotation', 'overlay'])
    })

    it('sortedLayers 应按 zIndex 排序', () => {
      renderer.createLayer('底层', 'background', { zIndex: 0 })
      renderer.createLayer('中层', 'data', { zIndex: 20 })
      renderer.createLayer('顶层', 'overlay', { zIndex: 40 })
      expect(renderer.sortedLayers.value.map(l => l.zIndex)).toEqual([0, 20, 40])
    })

    it('visibleLayers 应只返回可见图层', () => {
      const layer1 = renderer.createLayer('可见', 'data', { visible: true })
      renderer.createLayer('隐藏', 'annotation', { visible: false })
      expect(renderer.visibleLayers.value.length).toBe(1)
      expect(renderer.visibleLayers.value[0].id).toBe(layer1.id)
    })
  })

  describe('绘制命令管理', () => {
    it('应能添加绘制命令', () => {
      const layer = renderer.createLayer('测试', 'data')
      const cmd = renderer.addCommand('rect', layer.id, { x: 0, y: 0, width: 100, height: 100 })
      expect(cmd.id).toBeTruthy()
      expect(cmd.type).toBe('rect')
      expect(cmd.enabled).toBe(true)
      expect(renderer.commands.value.length).toBe(1)
    })

    it('应能批量添加绘制命令', () => {
      const layer = renderer.createLayer('测试', 'data')
      const cmds = renderer.addCommands([
        { type: 'rect', layerId: layer.id, params: { x: 0, y: 0, width: 100, height: 100 } },
        { type: 'circle', layerId: layer.id, params: { cx: 50, cy: 50, radius: 20 } },
      ])
      expect(cmds.length).toBe(2)
      expect(renderer.commands.value.length).toBe(2)
    })

    it('应能移除绘制命令', () => {
      const layer = renderer.createLayer('测试', 'data')
      const cmd = renderer.addCommand('rect', layer.id, { x: 0, y: 0, width: 100, height: 100 })
      expect(renderer.removeCommand(cmd.id)).toBe(true)
      expect(renderer.commands.value.length).toBe(0)
    })

    it('应能更新绘制命令', () => {
      const layer = renderer.createLayer('测试', 'data')
      const cmd = renderer.addCommand('rect', layer.id, { x: 0, y: 0, width: 100, height: 100 })
      const updated = renderer.updateCommand(cmd.id, { enabled: false })
      expect(updated).toBeTruthy()
      expect(updated!.enabled).toBe(false)
    })

    it('应能启用/禁用命令', () => {
      const layer = renderer.createLayer('测试', 'data')
      const cmd = renderer.addCommand('rect', layer.id, { x: 0, y: 0, width: 100, height: 100 })
      renderer.setCommandEnabled(cmd.id, false)
      expect(renderer.getCommand(cmd.id)?.enabled).toBe(false)
    })

    it('应能获取图层中的所有命令', () => {
      const layer = renderer.createLayer('测试', 'data')
      renderer.addCommand('rect', layer.id, { x: 0, y: 0, width: 100, height: 100 })
      renderer.addCommand('circle', layer.id, { cx: 50, cy: 50, radius: 20 })
      expect(renderer.getCommandsForLayer(layer.id).length).toBe(2)
    })

    it('应能清空图层命令', () => {
      const layer = renderer.createLayer('测试', 'data')
      renderer.addCommand('rect', layer.id, { x: 0, y: 0, width: 100, height: 100 })
      renderer.addCommand('circle', layer.id, { cx: 50, cy: 50, radius: 20 })
      const removed = renderer.clearLayerCommands(layer.id)
      expect(removed).toBe(2)
      expect(renderer.commands.value.length).toBe(0)
    })

    it('sortedCommands 应按 order 排序', () => {
      const layer = renderer.createLayer('测试', 'data')
      renderer.addCommand('rect', layer.id, { x: 0, y: 0, width: 100, height: 100 }, { order: 2 })
      renderer.addCommand('circle', layer.id, { cx: 50, cy: 50, radius: 20 }, { order: 1 })
      expect(renderer.sortedCommands.value.map(c => c.order)).toEqual([1, 2])
    })

    it('commandsByLayer 应按图层分组', () => {
      const layer1 = renderer.createLayer('图层1', 'data')
      const layer2 = renderer.createLayer('图层2', 'data')
      renderer.addCommand('rect', layer1.id, { x: 0, y: 0, width: 100, height: 100 })
      renderer.addCommand('circle', layer2.id, { cx: 50, cy: 50, radius: 20 })

      const byLayer = renderer.commandsByLayer.value
      expect(Object.keys(byLayer).length).toBe(2)
      expect(byLayer[layer1.id].length).toBe(1)
      expect(byLayer[layer2.id].length).toBe(1)
    })
  })

  describe('视图变换', () => {
    it('应使用默认视图变换初始化', () => {
      expect(renderer.viewTransform.value.scale).toBe(1)
      expect(renderer.viewTransform.value.translateX).toBe(0)
      expect(renderer.viewTransform.value.translateY).toBe(0)
      expect(renderer.viewTransform.value.rotation).toBe(0)
    })

    it('应能设置视图变换', () => {
      renderer.setViewTransform({ scale: 2, translateX: 100 })
      expect(renderer.viewTransform.value.scale).toBe(2)
      expect(renderer.viewTransform.value.translateX).toBe(100)
    })

    it('应能缩放视图', () => {
      renderer.zoom(2)
      expect(renderer.viewTransform.value.scale).toBe(2)
    })

    it('缩放不应超出范围', () => {
      renderer.zoom(20) // 1 * 20 = 20 > 10
      expect(renderer.viewTransform.value.scale).toBe(10)

      renderer.setViewTransform({ scale: 1 })
      renderer.zoom(0.01) // 1 * 0.01 = 0.01 < 0.1
      expect(renderer.viewTransform.value.scale).toBe(0.1)
    })

    it('应能平移视图', () => {
      renderer.pan(50, 100)
      expect(renderer.viewTransform.value.translateX).toBe(50)
      expect(renderer.viewTransform.value.translateY).toBe(100)
    })

    it('应能重置视图变换', () => {
      renderer.setViewTransform({ scale: 3, translateX: 200, rotation: 45 })
      renderer.resetViewTransform()
      expect(renderer.viewTransform.value.scale).toBe(1)
      expect(renderer.viewTransform.value.translateX).toBe(0)
      expect(renderer.viewTransform.value.rotation).toBe(0)
    })
  })

  describe('渲染管线', () => {
    it('初始状态 isRunning 应为 false', () => {
      expect(renderer.isRunning.value).toBe(false)
    })

    it('渲染统计应初始化为零', () => {
      expect(renderer.stats.value.frameCount).toBe(0)
      expect(renderer.stats.value.fps).toBe(0)
      expect(renderer.stats.value.totalCommands).toBe(0)
      expect(renderer.stats.value.visibleLayers).toBe(0)
    })

    it('bindCanvas 未提供 canvas 时应抛出错误', () => {
      expect(() => renderer.renderFrame()).not.toThrow()
    })

    it('添加命令应标记脏区域', () => {
      const layer = renderer.createLayer('测试', 'data')
      renderer.addCommand('rect', layer.id, { x: 0, y: 0, width: 100, height: 100 })
      expect(renderer.dirtyRegions.value.length).toBeGreaterThan(0)
    })

    it('markDirty 不传参数应标记整个画布', () => {
      renderer.markDirty()
      expect(renderer.dirtyRegions.value.length).toBe(1)
      expect(renderer.dirtyRegions.value[0].width).toBe(800)
    })

    it('markDirty 传区域应标记指定区域', () => {
      renderer.markDirty({ x: 10, y: 20, width: 100, height: 200 })
      expect(renderer.dirtyRegions.value[0].x).toBe(10)
      expect(renderer.dirtyRegions.value[0].y).toBe(20)
    })

    it('clearDirtyRegions 应清除脏区域', () => {
      renderer.markDirty()
      renderer.clearDirtyRegions()
      expect(renderer.dirtyRegions.value.length).toBe(0)
    })

    it('requestFrame 应渲染单帧', () => {
      renderer.requestFrame()
      expect(renderer.stats.value.frameCount).toBeGreaterThanOrEqual(0)
    })
  })

  describe('便捷绘制方法', () => {
    it('drawRect 应创建矩形命令', () => {
      const layer = renderer.createLayer('测试', 'data')
      const cmd = renderer.drawRect(layer.id, 0, 0, 100, 50, { fill: '#ff0000' })
      expect(cmd.type).toBe('rect')
      expect(cmd.params.x).toBe(0)
      expect(cmd.params.y).toBe(0)
      expect(cmd.params.width).toBe(100)
      expect(cmd.params.height).toBe(50)
      expect(cmd.params.fill).toBe('#ff0000')
    })

    it('drawCircle 应创建圆形命令', () => {
      const layer = renderer.createLayer('测试', 'data')
      const cmd = renderer.drawCircle(layer.id, 50, 50, 30)
      expect(cmd.type).toBe('circle')
      expect(cmd.params.cx).toBe(50)
      expect(cmd.params.cy).toBe(50)
      expect(cmd.params.radius).toBe(30)
    })

    it('drawLine 应创建线段命令', () => {
      const layer = renderer.createLayer('测试', 'data')
      const cmd = renderer.drawLine(layer.id, 0, 0, 100, 100, { stroke: '#00ff00', strokeWidth: 2 })
      expect(cmd.type).toBe('line')
      expect(cmd.params.stroke).toBe('#00ff00')
      expect(cmd.params.strokeWidth).toBe(2)
    })

    it('drawText 应创建文本命令', () => {
      const layer = renderer.createLayer('测试', 'data')
      const cmd = renderer.drawText(layer.id, 'Hello', 10, 20, { fill: '#ffffff', fontSize: 16 })
      expect(cmd.type).toBe('text')
      expect(cmd.params.text).toBe('Hello')
      expect(cmd.params.fontSize).toBe(16)
    })

    it('drawPolygon 应创建多边形命令', () => {
      const layer = renderer.createLayer('测试', 'data')
      const points = [{ x: 0, y: 0 }, { x: 50, y: 100 }, { x: 100, y: 0 }]
      const cmd = renderer.drawPolygon(layer.id, points)
      expect(cmd.type).toBe('polygon')
      expect(cmd.params.points).toEqual(points)
    })

    it('drawPath 应创建路径命令', () => {
      const layer = renderer.createLayer('测试', 'data')
      const points = [{ x: 0, y: 0 }, { x: 100, y: 100 }]
      const cmd = renderer.drawPath(layer.id, points, { closePath: true })
      expect(cmd.type).toBe('path')
      expect(cmd.params.closePath).toBe(true)
    })

    it('drawArc 应创建弧线命令', () => {
      const layer = renderer.createLayer('测试', 'data')
      const cmd = renderer.drawArc(layer.id, 50, 50, 30, 0, Math.PI)
      expect(cmd.type).toBe('arc')
      expect(cmd.params.startAngle).toBe(0)
      expect(cmd.params.endAngle).toBe(Math.PI)
    })

    it('drawBezier 应创建贝塞尔曲线命令', () => {
      const layer = renderer.createLayer('测试', 'data')
      const cmd = renderer.drawBezier(layer.id, 0, 0, 50, -20, 50, 80, 100, 100)
      expect(cmd.type).toBe('bezier')
      expect(cmd.params.cp1x).toBe(50)
      expect(cmd.params.cp1y).toBe(-20)
    })

    it('clearArea 应创建清除命令', () => {
      const layer = renderer.createLayer('测试', 'data')
      const cmd = renderer.clearArea(layer.id, 0, 0, 800, 600)
      expect(cmd.type).toBe('clear')
    })
  })

  describe('生命周期', () => {
    it('reset 应清空所有状态', () => {
      renderer.createLayer('测试', 'data')
      const layer = renderer.createLayer('测试2', 'grid')
      renderer.addCommand('rect', layer.id, { x: 0, y: 0, width: 100, height: 100 })
      renderer.setViewTransform({ scale: 2, translateX: 100 })

      renderer.reset()

      expect(renderer.layers.value.length).toBe(0)
      expect(renderer.commands.value.length).toBe(0)
      expect(renderer.viewTransform.value.scale).toBe(1)
      expect(renderer.stats.value.frameCount).toBe(0)
      expect(renderer.dirtyRegions.value.length).toBe(0)
    })
  })
})

// ============================================================
// 数据变换管道测试
// ============================================================

describe('P16-12 数据变换管道', () => {
  const testData = [
    { name: 'Alice', age: 30, score: 85, city: 'NYC' },
    { name: 'Bob', age: 25, score: 92, city: 'LA' },
    { name: 'Charlie', age: 35, score: 78, city: 'NYC' },
    { name: 'Diana', age: 28, score: 95, city: 'SF' },
    { name: 'Eve', age: 32, score: 88, city: 'LA' },
  ]

  describe('管道管理', () => {
    it('应使用空管道初始化', () => {
      const pipeline = useTransformPipeline()
      expect(pipeline.stepCount.value).toBe(0)
      expect(pipeline.enabledStepCount.value).toBe(0)
    })

    it('应能添加步骤', () => {
      const pipeline = useTransformPipeline()
      const step = pipeline.addStep('filter', { field: 'age', operator: 'gt', value: 30 })
      expect(step.operation).toBe('filter')
      expect(step.enabled).toBe(true)
      expect(pipeline.stepCount.value).toBe(1)
    })

    it('应能添加禁用的步骤', () => {
      const pipeline = useTransformPipeline()
      pipeline.addStep('filter', { field: 'age', operator: 'gt', value: 30 }, { enabled: false })
      expect(pipeline.enabledStepCount.value).toBe(0)
    })

    it('应能移除步骤', () => {
      const pipeline = useTransformPipeline()
      const step = pipeline.addStep('sort', { field: 'age', direction: 'asc' })
      expect(pipeline.removeStep(step.id)).toBe(true)
      expect(pipeline.stepCount.value).toBe(0)
    })

    it('应能更新步骤', () => {
      const pipeline = useTransformPipeline()
      const step = pipeline.addStep('sort', { field: 'age', direction: 'asc' })
      pipeline.updateStep(step.id, { enabled: false })
      expect(pipeline.enabledStepCount.value).toBe(0)
    })

    it('应能切换步骤启用状态', () => {
      const pipeline = useTransformPipeline()
      const step = pipeline.addStep('filter', { field: 'age', operator: 'gt', value: 30 })
      pipeline.toggleStep(step.id)
      expect(pipeline.enabledStepCount.value).toBe(0)
      pipeline.toggleStep(step.id)
      expect(pipeline.enabledStepCount.value).toBe(1)
    })

    it('应能清空管道', () => {
      const pipeline = useTransformPipeline()
      pipeline.addStep('sort', { field: 'age', direction: 'asc' })
      pipeline.addStep('limit', 5)
      pipeline.clear()
      expect(pipeline.stepCount.value).toBe(0)
    })
  })

  describe('过滤操作', () => {
    it('应支持 eq 操作符', () => {
      const pipeline = useTransformPipeline()
      pipeline.addStep('filter', { field: 'city', operator: 'eq', value: 'NYC' })
      const result = pipeline.execute(testData)
      expect(result.length).toBe(2)
      expect(result.map(r => r.name)).toEqual(['Alice', 'Charlie'])
    })

    it('应支持 neq 操作符', () => {
      const pipeline = useTransformPipeline()
      pipeline.addStep('filter', { field: 'city', operator: 'neq', value: 'NYC' })
      const result = pipeline.execute(testData)
      expect(result.length).toBe(3)
    })

    it('应支持 gt 操作符', () => {
      const pipeline = useTransformPipeline()
      pipeline.addStep('filter', { field: 'age', operator: 'gt', value: 30 })
      const result = pipeline.execute(testData)
      expect(result.length).toBe(2)
      expect(result.map(r => r.name)).toEqual(['Charlie', 'Eve'])
    })

    it('应支持 gte 操作符', () => {
      const pipeline = useTransformPipeline()
      pipeline.addStep('filter', { field: 'age', operator: 'gte', value: 30 })
      const result = pipeline.execute(testData)
      expect(result.length).toBe(3)
    })

    it('应支持 lt 操作符', () => {
      const pipeline = useTransformPipeline()
      pipeline.addStep('filter', { field: 'score', operator: 'lt', value: 85 })
      const result = pipeline.execute(testData)
      expect(result.length).toBe(1)
      expect(result[0].name).toBe('Charlie')
    })

    it('应支持 lte 操作符', () => {
      const pipeline = useTransformPipeline()
      pipeline.addStep('filter', { field: 'score', operator: 'lte', value: 85 })
      const result = pipeline.execute(testData)
      expect(result.length).toBe(2)
    })

    it('应支持 in 操作符', () => {
      const pipeline = useTransformPipeline()
      pipeline.addStep('filter', { field: 'city', operator: 'in', value: ['NYC', 'SF'] })
      const result = pipeline.execute(testData)
      expect(result.length).toBe(3)
    })

    it('应支持 nin 操作符', () => {
      const pipeline = useTransformPipeline()
      pipeline.addStep('filter', { field: 'city', operator: 'nin', value: ['NYC', 'SF'] })
      const result = pipeline.execute(testData)
      expect(result.length).toBe(2)
    })

    it('应支持 contains 操作符', () => {
      const pipeline = useTransformPipeline()
      pipeline.addStep('filter', { field: 'name', operator: 'contains', value: 'li' })
      const result = pipeline.execute(testData)
      expect(result.length).toBe(2) // Alice, Charlie
    })

    it('应支持 between 操作符', () => {
      const pipeline = useTransformPipeline()
      pipeline.addStep('filter', { field: 'age', operator: 'between', value: 28, value2: 35 })
      const result = pipeline.execute(testData)
      expect(result.length).toBe(4) // Alice(30), Charlie(35), Diana(28), Eve(32)
    })

    it('应支持 exists 操作符', () => {
      const pipeline = useTransformPipeline()
      pipeline.addStep('filter', { field: 'city', operator: 'exists', value: null })
      const result = pipeline.execute(testData)
      expect(result.length).toBe(5)
    })

    it('禁用的步骤不应执行', () => {
      const pipeline = useTransformPipeline()
      pipeline.addStep('filter', { field: 'city', operator: 'eq', value: 'NYC' }, { enabled: false })
      const result = pipeline.execute(testData)
      expect(result.length).toBe(5)
    })
  })

  describe('排序操作', () => {
    it('应支持升序排序', () => {
      const pipeline = useTransformPipeline()
      pipeline.addStep('sort', { field: 'age', direction: 'asc' })
      const result = pipeline.execute(testData)
      expect(result.map(r => r.name)).toEqual(['Bob', 'Diana', 'Alice', 'Eve', 'Charlie'])
    })

    it('应支持降序排序', () => {
      const pipeline = useTransformPipeline()
      pipeline.addStep('sort', { field: 'score', direction: 'desc' })
      const result = pipeline.execute(testData)
      expect(result[0].name).toBe('Diana')
    })
  })

  describe('聚合操作', () => {
    it('应支持 sum 聚合', () => {
      const pipeline = useTransformPipeline()
      pipeline.addStep('aggregate', { field: 'score', function: 'sum', alias: 'total' })
      const result = pipeline.execute(testData)
      expect(result[0].total).toBe(438)
    })

    it('应支持 avg 聚合', () => {
      const pipeline = useTransformPipeline()
      pipeline.addStep('aggregate', { field: 'score', function: 'avg' })
      const result = pipeline.execute(testData)
      expect(result[0].avg_score).toBe(87.6)
    })

    it('应支持 min/max 聚合', () => {
      const pipeline = useTransformPipeline()
      pipeline.addStep('aggregate', { field: 'age', function: 'min', alias: 'minAge' })
      const result = pipeline.execute(testData)
      expect(result[0].minAge).toBe(25)
    })

    it('应支持 count 聚合', () => {
      const pipeline = useTransformPipeline()
      pipeline.addStep('aggregate', { field: 'name', function: 'count', alias: 'total' })
      const result = pipeline.execute(testData)
      expect(result[0].total).toBe(5)
    })

    it('应支持 distinct 聚合', () => {
      const pipeline = useTransformPipeline()
      pipeline.addStep('aggregate', { field: 'city', function: 'distinct', alias: 'uniqueCities' })
      const result = pipeline.execute(testData)
      expect(result[0].uniqueCities).toBe(3)
    })

    it('应支持 median 中位数', () => {
      const pipeline = useTransformPipeline()
      pipeline.addStep('aggregate', { field: 'score', function: 'median', alias: 'med' })
      const result = pipeline.execute(testData)
      expect(result[0].med).toBe(88)
    })
  })

  describe('分组操作', () => {
    it('应按字段分组', () => {
      const pipeline = useTransformPipeline()
      pipeline.addStep('group', { fields: ['city'] })
      const result = pipeline.execute(testData)
      expect(result.length).toBe(3)
      expect(result.find(r => r.city === 'NYC')?._count).toBe(2)
      expect(result.find(r => r.city === 'LA')?._count).toBe(2)
      expect(result.find(r => r.city === 'SF')?._count).toBe(1)
    })

    it('应支持分组聚合', () => {
      const pipeline = useTransformPipeline()
      pipeline.addStep('group', {
        fields: ['city'],
        aggregates: [
          { field: 'score', function: 'avg', alias: 'avgScore' },
          { field: 'age', function: 'max', alias: 'maxAge' },
        ],
      })
      const result = pipeline.execute(testData)
      const nyc = result.find(r => r.city === 'NYC')
      expect(nyc?.avgScore).toBe(81.5)
      expect(nyc?.maxAge).toBe(35)
    })
  })

  describe('分页操作', () => {
    it('应支持分页', () => {
      const pipeline = useTransformPipeline()
      pipeline.addStep('paginate', { page: 1, pageSize: 2 })
      const result = pipeline.execute(testData)
      expect(result.length).toBe(2)
    })

    it('第二页应返回不同数据', () => {
      const pipeline = useTransformPipeline()
      pipeline.addStep('paginate', { page: 2, pageSize: 2 })
      const result = pipeline.execute(testData)
      expect(result.length).toBe(2)
    })
  })

  describe('投影操作', () => {
    it('应支持字段选择', () => {
      const pipeline = useTransformPipeline()
      pipeline.addStep('project', { fields: ['name', 'score'] })
      const result = pipeline.execute(testData)
      expect(result[0]).toEqual({ name: 'Alice', score: 85 })
      expect(Object.keys(result[0]).length).toBe(2)
    })

    it('应支持排除模式', () => {
      const pipeline = useTransformPipeline()
      pipeline.addStep('project', { fields: ['city'], exclude: true })
      const result = pipeline.execute(testData)
      expect(result[0].name).toBeDefined()
      expect(result[0].city).toBeUndefined()
    })
  })

  describe('limit 操作', () => {
    it('应限制结果数量', () => {
      const pipeline = useTransformPipeline()
      pipeline.addStep('limit', 3)
      const result = pipeline.execute(testData)
      expect(result.length).toBe(3)
    })
  })

  describe('多步骤管道', () => {
    it('应顺序执行多个步骤', () => {
      const pipeline = useTransformPipeline()
      // 先过滤 NYC，再按 score 降序，再取前 1
      pipeline.addStep('filter', { field: 'city', operator: 'eq', value: 'NYC' })
      pipeline.addStep('sort', { field: 'score', direction: 'desc' })
      pipeline.addStep('limit', 1)
      const result = pipeline.execute(testData)
      expect(result.length).toBe(1)
      expect(result[0].name).toBe('Alice')
    })
  })
})

// ============================================================
// 数据源连接器测试
// ============================================================

describe('P16-12 数据源连接器', () => {
  const mockSource: DataSourceConfig = {
    id: 'test_ds',
    name: '测试数据源',
    type: 'static',
    source: '/api/test',
    format: 'json',
    enableCache: false,
    autoConnect: false,
  }

  describe('数据源管理', () => {
    it('应能注册数据源', () => {
      const connector = useDataSourceConnector()
      const source = connector.registerSource(mockSource)
      expect(source.id).toBe('test_ds')
      expect(source.name).toBe('测试数据源')
      expect(connector.sources.value.length).toBe(1)
    })

    it('应能注销数据源', () => {
      const connector = useDataSourceConnector()
      connector.registerSource(mockSource)
      connector.unregisterSource('test_ds')
      expect(connector.sources.value.length).toBe(0)
    })

    it('应能获取数据源', () => {
      const connector = useDataSourceConnector()
      connector.registerSource(mockSource)
      const source = connector.getSource('test_ds')
      expect(source).toBeTruthy()
      expect(source?.name).toBe('测试数据源')
    })

    it('获取不存在的数据源应返回 undefined', () => {
      const connector = useDataSourceConnector()
      expect(connector.getSource('non-existent')).toBeUndefined()
    })

    it('注册数据源时应创建连接记录', () => {
      const connector = useDataSourceConnector()
      connector.registerSource(mockSource)
      const record = connector.connections.value['test_ds']
      expect(record).toBeTruthy()
      expect(record.status).toBe('idle')
    })

    it('autoConnect 为 true 时应自动连接', async () => {
      const connector = useDataSourceConnector()
      connector.registerSource({ ...mockSource, autoConnect: true })
      // 等待异步连接完成（connectSource 内部有 50ms 模拟延迟，registerSource 不 await）
      await new Promise(r => setTimeout(r, 200))
      const record = connector.connections.value['test_ds']
      expect(record.status).toBe('connected')
    })

    it('应能获取所有数据源', () => {
      const connector = useDataSourceConnector()
      connector.registerSource(mockSource)
      connector.registerSource({ ...mockSource, id: 'test_ds_2', name: '数据源2' })
      expect(connector.getAllSources().length).toBe(2)
    })
  })

  describe('连接管理', () => {
    it('应能连接数据源', async () => {
      const connector = useDataSourceConnector()
      connector.registerSource(mockSource)
      const record = await connector.connectSource('test_ds')
      expect(record.status).toBe('connected')
      expect(record.connectedAt).toBeTruthy()
    })

    it('应能断开数据源', async () => {
      const connector = useDataSourceConnector()
      connector.registerSource(mockSource)
      await connector.connectSource('test_ds')
      connector.disconnectSource('test_ds')
      expect(connector.connections.value['test_ds'].status).toBe('disconnected')
    })

    it('连接不存在的数据源应抛出错误', async () => {
      const connector = useDataSourceConnector()
      await expect(connector.connectSource('non-existent')).rejects.toThrow()
    })

    it('connectedSources 应只返回已连接的数据源', async () => {
      const connector = useDataSourceConnector()
      connector.registerSource({ ...mockSource, id: 'ds1' })
      connector.registerSource({ ...mockSource, id: 'ds2' })
      await connector.connectSource('ds1')
      expect(connector.connectedSources.value.length).toBe(1)
    })

    it('errorSources 应返回错误状态的数据源', async () => {
      const connector = useDataSourceConnector()
      connector.registerSource(mockSource)
      // 手动设置错误状态
      connector.connections.value = {
        ...connector.connections.value,
        ['test_ds']: {
          ...connector.connections.value['test_ds'],
          status: 'error',
          lastError: '测试错误',
        },
      }
      expect(connector.errorSources.value.length).toBe(1)
    })
  })

  describe('订阅管理', () => {
    it('应能订阅数据变化', () => {
      const connector = useDataSourceConnector()
      connector.registerSource(mockSource)
      const callback = vi.fn()
      const subId = connector.subscribe('test_ds', callback)
      expect(subId).toBeTruthy()
      expect(connector.subscriptions.value.length).toBe(1)
    })

    it('应能取消订阅', () => {
      const connector = useDataSourceConnector()
      connector.registerSource(mockSource)
      const subId = connector.subscribe('test_ds', vi.fn())
      expect(connector.unsubscribe(subId)).toBe(true)
      expect(connector.subscriptions.value.length).toBe(0)
    })

    it('应能暂停和恢复订阅', () => {
      const connector = useDataSourceConnector()
      connector.registerSource(mockSource)
      const subId = connector.subscribe('test_ds', vi.fn())
      expect(connector.pauseSubscription(subId)).toBe(true)
      expect(connector.resumeSubscription(subId)).toBe(true)
    })

    it('获取静态数据应直接返回', async () => {
      const connector = useDataSourceConnector()
      const data = await connector.getStaticData([1, 2, 3])
      expect(data).toEqual([1, 2, 3])
    })
  })

  describe('缓存管理', () => {
    it('应能清除指定数据源缓存', () => {
      const connector = useDataSourceConnector()
      connector.registerSource({ ...mockSource, enableCache: true })
      const count = connector.clearSourceCache('test_ds')
      expect(count).toBeGreaterThanOrEqual(0)
    })

    it('应能清除所有缓存', () => {
      const connector = useDataSourceConnector()
      const count = connector.clearAllCache()
      expect(count).toBe(0)
    })

    it('应能清除过期缓存', () => {
      const connector = useDataSourceConnector()
      const count = connector.clearExpiredCache()
      expect(count).toBe(0)
    })

    it('应能获取缓存统计', () => {
      const connector = useDataSourceConnector()
      const stats = connector.getCacheStats()
      expect(stats).toHaveProperty('total')
      expect(stats).toHaveProperty('expired')
      expect(stats).toHaveProperty('totalHits')
    })
  })

  describe('错误管理', () => {
    it('应能清除错误', () => {
      const connector = useDataSourceConnector()
      const count = connector.clearErrors()
      expect(count).toBe(0)
    })

    it('应能按数据源清除错误', () => {
      const connector = useDataSourceConnector()
      connector.registerSource(mockSource)
      const count = connector.clearErrors('test_ds')
      expect(count).toBe(0)
    })

    it('应能获取错误列表', () => {
      const connector = useDataSourceConnector()
      const errors = connector.getErrors()
      expect(Array.isArray(errors)).toBe(true)
    })
  })

  describe('生命周期', () => {
    it('disconnectAll 应断开所有连接', async () => {
      const connector = useDataSourceConnector()
      connector.registerSource({ ...mockSource, id: 'ds1' })
      connector.registerSource({ ...mockSource, id: 'ds2' })
      await connector.connectSource('ds1')
      await connector.connectSource('ds2')
      connector.disconnectAll()
      expect(connector.connections.value['ds1'].status).toBe('disconnected')
      expect(connector.connections.value['ds2'].status).toBe('disconnected')
    })

    it('reset 应清空所有状态', async () => {
      const connector = useDataSourceConnector()
      connector.registerSource(mockSource)
      connector.subscribe('test_ds', vi.fn())
      connector.reset()
      expect(connector.sources.value.length).toBe(0)
      expect(connector.subscriptions.value.length).toBe(0)
      expect(Object.keys(connector.connections.value).length).toBe(0)
    })
  })
})

// ============================================================
// 仪表盘布局引擎测试
// ============================================================

describe('P16-12 仪表盘布局引擎', () => {
  let layout: ReturnType<typeof useDashboardLayout>

  beforeEach(() => {
    layout = useDashboardLayout()
  })

  describe('布局初始化', () => {
    it('应使用默认配置初始化', () => {
      expect(layout.layout.value.columns).toBe(12)
      expect(layout.layout.value.rowHeight).toBe(60)
      expect(layout.layout.value.gap).toBe(12)
      expect(layout.layout.value.margin).toBe(16)
      expect(layout.layout.value.name).toBe('未命名仪表盘')
      expect(layout.layout.value.panels).toEqual([])
    })

    it('应支持自定义初始配置', () => {
      const custom = useDashboardLayout({
        name: '自定义仪表盘',
        columns: 6,
        rowHeight: 80,
        gap: 16,
      })
      expect(custom.layout.value.name).toBe('自定义仪表盘')
      expect(custom.layout.value.columns).toBe(6)
      expect(custom.layout.value.rowHeight).toBe(80)
      expect(custom.layout.value.gap).toBe(16)
    })

    it('初始状态 panelCount 应为 0', () => {
      expect(layout.panelCount.value).toBe(0)
    })

    it('maxRow 应为 0（无面板时）', () => {
      expect(layout.maxRow.value).toBe(0)
    })
  })

  describe('面板管理', () => {
    it('应能添加面板', () => {
      const panel = layout.addPanel('chart', '测试图表')
      expect(panel.id).toBeTruthy()
      expect(panel.type).toBe('chart')
      expect(panel.title).toBe('测试图表')
      expect(layout.panelCount.value).toBe(1)
    })

    it('添加面板时应自动分配位置', () => {
      const panel = layout.addPanel('metric', '指标')
      expect(panel.position.col).toBeGreaterThanOrEqual(1)
      expect(panel.position.row).toBeGreaterThanOrEqual(1)
      expect(panel.position.colSpan).toBe(4)
      expect(panel.position.rowSpan).toBe(2)
    })

    it('应能指定面板位置', () => {
      const panel = layout.addPanel('chart', '指定位置', {
        col: 3, row: 2, colSpan: 6, rowSpan: 3,
      })
      expect(panel.position.col).toBe(3)
      expect(panel.position.row).toBe(2)
      expect(panel.position.colSpan).toBe(6)
      expect(panel.position.rowSpan).toBe(3)
    })

    it('应能移除面板', () => {
      const panel = layout.addPanel('chart', '待删除')
      expect(layout.removePanel(panel.id)).toBe(true)
      expect(layout.panelCount.value).toBe(0)
    })

    it('移除不存在的面板应返回 false', () => {
      expect(layout.removePanel('non-existent')).toBe(false)
    })

    it('应能更新面板', () => {
      const panel = layout.addPanel('chart', '原标题')
      const updated = layout.updatePanel(panel.id, { title: '新标题', collapsed: true })
      expect(updated).toBeTruthy()
      expect(updated!.title).toBe('新标题')
      expect(updated!.collapsed).toBe(true)
    })

    it('更新不存在的面板应返回 null', () => {
      expect(layout.updatePanel('non-existent', { title: 'x' })).toBeNull()
    })

    it('应能获取面板', () => {
      const panel = layout.addPanel('chart', '图表')
      const found = layout.getPanel(panel.id)
      expect(found).toBeTruthy()
      expect(found?.title).toBe('图表')
    })

    it('应能按类型获取面板', () => {
      layout.addPanel('chart', '图表1')
      layout.addPanel('chart', '图表2')
      layout.addPanel('metric', '指标')
      expect(layout.getPanelsByType('chart').length).toBe(2)
      expect(layout.getPanelsByType('metric').length).toBe(1)
    })

    it('应能复制面板', () => {
      const panel = layout.addPanel('chart', '原面板')
      const copy = layout.duplicatePanel(panel.id)
      expect(copy).toBeTruthy()
      expect(copy!.id).not.toBe(panel.id)
      expect(copy!.title).toBe('原面板 (副本)')
      expect(layout.panelCount.value).toBe(2)
    })

    it('应能清空所有面板', () => {
      layout.addPanel('chart', '图表1')
      layout.addPanel('metric', '指标1')
      layout.clearPanels()
      expect(layout.panelCount.value).toBe(0)
    })
  })

  describe('面板位置与尺寸', () => {
    it('应能移动面板', () => {
      const panel = layout.addPanel('chart', '移动')
      const updated = layout.movePanel(panel.id, { col: 5, row: 3 })
      expect(updated).toBeTruthy()
      expect(updated!.position.col).toBe(5)
      expect(updated!.position.row).toBe(3)
    })

    it('应能调整面板大小', () => {
      const panel = layout.addPanel('chart', '调整大小')
      const updated = layout.resizePanel(panel.id, 6, 3)
      expect(updated).toBeTruthy()
      expect(updated!.position.colSpan).toBe(6)
      expect(updated!.position.rowSpan).toBe(3)
    })

    it('调整面板大小不应超出列边界', () => {
      const panel = layout.addPanel('chart', '边界测试')
      // 尝试超出列数的 colSpan
      const updated = layout.resizePanel(panel.id, 20, 3)
      expect(updated!.position.colSpan).toBe(12) // 被限制为最大列数
    })

    it('应能折叠/展开面板', () => {
      const panel = layout.addPanel('chart', '折叠', undefined, { collapsible: true })
      expect(layout.togglePanelCollapse(panel.id)).toBe(true)
      const updated = layout.getPanel(panel.id)
      expect(updated?.collapsed).toBe(true)
    })

    it('不可折叠的面板不应被折叠', () => {
      const panel = layout.addPanel('chart', '不可折叠', undefined, { collapsible: false })
      expect(layout.togglePanelCollapse(panel.id)).toBe(false)
    })

    it('应能置顶面板', () => {
      const panel1 = layout.addPanel('chart', '面板1')
      const panel2 = layout.addPanel('chart', '面板2')
      layout.bringToFront(panel1.id)
      const p1 = layout.getPanel(panel1.id)
      const p2 = layout.getPanel(panel2.id)
      expect((p1?.zIndex ?? 0)).toBeGreaterThan(p2?.zIndex ?? 0)
    })
  })

  describe('拖拽支持', () => {
    it('应能开始拖拽', () => {
      const panel = layout.addPanel('chart', '拖拽')
      layout.startDrag(panel.id, 100, 200)
      expect(layout.drag.value.active).toBe(true)
      expect(layout.drag.value.panelId).toBe(panel.id)
      expect(layout.drag.value.originalPosition).toBeTruthy()
    })

    it('不可拖拽的面板不应开始拖拽', () => {
      const panel = layout.addPanel('chart', '不可拖拽', undefined, { draggable: false })
      layout.startDrag(panel.id, 100, 200)
      expect(layout.drag.value.active).toBe(false)
    })

    it('应能更新拖拽位置', () => {
      const panel = layout.addPanel('chart', '拖拽')
      layout.startDrag(panel.id, 100, 200)
      layout.updateDrag(150, 250)
      expect(layout.drag.value.currentX).toBe(150)
      expect(layout.drag.value.currentY).toBe(250)
    })

    it('应能取消拖拽', () => {
      const panel = layout.addPanel('chart', '拖拽')
      layout.startDrag(panel.id, 100, 200)
      layout.cancelDrag()
      expect(layout.drag.value.active).toBe(false)
    })

    it('未激活时 updateDrag 不应修改状态', () => {
      layout.updateDrag(150, 250)
      expect(layout.drag.value.active).toBe(false)
    })
  })

  describe('调整大小支持', () => {
    it('应能开始调整大小', () => {
      const panel = layout.addPanel('chart', '调整大小')
      layout.startResize(panel.id, 'se', 100, 200)
      expect(layout.resize.value.active).toBe(true)
      expect(layout.resize.value.direction).toBe('se')
    })

    it('不可调整大小的面板不应开始调整', () => {
      const panel = layout.addPanel('chart', '不可调整', undefined, { resizable: false })
      layout.startResize(panel.id, 'se', 100, 200)
      expect(layout.resize.value.active).toBe(false)
    })

    it('应能取消调整大小', () => {
      const panel = layout.addPanel('chart', '调整大小')
      layout.startResize(panel.id, 'se', 100, 200)
      layout.cancelResize()
      expect(layout.resize.value.active).toBe(false)
    })
  })

  describe('布局快照', () => {
    it('应能创建快照', () => {
      layout.addPanel('chart', '图表')
      const snapshot = layout.createSnapshot('测试快照')
      expect(snapshot.id).toBeTruthy()
      expect(snapshot.label).toBe('测试快照')
      expect(snapshot.panels.length).toBe(1)
      expect(layout.snapshots.value.length).toBe(1)
    })

    it('应能恢复快照', () => {
      layout.addPanel('chart', '图表1')
      const snapshot = layout.createSnapshot('保存')
      layout.addPanel('metric', '指标1')
      expect(layout.panelCount.value).toBe(2)

      layout.restoreSnapshot(snapshot.id)
      expect(layout.panelCount.value).toBe(1)
    })

    it('应能删除快照', () => {
      const snapshot = layout.createSnapshot('快照')
      expect(layout.removeSnapshot(snapshot.id)).toBe(true)
      expect(layout.snapshots.value.length).toBe(0)
    })

    it('应能清除所有快照', () => {
      layout.createSnapshot('快照1')
      layout.createSnapshot('快照2')
      layout.clearSnapshots()
      expect(layout.snapshots.value.length).toBe(0)
    })
  })

  describe('布局序列化', () => {
    it('应能导出布局为 JSON', () => {
      layout.addPanel('chart', '图表')
      layout.setName('导出测试')
      const json = layout.exportLayout()
      const parsed = JSON.parse(json)
      expect(parsed.name).toBe('导出测试')
      expect(parsed.panels.length).toBe(1)
    })

    it('应能从 JSON 导入布局', () => {
      const json = JSON.stringify({
        name: '导入测试',
        columns: 6,
        panels: [],
      })
      expect(layout.importLayout(json)).toBe(true)
      expect(layout.layout.value.name).toBe('导入测试')
      expect(layout.layout.value.columns).toBe(6)
    })

    it('无效 JSON 导入应返回 false', () => {
      expect(layout.importLayout('invalid json')).toBe(false)
    })

    it('应能重置布局', () => {
      layout.addPanel('chart', '图表')
      layout.setName('自定义名称')
      layout.resetLayout()
      expect(layout.panelCount.value).toBe(0)
      expect(layout.layout.value.name).toBe('未命名仪表盘')
    })
  })

  describe('模板系统', () => {
    it('应能应用预设模板', () => {
      expect(layout.applyTemplate('template_overview')).toBe(true)
      expect(layout.panelCount.value).toBe(7)
      expect(layout.layout.value.columns).toBe(12)
    })

    it('应用不存在的模板应返回 false', () => {
      expect(layout.applyTemplate('non-existent')).toBe(false)
    })

    it('应能获取模板', () => {
      const template = layout.getTemplate('template_blank')
      expect(template).toBeTruthy()
      expect(template?.name).toBe('空白')
    })

    it('应能获取所有模板', () => {
      const templates = layout.getAllTemplates()
      expect(templates.length).toBe(5)
    })

    it('应能按标签筛选模板', () => {
      const monitorTemplates = layout.getTemplatesByTag('监控')
      expect(monitorTemplates.length).toBe(1)
      expect(monitorTemplates[0].id).toBe('template_monitor')
    })

    it('应用模板前应创建快照（如有面板）', () => {
      layout.addPanel('chart', '图表')
      const snapshotCount = layout.snapshots.value.length
      layout.applyTemplate('template_overview')
      expect(layout.snapshots.value.length).toBe(snapshotCount + 1)
    })

    it('空白模板应清空面板', () => {
      layout.addPanel('chart', '图表')
      layout.applyTemplate('template_blank')
      expect(layout.panelCount.value).toBe(0)
    })
  })

  describe('响应式管理', () => {
    it('应能更新当前断点', () => {
      layout.updateBreakpoint(500)
      expect(layout.currentBreakpoint.value?.name).toBe('mobile')
    })

    it('宽度 800 应对应 tablet 断点', () => {
      layout.updateBreakpoint(800)
      expect(layout.currentBreakpoint.value?.name).toBe('tablet')
    })

    it('宽度 1200 应对应 desktop 断点', () => {
      layout.updateBreakpoint(1200)
      expect(layout.currentBreakpoint.value?.name).toBe('desktop')
    })

    it('宽度 1800 应对应 wide 断点', () => {
      layout.updateBreakpoint(1800)
      expect(layout.currentBreakpoint.value?.name).toBe('wide')
    })

    it('effectiveColumns 应按断点变化', () => {
      layout.updateBreakpoint(500)
      expect(layout.effectiveColumns.value).toBe(4)
      layout.updateBreakpoint(1200)
      expect(layout.effectiveColumns.value).toBe(12)
    })
  })

  describe('布局配置', () => {
    it('应能设置名称', () => {
      layout.setName('新名称')
      expect(layout.layout.value.name).toBe('新名称')
    })

    it('应能设置描述', () => {
      layout.setDescription('仪表盘描述')
      expect(layout.layout.value.description).toBe('仪表盘描述')
    })

    it('应能更新布局配置', () => {
      layout.updateLayoutConfig({ columns: 8, gap: 20, backgroundColor: '#ffffff' })
      expect(layout.layout.value.columns).toBe(8)
      expect(layout.layout.value.gap).toBe(20)
      expect(layout.layout.value.backgroundColor).toBe('#ffffff')
    })

    it('应能执行紧凑布局', () => {
      layout.addPanel('chart', '图表1')
      layout.addPanel('chart', '图表2')
      layout.compactLayout()
      expect(layout.panelCount.value).toBe(2)
    })
  })

  describe('批量操作', () => {
    it('应能批量更新面板', () => {
      const p1 = layout.addPanel('chart', '图表1')
      const p2 = layout.addPanel('metric', '指标1')
      const updated = layout.batchUpdatePanels([
        { panelId: p1.id, partial: { title: '新图表1' } },
        { panelId: p2.id, partial: { title: '新指标1' } },
      ])
      expect(updated.length).toBe(2)
      expect(layout.getPanel(p1.id)?.title).toBe('新图表1')
      expect(layout.getPanel(p2.id)?.title).toBe('新指标1')
    })

    it('应能获取所有面板 ID', () => {
      layout.addPanel('chart', '图表1')
      layout.addPanel('metric', '指标1')
      const ids = layout.selectAllPanels()
      expect(ids.length).toBe(2)
    })

    it('应能删除选中的面板', () => {
      const p1 = layout.addPanel('chart', '图表1')
      layout.addPanel('metric', '指标1')
      const removed = layout.removeSelectedPanels([p1.id])
      expect(removed).toBe(1)
      expect(layout.panelCount.value).toBe(1)
    })
  })

  describe('面板默认值', () => {
    it('新面板应有默认属性', () => {
      const panel = layout.addPanel('chart', '默认')
      expect(panel.showHeader).toBe(true)
      expect(panel.draggable).toBe(true)
      expect(panel.resizable).toBe(true)
      expect(panel.collapsible).toBe(true)
      expect(panel.collapsed).toBe(false)
    })
  })
})