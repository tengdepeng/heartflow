// ============================================================
// 自我认知档案分析引擎测试（INCR-34）
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  selfCognitionOverview,
  selfCognitionStyle,
  selfCognitionValues,
  selfCognitionGrowth,
  selfCognitionInsights,
} from '../self-cognition-analytics'
import type { DialogueEntry } from '../types'

// Mock storage（引擎 import personality-model，但纯函数不触碰 storage）
const storageMock = new Map<string, unknown>()
vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: <T>(key: string, defaultValue: T): T =>
      (storageMock.get(key) as T) ?? defaultValue,
    setKV: (key: string, value: unknown) => storageMock.set(key, value),
    removeKV: (key: string) => storageMock.delete(key),
  },
}))

function entry(
  i: number,
  text: string,
  daysAgo: number,
  role: 'user' | 'mirror' = 'user',
): DialogueEntry {
  return {
    id: `e_${i}`,
    role,
    text,
    timestamp: now - daysAgo * 86400000,
  }
}

const now = Date.now()

function makeDialogues(count: number): DialogueEntry[] {
  const templates = [
    '我今天感觉很开心，因为完成了一个重要的项目。',
    '最近在想，为什么我总是容易焦虑？也许需要更深入地反思一下。',
    '我觉得自己需要更多的独立空间，但同时也渴望与人连接。',
    '今天学习了一些新的知识，感觉成长了很多。',
    '和朋友聊天让我感到温暖，谢谢他们的陪伴。',
  ]
  return Array.from({ length: count }, (_, i) =>
    entry(i, `${templates[i % templates.length]} ${i}`, count - i),
  )
}

/** 中性语料：不含反思/成长等关键词，用于稳定控制成长阶段判定 */
function neutralDialogues(count: number, maxDaysAgo: number): DialogueEntry[] {
  return Array.from({ length: count }, (_, i) =>
    entry(i, '今天做好了日常事务安排，按时完成了计划。', maxDaysAgo - i),
  )
}

beforeEach(() => {
  storageMock.clear()
})

// ============================================================
// 概览
// ============================================================

describe('概览 (selfCognitionOverview)', () => {
  it('空数据时概览全为零', () => {
    const ov = selfCognitionOverview([], new Date(now))
    expect(ov.total).toBe(0)
    expect(ov.userCount).toBe(0)
    expect(ov.totalWords).toBe(0)
    expect(ov.daySpan).toBe(0)
    expect(ov.lastActiveDays).toBe(0)
    expect(ov.recent7).toBe(0)
  })

  it('只统计用户发言，忽略镜我回复', () => {
    const dialogues: DialogueEntry[] = [
      entry(0, '我的一段话', 2),
      entry(1, '镜我的回应', 2, 'mirror'),
      entry(2, '我的另一段更长的话', 1),
    ]
    const ov = selfCognitionOverview(dialogues, new Date(now))
    expect(ov.total).toBe(3)
    expect(ov.userCount).toBe(2)
    expect(ov.totalWords).toBe('我的一段话'.length + '我的另一段更长的话'.length)
  })

  it('正确计算覆盖天数与最近活跃', () => {
    const dialogues = [
      entry(0, '第一天', 10),
      entry(1, '第二天', 5),
      entry(2, '今天', 0),
    ]
    const ov = selfCognitionOverview(dialogues, new Date(now))
    expect(ov.daySpan).toBe(11)
    expect(ov.lastActiveDays).toBe(0)
  })

  it('正确统计近 7 天留声', () => {
    const dialogues = [
      entry(0, '十天前', 10),
      entry(1, '昨天', 1),
      entry(2, '今天', 0),
    ]
    const ov = selfCognitionOverview(dialogues, new Date(now))
    expect(ov.recent7).toBe(2)
  })

  it('计算反思性表达占比', () => {
    const dialogues = [
      entry(0, '最近在反思自己的选择', 2),
      entry(1, '今天天气不错', 1),
    ]
    const ov = selfCognitionOverview(dialogues, new Date(now))
    expect(ov.reflectRatio).toBe(0.5)
  })
})

// ============================================================
// 人格风格
// ============================================================

