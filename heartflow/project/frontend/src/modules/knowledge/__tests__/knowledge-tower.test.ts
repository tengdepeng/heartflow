import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockGetKV, mockSetKV, store } = vi.hoisted(() => {
  const store: Record<string, any> = {}
  const mockGetKV = vi.fn((k: string, d: any) => store[k] ?? d)
  const mockSetKV = vi.fn((k: string, v: any) => { store[k] = v })
  return { mockGetKV, mockSetKV, store }
})

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: (...a: any[]) => (mockGetKV as any)(...a),
    setKV: (...a: any[]) => (mockSetKV as any)(...a),
  },
}))

import {
  useKnowledgeTower,
  KNOWLEDGE_NODES_KEY,
  KNOWLEDGE_IMPORT_SOURCES_KEY,
  KNOWLEDGE_STAR_POSITIONS_KEY,
  type KNode,
  type ImportSource,
  type StarPositions,
} from '../knowledge-tower'

function node(id = 'kn1'): KNode {
  return { id, title: '概念', desc: '', cat: 'concept', links: [] }
}

function source(id = 'imp1'): ImportSource {
  return {
    id,
    type: 'book',
    title: '书',
    content: '内容',
    sourceMeta: { author: '作者' },
    importedAt: '2026-07-01T00:00:00Z',
  }
}

describe('useKnowledgeTower', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    store[KNOWLEDGE_NODES_KEY] = []
    store[KNOWLEDGE_IMPORT_SOURCES_KEY] = []
    store[KNOWLEDGE_STAR_POSITIONS_KEY] = {}
    // 重置模块级单例，避免跨用例泄漏
    useKnowledgeTower().load()
  })

  it('load 从存储读取三组状态', () => {
    store[KNOWLEDGE_NODES_KEY] = [node()]
    store[KNOWLEDGE_IMPORT_SOURCES_KEY] = [source()]
    store[KNOWLEDGE_STAR_POSITIONS_KEY] = { kn1: { x: 1, y: 2 } }
    const t = useKnowledgeTower()
    t.load()
    expect(t.nodes.value).toHaveLength(1)
    expect(t.importSources.value).toHaveLength(1)
    expect(t.starPositions.value).toEqual({ kn1: { x: 1, y: 2 } })
  })

  it('saveNodes 写入 hf:knowledge', () => {
    const t = useKnowledgeTower()
    t.nodes.value.push(node())
    t.saveNodes()
    expect(mockSetKV).toHaveBeenCalledWith(KNOWLEDGE_NODES_KEY, expect.any(Array))
    expect(store[KNOWLEDGE_NODES_KEY]).toHaveLength(1)
  })

  it('saveImportSources 写入 hf:import_sources', () => {
    const t = useKnowledgeTower()
    t.importSources.value.push(source())
    t.saveImportSources()
    expect(mockSetKV).toHaveBeenCalledWith(KNOWLEDGE_IMPORT_SOURCES_KEY, expect.any(Array))
    expect(store[KNOWLEDGE_IMPORT_SOURCES_KEY]).toHaveLength(1)
  })

  it('saveStarPositions 写入 hf:kt_star_positions', () => {
    const t = useKnowledgeTower()
    const pos: StarPositions = { kn1: { x: 3, y: 4 } }
    t.starPositions.value = pos
    t.saveStarPositions()
    expect(mockSetKV).toHaveBeenCalledWith(KNOWLEDGE_STAR_POSITIONS_KEY, pos)
    expect(store[KNOWLEDGE_STAR_POSITIONS_KEY]).toEqual({ kn1: { x: 3, y: 4 } })
  })

  it('缺失键时回退默认值', () => {
    delete store[KNOWLEDGE_NODES_KEY]
    delete store[KNOWLEDGE_IMPORT_SOURCES_KEY]
    delete store[KNOWLEDGE_STAR_POSITIONS_KEY]
    const t = useKnowledgeTower()
    t.load()
    expect(t.nodes.value).toEqual([])
    expect(t.importSources.value).toEqual([])
    expect(t.starPositions.value).toEqual({})
  })
})
