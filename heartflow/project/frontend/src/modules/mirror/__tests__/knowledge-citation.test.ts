// ============================================================
// knowledge-citation 知识出处检索 单测
// 覆盖：空输入、停用词过滤、命中检索、时间倒序、limit 截断、无命中
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { NormalizedItem } from '../../association/types'

const { mockItems } = vi.hoisted(() => ({
  mockItems: [] as NormalizedItem[],
}))

vi.mock('../../association/engine', () => ({
  collectAllItems: () => mockItems,
}))

vi.mock('../../association/association-archive-analytics', () => ({
  archiveDomainLabel: (d: string) =>
    ({ note: '笔记', anchor: '心锚', session: '专注', goal: '目标' }[d] ?? d),
}))

import { collectKnowledgeCitations } from '../knowledge-citation'

function seed() {
  mockItems.length = 0
  mockItems.push(
    { domain: 'note', id: 'n1', label: '晨间跑步笔记', ts: 1000, tags: ['运动'] },
    { domain: 'anchor', id: 'a1', label: '今天专注学习', ts: 2000, tags: ['专注'] },
    { domain: 'note', id: 'n2', label: '读书心得', ts: 3000, tags: ['阅读'] },
  )
}

describe('collectKnowledgeCitations', () => {
  beforeEach(() => {
    seed()
  })

  it('空输入返回空数组', () => {
    expect(collectKnowledgeCitations('')).toEqual([])
    expect(collectKnowledgeCitations('   ')).toEqual([])
  })

  it('纯停用词不触发检索', () => {
    expect(collectKnowledgeCitations('帮我查看一下')).toEqual([])
  })

  it('按提问命中相关条目并标注域标签与日期', () => {
    const c = collectKnowledgeCitations('我的跑步记录怎么样')
    expect(c).toHaveLength(1)
    expect(c[0].id).toBe('n1')
    expect(c[0].label).toBe('晨间跑步笔记')
    expect(c[0].domainLabel).toBe('笔记')
    expect(c[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('按时间倒序返回，limit 截断', () => {
    const c = collectKnowledgeCitations('学习', 1)
    expect(c).toHaveLength(1)
    expect(c[0].id).toBe('a1')
    expect(c[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('无命中返回空数组', () => {
    expect(collectKnowledgeCitations('不存在的关键词xyz')).toEqual([])
  })
})
