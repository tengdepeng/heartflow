// ============================================================
// 日键批次（attention / bag / career / cognition / craft）· 时区判别力测试
// INCR-466 · 时区治理
//
// 本批把 5 个域 6 个文件的裸 UTC 切日统一为 utils/time.ts 的 getLocalDateKey：
//   modules/attention/attention-model       buildLocalAttentionInput.dateStr 默认值
//   modules/bag/bag-analytics               recordGrowthPoint 写键 + getGrowthTrend 截止边界
//   modules/bag/bag-store                   新进化条目默认 date
//   modules/career/skill-gap-visualization  generateRoadmap 预计完成日
//   modules/cognition/meditation-analytics  周键/截止日/今日/日趋势/年起点/中断天数
//   modules/craft/craft-habits              analyzeHabits 每日创作数按本地日去重
//   modules/craft/useCraftUi                进化历史 date
//
// 判别窗口 = 本地 00:00–08:00（东八区此刻 UTC 日历日仍是前一天）。
// 基准时刻钉在本地 2026-03-15 03:00（月中，避开跨月/跨年算术）。
//
// 反向验证：把实现改回 toISOString().slice(0,10) / split('T')[0] 后，下列用例应转红。
// ============================================================

const ORIGINAL_TZ = process.env.TZ
process.env.TZ = 'Asia/Shanghai'

import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getLocalDateKey } from '../utils/time'

// ---- 内存 KV（隔离持久化；engine/storage 仅被这些引擎用到 getKV/setKV）----
const { kvStore } = vi.hoisted(() => ({ kvStore: new Map<string, any>() }))

vi.mock('../engine/storage', () => ({
  storage: {
    getKV: (key: string, def: any) => (kvStore.has(key) ? kvStore.get(key) : def),
    setKV: (key: string, value: any) => { kvStore.set(key, value) },
  },
}))

import { buildLocalAttentionInput } from '../modules/attention/attention-model'
import { useBagAnalytics } from '../modules/bag/bag-analytics'
import { useSkillGapVisualization } from '../modules/career/skill-gap-visualization'
import { useMeditationAnalytics } from '../modules/cognition/meditation-analytics'
import { useHabitAnalyzer } from '../modules/craft/craft-habits'
import type { PrioritizedGap } from '../modules/career/skill-gap-advisor'
import type { CraftWork } from '../modules/craft/types'

/** 本地 2026-03-15 03:00（东八区凌晨，UTC 仍是 03-14） */
const NOW = new Date(2026, 2, 15, 3, 0, 0)
/** 本地日历日 = 2026-03-15（TZ 生效时） */
const LOCAL_TODAY = '2026-03-15'
/** 此刻 UTC 日历日 = 2026-03-14，正是旧口径会误取的日期 */
const UTC_TODAY = '2026-03-14'

beforeEach(() => {
  kvStore.clear()
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})
afterEach(() => { vi.useRealTimers() })
afterAll(() => { process.env.TZ = ORIGINAL_TZ })

function mkGap(priority: PrioritizedGap['priority'], estimatedHours: number): PrioritizedGap {
  return {
    skillName: '测试技能',
    category: 'technical',
    currentLevel: 'beginner',
    currentScore: 20,
    targetLevel: 'advanced',
    targetScore: 80,
    gapSize: 60,
    priority,
    priorityScore: priority === 'urgent' ? 90 : 50,
    estimatedHours,
    resources: [],
    isPrerequisite: false,
    learningStrategy: '刻意练习',
  }
}

function mkSession(id: string, date: string): any {
  return {
    id,
    date,
    timestamp: `${date}T10:00:00.000Z`,
    duration: 10,
    type: 'breath',
    mood: 'neutral',
    moodAfter: 'calm',
    completed: true,
    interrupted: false,
  }
}

function mkWork(id: string, createdAt: string): CraftWork {
  return {
    id,
    name: id,
    icon: '🔨',
    description: '',
    color: '#b8a080',
    status: 'draft',
    type: 'writing',
    date: '2026-03',
    evolution: 0,
    tags: [],
    createdAt,
    updatedAt: createdAt,
  }
}