describe('人格风格 (selfCognitionStyle)', () => {
  it('覆盖全部 8 个维度且评分在 0-1 与降序', () => {
    const styles = selfCognitionStyle(makeDialogues(12))
    expect(styles.length).toBe(8)
    const dims = styles.map((s) => s.dimension)
    expect(dims).toEqual(
      expect.arrayContaining([
        'conciseness', 'formality', 'emotionality', 'directness',
        'reflectiveness', 'creativity', 'analytical', 'social_warmth',
      ]),
    )
    for (const s of styles) {
      expect(s.score).toBeGreaterThanOrEqual(0)
      expect(s.score).toBeLessThanOrEqual(1)
      expect(s.highLabel.length).toBeGreaterThan(0)
      expect(s.lowLabel.length).toBeGreaterThan(0)
    }
    for (let i = 1; i < styles.length; i++) {
      expect(styles[i - 1].score).toBeGreaterThanOrEqual(styles[i].score)
    }
  })

  it('空数据时评分全为 0', () => {
    const styles = selfCognitionStyle([])
    expect(styles.length).toBe(8)
    expect(styles.every((s) => s.score === 0)).toBe(true)
  })

  it('短句占比高时简洁度高', () => {
    const shortTexts = Array.from({ length: 8 }, (_, i) => entry(i, '短句', i))
    const styles = selfCognitionStyle(shortTexts)
    const concise = styles.find((s) => s.dimension === 'conciseness')!
    expect(concise.score).toBe(1)
  })

  it('情感词汇密集时情感维度突出', () => {
    const emoTexts = Array.from({ length: 10 }, (_, i) =>
      entry(i, '我今天很开心很快乐，感到幸福和满足。', i),
    )
    const styles = selfCognitionStyle(emoTexts)
    const emo = styles.find((s) => s.dimension === 'emotionality')!
    expect(emo.score).toBeGreaterThan(0.5)
  })
})

// ============================================================
// 价值观取向
// ============================================================

describe('价值观取向 (selfCognitionValues)', () => {
  it('空数据时无价值取向', () => {
    expect(selfCognitionValues([])).toEqual([])
  })

  it('仅返回有证据的维度，最多 3 条且降序', () => {
    const dialogues = makeDialogues(15)
    const values = selfCognitionValues(dialogues)
    expect(values.length).toBeGreaterThan(0)
    expect(values.length).toBeLessThanOrEqual(3)
    for (const v of values) {
      expect(v.score).toBeGreaterThan(0)
      expect(v.label.length).toBeGreaterThan(0)
      expect(v.evidence.length).toBeGreaterThan(0)
    }
    for (let i = 1; i < values.length; i++) {
      expect(values[i - 1].score).toBeGreaterThanOrEqual(values[i].score)
    }
  })

  it('成长类词汇拉升「成长」维度', () => {
    const growthTexts = Array.from({ length: 10 }, (_, i) =>
      entry(i, '我想通过学习成长进步，努力练习并掌握新的技能。', i),
    )
    const values = selfCognitionValues(growthTexts)
    const growth = values.find((v) => v.dimension === 'growth')!
    expect(growth).toBeDefined()
    expect(growth.score).toBeGreaterThan(0.5)
  })
})

// ============================================================
// 成长阶段
// ============================================================

describe('成长阶段 (selfCognitionGrowth)', () => {
  it('空数据时返回 null', () => {
    expect(selfCognitionGrowth([])).toBeNull()
  })

  it('对话很少时进入初始阶段', () => {
    const dialogues = makeDialogues(5)
    const growth = selfCognitionGrowth(dialogues)!
    expect(growth.phase).toBe('initial')
    expect(growth.label).toBe('初始阶段')
    expect(growth.icon).toBeTruthy()
  })

  it('跨度不足 30 天且样本足够时为探索阶段', () => {
    const dialogues = neutralDialogues(10, 8)
    const growth = selfCognitionGrowth(dialogues)!
    expect(growth.phase).toBe('exploration')
  })

  it('跨度较长且反思温和时为巩固阶段', () => {
    // 40 天跨度、无高反思占比，userCount=40 >= 8，daySpan=40 >= 30
    const dialogues = neutralDialogues(40, 40)
    const growth = selfCognitionGrowth(dialogues)!
    expect(growth.phase).toBe('consolidation')
    expect(growth.rationale).toContain('天跨度')
  })

  it('高反思占比时进入转型阶段', () => {
    const reflectTexts = Array.from({ length: 12 }, (_, i) =>
      entry(i, '今天我再次反思自己的模式，思考为何总是重复，希望有所突破和改变。', 14 - i),
    )
    const growth = selfCognitionGrowth(reflectTexts)!
    expect(growth.phase).toBe('transformation')
  })
})

// ============================================================
// 温和洞察
// ============================================================

describe('温和洞察 (selfCognitionInsights)', () => {
  it('空数据时给出等待引导', () => {
    const insights = selfCognitionInsights([])
    expect(insights.length).toBeGreaterThanOrEqual(1)
    expect(insights.some((it) => it.tone === 'gentle' || it.tone === 'neutral')).toBe(true)
  })

  it('有数据时生成正面洞察，最多 3 条', () => {
    const dialogues = Array.from({ length: 20 }, (_, i) =>
      entry(i, i % 2 === 0
        ? '最近我在反思自己的成长与变化，很感谢这段经历。'
        : '我完成了一个目标，虽然辛苦但很值得，明天继续努力。', 30 - i),
    )
    const insights = selfCognitionInsights(dialogues)
    expect(insights.length).toBeGreaterThan(0)
    expect(insights.length).toBeLessThanOrEqual(3)
    for (const it of insights) {
      expect(it.title.length).toBeGreaterThan(0)
      expect(['positive', 'gentle', 'neutral']).toContain(it.tone)
    }
  })
})