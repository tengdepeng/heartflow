// ============================================================
// 经略阁 · 知识关系引擎 · CRUD 操作
// ============================================================

import { storage } from '../../engine/storage'
import type { KnowledgeNode, KnowledgeRelation } from './types'

const NODES_KEY = 'hf:knowledge_nodes'
const RELATIONS_KEY = 'hf:knowledge_relations'

// ---- 节点操作 ----

export function getNodes(): KnowledgeNode[] {
  return storage.getKV<KnowledgeNode[]>(NODES_KEY, [])
}

function saveNodes(nodes: KnowledgeNode[]): void {
  storage.setKV(NODES_KEY, nodes)
}

export function createNode(node: KnowledgeNode): KnowledgeNode {
  const nodes = getNodes()
  nodes.push(node)
  saveNodes(nodes)
  return node
}

export function updateNode(
  id: string,
  data: Partial<Omit<KnowledgeNode, 'id' | 'createdAt'>>,
): KnowledgeNode | null {
  const nodes = getNodes()
  const idx = nodes.findIndex(n => n.id === id)
  if (idx === -1) return null
  nodes[idx] = { ...nodes[idx], ...data, updatedAt: new Date().toISOString() }
  saveNodes(nodes)
  return nodes[idx]
}

export function deleteNode(id: string): boolean {
  const nodes = getNodes()
  const filtered = nodes.filter(n => n.id !== id)
  if (filtered.length === nodes.length) return false
  saveNodes(filtered)

  // 同时清理关联关系
  const relations = getRelations()
  const remaining = relations.filter(r => r.sourceId !== id && r.targetId !== id)
  if (remaining.length !== relations.length) {
    saveRelations(remaining)
  }

  return true
}

// ---- 关系操作 ----

export function getRelations(): KnowledgeRelation[] {
  return storage.getKV<KnowledgeRelation[]>(RELATIONS_KEY, [])
}

function saveRelations(relations: KnowledgeRelation[]): void {
  storage.setKV(RELATIONS_KEY, relations)
}

export function createRelation(relation: KnowledgeRelation): KnowledgeRelation {
  const relations = getRelations()
  relations.push(relation)
  saveRelations(relations)
  return relation
}

export function deleteRelation(id: string): boolean {
  const relations = getRelations()
  const filtered = relations.filter(r => r.id !== id)
  if (filtered.length === relations.length) return false
  saveRelations(filtered)
  return true
}

export function getNodeRelations(nodeId: string): KnowledgeRelation[] {
  return getRelations().filter(r => r.sourceId === nodeId || r.targetId === nodeId)
}