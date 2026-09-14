// ============================================================
// 环境音景面板 · 接线测试（INCR-109 审计孤立零引用引擎 useSoundscape）
// 锁定：音景选择/激活 → switchSoundscape 接线 → 详情(情绪旋律/季节变奏)/音量控制
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ref, nextTick, type Ref } from 'vue'
import { mount } from '@vue/test-utils'
import type { Soundscape } from '../../modules/emotion/flower-season'

const soundscapes: Ref<Soundscape[]> = ref([])
const activeSoundscapeId: Ref<string | null> = ref(null)
const masterVolume: Ref<number> = ref(0.5)
const initSoundscapes = vi.fn()
const switchSoundscape = vi.fn((id: string) => { activeSoundscapeId.value = id })
const getActiveSoundscape = vi.fn(() =>
  soundscapes.value.find((s) => s.id === activeSoundscapeId.value),
)
const setVolume = vi.fn((v: number) => {
  masterVolume.value = Math.max(0, Math.min(1, v) || 0)
})

vi.mock('../../modules/emotion/flower-season', () => ({
  useSoundscape: () => ({
    soundscapes,
    activeSoundscapeId,
    masterVolume,
    initSoundscapes,
    switchSoundscape,
    getActiveSoundscape,
    setVolume,
  }),
  SEASON_CONFIGS: {},
  CROSS_BREED_RECIPES: [],
  DEFAULT_SOUNDSCAPES: [],
}))

import SoundscapePanel from '../SoundscapePanel.vue'

const forest: Soundscape = {
  id: 'ss-forest',
  name: '森林',
  ambient: 'forest-ambient',
  emotionMelodies: {
    happy: 'bird-song', calm: 'stream', sad: 'owl',
    angry: 'thunderstorm', anxious: 'wolf-howl',
  },
  seasonalVariations: {
    spring: 'blooming', summer: 'cicada', autumn: 'rustling', winter: 'hush',
  },
  volume: 0.5,
  enabled: true,
}

const rain: Soundscape = {
  id: 'ss-rain',
  name: '雨林',
  ambient: 'rain-forest',
  emotionMelodies: {
    happy: 'light-piano', calm: 'flowing-water', sad: 'gentle-rain',
    angry: 'distant-thunder', anxious: 'wind-chimes',
  },
  seasonalVariations: {
    spring: 'spring-rain', summer: 'summer-storm',
    autumn: 'autumn-drizzle', winter: 'winter-silence',
  },
  volume: 0.5,
  enabled: true,
}

beforeEach(() => {
  soundscapes.value = []
  activeSoundscapeId.value = null
  masterVolume.value = 0.5
  initSoundscapes.mockClear()
  switchSoundscape.mockClear()
  getActiveSoundscape.mockClear()
  setVolume.mockClear()
})

describe('SoundscapePanel · 环境音景接线', () => {
  it('空态：标题渲染、onMounted 初始化音景、显示「暂无音景」', async () => {
    const wrapper = mount(SoundscapePanel)
    await nextTick()
    expect(wrapper.text()).toContain('环境音景')
    expect(initSoundscapes).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('暂无音景')
  })

  it('有音景：渲染列表、active 高亮、详情展示情绪旋律与季节变奏', async () => {
    soundscapes.value = [forest]
    activeSoundscapeId.value = 'ss-forest'
    const wrapper = mount(SoundscapePanel)
    await nextTick()

    const text = wrapper.text()
    expect(text).toContain('森林')
    expect(text).toContain('forest-ambient')
    expect(text).toContain('愉悦 · bird-song')
    expect(text).toContain('悲伤 · owl')
    // 情绪旋律 5 条 + 季节变奏 4 条
    expect(wrapper.findAll('.scp-tag')).toHaveLength(9)
    expect(wrapper.find('.scp-item.active').text()).toContain('森林')
  })

  it('切换音景：点击另一音景调用 switchSoundscape 并更新详情', async () => {
    soundscapes.value = [forest, rain]
    activeSoundscapeId.value = 'ss-forest'
    const wrapper = mount(SoundscapePanel)
    await nextTick()

    await wrapper.findAll('.scp-item')[1].trigger('click')
    expect(switchSoundscape).toHaveBeenCalledWith('ss-rain')

    await nextTick()
    // mock getActiveSoundscape 依据 activeSoundscapeId 推导 → 详情更新为雨林
    expect(wrapper.find('.scp-detail-name').text()).toContain('雨林')
    expect(wrapper.text()).toContain('summer-storm')
  })

  it('音量控制：默认 50%，点 + 调 setVolume+0.1 并更新百分比', async () => {
    soundscapes.value = [forest]
    activeSoundscapeId.value = 'ss-forest'
    const wrapper = mount(SoundscapePanel)
    await nextTick()

    expect(wrapper.text()).toContain('50%')
    await wrapper.findAll('.scp-btn')[3].trigger('click')
    expect(setVolume).toHaveBeenCalledWith(0.6)
    await nextTick()
    expect(wrapper.text()).toContain('60%')
  })

  it('音量边界：静音按钮调用 setVolume(0)，最大按钮调用 setVolume(1)', async () => {
    soundscapes.value = [forest]
    activeSoundscapeId.value = 'ss-forest'
    const wrapper = mount(SoundscapePanel)
    await nextTick()

    const btns = wrapper.findAll('.scp-btn')
    await btns[1].trigger('click')
    expect(setVolume).toHaveBeenCalledWith(0)
    await nextTick()
    expect(wrapper.text()).toContain('0%')

    await btns[2].trigger('click')
    expect(setVolume).toHaveBeenCalledWith(1)
    await nextTick()
    expect(wrapper.text()).toContain('100%')
  })
})