// ============================================================
// 数据可视化 · 数据源连接器框架（P16-12）
// 多数据源适配、连接管理、数据变换管道、缓存层、错误恢复
// ============================================================

import { ref, computed, readonly } from 'vue'

// ============================================================
// 类型定义
// ============================================================

/** 数据源类型 */
export type DataSourceType = 'static' | 'polling' | 'streaming' | 'websocket' | 'rest-api'

/** 连接状态 */
export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting'

/** 数据格式 */
export type DataFormat = 'json' | 'csv' | 'xml' | 'array' | 'record'

/** 数据源配置 */
export interface DataSourceConfig {
  /** 数据源 ID */
  id: string
  /** 数据源名称 */
  name: string
  /** 数据源类型 */
  type: DataSourceType
  /** 数据源 URL 或标识 */
  source: string
  /** 数据格式 */
  format: DataFormat
  /** 请求头 */
  headers?: Record<string, string>
  /** 轮询间隔（ms，polling 类型） */
  pollingInterval?: number
  /** 重连间隔（ms） */
  reconnectInterval?: number
  /** 最大重连次数 */
  maxReconnectAttempts?: number
  /** 请求超时（ms） */
  timeout?: number
  /** 认证令牌 */
  authToken?: string
  /** 自定义元数据 */
  metadata?: Record<string, unknown>
  /** 是否启用缓存 */
  enableCache?: boolean
  /** 缓存 TTL（ms） */
  cacheTtl?: number
  /** 自动连接 */
  autoConnect?: boolean
}

/** 数据变换操作类型 */
export type TransformOperation =
  | 'filter'
  | 'map'
  | 'sort'
  | 'aggregate'
  | 'group'
  | 'paginate'
  | 'project'
  | 'join'
  | 'limit'
  | 'flatten'

/** 过滤条件 */
export interface FilterCondition {
  field: string
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'regex' | 'between' | 'exists'
  value: unknown
  value2?: unknown // for 'between'
}

/** 排序规则 */
export interface SortRule {
  field: string
  direction: 'asc' | 'desc'
}

/** 聚合规则 */
export interface AggregateRule {
  field: string
  function: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'distinct' | 'median' | 'stddev'
  alias?: string
}

/** 分组规则 */
export interface GroupRule {
  fields: string[]
  aggregates?: AggregateRule[]
}

/** 分页规则 */
export interface PaginateRule {
  page: number
  pageSize: number
}

/** 投影规则 */
export interface ProjectRule {
  fields: string[]
  /** 是否排除模式（排除指定字段） */
  exclude?: boolean
}

/** 连接规则 */
export interface JoinRule {
  /** 右表数据 */
  rightData: Record<string, unknown>[]
  /** 左表连接字段 */
  leftField: string
  /** 右表连接字段 */
  rightField: string
  /** 连接类型 */
  type: 'inner' | 'left' | 'right' | 'full'
  /** 右表字段前缀 */
  prefix?: string
}

/** 数据变换步骤 */
export interface TransformStep {
  id: string
  operation: TransformOperation
  enabled: boolean
  config:
    | FilterCondition
    | Record<string, unknown> // map
    | SortRule
    | AggregateRule
    | GroupRule
    | PaginateRule
    | ProjectRule
    | JoinRule
    | number // limit
    | { field: string } // flatten
}

/** 变换管道配置 */
export interface TransformPipelineConfig {
  steps: TransformStep[]
  /** 是否启用调试 */
  debug?: boolean
}

/** 数据源连接记录 */
export interface ConnectionRecord {
  id: string
  dataSourceId: string
  status: ConnectionStatus
  connectedAt: string | null
  disconnectedAt: string | null
  lastDataAt: string | null
  errorCount: number
  lastError: string | null
  reconnectAttempts: number
  latency: number | null
}

/** 缓存条目 */
export interface CacheEntry<T = unknown> {
  data: T
  createdAt: number
  ttl: number
  sourceId: string
  hits: number
}

