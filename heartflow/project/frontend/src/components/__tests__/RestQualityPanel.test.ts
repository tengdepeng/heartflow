import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ref, computed, type Ref } from 'vue'
import { mount } from '@vue/test-utils'
import type {
  RestPractice,
  BreakRecord,
  PlantState,
  RestQualityAnalysis,
  RestSeason,
} from '../../modules/rest'

// ---- 息壤质量引擎 mock（保留真实类型） ----
const practices: Ref<RestPractice[]> = ref([])
const records: Ref<BreakRecord[]> = ref([])
const plants: Ref<PlantState[]> = ref([])
const currentSeason = ref<RestSeason>('autumn')

const summary = computed(() => ({
  totalRecords: records.value.length,
  totalDuration: records.value.reduce((s, r) => s + r.duration, 0),
  avgMood: records.value.length > 0
    ? Math.round(records.value.reduce((s, r) => s + r.mood, 0) / records.value.length * 10) / 10
    : 0,
  plantCount: plants.value.length,
}))

const analysis = computed<RestQualityAnalysis>(() => {
  const count = records.value.length
  return {
    weeklyCount: count,
    weeklyAvgRecovery: count > 0 ? 70 : 0,
    weeklyAvgMood: count > 0 ? 4 : 0,
    restFrequency: count >= 3 ? 'excellent' : count > 0 ? 'adequate' : 'insufficient',
    diversityScore: count > 0 ? 60 : 0,
    topPractices: count > 0 ? [{ practice: '冥想', count: 2 }] : [],
    suggestions: count > 0
      ? ['休息状态良好，继续保持！']
      : ['本周休息次数偏少，建议每天至少安排一次短暂休息'],
    streakDays: count,
    idealRestInterval: 2,
  }
})

const seasonal = computed(() => practices.value.filter((p) => !p.seasons || p.seasons.includes(currentSeason.value)))

const EMOJIS = ['🌰', '🌱', '🌿', '🌸', '🏵️']
const getPlantEmoji = vi.fn((name: string) => {
  const plant = plants.value.find((p) => p.name === name)
  return plant ? EMOJIS[plant.growthStage] ?? '🌱' : '🌱'
})

const recordBreak = vi.fn(async (activity: string, duration: number, mood: number, note?: string) => {
  const rec: BreakRecord = { id: 'r-new', activity, duration, mood, note, date: new Date().toISOString() }
  records.value = [rec, ...records.value]
  return rec
})
const getSummary = vi.fn(() => summary.value)
const getQualityAnalysis = vi.fn(() => analysis.value)
const getSeasonalRecommendations = vi.fn(() => seasonal.value)
const getPlantState = vi.fn(() => null)
const addPractice = vi.fn()
const getCurrentSeason = vi.fn(() => currentSeason.value)
const load = vi.fn()

vi.mock('../../modules/rest', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../modules/rest')>()
  return {
    ...actual,
    useRestQuality: () => ({
      practices,
      records,
      plants,
      recordBreak,
      getQualityAnalysis,
      getSeasonalRecommendations,
      getPlantState,
      getPlantEmoji,
      addPractice,
      getSummary,
      getCurrentSeason,
      load,
    }),
  }
})

import RestQualityPanel from '../RestQualityPanel.vue'

function makePractice(id: string, name: string, plant?: string, seasons?: RestSeason[]): RestPractice {
  return {
    id,
    name,
    icon: '🧘',
    color: '#8a9a7a',
    description: '',
    recovery: 70,
    tags: [],
    plant,
    seasons,
  }
}

function makePlant(name: string, growthStage: number, health: number, bloomCount = 0): PlantState {
  return {
    id: `plant-${name}`,
    name,
    practiceId: 'p1',
    growthStage,
    health,
    bloomCount,
    plantedAt: '2026-09-01T00:00:00.000Z',
  }
}

beforeEach(() => {
  practices.value = [
    makePractice('p1', '冥想', '莲花', ['spring', 'summer', 'autumn', 'winter']),
    makePractice('p2', '散步', '蒲公英', ['spring', 'autumn']),
    makePractice('p3', '休假', '向日葵', ['summer']),
  ]
  records.value = []
  plants.value = []
  currentSeason.value = 'autumn'
  recordBreak.mockClear()
  getSummary.mockClear()
  getQualityAnalysis.mockClear()
  getSeasonalRecommendations.mockClear()
  getPlantEmoji.mockClear()
  load.mockClear()
})

