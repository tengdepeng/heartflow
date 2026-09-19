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
const mockGetAdvisors = vi.fn<() => ProfileType[]>(() => [])

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

// ============================================================
// 集成：见证收件箱 AdvisorWitnessPanel（INCR-279 补挂载孤儿组件）
// 引擎 useAdvisorWitness 的 witnesses 为模块级 ref（import 时自 storage 读一次）——
// 故本 describe 每个用例 beforeEach 先 vi.resetModules() 再 seed mockStore，
// 使各用例独立、无模块态污染
// ============================================================
describe('集成：见证收件箱', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAdvisors.length = 0
    mockStore['hf:advisors'] = []
    delete mockStore['hf:advisor:witnesses']
    vi.resetModules()
  })

  afterEach(() => {
    if (activeWrapper) {
      activeWrapper.unmount()
      activeWrapper = null
    }
    document.querySelectorAll('.ah-dialog-overlay').forEach(el => el.remove())
  })

  function seedWitnesses(entries: any[]) {
    mockStore['hf:advisor:witnesses'] = JSON.stringify(entries)
  }

  it('无幕僚时渲染骨架与空态', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.awp').exists()).toBe(true)
    expect(wrapper.text()).toContain('📜 见证收件箱')
    expect(wrapper.text()).toContain('幕僚见证你的每一次成长')
    expect(wrapper.find('.awp-empty').exists()).toBe(true)
    expect(wrapper.text()).toContain('先创建幕僚，才能记录见证')
  })

  it('有幕僚无见证时展示录入区并预填第一位幕僚', async () => {
    mockAdvisors.push(sampleProfile({ id: 'a_w1', name: '墨染' }))
    mockAdvisors.push(sampleProfile({ id: 'a_w2', name: '青鸟' }))
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('记录一次见证')
    // 幕僚选择器 + 事件类型选择器 = 2 个
    expect(wrapper.findAll('.awp-select').length).toBe(2)
    // onMounted 预填第一位幕僚
    expect((wrapper.find('.awp-select').element as HTMLSelectElement).value).toBe('a_w1')
    expect(wrapper.find('.awp-add-btn').exists()).toBe(true)
    expect(wrapper.text()).toContain('还没有见证')
  })

  it('记录见证后展示统计、列表与未读标记并写回存储', async () => {
    mockAdvisors.push(sampleProfile({ id: 'a_w1', name: '墨染' }))
    const wrapper = await getWrapper()
    await wrapper.find('.awp-input').setValue('连续专注 7 天')
    await wrapper.find('.awp-add-btn').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('1 次见证')
    expect(wrapper.find('.awp-stat b').text()).toBe('1')
    expect(wrapper.text()).toContain('首次专注')
    expect(wrapper.text()).toContain('连续专注 7 天')
    expect(wrapper.find('.awp-unviewed-dot').exists()).toBe(true)
    const saved = JSON.parse(mockStore['hf:advisor:witnesses'])
    expect(saved.length).toBe(1)
    expect(saved[0].advisorId).toBe('a_w1')
    expect(saved[0].eventType).toBe('first-focus')
  })

  it('点击未读见证标记已读并展示幕僚反应', async () => {
    mockAdvisors.push(sampleProfile({ id: 'a_w1', name: '墨染', personality: 'steady' }))
    const wrapper = await getWrapper()
    const selects = wrapper.findAll('.awp-select')
    await selects[1].setValue('emotion-breakthrough')
    await wrapper.find('.awp-input').setValue('情绪突破之夜')
    await wrapper.find('.awp-add-btn').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.awp-unviewed-dot').exists()).toBe(true)
    await wrapper.find('.awp-item').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.awp-unviewed-dot').exists()).toBe(false)
    expect(wrapper.find('.awp-reaction').exists()).toBe(true)
    // steady 性格不在 reactions 映射（guardian/scholar/craftsman/hermit）→ 走默认反应池
    expect(wrapper.text()).toMatch(/情绪的突破|你正在变得更完整/)
  })

  it('已有历史见证时渲染列表、统计与已读反应', async () => {
    mockAdvisors.push(sampleProfile({ id: 'a_w1', name: '墨染', personality: 'steady' }))
    seedWitnesses([
      { id: 'w1', advisorId: 'a_w1', eventType: 'first-focus', title: '第一次专注', timestamp: '2026-09-01T10:00:00.000Z', viewed: true },
      { id: 'w2', advisorId: 'a_w1', eventType: 'streak-record', title: '连击 7 天', timestamp: '2026-09-02T10:00:00.000Z', viewed: false },
    ])
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('2 次见证')
    expect(wrapper.text()).toContain('第一次专注')
    expect(wrapper.text()).toContain('连击 7 天')
    expect(wrapper.findAll('.awp-item').length).toBe(2)
    // 已读项展示反应、未读项保留未读圆点
    expect(wrapper.findAll('.awp-reaction').length).toBe(1)
    expect(wrapper.findAll('.awp-unviewed-dot').length).toBe(1)
    expect(wrapper.find('.awp-item.unviewed').text()).toContain('连击 7 天')
    expect(wrapper.find('.awp-item.unviewed').text()).toContain('连击记录')
  })
})

