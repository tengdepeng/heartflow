// ============================================================
// 功能空间层 · 测试套件
// 测试：空间编排、房间模板、动态路由、健康监控
// ============================================================

import { describe, expect, it } from 'vitest'
import {
  CATEGORY_LABELS as ORCHESTRATION_CATEGORY_LABELS,
  CATEGORY_ICONS as ORCHESTRATION_CATEGORY_ICONS,
} from '../space-orchestrator'
import {
  CATEGORY_LABELS as TEMPLATE_CATEGORY_LABELS,
  CATEGORY_ICONS as TEMPLATE_CATEGORY_ICONS,
} from '../room-templates'
import { LOAD_STRATEGY_LABELS } from '../dynamic-routes'
import { HEALTH_LEVELS } from '../space-health'
import type {
  SpaceStatus,
  SpaceCategory,
  SpaceDependency,
  SpaceOrchestrationConfig,
  OrchestrationSnapshot,
  SpaceTransitionEvent,
} from '../space-orchestrator'
import type {
  TemplateType,
  TemplateCategory,
  RoomLayoutTemplate,
  SpaceTemplate,
  SceneAtmosphere,
} from '../room-templates'
import type {
  RouteSource,
  RouteLoadStrategy,
  DynamicRouteConfig,
  RouteRegistrationEvent,
  RouteGuardConfig,
  RouteStats,
} from '../dynamic-routes'
import type {
  HealthLevel,
  HealthMetricType,
  HealthMetric,
  SpaceHealthReport,
  HealthIssue,
  PerformanceSnapshot,
  DependencyValidationResult,
  ErrorTrackingEntry,
  HealthAlert,
} from '../space-health'

// ============================================================
// 常量验证
// ============================================================

describe('空间编排引擎 - 常量', () => {
  it('CATEGORY_LABELS 包含所有分类', () => {
    const categories: SpaceCategory[] = ['gravity', 'main-path', 'work', 'world', 'system', 'tool', 'supplement']
    for (const cat of categories) {
      expect(ORCHESTRATION_CATEGORY_LABELS[cat]).toBeDefined()
      expect(typeof ORCHESTRATION_CATEGORY_LABELS[cat]).toBe('string')
    }
  })

  it('CATEGORY_ICONS 包含所有分类', () => {
    const categories: SpaceCategory[] = ['gravity', 'main-path', 'work', 'world', 'system', 'tool', 'supplement']
    for (const cat of categories) {
      expect(ORCHESTRATION_CATEGORY_ICONS[cat]).toBeDefined()
      expect(typeof ORCHESTRATION_CATEGORY_ICONS[cat]).toBe('string')
    }
  })

  it('CATEGORY_LABELS 和 CATEGORY_ICONS 键一致', () => {
    const labelKeys = Object.keys(ORCHESTRATION_CATEGORY_LABELS).sort()
    const iconKeys = Object.keys(ORCHESTRATION_CATEGORY_ICONS).sort()
    expect(labelKeys).toEqual(iconKeys)
  })
})

describe('房间模板系统 - 常量', () => {
  it('TEMPLATE_CATEGORY_LABELS 包含所有分类', () => {
    const categories: TemplateCategory[] = ['focus', 'relax', 'work', 'learn', 'social', 'health', 'creative', 'review', 'custom']
    for (const cat of categories) {
      expect(TEMPLATE_CATEGORY_LABELS[cat]).toBeDefined()
      expect(typeof TEMPLATE_CATEGORY_LABELS[cat]).toBe('string')
    }
  })

  it('TEMPLATE_CATEGORY_ICONS 包含所有分类', () => {
    const categories: TemplateCategory[] = ['focus', 'relax', 'work', 'learn', 'social', 'health', 'creative', 'review', 'custom']
    for (const cat of categories) {
      expect(TEMPLATE_CATEGORY_ICONS[cat]).toBeDefined()
      expect(typeof TEMPLATE_CATEGORY_ICONS[cat]).toBe('string')
    }
  })

  it('TEMPLATE_CATEGORY_LABELS 和 TEMPLATE_CATEGORY_ICONS 键一致', () => {
    const labelKeys = Object.keys(TEMPLATE_CATEGORY_LABELS).sort()
    const iconKeys = Object.keys(TEMPLATE_CATEGORY_ICONS).sort()
    expect(labelKeys).toEqual(iconKeys)
  })
})

describe('动态路由引擎 - 常量', () => {
  it('LOAD_STRATEGY_LABELS 包含所有策略', () => {
    const strategies: RouteLoadStrategy[] = ['eager', 'lazy', 'preload', 'idle']
    for (const s of strategies) {
      expect(LOAD_STRATEGY_LABELS[s]).toBeDefined()
      expect(typeof LOAD_STRATEGY_LABELS[s]).toBe('string')
    }
  })
})