describe('RestQualityPanel · 息壤质量接线', () => {
  it('空态渲染标题、副题与空态提示', async () => {
    const wrapper = mount(RestQualityPanel)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.rqp-panel').exists()).toBe(true)
    expect(wrapper.text()).toContain('息壤质量')
    expect(wrapper.text()).toContain('统计摘要')
    expect(wrapper.text()).toContain('记录休憩')
    expect(wrapper.text()).toContain('本周质量')
    expect(wrapper.text()).toContain('植被养成')
    expect(wrapper.text()).toContain('记录休憩后，关联的植物将在此萌芽生长。')
    expect(wrapper.text()).toContain('季节推荐')
  })

  it('统计摘要渲染总休憩、总时长、平均心情与植物数', async () => {
    records.value = [
      { id: 'r1', activity: '冥想', duration: 15, mood: 4, date: '2026-09-01T00:00:00.000Z' },
      { id: 'r2', activity: '散步', duration: 30, mood: 5, date: '2026-09-02T00:00:00.000Z' },
    ]
    plants.value = [makePlant('莲花', 1, 40)]
    const wrapper = mount(RestQualityPanel)
    await wrapper.vm.$nextTick()
    const cells = wrapper.findAll('.rqp-cell')
    expect(cells[0].text()).toContain('2')
    expect(cells[0].text()).toContain('总休憩')
    expect(cells[1].text()).toContain('45')
    expect(cells[1].text()).toContain('总时长')
    expect(cells[2].text()).toContain('4.5')
    expect(cells[2].text()).toContain('平均心情')
    expect(cells[3].text()).toContain('1')
    expect(cells[3].text()).toContain('植物')
  })

  it('记录休憩调用 recordBreak 并传入活动、时长、心情与备注', async () => {
    const wrapper = mount(RestQualityPanel)
    await wrapper.vm.$nextTick()
    await wrapper.find('.rqp-select').setValue('散步')
    await wrapper.find('.rqp-input').setValue(25)
    const moodBtns = wrapper.findAll('.rqp-mood-btn')
    await moodBtns[4].trigger('click')
    await wrapper.find('.rqp-input--wide').setValue('公园散步')
    await wrapper.find('.rqp-save').trigger('click')
    expect(recordBreak).toHaveBeenCalledWith('散步', 25, 5, '公园散步')
    expect(records.value.length).toBe(1)
    expect(records.value[0].activity).toBe('散步')
  })

  it('未选活动或时长为空时保存按钮禁用', async () => {
    const wrapper = mount(RestQualityPanel)
    await wrapper.vm.$nextTick()
    await wrapper.find('.rqp-input').setValue(0)
    expect(wrapper.find('.rqp-save').attributes('disabled')).toBeDefined()
  })

  it('本周质量渲染频率徽标、常用方式与建议', async () => {
    records.value = [
      { id: 'r1', activity: '冥想', duration: 15, mood: 4, date: '2026-09-01T00:00:00.000Z' },
      { id: 'r2', activity: '散步', duration: 30, mood: 5, date: '2026-09-02T00:00:00.000Z' },
    ]
    const wrapper = mount(RestQualityPanel)
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('节奏适中')
    expect(wrapper.text()).toContain('连续 2 天')
    expect(wrapper.text()).toContain('理想间隔 2 小时')
    expect(wrapper.text()).toContain('冥想 ×2')
    expect(wrapper.text()).toContain('休息状态良好，继续保持！')
  })

  it('植被养成渲染植物 emoji、阶段、健康度与花开次数', async () => {
    plants.value = [makePlant('莲花', 2, 80, 1)]
    const wrapper = mount(RestQualityPanel)
    await wrapper.vm.$nextTick()
    const plant = wrapper.find('.rqp-plant')
    expect(plant.exists()).toBe(true)
    expect(plant.text()).toContain('莲花')
    expect(plant.text()).toContain('生长')
    expect(plant.text()).toContain('健康 80')
    expect(plant.text()).toContain('花开 1 次')
    expect(getPlantEmoji).toHaveBeenCalledWith('莲花')
  })

  it('季节推荐按当前季节过滤休憩方式', async () => {
    const wrapper = mount(RestQualityPanel)
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('秋 · 容平')
    const chips = wrapper.findAll('.rqp-seasonal-chip')
    const chipText = chips.map((c) => c.text()).join(' ')
    expect(chipText).toContain('冥想')
    expect(chipText).toContain('散步')
    expect(chipText).not.toContain('休假')
  })
})
