// ============================================================
// Career 视图测试 — 业脉 · 工作关系网络
// ============================================================
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'

// ============================================================
// 模拟 storage
// ============================================================
const mockStore: Record<string, any> = {}
const mockGetKV = vi.fn((_key: string, def: any) => mockStore[_key] ?? def)
const mockSetKV = vi.fn((key: string, val: any) => { mockStore[key] = val })

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (...args: any[]) => (mockGetKV as any)(...args),
    setKV: (...args: any[]) => (mockSetKV as any)(...args),
  },
}))

// ============================================================
// 模拟 room-graph
// ============================================================
vi.mock('../../engine/room-graph', () => ({
  getRoom: (id: string) => {
    if (id === 'career') {
      return {
        id: 'career',
        path: '/career',
        name: '业脉',
        icon: '🌐',
        color: '#8a9a7a',
        group: 'world',
        description: '工作关系网络',
        adjacentTo: ['worklog', 'scar', 'reward', 'craft', 'goals', 'roots', 'home-space'],
        isMainPath: false,
        mainPathOrder: -1,
        branchFrom: 'worklog',
      }
    }
    return undefined
  },
}))

// ============================================================
// 模拟 vue-router
// ============================================================
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ path: '/career' }),
}))

// ============================================================
// 模拟 useRoomNavigation
// ============================================================
vi.mock('../../composables/useRoomNavigation', () => ({
  useRoomNavigation: () => ({
    enterRoom: vi.fn(),
  }),
}))

// ============================================================
// 挂载辅助
// ============================================================
let wrapper: ReturnType<typeof mount> | null = null

async function getWrapper() {
  // 清理上一个 wrapper
  if (wrapper) {
    wrapper.unmount()
    wrapper = null
  }
  // 清理 DOM 中残留的模态框
  document.querySelectorAll('.career-modal-overlay').forEach(el => el.remove())

  const { default: Career } = await import('../Career.vue')
  wrapper = mount(Career, {
    attachTo: document.body,
  })
  return wrapper
}

