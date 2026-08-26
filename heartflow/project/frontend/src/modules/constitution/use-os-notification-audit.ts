// ============================================================
// A3-EXT-1/3 · OS 通知审计 · 响应式组合式
// 暴露本地审计历史 + 宪法第5条状态，供合规证明面板渲染。
// 纯本地（storage.getKV），不触外网。
// ============================================================

import { ref, computed } from 'vue'
import {
  getOsNotificationAudit,
  getOsNotificationAuditSummary,
  clearOsNotificationAudit,
  type OsNotificationAuditEntry,
} from '../../engine/os-notification-audit'
import { isOsNotificationBlocked } from '../../engine/compliance-gate'

export function useOsNotificationAudit() {
  const entries = ref<OsNotificationAuditEntry[]>([])
  const reload = () => {
    entries.value = getOsNotificationAudit().slice().reverse() // 新→旧
  }
  reload()

  const summary = computed(() => getOsNotificationAuditSummary())

  // 宪法第5条门控（当前运行时态）：false = 允许发射；true = 全阻断
  const constitutionBlocked = computed(() => isOsNotificationBlocked())

  const lastDelivered = computed(() =>
    entries.value.find(e => e.delivered)?.at ?? null,
  )
  const lastBlocked = computed(() =>
    entries.value.find(e => e.blocked)?.at ?? null,
  )

  function clear(): void {
    clearOsNotificationAudit()
    reload()
  }

  return {
    entries,
    summary,
    constitutionBlocked,
    lastDelivered,
    lastBlocked,
    reload,
    clear,
  }
}
