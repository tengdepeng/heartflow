// ============================================================
// UnfinishedGarden 未完成花园视图测试
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

// ---- 模拟存储 ----
const mockStore: Record<string, any> = {}

const mockGetKV = vi.fn((key: string, def: any) => mockStore[key] ?? def)
const mockSetKV = vi.fn((key: string, val: any) => { mockStore[key] = val })

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (...args: any[]) => (mockGetKV as any)(...args),
    setKV: (...args: any[]) => (mockSetKV as any)(...args),
    getGoals: () => [],
    setGoals: () => {},
  },
}))

// ---- 模拟全局 confirm/alert/prompt ----
beforeEach(() => {
  (window as any).confirm = vi.fn(() => true)
  ;(window as any).alert = vi.fn()
  ;(window as any).prompt = vi.fn(() => '第3章')
})

// ---- 辅助函数 ----
function makeItem(overrides: Record<string, any> = {}) {
  const now = new Date().toISOString()
  return {
    id: `uf${Date.now()}${Math.random().toString(36).slice(2, 4)}`,
    type: 'seed',
    text: '默认种子',
    at: now,
    updatedAt: now,
    sprouted: false,
    completed: false,
    ...overrides,
  }
}

async function createWrapper() {
  const { default: UnfinishedGarden } = await import('../UnfinishedGarden.vue')
  return mount(UnfinishedGarden)
}

