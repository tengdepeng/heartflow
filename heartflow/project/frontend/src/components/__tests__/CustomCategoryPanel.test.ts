// ============================================================
// CustomCategoryPanel 自定义分类面板测试（INCR-23）
// 薄委托层：props 传入合并分类，交互以 create/update/remove 事件上抛
// ============================================================
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { buildMerged, type CustomCategory } from '../../modules/reward/custom-category'

async function mountPanel(categories: CustomCategory[]) {
  const { default: Panel } = await import('../CustomCategoryPanel.vue')
  return mount(Panel, { props: { categories } })
}

/** 内置种子 + 两个自定义支出分类（餐饮/外卖 层级） */
function seedCats(): CustomCategory[] {
  return buildMerged([
    { id: 'food', name: '餐饮', kind: 'expense', icon: '🍜', color: '#c46a5a' },
    { id: 'takeout', name: '外卖', kind: 'expense', icon: '🛵', color: '#e0a96d', parentId: 'food' },
  ])
}

/** 切到「支出」标签页 */
async function gotoExpense(w: ReturnType<typeof mount>) {
  const tabs = w.findAll('.ccp-tab')
  await tabs[1].trigger('click')
}

describe('CustomCategoryPanel 自定义分类面板', () => {
  it('渲染标题、收支切换与分类列表', async () => {
    const w = await mountPanel(seedCats())
    expect(w.text()).toContain('自定义分类')
    expect(w.text()).toContain('收入')
    expect(w.text()).toContain('支出')
    // 默认支出页：内置 + 自定义都在
    expect(w.text()).toContain('工具')
    expect(w.text()).toContain('餐饮')
  })

  it('切换标签展示对应收支分类，内置分类带徽标', async () => {
    const w = await mountPanel(buildMerged([]))
    // 默认「支出」页：不含收入分类
    expect(w.text()).not.toContain('薪资')
    await gotoExpense(w)
    expect(w.text()).toContain('工具')
    expect(w.text()).toContain('内置')
    // 切到「收入」页展示收入分类
    const tabs = w.findAll('.ccp-tab')
    await tabs[0].trigger('click')
    expect(w.text()).toContain('薪资')
  })

  it('层级分类展示父级标识', async () => {
    const w = await mountPanel(seedCats())
    expect(w.text()).toContain('⊂ 餐饮')
  })

  it('内置分类删除按钮禁用', async () => {
    const w = await mountPanel(buildMerged([]))
    await gotoExpense(w)
    const del = w.findAll('.ccp-del').find(b => b.attributes('disabled') !== undefined)
    expect(del).toBeTruthy()
  })

  it('新增分类上抛 create 事件（含收支类型与样式）', async () => {
    const w = await mountPanel(seedCats())
    await w.find('input[placeholder*="新分类名"]').setValue('宠物')
    await w.find('form.ccp-form').trigger('submit')
    const emitted = w.emitted('create')
    expect(emitted).toBeTruthy()
    expect(emitted![0][0]).toMatchObject({ name: '宠物', kind: 'expense', icon: '📦' })
  })

  it('编辑分类上抛 update 事件（改名）', async () => {
    const w = await mountPanel(seedCats())
    const foodRow = w.findAll('.ccp-row').find(r => r.text().includes('餐饮'))!
    await foodRow.find('.ccp-btn--ghost').trigger('click')
    await w.find('.ccp-edit input').setValue('美食')
    await w.find('form.ccp-edit').trigger('submit')
    const emitted = w.emitted('update')
    expect(emitted).toBeTruthy()
    expect(emitted![0][0]).toMatchObject({ id: 'food', patch: { name: '美食' } })
  })

  it('删除自定义分类上抛 remove 事件', async () => {
    const w = await mountPanel(seedCats())
    const foodRow = w.findAll('.ccp-row').find(r => r.text().includes('餐饮'))!
    await foodRow.find('.ccp-del').trigger('click')
    const emitted = w.emitted('remove')
    expect(emitted).toBeTruthy()
    expect(emitted![0][0]).toBe('food')
  })

  it('空列表展示引导文案', async () => {
    const w = await mountPanel([])
    expect(w.text()).toContain('暂无支出分类')
  })
})
