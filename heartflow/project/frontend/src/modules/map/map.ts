// ============================================================
// 地图室 · 数据层
// 为 MapRoom.vue 提供地点（places）与人生节点（lifeNodes）的
// 标准化存取接口，替代视图内直接的
// storage.getKV('hf:map_places_v2') / storage.setKV(...)
// 以及 storage.getKV('hf:life_nodes') / storage.setKV(...) 裸调用。
//
// 说明：地点在持久化时需剥离运行时展开态字段 `_expanded`
// （仅在视图内用于控制卡片展开），载入时统一置为 false。
// ============================================================

import { ref } from 'vue'
import { storage } from '../../engine/storage'

/** 地点 */
export interface Place {
  id: string
  name: string
  city: string
  type: string
  note: string
  visitCount: number
  at: string
  lng?: number
  lat?: number
  /** 视图内运行时字段：是否展开详情（不持久化） */
  _expanded: boolean
}

/** 人生节点 */
export interface LifeNode {
  id: string
  year: string
  text: string
  detail: string
  color: string
  at: string
}

const PLACES_KEY = 'hf:map_places_v2'
const LIFE_NODES_KEY = 'hf:life_nodes'

// 模块级单例：视图与模块共享同一份地点 / 人生节点列表
const places = ref<Place[]>([])
const lifeNodes = ref<LifeNode[]>([])

/**
 * 地图室数据层：地点 + 人生节点的读取 / 写入
 */
export function useMap() {
  /** 从存储载入地点列表（重置运行时展开态） */
  function load(): void {
    try {
      const raw = storage.getKV<Place[]>(PLACES_KEY, []) || []
      places.value = raw.map((p: Place) => ({ ...p, _expanded: false }))
    } catch {
      places.value = []
    }
  }

  /** 持久化地点列表（剥离 `_expanded` 运行时字段） */
  function save(): void {
    storage.setKV(PLACES_KEY, places.value.map(({ _expanded, ...rest }) => rest))
  }

  /** 从存储载入人生节点 */
  function loadNodes(): void {
    try {
      lifeNodes.value = storage.getKV<LifeNode[]>(LIFE_NODES_KEY, [])
    } catch {
      /* ignore */
    }
  }

  /** 持久化人生节点 */
  function saveNodes(): void {
    storage.setKV(LIFE_NODES_KEY, lifeNodes.value)
  }

  return { places, lifeNodes, load, save, loadNodes, saveNodes }
}
