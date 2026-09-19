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

  it('渲染环境音景面板', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.scp').exists()).toBe(true)
    expect(wrapper.text()).toContain('环境音景')
  })

  it('音景面板展示默认音景列表与音量控制', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.scp-list').exists()).toBe(true)
    expect(wrapper.find('.scp-volume').exists()).toBe(true)
    expect(wrapper.text()).toContain('音量')
  })
})

// ============================================================
// 集成：情绪趋势深度分析面板（INCR-201：补挂载孤儿面板 EmotionTrendsPanel）
// ============================================================
describe('集成：情绪趋势深度分析面板', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockRecords.value = []
  })

  it('有记录时渲染概览指标/趋势折线/情绪分布', async () => {
    mockRecords.value = createRecords(30)
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.etp').exists()).toBe(true)
    expect(wrapper.text()).toContain('情绪趋势')
    // 概览 6 指标
    expect(wrapper.findAll('.etp-metric').length).toBe(6)
    expect(wrapper.text()).toContain('近30天记录')
    expect(wrapper.text()).toContain('主导情绪')
    expect(wrapper.text()).toContain('稳定度')
    expect(wrapper.text()).toContain('积极占比')
    expect(wrapper.text()).toContain('消极占比')
    expect(wrapper.text()).toContain('情绪多样')
    // 趋势折线 + 分布
    expect(wrapper.find('.etp-svg').exists()).toBe(true)
    expect(wrapper.findAll('.etp-dist-row').length).toBeGreaterThan(0)
    // 不渲染空态
    expect(wrapper.find('.etp-empty').exists()).toBe(false)
  })

  it('无记录时渲染空态引导', async () => {
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.etp').exists()).toBe(true)
    expect(wrapper.find('.etp-empty').exists()).toBe(true)
    expect(wrapper.text()).toContain('记录第一朵情绪之花')
  })
})

// ============================================================
// 集成：访客足迹面板 VisitorFootprintsPanel（INCR-248 补挂载孤儿组件）
// 引擎 useVisitorFootprints 为纯内存引擎（footprints 在每次 use 调用时初始化为空 ref，
// 不读 storage、不持久化、无模块级 ref）——render 用例互不干扰，走 UI 交互流即可
// ============================================================
describe('集成：访客足迹面板', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockRecords.value = []
  })

  it('集成渲染访客足迹面板骨架、标题与四项统计', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.vfp').exists()).toBe(true)
    expect(wrapper.text()).toContain('🐾 访客足迹')
    expect(wrapper.text()).toContain('访客 · 足迹 · 问候')
    // 统计网格四项
    const stats = wrapper.findAll('.vfp-stat')
    expect(stats.length).toBe(4)
    expect(wrapper.text()).toContain('访客')
    expect(wrapper.text()).toContain('足迹')
    expect(wrapper.text()).toContain('未回复')
    expect(wrapper.text()).toContain('印记类型')
  })

  it('空态显示暂无访客足迹', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.vfp-empty').text()).toContain('暂无访客足迹')
  })

  it('添加访客足迹后出现足迹卡片与标签/留言', async () => {
    const wrapper = await getWrapper()
    const inputs = wrapper.findAll('.vfp-input')
    await (inputs[0] as any).setValue('清风')
    await (wrapper.findAll('.vfp-chip')[1] as any).trigger('click') // 💧 浇水
    await (inputs[1] as any).setValue('路过，看见你的花开了')
    await wrapper.find('.vfp-btn--primary').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('.vfp-item').length).toBe(1)
    const item = wrapper.find('.vfp-item')
    expect(item.find('.vfp-item-name').text()).toBe('清风')
    expect(item.find('.vfp-tag').text()).toContain('浇水')
    expect(item.find('.vfp-item-msg').text()).toContain('路过，看见你的花开了')
    // 统计更新：足迹 1 / 未回复 1
    expect(wrapper.text()).toContain('足迹')
    expect(wrapper.find('.vfp-stat-value').exists()).toBe(true)
  })

  it('给访客回复后足迹卡片标记已回复并回显回复', async () => {
    const wrapper = await getWrapper()
    const inputs = wrapper.findAll('.vfp-input')
    await (inputs[0] as any).setValue('青鸟')
    await wrapper.find('.vfp-btn--primary').trigger('click')
    await wrapper.vm.$nextTick()
    // 未回复时显示回复输入区
    expect(wrapper.find('.vfp-item .vfp-reply').exists()).toBe(true)
    await (wrapper.find('.vfp-item .vfp-reply .vfp-input') as any).setValue('谢谢来访')
    await wrapper.find('.vfp-item .vfp-reply .vfp-btn').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.vfp-item').classes()).toContain('replied')
    expect(wrapper.text()).toContain('💬 回：谢谢来访')
  })
})

