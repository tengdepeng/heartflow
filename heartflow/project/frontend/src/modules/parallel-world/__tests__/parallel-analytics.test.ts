// ============================================================
// 平行世界 · 平行档案分析引擎 单元测试
// ============================================================

import { describe, it, expect } from 'vitest'
import type { Fork } from '../parallel-selves'
import type { AltSelf } from '../parallel-selves'
import type { Capsule } from '../time-capsule'
import type { WorldBranch } from '../types'
import {
  parallelOverview,
  altSelfSourceRows,
  capsuleStatusRows,
  parallelRhythm,
  branchDepthLabel,
  parallelWorldHealth,
  parallelInsights,
} from '../parallel-analytics'

const NOW = Date.UTC(2026, 7, 20, 12, 0, 0) // 2026-08-20
const DAY = 24 * 60 * 60 * 1000

function iso(daysAgo: number): string {
  return new Date(NOW - daysAgo * DAY).toISOString()
}

function makeFork(partial: Partial<Fork> = {}): Fork {
  return { id: 'f1', description: '', chosen: 'A', alternative: 'B', date: '', at: iso(5), ...partial }
}

function makeAlt(partial: Partial<AltSelf> = {}): AltSelf {
  return { id: 'a1', title: '远方的你', desc: '', icon: '🌍', color: '#6b9fc4', expanded: false, originForkId: null, ...partial }
}

function makeCapsule(partial: Partial<Capsule> = {}): Capsule {
  return { id: 'c1', message: 'hi', openDate: '2027-01-01', opened: false, at: iso(10), scope: 'free', ...partial }
}

function makeBranch(partial: Partial<WorldBranch> = {}): WorldBranch {
  return {
    id: 'b1', name: '枝', description: '', color: '#4A90D9', createdAt: iso(3),
    isActive: false, checkpointCount: 0, parentBranchId: undefined,
    ...partial,
  }
}

describe('parallelOverview', () => {
  it('统计分叉 / 自我 / 胶囊 / 分支与检查点', () => {
    const forks = [makeFork(), makeFork({ id: 'f2', at: iso(3) }), makeFork({ id: 'f3', at: iso(40) })]
    const alts = [makeAlt(), makeAlt({ id: 'a2', originForkId: 'f1' })]
    const caps = [makeCapsule(), makeCapsule({ id: 'c2', opened: true })]
    const branches = [makeBranch({ checkpointCount: 2 }), makeBranch({ id: 'b2', checkpointCount: 3 })]

    const ov = parallelOverview(forks, alts, caps, branches, new Date(NOW))
    expect(ov.forks).toBe(3)
    expect(ov.forks30).toBe(2)
    expect(ov.alts).toBe(2)
    expect(ov.altsFromFork).toBe(1)
    expect(ov.altsFree).toBe(1)
    expect(ov.capsules).toBe(2)
    expect(ov.openedCapsules).toBe(1)
    expect(ov.pendingCapsules).toBe(1)
    expect(ov.branches).toBe(2)
    expect(ov.checkpoints).toBe(5)
    expect(ov.latestForkDate).toBe(iso(3))
  })

  it('空数据返回零值', () => {
    const ov = parallelOverview([], [], [], [], new Date(NOW))
    expect(ov.forks).toBe(0)
    expect(ov.alts).toBe(0)
    expect(ov.capsules).toBe(0)
    expect(ov.branches).toBe(0)
    expect(ov.latestForkDate).toBeNull()
  })
})

describe('altSelfSourceRows', () => {
  it('按来源分档并给出占比', () => {
    const alts = [makeAlt(), makeAlt({ id: 'a2', originForkId: 'f1' }), makeAlt({ id: 'a3', originForkId: 'f2' })]
    const rows = altSelfSourceRows(alts)
    expect(rows.length).toBe(2)
    const forkRow = rows.find((r) => r.key === 'fork')!
    expect(forkRow.count).toBe(2)
    expect(forkRow.pct).toBe(67)
  })

  it('全分叉映照时只出分叉行', () => {
    const rows = altSelfSourceRows([makeAlt({ originForkId: 'f1' })])
    expect(rows.length).toBe(1)
    expect(rows[0].key).toBe('fork')
    expect(rows[0].pct).toBe(100)
  })
})