// ============================================================
// 测试套件
// ============================================================
describe('Career 视图', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 清空存储，使组件加载默认数据
    for (const key of Object.keys(mockStore)) {
      delete mockStore[key]
    }
    // 清理残留模态框
    document.querySelectorAll('.career-modal-overlay').forEach(el => el.remove())
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
      wrapper = null
    }
    document.querySelectorAll('.career-modal-overlay').forEach(el => el.remove())
  })

  // ==========================================================
  // 1. 渲染头部区域
  // ==========================================================
  it('渲染头部标题和描述', async () => {
    const w = await getWrapper()
    await w.vm.$nextTick()
    expect(w.text()).toContain('业脉')
    expect(w.text()).toContain('工作关系网络')
    expect(w.text()).toContain('从更漏 · 工作日志中生长出的关系网络')
  })

  // ==========================================================
  // 2. 渲染概览统计
  // ==========================================================
  it('渲染概览统计（联系人、活跃项目、脉动指数）', async () => {
    const w = await getWrapper()
    await w.vm.$nextTick()
    const overviewStats = w.findAll('.career-overview-stat')
    expect(overviewStats).toHaveLength(3)

    expect(overviewStats[0].text()).toContain('12')
    expect(overviewStats[0].text()).toContain('联系人')
    expect(overviewStats[1].text()).toContain('2')
    expect(overviewStats[1].text()).toContain('活跃项目')
    expect(overviewStats[2].text()).toContain('80')
    expect(overviewStats[2].text()).toContain('分')
    expect(overviewStats[2].text()).toContain('脉动指数')
  })

  // ==========================================================
  // 3. 渲染4个圈层标签
  // ==========================================================
  it('渲染4个圈层卡片', async () => {
    const w = await getWrapper()
    await w.vm.$nextTick()
    const tierCards = w.findAll('.tier-card')
    expect(tierCards).toHaveLength(4)
    expect(tierCards[0].text()).toContain('核心圈')
    expect(tierCards[1].text()).toContain('活跃圈')
    expect(tierCards[2].text()).toContain('扩展圈')
    expect(tierCards[3].text()).toContain('边缘圈')
  })

  // ==========================================================
  // 4. 渲染默认联系人（12个）
  // ==========================================================
  it('渲染默认12个联系人', async () => {
    const w = await getWrapper()
    await w.vm.$nextTick()
    const contactTags = w.findAll('.tier-contact-tag')
    expect(contactTags).toHaveLength(12)
    expect(w.text()).toContain('张老师')
    expect(w.text()).toContain('李工')
    expect(w.text()).toContain('王组长')
    expect(w.text()).toContain('陈总监')
    expect(w.text()).toContain('冯测试')
  })

  // ==========================================================
  // 5. 联系人搜索过滤功能
  // ==========================================================
  it('搜索过滤联系人（按姓名）', async () => {
    const w = await getWrapper()
    await w.vm.$nextTick()

    const searchInput = w.find('.career-search-input')
    await searchInput.setValue('张老师')
    await w.vm.$nextTick()

    const contactTags = w.findAll('.tier-contact-tag')
    expect(contactTags).toHaveLength(1)
    expect(contactTags[0].text()).toContain('张老师')
  })

  it('搜索无结果时所有圈层显示"暂无记录"', async () => {
    const w = await getWrapper()
    await w.vm.$nextTick()

    const searchInput = w.find('.career-search-input')
    await searchInput.setValue('不存在的联系人')
    await w.vm.$nextTick()

    const emptyTexts = w.findAll('.tier-empty')
    expect(emptyTexts).toHaveLength(4)
  })

  // ==========================================================
  // 6. 圈层筛选功能
  // ==========================================================
  it('圈层筛选按钮只显示对应圈层', async () => {
    const w = await getWrapper()
    await w.vm.$nextTick()

    const filterBtns = w.findAll('.tier-filter-btn')
    expect(filterBtns).toHaveLength(5)
    expect(filterBtns[0].text()).toBe('全部')
    expect(filterBtns[1].text()).toBe('核心圈')
    expect(filterBtns[2].text()).toBe('活跃圈')
    expect(filterBtns[3].text()).toBe('扩展圈')
    expect(filterBtns[4].text()).toBe('边缘圈')
  })

  it('点击"核心圈"筛选按钮只显示核心圈', async () => {
    const w = await getWrapper()
    await w.vm.$nextTick()

    const filterBtns = w.findAll('.tier-filter-btn')
    await filterBtns[1].trigger('click')
    await w.vm.$nextTick()

    const tierCards = w.findAll('.tier-card')
    expect(tierCards).toHaveLength(1)
    expect(tierCards[0].text()).toContain('核心圈')
    const contactTags = tierCards[0].findAll('.tier-contact-tag')
    expect(contactTags).toHaveLength(3)
  })

  it('点击"活跃圈"筛选按钮只显示活跃圈', async () => {
    const w = await getWrapper()
    await w.vm.$nextTick()

    const filterBtns = w.findAll('.tier-filter-btn')
    await filterBtns[2].trigger('click')
    await w.vm.$nextTick()

    const tierCards = w.findAll('.tier-card')
    expect(tierCards).toHaveLength(1)
    expect(tierCards[0].text()).toContain('活跃圈')
    const contactTags = tierCards[0].findAll('.tier-contact-tag')
    expect(contactTags).toHaveLength(4)
  })

  it('再次点击已激活的筛选按钮取消筛选', async () => {
    const w = await getWrapper()
    await w.vm.$nextTick()

    const filterBtns = w.findAll('.tier-filter-btn')
    await filterBtns[1].trigger('click')
    await w.vm.$nextTick()
    expect(w.findAll('.tier-card')).toHaveLength(1)

    await filterBtns[1].trigger('click')
    await w.vm.$nextTick()
    expect(w.findAll('.tier-card')).toHaveLength(4)
  })

  // ==========================================================
  // 7. 打开联系人添加弹窗
  // ==========================================================
  it('点击"添加联系人"按钮打开弹窗', async () => {
    const w = await getWrapper()
    await w.vm.$nextTick()

    const addBtns = w.findAll('.career-add-btn')
    expect(addBtns.length).toBeGreaterThanOrEqual(1)
    await addBtns[0].trigger('click')
    await w.vm.$nextTick()

    const overlay = document.querySelector('.career-modal-overlay')
    expect(overlay).not.toBeNull()
    expect(overlay!.textContent).toContain('添加联系人')
  })

  // ==========================================================
  // 8. 添加联系人后更新列表
  // ==========================================================
  it('添加联系人后列表更新', async () => {
    const w = await getWrapper()
    await w.vm.$nextTick()

    // 初始12个联系人
    expect(w.findAll('.tier-contact-tag')).toHaveLength(12)

    // 通过 Vue 组件实例直接设置表单数据并保存
    const vm = w.vm as any
    vm.contactForm.name = '新联系人'
    vm.saveContactForm()
    await w.vm.$nextTick()

    // 列表更新为13个联系人
    const contactTags = w.findAll('.tier-contact-tag')
    expect(contactTags).toHaveLength(13)
    expect(w.text()).toContain('新联系人')

    // 概统计更新
    const overviewStats = w.findAll('.career-overview-stat')
    expect(overviewStats[0].text()).toContain('13')
    expect(overviewStats[2].text()).toContain('85')
  })

  // ==========================================================
  // 9. 编辑联系人
  // ==========================================================
  it('点击联系人标签打开编辑表单', async () => {
    const w = await getWrapper()
    await w.vm.$nextTick()

    // 使用原生 DOM 点击第一个联系人标签
    const contactTag = document.querySelector('.tier-contact-tag') as HTMLElement
    expect(contactTag).not.toBeNull()
    contactTag.click()
    await w.vm.$nextTick()

    const overlay = document.querySelector('.career-modal-overlay')
    expect(overlay).not.toBeNull()
    // 弹窗标题应为"编辑联系人"
    expect(overlay!.textContent).toContain('编辑联系人')
    // 检查输入框的值（input 的 value 不在 textContent 中，需直接检查 input）
    const nameInput = overlay!.querySelector('.form-input') as HTMLInputElement
    expect(nameInput.value).toBe('张老师')
  })

  it('编辑联系人后信息更新', async () => {
    const w = await getWrapper()
    await w.vm.$nextTick()

    // 通过 Vue 组件实例直接编辑联系人
    const vm = w.vm as any
    // 直接设置编辑状态和表单数据
    vm.editingContactId = 'c-001'
    vm.contactForm.name = '张导师'
    vm.contactForm.role = '导师'
    vm.contactForm.tier = 'core'
    vm.contactForm.affinity = 10
    vm.contactForm.tags = ['技术指导', '职业规划']
    vm.contactForm.note = ''
    vm.contactFormTags = '技术指导, 职业规划'
    vm.saveContactForm()
    await w.vm.$nextTick()

    // 验证联系人列表中的姓名已更新
    expect(w.text()).toContain('张导师')
    // "张老师" 在项目合作者中仍存在（项目 p-004 的 partners），所以只检查联系人区域
    const coreTier = w.findAll('.tier-card')[0]
    expect(coreTier.text()).toContain('张导师')
    expect(coreTier.text()).not.toContain('张老师')
  })

  // ==========================================================
  // 10. 删除联系人
  // ==========================================================
  it('删除联系人', async () => {
    const w = await getWrapper()
    await w.vm.$nextTick()

    // 初始12个联系人
    expect(w.findAll('.tier-contact-tag')).toHaveLength(12)

    // 通过 Vue 组件实例直接操作 contacts 实现删除
    const vm = w.vm as any
    // 获取 contacts ref 的值（auto-unwrapped），过滤后重新赋值
    const updatedContacts = vm.contacts.filter((c: any) => c.id !== 'c-001')
    vm.contacts = updatedContacts
    await w.vm.$nextTick()

    // 验证：只剩11个联系人，核心圈不再包含"张老师"
    expect(w.findAll('.tier-contact-tag')).toHaveLength(11)
    const coreTier = w.findAll('.tier-card')[0]
    expect(coreTier.text()).not.toContain('张老师')

    // 概统计更新
    const overviewStats = w.findAll('.career-overview-stat')
    expect(overviewStats[0].text()).toContain('11')
  })

  // ==========================================================
  // 11. 渲染项目列表
  // ==========================================================
  it('渲染6个默认项目', async () => {
    const w = await getWrapper()
    await w.vm.$nextTick()

    const projectCards = w.findAll('.project-card')
    expect(projectCards).toHaveLength(6)
    expect(w.text()).toContain('心流工坊')
    expect(w.text()).toContain('前端组件库重构')
    expect(w.text()).toContain('数据分析平台')
    expect(w.text()).toContain('技术分享工作坊')
    expect(w.text()).toContain('微服务网关设计')
    expect(w.text()).toContain('用户体验改进计划')
    expect(w.text()).toContain('进行中')
    expect(w.text()).toContain('已完成')
    expect(w.text()).toContain('暂停')
    expect(w.text()).toContain('规划中')
  })

  // ==========================================================
  // 12. 打开项目添加弹窗
  // ==========================================================
  it('点击"添加项目"按钮打开项目弹窗', async () => {
    const w = await getWrapper()
    await w.vm.$nextTick()

    const addBtns = w.findAll('.career-add-btn')
    expect(addBtns.length).toBeGreaterThanOrEqual(2)

    // 使用原生 DOM 点击第二个添加按钮（合作记录）
    const allAddBtns = document.querySelectorAll('.career-add-btn')
    expect(allAddBtns.length).toBeGreaterThanOrEqual(2)
    ;(allAddBtns[1] as HTMLElement).click()
    await w.vm.$nextTick()

    const overlay = document.querySelector('.career-modal-overlay')
    expect(overlay).not.toBeNull()
    expect(overlay!.textContent).toContain('添加项目')
  })

  // ==========================================================
  // 13. 添加项目后更新列表
  // ==========================================================
  it('添加项目后列表更新', async () => {
    const w = await getWrapper()
    await w.vm.$nextTick()

    // 初始6个项目
    expect(w.findAll('.project-card')).toHaveLength(6)

    // 通过 Vue 组件实例直接设置表单数据并保存
    const vm = w.vm as any
    vm.projectForm.name = '新项目测试'
    vm.projectForm.description = '测试项目描述'
    vm.projectForm.status = 'active'
    vm.projectForm.partners = '测试团队'
    vm.projectForm.date = '2026-08'
    vm.saveProjectForm()
    await w.vm.$nextTick()

    // 列表更新为7个项目
    const projectCards = w.findAll('.project-card')
    expect(projectCards).toHaveLength(7)
    expect(w.text()).toContain('新项目测试')

    // 统计信息中的活跃项目更新（新项目默认 active，共3个活跃）
    const overviewStats = w.findAll('.career-overview-stat')
    expect(overviewStats[1].text()).toContain('3')
  })
})

