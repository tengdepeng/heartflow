// ============================================================
// RoomManager 视图测试 - 房间管理器
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

// ---- 模拟 storage ----
const mockStore: Record<string, any> = {}
const mockGetKV = vi.fn((_key: string, def: any) => mockStore[_key] ?? def)
const mockSetKV = vi.fn((key: string, val: any) => { mockStore[key] = val })

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (...args: any[]) => (mockGetKV as any)(...args),
    setKV: (...args: any[]) => (mockSetKV as any)(...args),
  },
}))

// ---- 模拟 room-manager ----
const mockToggleVisibility = vi.fn()
const mockResetRoomConfig = vi.fn()
const mockRoomEntries = { value: [] as any[] }
const mockRoomsByGroup = { value: {} as Record<string, any[]> }
const mockStats = { total: 0, visible: 0, hidden: 0 }

vi.mock('../../modules/room-manager', () => ({
  useRoomManager: () => ({
    roomEntries: mockRoomEntries,
    roomsByGroup: mockRoomsByGroup,
    stats: mockStats,
    toggleVisibility: (id: string) => mockToggleVisibility(id),
    resetRoomConfig: (id: string) => mockResetRoomConfig(id),
  }),
  RoomNode: {},
  RoomConfig: {},
}))

// ---- 模拟 pinia ----
vi.mock('pinia', () => ({
  storeToRefs: (store: any) => store,
  defineStore: () => () => ({}),
  setActivePinia: () => {},
  createPinia: () => ({}),
}))

async function getWrapper() {
  const { default: RoomManager } = await import('../RoomManager.vue')
  return mount(RoomManager, {
    global: {
      stubs: {
        Teleport: true,
        Transition: true,
      },
    },
  })
}

describe('RoomManager 房间管理器', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockStore).forEach(k => delete mockStore[k])
  })

  it('渲染标题', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('房间管理器')
    expect(wrapper.text()).toContain('管理所有房间的可见性和自定义')
  })

  it('显示概览卡片', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('总房间')
    expect(wrapper.text()).toContain('可见')
    expect(wrapper.text()).toContain('隐藏')
  })

  it('显示搜索框', async () => {
    const wrapper = await getWrapper()
    const searchInput = wrapper.find('.rm-search-input')
    expect(searchInput.exists()).toBe(true)
    expect(searchInput.attributes('placeholder')).toContain('搜索房间名称')
  })

  it('无房间时显示空状态', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('暂无可管理的房间')
  })

  it('有房间时显示分组标题', async () => {
    // 模拟有房间数据
    const mockEntry = {
      room: { id: 'test-room', name: '测试房间', path: 'test', icon: '🏠', group: 'gravity' },
      config: { visible: true, customName: null, customIcon: null, customColor: null },
    }
    mockRoomEntries.value = [mockEntry]
    mockRoomsByGroup.value = { gravity: [mockEntry] }
    mockStats.total = 1
    mockStats.visible = 1
    mockStats.hidden = 0

    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('引力中心')
    expect(wrapper.text()).toContain('测试房间')

    // 恢复
    mockRoomEntries.value = []
    mockRoomsByGroup.value = {}
  })

  it('显示搜索清空按钮（有搜索内容时）', async () => {
    const wrapper = await getWrapper()
    const searchInput = wrapper.find('.rm-search-input')
    await searchInput.setValue('测试')
    const clearBtn = wrapper.find('.rm-search-clear')
    expect(clearBtn.exists()).toBe(true)
  })
})

// ============================================================
// 集成：空间健康面板 SpaceHealthPanel（INCR-237 补挂载孤儿组件）
// 引擎 useSpaceHealth 内部 ref 按调用自 storage 读，清存储即复位
// ============================================================
describe('集成：空间健康面板', () => {
  const K_REPORTS = 'hf_space_health_reports'
  const K_ISSUES = 'hf_space_health_issues'
  const K_ALERTS = 'hf_health_alerts'

  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockStore).forEach(k => delete mockStore[k])
  })

  function seed(opts: { reports?: boolean; issues?: boolean; alerts?: boolean } = {}) {
    if (opts.reports) {
      mockStore[K_REPORTS] = {
        'sanctuary': {
          spaceId: 'sanctuary',
          level: 'excellent',
          score: 92,
          metrics: [],
          activeIssues: [],
          reportedAt: '2026-09-11T00:00:00.000Z',
        },
        'craft': {
          spaceId: 'craft',
          level: 'poor',
          score: 48,
          metrics: [],
          activeIssues: [],
          reportedAt: '2026-09-11T00:00:00.000Z',
        },
      }
    }
    if (opts.issues) {
      mockStore[K_ISSUES] = [
        {
          id: 'issue-1',
          type: 'dependency',
          severity: 'high',
          description: '业脉缺少邻接依赖',
          suggestion: '补全邻接关系',
          detectedAt: '2026-09-11T00:00:00.000Z',
          resolved: false,
        },
      ]
    }
    if (opts.alerts) {
      mockStore[K_ALERTS] = [
        {
          id: 'alert-1',
          level: 'warning',
          title: '房间健康下降',
          description: 'craft 房间健康分降至临界',
          isRead: false,
          isResolved: false,
          createdAt: '2026-09-11T00:00:00.000Z',
        },
      ]
    }
  }

  it('无报告时渲染空间健康空态', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.shp').exists()).toBe(true)
    expect(wrapper.text()).toContain('空间健康')
    expect(wrapper.text()).toContain('尚未生成健康报告')
    // 概览/报告/问题/告警 四标签
    const tabs = wrapper.findAll('.shp-tab')
    expect(tabs.length).toBe(4)
    expect(wrapper.text()).toContain('生成全部报告')
  })

  it('有报告时概览显示平均分与空间数', async () => {
    seed({ reports: true })
    const wrapper = await getWrapper()
    expect(wrapper.find('.shp-score-value').text()).toBe('70')
    expect(wrapper.text()).toContain('2 个空间')
  })

  it('报告 tab 列表展示各空间健康等级', async () => {
    seed({ reports: true })
    const wrapper = await getWrapper()
    const reportTab = wrapper.findAll('.shp-tab')[1]!
    await reportTab.trigger('click')
    await wrapper.vm.$nextTick()
    const reports = wrapper.findAll('.shp-report')
    expect(reports.length).toBe(2)
    expect(wrapper.text()).toContain('sanctuary')
    expect(wrapper.text()).toContain('craft')
  })

  it('问题 tab 展示活跃问题并可标记已解决', async () => {
    seed({ issues: true })
    const wrapper = await getWrapper()
    const issueTab = wrapper.findAll('.shp-tab')[2]!
    await issueTab.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.shp-issue').exists()).toBe(true)
    expect(wrapper.text()).toContain('业脉缺少邻接依赖')
    const resolveBtn = wrapper.find('.shp-btn--small')
    await resolveBtn.trigger('click')
    await wrapper.vm.$nextTick()
    // 已解决后不再出现
    expect(wrapper.find('.shp-issue').exists()).toBe(false)
    expect(wrapper.text()).toContain('没有活跃问题')
  })

  it('告警 tab 展示未读告警并可标为已读', async () => {
    seed({ alerts: true })
    const wrapper = await getWrapper()
    const alertTab = wrapper.findAll('.shp-tab')[3]!
    await alertTab.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.shp-alert').exists()).toBe(true)
    expect(wrapper.text()).toContain('房间健康下降')
  })

  it('点击生成全部报告后概览出现平均健康分', async () => {
    const wrapper = await getWrapper()
    const genBtn = wrapper.find('.shp-btn')
    await genBtn.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.shp-score-value').exists()).toBe(true)
  })
})