// ============================================================
// 三层空间 · 切换面板（SwitchPanel）组件单测
// 覆盖：开合渲染 / 关闭 / 底层氛围壳选择发起 setActiveShell /
//       中层交互面选择发起 setSurfaceState / 选中态高亮
// 依赖 mock：useLayerSwitch（isOpen/close）、useConfigStore（worldShell 双向）。
// ============================================================

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

const { mockIsOpen, mockClose, mockSetActiveShell, mockSetSurfaceState } = vi.hoisted(() => {
  const state = { value: true, ref: null as any }
  return {
    mockIsOpen: state,
    mockClose: vi.fn(),
    mockSetActiveShell: vi.fn(),
    mockSetSurfaceState: vi.fn(),
  }
})

// 用 Vue 的 ref 提升待比对的响应性：组件模板 v-if="isOpen" 需要真 Ref
const isOpenRef = ref(true)
mockIsOpen.ref = isOpenRef

vi.mock('../../composables/useLayerSwitch', () => ({
  useLayerSwitch: () => ({ isOpen: mockIsOpen.ref, close: mockClose }),
}))

const { mockConfigStore } = vi.hoisted(() => ({
  mockConfigStore: () => ({
    config: {
      worldShell: { activeShell: 'stars', surfaceState: 'screen' },
    },
    setActiveShell: mockSetActiveShell,
    setSurfaceState: mockSetSurfaceState,
  }),
}))

vi.mock('../../stores/config', () => ({
  useConfigStore: () => mockConfigStore(),
}))

import SwitchPanel from '../SwitchPanel.vue'

async function getWrapper() {
  return mount(SwitchPanel, { attachTo: document.body })
}

describe('SwitchPanel · 三层空间切换面板', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isOpenRef.value = true
  })

  it('渲染 7 种底层氛围壳 + 3 种中层交互面', async () => {
    const w = await getWrapper()
    expect(w.find('.switch-panel').exists()).toBe(true)
    const chips = w.findAll('.sp-chip')
    expect(chips.length).toBe(10) // 7 shell + 3 surface
    expect(w.text()).toContain('纯色')
    expect(w.text()).toContain('星辰 3D')
    expect(w.text()).toContain('视频')
    expect(w.text()).toContain('屏风')
    expect(w.text()).toContain('地图 2D')
  })

  it('当前 shell/surface 高亮 active', async () => {
    const w = await getWrapper()
    const active = w.findAll('.sp-chip.active')
    expect(active.length).toBe(2)
    expect(active[0].text()).toContain('星辰 2D')
    expect(active[1].text()).toContain('屏风')
  })

  it('点击底层氛围壳按钮发起 setActiveShell', async () => {
    const w = await getWrapper()
    const courtyard3d = w.findAll('.sp-chip').find((b) => b.text() === '宅院 3D')!
    await courtyard3d.trigger('click')
    expect(mockSetActiveShell).toHaveBeenCalledWith('courtyard-3d')
  })

  it('点击中层交互面按钮发起 setSurfaceState', async () => {
    const w = await getWrapper()
    const map2d = w.findAll('.sp-chip').find((b) => b.text() === '地图 2D')!
    await map2d.trigger('click')
    expect(mockSetSurfaceState).toHaveBeenCalledWith('map-2d')
  })

  it('关闭按钮触发 close；isOpen=false 时整面板隐藏', async () => {
    const w = await getWrapper()
    await w.find('.sp-close').trigger('click')
    expect(mockClose).toHaveBeenCalled()
    isOpenRef.value = false
    await w.vm.$nextTick()
    expect(w.find('.switch-panel').exists()).toBe(false)
  })
})