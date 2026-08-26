// ============================================================
// P23 数据资产视图桥接层测试
// 覆盖：dataOverview / dataDomainHealth / storageUsage /
//       dataIntegrity / exportReadiness / dataGrowth /
//       recommendations / 操作入口
// ============================================================

import { describe, expect, it, beforeEach, vi } from 'vitest'

// ============================================================
// 测试数据工厂
// ============================================================

function makeEmptyRecords() {
  return [] as any[]
}

function makeTestRecords() {
  const now = new Date().toISOString()
  return {
    crystals: [
      { id: 'cry_1', createdAt: now, color: '#4a90d9', size: 'medium', quality: 85 },
      { id: 'cry_2', createdAt: now, color: '#e8c060', size: 'small', quality: 72 },
      { id: 'cry_3', createdAt: now, color: '#7ed957', size: 'large', quality: 93 },
      { id: 'cry_4', createdAt: now, color: '#c48a6a', size: 'medium', quality: 78 },
      { id: 'cry_5', createdAt: now, color: '#a08ac4', size: 'small', quality: 67 },
    ],
    sessions: [
      { id: 'sess_1', startedAt: now, duration: 1500, type: 'focus' },
      { id: 'sess_2', startedAt: now, duration: 900, type: 'rest' },
      { id: 'sess_3', startedAt: now, duration: 2400, type: 'focus' },
    ],
    notes: [
      { id: 'note_1', createdAt: now, title: '项目笔记', tags: ['work', 'plan'] },
      { id: 'note_2', createdAt: now, title: '读书笔记', tags: ['reading', 'learning'] },
      { id: 'note_3', createdAt: now, title: '灵感记录', tags: ['creative'] },
      { id: 'note_4', createdAt: now, title: '会议纪要', tags: ['work', 'meeting'] },
    ],
    emotions: [
      { id: 'emo_1', timestamp: now, type: 'joy', intensity: 7 },
      { id: 'emo_2', timestamp: now, type: 'calm', intensity: 5 },
      { id: 'emo_3', timestamp: now, type: 'focus', intensity: 8 },
      { id: 'emo_4', timestamp: now, type: 'anxiety', intensity: 3 },
      { id: 'emo_5', timestamp: now, type: 'gratitude', intensity: 9 },
      { id: 'emo_6', timestamp: now, type: 'joy', intensity: 6 },
    ],
    anchors: [
      { id: 'anc_1', createdAt: now, title: '每日冥想', frequency: 'daily', streak: 30 },
      { id: 'anc_2', createdAt: now, title: '晨间阅读', frequency: 'daily', streak: 15 },
      { id: 'anc_3', createdAt: now, title: '周回顾', frequency: 'weekly', streak: 12 },
    ],
    goals: [
      { id: 'goal_1', createdAt: now, title: '完成项目里程碑', status: 'in_progress', progress: 65 },
      { id: 'goal_2', createdAt: now, title: '学习新技术', status: 'active', progress: 40 },
      { id: 'goal_3', createdAt: now, title: '健康饮食计划', status: 'completed', progress: 100 },
      { id: 'goal_4', createdAt: now, title: '阅读 12 本书', status: 'in_progress', progress: 33 },
      { id: 'goal_5', createdAt: now, title: '每日运动', status: 'active', progress: 70 },
    ],
    carriers: [
      { id: 'car_1', createdAt: now, name: '工作空间', type: 'workspace', isActive: true },
      { id: 'car_2', createdAt: now, name: '个人空间', type: 'personal', isActive: true },
    ],
    advisors: [
      { id: 'adv_1', createdAt: now, name: '系统顾问', role: 'system', isActive: true },
      { id: 'adv_2', createdAt: now, name: 'AI 助手', role: 'ai', isActive: true },
      { id: 'adv_3', createdAt: now, name: '时间管理顾问', role: 'productivity', isActive: false },
    ],
    relations: [
      { id: 'rel_1', createdAt: now, from: 'sess_1', to: 'cry_1', type: 'generated' },
      { id: 'rel_2', createdAt: now, from: 'note_1', to: 'goal_1', type: 'linked' },
      { id: 'rel_3', createdAt: now, from: 'emo_1', to: 'sess_1', type: 'associated' },
      { id: 'rel_4', createdAt: now, from: 'anc_1', to: 'goal_5', type: 'supports' },
      { id: 'rel_5', createdAt: now, from: 'cry_3', to: 'sess_3', type: 'generated' },
      { id: 'rel_6', createdAt: now, from: 'note_3', to: 'goal_2', type: 'linked' },
    ],
  }
}

