// ============================================================
// P25-6 文明根系 · 民俗文化记录测试套件
// 覆盖：民俗条目CRUD / 实践记录 / 濒危标记 / 多维度查询 /
//       统计计算 / 文明镜像管理 / 持久化
// ============================================================

import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { FolkloreEntry, CraftCategory, RitualType } from '../types'
import { CRAFT_CATEGORY_LABELS, RITUAL_TYPE_LABELS } from '../types'

// ---- 存储 Mock ----
const { kvStore, clearKV } = vi.hoisted(() => {
  const kvStore = new Map<string, any>()
  return { kvStore, clearKV: () => kvStore.clear() }
})

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: vi.fn((key: string, defaultValue: any) => {
      return kvStore.has(key) ? kvStore.get(key) : defaultValue
    }),
    setKV: vi.fn((key: string, value: any) => {
      kvStore.set(key, value)
    }),
  },
}))

// ---- 测试辅助 ----

function makeEntry(overrides: Partial<FolkloreEntry> = {}): Omit<FolkloreEntry, 'id' | 'recordedAt' | 'practiceCount'> {
  return {
    name: '测试民俗',
    category: 'handicraft' as CraftCategory,
    region: '江南',
    description: '传统手工技艺',
    steps: ['准备材料', '初步加工', '精细打磨'],
    materials: ['木材', '漆料'],
    meanings: ['匠心传承', '文化记忆'],
    inheritor: '张师傅',
    tags: ['手工艺', '传统'],
    endangered: false,
    source: 'personal',
    mediaUrls: [],
    ...overrides,
  }
}

// ---- 主测试套件 ----

