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