/** 创建带大量数据的测试记录 */
function makeLargeRecords() {
  const base = makeTestRecords()
  const now = new Date().toISOString()
  for (let i = 0; i < 1000; i++) {
    base.sessions.push({
      id: `sess_large_${i}`,
      startedAt: now,
      duration: 1800,
      type: 'focus',
    })
  }
  return base
}

// ============================================================
// 共享可变状态（让 mock 返回的数据可被测试控制）
// ============================================================

const { getRecords, setRecords, getKvStore, resetKvStore } = vi.hoisted(() => {
  let _records: any = makeEmptyRecords()
  let _kvStore: Record<string, any> = {}

  return {
    getRecords: () => _records,
    setRecords: (r: any) => { _records = r },
    getKvStore: () => _kvStore,
    resetKvStore: () => { _kvStore = {} },
  }
})

// ============================================================
// Mock 存储引擎
// ============================================================

vi.mock('../../../engine/storage', () => ({
  storage: {
      getCrystals: () => {
        const r = getRecords()
        return Array.isArray(r) ? [] : (r.crystals ?? [])
      },
      getSessions: () => {
        const r = getRecords()
        return Array.isArray(r) ? [] : (r.sessions ?? [])
      },
      getNotes: () => {
        const r = getRecords()
        return Array.isArray(r) ? [] : (r.notes ?? [])
      },
      getEmotions: () => {
        const r = getRecords()
        return Array.isArray(r) ? [] : (r.emotions ?? [])
      },
      getAnchors: () => {
        const r = getRecords()
        return Array.isArray(r) ? [] : (r.anchors ?? [])
      },
      getGoals: () => {
        const r = getRecords()
        return Array.isArray(r) ? [] : (r.goals ?? [])
      },
      getCarriers: () => {
        const r = getRecords()
        return Array.isArray(r) ? [] : (r.carriers ?? [])
      },
      getAdvisors: () => {
        const r = getRecords()
        return Array.isArray(r) ? [] : (r.advisors ?? [])
      },
      getRelations: () => {
        const r = getRecords()
        return Array.isArray(r) ? [] : (r.relations ?? [])
      },
      getKV: (key: string, def: any) => {
        const store = getKvStore()
        return store[key] !== undefined ? store[key] : def
      },
      setKV: (key: string, val: any) => {
        const store = getKvStore()
        store[key] = val
      },
      getPluginRegistry: () => null,
      setPluginRegistry: () => {},
    },
}))

vi.mock('../../../engine/storage/core', () => {
  const SCHEMA_VERSION = 9

  function loadSchema() {
    const r = getRecords()
    if (Array.isArray(r)) return { version: SCHEMA_VERSION, kvStore: {} }

    return {
      version: SCHEMA_VERSION,
      crystals: r.crystals ?? [],
      sessions: r.sessions ?? [],
      notes: r.notes ?? [],
      emotions: r.emotions ?? [],
      anchors: r.anchors ?? [],
      goals: r.goals ?? [],
      carriers: r.carriers ?? [],
      advisors: r.advisors ?? [],
      relations: r.relations ?? [],
      kvStore: getKvStore(),
      tagCategories: [],
      scenePresets: [],
      ledger: [],
      advisorMessages: [],
      config: {},
    }
  }

  return {
    loadSchema,
    SCHEMA_VERSION,
    storageVersion: { value: 1 },
    invalidateCache: vi.fn(),
    getStorageBackend: vi.fn(() => 'local'),
    initStorage: vi.fn(),
    clearAll: vi.fn(),
    DEFAULT_CONFIG: {},
  }
})

