// ============================================================
// CalendarDisplayPrefsPanel · 日历显示偏好面板（INCR-503）测试
// 覆盖：默认渲染 / 每周首日切换（表头与落盘）/ 开关切换 /
//       固定六行 42 格预览 / 恢复默认
// 依赖真实 calendar-prefs 引擎 + 真实 storage（jsdom）。
// ============================================================
import { describe, expect, it, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { storage } from '../../engine/storage'
import { reloadCalendarPrefs } from '../../modules/calendar-prefs/calendar-prefs'
import CalendarDisplayPrefsPanel from '../CalendarDisplayPrefsPanel.vue'

const KEY = 'hf:calendar_prefs'

describe('CalendarDisplayPrefsPanel · 日历显示偏好', () => {
  beforeEach(() => {
    storage.setKV(KEY, '')
    reloadCalendarPrefs()
  })

  it('渲染标题、首日分段控件与 6 个开关', () => {
    const w = mount(CalendarDisplayPrefsPanel)
    expect(w.text()).toContain('日历显示偏好')
    expect(w.findAll('.calp-seg-btn')).toHaveLength(2)
    expect(w.findAll('.calp-toggle')).toHaveLength(6)
    // 默认周日起始
    expect(w.findAll('.calp-seg-btn')[0].classes()).toContain('is-active')
  })

  it('切换「周一开头」后表头以周一打头并落盘', async () => {
    const w = mount(CalendarDisplayPrefsPanel)
    expect(w.findAll('.calp-preview-wd')[0].text()).toBe('日')
    await w.findAll('.calp-seg-btn')[1].trigger('click')
    expect(w.findAll('.calp-preview-wd')[0].text()).toBe('一')
    expect(storage.getKV(KEY, null)).toMatchObject({ weekStart: 1 })
  })

  it('开启「固定六行」后预览补齐 42 格', async () => {
    const w = mount(CalendarDisplayPrefsPanel)
    const before = w.findAll('.calp-preview-cell').length
    expect(before).toBeLessThanOrEqual(42)
    const sixRow = w.findAll('.calp-toggle').find((t) => t.text().includes('固定六行'))!
    await sixRow.trigger('click')
    expect(w.findAll('.calp-preview-cell')).toHaveLength(42)
    expect(storage.getKV(KEY, null)).toMatchObject({ sixRow: true })
  })

  it('开启「日期加粗」后预览数字带 is-bold', async () => {
    const w = mount(CalendarDisplayPrefsPanel)
    const bold = w.findAll('.calp-toggle').find((t) => t.text().includes('日期加粗'))!
    await bold.trigger('click')
    expect(w.findAll('.calp-preview-num.is-bold').length).toBeGreaterThan(0)
  })

  it('恢复默认清空所有改动', async () => {
    const w = mount(CalendarDisplayPrefsPanel)
    await w.findAll('.calp-seg-btn')[1].trigger('click')
    await w.findAll('.calp-toggle')[0].trigger('click')
    await w.find('.calp-reset').trigger('click')
    expect(w.findAll('.calp-seg-btn')[0].classes()).toContain('is-active')
    // 默认仅「专注时长条」「今天徽章」两开关为开
    expect(w.findAll('.calp-switch.is-on')).toHaveLength(2)
    expect(storage.getKV(KEY, null)).toMatchObject({ weekStart: 0, sixRow: false })
  })
})
