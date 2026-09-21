// ============================================================
// GeneBreedingPanel 组件测试 · 基因育种工坊（INCR-408）
// 薄委托直引 modules/crystal/gene-seed 纯函数引擎；
// storage(engine/storage) 用假对象 mock（getKV 回种子数组 / setKV 记录写入），
// gene-seed 为纯函数，直接真实调用断言遗传语义。
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const h = vi.hoisted(() => {
  const kv = new Map<string, any>()
  const setKV = vi.fn((key: string, val: any) => { kv.set(key, val) })
  const getKV = vi.fn((key: string, def: any) => (kv.has(key) ? kv.get(key) : def))
  return { setKV, getKV }
})

vi.mock('../../../engine/storage', () => ({
  storage: { setKV: h.setKV, getKV: h.getKV },
}))

import GeneBreedingPanel from '../GeneBreedingPanel.vue'
import { createInitialSeed, createChildSeed } from '../../../modules/crystal/gene-seed'

function mountPanel() {
  return mount(GeneBreedingPanel)
}

describe('GeneBreedingPanel 基因育种工坊', () => {
  beforeEach(() => {
    h.getKV.mockClear()
    h.setKV.mockClear()
  })

  it('初始为空：不渲染任何种粮，显示空态文案与统计', async () => {
    h.getKV.mockReturnValue([])
    const wrapper = mountPanel()
    await flushPromises()
    expect(wrapper.text()).toContain('基因育种工坊')
    expect(wrapper.text()).toContain('0 株')
    expect(wrapper.text()).toContain('尚无种苗')
    expect(wrapper.findAll('.cgb-gene').length).toBe(0)
  })

  it('从存储加载既有育种档案', async () => {
    const seed = createInitialSeed()
    const child = createChildSeed(seed.genes, 'seed_x', seed.generation, 0)
    h.getKV.mockReturnValue([
      { seed, parentId: null, createdAt: 1 },
      { seed: child, parentId: 'seed_x', createdAt: 2 },
    ])
    const wrapper = mountPanel()
    await flushPromises()
    expect(wrapper.findAll('.cgb-gene').length).toBe(2)
    expect(wrapper.text()).toContain('2 株')
    expect(wrapper.text()).toContain('第 1 代')
  })

  it('点击「培育初始种子」生成并持久化初始种子', async () => {
    h.getKV.mockReturnValue([])
    const wrapper = mountPanel()
    await flushPromises()
    await wrapper.find('[data-testid="cgb-create-initial"]').trigger('click')
    expect(wrapper.findAll('.cgb-gene').length).toBe(1)
    expect(wrapper.text()).toContain('第 0 代')
    expect(wrapper.text()).toContain('显性 100%')
    // 已持久化
    const saved = h.setKV.mock.calls.find(c => c[0] === 'hf:crystal_breeding')
    expect(saved).toBeTruthy()
    expect(saved![1].length).toBe(1)
  })

  it('未选择亲本时育种按钮禁用', async () => {
    h.getKV.mockReturnValue([])
    const wrapper = mountPanel()
    await flushPromises()
    const btn = wrapper.find('[data-testid="cgb-breed"]')
    expect(btn.attributes('disabled')).toBeDefined()
    expect(btn.text()).toContain('选择亲本后育种')
  })

  it('选择亲本后点击育种生成子代（第 N+1 代）并持久化', async () => {
    const seed = createInitialSeed()
    h.getKV.mockReturnValue([{ seed, parentId: null, createdAt: 1 }])
    const wrapper = mountPanel()
    await flushPromises()
    // 选择第 0 个作为亲本
    await wrapper.find('[data-testid="cgb-select-0"]').trigger('click')
    const breed = wrapper.find('[data-testid="cgb-breed"]')
    expect(breed.attributes('disabled')).toBeUndefined()
    expect(breed.text()).toContain('杂交育种')
    await breed.trigger('click')
    expect(wrapper.findAll('.cgb-gene').length).toBe(2)
    expect(wrapper.text()).toContain('第 1 代')
    const saved = h.setKV.mock.calls.find(c => c[0] === 'hf:crystal_breeding')
    expect(saved).toBeTruthy()
    expect(saved![1].length).toBe(2)
    expect(saved![1][1].seed.generation).toBe(1)
  })

  it('再次点击已选亲本取消选中', async () => {
    const seed = createInitialSeed()
    h.getKV.mockReturnValue([{ seed, parentId: null, createdAt: 1 }])
    const wrapper = mountPanel()
    await flushPromises()
    const sel = wrapper.find('[data-testid="cgb-select-0"]')
    await sel.trigger('click')
    expect(sel.element.parentElement!.className).toContain('cgb-gene--selected')
    await sel.trigger('click')
    expect(wrapper.find('[data-testid="cgb-breed"]').attributes('disabled')).toBeDefined()
  })

  it('展示基因性状条（强度/发光）值', async () => {
    const seed = createInitialSeed() // intensity=0.5 luminescence=0.5
    h.getKV.mockReturnValue([{ seed, parentId: null, createdAt: 1 }])
    const wrapper = mountPanel()
    await flushPromises()
    expect(wrapper.text()).toContain('50%')
    expect(wrapper.text()).toContain('韧性 50%')
    expect(wrapper.text()).toContain('复杂度 0.30')
  })

  it('清空按钮移除全部并持久化空数组', async () => {
    const seed = createInitialSeed()
    const child = createChildSeed(seed.genes, 'seed_x', seed.generation, 0)
    h.getKV.mockReturnValue([
      { seed, parentId: null, createdAt: 1 },
      { seed: child, parentId: 'seed_x', createdAt: 2 },
    ])
    const wrapper = mountPanel()
    await flushPromises()
    expect(wrapper.findAll('.cgb-gene').length).toBe(2)
    await wrapper.find('[data-testid="cgb-reset"]').trigger('click')
    expect(wrapper.findAll('.cgb-gene').length).toBe(0)
    const saved = h.setKV.mock.calls.find(c => c[0] === 'hf:crystal_breeding')
    expect(saved).toBeTruthy()
    expect(saved![1]).toEqual([])
  })
})