// ============================================================
// 房间活跃度组合式
// 提供「今日」粒度的房间记忆流数据：今天在每个房间记了几条、今天专注了几次。
// 数据源复用本地 storage（笔记 roomId + 创建/更新时间；专注会话 completedAt），不触云。
// 注意：computed 直接读非响应式 storage，按打开/切换时机重算（与镜我 roomNoteCount 同策略）。
// ============================================================

import { computed } from 'vue'
import { storage } from '../../engine/storage'
import { getLocalDateKey } from '../../utils/time'

function isToday(iso: string | null | undefined): boolean {
  if (!iso) return false
  return getLocalDateKey(new Date(iso)) === getLocalDateKey()
}

export function useRoomActivity() {
  /** 今日每房间记录数（排除归档/软删） */
  const notesTodayByRoom = computed<Record<string, number>>(() => {
    const map: Record<string, number> = {}
    for (const n of storage.getNotes() ?? []) {
      if (n.archived || n.deletedAt) continue
      if (!n.roomId) continue
      if (!(isToday(n.createdAt) || isToday(n.updatedAt))) continue
      map[n.roomId] = (map[n.roomId] ?? 0) + 1
    }
    return map
  })

  /** 今日专注次数（全局，专注会话不绑定房间） */
  const todayFocusCount = computed<number>(() => {
    const today = getLocalDateKey()
    return (storage.getSessions() ?? []).filter(
      (s) => s.status === 'completed' && s.completedAt?.startsWith(today),
    ).length
  })

  function roomNotesToday(roomId: string): number {
    return notesTodayByRoom.value[roomId] ?? 0
  }

  return { notesTodayByRoom, todayFocusCount, roomNotesToday }
}
