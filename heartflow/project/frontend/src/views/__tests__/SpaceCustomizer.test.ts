import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

const mockStore: Record<string, any> = {}
const mockGetKV = vi.fn((_key: string, def: any) => mockStore[_key] ?? def)
const mockSetKV = vi.fn((key: string, val: any) => { mockStore[key] = val })

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (...args: any[]) => (mockGetKV as any)(...args),
    setKV: (...args: any[]) => (mockSetKV as any)(...args),
  },
}))

async function getWrapper() {
  const { default: SpaceCustomizer } = await import('../SpaceCustomizer.vue')
  return mount(SpaceCustomizer)
}

function createConfig(overrides: Record<string, any> = {}) {
  return {
    id: 'sc1',
    name: '测试配置',
    description: '测试描述',
    presetId: 'standard',
    dimensions: [
      {
        dimension: 'structure',
        label: '空间结构',
        icon: 'Layout',
        options: { rooms: ['home', 'garden', 'study'], layout: 'grid' },
      },
      {
        dimension: 'features',
        label: '功能特性',
        icon: 'Zap',
        options: { enabled: ['timer', 'anchor', 'gesture'] },
      },
      {
        dimension: 'interaction',
        label: '交互方式',
        icon: 'Hand',
        options: { gestures: 'essential', keyboardShortcuts: true, hapticFeedback: false, soundEnabled: true },
      },
      {
        dimension: 'style',
        label: '视觉风格',
        icon: 'Palette',
        options: { theme: 'dark', activeStylePack: 'default-gravity', transitionDuration: 350 },
      },
      {
        dimension: 'data',
        label: '数据管理',
        icon: 'Database',
        options: { sync: 'local', autoBackup: false, retentionDays: 90 },
      },
      {
        dimension: 'permission',
        label: '权限配置',
        icon: 'Shield',
        options: { role: 'owner', multiUser: false, accessControl: 'basic' },
      },
      {
        dimension: 'scene',
        label: '场景预设',
        icon: 'Image',
        options: { presets: ['default', 'focus'], activeScene: 'default' },
      },
    ],
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
    ...overrides,
  }
}

describe('SpaceCustomizer 空间自定义视图', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore['hf:space_configs'] = []
    mockStore['hf:active_space_config'] = null
  })

  it('渲染标题和描述', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('空间自定义')
    expect(wrapper.text()).toContain('自定义你的空间')
  })

  it('渲染 8 个预置模板卡片', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('标准空间')
    expect(wrapper.text()).toContain('极简空间')
    expect(wrapper.text()).toContain('禅意空间')
    expect(wrapper.text()).toContain('创意空间')
    expect(wrapper.text()).toContain('学人空间')
    expect(wrapper.text()).toContain('社交空间')
    expect(wrapper.text()).toContain('行者空间')
    expect(wrapper.text()).toContain('疗愈空间')
  })

  it('无配置时显示空状态提示', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('还没有保存的配置')
  })

  it('有配置时显示列表', async () => {
    mockStore['hf:space_configs'] = [
      { id: 'sc1', name: '我的配置', description: '描述', presetId: null, dimensions: [], createdAt: '2026-07-01T00:00:00Z', updatedAt: '2026-07-01T00:00:00Z' },
    ]
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('我的配置')
    expect(wrapper.text()).toContain('1')
  })

  it('配置卡片显示维度编辑按钮', async () => {
    mockStore['hf:space_configs'] = [createConfig()]
    const wrapper = await getWrapper()
    const editBtns = wrapper.findAll('.sc-config-btn')
    const editBtn = editBtns.filter(b => b.text() === '编辑维度')
    expect(editBtn.length).toBeGreaterThan(0)
  })
})

