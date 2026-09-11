import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount, mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'

// 设置页依赖 vue-router（仅在幕僚阁调令框等用到），单元测试中桩掉
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

import Settings from '../Settings.vue'
import SyncCenterPanel from '../../components/SyncCenterPanel.vue'

beforeEach(() => {
  setActivePinia(createPinia())
})

// navItems 顺序须与模板 sub-group 出现顺序一致：bg/aura/taxonomy/rooms/operation/
// gesture/anim/visual/chrome/sidebar/edgebar/astrolabe
const SIDEBAR_IDX = 9

describe('Settings 两栏导航 + 搜索过滤（② 自适应）', () => {
  // 13 = 原有 12 个 + Item 3 新增的「应用图标」分区
  it('渲染 13 个分组导航锚点', () => {
    const wrapper = shallowMount(Settings)
    expect(wrapper.findAll('.settings-nav__item').length).toBe(13)
  })

  it('渲染 13 个可折叠子分组', () => {
    const wrapper = shallowMount(Settings)
    expect(wrapper.findAll('.sub-group').length).toBe(13)
  })

  it('点击导航锚点展开对应分组', async () => {
    const wrapper = shallowMount(Settings)
    const groups = wrapper.findAll('.sub-group')
    // 侧边栏默认展开，先收起再点开验证
    await wrapper.findAll('.settings-nav__item')[SIDEBAR_IDX].trigger('click')
    expect(groups[SIDEBAR_IDX].classes()).not.toContain('is-collapsed')
  })

  it('搜索「侧边栏」只留匹配分组可见，其余隐藏', async () => {
    const wrapper = shallowMount(Settings)
    await wrapper.find('.settings-filter__input').setValue('侧边栏')
    const groups = wrapper.findAll('.sub-group')
    expect(groups[SIDEBAR_IDX].classes()).not.toContain('is-hidden')
    expect(groups[0].classes()).toContain('is-hidden')
  })

  it('清空搜索恢复全部分组可见', async () => {
    const wrapper = shallowMount(Settings)
    const input = wrapper.find('.settings-filter__input')
    await input.setValue('星图')
    await input.setValue('')
    const groups = wrapper.findAll('.sub-group')
    expect(groups[0].classes()).not.toContain('is-hidden')
    expect(groups[11].classes()).not.toContain('is-hidden')
  })

  it('渲染 ABTestPanel A/B 测试面板', () => {
    const wrapper = shallowMount(Settings)
    expect(wrapper.findComponent({ name: 'ABTestPanel' }).exists()).toBe(true)
  })

  it('渲染 SyncCenterPanel 同步中心面板', () => {
    const wrapper = shallowMount(Settings)
    expect(wrapper.findComponent(SyncCenterPanel).exists()).toBe(true)
  })
})

// ============================================================
// 集成：同步中心面板 SyncCenterPanel（INCR-251 补挂载孤儿组件）
// 引擎 useSync 内 config/targets/conflicts/snapshots 为 use 调用时自 storage 读
// 键 hf:sync:config|targets|conflicts|snapshots，无模块级 ref → 无跨用例污染；
// 面板组件在 Settings 中 shallowMount 系被 stub，故此处直接 mount 面板本体
// 以覆盖渲染/空态/添加目标/配置持久化/创建快照等 UI 交互流。
// ============================================================
describe('集成：同步中心面板', () => {
  const K_CONFIG = 'hf:sync:config'
  const K_TARGETS = 'hf:sync:targets'
  const K_SNAPSHOTS = 'hf:sync:snapshots'

  let storage: any

  beforeEach(async () => {
    vi.clearAllMocks()
    ;(globalThis as any).localStorage = createMockStorage()
    const { invalidateCache } = await import('../../engine/storage/core')
    invalidateCache()
    storage = (await import('../../engine/storage/index')).storage
  })

  it('集成渲染同步中心面板（.syc-panel + 标题 + 副题 + 四标签）', async () => {
    const wrapper = mount(SyncCenterPanel)
    const panel = wrapper.find('.syc-panel')
    expect(panel.exists()).toBe(true)
    expect(wrapper.text()).toContain('🔄 同步中心')
    expect(wrapper.text()).toContain('多端同步 · 冲突协调 · 快照备份')
    expect(panel.findAll('.syc-tab').length).toBe(4)
  })

  it('空数据下目标同步支持空态与零统计', async () => {
    const wrapper = mount(SyncCenterPanel)
    const panel = wrapper.find('.syc-panel')
    expect(panel.text()).toContain('同步目标')
    expect(panel.text()).toContain('未解决冲突')
    expect(panel.text()).toContain('快照备份')
    expect(panel.find('.syc-empty').text()).toContain('暂无同步目标')
  })

  it('添加同步目标后列表与存储同步', async () => {
    const wrapper = mount(SyncCenterPanel)
    // 目标名称输入位于「添加目标」卡片（placeholder 名称），非配置区首个 input
    await wrapper.find('input[placeholder="名称"]').setValue('我的书房')
    await wrapper.vm.$nextTick()
    await wrapper.find('.syc-btn--primary').trigger('click')
    await wrapper.vm.$nextTick()
    const item = wrapper.find('.syc-item')
    expect(item.exists()).toBe(true)
    expect(item.find('.syc-item-name').text()).toContain('我的书房')
    expect(item.find('.syc-badge').text()).toContain('远端设备')
    expect(storage.getKV(K_TARGETS, []).length).toBe(1)
  })

  it('设备名变更持久化到存储', async () => {
    const wrapper = mount(SyncCenterPanel)
    const configInput = wrapper.findAll('input.syc-input')[0]
    await configInput.setValue('书房主机')
    await configInput.trigger('change')
    await wrapper.vm.$nextTick()
    const cfg = storage.getKV(K_CONFIG, {})
    expect(cfg.deviceName).toBe('书房主机')
  })

  it('快照备份 tab 创建快照后写入存储', async () => {
    const wrapper = mount(SyncCenterPanel)
    const tabs = wrapper.findAll('.syc-tab')
    await tabs[2].trigger('click')
    await wrapper.vm.$nextTick()
    // v-show 下各 tab body 均在 DOM，「暂无快照」须在快照 .syc-body 作用域内取
    const snapBody = wrapper.findAll('.syc-body')[2]
    expect(snapBody.find('.syc-empty').text()).toContain('暂无快照')
    await snapBody.find('.syc-btn--primary').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('.syc-item').length).toBe(1)
    const snaps = storage.getKV(K_SNAPSHOTS, [])
    expect(snaps.length).toBe(1)
  })

  it('冲突协调 tab 空数据展示「无冲突记录」', async () => {
    const wrapper = mount(SyncCenterPanel)
    const tabs = wrapper.findAll('.syc-tab')
    await tabs[1].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('无冲突记录')
  })
})
