// ============================================================
// 逐日心锚 · 手札系统 · 单元测试
// ============================================================
import { describe, expect, it, beforeEach } from 'vitest'
import { useAnchorJournal } from '../anchor-journal'
import type { AnchorJournal } from '../anchor-journal'
import type { Anchor } from '../types'

// ---- 测试辅助 ----

function makeAnchor(overrides: Partial<Anchor> = {}): Anchor {
  return {
    id: overrides.id || `anchor_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    text: overrides.text || '测试锚点',
    done: overrides.done ?? false,
    targetDate: overrides.targetDate || '2026-08-01',
    createdAt: overrides.createdAt || new Date().toISOString(),
    priority: overrides.priority || 'can',
    stage: overrides.stage || 'active',
    driftCount: overrides.driftCount ?? 0,
    tags: overrides.tags || [],
    category: overrides.category,
    notes: overrides.notes,
    dueTime: overrides.dueTime,
  }
}

// ============================================================
// useAnchorJournal
// ============================================================

describe('useAnchorJournal', () => {
  const journal = useAnchorJournal()

  beforeEach(() => {
    // 清空手札
    const all = journal.getAll()
    for (const j of all) {
      journal.remove(j.id)
    }
  })

  // ---- 创建手札 ----

  it('创建手札', () => {
    const result = journal.create({
      anchorId: 'anchor-1',
      title: '今日复盘',
      content: '今天完成了重要任务',
      type: 'review',
      mood: '平静',
    })

    expect(result.id).toBeTruthy()
    expect(result.anchorId).toBe('anchor-1')
    expect(result.title).toBe('今日复盘')
    expect(result.content).toBe('今天完成了重要任务')
    expect(result.type).toBe('review')
    expect(result.mood).toBe('平静')
    expect(result.linkedAnchorIds).toEqual([])
    expect(result.createdAt).toBeTruthy()
    expect(result.updatedAt).toBeTruthy()
  })

  it('创建手札默认类型为 diary', () => {
    const result = journal.create({
      anchorId: 'anchor-1',
      title: '日记',
      content: '内容',
    })
    expect(result.type).toBe('diary')
  })

  it('创建手札支持关联其他锚点', () => {
    const result = journal.create({
      anchorId: 'anchor-1',
      title: '关联笔记',
      content: '内容',
      linkedAnchorIds: ['anchor-2', 'anchor-3'],
    })
    expect(result.linkedAnchorIds).toEqual(['anchor-2', 'anchor-3'])
  })

  // ---- 获取手札 ----

  it('getByAnchor 返回指定锚点的所有手札', () => {
    journal.create({ anchorId: 'a1', title: '手札1', content: '内容1' })
    journal.create({ anchorId: 'a1', title: '手札2', content: '内容2' })
    journal.create({ anchorId: 'a2', title: '手札3', content: '内容3' })

    const a1Journals = journal.getByAnchor('a1')
    expect(a1Journals).toHaveLength(2)
    const a2Journals = journal.getByAnchor('a2')
    expect(a2Journals).toHaveLength(1)
  })

  it('getByAnchor 按时间倒序排列', () => {
    const j1 = journal.create({ anchorId: 'a1', title: '旧手札', content: '旧' })
    const j2 = journal.create({ anchorId: 'a1', title: '新手札', content: '新' })

    const results = journal.getByAnchor('a1')
    expect(results).toHaveLength(2)
    // 两条手札都存在，ID 不同
    const ids = results.map(r => r.id)
    expect(ids).toContain(j1.id)
    expect(ids).toContain(j2.id)
  })

  it('getAll 返回所有手札', () => {
    journal.create({ anchorId: 'a1', title: '1', content: '1' })
    journal.create({ anchorId: 'a2', title: '2', content: '2' })
    expect(journal.getAll()).toHaveLength(2)
  })

  it('getByType 按类型过滤', () => {
    journal.create({ anchorId: 'a1', title: '日记', content: '1', type: 'diary' })
    journal.create({ anchorId: 'a2', title: '复盘', content: '2', type: 'review' })
    journal.create({ anchorId: 'a3', title: '洞见', content: '3', type: 'insight' })

    expect(journal.getByType('diary')).toHaveLength(1)
    expect(journal.getByType('review')).toHaveLength(1)
    expect(journal.getByType('insight')).toHaveLength(1)
    expect(journal.getByType('gratitude')).toHaveLength(0)
  })

  // ---- 更新手札 ----

  it('更新手札内容', () => {
    const j = journal.create({ anchorId: 'a1', title: '原标题', content: '原内容' })
    const updated = journal.update(j.id, { title: '新标题', content: '新内容' })
    expect(updated).toBe(true)

    const retrieved = journal.getByAnchor('a1')[0]
    expect(retrieved.title).toBe('新标题')
    expect(retrieved.content).toBe('新内容')
  })

  it('更新不存在的 ID 返回 false', () => {
    const updated = journal.update('nonexistent', { title: 'x' })
    expect(updated).toBe(false)
  })

  // ---- 删除手札 ----

  it('删除手札', () => {
    const j = journal.create({ anchorId: 'a1', title: '待删除', content: '内容' })
    expect(journal.getAll()).toHaveLength(1)

    const removed = journal.remove(j.id)
    expect(removed).toBe(true)
    expect(journal.getAll()).toHaveLength(0)
  })

  it('删除不存在的 ID 返回 false', () => {
    const removed = journal.remove('nonexistent')
    expect(removed).toBe(false)
  })

  // ---- 光丝连接 ----

  it('addLink 添加光丝连接', () => {
    const j = journal.create({ anchorId: 'a1', title: '手札', content: '内容' })

    const added = journal.addLink(j.id, 'a2')
    expect(added).toBe(true)

    const retrieved = journal.getByAnchor('a1')[0]
    expect(retrieved.linkedAnchorIds).toContain('a2')
  })

  it('addLink 重复添加不报错', () => {
    const j = journal.create({ anchorId: 'a1', title: '手札', content: '内容' })
    journal.addLink(j.id, 'a2')
    const added = journal.addLink(j.id, 'a2')
    expect(added).toBe(true)
    const retrieved = journal.getByAnchor('a1')[0]
    expect(retrieved.linkedAnchorIds).toHaveLength(1)
  })

  it('removeLink 移除光丝连接', () => {
    const j = journal.create({ anchorId: 'a1', title: '手札', content: '内容', linkedAnchorIds: ['a2', 'a3'] })
    journal.removeLink(j.id, 'a2')
    const retrieved = journal.getByAnchor('a1')[0]
    expect(retrieved.linkedAnchorIds).toEqual(['a3'])
  })

  // ---- 光丝连接计算 ----

  it('computeLightThreads 计算共享标签的连接', () => {
    const anchors: Anchor[] = [
      makeAnchor({ id: 'a1', tags: ['工作', '重要'] }),
      makeAnchor({ id: 'a2', tags: ['工作', '紧急'] }),
    ]
    const threads = journal.computeLightThreads(anchors, [])
    expect(threads.length).toBeGreaterThan(0)
    expect(threads[0].sourceId).toBe('a1')
    expect(threads[0].targetId).toBe('a2')
    expect(threads[0].strength).toBeGreaterThan(0)
  })

  it('computeLightThreads 计算同分类连接', () => {
    const anchors: Anchor[] = [
      makeAnchor({ id: 'a1', category: '学习' }),
      makeAnchor({ id: 'a2', category: '学习' }),
    ]
    const threads = journal.computeLightThreads(anchors, [])
    expect(threads.length).toBeGreaterThan(0)
    expect(threads[0].strength).toBeGreaterThanOrEqual(0.3)
  })

  it('computeLightThreads 无共享特征时返回空', () => {
    const anchors: Anchor[] = [
      makeAnchor({ id: 'a1', tags: ['A'], category: 'X', targetDate: '2026-01-01' }),
      makeAnchor({ id: 'a2', tags: ['B'], category: 'Y', targetDate: '2026-02-01' }),
    ]
    const threads = journal.computeLightThreads(anchors, [])
    expect(threads).toHaveLength(0)
  })

  it('computeLightThreads 同日锚点产生连接', () => {
    const anchors: Anchor[] = [
      makeAnchor({ id: 'a1', targetDate: '2026-08-01' }),
      makeAnchor({ id: 'a2', targetDate: '2026-08-01' }),
    ]
    const threads = journal.computeLightThreads(anchors, [])
    expect(threads.length).toBeGreaterThan(0)
    expect(threads[0].reason).toContain('同日')
  })

  it('computeLightThreads 手札互引增强连接', () => {
    const anchors: Anchor[] = [
      makeAnchor({ id: 'a1' }),
      makeAnchor({ id: 'a2' }),
    ]
    const journals: AnchorJournal[] = [
      {
        id: 'j1', anchorId: 'a1', title: '手札', content: '引用了 a2',
        type: 'diary', linkedAnchorIds: ['a2'],
        createdAt: '', updatedAt: '',
      },
    ]
    const threads = journal.computeLightThreads(anchors, journals)
    expect(threads.length).toBeGreaterThan(0)
    expect(threads[0].strength).toBeGreaterThanOrEqual(0.4)
  })

  // ---- 年尺度聚合 ----

  it('getYearScaleSummary 返回 12 个月摘要', () => {
    const anchors: Anchor[] = [
      makeAnchor({ id: 'a1', targetDate: '2026-01-15', done: true, tags: ['工作'] }),
      makeAnchor({ id: 'a2', targetDate: '2026-06-20', done: false, tags: ['学习'] }),
    ]
    const summary = journal.getYearScaleSummary(2026, anchors, [])
    expect(summary.year).toBe(2026)
    expect(summary.months).toHaveLength(12)
    expect(summary.totalAnchors).toBe(2)
    expect(summary.completionRate).toBe(50)
  })

  it('getYearScaleSummary 统计月度数据', () => {
    const anchors: Anchor[] = [
      makeAnchor({ id: 'a1', targetDate: '2026-03-01', done: true }),
      makeAnchor({ id: 'a2', targetDate: '2026-03-15', done: true }),
      makeAnchor({ id: 'a3', targetDate: '2026-03-20', done: false }),
    ]
    const summary = journal.getYearScaleSummary(2026, anchors, [])
    const march = summary.months[2] // 3月
    expect(march.anchorCount).toBe(3)
    expect(march.doneCount).toBe(2)
  })

  it('getYearScaleSummary 统计高频标签', () => {
    const anchors: Anchor[] = [
      makeAnchor({ id: 'a1', targetDate: '2026-01-01', tags: ['工作', '重要'] }),
      makeAnchor({ id: 'a2', targetDate: '2026-02-01', tags: ['工作'] }),
      makeAnchor({ id: 'a3', targetDate: '2026-03-01', tags: ['学习'] }),
    ]
    const summary = journal.getYearScaleSummary(2026, anchors, [])
    expect(summary.topTags.length).toBeGreaterThan(0)
    const workTag = summary.topTags.find(t => t.tag === '工作')
    expect(workTag).toBeTruthy()
    expect(workTag!.count).toBe(2)
  })

  it('getYearScaleSummary 手札情绪影响月度情绪', () => {
    const anchors: Anchor[] = [
      makeAnchor({ id: 'a1', targetDate: '2026-05-01' }),
    ]
    const journals: AnchorJournal[] = [
      {
        id: 'j1', anchorId: 'a1', title: '手札', content: '内容',
        type: 'diary', mood: '开心', linkedAnchorIds: [],
        createdAt: '2026-05-01T12:00:00Z', updatedAt: '2026-05-01T12:00:00Z',
      },
    ]
    const summary = journal.getYearScaleSummary(2026, anchors, journals)
    const may = summary.months[4] // 5月
    expect(may.dominantMood).toBe('开心')
  })
})