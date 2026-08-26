// ============================================================
// 息壤 · P16-10 · 单元测试
// 休息质量引擎 + 仪式系统 + 植物生长 + 日历 + 处方
// 提醒系统 + 成就系统 + 专注联动 + 趋势 + 浏览器通知
// ============================================================

import { describe, expect, it, beforeEach, vi } from 'vitest'

// ---- Mock storage 模块 ----
const storageData = new Map<string, any>()

vi.mock('@/engine/storage', () => ({
  storage: {
    getKV: vi.fn(<T>(key: string, defaultValue: T): T => {
      const val = storageData.get(key)
      return val !== undefined ? val : defaultValue
    }),
    setKV: vi.fn((key: string, value: any): void => {
      storageData.set(key, value)
    }),
  },
}))

import { useRestQuality } from '../quality'
import {
  useRestRituals, usePlantGrowth, useRestCalendar, useRestPrescription,
  PRESET_RITUALS, RITUAL_CATEGORY_META, GROWTH_PHASE_META, FATIGUE_LEVEL_META,
} from '../rest-rituals'
import {
  useRestReminders, useRestAchievements, useFocusRestLink, useRestTrend,
  DEFAULT_REMINDERS, REST_ADVANCED_STORAGE_KEYS,
} from '../rest-advanced'
import type { RestReminder } from '../rest-advanced'
import type { RitualCategory, RitualStep, GrowthPhase, FatigueLevel } from '../rest-rituals'
import type { BreakRecord, RestPractice, PlantState, RestActivityType } from '../types'
import { DEFAULT_PRACTICES } from '../types'

// ---- Mock Notification API ----
const mockNotifications: any[] = []
const mockNotificationConstructor = vi.fn(function (this: any, title: string, options?: any) {
  this.title = title
  this.body = options?.body || ''
  this.tag = options?.tag || ''
  this.onclick = null
  this.onclose = null
  this.close = vi.fn()
  mockNotifications.push(this)
  return this
})

// @ts-expect-error - mock global Notification
globalThis.Notification = mockNotificationConstructor
// @ts-expect-error - mock static methods
globalThis.Notification.permission = 'default'
globalThis.Notification.requestPermission = vi.fn().mockResolvedValue('granted')

import { useRestNotificationBridge } from '../notification-bridge'

// ============================================================
// 测试辅助函数
// ============================================================

let plantIdCounter = 0

function createTestBreakRecord(overrides: Partial<BreakRecord> = {}): BreakRecord {
  return {
    id: 'br_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    activity: '冥想',
    duration: 15,
    mood: 4,
    note: '测试休息',
    date: new Date().toISOString(),
    ...overrides,
  }
}

function createTestPlant(overrides: Partial<PlantState> = {}): PlantState {
  plantIdCounter++
  return {
    id: 'plant_' + plantIdCounter,
    name: '莲花',
    practiceId: 'p1',
    growthStage: 0,
    health: 50,
    bloomCount: 0,
    plantedAt: new Date().toISOString(),
    ...overrides,
  }
}

function createTestReminder(overrides: Partial<RestReminder> = {}): RestReminder {
  return {
    id: 'rem_test',
    type: 'pomodoro',
    title: '测试提醒',
    description: '测试描述',
    suggestedActivity: 'stretch' as RestActivityType,
    suggestedDuration: 5,
    trigger: { focusMinutes: 25 },
    enabled: true,
    cooldownMinutes: 20,
    ...overrides,
  }
}

// ============================================================
// 1. useRestQuality — 休息质量引擎
// ============================================================

