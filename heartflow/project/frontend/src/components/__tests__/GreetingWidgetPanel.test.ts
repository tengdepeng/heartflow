import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ref, computed, nextTick, type Ref } from 'vue'
import { mount } from '@vue/test-utils'
import type {
  FloatingConfig,
  FloatingPosition,
  FloatingAnimation,
  GreetingPeriod,
  WidgetType,
  WidgetSize,
  WidgetInstance,
} from '../../modules/touchpoints/types'
import { DEFAULT_FLOATING_CONFIG } from '../../modules/touchpoints/types'

// ---- 问候引擎 mock ----
const config: Ref<FloatingConfig> = ref({ ...DEFAULT_FLOATING_CONFIG })
const isVisible = ref(false)
const currentPeriod = ref<GreetingPeriod>('morning')
const currentGreeting = ref({ message: '早安', subtitle: '今日心锚已就绪' })
const getConfig = vi.fn(() => ({ ...config.value }))
const updateConfig = vi.fn((partial: Partial<FloatingConfig>) => { config.value = { ...config.value, ...partial } })
const toggle = vi.fn(() => { config.value.enabled = !config.value.enabled; return config.value.enabled })
const setPosition = vi.fn((p: FloatingPosition) => { config.value.position = p })
const setAnimation = vi.fn((a: FloatingAnimation) => { config.value.animation = a })
const setDisplayDuration = vi.fn((ms: number) => { config.value.displayDuration = ms })
const setGreetingMode = vi.fn((m: GreetingPeriod) => { config.value.greetingMode = m })
const show = vi.fn(() => { isVisible.value = true })
const hide = vi.fn(() => { isVisible.value = false })
const getGreeting = vi.fn(() => ({ message: '早安，新的一天开始了。', subtitle: '今日心锚已就绪' }))
const reset = vi.fn(() => { config.value = { ...DEFAULT_FLOATING_CONFIG } })

vi.mock('../../modules/touchpoints/greeting-engine', () => ({
  useGreetingEngine: () => ({
    config,
    isVisible,
    currentPeriod,
    currentGreeting,
    getConfig,
    updateConfig,
    toggle,
    setPosition,
    setAnimation,
    setDisplayDuration,
    setGreetingMode,
    show,
    hide,
    getGreeting,
    reset,
  }),
}))

// ---- 小组件引擎 mock ----
const widgets: Ref<WidgetInstance[]> = ref([])
const enabledWidgets = computed(() => widgets.value.filter((w) => w.enabled))
const widgetsByType = computed(() => {
  const map = new Map<WidgetType, WidgetInstance[]>()
  for (const w of widgets.value) {
    const list = map.get(w.type) || []
    list.push(w)
    map.set(w.type, list)
  }
  return map
})
const addWidget = vi.fn((type: WidgetType) => {
  const w: WidgetInstance = { id: `w_${widgets.value.length + 1}`, type, x: 68, y: 10, size: 'small', enabled: true, createdAt: Date.now() }
  widgets.value = [...widgets.value, w]
  return w
})
const removeWidget = vi.fn((id: string) => {
  widgets.value = widgets.value.filter((w) => w.id !== id)
  return true
})
const updatePosition = vi.fn()
const updateSize = vi.fn((id: string, size: WidgetSize) => {
  const w = widgets.value.find((x) => x.id === id)
  if (w) w.size = size
  return true
})
const toggleWidget = vi.fn((id: string) => {
  const w = widgets.value.find((x) => x.id === id)
  if (w) { w.enabled = !w.enabled; return w.enabled }
  return false
})
const setWidgetEnabled = vi.fn()
const getWidget = vi.fn()
const getWidgetsByType = vi.fn()
const resetToDefault = vi.fn(() => {
  widgets.value = [
    { id: 'w_d1', type: 'pomodoro', x: 68, y: 10, size: 'small', enabled: true, createdAt: Date.now() },
    { id: 'w_d2', type: 'quote', x: 68, y: 68, size: 'small', enabled: true, createdAt: Date.now() },
  ]
})
const suggestLayout = vi.fn()