describe('空间健康度 - 常量', () => {
  it('HEALTH_LEVELS 包含所有等级', () => {
    const levels: HealthLevel[] = ['excellent', 'good', 'fair', 'poor', 'critical']
    for (const level of levels) {
      expect(HEALTH_LEVELS[level]).toBeDefined()
      expect(HEALTH_LEVELS[level].label).toBeDefined()
      expect(HEALTH_LEVELS[level].color).toBeDefined()
      expect(typeof HEALTH_LEVELS[level].minScore).toBe('number')
      expect(typeof HEALTH_LEVELS[level].maxScore).toBe('number')
    }
  })

  it('HEALTH_LEVELS 分数区间连续无间隙', () => {
    const levels: HealthLevel[] = ['excellent', 'good', 'fair', 'poor', 'critical']
    for (let i = 0; i < levels.length - 1; i++) {
      const current = HEALTH_LEVELS[levels[i]]
      const next = HEALTH_LEVELS[levels[i + 1]]
      expect(current.minScore - 1).toBe(next.maxScore)
    }
  })

  it('HEALTH_LEVELS 分数在 0-100 范围内', () => {
    const levels: HealthLevel[] = ['excellent', 'good', 'fair', 'poor', 'critical']
    for (const level of levels) {
      const h = HEALTH_LEVELS[level]
      expect(h.minScore).toBeGreaterThanOrEqual(0)
      expect(h.maxScore).toBeLessThanOrEqual(100)
    }
  })
})

// ============================================================
// 类型结构验证
// ============================================================

describe('SpaceOrchestrationConfig 类型', () => {
  it('完整配置符合接口', () => {
    const config: SpaceOrchestrationConfig = {
      spaceId: 'home',
      category: 'gravity',
      priority: 0,
      lazyLoad: false,
      preload: true,
      dependencies: [],
      status: 'idle',
      lastActiveAt: null,
      enterCount: 0,
      totalStayMs: 0,
    }
    expect(config.spaceId).toBe('home')
    expect(config.category).toBe('gravity')
    expect(config.status).toBe('idle')
  })

  it('依赖关系配置', () => {
    const dep: SpaceDependency = {
      spaceId: 'timeline',
      type: 'required',
      description: '主链路依赖',
    }
    expect(dep.type).toBe('required')
    expect(dep.spaceId).toBe('timeline')
  })

  it('SpaceStatus 各状态值', () => {
    const statuses: SpaceStatus[] = ['idle', 'loading', 'active', 'inactive', 'error', 'hidden', 'maintenance']
    expect(statuses).toHaveLength(7)
  })
})

describe('OrchestrationSnapshot 类型', () => {
  it('快照结构正确', () => {
    const snapshot: OrchestrationSnapshot = {
      timestamp: '2026-08-03T00:00:00Z',
      spaces: {},
      activeSpaceId: null,
    }
    expect(snapshot.timestamp).toBeDefined()
    expect(snapshot.activeSpaceId).toBeNull()
  })
})

describe('SpaceTransitionEvent 类型', () => {
  it('成功转换事件', () => {
    const event: SpaceTransitionEvent = {
      fromSpaceId: 'home',
      toSpaceId: 'timeline',
      timestamp: '2026-08-03T00:00:00Z',
      transitionMs: 150,
      success: true,
    }
    expect(event.success).toBe(true)
    expect(event.transitionMs).toBe(150)
  })

  it('失败转换事件', () => {
    const event: SpaceTransitionEvent = {
      fromSpaceId: null,
      toSpaceId: 'unknown',
      timestamp: '2026-08-03T00:00:00Z',
      transitionMs: 0,
      success: false,
      error: '空间不存在',
    }
    expect(event.success).toBe(false)
    expect(event.error).toBe('空间不存在')
  })
})

// ============================================================
// 房间模板类型验证
// ============================================================

describe('SpaceTemplate 类型', () => {
  it('内置模板', () => {
    const template: SpaceTemplate = {
      id: 'tmpl-test',
      name: '测试模板',
      description: '测试用',
      type: 'combo',
      category: 'custom',
      roomIds: ['home', 'timeline'],
      tags: ['测试'],
      builtIn: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      useCount: 0,
      icon: '📦',
      color: '#6c9cf5',
    }
    expect(template.builtIn).toBe(true)
    expect(template.roomIds).toHaveLength(2)
  })

  it('自定义模板', () => {
    const template: SpaceTemplate = {
      id: 'tmpl-custom',
      name: '自定义模板',
      description: '自定义',
      type: 'single',
      category: 'custom',
      roomIds: [],
      tags: [],
      builtIn: false,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      useCount: 0,
      icon: '🔧',
      color: '#34d399',
    }
    expect(template.builtIn).toBe(false)
    expect(template.type).toBe('single')
  })
})