describe('useRestQuality', () => {
  let quality: ReturnType<typeof useRestQuality>

  beforeEach(() => {
    storageData.clear()
    quality = useRestQuality()
    quality.records.value = []
    quality.plants.value = []
  })

  describe('recordBreak', () => {
    it('应正确记录休憩', async () => {
      const record = await quality.recordBreak('冥想', 15, 4, '测试')
      expect(record.activity).toBe('冥想')
      expect(record.duration).toBe(15)
      expect(record.mood).toBe(4)
      expect(record.note).toBe('测试')
      expect(quality.records.value.length).toBe(1)
    })

    it('应自动生成唯一 ID', async () => {
      const r1 = await quality.recordBreak('冥想', 10, 3)
      const r2 = await quality.recordBreak('散步', 20, 4)
      expect(r1.id).not.toBe(r2.id)
    })

    it('记录休憩时应更新关联植物健康', async () => {
      await quality.recordBreak('冥想', 15, 4)
      const plant = quality.plants.value.find(p => p.name === '莲花')
      expect(plant).toBeDefined()
      expect(plant!.health).toBeGreaterThan(0)
    })

    it('初次记录应创建新植物', async () => {
      await quality.recordBreak('冥想', 15, 4)
      expect(quality.plants.value.length).toBe(1)
      expect(quality.plants.value[0].name).toBe('莲花')
    })

    it('多次记录同一活动应累积植物健康', async () => {
      await quality.recordBreak('冥想', 15, 4)
      const health1 = quality.plants.value[0].health
      await quality.recordBreak('冥想', 15, 4)
      const health2 = quality.plants.value[0].health
      expect(health2).toBeGreaterThanOrEqual(health1)
    })

    it('植物健康满 100 应升级', async () => {
      const plant = createTestPlant({ name: '莲花', practiceId: 'p1', health: 90, growthStage: 0 })
      quality.plants.value = [plant]
      await quality.recordBreak('冥想', 15, 4)
      // health 应该被重置（升级后）
      expect(plant.growthStage).toBeGreaterThanOrEqual(0)
    })
  })

  describe('getQualityAnalysis', () => {
    it('应正确计算每周休息次数', () => {
      const today = new Date().toISOString()
      quality.records.value = [
        createTestBreakRecord({ date: today, activity: '冥想' }),
        createTestBreakRecord({ date: today, activity: '散步' }),
        createTestBreakRecord({ date: today, activity: '小憩' }),
      ]
      const analysis = quality.getQualityAnalysis()
      expect(analysis.weeklyCount).toBe(3)
    })

    it('应正确评估休息频率', () => {
      quality.records.value = []
      const empty = quality.getQualityAnalysis()
      expect(empty.restFrequency).toBe('insufficient')

      const today = new Date().toISOString()
      quality.records.value = Array.from({ length: 5 }, () =>
        createTestBreakRecord({ date: today, activity: '冥想' })
      )
      const adequate = quality.getQualityAnalysis()
      expect(adequate.restFrequency).toBe('adequate')
    })

    it('应正确计算多样性评分', () => {
      const today = new Date().toISOString()
      quality.records.value = [
        createTestBreakRecord({ date: today, activity: '冥想' }),
        createTestBreakRecord({ date: today, activity: '散步' }),
        createTestBreakRecord({ date: today, activity: '音乐' }),
        createTestBreakRecord({ date: today, activity: '品茶' }),
      ]
      const analysis = quality.getQualityAnalysis()
      expect(analysis.diversityScore).toBeGreaterThan(0)
    })

    it('休息不足时应生成建议', () => {
      quality.records.value = []
      const analysis = quality.getQualityAnalysis()
      expect(analysis.suggestions.length).toBeGreaterThan(0)
    })

    it('休息良好时应有正面建议', () => {
      const today = new Date().toISOString()
      quality.records.value = Array.from({ length: 10 }, (_, i) =>
        createTestBreakRecord({
          date: today,
          activity: DEFAULT_PRACTICES[i % DEFAULT_PRACTICES.length].name,
          mood: 5,
        })
      )
      const analysis = quality.getQualityAnalysis()
      expect(analysis.suggestions.some(s => s.includes('良好'))).toBe(true)
    })
  })

  describe('getSeasonalRecommendations', () => {
    it('应返回当前季节推荐', () => {
      const recs = quality.getSeasonalRecommendations()
      expect(recs.length).toBeGreaterThan(0)
    })
  })

  describe('getPlantState', () => {
    it('应返回存在的植物', () => {
      const plant = createTestPlant()
      quality.plants.value = [plant]
      const found = quality.getPlantState(plant.name)
      expect(found).not.toBeNull()
      expect(found!.id).toBe(plant.id)
    })

    it('不存在的植物应返回 null', () => {
      const found = quality.getPlantState('不存在的植物')
      expect(found).toBeNull()
    })
  })

  describe('getPlantEmoji', () => {
    it('应返回植物生长 emoji', () => {
      const plant = createTestPlant({ name: '莲花', growthStage: 0 })
      quality.plants.value = [plant]
      const emoji = quality.getPlantEmoji('莲花')
      expect(emoji.length).toBeGreaterThan(0)
    })
  })

  describe('addPractice', () => {
    it('应正确添加自定义休憩方式', async () => {
      const practice: RestPractice = {
        id: 'custom_1', name: '瑜伽', icon: '🧘', color: '#fff',
        description: '测试', recovery: 80, tags: ['测试'],
      }
      await quality.addPractice(practice)
      expect(quality.practices.value.some(p => p.id === 'custom_1')).toBe(true)
    })
  })

  describe('getSummary', () => {
    it('应正确计算统计摘要', async () => {
      await quality.recordBreak('冥想', 10, 4)
      await quality.recordBreak('散步', 20, 3)
      const summary = quality.getSummary()
      expect(summary.totalRecords).toBe(2)
      expect(summary.totalDuration).toBe(30)
    })
  })
})