describe('capsuleStatusRows', () => {
  it('按 已开启/待开启/仍在等 分档', () => {
    const caps = [
      makeCapsule({ opened: true }),
      makeCapsule({ id: 'c2', openDate: '2026-08-10', opened: false }), // 已到期可开
      makeCapsule({ id: 'c3', openDate: '2027-01-01', opened: false }), // 未到期
    ]
    const rows = capsuleStatusRows(caps, new Date(NOW))
    expect(rows.length).toBe(3)
    expect(rows.find((r) => r.key === 'opened')!.count).toBe(1)
    expect(rows.find((r) => r.key === 'ready')!.count).toBe(1)
    expect(rows.find((r) => r.key === 'waiting')!.count).toBe(1)
  })
})

describe('parallelRhythm', () => {
  it('统计近 7/30 天分叉、最久未抉择与胶囊等待', () => {
    const forks = [
      makeFork({ id: 'f1', at: iso(2) }),
      makeFork({ id: 'f2', at: iso(10) }),
      makeFork({ id: 'f3', at: iso(50) }),
    ]
    const caps = [
      makeCapsule({ at: iso(30), openDate: '2027-12-31' }),
      makeCapsule({ id: 'c2', at: iso(60), openDate: '2027-06-01', opened: true }),
    ]
    const r = parallelRhythm(forks, caps, new Date(NOW))
    expect(r.forks7).toBe(1)
    expect(r.forks30).toBe(2)
    expect(r.calmDays).toBe(2)
    expect(r.capsules30).toBe(1)
    // 第1封等待约 498 天，第2封约 315 天 → 均值约 407
    expect(r.avgCapsuleWait).toBeGreaterThan(300)
  })

  it('无分叉时 calmDays 为 null', () => {
    const r = parallelRhythm([], [], new Date(NOW))
    expect(r.calmDays).toBeNull()
    expect(r.avgCapsuleWait).toBe(0)
  })
})

describe('branchDepthLabel', () => {
  it('按分支数量给出树 / 藤 / 一株 文案', () => {
    expect(branchDepthLabel([])).toContain('未萌芽')
    expect(branchDepthLabel([makeBranch()])).toContain('一支')
    expect(branchDepthLabel([makeBranch(), makeBranch({ id: 'b2' })])).toContain('藤')
    expect(branchDepthLabel([makeBranch(), makeBranch({ id: 'b2' }), makeBranch({ id: 'b3' }), makeBranch({ id: 'b4' }), makeBranch({ id: 'b5' })])).toContain('树')
  })
})

describe('parallelWorldHealth', () => {
  it('空世界返回初分', () => {
    const h = parallelWorldHealth([], [], [], [], new Date(NOW))
    expect(h.score).toBe(0)
    expect(h.label).toBe('世界初分')
  })

  it('丰富世界健康度更高', () => {
    const forks: Fork[] = []
    for (let i = 0; i < 6; i++) forks.push(makeFork({ id: `f${i}`, at: iso(i + 1) }))
    const alts = Array.from({ length: 4 }, (i) => makeAlt({ id: `a${i}`, originForkId: `f${i}` }))
    const caps = Array.from({ length: 5 }, (i) => makeCapsule({ id: `c${i}` }))
    const branches = Array.from({ length: 3 }, (i) => makeBranch({ id: `b${i}`, checkpointCount: 2 }))
    const h = parallelWorldHealth(forks, alts, caps, branches, new Date(NOW))
    expect(h.score).toBeGreaterThan(40)
    expect(h.breadth).toBeGreaterThan(0)
    expect(h.depth).toBeGreaterThan(0)
    expect(h.continuity).toBeGreaterThan(0)
  })
})

describe('parallelInsights', () => {
  it('空世界给出引导语', () => {
    const out = parallelInsights([], [], [], [], new Date(NOW), 2)
    expect(out[0]).toContain('平行世界还是空的')
  })

  it('给出有意义的温和洞察并限长', () => {
    const forks = [makeFork({ at: iso(2) })]
    const alts = [makeAlt()]
    const caps = [makeCapsule(), makeCapsule({ id: 'c2', opened: true })]
    const out = parallelInsights(forks, alts, caps, [], new Date(NOW), 3)
    expect(out.length).toBeLessThanOrEqual(3)
    expect(out.join('')).toContain('沉淀')
  })
})