describe('RoomLayoutTemplate 类型', () => {
  it('网格布局', () => {
    const layout: RoomLayoutTemplate = {
      layoutId: 'grid-test',
      name: '测试网格',
      description: '',
      type: 'grid',
      columns: 3,
      gap: 16,
      padding: 24,
      showTitle: true,
      showIcon: true,
      cardSize: 'medium',
    }
    expect(layout.type).toBe('grid')
    expect(layout.columns).toBe(3)
  })

  it('自由画布布局', () => {
    const layout: RoomLayoutTemplate = {
      layoutId: 'canvas-test',
      name: '测试画布',
      description: '',
      type: 'canvas',
      columns: 1,
      gap: 0,
      padding: 0,
      showTitle: false,
      showIcon: false,
      cardSize: 'medium',
    }
    expect(layout.type).toBe('canvas')
    expect(layout.showTitle).toBe(false)
  })
})

describe('SceneAtmosphere 类型', () => {
  it('默认氛围', () => {
    const atmosphere: SceneAtmosphere = {
      theme: 'auto',
      background: 'transparent',
      blur: 0,
      opacity: 1,
      animation: 'none',
    }
    expect(atmosphere.theme).toBe('auto')
    expect(atmosphere.animation).toBe('none')
  })

  it('暗色氛围', () => {
    const atmosphere: SceneAtmosphere = {
      theme: 'dark',
      background: '#000000',
      blur: 10,
      opacity: 0.8,
      animation: 'fade',
    }
    expect(atmosphere.theme).toBe('dark')
    expect(atmosphere.blur).toBe(10)
  })
})

// ============================================================
// 动态路由类型验证
// ============================================================

describe('DynamicRouteConfig 类型', () => {
  it('静态路由配置', () => {
    const config: DynamicRouteConfig = {
      path: '/',
      name: 'home',
      source: 'static',
      loadStrategy: 'eager',
      priority: 0,
      enabled: true,
      meta: { roomId: 'home', title: '心流' },
      accessCount: 0,
    }
    expect(config.source).toBe('static')
    expect(config.loadStrategy).toBe('eager')
    expect(config.enabled).toBe(true)
  })

  it('动态路由配置', () => {
    const config: DynamicRouteConfig = {
      path: '/custom',
      name: 'custom',
      source: 'dynamic',
      loadStrategy: 'lazy',
      category: 'world',
      priority: 50,
      enabled: true,
      meta: {},
      registeredAt: '2026-08-03T00:00:00Z',
      accessCount: 5,
      avgLoadTimeMs: 320,
    }
    expect(config.source).toBe('dynamic')
    expect(config.accessCount).toBe(5)
    expect(config.avgLoadTimeMs).toBe(320)
  })

  it('模板路由配置', () => {
    const config: DynamicRouteConfig = {
      path: '/template-room',
      name: 'template-room',
      source: 'template',
      loadStrategy: 'preload',
      group: 'tmpl-deep-work',
      priority: 30,
      enabled: true,
      meta: {},
      accessCount: 0,
    }
    expect(config.source).toBe('template')
    expect(config.group).toBe('tmpl-deep-work')
  })
})

describe('RouteRegistrationEvent 类型', () => {
  it('register 事件', () => {
    const event: RouteRegistrationEvent = {
      type: 'register',
      routeName: 'test',
      timestamp: '2026-08-03T00:00:00Z',
      source: 'dynamic',
      success: true,
    }
    expect(event.type).toBe('register')
    expect(event.success).toBe(true)
  })

  it('unregister 事件', () => {
    const event: RouteRegistrationEvent = {
      type: 'unregister',
      routeName: 'test',
      timestamp: '2026-08-03T00:00:00Z',
      source: 'template',
      success: false,
      error: '路由不存在',
    }
    expect(event.type).toBe('unregister')
    expect(event.error).toBe('路由不存在')
  })
})

describe('RouteStats 类型', () => {
  it('统计结构', () => {
    const stats: RouteStats = {
      totalRoutes: 50,
      staticRoutes: 40,
      dynamicRoutes: 5,
      templateRoutes: 3,
      pluginRoutes: 1,
      userRoutes: 1,
      activeRoutes: 48,
      failedRoutes: 2,
      totalAccesses: 1500,
      avgLoadTimeMs: 320,
    }
    expect(stats.totalRoutes).toBe(50)
    expect(stats.staticRoutes + stats.dynamicRoutes + stats.templateRoutes + stats.pluginRoutes + stats.userRoutes).toBe(50)
  })
})

describe('RouteGuardConfig 类型', () => {
  it('守卫配置', () => {
    const guard: RouteGuardConfig = {
      name: 'auth-guard',
      priority: 0,
      guard: (_to, _from, next) => next(),
      enabled: true,
    }
    expect(guard.name).toBe('auth-guard')
    expect(guard.priority).toBe(0)
  })

  it('范围守卫', () => {
    const guard: RouteGuardConfig = {
      name: 'scope-guard',
      priority: 10,
      guard: (_to, _from, next) => next(),
      applyTo: ['home', 'timeline', 'anchor'],
      enabled: true,
    }
    expect(guard.applyTo).toHaveLength(3)
  })
})

// ============================================================
// 空间健康度类型验证
// ============================================================

