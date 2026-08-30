// ============================================================
// QuickEntryPanel 自然语言快速记账面板测试（INCR-24）
// ============================================================
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { buildMerged } from '../../modules/reward/custom-category'
import type { CustomCategory } from '../../modules/reward/custom-category'
import type { Account } from '../../modules/reward/accounts'

const categories = buildMerged([])

const accounts: Account[] = [
  { id: 'cash', name: '现金', type: 'cash', initialBalance: 0 },
  { id: 'alipay', name: '支付宝', type: 'alipay', initialBalance: 0 },
]

async function mountPanel(cats: CustomCategory[] = categories, accs: Account[] = accounts) {
  const { default: QuickEntryPanel } = await import('../QuickEntryPanel.vue')
  const wrapper = mount(QuickEntryPanel, { props: { categories: cats, accounts: accs } })
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('QuickEntryPanel 自然语言快速记账面板', () => {
  it('渲染标题与说明', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('.qep-panel').exists()).toBe(true)
    expect(wrapper.text()).toContain('快速记账')
  })

  it('无金额时提示待解析', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('.qep-input').setValue('买了咖啡')
    expect(wrapper.find('.qep-wait').exists()).toBe(true)
    expect(wrapper.find('.qep-preview').exists()).toBe(false)
  })

  it('输入金额后展示解析预览（支出/类别/金额）', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('.qep-input').setValue('买了咖啡花了25块')
    const preview = wrapper.find('.qep-preview')
    expect(preview.exists()).toBe(true)
    expect(preview.text()).toContain('支出')
    expect(preview.text()).toContain('25')
    expect(preview.text()).toContain('社交')
  })

  it('预览展示账户名与日期', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('.qep-input').setValue('昨天用支付宝买咖啡25')
    expect(wrapper.find('.qep-preview').text()).toContain('支付宝')
  })

  it('一键入账触发 commit 并携带草稿、清空输入', async () => {
    const wrapper = await mountPanel()
    const input = wrapper.find('.qep-input')
    await input.setValue('工资入账8000')
    await wrapper.find('.qep-btn--primary').trigger('click')
    const emitted = wrapper.emitted('commit') as any[]
    expect(emitted).toBeTruthy()
    const draft = emitted[0][0]
    expect(draft.type).toBe('income')
    expect(draft.amount).toBe(8000)
    expect(draft.category).toBe('salary')
    expect((input.element as HTMLTextAreaElement).value).toBe('')
  })

  it('回车（Enter）触发 commit', async () => {
    const wrapper = await mountPanel()
    const input = wrapper.find('.qep-input')
    await input.setValue('买菜花了50')
    await input.trigger('keydown.enter')
    const emitted = wrapper.emitted('commit') as any[]
    expect(emitted).toBeTruthy()
  })

  it('无金额时不渲染一键入账按钮（不可提交）', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('.qep-input').setValue('买了咖啡')
    expect(wrapper.find('.qep-btn--primary').exists()).toBe(false)
    expect(wrapper.emitted('commit')).toBeFalsy()
  })

  it('用户自定义分类参与解析（宠物 → pet）', async () => {
    const cats = buildMerged([{ id: 'pet', name: '宠物', kind: 'expense', icon: '🐾', color: '#c46a5a' }])
    const wrapper = await mountPanel(cats)
    await wrapper.find('.qep-input').setValue('给宠物买粮50')
    expect(wrapper.find('.qep-preview').text()).toContain('宠物')
  })
})
