// ============================================================
// KnowledgeTower 经略阁视图测试
// ============================================================
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
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
  const { default: KnowledgeTower } = await import('../KnowledgeTower.vue')
  return mount(KnowledgeTower, { attachTo: document.body })
}

describe('KnowledgeTower 经略阁视图', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore['hf:knowledge'] = []
  })

  afterEach(() => {
    // 清理 Teleport 残留
    document.body.querySelectorAll('.kt-modal-overlay').forEach(el => el.remove())
  })

  it('渲染标题和描述', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('经略阁')
    expect(wrapper.text()).toContain('知识的高塔，由你亲手搭建')
  })

  it('默认显示列表模式', async () => {
    const wrapper = await getWrapper()
    // 默认模式为 'list'，应显示列表模式的内容
    const modeTabs = wrapper.findAll('.kt-tab')
    const activeTab = modeTabs.filter(t => t.classes().includes('active'))
    expect(activeTab.length).toBeGreaterThan(0)
    expect(activeTab[0].text()).toContain('列表')
  })

  it('空状态时显示提示信息', async () => {
    const wrapper = await getWrapper()
    // 列表模式空状态
    const emptyEls = wrapper.findAll('.kt-empty')
    expect(emptyEls.length).toBeGreaterThan(0)
    expect(wrapper.text()).toContain('知识星图等待第一个节点')
  })

  it('切换到图谱模式', async () => {
    mockStore['hf:knowledge'] = [
      { id: 'kn1', title: '概念节点', desc: '描述', cat: 'concept', links: [] },
    ]
    const wrapper = await getWrapper()
    const modeTabs = wrapper.findAll('.kt-tab')
    // 找到"星图"按钮并点击
    const graphTab = modeTabs.filter(t => t.text().includes('星图'))
    await graphTab[0].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.kt-star-map-wrap').exists()).toBe(true)
    expect(wrapper.text()).toContain('概念节点')
  })

  it('切换到大纲模式', async () => {
    mockStore['hf:knowledge'] = [
      { id: 'kn1', title: '概念节点', desc: '描述', cat: 'concept', links: [] },
      { id: 'kn2', title: '法则节点', desc: '描述', cat: 'rule', links: [] },
    ]
    const wrapper = await getWrapper()
    const modeTabs = wrapper.findAll('.kt-tab')
    const outlineTab = modeTabs.filter(t => t.text().includes('大纲'))
    await outlineTab[0].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.kt-outline-section').exists()).toBe(true)
    expect(wrapper.text()).toContain('概念')
    expect(wrapper.text()).toContain('法则')
  })

  it('切换到头脑风暴模式', async () => {
    const wrapper = await getWrapper()
    const modeTabs = wrapper.findAll('.kt-tab')
    const brainstormTab = modeTabs.filter(t => t.text().includes('头脑风暴'))
    await brainstormTab[0].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.kt-storm-area').exists()).toBe(true)
    // 应有"转为节点"按钮，且初始为禁用状态
    const addBtns = wrapper.findAll('button.kt-btn')
    const convertBtn = addBtns.filter(b => b.text().includes('转为节点'))
    expect(convertBtn[0].attributes('disabled')).toBeDefined()
  })

  it('头脑风暴添加想法并转为节点', async () => {
    const wrapper = await getWrapper()
    // 先切换到头脑风暴模式
    const modeTabs = wrapper.findAll('.kt-tab')
    const brainstormTab = modeTabs.filter(t => t.text().includes('头脑风暴'))
    await brainstormTab[0].trigger('click')
    await wrapper.vm.$nextTick()
    // 输入想法
    const inputs = wrapper.findAll('.kt-input')
    const stormInput = inputs.filter(i => i.element.attributes?.getNamedItem?.('placeholder')?.value === '快速输入想法…')
    if (stormInput.length > 0) {
      await stormInput[0].setValue('测试想法')
    } else {
      // 备用：取最后一个 kt-input
      await inputs[inputs.length - 1].setValue('测试想法')
    }
    // 点击 → 按钮添加
    const addBtns = wrapper.findAll('button.kt-btn')
    const arrowBtn = addBtns.filter(b => b.text() === '→')
    await arrowBtn[0].trigger('click')
    await wrapper.vm.$nextTick()
    // 气泡应出现
    const bubbles = wrapper.findAll('.kt-storm-bubble')
    expect(bubbles.length).toBeGreaterThan(0)
    // 转为节点
    const convertBtns = addBtns.filter(b => b.text().includes('转为节点'))
    await convertBtns[0].trigger('click')
    await wrapper.vm.$nextTick()
    expect(mockSetKV).toHaveBeenCalled()
    expect(mockStore['hf:knowledge'].length).toBeGreaterThan(0)
  })

  it('切换到时间线模式', async () => {
    mockStore['hf:knowledge'] = [
      { id: 'kn1', title: '旧节点', desc: '', cat: 'concept', links: [] },
    ]
    const wrapper = await getWrapper()
    const modeTabs = wrapper.findAll('.kt-tab')
    const timelineTab = modeTabs.filter(t => t.text().includes('时间线'))
    await timelineTab[0].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.kt-timeline-group').exists()).toBe(true)
    expect(wrapper.find('.kt-tl-item').exists()).toBe(true)
  })

  it('切换到盲区地图模式', async () => {
    mockStore['hf:knowledge'] = [
      { id: 'kn1', title: '概念', desc: '', cat: 'concept', links: [] },
    ]
    const wrapper = await getWrapper()
    const modeTabs = wrapper.findAll('.kt-tab')
    const mapTab = modeTabs.filter(t => t.text().includes('盲区地图'))
    await mapTab[0].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.kt-map-row').exists()).toBe(true)
    expect(wrapper.text()).toContain('密集区')
    expect(wrapper.text()).toContain('未探索')
  })

  it('年轮模式按钮存在', async () => {
    const wrapper = await getWrapper()
    const modeTabs = wrapper.findAll('.kt-tab')
    const ringTab = modeTabs.filter(t => t.text().includes('年轮'))
    expect(ringTab.length).toBeGreaterThan(0)
    expect(ringTab[0].text()).toContain('🌲')
  })

  it('切换到年轮模式显示 SVG', async () => {
    mockStore['hf:knowledge'] = [
      { id: 'kn1', title: '节点一', desc: '', cat: 'concept', links: [] },
    ]
    const wrapper = await getWrapper()
    const modeTabs = wrapper.findAll('.kt-tab')
    const ringTab = modeTabs.filter(t => t.text().includes('年轮'))
    await ringTab[0].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.kt-ring-wrap').exists()).toBe(true)
    expect(wrapper.find('.kt-ring-svg').exists()).toBe(true)
  })

  it('年轮模式 SVG 渲染节点', async () => {
    mockStore['hf:knowledge'] = [
      { id: 'kn1', title: '节点一', desc: '', cat: 'concept', links: [] },
    ]
    const wrapper = await getWrapper()
    const modeTabs = wrapper.findAll('.kt-tab')
    const ringTab = modeTabs.filter(t => t.text().includes('年轮'))
    await ringTab[0].trigger('click')
    await wrapper.vm.$nextTick()
    const svg = wrapper.find('.kt-ring-svg')
    expect(svg.exists()).toBe(true)
    // SVG 中应有圆环元素
    const circles = svg.findAll('circle')
    expect(circles.length).toBeGreaterThan(0)
    // 应有 "知" 字在中心
    expect(svg.text()).toContain('知')
  })

  it('添加节点', async () => {
    const wrapper = await getWrapper()
    // 在列表模式下，填写标题并点击 +
    const inputs = wrapper.findAll('.kt-input')
    const titleInput = inputs.filter(i => i.element.attributes?.getNamedItem?.('placeholder')?.value === '知识节点…')
    if (titleInput.length > 0) {
      await titleInput[0].setValue('新知识节点')
    } else {
      await inputs[0].setValue('新知识节点')
    }
    const addBtns = wrapper.findAll('button.kt-btn')
    const plusBtn = addBtns.filter(b => b.text() === '+')
    await plusBtn[0].trigger('click')
    await wrapper.vm.$nextTick()
    expect(mockSetKV).toHaveBeenCalled()
    expect(mockStore['hf:knowledge']).toHaveLength(1)
    expect(mockStore['hf:knowledge'][0].title).toBe('新知识节点')
  })

  it('删除节点', async () => {
    mockStore['hf:knowledge'] = [
      { id: 'kn1', title: '待删除', desc: '', cat: 'concept', links: [] },
      { id: 'kn2', title: '保留', desc: '', cat: 'rule', links: [] },
    ]
    const wrapper = await getWrapper()
    // 在列表模式下，节点卡片有删除按钮
    const delBtns = wrapper.findAll('.kt-del')
    await delBtns[0].trigger('click')
    expect(mockStore['hf:knowledge']).toHaveLength(1)
    expect(mockStore['hf:knowledge'][0].title).toBe('保留')
  })

  it('编辑弹窗通过 Teleport 渲染', async () => {
    mockStore['hf:knowledge'] = [
      { id: 'kn1', title: '可编辑节点', desc: '可编辑描述', cat: 'concept', links: [] },
    ]
    const wrapper = await getWrapper()
    // 点击节点卡片触发编辑弹窗
    const nodeCards = wrapper.findAll('.kt-list-item')
    await nodeCards[0].trigger('click')
    await wrapper.vm.$nextTick()
    // Teleport 将弹窗渲染到 body 下
    const modalOverlay = document.querySelector('.kt-modal-overlay')
    expect(modalOverlay).not.toBeNull()
    expect(modalOverlay!.textContent).toContain('编辑节点')
    // 输入框的值应包含节点标题（textContent 不包含 input value，需单独检查 input）
    const formInput = document.querySelector('.kt-form-input') as HTMLInputElement
    expect(formInput).not.toBeNull()
    expect(formInput.value).toBe('可编辑节点')
  })

  it('导入来源概览卡片显示', async () => {
    mockStore['hf:import_sources'] = [
      { id: 'imp1', type: 'book', title: '测试书籍', content: '测试内容', sourceMeta: { author: '作者' }, importedAt: '2026-07-01T00:00:00Z' },
    ]
    const wrapper = await getWrapper()
    // 概览卡片应显示导入来源数量
    const overviewCards = wrapper.findAll('.overview-card')
    const importCard = overviewCards.filter(c => c.text().includes('导入来源'))
    expect(importCard.length).toBeGreaterThan(0)
    expect(importCard[0].text()).toContain('1')
  })

  it('切换到导入来源模式显示空状态', async () => {
    mockStore['hf:import_sources'] = []
    const wrapper = await getWrapper()
    const modeTabs = wrapper.findAll('.kt-tab')
    const importTab = modeTabs.filter(t => t.text().includes('导入来源'))
    await importTab[0].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('还没有导入的内容')
  })

  it('有导入来源时展示列表', async () => {
    mockStore['hf:import_sources'] = [
      { id: 'imp1', type: 'book', title: '测试书籍', content: '这是一段测试导入内容', sourceMeta: { author: '作者名' }, importedAt: '2026-07-01T00:00:00Z' },
    ]
    const wrapper = await getWrapper()
    const modeTabs = wrapper.findAll('.kt-tab')
    const importTab = modeTabs.filter(t => t.text().includes('导入来源'))
    await importTab[0].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('测试书籍')
    expect(wrapper.text()).toContain('作者名')
    expect(wrapper.find('.kt-import-item').exists()).toBe(true)
  })

  it('导入来源显示删除按钮可移除', async () => {
    mockStore['hf:import_sources'] = [
      { id: 'imp1', type: 'web', title: '待删除', content: '内容', sourceMeta: { url: 'https://example.com' }, importedAt: '2026-07-01T00:00:00Z' },
    ]
    const wrapper = await getWrapper()
    const modeTabs = wrapper.findAll('.kt-tab')
    const importTab = modeTabs.filter(t => t.text().includes('导入来源'))
    await importTab[0].trigger('click')
    await wrapper.vm.$nextTick()
    // 点击删除按钮
    const delBtns = wrapper.findAll('.kt-del')
    await delBtns[0].trigger('click')
    expect(mockStore['hf:import_sources']).toHaveLength(0)
  })
})

