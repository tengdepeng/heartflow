// ============================================================
// AdvisorChat 视图测试 - 幕僚对话
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

// ---- 模拟路由 ----
const mockPush = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useRoute: () => ({ params: { id: 'a1' }, query: {} }),
}))

// ---- 模拟 types ----
vi.mock('../../types', () => ({
  ADVISOR_PERSONALITIES: [
    { key: 'calm', label: '沉静', style: '温和平缓' },
    { key: 'warm', label: '温煦', style: '温暖亲切' },
  ],
  AFFINITY_TIERS: [
    { threshold: 0, title: '陌路', minInteractions: 0 },
    { threshold: 20, title: '相识', minInteractions: 5 },
    { threshold: 40, title: '熟稔', minInteractions: 20 },
    { threshold: 60, title: '信赖', minInteractions: 50 },
    { threshold: 80, title: '知己', minInteractions: 100 },
    { threshold: 95, title: '羁绊', minInteractions: 200 },
  ],
}))

// ---- 模拟 advisor store (Pinia 自动解包 ref) ----
const mockGetAdvisorById = vi.fn()
let mockMessages: any[] = []

vi.mock('../../stores/advisor', () => ({
  useAdvisorStore: () => ({
    getAdvisorById: (id: string) => mockGetAdvisorById(id),
    messages: mockMessages,
    reply: vi.fn(),
    replySync: vi.fn(),
    $reset: () => {},
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

async function getWrapper() {
  mockGetAdvisorById.mockReturnValue({
    id: 'a1',
    name: '测试幕僚',
    role: 'mentor',
    personality: 'calm',
    affinity: 45,
    totalInteractions: 30,
  })
  const { default: AdvisorChat } = await import('../AdvisorChat.vue')
  return mount(AdvisorChat, {
    global: {
      stubs: {
        Teleport: true,
        Transition: true,
      },
    },
  })
}

describe('AdvisorChat 幕僚对话', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMessages = []
  })

  it('渲染幕僚名称和角色', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('测试幕僚')
  })

  it('无消息时显示空状态', async () => {
    const wrapper = await getWrapper()
    const emptyText = wrapper.find('.achat-empty')
    expect(emptyText.exists()).toBe(true)
    expect(wrapper.text()).toContain('开始与')
    expect(wrapper.text()).toContain('对话')
  })

  it('显示输入区域', async () => {
    const wrapper = await getWrapper()
    const textarea = wrapper.find('.achat-input')
    expect(textarea.exists()).toBe(true)
    expect(textarea.attributes('placeholder')).toContain('输入消息')
  })

  it('发送按钮初始禁用', async () => {
    const wrapper = await getWrapper()
    const sendBtn = wrapper.find('.achat-send-btn')
    expect(sendBtn.exists()).toBe(true)
    expect(sendBtn.attributes('disabled')).toBeDefined()
  })

  it('返回按钮可点击', async () => {
    const wrapper = await getWrapper()
    const backBtn = wrapper.find('.achat-back-btn')
    expect(backBtn.exists()).toBe(true)
    await backBtn.trigger('click')
    expect(mockPush).toHaveBeenCalled()
  })
})