vi.mock('../../modules/touchpoints/widget-manager', () => ({
  useWidgetManager: () => ({
    widgets,
    enabledWidgets,
    widgetsByType,
    addWidget,
    removeWidget,
    updatePosition,
    updateSize,
    toggleWidget,
    setWidgetEnabled,
    getWidget,
    getWidgetsByType,
    resetToDefault,
    suggestLayout,
  }),
}))

import GreetingWidgetPanel from '../GreetingWidgetPanel.vue'

beforeEach(() => {
  config.value = { ...DEFAULT_FLOATING_CONFIG }
  isVisible.value = false
  currentPeriod.value = 'morning'
  widgets.value = []
  getConfig.mockClear()
  updateConfig.mockClear()
  toggle.mockClear()
  setPosition.mockClear()
  setAnimation.mockClear()
  setDisplayDuration.mockClear()
  setGreetingMode.mockClear()
  show.mockClear()
  hide.mockClear()
  getGreeting.mockClear()
  reset.mockClear()
  addWidget.mockClear()
  removeWidget.mockClear()
  updateSize.mockClear()
  toggleWidget.mockClear()
  resetToDefault.mockClear()
})

describe('GreetingWidgetPanel · 问候浮窗与桌面小组件接线', () => {
  it('空态：标题渲染 + 浮窗默认配置 + 小组件空态', async () => {
    const wrapper = mount(GreetingWidgetPanel)
    await nextTick()
    const text = wrapper.text()
    expect(text).toContain('问候浮窗与桌面小组件')
    expect(text).toContain('幕僚问候')
    expect(text).toContain('启用浮窗')
    expect(text).toContain('当前时段 · 早')
    expect(text).toContain('暂无小组件')
  })

  it('启用开关：点击 → updateConfig 接线', async () => {
    const wrapper = mount(GreetingWidgetPanel)
    await nextTick()
    const checkbox = wrapper.findAll('.gwp-block')[0].find('input[type="checkbox"]')
    expect((checkbox.element as HTMLInputElement).checked).toBe(false)
    await checkbox.setValue(true)
    expect(updateConfig).toHaveBeenCalledWith({ enabled: true })
  })

  it('位置选择：点击 → setPosition 接线', async () => {
    const wrapper = mount(GreetingWidgetPanel)
    await nextTick()
    const chips = wrapper.findAll('.gwp-block')[0].findAll('.gwp-chip')
    // 位置 chips：右上/左上/右下/左下/居中（前 5 个）
    await chips[2].trigger('click')
    expect(setPosition).toHaveBeenCalledWith('bottom-right')
    await chips[4].trigger('click')
    expect(setPosition).toHaveBeenCalledWith('center')
  })

  it('动画选择：点击 → setAnimation 接线', async () => {
    const wrapper = mount(GreetingWidgetPanel)
    await nextTick()
    const chips = wrapper.findAll('.gwp-block')[0].findAll('.gwp-chip')
    // 位置 5 + 动画 5：动画从索引 5 开始
    await chips[6].trigger('click')
    expect(setAnimation).toHaveBeenCalledWith('slide-up')
    await chips[9].trigger('click')
    expect(setAnimation).toHaveBeenCalledWith('bounce')
  })

  it('显示时长：点击 → setDisplayDuration 接线', async () => {
    const wrapper = mount(GreetingWidgetPanel)
    await nextTick()
    const chips = wrapper.findAll('.gwp-block')[0].findAll('.gwp-chip')
    // 位置 5 + 动画 5 + 时长 4：时长从索引 10 开始
    await chips[10].trigger('click')
    expect(setDisplayDuration).toHaveBeenCalledWith(3000)
    await chips[13].trigger('click')
    expect(setDisplayDuration).toHaveBeenCalledWith(0)
  })

  it('问候模式：点击 → setGreetingMode 接线', async () => {
    const wrapper = mount(GreetingWidgetPanel)
    await nextTick()
    const chips = wrapper.findAll('.gwp-block')[0].findAll('.gwp-chip')
    // 位置 5 + 动画 5 + 时长 4 + 模式 5：模式从索引 14 开始
    await chips[14].trigger('click')
    expect(setGreetingMode).toHaveBeenCalledWith('auto')
    await chips[15].trigger('click')
    expect(setGreetingMode).toHaveBeenCalledWith('morning')
  })

  it('预览问候：点击 → getGreeting 接线 + 渲染问候语', async () => {
    const wrapper = mount(GreetingWidgetPanel)
    await nextTick()
    const buttons = wrapper.findAll('.gwp-block')[0].findAll('.gwp-btn')
    await buttons[0].trigger('click')
    expect(getGreeting).toHaveBeenCalled()
    await nextTick()
    expect(wrapper.text()).toContain('早安，新的一天开始了。')
    expect(wrapper.text()).toContain('今日心锚已就绪')
  })

  it('显示/隐藏浮窗：点击 → show/hide 接线', async () => {
    const wrapper = mount(GreetingWidgetPanel)
    await nextTick()
    const buttons = wrapper.findAll('.gwp-block')[0].findAll('.gwp-btn')
    await buttons[1].trigger('click')
    expect(show).toHaveBeenCalled()
    await buttons[2].trigger('click')
    expect(hide).toHaveBeenCalled()
  })

  it('重置：点击 → reset 接线', async () => {
    const wrapper = mount(GreetingWidgetPanel)
    await nextTick()
    const buttons = wrapper.findAll('.gwp-block')[0].findAll('.gwp-btn')
    await buttons[3].trigger('click')
    expect(reset).toHaveBeenCalled()
  })

  it('添加小组件：选类型点添加 → addWidget 接线 + 列表渲染', async () => {
    const wrapper = mount(GreetingWidgetPanel)
    await nextTick()
    const block = wrapper.findAll('.gwp-block')[1]
    const chips = block.findAll('.gwp-chip')
    // 添加类型 chips：6 种（番茄钟/逐日心锚/情绪速记/速记便签/气象心情/每日一言）
    await chips[1].trigger('click')
    const addBtn = block.findAll('.gwp-btn').find((b) => b.text().includes('添加'))
    await addBtn!.trigger('click')
    expect(addWidget).toHaveBeenCalledWith('daily-anchor')
    await nextTick()
    const text = wrapper.text()
    expect(text).toContain('逐日心锚')
    expect(text).toContain('位置 68%,10%')
    expect(text).toContain('总数')
    expect(text).toContain('1')
  })

  it('删除小组件：点删除 → removeWidget 接线', async () => {
    widgets.value = [{ id: 'w_1', type: 'quote', x: 68, y: 10, size: 'small', enabled: true, createdAt: Date.now() }]
    const wrapper = mount(GreetingWidgetPanel)
    await nextTick()
    const block = wrapper.findAll('.gwp-block')[1]
    const delBtn = block.findAll('.gwp-btn').find((b) => b.text().includes('删除'))
    await delBtn!.trigger('click')
    expect(removeWidget).toHaveBeenCalledWith('w_1')
  })

  it('尺寸切换：改 select → updateSize 接线', async () => {
    widgets.value = [{ id: 'w_1', type: 'quote', x: 68, y: 10, size: 'small', enabled: true, createdAt: Date.now() }]
    const wrapper = mount(GreetingWidgetPanel)
    await nextTick()
    const select = wrapper.find('.gwp-widget-controls select')
    await select.setValue('large')
    expect(updateSize).toHaveBeenCalledWith('w_1', 'large')
  })

  it('启用切换：点 checkbox → toggleWidget 接线', async () => {
    widgets.value = [{ id: 'w_1', type: 'quote', x: 68, y: 10, size: 'small', enabled: true, createdAt: Date.now() }]
    const wrapper = mount(GreetingWidgetPanel)
    await nextTick()
    const checkbox = wrapper.find('.gwp-widget-controls input[type="checkbox"]')
    await checkbox.setValue(false)
    expect(toggleWidget).toHaveBeenCalledWith('w_1')
  })

  it('重置默认布局：点按钮 → resetToDefault 接线 + 列表更新', async () => {
    const wrapper = mount(GreetingWidgetPanel)
    await nextTick()
    const block = wrapper.findAll('.gwp-block')[1]
    const resetBtn = block.findAll('.gwp-btn').find((b) => b.text().includes('重置默认布局'))
    await resetBtn!.trigger('click')
    expect(resetToDefault).toHaveBeenCalled()
    await nextTick()
    expect(wrapper.text()).toContain('番茄钟')
    expect(wrapper.text()).toContain('每日一言')
  })
})
