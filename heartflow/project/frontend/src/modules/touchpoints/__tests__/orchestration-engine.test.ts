// ============================================================
// 殿堂触角 · 触角编排引擎测试（INCR-97）
// ============================================================
import { describe, expect, it, beforeEach } from 'vitest'
import { useOrchestrationEngine } from '../orchestration-engine'

describe('P20-7 触角编排引擎', () => {
  let engine: ReturnType<typeof useOrchestrationEngine>

  beforeEach(() => {
    engine = useOrchestrationEngine()
    // 清理存储中的累积数据
    engine.linkageRules.value = []
    engine.scenePresets.value = []
    engine.stats.value = []
    engine.adaptiveLayouts.value = []
  })

  // ---- 场景感知 ----

  describe('场景感知', () => {
    it('默认场景为空闲', () => {
      expect(engine.currentScene.value.type).toBe('idle')
      expect(engine.currentScene.value.name).toBe('空闲')
    })

    it('detectScene 返回合法场景类型', () => {
      const type = engine.detectScene()
      expect(['focus', 'rest', 'morning-ritual', 'evening-review', 'creative', 'social', 'idle', 'custom']).toContain(type)
    })

    it('updateScene 更新场景上下文', () => {
      engine.updateScene({ type: 'focus', name: '专注模式', isFocusing: true })
      expect(engine.currentScene.value.type).toBe('focus')
      expect(engine.currentScene.value.isFocusing).toBe(true)
    })

    it('updateScene 自动推导时段', () => {
      engine.updateScene({ type: 'focus' })
      expect(['morning', 'afternoon', 'evening', 'night']).toContain(engine.currentScene.value.timeOfDay)
    })

    it('场景切换时应用预设', () => {
      engine.addScenePreset({
        type: 'focus',
        name: '专注模式',
        description: '测试',
        widgetConfig: { visibleTypes: ['pomodoro'], hiddenTypes: [] },
        glowOverride: {},
        floatingOverride: {},
      })
      engine.updateScene({ type: 'focus', name: '专注模式' })
      expect(engine.activeScenePreset.value?.type).toBe('focus')
    })
  })

  // ---- 联动规则 ----

  describe('联动规则', () => {
    it('addLinkageRule 添加规则并持久化', () => {
      const rule = engine.addLinkageRule({
        name: '测试规则',
        sourceType: 'widget',
        trigger: { type: 'state-change', params: { widget: 'pomodoro', state: 'started' } },
        targets: [{ targetType: 'glow', action: 'intensify', params: {}, delay: 0 }],
        enabled: true,
        priority: 5,
        cooldown: 1000,
      })
      expect(rule.id).toBeTruthy()
      expect(engine.linkageRules.value.length).toBe(1)
    })

    it('toggleLinkageRule 切换启用状态', () => {
      const rule = engine.addLinkageRule({
        name: '测试规则',
        sourceType: 'widget',
        trigger: { type: 'state-change', params: {} },
        targets: [{ targetType: 'glow', action: 'dim', params: {}, delay: 0 }],
        enabled: true,
        priority: 5,
        cooldown: 1000,
      })
      const toggled = engine.toggleLinkageRule(rule.id)
      expect(toggled?.enabled).toBe(false)
      const toggledBack = engine.toggleLinkageRule(rule.id)
      expect(toggledBack?.enabled).toBe(true)
    })

    it('toggleLinkageRule 不存在的规则返回 null', () => {
      expect(engine.toggleLinkageRule('nonexistent')).toBeNull()
    })

    it('deleteLinkageRule 删除规则', () => {
      const rule = engine.addLinkageRule({
        name: '测试规则',
        sourceType: 'widget',
        trigger: { type: 'state-change', params: {} },
        targets: [],
        enabled: true,
        priority: 5,
        cooldown: 1000,
      })
      expect(engine.deleteLinkageRule(rule.id)).toBe(true)
      expect(engine.linkageRules.value.length).toBe(0)
    })

    it('resetLinkageRules 重置为预设规则', () => {
      engine.addLinkageRule({
        name: '自定义规则',
        sourceType: 'widget',
        trigger: { type: 'state-change', params: {} },
        targets: [],
        enabled: true,
        priority: 5,
        cooldown: 1000,
      })
      engine.resetLinkageRules()
      expect(engine.linkageRules.value.length).toBeGreaterThan(0)
      expect(engine.linkageRules.value.some(r => r.name === '自定义规则')).toBe(false)
    })

    it('triggerLinkage 触发启用规则写入 lastTriggeredAt', () => {
      const rule = engine.addLinkageRule({
        name: '测试规则',
        sourceType: 'widget',
        trigger: { type: 'state-change', params: {} },
        targets: [{ targetType: 'glow', action: 'dim', params: {}, delay: 0 }],
        enabled: true,
        priority: 5,
        cooldown: 1000,
      })
      engine.triggerLinkage(rule.id)
      expect(engine.linkageRules.value[0].lastTriggeredAt).not.toBeNull()
    })
  })

  // ---- 场景预设 ----

  describe('场景预设', () => {
    it('addScenePreset 添加预设', () => {
      const preset = engine.addScenePreset({
        type: 'custom',
        name: '自定义场景',
        description: '测试',
        widgetConfig: { visibleTypes: ['quote'], hiddenTypes: [] },
        glowOverride: {},
        floatingOverride: {},
      })
      expect(preset.id).toBeTruthy()
      expect(engine.scenePresets.value.length).toBe(1)
    })

    it('deleteScenePreset 删除预设', () => {
      const preset = engine.addScenePreset({
        type: 'custom',
        name: '自定义场景',
        description: '测试',
        widgetConfig: { visibleTypes: [], hiddenTypes: [] },
        glowOverride: {},
        floatingOverride: {},
      })
      expect(engine.deleteScenePreset(preset.id)).toBe(true)
      expect(engine.scenePresets.value.length).toBe(0)
    })

    it('activeScenePreset 匹配当前场景类型', () => {
      engine.addScenePreset({
        type: 'rest',
        name: '休息模式',
        description: '测试',
        widgetConfig: { visibleTypes: ['weather'], hiddenTypes: [] },
        glowOverride: {},
        floatingOverride: {},
      })
      engine.updateScene({ type: 'rest', name: '休息模式' })
      expect(engine.activeScenePreset.value?.type).toBe('rest')
    })
  })

  // ---- 自适应布局 ----

  describe('自适应布局', () => {
    it('selectLayout 按屏幕尺寸匹配布局', () => {
      engine.addAdaptiveLayout({
        screenRange: { minWidth: 1025, maxWidth: 1440, minHeight: 0, maxHeight: Infinity },
        name: '桌面布局',
        columns: 4,
        rows: 3,
        gap: 16,
        padding: 20,
        maxWidgets: 8,
        sizeMapping: {
          pomodoro: 'medium', 'daily-anchor': 'large', 'emotion-check': 'small',
          'quick-note': 'large', weather: 'medium', quote: 'small', quadrant: 'large',
          calendar: 'medium', 'calendar-heatmap': 'medium',
          'flip-clock': 'small', 'life-scale': 'medium', aquarium: 'medium',
          'water-drink': 'small', 'ferris-wheel': 'medium', 'crystal-ball': 'medium',
        },
      })
      const layout = engine.selectLayout(1440, 900)
      expect(layout).not.toBeNull()
      expect(layout!.name).toBe('桌面布局')
    })

    it('updateScreenSize 更新当前场景屏幕尺寸', () => {
      engine.updateScreenSize(1920, 1080)
      expect(engine.currentScene.value.screenSize).toEqual({ width: 1920, height: 1080 })
    })

    it('addAdaptiveLayout 添加布局', () => {
      const layout = engine.addAdaptiveLayout({
        screenRange: { minWidth: 0, maxWidth: 100, minHeight: 0, maxHeight: 100 },
        name: '迷你布局',
        columns: 1,
        rows: 1,
        gap: 4,
        padding: 4,
        maxWidgets: 1,
        sizeMapping: {
          pomodoro: 'small', 'daily-anchor': 'small', 'emotion-check': 'small',
          'quick-note': 'small', weather: 'small', quote: 'small', quadrant: 'small',
          calendar: 'medium', 'calendar-heatmap': 'medium',
          'flip-clock': 'small', 'life-scale': 'small', aquarium: 'small',
          'water-drink': 'small', 'ferris-wheel': 'small', 'crystal-ball': 'small',
        },
      })
      expect(layout.id).toBeTruthy()
      expect(engine.adaptiveLayouts.value.length).toBe(1)
    })
  })

  // ---- 触角统计 ----

  describe('触角统计', () => {
    it('recordImpression 记录展示', () => {
      engine.recordImpression('widget')
      const summary = engine.getStatsSummary()
      expect(summary.total.impressions).toBe(1)
      expect(summary.byType.widget).toBeDefined()
    })

    it('recordInteraction 记录交互并计算交互率', () => {
      engine.recordImpression('glow')
      engine.recordInteraction('glow')
      const summary = engine.getStatsSummary()
      expect(summary.total.interactions).toBe(1)
      expect(summary.byType.glow.rate).toBe(1)
    })

    it('getStats 按类型过滤', () => {
      engine.recordImpression('widget')
      engine.recordImpression('glow')
      const widgetStats = engine.getStats('widget')
      expect(widgetStats.length).toBe(1)
      expect(widgetStats[0].touchpointType).toBe('widget')
    })

    it('clearStats 清空统计', () => {
      engine.recordImpression('widget')
      engine.clearStats()
      expect(engine.getStatsSummary().total.impressions).toBe(0)
    })
  })

  // ---- 性能监控 ----

  describe('性能监控', () => {
    it('monitorPerformance 返回指标', () => {
      const metrics = engine.monitorPerformance()
      expect(metrics.grade).toBeDefined()
      expect(Array.isArray(metrics.suggestions)).toBe(true)
    })

    it('degradePerformance 降低活跃触角上限', () => {
      const before = engine.orchestrationConfig.value.maxActiveTouchpoints
      engine.degradePerformance()
      expect(engine.orchestrationConfig.value.maxActiveTouchpoints).toBeLessThan(before)
    })

    it('restorePerformance 恢复默认配置', () => {
      engine.degradePerformance()
      engine.restorePerformance()
      expect(engine.orchestrationConfig.value.maxActiveTouchpoints).toBe(8)
    })
  })

  // ---- 编排配置 ----

  describe('编排配置', () => {
    it('updateOrchestrationConfig 更新配置', () => {
      engine.updateOrchestrationConfig({ linkageEnabled: false })
      expect(engine.orchestrationConfig.value.linkageEnabled).toBe(false)
    })

    it('resetOrchestrationConfig 重置默认', () => {
      engine.updateOrchestrationConfig({ linkageEnabled: false, maxActiveTouchpoints: 2 })
      engine.resetOrchestrationConfig()
      expect(engine.orchestrationConfig.value.linkageEnabled).toBe(true)
      expect(engine.orchestrationConfig.value.maxActiveTouchpoints).toBe(8)
    })
  })
})
