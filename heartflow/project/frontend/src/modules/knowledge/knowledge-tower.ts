// ============================================================
// 经略阁 · 知识塔数据层
// 将 KnowledgeTower 视图中裸 storage 的三组数据下沉为组合式函数：
//   - 知识节点 nodes        (hf:knowledge)
//   - 导入来源 importSources (hf:import_sources)
//   - 星图位置 starPositions (hf:kt_star_positions)
// 存储键与历史实现保持一致，确保既有记录不丢失。
// ============================================================

import { ref } from 'vue'
import { storage } from '../../engine/storage'
import type { ImportSource } from './importer'
export type { ImportSource } from './importer'

export const KNOWLEDGE_NODES_KEY = 'hf:knowledge'
export const KNOWLEDGE_IMPORT_SOURCES_KEY = 'hf:import_sources'
export const KNOWLEDGE_STAR_POSITIONS_KEY = 'hf:kt_star_positions'

export interface KNode {
  id: string
  title: string
  desc: string
  cat: string
  links: string[]
}

export type StarPositions = Record<string, { x: number; y: number }>

// 模块级单例：跨组件实例共享同一份数据
const nodes = ref<KNode[]>([])
const importSources = ref<ImportSource[]>([])
const starPositions = ref<StarPositions>({})

export function useKnowledgeTower() {
  function load() {
    nodes.value = storage.getKV<KNode[]>(KNOWLEDGE_NODES_KEY, [])
    importSources.value = storage.getKV<ImportSource[]>(KNOWLEDGE_IMPORT_SOURCES_KEY, [])
    starPositions.value = storage.getKV<StarPositions>(KNOWLEDGE_STAR_POSITIONS_KEY, {})
  }

  function saveNodes() {
    storage.setKV(KNOWLEDGE_NODES_KEY, nodes.value)
  }

  function saveImportSources() {
    storage.setKV(KNOWLEDGE_IMPORT_SOURCES_KEY, importSources.value)
  }

  function saveStarPositions() {
    storage.setKV(KNOWLEDGE_STAR_POSITIONS_KEY, starPositions.value)
  }

  return {
    nodes,
    importSources,
    starPositions,
    load,
    saveNodes,
    saveImportSources,
    saveStarPositions,
  }
}