describe('脉络图', () => {
  it('渲染 Canvas 元素', async () => {
    const w = await getWrapper()
    await w.vm.$nextTick()
    const canvas = w.find('canvas')
    expect(canvas.exists()).toBe(true)
  })

  it('显示图例', async () => {
    const w = await getWrapper()
    await w.vm.$nextTick()
    const legend = w.find('.career-legend')
    expect(legend.exists()).toBe(true)
    expect(legend.text()).toContain('圈层距离')
    expect(legend.text()).toContain('连接类型')
  })

  it('图例显示4个圈层', async () => {
    const w = await getWrapper()
    await w.vm.$nextTick()
    const legendItems = w.findAll('.career-legend-item')
    // 4 个圈层 + 6 种连接 = 10 个图例项
    expect(legendItems.length).toBeGreaterThanOrEqual(10)
    expect(w.text()).toContain('核心圈')
    expect(w.text()).toContain('强连接')
    expect(w.text()).toContain('师徒')
  })
})

// ============================================================
// 集成：业脉档案面板（INCR-168：补挂载 claim-but-orphan 面板）
// ============================================================
describe('集成：业脉档案面板', () => {
  it('挂载业脉档案面板并渲染标题与健康圆环', async () => {
    const w = await getWrapper()
    await w.vm.$nextTick()
    expect(w.find('.cap').exists()).toBe(true)
    expect(w.text()).toContain('业脉档案')
    expect(w.find('.cap-ring-num').text()).toContain('/100')
  })

  it('有数据时渲染概览指标、圈层分布与洞察', async () => {
    mockStore['career:contacts'] = [
      { id: 'c1', name: '张老师', role: '导师', tier: 'core', nodeType: 'mentor', affinity: 9, tags: ['教学'] },
      { id: 'c2', name: '李工', role: '合作', tier: 'active', nodeType: 'colleague', affinity: 6, tags: ['工程'] },
      { id: 'c3', name: '王组长', role: '上级', tier: 'core', nodeType: 'superior', affinity: 8, tags: ['团队'] },
    ]
    mockStore['career:projects'] = [
      { id: 'p1', name: '灰度重构', icon: '🛠', description: '系统重构', color: '#8a9a7a', status: 'active', statusLabel: '进行中', partners: 'resolve', date: '2026-09-01' },
    ]
    mockStore['career:connections'] = [
      { id: 'cn1', fromId: 'c1', toId: 'c2', type: 'collaboration' },
    ]
    const w = await getWrapper()
    await w.vm.$nextTick()
    const metrics = w.findAll('.cap-metric')
    expect(metrics.length).toBe(5)
    expect(w.text()).toContain('联系人')
    expect(w.text()).toContain('核心圈')
    expect(w.find('.cap-block').exists()).toBe(true)
    expect(w.text()).toContain('圈层分布')
  })
})

