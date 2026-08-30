// ============================================================
// VaultAuditPanel 组件测试（INCR-12：保险库安全审计面板）
// ============================================================
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import VaultAuditPanel from '../VaultAuditPanel.vue'

function asset(overrides: Record<string, any> = {}) {
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

function archive(overrides: Record<string, any> = {}) {
  return { id: 'ar1', name: '房产证', detail: '放在保险柜', at: '2026-08-01T00:00:00.000Z', ...overrides }
}

function mountPanel(assets: any[] = [], archives: any[] = []) {
  return mount(VaultAuditPanel, { props: { assets, archives } })
}

describe('VaultAuditPanel', () => {
  it('空库渲染引导态与概览零值', () => {
    const wrapper = mountPanel([], [])
    expect(wrapper.text()).toContain('安全审计')
    expect(wrapper.text()).toContain('总价值')
    expect(wrapper.text()).toContain('保险库还空着')
  })

  it('展示资产概览卡与总价值', () => {
    const wrapper = mountPanel(
      [asset({ value: 8000 }), asset({ value: 2000 })],
      [archive()],
    )
    expect(wrapper.text()).toContain('资产条目')
    expect(wrapper.text()).toContain('10,000') // 8k+2k 带千分位
    expect(wrapper.text()).toContain('档案')
    expect(wrapper.text()).toContain('分类')
  })

  it('最大单项集中度预警', () => {
    const wrapper = mountPanel(
      [asset({ name: '房产', value: 9000, category: 'realestate' }), asset({ value: 1000 })],
      [],
    )
    expect(wrapper.text()).toContain('房产')
    expect(wrapper.text()).toContain('90%')
    expect(wrapper.text()).toContain('集中度偏高')
  })

  it('风险清单：价值为0/备注缺失/陈旧/档案缺详情', () => {
    const wrapper = mountPanel(
      [asset({ value: 0 }), asset({ note: '' }), asset({ at: '2000-01-01T00:00:00.000Z' })],
      [archive({ detail: '' })],
    )
    expect(wrapper.text()).toContain('价值为 0')
    expect(wrapper.text()).toContain('未填备注')
    expect(wrapper.text()).toContain('超过半年未更新')
    expect(wrapper.text()).toContain('未填详情')
  })

  it('无风险时提示守备良好', () => {
    const wrapper = mountPanel(
      [asset({ value: 4000, note: 'ok' }), asset({ value: 3500, note: 'ok' }), asset({ value: 2500, note: 'ok' })],
      [archive({ detail: 'ok' })],
    )
    expect(wrapper.text()).toContain('未发现集中度或完整度风险')
  })

  it('分类分布行渲染', () => {
    const wrapper = mountPanel(
      [asset({ category: 'physical', value: 300 }), asset({ category: 'financial', value: 700 })],
      [],
    )
    expect(wrapper.text()).toContain('按分类资产分布')
    expect(wrapper.text()).toContain('金融')
    expect(wrapper.text()).toContain('实物')
  })

  it('温和洞察列表渲染', () => {
    const wrapper = mountPanel(
      [asset({ name: '房产', value: 9500, category: 'realestate' }), asset({ value: 500 })],
      [],
    )
    expect(wrapper.text()).toContain('温和洞察')
    expect(wrapper.text()).toContain('💡')
  })
})