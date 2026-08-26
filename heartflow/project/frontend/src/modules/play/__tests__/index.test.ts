// ============================================================
// 逸趣阁模块 · index.ts 测试
// 覆盖：usePlayGallery composable 全部功能
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'

// ============================================================
// Mock storage engine
// ============================================================
const storageData: Record<string, any> = {}
const mockStorage = {
  getKV: vi.fn((key: string, defaultValue: any) => {
    return storageData[key] !== undefined ? storageData[key] : defaultValue
  }),
  setKV: vi.fn((key: string, value: any) => {
    storageData[key] = value
  }),
}

vi.mock('../../../engine/storage', () => ({
  storage: mockStorage,
}))

// ============================================================
// 动态导入
// ============================================================
let usePlayGallery: any

beforeEach(async () => {
  vi.clearAllMocks()
  vi.resetModules()
  for (const k of Object.keys(storageData)) delete storageData[k]
  const mod = await import('../index')
  usePlayGallery = mod.usePlayGallery
})

// ============================================================
// 基础测试
// ============================================================
describe('usePlayGallery 基础', () => {
  it('初始化返回空数据', () => {
    const gallery = usePlayGallery()
    expect(gallery.games.value).toEqual([])
    expect(gallery.toys.value).toEqual([])
    expect(gallery.models.value).toEqual([])
    expect(gallery.others.value).toEqual([])
    expect(gallery.isEmpty.value).toBe(true)
    expect(gallery.totalItems.value).toBe(0)
    expect(gallery.tab.value).toBe('game')
  })

  it('tabs 包含 4 个标签', () => {
    const gallery = usePlayGallery()
    expect(gallery.tabs).toHaveLength(4)
    const keys = gallery.tabs.map((t: any) => t.key)
    expect(keys).toContain('game')
    expect(keys).toContain('toy')
    expect(keys).toContain('model')
    expect(keys).toContain('other')
  })
})

// ============================================================
// 游戏管理
// ============================================================
describe('游戏管理', () => {
  it('addGame 添加游戏', () => {
    const gallery = usePlayGallery()
    gallery.gameForm.name = '艾尔登法环'
    gallery.gameForm.platform = 'PS5'
    gallery.gameForm.hours = 120
    gallery.addGame()

    expect(gallery.games.value).toHaveLength(1)
    expect(gallery.games.value[0].name).toBe('艾尔登法环')
    expect(gallery.games.value[0].platform).toBe('PS5')
    expect(gallery.games.value[0].hours).toBe(120)
    expect(gallery.totalItems.value).toBe(1)
  })

  it('addGame 后清空表单', () => {
    const gallery = usePlayGallery()
    gallery.gameForm.name = 'test'
    gallery.gameForm.hours = 10
    gallery.addGame()

    expect(gallery.gameForm.name).toBe('')
    expect(gallery.gameForm.hours).toBe(0)
  })

  it('addGame 空名称不添加', () => {
    const gallery = usePlayGallery()
    gallery.gameForm.name = ''
    gallery.gameForm.hours = 10
    gallery.addGame()

    expect(gallery.games.value).toHaveLength(0)
  })

  it('addGame 小时数为 0 不添加', () => {
    const gallery = usePlayGallery()
    gallery.gameForm.name = 'test'
    gallery.gameForm.hours = 0
    gallery.addGame()

    expect(gallery.games.value).toHaveLength(0)
  })

  it('removeGame 删除游戏', () => {
    const gallery = usePlayGallery()
    gallery.gameForm.name = 'test'
    gallery.gameForm.hours = 10
    gallery.addGame()
    const id = gallery.games.value[0].id

    gallery.removeGame(id)
    expect(gallery.games.value).toHaveLength(0)
  })

  it('totalGameHours 计算总时长', () => {
    const gallery = usePlayGallery()
    gallery.gameForm.name = 'A'
    gallery.gameForm.hours = 50
    gallery.addGame()
    gallery.gameForm.name = 'B'
    gallery.gameForm.hours = 30
    gallery.addGame()

    expect(gallery.totalGameHours.value).toBe(80)
  })

  it('topGame 返回游玩时长最高的游戏', () => {
    const gallery = usePlayGallery()
    gallery.gameForm.name = 'A'
    gallery.gameForm.hours = 20
    gallery.addGame()
    gallery.gameForm.name = 'B'
    gallery.gameForm.hours = 100
    gallery.addGame()

    expect(gallery.topGame.value).toBe('B')
  })

  it('topGame 空游戏返回 "-"', () => {
    const gallery = usePlayGallery()
    expect(gallery.topGame.value).toBe('-')
  })

  it('topPlatform 返回时长最高的平台', () => {
    const gallery = usePlayGallery()
    gallery.gameForm.name = 'A'; gallery.gameForm.platform = 'PC'; gallery.gameForm.hours = 30
    gallery.addGame()
    gallery.gameForm.name = 'B'; gallery.gameForm.platform = 'PS5'; gallery.gameForm.hours = 50
    gallery.addGame()

    expect(gallery.topPlatform.value).toBe('PS5')
  })

  it('gameBarWidth 计算柱状图宽度', () => {
    const gallery = usePlayGallery()
    gallery.gameForm.name = 'A'; gallery.gameForm.hours = 25
    gallery.addGame()
    gallery.gameForm.name = 'B'; gallery.gameForm.hours = 100
    gallery.addGame()

    expect(gallery.gameBarWidth(100)).toBe(100)
    expect(gallery.gameBarWidth(25)).toBe(25)
  })
})