describe('KnowledgeTower 3D星图模式', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore['hf:knowledge'] = []
  })

  afterEach(() => {
    document.body.querySelectorAll('.kt-modal-overlay').forEach(el => el.remove())
  })

  it('3D模式按钮存在', async () => {
    const wrapper = await getWrapper()
    const modeTabs = wrapper.findAll('.kt-tab')
    const mode3d = modeTabs.filter(t => t.text().includes('3D'))
    expect(mode3d.length).toBeGreaterThan(0)
    expect(mode3d[0].text()).toContain('🌌')
  })

  it('空状态时3D星图显示提示', async () => {
    const wrapper = await getWrapper()
    const modeTabs = wrapper.findAll('.kt-tab')
    const mode3d = modeTabs.filter(t => t.text().includes('3D'))
    await mode3d[0].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('3D星图等待第一个节点')
  })

  it('有节点时切换到3D模式显示场景', async () => {
    mockStore['hf:knowledge'] = [
      { id: 'kn1', title: '3D节点', desc: '描述', cat: 'concept', links: [] },
    ]
    const wrapper = await getWrapper()
    const modeTabs = wrapper.findAll('.kt-tab')
    const mode3d = modeTabs.filter(t => t.text().includes('3D'))
    await mode3d[0].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.kt-scene-3d-wrap').exists()).toBe(true)
    expect(wrapper.find('.kt-scene-3d').exists()).toBe(true)
    expect(wrapper.find('.kt-node-3d').exists()).toBe(true)
    expect(wrapper.text()).toContain('3D节点')
  })

  it('3D模式显示中心光晕', async () => {
    mockStore['hf:knowledge'] = [
      { id: 'kn1', title: '中心', desc: '', cat: 'concept', links: [] },
    ]
    const wrapper = await getWrapper()
    const modeTabs = wrapper.findAll('.kt-tab')
    const mode3d = modeTabs.filter(t => t.text().includes('3D'))
    await mode3d[0].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.kt-scene-3d-center-glow').exists()).toBe(true)
  })
})