/** 数据源错误 */
export interface DataSourceError {
  code: string
  message: string
  sourceId: string
  timestamp: string
  retryable: boolean
  originalError?: unknown
}

/** 数据订阅回调 */
export type DataCallback<T = unknown> = (data: T) => void

/** 数据订阅 */
export interface DataSubscription<T = unknown> {
  id: string
  sourceId: string
  callback: DataCallback<T>
  filter?: (data: T) => boolean
  active: boolean
}

/** 连接器状态 */
export interface ConnectorState {
  sources: DataSourceConfig[]
  connections: Record<string, ConnectionRecord>
  subscriptions: DataSubscription[]
  errors: DataSourceError[]
  cache: Record<string, CacheEntry>
}

// ============================================================
// 默认配置
// ============================================================

export const DEFAULT_DATA_SOURCE_CONFIG: Partial<DataSourceConfig> = {
  pollingInterval: 5000,
  reconnectInterval: 3000,
  maxReconnectAttempts: 5,
  timeout: 10000,
  enableCache: true,
  cacheTtl: 60000,
  autoConnect: false,
}

// ============================================================
// 工具函数
// ============================================================

let srcIdCounter = 0
function generateSourceId(): string {
  return `ds_${Date.now().toString(36)}_${(srcIdCounter++).toString(36)}`
}

let stepIdCounter = 0
function generateStepId(): string {
  return `step_${Date.now().toString(36)}_${(stepIdCounter++).toString(36)}`
}

let subIdCounter = 0
function generateSubscriptionId(): string {
  return `sub_${Date.now().toString(36)}_${(subIdCounter++).toString(36)}`
}

/** 深度比较两个值 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== typeof b) return false
  if (typeof a !== 'object' || a === null || b === null) return false
  const keysA = Object.keys(a as Record<string, unknown>)
  const keysB = Object.keys(b as Record<string, unknown>)
  if (keysA.length !== keysB.length) return false
  return keysA.every(k => deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]))
}

/** 应用于过滤条件 */
function applyFilter(data: Record<string, unknown>[], condition: FilterCondition): Record<string, unknown>[] {
  return data.filter(row => {
    const val = row[condition.field]
    switch (condition.operator) {
      case 'eq': return deepEqual(val, condition.value)
      case 'neq': return !deepEqual(val, condition.value)
      case 'gt': return (val as number) > (condition.value as number)
      case 'gte': return (val as number) >= (condition.value as number)
      case 'lt': return (val as number) < (condition.value as number)
      case 'lte': return (val as number) <= (condition.value as number)
      case 'in': return Array.isArray(condition.value) && condition.value.some(v => deepEqual(val, v))
      case 'nin': return Array.isArray(condition.value) && !condition.value.some(v => deepEqual(val, v))
      case 'contains': return typeof val === 'string' && val.includes(String(condition.value))
      case 'regex': return typeof val === 'string' && new RegExp(String(condition.value)).test(val)
      case 'between': {
        const n = val as number
        const lo = condition.value as number
        const hi = condition.value2 as number
        return n >= lo && n <= hi
      }
      case 'exists': return val !== undefined && val !== null
      default: return true
    }
  })
}

/** 应用排序 */
function applySort(data: Record<string, unknown>[], rule: SortRule): Record<string, unknown>[] {
  return [...data].sort((a, b) => {
    const va = a[rule.field]
    const vb = b[rule.field]
    if (va === vb) return 0
    const cmp = va === undefined || va === null ? 1
      : vb === undefined || vb === null ? -1
      : va < vb ? -1 : 1
    return rule.direction === 'desc' ? -cmp : cmp
  })
}

