import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'
import type { TimeCapsule } from '../../modules/capsule'

function capsule(overrides: Record<string, any> = {}): TimeCapsule {
  return {
    id: `cap_${Math.random().toString(36).slice(2, 8)}`,
    title: '胶囊',
    note: '',
    items: [],
    createdAt: '2026-08-01T08:00:00.000Z',
    at: '2026-08-01T08:00:00.000Z',
    openDate: '2026-09-01',
    openedAt: null,
    opened: false,
    ...overrides,
  }
}

async function mountPanel(capsules: TimeCapsule[] = []) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({ version: 10, kvStore: {}, sessions: [], crystals: [] }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../CapsuleArchivePanel.vue')
  const wrapper = mount(mod.default, { props: { capsules } })
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('capsule-archive-analytics · 时光胶囊档案引擎', () => {
  const NOW = new Date('2026-08-27T12:00:00')

  it('概览正确统计封存中/已开启/内容数量', async () => {
    const { capsuleArchiveOverview } = await import('../../modules/capsule/capsule-archive-analytics')
    const ov = capsuleArchiveOverview([
      capsule({ openDate: '2026-09-01' }),
      capsule({ openDate: '2026-08-01', openedAt: '2026-08-10T08:00:00', items: [{ type: 'note', id: 'n1', title: 'a' }, { type: 'crystal', id: 'c1', title: 'b' }] }),
    ], NOW)
    expect(ov.totalCount).toBe(2)
    expect(ov.sealedCount).toBe(1)
    expect(ov.openedCount).toBe(1)
    expect(ov.itemCount).toBe(2)
    expect(ov.noteCount).toBe(1)
    expect(ov.crystalCount).toBe(1)
    expect(ov.openableToday).toBe(0)
    expect(ov.nextOpenDays).toBe(5)
  })

  it('已到开启日的胶囊计入 openableToday 且 nextOpenDays 跳过', async () => {
    const { capsuleArchiveOverview } = await import('../../modules/capsule/capsule-archive-analytics')
    const ov = capsuleArchiveOverview([
      capsule({ openDate: '2026-08-01' }),
      capsule({ openDate: '2026-09-10' }),
    ], NOW)
    expect(ov.openableToday).toBe(1)
    expect(ov.nextOpenDays).toBe(14)
  })

  it('平均/最长封存时长仅统计已开启', async () => {
    const { capsuleArchiveOverview } = await import('../../modules/capsule/capsule-archive-analytics')
    const ov = capsuleArchiveOverview([
      capsule({ createdAt: '2026-08-01T00:00:00', openDate: '2026-08-10', openedAt: '2026-08-10T00:00:00' }),
      capsule({ createdAt: '2026-08-01T00:00:00', openDate: '2026-09-10', openedAt: null }),
    ], NOW)
    expect(ov.avgSealDays).toBe(9)
    expect(ov.longestSealDays).toBe(9)
  })

  it('封存内容类型分布与占比正确', async () => {
    const { capsuleItemTypeRows } = await import('../../modules/capsule/capsule-archive-analytics')
    const rows = capsuleItemTypeRows([
      capsule({ items: [{ type: 'note', id: 'n1', title: 'a' }, { type: 'note', id: 'n2', title: 'b' }] }),
      capsule({ items: [{ type: 'crystal', id: 'c1', title: 'c' }] }),
    ])
    const note = rows.find(r => r.type === 'note')
    const crystal = rows.find(r => r.type === 'crystal')
    expect(note?.count).toBe(2)
    expect(note?.percentage).toBe(67)
    expect(crystal?.count).toBe(1)
    expect(crystal?.percentage).toBe(33)
  })

  it('等待分布按开启日远近分桶', async () => {
    const { capsuleWaitRows } = await import('../../modules/capsule/capsule-archive-analytics')
    const rows = capsuleWaitRows([
      capsule({ openDate: '2026-08-29' }),
      capsule({ openDate: '2026-09-20' }),
      capsule({ openDate: '2027-05-01' }),
    ], NOW)
    expect(rows.find(r => r.bucket === '近 7 天')?.count).toBe(1)
    expect(rows.find(r => r.bucket === '一月内')?.count).toBe(1)
    expect(rows.find(r => r.bucket === '更远未来')?.count).toBe(1)
  })

  it('健康分在 0-100 之间且空集为 0', async () => {
    const { capsuleArchiveHealth } = await import('../../modules/capsule/capsule-archive-analytics')
    const empty = capsuleArchiveHealth([], NOW)
    expect(empty.score).toBe(0)
    expect(empty.seal).toBe(0)
    const active = capsuleArchiveHealth([
      capsule({ openDate: '2026-08-01' }),
      capsule({ openDate: '2026-08-29' }),
    ], NOW)
    expect(active.score).toBeGreaterThan(0)
    expect(active.score).toBeLessThanOrEqual(100)
  })

  it('空集给出守候式洞察', async () => {
    const { capsuleInsights } = await import('../../modules/capsule/capsule-archive-analytics')
    const ins = capsuleInsights([], NOW)
    expect(ins.length).toBe(1)
    expect(ins[0].text).toContain('还空着')
  })
})

describe('CapsuleArchivePanel 胶囊档案面板', () => {
  it('空状态呈现守候文案', async () => {
    const wrapper = await mountPanel([])
    expect(wrapper.text()).toContain('胶囊档案')
    expect(wrapper.text()).toContain('一封封封存与开启，拢成一册安放')
  })

  it('展示概览指标与类型分布', async () => {
    const wrapper = await mountPanel([
      capsule({ openDate: '2026-09-01', items: [{ type: 'note', id: 'n1', title: 'a' }, { type: 'note', id: 'n2', title: 'b' }] }),
      capsule({ openDate: '2026-08-01', openedAt: '2026-08-10T08:00:00', items: [{ type: 'crystal', id: 'c1', title: 'c' }] }),
    ])
    expect(wrapper.text()).toContain('封存中')
    expect(wrapper.text()).toContain('已开启')
    expect(wrapper.text()).toContain('封存内容')
    expect(wrapper.text()).toContain('笔记')
    expect(wrapper.text()).toContain('结晶')
  })

  it('已到开启日的胶囊会提示今日可开启', async () => {
    const wrapper = await mountPanel([
      capsule({ openDate: '2026-08-01' }),
    ])
    expect(wrapper.text()).toContain('1 封今日可开启')
    expect(wrapper.text()).toContain('已到开启日，正静候你拆开')
  })
})