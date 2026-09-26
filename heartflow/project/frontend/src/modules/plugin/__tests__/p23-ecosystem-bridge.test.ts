// ============================================================
// P23 插件生态视图桥接层测试
// 覆盖：pluginOverview / pluginList / pluginCategories /
//       sandboxStatus / schedulerStatus / marketplaceOverview /
//       permissionSummary / recommendations / 操作入口
// ============================================================

import { describe, expect, it, beforeEach, vi } from 'vitest'
import { ref, computed } from 'vue'
import type { PluginPermission, PluginRuntime } from '../types'
import { CORE_PLUGINS } from '../types'
import type { SandboxTier, GuardState, ViolationRecord, DowngradeRecord, Violation } from '../sandbox'
import { TIER_RESOURCE_LIMITS } from '../sandbox'
import type { ScheduleTask, ScheduleStats, SchedulerConfig } from '../plugin-scheduler'
import { DEFAULT_SCHEDULER_CONFIG } from '../plugin-scheduler'
import type { MarketplaceStats } from '../plugin-marketplace'

// ============================================================
// 测试数据工厂
// ============================================================

/** 创建核心插件运行时列表（5 个核心插件） */
function makeCorePluginRuntimes(): PluginRuntime[] {
  return CORE_PLUGINS.map((m, idx) => ({
    id: m.meta.id,
    name: m.meta.name,
    version: m.meta.version,
    manifest: { ...m, permissions: [...m.permissions] },
    enabled: true,
    loaded: idx < 4, // 前 4 个加载，最后一个未加载
    installedAt: new Date(Date.now() - idx * 86400000).toISOString(),
    hooks: new Map(),
    sandbox: { ...m.sandbox },
  }))
}

/** 创建空运行时列表 */
function makeEmptyRuntimes(): PluginRuntime[] {
  return []
}

/** 创建沙箱环境列表 */
function makeSandboxes() {
  return CORE_PLUGINS.map((m, idx) => ({
    id: `sandbox_${m.meta.id}`,
    pluginId: m.meta.id,
    tier: (idx < 3 ? 'L2' : idx < 4 ? 'L1' : 'L0') as SandboxTier,
    active: idx < 4,
    config: {
      tier: (idx < 3 ? 'L2' : 'L1') as SandboxTier,
      enabled: true,
      grantedPermissions: [] as any[],
      deniedPermissions: [] as any[],
      resourceLimits: { ...TIER_RESOURCE_LIMITS['L2'] },
      auditEnabled: true,
      apiInterception: true,
    },
    createdAt: new Date().toISOString(),
    resourceUsage: {
      memoryMB: 10,
      storageMB: 1,
      domOpsThisSecond: 0,
      apiCallsThisMinute: 5,
      networkRequestsThisMinute: 0,
      activeExecutionTimeMs: 100,
      lastResetAt: new Date().toISOString(),
    },
    auditLog: [],
    apiCallCount: new Map(),
  }))
}

/** 创建空沙箱列表 */
function makeEmptySandboxes() {
  return []
}

/** 创建守卫状态 */
function makeGuardState(custom?: Partial<GuardState>): GuardState {
  return {
    running: true,
    guardedCount: 5,
    lastCheckAt: new Date().toISOString(),
    violationHistory: [],
    downgradeHistory: [],
    ...custom,
  }
}

/** 创建带有违规记录的守卫状态 */
function makeGuardStateWithViolations(): GuardState {
  const violation: Violation = {
    type: 'permission_denied',
    message: 'Unauthorized access attempt',
    timestamp: new Date().toISOString(),
    pluginId: 'core-constitution',
    sandboxId: 'sandbox_core-constitution',
    tier: 'L2',
    details: { action: 'filesystem:write' },
  }

  const violationRecord: ViolationRecord = {
    violation,
    tierAtViolation: 'L2',
  }

  const downgradeRecord: DowngradeRecord = {
    sandboxId: 'sandbox_core-constitution',
    pluginId: 'core-constitution',
    from: 'L2',
    to: 'L1',
    reason: 'Exceeded violation threshold',
    timestamp: new Date().toISOString(),
    recovered: false,
  }

  return {
    running: true,
    guardedCount: 5,
    lastCheckAt: new Date().toISOString(),
    violationHistory: Array(12).fill(null).map((_, i) => ({
      ...violationRecord,
      violation: { ...violation, timestamp: new Date(Date.now() - i * 10000).toISOString() },
    })),
    downgradeHistory: [downgradeRecord],
  }
}

/** 创建调度器统计 */
function makeScheduleStats(custom?: Partial<ScheduleStats>): ScheduleStats {
  return {
    totalTasks: 10,
    pendingTasks: 3,
    runningTasks: 2,
    completedTasks: 4,
    failedTasks: 1,
    averageWaitTime: 150,
    averageExecutionTime: 500,
    successRate: 80,
    ...custom,
  }
}