describe('KnowledgeTower AI管家', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore['hf:knowledge'] = []
  })

  afterEach(() => {
    document.body.querySelectorAll('.kt-modal-overlay').forEach(el => el.remove())
  })

  it('AI管家按钮存在', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.kt-steward-btn').exists()).toBe(true)
    expect(wrapper.text()).toContain('AI管家')
  })

  it('点击AI管家按钮打开面板', async () => {
    mockStore['hf:knowledge'] = [
      { id: 'kn1', title: '测试节点', desc: '描述', cat: 'concept', links: [] },
    ]
    const wrapper = await getWrapper()
    const stewardBtn = wrapper.find('.kt-steward-btn')
    await stewardBtn.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.kt-steward-panel').exists()).toBe(true)
    expect(wrapper.text()).toContain('知识洞察')
  })

  it('AI管家面板显示知识概览', async () => {
    mockStore['hf:knowledge'] = [
      { id: 'kn1', title: '节点一', desc: '描述', cat: 'concept', links: [] },
      { id: 'kn2', title: '节点二', desc: '', cat: 'rule', links: [] },
    ]
    const wrapper = await getWrapper()
    const stewardBtn = wrapper.find('.kt-steward-btn')
    await stewardBtn.trigger('click')
    await wrapper.vm.$nextTick()
    // 面板应显示节点数和关联关系数
    expect(wrapper.text()).toContain('2')
    expect(wrapper.text()).toContain('知识节点')
  })

  it('AI管家面板可关闭', async () => {
    const wrapper = await getWrapper()
    const stewardBtn = wrapper.find('.kt-steward-btn')
    await stewardBtn.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.kt-steward-panel').exists()).toBe(true)
    // 点击关闭按钮
    const closeBtn = wrapper.find('.steward-close')
    await closeBtn.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.kt-steward-panel').exists()).toBe(false)
  })

  it('AI管家面板显示分类分布', async () => {
    mockStore['hf:knowledge'] = [
      { id: 'kn1', title: '概念', desc: '', cat: 'concept', links: [] },
      { id: 'kn2', title: '法则', desc: '', cat: 'rule', links: [] },
    ]
    const wrapper = await getWrapper()
    const stewardBtn = wrapper.find('.kt-steward-btn')
    await stewardBtn.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('分类分布')
    expect(wrapper.find('.steward-cat-row').exists()).toBe(true)
  })

  it('AI管家面板显示聚焦节点选择器', async () => {
    mockStore['hf:knowledge'] = [
      { id: 'kn1', title: '节点一', desc: '', cat: 'concept', links: [] },
      { id: 'kn2', title: '节点二', desc: '', cat: 'concept', links: [] },
    ]
    const wrapper = await getWrapper()
    const stewardBtn = wrapper.find('.kt-steward-btn')
    await stewardBtn.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.steward-select').exists()).toBe(true)
    const options = wrapper.findAll('.steward-select option')
    expect(options.length).toBe(2)
  })

  it('AI管家面板显示连接建议（同分类节点）', async () => {
    mockStore['hf:knowledge'] = [
      { id: 'kn1', title: '函数式编程', desc: '', cat: 'concept', links: [] },
      { id: 'kn2', title: '不可变数据', desc: '', cat: 'concept', links: [] },
    ]
    const wrapper = await getWrapper()
    const stewardBtn = wrapper.find('.kt-steward-btn')
    await stewardBtn.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.steward-suggestion').exists()).toBe(true)
    expect(wrapper.text()).toContain('连接建议')
    expect(wrapper.text()).toContain('不可变数据')
  })

  it('AI管家面板显示深度追问', async () => {
    mockStore['hf:knowledge'] = [
      { id: 'kn1', title: '概念节点', desc: '', cat: 'concept', links: [] },
    ]
    const wrapper = await getWrapper()
    const stewardBtn = wrapper.find('.kt-steward-btn')
    await stewardBtn.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('深度追问')
    expect(wrapper.findAll('.steward-question').length).toBeGreaterThan(0)
    expect(wrapper.text()).toContain('这个概念的核心前提是什么？')
  })

  it('AI管家面板显示盲区检测', async () => {
    mockStore['hf:knowledge'] = [
      { id: 'kn1', title: '概念节点', desc: '', cat: 'concept', links: [] },
    ]
    const wrapper = await getWrapper()
    const stewardBtn = wrapper.find('.kt-steward-btn')
    await stewardBtn.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('盲区检测')
    expect(wrapper.findAll('.steward-blind-row').length).toBe(6)
    // 空分类应显示覆盖度为 0
    expect(wrapper.text()).toContain('比喻')
  })

  it('切换聚焦节点后连接建议随之更新', async () => {
    mockStore['hf:knowledge'] = [
      { id: 'kn1', title: '概念A', desc: '', cat: 'concept', links: [] },
      { id: 'kn2', title: '概念B', desc: '', cat: 'concept', links: [] },
      { id: 'kn3', title: '法则C', desc: '', cat: 'rule', links: [] },
    ]
    const wrapper = await getWrapper()
    const stewardBtn = wrapper.find('.kt-steward-btn')
    await stewardBtn.trigger('click')
    await wrapper.vm.$nextTick()
    // 默认选中第一个节点 kn1，建议应包含同分类的 kn2
    expect(wrapper.text()).toContain('概念B')
    // 切换到 kn3（法则），建议应包含同分类节点（无），此时建议区消失
    const select = wrapper.find('.steward-select')
    await select.setValue('kn3')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.steward-suggestion').exists()).toBe(false)
  })
})

