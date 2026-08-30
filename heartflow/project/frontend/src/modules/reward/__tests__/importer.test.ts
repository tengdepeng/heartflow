import { describe, it, expect } from 'vitest'
import { detectSource, parseCsv, mapAlipay, mapWechat, mapUnionpay, dedupe, guessCategory } from '../importer'
import type { ImportRow } from '../importer'

const ALI_HEADER =
  '交易时间,交易分类,交易对方,对方账号,商品说明,收/支,金额,收/付款方式,交易状态,交易订单号,商家订单号,备注'
const ALI_ROWS = [
  '2026-08-01 12:00:00,餐饮美食,早餐店,xxx,早餐,支出,12.50,余额宝,交易成功,1001,2001,',
  '2026-08-02 13:00:00,转账红包,某人,yyy,红包,收入,88.00,余额宝,交易成功,1002,2002,',
]
const WX_HEADER =
  '交易时间,交易类型,交易对方,商品,收/支,金额(元),支付方式,当前状态,交易单号,商户单号,备注'
const WX_ROWS = ['2026-08-03 09:00:00,商户消费,便利店,饮料,支出,¥6.00,零钱,支付成功,3001,4001,']
const UP_HEADER =
  '交易日期,交易时间,交易类型,交易金额,交易卡号,商户名称,商户类型,交易流水号,授权号,交易状态,备注'
const UP_ROWS = [
  '2026-08-05,09:30:00,消费,-128.00,6222****1234,星巴克咖啡,餐饮,5001,AUTH99,',
  '2026-08-06,10:00:00,退款,35.00,6222****1234,某商城,退货,5002,AUTH88,',
]

describe('importer 引擎', () => {
  it('detectSource 识别支付宝/微信/银联/未知', () => {
    expect(detectSource(ALI_HEADER)).toBe('alipay')
    expect(detectSource(WX_HEADER)).toBe('wechat')
    expect(detectSource(UP_HEADER)).toBe('unionpay')
    expect(detectSource('foo,bar')).toBe('unknown')
  })

  it('支付宝行映射为归一化记录', () => {
    const row = parseCsv(ALI_HEADER + '\n' + ALI_ROWS[0])[0]
    const m = mapAlipay(row)
    expect(m?.type).toBe('expense')
    expect(m?.amount).toBe(12.5)
    expect(m?.bizId).toBe('1001')
    expect(m?.at).toBe('2026-08-01T00:00:00.000Z')
  })

  it('支付宝收入行映射为 income', () => {
    const row = parseCsv(ALI_HEADER + '\n' + ALI_ROWS[1])[0]
    const m = mapAlipay(row)
    expect(m?.type).toBe('income')
    expect(m?.amount).toBe(88)
  })

  it('微信行映射金额去掉货币符号', () => {
    const row = parseCsv(WX_HEADER + '\n' + WX_ROWS[0])[0]
    const m = mapWechat(row)
    expect(m?.amount).toBe(6)
    expect(m?.type).toBe('expense')
    expect(m?.bizId).toBe('3001')
  })

  it('银联消费行映射为支出并取金额绝对值', () => {
    const row = parseCsv(UP_HEADER + '\n' + UP_ROWS[0])[0]
    const m = mapUnionpay(row)
    expect(m?.type).toBe('expense')
    expect(m?.amount).toBe(128)
    expect(m?.note).toBe('星巴克咖啡')
    expect(m?.bizId).toBe('5001')
    expect(m?.category).toBe('social')
  })

  it('银联退款行映射为收入', () => {
    const row = parseCsv(UP_HEADER + '\n' + UP_ROWS[1])[0]
    const m = mapUnionpay(row)
    expect(m?.type).toBe('income')
    expect(m?.amount).toBe(35)
    expect(m?.bizId).toBe('5002')
  })

  it('dedupe 按 bizId 去重后返回未导入项', () => {
    const existing = [{ bizId: '1001', at: 'x', type: 'expense' as const, amount: 1 }]
    const fresh: ImportRow[] = [
      { at: '2026-08-01T00:00:00.000Z', type: 'expense', amount: 12.5, category: 'other-expense', note: '', bizId: '1001' },
      { at: '2026-08-02T00:00:00.000Z', type: 'income', amount: 88, category: 'other-expense', note: '', bizId: '2000' },
    ]
    expect(dedupe(existing, fresh).map(x => x.bizId)).toEqual(['2000'])
  })

  it('parseCsv 能处理带引号包裹的字段', () => {
    const rows = parseCsv('交易时间,商品说明\n2026-08-01,"他说""你好,再见"\n')
    expect(rows[0]['商品说明']).toBe('他说"你好,再见')
  })

  describe('guessCategory 类别映射', () => {
    it('支出关键词归类', () => {
      expect(guessCategory('餐饮美食 早餐', 'expense')).toBe('social')
      expect(guessCategory('数码家电 iPhone', 'expense')).toBe('tools')
      expect(guessCategory('教育培训 课程', 'expense')).toBe('learning')
      expect(guessCategory('医疗健康 药店', 'expense')).toBe('health')
      expect(guessCategory('无法识别的描述', 'expense')).toBe('other-expense')
    })

    it('收入关键词归类', () => {
      expect(guessCategory('工资 发放', 'income')).toBe('salary')
      expect(guessCategory('稿费 结算', 'income')).toBe('freelance')
      expect(guessCategory('理财收益 分红', 'income')).toBe('investment')
      expect(guessCategory('转账 红包', 'income')).toBe('gift')
      expect(guessCategory('未知收入', 'income')).toBe('other-income')
    })

    it('默认按支出处理（无 type 参数）', () => {
      expect(guessCategory('外卖')).toBe('social')
      expect(guessCategory('随便什么')).toBe('other-expense')
    })

    it('支付宝收支行类别随类型分支', () => {
      const exp = parseCsv(ALI_HEADER + '\n' + ALI_ROWS[0])[0] // 支出·餐饮美食
      const inc = parseCsv(ALI_HEADER + '\n' + ALI_ROWS[1])[0] // 收入·转账红包
      expect(mapAlipay(exp)?.category).toBe('social')
      expect(mapAlipay(inc)?.category).toBe('gift')
    })
  })
})