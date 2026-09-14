import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

// 控制存储：真实 useSoundScene 经 storage 加载/持久化偏好，测试仅 mock 存储层
const mockStore: Record<string, any> = {}

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (key: string, def: any) => mockStore[key] ?? def,
    setKV: (key: string, val: any) => { mockStore[key] = val },
  },
}))

import SoundScenePanel from '../SoundScenePanel.vue'

function getWrapper() {
  return mount(SoundScenePanel)
}

describe('SoundScenePanel · 专注声场', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore['hf:sound_scene_pref'] = { soundId: null, volume: 60, fadeIn: 2, loop: true }
  })

  it('渲染标题、副题与三场景按钮', () => {
    const wrapper = getWrapper()
    expect(wrapper.text()).toContain('专注声场')
    expect(wrapper.text()).toContain('白噪音')
    const scenes = wrapper.findAll('.ssp-scene')
    expect(scenes).toHaveLength(3)
    expect(scenes[0].text()).toContain('专注')
    expect(scenes[1].text()).toContain('休息')
    expect(scenes[2].text()).toContain('睡眠')
  })

  it('默认专注场景展示素材，含咖啡厅与海浪', () => {
    const wrapper = getWrapper()
    const items = wrapper.findAll('.ssp-item')
    const itemTexts = items.map((i) => i.text())
    expect(itemTexts.some((t) => t.includes('咖啡厅'))).toBe(true)
    expect(itemTexts.some((t) => t.includes('海浪'))).toBe(true)
  })

  it('切换场景后按新场景过滤素材', async () => {
    const wrapper = getWrapper()
    await wrapper.findAll('.ssp-scene')[2].trigger('click')
    const itemTexts = wrapper.findAll('.ssp-item').map((i) => i.text())
    expect(itemTexts.some((t) => t.includes('粉红噪音'))).toBe(true)
  })

  it('当前声场：初始未选择，选择后显示名称与备注，再点取消', async () => {
    const wrapper = getWrapper()
    expect(wrapper.text()).toContain('尚未选择声场')

    const cafeItem = wrapper.findAll('.ssp-item').find((i) => i.text().includes('咖啡厅'))!
    await cafeItem.trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.ssp-active').exists()).toBe(true)
    expect(wrapper.find('.ssp-active-name').text()).toBe('咖啡厅')
    expect(wrapper.find('.ssp-active-note').text()).toContain('人声低语')
    expect(mockStore['hf:sound_scene_pref'].soundId).toBe('cafe')

    await cafeItem.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('尚未选择声场')
  })

  it('素材库类别筛选：点音律仅剩冥想铃声', async () => {
    const wrapper = getWrapper()
    const toneCat = wrapper.findAll('.ssp-cat').find((c) => c.text().includes('音律'))!
    await toneCat.trigger('click')
    const items = wrapper.findAll('.ssp-item')
    expect(items).toHaveLength(1)
    expect(items[0].text()).toContain('冥想铃声')
  })

  it('素材库搜索：匹配回调与无匹配空态', async () => {
    const wrapper = getWrapper()
    const search = wrapper.find('.ssp-input')
    await search.setValue('雨')
    await wrapper.vm.$nextTick()
    const items = wrapper.findAll('.ssp-item')
    expect(items.length).toBeGreaterThan(0)
    expect(items.every((i) => i.text().includes('雨'))).toBe(true)

    await search.setValue('不存在的声')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('没有匹配的声场')
  })

  it('音量/淡入/循环修改持久化到存储', async () => {
    const wrapper = getWrapper()
    await wrapper.findAll('.ssp-range')[0].setValue(70)
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('.ssp-config-val')[0].text()).toBe('70%')
    expect(mockStore['hf:sound_scene_pref'].volume).toBe(70)

    await wrapper.findAll('.ssp-range')[1].setValue(5)
    expect(mockStore['hf:sound_scene_pref'].fadeIn).toBe(5)

    const loop = wrapper.find('.ssp-toggle') as any
    loop.element.checked = true
    await loop.trigger('change')
    expect(mockStore['hf:sound_scene_pref'].loop).toBe(true)
  })
})
