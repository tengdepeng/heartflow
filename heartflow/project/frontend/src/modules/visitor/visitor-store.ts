// ============================================================
// 访客模式 · 状态（真实定义）
// ⚠️ 本文件由 index.ts 拆出：真实定义下沉到此处，index.ts 只做 re-export。
//    原因：bridge 从 barrel 取符号、barrel 又 re-export bridge，
//    构成 index ↔ bridge 循环依赖。新增符号请在此定义并由 index.ts 转发。
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'
import type { VisitorSession, VisitorFootprint, VisitorInvitation, AccessRule, VisitorRole, VisitorPermission, VisitorStats } from './types'
import { VISITOR_ROLE_PERMISSIONS, VISITOR_ROLE_LABELS } from './types'

const SESSIONS_KEY = 'hf:visitor_sessions'
const FOOTPRINTS_KEY = 'hf:visitor_footprints'
const INVITATIONS_KEY = 'hf:visitor_invitations'
const RULES_KEY = 'hf:visitor_rules'

// ---- 工具函数 ----

function generateAccessKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let key = ''
  for (let i = 0; i < 16; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return key
}

function generateInviteCode(): string {
  return `HF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
}

// ---- 持久化 ----

function loadSessions(): VisitorSession[] {
  try { return storage.getKV<VisitorSession[]>(SESSIONS_KEY, []) } catch { return [] }
}

function persistSessions(sessions: VisitorSession[]) {
  storage.setKV(SESSIONS_KEY, sessions)
}

function loadFootprints(): VisitorFootprint[] {
  try { return storage.getKV<VisitorFootprint[]>(FOOTPRINTS_KEY, []) } catch { return [] }
}

function persistFootprints(footprints: VisitorFootprint[]) {
  storage.setKV(FOOTPRINTS_KEY, footprints)
}

function loadInvitations(): VisitorInvitation[] {
  try { return storage.getKV<VisitorInvitation[]>(INVITATIONS_KEY, []) } catch { return [] }
}

function persistInvitations(invitations: VisitorInvitation[]) {
  storage.setKV(INVITATIONS_KEY, invitations)
}

function loadRules(): AccessRule[] {
  try { return storage.getKV<AccessRule[]>(RULES_KEY, []) } catch { return [] }
}

function persistRules(rules: AccessRule[]) {
  storage.setKV(RULES_KEY, rules)
}

// ---- 状态 ----

const sessions = ref<VisitorSession[]>(loadSessions())
const footprints = ref<VisitorFootprint[]>(loadFootprints())
const invitations = ref<VisitorInvitation[]>(loadInvitations())
const rules = ref<AccessRule[]>(loadRules())

export function useVisitor() {
  // ---- 会话管理 ----

  /** 创建访客会话 */
  function createSession(
    name: string,
    role: VisitorRole,
    allowedRooms: string[],
    durationHours: number = 24,
  ): VisitorSession {
    const now = new Date()
    const session: VisitorSession = {
      id: `visitor_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name,
      role,
      accessKey: generateAccessKey(),
      allowedRooms,
      permissions: [...VISITOR_ROLE_PERMISSIONS[role]],
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + durationHours * 3600000).toISOString(),
      lastActiveAt: now.toISOString(),
      active: true,
      visitCount: 0,
    }
    sessions.value = [...sessions.value, session]
    persistSessions(sessions.value)
    return session
  }

  /** 通过访问密钥验证访客 */
  function verifyAccess(accessKey: string): VisitorSession | null {
    const session = sessions.value.find(s => s.accessKey === accessKey && s.active)
    if (!session) return null
    if (new Date(session.expiresAt) < new Date()) {
      deactivateSession(session.id)
      return null
    }
    // 更新活跃时间
    session.lastActiveAt = new Date().toISOString()
    session.visitCount++
    persistSessions(sessions.value)
    return session
  }

  /** 停用会话 */
  function deactivateSession(sessionId: string): boolean {
    const session = sessions.value.find(s => s.id === sessionId)
    if (!session) return false
    session.active = false
    persistSessions(sessions.value)
    return true
  }

  /** 删除会话 */
  function removeSession(sessionId: string): boolean {
    const idx = sessions.value.findIndex(s => s.id === sessionId)
    if (idx === -1) return false
    sessions.value = sessions.value.filter(s => s.id !== sessionId)
    // 同时清理足迹
    footprints.value = footprints.value.filter(f => f.sessionId !== sessionId)
    persistSessions(sessions.value)
    persistFootprints(footprints.value)
    return true
  }

  /** 检查访客是否有权限访问某空间 */
  function canAccess(sessionId: string, roomId: string): boolean {
    const session = sessions.value.find(s => s.id === sessionId)
    if (!session || !session.active) return false
    return session.allowedRooms.includes(roomId) || session.allowedRooms.includes('*')
  }

  /** 检查访客是否有某权限 */
  function hasPermission(sessionId: string, permission: VisitorPermission): boolean {
    const session = sessions.value.find(s => s.id === sessionId)
    if (!session || !session.active) return false
    return session.permissions.includes(permission)
  }

  // ---- 足迹追踪 ----

  /** 记录访客足迹 */
  function trackFootprint(
    sessionId: string,
    roomId: string,
    action: VisitorFootprint['action'],
    detail?: string,
  ): VisitorFootprint | null {
    const session = sessions.value.find(s => s.id === sessionId)
    if (!session) return null

    const footprint: VisitorFootprint = {
      id: `fp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      sessionId,
      visitorName: session.name,
      roomId,
      timestamp: new Date().toISOString(),
      action,
      detail,
    }
    footprints.value = [...footprints.value, footprint]
    persistFootprints(footprints.value)
    return footprint
  }

  // ---- 邀请管理 ----

  /** 创建邀请码 */
  function createInvitation(
    role: VisitorRole,
    allowedRooms: string[],
    options?: { oneTime?: boolean; maxUses?: number; expiresInHours?: number },
  ): VisitorInvitation {
    const now = new Date()
    const invitation: VisitorInvitation = {
      id: `invite_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      code: generateInviteCode(),
      hostName: '殿堂主人',
      role,
      allowedRooms,
      oneTime: options?.oneTime ?? false,
      maxUses: options?.maxUses ?? 1,
      usedCount: 0,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + (options?.expiresInHours ?? 24) * 3600000).toISOString(),
      valid: true,
    }
    invitations.value = [...invitations.value, invitation]
    persistInvitations(invitations.value)
    return invitation
  }

  /** 通过邀请码接受访客 */
  function acceptInvitation(code: string, visitorName: string): VisitorSession | null {
    const invitation = invitations.value.find(i => i.code === code && i.valid)
    if (!invitation) return null
    if (new Date(invitation.expiresAt) < new Date()) {
      invitation.valid = false
      persistInvitations(invitations.value)
      return null
    }

    invitation.usedCount++
    if (invitation.oneTime || invitation.usedCount >= invitation.maxUses) {
      invitation.valid = false
    }
    persistInvitations(invitations.value)

    return createSession(visitorName, invitation.role, invitation.allowedRooms)
  }

  /** 撤销邀请 */
  function revokeInvitation(invitationId: string): boolean {
    const invitation = invitations.value.find(i => i.id === invitationId)
    if (!invitation) return false
    invitation.valid = false
    persistInvitations(invitations.value)
    return true
  }

  // ---- 访问控制 ----

  /** 添加访问规则 */
  function addRule(rule: Omit<AccessRule, 'id'>): AccessRule {
    const entry: AccessRule = {
      id: `rule_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      ...rule,
    }
    rules.value = [...rules.value, entry]
    persistRules(rules.value)
    return entry
  }

  /** 移除访问规则 */
  function removeRule(ruleId: string): boolean {
    const idx = rules.value.findIndex(r => r.id === ruleId)
    if (idx === -1) return false
    rules.value = rules.value.filter(r => r.id !== ruleId)
    persistRules(rules.value)
    return true
  }

  /** 切换规则启用状态 */
  function toggleRule(ruleId: string): boolean {
    const rule = rules.value.find(r => r.id === ruleId)
    if (!rule) return false
    rule.enabled = !rule.enabled
    persistRules(rules.value)
    return rule.enabled
  }

  // ---- 统计 ----

  const activeSessions = computed(() => sessions.value.filter(s => s.active))

  const visitorStats = computed<VisitorStats>(() => {
    const byRole: VisitorStats['byRole'] = []
    const roleCounts = new Map<VisitorRole, number>()
    for (const s of sessions.value) {
      roleCounts.set(s.role, (roleCounts.get(s.role) || 0) + 1)
    }
    for (const [role, count] of roleCounts) {
      byRole.push({ role, label: VISITOR_ROLE_LABELS[role], count })
    }

    const byRoom: VisitorStats['byRoom'] = []
    const roomCounts = new Map<string, number>()
    for (const f of footprints.value) {
      roomCounts.set(f.roomId, (roomCounts.get(f.roomId) || 0) + 1)
    }
    for (const [roomId, count] of roomCounts) {
      byRoom.push({ roomId, count })
    }

    const allVisitors = new Set(sessions.value.map(s => s.name))

    return {
      totalSessions: sessions.value.length,
      activeSessions: activeSessions.value.length,
      totalVisits: sessions.value.reduce((s, v) => s + v.visitCount, 0),
      uniqueVisitors: allVisitors.size,
      byRole,
      byRoom: byRoom.sort((a, b) => b.count - a.count),
      recentFootprints: [...footprints.value].sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      ).slice(0, 10),
    }
  })

  /** 清理过期会话 */
  function cleanup() {
    const now = new Date()
    sessions.value = sessions.value.filter(s => {
      if (new Date(s.expiresAt) < now) {
        s.active = false
        return false
      }
      return true
    })
    invitations.value = invitations.value.filter(i => {
      if (new Date(i.expiresAt) < now) {
        i.valid = false
        return false
      }
      return true
    })
    persistSessions(sessions.value)
    persistInvitations(invitations.value)
  }

  return {
    sessions,
    activeSessions,
    footprints,
    invitations,
    rules,
    visitorStats,
    createSession,
    verifyAccess,
    deactivateSession,
    removeSession,
    canAccess,
    hasPermission,
    trackFootprint,
    createInvitation,
    acceptInvitation,
    revokeInvitation,
    addRule,
    removeRule,
    toggleRule,
    cleanup,
  }
}
