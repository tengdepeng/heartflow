// ============================================================
// 工痕 · 视图印记（痕记）数据层
// 为 Scar.vue 提供标准化的「痕记」存取接口，替代视图内直接的
// storage.getKV('scars') / storage.setKV('scars') 裸调用。
//
// 注意：此处维护的是视图本地结构（以 `at` 记录时间），与
// useScarHealing 的模块结构（以 `recordedAt` 记录时间）不同。
// 两者共享 SCAR_STORAGE_KEYS.MARKS 存储键，后续应将桥接层
// useScarHealing 统一到同一结构，避免双写。
// ============================================================

import { ref } from 'vue'
import { storage } from '@/engine/storage'
import { SCAR_STORAGE_KEYS } from './types'
import type { ScarType } from './types'

/** 视图本地痕迹结构（与 Scar.vue 的局部 BodyMark 一致） */
export interface ScarMark {
  id: string
  bodyPart: string
  severity: number // 1-5
  description: string
  scarType: ScarType
  at: string
}

// 模块级单例：所有消费方共享同一份痕迹列表
const marks = ref<ScarMark[]>([])

/**
 * 痕记数据层：读取 / 写入 / 增删改
 */
export function useScarMarks() {
  /** 从存储载入痕记 */
  function load(): void {
    marks.value = storage.getKV<ScarMark[]>(SCAR_STORAGE_KEYS.MARKS, [])
  }

  /** 整体覆盖并持久化痕记列表 */
  function save(list: ScarMark[]): void {
    marks.value = list
    storage.setKV(SCAR_STORAGE_KEYS.MARKS, list)
  }

  /** 追加一条痕记 */
  function add(mark: ScarMark): void {
    save([...marks.value, mark])
  }

  /** 删除指定 id 的痕记 */
  function remove(id: string): void {
    save(marks.value.filter((m) => m.id !== id))
  }

  /** 更新指定 id 的痕记 */
  function update(updated: ScarMark): void {
    save(marks.value.map((m) => (m.id === updated.id ? updated : m)))
  }

  return { marks, load, save, add, remove, update }
}