// ============================================================
// 游戏排序
// ============================================================
describe('游戏排序', () => {
  it('默认按时长降序排列', () => {
    const gallery = usePlayGallery()
    gallery.gameForm.name = '短游戏'; gallery.gameForm.hours = 5
    gallery.addGame()
    gallery.gameForm.name = '长游戏'; gallery.gameForm.hours = 50
    gallery.addGame()

    const sorted = gallery.sortedGames.value
    expect(sorted[0].hours).toBe(50)
    expect(sorted[1].hours).toBe(5)
  })

  it('setSort 切换排序字段', () => {
    const gallery = usePlayGallery()
    gallery.gameForm.name = 'B游戏'; gallery.gameForm.hours = 10
    gallery.addGame()
    gallery.gameForm.name = 'A游戏'; gallery.gameForm.hours = 20
    gallery.addGame()

    gallery.setSort('name')
    // 按名称升序（第一次点击 desc）
    const sorted = gallery.sortedGames.value
    expect(sorted[0].name).toBe('B游戏')
  })

  it('setSort 同字段切换排序方向', () => {
    const gallery = usePlayGallery()
    expect(gallery.sortOrder.value).toBe('desc')

    gallery.setSort('hours')
    expect(gallery.sortOrder.value).toBe('asc') // 同字段切换
  })
})

// ============================================================
// 搜索过滤
// ============================================================
describe('搜索过滤', () => {
  it('filteredGames 按名称搜索', () => {
    const gallery = usePlayGallery()
    gallery.gameForm.name = '艾尔登法环'; gallery.gameForm.hours = 120
    gallery.addGame()
    gallery.gameForm.name = '塞尔达'; gallery.gameForm.hours = 80
    gallery.addGame()

    gallery.searchQuery.value = '艾尔登'
    expect(gallery.filteredGames.value).toHaveLength(1)
    expect(gallery.filteredGames.value[0].name).toBe('艾尔登法环')
  })

  it('filteredGames 按平台搜索', () => {
    const gallery = usePlayGallery()
    gallery.gameForm.name = 'A'; gallery.gameForm.platform = 'PS5'; gallery.gameForm.hours = 10
    gallery.addGame()
    gallery.gameForm.name = 'B'; gallery.gameForm.platform = 'PC'; gallery.gameForm.hours = 10
    gallery.addGame()

    gallery.searchQuery.value = 'PS5'
    expect(gallery.filteredGames.value).toHaveLength(1)
    expect(gallery.filteredGames.value[0].name).toBe('A')
  })

  it('filteredGames 空搜索返回全部', () => {
    const gallery = usePlayGallery()
    gallery.gameForm.name = 'A'; gallery.gameForm.hours = 10
    gallery.addGame()
    gallery.gameForm.name = 'B'; gallery.gameForm.hours = 10
    gallery.addGame()

    gallery.searchQuery.value = '   '
    expect(gallery.filteredGames.value).toHaveLength(2)
  })
})