describe('SpaceCustomizer 维度编辑器', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore['hf:space_configs'] = []
    mockStore['hf:active_space_config'] = null
  })

  it('点击编辑维度按钮打开维度编辑器', async () => {
    mockStore['hf:space_configs'] = [createConfig()]
    const wrapper = await getWrapper()
    const editBtns = wrapper.findAll('.sc-config-btn')
    const editBtn = editBtns.filter(b => b.text() === '编辑维度')
    await editBtn[0].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.sc-dim-editor').exists()).toBe(true)
  })

  it('维度编辑器显示 7 个维度卡片', async () => {
    mockStore['hf:space_configs'] = [createConfig()]
    const wrapper = await getWrapper()
    const editBtns = wrapper.findAll('.sc-config-btn')
    const editBtn = editBtns.filter(b => b.text() === '编辑维度')
    await editBtn[0].trigger('click')
    await wrapper.vm.$nextTick()
    const dimCards = wrapper.findAll('.dim-card')
    expect(dimCards.length).toBe(7)
  })

  it('维度编辑器标题显示配置名称', async () => {
    mockStore['hf:space_configs'] = [createConfig()]
    const wrapper = await getWrapper()
    const editBtns = wrapper.findAll('.sc-config-btn')
    const editBtn = editBtns.filter(b => b.text() === '编辑维度')
    await editBtn[0].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.sc-dim-editor').text()).toContain('测试配置')
  })

  it('空间结构维度显示房间数和布局', async () => {
    mockStore['hf:space_configs'] = [createConfig()]
    const wrapper = await getWrapper()
    const editBtns = wrapper.findAll('.sc-config-btn')
    const editBtn = editBtns.filter(b => b.text() === '编辑维度')
    await editBtn[0].trigger('click')
    await wrapper.vm.$nextTick()
    const structureCard = wrapper.findAll('.dim-card')[0]
    expect(structureCard.text()).toContain('空间结构')
    expect(structureCard.text()).toContain('3 房间')
  })

  it('功能特性维度显示启用的功能数量', async () => {
    mockStore['hf:space_configs'] = [createConfig()]
    const wrapper = await getWrapper()
    const editBtns = wrapper.findAll('.sc-config-btn')
    const editBtn = editBtns.filter(b => b.text() === '编辑维度')
    await editBtn[0].trigger('click')
    await wrapper.vm.$nextTick()
    const featuresCard = wrapper.findAll('.dim-card')[1]
    expect(featuresCard.text()).toContain('功能特性')
    expect(featuresCard.text()).toContain('3 / 14')
  })

  it('交互方式维度显示手势模式', async () => {
    mockStore['hf:space_configs'] = [createConfig()]
    const wrapper = await getWrapper()
    const editBtns = wrapper.findAll('.sc-config-btn')
    const editBtn = editBtns.filter(b => b.text() === '编辑维度')
    await editBtn[0].trigger('click')
    await wrapper.vm.$nextTick()
    const interactionCard = wrapper.findAll('.dim-card')[2]
    expect(interactionCard.text()).toContain('交互方式')
    expect(interactionCard.text()).toContain('核心')
  })

  it('视觉风格维度显示主题', async () => {
    mockStore['hf:space_configs'] = [createConfig()]
    const wrapper = await getWrapper()
    const editBtns = wrapper.findAll('.sc-config-btn')
    const editBtn = editBtns.filter(b => b.text() === '编辑维度')
    await editBtn[0].trigger('click')
    await wrapper.vm.$nextTick()
    const styleCard = wrapper.findAll('.dim-card')[3]
    expect(styleCard.text()).toContain('视觉风格')
    expect(styleCard.text()).toContain('暗色')
  })

  it('数据管理维度显示同步模式', async () => {
    mockStore['hf:space_configs'] = [createConfig()]
    const wrapper = await getWrapper()
    const editBtns = wrapper.findAll('.sc-config-btn')
    const editBtn = editBtns.filter(b => b.text() === '编辑维度')
    await editBtn[0].trigger('click')
    await wrapper.vm.$nextTick()
    const dataCard = wrapper.findAll('.dim-card')[4]
    expect(dataCard.text()).toContain('数据管理')
    expect(dataCard.text()).toContain('本地存储')
  })

  it('权限配置维度显示角色', async () => {
    mockStore['hf:space_configs'] = [createConfig()]
    const wrapper = await getWrapper()
    const editBtns = wrapper.findAll('.sc-config-btn')
    const editBtn = editBtns.filter(b => b.text() === '编辑维度')
    await editBtn[0].trigger('click')
    await wrapper.vm.$nextTick()
    const permCard = wrapper.findAll('.dim-card')[5]
    expect(permCard.text()).toContain('权限配置')
    expect(permCard.text()).toContain('owner')
  })

  it('场景预设维度显示场景数量', async () => {
    mockStore['hf:space_configs'] = [createConfig()]
    const wrapper = await getWrapper()
    const editBtns = wrapper.findAll('.sc-config-btn')
    const editBtn = editBtns.filter(b => b.text() === '编辑维度')
    await editBtn[0].trigger('click')
    await wrapper.vm.$nextTick()
    const sceneCard = wrapper.findAll('.dim-card')[6]
    expect(sceneCard.text()).toContain('场景预设')
    expect(sceneCard.text()).toContain('2 场景')
  })

  it('点击取消关闭维度编辑器', async () => {
    mockStore['hf:space_configs'] = [createConfig()]
    const wrapper = await getWrapper()
    const editBtns = wrapper.findAll('.sc-config-btn')
    const editBtn = editBtns.filter(b => b.text() === '编辑维度')
    await editBtn[0].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.sc-dim-editor').exists()).toBe(true)
    const cancelBtn = wrapper.find('.sc-dim-editor').findAll('.sc-config-btn').filter(b => b.text() === '取消')
    await cancelBtn[0].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.sc-dim-editor').exists()).toBe(false)
  })

  it('保存修改持久化维度数据', async () => {
    mockStore['hf:space_configs'] = [createConfig()]
    mockStore['hf:active_space_config'] = 'sc1'
    const wrapper = await getWrapper()
    const editBtns = wrapper.findAll('.sc-config-btn')
    const editBtn = editBtns.filter(b => b.text() === '编辑维度')
    await editBtn[0].trigger('click')
    await wrapper.vm.$nextTick()

    // 点击保存
    const saveBtn = wrapper.find('.sc-dim-editor').findAll('.sc-btn').filter(b => b.text() === '保存修改')
    await saveBtn[0].trigger('click')
    await wrapper.vm.$nextTick()

    // 验证 setKV 被调用
    const setCalls = mockSetKV.mock.calls.filter((c: any[]) => c[0] === 'hf:space_configs')
    expect(setCalls.length).toBeGreaterThan(0)
  })

  it('空维度配置时编辑器仍可打开', async () => {
    mockStore['hf:space_configs'] = [{
      id: 'sc2', name: '空配置', description: '', presetId: '', dimensions: [],
      createdAt: '2026-07-01T00:00:00Z', updatedAt: '2026-07-01T00:00:00Z',
    }]
    const wrapper = await getWrapper()
    const editBtns = wrapper.findAll('.sc-config-btn')
    const editBtn = editBtns.filter(b => b.text() === '编辑维度')
    await editBtn[0].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.sc-dim-editor').exists()).toBe(true)
    // 7 个维度卡片仍然存在
    expect(wrapper.findAll('.dim-card').length).toBe(7)
  })

  it('点击预设模板创建配置后可以编辑维度', async () => {
    const wrapper = await getWrapper()
    // 点击标准空间预设
    const presetCards = wrapper.findAll('.sc-preset-card')
    await presetCards[0].trigger('click')
    await wrapper.vm.$nextTick()

    // 应该创建了配置，现在可以编辑
    const editBtns = wrapper.findAll('.sc-config-btn')
    const editBtn = editBtns.filter(b => b.text() === '编辑维度')
    expect(editBtn.length).toBeGreaterThan(0)
  })
})

