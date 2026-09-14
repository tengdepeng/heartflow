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
    expect(wrapper.text()).toContain('白噪音与自然声库')
    const scenes = wrapper.findAll('.sse-scene')
    expect(scenes).toHaveLength(3)
    expect(scenes[0].text()).toContain('专注')
    expect(scenes[1].text()).toContain('休息')
    expect(scenes[2].text()).toContain('睡眠')
  })

  it('默认专注场景展示推荐，咖啡厅标默认', () => {
    const wrapper = getWrapper()
    const recs = wrapper.findAll('.sse-rec')
    const recNames = recs.map((r) => r.text())
    expect(recNames.some((t) => t.includes('咖啡厅'))).toBe(true)
    expect(recNames.some((t) => t.includes('海浪'))).toBe(true)
    const cafeRec = recs.find((r) => r.text().includes('咖啡厅'))!
    expect(cafeRec.find('.sse-default').exists()).toBe(true)
    const oceanRec = recs.find((r) => r.text().includes('海浪'))!
    expect(oceanRec.find('.sse-default').exists()).toBe(false)
  })

  it('切换场景后按新场景推荐并标注默认', async () => {
    const wrapper = getWrapper()
    await wrapper.findAll('.sse-scene')[2].trigger('click')
    const recs = wrapper.findAll('.sse-rec')
    expect(recs.some((r) => r.text().includes('粉红噪音'))).toBe(true)
    const pinkRec = recs.find((r) => r.text().includes('粉红噪音'))!
    expect(pinkRec.find('.sse-default').exists()).toBe(true)
  })

  it('当前声场：初始未选择，选择后显示名称与关闭按钮', async () => {
    const wrapper = getWrapper()
    expect(wrapper.text()).toContain('未选择声场')

    const cafeRec = wrapper.findAll('.sse-rec').find((r) => r.text().includes('咖啡厅'))!
    await cafeRec.trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.sse-active').exists()).toBe(true)
    expect(wrapper.find('.sse-active-name').text()).toBe('咖啡厅')
    expect(wrapper.find('.sse-active-note').text()).toContain('人声低语')
    expect(wrapper.find('.sse-stop').exists()).toBe(true)
    expect(mockStore['hf:sound_scene_pref'].soundId).toBe('cafe')

    await wrapper.find('.sse-stop').trigger('click')
    expect(wrapper.text()).toContain('未选择声场')
  })

  it('素材库类别筛选：点音律仅剩冥想铃声', async () => {
    const wrapper = getWrapper()
    const toneCat = wrapper.findAll('.sse-cat').find((c) => c.text().includes('音律'))!
    await toneCat.trigger('click')
    const items = wrapper.findAll('.sse-item')
    expect(items).toHaveLength(1)
    expect(items[0].text()).toContain('冥想铃声')
  })

  it('素材库搜索：匹配回调与无匹配空态', async () => {
    const wrapper = getWrapper()
    const search = wrapper.find('.sse-search')
    await search.setValue('雨')
    await wrapper.vm.$nextTick()
    const items = wrapper.findAll('.sse-item')
    expect(items.length).toBeGreaterThan(0)
    expect(items.every((i) => i.text().includes('雨'))).toBe(true)

    await search.setValue('不存在的声')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('无匹配声场')
  })

  it('音量/淡入/循环修改持久化到存储', async () => {
    const wrapper = getWrapper()
    await wrapper.find('.sse-volume').setValue(70)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.sse-val').text()).toBe('70')
    expect(mockStore['hf:sound_scene_pref'].volume).toBe(70)

    await wrapper.find('.sse-fade').setValue(5)
    expect(mockStore['hf:sound_scene_pref'].fadeIn).toBe(5)

    const loop = wrapper.find('.sse-loop-check') as any
    loop.element.checked = true
    await loop.trigger('change')
    expect(mockStore['hf:sound_scene_pref'].loop).toBe(true)
  })
})