// ============================================================
// 集成：可视化数据 + 职业模拟器（INCR-194）
// ============================================================
describe('集成：可视化数据与职业模拟器', () => {
  it('渲染可视化数据面板（空态引导）', async () => {
    const w = await getWrapper()
    await w.vm.$nextTick()
    expect(w.find('.cvp').exists()).toBe(true)
    expect(w.text()).toContain('可视化数据')
  })

  it('有技能数据时渲染技能雷达', async () => {
    mockStore['hf:career:skills'] = [
      { id: 's1', name: 'Vue', category: 'technical', proficiency: 'advanced', proficiencyScore: 70, yearsOfExperience: 3, relatedPositions: [], prerequisites: [], complements: [], isCore: true },
      { id: 's2', name: '沟通', category: 'soft', proficiency: 'intermediate', proficiencyScore: 50, yearsOfExperience: 2, relatedPositions: [], prerequisites: [], complements: [], isCore: false },
    ]
    const w = await getWrapper()
    await w.vm.$nextTick()
    expect(w.text()).toContain('个维度')
    expect(w.find('.cvp-radar').exists()).toBe(true)
  })

  it('渲染职业模拟器面板', async () => {
    const w = await getWrapper()
    await w.vm.$nextTick()
    expect(w.find('.csp').exists()).toBe(true)
    expect(w.text()).toContain('职业模拟器')
  })

  it('模拟器提供预设场景选择', async () => {
    const w = await getWrapper()
    await w.vm.$nextTick()
    const scenarios = w.findAll('.csp-scenario')
    expect(scenarios.length).toBeGreaterThan(0)
  })
})

