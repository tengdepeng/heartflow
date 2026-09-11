// ============================================================
// AdvisorHub 视图测试（统一到真实 advisor 档案层后）
// ============================================================
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'

// ---- 模拟路由 ----
const mockPush = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useRoute: () => ({ path: '/advisor-hub' }),
}))

// ---- 模拟 storage（迁移读取旧 hf:advisors 用） ----
const mockStore: Record<string, any> = {}
const mockGetKV = vi.fn((_key: string, def: any) => mockStore[_key] ?? def)
const mockSetKV = vi.fn((key: string, val: any) => { mockStore[key] = val })
const mockGetAdvisors = vi.fn(() => [])

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (...args: any[]) => (mockGetKV as any)(...args),
    setKV: (...args: any[]) => (mockSetKV as any)(...args),
    getAdvisors: () => mockGetAdvisors(),
  },
}))

// 模拟 AFFINITY_TIERS（保留其余真实导出，否则 CARRIER_STAGE_ORDER / carrierGlyph 等会变 undefined）
vi.mock('../../types', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../types')>()
  return {
    ...actual,
    AFFINITY_TIERS: [
      { threshold: 0, title: '陌路', minInteractions: 0 },
      { threshold: 20, title: '相识', minInteractions: 5 },
      { threshold: 40, title: '熟稔', minInteractions: 20 },
      { threshold: 60, title: '信赖', minInteractions: 50 },
      { threshold: 80, title: '知己', minInteractions: 100 },
      { threshold: 95, title: '羁绊', minInteractions: 200 },
    ],
  }
})

// ---- 模拟 advisor store（真实档案层；Pinia 自动解包 ref，返回普通值） ----
const mockAdvisors: any[] = []
const mockAddAdvisorProfile = vi.fn((...args: any[]) => {
  const p = args[0]
  if (mockAdvisors.some(a => a.id === p.id)) return false
  mockAdvisors.push(p)
  return true
})
const mockUpdateAdvisorProfile = vi.fn((...args: any[]) => {
  const id = args[0]
  const u = args[1]
  const a = mockAdvisors.find(x => x.id === id)
  if (!a) return false
  Object.assign(a, u)
  return true
})
const mockRemoveAdvisorProfile = vi.fn((...args: any[]) => {
  const id = args[0]
  const i = mockAdvisors.findIndex(x => x.id === id)
  if (i < 0) return false
  mockAdvisors.splice(i, 1)
  return true
})
const mockGetAffinityTier = vi.fn((..._args: any[]) => ({ title: '陌路', threshold: 0, affinity: 0, interactions: 0, index: 0 }))

vi.mock('../../stores/advisor', () => ({
  useAdvisorStore: () => ({
    get advisors() { return mockAdvisors },
    addAdvisorProfile: (...a: any[]) => mockAddAdvisorProfile(...a),
    updateAdvisorProfile: (...a: any[]) => mockUpdateAdvisorProfile(...a),
    removeAdvisorProfile: (...a: any[]) => mockRemoveAdvisorProfile(...a),
    getAffinityTier: (...a: any[]) => mockGetAffinityTier(...a),
    getTaskAwareness: () => ({
      focusCount: 2, noteCount: 1, emotionCount: 0, anchorCount: 3,
    }),
    getTaskProgress: () => ({
      focus: { label: '专注', current: 1, total: 5 },
      notes: { label: '笔记', current: 2, total: 3 },
      emotions: { label: '情绪', current: 0, total: 2 },
      anchors: { label: '锚点', current: 3, total: 5 },
    }),
    dispatchAvatar: () => null,
    commandTasks: [],
    issueCommand: vi.fn(),
  }),
}))

// ---- 模拟 pinia ----
vi.mock('pinia', () => ({
  storeToRefs: (store: any) => {
    const result: Record<string, any> = {}
    for (const key of Object.keys(store)) {
      if (key.startsWith('$')) continue
      result[key] = store[key]
    }
    return result
  },
  defineStore: () => () => ({}),
  setActivePinia: () => {},
  createPinia: () => ({}),
}))

// ---- 辅助函数 ----
interface ProfileType {
  id: string
  name: string
  role: string
  personality: string
  state: string
  derivedFrom?: string
  customColorScheme?: { primary: string }
}

function sampleProfile(overrides: Partial<ProfileType> = {}): ProfileType {
  return {
    id: 'adv_1',
    name: '墨染',
    role: 'guardian',
    personality: 'steady',
    state: 'awake',
    customColorScheme: { primary: '#7c5cfc' },
    ...overrides,
  }
}

let activeWrapper: any = null

