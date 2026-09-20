// ============================================================
// MaterialLibraryPanel 组件测试 - 材质库
// 真实引擎全链路：storage mock + workshop 引擎 + presets（INCR-405）
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import MaterialLibraryPanel from '../MaterialLibraryPanel.vue'
import { getMaterialLibrary, clearMaterialStore } from '../../modules/visualization/workshop'
import { initMaterialPresets, getPresetMaterialTotal } from '../../modules/visualization/workshop/presets'

// ---- 模拟 storage（workshop 引擎经 '../../../engine/storage' 组合层取用） ----
const mockStore: Record<string, any> = {}
vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (_key: string, def: any) => mockStore[_key] ?? def,
    setKV: (key: string, val: any) => { mockStore[key] = val },
  },
}))

const PRESET_TOTAL = getPresetMaterialTotal()

beforeEach(() => {
  Object.keys(mockStore).forEach((k) => delete mockStore[k])
  clearMaterialStore()
})

function mountPanel() {
  return mount(MaterialLibraryPanel, {
    global: { stubs: { transition: false } },
  })
}

describe('MaterialLibraryPanel 材质库', () => {
  it('渲染标题与统计：起点库总数 + 挂载注入后当前数量', async () => {
    const wrapper = mountPanel()
    await flushPromises()
    expect(wrapper.text()).toContain('材质库')
    expect(wrapper.text()).toContain(`起点库共 ${PRESET_TOTAL} 种预置材质`)
    expect(wrapper.text()).toContain(`当前 ${PRESET_TOTAL} 种`)
  })

  it('挂载时惰性注入出厂预置（真实引擎 getMaterialLibrary 可见）', async () => {
    const before = getMaterialLibrary().length
    const wrapper = mountPanel()
    await flushPromises()
    expect(before).toBe(0)
    expect(initMaterialPresets).toBeDefined()
    expect(getMaterialLibrary().length).toBe(PRESET_TOTAL)
    expect(wrapper.text()).toContain('暖金光点')
    expect(wrapper.text()).toContain('浓墨一点')
  })

  it('渲染分类筛选 chip（全部 + 七大分类）', async () => {
    const wrapper = mountPanel()
    await flushPromises()
    const chips = wrapper.findAll('.mlp-chip')
    expect(chips.length).toBe(8)
    expect(wrapper.text()).toContain('全部')
    for (const label of ['发光', '水墨', '自然', '手工', '几何', '音波', '纹理基底']) {
      expect(wrapper.text()).toContain(label)
    }
  })

  it('渲染材质卡片：名称 / 隐喻标签 / 分类标签', async () => {
    const wrapper = mountPanel()
    await flushPromises()
    expect(wrapper.text()).toContain('光 · 发光')
    expect(wrapper.text()).toContain('墨 · 水墨')
  })

  it('分类筛选：点击「水墨」仅显示 ink 材质', async () => {
    const wrapper = mountPanel()
    await flushPromises()
    const chips = wrapper.findAll('.mlp-chip')
    const inkChip = chips.find((c) => c.text().includes('水墨'))
    await inkChip!.trigger('click')
    const cards = wrapper.findAll('.mlp-card')
    expect(cards.length).toBeLessThan(PRESET_TOTAL)
    expect(wrapper.text()).toContain('浓墨一点')
    expect(wrapper.text()).not.toContain('暖金光点')
  })

  it('创建材质：填写名称提交，真实引擎新增且列表刷新、表单复位', async () => {
    const wrapper = mountPanel()
    await flushPromises()
    await wrapper.find('.mlp-create input[type="text"]').setValue('自定义星辉')
    await wrapper.find('.mlp-create-actions .mlp-btn--primary').trigger('click')
    expect(getMaterialLibrary().some((m) => m.name === '自定义星辉')).toBe(true)
    expect(wrapper.text()).toContain('自定义星辉')
    expect(wrapper.text()).toContain(`当前 ${PRESET_TOTAL + 1} 种`)
    expect(wrapper.find('.mlp-create input[type="text"]').element as HTMLInputElement).toHaveProperty('value', '')
  })

  it('名称为空时创建按钮禁用', async () => {
    const wrapper = mountPanel()
    await flushPromises()
    const btn = wrapper.find('.mlp-create-actions .mlp-btn--primary')
    expect((btn.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('编辑材质：进入编辑态改名保存，真实引擎更新且列表刷新', async () => {
    const wrapper = mountPanel()
    await flushPromises()
    const card = wrapper.findAll('.mlp-card').find((c) => c.text().includes('暖金光点'))!
    await card.find('[data-testid="mlp-edit"]').trigger('click')
    const editInput = wrapper.find('.mlp-card--editing input[type="text"]')
    await editInput.setValue('改名光点')
    await wrapper.find('.mlp-icon-btn--confirm').trigger('click')
    expect(getMaterialLibrary().some((m) => m.name === '改名光点')).toBe(true)
    expect(wrapper.text()).toContain('改名光点')
    expect(wrapper.text()).not.toContain('暖金光点')
  })

  it('删除材质：点击删除调用真实引擎且列表移除', async () => {
    const wrapper = mountPanel()
    await flushPromises()
    const card = wrapper.findAll('.mlp-card').find((c) => c.text().includes('暖金光点'))!
    await card.find('[data-testid="mlp-delete"]').trigger('click')
    expect(getMaterialLibrary().some((m) => m.name === '暖金光点')).toBe(false)
    expect(wrapper.text()).not.toContain('暖金光点')
    expect(wrapper.text()).toContain(`当前 ${PRESET_TOTAL - 1} 种`)
  })

  it('删除全部后显示空状态提示', async () => {
    const wrapper = mountPanel()
    await flushPromises()
    let guard = 0
    while (wrapper.find('[data-testid="mlp-delete"]').exists() && guard < 200) {
      await wrapper.find('[data-testid="mlp-delete"]').trigger('click')
      guard += 1
    }
    expect(wrapper.find('.mlp-empty').exists()).toBe(true)
    expect(wrapper.text()).toContain('材质库为空')
  })

  it('恢复出厂预置：删除后一键回到种子库', async () => {
    const wrapper = mountPanel()
    await flushPromises()
    await wrapper.findAll('[data-testid="mlp-delete"]')[0].trigger('click')
    expect(wrapper.text()).toContain(`当前 ${PRESET_TOTAL - 1} 种`)
    await wrapper.find('.mlp-foot .mlp-btn').trigger('click')
    expect(wrapper.text()).toContain(`当前 ${PRESET_TOTAL} 种`)
    expect(wrapper.text()).toContain('暖金光点')
  })
})