// ============================================================
// 集成：技能缺口档案 + 可视化（INCR-220：补挂载孤儿面板 x2）
// ============================================================
describe('集成：技能缺口档案与可视化', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    for (const key of Object.keys(mockStore)) {
      delete mockStore[key]
    }
    document.querySelectorAll('.career-modal-overlay').forEach(el => el.remove())
  })

  it('空态：无技能时双面板展示引导', async () => {
    const w = await getWrapper()
    await w.vm.$nextTick()
    expect(w.find('.sgp-panel').exists()).toBe(true)
    expect(w.text()).toContain('技能缺口档案')
    expect(w.text()).toContain('技能未显影')
    expect(w.find('.sgv').exists()).toBe(true)
    expect(w.text()).toContain('先在技能图谱中录入技能')
  })

  it('有技能时渲染档案概览与技能缺口', async () => {
    mockStore['hf:career:skills'] = [
      { id: 's1', name: 'Vue', category: 'technical', proficiency: 'advanced', proficiencyScore: 70, yearsOfExperience: 3, relatedPositions: [], prerequisites: [], complements: [], isCore: true },
      { id: 's2', name: '沟通', category: 'soft', proficiency: 'intermediate', proficiencyScore: 50, yearsOfExperience: 2, relatedPositions: [], prerequisites: [], complements: [], isCore: false },
    ]
    mockStore['hf:career:milestones'] = [
      { id: 'm1', type: 'career', title: '晋升高级工程师', description: '带团队完成项目', date: '2026-06-01', impact: 8, relatedSkills: ['Vue'], relatedContacts: [] },
    ]
    const w = await getWrapper()
    await w.vm.$nextTick()
    // 档案概览
    expect(w.text()).toContain('技能总数')
    expect(w.text()).toContain('最强技能')
    // 缺口分析（目标角色对照）
    expect(w.text()).toContain('技能缺口')
  })

  it('有技能时可视化面板渲染热力图与路线', async () => {
    mockStore['hf:career:skills'] = [
      { id: 's1', name: 'Vue', category: 'technical', proficiency: 'advanced', proficiencyScore: 70, yearsOfExperience: 3, relatedPositions: [], prerequisites: [], complements: [], isCore: true },
    ]
    const w = await getWrapper()
    await w.vm.$nextTick()
    expect(w.text()).toContain('技术负责人')
    expect(w.find('.sgv-heatmap').exists()).toBe(true)
  })
})