// ============================================================
// 集成：装修档案（INCR-272：薄委托化挂载 RenovationArchivePanel 至空间自定义）
// 引擎 useCustomizationBridge 部分有状态：
//  - activeConfig 经 getKV('hf:space_configs'/'hf:active_space_config') 每次读库 → seed mockStore 可驱动；
//  - recentActivity 经 usePreviewEngine history=getKV('hf:customization:history' JSON 字符串) 实例级读库 → seed 可驱动；
//  - 主题/布局为模块级单例（默认 theme_dusk/layout_grid_3x3 恒定 +15/+10），快照单例不复读 → 不 seed 快照驱动。
// 健康度按 createConfig(7 维全配 + standard 预设)=20+15+30+15+10=90。
// ============================================================
describe('集成：装修档案', () => {
  const HISTORY = 'hf:customization:history'

  beforeEach(() => {
    vi.clearAllMocks()
    mockStore['hf:space_configs'] = []
    mockStore['hf:active_space_config'] = null
    mockStore[HISTORY] = '[]'
    mockStore['hf:customization:snapshots'] = []
  })

  function rnp(wrapper: any) {
    const el = wrapper.find('.rnp-panel')
    expect(el.exists()).toBe(true)
    return el
  }

  it('空态：标题/「装修未启」徽标/空态引导文案', async () => {
    const wrapper = await getWrapper()
    const el = rnp(wrapper)
    expect(el.text()).toContain('🏛️ 装修档案')
    expect(el.text()).toContain('装修未启')
    expect(el.text()).toContain('还没有空间配置与装修活动。定制第一个空间、点亮主题与布局后，健康度、维度配置与最近活动便会在此显影。')
  })

  it('有活跃配置：渲染装修健康度分数与「装修完备」徽标', async () => {
    const config = createConfig()
    mockStore['hf:space_configs'] = [config]
    mockStore['hf:active_space_config'] = config.id
    const wrapper = await getWrapper()
    const el = rnp(wrapper)
    expect(el.text()).not.toContain('装修未启')
    expect(el.text()).toContain('装修健康度')
    expect(el.find('.rnp-health-score b').text()).toBe('90')
    expect(el.text()).toContain('装修完备')
  })

  it('渲染维度配置：全配时七个维度均为已配置点', async () => {
    const config = createConfig()
    mockStore['hf:space_configs'] = [config]
    mockStore['hf:active_space_config'] = config.id
    const wrapper = await getWrapper()
    const el = rnp(wrapper)
    expect(el.findAll('.rnp-dim').length).toBe(7)
    expect(el.text()).toContain('空间结构')
    expect(el.findAll('.rnp-dim-dot--on').length).toBe(7)
  })

  it('部分维度配置时仅显示已配置点亮且健康度「装修推进中」', async () => {
    mockStore['hf:space_configs'] = [{
      id: 'scP', name: '部分配置', description: '', presetId: '',
      dimensions: [
        { dimension: 'structure', label: '空间结构', icon: 'Layout', options: { layout: 'grid' } },
      ],
      createdAt: '2026-07-01T00:00:00Z', updatedAt: '2026-07-01T00:00:00Z',
    }]
    mockStore['hf:active_space_config'] = 'scP'
    const wrapper = await getWrapper()
    const el = rnp(wrapper)
    expect(el.findAll('.rnp-dim').length).toBe(7)
    expect(el.findAll('.rnp-dim-dot--on').length).toBe(1)
    expect(el.text()).toContain('装修推进中')
  })

  it('渲染最近装修活动（更新/创建）', async () => {
    mockStore[HISTORY] = JSON.stringify([
      { id: 'h1', type: 'update', description: '调整了空间结构', changes: [], timestamp: '2026-08-01T10:00:00.000Z' },
      { id: 'h2', type: 'create', description: '创建了首个配置', changes: [], timestamp: '2026-08-02T10:00:00.000Z' },
    ])
    const wrapper = await getWrapper()
    const el = rnp(wrapper)
    expect(el.text()).toContain('最近装修活动')
    const acts = el.findAll('.rnp-activity')
    expect(acts.length).toBe(2)
    expect(el.text()).toContain('更新')
    expect(el.text()).toContain('创建')
    expect(el.text()).toContain('调整了空间结构')
    expect(el.text()).toContain('创建了首个配置')
  })
})