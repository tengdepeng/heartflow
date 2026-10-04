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

import WidgetHotzonePanel from '../WidgetHotzonePanel.vue'
import { useWidgetHotzone, DEFAULT_HOTZONES, MAX_HOTZONES } from '../../modules/widget-hotzone'

describe('WidgetHotzonePanel', () => {
  beforeEach(() => {
    Object.keys(mockStore).forEach((k) => delete mockStore[k])
    useWidgetHotzone().reset()
  })

  it('渲染标题与默认热区', () => {
    const w = mount(WidgetHotzonePanel)
    expect(w.text()).toContain('组件自定义点击热区')
    expect(w.findAll('.whz-zone').length).toBe(DEFAULT_HOTZONES.length)
    expect(w.findAll('.whz-zone')[0].classes()).toContain('selected')
    w.unmount()
  })

  it('新增热区并选中', async () => {
    const w = mount(WidgetHotzonePanel)
    await w.find('.whz-add').trigger('click')
    expect(w.findAll('.whz-zone').length).toBe(DEFAULT_HOTZONES.length + 1)
    w.unmount()
  })

  it('方向键微调选中热区', async () => {
    const w = mount(WidgetHotzonePanel)
    const h = useWidgetHotzone()
    const id = h.zones.value[0].id
    const before = h.zones.value[0].x
    await w.find('.whz-right').trigger('click')
    const after = h.zones.value.find((z) => z.id === id)!.x
    expect(after).toBeGreaterThan(before)
    w.unmount()
  })

  it('缩放选中热区', async () => {
    const w = mount(WidgetHotzonePanel)
    const h = useWidgetHotzone()
    const id = h.zones.value[0].id
    const before = h.zones.value[0].w
    await w.find('.whz-grow-btn').trigger('click')
    expect(h.zones.value.find((z) => z.id === id)!.w).toBe(before + 4)
    w.unmount()
  })

  it('编辑名称写入引擎', async () => {
    const w = mount(WidgetHotzonePanel)
    const h = useWidgetHotzone()
    const id = h.zones.value[0].id
    await w.find('.whz-label-input').setValue('左上角')
    expect(h.zones.value.find((z) => z.id === id)!.label).toBe('左上角')
    w.unmount()
  })

  it('删除选中热区', async () => {
    const w = mount(WidgetHotzonePanel)
    await w.find('.whz-del').trigger('click')
    expect(w.findAll('.whz-zone').length).toBe(DEFAULT_HOTZONES.length - 1)
    w.unmount()
  })

  it('清空后显示空态，复位恢复默认', async () => {
    const w = mount(WidgetHotzonePanel)
    await w.find('.whz-clear').trigger('click')
    expect(w.findAll('.whz-zone').length).toBe(0)
    expect(w.find('.whz-empty').exists()).toBe(true)
    await w.find('.whz-reset').trigger('click')
    expect(w.findAll('.whz-zone').length).toBe(DEFAULT_HOTZONES.length)
    w.unmount()
  })

  it('达到上限时新增按钮禁用', async () => {
    const w = mount(WidgetHotzonePanel)
    const h = useWidgetHotzone()
    while (h.canAdd.value) h.addZone()
    await w.vm.$nextTick()
    expect(h.zones.value.length).toBe(MAX_HOTZONES)
    expect((w.find('.whz-add').element as HTMLButtonElement).disabled).toBe(true)
    w.unmount()
  })
})
