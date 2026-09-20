import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { computed, ref } from 'vue'
import DataSourceConnectorPanel from '../DataSourceConnectorPanel.vue'

// ---- 受控引擎 mock（mock 副作用函数需同步更新 ref，见 INCR-103/boot 教训）----
const sources = ref<any[]>([])
const connections = ref<Record<string, any>>({})
const subscriptions = ref<any[]>([])
const errors = ref<any[]>([])
const cache = ref<Record<string, any>>({})

const connectedSources = computed(() => sources.value.filter((s) => connections.value[s.id]?.status === 'connected'))
const errorSources = computed(() => sources.value.filter((s) => connections.value[s.id]?.status === 'error'))
const totalErrors = computed(() => errors.value.length)

const registerSource = vi.fn()
const unregisterSource = vi.fn()
const connectSource = vi.fn()
const disconnectSource = vi.fn()
const reconnectSource = vi.fn()
const clearAllCache = vi.fn()
const clearExpiredCache = vi.fn()
const clearErrors = vi.fn()
const getCacheStats = vi.fn()

vi.mock('../../modules/visualization/datasource-connector', () => ({
  useDataSourceConnector: () => ({
    sources,
    connections,
    subscriptions,
    errors,
    cache,
    connectedSources,
    errorSources,
    totalErrors,
    registerSource,
    unregisterSource,
    connectSource,
    disconnectSource,
    reconnectSource,
    clearAllCache,
    clearExpiredCache,
    clearErrors,
    getCacheStats,
  }),
}))

function makeSource(id: string, overrides: Record<string, unknown> = {}): any {
  return {
    id,
    name: `源${id}`,
    type: 'static',
    format: 'json',
    source: `/data/${id}.json`,
    ...overrides,
  }
}

function makeRecord(id: string, overrides: Record<string, unknown> = {}): any {
  return {
    id,
    dataSourceId: id,
    status: 'idle',
    connectedAt: null,
    disconnectedAt: null,
    lastDataAt: null,
    errorCount: 0,
    lastError: null,
    reconnectAttempts: 0,
    latency: null,
    ...overrides,
  }
}

function resetAll(): void {
  sources.value = []
  connections.value = {}
  subscriptions.value = []
  errors.value = []
  cache.value = {}
  for (const fn of [registerSource, unregisterSource, connectSource, disconnectSource, reconnectSource, clearAllCache, clearExpiredCache, clearErrors]) {
    fn.mockReset()
  }
  getCacheStats.mockImplementation(() => ({
    total: Object.keys(cache.value).length,
    expired: 0,
    totalHits: Object.values(cache.value).reduce((n: number, c: any) => n + (c.hits ?? 0), 0),
  }))
  registerSource.mockImplementation((config: any) => {
    const id = config.id || `src_${sources.value.length + 1}`
    const src = { ...config, id }
    sources.value = [...sources.value, src]
    connections.value = { ...connections.value, [id]: makeRecord(id) }
    return src
  })
  unregisterSource.mockImplementation((id: string) => {
    sources.value = sources.value.filter((s) => s.id !== id)
    const rest: Record<string, any> = {}
    for (const [k, v] of Object.entries(connections.value)) {
      if (k !== id) rest[k] = v
    }
    connections.value = rest
    return true
  })
  connectSource.mockImplementation(async (id: string) => {
    connections.value = { ...connections.value, [id]: { ...connections.value[id], status: 'connected', connectedAt: new Date('2026-01-01T08:00:00Z').toISOString() } }
  })
  disconnectSource.mockImplementation((id: string) => {
    connections.value = { ...connections.value, [id]: { ...connections.value[id], status: 'disconnected', disconnectedAt: new Date('2026-01-01T09:00:00Z').toISOString() } }
  })
  reconnectSource.mockImplementation(async (id: string) => {
    connections.value = { ...connections.value, [id]: { ...connections.value[id], status: 'connected' } }
  })
  clearAllCache.mockImplementation(() => {
    const n = Object.keys(cache.value).length
    cache.value = {}
    return n
  })
  clearExpiredCache.mockImplementation(() => {
    const n = Object.keys(cache.value).length
    cache.value = {}
    return n
  })
  clearErrors.mockImplementation(() => {
    const n = errors.value.length
    errors.value = []
    return n
  })
}

beforeEach(() => {
  resetAll()
})

function mountPanel() {
  return mount(DataSourceConnectorPanel, {
    global: { stubs: { transition: false } },
  })
}

