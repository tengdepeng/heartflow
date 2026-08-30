// ============================================================
// 保险库 · 资产/档案安全审计引擎测试（INCR-12）
// ============================================================
import { describe, it, expect } from 'vitest'
import {
  assetAuditOverview,
  assetCategoryDistribution,
  vaultAssetInsights,
  ASSET_CATEGORY_META,
} from '../vault-analytics'
import type { Asset, Archive } from '../vault'

const NOW = new Date('2026-08-30T00:00:00.000Z')

function asset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: 'a1',
    name: '存款',
    value: 1000,
    category: 'financial',
    note: '招行',
    at: '2026-08-01T00:00:00.000Z',
    _expanded: false,
    ...overrides,
  }
}

function archive(overrides: Partial<Archive> = {}): Archive {
  return {
    id: 'ar1',
    name: '房产证',
    detail: '放在保险柜',
    at: '2026-08-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('assetAuditOverview', () => {
  it('空库返回零值且 largest 为 null', () => {
    const ov = assetAuditOverview([], [], NOW)
    expect(ov.totalAssets).toBe(0)
    expect(ov.totalValue).toBe(0)
    expect(ov.archiveCount).toBe(0)
    expect(ov.categoryCount).toBe(0)
    expect(ov.largest).toBeNull()
    expect(ov.top3Pct).toBe(0)
  })

  it('统计资产价值/分类/最大单项占比', () => {
    const ov = assetAuditOverview(
      [
        asset({ id: 'a', name: '房产', value: 8000, category: 'realestate' }),
        asset({ id: 'b', name: '存款', value: 2000, category: 'financial' }),
      ],
      [],
      NOW,
    )
    expect(ov.totalAssets).toBe(2)
    expect(ov.totalValue).toBe(10000)
    expect(ov.categoryCount).toBe(2)
    expect(ov.largest).toEqual({ name: '房产', value: 8000, pct: 80 })
    expect(ov.top3Pct).toBe(100)
  })

  it('识别价值为0/备注缺失/陈旧记录/档案缺详情', () => {
    const ov = assetAuditOverview(
      [
        asset({ value: 0 }),
        asset({ note: '  ' }),
        asset({ at: '2000-01-01T00:00:00.000Z' }),
        asset({}),
      ],
      [archive({ detail: '' })],
      NOW,
    )
    expect(ov.missingValueCount).toBe(1)
    expect(ov.missingNoteCount).toBe(1)
    expect(ov.staleCount).toBe(1)
    expect(ov.archiveMissingDetailCount).toBe(1)
  })
})

describe('assetCategoryDistribution', () => {
  it('按价值降序聚合，pct 与分类元信息对齐', () => {
    const rows = assetCategoryDistribution([
      asset({ category: 'physical', value: 300 }),
      asset({ category: 'financial', value: 100 }),
      asset({ category: 'financial', value: 600 }),
    ])
    expect(rows[0].cat).toBe('financial')
    expect(rows[0].total).toBe(700)
    expect(rows[0].pct).toBe(70)
    expect(rows[0].icon).toBe(ASSET_CATEGORY_META.financial.icon)
    expect(rows[0].count).toBe(2)
    expect(rows[1].cat).toBe('physical')
    expect(rows.find(r => r.cat === 'physical')!.pct).toBe(30)
  })

  it('空资产返回空数组', () => {
    expect(assetCategoryDistribution([])).toEqual([])
  })
})

describe('vaultAssetInsights', () => {
  it('空库引导文案', () => {
    expect(vaultAssetInsights([], [], NOW, 10).join(' ')).toContain('保险库还空着')
  })

  it('集中度洞察', () => {
    const ins = vaultAssetInsights(
      [asset({ name: '房产', value: 9000, category: 'realestate' }), asset({ value: 1000 })],
      [],
      NOW,
      10,
    )
    expect(ins.join(' ')).toContain('房产')
    expect(ins.join(' ')).toContain('90%')
  })

  it('完整度与陈旧洞察', () => {
    const ins = vaultAssetInsights(
      [asset({ value: 0 }), asset({ note: '' }), asset({ at: '2000-01-01T00:00:00.000Z' })],
      [archive({ detail: '' })],
      NOW,
      10,
    )
    expect(ins.join(' ')).toContain('价值为 0')
    expect(ins.join(' ')).toContain('未填备注')
    expect(ins.join(' ')).toContain('超过半年未更新')
  })

  it('limit 截断条数', () => {
    const many = Array.from({ length: 6 }, (_, i) => asset({ value: i % 2 ? 0 : 1000, note: i % 2 ? '' : 'x' }))
    const ins = vaultAssetInsights(many, [], NOW, 2)
    expect(ins.length).toBeLessThanOrEqual(2)
  })

  it('无风险时不提示风险项', () => {
    const ins = vaultAssetInsights(
      [asset({ value: 5000, note: 'ok' }), asset({ value: 5000, note: 'ok' })],
      [archive({ detail: 'ok' })],
      NOW,
      10,
    )
    expect(ins.every(t => !t.includes('价值为 0') && !t.includes('未填') && !t.includes('半年'))).toBe(true)
  })
})