describe('KnowledgeTower 关系编辑', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore['hf:knowledge'] = []
    mockStore['hf:knowledge_nodes'] = []
    mockStore['hf:knowledge_relations'] = []
  })

  it('节点编辑弹窗可以打开', async () => {
    mockStore['hf:knowledge'] = [
      { id: 'kn1', title: '关系节点', desc: '', cat: 'concept', links: [] },
    ]
    const wrapper = await getWrapper()
    const nodeCards = wrapper.findAll('.kt-list-item')
    await nodeCards[0].trigger('click')
    await wrapper.vm.$nextTick()
    const modalOverlay = document.querySelector('.kt-modal-overlay')
    expect(modalOverlay).not.toBeNull()
  })
})

describe('KnowledgeTower 树状模式', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore['hf:knowledge'] = []
    mockStore['hf:knowledge_nodes'] = []
    mockStore['hf:knowledge_relations'] = []
  })

  afterEach(() => {
    document.body.querySelectorAll('.kt-modal-overlay').forEach(el => el.remove())
  })

  it('树状模式按钮存在', async () => {
    const wrapper = await getWrapper()
    const modeTabs = wrapper.findAll('.kt-tab')
    const treeTab = modeTabs.filter(t => t.text().includes('树状'))
    expect(treeTab.length).toBeGreaterThan(0)
  })

  it('空状态时树状模式显示提示', async () => {
    const wrapper = await getWrapper()
    const modeTabs = wrapper.findAll('.kt-tab')
    const treeTab = modeTabs.filter(t => t.text().includes('树状'))
    await treeTab[0].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('知识树等待第一个节点')
  })

  it('有节点时树状模式显示根节点和分类', async () => {
    mockStore['hf:knowledge'] = [
      { id: 'kn1', title: '节点一', desc: '', cat: 'concept', links: [] },
      { id: 'kn2', title: '节点二', desc: '', cat: 'rule', links: [] },
    ]
    const wrapper = await getWrapper()
    const modeTabs = wrapper.findAll('.kt-tab')
    const treeTab = modeTabs.filter(t => t.text().includes('树状'))
    await treeTab[0].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.kt-tree-root').exists()).toBe(true)
    expect(wrapper.find('.kt-tree-root-node').exists()).toBe(true)
    expect(wrapper.text()).toContain('知识根')
  })
})

