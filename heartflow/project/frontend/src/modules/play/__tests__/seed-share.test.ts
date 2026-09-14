// ============================================================
// 逸趣阁 · 时间种子分享与遗传（seed-share）单测
// 覆盖：导出/导入/字符串编解码 / 签名校验 / 遗传谱系 BFS / 图谱构建与摘要 / 集合合并
// 严守宪法第43条：种子分享仅限本地文件（assertShareLocalOnly('local')）。
// ============================================================

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/engine/storage', () => ({
  storage: {
    getKV: () => undefined,
    setKV: () => undefined,
  },
}))

import {
  exportSeed,
  importSeed,
  stringifySeed,
  parseSeed,
  createInheritance,
  buildLineage,
  buildSeedGraph,
  computeGraphSummary,
  mergeSeedCollections,
  filterByRarity,
  searchSeeds,
} from '../seed-share'
import type { TimeSeed } from '../time-seed'

function makeSeed(id: string, name: string, opts: { tags?: string[]; rarity?: TimeSeed['rarity']; timestamp?: string } = {}): TimeSeed {
  return {
    id,
    name,
    source: 'game',
    sourceId: `src-${id}`,
    timestamp: opts.timestamp ?? '2026-06-01T00:00:00.000Z',
    emotion: 0.7,
    tags: opts.tags ?? ['睡前'],
    inherited: false,
    description: `${name} 的记忆`,
    rarity: opts.rarity ?? 'rare',
    createdAt: '2026-06-01T00:00:00.000Z',
  }
}

describe('seed-share · 导出 / 导入 / 编解码', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('导出为版本化载荷并带签名', () => {
    const payload = exportSeed(makeSeed('a', '夏夜萤火'))
    expect(payload.version).toBe('1.0')
    expect(payload.seed.name).toBe('夏夜萤火')
    expect(payload.seed.originId).toBe('a')
    expect(payload.signature).toBeTruthy()
    expect(typeof payload.exportedAt).toBe('string')
  })

  it('导入有效载荷还原种子并打「导入」标签', () => {
    const orig = makeSeed('a', '夏夜萤火')
    const payload = exportSeed(orig)
    const seed = importSeed(payload)
    expect(seed).not.toBeNull()
    expect(seed!.name).toBe('夏夜萤火')
    expect(seed!.sourceId).toBe('a')
    expect(seed!.tags).toContain('导入')
    expect(seed!.inherited).toBe(false)
  })

  it('非法载荷（签名不符 / 版本不符）返回 null', () => {
    const payload = exportSeed(makeSeed('a', 'x'))
    const forged = { ...payload, signature: 'deadbeef' }
    expect(importSeed(forged)).toBeNull()
    const wrongVer = { ...payload, version: '2.0' as any }
    expect(importSeed(wrongVer)).toBeNull()
  })

  it('stringify / parse 往返一致', () => {
    const seed = makeSeed('b', '千年琥珀', { tags: ['收藏', '传承'] })
    const json = stringifySeed(seed)
    expect(typeof json).toBe('string')
    const back = parseSeed(json)
    expect(back).not.toBeNull()
    expect(back!.name).toBe('千年琥珀')
    expect(back!.tags).toContain('导入')
  })

  it('parseSeed 处理损坏 JSON 返回 null 而非抛错', () => {
    expect(parseSeed('{{{ not json')).toBeNull()
  })
})

describe('seed-share · 遗传谱系（BFS）', () => {
  it('无记录时谱系仅含根、深度 0', () => {
    const root = makeSeed('root', '始祖')
    const lineage = buildLineage(root, [root], [])
    expect(lineage.descendants).toHaveLength(0)
    expect(lineage.depth).toBe(0)
    expect(lineage.records).toHaveLength(0)
  })

  it('BFS 遍历遗传树；深度 = 最深后代代际', () => {
    const root = makeSeed('r', '根')
    const c1 = makeSeed('c1', '子')
    const c2 = makeSeed('c2', '孙')
    const r1 = createInheritance(root, c1, 'direct', '亲子')
    const r2 = createInheritance(c1, c2, 'mutation', '变异')
    // 手动设置代际
    ;(r1 as any).generation = 1
    ;(r2 as any).generation = 2
    const lineage = buildLineage(root, [root, c1, c2], [r1, r2])
    expect(lineage.descendants).toHaveLength(2)
    expect(lineage.records).toHaveLength(2)
    expect(lineage.depth).toBe(2)
  })
})

describe('seed-share · 种子图谱与摘要', () => {
  it('共享标签的种子连线，degree 增加', () => {
    const graph = buildSeedGraph([
      makeSeed('a', '星', { tags: ['夜'] }),
      makeSeed('b', '月', { tags: ['夜'] }),
      makeSeed('c', '日', { tags: ['昼'] }),
    ])
    // a-b 共享「夜」连线；c 无
    expect(graph.edges).toHaveLength(1)
    const a = graph.nodes.find((n) => n.id === 'a')!
    const c = graph.nodes.find((n) => n.id === 'c')!
    expect(a.degree).toBe(1)
    expect(c.degree).toBe(0)
  })

  it('computeGraphSummary 汇总分布与最连接种子', () => {
    const graph = buildSeedGraph([
      makeSeed('a', '星', { tags: ['夜'], rarity: 'legendary' }),
      makeSeed('b', '月', { tags: ['夜'], rarity: 'epic' }),
      makeSeed('c', '独', { tags: ['独'], rarity: 'common' }),
    ])
    const summary = computeGraphSummary(graph)
    expect(summary.nodeCount).toBe(3)
    expect(summary.edgeCount).toBe(1)
    expect(summary.rootCount).toBe(1) // legendary = isRoot
    expect(summary.maxDegree).toBe(1)
    expect(summary.rarityDistribution.find((r) => r.rarity === 'epic')!.count).toBe(1)
    expect(summary.mostConnected[0].name).toBe('星')
  })
})

describe('seed-share · 集合操作', () => {
  it('mergeSeedCollections 合并集合并计数新增/重复', () => {
    const local = [makeSeed('a', 'A')]
    const imported = [makeSeed('a', 'A副本'), makeSeed('b', 'B新')]
    const { merged, newCount, duplicateCount } = mergeSeedCollections(local, imported)
    expect(merged).toHaveLength(2)
    expect(newCount).toBe(1)
    expect(duplicateCount).toBe(1)
  })

  it('filterByRarity 保留高于等于门槛的稀有度', () => {
    const seeds = [
      makeSeed('a', '普通', { rarity: 'common' }),
      makeSeed('b', '史诗', { rarity: 'epic' }),
      makeSeed('c', '传说', { rarity: 'legendary' }),
    ]
    const res = filterByRarity(seeds, 'epic')
    expect(res.map((s) => s.rarity)).toEqual(['epic', 'legendary'])
  })

  it('searchSeeds 按名称/描述/标签匹配；空查询返回全部', () => {
    const seeds = [makeSeed('a', '星光手帐', { tags: ['书写'] }), makeSeed('b', '航海罗盘', { tags: ['探索'] })]
    expect(searchSeeds(seeds, '')).toHaveLength(2)
    expect(searchSeeds(seeds, '手帐')).toHaveLength(1)
    expect(searchSeeds(seeds, '探索')).toHaveLength(1)
    expect(searchSeeds(seeds, '不存在')).toHaveLength(0)
  })
})