// ============================================================
// 心流 ConstitutionEditor（宪法编辑器视图）测试
// 使用 Constitution Store 数据模型
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import { invalidateCache } from '../../engine/storage/core'

// ============================================================
// 测试数据工厂
// ============================================================
function createMockMutableRules(count: number) {
  const rules: any[] = []
  for (let i = 0; i < count; i++) {
    rules.push({
      id: `rule-${i + 1}`,
      title: `第${i + 3}条`,
      description: `这是第${i + 3}条可编辑的内容`,
      type: 'value',
      enabled: true,
      order: i,
      articleNumber: i + 3,
      isDefault: true,
    })
  }
  return rules
}

// ============================================================
// Mock Store
// ============================================================
const mockUpdateRule = vi.fn()
const mockMutableRules = createMockMutableRules(50)

const mockConstitution = {
  immutableRules: ref([
    {
      id: 'core-local-private',
      title: '本地私有',
      description: '所有数据仅存储于用户本地设备，不上传任何云端。',
      icon: '💻',
      type: 'value',
    },
    {
      id: 'core-super-custom',
      title: '超级自定义',
      description: '所有规则、界面、交互方式均可由用户自定义。',
      icon: '⚙️',
      type: 'value',
    },
  ]),
  mutableRules: ref(mockMutableRules),
  updateRule: mockUpdateRule,
}

vi.mock('../../stores/constitution', async () => ({
  ...(await vi.importActual<typeof import('../../stores/constitution')>('../../stores/constitution')),
  useConstitutionStore: () => mockConstitution,
}))

vi.mock('../../modules/toast', () => ({
  showToast: vi.fn(),
}))

// ============================================================
// Wrapper 工厂
// ============================================================
async function createWrapper() {
  const { default: ConstitutionEditor } = await import('../ConstitutionEditor.vue')
  return mount(ConstitutionEditor, {
    global: {
      stubs: {
        Teleport: true,
        Transition: true,
      },
    },
  })
}