async function getWrapper() {
  const { default: AdvisorHub } = await import('../AdvisorHub.vue')
  activeWrapper = mount(AdvisorHub, {
    global: {
      mocks: {
        $router: { push: mockPush },
      },
    },
  })
  return activeWrapper
}

describe('AdvisorHub 视图（真实档案层）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAdvisors.length = 0
    mockStore['hf:advisors'] = []
  })

  afterEach(() => {
    // 卸载当前组件以清除其 Teleport 到 body 的弹窗，避免跨测试残留空弹窗
    // 干扰 document.querySelector('.ah-form-input') 取到错误的（陈旧）输入框
    if (activeWrapper) {
      activeWrapper.unmount()
      activeWrapper = null
    }
    document.querySelectorAll('.ah-dialog-overlay').forEach(el => el.remove())
  })

  // ---- 渲染 ----
  it('渲染标题"幕僚阁"', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('幕僚阁')
  })

  it('显示幕僚总数为 0', async () => {
    const wrapper = await getWrapper()
    const value = wrapper.find('.ah-overview-value')
    expect(value.text()).toBe('0')
  })

  it('渲染"创建幕僚"按钮', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('创建幕僚')
  })

  it('渲染"好感"按钮', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('好感')
  })

  it('空状态显示"幕僚大厅等待第一位居民"', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('幕僚大厅等待第一位居民')
  })

  // ---- 幕僚列表（读取真实 advisor.advisors） ----
  it('渲染幕僚卡片', async () => {
    mockAdvisors.push(sampleProfile({ id: 'a1', name: '墨染' }))
    mockAdvisors.push(sampleProfile({ id: 'a2', name: '青鸟' }))
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('墨染')
    expect(wrapper.text()).toContain('青鸟')
  })

  it('显示幕僚角色标签（枚举→中文）', async () => {
    mockAdvisors.push(sampleProfile({ role: 'guardian' }))
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('陪伴型')
  })

  it('显示幕僚性格标签（枚举→中文）', async () => {
    mockAdvisors.push(sampleProfile({ personality: 'steady' }))
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('沉稳')
  })

  it('显示好感度等级（统一后不再恒为 --）', async () => {
    mockAdvisors.push(sampleProfile())
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('陌路')
  })

  // ---- 创建幕僚（走 addAdvisorProfile） ----
  it('点击"创建幕僚"打开弹窗', async () => {
    const wrapper = await getWrapper()
    const createBtn = wrapper.find('.ah-btn-new')
    await createBtn.trigger('click')
    expect(wrapper.text()).toContain('创建幕僚')
  })

  it('创建幕僚时保存按钮默认禁用（名称为空）', async () => {
    const wrapper = await getWrapper()
    const createBtn = wrapper.find('.ah-btn-new')
    await createBtn.trigger('click')
    await vi.dynamicImportSettled?.()
    const saveBtn = document.querySelector('.ah-dialog-card .ah-btn-save') as HTMLElement
    expect(saveBtn).not.toBeNull()
    expect((saveBtn as HTMLButtonElement).disabled).toBe(true)
  })

  it('填写名称后保存按钮可用', async () => {
    const wrapper = await getWrapper()
    const createBtn = wrapper.find('.ah-btn-new')
    await createBtn.trigger('click')
    await vi.dynamicImportSettled?.()
    const nameInput = document.querySelector('.ah-form-input') as HTMLInputElement
    expect(nameInput).not.toBeNull()
    nameInput.value = '墨染'
    nameInput.dispatchEvent(new Event('input', { bubbles: true }))
    await new Promise(r => setTimeout(r, 50))
    const saveBtn = document.querySelector('.ah-dialog-card .ah-btn-save') as HTMLButtonElement
    expect(saveBtn.disabled).toBe(false)
  })

  it('创建幕僚调用 addAdvisorProfile 写入真实档案层', async () => {
    const wrapper = await getWrapper()
    const createBtn = wrapper.find('.ah-btn-new')
    await createBtn.trigger('click')
    await new Promise(r => setTimeout(r, 50))
    const nameInput = document.querySelector('.ah-form-input') as HTMLInputElement
    expect(nameInput).not.toBeNull()
    nameInput.value = '墨染'
    nameInput.dispatchEvent(new Event('input', { bubbles: true }))
    await new Promise(r => setTimeout(r, 50))
    const saveBtn = document.querySelector('.ah-dialog-card .ah-btn-save') as HTMLButtonElement
    saveBtn.click()
    expect(mockAddAdvisorProfile).toHaveBeenCalled()
    const arg = mockAddAdvisorProfile.mock.calls[0][0]
    expect(arg.name).toBe('墨染')
    expect(arg.state).toBe('awake')
  })

  // ---- 删除幕僚（走 removeAdvisorProfile，固定预设不可删） ----
  it('删除用户自建幕僚调用 removeAdvisorProfile', async () => {
    mockAdvisors.push(sampleProfile({ id: 'a1' }))
    mockAdvisors.push(sampleProfile({ id: 'a2' }))
    const wrapper = await getWrapper()
    const actionBtns = wrapper.findAll('.a-actions button')
    const delBtn = actionBtns[actionBtns.length - 1]
    await delBtn.trigger('click')
    expect(mockRemoveAdvisorProfile).toHaveBeenCalledWith('a2')
  })

  it('固定预设幕僚不显示删除按钮（仅有派生+沉睡/唤醒，无删除）', async () => {
    mockAdvisors.push(sampleProfile({ id: 'preset-mirror' }))
    const wrapper = await getWrapper()
    const card = wrapper.find('.ah-advisor-card')
    // 固定预设有「派生」+「沉睡/唤醒」两个操作按钮；删除按钮仅用户自建可见
    const btns = card.findAll('.a-actions button')
    expect(btns.length).toBe(2)
  })

  // ---- 切换沉睡/唤醒（走 updateAdvisorProfile state） ----
  it('幕僚默认为活跃状态', async () => {
    mockAdvisors.push(sampleProfile({ state: 'awake' }))
    const wrapper = await getWrapper()
    const card = wrapper.find('.ah-advisor-card')
    expect(card.classes()).not.toContain('dormant')
  })

  it('点击沉睡按钮切换为 slumber 状态', async () => {
    mockAdvisors.push(sampleProfile({ id: 'a1', state: 'awake' }))
    const wrapper = await getWrapper()
    const sleepBtn = wrapper.findAll('.a-actions button')[0]
    await sleepBtn.trigger('click')
    expect(mockUpdateAdvisorProfile).toHaveBeenCalledWith('a1', { state: 'slumber' })
  })

  it('沉睡幕僚卡片有 dormant 样式', async () => {
    mockAdvisors.push(sampleProfile({ state: 'slumber' }))
    const wrapper = await getWrapper()
    const card = wrapper.find('.ah-advisor-card')
    expect(card.classes()).toContain('dormant')
  })

  // ---- 导航到好感度页面 ----
  it('点击"好感"按钮导航到 /advisor-affinity', async () => {
    mockAdvisors.push(sampleProfile())
    const wrapper = await getWrapper()
    const affinityBtn = wrapper.find('.ah-btn-affinity')
    await affinityBtn.trigger('click')
    expect(mockPush).toHaveBeenCalledWith('/advisor-affinity')
  })

  // ---- 一次性迁移旧表单层 hf:advisors ----
  it('挂载时把旧 hf:advisors 迁移进真实档案层', async () => {
    mockStore['hf:advisors'] = [
      { id: 'old1', name: '旧友', role: 'guardian', personality: '沉稳', color: '#34d399', dormant: false, createdAt: new Date().toISOString() },
    ]
    await getWrapper()
    expect(mockAddAdvisorProfile).toHaveBeenCalled()
    const arg = mockAddAdvisorProfile.mock.calls[0][0]
    expect(arg.id).toBe('old1')
    expect(arg.name).toBe('旧友')
    expect(arg.customColorScheme?.primary).toBe('#34d399')
  })

  it('幕僚大厅显示调度面板', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.ah-scheduler-section').exists()).toBe(true)
    const text = wrapper.text()
    expect(text).toMatch(/任务感知|分身调度|进度展示/)
  })

  // ---- C4-EXT · 基于预设派生自定义幕僚（不影响 6 预设幂等） ----
  it('固定预设卡片显示「派生」按钮，且固定预设无删除按钮', async () => {
    mockAdvisors.push(sampleProfile({ id: 'preset-jingwo', name: '镜我', role: 'hermit', personality: 'intuitive' }))
    const wrapper = await getWrapper()
    const card = wrapper.find('.ah-advisor-card')
    const btns = card.findAll('.a-actions button')
    // 派生 + 沉睡/唤醒 = 2 个；无删除（固定预设不可删）
    expect(btns.length).toBe(2)
    expect(wrapper.text()).toContain('⧉ 派生')
  })

  it('点击「派生」预填来源预设的角色/性格/名称并打开弹窗', async () => {
    mockAdvisors.push(sampleProfile({ id: 'preset-jingwo', name: '镜我', role: 'hermit', personality: 'intuitive' }))
    const wrapper = await getWrapper()
    const deriveBtn = wrapper.find('.ah-advisor-card .a-actions button') // 第一个 = 派生
    await deriveBtn.trigger('click')
    // 等待弹窗渲染 + v-model 预填落到 DOM input
    await new Promise(r => setTimeout(r, 50))
    const nameInput = document.querySelector('.ah-form-input') as HTMLInputElement
    expect(nameInput).not.toBeNull()
    expect(nameInput.value).toContain('镜我') // 预填「镜我 的变体」
    // 弹窗标题应为创建（非编辑）
    expect(document.querySelector('.ah-dialog-title')?.textContent).toContain('创建幕僚')
  })

  it('派生保存后以非 preset- 新 id 写入真实档案层并标 derivedFrom=来源预设', async () => {
    mockAdvisors.push(sampleProfile({ id: 'preset-jingwo', name: '镜我', role: 'hermit', personality: 'intuitive' }))
    const wrapper = await getWrapper()
    const deriveBtn = wrapper.find('.ah-advisor-card .a-actions button')
    await deriveBtn.trigger('click')
    await new Promise(r => setTimeout(r, 50))
    const nameInput = document.querySelector('.ah-form-input') as HTMLInputElement
    nameInput.value = '镜我·夜'
    nameInput.dispatchEvent(new Event('input'))
    await new Promise(r => setTimeout(r, 50))
    const saveBtn = document.querySelector('.ah-dialog-card .ah-btn-save') as HTMLButtonElement
    saveBtn.click()
    expect(mockAddAdvisorProfile).toHaveBeenCalled()
    const arg = mockAddAdvisorProfile.mock.calls[0][0]
    expect(arg.name).toBe('镜我·夜')
    expect(arg.derivedFrom).toBe('preset-jingwo') // 溯源来源预设
    expect(arg.id.startsWith('preset-')).toBe(false) // 新 id 非预设前缀，不破坏幂等
  })

  it('派生体卡片显示「源自 镜我」标记', async () => {
    // 派生体 + 来源预设（presetName 反查需要来源预设存在于 advisors 中）
    mockAdvisors.push(sampleProfile({ id: 'preset-jingwo', name: '镜我' }))
    mockAdvisors.push(sampleProfile({ id: 'adv_derive', name: '镜我·夜', derivedFrom: 'preset-jingwo' }))
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('源自镜我')
  })
})