describe('SpaceHealthReport 类型', () => {
  it('完整报告', () => {
    const report: SpaceHealthReport = {
      spaceId: 'home',
      level: 'excellent',
      score: 95,
      metrics: [],
      activeIssues: [],
      reportedAt: '2026-08-03T00:00:00Z',
    }
    expect(report.level).toBe('excellent')
    expect(report.score).toBe(95)
  })

  it('带变化量的报告', () => {
    const report: SpaceHealthReport = {
      spaceId: 'timeline',
      level: 'good',
      score: 82,
      metrics: [],
      activeIssues: [],
      reportedAt: '2026-08-03T00:00:00Z',
      lastReportedAt: '2026-08-02T00:00:00Z',
      scoreDelta: -3,
    }
    expect(report.scoreDelta).toBe(-3)
  })
})

describe('HealthMetric 类型', () => {
  it('性能指标', () => {
    const metric: HealthMetric = {
      name: '加载时间',
      type: 'performance',
      value: 350,
      target: 500,
      min: 0,
      max: 10000,
      weight: 0.25,
      unit: 'ms',
      higherIsBetter: false,
      lastUpdated: '2026-08-03T00:00:00Z',
    }
    expect(metric.type).toBe('performance')
    expect(metric.higherIsBetter).toBe(false)
  })

  it('依赖指标', () => {
    const metric: HealthMetric = {
      name: '依赖健康度',
      type: 'dependency',
      value: 100,
      target: 100,
      min: 0,
      max: 100,
      weight: 0.20,
      unit: '%',
      higherIsBetter: true,
      lastUpdated: '2026-08-03T00:00:00Z',
    }
    expect(metric.type).toBe('dependency')
    expect(metric.higherIsBetter).toBe(true)
  })
})

describe('HealthIssue 类型', () => {
  it('活跃问题', () => {
    const issue: HealthIssue = {
      id: 'issue-001',
      type: 'error',
      severity: 'high',
      description: '加载失败',
      suggestion: '刷新页面',
      detectedAt: '2026-08-03T00:00:00Z',
      resolved: false,
    }
    expect(issue.resolved).toBe(false)
    expect(issue.severity).toBe('high')
  })

  it('已解决问题', () => {
    const issue: HealthIssue = {
      id: 'issue-002',
      type: 'performance',
      severity: 'medium',
      description: '加载缓慢',
      suggestion: '优化组件',
      detectedAt: '2026-08-01T00:00:00Z',
      resolved: true,
      resolvedAt: '2026-08-02T00:00:00Z',
    }
    expect(issue.resolved).toBe(true)
    expect(issue.resolvedAt).toBeDefined()
  })
})

describe('PerformanceSnapshot 类型', () => {
  it('性能快照', () => {
    const snapshot: PerformanceSnapshot = {
      id: 'perf-001',
      spaceId: 'home',
      timestamp: '2026-08-03T00:00:00Z',
      loadTimeMs: 250,
      renderTimeMs: 80,
      memoryUsageMB: 45,
      componentCount: 12,
      listenerCount: 8,
      fps: 60,
    }
    expect(snapshot.loadTimeMs).toBe(250)
    expect(snapshot.fps).toBe(60)
  })
})

describe('DependencyValidationResult 类型', () => {
  it('依赖满足', () => {
    const result: DependencyValidationResult = {
      spaceId: 'home',
      satisfied: true,
      missingDeps: [],
      circularDeps: [],
      versionMismatches: [],
    }
    expect(result.satisfied).toBe(true)
  })

  it('依赖缺失', () => {
    const result: DependencyValidationResult = {
      spaceId: 'unknown',
      satisfied: false,
      missingDeps: ['plugin-x'],
      circularDeps: [['a', 'b', 'a']],
      versionMismatches: [],
    }
    expect(result.satisfied).toBe(false)
    expect(result.missingDeps).toContain('plugin-x')
    expect(result.circularDeps).toHaveLength(1)
  })
})

describe('ErrorTrackingEntry 类型', () => {
  it('运行时错误', () => {
    const entry: ErrorTrackingEntry = {
      id: 'err-001',
      spaceId: 'timeline',
      message: 'TypeError: Cannot read properties of undefined',
      type: 'runtime',
      timestamp: '2026-08-03T00:00:00Z',
      count: 1,
      resolved: false,
    }
    expect(entry.type).toBe('runtime')
    expect(entry.count).toBe(1)
  })

  it('重复错误累加', () => {
    const entry: ErrorTrackingEntry = {
      id: 'err-002',
      spaceId: 'garden',
      message: 'Network Error',
      type: 'network',
      timestamp: '2026-08-03T00:00:00Z',
      count: 5,
      resolved: false,
    }
    expect(entry.count).toBe(5)
    expect(entry.type).toBe('network')
  })
})

