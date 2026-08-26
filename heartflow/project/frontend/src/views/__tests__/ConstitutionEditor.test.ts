// ============================================================
// 心流 ConstitutionEditor（宪法编辑器视图）测试
// 使用 Constitution Store 数据模型
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'

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