// ============================================================
// 集成：庆祝与退休 AdvisorCelebrationPanel（INCR-280 补挂载孤儿组件）
// 引擎 useAdvisorCelebration 的 celebrations/retirements 为模块级 ref（import 时自 storage 读一次）——
// 故本 describe 每个用例 beforeEach 先 vi.resetModules() 再 seed mockStore，
// 使各用例独立、无模块态污染
// ============================================================
describe('集成：庆祝与退休', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAdvisors.length = 0
    mockStore['hf:advisors'] = []
    delete mockStore['hf:advisor:celebrations']
    delete mockStore['hf:advisor:retirements']
    vi.resetModules()
  })

  afterEach(() => {
    if (activeWrapper) {
      activeWrapper.unmount()
      activeWrapper = null
    }
    document.querySelectorAll('.ah-dialog-overlay').forEach(el => el.remove())
  })

  function seedCelebrations(entries: any[]) {
    mockStore['hf:advisor:celebrations'] = JSON.stringify(entries)
  }
  function seedRetirements(entries: any[]) {
    mockStore['hf:advisor:retirements'] = JSON.stringify(entries)
  }

  it('无幕僚时渲染骨架与空态', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.acp').exists()).toBe(true)
    expect(wrapper.text()).toContain('🎉 庆祝与退休')
    expect(wrapper.text()).toContain('为幕僚的里程碑举杯，为告别留一份遗产')
    expect(wrapper.find('.acp-empty').exists()).toBe(true)
    expect(wrapper.text()).toContain('先创建幕僚，才能为他们庆祝')
  })

  it('有幕僚无庆祝时展示录入区并预填第一位幕僚', async () => {
    mockAdvisors.push(sampleProfile({ id: 'a_c1', name: '墨染' }))
    mockAdvisors.push(sampleProfile({ id: 'a_c2', name: '青鸟' }))
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('创建庆祝事件')
    // 幕僚选择器 + 类型选择器 = 2 个
    expect(wrapper.findAll('.acp-select').length).toBe(2)
    // onMounted 预填第一位幕僚
    expect((wrapper.find('.acp-select').element as HTMLSelectElement).value).toBe('a_c1')
    expect(wrapper.find('.acp-add-btn').exists()).toBe(true)
    expect(wrapper.text()).toContain('还没有庆祝事件')
  })

  it('创建庆祝事件后展示列表、仪式与完成按钮并写回存储', async () => {
    mockAdvisors.push(sampleProfile({ id: 'a_c1', name: '墨染' }))
    const wrapper = await getWrapper()
    await (wrapper.findAll('.acp-input')[0] as any).setValue('入幕满百日')
    await (wrapper.findAll('.acp-input')[1] as any).setValue('共同走过一百天')
    await wrapper.find('.acp-add-btn').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.acp-item').exists()).toBe(true)
    expect(wrapper.text()).toContain('入幕满百日')
    expect(wrapper.text()).toContain('共同走过一百天')
    expect(wrapper.text()).toContain('里程碑')
    // 未庆祝 → 仪式展示 + 完成按钮，无已庆祝标签
    expect(wrapper.find('.acp-ritual').exists()).toBe(true)
    expect(wrapper.text()).toContain('授勋仪式')
    expect(wrapper.find('.acp-done').exists()).toBe(false)
    expect(wrapper.find('.acp-item .acp-btn--small').text()).toBe('完成')
    const saved = JSON.parse(mockStore['hf:advisor:celebrations'])
    expect(saved.length).toBe(1)
    expect(saved[0].advisorId).toBe('a_c1')
    expect(saved[0].type).toBe('milestone')
    expect(saved[0].title).toBe('入幕满百日')
    expect(saved[0].celebrated).toBe(false)
  })

  it('点击完成标记已庆祝并写回存储', async () => {
    mockAdvisors.push(sampleProfile({ id: 'a_c1', name: '墨染' }))
    const wrapper = await getWrapper()
    await (wrapper.findAll('.acp-input')[0] as any).setValue('入幕满百日')
    await wrapper.find('.acp-add-btn').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.acp-done').exists()).toBe(false)
    await wrapper.find('.acp-item .acp-btn--small').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.acp-done').exists()).toBe(true)
    expect(wrapper.text()).toContain('已庆祝')
    const saved = JSON.parse(mockStore['hf:advisor:celebrations'])
    expect(saved[0].celebrated).toBe(true)
  })

  it('已有历史庆祝时渲染列表与已庆祝状态', async () => {
    mockAdvisors.push(sampleProfile({ id: 'a_c1', name: '墨染' }))
    seedCelebrations([
      { id: 'c1', type: 'milestone', advisorId: 'a_c1', title: '入幕满百日', description: '共同走过一百天', date: '2026-09-01', celebrated: true, ritual: { name: '授勋仪式', steps: ['点燃烛火'], participants: ['a_c1'] } },
      { id: 'c2', type: 'birthday', advisorId: 'a_c1', title: '诞辰之庆', description: '', date: '2026-09-10', celebrated: false, ritual: { name: '庆生典礼', steps: ['点燃烛火'], participants: ['a_c1'] } },
    ])
    const wrapper = await getWrapper()
    expect(wrapper.findAll('.acp-item').length).toBe(2)
    expect(wrapper.text()).toContain('入幕满百日')
    expect(wrapper.text()).toContain('诞辰之庆')
    expect(wrapper.text()).toContain('共同走过一百天')
    expect(wrapper.findAll('.acp-done').length).toBe(1)
    expect(wrapper.find('.acp-item.done').text()).toContain('入幕满百日')
    expect(wrapper.findAll('.acp-item .acp-btn--small').length).toBe(1)
  })

  it('已有退休仪式时展示阶段、推进与遗产', async () => {
    mockAdvisors.push(sampleProfile({ id: 'a_c1', name: '墨染' }))
    seedRetirements([
      {
        id: 'ret1',
        advisorId: 'a_c1',
        reason: '完成使命，荣休归隐',
        phase: 'contemplation',
        startedAt: '2026-09-01T10:00:00.000Z',
        legacies: [
          { id: 'leg1', type: 'wisdom', title: '十年箴言', content: '慢即是快', inheritable: true },
        ],
      },
    ])
    const wrapper = await getWrapper()
    expect(wrapper.find('.acp-retire').exists()).toBe(true)
    expect(wrapper.text()).toContain('🕊 退休与遗产')
    // stats.completed=0（未完成）· legacies 1 件
    expect(wrapper.text()).toContain('0 场完成 · 1 件遗产')
    expect(wrapper.text()).toContain('墨染 的退休仪式')
    expect(wrapper.text()).toContain('沉思')
    expect(wrapper.text()).toContain('完成使命，荣休归隐')
    expect(wrapper.find('.acp-legacy').exists()).toBe(true)
    expect(wrapper.text()).toContain('十年箴言')
    expect(wrapper.text()).toContain('慢即是快')
    expect(wrapper.text()).toContain('可继承')
    // 推进阶段：contemplation → farewell
    await wrapper.find('.acp-retire-item .acp-btn--small').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('告别')
    const saved = JSON.parse(mockStore['hf:advisor:retirements'])
    expect(saved.length).toBe(1)
    expect(saved[0].phase).toBe('farewell')
    expect(saved[0].completedAt).toBeUndefined()
  })
})