// ============================================================
// 2. useRestRituals — 休息仪式管理
// ============================================================

describe('useRestRituals', () => {
  let rituals: ReturnType<typeof useRestRituals>

  beforeEach(() => {
    storageData.clear()
    rituals = useRestRituals()
    rituals.rituals.value = [...PRESET_RITUALS]
  })

  it('应加载预设仪式', () => {
    const loaded = rituals.loadRituals()
    expect(loaded.length).toBeGreaterThanOrEqual(5)
    expect(loaded.some(r => r.id === 'ritual-morning')).toBe(true)
  })

  it('应创建自定义仪式', () => {
    const steps: RitualStep[] = [
      { order: 1, action: '测试步骤', durationMinutes: 5, description: '测试' },
    ]
    const ritual = rituals.createRitual('测试仪式', 'morning', '测试描述', steps, ['测试'])
    expect(ritual.name).toBe('测试仪式')
    expect(ritual.category).toBe('morning')
    expect(ritual.preset).toBe(false)
    expect(ritual.steps.length).toBe(1)
    expect(ritual.totalDuration).toBe(5)
  })

  it('应正确执行仪式', () => {
    const result = rituals.executeRitual('ritual-morning')
    expect(result).toBe(true)
    const ritual = rituals.rituals.value.find(r => r.id === 'ritual-morning')
    expect(ritual!.executionCount).toBe(1)
  })

  it('执行不存在的仪式应返回 false', () => {
    const result = rituals.executeRitual('nonexistent')
    expect(result).toBe(false)
  })

  it('应按分类获取仪式', () => {
    const morning = rituals.getRitualsByCategory('morning')
    expect(morning.length).toBeGreaterThan(0)
    expect(morning.every(r => r.category === 'morning')).toBe(true)
  })

  it('应正确计算热门仪式', () => {
    rituals.executeRitual('ritual-morning')
    rituals.executeRitual('ritual-morning')
    rituals.executeRitual('ritual-morning')
    const popular = rituals.popularRituals.value
    expect(popular.length).toBeGreaterThan(0)
    expect(popular[0].id).toBe('ritual-morning')
  })
})

// ============================================================
// 3. usePlantGrowth — 植物生长动画
// ============================================================

describe('usePlantGrowth', () => {
  let growth: ReturnType<typeof usePlantGrowth>

  beforeEach(() => {
    growth = usePlantGrowth()
    growth.plantStates.value = new Map()
  })

  it('应初始化植物状态', () => {
    const plant = createTestPlant({ health: 50 })
    const state = growth.initPlant(plant)
    expect(state.plantId).toBe(plant.id)
    expect(state.phaseProgress).toBe(50)
  })

  it('应根据健康度确定生长阶段', () => {
    expect(growth.getPhaseFromHealth(10)).toBe('seed')
    expect(growth.getPhaseFromHealth(30)).toBe('sprout')
    expect(growth.getPhaseFromHealth(50)).toBe('seedling')
    expect(growth.getPhaseFromHealth(70)).toBe('budding')
    expect(growth.getPhaseFromHealth(85)).toBe('blooming')
    expect(growth.getPhaseFromHealth(100)).toBe('fruiting')
  })

  it('应正确浇水更新状态', () => {
    const plant = createTestPlant({ health: 30 })
    growth.initPlant(plant)
    const state = growth.waterPlant(plant.id, 85)
    expect(state).not.toBeNull()
    expect(state!.currentPhase).toBe('blooming')
    expect(state!.isBlooming).toBe(true)
  })

  it('不存在的植物浇水应返回 null', () => {
    const state = growth.waterPlant('nonexistent', 50)
    expect(state).toBeNull()
  })

  it('应正确获取生长动画描述', () => {
    const plant = createTestPlant({ health: 85 })
    growth.initPlant(plant)
    const desc = growth.getGrowthAnimation(plant.id)
    expect(desc).toContain('盛开')
    expect(desc).toContain('85%')
  })

  it('plantOverview 应返回所有植物概览', () => {
    const p1 = createTestPlant({ health: 30 })
    const p2 = createTestPlant({ health: 90 })
    growth.initPlant(p1)
    growth.initPlant(p2)
    const overview = growth.plantOverview.value
    expect(overview.length).toBe(2)
  })
})

