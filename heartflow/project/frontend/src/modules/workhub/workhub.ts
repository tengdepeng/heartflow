// ============================================================
// 工作中心 · 通用列表数据层
// 把 WorkHub.vue 内裸 storage 的「按种类键存取列表」下沉为
// 组合式函数。保留 K(k) 的键拼接逻辑（hf:work_<kind>），
// 各视图本地列表（marks / values / works / nets / skills / breaks）
// 仍由视图持有各自 ref，本层只负责持久化的读 / 写。
// ============================================================

import { storage } from '../../engine/storage'

/** 存储键拼接：hf:work_<kind> */
function K(kind: string): string {
  return `hf:work_${kind}`
}

/**
 * 工作中心通用列表数据层：按种类键读取 / 写入列表。
 */
export function useWorkHub() {
  /** 按种类键读取列表（失败安全：异常时返回空数组） */
  function load<T = any>(kind: string): T[] {
    try {
      return storage.getKV<T[]>(K(kind), [])
    } catch {
      return []
    }
  }

  /** 按种类键写入列表 */
  function save<T = any>(kind: string, value: T[]): void {
    storage.setKV(K(kind), value)
  }

  return { load, save }
}
