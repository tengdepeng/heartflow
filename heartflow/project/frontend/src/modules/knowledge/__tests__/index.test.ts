// ============================================================
// 经略阁 · 知识关系引擎 · 单元测试
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'

// 使用 vi.hoisted 确保 mock 工厂在模块作用域提升时正确捕获外部变量
const { mockStore, mockGetKV, mockSetKV } = vi.hoisted(() => {
  const store: Record<string, any> = {}
  return {
    mockStore: store,
    mockGetKV: vi.fn((key: string, def: any) => store[key] ?? def),
    mockSetKV: vi.fn((key: string, val: any) => { store[key] = val }),
  }
})

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: <T>(key: string, def: T): T => mockGetKV(key, def),
    setKV: (key: string, val: any) => mockSetKV(key, val),
  },
}))

import { RELATION_TYPE_META } from '../types'
import type { KnowledgeNode, KnowledgeRelation } from '../types'
import {
  getNodes,
  createNode,
  deleteNode,
  getRelations,
  createRelation,
  getNodeRelations,
} from '../relation'

describe('经略阁 · 知识关系引擎', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 每个测试用例前重置存储数据
    Object.keys(mockStore).forEach(key => { delete mockStore[key] })
  })

  // ============================================================
  // 1. createNode 创建知识节点
  // ============================================================
  it('createNode 创建知识节点', () => {
    const node: KnowledgeNode = {
      id: 'node-1',
      title: '测试节点',
      desc: '这是一个测试知识节点',
      cat: 'concept',
      tags: ['测试', '概念'],
      createdAt: '2026-07-28T00:00:00.000Z',
      updatedAt: '2026-07-28T00:00:00.000Z',
    }

    const result = createNode(node)

    expect(result).toEqual(node)
    expect(mockSetKV).toHaveBeenCalledWith('hf:knowledge_nodes', [node])
    const all = getNodes()
    expect(all).toHaveLength(1)
    expect(all[0].id).toBe('node-1')
  })

  // ============================================================
  // 2. getNodes 返回所有节点
  // ============================================================
  it('getNodes 返回所有节点', () => {
    const node1: KnowledgeNode = {
      id: 'node-1',
      title: '节点一',
      desc: '描述一',
      cat: 'concept',
      tags: [],
      createdAt: '2026-07-28T00:00:00.000Z',
      updatedAt: '2026-07-28T00:00:00.000Z',
    }
    const node2: KnowledgeNode = {
      id: 'node-2',
      title: '节点二',
      desc: '描述二',
      cat: 'rule',
      tags: ['规则'],
      createdAt: '2026-07-28T00:00:00.000Z',
      updatedAt: '2026-07-28T00:00:00.000Z',
    }

    createNode(node1)
    createNode(node2)

    const all = getNodes()
    expect(all).toHaveLength(2)
    expect(all.map(n => n.id)).toEqual(['node-1', 'node-2'])
  })

  // ============================================================
  // 3. deleteNode 删除节点并清理关联关系
  // ============================================================
  it('deleteNode 删除节点并清理关联关系', () => {
    const node: KnowledgeNode = {
      id: 'node-1',
      title: '待删除节点',
      desc: '',
      cat: 'insight',
      tags: [],
      createdAt: '2026-07-28T00:00:00.000Z',
      updatedAt: '2026-07-28T00:00:00.000Z',
    }
    createNode(node)

    // 创建关联关系
    const rel1: KnowledgeRelation = {
      id: 'rel-1',
      sourceId: 'node-1',
      targetId: 'node-2',
      type: 'related',
      label: '关联',
      createdAt: '2026-07-28T00:00:00.000Z',
    }
    const rel2: KnowledgeRelation = {
      id: 'rel-2',
      sourceId: 'node-3',
      targetId: 'node-1',
      type: 'causal',
      label: '因果',
      createdAt: '2026-07-28T00:00:00.000Z',
    }
    const rel3: KnowledgeRelation = {
      id: 'rel-3',
      sourceId: 'node-3',
      targetId: 'node-4',
      type: 'contrast',
      label: '对比',
      createdAt: '2026-07-28T00:00:00.000Z',
    }
    createRelation(rel1)
    createRelation(rel2)
    createRelation(rel3)

    // 删除节点
    const deleted = deleteNode('node-1')
    expect(deleted).toBe(true)

    // 节点应被删除
    const nodes = getNodes()
    expect(nodes).toHaveLength(0)

    // 关联关系应被清理（rel1 和 rel2 涉及 node-1，rel3 不涉及）
    const relations = getRelations()
    expect(relations).toHaveLength(1)
    expect(relations[0].id).toBe('rel-3')
  })

  // ============================================================
  // 4. createRelation 创建关系
  // ============================================================
  it('createRelation 创建关系', () => {
    const relation: KnowledgeRelation = {
      id: 'rel-1',
      sourceId: 'node-a',
      targetId: 'node-b',
      type: 'belongs',
      label: '归属',
      createdAt: '2026-07-28T00:00:00.000Z',
    }

    const result = createRelation(relation)

    expect(result).toEqual(relation)
    expect(mockSetKV).toHaveBeenCalledWith('hf:knowledge_relations', [relation])
    const all = getRelations()
    expect(all).toHaveLength(1)
    expect(all[0].id).toBe('rel-1')
  })

  // ============================================================
  // 5. getNodeRelations 返回节点关联的所有关系
  // ============================================================
  it('getNodeRelations 返回节点关联的所有关系', () => {
    createRelation({
      id: 'rel-1',
      sourceId: 'node-a',
      targetId: 'node-b',
      type: 'related',
      label: '关联',
      createdAt: '2026-07-28T00:00:00.000Z',
    })
    createRelation({
      id: 'rel-2',
      sourceId: 'node-a',
      targetId: 'node-c',
      type: 'causal',
      label: '因果',
      createdAt: '2026-07-28T00:00:00.000Z',
    })
    createRelation({
      id: 'rel-3',
      sourceId: 'node-b',
      targetId: 'node-c',
      type: 'contrast',
      label: '对比',
      createdAt: '2026-07-28T00:00:00.000Z',
    })

    // node-a 作为 sourceId 参与 rel-1 和 rel-2
    const nodeARels = getNodeRelations('node-a')
    expect(nodeARels).toHaveLength(2)
    expect(nodeARels.map(r => r.id)).toEqual(['rel-1', 'rel-2'])

    // node-b 作为 sourceId 参与 rel-3，作为 targetId 参与 rel-1
    const nodeBRels = getNodeRelations('node-b')
    expect(nodeBRels).toHaveLength(2)
    expect(nodeBRels.map(r => r.id)).toEqual(['rel-1', 'rel-3'])

    // node-c 作为 targetId 参与 rel-2 和 rel-3
    const nodeCRels = getNodeRelations('node-c')
    expect(nodeCRels).toHaveLength(2)
    expect(nodeCRels.map(r => r.id)).toEqual(['rel-2', 'rel-3'])
  })

  // ============================================================
  // 6. RELATION_TYPE_META 包含4种关系类型
  // ============================================================
  it('RELATION_TYPE_META 包含4种关系类型', () => {
    const keys = Object.keys(RELATION_TYPE_META)
    expect(keys).toHaveLength(4)
    expect(keys).toEqual(['related', 'causal', 'belongs', 'contrast'])

    // 验证每种类型都有完整的元数据
    for (const key of keys) {
      const meta = RELATION_TYPE_META[key as keyof typeof RELATION_TYPE_META]
      expect(meta).toHaveProperty('label')
      expect(meta).toHaveProperty('icon')
      expect(meta).toHaveProperty('color')
      expect(meta).toHaveProperty('desc')
    }
  })
})