// ============================================================
// 月度统计
// ============================================================
describe('月度统计', () => {
  it('monthlyStats 按月汇总', () => {
    const gallery = usePlayGallery()
    gallery.gameForm.name = 'A'; gallery.gameForm.hours = 10
    gallery.games.value[0] = { ...gallery.games.value[0], at: '2025-01-15T00:00:00.000Z' }
    // 直接 push 数据
    gallery.games.value = [
      { id: '1', name: 'A', platform: 'PC', hours: 10, at: '2025-01-15T00:00:00.000Z' },
      { id: '2', name: 'B', platform: 'PC', hours: 20, at: '2025-01-20T00:00:00.000Z' },
      { id: '3', name: 'C', platform: 'PC', hours: 30, at: '2025-02-10T00:00:00.000Z' },
    ]

    const stats = gallery.monthlyStats.value
    expect(stats.length).toBeGreaterThanOrEqual(2)
    const jan = stats.find((s: any) => s.month === '2025-01')
    expect(jan.hours).toBe(30)
  })

  it('maxMonthlyHours 返回最大月度时长', () => {
    const gallery = usePlayGallery()
    gallery.games.value = [
      { id: '1', name: 'A', platform: 'PC', hours: 10, at: '2025-01-15T00:00:00.000Z' },
      { id: '2', name: 'B', platform: 'PC', hours: 100, at: '2025-02-10T00:00:00.000Z' },
    ]

    expect(gallery.maxMonthlyHours.value).toBe(100)
  })
})

// ============================================================
// 时长分布
// ============================================================
describe('时长分布', () => {
  it('distBuckets 正确分桶', () => {
    const gallery = usePlayGallery()
    gallery.games.value = [
      { id: '1', name: 'A', platform: 'PC', hours: 5, at: '2025-01-01' },
      { id: '2', name: 'B', platform: 'PC', hours: 30, at: '2025-01-01' },
      { id: '3', name: 'C', platform: 'PC', hours: 80, at: '2025-01-01' },
      { id: '4', name: 'D', platform: 'PC', hours: 120, at: '2025-01-01' },
    ]

    const buckets = gallery.distBuckets.value
    expect(buckets.lt10).toBe(1)    // 5h
    expect(buckets.mid).toBe(1)     // 30h
    expect(buckets.high).toBe(1)    // 80h
    expect(buckets.extreme).toBe(1) // 120h
  })
})

// ============================================================
// 平台分布
// ============================================================
describe('平台分布', () => {
  it('platformDistribution 按平台汇总', () => {
    const gallery = usePlayGallery()
    gallery.games.value = [
      { id: '1', name: 'A', platform: 'PC', hours: 10, at: '2025-01-01' },
      { id: '2', name: 'B', platform: 'PC', hours: 20, at: '2025-01-01' },
      { id: '3', name: 'C', platform: 'PS5', hours: 50, at: '2025-01-01' },
    ]

    const dist = gallery.platformDistribution.value
    expect(dist).toHaveLength(2)
    // 按时长降序排列
    expect(dist[0].platform).toBe('PS5')
    expect(dist[0].hours).toBe(50)
    expect(dist[0].count).toBe(1)
    expect(dist[1].platform).toBe('PC')
    expect(dist[1].hours).toBe(30)
    expect(dist[1].count).toBe(2)
  })
})