describe('日键批次 · 前提护栏', () => {
  it('本机时区须使本地日与 UTC 日可分离，否则断言退化为同值比较', () => {
    expect(getLocalDateKey(NOW)).toBe(LOCAL_TODAY)
    expect(NOW.toISOString().slice(0, 10)).toBe(UTC_TODAY)
    expect(LOCAL_TODAY).not.toBe(UTC_TODAY)
  })
})

describe('attention · 注意力输入日期键', () => {
  it('buildLocalAttentionInput 未显式传 dateStr 时用本地日历日', () => {
    const env = { deviceIdleMs: 0, isScreenAwake: true, hour: 10, activeApp: null } as any
    const input = buildLocalAttentionInput(env, { navigationCount: 1, focusMinutes: 0 })
    expect(input.dateStr).toBe(LOCAL_TODAY)
    // 旧口径（UTC 切日）会给出 03-14
    expect(input.dateStr).not.toBe(UTC_TODAY)
  })
})

describe('bag · 成长趋势日期键', () => {
  it('recordGrowthPoint 写键用本地日历日', () => {
    const { recordGrowthPoint, growthTrend } = useBagAnalytics()
    recordGrowthPoint([])
    const last = growthTrend.value[growthTrend.value.length - 1]
    expect(last.date).toBe(LOCAL_TODAY)
    expect(last.date).not.toBe(UTC_TODAY)
  })

  it('同一本地日多次记录只保留一个趋势点（同键覆盖，不重复）', () => {
    const { recordGrowthPoint, growthTrend } = useBagAnalytics()
    recordGrowthPoint([])
    recordGrowthPoint([])
    expect(growthTrend.value.filter(t => t.date === LOCAL_TODAY).length).toBe(1)
    expect(growthTrend.value.some(t => t.date === UTC_TODAY)).toBe(false)
  })
})

describe('career · 改善路线图预计完成日', () => {
  it('generateRoadmap 预计完成日按本地日历日', () => {
    const { generateRoadmap } = useSkillGapVisualization()
    // 单个紧急缺口 30h ⇒ 阶段周数 ceil(30/15)=2 ⇒ 完成 = 本地 03-15 + 14 天
    const r = generateRoadmap([mkGap('urgent', 30)], '测试路线图')
    expect(r.estimatedCompletion).toBe('2026-03-29')
    // 旧口径（UTC 切日）会给出 03-28
    expect(r.estimatedCompletion).not.toBe('2026-03-28')
  })
})

describe('cognition · 冥想日期键', () => {
  it('getTodaySessions 只认本地当天', () => {
    const a = useMeditationAnalytics()
    a.addSession(mkSession('local-today', LOCAL_TODAY))
    a.addSession(mkSession('utc-today', UTC_TODAY))
    const ids = a.getTodaySessions().map(s => s.id)
    expect(ids).toContain('local-today')
    // 旧口径 today=03-14，会错把「UTC 昨天」当今天
    expect(ids).not.toContain('utc-today')
  })

  it('computeStreak 今日活跃判定用本地日历日', () => {
    const a = useMeditationAnalytics()
    a.addSession(mkSession('s1', LOCAL_TODAY))
    const st = a.computeStreak()
    // 旧口径 today=03-14 / yesterday=03-13，末次冥想 03-15 会被判「非活跃」
    expect(st.isStreakActive).toBe(true)
    expect(st.currentStreak).toBe(1)
  })
})

describe('craft · 创作习惯日期键', () => {
  it('analyzeHabits 每日创作数按本地日历日去重', () => {
    const { analyzeHabits } = useHabitAnalyzer()
    const works = [
      mkWork('a', new Date(2026, 2, 15, 3, 0, 0).toISOString()),  // 本地 03-15，UTC 03-14
      mkWork('b', new Date(2026, 2, 15, 12, 0, 0).toISOString()), // 本地/UTC 均 03-15
    ]
    const r = analyzeHabits(works)
    // 两件同属本地 03-15 ⇒ 1 个创作日 ⇒ 日均 2
    // 旧口径（UTC 切日去重）会算成 2 个创作日 ⇒ 日均 1
    expect(r.avgDailyCreations).toBe(2)
  })
})