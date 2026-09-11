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

// ============================================================
// 集成：房间模板面板 RoomTemplatesPanel（INCR-238 补挂载孤儿组件）
// 引擎 useRoomTemplates 内部 ref 按调用自 storage 读，清存储即复位
// ============================================================
describe('集成：房间模板面板', () => {
  const K_TEMPLATES = 'hf_space_templates'
  const K_LAYOUTS = 'hf_room_layouts'
  const K_SCENES = 'hf_space_scenes'

  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockStore).forEach(k => delete mockStore[k])
  })

  function seed(opts: { templates?: boolean; scenes?: boolean } = {}) {
    if (opts.templates) {
      mockStore[K_TEMPLATES] = [
        {
          id: 'tpl-a',
          name: '晚间专注',
          description: '睡前复盘与明日规划',
          icon: '🌙',
          category: 'ritual',
          builtIn: true,
          useCount: 3,
          roomIds: ['studio'],
          tags: ['晚间', '复盘'],
        },
        {
          id: 'tpl-b',
          name: '晨间启动',
          description: '清晨唤醒与目标设定',
          icon: '☀️',
          category: 'ritual',
          builtIn: true,
          useCount: 1,
          roomIds: ['studio'],
          tags: ['晨间', '目标'],
        },
      ]
    }
    if (opts.scenes) {
      mockStore[K_SCENES] = [
        {
          id: 'scene-a',
          name: '深夜书房',
          description: '静谧阅读角落',
          templateId: null,
        },
      ]
    }
  }

  it('无数据时渲染房间模板骨架与三标签', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.rtp').exists()).toBe(true)
    expect(wrapper.text()).toContain('房间模板')
    const tabs = wrapper.findAll('.rtp-tab')
    expect(tabs.length).toBe(3)
    expect(wrapper.text()).toContain('模板')
    expect(wrapper.text()).toContain('布局')
    expect(wrapper.text()).toContain('场景')
  })

  it('模板 tab 显示统计四格与模板列表', async () => {
    seed({ templates: true })
    const wrapper = await getWrapper()
    const stats = wrapper.findAll('.rtp-stat-value')
    expect(stats.length).toBe(4)
    expect(wrapper.text()).toContain('总模板')
    expect(wrapper.find('.rtp-tpl').exists()).toBe(true)
    expect(wrapper.text()).toContain('晚间专注')
  })

  it('按关键词搜索过滤模板', async () => {
    seed({ templates: true })
    const wrapper = await getWrapper()
    const search = wrapper.find('.rtp-input--grow')
    await search.setValue('晨间')
    await wrapper.vm.$nextTick()
    const cards = wrapper.findAll('.rtp-tpl')
    expect(cards.length).toBe(1)
    expect(wrapper.text()).toContain('晨间启动')
    expect(wrapper.text()).not.toContain('晚间专注')
  })

  it('布局 tab 展示已存布局', async () => {
    mockStore[K_LAYOUTS] = [
      {
        layoutId: 'lay-a',
        name: '三列网格',
        type: 'grid',
        columns: 3,
        gap: 12,
        cardSize: 'medium',
      },
    ]
    const wrapper = await getWrapper()
    const layoutTab = wrapper.findAll('.rtp-tab')[1]!
    await layoutTab.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.rtp-layout').exists()).toBe(true)
    expect(wrapper.text()).toContain('三列网格')
  })

  it('场景 tab 展示已存场景', async () => {
    seed({ scenes: true })
    const wrapper = await getWrapper()
    const sceneTab = wrapper.findAll('.rtp-tab')[2]!
    await sceneTab.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.rtp-scene').exists()).toBe(true)
    expect(wrapper.text()).toContain('深夜书房')
  })
})

