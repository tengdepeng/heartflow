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

// ============================================================
// 集成：版本留档面板 KnowledgeVersionPanel（INCR-260 补挂载孤儿组件）
// 引擎 modules/knowledge 的 useVersionManager 为全库唯一消费方（经略阁已挂载
// KnowledgeArchivePanel/StewardPanel/DecisionAnalysisPanel/FlashcardsPanel，
// 但无「节点快照 · 变更追踪 · 回滚预览」版本留档视角，面板空态文案「先在经略阁
// 添加节点」直接指宿主）；版本数据走 storage 键 hf:knowledge:versions（getKV/
// setKV），useVersionManager 每次调用新建局部 ref → 无模块级污染；组件零 props、
// 零 emits，onMounted 仅 loadVersions + 自动选中首个有留档节点。宿主 KnowledgeTower
// 的 mount 为全量渲染（子面板真实挂载），此处直接在视图级断言面板行为。
// ============================================================
describe('KnowledgeTower 版本留档集成', () => {
  const K_VERSIONS = 'hf:knowledge:versions'
  const K_NODES = 'hf:knowledge_nodes'

  beforeEach(() => {
    vi.clearAllMocks()
    mockStore[K_NODES] = []
    mockStore[K_VERSIONS] = []
  })

  afterEach(() => {
    document.body.querySelectorAll('.kt-modal-overlay').forEach(el => el.remove())
  })

  function node(id: string, title: string, cat = 'concept') {
    return { id, title, desc: '', cat, links: [], tags: [] }
  }

  function version(id: string, nodeId: string, v: number, overrides: Record<string, any> = {}) {
    return {
      id,
      nodeId,
      version: v,
      title: `版本标题${v}`,
      desc: `版本描述${v}`,
      tags: ['标签A'],
      category: 'concept',
      changeType: 'update',
      changeDescription: `更新说明${v}`,
      changedAt: '2026-09-01T10:00:00.000Z',
      ...overrides,
    }
  }

  it('渲染版本留档面板骨架（标题/副题/统计/空态）', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.kvp').exists()).toBe(true)
    expect(wrapper.text()).toContain('📜 版本留档')
    expect(wrapper.text()).toContain('节点快照 · 变更追踪 · 回滚预览')
    // 统计三块：总快照/留档节点/平均每节点
    const stats = wrapper.findAll('.kvp-stat')
    expect(stats.length).toBe(3)
    expect(stats[0].text()).toContain('0')
    expect(stats[0].text()).toContain('总快照')
    // 无节点时显示空态
    expect(wrapper.text()).toContain('还没有知识节点。先在经略阁添加节点')
  })

  it('有节点无留档时显示全部节点并可选中', async () => {
    mockStore[K_NODES] = [node('kn1', '概念节点'), node('kn2', '法则节点')]
    const wrapper = await getWrapper()
    expect(wrapper.find('.kvp-empty').exists()).toBe(false)
    // 「全部节点」分组列出两个节点
    const chips = wrapper.findAll('.kvp-chip')
    expect(chips.length).toBe(2)
    expect(chips[0].text()).toContain('概念节点')
    // 选中节点后出现捕获快照按钮与子空态
    await chips[0].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('捕获快照')
    expect(wrapper.text()).toContain('这个节点还没有留档')
  })

  it('捕获快照生成 v1 并写回存储', async () => {
    mockStore[K_NODES] = [node('kn1', '概念节点')]
    const wrapper = await getWrapper()
    const chips = wrapper.findAll('.kvp-chip')
    await chips[0].trigger('click')
    await wrapper.vm.$nextTick()
    const snapBtn = wrapper.findAll('button').find(b => b.text().includes('捕获快照'))
    await snapBtn!.trigger('click')
    await wrapper.vm.$nextTick()
    // 版本已写回存储
    expect(mockStore[K_VERSIONS]).toHaveLength(1)
    expect(mockStore[K_VERSIONS][0].nodeId).toBe('kn1')
    expect(mockStore[K_VERSIONS][0].version).toBe(1)
    expect(mockStore[K_VERSIONS][0].changeDescription).toBe('手动留档')
    expect(wrapper.text()).toContain('已捕获 v1')
    // 统计更新：总快照 1
    expect(wrapper.findAll('.kvp-stat')[0].text()).toContain('1')
  })

  it('已有留档节点显示版本列表与差异对比', async () => {
    mockStore[K_NODES] = [node('kn1', '概念节点')]
    mockStore[K_VERSIONS] = [
      version('ver-2', 'kn1', 2, { changeType: 'update', changeDescription: '第二次更新' }),
      version('ver-1', 'kn1', 1, { changeType: 'create', changeDescription: '创建留档' }),
    ]
    const wrapper = await getWrapper()
    // 自动选中首个有留档节点，展示版本条目
    expect(wrapper.findAll('.kvp-version').length).toBe(2)
    expect(wrapper.text()).toContain('v2')
    expect(wrapper.text()).toContain('第二次更新')
    expect(wrapper.text()).toContain('v1')
    expect(wrapper.text()).toContain('创建留档')
    // 「已有留档」分组带计数
    const groupLabel = wrapper.findAll('.kvp-group-label').find(g => g.text().includes('已有留档'))
    expect(groupLabel).toBeDefined()
  })

  it('展开版本显示快照详情与回滚按钮', async () => {
    mockStore[K_NODES] = [node('kn1', '概念节点')]
    mockStore[K_VERSIONS] = [version('ver-1', 'kn1', 1, { changeType: 'create' })]
    const wrapper = await getWrapper()
    const head = wrapper.find('.kvp-version-head')
    await head.trigger('click')
    await wrapper.vm.$nextTick()
    // 快照详情
    expect(wrapper.find('.kvp-snapshot').exists()).toBe(true)
    expect(wrapper.text()).toContain('版本标题1')
    expect(wrapper.text()).toContain('版本描述1')
    expect(wrapper.text()).toContain('标签A')
    // 回滚按钮
    expect(wrapper.text()).toContain('↩ 回滚到此版本')
  })

  it('回滚预览展示恢复内容并生成回滚记录', async () => {
    mockStore[K_NODES] = [node('kn1', '概念节点')]
    mockStore[K_VERSIONS] = [
      version('ver-2', 'kn1', 2, { changeType: 'update' }),
      version('ver-1', 'kn1', 1, { changeType: 'create', title: '旧版标题', desc: '旧版描述', tags: ['旧标签'] }),
    ]
    const wrapper = await getWrapper()
    // 展开 v1（第二个版本条目）
    const heads = wrapper.findAll('.kvp-version-head')
    await heads[1].trigger('click')
    await wrapper.vm.$nextTick()
    const rollbackBtn = wrapper.findAll('button').find(b => b.text().includes('回滚到此版本'))
    await rollbackBtn!.trigger('click')
    await wrapper.vm.$nextTick()
    // 回滚生成提示（回滚后列表折叠，恢复内容在存储侧生效）
    expect(wrapper.text()).toContain('已回滚到 v1')
    expect(wrapper.text()).toContain('并生成一条回滚记录')
    // 生成回滚记录（major_update）
    const versions = mockStore[K_VERSIONS]
    expect(versions.length).toBe(3)
    expect(versions[versions.length - 1].changeType).toBe('major_update')
  })

  it('节点无留档时「已有留档」分组不出现', async () => {
    mockStore[K_NODES] = [node('kn1', '概念节点')]
    const wrapper = await getWrapper()
    const groupLabels = wrapper.findAll('.kvp-group-label').map(g => g.text())
    expect(groupLabels).not.toContain('已有留档')
    expect(groupLabels).toContain('全部节点')
  })
})