/** 创建调度器任务列表 */
function makeSchedulerTasks(): ScheduleTask[] {
  return [
    {
      id: 'task_1',
      name: '数据同步',
      priority: 'high',
      status: 'running',
      pluginId: 'core-timer',
      dependencies: [],
      timeout: 30000,
      maxRetries: 3,
      retryCount: 0,
      progress: 45,
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
    },
    {
      id: 'task_2',
      name: '结晶生成',
      priority: 'normal',
      status: 'pending',
      pluginId: 'core-crystal',
      dependencies: [],
      timeout: 30000,
      maxRetries: 3,
      retryCount: 0,
      progress: 0,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'task_3',
      name: '画布渲染',
      priority: 'normal',
      status: 'completed',
      pluginId: 'core-canvas',
      dependencies: [],
      timeout: 30000,
      maxRetries: 3,
      retryCount: 0,
      progress: 100,
      createdAt: new Date(Date.now() - 60000).toISOString(),
      startedAt: new Date(Date.now() - 50000).toISOString(),
      completedAt: new Date().toISOString(),
    },
    {
      id: 'task_4',
      name: '宪法检查',
      priority: 'high',
      status: 'failed',
      pluginId: 'core-constitution',
      dependencies: [],
      timeout: 30000,
      maxRetries: 3,
      retryCount: 3,
      progress: 70,
      createdAt: new Date(Date.now() - 120000).toISOString(),
      startedAt: new Date(Date.now() - 110000).toISOString(),
      completedAt: new Date(Date.now() - 80000).toISOString(),
      error: 'Timeout exceeded',
    },
  ]
}

/** 创建市场统计 */
function makeMarketplaceStats(): MarketplaceStats {
  return {
    totalPlugins: 5,
    installedCount: 5,
    availableUpdates: 2,
    categoryStats: [
      { category: 'timer', count: 1 },
      { category: 'visual', count: 3 },
      { category: 'other', count: 1 },
    ],
    totalDownloads: 1000,
  }
}

// ============================================================
// 共享 mock 实例（通过 vi.hoisted 保证提升）
// ============================================================

const mockModule = vi.hoisted(() => {
  let managerInstance: ReturnType<typeof createMockManager> | null = null
  let marketplaceInstance: ReturnType<typeof createMockMarketplace> | null = null
  let schedulerInstance: ReturnType<typeof createMockScheduler> | null = null

  let _sandboxes: ReturnType<typeof makeSandboxes> | null = null
  let _guardState: GuardState = makeGuardState()
  let _schedulerStats: ScheduleStats = makeScheduleStats()
  let _schedulerStatsRef: any = null
  let _isRunningRef: any = null
  let _configRef: any = null
  let _blockedTasksRef: any = null
  let _readyTasksRef: any = null
  let _sortedPendingTasksRef: any = null
  let _failedTasksRef: any = null

  return {
    getManagerInstance: () => managerInstance,
    setManagerInstance: (m: ReturnType<typeof createMockManager>) => { managerInstance = m },
    getMarketplaceInstance: () => marketplaceInstance,
    setMarketplaceInstance: (m: ReturnType<typeof createMockMarketplace>) => { marketplaceInstance = m },
    getSchedulerInstance: () => schedulerInstance,
    setSchedulerInstance: (s: ReturnType<typeof createMockScheduler>) => { schedulerInstance = s },

    getSandboxes: () => {
      if (!_sandboxes) _sandboxes = makeSandboxes()
      return _sandboxes
    },
    setSandboxes: (s: ReturnType<typeof makeSandboxes>) => { _sandboxes = s },
    getGuardState: () => _guardState,
    setGuardState: (g: GuardState) => { _guardState = g },

    getSchedulerStats: () => _schedulerStats,
    setSchedulerStats: (s: ScheduleStats) => {
      _schedulerStats = s
      if (_schedulerStatsRef) _schedulerStatsRef.value = s
    },
    getSchedulerStatsRef: () => _schedulerStatsRef,
    setSchedulerStatsRef: (r: any) => { _schedulerStatsRef = r },
    getIsRunningRef: () => _isRunningRef,
    setIsRunningRef: (r: any) => { _isRunningRef = r },
    getConfigRef: () => _configRef,
    setConfigRef: (r: any) => { _configRef = r },
    getBlockedTasksRef: () => _blockedTasksRef,
    setBlockedTasksRef: (r: any) => { _blockedTasksRef = r },
    getReadyTasksRef: () => _readyTasksRef,
    setReadyTasksRef: (r: any) => { _readyTasksRef = r },
    getSortedPendingTasksRef: () => _sortedPendingTasksRef,
    setSortedPendingTasksRef: (r: any) => { _sortedPendingTasksRef = r },
    getFailedTasksRef: () => _failedTasksRef,
    setFailedTasksRef: (r: any) => { _failedTasksRef = r },
  }
})

// ============================================================
// Mock 工厂函数
// ============================================================

function createMockManager(runtimes: PluginRuntime[]) {
  const runtimesRef = ref(runtimes)

  return {
    runtimes: runtimesRef,
    enabledPlugins: computed(() => runtimesRef.value.filter(r => r.enabled)),
    init: vi.fn(() => {
      // init 不重置 runtimes，保持已有数据
    }),
    getAll: vi.fn(() => runtimesRef.value),
    get: vi.fn((id: string) => runtimesRef.value.find(r => r.id === id)),
    toggle: vi.fn((id: string) => {
      const rt = runtimesRef.value.find(r => r.id === id)
      if (!rt) return false
      rt.enabled = !rt.enabled
      return rt.enabled
    }),
    load: vi.fn((id: string) => {
      const rt = runtimesRef.value.find(r => r.id === id)
      if (!rt || !rt.enabled) return false
      if (rt.loaded) return true
      rt.loaded = true
      rt.loadError = undefined
      return true
    }),
    unload: vi.fn((id: string) => {
      const rt = runtimesRef.value.find(r => r.id === id)
      if (rt) rt.loaded = false
    }),
    update: vi.fn(),
    remove: vi.fn(),
    hasPermission: vi.fn((id: string, perm: PluginPermission) => {
      const rt = runtimesRef.value.find(r => r.id === id)
      if (!rt || !rt.enabled) return false
      return rt.manifest.permissions.includes(perm)
    }),
    getByCategory: vi.fn((category: string) =>
      runtimesRef.value.filter(r => r.manifest.meta.category === category)
    ),
  }
}