// ============================================================
// 集成：转业推荐面板（INCR-227：补挂载孤儿面板，Props 薄委托化）
// ============================================================
describe('集成：转业推荐面板', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    for (const key of Object.keys(mockStore)) {
      delete mockStore[key]
    }
    document.querySelectorAll('.career-modal-overlay').forEach(el => el.remove())
  })

  it('空态：无技能无联系人时展示引导并禁用生成按钮', async () => {
    const { default: TransitionRecommendPanel } = await import('../../components/TransitionRecommendPanel.vue')
    const panel = mount(TransitionRecommendPanel, {
      props: { contacts: [], connections: [], skills: [], milestones: [] },
      attachTo: document.body,
    })
    await panel.vm.$nextTick()
    expect(panel.find('.trp-panel').exists()).toBe(true)
    expect(panel.text()).toContain('转业 · 转型推荐')
    expect(panel.find('.trp-empty').text()).toContain('先补充技能图谱与人脉')
    expect((panel.find('.trp-run').element as HTMLButtonElement).disabled).toBe(true)
    panel.unmount()
  })

  it('有技能时生成推荐并渲染推荐卡', async () => {
    mockStore['hf:career:skills'] = [
      { id: 's1', name: 'Vue', category: 'technical', proficiency: 'advanced', proficiencyScore: 70, yearsOfExperience: 3, relatedPositions: [], prerequisites: [], complements: [], isCore: true },
      { id: 's2', name: '沟通', category: 'soft', proficiency: 'intermediate', proficiencyScore: 50, yearsOfExperience: 2, relatedPositions: [], prerequisites: [], complements: [], isCore: false },
    ]
    const w = await getWrapper()
    await w.vm.$nextTick()
    expect((w.find('.trp-run').element as HTMLButtonElement).disabled).toBe(false)

    await w.find('.trp-run').trigger('click')
    await w.vm.$nextTick()
    expect(w.find('.trp-summary').exists()).toBe(true)
    const cards = w.findAll('.trp-card')
    expect(cards.length).toBeGreaterThan(0)
    expect(w.text()).toContain('% 匹配')
  })

  it('推荐卡展示四维匹配条与转型策略', async () => {
    mockStore['hf:career:skills'] = [
      { id: 's1', name: 'Vue', category: 'technical', proficiency: 'advanced', proficiencyScore: 70, yearsOfExperience: 3, relatedPositions: [], prerequisites: [], complements: [], isCore: true },
    ]
    const w = await getWrapper()
    await w.vm.$nextTick()
    await w.find('.trp-run').trigger('click')
    await w.vm.$nextTick()

    const firstCard = w.findAll('.trp-card')[0]
    expect(firstCard).toBeDefined()
    expect(firstCard.findAll('.trp-bar')).toHaveLength(4)
    expect(firstCard.text()).toContain('技能')
    expect(firstCard.text()).toContain('人脉')
    expect(firstCard.text()).toContain('里程碑')
    expect(firstCard.text()).toContain('市场')
    expect(firstCard.text()).toContain('个月')
  })

  it('技能缺口展示缺口名称与优先级', async () => {
    mockStore['hf:career:skills'] = [
      { id: 's1', name: 'Vue', category: 'technical', proficiency: 'advanced', proficiencyScore: 70, yearsOfExperience: 3, relatedPositions: [], prerequisites: [], complements: [], isCore: true },
    ]
    const w = await getWrapper()
    await w.vm.$nextTick()
    await w.find('.trp-run').trigger('click')
    await w.vm.$nextTick()

    expect(w.find('.trp-gaps').exists()).toBe(true)
    expect(w.findAll('.trp-gap').length).toBeGreaterThan(0)
    expect(w.text()).toContain('技能缺口')
  })
})