// ============================================================
// 玩具管理
// ============================================================
describe('玩具管理', () => {
  it('addToy 添加玩具', () => {
    const gallery = usePlayGallery()
    gallery.toyForm.name = '手办A'
    gallery.toyForm.note = '限量版'
    gallery.toyForm.value = 'mint'
    gallery.addToy()

    expect(gallery.toys.value).toHaveLength(1)
    expect(gallery.toys.value[0].name).toBe('手办A')
    expect(gallery.toys.value[0].value).toBe('mint')
  })

  it('addToy 空名称不添加', () => {
    const gallery = usePlayGallery()
    gallery.toyForm.name = '   '
    gallery.addToy()
    expect(gallery.toys.value).toHaveLength(0)
  })

  it('removeToy 删除玩具', () => {
    const gallery = usePlayGallery()
    gallery.toyForm.name = 'test'
    gallery.addToy()
    const id = gallery.toys.value[0].id
    gallery.removeToy(id)
    expect(gallery.toys.value).toHaveLength(0)
  })

  it('filteredToys 按价值筛选', () => {
    const gallery = usePlayGallery()
    gallery.toyForm.name = 'A'; gallery.toyForm.value = 'mint'
    gallery.addToy()
    gallery.toyForm.name = 'B'; gallery.toyForm.value = 'used'
    gallery.addToy()

    gallery.toyFilter.value = 'mint'
    expect(gallery.filteredToys.value).toHaveLength(1)
    expect(gallery.filteredToys.value[0].value).toBe('mint')
  })

  it('filteredToys all 显示全部', () => {
    const gallery = usePlayGallery()
    gallery.toyForm.name = 'A'; gallery.toyForm.value = 'mint'
    gallery.addToy()
    gallery.toyForm.name = 'B'; gallery.toyForm.value = 'used'
    gallery.addToy()

    gallery.toyFilter.value = 'all'
    expect(gallery.filteredToys.value).toHaveLength(2)
  })

  it('toyFilters 包含筛选选项', () => {
    const gallery = usePlayGallery()
    expect(gallery.toyFilters.length).toBeGreaterThanOrEqual(4)
  })
})

// ============================================================
// 模型管理
// ============================================================
describe('模型管理', () => {
  it('addModel 添加模型', () => {
    const gallery = usePlayGallery()
    gallery.modelForm.name = '高达RX-78'
    gallery.modelForm.series = '高达'
    gallery.modelForm.status = 'sealed'
    gallery.addModel()

    expect(gallery.models.value).toHaveLength(1)
    expect(gallery.models.value[0].name).toBe('高达RX-78')
    expect(gallery.models.value[0].series).toBe('高达')
  })

  it('addModel 空名称不添加', () => {
    const gallery = usePlayGallery()
    gallery.modelForm.name = ''
    gallery.addModel()
    expect(gallery.models.value).toHaveLength(0)
  })

  it('removeModel 删除模型', () => {
    const gallery = usePlayGallery()
    gallery.modelForm.name = 'test'
    gallery.addModel()
    const id = gallery.models.value[0].id
    gallery.removeModel(id)
    expect(gallery.models.value).toHaveLength(0)
  })

  it('modelGroups 按系列分组', () => {
    const gallery = usePlayGallery()
    gallery.modelForm.name = 'A'; gallery.modelForm.series = '高达'
    gallery.addModel()
    gallery.modelForm.name = 'B'; gallery.modelForm.series = '高达'
    gallery.addModel()
    gallery.modelForm.name = 'C'; gallery.modelForm.series = 'EVA'
    gallery.addModel()

    const groups = gallery.modelGroups.value
    expect(groups.length).toBeGreaterThanOrEqual(2)
    const gundam = groups.find((g: any) => g.series === '高达')
    expect(gundam.items).toHaveLength(2)
  })

  it('modelGroups 无系列分组为 ""', () => {
    const gallery = usePlayGallery()
    gallery.modelForm.name = 'A'; gallery.modelForm.series = ''
    gallery.addModel()

    const groups = gallery.modelGroups.value
    const unsorted = groups.find((g: any) => g.series === '')
    expect(unsorted).toBeDefined()
    expect(unsorted.items).toHaveLength(1)
  })
})