/** 应用聚合 */
function applyAggregate(data: Record<string, unknown>[], rule: AggregateRule): Record<string, unknown> {
  // count 和 distinct 对原始数据操作
  if (rule.function === 'count') {
    return { [rule.alias ?? `count_${rule.field}`]: data.length }
  }
  if (rule.function === 'distinct') {
    const distinctValues = new Set(data.map(r => r[rule.field]))
    return { [rule.alias ?? `distinct_${rule.field}`]: distinctValues.size }
  }

  const values = data.map(r => Number(r[rule.field])).filter(v => !isNaN(v))
  let result: number
  switch (rule.function) {
    case 'sum': result = values.reduce((a, b) => a + b, 0); break
    case 'avg': result = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0; break
    case 'min': result = values.length > 0 ? Math.min(...values) : 0; break
    case 'max': result = values.length > 0 ? Math.max(...values) : 0; break
    case 'median': {
      const sorted = [...values].sort((a, b) => a - b)
      const mid = Math.floor(sorted.length / 2)
      result = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
      break
    }
    case 'stddev': {
      const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0
      const variance = values.length > 0 ? values.reduce((s, v) => s + (v - avg) ** 2, 0) / values.length : 0
      result = Math.sqrt(variance)
      break
    }
    default: result = 0
  }
  return { [rule.alias ?? `${rule.function}_${rule.field}`]: result }
}

/** 应用分组 */
function applyGroup(data: Record<string, unknown>[], rule: GroupRule): Record<string, unknown>[] {
  const groups = new Map<string, Record<string, unknown>[]>()
  for (const row of data) {
    const key = rule.fields.map(f => String(row[f] ?? '')).join('|')
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(row)
  }
  const result: Record<string, unknown>[] = []
  for (const [key, rows] of groups) {
    const groupRow: Record<string, unknown> = { _groupKey: key, _count: rows.length }
    for (let i = 0; i < rule.fields.length; i++) {
      groupRow[rule.fields[i]] = rows[0][rule.fields[i]]
    }
    if (rule.aggregates) {
      for (const agg of rule.aggregates) {
        const aggResult = applyAggregate(rows, agg)
        Object.assign(groupRow, aggResult)
      }
    }
    result.push(groupRow)
  }
  return result
}

/** 应用投影 */
function applyProject(data: Record<string, unknown>[], rule: ProjectRule): Record<string, unknown>[] {
  if (rule.exclude) {
    return data.map(row => {
      const projected: Record<string, unknown> = { ...row }
      for (const field of rule.fields) {
        delete projected[field]
      }
      return projected
    })
  }
  return data.map(row => {
    const projected: Record<string, unknown> = {}
    for (const field of rule.fields) {
      projected[field] = row[field]
    }
    return projected
  })
}

/** 应用连接 */
function applyJoin(data: Record<string, unknown>[], rule: JoinRule): Record<string, unknown>[] {
  const rightMap = new Map<unknown, Record<string, unknown>[]>()
  for (const row of rule.rightData) {
    const key = row[rule.rightField]
    if (!rightMap.has(key)) rightMap.set(key, [])
    rightMap.get(key)!.push(row)
  }

  const prefix = rule.prefix ?? `${rule.rightField}_`
  const result: Record<string, unknown>[] = []
  const matchedRightKeys = new Set<unknown>()

  for (const leftRow of data) {
    const leftKey = leftRow[rule.leftField]
    const rightRows = rightMap.get(leftKey) ?? []

    if (rightRows.length > 0) {
      matchedRightKeys.add(leftKey)
      for (const rightRow of rightRows) {
        const joined: Record<string, unknown> = { ...leftRow }
        for (const [k, v] of Object.entries(rightRow)) {
          if (k !== rule.rightField) {
            joined[`${prefix}${k}`] = v
          } else {
            joined[`${prefix}${k}`] = v
          }
        }
        result.push(joined)
      }
    } else if (rule.type === 'left' || rule.type === 'full') {
      result.push({ ...leftRow })
    }
  }

  if (rule.type === 'right' || rule.type === 'full') {
    for (const [key, rightRows] of rightMap) {
      if (!matchedRightKeys.has(key)) {
        for (const rightRow of rightRows) {
          const joined: Record<string, unknown> = { ...rightRow }
          for (const [k, v] of Object.entries(rightRow)) {
            joined[`${prefix}${k}`] = v
          }
          result.push(joined)
        }
      }
    }
  }

  return result
}