// ============================================================
// 测试套件
// ============================================================
describe('ConstitutionEditor 宪法编辑器视图', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    // 重置 mutableRules 数据
    mockConstitution.mutableRules.value = createMockMutableRules(50)
  })

  // ------------------------------------------------------------------
  // 1. 渲染标题
  // ------------------------------------------------------------------
  it('渲染标题', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.find('.ce-title').text()).toBe('宪法编辑器')
    expect(wrapper.text()).toContain('修改弹性宪法（第3-52条）')
  })

  // ------------------------------------------------------------------
  // 2. 序言区域显示为只读（锁定状态）
  // ------------------------------------------------------------------
  it('序言区域显示为只读（锁定状态）', async () => {
    const wrapper = await createWrapper()

    // 序言区域存在
    const preambleSection = wrapper.find('.ce-preamble-section')
    expect(preambleSection.exists()).toBe(true)
    expect(preambleSection.text()).toContain('序言')
    expect(preambleSection.text()).toContain('内核级宪法 · 第1-2条 · 强制·不可关闭')

    // 锁定卡片存在（2 条不可变规则）
    const lockedCards = wrapper.findAll('.locked-article-card')
    expect(lockedCards.length).toBe(2)

    // 锁定徽章存在
    const lockedBadges = wrapper.findAll('.locked-badge')
    expect(lockedBadges.length).toBe(2)
    lockedBadges.forEach((badge) => {
      expect(badge.text()).toContain('锁定')
    })
  })

  // ------------------------------------------------------------------
  // 3. 显示可编辑的第3-52条
  // ------------------------------------------------------------------
  it('显示可编辑的第3-52条', async () => {
    const wrapper = await createWrapper()

    // 弹性条款区域存在
    expect(wrapper.text()).toContain('弹性条款')
    expect(wrapper.text()).toContain('第3条 — 第52条 · 可编辑')

    // 应该有50个 textarea（第3-52条）
    const textareas = wrapper.findAll('.article-textarea')
    expect(textareas.length).toBe(50)

    // 验证每个 textarea 有正确的 id
    textareas.forEach((ta, idx) => {
      const articleId = idx + 3
      expect(ta.element.getAttribute('id')).toBe(`article-${articleId}`)
    })
  })

  // ------------------------------------------------------------------
  // 4. textarea 修改会更新内容
  // ------------------------------------------------------------------
  it('textarea 修改会更新内容', async () => {
    const wrapper = await createWrapper()

    // 找到第一个可编辑的 textarea（第3条）
    const firstTextarea = wrapper.find('#article-3')
    expect(firstTextarea.exists()).toBe(true)

    // 修改内容
    const newContent = '修改后的第3条描述'
    await firstTextarea.setValue(newContent)

    // 验证 textarea 的值已更新
    expect((firstTextarea.element as HTMLTextAreaElement).value).toBe(newContent)
  })

  // ------------------------------------------------------------------
  // 5. 保存按钮持久化修改
  // ------------------------------------------------------------------
  it('保存按钮持久化修改', async () => {
    const wrapper = await createWrapper()

    // 修改第3条内容
    const firstTextarea = wrapper.find('#article-3')
    const newContent = '已保存的新描述'
    await firstTextarea.setValue(newContent)

    // 点击保存按钮
    const saveBtn = wrapper.find('.stylus-btn-save')
    await saveBtn.trigger('click')

    // 等待 Promise 完成
    await wrapper.vm.$nextTick()
    await new Promise((resolve) => setTimeout(resolve, 10))

    // 验证 updateRule 被调用
    expect(mockUpdateRule).toHaveBeenCalled()
    // 找到第3条对应的调用
    const calls = mockUpdateRule.mock.calls
    const article3Call = calls.find((c: any[]) =>
      mockMutableRules.find((r: any) => r.articleNumber === 3 && r.id === c[0])
    )
    expect(article3Call).toBeDefined()
    // 应该更新了第3条的描述
    const descUpdates = calls
      .filter((c: any[]) => c[1]?.description === newContent)
    expect(descUpdates.length).toBeGreaterThanOrEqual(1)
  })

  // ------------------------------------------------------------------
  // 6. 条款编号正确
  // ------------------------------------------------------------------
  it('条款编号正确', async () => {
    const wrapper = await createWrapper()

    // 检查锁定条款编号
    const lockedNumbers = wrapper.findAll('.locked-article-number')
    expect(lockedNumbers.length).toBe(2)
    expect(lockedNumbers[0].text()).toBe('第1条')
    expect(lockedNumbers[1].text()).toBe('第2条')

    // 检查可编辑条款编号（抽查）
    const articleNumbers = wrapper.findAll('.article-number')
    expect(articleNumbers.length).toBe(50)
    expect(articleNumbers[0].text()).toBe('第3条')
    expect(articleNumbers[1].text()).toBe('第4条')
    expect(articleNumbers[47].text()).toBe('第50条')
    expect(articleNumbers[48].text()).toBe('第51条')
    expect(articleNumbers[49].text()).toBe('第52条')
  })

  // ------------------------------------------------------------------
  // 7. 锁定条款（第1-2条）不可编辑
  // ------------------------------------------------------------------
  it('锁定条款（第1-2条）不可编辑', async () => {
    const wrapper = await createWrapper()

    // 锁定条款区域不应包含 textarea 或 input
    const lockedCards = wrapper.findAll('.locked-article-card')
    lockedCards.forEach((card) => {
      const textarea = card.find('textarea')
      expect(textarea.exists()).toBe(false)
      const input = card.find('input')
      expect(input.exists()).toBe(false)
    })

    // 锁定条款内容应为纯文本，使用 p 标签展示
    const lockedContents = wrapper.findAll('.locked-article-content')
    expect(lockedContents.length).toBe(2)
    lockedContents.forEach((content) => {
      expect(content.element.tagName).toBe('P')
    })
  })

  // ------------------------------------------------------------------
  // 8. 空状态处理
  // ------------------------------------------------------------------
  it('空状态处理', async () => {
    // 模拟无 mutableRules 的情况
    mockConstitution.mutableRules.value = []
    const wrapper = await createWrapper()

    // 空状态应该显示
    expect(wrapper.find('.empty-state').exists()).toBe(true)
    expect(wrapper.text()).toContain('暂无条款数据')
  })

  // ------------------------------------------------------------------
  // 9. 从 store 加载已有数据
  // ------------------------------------------------------------------
  it('从 store 加载已有数据', async () => {
    const rules = createMockMutableRules(50)
    rules[0].description = '自定义第3条描述'
    rules[10].description = '自定义第13条描述'
    mockConstitution.mutableRules.value = rules

    const wrapper = await createWrapper()

    // 验证加载的数据正确显示
    const textarea3 = wrapper.find('#article-3')
    expect((textarea3.element as HTMLTextAreaElement).value).toBe('自定义第3条描述')

    const textarea13 = wrapper.find('#article-13')
    expect((textarea13.element as HTMLTextAreaElement).value).toBe('自定义第13条描述')
  })
})

