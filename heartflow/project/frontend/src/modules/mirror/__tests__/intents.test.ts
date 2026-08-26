// ============================================================
// 镜面对话系统 · 意图分类测试
// 覆盖：10 意图定义、关键词匹配、参数提取、查表函数
// ============================================================

import { describe, expect, it } from 'vitest'
import {
  INTENT_REGISTRY,
  INTENT_INFO,
  findIntentByKeyword,
  getAllIntentCategories,
} from '../intents'
import type { IntentCategory } from '../types'

describe('镜我意图分类 (intents)', () => {

  // ---- 注册表完整性 ----

  it('INTENT_REGISTRY 包含 10 个意图', () => {
    expect(INTENT_REGISTRY).toHaveLength(10)
  })

  it('每个意图都有 category / label / icon / description / keywords / patterns / paramExtractors', () => {
    for (const intent of INTENT_REGISTRY) {
      expect(intent.category).toBeTruthy()
      expect(intent.label).toBeTruthy()
      expect(intent.icon).toBeTruthy()
      expect(intent.description).toBeTruthy()
      expect(Array.isArray(intent.keywords)).toBe(true)
      expect(intent.keywords.length).toBeGreaterThan(0)
      expect(Array.isArray(intent.patterns)).toBe(true)
      expect(intent.patterns.length).toBeGreaterThan(0)
      expect(Array.isArray(intent.paramExtractors)).toBe(true)
    }
  })

  it('所有意图 category 不重复', () => {
    const categories = INTENT_REGISTRY.map(i => i.category)
    expect(new Set(categories).size).toBe(categories.length)
  })

  it('所有意图 category 都在 INTENT_INFO 中有对应条目', () => {
    const infoCategories = Object.keys(INTENT_INFO) as IntentCategory[]
    for (const intent of INTENT_REGISTRY) {
      expect(infoCategories).toContain(intent.category)
    }
  })

  // ---- INTENT_INFO 速查表 ----

  it('INTENT_INFO 包含 11 个条目（10 意图 + unknown）', () => {
    expect(Object.keys(INTENT_INFO)).toHaveLength(11)
  })

  it('INTENT_INFO.unknown 存在', () => {
    expect(INTENT_INFO.unknown.category).toBe('unknown')
    expect(INTENT_INFO.unknown.label).toBe('未知')
  })

  // ---- findIntentByKeyword ----

  it('findIntentByKeyword 通过关键词找到对应意图', () => {
    const result = findIntentByKeyword('专注')
    expect(result).toBeDefined()
    expect(result!.category).toBe('focus')
  })

  it('findIntentByKeyword 通过英文关键词匹配', () => {
    const result = findIntentByKeyword('focus')
    expect(result).toBeDefined()
    expect(result!.category).toBe('focus')
  })

  it('findIntentByKeyword 通过笔记关键词匹配', () => {
    const result = findIntentByKeyword('笔记')
    expect(result).toBeDefined()
    expect(result!.category).toBe('note')
  })

  it('findIntentByKeyword 通过情绪关键词匹配', () => {
    const result = findIntentByKeyword('开心')
    expect(result).toBeDefined()
    expect(result!.category).toBe('emotion')
  })

  it('findIntentByKeyword 不匹配时返回 undefined', () => {
    const result = findIntentByKeyword('完全不存在的词 xyz')
    expect(result).toBeUndefined()
  })

  it('findIntentByKeyword 大小写不敏感', () => {
    const result = findIntentByKeyword('FOCUS')
    expect(result).toBeDefined()
    expect(result!.category).toBe('focus')
  })

  it('findIntentByKeyword 部分匹配关键词', () => {
    // "难过" 是 emotion 的关键词
    const result = findIntentByKeyword('难过')
    expect(result).toBeDefined()
    expect(result!.category).toBe('emotion')
  })

  // ---- getAllIntentCategories ----

  it('getAllIntentCategories 返回 10 个分类', () => {
    const categories = getAllIntentCategories()
    expect(categories).toHaveLength(10)
  })

  it('getAllIntentCategories 包含所有预期分类', () => {
    const categories = getAllIntentCategories()
    const expected: IntentCategory[] = [
      'focus', 'note', 'emotion', 'anchor', 'plan',
      'reflect', 'learn', 'create', 'rest', 'explore',
    ]
    for (const cat of expected) {
      expect(categories).toContain(cat)
    }
  })

  // ---- 焦点意图参数提取器 ----

  it('focus 意图有 duration 和 taskName 参数提取器', () => {
    const focus = INTENT_REGISTRY.find(i => i.category === 'focus')!
    expect(focus.paramExtractors.map(e => e.name)).toContain('duration')
    expect(focus.paramExtractors.map(e => e.name)).toContain('taskName')
  })

  it('emotion 意图有 type 和 note 参数提取器', () => {
    const emotion = INTENT_REGISTRY.find(i => i.category === 'emotion')!
    expect(emotion.paramExtractors.map(e => e.name)).toContain('type')
    expect(emotion.paramExtractors.map(e => e.name)).toContain('note')
  })

  it('anchor 意图有 title 和 targetDate 参数提取器', () => {
    const anchor = INTENT_REGISTRY.find(i => i.category === 'anchor')!
    expect(anchor.paramExtractors.map(e => e.name)).toContain('title')
    expect(anchor.paramExtractors.map(e => e.name)).toContain('targetDate')
  })

  it('rest 意图有 duration 参数提取器', () => {
    const rest = INTENT_REGISTRY.find(i => i.category === 'rest')!
    expect(rest.paramExtractors.map(e => e.name)).toContain('duration')
  })

  it('explore 意图有 query 和 roomTarget 参数提取器', () => {
    const explore = INTENT_REGISTRY.find(i => i.category === 'explore')!
    expect(explore.paramExtractors.map(e => e.name)).toContain('query')
    expect(explore.paramExtractors.map(e => e.name)).toContain('roomTarget')
  })
})