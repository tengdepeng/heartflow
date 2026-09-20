// ============================================================
// 可视化·驾驶舱总览面板测试（INCR-388）
// mock 直接子路径 ../../modules/visualization/visualization-bridge 注入受控 ref
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

function baseState() {
  return {
    viewport: { scale: 1, translateX: 0, translateY: 0 },
    annotationCount: 0,
    isPanning: false,
    isTransitioning: false,
    fps: 0,
    layerCount: 0,
    commandCount: 0,
    dirtyRegionCount: 0,
    connectedSources: 0,
    totalSources: 0,
    errorSources: 0,
    panelCount: 0,
    maxRow: 0,
    currentBreakpoint: null,
  }
}

const state = ref<any>(baseState())

vi.mock('../../modules/visualization/visualization-bridge', () => ({
  useVisualizationBridge: () => ({ state }),
}))

async function mountPanel() {
  const mod = await import('../VisualizationCockpitPanel.vue')
  return mount(mod.default)
}

describe('VisualizationCockpitPanel 可视化·驾驶舱总览（INCR-388）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.value = baseState()
  })

  it('空态：标题 + 徽标待命 + 四区块 + 空态引导', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('[data-test="visualization-cockpit-panel"]').exists()).toBe(true)
    expect(wrapper.find('.vzp-title').text()).toContain('可视化·驾驶舱总览')
    expect(wrapper.find('[data-test="vzp-status"]').classes()).toContain('idle')
    expect(wrapper.text()).toContain('待命')
    expect(wrapper.find('[data-test="vzp-perf"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="vzp-source"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="vzp-interact"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="vzp-layout"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="vzp-empty"]').text()).toContain('驾驶舱尚在待命')
  })

  it('渲染性能：fps/图层/绘制命令/脏区域数值正确映射', async () => {
    state.value = { ...baseState(), fps: 60, layerCount: 4, commandCount: 120, dirtyRegionCount: 3 }
    const wrapper = await mountPanel()
    const cells = wrapper.findAll('[data-test="vzp-cell"]')
    expect(cells[0].text()).toContain('60')
    expect(cells[0].text()).toContain('FPS')
    expect(cells[1].text()).toContain('4')
    expect(cells[2].text()).toContain('120')
    expect(cells[3].text()).toContain('3')
  })

  it('数据源健康：已连接/源总数/错误源 + 错误源警告 + 徽标有异常', async () => {
    state.value = { ...baseState(), connectedSources: 2, totalSources: 3, errorSources: 1 }
    const wrapper = await mountPanel()
    expect(wrapper.find('[data-test="vzp-status"]').classes()).toContain('warn')
    expect(wrapper.text()).toContain('有异常')
    const cells = wrapper.findAll('[data-test="vzp-cell"]')
    expect(cells[4].text()).toContain('2')
    expect(cells[5].text()).toContain('3')
    expect(cells[6].text()).toContain('1')
    expect(cells[6].find('.vzp-warn').exists()).toBe(true)
  })

  it('图表交互：标注/缩放(两位小数)/平移态 + 徽标转译中', async () => {
    state.value = {
      ...baseState(),
      annotationCount: 5,
      viewport: { scale: 1.25, translateX: 0, translateY: 0 },
      isPanning: true,
      isTransitioning: true,
    }
    const wrapper = await mountPanel()
    expect(wrapper.find('[data-test="vzp-status"]').classes()).toContain('busy')
    expect(wrapper.text()).toContain('转译中')
    const cells = wrapper.findAll('[data-test="vzp-cell"]')
    expect(cells[7].text()).toContain('5')
    expect(cells[8].text()).toContain('1.25')
    expect(cells[9].text()).toContain('平移')
  })

  it('仪表盘布局：面板/最大行/断点名 + 运转中徽标 + 无空态', async () => {
    state.value = {
      ...baseState(),
      panelCount: 3,
      maxRow: 4,
      connectedSources: 1,
      currentBreakpoint: { name: 'lg', minWidth: 1200, columns: 12, rowHeight: 40, gap: 8, margin: 8 },
    }
    const wrapper = await mountPanel()
    expect(wrapper.find('[data-test="vzp-status"]').classes()).toContain('active')
    expect(wrapper.text()).toContain('运转中')
    const cells = wrapper.findAll('[data-test="vzp-cell"]')
    expect(cells[10].text()).toContain('3')
    expect(cells[11].text()).toContain('4')
    expect(cells[12].text()).toContain('lg')
    expect(wrapper.find('[data-test="vzp-empty"]').exists()).toBe(false)
  })
})