// ============================================================
// 集成：作息与场景 AdvisorDailyLifePanel（INCR-281 补挂载孤儿组件）
// 引擎 useAdvisorDailyLife 的 schedules/currentActivities/scenes 为模块级 ref（import 时自 storage 读一次）——
// 故本 describe 每个用例 beforeEach 先 vi.resetModules() 再清 mockStore['hf:advisor:schedules']，
// 使各用例独立、无模块态污染。注意：currentActivities 为运行时态不持久化；
// 当前时段活动（.adp-item-acts）依赖运行小时，断言避免精确活动名
// ============================================================
describe('集成：作息与场景', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAdvisors.length = 0
    mockStore['hf:advisors'] = []
    delete mockStore['hf:advisor:schedules']
    vi.resetModules()
  })

  afterEach(() => {
    if (activeWrapper) {
      activeWrapper.unmount()
      activeWrapper = null
    }
    document.querySelectorAll('.ah-dialog-overlay').forEach(el => el.remove())
  })

  it('无幕僚时渲染骨架与空态', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.adp').exists()).toBe(true)
    expect(wrapper.text()).toContain('🌗 作息与场景')
    expect(wrapper.text()).toContain('幕僚此刻在做什么')
    expect(wrapper.find('.adp-empty').exists()).toBe(true)
    expect(wrapper.text()).toContain('先创建幕僚，才能安排他们的作息')
    // 时段徽标（时段文案依赖运行小时，仅断言前缀）
    expect(wrapper.find('.adp-slot').text()).toMatch(/^🌗/)
  })

  it('有幕僚时展示作息列表与场景网格，onMounted 初始化作息并落库', async () => {
    mockAdvisors.push(sampleProfile({ id: 'a_d1', name: '墨染' }))
    const wrapper = await getWrapper()
    expect(wrapper.findAll('.adp-item').length).toBe(1)
    expect(wrapper.text()).toContain('墨染')
    // onMounted 预填活动选择器为 resting
    expect((wrapper.find('.adp-select').element as HTMLSelectElement).value).toBe('resting')
    // initSchedule 写回存储：schedules 落库且 isActive
    const saved = JSON.parse(mockStore['hf:advisor:schedules'])
    expect(Object.keys(saved).length).toBe(1)
    expect(saved.a_d1).toBeDefined()
    expect(saved.a_d1.isActive).toBe(true)
    expect(saved.a_d1.slots).toBeDefined()
    // 六场景网格渲染
    expect(wrapper.findAll('.adp-scene').length).toBe(6)
  })

  it('点击开始启动活动，展示场景占位与活动片段', async () => {
    mockAdvisors.push(sampleProfile({ id: 'a_d1', name: '墨染' }))
    const wrapper = await getWrapper()
    // 初始无场景活动 → 各场景空
    expect(wrapper.findAll('.adp-scene-empty').length).toBe(6)
    await wrapper.find('.adp-item .adp-btn').trigger('click')
    await wrapper.vm.$nextTick()
    // 默认进入第一个场景（书房），occ 1/3，active 高亮
    expect(wrapper.find('.adp-scene.active .adp-scene-occ').text()).toBe('1/3')
    expect(wrapper.find('.adp-scene.active').text()).toContain('书房')
    // 场景活动片段：名字 + 默认休息活动
    expect(wrapper.find('.adp-scene-acts .adp-act-chip').text()).toContain('墨染')
    expect(wrapper.find('.adp-scene-acts .adp-act-chip').text()).toContain('休息')
  })

  it('点击结束终止活动，场景恢复空', async () => {
    mockAdvisors.push(sampleProfile({ id: 'a_d1', name: '墨染' }))
    const wrapper = await getWrapper()
    await wrapper.find('.adp-item .adp-btn').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('.adp-scene-empty').length).toBe(5)
    // 结束按钮（ghost 变体）
    await wrapper.find('.adp-btn--ghost').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('.adp-scene-empty').length).toBe(6)
    expect(wrapper.find('.adp-scene.active').exists()).toBe(false)
  })

  it('场景网格展示全部六场景的容量与描述', async () => {
    mockAdvisors.push(sampleProfile({ id: 'a_d1', name: '墨染' }))
    const wrapper = await getWrapper()
    const sceneNames = ['书房', '庭院', '厨房', '工坊', '客厅', '卧室']
    sceneNames.forEach(name => expect(wrapper.text()).toContain(name))
    // 各场景初始 occ 0/N 容量
    expect(wrapper.text()).toContain('0/3')
    expect(wrapper.text()).toContain('0/4')
    expect(wrapper.text()).toContain('0/2')
    expect(wrapper.text()).toContain('0/5')
    expect(wrapper.text()).toContain('0/1')
    // 场景描述
    expect(wrapper.text()).toContain('书架环绕的安静空间')
    expect(wrapper.text()).toContain('草木葱茏的户外空间')
  })

  it('多幕僚各自独立作息与活动控制', async () => {
    mockAdvisors.push(sampleProfile({ id: 'a_d1', name: '墨染' }))
    mockAdvisors.push(sampleProfile({ id: 'a_d2', name: '青鸟' }))
    const wrapper = await getWrapper()
    expect(wrapper.findAll('.adp-item').length).toBe(2)
    expect(wrapper.findAll('.adp-select').length).toBe(2)
    const saved = JSON.parse(mockStore['hf:advisor:schedules'])
    expect(Object.keys(saved).length).toBe(2)
    expect(saved.a_d1.isActive).toBe(true)
    expect(saved.a_d2.isActive).toBe(true)
    // 只启动第一位幕僚 → 书房仅占 1 席
    await wrapper.findAll('.adp-item')[0].find('.adp-btn').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.adp-scene.active .adp-scene-occ').text()).toBe('1/3')
    expect(wrapper.findAll('.adp-item')[1].find('.adp-btn--ghost').exists()).toBe(true)
  })
})

