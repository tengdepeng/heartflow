// ============================================================
// 根脉之庭 · 根系数据层
// ------------------------------------------------------------
// 将裸的 storage.getKV/setKV('hf:roots_v2') 调用下沉为
// 模块级单例 ref + useRootGarden 组合式函数，视图不再直接触碰存储键。
// 原存储键 'hf:roots_v2' 必须保持不变；load 时的字段映射逻辑（缺省值补全）
// 一并下沉，行为与原视图完全一致。
// ============================================================

import { ref } from 'vue'
import { storage } from '../../engine/storage'

export const ROOTS_KEY = 'hf:roots_v2'

export interface Root {
  id: string
  layer: 'soil' | 'era' | 'branch'
  text: string
  detail: string
  era: string
  icon: string
  _expanded: boolean
  strength: number
  connections: string[]
  tags: string[]
  color: string
  willId: string | null
  lastUpdatedAt: string
}

// ---- 模块级单例 ref ----
const roots = ref<Root[]>([])

function load() {
  try {
    const raw = storage.getKV<any[]>(ROOTS_KEY, [])
    roots.value = (raw || []).map((r: any) => ({
      ...r,
      _expanded: false,
      strength: r.strength ?? 0.5,
      connections: r.connections ?? [],
      tags: r.tags ?? [],
      color: r.color ?? '#8a9a7a',
      willId: r.willId ?? null,
      lastUpdatedAt: r.lastUpdatedAt ?? new Date().toISOString(),
    }))
  } catch {
    roots.value = []
  }
}

function save() {
  storage.setKV(ROOTS_KEY, roots.value)
}

export function useRootGarden() {
  return {
    items: roots,
    load,
    save,
  }
}
