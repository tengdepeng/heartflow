// ============================================================
// 羁绊之厅 · 留座（纪念座位）数据层
// 为 RelationHall.vue 的「留座」Tab 提供标准化的存取接口，
// 替代视图内直接的 storage.getKV('relationhall_memorial_seats')
// / storage.setKV(...) 裸调用。
//
// 说明：留座模型（自由文本 relation、reason 枚举
// 'passed' | 'lost' | 'far'、message、createdAt 数值时间戳）
// 与 relation-store 的 canonical MemorialSeat（reason 枚举
// 'deceased' | 'lost_contact' | 'distance' | 'other'、memorial、
// seattedAt 字符串）并不一致，故此处保留独立的数据层，
// 而非折叠进 useRelation.addSeat()，以免丢失自由文本关系描述
// 与既有留座数据。后续如需统一，需对齐枚举并做数据迁移。
// ============================================================

import { ref } from 'vue'
import { storage } from '../../engine/storage'

/** 留座（纪念座位） */
export interface MemorialSeat {
  id: string
  name: string
  relation: string
  reason: 'passed' | 'lost' | 'far'
  message: string
  createdAt: number
}

const MEMORIAL_STORAGE_KEY = 'relationhall_memorial_seats'

// 模块级单例：所有消费方共享同一份留座列表
const seats = ref<MemorialSeat[]>([])

/**
 * 留座数据层：读取 / 写入 / 增删
 */
export function useMemorialSeats() {
  /** 从存储载入留座列表 */
  function load(): void {
    seats.value = storage.getKV<MemorialSeat[]>(MEMORIAL_STORAGE_KEY, [])
  }

  /** 整体覆盖并持久化留座列表 */
  function save(list: MemorialSeat[]): void {
    seats.value = list
    storage.setKV(MEMORIAL_STORAGE_KEY, list)
  }

  /** 追加一条留座 */
  function add(seat: MemorialSeat): void {
    save([...seats.value, seat])
  }

  /** 删除指定 id 的留座 */
  function remove(id: string): void {
    save(seats.value.filter((s) => s.id !== id))
  }

  return { seats, load, save, add, remove }
}