describe('HealthAlert 类型', () => {
  it('危急告警', () => {
    const alert: HealthAlert = {
      id: 'alert-001',
      level: 'critical',
      title: '空间崩溃',
      description: 'home 空间加载失败',
      spaceId: 'home',
      triggeredAt: '2026-08-03T00:00:00Z',
      isRead: false,
      isResolved: false,
    }
    expect(alert.level).toBe('critical')
    expect(alert.isRead).toBe(false)
  })

  it('已解除告警', () => {
    const alert: HealthAlert = {
      id: 'alert-002',
      level: 'warning',
      title: '性能下降',
      description: '加载时间增加',
      triggeredAt: '2026-08-01T00:00:00Z',
      isRead: true,
      isResolved: true,
    }
    expect(alert.isResolved).toBe(true)
    expect(alert.isRead).toBe(true)
  })
})

// ============================================================
// 边界条件
// ============================================================

describe('边界条件', () => {
  it('SpaceOrchestrationConfig 空依赖', () => {
    const config: SpaceOrchestrationConfig = {
      spaceId: 'test',
      category: 'world',
      priority: 100,
      lazyLoad: true,
      preload: false,
      dependencies: [],
      status: 'idle',
      lastActiveAt: null,
      enterCount: 0,
      totalStayMs: 0,
    }
    expect(config.dependencies).toHaveLength(0)
  })

  it('SpaceOrchestrationConfig 多个依赖', () => {
    const config: SpaceOrchestrationConfig = {
      spaceId: 'test',
      category: 'world',
      priority: 50,
      lazyLoad: false,
      preload: false,
      dependencies: [
        { spaceId: 'a', type: 'required', description: '必要' },
        { spaceId: 'b', type: 'optional', description: '可选' },
        { spaceId: 'c', type: 'recommended', description: '推荐' },
      ],
      status: 'idle',
      lastActiveAt: null,
      enterCount: 0,
      totalStayMs: 0,
    }
    expect(config.dependencies).toHaveLength(3)
    expect(config.dependencies[0].type).toBe('required')
    expect(config.dependencies[1].type).toBe('optional')
    expect(config.dependencies[2].type).toBe('recommended')
  })

  it('DynamicRouteConfig 所有来源', () => {
    const sources: RouteSource[] = ['static', 'dynamic', 'template', 'plugin', 'user']
    expect(sources).toHaveLength(5)
  })

  it('HealthMetricType 所有类型', () => {
    const types: HealthMetricType[] = ['performance', 'dependency', 'error', 'usage', 'stability', 'accessibility']
    expect(types).toHaveLength(6)
  })

  it('TemplateType 所有类型', () => {
    const types: TemplateType[] = ['single', 'combo', 'layout', 'scene']
    expect(types).toHaveLength(4)
  })
})

// ============================================================
// 应用空间管理仪表盘
// ============================================================

import { APP_SPACE_ENTRIES } from '../app-space-manager'
import type { AppSpaceEntry, AppSpaceUsageStats, AppSpaceActivity, SpaceComparison } from '../app-space-manager'
import { MARKET_ITEMS } from '../app-market'
import type { MarketItem, MarketFilter, MarketStats, InstallRecord } from '../app-market'

