// ============================================================
// EmotionGarden 视图测试
// 情绪花房 LOD 降级系统 + 温室环境控制
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const { mockRecords, mockRouter } = vi.hoisted(() => {
  const mockRecords = { value: [] as any[] }
  const mockRouter = { push: vi.fn() }
  return { mockRecords, mockRouter }
})

vi.mock('../../engine/storage', () => ({
  storage: {
    getEmotions: () => mockRecords.value,
    setEmotions: vi.fn(),
    getSessions: () => [],
    getAnchors: () => [],
    getNotes: () => [],
    getPluginRegistry: () => ({}),
    getConstitution: () => null,
    getCrystals: () => [],
    getCarriers: () => [],
    getAdvisors: () => [],
    setAdvisors: vi.fn(),
    getAdvisorMessages: () => [],
    setAdvisorMessages: vi.fn(),
    getConfig: () => ({
      advisor: {
        affinityIncrements: {},
        messageStorageLimit: 100,
        dingyinThresholds: {},
        witnessLogMax: 100,
        witnessLogDefaultLimit: 10,
        affinityMax: 100,
        bubbleDuration: 5000,
        advisorResetDate: '',
      },
    }),
    setConfig: vi.fn(),
    getKV: () => ({}),
    setKV: vi.fn(),
  },
}))

vi.mock('vue-router', () => ({
  useRouter: () => mockRouter,
  useRoute: () => ({ path: '/emotion-garden' }),
  RouterLink: { template: '<a><slot/></a>' },
}))

function createRecords(count: number): any[] {
  const types = ['happy', 'calm', 'sad', 'anxious', 'angry']
  return Array.from({ length: count }, (_, i) => ({
    id: `emotion_test_${i}`,
    type: types[i % types.length],
    note: '',
    createdAt: new Date(Date.now() - i * 86400000).toISOString(),
  }))
}

async function getWrapper() {
  const { default: EmotionGarden } = await import('../EmotionGarden.vue')
  return mount(EmotionGarden, {
    global: {
      plugins: [createPinia()],
    },
  })
}

describe('EmotionGarden LOD 降级系统', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockRecords.value = []
  })

  it('LOD 指示器始终显示', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.lod-indicator').exists()).toBe(true)
  })

  it('LOD full: 0-50 朵花显示完整级别', async () => {
    mockRecords.value = createRecords(30)
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.lod-badge-full').exists()).toBe(true)
    expect(wrapper.text()).toContain('完整')
    expect(wrapper.text()).toContain('花瓣级渲染')
  })

  it('LOD simplified: 51-100 朵花显示简化级别', async () => {
    mockRecords.value = createRecords(75)
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.lod-badge-simplified').exists()).toBe(true)
    expect(wrapper.text()).toContain('简化')
    expect(wrapper.text()).toContain('圆形替代')
  })

  it('LOD dot: 101-200 朵花显示光点级别', async () => {
    mockRecords.value = createRecords(150)
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.lod-badge-dot').exists()).toBe(true)
    expect(wrapper.text()).toContain('光点')
    expect(wrapper.text()).toContain('点状显示')
  })

  it('LOD blur: 200+ 朵花显示模糊级别', async () => {
    mockRecords.value = createRecords(250)
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.lod-badge-blur').exists()).toBe(true)
    expect(wrapper.text()).toContain('模糊')
    expect(wrapper.text()).toContain('模糊块')
  })

  it('LOD 边界值: 50 朵为 full', async () => {
    mockRecords.value = createRecords(50)
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.lod-badge-full').exists()).toBe(true)
  })

  it('LOD 边界值: 51 朵为 simplified', async () => {
    mockRecords.value = createRecords(51)
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.lod-badge-simplified').exists()).toBe(true)
  })

  it('LOD 边界值: 100 朵为 simplified', async () => {
    mockRecords.value = createRecords(100)
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.lod-badge-simplified').exists()).toBe(true)
  })

  it('LOD 边界值: 101 朵为 dot', async () => {
    mockRecords.value = createRecords(101)
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.lod-badge-dot').exists()).toBe(true)
  })

  it('LOD 边界值: 200 朵为 dot', async () => {
    mockRecords.value = createRecords(200)
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.lod-badge-dot').exists()).toBe(true)
  })

  it('LOD 边界值: 201 朵为 blur', async () => {
    mockRecords.value = createRecords(201)
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.lod-badge-blur').exists()).toBe(true)
  })

  it('flower-grid 应用正确的 LOD class', async () => {
    mockRecords.value = createRecords(30)
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    const flowerGrid = wrapper.find('.flower-grid')
    expect(flowerGrid.exists()).toBe(true)
    expect(flowerGrid.classes()).toContain('lod-full')
  })

  it('flower-item 应用正确的 LOD class', async () => {
    mockRecords.value = createRecords(30)
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    const flowerItem = wrapper.find('.flower-item')
    expect(flowerItem.classes()).toContain('lod-full')
  })
})