function createMockMarketplace() {
  return {
    updates: ref([]),
    updatePolicy: ref({
      autoUpdate: false,
      allowedTypes: ['patch'] as ('major' | 'minor' | 'patch')[],
      backupBeforeUpdate: true,
      checkInterval: 24,
      lastCheckAt: null,
    }),
    installedPlugins: ref(new Map<string, string>()),
    availableUpdates: computed(() => [] as any[]),
    pendingUpdateCount: computed(() => 0),
    resolveDependencies: vi.fn(),
    getDependencyTree: vi.fn(),
    checkForUpdates: vi.fn(),
    installUpdate: vi.fn(),
    installAllUpdates: vi.fn(),
    updatePolicySettings: vi.fn(),
    generateMarketStats: vi.fn(() => makeMarketplaceStats()),
    registerInstalled: vi.fn(),
  }
}

function createMockScheduler() {
  const tasksRef = ref<ScheduleTask[]>(makeSchedulerTasks())
  const isRunningRef = ref(false)
  const configRef = ref<SchedulerConfig>({ ...DEFAULT_SCHEDULER_CONFIG })

  const pendingTasksRef = computed(() => tasksRef.value.filter(t => t.status === 'pending'))
  const runningTasksRef = computed(() => tasksRef.value.filter(t => t.status === 'running'))
  const failedTasksRef = computed(() => tasksRef.value.filter(t => t.status === 'failed'))
  const sortedPendingTasksRef = computed(() => [...pendingTasksRef.value])
  const blockedTasksRef = computed(() => [] as ScheduleTask[])
  const readyTasksRef = computed(() => [...pendingTasksRef.value])

  const statsRef = ref<ScheduleStats>(makeScheduleStats())

  mockModule.setSchedulerStatsRef(statsRef)
  mockModule.setIsRunningRef(isRunningRef)
  mockModule.setConfigRef(configRef)
  mockModule.setBlockedTasksRef(blockedTasksRef)
  mockModule.setReadyTasksRef(readyTasksRef)
  mockModule.setSortedPendingTasksRef(sortedPendingTasksRef)
  mockModule.setFailedTasksRef(failedTasksRef)

  return {
    tasks: tasksRef,
    config: configRef,
    isRunning: isRunningRef,
    pendingTasks: pendingTasksRef,
    runningTasks: runningTasksRef,
    failedTasks: failedTasksRef,
    sortedPendingTasks: sortedPendingTasksRef,
    blockedTasks: blockedTasksRef,
    readyTasks: readyTasksRef,
    stats: statsRef,
    addTask: vi.fn(),
    cancelTask: vi.fn(),
    retryTask: vi.fn(),
    updateProgress: vi.fn(),
    completeTask: vi.fn(),
    failTask: vi.fn(),
    areDependenciesMet: vi.fn(),
    scheduleNext: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    clearAll: vi.fn(),
    clearCompleted: vi.fn(),
    updateConfig: vi.fn(),
    getTasksByPlugin: vi.fn((pluginId: string) =>
      tasksRef.value.filter(t => t.pluginId === pluginId)
    ),
    getPluginStats: vi.fn((pluginId: string) => {
      const pluginTasks = tasksRef.value.filter(t => t.pluginId === pluginId)
      const completed = pluginTasks.filter(t => t.status === 'completed')
      const total = pluginTasks.length
      return {
        totalTasks: total,
        pendingTasks: pluginTasks.filter(t => t.status === 'pending').length,
        runningTasks: pluginTasks.filter(t => t.status === 'running').length,
        completedTasks: completed.length,
        failedTasks: pluginTasks.filter(t => t.status === 'failed').length,
        averageWaitTime: 0,
        averageExecutionTime: 0,
        successRate: total > 0 ? Math.round((completed.length / total) * 100) : 0,
      }
    }),
  }
}

// ============================================================
// Mock 子模块
// ============================================================

// ⚠️ mock 目标必须是 **真实定义文件**：plugin-ecosystem-bridge.ts 已改为从 './plugin-store'
//    取 usePluginManager（从 barrel 取会构成 index ↔ bridge 循环依赖），mock '../index' 不再命中。
vi.mock('../plugin-store', () => ({
  usePluginManager: () => mockModule.getManagerInstance(),
}))

vi.mock('../plugin-marketplace', () => ({
  usePluginMarketplace: () => mockModule.getMarketplaceInstance(),
}))

vi.mock('../plugin-scheduler', () => ({
  usePluginScheduler: () => mockModule.getSchedulerInstance(),
  DEFAULT_SCHEDULER_CONFIG: {
    maxConcurrency: 4,
    priorityEnabled: true,
    defaultTimeout: 30000,
    defaultMaxRetries: 3,
    autoRetry: true,
    tickInterval: 100,
  },
  PRIORITY_META: {
    critical: { label: '关键', icon: '🔴', color: '#ef4444' },
    high: { label: '高', icon: '🟠', color: '#f6b26b' },
    normal: { label: '普通', icon: '🟡', color: '#f0c040' },
    low: { label: '低', icon: '🟢', color: '#34d399' },
    background: { label: '后台', icon: '⚪', color: '#7a7f8c' },
  },
  PRIORITY_WEIGHT: { critical: 100, high: 75, normal: 50, low: 25, background: 10 },
}))

