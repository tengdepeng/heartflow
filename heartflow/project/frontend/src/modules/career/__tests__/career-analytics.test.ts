// ============================================================
// 业脉档案分析引擎测试
// ============================================================
import { describe, it, expect } from 'vitest'
import {
  careerOverview,
  careerTierRows,
  careerNodeRows,
  affinityBuckets,
  careerStatusRows,
  careerConnRows,
  careerHealth,
  careerInsights,
} from '../career-analytics'
import type { CareerContact, CareerProject, CareerConnection, NodeTypeId } from '../career'

function mkContact(over: Partial<CareerContact> & { id: string; name: string }): CareerContact {
  return {
    role: '',
    tier: 'extended',
    nodeType: 'colleague',
    affinity: 5,
    tags: [],
    ...over,
  }
}

function mkProject(over: Partial<CareerProject> & { id: string }): CareerProject {
  return {
    name: 'P',
    icon: '',
    description: '',
    color: '#fff',
    status: 'active',
    statusLabel: '进行中',
    partners: '',
    date: '2026-01',
    ...over,
  }
}

function mkConn(over: Partial<CareerConnection> & { id: string }): CareerConnection {
  return { fromId: 'a', toId: 'b', type: 'collaboration', ...over }
}

const nodeType = (n: NodeTypeId): CareerContact => mkContact({ id: n, name: n, nodeType: n, affinity: 6, tier: 'active' })

describe('careerOverview', () => {
  it('空数据返回全零概览', () => {
    const ov = careerOverview([], [], [])
    expect(ov.totalContacts).toBe(0)
    expect(ov.totalProjects).toBe(0)
    expect(ov.totalConnections).toBe(0)
    expect(ov.activeProjects).toBe(0)
    expect(ov.avgAffinity).toBe(0)
    expect(ov.closest).toBeNull()
  })

  it('统计核心圈/活跃项目/平均亲密度', () => {
    const contacts = [
      mkContact({ id: 'c1', name: 'A', tier: 'core', affinity: 9 }),
      mkContact({ id: 'c2', name: 'B', tier: 'active', affinity: 5 }),
      mkContact({ id: 'c3', name: 'C', tier: 'extended', affinity: 4 }),
    ]
    const projects = [
      mkProject({ id: 'p1', status: 'active' }),
      mkProject({ id: 'p2', status: 'completed' }),
    ]
    const ov = careerOverview(contacts, projects, [])
    expect(ov.totalContacts).toBe(3)
    expect(ov.coreContacts).toBe(1)
    expect(ov.activeProjects).toBe(1)
    expect(ov.completedProjects).toBe(1)
    expect(ov.avgAffinity).toBe(6)
    expect(ov.closest).toEqual({ name: 'A', role: '', affinity: 9 })
  })

  it('平均每人连接数', () => {
    const contacts = [mkContact({ id: 'c1', name: 'A' }), mkContact({ id: 'c2', name: 'B' })]
    const conns = [mkConn({ id: 'x1' }), mkConn({ id: 'x2' }), mkConn({ id: 'x3' })]
    expect(careerOverview(contacts, [], conns).avgConnectionsPerContact).toBe(1.5)
  })
})

describe('careerTierRows', () => {
  it('四圈层补齐并计算占比', () => {
    const contacts = [
      mkContact({ id: '1', name: 'A', tier: 'core' }),
      mkContact({ id: '2', name: 'B', tier: 'core' }),
      mkContact({ id: '3', name: 'C', tier: 'edge' }),
    ]
    const rows = careerTierRows(contacts)
    expect(rows).toHaveLength(4)
    expect(rows.find((r) => r.key === 'core')!.count).toBe(2)
    expect(rows.find((r) => r.key === 'core')!.pct).toBe(67)
    expect(rows.find((r) => r.key === 'edge')!.count).toBe(1)
    expect(rows.find((r) => r.key === 'active')!.count).toBe(0)
  })
})

describe('careerNodeRows', () => {
  it('按人数降序并过滤空类型', () => {
    const contacts = [
      nodeType('colleague'),
      nodeType('colleague'),
      nodeType('mentor'),
      nodeType('peer'),
    ]
    const rows = careerNodeRows(contacts)
    expect(rows[0].key).toBe('colleague')
    expect(rows.some((r) => r.key === 'client')).toBe(false)
    expect(rows.find((r) => r.key === 'mentor')!.label).toBe('导师')
  })

  it('尊重 top 上限', () => {
    const contacts = [nodeType('colleague'), nodeType('peer'), nodeType('friend')]
    expect(careerNodeRows(contacts, 2)).toHaveLength(2)
  })
})

describe('affinityBuckets', () => {
  it('按亲密度分档', () => {
    const contacts = [
      mkContact({ id: 'c1', name: 'A', affinity: 9 }),
      mkContact({ id: 'c2', name: 'B', affinity: 6 }),
      mkContact({ id: 'c3', name: 'C', affinity: 2 }),
    ]
    const b = affinityBuckets(contacts)
    expect(b.high.count).toBe(1)
    expect(b.mid.count).toBe(1)
    expect(b.low.count).toBe(1)
    expect(b.high.pct).toBe(33)
  })
})