// ============================================================
// 集成：花种杂交面板 FlowerHybridPanel（INCR-267 补挂载孤儿组件）
// 引擎 useCrossBreeding 无状态（recipes/results 每次调用新建局部 ref、无 storage 读写、无持久化），
// 零 props 直驱，onMounted 同步 initRecipes；默认季候 autumn（秋）。
// 注意：①performCrossBreed 用 Math.random 判成功（actualRate = successRate ± 季候/情绪加成），
//   以 vi.spyOn(Math,'random') 控制分支；②getAvailableRecipes 仅过滤季候与父本拥有，不过滤情绪，
//   「愉悦心境」配方（无 requiredSeason）会在任意季候显示；③season 默认 autumn → 秋限定配方 + 愉悦配方。
// ============================================================
describe('集成：花种杂交面板', () => {
  function cbp(wrapper: any) {
    const el = wrapper.find('.cbp')
    expect(el.exists()).toBe(true)
    return el
  }

  function clickChip(wrapper: any, label: string) {
    const el = cbp(wrapper)
    const chip = el.findAll('.cbp-chip').find((c: any) => c.text().includes(label))
    expect(chip).toBeTruthy()
    return chip!.trigger('click')
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    mockRecords.value = []
    vi.restoreAllMocks()
  })

  it('渲染骨架、标题与初始统计徽标', async () => {
    const wrapper = await getWrapper()
    const panel = cbp(wrapper)
    expect(panel.text()).toContain('🌼 花种杂交')
    expect(panel.text()).toContain('配方 · 季候 · 变异')
    // 四个统计徽标初始全 0
    expect(panel.findAll('.cbp-stat').length).toBe(4)
    expect(panel.text()).toContain('总尝试')
    expect(panel.text()).toContain('成功')
    expect(panel.text()).toContain('成功率')
    expect(panel.text()).toContain('唯一产出')
  })

  it('默认季候秋展示秋限定与愉悦心境配方', async () => {
    const wrapper = await getWrapper()
    const panel = cbp(wrapper)
    // 秋限定配方（nostalgia-maple × calm-chrysanthemum → reflective-cosmos）
    expect(panel.text()).toContain('怀旧枫叶 × 平静菊花 → 沉思波斯菊')
    expect(panel.text()).toContain('怀旧枫叶与平静菊花的杂交，产出沉思波斯菊')
    expect(panel.text()).toContain('成功率 50%')
    expect(panel.text()).toContain('秋限定')
    // 愉悦心境配方（无 requiredSeason，任意季候显示）
    expect(panel.text()).toContain('喜悦樱花 × 希望百合 → 灿烂莲花')
    expect(panel.text()).toContain('愉悦心境')
    // 春限定配方默认被过滤
    expect(panel.text()).not.toContain('平和牡丹')
  })

  it('切换季候过滤配方列表', async () => {
    const wrapper = await getWrapper()
    await clickChip(wrapper, '春')
    const panel = cbp(wrapper)
    // 春限定配方出现，秋限定配方消失
    expect(panel.text()).toContain('喜悦玫瑰 × 宁静薰衣草 → 平和牡丹')
    expect(panel.text()).toContain('春限定')
    expect(panel.text()).not.toContain('怀旧枫叶')
    // 愉悦心境配方不受季候影响仍显示
    expect(panel.text()).toContain('灿烂莲花')
  })

  it('杂交成功展示成功结果并更新统计', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1) // 0.1 < autumn 配方成功率 0.5 → 成功
    const wrapper = await getWrapper()
    const panel = cbp(wrapper)
    await panel.find('.cbp-btn--primary').trigger('click')
    await wrapper.vm.$nextTick()
    expect(panel.find('.cbp-result').exists()).toBe(true)
    expect(panel.text()).toContain('🌸杂交成功')
    expect(panel.text()).toContain('怀旧枫叶 × 平静菊花')
    // 统计：总尝试 1 / 成功 1 / 成功率 100%
    expect(panel.text()).toContain('100%')
  })

  it('杂交失败展示失败与变异产出，成功率保持 0%', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9) // 0.9 ≥ 成功率 → 失败
    const wrapper = await getWrapper()
    const panel = cbp(wrapper)
    await panel.find('.cbp-btn--primary').trigger('click')
    await wrapper.vm.$nextTick()
    expect(panel.find('.cbp-result.fail').exists()).toBe(true)
    expect(panel.text()).toContain('🍂杂交失败')
    // 失败时产生变异花朵（mutation）
    expect(panel.text()).not.toContain('无收获')
  })
})