// ============================================================
// 集成：幕僚互动面板 AdvisorInteractionPanel（INCR-246 补挂载孤儿组件）
// 引擎 useAdvisorInteraction 的 relations 为模块级 ref（import 时自 storage 读一次）——
// 故本 describe 空态/渲染用例在 record 用例之前、record 用例置于最末，避免模块态污染
// ============================================================
describe('集成：幕僚互动面板', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAdvisors.length = 0
    mockStore['hf:advisors'] = []
  })

  it('无幕僚时渲染互动面板骨架与空态', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.aip').exists()).toBe(true)
    expect(wrapper.text()).toContain('🤝 幕僚互动')
    expect(wrapper.text()).toContain('幕僚之间的协作、互学与共处')
    expect(wrapper.text()).toContain('先创建幕僚，才能记录他们之间的互动')
  })

  it('有幕僚无互动时展示录入区与"还没有关系"空态', async () => {
    mockAdvisors.push(sampleProfile({ id: 'a_i1', name: '墨染' }))
    mockAdvisors.push(sampleProfile({ id: 'a_i2', name: '青鸟' }))
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('记录一次互动')
    // aId/bId + 类型/结果 = 4 个选择器
    expect(wrapper.findAll('.aip-select').length).toBe(4)
    expect(wrapper.find('.aip-none').text()).toContain('还没有关系')
  })

  it('录入互动后出现关系卡片、亲密度条与互动计数', async () => {
    mockAdvisors.push(sampleProfile({ id: 'a_i1', name: '墨染' }))
    mockAdvisors.push(sampleProfile({ id: 'a_i2', name: '青鸟' }))
    const wrapper = await getWrapper()
    const selects = wrapper.findAll('.aip-select')
    await selects[0].setValue('a_i1')
    await selects[1].setValue('a_i2')
    await (wrapper.findAll('.aip-input')[1] as any).setValue('一起读书')
    await wrapper.find('.aip-add-btn').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.aip-rel').exists()).toBe(true)
    expect(wrapper.text()).toContain('墨染')
    expect(wrapper.text()).toContain('青鸟')
    expect(wrapper.find('.aip-closeness-bar').exists()).toBe(true)
    expect(wrapper.text()).toContain('互动 1 次')
  })
})
