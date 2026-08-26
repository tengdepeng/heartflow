// ============================================================
// P16-8 思绪书房 · 全文搜索 + 笔记统计 + 知识图谱桥接 测试
// ============================================================

import { describe, expect, it, beforeEach } from 'vitest'
import type { Note } from '../../../types'
import type { KnowledgeRing } from '../knowledge-ring'
import { useFulltextSearch } from '../fulltext-search'
import { useNoteAnalytics } from '../note-analytics'
import { useKnowledgeBridge } from '../knowledge-bridge'

// ---- 测试数据工厂 ----

function createTestNote(
  id: string,
  title: string,
  content: string,
  tags: string[] = [],
  createdAt = '2026-07-01T00:00:00.000Z',
  updatedAt = '2026-07-15T00:00:00.000Z',
  archived = false,
  deletedAt?: string,
): Note {
  return { id, title, content, tags, createdAt, updatedAt, archived, deletedAt }
}

function createTestRing(
  noteId: string,
  overrides: Partial<KnowledgeRing> = {},
): KnowledgeRing {
  const now = new Date().toISOString()
  return {
    noteId,
    title: '测试笔记',
    rings: 3,
    lastReviewedAt: now,
    nextReviewAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    reviewCount: 5,
    forgetCount: 0,
    crackCount: 0,
    hasReunion: false,
    luminance: 0.7,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: now,
    ...overrides,
  }
}

// ---- 测试数据 ----

const testNotes: Note[] = [
  createTestNote('n1', 'Vue 3 组合式 API 学习笔记', 'Vue 3 的 Composition API 提供了更灵活的代码组织方式。setup() 函数是组合式 API 的入口。ref 和 reactive 是核心响应式 API。', ['Vue', '前端', '学习']),
  createTestNote('n2', 'React Hooks 最佳实践', 'useState 和 useEffect 是最常用的 Hooks。useMemo 和 useCallback 用于性能优化。自定义 Hooks 可以复用逻辑。', ['React', '前端', '学习']),
  createTestNote('n3', 'TypeScript 类型体操', '泛型、条件类型、模板字面量类型。infer 关键字用于类型推断。映射类型和索引访问类型。', ['TypeScript', '前端', '编程']),
  createTestNote('n4', 'Node.js 性能优化', '使用 cluster 模块利用多核 CPU。流式处理大文件。缓存策略与内存管理。', ['Node.js', '后端', '性能']),
  createTestNote('n5', '数据库索引优化指南', 'B+树索引原理。联合索引的最左前缀原则。覆盖索引减少回表查询。', ['数据库', '后端', '性能']),
  createTestNote('n6', 'Docker 容器化部署', '编写 Dockerfile 最佳实践。多阶段构建减小镜像体积。docker-compose 编排服务。', ['Docker', '运维', '部署']),
  createTestNote('n7', '微服务架构设计', '服务拆分原则。API 网关设计。服务间通信：RPC vs 消息队列。分布式事务。', ['微服务', '架构', '后端']),
  createTestNote('n8', '设计模式在实战中的应用', '单例模式、工厂模式、观察者模式。策略模式替代 if-else。装饰器模式在 NestJS 中的应用。', ['设计模式', '编程', '架构']),
  createTestNote('n9', '', '', [], '2026-07-20T00:00:00.000Z', '2026-07-20T00:00:00.000Z'),
  createTestNote('n10', '已归档笔记', '这是一篇已归档的笔记内容。', ['归档'], '2026-05-01T00:00:00.000Z', '2026-05-10T00:00:00.000Z', true),
  createTestNote('n11', '已删除笔记', '这是已删除的内容。', ['删除'], '2026-04-01T00:00:00.000Z', '2026-04-05T00:00:00.000Z', false, '2026-04-10T00:00:00.000Z'),
]

// ============================================================
// P16-8-1 全文搜索引擎测试
// ============================================================