// ============================================================
// 数据变换管道
// ============================================================

export function useTransformPipeline(initialSteps?: TransformStep[]) {
  const steps = ref<TransformStep[]>(initialSteps ?? [])
  const debugEnabled = ref(false)

  /** 添加步骤 */
  function addStep(
    operation: TransformOperation,
    config: TransformStep['config'],
    options?: { enabled?: boolean },
  ): TransformStep {
    const step: TransformStep = {
      id: generateStepId(),
      operation,
      enabled: options?.enabled ?? true,
      config,
    }
    steps.value = [...steps.value, step]
    return step
  }

  /** 移除步骤 */
  function removeStep(stepId: string): boolean {
    const before = steps.value.length
    steps.value = steps.value.filter(s => s.id !== stepId)
    return steps.value.length < before
  }

  /** 更新步骤 */
  function updateStep(
    stepId: string,
    partial: Partial<Pick<TransformStep, 'config' | 'enabled' | 'operation'>>,
  ): TransformStep | null {
    const idx = steps.value.findIndex(s => s.id === stepId)
    if (idx === -1) return null
    const updated = { ...steps.value[idx], ...partial }
    steps.value = [...steps.value.slice(0, idx), updated, ...steps.value.slice(idx + 1)]
    return updated
  }

  /** 重排步骤 */
  function reorderSteps(stepIds: string[]): void {
    const stepMap = new Map(steps.value.map(s => [s.id, s]))
    steps.value = stepIds.map(id => stepMap.get(id)!).filter(Boolean)
  }

  /** 启用/禁用步骤 */
  function toggleStep(stepId: string): boolean {
    const step = steps.value.find(s => s.id === stepId)
    if (!step) return false
    return updateStep(stepId, { enabled: !step.enabled }) !== null
  }

  /** 执行变换管道 */
  function execute(data: Record<string, unknown>[]): Record<string, unknown>[] {
    let result = [...data]
    const debugLog: Array<{ stepId: string; operation: string; inputCount: number; outputCount: number }> = []

    for (const step of steps.value) {
      if (!step.enabled) continue

      const inputCount = result.length

      switch (step.operation) {
        case 'filter':
          result = applyFilter(result, step.config as FilterCondition)
          break
        case 'sort':
          result = applySort(result, step.config as SortRule)
          break
        case 'aggregate':
          result = [applyAggregate(result, step.config as AggregateRule)]
          break
        case 'group':
          result = applyGroup(result, step.config as GroupRule)
          break
        case 'paginate': {
          const { page, pageSize } = step.config as PaginateRule
          const start = (page - 1) * pageSize
          result = result.slice(start, start + pageSize)
          break
        }
        case 'project':
          result = applyProject(result, step.config as ProjectRule)
          break
        case 'join':
          result = applyJoin(result, step.config as JoinRule)
          break
        case 'limit':
          result = result.slice(0, step.config as number)
          break
        case 'flatten': {
          const { field } = step.config as { field: string }
          result = result.flatMap(row => {
            const val = row[field]
            if (Array.isArray(val)) {
              return val.map((v: unknown) => {
                if (typeof v === 'object' && v !== null) {
                  return { ...row, ...(v as Record<string, unknown>) }
                }
                return { ...row, [field]: v }
              })
            }
            return [row]
          })
          break
        }
        case 'map': {
          const mapConfig = step.config as Record<string, unknown>
          result = result.map(row => {
            const mapped: Record<string, unknown> = { ...row }
            for (const [key, expr] of Object.entries(mapConfig)) {
              if (typeof expr === 'function') {
                mapped[key] = (expr as (r: Record<string, unknown>) => unknown)(row)
              } else {
                mapped[key] = expr
              }
            }
            return mapped
          })
          break
        }
      }

      if (debugEnabled.value) {
        debugLog.push({
          stepId: step.id,
          operation: step.operation,
          inputCount,
          outputCount: result.length,
        })
      }
    }

    return result
  }

  /** 获取步骤数量 */
  const stepCount = computed(() => steps.value.length)

  /** 获取启用的步骤数量 */
  const enabledStepCount = computed(() => steps.value.filter(s => s.enabled).length)

  /** 清空管道 */
  function clear(): void {
    steps.value = []
  }

  return {
    steps: readonly(steps),
    debugEnabled,
    stepCount,
    enabledStepCount,
    addStep,
    removeStep,
    updateStep,
    reorderSteps,
    toggleStep,
    execute,
    clear,
  }
}