// ============================================================
// ClauseEditorPanel 立法厅 · 孤儿组件集成（INCR-258）
// 消费 useClauseEditor（storage 读键 hf:constitution:*），无模块级 ref 污染。
// 宿主宪法编辑器视图提供条款增删改 · 修订工作流 · 冲突检测的立法厅视角。
// ============================================================
describe('ClauseEditorPanel 立法厅集成', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockConstitution.mutableRules.value = createMockMutableRules(50)
    // 真实 storage 走 localStorage，清空并失效缓存保证隔离
    localStorage.clear()
    invalidateCache()
  })

  // ------------------------------------------------------------------
  // 1. 渲染立法厅骨架（标题/统计/系统条款/选项卡）
  // ------------------------------------------------------------------
  it('渲染立法厅面板骨架（标题/统计/系统条款/选项卡）', async () => {
    const wrapper = await createWrapper()
    const text = wrapper.text()

    expect(text).toContain('立法厅 · 用户条款')
    expect(text).toContain('条款总数')
    // 空存储时初始化 5 条系统条款
    expect(text).toContain('数据本地私有')
    expect(text).toContain('心流第一')
    // 选项卡
    const tabs = wrapper.findAll('.cep-tab')
    expect(tabs.map((t) => t.text())).toEqual(['条款', '修订', '冲突'])
    // 统计：条款总数 5，用户条款 0
    const statBlocks = wrapper.findAll('.cep-stat')
    expect(statBlocks[0].find('.cep-stat-num').text()).toBe('5')
    expect(statBlocks[1].find('.cep-stat-num').text()).toBe('0')
  })

  // ------------------------------------------------------------------
  // 2. 新增用户条款后列表与统计更新
  // ------------------------------------------------------------------
  it('新增用户条款后列表与统计更新', async () => {
    const wrapper = await createWrapper()

    await wrapper.find('input[placeholder^="编号"]').setValue('6.1')
    await wrapper.find('input[placeholder="条款标题"]').setValue('心流保护条款')
    await wrapper.find('textarea[placeholder="条款正文…"]').setValue('系统须在用户专注时保持静默，减少打断')
    await wrapper.find('.cep-add-form').trigger('submit')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('心流保护条款')
    expect(wrapper.text()).toContain('第6.1条')
    // 统计更新：条款总数 6，用户条款 1
    const statBlocks = wrapper.findAll('.cep-stat')
    expect(statBlocks[0].find('.cep-stat-num').text()).toBe('6')
    expect(statBlocks[1].find('.cep-stat-num').text()).toBe('1')
  })

  // ------------------------------------------------------------------
  // 3. 编辑用户条款并保存新内容
  // ------------------------------------------------------------------
  it('编辑用户条款并保存新内容', async () => {
    const wrapper = await createWrapper()

    await wrapper.find('input[placeholder^="编号"]').setValue('6.1')
    await wrapper.find('input[placeholder="条款标题"]').setValue('心流保护条款')
    await wrapper.find('textarea[placeholder="条款正文…"]').setValue('用户专注时段应减少通知')
    await wrapper.find('.cep-add-form').trigger('submit')
    await wrapper.vm.$nextTick()

    const editBtn = wrapper.findAll('.cep-btn-sm').find((b) => b.text() === '编辑')
    expect(editBtn).toBeTruthy()
    await editBtn!.trigger('click')
    await wrapper.vm.$nextTick()

    await wrapper.find('.cep-edit-form input').setValue('心流保护条款v2')
    await wrapper.find('.cep-edit-form textarea').setValue('用户专注时段应完全静默')
    await wrapper.findAll('.cep-btn-primary').find((b) => b.text() === '保存')!.trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('心流保护条款v2')
    expect(wrapper.text()).toContain('用户专注时段应完全静默')
  })

  // ------------------------------------------------------------------
  // 4. 废止用户条款
  // ------------------------------------------------------------------
  it('废止用户条款后状态变为已废止', async () => {
    const wrapper = await createWrapper()

    await wrapper.find('input[placeholder^="编号"]').setValue('6.1')
    await wrapper.find('input[placeholder="条款标题"]').setValue('心流保护条款')
    await wrapper.find('textarea[placeholder="条款正文…"]').setValue('用户专注时段应减少通知')
    await wrapper.find('.cep-add-form').trigger('submit')
    await wrapper.vm.$nextTick()

    const repealBtn = wrapper.findAll('.cep-btn-warn').find((b) => b.text() === '废止')
    expect(repealBtn).toBeTruthy()
    await repealBtn!.trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.cep-clause.is-repealed').exists()).toBe(true)
    expect(wrapper.text()).toContain('已废止')
  })

  // ------------------------------------------------------------------
  // 5. 修订工作流：创建→提交→通过→生效并应用变更
  // ------------------------------------------------------------------
  it('修订工作流：创建→提交→通过→生效并应用变更', async () => {
    const wrapper = await createWrapper()

    // 先新增一条用户条款作为修订对象
    await wrapper.find('input[placeholder^="编号"]').setValue('6.1')
    await wrapper.find('input[placeholder="条款标题"]').setValue('心流保护条款')
    await wrapper.find('textarea[placeholder="条款正文…"]').setValue('用户专注时段应减少通知')
    await wrapper.find('.cep-add-form').trigger('submit')
    await wrapper.vm.$nextTick()

    // 切到修订 tab，空态提示
    await wrapper.findAll('.cep-tab').find((t) => t.text() === '修订')!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('暂无修订案')

    // 创建修订案（修改 6.1）
    await wrapper.find('input[placeholder="修订案标题"]').setValue('强化心流保护')
    await wrapper.find('textarea[placeholder="修订描述…"]').setValue('提高心流保护等级')
    await wrapper.findAll('select')[0].setValue('6.1')
    await wrapper.find('textarea[placeholder="新条款内容…"]').setValue('用户专注时段应完全静默且不可打断')
    await wrapper.find('.cep-add-form').trigger('submit')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('强化心流保护')
    expect(wrapper.text()).toContain('草稿')

    // 提交修订案
    await wrapper.findAll('.cep-btn-sm').find((b) => b.text() === '提交')!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('已提议')

    // 通过（评审 + 批准）
    await wrapper.findAll('.cep-btn-primary').find((b) => b.text() === '通过')!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('已批准')

    // 生效并应用变更
    await wrapper.findAll('.cep-btn-primary').find((b) => b.text() === '生效')!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('已生效')

    // 切回条款 tab，验证条款内容已被修订
    await wrapper.findAll('.cep-tab').find((t) => t.text() === '条款')!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('用户专注时段应完全静默且不可打断')
  })

  // ------------------------------------------------------------------
  // 6. 冲突检测：矛盾条款生成未决冲突并可标记解决
  // ------------------------------------------------------------------
  it('冲突检测：矛盾条款生成未决冲突并可标记解决', async () => {
    const wrapper = await createWrapper()

    // 条款 A：包含"必须"
    await wrapper.find('input[placeholder^="编号"]').setValue('6.1')
    await wrapper.find('input[placeholder="条款标题"]').setValue('强制备份')
    await wrapper.find('textarea[placeholder="条款正文…"]').setValue('用户必须每日备份数据')
    await wrapper.find('.cep-add-form').trigger('submit')
    await wrapper.vm.$nextTick()

    // 条款 B：包含"不应" → 与 A 构成矛盾
    await wrapper.find('input[placeholder^="编号"]').setValue('6.2')
    await wrapper.find('input[placeholder="条款标题"]').setValue('反对备份')
    await wrapper.find('textarea[placeholder="条款正文…"]').setValue('任何人不应每日备份数据')
    await wrapper.find('.cep-add-form').trigger('submit')
    await wrapper.vm.$nextTick()

    // 统计：未决冲突 = 1
    const statBlocks = wrapper.findAll('.cep-stat')
    expect(statBlocks[3].find('.cep-stat-num').text()).toBe('1')

    // 切到冲突 tab
    await wrapper.findAll('.cep-tab').find((t) => t.text() === '冲突')!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.ct-contradiction').exists()).toBe(true)
    expect(wrapper.text()).toContain('可能存在矛盾')

    // 标记已解决
    await wrapper.findAll('.cep-btn-primary').find((b) => b.text() === '标记已解决')!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('暂无未决冲突')
  })

  // ------------------------------------------------------------------
  // 7. 修订与冲突空状态提示
  // ------------------------------------------------------------------
  it('修订与冲突空状态提示', async () => {
    const wrapper = await createWrapper()

    await wrapper.findAll('.cep-tab').find((t) => t.text() === '修订')!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('暂无修订案')

    await wrapper.findAll('.cep-tab').find((t) => t.text() === '冲突')!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('暂无未决冲突')
  })
})