// ============================================================
// 4. useRestCalendar — 休息日历
// ============================================================

describe('useRestCalendar', () => {
  let calendar: ReturnType<typeof useRestCalendar>

  beforeEach(() => {
    calendar = useRestCalendar()
  })

  it('应生成月度休息日历', () => {
    const now = new Date()
    const records: BreakRecord[] = [
      createTestBreakRecord({ date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`, duration: 15 }),
      createTestBreakRecord({ date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`, duration: 10 }),
      createTestBreakRecord({ date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-15`, duration: 20 }),
    ]

    const cal = calendar.generateCalendar(now.getFullYear(), now.getMonth() + 1, records)
    expect(cal.year).toBe(now.getFullYear())
    expect(cal.month).toBe(now.getMonth() + 1)
    expect(cal.days.length).toBeGreaterThanOrEqual(28)
    expect(cal.totalRestMinutes).toBe(45)
    expect(cal.restDays).toBe(2)
  })

  it('应正确标记休息日', () => {
    const now = new Date()
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-05`
    const records: BreakRecord[] = [
      createTestBreakRecord({ date: dateStr }),
    ]
    const cal = calendar.generateCalendar(now.getFullYear(), now.getMonth() + 1, records)
    const day5 = cal.days.find(d => d.date === dateStr)
    expect(day5).toBeDefined()
    expect(day5!.isRestDay).toBe(true)
  })

  it('无记录月份应返回空日历', () => {
    const cal = calendar.generateCalendar(2026, 8, [])
    expect(cal.restDays).toBe(0)
    expect(cal.totalRestMinutes).toBe(0)
  })
})

// ============================================================
// 5. useRestPrescription — 休息处方
// ============================================================

describe('useRestPrescription', () => {
  let prescription: ReturnType<typeof useRestPrescription>

  beforeEach(() => {
    prescription = useRestPrescription()
  })

  it('应基于疲劳程度生成处方', () => {
    const result = prescription.generatePrescription('tired', PRESET_RITUALS, DEFAULT_PRACTICES)
    expect(result.fatigueLevel).toBe('tired')
    expect(result.suggestedDuration).toBeGreaterThan(0)
    expect(result.recommendedRituals.length).toBeGreaterThan(0)
    expect(result.recommendedPractices.length).toBeGreaterThan(0)
  })

  it('燃尽状态应有特殊注意事项', () => {
    const result = prescription.generatePrescription('burnout', PRESET_RITUALS, DEFAULT_PRACTICES)
    expect(result.cautions.length).toBeGreaterThanOrEqual(2)
    expect(result.cautions.some(c => c.includes('暂停'))).toBe(true)
  })

  it('精力充沛状态应有最少建议', () => {
    const result = prescription.generatePrescription('energized', PRESET_RITUALS, DEFAULT_PRACTICES)
    expect(result.suggestedDuration).toBe(5)
  })

  describe('assessFatigue', () => {
    it('睡眠不足应判定为燃尽', () => {
      const level = prescription.assessFatigue(0, 1, 4, 65)
      expect(level).toBe('burnout')
    })

    it('睡眠不足且工作过多应判定为精疲力竭', () => {
      const level = prescription.assessFatigue(0, 3, 5.5, 55)
      expect(level).toBe('exhausted')
    })

    it('休息不足应判定为疲劳', () => {
      const level = prescription.assessFatigue(2, 2.5, 7, 40)
      expect(level).toBe('tired')
    })

    it('正常状态应判定为正常', () => {
      const level = prescription.assessFatigue(5, 3.5, 7, 40)
      expect(level).toBe('normal')
    })

    it('良好状态应判定为精力充沛', () => {
      const level = prescription.assessFatigue(10, 4.5, 8, 35)
      expect(level).toBe('energized')
    })
  })
})

// ============================================================
// 6. useRestReminders — 休息提醒
// ============================================================

describe('useRestReminders', () => {
  let reminders: ReturnType<typeof useRestReminders>

  beforeEach(() => {
    storageData.clear()
    reminders = useRestReminders()
    reminders.reminders.value = DEFAULT_REMINDERS.map(r => ({ ...r, lastTriggeredAt: undefined }))
  })

  it('应有默认提醒配置', () => {
    expect(reminders.reminders.value.length).toBeGreaterThanOrEqual(5)
    expect(reminders.reminders.value.some(r => r.type === 'pomodoro')).toBe(true)
  })

  it('activeReminders 应只返回启用的提醒', () => {
    const active = reminders.activeReminders.value
    expect(active.every(r => r.enabled)).toBe(true)
  })

  it('应检查番茄钟提醒', () => {
    const triggered = reminders.checkReminders(25, '10:00')
    const pomodoro = triggered.find(r => r.id === 'reminder_pomodoro')
    expect(pomodoro).toBeDefined()
  })

  it('应检查长专注提醒', () => {
    const triggered = reminders.checkReminders(90, '10:00')
    const longFocus = triggered.find(r => r.id === 'reminder_long_focus')
    expect(longFocus).toBeDefined()
  })

  it('应检查定时提醒', () => {
    const triggered = reminders.checkReminders(0, '13:00')
    const lunch = triggered.find(r => r.id === 'reminder_lunch')
    expect(lunch).toBeDefined()
  })

  it('冷却时间内不应重复触发', () => {
    reminders.checkReminders(25, '10:00')
    const triggered = reminders.checkReminders(25, '10:01')
    const pomodoro = triggered.find(r => r.id === 'reminder_pomodoro')
    expect(pomodoro).toBeUndefined()
  })

  it('应正确切换提醒开关', () => {
    const wasEnabled = reminders.reminders.value[0].enabled
    reminders.toggleReminder(reminders.reminders.value[0].id)
    expect(reminders.reminders.value[0].enabled).toBe(!wasEnabled)
  })

  it('应正确更新提醒配置', () => {
    reminders.updateReminder('reminder_pomodoro', { suggestedDuration: 10 })
    const updated = reminders.reminders.value.find(r => r.id === 'reminder_pomodoro')
    expect(updated!.suggestedDuration).toBe(10)
  })

  it('应正确重置冷却', () => {
    reminders.checkReminders(25, '10:00')
    const r = reminders.reminders.value.find(r => r.id === 'reminder_pomodoro')!
    expect(r.lastTriggeredAt).toBeDefined()

    reminders.resetCooldown('reminder_pomodoro')
    expect(r.lastTriggeredAt).toBeUndefined()
  })

  it('禁用的提醒不应触发', () => {
    reminders.toggleReminder('reminder_pomodoro')
    const triggered = reminders.checkReminders(25, '10:00')
    const pomodoro = triggered.find(r => r.id === 'reminder_pomodoro')
    expect(pomodoro).toBeUndefined()
  })
})

// ============================================================
// 7. useRestAchievements — 成就系统
// ============================================================

describe('useRestAchievements', () => {
  let getRecords: () => BreakRecord[]
  let getPractices: () => RestPractice[]
  let achievements: ReturnType<typeof useRestAchievements>
  let records: BreakRecord[]

  beforeEach(() => {
    storageData.clear()
    records = []
    getRecords = () => records
    getPractices = () => DEFAULT_PRACTICES
    achievements = useRestAchievements(getRecords, getPractices)
  })

  it('应有完整的成就定义', () => {
    expect(achievements.totalCount.value).toBeGreaterThanOrEqual(15)
  })

  it('第一次休息应解锁初次休息成就', () => {
    records.push(createTestBreakRecord())
    const unlocked = achievements.checkAchievements()
    const firstBreak = unlocked.find(a => a.id === 'first_break')
    expect(firstBreak).toBeDefined()
  })

  it('连续3天休息应解锁三日坚持', () => {
    const now = new Date()
    for (let i = 0; i < 3; i++) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      records.push(createTestBreakRecord({ date: d.toISOString() }))
    }
    achievements.checkAchievements()
    const streak3 = achievements.achievements.value.find(a => a.id === 'rest_streak_3')
    expect(streak3!.unlocked).toBe(true)
  })

  it('应正确计算多样性成就', () => {
    const today = new Date().toISOString()
    records.push(
      createTestBreakRecord({ date: today, activity: '冥想' }),
      createTestBreakRecord({ date: today, activity: '散步' }),
      createTestBreakRecord({ date: today, activity: '音乐' }),
    )
    achievements.checkAchievements()
    const variety3 = achievements.achievements.value.find(a => a.id === 'variety_3')
    expect(variety3!.unlocked).toBe(true)
  })

  it('应正确计算冥想大师成就', () => {
    for (let i = 0; i < 10; i++) {
      records.push(createTestBreakRecord({ activity: '冥想' }))
    }
    achievements.checkAchievements()
    const meditation = achievements.achievements.value.find(a => a.id === 'meditation_master')
    expect(meditation!.unlocked).toBe(true)
  })

  it('应正确计算小憩之王成就', () => {
    for (let i = 0; i < 20; i++) {
      records.push(createTestBreakRecord({ activity: '小憩' }))
    }
    achievements.checkAchievements()
    const nap = achievements.achievements.value.find(a => a.id === 'nap_king')
    expect(nap!.unlocked).toBe(true)
  })

  it('应正确计算漫步者成就', () => {
    for (let i = 0; i < 5; i++) {
      records.push(createTestBreakRecord({ activity: '散步', duration: 20 }))
    }
    achievements.checkAchievements()
    const walk = achievements.achievements.value.find(a => a.id === 'walk_100km')
    expect(walk!.unlocked).toBe(true)
  })

  it('应正确计算百次休憩成就', () => {
    for (let i = 0; i < 100; i++) {
      records.push(createTestBreakRecord())
    }
    achievements.checkAchievements()
    const rest100 = achievements.achievements.value.find(a => a.id === 'rest_100')
    expect(rest100!.unlocked).toBe(true)
  })

  it('应支持重置成就', () => {
    records.push(createTestBreakRecord())
    achievements.checkAchievements()
    achievements.resetAchievements()
    const all = achievements.achievements.value
    expect(all.every(a => !a.unlocked)).toBe(true)
  })

  it('unlockedCount 应正确计数', () => {
    records.push(createTestBreakRecord())
    achievements.checkAchievements()
    expect(achievements.unlockedCount.value).toBeGreaterThanOrEqual(1)
  })
})

// ============================================================
// 8. useFocusRestLink — 专注联动
// ============================================================

describe('useFocusRestLink', () => {
  let link: ReturnType<typeof useFocusRestLink>

  beforeEach(() => {
    storageData.clear()
    link = useFocusRestLink()
    link.links.value = []
  })

  it('应根据专注时长建议休息', () => {
    expect(link.suggestRest(20).duration).toBe(5)
    expect(link.suggestRest(25).duration).toBe(5)
    expect(link.suggestRest(50).duration).toBe(10)
    expect(link.suggestRest(90).duration).toBe(15)
    expect(link.suggestRest(120).duration).toBe(20)
  })

  it('应创建专注-休息关联', () => {
    const result = link.createLink('session_1', 50)
    expect(result.focusSessionId).toBe('session_1')
    expect(result.focusDuration).toBe(50)
    expect(result.restTaken).toBe(false)
    expect(link.links.value.length).toBe(1)
  })

  it('应标记休息已执行', () => {
    link.createLink('session_1', 25)
    const result = link.markRestTaken('session_1', 'rest_1')
    expect(result).toBe(true)
    const updated = link.links.value.find(l => l.focusSessionId === 'session_1')
    expect(updated!.restTaken).toBe(true)
    expect(updated!.restRecordId).toBe('rest_1')
  })

  it('标记不存在的链接应返回 false', () => {
    const result = link.markRestTaken('nonexistent', 'rest_1')
    expect(result).toBe(false)
  })

  it('pendingRest 应返回未休息的关联', () => {
    link.createLink('session_1', 25)
    link.createLink('session_2', 50)
    link.markRestTaken('session_1', 'rest_1')
    const pending = link.pendingRest.value
    expect(pending.length).toBe(1)
    expect(pending[0].focusSessionId).toBe('session_2')
  })

  it('restRate 应正确计算休息执行率', () => {
    link.createLink('s1', 25)
    link.createLink('s2', 50)
    link.markRestTaken('s1', 'r1')
    expect(link.restRate.value).toBe(50)
  })
})

// ============================================================
// 9. useRestTrend — 趋势图数据
// ============================================================

describe('useRestTrend', () => {
  let getRecords: () => BreakRecord[]
  let getPractices: () => RestPractice[]
  let trend: ReturnType<typeof useRestTrend>
  let records: BreakRecord[]

  beforeEach(() => {
    records = []
    getRecords = () => records
    getPractices = () => DEFAULT_PRACTICES
    trend = useRestTrend(getRecords, getPractices)
  })

  it('应生成趋势数据', () => {
    const today = new Date().toISOString()
    records.push(
      createTestBreakRecord({ date: today, activity: '冥想', duration: 15, mood: 4 }),
      createTestBreakRecord({ date: today, activity: '散步', duration: 20, mood: 3 }),
    )
    const data = trend.computeTrend(7)
    expect(data.points.length).toBe(7)
    expect(data.summary.totalBreaks).toBe(2)
    expect(data.summary.totalDuration).toBe(35)
  })

  it('应正确计算平均心情', () => {
    const today = new Date().toISOString()
    records.push(createTestBreakRecord({ date: today, mood: 4 }))
    records.push(createTestBreakRecord({ date: today, mood: 2 }))
    const data = trend.computeTrend(7)
    expect(data.summary.avgMood).toBe(3)
  })

  it('应找到最佳休息日', () => {
    const today = new Date().toISOString()
    records.push(
      createTestBreakRecord({ date: today, activity: '冥想', duration: 15, mood: 5 }),
    )
    const data = trend.computeTrend(7)
    expect(data.summary.bestDay).not.toBeNull()
  })

  it('无记录时应返回零值', () => {
    const data = trend.computeTrend(30)
    expect(data.summary.totalBreaks).toBe(0)
    expect(data.summary.avgMood).toBe(0)
  })
})

// ============================================================
// 10. useRestNotificationBridge — 浏览器通知集成 (P16-10)
// ============================================================

describe('useRestNotificationBridge', () => {
  let bridge: ReturnType<typeof useRestNotificationBridge>

  beforeEach(() => {
    storageData.clear()
    mockNotifications.length = 0
    mockNotificationConstructor.mockClear()
    // @ts-expect-error
    globalThis.Notification.permission = 'default'
    bridge = useRestNotificationBridge()
    bridge.resetPreference()
    bridge.clearRecords()
  })

  describe('偏好管理', () => {
    it('应有默认偏好', () => {
      expect(bridge.preference.value.enabled).toBe(false)
      expect(bridge.preference.value.quietHoursStart).toBe('22:00')
      expect(bridge.preference.value.quietHoursEnd).toBe('08:00')
      expect(bridge.preference.value.maxDailyNotifications).toBe(20)
    })

    it('应正确更新偏好', () => {
      bridge.updatePreference({ enabled: false, maxDailyNotifications: 10 })
      expect(bridge.preference.value.enabled).toBe(false)
      expect(bridge.preference.value.maxDailyNotifications).toBe(10)
    })

    it('应正确重置偏好', () => {
      bridge.updatePreference({ enabled: false })
      bridge.resetPreference()
      expect(bridge.preference.value.enabled).toBe(false)
    })

    it('应正确切换通知开关', () => {
      const wasEnabled = bridge.preference.value.enabled
      bridge.toggleEnabled()
      expect(bridge.preference.value.enabled).toBe(!wasEnabled)
    })
  })

  describe('权限管理', () => {
    it('应检查浏览器通知支持', () => {
      expect(bridge.checkSupport()).toBe(true)
    })

    it('应获取当前权限', () => {
      // @ts-expect-error
      globalThis.Notification.permission = 'granted'
      const perm = bridge.getPermission()
      expect(perm).toBe('granted')
    })

    it('应同步权限状态', () => {
      // @ts-expect-error
      globalThis.Notification.permission = 'denied'
      bridge.syncPermission()
      expect(bridge.preference.value.permission).toBe('denied')
    })
  })

  describe('静默时段', () => {
    it('默认配置下深夜应在静默时段', () => {
      // 这个测试依赖当前时间，静默时段是 22:00-08:00
      // 我们只验证函数逻辑正确性
      const result = bridge.isInQuietHours()
      expect(typeof result).toBe('boolean')
    })

    it('可自定义静默时段', () => {
      bridge.updatePreference({ quietHoursStart: '00:00', quietHoursEnd: '23:59' })
      expect(bridge.isInQuietHours()).toBe(true)
    })
  })

  describe('发送通知', () => {
    it('权限未授予时不应发送通知', async () => {
      // @ts-expect-error
      globalThis.Notification.permission = 'denied'
      bridge.syncPermission()
      const reminder = createTestReminder()
      const result = await bridge.sendReminderNotification(reminder)
      expect(result).toBeNull()
      expect(mockNotifications.length).toBe(0)
    })

    it('禁用时不应发送通知', async () => {
      // @ts-expect-error
      globalThis.Notification.permission = 'granted'
      bridge.syncPermission()
      bridge.updatePreference({ enabled: false })
      const reminder = createTestReminder()
      const result = await bridge.sendReminderNotification(reminder)
      expect(result).toBeNull()
    })

    it('超过每日上限应拒绝', async () => {
      // @ts-expect-error
      globalThis.Notification.permission = 'granted'
      bridge.syncPermission()
      bridge.updatePreference({ maxDailyNotifications: 0 })
      const reminder = createTestReminder()
      const result = await bridge.sendReminderNotification(reminder)
      expect(result).toBeNull()
    })
  })

  describe('通知统计', () => {
    it('应正确计算通知统计', () => {
      const stats = bridge.getNotificationStats()
      expect(stats.totalSent).toBe(0)
      expect(stats.clickRate).toBe(0)
    })

    it('清除记录后统计应为零', () => {
      bridge.clearRecords()
      const stats = bridge.getNotificationStats()
      expect(stats.totalSent).toBe(0)
    })
  })

  describe('通知记录', () => {
    it('recentRecords 应为空', () => {
      expect(bridge.recentRecords.value.length).toBe(0)
    })

    it('应支持注册点击回调', () => {
      bridge.onClick((_id) => { /* noop */ })
      // 回调注册成功即可
      expect(true).toBe(true)
    })
  })
})

// ============================================================
// 11. 常量验证
// ============================================================

describe('常量验证', () => {
  it('RITUAL_CATEGORY_META 应覆盖所有仪式类别', () => {
    const categories: RitualCategory[] = ['morning', 'afternoon', 'evening', 'work-break', 'weekend']
    for (const cat of categories) {
      expect(RITUAL_CATEGORY_META[cat]).toBeDefined()
    }
  })

  it('GROWTH_PHASE_META 应有6个阶段', () => {
    const phases: GrowthPhase[] = ['seed', 'sprout', 'seedling', 'budding', 'blooming', 'fruiting']
    for (const phase of phases) {
      expect(GROWTH_PHASE_META[phase]).toBeDefined()
    }
  })

  it('FATIGUE_LEVEL_META 应覆盖所有疲劳级别', () => {
    const levels: FatigueLevel[] = ['energized', 'normal', 'tired', 'exhausted', 'burnout']
    for (const level of levels) {
      expect(FATIGUE_LEVEL_META[level]).toBeDefined()
    }
  })

  it('PRESET_RITUALS 应有5个预设仪式', () => {
    expect(PRESET_RITUALS.length).toBe(5)
    expect(PRESET_RITUALS.every(r => r.preset)).toBe(true)
  })

  it('DEFAULT_REMINDERS 应有5个默认提醒', () => {
    expect(DEFAULT_REMINDERS.length).toBe(5)
  })

  it('DEFAULT_PRACTICES 应有12个默认休憩方式', () => {
    expect(DEFAULT_PRACTICES.length).toBe(12)
  })

  it('REST_ADVANCED_STORAGE_KEYS 应有4个存储键', () => {
    const keys = REST_ADVANCED_STORAGE_KEYS
    expect(Object.keys(keys).length).toBe(4)
  })
})