// ============================================================
// 集成：间隔复习面板 knowledge-tower/SpacedReviewPanel（INCR-278 补挂载孤儿组件）
// 引擎 modules/knowledge 的 useSpacedReview 为全库唯一消费方（经略阁已挂载
// KnowledgeArchivePanel/StewardPanel/DecisionAnalysisPanel/FlashcardsPanel/
// KnowledgeVersionPanel，但无「艾宾浩斯遗忘曲线 · 到期提醒 · 熟练度追踪」复习视角，
// 面板空态文案「先在经略阁添加节点」直接指宿主）；复习计划走 storage 键
// hf:knowledge:review_plans（loadPlans/savePlans getKV/setKV），useSpacedReview
// 每次调用新建局部 ref → 无模块级污染；知识节点源 getNodes() 读 hf:knowledge_nodes
// 为非响应式纯函数 → seed 需先于 mount。组件零 props、零 emits，onMounted 仅
// loadPlans + computeReviewStats。宿主 KnowledgeTower 的 mount 为全量渲染，此处
// 直接在视图级断言面板行为。
// ============================================================
describe('KnowledgeTower 间隔复习集成', () => {
  const K_NODES = 'hf:knowledge_nodes'
  const K_REVIEW = 'hf:knowledge:review_plans'
  // 引擎以 new Date().toISOString() 为锚（UTC 日）——测试种子日期须与之一致
  const todayStr = new Date().toISOString().split('T')[0]
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0]

  function node(id: string, title: string, cat = 'concept', tags: string[] = []) {
    return { id, title, desc: `${title}要点`, cat, links: [], tags }
  }

  function planItem(nodeId: string, title: string, mastery: number, overrides: Record<string, any> = {}) {
    return {
      nodeId,
      title,
      category: 'concept',
      reviewCount: 1,
      lastReviewedAt: todayStr,
      nextReviewAt: tomorrowStr,
      due: false,
      mastery,
      difficulty: 0.5,
      ...overrides,
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockStore[K_NODES] = []
    mockStore[K_REVIEW] = []
  })

  afterEach(() => {
    document.body.querySelectorAll('.kt-modal-overlay').forEach(el => el.remove())
  })

  it('无节点无计划时展示标题与空态', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.srp').exists()).toBe(true)
    expect(wrapper.text()).toContain('🕐 间隔复习')
    expect(wrapper.text()).toContain('艾宾浩斯遗忘曲线 · 到期提醒 · 熟练度追踪')
    expect(wrapper.find('.srp-empty').exists()).toBe(true)
    expect(wrapper.text()).toContain('还没有知识节点。先在经略阁添加节点')
  })

  it('有节点无计划时展示待纳入CTA与生成按钮', async () => {
    mockStore[K_NODES] = [node('kn_a', '艾宾浩斯曲线'), node('kn_b', '间隔效应')]
    const wrapper = await getWrapper()
    expect(wrapper.find('.srp-block--cta').exists()).toBe(true)
    expect(wrapper.text()).toContain('共 2 个知识节点待纳入复习节奏。')
    const genBtn = wrapper.findAll('button').find(b => b.text().includes('生成今日复习计划'))
    expect(genBtn).toBeDefined()
  })

  it('点击生成今日复习计划后展示统计与复习卡片', async () => {
    // 难度 = tags*0.1+0.3 → kn_b(0.5) 高于 kn_a(0.4)，排序后 kn_b 在前
    mockStore[K_NODES] = [
      node('kn_a', '艾宾浩斯曲线', 'concept', ['记忆']),
      node('kn_b', '间隔效应', 'rule', ['记忆', '学习']),
    ]
    const wrapper = await getWrapper()
    const genBtn = wrapper.findAll('button').find(b => b.text().includes('生成今日复习计划'))
    await genBtn!.trigger('click')
    await wrapper.vm.$nextTick()
    // 统计总览出现（今日到期 2）
    expect(wrapper.find('.srp-stats').exists()).toBe(true)
    expect(wrapper.text()).toContain('今日到期')
    expect(wrapper.text()).toContain('间隔效应')
    // 复习卡片展示首个节点
    expect(wrapper.find('.srp-card').exists()).toBe(true)
    expect(wrapper.find('.srp-card').text()).toContain('间隔效应')
    // 计划已写回存储
    expect(mockStore[K_REVIEW]).toHaveLength(1)
    expect(mockStore[K_REVIEW][0].date).toBe(todayStr)
    expect(mockStore[K_REVIEW][0].items).toHaveLength(2)
  })

  it('点击卡片翻面展示要点内容', async () => {
    mockStore[K_NODES] = [node('kn_a', '艾宾浩斯曲线', 'concept', ['记忆'])]
    const wrapper = await getWrapper()
    const genBtn = wrapper.findAll('button').find(b => b.text().includes('生成今日复习计划'))
    await genBtn!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.srp-front').isVisible()).toBe(true)
    await wrapper.find('.srp-card').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.srp-card').classes()).toContain('flipped')
    expect(wrapper.text()).toContain('艾宾浩斯曲线要点')
    expect(wrapper.text()).toContain('还没记住')
    expect(wrapper.text()).toContain('记得')
  })

  it('点击「记得」记录复习并推进到下一项', async () => {
    mockStore[K_NODES] = [
      node('kn_a', '艾宾浩斯曲线', 'concept', ['记忆']),
      node('kn_b', '间隔效应', 'rule', ['记忆', '学习']),
    ]
    const wrapper = await getWrapper()
    const genBtn = wrapper.findAll('button').find(b => b.text().includes('生成今日复习计划'))
    await genBtn!.trigger('click')
    await wrapper.vm.$nextTick()
    // 复习 kn_b → 翻面 → 记得
    expect(wrapper.find('.srp-card').text()).toContain('间隔效应')
    await wrapper.find('.srp-card').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.find('.srp-quality--good').trigger('click')
    await wrapper.vm.$nextTick()
    // 推进到 kn_a，且 mastery 已提升并写回存储
    expect(wrapper.find('.srp-card').text()).toContain('艾宾浩斯曲线')
    expect(mockStore[K_REVIEW][0].items.find((i: any) => i.nodeId === 'kn_b').mastery).toBe(0.15)
    expect(mockStore[K_REVIEW][0].items.find((i: any) => i.nodeId === 'kn_b').due).toBe(false)
  })

  it('全部复习完成后展示完成态并写回存储', async () => {
    mockStore[K_NODES] = [node('kn_a', '艾宾浩斯曲线', 'concept', ['记忆'])]
    const wrapper = await getWrapper()
    const genBtn = wrapper.findAll('button').find(b => b.text().includes('生成今日复习计划'))
    await genBtn!.trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.find('.srp-card').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.find('.srp-quality--good').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('🎉 今日复习已完成，全部掌握！')
    expect(mockStore[K_REVIEW][0].completed).toBe(true)
    expect(mockStore[K_REVIEW][0].correctCount).toBe(1)
  })

  it('点击「还没记住」后该项保持到期且熟练度降低', async () => {
    mockStore[K_NODES] = [node('kn_a', '艾宾浩斯曲线', 'concept', ['记忆'])]
    const wrapper = await getWrapper()
    const genBtn = wrapper.findAll('button').find(b => b.text().includes('生成今日复习计划'))
    await genBtn!.trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.find('.srp-card').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.find('.srp-quality--forgot').trigger('click')
    await wrapper.vm.$nextTick()
    expect(mockStore[K_REVIEW][0].incorrectCount).toBe(1)
    const item = mockStore[K_REVIEW][0].items[0]
    expect(item.mastery).toBe(0)
    expect(item.due).toBe(true)
    expect(item.nextReviewAt).toBe(tomorrowStr)
  })

  it('有历史计划时统计区块展示平均熟练度与分布', async () => {
    mockStore[K_NODES] = [node('kn_a', '艾宾浩斯曲线'), node('kn_b', '间隔效应')]
    mockStore[K_REVIEW] = [{
      id: `review-plan-${todayStr}`,
      date: todayStr,
      completed: true,
      correctCount: 2,
      incorrectCount: 0,
      totalCount: 2,
      items: [
        planItem('kn_a', '艾宾浩斯曲线', 0.8),
        planItem('kn_b', '间隔效应', 0.6),
      ],
    }]
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('70%') // (0.8+0.6)/2
    expect(wrapper.text()).toContain('精通')
    expect(wrapper.text()).toContain('熟悉')
    expect(wrapper.text()).toContain('连续天数')
  })
})