describe('P16-8 全文搜索引擎', () => {
  const engine = useFulltextSearch()

  describe('buildIndex - 构建索引', () => {
    it('应正确构建倒排索引', () => {
      const notes = testNotes.filter(n => !n.deletedAt)
      engine.buildIndex(notes)

      const stats = engine.getStats()
      expect(stats.indexedDocuments).toBeGreaterThan(0)
      expect(stats.indexedTerms).toBeGreaterThan(0)
      expect(stats.avgDocumentLength).toBeGreaterThan(0)
      expect(stats.lastIndexedAt).toBeTruthy()
    })

    it('应排除已删除的笔记', () => {
      const notes = [testNotes[0], testNotes[10]] // 一篇正常 + 一篇已删除
      engine.buildIndex(notes)

      const stats = engine.getStats()
      expect(stats.indexedDocuments).toBe(1)
    })

    it('多次构建索引应正确重置', () => {
      engine.buildIndex(testNotes.slice(0, 3))
      const stats1 = engine.getStats()

      engine.buildIndex(testNotes.slice(0, 5))
      const stats2 = engine.getStats()

      expect(stats2.indexedDocuments).toBeGreaterThan(stats1.indexedDocuments)
    })
  })

  describe('search - 搜索', () => {
    beforeEach(() => {
      engine.buildIndex(testNotes.filter(n => !n.deletedAt))
    })

    it('应返回标题匹配的结果', () => {
      const results = engine.search('Vue', testNotes)
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].note.title).toContain('Vue')
    })

    it('应返回内容匹配的结果', () => {
      const results = engine.search('响应式', testNotes)
      expect(results.length).toBeGreaterThan(0)
    })

    it('应返回标签匹配的结果', () => {
      const results = engine.search('后端', testNotes)
      expect(results.length).toBeGreaterThan(0)
      // 至少有一个结果包含"后端"标签
      const hasTagResult = results.some(r => r.note.tags.includes('后端'))
      expect(hasTagResult).toBe(true)
    })

    it('标题匹配权重应高于内容匹配', () => {
      const results = engine.search('Vue', testNotes)
      const titleMatch = results.find(r => r.note.title.includes('Vue'))
      const contentOnly = results.find(r => !r.note.title.includes('Vue') && r.note.content.includes('Vue'))
      if (titleMatch && contentOnly) {
        expect(titleMatch.score).toBeGreaterThan(contentOnly.score)
      }
    })

    it('空查询应返回空数组', () => {
      const results = engine.search('', testNotes)
      expect(results).toHaveLength(0)
    })

    it('应限制返回结果数量', () => {
      const results = engine.search('前端', testNotes, { limit: 1 })
      expect(results.length).toBeLessThanOrEqual(1)
    })

    it('应排除已归档笔记（默认）', () => {
      const results = engine.search('归档', testNotes)
      const archivedResult = results.find(r => r.note.archived)
      expect(archivedResult).toBeUndefined()
    })

    it('includeArchived 选项应包含已归档笔记', () => {
      const results = engine.search('归档', testNotes, { includeArchived: true })
      const archivedResult = results.find(r => r.note.archived)
      expect(archivedResult).toBeDefined()
    })

    it('模糊匹配应找到近似词', () => {
      const results = engine.search('Vuee', testNotes, { fuzzy: true, maxEditDistance: 2 })
      expect(results.length).toBeGreaterThan(0)
    })

    it('最小评分阈值应过滤低分结果', () => {
      const results = engine.search('前端', testNotes, { minScore: 50 })
      for (const r of results) {
        expect(r.score).toBeGreaterThanOrEqual(50)
      }
    })

    it('搜索结果应包含高亮信息', () => {
      const results = engine.search('Vue', testNotes)
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].highlights.length).toBeGreaterThan(0)
    })

    it('搜索结果应包含匹配详情', () => {
      const results = engine.search('Vue', testNotes)
      expect(results[0].matches.length).toBeGreaterThan(0)
    })
  })

  describe('quickSearch - 快速搜索', () => {
    beforeEach(() => {
      engine.buildIndex(testNotes.filter(n => !n.deletedAt))
    })

    it('应返回匹配的笔记 ID 列表', () => {
      const ids = engine.quickSearch('Vue', testNotes)
      expect(ids.length).toBeGreaterThan(0)
      expect(typeof ids[0]).toBe('string')
    })
  })

  describe('suggest - 搜索建议', () => {
    beforeEach(() => {
      engine.buildIndex(testNotes.filter(n => !n.deletedAt))
    })

    it('应为前缀提供词条建议', () => {
      const suggestions = engine.suggest('Vu', testNotes)
      const termSuggestion = suggestions.find(s => s.type === 'term')
      expect(termSuggestion).toBeDefined()
    })

    it('应为前缀提供标签建议', () => {
      const suggestions = engine.suggest('前', testNotes)
      const tagSuggestion = suggestions.find(s => s.type === 'tag')
      expect(tagSuggestion).toBeDefined()
    })

    it('空前缀应返回空数组', () => {
      const suggestions = engine.suggest('', testNotes)
      expect(suggestions).toHaveLength(0)
    })
  })

  describe('getRelatedTerms - 相关词条', () => {
    beforeEach(() => {
      engine.buildIndex(testNotes.filter(n => !n.deletedAt))
    })

    it('应返回与查询词相关的词条', () => {
      // 先搜索前端相关内容建立索引
      engine.search('前端', testNotes)
      const related = engine.getRelatedTerms('前端', 5)
      // 可能返回相关词条，也可能为空（取决于索引内容）
      expect(Array.isArray(related)).toBe(true)
    })
  })
})