// ---- mock sandbox module (hoisted to avoid initialization order issues) ----
const { mockSandboxIsolator, mockRuntimeGuard } = vi.hoisted(() => {
  const mockSandboxIsolator = {
    getAllSandboxes: vi.fn(() => mockModule.getSandboxes()),
    createSandbox: vi.fn(),
    destroySandbox: vi.fn(),
  }

  const mockRuntimeGuard = {
    getState: vi.fn(() => mockModule.getGuardState()),
    getSandboxGuardStatus: vi.fn((_sandboxId: string) => ({
      violationCount: 0,
      downgradeCount: 0,
      anomalies: [] as any[],
      active: true,
    })),
    start: vi.fn(),
    stop: vi.fn(),
  }

  return { mockSandboxIsolator, mockRuntimeGuard }
})

vi.mock('../sandbox', () => ({
  sandboxIsolator: mockSandboxIsolator,
  runtimeGuard: mockRuntimeGuard,
  DEFAULT_GUARD_CONFIG: {
    checkInterval: 5000,
    memoryWarningThreshold: 0.8,
    storageWarningThreshold: 0.8,
    violationThreshold: 5,
    violationWindow: 60000,
    autoDowngrade: true,
    recoveryTime: 300000,
  },
  SANDBOX_TIER_LABELS: { L0: '只读沙箱', L1: '受限沙箱', L2: '完全沙箱' },
  SANDBOX_TIER_DESCRIPTIONS: {
    L0: '仅可读取当前上下文',
    L1: '可读写数据，受配额限制',
    L2: '完整访问权限',
  },
  TIER_PERMISSIONS: {
    L0: ['context:read', 'session:read'],
    L1: ['context:read', 'session:read', 'data:read', 'data:write', 'storage:read', 'storage:write', 'notification:send'],
    L2: ['context:read', 'session:read', 'data:read', 'data:write', 'storage:read', 'storage:write', 'notification:send', 'network:access', 'file:read', 'file:write', 'ai:chat', 'ai:config', 'navigation', 'interaction', 'system:config'],
  },
  TIER_RESOURCE_LIMITS: {
    L0: { maxMemoryMB: 10, maxStorageMB: 1, maxDOMopsPerSecond: 0, maxAPICallsPerMinute: 10, maxNetworkRequestsPerMinute: 0, maxExecutionTimeMs: 1000 },
    L1: { maxMemoryMB: 50, maxStorageMB: 10, maxDOMopsPerSecond: 10, maxAPICallsPerMinute: 60, maxNetworkRequestsPerMinute: 0, maxExecutionTimeMs: 5000 },
    L2: { maxMemoryMB: 200, maxStorageMB: 100, maxDOMopsPerSecond: 100, maxAPICallsPerMinute: 600, maxNetworkRequestsPerMinute: 30, maxExecutionTimeMs: 30000 },
  },
}))

// ---- mock storage 模块 ----
const { mockGetKV, mockSetKV } = vi.hoisted(() => {
  const kvStore: Record<string, any> = {}
  const mockGetKV = vi.fn((key: string, def: any) => kvStore[key] ?? def)
  const mockSetKV = vi.fn((key: string, val: any) => { kvStore[key] = val })
  return { mockGetKV, mockSetKV }
})

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: (key: string, def: any) => mockGetKV(key, def),
    setKV: (key: string, val: any) => mockSetKV(key, val),
    getPluginRegistry: () => null,
    setPluginRegistry: vi.fn(),
  },
}))

// ============================================================
// P23 插件生态视图桥接层
// ============================================================

