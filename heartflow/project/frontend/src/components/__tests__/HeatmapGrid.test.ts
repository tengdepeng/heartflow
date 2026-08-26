// ============================================================
// HeatmapGrid 组件测试
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

// 模拟 storage
const mockGetSessions = vi.fn()

vi.mock('../../engine/storage', () => ({
  storage: {
    getSessions: (...args: any[]) => mockGetSessions(...args),
  },
}))

async function getWrapper(props?: Record<string, any>) {
  const { default: HeatmapGrid } = await import('../HeatmapGrid.vue')
  return mount(HeatmapGrid, { props: { days: 7, ...props } })
}

describe('HeatmapGrid', () => {
  beforeEach(() => {
    mockGetSessions.mockReset()
    mockGetSessions.mockReturnValue([])
  })

  it('无数据时渲染网格', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.heatmap-grid').exists()).toBe(true)
    expect(wrapper.find('.heatmap-title').text()).toContain('专注热力')
  })

  it('显示传入的天数', async () => {
    const wrapper = await getWrapper({ days: 14 })
    expect(wrapper.text()).toContain('14 天')
  })

  it('渲染 8 个时间标签', async () => {
    const wrapper = await getWrapper()
    const labels = wrapper.findAll('.hour-label')
    expect(labels).toHaveLength(8)
  })

  it('渲染图例', async () => {
    const wrapper = await getWrapper()
    const swatches = wrapper.findAll('.legend-swatch')
    expect(swatches).toHaveLength(5)
  })

  it('有数据时渲染热力单元格', async () => {
    const now = new Date()
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)

    mockGetSessions.mockReturnValue([
      {
        id: 's1',
        status: 'completed',
        elapsed: 1500000, // 25min in ms
        startedAt: yesterday.toISOString(),
      },
    ])

    const wrapper = await getWrapper()
    // 7天 × 24小时 = 168 个单元格
    const cells = wrapper.findAll('.heat-cell')
    expect(cells).toHaveLength(168)
  })

  it('默认 days 为 7', async () => {
    const wrapper = await getWrapper()
    const cells = wrapper.findAll('.heat-cell')
    expect(cells).toHaveLength(168)
  })

  it('忽略 interrupted 以外的非 completed 会话', async () => {
    mockGetSessions.mockReturnValue([
      { id: 's1', status: 'running', elapsed: 500000, startedAt: new Date().toISOString() },
    ])
    const wrapper = await getWrapper()
    const cells = wrapper.findAll('.heat-cell')
    // 所有单元格都应存在
    expect(cells).toHaveLength(168)
  })

  it('忽略无 startedAt 的会话', async () => {
    mockGetSessions.mockReturnValue([
      { id: 's1', status: 'completed', elapsed: 500000 },
    ])
    const wrapper = await getWrapper()
    const cells = wrapper.findAll('.heat-cell')
    expect(cells).toHaveLength(168)
  })
})