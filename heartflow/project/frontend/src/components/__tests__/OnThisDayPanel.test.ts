// ============================================================
// OnThisDayPanel · 历史上的今天面板（INCR-510）测试
// 覆盖：结构渲染 / 分类筛选 / 关键词搜索 / 按日期浏览 /
//       随机一桩 / 收藏落盘与收藏夹。
// 依赖真实 on-this-day 引擎 + 真实 storage（jsdom）。
// ============================================================
import { describe, expect, it, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { storage } from '../../engine/storage'
import { reloadOnThisDay, HISTORY_CATEGORIES } from '../../modules/on-this-day/on-this-day'
import OnThisDayPanel from '../OnThisDayPanel.vue'

const KEY = 'hf:on_this_day_favs'

describe('OnThisDayPanel · 历史上的今天', () => {
  beforeEach(() => {
    storage.setKV(KEY, '')
    reloadOnThisDay()
  })

  it('渲染标题、分类芯片、搜索框与控件', () => {
    const w = mount(OnThisDayPanel)
    expect(w.text()).toContain('历史上的今天')
    expect(w.findAll('.otd-chip')).toHaveLength(HISTORY_CATEGORIES.length + 1) // 全部 + 各分类
    expect(w.find('.otd-search').exists()).toBe(true)
    expect(w.findAll('.otd-select')).toHaveLength(2)
  })

  it('切换日期到 10 月 1 日展示对应历史事件', async () => {
    const w = mount(OnThisDayPanel)
    await w.findAll('.otd-select')[0].setValue('10')
    await w.findAll('.otd-select')[1].setValue('1')
    await w.vm.$nextTick()
    expect(w.text()).toContain('中华人民共和国成立')
  })

  it('分类芯片筛选后条目均为该分类', async () => {
    const w = mount(OnThisDayPanel)
    const explore = w.findAll('.otd-chip').find((c) => c.text() === '探索')!
    await explore.trigger('click')
    const cats = w.findAll('.otd-cat')
    expect(cats.length).toBeGreaterThan(0)
    expect(cats.every((c) => c.text() === '探索')).toBe(true)
  })

  it('关键词搜索过滤条目', async () => {
    const w = mount(OnThisDayPanel)
    await w.find('.otd-search').setValue('登月')
    await w.vm.$nextTick()
    const items = w.findAll('.otd-item')
    expect(items.length).toBeGreaterThan(0)
    expect(items.every((i) => i.text().includes('登月'))).toBe(true)
  })

  it('随机一桩只展示一条且标题为随机一桩', async () => {
    const w = mount(OnThisDayPanel)
    await w.findAll('.otd-btn')[0].trigger('click')
    await w.vm.$nextTick()
    expect(w.findAll('.otd-item')).toHaveLength(1)
    expect(w.text()).toContain('随机一桩')
  })

  it('收藏落盘并可在收藏夹查看', async () => {
    const w = mount(OnThisDayPanel)
    await w.findAll('.otd-select')[0].setValue('10')
    await w.findAll('.otd-select')[1].setValue('1')
    await w.vm.$nextTick()
    await w.find('.otd-star').trigger('click')
    await w.vm.$nextTick()

    expect(storage.getKV<string[]>(KEY, [])).toContain('h-1949-prc')
    expect(w.text()).toContain('收藏 1')

    await w.findAll('.otd-btn')[1].trigger('click') // 打开收藏夹
    await w.vm.$nextTick()
    expect(w.find('.otd-favs').exists()).toBe(true)
    expect(w.find('.otd-favs').text()).toContain('中华人民共和国成立')
  })
})