// ============================================================
// 其他收藏
// ============================================================
describe('其他收藏', () => {
  it('addOther 添加其他收藏', () => {
    const gallery = usePlayGallery()
    gallery.otherForm.name = '邮票'
    gallery.otherForm.cat = '集邮'
    gallery.addOther()

    expect(gallery.others.value).toHaveLength(1)
    expect(gallery.others.value[0].name).toBe('邮票')
  })

  it('addOther 空名称不添加', () => {
    const gallery = usePlayGallery()
    gallery.otherForm.name = ''
    gallery.addOther()
    expect(gallery.others.value).toHaveLength(0)
  })

  it('removeOther 删除其他收藏', () => {
    const gallery = usePlayGallery()
    gallery.otherForm.name = 'test'
    gallery.addOther()
    const id = gallery.others.value[0].id
    gallery.removeOther(id)
    expect(gallery.others.value).toHaveLength(0)
  })

  it('filteredOthers 按名称搜索', () => {
    const gallery = usePlayGallery()
    gallery.otherForm.name = '邮票'; gallery.otherForm.cat = '集邮'
    gallery.addOther()
    gallery.otherForm.name = '硬币'; gallery.otherForm.cat = '钱币'
    gallery.addOther()

    gallery.otherSearch.value = '邮票'
    expect(gallery.filteredOthers.value).toHaveLength(1)
  })
})

// ============================================================
// 整体统计
// ============================================================
describe('整体统计', () => {
  it('totalItems 计算总数', () => {
    const gallery = usePlayGallery()
    gallery.gameForm.name = 'A'; gallery.gameForm.hours = 10
    gallery.addGame()
    gallery.toyForm.name = 'B'
    gallery.addToy()

    expect(gallery.totalItems.value).toBe(2)
  })

  it('recentItems 返回最近 8 条', () => {
    const gallery = usePlayGallery()
    for (let i = 0; i < 10; i++) {
      gallery.gameForm.name = `游戏${i}`
      gallery.gameForm.hours = 10
      gallery.addGame()
    }

    expect(gallery.recentItems.value.length).toBeLessThanOrEqual(8)
  })

  it('recentItems 包含不同类别', () => {
    const gallery = usePlayGallery()
    gallery.gameForm.name = 'G'; gallery.gameForm.hours = 10
    gallery.addGame()
    gallery.toyForm.name = 'T'
    gallery.addToy()
    gallery.modelForm.name = 'M'
    gallery.addModel()
    gallery.otherForm.name = 'O'
    gallery.addOther()

    const items = gallery.recentItems.value
    const icons = items.map((i: any) => i.icon)
    expect(icons).toContain('🎮')
    expect(icons).toContain('🧸')
    expect(icons).toContain('🗿')
    expect(icons).toContain('📦')
  })

  it('isEmpty 无数据时为 true', () => {
    const gallery = usePlayGallery()
    expect(gallery.isEmpty.value).toBe(true)
  })

  it('isEmpty 有数据时为 false', () => {
    const gallery = usePlayGallery()
    gallery.gameForm.name = 'A'; gallery.gameForm.hours = 10
    gallery.addGame()
    expect(gallery.isEmpty.value).toBe(false)
  })
})

// ============================================================
// 数据持久化
// ============================================================
describe('数据持久化', () => {
  it('addGame 后持久化', () => {
    const gallery = usePlayGallery()
    gallery.gameForm.name = 'A'; gallery.gameForm.hours = 10
    gallery.addGame()

    expect(mockStorage.setKV).toHaveBeenCalled()
  })

  it('addToy 后持久化', () => {
    const gallery = usePlayGallery()
    gallery.toyForm.name = 'A'
    gallery.addToy()

    expect(mockStorage.setKV).toHaveBeenCalled()
  })

  it('addModel 后持久化', () => {
    const gallery = usePlayGallery()
    gallery.modelForm.name = 'A'
    gallery.addModel()

    expect(mockStorage.setKV).toHaveBeenCalled()
  })

  it('addOther 后持久化', () => {
    const gallery = usePlayGallery()
    gallery.otherForm.name = 'A'
    gallery.addOther()

    expect(mockStorage.setKV).toHaveBeenCalled()
  })
})