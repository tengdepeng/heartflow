import { describe, expect, it, vi, beforeEach } from 'vitest'
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

vi.mock('../../modules/decoration-history', () => ({
  recordDecorationHistory: vi.fn(),
}))

async function getWrapper() {
  const { default: SceneEditor } = await import('../SceneEditor.vue')
  return mount(SceneEditor)
}

describe('SceneEditor 场景编辑器', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore['hf:scene_presets'] = []
  })

  it('渲染标题和描述', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('场景编辑器')
    expect(wrapper.text()).toContain('调整空间的氛围和场景参数')
  })

  it('无场景时显示空状态', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('还没有场景')
  })

  it('有场景时显示列表', async () => {
    mockStore['hf:scene_presets'] = [
      { id: 's1', name: '清晨', description: '柔和晨光', atmosphereColor: '#f0c040', transition: 'fade', createdAt: '2026-07-01T00:00:00Z', updatedAt: '2026-07-01T00:00:00Z' },
      { id: 's2', name: '黄昏', description: '温暖余晖', atmosphereColor: '#d4a574', transition: 'dissolve', createdAt: '2026-07-01T00:00:00Z', updatedAt: '2026-07-01T00:00:00Z' },
    ]
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('清晨')
    expect(wrapper.text()).toContain('黄昏')
    expect(wrapper.text()).toContain('2')
  })
})