describe('EmotionGarden 温室环境控制', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockRecords.value = []
  })

  it('环境控制区域渲染三个参数', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.env-controls').exists()).toBe(true)
    const envItems = wrapper.findAll('.env-item')
    expect(envItems.length).toBe(3)
  })

  it('环境参数默认值正确', async () => {
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    const envValues = wrapper.findAll('.env-value')
    expect(envValues[0].text()).toBe('22°C')
    expect(envValues[1].text()).toBe('60%')
    expect(envValues[2].text()).toBe('70%')
  })

  it('温度加减按钮调整正确', async () => {
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    // 温度 +1
    const envItems = wrapper.findAll('.env-item')
    const tempBtns = envItems[0].findAll('.env-btn')
    await tempBtns[1].trigger('click')
    const envValues = wrapper.findAll('.env-value')
    expect(envValues[0].text()).toBe('23°C')
    // 温度 -1 回到 22
    await tempBtns[0].trigger('click')
    expect(envValues[0].text()).toBe('22°C')
  })

  it('湿度加减按钮调整正确', async () => {
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    const envItems = wrapper.findAll('.env-item')
    const humidityBtns = envItems[1].findAll('.env-btn')
    // 湿度 +5
    await humidityBtns[1].trigger('click')
    const envValues = wrapper.findAll('.env-value')
    expect(envValues[1].text()).toBe('65%')
    // 湿度 -5 回到 60
    await humidityBtns[0].trigger('click')
    expect(envValues[1].text()).toBe('60%')
  })

  it('光照加减按钮调整正确', async () => {
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    const envItems = wrapper.findAll('.env-item')
    const lightBtns = envItems[2].findAll('.env-btn')
    // 光照 +10
    await lightBtns[1].trigger('click')
    const envValues = wrapper.findAll('.env-value')
    expect(envValues[2].text()).toBe('80%')
    // 光照 -10 回到 70
    await lightBtns[0].trigger('click')
    expect(envValues[2].text()).toBe('70%')
  })

  it('温度参数在 18°C 下限被限制', async () => {
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    const envItems = wrapper.findAll('.env-item')
    const tempBtns = envItems[0].findAll('.env-btn')
    const envValues = wrapper.findAll('.env-value')
    // 从 22°C 降到 18°C
    for (let i = 0; i < 4; i++) {
      await tempBtns[0].trigger('click')
    }
    expect(envValues[0].text()).toBe('18°C')
    // 再降一次，仍为 18°C
    await tempBtns[0].trigger('click')
    expect(envValues[0].text()).toBe('18°C')
  })

  it('温度参数在 30°C 上限被限制', async () => {
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    const envItems = wrapper.findAll('.env-item')
    const tempBtns = envItems[0].findAll('.env-btn')
    const envValues = wrapper.findAll('.env-value')
    // 从 22°C 升到 30°C
    for (let i = 0; i < 8; i++) {
      await tempBtns[1].trigger('click')
    }
    expect(envValues[0].text()).toBe('30°C')
    // 再升一次，仍为 30°C
    await tempBtns[1].trigger('click')
    expect(envValues[0].text()).toBe('30°C')
  })

  it('湿度参数在 30% 下限被限制', async () => {
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    const envItems = wrapper.findAll('.env-item')
    const humidityBtns = envItems[1].findAll('.env-btn')
    const envValues = wrapper.findAll('.env-value')
    // 从 60% 降到 30%
    for (let i = 0; i < 6; i++) {
      await humidityBtns[0].trigger('click')
    }
    expect(envValues[1].text()).toBe('30%')
    // 再降一次，仍为 30%
    await humidityBtns[0].trigger('click')
    expect(envValues[1].text()).toBe('30%')
  })

  it('湿度参数在 90% 上限被限制', async () => {
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    const envItems = wrapper.findAll('.env-item')
    const humidityBtns = envItems[1].findAll('.env-btn')
    const envValues = wrapper.findAll('.env-value')
    // 从 60% 升到 90%
    for (let i = 0; i < 6; i++) {
      await humidityBtns[1].trigger('click')
    }
    expect(envValues[1].text()).toBe('90%')
    // 再升一次，仍为 90%
    await humidityBtns[1].trigger('click')
    expect(envValues[1].text()).toBe('90%')
  })

  it('光照参数在 0% 下限被限制', async () => {
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    const envItems = wrapper.findAll('.env-item')
    const lightBtns = envItems[2].findAll('.env-btn')
    const envValues = wrapper.findAll('.env-value')
    // 从 70% 降到 0%
    for (let i = 0; i < 7; i++) {
      await lightBtns[0].trigger('click')
    }
    expect(envValues[2].text()).toBe('0%')
    // 再降一次，仍为 0%
    await lightBtns[0].trigger('click')
    expect(envValues[2].text()).toBe('0%')
  })

  it('光照参数在 100% 上限被限制', async () => {
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    const envItems = wrapper.findAll('.env-item')
    const lightBtns = envItems[2].findAll('.env-btn')
    const envValues = wrapper.findAll('.env-value')
    // 从 70% 升到 100%
    for (let i = 0; i < 3; i++) {
      await lightBtns[1].trigger('click')
    }
    expect(envValues[2].text()).toBe('100%')
    // 再升一次，仍为 100%
    await lightBtns[1].trigger('click')
    expect(envValues[2].text()).toBe('100%')
  })
})

