// ============================================================
// 蜕变回廊数据层（TransformGallery.vue）
// 替代视图内裸的 storage.getKV('hf:transformations') / storage.setKV 调用。
// 暴露模块级单例 ref，跨消费方共享同一份蜕变记录列表。
// ============================================================

import { ref } from 'vue'
import { storage } from '../../engine/storage'

export type TransformType = 'body' | 'mind' | 'emotion' | 'social' | 'career'

export interface Transformation {
  id: string
  type: TransformType
  description: string
  duration: number
  createdAt: string
}

// 必须保留视图原本使用的存储键原值
const KEY = 'hf:transformations'

// 模块级单例：所有消费方共享同一份蜕变记录列表
const records = ref<Transformation[]>([])

/**
 * 蜕变回廊数据层：读取 / 写入 / 增删
 */
export function useTransformGallery() {
  /** 从存储载入蜕变记录 */
  function load(): void {
    try {
      records.value = storage.getKV<Transformation[]>(KEY, [])
    } catch {
      records.value = []
    }
  }

  /** 整体持久化当前记录列表 */
  function save(): void {
    storage.setKV(KEY, records.value)
  }

  /** 追加一条记录到列表头部 */
  function add(record: Transformation): void {
    records.value = [record, ...records.value]
    save()
  }

  /** 删除指定 id 的记录 */
  function remove(id: string): void {
    records.value = records.value.filter((r) => r.id !== id)
    save()
  }

  return { records, load, save, add, remove }
}
