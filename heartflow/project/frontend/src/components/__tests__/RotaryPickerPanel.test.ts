import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'

const mockStore: Record<string, any> = {}
vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (k: string, def: any) => (k in mockStore ? mockStore[k] : def),
    setKV: (k: string, val: any) => {
      mockStore[k] = val
    },
  },
}))

import RotaryPickerPanel from '../RotaryPickerPanel.vue'
import { useRotaryPicker } from '../../modules/rotary-picker'

describe('RotaryPickerPanel', () => {
  beforeEach(() => {
    Object.keys(mockStore).forEach((k) => delete mockStore[k])
    useRotaryPicker().reset()
  })

  it('渲染标题、当前值与预设', () => {
    const w = mount(RotaryPickerPanel)
    expect(w.text()).toContain('滚轮旋钮选择器')
    expect(w.find('.rot-value').text()).toBe('25')
    expect(w.findAll('.rot-preset').length).toBe(4)
    expect(w.text()).toContain('5–120 分钟')
  })

  it('方向键微调数值', async () => {
    const w = mount(RotaryPickerPanel)
    await w.find('.rot-knob').trigger('keydown', { key: 'ArrowUp' })
    expect(w.find('.rot-value').text()).toBe('30')
    await w.find('.rot-knob').trigger('keydown', { key: 'ArrowDown' })
    expect(w.find('.rot-value').text()).toBe('25')
  })

  it('点击预设应用数值', async () => {
    const w = mount(RotaryPickerPanel)
    await w.findAll('.rot-preset')[2].trigger('click')
    expect(w.find('.rot-value').text()).toBe('45')
  })

  it('保存当前值为预设', async () => {
    const w = mount(RotaryPickerPanel)
    await w.find('.rot-input').setValue('我的档位')
    await w.findAll('.rot-btn')[0].trigger('click')
    expect(w.findAll('.rot-preset').length).toBe(5)
    expect(w.text()).toContain('我的档位')
  })

  it('删除预设', async () => {
    const w = mount(RotaryPickerPanel)
    await w.findAll('.rot-preset-del')[0].trigger('click')
    expect(w.findAll('.rot-preset').length).toBe(3)
  })

  it('复位恢复默认值与预设', async () => {
    const w = mount(RotaryPickerPanel)
    await w.findAll('.rot-preset')[2].trigger('click')
    expect(w.find('.rot-value').text()).toBe('45')
    await w.find('.rot-btn--ghost').trigger('click')
    expect(w.find('.rot-value').text()).toBe('25')
    expect(w.findAll('.rot-preset').length).toBe(4)
  })
})
