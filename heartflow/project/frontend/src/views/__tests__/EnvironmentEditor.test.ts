import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const mockStore: Record<string, any> = {}
const mockGetKV = vi.fn((_key: string, def: any) => mockStore[_key] ?? def)
const mockSetKV = vi.fn((key: string, val: any) => { mockStore[key] = val })

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (...args: any[]) => (mockGetKV as any)(...args),
    setKV: (...args: any[]) => (mockSetKV as any)(...args),
    getConfig: () => ({}),
    setConfig: () => {},
  },
}))

vi.mock('../../modules/decoration-history', () => ({
  recordDecorationHistory: vi.fn(),
}))

async function getWrapper() {
  const { default: EnvironmentEditor } = await import('../EnvironmentEditor.vue')
  return mount(EnvironmentEditor)
}

describe('EnvironmentEditor 环境编辑器', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('渲染标题和描述', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('环境编辑器')
    expect(wrapper.text()).toContain('调整全局环境参数')
  })

  it('渲染背景氛围选项', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('背景氛围')
    expect(wrapper.text()).toContain('默认暖色')
  })

  it('渲染显示密度选项', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('显示密度')
    expect(wrapper.text()).toContain('标准')
  })
})