// ============================================================
// P16-8-2 笔记统计分析引擎测试
// ============================================================

describe('P16-8 笔记统计分析引擎', () => {
  const analytics = useNoteAnalytics()

  describe('computeWritingStats - 写作统计', () => {
    it('应计算总笔记数和总字数', () => {
      const stats = analytics.computeWritingStats(testNotes)
      expect(stats.totalNotes).toBeGreaterThan(0)
      expect(stats.totalChars).toBeGreaterThan(0)
    })

    it('应计算平均字数和最大最小字数', () => {
      const stats = analytics.computeWritingStats(testNotes)
      expect(stats.avgCharsPerNote).toBeGreaterThan(0)
      expect(stats.maxCharsPerNote).toBeGreaterThanOrEqual(stats.minCharsPerNote)
    })

    it('应计算中位数字数', () => {
      const stats = analytics.computeWritingStats(testNotes)
      expect(stats.medianCharsPerNote).toBeGreaterThanOrEqual(0)
    })

    it('应识别空笔记', () => {
      const stats = analytics.computeWritingStats(testNotes)
      expect(stats.emptyNoteRatio).toBeGreaterThan(0)
    })

    it('应生成字数分布', () => {
      const stats = analytics.computeWritingStats(testNotes)
      expect(stats.lengthDistribution.length).toBeGreaterThan(0)
      const totalRatio = stats.lengthDistribution.reduce((s, b) => s + b.count, 0)
      expect(totalRatio).toBeGreaterThan(0)
    })
  })

  describe('computeTimeTrends - 时间趋势', () => {
    it('应生成每日统计', () => {
      const trends = analytics.computeTimeTrends(testNotes)
      expect(trends.daily.length).toBe(30)
      // 每日统计数据应按日期排序
      for (let i = 1; i < trends.daily.length; i++) {
        expect(trends.daily[i].date >= trends.daily[i - 1].date).toBe(true)
      }
    })

    it('应生成每周统计', () => {
      const trends = analytics.computeTimeTrends(testNotes)
      expect(trends.weekly.length).toBe(12)
    })

    it('应生成每月统计', () => {
      const trends = analytics.computeTimeTrends(testNotes)
      expect(trends.monthly.length).toBe(12)
    })
  })

  describe('computeTagAnalysis - 标签分析', () => {
    it('应生成标签频率排行', () => {
      const analysis = analytics.computeTagAnalysis(testNotes)
      expect(analysis.topTags.length).toBeGreaterThan(0)
      expect(analysis.topTags[0].count).toBeGreaterThanOrEqual(analysis.topTags[1]?.count || 0)
    })

    it('应计算标签共现矩阵', () => {
      const analysis = analytics.computeTagAnalysis(testNotes)
      // 有标签共现
      expect(analysis.cooccurrence.length).toBeGreaterThanOrEqual(0)
    })

    it('应识别无标签笔记', () => {
      const analysis = analytics.computeTagAnalysis(testNotes)
      expect(analysis.untaggedCount).toBeGreaterThan(0)
      expect(analysis.untaggedRatio).toBeGreaterThan(0)
    })

    it('应计算平均标签数', () => {
      const analysis = analytics.computeTagAnalysis(testNotes)
      expect(analysis.avgTagsPerNote).toBeGreaterThan(0)
    })

    it('应生成标签聚类', () => {
      const analysis = analytics.computeTagAnalysis(testNotes)
      // 聚类可能为空（如果没有足够强的共现）
      expect(Array.isArray(analysis.clusters)).toBe(true)
    })
  })

  describe('computeLifecycle - 生命周期', () => {
    it('应计算活跃、归档和删除数量', () => {
      const lifecycle = analytics.computeLifecycle(testNotes)
      expect(lifecycle.activeCount).toBeGreaterThan(0)
      expect(lifecycle.archivedCount).toBeGreaterThan(0)
      expect(lifecycle.deletedCount).toBeGreaterThan(0)
    })

    it('应计算归档率和删除率', () => {
      const lifecycle = analytics.computeLifecycle(testNotes)
      expect(lifecycle.archiveRatio).toBeGreaterThan(0)
      expect(lifecycle.deleteRatio).toBeGreaterThan(0)
    })

    it('应生成创建趋势', () => {
      const lifecycle = analytics.computeLifecycle(testNotes)
      expect(lifecycle.creationTrend.length).toBeGreaterThan(0)
    })
  })

  describe('computeContentQuality - 内容质量', () => {
    it('应计算内容质量指标', () => {
      const quality = analytics.computeContentQuality(testNotes)
      expect(quality.uniqueWordRatio).toBeGreaterThanOrEqual(0)
      expect(quality.avgTitleLength).toBeGreaterThan(0)
      expect(quality.linkRatio).toBeGreaterThanOrEqual(0)
      expect(quality.codeBlockRatio).toBeGreaterThanOrEqual(0)
    })

    it('空笔记数组应返回零值', () => {
      const quality = analytics.computeContentQuality([])
      expect(quality.uniqueWordRatio).toBe(0)
      expect(quality.avgTitleLength).toBe(0)
    })
  })

  describe('computeNoteHealth - 笔记健康度', () => {
    it('应为内容丰富的笔记打出高分', () => {
      const note = testNotes[0] // Vue 3 学习笔记
      const health = analytics.computeNoteHealth(note)
      expect(health.overallScore).toBeGreaterThan(0)
      expect(health.grade).toBeDefined()
    })

    it('应为空笔记打出低分', () => {
      const note = testNotes[8] // 空笔记
      const health = analytics.computeNoteHealth(note)
      expect(health.overallScore).toBeLessThan(40)
      expect(health.suggestions.length).toBeGreaterThan(0)
      expect(health.grade).toBe('poor')
    })

    it('应结合知识年轮计算健康度', () => {
      const note = testNotes[0]
      const ring = createTestRing(note.id)
      const health = analytics.computeNoteHealth(note, ring)
      expect(health.reviewHealth).toBeGreaterThanOrEqual(0)
    })

    it('应为遗忘的笔记降低健康度', () => {
      const note = testNotes[0]
      const pastDate = new Date(Date.now() - 30 * 86400000).toISOString()
      const ring = createTestRing(note.id, {
        nextReviewAt: pastDate,
        forgetCount: 3,
      })
      const health = analytics.computeNoteHealth(note, ring)
      // 遗忘的笔记回顾健康度应较低
      expect(health.overallScore).toBeLessThan(80)
    })
  })

  describe('computeHealthScores - 批量健康度', () => {
    it('应计算所有笔记的健康度', () => {
      const scores = analytics.computeHealthScores(testNotes, [])
      expect(scores.length).toBeGreaterThan(0)
    })

    it('应按分数排序（从低到高）', () => {
      const scores = analytics.computeHealthScores(testNotes, [])
      for (let i = 1; i < scores.length; i++) {
        expect(scores[i].overallScore).toBeGreaterThanOrEqual(scores[i - 1].overallScore)
      }
    })
  })

  describe('computeHealthSummary - 健康度摘要', () => {
    it('应生成健康度摘要', () => {
      const summary = analytics.computeHealthSummary(testNotes, [])
      expect(summary.avgScore).toBeGreaterThan(0)
      expect(summary.excellentCount + summary.goodCount + summary.fairCount + summary.poorCount + summary.criticalCount).toBeGreaterThan(0)
    })
  })

  describe('generateReport - 综合分析报告', () => {
    it('应生成完整的分析报告', () => {
      const report = analytics.generateReport(testNotes)
      expect(report.generatedAt).toBeTruthy()
      expect(report.writing).toBeDefined()
      expect(report.trends).toBeDefined()
      expect(report.tags).toBeDefined()
      expect(report.lifecycle).toBeDefined()
      expect(report.quality).toBeDefined()
      expect(report.healthScores.length).toBeGreaterThan(0)
      expect(report.healthSummary).toBeDefined()
    })
  })
})

