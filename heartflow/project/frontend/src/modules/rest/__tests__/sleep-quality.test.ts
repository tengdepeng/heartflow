// ============================================================
// 息壤 · 睡眠质量分析 测试（P18-3）
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useSleepQuality } from '../sleep-quality'
import type { SleepRecord } from '../sleep-quality'

// 模拟 storage
const mockStorage: Record<string, string> = {}

// Mock storage engine
vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: <T>(key: string, defaultValue: T): T => {
      const val = mockStorage[key]
      if (val === undefined) return defaultValue
      return JSON.parse(val) as T
    },
    setKV: (key: string, value: string): void => {
      mockStorage[key] = value
    },
  },
}))

/** 生成 n 天前的 YYYY-MM-DD（分析窗口为最近 7 天，保证测试数据始终落在窗口内） */
function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

function createSleepRecord(overrides: Partial<SleepRecord> = {}): Omit<SleepRecord, 'id'> {
  return {
    date: daysAgo(1),
    bedtime: `${daysAgo(1)}T23:00:00.000Z`,
    wakeTime: `${daysAgo(0)}T07:00:00.000Z`,
    duration: 450,
    sleepLatency: 15,
    quality: 4,
    interruptions: 0,
    ...overrides,
  }
}

describe('useSleepQuality', () => {
  let sleepQuality: ReturnType<typeof useSleepQuality>

  beforeEach(() => {
    Object.keys(mockStorage).forEach(k => delete mockStorage[k])
    sleepQuality = useSleepQuality()
    sleepQuality.init()
  })

  describe('睡眠记录 CRUD', () => {
    it('应该添加睡眠记录', () => {
      const input = createSleepRecord()
      const record = sleepQuality.addSleepRecord(input)
      expect(record.id).toBeTruthy()
      expect(record.date).toBe(input.date)
      expect(sleepQuality.records.value.length).toBe(1)
    })

    it('应该更新睡眠记录', () => {
      const record = sleepQuality.addSleepRecord(createSleepRecord())
      const updated = sleepQuality.updateSleepRecord(record.id, { quality: 5 })
      expect(updated).toBe(true)
      expect(sleepQuality.records.value[0].quality).toBe(5)
    })

    it('更新不存在的记录应返回 false', () => {
      const result = sleepQuality.updateSleepRecord('nonexistent', { quality: 5 })
      expect(result).toBe(false)
    })

    it('应该删除睡眠记录', () => {
      const record = sleepQuality.addSleepRecord(createSleepRecord())
      const deleted = sleepQuality.deleteSleepRecord(record.id)
      expect(deleted).toBe(true)
      expect(sleepQuality.records.value.length).toBe(0)
    })

    it('应该获取今日记录', () => {
      const today = new Date().toISOString().split('T')[0]
      sleepQuality.addSleepRecord(createSleepRecord({ date: today }))
      const todayRecord = sleepQuality.getTodayRecord()
      expect(todayRecord).toBeTruthy()
      expect(todayRecord!.date).toBe(today)
    })

    it('应该按日期范围筛选记录', () => {
      sleepQuality.addSleepRecord(createSleepRecord({ date: '2026-07-25' }))
      sleepQuality.addSleepRecord(createSleepRecord({ date: '2026-07-28' }))
      sleepQuality.addSleepRecord(createSleepRecord({ date: '2026-08-01' }))
      sleepQuality.addSleepRecord(createSleepRecord({ date: '2026-08-03' }))

      const range = sleepQuality.getRecordsByRange('2026-07-28', '2026-08-01')
      expect(range.length).toBe(2)
    })
  })

  describe('睡眠质量分析', () => {
    it('无记录时应返回空分析', () => {
      const report = sleepQuality.analyzeSleepQuality(7)
      expect(report.totalDays).toBe(0)
      expect(report.suggestions.length).toBeGreaterThan(0)
    })

    it('单条记录应正确计算平均值', () => {
      sleepQuality.addSleepRecord(createSleepRecord({
        date: daysAgo(1),
        duration: 420,
        quality: 4,
        sleepLatency: 10,
      }))

      const report = sleepQuality.analyzeSleepQuality(7)
      expect(report.totalDays).toBe(1)
      expect(report.avgDuration).toBe(420)
      expect(report.avgQuality).toBe(4)
      expect(report.avgLatency).toBe(10)
    })

    it('多条记录应正确计算平均值', () => {
      sleepQuality.addSleepRecord(createSleepRecord({
        date: daysAgo(3), duration: 480, quality: 5, sleepLatency: 5,
        bedtime: `${daysAgo(3)}T22:00:00.000Z`,
        wakeTime: `${daysAgo(2)}T06:00:00.000Z`,
      }))
      sleepQuality.addSleepRecord(createSleepRecord({
        date: daysAgo(2), duration: 420, quality: 3, sleepLatency: 20,
        bedtime: `${daysAgo(2)}T23:00:00.000Z`,
        wakeTime: `${daysAgo(1)}T06:00:00.000Z`,
      }))
      sleepQuality.addSleepRecord(createSleepRecord({
        date: daysAgo(1), duration: 360, quality: 2, sleepLatency: 30,
        bedtime: `${daysAgo(1)}T23:30:00.000Z`,
        wakeTime: `${daysAgo(0)}T05:30:00.000Z`,
      }))

      const report = sleepQuality.analyzeSleepQuality(7)
      expect(report.totalDays).toBe(3)
      expect(report.avgDuration).toBe(420) // (480+420+360)/3
      expect(report.avgQuality).toBe(3.3) // (5+3+2)/3
      expect(report.avgLatency).toBe(18) // (5+20+30)/3
    })

    it('应该检测早鸟类型', () => {
      for (let i = 0; i < 5; i++) {
        sleepQuality.addSleepRecord(createSleepRecord({
          date: daysAgo(5 - i),
          bedtime: `${daysAgo(5 - i)}T21:30:00.000Z`,
          wakeTime: `${daysAgo(4 - i)}T05:30:00.000Z`,
          duration: 450,
          quality: 4,
          sleepLatency: 10,
        }))
      }

      const report = sleepQuality.analyzeSleepQuality(7)
      expect(report.chronotype).toBe('early_bird')
    })

    it('应该检测夜猫类型', () => {
      for (let i = 0; i < 5; i++) {
        sleepQuality.addSleepRecord(createSleepRecord({
          date: daysAgo(5 - i),
          bedtime: `${daysAgo(5 - i)}T01:00:00.000Z`,
          wakeTime: `${daysAgo(4 - i)}T09:00:00.000Z`,
          duration: 450,
          quality: 4,
          sleepLatency: 10,
        }))
      }

      const report = sleepQuality.analyzeSleepQuality(7)
      expect(report.chronotype).toBe('night_owl')
    })

    it('应该检测不规律类型', () => {
      const times = ['21:00', '02:00', '23:00', '03:00', '22:00']
      for (let i = 0; i < 5; i++) {
        sleepQuality.addSleepRecord(createSleepRecord({
          date: daysAgo(5 - i),
          bedtime: `${daysAgo(5 - i)}T${times[i]}:00.000Z`,
          wakeTime: `${daysAgo(4 - i)}T07:00:00.000Z`,
          duration: 420,
          quality: 3,
          sleepLatency: 15,
        }))
      }

      const report = sleepQuality.analyzeSleepQuality(7)
      expect(report.chronotype).toBe('irregular')
    })

    it('应该计算睡眠债务', () => {
      sleepQuality.addSleepRecord(createSleepRecord({
        date: daysAgo(2), duration: 360, // 少 2 小时
      }))
      sleepQuality.addSleepRecord(createSleepRecord({
        date: daysAgo(1), duration: 300, // 少 3 小时
      }))

      const report = sleepQuality.analyzeSleepQuality(7)
      expect(report.sleepDebt).toBe(300) // 120 + 180 = 300 分钟
    })

    it('良好睡眠应产生积极建议', () => {
      // 先设置良好的睡眠卫生
      sleepQuality.hygieneItems.value.forEach(item => {
        sleepQuality.toggleHygieneItem(item.id)
      })

      for (let i = 0; i < 5; i++) {
        sleepQuality.addSleepRecord(createSleepRecord({
          date: daysAgo(5 - i),
          bedtime: `${daysAgo(5 - i)}T22:30:00.000Z`,
          wakeTime: `${daysAgo(4 - i)}T06:30:00.000Z`,
          duration: 460,
          quality: 5,
          sleepLatency: 5,
        }))
      }

      const report = sleepQuality.analyzeSleepQuality(7)
      expect(report.suggestions).toContain('睡眠状况良好，继续保持当前习惯！')
    })
  })

  describe('睡眠规律性评分', () => {
    it('少于 2 条记录应返回 0', () => {
      const score = sleepQuality.calculateConsistencyScore([])
      expect(score).toBe(0)
    })

    it('规律睡眠应得高分', () => {
      const recs: SleepRecord[] = []
      for (let i = 0; i < 5; i++) {
        recs.push({
          id: `r${i}`,
          date: `2026-08-0${1 + i}`,
          bedtime: `2026-08-0${1 + i}T23:00:00.000Z`,
          wakeTime: `2026-08-0${2 + i}T07:00:00.000Z`,
          duration: 480,
          sleepLatency: 10,
          quality: 4,
          interruptions: 0,
        })
      }

      const score = sleepQuality.calculateConsistencyScore(recs)
      expect(score).toBeGreaterThanOrEqual(90) // 完全一致应接近 100
    })
  })

  describe('睡眠效率', () => {
    it('高效睡眠应返回高分', () => {
      const recs: SleepRecord[] = [{
        id: 'r1',
        date: '2026-08-03',
        bedtime: '2026-08-03T23:00:00.000Z',
        wakeTime: '2026-08-04T07:00:00.000Z',
        duration: 460,
        sleepLatency: 5,
        quality: 5,
        interruptions: 0,
      }]

      const efficiency = sleepQuality.calculateSleepEfficiency(recs)
      expect(efficiency).toBeGreaterThanOrEqual(95)
    })
  })

  describe('睡眠卫生', () => {
    it('应该初始化默认检查项', () => {
      expect(sleepQuality.hygieneItems.value.length).toBe(12)
    })

    it('所有项初始应为未选中', () => {
      const checked = sleepQuality.hygieneItems.value.filter(i => i.checked)
      expect(checked.length).toBe(0)
    })

    it('应该切换检查项状态', () => {
      const firstId = sleepQuality.hygieneItems.value[0].id
      sleepQuality.toggleHygieneItem(firstId)
      expect(sleepQuality.hygieneItems.value[0].checked).toBe(true)

      sleepQuality.toggleHygieneItem(firstId)
      expect(sleepQuality.hygieneItems.value[0].checked).toBe(false)
    })

    it('无选中项时卫生评分为 0', () => {
      expect(sleepQuality.calculateHygieneScore()).toBe(0)
    })

    it('全部选中时卫生评分为 100', () => {
      sleepQuality.hygieneItems.value.forEach(item => {
        sleepQuality.toggleHygieneItem(item.id)
      })
      expect(sleepQuality.calculateHygieneScore()).toBe(100)
    })
  })

  describe('智能闹钟', () => {
    it('应该初始化默认闹钟', () => {
      expect(sleepQuality.alarmConfigs.value.length).toBe(3)
    })

    it('应该切换闹钟启用状态', () => {
      const firstId = sleepQuality.alarmConfigs.value[0].id
      const wasEnabled = sleepQuality.alarmConfigs.value[0].enabled
      sleepQuality.toggleAlarm(firstId)
      expect(sleepQuality.alarmConfigs.value[0].enabled).toBe(!wasEnabled)
    })

    it('应该更新闹钟配置', () => {
      const firstId = sleepQuality.alarmConfigs.value[0].id
      sleepQuality.updateAlarmConfig(firstId, { targetWakeTime: '06:30' })
      expect(sleepQuality.alarmConfigs.value[0].targetWakeTime).toBe('06:30')
    })

    it('应该计算最佳起床时间', () => {
      const times = sleepQuality.calculateOptimalWakeTimes('23:00')
      expect(times.length).toBeGreaterThan(0)
      // 第一个结果应该是 3 个周期（4.5 小时）+ 15 分钟入睡 = 23:00 + 15 + 270 = 03:45
      expect(times[0].cycles).toBe(3)
    })

    it('应该计算建议入睡时间', () => {
      const times = sleepQuality.calculateOptimalBedtimes('07:00')
      expect(times.length).toBeGreaterThan(0)
      // 6 个周期：7:00 - 6*90 - 15 = 7:00 - 555min = 21:45
      expect(times.some(t => t.cycles === 6)).toBe(true)
    })

    it('应该预测起床难度', () => {
      // 无数据时应返回 moderate
      const prediction = sleepQuality.predictWakeDifficulty('06:00')
      expect(prediction.difficulty).toBe('moderate')
    })
  })
})