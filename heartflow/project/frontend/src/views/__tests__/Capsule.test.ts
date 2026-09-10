// ============================================================
// Capsule 时光胶囊视图测试
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
  const { default: Capsule } = await import('../Capsule.vue')
  return mount(Capsule, { attachTo: document.body })
}

function makeCapsule(overrides: Record<string, any> = {}) {
  const now = new Date().toISOString()
  return {
    id: `cap_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title: '默认胶囊',
    note: '',
    items: [],
    createdAt: now,
    at: now,
    openDate: '2099-01-01',
    openedAt: null,
    opened: false,
    ...overrides,
  }
}

function iso(daysFromNow: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ---- 测试 ----
describe('Capsule 时光胶囊视图', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore['hf:time_capsules'] = '[]'
  })

  it('渲染标题与胶囊库档案面板空态引导', async () => {
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('时光胶囊')
    expect(wrapper.find('.cvp').exists()).toBe(true)
    expect(wrapper.text()).toContain('胶囊库档案')
    expect(wrapper.text()).toContain('胶囊库未启')
  })

  it('胶囊库档案面板随胶囊数据渲染填充态', async () => {
    mockStore['hf:time_capsules'] = JSON.stringify([
      makeCapsule({ id: 'a', title: '逾期胶囊', openDate: iso(-3) }),
      makeCapsule({ id: 'b', title: '未来胶囊', openDate: iso(30) }),
    ])
    const wrapper = await createWrapper()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.cvp-tag').exists()).toBe(true)
    expect(wrapper.text()).toContain('逾末催启')
    expect(wrapper.text()).toContain('逾期胶囊')
  })
})