// ============================================================
// 数据源连接器
// ============================================================

export function useDataSourceConnector() {
  // ---- 状态 ----
  const sources = ref<DataSourceConfig[]>([])
  const connections = ref<Record<string, ConnectionRecord>>({})
  const subscriptions = ref<DataSubscription[]>([])
  const errors = ref<DataSourceError[]>([])
  const cache = ref<Record<string, CacheEntry>>({})

  // ---- 内部状态 ----
  const pollingTimers: Record<string, ReturnType<typeof setInterval>> = {}
  let lastErrorId = 0

  // ---- 派生状态 ----

  const connectedSources = computed(() =>
    sources.value.filter(s => connections.value[s.id]?.status === 'connected'),
  )

  const errorSources = computed(() =>
    sources.value.filter(s => connections.value[s.id]?.status === 'error'),
  )

  const totalErrors = computed(() => errors.value.length)

  // ============================================================
  // 数据源管理
  // ============================================================

  /** 注册数据源 */
  function registerSource(config: DataSourceConfig): DataSourceConfig {
    const source: DataSourceConfig = {
      ...DEFAULT_DATA_SOURCE_CONFIG,
      ...config,
      id: config.id || generateSourceId(),
    }

    const existing = sources.value.findIndex(s => s.id === source.id)
    if (existing !== -1) {
      sources.value = [...sources.value.slice(0, existing), source, ...sources.value.slice(existing + 1)]
    } else {
      sources.value = [...sources.value, source]
    }

    connections.value[source.id] = {
      id: source.id,
      dataSourceId: source.id,
      status: 'idle',
      connectedAt: null,
      disconnectedAt: null,
      lastDataAt: null,
      errorCount: 0,
      lastError: null,
      reconnectAttempts: 0,
      latency: null,
    }

    if (source.autoConnect) {
      connectSource(source.id)
    }

    return source
  }

  /** 注销数据源 */
  function unregisterSource(sourceId: string): boolean {
    disconnectSource(sourceId)
    sources.value = sources.value.filter(s => s.id !== sourceId)
    const { [sourceId]: _, ...rest } = connections.value
    connections.value = rest
    return true
  }

  /** 获取数据源 */
  function getSource(sourceId: string): DataSourceConfig | undefined {
    return sources.value.find(s => s.id === sourceId)
  }

  /** 获取所有数据源 */
  function getAllSources(): DataSourceConfig[] {
    return sources.value
  }

  // ============================================================
  // 连接管理
  // ============================================================

  /** 连接数据源 */
  async function connectSource(sourceId: string): Promise<ConnectionRecord> {
    const source = sources.value.find(s => s.id === sourceId)
    if (!source) {
      throw new Error(`数据源 ${sourceId} 不存在`)
    }

    const record = connections.value[sourceId]
    if (!record) {
      throw new Error(`数据源 ${sourceId} 的连接记录不存在`)
    }

    updateConnectionStatus(sourceId, 'connecting')

    try {
      // 模拟连接延迟
      await new Promise(resolve => setTimeout(resolve, 50))

      updateConnectionStatus(sourceId, 'connected', {
        connectedAt: new Date().toISOString(),
        reconnectAttempts: 0,
      })

      // 启动轮询
      if (source.type === 'polling') {
        startPolling(sourceId)
      }

      return connections.value[sourceId]
    } catch (err) {
      handleConnectionError(sourceId, err as Error)
      throw err
    }
  }

  /** 断开数据源连接 */
  function disconnectSource(sourceId: string): void {
    stopPolling(sourceId)
    updateConnectionStatus(sourceId, 'disconnected', {
      disconnectedAt: new Date().toISOString(),
    })
  }

  /** 重连数据源 */
  async function reconnectSource(sourceId: string): Promise<ConnectionRecord> {
    const record = connections.value[sourceId]
    if (!record) {
      throw new Error(`数据源 ${sourceId} 的连接记录不存在`)
    }

    const source = sources.value.find(s => s.id === sourceId)
    if (!source) {
      throw new Error(`数据源 ${sourceId} 不存在`)
    }

    const maxAttempts = source.maxReconnectAttempts ?? DEFAULT_DATA_SOURCE_CONFIG.maxReconnectAttempts ?? 5
    if (record.reconnectAttempts >= maxAttempts) {
      updateConnectionStatus(sourceId, 'error', {
        lastError: `已达最大重连次数 (${maxAttempts})`,
      })
      return connections.value[sourceId]
    }

    updateConnectionStatus(sourceId, 'reconnecting', {
      reconnectAttempts: record.reconnectAttempts + 1,
    })

    const interval = source.reconnectInterval ?? DEFAULT_DATA_SOURCE_CONFIG.reconnectInterval ?? 3000
    await new Promise(resolve => setTimeout(resolve, interval * Math.min(record.reconnectAttempts, 5)))

    return connectSource(sourceId)
  }

  /** 更新连接状态 */
  function updateConnectionStatus(
    sourceId: string,
    status: ConnectionStatus,
    extra?: Partial<ConnectionRecord>,
  ): void {
    connections.value = {
      ...connections.value,
      [sourceId]: {
        ...connections.value[sourceId],
        status,
        ...extra,
      },
    }
  }

  /** 处理连接错误 */
  function handleConnectionError(sourceId: string, err: Error): void {
    const record = connections.value[sourceId]
    if (!record) return

    updateConnectionStatus(sourceId, 'error', {
      errorCount: record.errorCount + 1,
      lastError: err.message,
    })

    const errorEntry: DataSourceError = {
      code: `DS_ERR_${++lastErrorId}`,
      message: err.message,
      sourceId,
      timestamp: new Date().toISOString(),
      retryable: true,
      originalError: err,
    }
    errors.value = [...errors.value.slice(-100), errorEntry]

    // 自动重连
    const source = sources.value.find(s => s.id === sourceId)
    if (source?.autoConnect) {
      reconnectSource(sourceId)
    }
  }

  // ============================================================
  // 轮询管理
  // ============================================================

  /** 启动轮询 */
  function startPolling(sourceId: string): void {
    const source = sources.value.find(s => s.id === sourceId)
    if (!source || source.type !== 'polling') return

    stopPolling(sourceId)

    const interval = source.pollingInterval ?? DEFAULT_DATA_SOURCE_CONFIG.pollingInterval ?? 5000
    pollingTimers[sourceId] = setInterval(() => {
      fetchData(sourceId)
    }, interval)
  }

  /** 停止轮询 */
  function stopPolling(sourceId: string): void {
    if (pollingTimers[sourceId]) {
      clearInterval(pollingTimers[sourceId])
      delete pollingTimers[sourceId]
    }
  }

  // ============================================================
  // 数据获取
  // ============================================================

  /** 获取数据 */
  async function fetchData<T = unknown>(
    sourceId: string,
    params?: Record<string, string>,
  ): Promise<T> {
    const source = sources.value.find(s => s.id === sourceId)
    if (!source) {
      throw new Error(`数据源 ${sourceId} 不存在`)
    }

    const record = connections.value[sourceId]
    if (!record || record.status !== 'connected') {
      throw new Error(`数据源 ${sourceId} 未连接`)
    }

    // 检查缓存
    const cacheKey = `${sourceId}_${JSON.stringify(params ?? {})}`
    if (source.enableCache) {
      const cached = cache.value[cacheKey]
      if (cached && Date.now() - cached.createdAt < cached.ttl) {
        cached.hits++
        return cached.data as T
      }
    }

    const startTime = performance.now()

    try {
      const timeout = source.timeout ?? DEFAULT_DATA_SOURCE_CONFIG.timeout ?? 10000

      // 构建 URL
      const url = new URL(source.source, window.location.origin)
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          url.searchParams.set(k, v)
        }
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const headers: Record<string, string> = {
        'Accept': 'application/json',
        ...source.headers,
      }
      if (source.authToken) {
        headers['Authorization'] = `Bearer ${source.authToken}`
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      let data: T
      switch (source.format) {
        case 'json':
          data = await response.json()
          break
        case 'csv': {
          const text = await response.text()
          data = parseCSV(text) as T
          break
        }
        case 'xml': {
          const text = await response.text()
          data = parseXML(text) as T
          break
        }
        default:
          data = await response.json()
      }

      const latency = performance.now() - startTime

      // 更新连接记录
      connections.value = {
        ...connections.value,
        [sourceId]: {
          ...connections.value[sourceId],
          lastDataAt: new Date().toISOString(),
          latency,
        },
      }

      // 更新缓存
      if (source.enableCache) {
        cache.value = {
          ...cache.value,
          [cacheKey]: {
            data,
            createdAt: Date.now(),
            ttl: source.cacheTtl ?? DEFAULT_DATA_SOURCE_CONFIG.cacheTtl ?? 60000,
            sourceId,
            hits: 0,
          },
        }
      }

      // 通知订阅者
      notifySubscribers(sourceId, data)

      return data
    } catch (err) {
      handleConnectionError(sourceId, err as Error)
      throw err
    }
  }

  /** 获取静态数据（不要求连接状态） */
  function getStaticData<T = unknown>(data: T): Promise<T> {
    return Promise.resolve(data)
  }

  // ============================================================
  // 订阅管理
  // ============================================================

  /** 订阅数据变化 */
  function subscribe<T = unknown>(
    sourceId: string,
    callback: DataCallback<T>,
    filter?: (data: T) => boolean,
  ): string {
    const subId = generateSubscriptionId()
    const subscription: DataSubscription<T> = {
      id: subId,
      sourceId,
      callback,
      filter,
      active: true,
    }
    subscriptions.value = [...subscriptions.value, subscription as DataSubscription]
    return subId
  }

  /** 取消订阅 */
  function unsubscribe(subscriptionId: string): boolean {
    const before = subscriptions.value.length
    subscriptions.value = subscriptions.value.filter(s => s.id !== subscriptionId)
    return subscriptions.value.length < before
  }

  /** 通知订阅者 */
  function notifySubscribers<T>(sourceId: string, data: T): void {
    for (const sub of subscriptions.value) {
      if (sub.sourceId !== sourceId || !sub.active) continue
      try {
        const typedSub = sub as DataSubscription<T>
        if (!typedSub.filter || typedSub.filter(data)) {
          typedSub.callback(data)
        }
      } catch (err) {
        // 订阅回调错误不应影响其他订阅者
        console.error(`订阅回调错误 (${sub.id}):`, err)
      }
    }
  }

  /** 暂停订阅 */
  function pauseSubscription(subscriptionId: string): boolean {
    const sub = subscriptions.value.find(s => s.id === subscriptionId)
    if (!sub) return false
    sub.active = false
    return true
  }

  /** 恢复订阅 */
  function resumeSubscription(subscriptionId: string): boolean {
    const sub = subscriptions.value.find(s => s.id === subscriptionId)
    if (!sub) return false
    sub.active = true
    return true
  }

  // ============================================================
  // 缓存管理
  // ============================================================

  /** 清除指定数据源的缓存 */
  function clearSourceCache(sourceId: string): number {
    let count = 0
    const newCache: Record<string, CacheEntry> = {}
    for (const [key, entry] of Object.entries(cache.value)) {
      if (entry.sourceId === sourceId) {
        count++
      } else {
        newCache[key] = entry
      }
    }
    cache.value = newCache
    return count
  }

  /** 清除所有缓存 */
  function clearAllCache(): number {
    const count = Object.keys(cache.value).length
    cache.value = {}
    return count
  }

  /** 清除过期缓存 */
  function clearExpiredCache(): number {
    const now = Date.now()
    let count = 0
    const newCache: Record<string, CacheEntry> = {}
    for (const [key, entry] of Object.entries(cache.value)) {
      if (now - entry.createdAt > entry.ttl) {
        count++
      } else {
        newCache[key] = entry
      }
    }
    cache.value = newCache
    return count
  }

  /** 获取缓存统计 */
  function getCacheStats(): { total: number; expired: number; totalHits: number } {
    const now = Date.now()
    let expired = 0
    let totalHits = 0
    for (const entry of Object.values(cache.value)) {
      if (now - entry.createdAt > entry.ttl) expired++
      totalHits += entry.hits
    }
    return { total: Object.keys(cache.value).length, expired, totalHits }
  }

  // ============================================================
  // 错误管理
  // ============================================================

  /** 清除错误 */
  function clearErrors(sourceId?: string): number {
    if (sourceId) {
      const before = errors.value.length
      errors.value = errors.value.filter(e => e.sourceId !== sourceId)
      return before - errors.value.length
    }
    const count = errors.value.length
    errors.value = []
    return count
  }

  /** 获取错误 */
  function getErrors(sourceId?: string): DataSourceError[] {
    if (sourceId) {
      return errors.value.filter(e => e.sourceId === sourceId)
    }
    return errors.value
  }

  // ============================================================
  // 生命周期
  // ============================================================

  /** 断开所有连接 */
  function disconnectAll(): void {
    for (const sourceId of Object.keys(connections.value)) {
      disconnectSource(sourceId)
    }
  }

  /** 重置连接器 */
  function reset(): void {
    disconnectAll()
    sources.value = []
    connections.value = {}
    subscriptions.value = []
    errors.value = []
    cache.value = {}
  }

  return {
    // 状态
    sources,
    connections,
    subscriptions,
    errors,
    cache,

    // 派生状态
    connectedSources,
    errorSources,
    totalErrors,

    // 数据源管理
    registerSource,
    unregisterSource,
    getSource,
    getAllSources,

    // 连接管理
    connectSource,
    disconnectSource,
    reconnectSource,

    // 数据获取
    fetchData,
    getStaticData,

    // 订阅管理
    subscribe,
    unsubscribe,
    pauseSubscription,
    resumeSubscription,

    // 缓存管理
    clearSourceCache,
    clearAllCache,
    clearExpiredCache,
    getCacheStats,

    // 错误管理
    clearErrors,
    getErrors,

    // 生命周期
    disconnectAll,
    reset,
  }
}

