import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

const ALI = [
  '交易时间,交易分类,交易对方,对方账号,商品说明,收/支,金额,收/付款方式,交易状态,交易订单号,商家订单号,备注',
  '2026-08-01 12:00:00,餐饮美食,早餐店,xxx,早餐,支出,12.50,余额宝,交易成功,1001,2001,',
].join('\n')

async function mountPanel() {
  const { default: P } = await import('../ImportPanel.vue')
  const w = mount(P)
  return w
}
function setFiles(input: HTMLInputElement, text: string, name = 'bill.csv'): void {
  const dt = new DataTransfer()
  dt.items.add(new File([text], name, { type: 'text/csv' }))
  Object.defineProperty(input, 'files', { value: dt.files, configurable: true })
}

describe('ImportPanel', () => {
  it('渲染标题与文件选择', async () => {
    const w = await mountPanel()
    expect(w.text()).toContain('导入账单')
    const input = w.find('input[type="file"]')
    expect(input.exists()).toBe(true)
    expect(input.attributes('accept')).toContain('.csv')
  })

  it('初始无预览、无错误', async () => {
    const w = await mountPanel()
    expect(w.find('.imp-list').exists()).toBe(false)
    expect(w.find('.imp-error').exists()).toBe(false)
  })

  it('选择支付宝账单后预览并确认导入', async () => {
    const w = await mountPanel()
    const input = w.find('input[type="file"]').element as HTMLInputElement
    setFiles(input, ALI)
    await input.dispatchEvent(new Event('change'))
    await new Promise(r => setTimeout(r, 20))

    expect(w.text()).toContain('支付宝账单')
    expect(w.text()).toContain('预览 1 条')
    expect(w.text()).toContain('¥12.5')

    await w.find('.imp-actions .imp-btn').trigger('click')
    const emitted = w.emitted('import:records')
    expect(emitted).toBeTruthy()
    const [rows, src] = emitted![0] as [Array<{ amount: number; bizId: string }>, string]
    expect(src).toBe('alipay')
    expect(rows[0].amount).toBe(12.5)
    expect(rows[0].bizId).toBe('1001')
  })

  it('未知来源显示错误提示', async () => {
    const w = await mountPanel()
    const input = w.find('input[type="file"]').element as HTMLInputElement
    setFiles(input, 'foo,bar\n1,2')
    await input.dispatchEvent(new Event('change'))
    await new Promise(r => setTimeout(r, 20))
    expect(w.text()).toContain('未能识别该文件来源')
  })
})