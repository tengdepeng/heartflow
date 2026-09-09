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