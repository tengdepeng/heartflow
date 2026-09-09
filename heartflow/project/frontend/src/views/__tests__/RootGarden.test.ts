// ============================================================
// RootGarden 根花园视图测试
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

// ---- 模拟存储 ----
const mockStore: Record<string, any> = {}
const mockGetKV = vi.fn((_key: string, def: any) => mockStore[_key] ?? def)
const mockSetKV = vi.fn((key: string, val: any) => { mockStore[key] = val })

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (...args: any[]) => (mockGetKV as any)(...args),
    setKV: (...args: any[]) => (mockSetKV as any)(...args),
  },
}))

// ---- 辅助函数 ----
async function createWrapper() {
  const { default: RootGarden } = await import('../RootGarden.vue')
  return mount(RootGarden, { attachTo: document.body })
}

// 构造一个根系数据（补齐 roots 模块全字段，供根系可视化面板安全消费）
function makeRoot(overrides: Record<string, any> = {}) {
  return {
    id: `rt${Date.now()}${Math.random().toString(36).slice(2, 4)}`,
    layer: 'soil' as const,
    text: '默认根系',
    detail: '',
    era: '',
    icon: '🪨',
    _expanded: false,
    strength: 0.5,
    connections: [] as string[],
    tags: [] as string[],
    color: '#8a9a7a',
    willId: null,
    lastUpdatedAt: new Date().toISOString(),
    ...overrides,
  }
}