describe('集成：协调权设置面板', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAdvisors.length = 0
    mockStore['hf:advisors'] = []
    delete mockStore['advisor:coordinator']
    mockGetAdvisors.mockReturnValue([])
  })

  it('无幕僚时渲染协调权面板与未设置态', async () => {
    const wrapper = await getWrapper()
    const csp = wrapper.find('.csp-panel')
    expect(csp.exists()).toBe(true)
    expect(csp.find('.csp-title').text()).toContain('协调权')
    expect(csp.find('.csp-current-value--none').text()).toBe('未设置协调者')
    expect(csp.findAll('.csp-mode').length).toBe(3)
    expect(csp.find('.csp-mode[data-mode="jingwo"]').exists()).toBe(true)
    expect(csp.find('.csp-mode[data-mode="custom"]').exists()).toBe(true)
    expect(csp.find('.csp-mode[data-mode="off"]').exists()).toBe(true)
  })

  it('有幕僚时显示当前协调者镜我', async () => {
    mockGetAdvisors.mockReturnValue([
      sampleProfile({ id: 'preset-jingwo', name: '镜我', role: 'coordinator' }),
      sampleProfile({ id: 'adv_b1', name: '墨染', role: 'guardian' }),
    ])
    const wrapper = await getWrapper()
    const csp = wrapper.find('.csp-panel')
    expect(csp.find('.csp-current-value').text()).toContain('镜我')
    expect(csp.find('.csp-current-role').text()).toBe('coordinator')
  })

  it('关闭集中协调后持久化 off 并显示未设置', async () => {
    mockGetAdvisors.mockReturnValue([
      sampleProfile({ id: 'preset-jingwo', name: '镜我', role: 'coordinator' }),
    ])
    const wrapper = await getWrapper()
    await wrapper.find('.csp-mode[data-mode="off"]').trigger('click')
    expect(mockStore['advisor:coordinator'].mode).toBe('off')
    const csp = wrapper.find('.csp-panel')
    expect(csp.find('.csp-current-value--none').exists()).toBe(true)
  })

  it('指定幕僚并持久化 advisorId', async () => {
    mockGetAdvisors.mockReturnValue([
      sampleProfile({ id: 'preset-jingwo', name: '镜我', role: 'coordinator' }),
      sampleProfile({ id: 'adv_b2', name: '墨染', role: 'guardian' }),
    ])
    const wrapper = await getWrapper()
    await wrapper.find('.csp-mode[data-mode="custom"]').trigger('click')
    const select = wrapper.find('.csp-input')
    expect(select.exists()).toBe(true)
    expect(select.findAll('option').length).toBeGreaterThanOrEqual(2)
    await select.setValue('preset-jingwo')
    expect(mockStore['advisor:coordinator'].mode).toBe('custom')
    expect(mockStore['advisor:coordinator'].advisorId).toBe('preset-jingwo')
    const csp = wrapper.find('.csp-panel')
    expect(csp.find('.csp-current-value').text()).toContain('镜我')
  })
})