vi.mock('../../../engine/storage/kv', () => ({
  getKV: (key: string, def: any) => {
    const store = getKvStore()
    return store[key] !== undefined ? store[key] : def
  },
  setKV: (key: string, val: any) => {
    const store = getKvStore()
    store[key] = val
  },
}))

// ============================================================
// 动态导入 data-asset-bridge
// ============================================================

async function importBridge() {
  const mod = await import('../data-asset-bridge')
  return mod.useDataAssetBridge()
}

// ============================================================
// P23 数据资产视图桥接层
// ============================================================

describe('P23 数据资产视图桥接层', () => {
  let bridge: any

  // ---- 空状态 ----
  describe('空状态', () => {
    beforeEach(async () => {
      vi.clearAllMocks()
      resetKvStore()
      setRecords(makeEmptyRecords())
      bridge = await importBridge()
    })

    describe('初始化', () => {
      it('dataOverview 包含 totalItems 且为 0', () => {
        expect(bridge.dataOverview.value.totalItems).toBe(0)
      })

      it('dataOverview 包含 schemaVersion', () => {
        expect(bridge.dataOverview.value.schemaVersion).toBe(9)
      })

      it('dataOverview 包含 dataSize', () => {
        expect(bridge.dataOverview.value.dataSize).toBeDefined()
        expect(typeof bridge.dataOverview.value.dataSize).toBe('number')
      })

      it('dataDomainHealth 为数组', () => {
        expect(Array.isArray(bridge.dataDomainHealth.value)).toBe(true)
      })

      it('storageUsage 有 estimatedSize', () => {
        expect(bridge.storageUsage.value.estimatedSize).toBeDefined()
        expect(typeof bridge.storageUsage.value.estimatedSize).toBe('number')
      })

      it('storageUsage 有 formatSize', () => {
        expect(bridge.storageUsage.value.formatSize).toBeDefined()
        expect(typeof bridge.storageUsage.value.formatSize).toBe('string')
      })

      it('dataIntegrity 存在', () => {
        expect(bridge.dataIntegrity.value).toBeDefined()
        expect(bridge.dataIntegrity.value.domains).toBeDefined()
        expect(Array.isArray(bridge.dataIntegrity.value.domains)).toBe(true)
      })

      it('exportReadiness 有 hasData', () => {
        expect(bridge.exportReadiness.value.hasData).toBeDefined()
        expect(bridge.exportReadiness.value.hasData).toBe(false)
      })

      it('dataGrowth 存在', () => {
        expect(bridge.dataGrowth.value).toBeDefined()
        expect(bridge.dataGrowth.value.trend).toBeDefined()
      })

      it('recommendations 为数组', () => {
        expect(Array.isArray(bridge.recommendations.value)).toBe(true)
      })
    })

    describe('数据域健康', () => {
      it('dataDomainHealth 每个域有 name', () => {
        bridge.dataDomainHealth.value.forEach((d: any) => {
          expect(d.name).toBeDefined()
          expect(typeof d.name).toBe('string')
        })
      })

      it('dataDomainHealth 每个域有 key', () => {
        bridge.dataDomainHealth.value.forEach((d: any) => {
          expect(d.key).toBeDefined()
          expect(typeof d.key).toBe('string')
        })
      })

      it('dataDomainHealth 每个域有 count', () => {
        bridge.dataDomainHealth.value.forEach((d: any) => {
          expect(d.count).toBeDefined()
          expect(typeof d.count).toBe('number')
        })
      })

      it('dataDomainHealth 每个域有 isEmpty', () => {
        bridge.dataDomainHealth.value.forEach((d: any) => {
          expect(d.isEmpty).toBeDefined()
          expect(typeof d.isEmpty).toBe('boolean')
        })
      })

      it('dataDomainHealth 每个域有 integrity', () => {
        bridge.dataDomainHealth.value.forEach((d: any) => {
          expect(d.integrity).toBeDefined()
          expect(['healthy', 'warning', 'empty']).toContain(d.integrity)
        })
      })
    })

    describe('所有标准域都存在', () => {
      const expectedKeys = ['crystals', 'sessions', 'notes', 'emotions', 'anchors', 'goals', 'carriers', 'advisors', 'relations']

      for (const key of expectedKeys) {
        it(`包含 ${key} 域`, () => {
          const domain = bridge.dataDomainHealth.value.find((d: any) => d.key === key)
          expect(domain).toBeDefined()
        })
      }
    })

    describe('空数据建议', () => {
      it('空数据建议开始记录', () => {
        const recs = bridge.recommendations.value
        const hasGetStarted = recs.some((r: any) => r.type === 'enrich' && r.id === 'rec_getstarted')
        expect(hasGetStarted).toBe(true)
      })
    })
  })

  // ---- 正常数据状态 ----
  describe('正常数据状态', () => {
    beforeEach(async () => {
      vi.clearAllMocks()
      resetKvStore()
      setRecords(makeTestRecords())
      bridge = await importBridge()
    })

    // ============================================================
    // 数据概览
    // ============================================================
    describe('数据概览', () => {
      it('dataOverview 反映各域条目数', () => {
        expect(bridge.dataOverview.value.totalItems).toBeGreaterThan(0)
      })

      it('dataOverview 有 crystalCount', () => {
        expect(bridge.dataOverview.value.crystalCount).toBe(5)
      })

      it('dataOverview 有 sessionCount', () => {
        expect(bridge.dataOverview.value.sessionCount).toBe(3)
      })

      it('dataOverview 有 noteCount', () => {
        expect(bridge.dataOverview.value.noteCount).toBe(4)
      })

      it('dataOverview 有 emotionCount', () => {
        expect(bridge.dataOverview.value.emotionCount).toBe(6)
      })

      it('dataOverview 有 anchorCount', () => {
        expect(bridge.dataOverview.value.anchorCount).toBe(3)
      })

      it('dataOverview 有 goalCount', () => {
        expect(bridge.dataOverview.value.goalCount).toBe(5)
      })

      it('dataOverview 有 carrierCount', () => {
        expect(bridge.dataOverview.value.carrierCount).toBe(2)
      })

      it('dataOverview 有 advisorCount', () => {
        expect(bridge.dataOverview.value.advisorCount).toBe(3)
      })

      it('dataOverview 有 relationCount', () => {
        expect(bridge.dataOverview.value.relationCount).toBe(6)
      })

      it('dataOverview 有 dataSize', () => {
        expect(bridge.dataOverview.value.dataSize).toBeGreaterThan(0)
      })
    })

    // ============================================================
    // 数据域健康
    // ============================================================
    describe('数据域健康', () => {
      it('有数据的域 isEmpty 为 false', () => {
        const sessionDomain = bridge.dataDomainHealth.value.find((d: any) => d.key === 'sessions')
        expect(sessionDomain.isEmpty).toBe(false)
        expect(sessionDomain.count).toBe(3)
        expect(sessionDomain.integrity).toBe('healthy')
      })

      it('反映 crystals 条目数', () => {
        const domain = bridge.dataDomainHealth.value.find((d: any) => d.key === 'crystals')
        expect(domain.count).toBe(5)
      })

      it('反映 notes 条目数', () => {
        const domain = bridge.dataDomainHealth.value.find((d: any) => d.key === 'notes')
        expect(domain.count).toBe(4)
      })

      it('反映 emotions 条目数', () => {
        const domain = bridge.dataDomainHealth.value.find((d: any) => d.key === 'emotions')
        expect(domain.count).toBe(6)
      })

      it('反映 goals 条目数', () => {
        const domain = bridge.dataDomainHealth.value.find((d: any) => d.key === 'goals')
        expect(domain.count).toBe(5)
      })

      it('反映 relations 条目数', () => {
        const domain = bridge.dataDomainHealth.value.find((d: any) => d.key === 'relations')
        expect(domain.count).toBe(6)
      })
    })

    // ============================================================
    // 存储使用
    // ============================================================
    describe('存储使用', () => {
      it('storageUsage 有 estimatedSize 大于 0', () => {
        expect(bridge.storageUsage.value.estimatedSize).toBeGreaterThan(0)
      })

      it('storageUsage 有 formatSize', () => {
        expect(typeof bridge.storageUsage.value.formatSize).toBe('string')
      })

      it('storageUsage 有 kvEntries', () => {
        expect(typeof bridge.storageUsage.value.kvEntries).toBe('number')
      })
    })

    // ============================================================
    // 数据完整性
    // ============================================================
    describe('数据完整性', () => {
      it('dataIntegrity 有 domains 数组', () => {
        expect(Array.isArray(bridge.dataIntegrity.value.domains)).toBe(true)
      })

      it('dataIntegrity 有 overallHealthy', () => {
        expect(typeof bridge.dataIntegrity.value.overallHealthy).toBe('boolean')
      })

      it('dataIntegrity 有 totalIssues', () => {
        expect(typeof bridge.dataIntegrity.value.totalIssues).toBe('number')
      })
    })

    // ============================================================
    // 导出就绪
    // ============================================================
    describe('导出就绪', () => {
      it('exportReadiness 有数据时 hasData 为 true', () => {
        expect(bridge.exportReadiness.value.hasData).toBe(true)
      })

      it('exportReadiness 有 domainsWithData', () => {
        expect(Array.isArray(bridge.exportReadiness.value.domainsWithData)).toBe(true)
      })

      it('exportReadiness 有 data 的域数量 > 0', () => {
        expect(bridge.exportReadiness.value.domainsWithData.length).toBeGreaterThan(0)
      })
    })

    // ============================================================
    // 数据增长
    // ============================================================
    describe('数据增长', () => {
      it('dataGrowth 有 trend', () => {
        expect(bridge.dataGrowth.value.trend).toBeDefined()
        expect(['growing', 'stable', 'declining', 'dormant']).toContain(bridge.dataGrowth.value.trend)
      })

      it('dataGrowth 有 byDomain', () => {
        expect(Array.isArray(bridge.dataGrowth.value.byDomain)).toBe(true)
      })
    })

    // ============================================================
    // 建议生成
    // ============================================================
    describe('建议生成', () => {
      it('有数据建议导出', () => {
        const recs = bridge.recommendations.value
        const hasExport = recs.some((r: any) => r.type === 'export')
        expect(hasExport).toBe(true)
      })

      it('recommendations 按优先级排序（high > medium > low）', () => {
        const recs = bridge.recommendations.value
        const order = { high: 0, medium: 1, low: 2 }
        for (let i = 1; i < recs.length; i++) {
          const prev = order[recs[i - 1].priority as keyof typeof order]
          const curr = order[recs[i].priority as keyof typeof order]
          expect(prev).toBeLessThanOrEqual(curr)
        }
      })

      it('recommendations 每个条目包含 type 和 priority', () => {
        bridge.recommendations.value.forEach((r: any) => {
          expect(r.type).toBeDefined()
          expect(r.priority).toBeDefined()
          expect(['high', 'medium', 'low']).toContain(r.priority)
        })
      })

      it('recommendations 每个条目包含 title 和 description', () => {
        bridge.recommendations.value.forEach((r: any) => {
          expect(r.title).toBeDefined()
          expect(typeof r.title).toBe('string')
          expect(r.description).toBeDefined()
          expect(typeof r.description).toBe('string')
        })
      })
    })

    // ============================================================
    // 操作入口
    // ============================================================
    describe('操作入口', () => {
      it('refreshAll 刷新不抛出异常', () => {
        expect(() => bridge.refreshAll()).not.toThrow()
      })

      it('exportAllData 返回 JSON 字符串', () => {
        const result = bridge.exportAllData()
        expect(typeof result).toBe('string')
        const parsed = JSON.parse(result)
        expect(parsed).toBeDefined()
        expect(parsed.schemaVersion).toBe(9)
        expect(parsed.data).toBeDefined()
        expect(parsed.exportedAt).toBeDefined()
      })

      it('getDomainStats 返回域统计', () => {
        const stats = bridge.getDomainStats('sessions')
        expect(stats).not.toBeNull()
        expect(stats.name).toBe('专注会话')
        expect(stats.count).toBe(3)
        expect(stats.isEmpty).toBe(false)
      })

      it('getDomainStats 对不存在的域返回 null', () => {
        const stats = bridge.getDomainStats('nonexistent')
        expect(stats).toBeNull()
      })

      it('getDataSize 返回数字', () => {
        const size = bridge.getDataSize()
        expect(size).toBeGreaterThan(0)
      })

      it('getAllDomains 返回域名列表', () => {
        const domains = bridge.getAllDomains()
        expect(Array.isArray(domains)).toBe(true)
        expect(domains.length).toBe(9)
        const keys = domains.map((d: any) => d.key)
        expect(keys).toContain('sessions')
        expect(keys).toContain('crystals')
        expect(keys).toContain('notes')
        expect(keys).toContain('emotions')
        expect(keys).toContain('anchors')
        expect(keys).toContain('goals')
        expect(keys).toContain('carriers')
        expect(keys).toContain('advisors')
        expect(keys).toContain('relations')
      })

      it('checkDataIntegrity 返回完整性', () => {
        const integrity = bridge.checkDataIntegrity()
        expect(integrity).toBeDefined()
        expect(integrity.domains).toBeDefined()
        expect(Array.isArray(integrity.domains)).toBe(true)
        expect(integrity.domains.length).toBe(9)
        expect(typeof integrity.overallHealthy).toBe('boolean')
      })
    })

    // ============================================================
    // 完整工作流
    // ============================================================
    describe('完整工作流', () => {
      it('获取概览 → 域健康 → 导出 → 完整性检查 完整流程', () => {
        // 1. 数据概览
        const overview = bridge.dataOverview.value
        expect(overview.totalItems).toBeGreaterThan(0)
        expect(overview.schemaVersion).toBe(9)

        // 2. 域健康
        const health = bridge.dataDomainHealth.value
        expect(health.length).toBe(9)
        const healthyDomains = health.filter((d: any) => d.integrity === 'healthy')
        expect(healthyDomains.length).toBe(9)

        // 3. 导出数据
        const exported = bridge.exportAllData()
        const parsed = JSON.parse(exported)
        expect(parsed.schemaVersion).toBe(9)

        // 4. 完整性检查
        const integrity = bridge.checkDataIntegrity()
        expect(integrity.overallHealthy).toBe(true)

        // 5. 获取所有域
        const domains = bridge.getAllDomains()
        expect(domains.length).toBe(9)
      })
    })
  })

  // ---- 大数据量状态 ----
  describe('大数据量状态', () => {
    beforeEach(async () => {
      vi.clearAllMocks()
      resetKvStore()
      setRecords(makeLargeRecords())
      bridge = await importBridge()
    })

    describe('数据概览', () => {
      it('大数据量 totalItems 大于 500', () => {
        expect(bridge.dataOverview.value.totalItems).toBeGreaterThan(500)
      })
    })

    describe('建议生成', () => {
      it('数据量大时建议备份', () => {
        const recs = bridge.recommendations.value
        const hasBackup = recs.some((r: any) => r.type === 'backup')
        expect(hasBackup).toBe(true)
      })

      it('数据量 > 200 时建议复盘', () => {
        const recs = bridge.recommendations.value
        const hasReview = recs.some((r: any) => r.type === 'review' && r.id === 'rec_review_data')
        expect(hasReview).toBe(true)
      })
    })
  })
})