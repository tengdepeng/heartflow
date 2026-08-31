// ============================================================
// 根脉叙事档案面板测试（INCR-44 · root-narrative 引擎）
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
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
    connections: [],
    tags: [],
    color: '#8a9a7a',
    willId: null,
    lastUpdatedAt: new Date().toISOString(),
    ...overrides,
  }
}

async function mountPanel(kv: Record<string, any> = {}) {
  Object.keys(mockStore).forEach(k => delete mockStore[k])
  Object.assign(mockStore, kv)
  const { default: RootNarrativeArchivePanel } = await import('../RootNarrativeArchivePanel.vue')
  const wrapper = mount(RootNarrativeArchivePanel)
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('RootNarrativeArchivePanel 根脉叙事档案', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockStore).forEach(k => delete mockStore[k])
  })

  it('空态：标题 + 根脉未显影徽标 + 引导文案', async () => {
    const wrapper = await mountPanel({})
    expect(wrapper.text()).toContain('根脉叙事档案')
    expect(wrapper.text()).toContain('根脉未显影')
    expect(wrapper.text()).toContain('还没有根系记录可供叙事')
  })

  it('空态：不渲染叙事模式切换', async () => {
    const wrapper = await mountPanel({})
    expect(wrapper.findAll('.rna-mode').length).toBe(0)
  })

  it('填充态：渲染三种叙事模式切换', async () => {
    const wrapper = await mountPanel({
      'hf:roots_v2': [makeRoot({ id: 'r1', text: '原生家庭' })],
    })
    const modes = wrapper.findAll('.rna-mode')
    expect(modes.length).toBe(3)
    expect(wrapper.text()).toContain('溯源叙事')
    expect(wrapper.text()).toContain('时代回顾')
    expect(wrapper.text()).toContain('支线故事')
  })

  it('填充态：默认溯源叙事渲染段落', async () => {
    const wrapper = await mountPanel({
      'hf:roots_v2': [
        makeRoot({ id: 'r1', layer: 'soil', text: '原生家庭', era: '1990s', detail: '温暖和睦的家庭氛围' }),
        makeRoot({ id: 'r2', layer: 'era', text: '大学时代', era: '2010-2014' }),
      ],
    })
    expect(wrapper.text()).toContain('我的根脉')
    expect(wrapper.text()).toContain('原生家庭')
    expect(wrapper.text()).toContain('大学时代')
  })

  it('填充态：切换时代回顾渲染时代回响', async () => {
    const wrapper = await mountPanel({
      'hf:roots_v2': [
        makeRoot({ id: 'r1', layer: 'soil', text: '原生家庭', era: '1990s' }),
        makeRoot({ id: 'r2', layer: 'era', text: '大学时代', era: '2010-2014' }),
      ],
    })
    const eraBtn = wrapper.findAll('.rna-mode')[1]
    await eraBtn.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('时代回响')
  })

  it('填充态：切换支线故事渲染支线标题', async () => {
    const wrapper = await mountPanel({
      'hf:roots_v2': [
        makeRoot({ id: 'r1', layer: 'soil', text: '原生家庭', era: '1990s' }),
        makeRoot({ id: 'r2', layer: 'branch', text: '读《活着》', era: '2010', strength: 0.9 }),
      ],
    })
    const branchBtn = wrapper.findAll('.rna-mode')[2]
    await branchBtn.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('支线：')
    expect(wrapper.text()).toContain('读《活着》')
  })

  it('填充态：支线故事默认选中强度最高的根系', async () => {
    const wrapper = await mountPanel({
      'hf:roots_v2': [
        makeRoot({ id: 'r1', layer: 'soil', text: '原生家庭', era: '1990s', strength: 0.9 }),
        makeRoot({ id: 'r2', layer: 'branch', text: '读《活着》', era: '2010', strength: 0.6 }),
        makeRoot({ id: 'r3', layer: 'era', text: '大学时代', era: '2010-2014', strength: 0.7 }),
      ],
    })
    const branchBtn = wrapper.findAll('.rna-mode')[2]
    await branchBtn.trigger('click')
    await wrapper.vm.$nextTick()
    const select = wrapper.find('.rna-select')
    expect((select.element as HTMLSelectElement).value).toBe('r1')
    expect(wrapper.text()).toContain('支线：「原生家庭」')
  })

  it('填充态：渲染时间脉络', async () => {
    const wrapper = await mountPanel({
      'hf:roots_v2': [
        makeRoot({ id: 'r1', layer: 'soil', text: '原生家庭', era: '1990s' }),
        makeRoot({ id: 'r2', layer: 'era', text: '大学时代', era: '2010-2014' }),
      ],
    })
    expect(wrapper.text()).toContain('时间脉络')
  })

  it('填充态：渲染温和洞察', async () => {
    const wrapper = await mountPanel({
      'hf:roots_v2': [
        makeRoot({ id: 'r1', layer: 'soil', text: '原生家庭', era: '1990s' }),
      ],
    })
    expect(wrapper.text()).toContain('叙事已显影')
  })

  it('填充态：关键人物渲染', async () => {
    const wrapper = await mountPanel({
      'hf:roots_v2': [
        makeRoot({ id: 'r1', layer: 'soil', text: '原生家庭', era: '1990s', tags: ['母亲', '温暖'] }),
      ],
    })
    expect(wrapper.text()).toContain('关键人物')
    expect(wrapper.text()).toContain('母亲')
  })

  it('填充态：徽标显示叙事段落数', async () => {
    const wrapper = await mountPanel({
      'hf:roots_v2': [
        makeRoot({ id: 'r1', layer: 'soil', text: '原生家庭', era: '1990s' }),
        makeRoot({ id: 'r2', layer: 'era', text: '大学时代', era: '2010-2014' }),
      ],
    })
    expect(wrapper.text()).toContain('段叙事')
  })
})
