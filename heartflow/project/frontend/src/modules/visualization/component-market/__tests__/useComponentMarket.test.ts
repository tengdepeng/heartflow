// ============================================================
// 组件市场组合式单测（INCR-435）
// 覆盖：注册表播种 / 分类标签 / 分类分流 / 启用语义 / 读写持久化
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockStorage } from '../../../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../../../engine/storage/core'

const MARKET_KEY = 'hf:viz_component_market'

/** 重置模块 + 假 storage，返回新加载的组合式模块 */
async function freshModule(kv: Record<string, any> = {}) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore: { ...kv },
    sessions: [],
    crystals: [],
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../useComponentMarket')
  const engine = await import('../index')
  return { ...mod, engine }
}

function storedMarket(): Record<string, any> {
  const raw = JSON.parse(localStorage.getItem('heartflow:storage') || '{}')
  return raw?.kvStore?.[MARKET_KEY] ?? {}
}

describe('useComponentMarket 组件市场组合式', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('首次使用会播种 13 个内置组件', async () => {
    const { engine, useComponentMarket } = await freshModule()
    expect(engine.getComponentCount()).toBe(0)
    const m = useComponentMarket()
    expect(m.totalCount.value).toBe(13)
  })

  it('分类标签包含引擎三类 + UI 合成的「全部」', async () => {
    const { engine, useComponentMarket } = await freshModule()
    engine.initBuiltinComponents()
    const m = useComponentMarket()
    expect(m.categories.value.map(c => c.key)).toEqual(['all', 'chart', 'diagram', 'widget'])
    expect(m.categories.value[1].icon).toBe('📊')
    expect(m.categories.value[3].label).toBe('小部件')
  })

  it('listByCategory 按注册顺序返回，all 返回全部', async () => {
    const { useComponentMarket } = await freshModule()
    const m = useComponentMarket()
    expect(m.listByCategory('all')).toHaveLength(13)
    expect(m.listByCategory('chart').map(c => c.id)).toEqual([
      'line-chart', 'bar-chart', 'ring-chart', 'scatter-plot', 'area-chart', 'waterfall', 'boxplot',
    ])
    expect(m.listByCategory('diagram').map(c => c.id)).toEqual(['heatmap', 'radar-chart', 'sankey'])
    expect(m.listByCategory('widget').map(c => c.id)).toEqual(['timeline', 'gauge', 'stats-card'])
  })

  it('已启用口径与内置种子一致（3 个）', async () => {
    const { useComponentMarket } = await freshModule()
    const m = useComponentMarket()
    expect(m.installedCount.value).toBe(3)
    expect(m.installed.value.map(c => c.id)).toEqual(['line-chart', 'bar-chart', 'stats-card'])
  })

  it('toggle 切换启用态并自增 revision（computed 随之更新）', async () => {
    const { useComponentMarket } = await freshModule()
    const m = useComponentMarket()
    expect(m.toggle('ring-chart')).toBe(true)
    expect(m.installedCount.value).toBe(4)
    expect(m.toggle('ring-chart')).toBe(false)
    expect(m.installedCount.value).toBe(3)
    // 不存在的组件返回 undefined
    expect(m.toggle('nope')).toBeUndefined()
  })

  it('install 带幂等保护（已启用时无操作），uninstall 为语义化停用入口', async () => {
    const { useComponentMarket } = await freshModule()
    const m = useComponentMarket()
    expect(m.install('ring-chart')).toBe(true)
    expect(m.install('ring-chart')).toBe(false) // 引擎 install 已做幂等保护
    expect(m.uninstall('ring-chart')).toBe(true)
  })

  it('toggle 后状态落盘，新实例回填', async () => {
    const { useComponentMarket } = await freshModule()
    const m = useComponentMarket()
    m.toggle('ring-chart')
    m.toggle('line-chart') // 停用内置启用的组件
    expect(storedMarket()['ring-chart'].enabled).toBe(true)
    expect(storedMarket()['line-chart'].enabled).toBe(false)

    const saved = storedMarket()
    const { useComponentMarket: useReloaded } = await freshModule({ [MARKET_KEY]: saved })
    const m2 = useReloaded()
    expect(m2.installedCount.value).toBe(3) // 内置 3：停 line(-1) 启 ring(+1) → 仍为 3
    expect(m2.find('ring-chart')?.enabled).toBe(true)
    expect(m2.find('line-chart')?.enabled).toBe(false)
  })

  it('update 修改视觉配置并落盘（不含 enabled 通道）', async () => {
    const { useComponentMarket } = await freshModule()
    const m = useComponentMarket()
    expect(m.find('line-chart')?.size).toBe('medium')
    const updated = m.update('line-chart', { size: 'large', showLegend: false, animated: false })
    expect(updated?.size).toBe('large')
    expect(m.find('line-chart')?.showLegend).toBe(false)
    expect(storedMarket()['line-chart'].size).toBe('large')
    expect(storedMarket()['line-chart'].enabled).toBe(true) // enabled 未被 update 通道改写
  })

  it('已裁剪 flag：注册表被清空后能自愈重新播种', async () => {
    const { engine, useComponentMarket } = await freshModule()
    const m1 = useComponentMarket()
    expect(m1.totalCount.value).toBe(13)
    engine.clearRegistry()
    expect(engine.getComponentCount()).toBe(0)
    const m2 = useComponentMarket()
    expect(m2.totalCount.value).toBe(13)
  })

  it('search 支持名称/描述/id 模糊匹配', async () => {
    const { useComponentMarket } = await freshModule()
    const m = useComponentMarket()
    expect(m.search('桑基').map(c => c.id)).toEqual(['sankey'])
    expect(m.search('gauge').map(c => c.id)).toEqual(['gauge'])
    expect(m.search('不存在的组件')).toHaveLength(0)
  })

  it('MARKET_STORAGE_KEY 使用 hf: 命名空间', async () => {
    const { MARKET_STORAGE_KEY } = await freshModule()
    expect(MARKET_STORAGE_KEY).toBe(MARKET_KEY)
  })
})