// ---- 测试 ----
describe('UnfinishedGarden 未完成花园视图', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore['hf:unfinished_v2'] = []
  })

  // ------- 渲染标题 -------
  it('渲染标题"未完成花园"和副标题', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.text()).toContain('未完成花园')
    expect(wrapper.text()).toContain('它们没有结束，只是暂时在这里停一停')
  })

  // ------- 渲染统计卡片 -------
  it('渲染四张统计卡片', async () => {
    const wrapper = await createWrapper()
    const statCards = wrapper.findAll('.stat-card')
    expect(statCards.length).toBe(4)
    expect(wrapper.text()).toContain('搁置种子')
    expect(wrapper.text()).toContain('未读完的书')
    expect(wrapper.text()).toContain('半截笔记')
    expect(wrapper.text()).toContain('最久未完成')
  })

  // ------- 空状态提示 -------
  it('无数据时三个区域显示空状态提示', async () => {
    const wrapper = await createWrapper()
    const emptyTexts = wrapper.findAll('.empty')
    expect(emptyTexts.length).toBe(3) // 种子、书籍、已完成
    expect(wrapper.text()).toContain('这里暂时没有搁置的种子')
    expect(wrapper.text()).toContain('还没有开了头的书')
    expect(wrapper.text()).toContain('还没有完成的项目')
  })

  // ------- 渲染搁置种子列表 -------
  it('渲染搁置种子列表', async () => {
    mockStore['hf:unfinished_v2'] = [
      makeItem({ id: 's1', type: 'seed', text: '写作计划', sprouted: false }),
      makeItem({ id: 's2', type: 'seed', text: '学吉他', sprouted: true }),
    ]
    const wrapper = await createWrapper()
    expect(wrapper.text()).toContain('写作计划')
    expect(wrapper.text()).toContain('学吉他')
    // 种子区域显示
    expect(wrapper.text()).toContain('搁置的种子')
  })

  // ------- 渲染书籍列表 -------
  it('渲染书籍列表', async () => {
    mockStore['hf:unfinished_v2'] = [
      makeItem({ id: 'b1', type: 'book', text: '百年孤独', progress: '第3章', status: 'active' }),
    ]
    const wrapper = await createWrapper()
    expect(wrapper.text()).toContain('百年孤独')
    expect(wrapper.text()).toContain('第3章')
    expect(wrapper.text()).toContain('开了头的书')
  })

  // ------- 渲染草稿列表 -------
  it('渲染草稿列表', async () => {
    mockStore['hf:unfinished_v2'] = [
      makeItem({ id: 'd1', type: 'draft', text: '这是一篇未完成的文章', completed: false }),
    ]
    const wrapper = await createWrapper()
    expect(wrapper.text()).toContain('这是一篇未完成的文章')
    expect(wrapper.text()).toContain('写了一半的笔记')
  })

  // ------- 添加书籍 ----
  it('输入书名并添加书籍', async () => {
    const wrapper = await createWrapper()
    // 找到书籍区域的输入框
    const input = wrapper.find('.uf-input')
    await input.setValue('三体')
    const addBtn = wrapper.find('.uf-btn')
    await addBtn.trigger('click')
    const saved = mockStore['hf:unfinished_v2']
    expect(saved.length).toBe(1)
    expect(saved[0].type).toBe('book')
    expect(saved[0].text).toBe('三体')
  })

  // ------- 删除书籍 -------
  it('点击删除按钮移除书籍', async () => {
    mockStore['hf:unfinished_v2'] = [
      makeItem({ id: 'b1', type: 'book', text: '活着', updatedAt: '2026-07-28T10:00:00.000Z' }),
      makeItem({ id: 'b2', type: 'book', text: '百年孤独', updatedAt: '2026-07-27T10:00:00.000Z' }),
    ]
    const wrapper = await createWrapper()
    // 因 sortedBooks 按 updatedAt 降序，b1(活着)排在最前
    const delBtns = wrapper.findAll('.uf-del')
    expect(delBtns.length).toBe(2)
    await delBtns[0].trigger('click')
    const saved = mockStore['hf:unfinished_v2']
    expect(saved.length).toBe(1)
    expect(saved[0].text).toBe('百年孤独')
  })

  // ------- 添加草稿 -------
  it('输入片段并添加草稿', async () => {
    const wrapper = await createWrapper()
    // 草稿区域有两个输入框：书籍输入和草稿输入
    // 书籍输入在第一个 .uf-input, 草稿输入在第二个 .add-row 中
    const addRows = wrapper.findAll('.add-row')
    // 书籍区域有一个 .add-row，草稿区域也有一个 .add-row
    expect(addRows.length).toBe(2)
    // 草稿的输入框在第二个 add-row 中
    const draftInput = addRows[1].find('.uf-input')
    await draftInput.setValue('一段未完成的思考')
    const draftAddBtn = addRows[1].find('.uf-btn')
    await draftAddBtn.trigger('click')
    const saved = mockStore['hf:unfinished_v2']
    expect(saved.length).toBe(1)
    expect(saved[0].type).toBe('draft')
    expect(saved[0].text).toBe('一段未完成的思考')
  })

  // ------- 删除草稿 -------
  it('点击删除按钮移除草稿', async () => {
    mockStore['hf:unfinished_v2'] = [
      makeItem({ id: 'd1', type: 'draft', text: '草稿1', completed: false }),
      makeItem({ id: 'd2', type: 'draft', text: '草稿2', completed: false }),
    ]
    const wrapper = await createWrapper()
    const delBtns = wrapper.findAll('.uf-del')
    expect(delBtns.length).toBe(2)
    await delBtns[0].trigger('click')
    const saved = mockStore['hf:unfinished_v2']
    expect(saved.length).toBe(1)
    expect(saved[0].text).toBe('草稿2')
  })

  // ------- 统计信息正确 -------
  it('统计信息显示正确数字', async () => {
    mockStore['hf:unfinished_v2'] = [
      makeItem({ id: 's1', type: 'seed', text: '种子1', at: new Date(Date.now() - 86400000 * 5).toISOString() }),
      makeItem({ id: 'b1', type: 'book', text: '书1' }),
      makeItem({ id: 'd1', type: 'draft', text: '草稿1' }),
    ]
    const wrapper = await createWrapper()
    // 统计卡片数字
    const statNums = wrapper.findAll('.stat-num')
    expect(statNums.length).toBe(4)
    expect(statNums[0].text()).toBe('1') // 搁置种子
    expect(statNums[1].text()).toBe('1') // 未读完的书
    expect(statNums[2].text()).toBe('1') // 半截笔记
    expect(statNums[3].text()).toContain('5') // 最久未完成天数
  })

  // ------- 书籍状态循环切换 -------
  it('点击书籍状态标签循环切换', async () => {
    mockStore['hf:unfinished_v2'] = [
      makeItem({ id: 'b1', type: 'book', text: '活着', status: 'active' }),
    ]
    const wrapper = await createWrapper()
    expect(wrapper.text()).toContain('在读')
    // 点击状态标签
    const statusTag = wrapper.find('.status-tag')
    await statusTag.trigger('click')
    const saved = mockStore['hf:unfinished_v2']
    expect(saved[0].status).toBe('paused')
    // 重新挂载验证
    const wrapper2 = await createWrapper()
    expect(wrapper2.text()).toContain('暂停')
  })

  // ------- 草稿完成状态切换 -------
  it('点击草稿完成状态按钮切换完成状态', async () => {
    mockStore['hf:unfinished_v2'] = [
      makeItem({ id: 'd1', type: 'draft', text: '未完成草稿', completed: false }),
    ]
    const wrapper = await createWrapper()
    const toggleBtn = wrapper.find('.status-toggle')
    expect(toggleBtn.text()).toBe('○')
    await toggleBtn.trigger('click')
    const saved = mockStore['hf:unfinished_v2']
    expect(saved[0].completed).toBe(true)
    // 重新挂载验证已完成区域出现
    const wrapper2 = await createWrapper()
    expect(wrapper2.text()).toContain('未完成草稿')
    expect(wrapper2.text()).toContain('已完成')
  })

  // ------- 清理按钮存在 -------
  it('渲染清理按钮', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.text()).toContain('清理搁置超过 30 天的种子')
  })

  // ------- 复垦气象面板（INCR-197） -------
  it('渲染复垦气象面板（空态引导）', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.find('.ufw-panel').exists()).toBe(true)
    expect(wrapper.text()).toContain('复垦气象')
    // 无未完成项 → 空态
    expect(wrapper.find('.ufw-empty').exists()).toBe(true)
    // 空库洞察引导
    expect(wrapper.text()).toContain('花园还空着')
  })

  it('复垦气象注入事项后展示花园气象与拾起时机', async () => {
    mockStore['hf:unfinished_v2'] = [
      makeItem({ id: 's1', type: 'seed', text: '写作计划', at: new Date().toISOString() }),
      makeItem({ id: 'd1', type: 'draft', text: '半截论文', completed: true }),
    ]
    const wrapper = await createWrapper()
    // 花园气象事实格：共/已完成/完成率/活跃
    expect(wrapper.find('.ufw-facts').exists()).toBe(true)
    expect(wrapper.text()).toContain('共 2 件')
    expect(wrapper.text()).toContain('完成率 50%')
    // 类型分布 + 沉淀分档
    expect(wrapper.text()).toContain('类型分布')
    expect(wrapper.text()).toContain('沉淀分档')
    // 今日该拾起命中未完成种子
    expect(wrapper.find('.ufw-today').exists()).toBe(true)
    expect(wrapper.text()).toContain('今日该拾起')
    expect(wrapper.text()).toContain('写作计划')
    // 拾起时机榜（TOP5）
    expect(wrapper.find('.ufw-pick-row').exists()).toBe(true)
    // 复垦洞察
    expect(wrapper.find('.ufw-insights').exists()).toBe(true)
  })
})