describe('P25-6 文明根系', () => {
  let useTraditions: any

  beforeEach(async () => {
    clearKV()
    vi.resetModules()
    const mod = await import('../index')
    useTraditions = mod.useTraditions
    await Promise.resolve()
  })

  // ============================================================
  // 常量验证
  // ============================================================
  describe('常量', () => {
    it('CRAFT_CATEGORY_LABELS 覆盖 14 种技艺类别', () => {
      const categories: CraftCategory[] = [
        'handicraft', 'culinary', 'textile', 'woodwork', 'metalwork',
        'ceramic', 'painting', 'music', 'dance', 'literature',
        'medicine', 'agriculture', 'architecture', 'other',
      ]
      for (const cat of categories) {
        expect(CRAFT_CATEGORY_LABELS[cat]).toBeDefined()
        expect(typeof CRAFT_CATEGORY_LABELS[cat]).toBe('string')
      }
    })

    it('RITUAL_TYPE_LABELS 覆盖 10 种仪式类型', () => {
      const types: RitualType[] = [
        'life', 'seasonal', 'agricultural', 'ancestral', 'healing',
        'celebration', 'mourning', 'transition', 'daily', 'custom',
      ]
      for (const t of types) {
        expect(RITUAL_TYPE_LABELS[t]).toBeDefined()
        expect(typeof RITUAL_TYPE_LABELS[t]).toBe('string')
      }
    })
  })

  // ============================================================
  // 初始状态
  // ============================================================
  describe('初始状态', () => {
    it('空条目列表', () => {
      const { entries } = useTraditions()
      expect(entries.value).toEqual([])
    })

    it('空镜像列表', () => {
      const { mirrors } = useTraditions()
      expect(mirrors.value).toEqual([])
    })

    it('folkloreStats 初始统计为零', () => {
      const { folkloreStats } = useTraditions()
      expect(folkloreStats.value.totalEntries).toBe(0)
      expect(folkloreStats.value.endangered).toBe(0)
      expect(folkloreStats.value.totalPracticeCount).toBe(0)
      expect(folkloreStats.value.recentlyRecorded).toBe(0)
      expect(folkloreStats.value.recentlyPracticed).toBe(0)
    })

    it('endangeredEntries 为空', () => {
      const { endangeredEntries } = useTraditions()
      expect(endangeredEntries.value).toEqual([])
    })

    it('publicMirrors 为空', () => {
      const { publicMirrors } = useTraditions()
      expect(publicMirrors.value).toEqual([])
    })
  })

  // ============================================================
  // 民俗条目 CRUD
  // ============================================================
  describe('民俗条目 CRUD', () => {
    it('createEntry 创建条目并自动生成 id', () => {
      const { createEntry, entries } = useTraditions()
      const entry = createEntry(makeEntry({ name: '苏绣' }))
      expect(entry.id).toMatch(/^folklore_/)
      expect(entry.name).toBe('苏绣')
      expect(entry.recordedAt).toBeDefined()
      expect(entry.practiceCount).toBe(0)
      expect(entries.value).toHaveLength(1)
    })

    it('createEntry 自动设置 recordedAt', () => {
      const { createEntry } = useTraditions()
      const before = new Date().toISOString()
      const entry = createEntry(makeEntry())
      const after = new Date().toISOString()
      expect(entry.recordedAt >= before).toBe(true)
      expect(entry.recordedAt <= after).toBe(true)
    })

    it('createEntry 持久化到 storage', () => {
      const { createEntry } = useTraditions()
      createEntry(makeEntry({ name: '持久化测试' }))
      const saved = kvStore.get('hf:folklore_entries')
      expect(saved).toHaveLength(1)
      expect(saved[0].name).toBe('持久化测试')
    })

    it('updateEntry 更新条目字段', () => {
      const { createEntry, updateEntry, entries } = useTraditions()
      const e = createEntry(makeEntry({ name: '原名' }))
      const result = updateEntry(e.id, { name: '新名', description: '新描述' })
      expect(result).toBe(true)
      expect(entries.value[0].name).toBe('新名')
      expect(entries.value[0].description).toBe('新描述')
    })

    it('updateEntry 不存在的 id 返回 false', () => {
      const { updateEntry } = useTraditions()
      expect(updateEntry('nonexistent', { name: 'x' })).toBe(false)
    })

    it('updateEntry 不会修改 id 和 recordedAt', () => {
      const { createEntry, updateEntry, entries } = useTraditions()
      const e = createEntry(makeEntry())
      const originalId = e.id
      const originalRecordedAt = e.recordedAt
      updateEntry(e.id, { name: '新名' } as any)
      expect(entries.value[0].id).toBe(originalId)
      expect(entries.value[0].recordedAt).toBe(originalRecordedAt)
    })

    it('removeEntry 删除条目', () => {
      const { createEntry, removeEntry, entries } = useTraditions()
      const e = createEntry(makeEntry())
      expect(entries.value).toHaveLength(1)
      const result = removeEntry(e.id)
      expect(result).toBe(true)
      expect(entries.value).toHaveLength(0)
    })

    it('removeEntry 不存在的 id 返回 false', () => {
      const { removeEntry } = useTraditions()
      expect(removeEntry('nonexistent')).toBe(false)
    })

    it('removeEntry 持久化删除', () => {
      const { createEntry, removeEntry } = useTraditions()
      const e = createEntry(makeEntry())
      removeEntry(e.id)
      const saved = kvStore.get('hf:folklore_entries')
      expect(saved).toHaveLength(0)
    })
  })

  // ============================================================
  // 实践记录
  // ============================================================
  describe('实践记录', () => {
    it('practiceEntry 增加实践次数', () => {
      const { createEntry, practiceEntry, entries } = useTraditions()
      const e = createEntry(makeEntry())
      expect(entries.value[0].practiceCount).toBe(0)

      practiceEntry(e.id)
      expect(entries.value[0].practiceCount).toBe(1)

      practiceEntry(e.id)
      expect(entries.value[0].practiceCount).toBe(2)
    })

    it('practiceEntry 更新 lastPracticedAt', () => {
      const { createEntry, practiceEntry, entries } = useTraditions()
      const e = createEntry(makeEntry())
      expect(entries.value[0].lastPracticedAt).toBeUndefined()

      practiceEntry(e.id)
      expect(entries.value[0].lastPracticedAt).toBeDefined()
    })

    it('practiceEntry 不存在的 id 返回 false', () => {
      const { practiceEntry } = useTraditions()
      expect(practiceEntry('nonexistent')).toBe(false)
    })
  })

  // ============================================================
  // 濒危标记
  // ============================================================
  describe('濒危标记', () => {
    it('markEndangered 标记为濒危', () => {
      const { createEntry, markEndangered, entries, endangeredEntries } = useTraditions()
      const e = createEntry(makeEntry())
      expect(entries.value[0].endangered).toBe(false)

      markEndangered(e.id, true)
      expect(entries.value[0].endangered).toBe(true)
      expect(endangeredEntries.value).toHaveLength(1)
    })

    it('markEndangered 取消濒危标记', () => {
      const { createEntry, markEndangered, entries, endangeredEntries } = useTraditions()
      const e = createEntry(makeEntry({ endangered: true }))
      expect(endangeredEntries.value).toHaveLength(1)

      markEndangered(e.id, false)
      expect(entries.value[0].endangered).toBe(false)
      expect(endangeredEntries.value).toHaveLength(0)
    })

    it('markEndangered 不存在的 id 返回 false', () => {
      const { markEndangered } = useTraditions()
      expect(markEndangered('nonexistent', true)).toBe(false)
    })
  })

  // ============================================================
  // 搜索
  // ============================================================
  describe('搜索', () => {
    it('searchEntries 按名称匹配', () => {
      const { createEntry, searchEntries } = useTraditions()
      createEntry(makeEntry({ name: '苏绣' }))
      createEntry(makeEntry({ name: '蜀锦' }))
      createEntry(makeEntry({ name: '陶瓷' }))

      const results = searchEntries('绣')
      expect(results).toHaveLength(1)
      expect(results[0].name).toBe('苏绣')
    })

    it('searchEntries 按描述匹配', () => {
      const { createEntry, searchEntries } = useTraditions()
      createEntry(makeEntry({ description: '水乡古镇的传统技艺', region: '苏州' }))
      createEntry(makeEntry({ description: '北方草原的游牧文化', region: '蒙古' }))

      const results = searchEntries('水乡')
      expect(results).toHaveLength(1)
      expect(results[0].description).toContain('水乡')
    })

    it('searchEntries 按标签匹配', () => {
      const { createEntry, searchEntries } = useTraditions()
      createEntry(makeEntry({ tags: ['非遗', '传统'] }))
      createEntry(makeEntry({ tags: ['现代', '创新'] }))

      const results = searchEntries('非遗')
      expect(results).toHaveLength(1)
    })

    it('searchEntries 按地区匹配', () => {
      const { createEntry, searchEntries } = useTraditions()
      createEntry(makeEntry({ region: '江南' }))
      createEntry(makeEntry({ region: '蜀地' }))

      const results = searchEntries('江南')
      expect(results).toHaveLength(1)
    })

    it('searchEntries 不区分大小写', () => {
      const { createEntry, searchEntries } = useTraditions()
      createEntry(makeEntry({ name: 'Silk Art' }))

      const results = searchEntries('silk')
      expect(results).toHaveLength(1)
    })

    it('searchEntries 无匹配返回空数组', () => {
      const { createEntry, searchEntries } = useTraditions()
      createEntry(makeEntry({ name: '苏绣' }))
      expect(searchEntries('zzz')).toEqual([])
    })
  })

  // ============================================================
  // 分组计算
  // ============================================================
  describe('分组计算', () => {
    it('byCategory 按类别分组', () => {
      const { createEntry, byCategory } = useTraditions()
      createEntry(makeEntry({ name: '木雕', category: 'woodwork' }))
      createEntry(makeEntry({ name: '金工', category: 'metalwork' }))
      createEntry(makeEntry({ name: '木工', category: 'woodwork' }))

      const map = byCategory.value
      expect(map.get('woodwork')).toHaveLength(2)
      expect(map.get('metalwork')).toHaveLength(1)
    })

    it('byRegion 按地区分组', () => {
      const { createEntry, byRegion } = useTraditions()
      createEntry(makeEntry({ name: '苏绣', region: '江南' }))
      createEntry(makeEntry({ name: '蜀锦', region: '蜀地' }))
      createEntry(makeEntry({ name: '云锦', region: '江南' }))

      const map = byRegion.value
      expect(map.get('江南')).toHaveLength(2)
      expect(map.get('蜀地')).toHaveLength(1)
    })

    it('bySource 按来源分组', () => {
      const { createEntry, bySource } = useTraditions()
      createEntry(makeEntry({ name: '家传', source: 'family' }))
      createEntry(makeEntry({ name: '个人', source: 'personal' }))
      createEntry(makeEntry({ name: '家族', source: 'family' }))

      const map = bySource.value
      expect(map.get('family')).toHaveLength(2)
      expect(map.get('personal')).toHaveLength(1)
    })
  })

  // ============================================================
  // 统计计算
  // ============================================================
  describe('统计计算', () => {
    it('folkloreStats.totalEntries 正确统计', () => {
      const { createEntry, folkloreStats } = useTraditions()
      createEntry(makeEntry())
      createEntry(makeEntry())
      expect(folkloreStats.value.totalEntries).toBe(2)
    })

    it('folkloreStats.endangered 正确统计', () => {
      const { createEntry, folkloreStats } = useTraditions()
      createEntry(makeEntry({ endangered: true }))
      createEntry(makeEntry({ endangered: true }))
      createEntry(makeEntry({ endangered: false }))
      expect(folkloreStats.value.endangered).toBe(2)
    })

    it('folkloreStats.totalPracticeCount 正确统计', () => {
      const { createEntry, practiceEntry, folkloreStats } = useTraditions()
      const e1 = createEntry(makeEntry())
      const e2 = createEntry(makeEntry())
      practiceEntry(e1.id)
      practiceEntry(e1.id)
      practiceEntry(e2.id)
      expect(folkloreStats.value.totalPracticeCount).toBe(3)
    })

    it('folkloreStats.byCategory 包含标签', () => {
      const { createEntry, folkloreStats } = useTraditions()
      createEntry(makeEntry({ category: 'handicraft' }))
      const cat = folkloreStats.value.byCategory.find((c: any) => c.category === CRAFT_CATEGORY_LABELS.handicraft)
      expect(cat).toBeDefined()
      expect(cat.label).toBe(CRAFT_CATEGORY_LABELS.handicraft)
      expect(cat.count).toBe(1)
    })

    it('folkloreStats.byRegion 正确统计', () => {
      const { createEntry, folkloreStats } = useTraditions()
      createEntry(makeEntry({ region: '江南' }))
      createEntry(makeEntry({ region: '江南' }))
      createEntry(makeEntry({ region: '蜀地' }))
      const regionStats = folkloreStats.value.byRegion
      expect(regionStats.find((r: any) => r.region === '江南').count).toBe(2)
      expect(regionStats.find((r: any) => r.region === '蜀地').count).toBe(1)
    })
  })

  // ============================================================
  // 文明镜像 CRUD
  // ============================================================
  describe('文明镜像', () => {
    it('createMirror 创建镜像', () => {
      const { createMirror, mirrors } = useTraditions()
      const mirror = createMirror('江南文明', '江南', '宋-清', '江南地区的文化记忆', ['历史', '文化'], true)
      expect(mirror.id).toMatch(/^mirror_/)
      expect(mirror.name).toBe('江南文明')
      expect(mirror.region).toBe('江南')
      expect(mirror.period).toBe('宋-清')
      expect(mirror.entryCount).toBe(0)
      expect(mirror.contributors).toBe(1)
      expect(mirror.public).toBe(true)
      expect(mirror.createdAt).toBeDefined()
      expect(mirror.updatedAt).toBeDefined()
      expect(mirrors.value).toHaveLength(1)
    })

    it('createMirror 默认 isPublic 为 true', () => {
      const { createMirror, publicMirrors } = useTraditions()
      createMirror('公开镜像', '区域', '时期', '描述')
      expect(publicMirrors.value).toHaveLength(1)
    })

    it('createMirror 持久化', () => {
      const { createMirror } = useTraditions()
      createMirror('镜像', '区域', '时期', '描述')
      const saved = kvStore.get('hf:civilization_mirrors')
      expect(saved).toHaveLength(1)
      expect(saved[0].name).toBe('镜像')
    })

    it('updateMirror 更新镜像', () => {
      const { createMirror, updateMirror, mirrors } = useTraditions()
      const m = createMirror('原名', '区域', '时期', '描述')
      const result = updateMirror(m.id, { name: '新名', entryCount: 5 })
      expect(result).toBe(true)
      expect(mirrors.value[0].name).toBe('新名')
      expect(mirrors.value[0].entryCount).toBe(5)
    })

    it('updateMirror 自动更新 updatedAt', async () => {
      const { createMirror, updateMirror, mirrors } = useTraditions()
      const m = createMirror('镜像', '区域', '时期', '描述')
      const originalUpdatedAt = m.updatedAt

      // 等待一小段时间确保时间戳不同
      await new Promise(r => setTimeout(r, 10))
      updateMirror(m.id, { name: '新名' })
      expect(mirrors.value[0].updatedAt).not.toBe(originalUpdatedAt)
    })

    it('updateMirror 不存在的 id 返回 false', () => {
      const { updateMirror } = useTraditions()
      expect(updateMirror('nonexistent', { name: 'x' })).toBe(false)
    })

    it('removeMirror 删除镜像', () => {
      const { createMirror, removeMirror, mirrors } = useTraditions()
      const m = createMirror('镜像', '区域', '时期', '描述')
      expect(mirrors.value).toHaveLength(1)
      const result = removeMirror(m.id)
      expect(result).toBe(true)
      expect(mirrors.value).toHaveLength(0)
    })

    it('removeMirror 不存在的 id 返回 false', () => {
      const { removeMirror } = useTraditions()
      expect(removeMirror('nonexistent')).toBe(false)
    })

    it('publicMirrors 只返回公开镜像', () => {
      const { createMirror, publicMirrors } = useTraditions()
      createMirror('公开', '区域', '时期', '描述', [], true)
      createMirror('私有', '区域', '时期', '描述', [], false)
      createMirror('公开2', '区域', '时期', '描述', [], true)

      expect(publicMirrors.value).toHaveLength(2)
      expect(publicMirrors.value.every((m: any) => m.public)).toBe(true)
    })
  })

  // ============================================================
  // 完整工作流
  // ============================================================
  describe('完整工作流', () => {
    it('创建→实践→濒危→统计 完整流程', () => {
      const { createEntry, practiceEntry, markEndangered, folkloreStats, entries } = useTraditions()

      // 创建两个条目
      const e1 = createEntry(makeEntry({ name: '苏绣', category: 'handicraft', region: '江南' }))
      const e2 = createEntry(makeEntry({ name: '蜀锦', category: 'textile', region: '蜀地', endangered: true }))

      expect(entries.value).toHaveLength(2)

      // 实践
      practiceEntry(e1.id)
      practiceEntry(e1.id)
      practiceEntry(e2.id)

      // 标记濒危
      markEndangered(e1.id, true)

      // 验证统计
      const stats = folkloreStats.value
      expect(stats.totalEntries).toBe(2)
      expect(stats.endangered).toBe(2)
      expect(stats.totalPracticeCount).toBe(3)
      expect(stats.byCategory).toHaveLength(2)
      expect(stats.byRegion).toHaveLength(2)
    })

    it('CRUD 后持久化数据一致', () => {
      const { createEntry, updateEntry, removeEntry, createMirror } = useTraditions()

      createEntry(makeEntry({ name: '保留' }))
      const e2 = createEntry(makeEntry({ name: '删除' }))
      createEntry(makeEntry({ name: '更新' }))
      updateEntry(createEntry(makeEntry({ name: '待更新' })).id, { name: '已更新' })
      removeEntry(e2.id)
      createMirror('镜像', '区域', '时期', '描述')

      const savedEntries = kvStore.get('hf:folklore_entries')
      const savedMirrors = kvStore.get('hf:civilization_mirrors')

      expect(savedEntries).toHaveLength(3) // 保留 + 更新(原) + 已更新
      expect(savedMirrors).toHaveLength(1)
    })
  })
})