describe('KnowledgeTower 网络模式', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore['hf:knowledge'] = []
    mockStore['hf:knowledge_nodes'] = []
    mockStore['hf:knowledge_relations'] = []
  })

  afterEach(() => {
    document.body.querySelectorAll('.kt-modal-overlay').forEach(el => el.remove())
  })

  it('网络模式按钮存在', async () => {
    const wrapper = await getWrapper()
    const modeTabs = wrapper.findAll('.kt-tab')
    const netTab = modeTabs.filter(t => t.text().includes('网络'))
    expect(netTab.length).toBeGreaterThan(0)
  })

  it('无关系时网络模式显示提示', async () => {
    mockStore['hf:knowledge'] = [
      { id: 'kn1', title: '节点', desc: '', cat: 'concept', links: [] },
    ]
    const wrapper = await getWrapper()
    const modeTabs = wrapper.findAll('.kt-tab')
    const netTab = modeTabs.filter(t => t.text().includes('网络'))
    await netTab[0].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('还没有关联关系')
  })
})

describe('KnowledgeTower 画廊模式', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore['hf:knowledge'] = []
  })

  afterEach(() => {
    document.body.querySelectorAll('.kt-modal-overlay').forEach(el => el.remove())
  })

  it('画廊模式按钮存在', async () => {
    const wrapper = await getWrapper()
    const modeTabs = wrapper.findAll('.kt-tab')
    const galleryTab = modeTabs.filter(t => t.text().includes('画廊'))
    expect(galleryTab.length).toBeGreaterThan(0)
  })

  it('空状态时画廊模式显示提示', async () => {
    const wrapper = await getWrapper()
    const modeTabs = wrapper.findAll('.kt-tab')
    const galleryTab = modeTabs.filter(t => t.text().includes('画廊'))
    await galleryTab[0].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('画廊等待第一幅作品')
  })

  it('有节点时画廊显示卡片', async () => {
    mockStore['hf:knowledge'] = [
      { id: 'kn1', title: '画作一', desc: '描述', cat: 'concept', links: [] },
    ]
    const wrapper = await getWrapper()
    const modeTabs = wrapper.findAll('.kt-tab')
    const galleryTab = modeTabs.filter(t => t.text().includes('画廊'))
    await galleryTab[0].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.kt-gallery-card').exists()).toBe(true)
    expect(wrapper.text()).toContain('画作一')
  })
})