// =============================================================
// 集成：影响力分析面板（INCR-232：补挂载孤儿面板 InfluenceAnalysisPanel）
// =============================================================

describe('集成：影响力分析面板', () => {
  const CONTACTS = [
    { id: 'c-001', name: '张老师', role: '导师', tier: 'core', nodeType: 'mentor', affinity: 10, tags: ['技术指导'], note: '' },
    { id: 'c-002', name: '李工', role: '后端', tier: 'core', nodeType: 'colleague', affinity: 9, tags: [], note: '' },
    { id: 'c-003', name: '赵前端', role: '前端', tier: 'active', nodeType: 'peer', affinity: 6, tags: [], note: '' },
  ]
  const CONNS = [
    { id: 'x1', fromId: 'c-001', toId: 'c-002', type: 'strong', description: '合作' },
    { id: 'x2', fromId: 'c-001', toId: 'c-003', type: 'medium', description: '' },
    { id: 'x3', fromId: 'c-002', toId: 'c-003', type: 'weak', description: '' },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    for (const key of Object.keys(mockStore)) {
      delete mockStore[key]
    }
    document.querySelectorAll('.career-modal-overlay').forEach(el => el.remove())
  })

  async function mountSeeded(contacts: any[], conns: any[]) {
    mockStore['career:contacts'] = contacts
    mockStore['career:connections'] = conns
    const w = await getWrapper()
    await w.vm.$nextTick()
    return w
  }

  it('挂载后渲染面板骨架与影响力标题', async () => {
    const w = await mountSeeded(CONTACTS, CONNS)
    expect(w.find('.iap').exists()).toBe(true)
    expect(w.text()).toContain('影响力分析')
    expect(w.text()).toContain('健康度')
  })

  it('有联系人时渲染网络健康环与 6 项健康指标', async () => {
    const w = await mountSeeded(CONTACTS, CONNS)
    expect(w.find('.iap-health-ring').exists()).toBe(true)
    expect(w.text()).toContain('健康度')
    // 健康度网格共 6 项指标
    expect(w.findAll('.iap-health-item').length).toBe(6)
  })

  it('渲染影响力排行行与趋势标签', async () => {
    const w = await mountSeeded(CONTACTS, CONNS)
    expect(w.findAll('.iap-rank-row').length).toBeGreaterThan(0)
    expect(w.text()).toContain('影响力排行')
    expect(w.text()).toContain('张老师')
    expect(w.find('.iap-rank-trend').exists()).toBe(true)
  })

  it('点击排行条目展示所选联系人的中心度与传播力', async () => {
    const w = await mountSeeded(CONTACTS, CONNS)
    const firstRow = w.findAll('.iap-rank-row')[0]
    expect(firstRow).toBeDefined()
    await firstRow.trigger('click')
    await w.vm.$nextTick()
    expect(w.find('.iap-centrality').exists()).toBe(true)
    expect(w.text()).toContain('中心度')
    expect(w.findAll('.iap-cent-item').length).toBe(5)
  })

  // ============================================================
  // 学习路径面板（INCR-269：薄委托化挂载 LearningPathPanel 至业脉）
  // 引擎 useLearningPath 有状态：经 storage.getKV/setKV('hf:career_learning_paths') 持久化，测试直接 seed mockStore；
  // analyzeSkillGaps 对未掌握技能以 novice(内置 -1) 起算 → 新技能注定产生缺口，无需 seed 技能图谱亦可确定性驱动
  // ============================================================
  describe('集成：学习路径面板', () => {
    const LP_KEY = 'hf:career_learning_paths'

    function lpp(w: any) {
      const el = w.find('.lpp')
      expect(el.exists()).toBe(true)
      return el
    }

    function findLppBtn(w: any, text: string) {
      const btn = lpp(w).findAll('.lpp-btn').find((b: any) => b.text().includes(text))
      expect(btn).toBeTruthy()
      return btn
    }

    function seedPath() {
      mockStore[LP_KEY] = [{
        id: 'lp1',
        type: 'linear',
        name: '测试学习路径',
        description: '',
        targetRole: '技术负责人',
        nodes: [{
          id: 'n1', skillId: 's1', skillName: 'Vue', level: 1, prerequisites: [],
          estimatedHours: 40, actualHours: 0, completed: false,
          resources: [], description: '',
        }],
        totalEstimatedHours: 40, totalActualHours: 0, progress: 0,
        createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-02T00:00:00Z',
      }]
    }

    it('渲染骨架标题、副题与四指标', async () => {
      const w = await getWrapper()
      const el = lpp(w)
      expect(el.text()).toContain('🧭 学习路径')
      expect(el.text()).toContain('把技能缺口拆成可执行的路径，一步步走完')
      expect(el.findAll('.lpp-metric').length).toBe(4)
      expect(el.text()).toContain('路径总数')
      expect(el.text()).toContain('进行中')
      expect(el.text()).toContain('已完成')
      expect(el.text()).toContain('平均进度')
    })

    it('无路径时显示空态与零指标', async () => {
      const w = await getWrapper()
      const el = lpp(w)
      expect(el.find('.lpp-empty').exists()).toBe(true)
      expect(el.text()).toContain('还没有学习路径，先分析技能缺口并生成一条吧')
      expect(el.findAll('.lpp-metric b')[0].text()).toBe('0')
    })

    it('无必需技能时「分析缺口」按钮禁用', async () => {
      const w = await getWrapper()
      const disabled = lpp(w).findAll('.lpp-btn').filter((b: any) => b.attributes('disabled') !== undefined)
      expect(disabled.length).toBeGreaterThan(0)
    })

    it('添加必需技能生成芯片', async () => {
      const w = await getWrapper()
      await lpp(w).find('.lpp-input--sm').setValue('设计')
      await findLppBtn(w, '添加').trigger('click')
      await w.vm.$nextTick()
      const el = lpp(w)
      expect(el.findAll('.lpp-chip').length).toBe(1)
      expect(el.text()).toContain('设计 · 技术技能 → 中级')
    })

    it('分析缺口展示缺口列表与时长的', async () => {
      const w = await getWrapper()
      await lpp(w).find('.lpp-input--sm').setValue('设计')
      await findLppBtn(w, '添加').trigger('click')
      await findLppBtn(w, '分析缺口').trigger('click')
      await w.vm.$nextTick()
      const el = lpp(w)
      expect(el.findAll('.lpp-gap').length).toBe(1)
      expect(el.text()).toContain('设计')
      expect(el.find('.lpp-gap-hours').text()).toContain('h')
    })

    it('生成学习路径后展示路径并更新指标', async () => {
      const w = await getWrapper()
      await lpp(w).find('.lpp-input').setValue('技术负责人')
      await lpp(w).find('.lpp-input--sm').setValue('设计')
      await findLppBtn(w, '添加').trigger('click')
      await findLppBtn(w, '分析缺口').trigger('click')
      await findLppBtn(w, '生成学习路径').trigger('click')
      await w.vm.$nextTick()
      const el = lpp(w)
      expect(el.findAll('.lpp-path').length).toBe(1)
      expect(el.find('.lpp-path-name').text()).toContain('技术负责人')
      expect(el.findAll('.lpp-metric b')[0].text()).toBe('1')
    })

    it('展示已存路径并可展开/收起节点', async () => {
      seedPath()
      const w = await getWrapper()
      const el = lpp(w)
      expect(el.find('.lpp-path-name').text()).toContain('测试学习路径')
      expect(el.find('.lpp-path-meta').text()).toContain('目标：技术负责人 · 1 节点 · 40h')
      expect(el.find('.lpp-path-pct').text()).toContain('0%')
      expect(el.find('.lpp-path-done').text()).toContain('0/1 已完成')
      await el.find('.lpp-path-toggle').trigger('click')
      await w.vm.$nextTick()
      expect(el.findAll('.lpp-node').length).toBe(1)
      expect(el.find('.lpp-node-name').text()).toContain('Vue')
    })

    it('勾选节点更新完成计数', async () => {
      seedPath()
      const w = await getWrapper()
      const el = lpp(w)
      await el.find('.lpp-path-toggle').trigger('click')
      await w.vm.$nextTick()
      await el.find('.lpp-node-check').trigger('click')
      await w.vm.$nextTick()
      expect(el.find('.lpp-path-done').text()).toContain('1/1 已完成')
    })
  })
})