// ============================================================
// CSV 解析
// ============================================================

function parseCSV(text: string): Record<string, unknown>[] {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  const result: Record<string, unknown>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const row: Record<string, unknown> = {}
    for (let j = 0; j < headers.length; j++) {
      const val = values[j]?.trim().replace(/^"|"$/g, '') ?? ''
      // 尝试转为数字
      const num = Number(val)
      row[headers[j]] = !isNaN(num) && val !== '' ? num : val
    }
    result.push(row)
  }

  return result
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

// ============================================================
// XML 解析（简易）
// ============================================================

function parseXML(text: string): Record<string, unknown>[] {
  const result: Record<string, unknown>[] = []
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi
  let match: RegExpExecArray | null

  while ((match = itemRegex.exec(text)) !== null) {
    const content = match[1]
    const item: Record<string, unknown> = {}
    const fieldRegex = /<(\w+)[^>]*>([\s\S]*?)<\/\1>/gi
    let fieldMatch: RegExpExecArray | null

    while ((fieldMatch = fieldRegex.exec(content)) !== null) {
      const val = fieldMatch[2].trim()
      const num = Number(val)
      item[fieldMatch[1]] = !isNaN(num) && val !== '' ? num : val
    }

    if (Object.keys(item).length > 0) {
      result.push(item)
    }
  }

  return result.length > 0 ? result : [{ raw: text }]
}