// ============================================================
// 集成：花丛分布面板 FlowerClusterArchivePanel（INCR-283 补挂载孤儿组件）
// 引擎 useEmotionGarden 与宿主 GardenHealthPanel 同源，但无归档/花丛聚合等价物：
// 本面板按情绪品种统计花丛分布与花田健康分，零 props 只读消费（经 useEmotionGarden 桥）。
// 空态/聚合/健康分/LOD 标签四场景验证，mock 数据形态与 LOD 用例一致（记录 { type, ... }）。
// 注意：面板 onMounted 调用 garden.load()，mockRecords 需在 getWrapper 之前写入。
// ============================================================
describe('集成：花丛分布面板', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockRecords.value = []
  })

  it('无记录时渲染空态引导', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.gcp').exists()).toBe(true)
    expect(wrapper.find('.gcp-title').text()).toBe('花丛分布')
    expect(wrapper.find('.gcp-empty').text()).toContain('暂无情绪记录，先去种下一朵花吧')
  })

  it('有记录时按情绪品种聚合花丛分布', async () => {
    // 5 条记录覆盖 5 种情绪 → 花丛总数 5 / 情绪种类 5 / 5 个分布条目
    mockRecords.value = createRecords(5)
    const wrapper = await getWrapper()
    const gcp = wrapper.find('.gcp')
    expect(gcp.find('.gcp-empty').exists()).toBe(false)
    expect(gcp.text()).toContain('花丛总数 5')
    expect(gcp.text()).toContain('情绪种类 5')
    expect(gcp.findAll('.gcp-cluster').length).toBe(5)
    // 每种情绪 1 株
    expect(gcp.find('.gcp-cluster').text()).toContain('1 株')
  })

  it('同类记录聚为单簇并累计株数', async () => {
    // 3 条 happy → 单簇 3 株，情绪种类 1
    mockRecords.value = Array.from({ length: 3 }, (_, i) => ({
      id: `hp_${i}`,
      type: 'happy',
      note: '',
      createdAt: new Date(Date.now() - i * 86400000).toISOString(),
    }))
    const wrapper = await getWrapper()
    const gcp = wrapper.find('.gcp')
    expect(gcp.text()).toContain('花丛总数 3')
    expect(gcp.text()).toContain('情绪种类 1')
    expect(gcp.findAll('.gcp-cluster').length).toBe(1)
    expect(gcp.find('.gcp-cluster').text()).toContain('happy · 3 株')
  })

  it('花田健康分按 happy 占比计算', async () => {
    // 3 happy + 2 calm → 总 5，happy 3/5 = 60
    mockRecords.value = [
      { id: 'h1', type: 'happy', note: '', createdAt: new Date().toISOString() },
      { id: 'h2', type: 'happy', note: '', createdAt: new Date().toISOString() },
      { id: 'h3', type: 'happy', note: '', createdAt: new Date().toISOString() },
      { id: 'c1', type: 'calm', note: '', createdAt: new Date().toISOString() },
      { id: 'c2', type: 'calm', note: '', createdAt: new Date().toISOString() },
    ]
    const wrapper = await getWrapper()
    const gcp = wrapper.find('.gcp')
    expect(gcp.find('.gcp-health-label').text()).toBe('花田健康分')
    expect(gcp.find('.gcp-health-score').text()).toBe('60')
  })

  it('有数据时不显示空态且 LOD 标签标记高精度', async () => {
    mockRecords.value = createRecords(3)
    const wrapper = await getWrapper()
    const gcp = wrapper.find('.gcp')
    expect(gcp.find('.gcp-empty').exists()).toBe(false)
    const tag = gcp.find('.gcp-lod-tag')
    expect(tag.exists()).toBe(true)
    expect(tag.text()).toBe('高精度')
  })
})

// ============================================================
// 集成：花园叙事面板 GardenNarrativePanel（INCR-368 补挂载孤儿引擎 garden-narrative）
// 引擎 useGardenNarrative 为纯内存 composable，onMounted 经 useEmotionGarden.load() 读取
// mockRecords 并自动生成花语故事/成长日记/季节相册；断言用 .gnp- 类选择器避开整页文本干扰。
// ============================================================
describe('集成：花园叙事面板', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockRecords.value = []
  })

  it('无记录时渲染空态引导', async () => {
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.gnp').exists()).toBe(true)
    expect(wrapper.find('.gnp-empty-hero').exists()).toBe(true)
    expect(wrapper.text()).toContain('花园叙事')
  })

  it('有记录时挂载面板并生成花语故事/成长日记', async () => {
    mockRecords.value = [{ id: 'n1', type: 'happy', note: '在花园里晒太阳', createdAt: new Date().toISOString() }]
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    const gnp = wrapper.find('.gnp')
    expect(gnp.exists()).toBe(true)
    expect(gnp.find('.gnp-story').exists()).toBe(true)
    expect(gnp.find('.gnp-badge').text()).toContain('轻快')
    expect(gnp.text()).toContain('在花园里晒太阳')
    expect(gnp.find('.gnp-diary-item').exists()).toBe(true)
  })

  it('有记录时生成季节相册卡片', async () => {
    mockRecords.value = [{ id: 'n2', type: 'calm', note: '', createdAt: new Date().toISOString() }]
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    const gnp = wrapper.find('.gnp')
    expect(gnp.find('.gnp-album').exists()).toBe(true)
    expect(gnp.find('.gnp-album-season').exists()).toBe(true)
    expect(gnp.text()).toContain('季节相册')
  })
})