// ============================================================
// 花房空间布局
// ============================================================
describe('EmotionGarden 花房空间布局', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockRecords.value = []
  })

  it('有数据时显示视图切换按钮，默认选中花海', async () => {
    mockRecords.value = createRecords(3)
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    const toggleBtns = wrapper.findAll('.toggle-btn')
    expect(toggleBtns.length).toBe(2)
    expect(toggleBtns[0].classes()).toContain('active')
  })

  it('点击切换按钮切换到花房布局视图', async () => {
    mockRecords.value = createRecords(3)
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    const layoutBtn = wrapper.findAll('.toggle-btn')[1]
    await layoutBtn.trigger('click')
    await wrapper.vm.$nextTick()
    expect(layoutBtn.classes()).toContain('active')
    const plan = wrapper.find('.greenhouse-plan')
    expect(plan.exists()).toBe(true)
  })

  it('花房布局显示三个区域', async () => {
    mockRecords.value = createRecords(3)
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    const layoutBtn = wrapper.findAll('.toggle-btn')[1]
    await layoutBtn.trigger('click')
    await wrapper.vm.$nextTick()
    const zones = wrapper.findAll('.gh-zone')
    expect(zones.length).toBe(3)
    expect(zones[0].text()).toContain('阳光区')
    expect(zones[1].text()).toContain('草甸区')
    expect(zones[2].text()).toContain('阴凉区')
  })

  it('有情绪记录时布局视图显示花朵点', async () => {
    mockRecords.value = createRecords(3)
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    const layoutBtn = wrapper.findAll('.toggle-btn')[1]
    await layoutBtn.trigger('click')
    await wrapper.vm.$nextTick()
    const dots = wrapper.findAll('.zf-dot')
    expect(dots.length).toBeGreaterThan(0)
  })

  it('花朵点可点击删除', async () => {
    mockRecords.value = createRecords(3)
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    const layoutBtn = wrapper.findAll('.toggle-btn')[1]
    await layoutBtn.trigger('click')
    await wrapper.vm.$nextTick()
    const dots = wrapper.findAll('.zf-dot')
    expect(dots.length).toBe(3)
    await dots[0].trigger('click')
    await wrapper.vm.$nextTick()
    const remainingDots = wrapper.findAll('.zf-dot')
    expect(remainingDots.length).toBe(2)
  })

  it('无情绪记录时不显示切换按钮', async () => {
    const wrapper = await getWrapper()
    const toggle = wrapper.find('.view-toggle')
    expect(toggle.exists()).toBe(false)
  })
})

describe('EmotionGarden 安全岛光路（蓝图心理安全机制）', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockRecords.value = []
    mockRouter.push.mockClear()
  })

  it('持续低落（dim）时显示安全岛光路提示', async () => {
    // 最近 6 条内 ≥2 条 anxious → getAmbientMood 返回 'dim'
    mockRecords.value = Array.from({ length: 4 }, (_, i) => ({
      id: `ax_${i}`,
      type: 'anxious',
      note: '',
      createdAt: new Date(Date.now() - i * 86400000).toISOString(),
    }))
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.safety-path').exists()).toBe(true)
    expect(wrapper.text()).toContain('去安全岛走走')
  })

  it('点击安全岛按钮导航到 /sanctuary（不弹窗、不报警）', async () => {
    mockRecords.value = Array.from({ length: 4 }, (_, i) => ({
      id: `ax_${i}`,
      type: 'anxious',
      note: '',
      createdAt: new Date(Date.now() - i * 86400000).toISOString(),
    }))
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    await wrapper.find('.sp-btn').trigger('click')
    expect(mockRouter.push).toHaveBeenCalledWith('/sanctuary')
  })

  it('非低落状态不显示安全岛光路', async () => {
    mockRecords.value = Array.from({ length: 4 }, (_, i) => ({
      id: `cx_${i}`,
      type: 'happy',
      note: '',
      createdAt: new Date(Date.now() - i * 86400000).toISOString(),
    }))
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.safety-path').exists()).toBe(false)
  })
})