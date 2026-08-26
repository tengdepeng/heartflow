// ============================================================
// 动律之间 · 运动记录数据层
// ------------------------------------------------------------
// 将裸的 storage.getKV/setKV('hf:moves_v2') 调用下沉为
// 模块级单例 ref + useMovement 组合式函数，视图不再直接触碰存储键。
// 原存储键 'hf:moves_v2' 必须保持不变。
// ============================================================

import { ref } from 'vue'
import { storage } from '../../engine/storage'

export const MOVES_KEY = 'hf:moves_v2'

export interface Move {
  id: string
  type: string
  duration: number
  withWhom: string
  location: string
  note: string
  isMoment: boolean
  at: string
}

// ---- 模块级单例 ref ----
const moves = ref<Move[]>([])

function load() {
  try {
    moves.value = storage.getKV<Move[]>(MOVES_KEY, [])
  } catch {
    moves.value = []
  }
}

function save() {
  storage.setKV(MOVES_KEY, moves.value)
}

function add(input: {
  type: string
  duration: number
  withWhom?: string
  location?: string
  note?: string
  isMoment?: boolean
}): Move {
  const move: Move = {
    id: `mv${Date.now()}${Math.random().toString(36).slice(2, 4)}`,
    type: input.type,
    duration: input.duration,
    withWhom: (input.withWhom ?? '').trim(),
    location: (input.location ?? '').trim(),
    note: (input.note ?? '').trim(),
    isMoment: input.isMoment ?? false,
    at: new Date().toISOString(),
  }
  moves.value.unshift(move)
  save()
  return move
}

function remove(id: string) {
  moves.value = moves.value.filter(m => m.id !== id)
  save()
}

export function useMovement() {
  return {
    items: moves,
    load,
    save,
    add,
    remove,
  }
}