describe('KnowledgeTower 书架模式', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore['hf:knowledge'] = []
  })

  afterEach(() => {
    document.body.querySelectorAll('.kt-modal-overlay').forEach(el => el.remove())
  })

  it('书架模式按钮存在', async () => {
    const wrapper = await getWrapper()
    const modeTabs = wrapper.findAll('.kt-tab')
    const bookshelfTab = modeTabs.filter(t => t.text().includes('书架'))
    expect(bookshelfTab.length).toBeGreaterThan(0)
  })

  it('空状态时书架模式显示提示', async () => {
    const wrapper = await getWrapper()
    const modeTabs = wrapper.findAll('.kt-tab')
    const bookshelfTab = modeTabs.filter(t => t.text().includes('书架'))
    await bookshelfTab[0].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('书架等待第一本书')
  })

  it('有节点时书架显示书本', async () => {
    mockStore['hf:knowledge'] = [
      { id: 'kn1', title: '书一', desc: '', cat: 'concept', links: [] },
      { id: 'kn2', title: '书二', desc: '', cat: 'concept', links: [] },
    ]
    const wrapper = await getWrapper()
    const modeTabs = wrapper.findAll('.kt-tab')
    const bookshelfTab = modeTabs.filter(t => t.text().includes('书架'))
    await bookshelfTab[0].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.kt-bookshelf').exists()).toBe(true)
    expect(wrapper.find('.kt-book').exists()).toBe(true)
  })
})