describe('P23 插件生态视图桥接层', () => {
  let bridge: any

  // ---- 空状态 ----
  describe('空状态', () => {
    beforeEach(async () => {
      vi.resetModules()
      vi.clearAllMocks()

      const manager = createMockManager(makeEmptyRuntimes())
      const marketplace = createMockMarketplace()
      const scheduler = createMockScheduler()

      mockModule.setManagerInstance(manager)
      mockModule.setMarketplaceInstance(marketplace)
      mockModule.setSchedulerInstance(scheduler)
      mockModule.setSandboxes(makeEmptySandboxes())
      mockModule.setGuardState(makeGuardState({
        running: false,
        guardedCount: 0,
        violationHistory: [],
        downgradeHistory: [],
      }))
      mockModule.setSchedulerStats(makeScheduleStats({
        totalTasks: 0,
        pendingTasks: 0,
        runningTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        successRate: 0,
      }))

      const mod = await import('../plugin-ecosystem-bridge')
      bridge = mod.usePluginEcosystemBridge()
    })

    describe('初始化', () => {
      it('pluginOverview 有 totalPlugins 且为 0', () => {
        expect(bridge.pluginOverview.value.totalPlugins).toBe(0)
      })

      it('pluginOverview 有 enabledPlugins 且为 0', () => {
        expect(bridge.pluginOverview.value.enabledPlugins).toBe(0)
      })

      it('pluginOverview 有 loadedPlugins 且为 0', () => {
        expect(bridge.pluginOverview.value.loadedPlugins).toBe(0)
      })

      it('pluginOverview 有 corePlugins 且为 0', () => {
        expect(bridge.pluginOverview.value.corePlugins).toBe(0)
      })

      it('pluginList 为数组', () => {
        expect(Array.isArray(bridge.pluginList.value)).toBe(true)
      })

      it('pluginCategories 对象存在', () => {
        expect(bridge.pluginCategories.value).toBeDefined()
        expect(typeof bridge.pluginCategories.value).toBe('object')
      })

      it('sandboxStatus 有 isolatedCount', () => {
        expect(bridge.sandboxStatus.value.isolatedCount).toBeDefined()
        expect(typeof bridge.sandboxStatus.value.isolatedCount).toBe('number')
      })

      it('schedulerStatus 有 totalTasks', () => {
        expect(bridge.schedulerStatus.value.totalTasks).toBeDefined()
        expect(typeof bridge.schedulerStatus.value.totalTasks).toBe('number')
      })

      it('marketplaceOverview 存在', () => {
        expect(bridge.marketplaceOverview).toBeDefined()
        expect(bridge.marketplaceOverview.value).toBeNull()
      })

      it('permissionSummary 为数组', () => {
        expect(bridge.permissionSummary.value).toBeDefined()
        // permissionSummary 包含 permissions 数组
        expect(Array.isArray(bridge.permissionSummary.value.permissions)).toBe(true)
      })

      it('recommendations 为数组', () => {
        expect(Array.isArray(bridge.recommendations.value)).toBe(true)
      })
    })
  })

  // ---- 正常数据状态 ----
  describe('正常数据状态', () => {
    beforeEach(async () => {
      vi.resetModules()
      vi.clearAllMocks()

      const manager = createMockManager(makeCorePluginRuntimes())
      const marketplace = createMockMarketplace()
      const scheduler = createMockScheduler()

      mockModule.setManagerInstance(manager)
      mockModule.setMarketplaceInstance(marketplace)
      mockModule.setSchedulerInstance(scheduler)
      mockModule.setSandboxes(makeSandboxes())
      mockModule.setGuardState(makeGuardState())
      mockModule.setSchedulerStats(makeScheduleStats())

      // 设置 marketplace generateMarketStats 返回
      marketplace.generateMarketStats.mockReturnValue(makeMarketplaceStats())

      const mod = await import('../plugin-ecosystem-bridge')
      bridge = mod.usePluginEcosystemBridge()
    })

    // ============================================================
    // 插件概览
    // ============================================================
    describe('插件概览', () => {
      it('pluginOverview 反映核心插件数量（6 个核心插件）', () => {
        expect(bridge.pluginOverview.value.corePlugins).toBe(6)
      })

      it('pluginOverview 有 totalPlugins 为 6', () => {
        expect(bridge.pluginOverview.value.totalPlugins).toBe(6)
      })

      it('pluginOverview 有 enabledPlugins 为 6', () => {
        expect(bridge.pluginOverview.value.enabledPlugins).toBe(6)
      })

      it('pluginOverview 有 loadedPlugins 为 4', () => {
        expect(bridge.pluginOverview.value.loadedPlugins).toBe(4)
      })

      it('pluginOverview 有 healthScore', () => {
        expect(bridge.pluginOverview.value.healthScore).toBeDefined()
        expect(typeof bridge.pluginOverview.value.healthScore).toBe('number')
        expect(bridge.pluginOverview.value.healthScore).toBeGreaterThanOrEqual(0)
        expect(bridge.pluginOverview.value.healthScore).toBeLessThanOrEqual(100)
      })

      it('pluginOverview 有 healthStatus', () => {
        expect(bridge.pluginOverview.value.healthStatus).toBeDefined()
        expect(['healthy', 'warning', 'critical']).toContain(bridge.pluginOverview.value.healthStatus)
      })

      it('pluginOverview 有 communityPlugins 和 experimentalPlugins', () => {
        expect(typeof bridge.pluginOverview.value.communityPlugins).toBe('number')
        expect(typeof bridge.pluginOverview.value.experimentalPlugins).toBe('number')
      })

      it('pluginOverview 有 categoryCounts', () => {
        expect(bridge.pluginOverview.value.categoryCounts).toBeDefined()
        expect(typeof bridge.pluginOverview.value.categoryCounts).toBe('object')
      })

      it('pluginOverview 有 tierCounts', () => {
        expect(bridge.pluginOverview.value.tierCounts).toBeDefined()
        expect(bridge.pluginOverview.value.tierCounts.official).toBe(5)
        expect(bridge.pluginOverview.value.tierCounts.community).toBe(0)
        // demo-room 示例插件为 experimental 分级
        expect(bridge.pluginOverview.value.tierCounts.experimental).toBe(1)
      })
    })

    // ============================================================
    // 插件列表
    // ============================================================
    describe('插件列表', () => {
      it('pluginList 包含核心插件', () => {
        const ids = bridge.pluginList.value.map((p: any) => p.id)
        expect(ids).toContain('core-timer')
        expect(ids).toContain('core-crystal')
        expect(ids).toContain('core-canvas')
        expect(ids).toContain('core-breathing')
        expect(ids).toContain('core-constitution')
      })

      it('pluginList 每个元素有 sandboxTier', () => {
        bridge.pluginList.value.forEach((p: any) => {
          expect(p).toHaveProperty('sandboxTier')
        })
      })

      it('pluginList 每个元素有 violationCount', () => {
        bridge.pluginList.value.forEach((p: any) => {
          expect(p).toHaveProperty('violationCount')
          expect(typeof p.violationCount).toBe('number')
        })
      })

      it('pluginList 每个元素有 name', () => {
        bridge.pluginList.value.forEach((p: any) => {
          expect(p.name).toBeDefined()
          expect(typeof p.name).toBe('string')
        })
      })

      it('pluginList 每个元素有 isCore 标记', () => {
        bridge.pluginList.value.forEach((p: any) => {
          expect(p.isCore).toBe(true)
        })
      })

      it('pluginList 每个元素有 permissions 数组', () => {
        bridge.pluginList.value.forEach((p: any) => {
          expect(Array.isArray(p.permissions)).toBe(true)
        })
      })

      it('pluginList 每个元素有 sandbox 配置', () => {
        bridge.pluginList.value.forEach((p: any) => {
          expect(p.sandbox).toBeDefined()
          expect(p.sandbox).toHaveProperty('isolateFS')
          expect(p.sandbox).toHaveProperty('isolateNetwork')
          expect(p.sandbox).toHaveProperty('isolateDOM')
        })
      })
    })

    // ============================================================
    // 插件分类
    // ============================================================
    describe('插件分类', () => {
      it('pluginCategories 按 category 分组', () => {
        const categories = bridge.pluginCategories.value
        expect(categories).toBeDefined()
        // timer 分类应有 core-timer
        expect(categories['timer']).toBeDefined()
        expect(Array.isArray(categories['timer'])).toBe(true)
      })

      it('pluginCategories 包含 visual 分类', () => {
        const categories = bridge.pluginCategories.value
        expect(categories['visual']).toBeDefined()
        expect(categories['visual'].length).toBe(3)
      })

      it('categoryList 有正确的分类标签', () => {
        const list = bridge.categoryList.value
        expect(Array.isArray(list)).toBe(true)
        const timerCategory = list.find((c: any) => c.category === 'timer')
        expect(timerCategory).toBeDefined()
        expect(timerCategory.label).toBe('计时')
      })

      it('categoryList 每个条目有 count', () => {
        bridge.categoryList.value.forEach((c: any) => {
          expect(c.count).toBeDefined()
          expect(typeof c.count).toBe('number')
        })
      })
    })

    // ============================================================
    // 沙箱状态
    // ============================================================
    describe('沙箱状态', () => {
      it('sandboxStatus 有 tierDistribution', () => {
        expect(bridge.sandboxStatus.value.tierDistribution).toBeDefined()
        expect(bridge.sandboxStatus.value.tierDistribution).toHaveProperty('L0')
        expect(bridge.sandboxStatus.value.tierDistribution).toHaveProperty('L1')
        expect(bridge.sandboxStatus.value.tierDistribution).toHaveProperty('L2')
      })

      it('sandboxStatus 有 guardConfig', () => {
        const config = bridge.sandboxStatus.value.guardConfig
        expect(config).toBeDefined()
        expect(config.memoryWarningThreshold).toBe(0.8)
        expect(config.storageWarningThreshold).toBe(0.8)
        expect(config.autoDowngrade).toBe(true)
        expect(config.violationThreshold).toBe(5)
      })

      it('sandboxStatus 有 isolatedCount', () => {
        expect(bridge.sandboxStatus.value.isolatedCount).toBe(4)
      })

      it('sandboxStatus 有 guardRunning', () => {
        expect(bridge.sandboxStatus.value.guardRunning).toBe(true)
      })
    })

    // ============================================================
    // 调度器状态
    // ============================================================
    describe('调度器状态', () => {
      it('schedulerStatus 有 pendingTasks', () => {
        expect(bridge.schedulerStatus.value.pendingTasks).toBeDefined()
        expect(typeof bridge.schedulerStatus.value.pendingTasks).toBe('number')
      })

      it('schedulerStatus 有 runningTasks', () => {
        expect(bridge.schedulerStatus.value.runningTasks).toBeDefined()
        expect(typeof bridge.schedulerStatus.value.runningTasks).toBe('number')
      })

      it('schedulerStatus 有 completedTasks', () => {
        expect(bridge.schedulerStatus.value.completedTasks).toBeDefined()
        expect(typeof bridge.schedulerStatus.value.completedTasks).toBe('number')
      })

      it('schedulerStatus 有 failedTasks', () => {
        expect(bridge.schedulerStatus.value.failedTasks).toBeDefined()
        expect(typeof bridge.schedulerStatus.value.failedTasks).toBe('number')
      })

      it('schedulerStatus 有 totalTasks', () => {
        expect(bridge.schedulerStatus.value.totalTasks).toBeGreaterThan(0)
      })

      it('schedulerStatus 有 successRate', () => {
        expect(bridge.schedulerStatus.value.successRate).toBeDefined()
        expect(bridge.schedulerStatus.value.successRate).toBeGreaterThanOrEqual(0)
        expect(bridge.schedulerStatus.value.successRate).toBeLessThanOrEqual(100)
      })
    })

    // ============================================================
    // 建议生成
    // ============================================================
    describe('建议生成', () => {
      it('recommendations 为数组', () => {
        expect(Array.isArray(bridge.recommendations.value)).toBe(true)
      })

      it('recommendations 按优先级排序（high > medium > low）', () => {
        const recs = bridge.recommendations.value
        const order = { high: 0, medium: 1, low: 2 }
        for (let i = 1; i < recs.length; i++) {
          expect(order[recs[i - 1].priority as keyof typeof order]).toBeLessThanOrEqual(order[recs[i].priority as keyof typeof order])
        }
      })
    })

    // ============================================================
    // 高权限/违规场景 - 安全建议
    // ============================================================
    describe('高权限/违规场景 - 安全建议', () => {
      beforeEach(async () => {
        vi.resetModules()
        vi.clearAllMocks()

        const manager = createMockManager(makeCorePluginRuntimes())
        const marketplace = createMockMarketplace()
        const scheduler = createMockScheduler()

        mockModule.setManagerInstance(manager)
        mockModule.setMarketplaceInstance(marketplace)
        mockModule.setSchedulerInstance(scheduler)
        mockModule.setSandboxes(makeSandboxes())
        mockModule.setGuardState(makeGuardStateWithViolations())
        mockModule.setSchedulerStats(makeScheduleStats({
          totalTasks: 30,
          pendingTasks: 25,
          runningTasks: 2,
          completedTasks: 2,
          failedTasks: 1,
          successRate: 40,
        }))

        const mod = await import('../plugin-ecosystem-bridge')
        bridge = mod.usePluginEcosystemBridge()
      })

      it('包含安全建议（高权限插件）', () => {
        const recs = bridge.recommendations.value
        const securityRecs = recs.filter((r: any) => r.type === 'security')
        expect(securityRecs.length).toBeGreaterThan(0)
      })

      it('包含沙箱违规建议', () => {
        const recs = bridge.recommendations.value
        const hasGuardViolation = recs.some((r: any) =>
          r.type === 'security' && r.description.includes('违规')
        )
        expect(hasGuardViolation).toBe(true)
      })

      it('包含降级记录建议', () => {
        const recs = bridge.recommendations.value
        const hasDowngrade = recs.some((r: any) =>
          r.type === 'security' && r.description.includes('降级')
        )
        expect(hasDowngrade).toBe(true)
      })

      it('包含调度失败率高的建议', () => {
        const recs = bridge.recommendations.value
        const hasSchedulerIssue = recs.some((r: any) =>
          r.type === 'performance' && r.description.includes('成功率')
        )
        expect(hasSchedulerIssue).toBe(true)
      })
    })

    // ============================================================
    // 未加载插件场景 - 使用建议
    // ============================================================
    describe('未加载插件场景 - 使用建议', () => {
      beforeEach(async () => {
        vi.resetModules()
        vi.clearAllMocks()

        // 创建仅部分加载的运行时
        const runtimes = makeCorePluginRuntimes()
        runtimes.forEach(r => { r.loaded = false })
        const manager = createMockManager(runtimes)
        const marketplace = createMockMarketplace()
        const scheduler = createMockScheduler()

        mockModule.setManagerInstance(manager)
        mockModule.setMarketplaceInstance(marketplace)
        mockModule.setSchedulerInstance(scheduler)
        mockModule.setSandboxes(makeEmptySandboxes())
        mockModule.setGuardState(makeGuardState({
          running: false,
          guardedCount: 0,
          violationHistory: [],
          downgradeHistory: [],
        }))
        mockModule.setSchedulerStats(makeScheduleStats({
          totalTasks: 0,
          pendingTasks: 0,
          runningTasks: 0,
          completedTasks: 0,
          failedTasks: 0,
          successRate: 0,
        }))

        const mod = await import('../plugin-ecosystem-bridge')
        bridge = mod.usePluginEcosystemBridge()
      })

      it('包含加载率低建议', () => {
        const recs = bridge.recommendations.value
        const hasPerformance = recs.some((r: any) =>
          r.type === 'performance' && r.title.includes('加载率')
        )
        expect(hasPerformance).toBe(true)
      })
    })

    // ============================================================
    // 维护建议
    // ============================================================
    describe('维护建议', () => {
      beforeEach(async () => {
        vi.resetModules()
        vi.clearAllMocks()

        const manager = createMockManager(makeCorePluginRuntimes())
        const marketplace = createMockMarketplace()
        const scheduler = createMockScheduler()

        // 有可用更新
        marketplace.pendingUpdateCount = computed(() => 3)

        mockModule.setManagerInstance(manager)
        mockModule.setMarketplaceInstance(marketplace)
        mockModule.setSchedulerInstance(scheduler)
        mockModule.setSandboxes(makeSandboxes())
        mockModule.setGuardState(makeGuardState())
        mockModule.setSchedulerStats(makeScheduleStats())

        const mod = await import('../plugin-ecosystem-bridge')
        bridge = mod.usePluginEcosystemBridge()
      })

      it('包含维护建议', () => {
        // 检查 marketplaceHealth 状态
        // 通过设置 pendingUpdateCount > 0 来触发维护建议
        const recs = bridge.recommendations.value
        // 至少应该有维护或发现类型的建议
        const hasMaintenanceOrDiscovery = recs.some((r: any) =>
          r.type === 'maintenance' || r.type === 'discovery'
        )
        expect(hasMaintenanceOrDiscovery).toBe(true)
      })
    })

    // ============================================================
    // 操作入口
    // ============================================================
    describe('操作入口', () => {
      it('enablePlugin 启用插件', () => {
        const manager = mockModule.getManagerInstance()!
        // 先禁用一个插件
        const rt = manager.getAll().find((r: any) => r.id === 'core-breathing')!
        rt.enabled = false
        const result = bridge.enablePlugin('core-breathing')
        expect(result).toBe(true)
      })

      it('disablePlugin 禁用插件', () => {
        const result = bridge.disablePlugin('core-timer')
        expect(result).toBe(true)
      })

      it('disablePlugin 对已禁用的插件返回 false', () => {
        const manager = mockModule.getManagerInstance()!
        const rt = manager.getAll().find((r: any) => r.id === 'core-timer')!
        rt.enabled = false
        const result = bridge.disablePlugin('core-timer')
        expect(result).toBe(false)
      })

      it('loadPlugin 加载插件', () => {
        const result = bridge.loadPlugin('core-constitution')
        expect(result).toBe(true)
      })

      it('loadPlugin 对已禁用的插件返回 false', () => {
        const manager = mockModule.getManagerInstance()!
        const rt = manager.getAll().find((r: any) => r.id === 'core-constitution')!
        rt.enabled = false
        const result = bridge.loadPlugin('core-constitution')
        expect(result).toBe(false)
      })

      it('getPluginDetails 返回详情', () => {
        const details = bridge.getPluginDetails('core-timer')
        expect(details).not.toBeNull()
        expect(details.id).toBe('core-timer')
        expect(details.name).toBe('基础计时')
        expect(details.isCore).toBe(true)
      })

      it('getPluginDetails 对不存在的插件返回 null', () => {
        const details = bridge.getPluginDetails('nonexistent')
        expect(details).toBeNull()
      })

      it('getViolations 返回违规记录', () => {
        const violations = bridge.getViolations()
        expect(violations).toBeDefined()
        expect(violations).toHaveProperty('violationHistory')
        expect(violations).toHaveProperty('downgradeHistory')
        expect(violations).toHaveProperty('guardState')
        expect(Array.isArray(violations.violationHistory)).toBe(true)
      })

      it('refreshAll 刷新不抛出异常', () => {
        expect(() => bridge.refreshAll()).not.toThrow()
      })

      it('getPluginsByTier 按分级筛选', () => {
        const official = bridge.getPluginsByTier('official')
        expect(Array.isArray(official)).toBe(true)
        expect(official.length).toBe(5)
        official.forEach((p: any) => {
          expect(p.tier).toBe('official')
        })
      })

      it('getPluginsByTier 筛选 community 返回空', () => {
        const community = bridge.getPluginsByTier('community')
        expect(Array.isArray(community)).toBe(true)
        expect(community.length).toBe(0)
      })

      it('getPluginsByCategory 按分类筛选', () => {
        const visual = bridge.getPluginsByCategory('visual')
        expect(Array.isArray(visual)).toBe(true)
        expect(visual.length).toBe(3)
        visual.forEach((p: any) => {
          expect(p.category).toBe('visual')
        })
      })

      it('getPluginsByCategory 筛选不存在的分类返回空', () => {
        const result = bridge.getPluginsByCategory('nonexistent')
        expect(Array.isArray(result)).toBe(true)
        expect(result.length).toBe(0)
      })

      it('getCorePlugins 返回核心插件', () => {
        const core = bridge.getCorePlugins()
        expect(Array.isArray(core)).toBe(true)
        expect(core.length).toBe(6)
        core.forEach((p: any) => {
          expect(p.isCore).toBe(true)
        })
      })
    })

    // ============================================================
    // 子模块直通
    // ============================================================
    describe('子模块直通', () => {
      it('bridge 暴露 manager 子模块', () => {
        expect(bridge.manager).toBeDefined()
        expect(typeof bridge.manager.getAll).toBe('function')
      })

      it('bridge 暴露 marketplace 子模块', () => {
        expect(bridge.marketplace).toBeDefined()
        expect(typeof bridge.marketplace.generateMarketStats).toBe('function')
      })

      it('bridge 暴露 scheduler 子模块', () => {
        expect(bridge.scheduler).toBeDefined()
        expect(typeof bridge.scheduler.getTasksByPlugin).toBe('function')
      })

      it('bridge 暴露 sandboxIsolator', () => {
        expect(bridge.sandboxIsolator).toBeDefined()
        expect(typeof bridge.sandboxIsolator.getAllSandboxes).toBe('function')
      })

      it('bridge 暴露 runtimeGuard', () => {
        expect(bridge.runtimeGuard).toBeDefined()
        expect(typeof bridge.runtimeGuard.getState).toBe('function')
      })

      it('bridge 暴露的操作函数是函数类型', () => {
        expect(typeof bridge.enablePlugin).toBe('function')
        expect(typeof bridge.disablePlugin).toBe('function')
        expect(typeof bridge.loadPlugin).toBe('function')
        expect(typeof bridge.getPluginDetails).toBe('function')
        expect(typeof bridge.getViolations).toBe('function')
        expect(typeof bridge.refreshAll).toBe('function')
        expect(typeof bridge.getPluginsByTier).toBe('function')
        expect(typeof bridge.getPluginsByCategory).toBe('function')
        expect(typeof bridge.getCorePlugins).toBe('function')
      })
    })

    // ============================================================
    // 完整工作流
    // ============================================================
    describe('完整工作流', () => {
      it('获取插件详情 → 查看违规 → 按分级筛选 → 按分类筛选 完整流程', () => {
        const details = bridge.getPluginDetails('core-constitution')
        expect(details).not.toBeNull()
        expect(details.id).toBe('core-constitution')
        expect(details.name).toBe('心流宪法')

        const violations = bridge.getViolations()
        expect(violations).toBeDefined()
        expect(violations.guardState).toBeDefined()

        const official = bridge.getPluginsByTier('official')
        expect(official.length).toBe(5)

        const visual = bridge.getPluginsByCategory('visual')
        expect(visual.length).toBe(3)

        const core = bridge.getCorePlugins()
        expect(core.length).toBe(6)
      })

      it('启用 → 禁用 → 加载 → 卸载 完整流程', () => {
        const manager = mockModule.getManagerInstance()!

        // 禁用插件
        let rt = manager.getAll().find((r: any) => r.id === 'core-breathing')!
        rt.enabled = true
        const disabled = bridge.disablePlugin('core-breathing')
        expect(disabled).toBe(true)
        expect(rt.enabled).toBe(false)

        // 启用插件
        const enabled = bridge.enablePlugin('core-breathing')
        expect(enabled).toBe(true)
        expect(rt.enabled).toBe(true)

        // 加载插件
        rt.loaded = false
        const loaded = bridge.loadPlugin('core-breathing')
        expect(loaded).toBe(true)
        expect(rt.loaded).toBe(true)
      })
    })
  })
})