describe('应用空间管理 - 常量', () => {
  it('APP_SPACE_ENTRIES 不为空', () => {
    expect(APP_SPACE_ENTRIES.length).toBeGreaterThan(0)
  })

  it('所有入口有唯一ID', () => {
    const ids = APP_SPACE_ENTRIES.map(e => e.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('所有入口有有效分类', () => {
    const validCategories = ['space', 'design', 'editor', 'config', 'market']
    for (const entry of APP_SPACE_ENTRIES) {
      expect(validCategories).toContain(entry.category)
    }
  })

  it('所有入口有有效状态', () => {
    const validStatuses = ['active', 'ready', 'wip']
    for (const entry of APP_SPACE_ENTRIES) {
      expect(validStatuses).toContain(entry.status)
    }
  })

  it('所有入口有路由路径', () => {
    for (const entry of APP_SPACE_ENTRIES) {
      expect(entry.route).toBeTruthy()
      expect(entry.route.startsWith('/')).toBe(true)
    }
  })
})

describe('AppSpaceEntry 类型', () => {
  it('完整入口结构', () => {
    const entry: AppSpaceEntry = {
      id: 'test-entry',
      name: '测试入口',
      description: '测试用',
      icon: '🧪',
      route: '/test',
      category: 'space',
      status: 'active',
      tags: ['测试'],
      useCount: 5,
      lastAccessedAt: '2026-08-03T00:00:00Z',
    }
    expect(entry.useCount).toBe(5)
    expect(entry.status).toBe('active')
  })
})

describe('AppSpaceUsageStats 类型', () => {
  it('完整统计结构', () => {
    const stats: AppSpaceUsageStats = {
      totalConfigs: 3,
      activeConfigs: 1,
      presetCount: 8,
      layoutCount: 6,
      themeCount: 3,
      totalAccesses: 150,
      activeDays7d: 5,
      lastActiveAt: '2026-08-03T00:00:00Z',
    }
    expect(stats.totalConfigs).toBe(3)
    expect(stats.presetCount).toBe(8)
    expect(stats.activeDays7d).toBe(5)
  })
})

describe('AppSpaceActivity 类型', () => {
  it('配置创建活动', () => {
    const activity: AppSpaceActivity = {
      id: 'act_001',
      type: 'config_created',
      configId: 'cfg-001',
      description: '创建了新配置',
      timestamp: '2026-08-03T00:00:00Z',
    }
    expect(activity.type).toBe('config_created')
  })

  it('预设应用活动', () => {
    const activity: AppSpaceActivity = {
      id: 'act_002',
      type: 'preset_applied',
      description: '应用了预设模板',
      timestamp: '2026-08-03T00:00:00Z',
    }
    expect(activity.type).toBe('preset_applied')
  })
})

describe('SpaceComparison 类型', () => {
  it('空间对比', () => {
    const comp: SpaceComparison = {
      configId: 'cfg-001',
      configName: '我的空间',
      roomCount: 5,
      featureCount: 12,
      styleTheme: '暗色',
      lastModified: '2026-08-03T00:00:00Z',
      useCount: 10,
    }
    expect(comp.roomCount).toBe(5)
    expect(comp.featureCount).toBe(12)
  })
})

// ============================================================
// 应用市场
// ============================================================

describe('应用市场 - 常量', () => {
  it('MARKET_ITEMS 不为空', () => {
    expect(MARKET_ITEMS.length).toBeGreaterThan(0)
  })

  it('所有市场条目有唯一ID', () => {
    const ids = MARKET_ITEMS.map(i => i.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('所有市场条目有有效类型', () => {
    const validTypes = ['template', 'theme', 'component', 'plugin', 'layout', 'scene']
    for (const item of MARKET_ITEMS) {
      expect(validTypes).toContain(item.type)
    }
  })

  it('所有市场条目评分在有效范围', () => {
    for (const item of MARKET_ITEMS) {
      expect(item.rating).toBeGreaterThanOrEqual(0)
      expect(item.rating).toBeLessThanOrEqual(5)
    }
  })

  it('各类型都有条目', () => {
    const types = new Set(MARKET_ITEMS.map(i => i.type))
    expect(types.has('template')).toBe(true)
    expect(types.has('theme')).toBe(true)
    expect(types.has('component')).toBe(true)
    expect(types.has('plugin')).toBe(true)
    expect(types.has('layout')).toBe(true)
    expect(types.has('scene')).toBe(true)
  })
})

describe('MarketItem 类型', () => {
  it('完整市场条目', () => {
    const item: MarketItem = {
      id: 'test-item',
      name: '测试条目',
      description: '测试用',
      icon: '📦',
      type: 'template',
      author: '测试作者',
      version: '1.0.0',
      tags: ['测试'],
      rating: 4.0,
      ratingCount: 10,
      installCount: 100,
      status: 'not_installed',
      updatedAt: '2026-08-03T00:00:00Z',
      isFree: true,
      compatibility: ['>=1.0.0'],
    }
    expect(item.isFree).toBe(true)
    expect(item.type).toBe('template')
  })

  it('已安装条目', () => {
    const item: MarketItem = {
      id: 'installed-item',
      name: '已安装条目',
      description: '',
      icon: '✅',
      type: 'theme',
      author: '作者',
      version: '2.0.0',
      tags: [],
      rating: 5.0,
      ratingCount: 1,
      installCount: 200,
      status: 'installed',
      updatedAt: '2026-08-03T00:00:00Z',
      isFree: false,
      compatibility: [],
    }
    expect(item.status).toBe('installed')
    expect(item.isFree).toBe(false)
  })
})

describe('MarketFilter 类型', () => {
  it('默认筛选', () => {
    const filter: MarketFilter = {
      sortBy: 'popular',
      query: '',
      installedOnly: false,
      freeOnly: false,
    }
    expect(filter.sortBy).toBe('popular')
    expect(filter.installedOnly).toBe(false)
  })

  it('按类型筛选', () => {
    const filter: MarketFilter = {
      type: 'template',
      sortBy: 'newest',
      query: '',
      installedOnly: true,
      freeOnly: true,
    }
    expect(filter.type).toBe('template')
    expect(filter.installedOnly).toBe(true)
  })
})

describe('MarketStats 类型', () => {
  it('完整统计', () => {
    const stats: MarketStats = {
      totalItems: 20,
      installedCount: 5,
      byType: {
        template: 4,
        theme: 3,
        component: 3,
        plugin: 3,
        layout: 2,
        scene: 2,
      },
      recentlyUpdated: 8,
    }
    expect(stats.totalItems).toBe(20)
    expect(stats.installedCount).toBe(5)
    expect(stats.byType.template).toBe(4)
  })
})

describe('InstallRecord 类型', () => {
  it('安装记录', () => {
    const record: InstallRecord = {
      id: 'rec-001',
      itemId: 'item-001',
      action: 'install',
      version: '1.0.0',
      timestamp: '2026-08-03T00:00:00Z',
    }
    expect(record.action).toBe('install')
  })

  it('卸载记录', () => {
    const record: InstallRecord = {
      id: 'rec-002',
      itemId: 'item-001',
      action: 'uninstall',
      version: '1.0.0',
      timestamp: '2026-08-03T00:00:00Z',
    }
    expect(record.action).toBe('uninstall')
  })
})

// ============================================================
// 导出完整性验证
// ============================================================

describe('导出完整性', () => {
  it('index.ts 导出所有模块', async () => {
    const indexModule = await import('../index')
    // 空间编排引擎
    expect(indexModule.useSpaceOrchestrator).toBeDefined()
    expect(indexModule.ORCHESTRATION_CATEGORY_LABELS).toBeDefined()
    expect(indexModule.ORCHESTRATION_CATEGORY_ICONS).toBeDefined()
    // 房间模板
    expect(indexModule.useRoomTemplates).toBeDefined()
    expect(indexModule.TEMPLATE_CATEGORY_LABELS).toBeDefined()
    expect(indexModule.TEMPLATE_CATEGORY_ICONS).toBeDefined()
    // 动态路由
    expect(indexModule.useDynamicRoutes).toBeDefined()
    expect(indexModule.LOAD_STRATEGY_LABELS).toBeDefined()
    // 健康监控
    expect(indexModule.useSpaceHealth).toBeDefined()
    expect(indexModule.HEALTH_LEVELS).toBeDefined()
    // 应用空间管理
    expect(indexModule.useAppSpaceManager).toBeDefined()
    expect(indexModule.APP_SPACE_ENTRIES).toBeDefined()
    // 应用市场
    expect(indexModule.useAppMarket).toBeDefined()
    expect(indexModule.MARKET_ITEMS).toBeDefined()
  })
})

// ============================================================
// 时间线索引模块
// ============================================================

import {
  DEFAULT_GOVERNANCE,
  EMPTY_SECONDARY_INDEX,
  AGE_MULTIPLIERS,
  BASE_WEIGHTS,
  DEFAULT_DECAY_CONFIG,
  DEFAULT_TIMELINE_INDEX_CONFIG,
} from '../../../modules/timeline-index/types'
import type {
  IndexEntry,
  IndexSummary,
  SecondaryIndex,
  WeightParams,
  AgeLevel,
  GovernanceInfo,
} from '../../../modules/timeline-index/types'

describe('时间线索引 - 类型定义', () => {
  it('IndexEntry 完整结构', () => {
    const entry: IndexEntry = {
      indexId: 'idx_001',
      timestamp: '2026-08-03T00:00:00Z',
      type: 'crystal',
      roomSource: 'timeline',
      payloadRef: 'crystal_001',
      summary: {
        snippet: '测试结晶内容',
        durationMinutes: 30,
      },
      weight: 0.85,
      governance: {
        ageLevel: 1,
        agedAt: null,
        archived: false,
        archivedAt: null,
        released: false,
        releasedAt: null,
        deleted: false,
      },
      createdAt: '2026-08-03T00:00:00Z',
      updatedAt: '2026-08-03T00:00:00Z',
    }
    expect(entry.indexId).toBe('idx_001')
    expect(entry.type).toBe('crystal')
    expect(entry.weight).toBe(0.85)
  })

  it('IndexSummary 支持多种格式', () => {
    const s1: IndexSummary = { snippet: '摘要内容' }
    const s2: IndexSummary = { snippet: '带分类', emotionCategory: 'joy' }
    const s3: IndexSummary = { snippet: '带时长', durationMinutes: 45 }
    expect(s1.snippet).toBe('摘要内容')
    expect(s2.emotionCategory).toBe('joy')
    expect(s3.durationMinutes).toBe(45)
  })

  it('GovernanceInfo 各状态', () => {
    const g: GovernanceInfo = {
      ageLevel: 3,
      agedAt: '2026-01-01T00:00:00Z',
      archived: true,
      archivedAt: '2026-02-01T00:00:00Z',
      released: false,
      releasedAt: null,
      deleted: false,
    }
    expect(g.ageLevel).toBe(3)
    expect(g.archived).toBe(true)
  })

  it('WeightParams 各类型', () => {
    const w1: WeightParams = {
      entryType: 'crystal',
      durationMinutes: 60,
      createdAt: '2026-08-03T00:00:00Z',
    }
    const w2: WeightParams = {
      entryType: 'anchor',
      anchorType: 'must',
      createdAt: '2026-08-03T00:00:00Z',
    }
    const w3: WeightParams = {
      entryType: 'emotion',
      intensity: 0.8,
      createdAt: '2026-08-03T00:00:00Z',
    }
    expect(w1.durationMinutes).toBe(60)
    expect(w2.anchorType).toBe('must')
    expect(w3.intensity).toBe(0.8)
  })
})

describe('时间线索引 - 常量', () => {
  it('DEFAULT_GOVERNANCE 默认值', () => {
    expect(DEFAULT_GOVERNANCE.ageLevel).toBe(1)
    expect(DEFAULT_GOVERNANCE.archived).toBe(false)
    expect(DEFAULT_GOVERNANCE.released).toBe(false)
    expect(DEFAULT_GOVERNANCE.deleted).toBe(false)
    expect(DEFAULT_GOVERNANCE.agedAt).toBeNull()
    expect(DEFAULT_GOVERNANCE.archivedAt).toBeNull()
    expect(DEFAULT_GOVERNANCE.releasedAt).toBeNull()
  })

  it('EMPTY_SECONDARY_INDEX 空结构', () => {
    expect(EMPTY_SECONDARY_INDEX.byId).toEqual({})
    expect(EMPTY_SECONDARY_INDEX.byType).toEqual({})
    expect(EMPTY_SECONDARY_INDEX.byGovernance.archived).toEqual([])
    expect(EMPTY_SECONDARY_INDEX.byGovernance.released).toEqual([])
    expect(EMPTY_SECONDARY_INDEX.byGovernance.deleted).toEqual([])
  })

  it('AGE_MULTIPLIERS 有五个等级', () => {
    const ages: AgeLevel[] = [1, 2, 3, 4, 5]
    for (const age of ages) {
      expect(AGE_MULTIPLIERS[age]).toBeDefined()
      expect(typeof AGE_MULTIPLIERS[age]).toBe('number')
    }
  })

  it('BASE_WEIGHTS 包含所有条目类型', () => {
    expect(BASE_WEIGHTS.crystal).toBeDefined()
    expect(BASE_WEIGHTS.note).toBeDefined()
    expect(BASE_WEIGHTS.emotion).toBeDefined()
    expect(BASE_WEIGHTS.session).toBeDefined()
    expect(BASE_WEIGHTS.anchor_must).toBeDefined()
    expect(BASE_WEIGHTS.anchor_optional).toBeDefined()
    expect(BASE_WEIGHTS.anchor_floating).toBeDefined()
    expect(BASE_WEIGHTS.anchor_must).toBe(1.0)
  })

  it('DEFAULT_DECAY_CONFIG 衰减系数合理', () => {
    expect(DEFAULT_DECAY_CONFIG.days30).toBeGreaterThan(DEFAULT_DECAY_CONFIG.days90)
    expect(DEFAULT_DECAY_CONFIG.days90).toBeGreaterThan(DEFAULT_DECAY_CONFIG.days365)
    expect(DEFAULT_DECAY_CONFIG.days365).toBeGreaterThan(DEFAULT_DECAY_CONFIG.years3)
  })

  it('DEFAULT_TIMELINE_INDEX_CONFIG 默认配置', () => {
    expect(DEFAULT_TIMELINE_INDEX_CONFIG.shardPrefix).toBeDefined()
    expect(DEFAULT_TIMELINE_INDEX_CONFIG.secondaryIndexKey).toBeDefined()
    expect(DEFAULT_TIMELINE_INDEX_CONFIG.cacheDays).toBeGreaterThan(0)
    expect(DEFAULT_TIMELINE_INDEX_CONFIG.maxWriteRetries).toBeGreaterThan(0)
  })
})

describe('时间线索引 - 边界条件', () => {
  it('IndexEntry 最小摘要', () => {
    const entry: IndexEntry = {
      indexId: 'min',
      timestamp: '2026-01-01T00:00:00Z',
      type: 'note',
      roomSource: 'study',
      payloadRef: 'note_001',
      summary: { snippet: '' },
      weight: 0,
      governance: { ...DEFAULT_GOVERNANCE },
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    }
    expect(entry.weight).toBe(0)
    expect(entry.summary.snippet).toBe('')
  })

  it('IndexEntry 最大权重', () => {
    const entry: IndexEntry = {
      indexId: 'max',
      timestamp: '2026-08-03T00:00:00Z',
      type: 'anchor',
      roomSource: 'anchor',
      payloadRef: 'anchor_001',
      summary: { snippet: '重要锚点', anchorZone: 'morning' },
      weight: 1.0,
      governance: { ageLevel: 1, agedAt: null, archived: false, archivedAt: null, released: false, releasedAt: null, deleted: false },
      createdAt: '2026-08-03T00:00:00Z',
      updatedAt: '2026-08-03T00:00:00Z',
    }
    expect(entry.weight).toBe(1.0)
  })

  it('SecondaryIndex byGovernance 所有列表', () => {
    const si: SecondaryIndex = {
      byId: {},
      byType: {},
      byGovernance: {
        archived: ['a', 'b'],
        released: ['c'],
        deleted: [],
      },
    }
    expect(si.byGovernance.archived).toHaveLength(2)
    expect(si.byGovernance.released).toHaveLength(1)
    expect(si.byGovernance.deleted).toHaveLength(0)
  })
})