describe('DataSourceConnectorPanel 数据源连接器', () => {
  it('空态：标题/子标题/统计条零值/注册区/订阅与错误空态', () => {
    const wrapper = mountPanel()
    expect(wrapper.text()).toContain('数据源连接器')
    expect(wrapper.text()).toContain('多源适配 · 连接管理 · 缓存 · 错误恢复')
    expect(wrapper.text()).toContain('0 已连接')
    expect(wrapper.text()).toContain('0 源总数')
    expect(wrapper.find('[data-testid="dscp-empty"]').text()).toContain('尚未注册数据源')
    expect(wrapper.text()).toContain('无错误记录')
    expect(wrapper.text()).toContain('活动订阅 0 个')
    expect(wrapper.find('[data-testid="dscp-register"]').exists()).toBe(true)
  })

  it('预置源渲染：名称/类型徽标/格式/状态徽标「已连接」', () => {
    sources.value = [makeSource('s1', { name: '静态示例' })]
    connections.value = { s1: makeRecord('s1', { status: 'connected' }) }
    const wrapper = mountPanel()
    expect(wrapper.text()).toContain('静态示例')
    expect(wrapper.text()).toContain('静态')
    expect(wrapper.text()).toContain('JSON')
    expect(wrapper.text()).toContain('/data/s1.json')
    expect(wrapper.text()).toContain('已连接')
    expect(wrapper.text()).toContain('1 已连接')
  })

  it('错误源：is-error 标记 + 「错误」徽标 + 错误次数', () => {
    sources.value = [makeSource('s1')]
    connections.value = { s1: makeRecord('s1', { status: 'error', errorCount: 2, lastError: 'HTTP 500' }) }
    const wrapper = mountPanel()
    const srcEl = wrapper.find('[data-testid="dscp-src-s1"]')
    expect(srcEl.classes()).toContain('is-error')
    expect(wrapper.text()).toContain('错误')
    expect(wrapper.text()).toContain('错误 2 次')
    expect(wrapper.text()).toContain('HTTP 500')
  })

  it('注册表单：填写并提交调用 registerSource 且参数正确、表单复位', async () => {
    const wrapper = mountPanel()
    await wrapper.find('[data-testid="dscp-name"]').setValue('天气')
    await wrapper.find('[data-testid="dscp-source"]').setValue('https://example.com/weather')
    await wrapper.find('.dscp-form [data-testid="dscp-register"]').trigger('click')
    expect(registerSource).toHaveBeenCalledTimes(1)
    expect(registerSource).toHaveBeenCalledWith(
      expect.objectContaining({ name: '天气', type: 'static', format: 'json', source: 'https://example.com/weather' }),
    )
    expect(wrapper.find('[data-testid="dscp-name"]').element as HTMLInputElement).toHaveProperty('value', '')
  })

  it('一键预设：注册静态示例源', async () => {
    const wrapper = mountPanel()
    const presetBtns = wrapper.findAll('.dscp-form-actions .dscp-btn')
    const staticBtn = presetBtns.find((b) => b.text() === '静态示例')
    await staticBtn!.trigger('click')
    expect(registerSource).toHaveBeenCalledWith(
      expect.objectContaining({ name: '静态示例', type: 'static', source: '/data/sample.json', format: 'json' }),
    )
  })

  it('连接：调用 connectSource，状态徽标变「已连接」且连接按钮禁用', async () => {
    sources.value = [makeSource('s1')]
    connections.value = { s1: makeRecord('s1') }
    const wrapper = mountPanel()
    await wrapper.find('[data-testid="dscp-src-s1"] .dscp-btn--connect').trigger('click')
    await flushPromises()
    expect(connectSource).toHaveBeenCalledWith('s1')
    expect(wrapper.text()).toContain('已连接')
    expect(wrapper.find('[data-testid="dscp-src-s1"] .dscp-btn--connect').attributes('disabled')).toBeDefined()
  })

  it('断开：调用 disconnectSource，状态徽标变「已断开」', async () => {
    sources.value = [makeSource('s1')]
    connections.value = { s1: makeRecord('s1', { status: 'connected' }) }
    const wrapper = mountPanel()
    const btns = wrapper.findAll('[data-testid="dscp-src-s1"] .dscp-btn')
    const disconnectBtn = btns.find((b) => b.text() === '断开')
    await disconnectBtn!.trigger('click')
    expect(disconnectSource).toHaveBeenCalledWith('s1')
    expect(wrapper.text()).toContain('已断开')
  })

  it('注销：调用 unregisterSource，列表移除并回到空态', async () => {
    sources.value = [makeSource('s1')]
    connections.value = { s1: makeRecord('s1') }
    const wrapper = mountPanel()
    const btns = wrapper.findAll('[data-testid="dscp-src-s1"] .dscp-btn')
    const unregBtn = btns.find((b) => b.text() === '注销')
    await unregBtn!.trigger('click')
    expect(unregisterSource).toHaveBeenCalledWith('s1')
    expect(wrapper.find('[data-testid="dscp-empty"]').exists()).toBe(true)
  })

  it('缓存：统计条显示条目/命中，清空调用 clearAllCache 并归零', async () => {
    cache.value = {
      k1: { sourceId: 's1', createdAt: Date.now(), ttl: 60000, hits: 3, data: {} },
      k2: { sourceId: 's1', createdAt: Date.now(), ttl: 60000, hits: 1, data: {} },
    }
    const wrapper = mountPanel()
    expect(wrapper.text()).toContain('条目 2')
    expect(wrapper.text()).toContain('命中 4')
    await wrapper.find('[data-testid="dscp-clear-cache"]').trigger('click')
    expect(clearAllCache).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('条目 0')
  })

  it('错误列表：渲染 code/消息，清空调用 clearErrors 并回空态', async () => {
    errors.value = [
      { code: 'DS_ERR_1', message: '网络中断', sourceId: 's1', timestamp: '2026-01-01T08:00:00Z', retryable: true },
    ]
    const wrapper = mountPanel()
    expect(wrapper.text()).toContain('DS_ERR_1')
    expect(wrapper.text()).toContain('网络中断')
    await wrapper.find('[data-testid="dscp-clear-errors"]').trigger('click')
    expect(clearErrors).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('无错误记录')
  })

  it('订阅：只统计活动订阅', () => {
    subscriptions.value = [
      { id: 'sub1', sourceId: 's1', active: true },
      { id: 'sub2', sourceId: 's1', active: false },
    ]
    const wrapper = mountPanel()
    expect(wrapper.text()).toContain('活动订阅 1 个')
  })
})
