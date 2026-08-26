// ============================================================
// Visitor 桥接层
// 聚合访客模式状态，提供视图层消费接口
// ============================================================

import { computed, ref } from 'vue'
import { useVisitor } from './index'
import type { VisitorSession, VisitorInvitation, AccessRule, VisitorRole, VisitorPermission, VisitorStats } from './index'

export interface VisitorSummary {
  activeSessions: number
  totalSessions: number
  pendingInvitations: number
  totalFootprints: number
  activeRules: number
  mostActiveRoom: string | null
  lastVisitAt: string | null
}

export interface SessionInfo {
  session: VisitorSession
  footprintCount: number
  isExpired: boolean
  remainingTime: string | null
}

export function useVisitorBridge() {
  const visitor = useVisitor()
  const isLoading = ref(false)

  // ---- 聚合状态 ----

  const summary = computed<VisitorSummary>(() => {
    const stats: VisitorStats = visitor.visitorStats.value
    const activeSessions = visitor.activeSessions.value

    // 找到最活跃的房间
    const roomVisitCounts = new Map<string, number>()
    for (const fp of visitor.footprints.value) {
      roomVisitCounts.set(fp.roomId, (roomVisitCounts.get(fp.roomId) ?? 0) + 1)
    }
    let mostActiveRoom: string | null = null
    let maxVisits = 0
    for (const [roomId, count] of roomVisitCounts) {
      if (count > maxVisits) {
        maxVisits = count
        mostActiveRoom = roomId
      }
    }

    // 最近访问时间
    const lastVisitAt = stats.recentFootprints.length > 0
      ? stats.recentFootprints[0].timestamp
      : null

    return {
      activeSessions: activeSessions.length,
      totalSessions: visitor.sessions.value.length,
      pendingInvitations: visitor.invitations.value.filter(i => i.valid).length,
      totalFootprints: visitor.footprints.value.length,
      activeRules: visitor.rules.value.filter(r => r.enabled).length,
      mostActiveRoom,
      lastVisitAt,
    }
  })

  const sessionInfos = computed<SessionInfo[]>(() => {
    const now = Date.now()
    return visitor.activeSessions.value.map(session => {
      const footprintCount = visitor.footprints.value.filter(
        fp => fp.sessionId === session.id,
      ).length
      const isExpired = session.expiresAt ? new Date(session.expiresAt).getTime() < now : false
      const remainingTime = session.expiresAt
        ? (() => {
            const remaining = new Date(session.expiresAt).getTime() - now
            if (remaining <= 0) return null
            const hours = Math.floor(remaining / 3600000)
            const minutes = Math.floor((remaining % 3600000) / 60000)
            return `${hours}小时${minutes}分钟`
          })()
        : null

      return { session, footprintCount, isExpired, remainingTime }
    })
  })

  // ---- 操作 ----

  async function initialize(): Promise<void> {
    isLoading.value = true
    try {
      visitor.cleanup()
      await Promise.resolve()
    } finally {
      isLoading.value = false
    }
  }

  function createSession(
    name: string,
    role: VisitorRole,
    allowedRooms: string[],
    durationHours?: number,
  ): VisitorSession {
    return visitor.createSession(name, role, allowedRooms, durationHours)
  }

  function verifyAccess(accessKey: string): VisitorSession | null {
    return visitor.verifyAccess(accessKey)
  }

  function deactivateSession(id: string): boolean {
    return visitor.deactivateSession(id)
  }

  function removeSession(id: string): boolean {
    return visitor.removeSession(id)
  }

  function canAccess(sessionId: string, roomId: string): boolean {
    return visitor.canAccess(sessionId, roomId)
  }

  function hasPermission(sessionId: string, permission: VisitorPermission): boolean {
    return visitor.hasPermission(sessionId, permission)
  }

  function createInvitation(
    role: VisitorRole,
    allowedRooms: string[],
    options?: { oneTime?: boolean; maxUses?: number; expiresInHours?: number },
  ): VisitorInvitation {
    return visitor.createInvitation(role, allowedRooms, options)
  }

  function acceptInvitation(code: string, name: string): VisitorSession | null {
    return visitor.acceptInvitation(code, name)
  }

  function revokeInvitation(id: string): boolean {
    return visitor.revokeInvitation(id)
  }

  function addRule(rule: Omit<AccessRule, 'id'>): AccessRule {
    return visitor.addRule(rule)
  }

  function removeRule(ruleId: string): boolean {
    return visitor.removeRule(ruleId)
  }

  function toggleRule(ruleId: string): boolean {
    return visitor.toggleRule(ruleId)
  }

  return {
    // 状态
    sessions: visitor.sessions,
    activeSessions: visitor.activeSessions,
    footprints: visitor.footprints,
    invitations: visitor.invitations,
    rules: visitor.rules,
    isLoading,
    summary,
    sessionInfos,
    visitorStats: visitor.visitorStats,
    // 操作
    initialize,
    createSession,
    verifyAccess,
    deactivateSession,
    removeSession,
    canAccess,
    hasPermission,
    createInvitation,
    acceptInvitation,
    revokeInvitation,
    addRule,
    removeRule,
    toggleRule,
    // 子模块直通
    visitor,
  }
}