// ---- 测试 ----
describe('RootGarden 根花园视图', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore['hf:roots_v2'] = []
  })

  // ------- 渲染标题 -------
  it('渲染页面标题和描述', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.text()).toContain('根脉之庭')
    expect(wrapper.text()).toContain('追溯')
  })

  // ------- 空状态提示 -------
  it('没有任何根系时显示空状态提示', async () => {
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('溯源树还在等待生长')
    expect(wrapper.text()).toContain('在时间长廊里偶遇一段旧记忆时')
  })

  it('有空状态时统计显示为 0', async () => {
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()
    const statNums = wrapper.findAll('.stat-num')
    expect(statNums.length).toBe(4)
    statNums.forEach(num => {
      expect(num.text()).toBe('0')
    })
  })

  // ------- 渲染统计 -------
  it('有数据时正确显示统计数量', async () => {
    mockStore['hf:roots_v2'] = [
      makeRoot({ id: 'r1', layer: 'soil', text: '原生家庭' }),
      makeRoot({ id: 'r2', layer: 'soil', text: '故乡记忆' }),
      makeRoot({ id: 'r3', layer: 'era', text: '大学时代' }),
      makeRoot({ id: 'r4', layer: 'branch', text: '信念形成' }),
    ]
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()
    // 总记录: 4, 根系: 2, 树干: 1, 枝桠: 1
    const statNums = wrapper.findAll('.stat-num')
    expect(statNums[0].text()).toBe('4')
    expect(statNums[1].text()).toBe('2')
    expect(statNums[2].text()).toBe('1')
    expect(statNums[3].text()).toBe('1')
  })

  // ------- 渲染情绪列表（各层） -------
  it('渲染根系（soil）层数据', async () => {
    mockStore['hf:roots_v2'] = [
      makeRoot({ id: 'r1', layer: 'soil', text: '童年记忆', era: '1990s' }),
    ]
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('童年记忆')
    expect(wrapper.text()).toContain('原生土壤')
  })

  it('渲染树干（era）层数据', async () => {
    mockStore['hf:roots_v2'] = [
      makeRoot({ id: 'r2', layer: 'era', text: '高中时期', era: '2005-2008' }),
    ]
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('高中时期')
    expect(wrapper.text()).toContain('时代与成长')
  })

  it('渲染枝桠（branch）层数据', async () => {
    mockStore['hf:roots_v2'] = [
      makeRoot({ id: 'r3', layer: 'branch', text: '读《活着》', era: '2010' }),
    ]
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('读《活着》')
    expect(wrapper.text()).toContain('分化与选择')
  })

  // ------- 展开/收起详情 -------
  it('点击卡片展开详情', async () => {
    mockStore['hf:roots_v2'] = [
      makeRoot({ id: 'r1', layer: 'soil', text: '童年', detail: '一个遥远的夏天', _expanded: false }),
    ]
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()
    // 初始未展开，不显示详情
    expect(wrapper.text()).not.toContain('一个遥远的夏天')
    // 点击卡片展开
    const card = wrapper.find('.root-card')
    await card.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('一个遥远的夏天')
  })

  it('点击已展开的卡片收起详情', async () => {
    mockStore['hf:roots_v2'] = [
      makeRoot({ id: 'r1', layer: 'soil', text: '童年', detail: '一个遥远的夏天', _expanded: false }),
    ]
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()
    // 初始未展开
    expect(wrapper.text()).not.toContain('一个遥远的夏天')
    // 第一次点击展开
    const card = wrapper.find('.root-card')
    await card.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('一个遥远的夏天')
    expect(card.classes()).toContain('expanded')
    // 第二次点击收起
    await card.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).not.toContain('一个遥远的夏天')
    expect(card.classes()).not.toContain('expanded')
  })

  // ------- 添加根系 ----
  it('填写表单并添加根系', async () => {
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()
    // 填写文本
    const textInput = wrapper.find('.rt-input')
    await textInput.setValue('测试根系')
    // 点击添加按钮
    const addBtn = wrapper.find('.rt-btn')
    await addBtn.trigger('click')
    await wrapper.vm.$nextTick()
    expect(mockSetKV).toHaveBeenCalled()
    const saved = mockStore['hf:roots_v2']
    expect(saved.length).toBeGreaterThanOrEqual(1)
    expect(saved[0].text).toBe('测试根系')
  })

  it('输入为空时添加按钮禁用', async () => {
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()
    const addBtn = wrapper.find('.rt-btn')
    expect(addBtn.attributes('disabled')).toBeDefined()
  })

  // ------- 删除根系 -------
  it('点击删除按钮移除根系', async () => {
    mockStore['hf:roots_v2'] = [
      makeRoot({ id: 'r1', layer: 'soil', text: '待删除' }),
      makeRoot({ id: 'r2', layer: 'era', text: '保留' }),
    ]
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()
    const delBtns = wrapper.findAll('.root-del')
    expect(delBtns.length).toBe(2)
    await delBtns[0].trigger('click')
    await wrapper.vm.$nextTick()
    expect(mockStore['hf:roots_v2']).toHaveLength(1)
    expect(mockStore['hf:roots_v2'][0].text).toBe('保留')
  })

  // ------- 添加带详情的根系 -------
  it('添加根系时保存详情和时期', async () => {
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()
    // 选择层
    const select = wrapper.find('.rt-select')
    await select.setValue('era')
    // 填写文本
    const inputs = wrapper.findAll('.rt-input')
    await inputs[0].setValue('大学时光')
    // 填写时期
    await inputs[1].setValue('2010-2014')
    // 填写详情
    const textarea = wrapper.find('.rt-textarea')
    await textarea.setValue('四年学习与成长')
    // 添加
    const addBtn = wrapper.find('.rt-btn')
    await addBtn.trigger('click')
    await wrapper.vm.$nextTick()
    const saved = mockStore['hf:roots_v2']
    expect(saved.length).toBe(1)
    expect(saved[0].text).toBe('大学时光')
    expect(saved[0].era).toBe('2010-2014')
    expect(saved[0].detail).toBe('四年学习与成长')
    expect(saved[0].layer).toBe('era')
  })

  // ------- 溯源树 SVG 可视化 -------
  it('渲染溯源树 SVG 可视化区域', async () => {
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()
    const svg = wrapper.find('.tree-svg')
    expect(svg.exists()).toBe(true)
    // SVG 内应包含三个层级的中文标签
    expect(svg.text()).toContain('根系')
    expect(svg.text()).toContain('树干')
    expect(svg.text()).toContain('枝桠')
  })

  it('溯源树 SVG 显示三个层级完整标签', async () => {
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('根系 · 原生土壤')
    expect(wrapper.text()).toContain('树干 · 时代与成长')
    expect(wrapper.text()).toContain('枝桠 · 分化与选择')
  })

  it('有数据时溯源树渲染节点圆点', async () => {
    mockStore['hf:roots_v2'] = [
      makeRoot({ id: 'r1', layer: 'soil', text: '原生家庭' }),
      makeRoot({ id: 'r2', layer: 'era', text: '大学时代' }),
      makeRoot({ id: 'r3', layer: 'branch', text: '信念形成' }),
    ]
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()
    const circles = wrapper.findAll('.tree-node')
    expect(circles.length).toBe(3)
  })

  it('悬浮节点时显示工具提示', async () => {
    mockStore['hf:roots_v2'] = [
      makeRoot({ id: 'r1', layer: 'soil', text: '原生家庭', era: '1990s', detail: '温暖和睦的家庭氛围' }),
    ]
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()
    const circle = wrapper.find('.tree-node')
    expect(circle.exists()).toBe(true)
    await circle.trigger('mouseenter')
    await wrapper.vm.$nextTick()
    const tooltip = wrapper.find('.tree-tooltip')
    expect(tooltip.exists()).toBe(true)
    expect(tooltip.text()).toContain('原生家庭')
    expect(tooltip.text()).toContain('1990s')
    expect(tooltip.text()).toContain('温暖和睦的家庭氛围')
  })

  it('无数据时溯源树不渲染节点圆点', async () => {
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()
    const circles = wrapper.findAll('.tree-node')
    expect(circles.length).toBe(0)
  })

  // ============================================================
  // 集成：根系可视化面板（INCR-163：补挂载 claim-but-orphan 面板）
  // ============================================================

  it('有根系时集成渲染根系可视化面板', async () => {
    mockStore['hf:roots_v2'] = [
      makeRoot({ id: 'r1', layer: 'soil', text: '原生家庭', tags: ['家庭'] }),
      makeRoot({ id: 'r2', layer: 'soil', text: '故乡记忆', tags: ['家庭'] }),
      makeRoot({ id: 'r3', layer: 'era', text: '大学时代', era: '大学' }),
      makeRoot({ id: 'r4', layer: 'branch', text: '信念形成' }),
    ]
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.rvp').exists()).toBe(true)
    expect(wrapper.text()).toContain('根系可视化')
    expect(wrapper.text()).toContain('生命力')
    expect(wrapper.text()).toContain('根脉图谱')
  })

  it('根系可视化面板渲染生命力与图谱元素', async () => {
    mockStore['hf:roots_v2'] = [
      makeRoot({ id: 'r1', layer: 'soil', text: '原生家庭' }),
      makeRoot({ id: 'r2', layer: 'era', text: '大学时代' }),
      makeRoot({ id: 'r3', layer: 'branch', text: '信念形成' }),
    ]
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.rvp-vitality-ring').exists()).toBe(true)
    expect(wrapper.find('.rvp-tree-svg').exists()).toBe(true)
  })

  it('无根系时根系可视化面板不渲染', async () => {
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.rvp').exists()).toBe(false)
  })
})