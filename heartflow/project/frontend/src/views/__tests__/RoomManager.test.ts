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

// ============================================================
// 集成：空间路线谱面板 SpaceRouteArchivePanel（INCR-262 补挂载孤儿组件）
// 引擎 useDynamicRoutes：hf_dynamic_routes 为空时自动自房间图初始化；
// 可注入 hf_dynamic_routes / hf_route_events 种子验证路由构成与访问分析
// ============================================================
describe('集成：空间路线谱面板', () => {
  const K_ROUTES = 'hf_dynamic_routes'
  const K_EVENTS = 'hf_route_events'

  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockStore).forEach(k => delete mockStore[k])
  })

  function makeRoute(name: string, overrides: Record<string, any> = {}) {
    return {
      path: '/' + name,
      name,
      source: 'static',
      loadStrategy: 'lazy',
      priority: 50,
      enabled: true,
      meta: {},
      accessCount: 0,
      ...overrides,
    }
  }

  function seedRoutes(routes: Record<string, any>) {
    mockStore[K_ROUTES] = routes
  }

  it('无种子数据时自房间图初始化并渲染骨架与统计', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.spr-panel').exists()).toBe(true)
    expect(wrapper.text()).toContain('空间 · 路线谱')
    expect(wrapper.text()).toContain('基于空间模板与编排规则的路由构成与访问分析')
    // 概览四格
    const stats = wrapper.findAll('.spr-stat')
    expect(stats.length).toBe(4)
    expect(wrapper.text()).toContain('路线总数')
    expect(wrapper.text()).toContain('启用中')
    expect(wrapper.text()).toContain('累计访问')
    expect(wrapper.text()).toContain('平均加载')
    // 自动初始化后路线总数大于 0
    const totalText = wrapper.findAll('.spr-stat-num')[0].text()
    expect(Number(totalText)).toBeGreaterThan(0)
    // 操作按钮
    expect(wrapper.text()).toContain('同步房间布线')
    expect(wrapper.text()).toContain('重置')
  })

  it('加载策略分布渲染四行且来源构成仅展示非零', async () => {
    seedRoutes({
      'a': makeRoute('a', { loadStrategy: 'eager' }),
      'b': makeRoute('b', { loadStrategy: 'lazy' }),
      'c': makeRoute('c', { loadStrategy: 'preload', source: 'plugin' }),
    })
    const wrapper = await getWrapper()
    const rows = wrapper.findAll('.spr-strategy-row')
    expect(rows.length).toBe(4)
    expect(wrapper.text()).toContain('立即加载')
    expect(wrapper.text()).toContain('按需加载')
    expect(wrapper.text()).toContain('预加载')
    expect(wrapper.text()).toContain('空闲加载')
    // 静态 2 / 插件 1，动态、模板、用户为 0 不渲染 chip
    const chips = wrapper.findAll('.spr-source-chip')
    expect(chips.length).toBe(2)
    expect(wrapper.text()).toContain('静态')
    expect(wrapper.text()).toContain('插件')
  })

  it('无访问/耗时/事件数据时显示对应空态', async () => {
    const wrapper = await getWrapper()
    // 自动初始化后路由均无访问记录：最近/最慢/接入动态为空态
    // （热门列表按访问次数降序仍会列出全 0 路由，故其空态分支不可达）
    expect(wrapper.text()).toContain('暂无最近访问')
    expect(wrapper.text()).toContain('暂无加载耗时数据')
    expect(wrapper.text()).toContain('暂无接入动态')
    const hotBlock = wrapper.findAll('.spr-grid .spr-block')[0]!
    expect(hotBlock.findAll('.spr-row').length).toBeGreaterThan(0)
  })

  it('热门路线按访问次数降序展示排名与次数', async () => {
    seedRoutes({
      'hot-a': makeRoute('hot-a', { accessCount: 9 }),
      'hot-b': makeRoute('hot-b', { accessCount: 3 }),
      'cold': makeRoute('cold', { accessCount: 1 }),
    })
    const wrapper = await getWrapper()
    const hotBlock = wrapper.findAll('.spr-grid .spr-block')[0]!
    const names = hotBlock.findAll('.spr-row-name').map(n => n.text())
    expect(names).toEqual(['hot-a', 'hot-b', 'cold'])
    const ranks = hotBlock.findAll('.spr-rank').map(r => r.text())
    expect(ranks).toEqual(['1', '2', '3'])
    const vals = hotBlock.findAll('.spr-row-val').map(v => v.text())
    expect(vals).toEqual(['9', '3', '1'])
  })

  it('最近访问按时间降序展示并格式化时间', async () => {
    seedRoutes({
      'older': makeRoute('older', { lastAccessedAt: '2026-09-10T08:00:00.000Z' }),
      'newer': makeRoute('newer', { lastAccessedAt: '2026-09-11T09:30:00.000Z' }),
      'never': makeRoute('never', {}),
    })
    const wrapper = await getWrapper()
    const recentBlock = wrapper.findAll('.spr-grid .spr-block')[1]!
    const names = recentBlock.findAll('.spr-row-name').map(n => n.text())
    // never 无访问时间被过滤
    expect(names).toEqual(['newer', 'older'])
    // 时间格式化为 MM-DD HH:mm
    const times = recentBlock.findAll('.spr-row-time').map(t => t.text())
    expect(times).toHaveLength(2)
    expect(times.every(t => /^\d{2}-\d{2} \d{2}:\d{2}$/.test(t))).toBe(true)
  })

  it('加载最慢按耗时降序展示', async () => {
    seedRoutes({
      'slow-a': makeRoute('slow-a', { avgLoadTimeMs: 800 }),
      'slow-b': makeRoute('slow-b', { avgLoadTimeMs: 120 }),
      'normal': makeRoute('normal', { avgLoadTimeMs: 45 }),
    })
    const wrapper = await getWrapper()
    const slowBlock = wrapper.findAll('.spr-grid .spr-block')[2]!
    const names = slowBlock.findAll('.spr-row-name').map(n => n.text())
    expect(names).toEqual(['slow-a', 'slow-b', 'normal'])
    const times = slowBlock.findAll('.spr-slow').map(t => t.text())
    expect(times).toEqual(['800ms', '120ms', '45ms'])
  })

  it('接入动态渲染事件类型与成功标志', async () => {
    seedRoutes({ 'room-a': makeRoute('room-a') })
    mockStore[K_EVENTS] = [
      { type: 'register', routeName: 'room-a', timestamp: '2026-09-11T00:00:00.000Z', source: 'static', success: true },
      { type: 'update', routeName: 'room-a', timestamp: '2026-09-11T01:00:00.000Z', source: 'static', success: true },
      { type: 'register', routeName: 'room-x', timestamp: '2026-09-11T02:00:00.000Z', source: 'dynamic', success: false, error: 'boom' },
    ]
    const wrapper = await getWrapper()
    const events = wrapper.findAll('.spr-event')
    expect(events.length).toBe(3)
    expect(wrapper.text()).toContain('注册')
    expect(wrapper.text()).toContain('更新')
    expect(wrapper.text()).toContain('room-a')
    expect(wrapper.text()).toContain('✓')
    expect(wrapper.text()).toContain('✗')
  })

  it('点击同步房间布线保留房间既有配置并重建全量布线', async () => {
    // 预置真实房间 home 的自定义配置 + 一条非房间自定义路由
    seedRoutes({
      'home': makeRoute('home', { source: 'user', accessCount: 42, loadStrategy: 'idle' }),
      'custom': makeRoute('custom', { source: 'user' }),
    })
    const wrapper = await getWrapper()
    // 配置非空不触发自动初始化，仅 2 条
    expect(Object.keys(mockStore[K_ROUTES]).length).toBe(2)
    const syncBtn = wrapper.find('.spr-btn')
    await syncBtn.trigger('click')
    await wrapper.vm.$nextTick()
    const persisted = (mockStore[K_ROUTES] ?? {}) as Record<string, any>
    // 真实房间的既有配置被保留（来源与访问数不变）
    expect(persisted['home']).toBeDefined()
    expect(persisted['home'].source).toBe('user')
    expect(persisted['home'].accessCount).toBe(42)
    // 非房间自定义路由被重建丢弃
    expect(persisted['custom']).toBeUndefined()
    // 重建后为全量房间布线
    expect(Object.keys(persisted).length).toBeGreaterThan(2)
  })

  it('点击重置清空自定义路由并重建静态路由', async () => {
    seedRoutes({ 'custom': makeRoute('custom', { source: 'user' }) })
    const wrapper = await getWrapper()
    const resetBtn = wrapper.find('.spr-btn--ghost')
    await resetBtn.trigger('click')
    await wrapper.vm.$nextTick()
    const persisted = (mockStore[K_ROUTES] ?? {}) as Record<string, any>
    expect(persisted['custom']).toBeUndefined()
    expect(Object.keys(persisted).length).toBeGreaterThan(0)
    const sources = Object.values(persisted).map((c: any) => c.source)
    expect(sources.every(s => s === 'static')).toBe(true)
  })
})