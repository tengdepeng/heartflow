// ============================================================
// INCR-125 · 月相历面板测试
// 覆盖：标题渲染 / 逐日月相格子 / 今日标记 / 流星雨峰值徽标 /
//       月度切换 / 图例
// ============================================================

import { describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import AstronomyCalendarPanel from '../AstronomyCalendarPanel.vue'
import { getMeteorShowersInMonth } from '../../modules/timeline/astronomy'

const MOON_GLYPHS = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘']

async function getWrapper(): Promise<VueWrapper> {
  const wrapper = mount(AstronomyCalendarPanel, { attachTo: document.body })
  await wrapper.vm.$nextTick()
  return wrapper
}

/** 由 0 基月份定位到目标年月应显示的中文标题 */
function expectedMonth(year: number, monthIndex: number): { text: string } {
  let y = year
  let m = monthIndex
  while (m <= 0) { m += 12; y -= 1 }
  while (m > 12) { m -= 12; y += 1 }
  return { text: `${y} 年 ${m} 月` }
}

/** 通过前后翻月按钮把面板导航到目标年月（1 基 month） */
async function navToMonth(wrapper: VueWrapper, targetYear: number, targetMonth: number): Promise<void> {
  const value = wrapper.find('.acld-nav-value').text()
  const m = /(\d{4}) 年 (\d{1,2}) 月/.exec(value)!
  const y = Number(m[1])
  const mon = Number(m[2])
  const steps = (targetYear * 12 + targetMonth) - (y * 12 + mon)
  const prev = wrapper.findAll('.acld-nav-btn')[0]
  const next = wrapper.findAll('.acld-nav-btn')[1]
  for (let i = 0; i < Math.abs(steps); i++) {
    await (steps < 0 ? prev : next).trigger('click')
  }
  await wrapper.vm.$nextTick()
}

describe('INCR-125 AstronomyCalendarPanel 月相历', () => {
  it('渲染标题、副题与星期表头', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('☾ 月相历 · 逐月观星')
    expect(wrapper.text()).toContain('逐日月相 · 流星雨峰值')
    expect(wrapper.findAll('.acld-week-cell').length).toBe(7)
    wrapper.unmount()
  })

  it('当前月渲染 28~31 个不空日用格，且含有效月相图标', async () => {
    const wrapper = await getWrapper()
    const dayCells = wrapper.findAll('.acld-day:not(.blank)')
    expect(dayCells.length).toBeGreaterThanOrEqual(28)
    expect(dayCells.length).toBeLessThanOrEqual(31)
    const icons = wrapper
      .findAll('.acld-day-icon')
      .map(el => el.text())
      .filter(t => t !== '')
    expect(icons.length).toBeGreaterThanOrEqual(28)
    for (const icon of icons) {
      expect(MOON_GLYPHS).toContain(icon)
    }
    wrapper.unmount()
  })

  it('默认落在当前月并高亮今日格（今标记）', async () => {
    const wrapper = await getWrapper()
    const now = new Date()
    expect(wrapper.find('.acld-nav-value').text()).toBe(`${now.getFullYear()} 年 ${now.getMonth() + 1} 月`)
    const todayMark = wrapper.find('.acld-day.today .acld-day-mark')
    expect(todayMark.exists()).toBe(true)
    expect(todayMark.text()).toBe('今')
    wrapper.unmount()
  })

  it('切换到含流星雨的月份（英仙座 2026-08）会渲染峰值徽标与列表', async () => {
    const wrapper = await getWrapper()
    // 从当前月切换到 2026-08：以月份减量导航到 2026/08
    await navToMonth(wrapper, 2026, 8)
    expect(wrapper.find('.acld-nav-value').text()).toBe('2026 年 8 月')

    const showers = getMeteorShowersInMonth(2026, 8)
    expect(showers.some(s => s.name === '英仙座流星雨')).toBe(true)

    // 峰值日 13 号应带 ☄ 徽标
    const peakCell = wrapper
      .findAll('.acld-day:not(.blank)')
      .find(el => el.find('.acld-day-num').text().startsWith('13'))
    expect(peakCell).toBeDefined()
    expect(peakCell!.find('.acld-day-shower').text()).toBe('☄')

    // 活动窗口日内（12~14 号）至少存在标记
    const markers = wrapper.findAll('.acld-day-shower')
    expect(markers.length).toBeGreaterThanOrEqual(1)
    // 本月流星雨列表
    expect(wrapper.find('.acld-showers-title').text()).toContain('本月流星雨')
    expect(wrapper.text()).toContain('英仙座流星雨')
    wrapper.unmount()
  })

  it('月份切换按钮可前后翻月并回到当前月', async () => {
    const wrapper = await getWrapper()
    const now = new Date()
    // prev 两月至「前月-1」
    await wrapper.findAll('.acld-nav-btn')[0].trigger('click')
    await wrapper.findAll('.acld-nav-btn')[0].trigger('click')
    await wrapper.vm.$nextTick()
    const { text: pv } = expectedMonth(now.getFullYear(), now.getMonth() - 1)
    expect(wrapper.find('.acld-nav-value').text()).toBe(pv)
    // 非当前月出现「今月」按钮
    const todayBtn = wrapper.find('.acld-nav-today')
    expect(todayBtn.exists()).toBe(true)
    // next 回退一月至「前月」
    const { text: pm } = expectedMonth(now.getFullYear(), now.getMonth())
    await wrapper.findAll('.acld-nav-btn')[1].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.acld-nav-value').text()).toBe(pm)
    // 「今月」一步回到当前月
    const { text: cur } = expectedMonth(now.getFullYear(), now.getMonth() + 1)
    await todayBtn.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.acld-nav-value').text()).toBe(cur)
    expect(wrapper.find('.acld-nav-today').exists()).toBe(false)
    wrapper.unmount()
  })

  it('图例含 8 个月相项与流星雨峰值标注', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.findAll('.acld-legend-item').length).toBe(8)
    expect(wrapper.find('.acld-legend-peak').text()).toContain('流星雨峰值')
    wrapper.unmount()
  })
})