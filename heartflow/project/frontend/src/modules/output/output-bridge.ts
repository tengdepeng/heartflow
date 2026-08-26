// ============================================================
// Output 桥接层
// 极简透传：直接暴露 useOutputManager 和 usePublishPipeline 的原始 API
// ============================================================

import { computed, ref } from 'vue'
import { useOutputManager, usePublishPipeline } from './index'

export function useOutputBridge() {
  const manager = useOutputManager()
  const pipeline = usePublishPipeline(
    (id: string) => manager.get(id),
    (id: string, updates: Record<string, unknown>) => manager.update(id, updates),
  )
  const isLoading = ref(false)

  const summary = computed(() => {
    const records = manager.getAll()
    return {
      totalRecords: records.length,
      recentRecords: records.slice(0, 5),
    }
  })

  return {
    isLoading,
    summary,
    // 子模块直通
    manager,
    pipeline,
  }
}