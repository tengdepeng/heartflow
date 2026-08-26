// ============================================================
// 自动化工坊流程数据层（AutomationWorkshop.vue）
// 替代视图内裸的 storage.getKV('hf:automation_flows') / storage.setKV 调用。
// 暴露模块级单例 ref，跨消费方共享同一份已保存流程列表。
// ============================================================

import { ref } from 'vue'
import { storage } from '../../engine/storage'
import type { SavedFlow } from '../../types/automation'

export type { SavedFlow } from '../../types/automation'

// 必须保留视图原本使用的存储键原值
const KEY = 'hf:automation_flows'

// 模块级单例：所有消费方共享同一份流程列表
const flows = ref<SavedFlow[]>([])

/**
 * 自动化工坊流程数据层：读取 / 写入 / 增删
 */
export function useAutomationFlows() {
  /** 从存储载入已保存流程 */
  function load(): void {
    try {
      flows.value = storage.getKV<SavedFlow[]>(KEY, [])
    } catch {
      flows.value = []
    }
  }

  /** 整体持久化当前流程列表 */
  function save(): void {
    storage.setKV(KEY, flows.value)
  }

  /** 追加一条流程到列表头部 */
  function add(flow: SavedFlow): void {
    flows.value = [flow, ...flows.value]
    save()
  }

  /** 删除指定 id 的流程 */
  function remove(id: string): void {
    flows.value = flows.value.filter((f) => f.id !== id)
    save()
  }

  return { flows, load, save, add, remove }
}
