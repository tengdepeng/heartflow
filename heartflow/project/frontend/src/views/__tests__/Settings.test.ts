import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

// 设置页依赖 vue-router（仅在幕僚阁调令框等用到），单元测试中桩掉
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

import Settings from '../Settings.vue'

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
})