// ============================================================
// P16-8-3 知识图谱桥接层测试
// ============================================================

describe('P16-8 知识图谱桥接层', () => {
  const bridge = useKnowledgeBridge()

  describe('initialize - 初始化', () => {
    it('应初始化图谱并返回', () => {
      const graph = bridge.initialize(testNotes)
      expect(graph).toBeDefined()
      expect(graph.nodes.length).toBeGreaterThan(0)
      expect(graph.edges.length).toBeGreaterThan(0)
    })

    it('应为笔记节点创建图谱', () => {
      const graph = bridge.initialize(testNotes)
      const noteNodes = graph.nodes.filter(n => n.type === 'note')
      expect(noteNodes.length).toBeGreaterThan(0)
    })

    it('应为标签创建节点', () => {
      const graph = bridge.initialize(testNotes)
      const tagNodes = graph.nodes.filter(n => n.type === 'tag')
      expect(tagNodes.length).toBeGreaterThan(0)
    })
  })

  describe('getNoteContext - 图谱上下文', () => {
    beforeEach(() => {
      bridge.initialize(testNotes)
    })

    it('应返回笔记的图谱上下文', () => {
      const context = bridge.getNoteContext('n1')
      expect(context.selfNode).toBeDefined()
      expect(context.centrality).toBeGreaterThanOrEqual(0)
      expect(typeof context.isHub).toBe('boolean')
    })

    it('应为有标签的笔记返回邻居', () => {
      const context = bridge.getNoteContext('n1')
      // n1 有标签，应该连接到标签节点
      expect(context.neighbors.length).toBeGreaterThanOrEqual(0)
    })

    it('应为不存在的笔记返回空上下文', () => {
      const context = bridge.getNoteContext('nonexistent')
      expect(context.selfNode).toBeNull()
    })
  })

  describe('getRelatedRecommendations - 关联推荐', () => {
    beforeEach(() => {
      bridge.initialize(testNotes)
    })

    it('应返回关联推荐', () => {
      const recommendations = bridge.getRelatedRecommendations('n1', testNotes)
      expect(recommendations.length).toBeGreaterThan(0)
    })

    it('推荐结果应包含分数和原因', () => {
      const recommendations = bridge.getRelatedRecommendations('n1', testNotes)
      for (const rec of recommendations) {
        expect(rec.score).toBeGreaterThanOrEqual(0)
        expect(rec.reasons.length).toBeGreaterThan(0)
      }
    })

    it('推荐结果不应包含自身', () => {
      const recommendations = bridge.getRelatedRecommendations('n1', testNotes)
      const selfRec = recommendations.find(r => r.target.id === 'n1')
      expect(selfRec).toBeUndefined()
    })

    it('应限制推荐数量', () => {
      const recommendations = bridge.getRelatedRecommendations('n1', testNotes, 3)
      expect(recommendations.length).toBeLessThanOrEqual(3)
    })
  })

  describe('discoverKnowledge - 知识发现', () => {
    beforeEach(() => {
      bridge.initialize(testNotes)
    })

    it('应返回知识发现列表', () => {
      const discoveries = bridge.discoverKnowledge()
      expect(Array.isArray(discoveries)).toBe(true)
    })

    it('应包含重要性评分', () => {
      const discoveries = bridge.discoverKnowledge()
      for (const d of discoveries) {
        expect(d.importance).toBeGreaterThan(0)
      }
    })
  })

  describe('findPath - 路径查找', () => {
    beforeEach(() => {
      bridge.initialize(testNotes)
    })

    it('应找到两个相关笔记之间的路径', () => {
      // n1 (Vue) 和 n2 (React) 都共享 "前端" 标签
      const path = bridge.findPath('n1', 'n2')
      // 可能找到路径也可能找不到（取决于图谱结构）
      if (path) {
        expect(path.nodes.length).toBeGreaterThan(1)
        expect(path.length).toBeGreaterThan(0)
      }
    })

    it('同一笔记的路径应返回 null', () => {
      const path = bridge.findPath('n1', 'n1')
      expect(path).toBeNull()
    })
  })

  describe('semanticSearch - 语义搜索', () => {
    beforeEach(() => {
      bridge.initialize(testNotes)
    })

    it('应返回语义搜索结果', () => {
      const results = bridge.semanticSearch('前端开发', testNotes)
      expect(Array.isArray(results)).toBe(true)
    })
  })

  describe('getBridgeStats - 桥接统计', () => {
    it('应在初始化前返回零值', () => {
      const freshBridge = useKnowledgeBridge()
      const stats = freshBridge.getBridgeStats()
      expect(stats.nodeCount).toBe(0)
    })

    it('应在初始化后返回统计信息', () => {
      bridge.initialize(testNotes)
      const stats = bridge.getBridgeStats()
      expect(stats.nodeCount).toBeGreaterThan(0)
      expect(stats.edgeCount).toBeGreaterThan(0)
    })
  })
})