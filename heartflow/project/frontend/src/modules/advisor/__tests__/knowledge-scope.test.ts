// ============================================================
// 幕僚专属知识库范围测试（蓝图第四部分·三）
//
// 重点：验证「范围真的会影响取材」。这是 knowledgeScope 字段的消费点——
// 若过滤失效，该字段就退化成「存着不用」的一行配置（本项目最高频的坑）。
// ============================================================
import { describe, expect, it, vi } from 'vitest'
import {
  collectHallKnowledge,
  normalizeScope,
  itemKey,
  DEFAULT_KNOWLEDGE_SCOPE,
} from '../knowledge-scope'

// ---- 模拟殿堂数据（association.collectAllItems 从 storage 读 10 个域）----
// 用 vi.hoisted 保证在 vi.mock 工厂执行前就绪（vi.mock 会被提升）。
const db = vi.hoisted(() => ({
  sessions: [{ id: 's1', title: '晨间专注', completedAt: '2026-08-21T10:00:00Z' }] as any[],
  notes: [{ id: 'n1', title: '关于专注', updatedAt: '2026-08-20T10:00:00Z' }] as any[],
  emotions: [{ id: 'e1', note: '平静', createdAt: '2026-08-19T10:00:00Z' }] as any[],
  crystals: [] as any[],
  anchors: [] as any[],
  relations: [] as any[],
  goals: [] as any[],
  ledger: [] as any[],
  carriers: [] as any[],
  advisors: [] as any[],
}))

vi.mock('../../../engine/storage', () => ({
  storage: {
    getSessions: () => db.sessions,
    getCrystals: () => db.crystals,
    getNotes: () => db.notes,
    getAnchors: () => db.anchors,
    getRelations: () => db.relations,
    getGoals: () => db.goals,
    getEmotions: () => db.emotions,
    getLedger: () => db.ledger,
    getCarriers: () => db.carriers,
    getAdvisors: () => db.advisors,
  },
}))

describe('normalizeScope · 防脏数据与缺省', () => {
  it('缺省 / null / 非法 → 全殿堂', () => {
    expect(normalizeScope(null)).toEqual(DEFAULT_KNOWLEDGE_SCOPE)
    expect(normalizeScope(undefined)).toEqual(DEFAULT_KNOWLEDGE_SCOPE)
  })

  it('空集合一律回退全殿堂（不许看任何东西的幕僚没有意义）', () => {
    expect(normalizeScope({ mode: 'domains', domains: [] })).toEqual(DEFAULT_KNOWLEDGE_SCOPE)
    expect(normalizeScope({ mode: 'manual', itemIds: [] })).toEqual(DEFAULT_KNOWLEDGE_SCOPE)
  })

  it('有值时保留对应模式', () => {
    expect(normalizeScope({ mode: 'domains', domains: ['note'] }))
      .toEqual({ mode: 'domains', domains: ['note'] })
    expect(normalizeScope({ mode: 'manual', itemIds: ['note:n1'] }))
      .toEqual({ mode: 'manual', itemIds: ['note:n1'] })
  })
})

describe('collectHallKnowledge · 取材（消费点）', () => {
  it('全殿堂：三个域的痕迹都在', () => {
    const text = collectHallKnowledge({ mode: 'all' })
    expect(text).toContain('关于专注')
    expect(text).toContain('平静')
    expect(text).toContain('晨间专注')
  })

  it('仅限特定领域：只给该域的痕迹（证明范围真的在过滤）', () => {
    const text = collectHallKnowledge({ mode: 'domains', domains: ['note'] })
    expect(text).toContain('关于专注')
    expect(text).not.toContain('平静')
    expect(text).not.toContain('晨间专注')
  })

  it('手动指定：只给被点名的条目', () => {
    const text = collectHallKnowledge({ mode: 'manual', itemIds: ['emotion:e1'] })
    expect(text).toContain('平静')
    expect(text).not.toContain('关于专注')
  })

  it('范围内无痕迹 → 空串（调用方据此省掉整段，不留空标题）', () => {
    expect(collectHallKnowledge({ mode: 'domains', domains: ['goal'] })).toBe('')
  })

  it('limit 生效，且按时间由新到旧', () => {
    const text = collectHallKnowledge({ mode: 'all' }, 1)
    expect(text.split('\n')).toHaveLength(1)
    expect(text).toContain('晨间专注') // 08-21 最新
  })

  it('缺省范围（未配置）按全殿堂取材', () => {
    expect(collectHallKnowledge(null)).toContain('关于专注')
  })

  it('条目键带域前缀，避免跨域 id 撞车', () => {
    expect(itemKey({ domain: 'note', id: 'x' })).toBe('note:x')
  })
})