describe('careerStatusRows', () => {
  it('项目状态分布', () => {
    const projects = [
      mkProject({ id: 'p1', status: 'active' }),
      mkProject({ id: 'p2', status: 'active' }),
      mkProject({ id: 'p3', status: 'paused' }),
    ]
    const rows = careerStatusRows(projects)
    expect(rows.find((r) => r.key === 'active')!.count).toBe(2)
    expect(rows.find((r) => r.key === 'active')!.label).toBe('进行中')
    expect(rows.find((r) => r.key === 'completed')!.count).toBe(0)
  })
})

describe('careerConnRows', () => {
  it('连接类型分布', () => {
    const conns = [
      mkConn({ id: 'x1', type: 'collaboration' }),
      mkConn({ id: 'x2', type: 'mentorship' }),
      mkConn({ id: 'x3', type: 'collaboration' }),
    ]
    const rows = careerConnRows(conns)
    expect(rows.find((r) => r.key === 'collaboration')!.count).toBe(2)
    expect(rows.find((r) => r.key === 'mentorship')!.count).toBe(1)
  })
})

describe('careerHealth', () => {
  it('空网络健康度最低（荒芜待耕）', () => {
    const h = careerHealth([], [], [])
    expect(h.score).toBe(0)
    expect(h.breadth).toBe(0)
    expect(h.vitality).toBe(0)
    expect(h.label).toBe('荒芜待耕')
  })

  it('圈层与角色越多样 广度越高', () => {
    const single = [mkContact({ id: 'a', name: 'A', tier: 'core', nodeType: 'colleague' })]
    const multi = [
      mkContact({ id: 'a', name: 'A', tier: 'core', nodeType: 'colleague' }),
      mkContact({ id: 'b', name: 'B', tier: 'active', nodeType: 'mentor' }),
      mkContact({ id: 'c', name: 'C', tier: 'edge', nodeType: 'client' }),
    ]
    expect(careerHealth(multi, [], []).breadth).toBeGreaterThan(careerHealth(single, [], []).breadth)
  })

  it('在途项目与连接密度提升活力得分', () => {
    const contacts = [mkContact({ id: 'a', name: 'A' })]
    const idle = careerHealth(contacts, [mkProject({ id: 'p1', status: 'planning' })], [])
    const busy = careerHealth(contacts, [mkProject({ id: 'p1', status: 'active' })], [mkConn({ id: 'x1' }), mkConn({ id: 'x2' })])
    expect(busy.vitality).toBeGreaterThan(idle.vitality)
  })

  it('高度紧密充实得高标（业脉丰沛）', () => {
    const contacts = [
      mkContact({ id: 'a', name: 'A', tier: 'core', nodeType: 'colleague', affinity: 9 }),
      mkContact({ id: 'b', name: 'B', tier: 'core', nodeType: 'mentor', affinity: 9 }),
      mkContact({ id: 'c', name: 'C', tier: 'active', nodeType: 'superior', affinity: 8 }),
      mkContact({ id: 'd', name: 'D', tier: 'active', nodeType: 'peer', affinity: 7 }),
      mkContact({ id: 'e', name: 'E', tier: 'extended', nodeType: 'client', affinity: 6 }),
    ]
    const projects = [mkProject({ id: 'p1', status: 'active' }), mkProject({ id: 'p2', status: 'active' })]
    const conns = [
      mkConn({ id: 'x1', fromId: 'a', toId: 'b', type: 'collaboration' }),
      mkConn({ id: 'x2', fromId: 'b', toId: 'c', type: 'mentorship' }),
      mkConn({ id: 'x3', fromId: 'a', toId: 'c', type: 'strong' }),
      mkConn({ id: 'x4', fromId: 'c', toId: 'd', type: 'collaboration' }),
      mkConn({ id: 'x5', fromId: 'd', toId: 'e', type: 'referral' }),
    ]
    const h = careerHealth(contacts, projects, conns)
    expect(h.label).toBe('业脉丰沛')
    expect(h.score).toBeGreaterThanOrEqual(70)
  })
})

describe('careerInsights', () => {
  it('空数据给出温和引导', () => {
    const insights = careerInsights([], [], [])
    expect(insights.length).toBeGreaterThan(0)
    expect(insights[0]).toContain('业脉')
  })

  it('无核心圈时提醒', () => {
    const contacts = [
      mkContact({ id: 'a', name: 'A', tier: 'active' }),
      mkContact({ id: 'b', name: 'B', tier: 'edge' }),
    ]
    const insights = careerInsights(contacts, [], [])
    expect(insights.some((s) => s.includes('核心圈'))).toBe(true)
  })

  it('有进行中项目时提示', () => {
    const contacts = [mkContact({ id: 'a', name: 'A', tier: 'core' })]
    const projects = [mkProject({ id: 'p1', status: 'active' }), mkProject({ id: 'p2', status: 'active' })]
    const insights = careerInsights(contacts, projects, [])
    expect(insights.some((s) => s.includes('进行中') || s.includes('项目'))).toBe(true)
  })

  it('尊重 limit', () => {
    const insights = careerInsights([], [], [], 1)
    expect(insights.length).toBeLessThanOrEqual(1)
  })
})