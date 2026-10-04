// ============================================================
// MoonAtlasPanel · 月面地名导览面板（INCR-512）测试
// 覆盖：结构渲染 / 类型筛选 / 关键词搜索 / 直径排序切换 /
//       点击条目显示详情卡 / 背面特征提示。
// 依赖真实 moon-atlas 引擎（纯本地静态数据，无存储）。
// ============================================================
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import {
  LUNAR_FEATURES,
  FEATURE_TYPE_ORDER,
  featuresByType,
  sortByDiameter,
} from '../../modules/sky/moon-atlas'
import MoonAtlasPanel from '../MoonAtlasPanel.vue'

describe('MoonAtlasPanel · 月面地名导览', () => {
  it('渲染标题、全部类型芯片与全部地名条目', () => {
    const w = mount(MoonAtlasPanel)
    expect(w.text()).toContain('月面地名导览')
    expect(w.findAll('.mna-chip')).toHaveLength(FEATURE_TYPE_ORDER.length + 1) // 全部 + 各类型
    expect(w.findAll('.mna-item')).toHaveLength(LUNAR_FEATURES.length)
    expect(w.findAll('.mna-feat')).toHaveLength(LUNAR_FEATURES.length)
  })

  it('类型筛选后条目数与该类型一致', async () => {
    const w = mount(MoonAtlasPanel)
    const crater = w.findAll('.mna-chip').find((c) => c.text() === '环形山')!
    await crater.trigger('click')
    await w.vm.$nextTick()
    expect(w.findAll('.mna-item')).toHaveLength(featuresByType('crater').length)
  })

  it('关键词搜索过滤条目', async () => {
    const w = mount(MoonAtlasPanel)
    await w.find('.mna-search').setValue('静海')
    await w.vm.$nextTick()
    const items = w.findAll('.mna-item')
    expect(items.length).toBeGreaterThan(0)
    expect(items.some((i) => i.text().includes('静海'))).toBe(true)
  })

  it('切换直径排序后首条变为最小特征', async () => {
    const w = mount(MoonAtlasPanel)
    const before = w.findAll('.mna-item-name')[0].text()
    await w.find('.mna-sort').trigger('click')
    await w.vm.$nextTick()
    const after = w.findAll('.mna-item-name')[0].text()
    expect(after).not.toBe(before)
    expect(after).toBe(sortByDiameter(LUNAR_FEATURES, false)[0].nameZh)
  })

  it('点击条目展示详情卡（含中/拉丁名与直径）', async () => {
    const w = mount(MoonAtlasPanel)
    await w.findAll('.mna-item')[0].trigger('click')
    await w.vm.$nextTick()
    const card = w.find('.mna-card')
    expect(card.exists()).toBe(true)
    const first = sortByDiameter(LUNAR_FEATURES, true)[0]
    expect(card.text()).toContain(first.nameZh)
    expect(card.text()).toContain(first.name)
    expect(card.text()).toContain(String(first.diameter))
  })

  it('背面特征详情卡给出不可见提示', async () => {
    const w = mount(MoonAtlasPanel)
    await w.find('.mna-search').setValue('莫斯科')
    await w.vm.$nextTick()
    await w.findAll('.mna-item')[0].trigger('click')
    await w.vm.$nextTick()
    expect(w.find('.mna-card-far').exists()).toBe(true)
    expect(w.find('.mna-card-far').text()).toContain('背面')
  })
})