// ============================================================
// 集成：执行策略判定（dispatch·detectStrategy 独有维度，INCR-360）
// 调令输入时实时预览单一/并行/串行决策；未输入时不展示
// ============================================================
describe('集成：执行策略判定', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAdvisors.length = 0
    mockStore['hf:advisors'] = []
  })

  afterEach(() => {
    if (activeWrapper) {
      activeWrapper.unmount()
      activeWrapper = null
    }
    document.querySelectorAll('.ah-dialog-overlay').forEach(el => el.remove())
  })

  it('未输入调令时不展示策略预览', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.ah-cmd-strategy').exists()).toBe(false)
  })

  it('多幕僚且无先后依赖词 → 判定并行', async () => {
    mockAdvisors.push(sampleProfile({ id: 'a_s1', name: '墨染', state: 'awake' }))
    mockAdvisors.push(sampleProfile({ id: 'a_s2', name: '青鸟', state: 'awake' }))
    const wrapper = await getWrapper()
    await wrapper.find('.ah-command-input').setValue('整理素材，撰写初稿')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.ah-cmd-strategy').exists()).toBe(true)
    expect(wrapper.find('.ah-cmd-strategy-chip').text()).toBe('并行')
    expect(wrapper.text()).toContain('协同收集')
  })

  it('含先后依赖词（先/再/然后）→ 判定串行', async () => {
    mockAdvisors.push(sampleProfile({ id: 'a_s1', name: '墨染', state: 'awake' }))
    mockAdvisors.push(sampleProfile({ id: 'a_s2', name: '青鸟', state: 'awake' }))
    const wrapper = await getWrapper()
    await wrapper.find('.ah-command-input').setValue('先整理素材，再撰写初稿')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.ah-cmd-strategy-chip').text()).toBe('串行')
    expect(wrapper.text()).toContain('先后依赖词')
  })

  it('单幕僚 → 判定单一', async () => {
    mockAdvisors.push(sampleProfile({ id: 'a_s1', name: '墨染', state: 'awake' }))
    const wrapper = await getWrapper()
    await wrapper.find('.ah-command-input').setValue('整理素材')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.ah-cmd-strategy-chip').text()).toBe('单一')
    expect(wrapper.text()).toContain('单幕僚直接执行')
  })
})
