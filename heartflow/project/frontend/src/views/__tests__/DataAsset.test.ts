// ============================================================
// 数据资产视图测试
// 冒烟：标题/副题/概览统计/存储/增长/健康/完整性/导出/建议
// 空态与有数据渲染
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

// 模拟 useRoomNavigation 避免路由依赖
vi.mock('../../composables/useRoomNavigation', () => ({
  useRoomNavigation: () => ({ enterRoom: vi.fn() }),
}))

// 近 3 天的时间戳，保证落入增长趋势「近 7 天」窗口
function recentIso(daysAgo = 3) {
  return new Date(Date.now() - daysAgo * 86_400_000).toISOString()
}

async function mountView(data: Partial<{
  crystals: any[]
  sessions: any[]
  notes: any[]
  emotions: any[]
  anchors: any[]
  goals: any[]
  carriers: any[]
  advisors: any[]
  relations: any[]
}> = {}) {
  vi.resetModules()
  const storageMock = createMockStorage()
  const kvStore: Record<string, any> = {}
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore,
    crystals: data.crystals ?? [],
    sessions: data.sessions ?? [],
    notes: data.notes ?? [],
    emotions: data.emotions ?? [],
    anchors: data.anchors ?? [],
    goals: data.goals ?? [],
    carriers: data.carriers ?? [],
    advisors: data.advisors ?? [],
    relations: data.relations ?? [],
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../DataAsset.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('DataAsset 数据资产视图', () => {
  it('空态：标题/副题/概览/存储/增长/健康/完整性/导出/建议', async () => {
    const wrapper = await mountView()
    const text = wrapper.text()
    // 标题与副题
    expect(text).toContain('数据资产')
    expect(text).toContain('你的每一粒数据，都是资产')
    expect(text).toContain('你在这座殿堂里留下的每一粒数据，都是资产')
    // 面包屑回「家」
    expect(text).toContain('家')
    // 概览统计标签
    expect(text).toContain('数据条目')
    expect(text).toContain('结晶')
    expect(text).toContain('专注')
    expect(text).toContain('笔记')
    expect(text).toContain('情绪')
    expect(text).toContain('锚点')
    expect(text).toContain('目标')
    expect(text).toContain('载体')
    expect(text).toContain('幕僚')
    expect(text).toContain('关系')
    // 存储与增长
    expect(text).toContain('存储使用')
    expect(text).toContain('KV 条目')
    expect(text).toContain('增长趋势')
    expect(text).toContain('近 7 天')
    expect(text).toContain('近 90 天')
    // 健康度与完整性
    expect(text).toContain('数据域健康度')
    expect(text).toContain('数据完整性')
    expect(text).toContain('全部 9 个数据域完整健康')
    // 导出就绪空态
    expect(text).toContain('导出就绪')
    expect(text).toContain('尚无数据可导出')
    // 建议：空态触发起步建议
    expect(text).toContain('数据资产建议')
    expect(text).toContain('开始记录数据')
  })

  it('有数据：概览计数/增长趋势/导出就绪/完整性', async () => {
    const wrapper = await mountView({
      crystals: [{ id: 'c1', createdAt: recentIso() }],
      sessions: [{ id: 's1', startedAt: recentIso() }],
      notes: [{ id: 'n1', createdAt: recentIso() }],
      emotions: [{ id: 'e1', timestamp: recentIso() }],
      anchors: [{ id: 'a1', createdAt: recentIso() }],
      goals: [{ id: 'g1', createdAt: recentIso() }],
      carriers: [{ id: 'cr1', createdAt: recentIso() }],
      advisors: [{ id: 'ad1', createdAt: recentIso() }],
      relations: [{ id: 'r1', createdAt: recentIso() }],
    })
    const text = wrapper.text()
    // 每个域 1 条，共 9 条
    expect(text).toContain('9')
    // 近 7 天全部落入 → 增长中
    expect(text).toContain('近 7 天')
    expect(text).toContain('近 90 天')
    // 导出就绪：9/9 域有数据
    expect(text).toContain('9/9 个域有数据')
    expect(text).toContain('导出全部数据')
    // 完整性：所有域健康
    expect(text).toContain('全部 9 个数据域完整健康')
    // 建议：存在导出建议（无空态建议）
    expect(text).toContain('数据资产建议')
    expect(text).toContain('导出数据资产')
    expect(text).not.toContain('开始记录数据')
  })
})