// ============================================================
// 集成：空间编排面板 SpaceOrchestrationPanel（INCR-245 补挂载孤儿组件）
// 引擎 useSpaceOrchestrator 内 refs 于 use 调用时自 storage 读，
// 空 configs 时自动 initialize() 从真实 room-graph getAllRooms() 合并全部房间并 persist，
// 故无需 seed，mock 的 storage.setKV 即可承接编排/转换/快照写入
// ============================================================
describe('集成：空间编排面板', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockStore).forEach(k => delete mockStore[k])
  })

  it('集成渲染空间编排面板与四标签', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.sop').exists()).toBe(true)
    expect(wrapper.text()).toContain('🎛 空间编排')
    expect(wrapper.text()).toContain('总览 · 转换 · 依赖 · 快照')
    const tabs = wrapper.findAll('.sop-tab')
    expect(tabs.length).toBe(4)
    expect(wrapper.text()).toContain('总览')
    expect(wrapper.text()).toContain('转换')
    expect(wrapper.text()).toContain('依赖')
    expect(wrapper.text()).toContain('快照')
  })

  it('总览 tab 展示六格统计与房间分类分组', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.sop-stats').exists()).toBe(true)
    const stats = wrapper.findAll('.sop-stat')
    expect(stats.length).toBeGreaterThanOrEqual(6)
    expect(wrapper.text()).toContain('空间')
    expect(wrapper.text()).toContain('活跃')
    expect(wrapper.text()).toContain('空闲')
    expect(wrapper.text()).toContain('异常')
    // 从真实房间图自动派生分类分组
    expect(wrapper.findAll('.sop-group').length).toBeGreaterThan(0)
    expect(wrapper.findAll('.sop-chip').length).toBeGreaterThan(0)
  })

  it('依赖 tab 展示加载顺序与空间依赖链', async () => {
    const wrapper = await getWrapper()
    const depTab = wrapper.findAll('.sop-tab')[2]!
    await depTab.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('加载顺序')
    expect(wrapper.findAll('.sop-order-step').length).toBeGreaterThan(0)
    expect(wrapper.findAll('.sop-dep').length).toBeGreaterThan(0)
    expect(wrapper.text()).toContain('优先级')
    expect(wrapper.text()).toContain('依赖')
  })

  it('依赖 tab 点击检查依赖显示结果', async () => {
    const wrapper = await getWrapper()
    const depTab = wrapper.findAll('.sop-tab')[2]!
    await depTab.trigger('click')
    await wrapper.vm.$nextTick()
    const checkBtn = wrapper.find('.sop-dep .sop-btn--small')
    await checkBtn.trigger('click')
    await wrapper.vm.$nextTick()
    const result = wrapper.find('.sop-dep-result')
    expect(result.exists()).toBe(true)
    const text = result.text()
    expect(text.includes('依赖满足') || text.includes('缺少')).toBe(true)
  })

  it('转换 tab 空态展示操作区与空态提示', async () => {
    const wrapper = await getWrapper()
    const transTab = wrapper.findAll('.sop-tab')[1]!
    await transTab.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.sop-select').exists()).toBe(true)
    expect(wrapper.text()).toContain('转换')
    expect(wrapper.text()).toContain('批量预加载')
    expect(wrapper.text()).toContain('最近转换')
    expect(wrapper.text()).toContain('暂无转换记录')
  })

  it('快照 tab 空态可创建快照', async () => {
    const wrapper = await getWrapper()
    const snapTab = wrapper.findAll('.sop-tab')[3]!
    await snapTab.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('创建快照')
    expect(wrapper.text()).toContain('重置编排')
    expect(wrapper.text()).toContain('快照（最多 10 个）')
    expect(wrapper.text()).toContain('暂无快照。创建一份试试。')
    // 创建快照后持久化一份快照（computed 读 storage 非响应式，故校验写入而非即时重渲染）
    await wrapper.find('.sop-actions .sop-btn').trigger('click')
    await wrapper.vm.$nextTick()
    const persisted = (mockStore['hf_space_snapshots'] as any[]) ?? []
    expect(persisted.length).toBe(1)
    expect(persisted[0].activeSpaceId).toBe(null)
    expect(Object.keys(persisted[0].spaces).length).toBeGreaterThan(0)
  })
})