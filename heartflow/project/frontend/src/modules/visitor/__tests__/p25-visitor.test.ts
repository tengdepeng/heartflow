// ============================================================
// P25-7 访客模式 · 会话/权限/邀请/足迹测试套件
// 覆盖：会话CRUD / 角色权限 / 访问控制 / 足迹追踪 /
//       邀请管理 / 访问规则 / 统计计算 / 清理 / 持久化
// ============================================================

import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { VisitorRole } from '../types'
import { VISITOR_ROLE_PERMISSIONS, VISITOR_ROLE_LABELS } from '../types'

// ---- 存储 Mock ----
const { kvStore, clearKV } = vi.hoisted(() => {
  const kvStore = new Map<string, any>()
  return { kvStore, clearKV: () => kvStore.clear() }
})

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: vi.fn((key: string, defaultValue: any) => {
      return kvStore.has(key) ? kvStore.get(key) : defaultValue
    }),
    setKV: vi.fn((key: string, value: any) => {
      kvStore.set(key, value)
    }),
  },
}))

// ---- 主测试套件 ----

describe('P25-7 访客模式', () => {
  let useVisitor: any

  beforeEach(async () => {
    clearKV()
    vi.resetModules()
    const mod = await import('../index')
    useVisitor = mod.useVisitor
    await Promise.resolve()
  })

  // ============================================================
  // 常量
  // ============================================================
  describe('常量', () => {
    it('VISITOR_ROLE_LABELS 覆盖 5 种角色', () => {
      const roles: VisitorRole[] = ['stranger', 'guest', 'friend', 'family', 'collaborator']
      for (const role of roles) {
        expect(VISITOR_ROLE_LABELS[role]).toBeDefined()
        expect(typeof VISITOR_ROLE_LABELS[role]).toBe('string')
      }
    })

    it('VISITOR_ROLE_PERMISSIONS 每种角色都有权限数组', () => {
      const roles: VisitorRole[] = ['stranger', 'guest', 'friend', 'family', 'collaborator']
      for (const role of roles) {
        expect(Array.isArray(VISITOR_ROLE_PERMISSIONS[role])).toBe(true)
        expect(VISITOR_ROLE_PERMISSIONS[role].length).toBeGreaterThan(0)
      }
    })

    it('stranger 只有 view:public 权限', () => {
      expect(VISITOR_ROLE_PERMISSIONS.stranger).toEqual(['view:public'])
    })

    it('guest 包含 view:public, view:restricted, interact:basic', () => {
      expect(VISITOR_ROLE_PERMISSIONS.guest).toContain('view:public')
      expect(VISITOR_ROLE_PERMISSIONS.guest).toContain('view:restricted')
      expect(VISITOR_ROLE_PERMISSIONS.guest).toContain('interact:basic')
    })
  })

  // ============================================================
  // 初始状态
  // ============================================================
  describe('初始状态', () => {
    it('空会话列表', () => {
      const { sessions } = useVisitor()
      expect(sessions.value).toEqual([])
    })

    it('空活跃会话', () => {
      const { activeSessions } = useVisitor()
      expect(activeSessions.value).toEqual([])
    })

    it('空足迹列表', () => {
      const { footprints } = useVisitor()
      expect(footprints.value).toEqual([])
    })

    it('空邀请列表', () => {
      const { invitations } = useVisitor()
      expect(invitations.value).toEqual([])
    })

    it('空规则列表', () => {
      const { rules } = useVisitor()
      expect(rules.value).toEqual([])
    })

    it('visitorStats 初始统计为零', () => {
      const { visitorStats } = useVisitor()
      expect(visitorStats.value.totalSessions).toBe(0)
      expect(visitorStats.value.activeSessions).toBe(0)
      expect(visitorStats.value.totalVisits).toBe(0)
      expect(visitorStats.value.uniqueVisitors).toBe(0)
    })
  })

  // ============================================================
  // 会话管理
  // ============================================================
  describe('会话管理', () => {
    it('createSession 创建会话', () => {
      const { createSession, sessions } = useVisitor()
      const session = createSession('测试访客', 'guest', ['room1', 'room2'])
      expect(session.id).toMatch(/^visitor_/)
      expect(session.name).toBe('测试访客')
      expect(session.role).toBe('guest')
      expect(session.allowedRooms).toEqual(['room1', 'room2'])
      expect(session.accessKey).toBeDefined()
      expect(session.accessKey).toHaveLength(16)
      expect(session.active).toBe(true)
      expect(session.visitCount).toBe(0)
      expect(session.createdAt).toBeDefined()
      expect(session.expiresAt).toBeDefined()
      expect(sessions.value).toHaveLength(1)
    })

    it('createSession 默认有效期 24 小时', () => {
      const { createSession } = useVisitor()
      const before = new Date()
      const session = createSession('访客', 'guest', ['room1'])
      const expiresAt = new Date(session.expiresAt)
      const diffHours = (expiresAt.getTime() - before.getTime()) / 3600000
      expect(diffHours).toBeCloseTo(24, 0)
    })

    it('createSession 自定义有效期', () => {
      const { createSession } = useVisitor()
      const session = createSession('访客', 'guest', ['room1'], 48)
      const createdAt = new Date(session.createdAt)
      const expiresAt = new Date(session.expiresAt)
      const diffHours = (expiresAt.getTime() - createdAt.getTime()) / 3600000
      expect(diffHours).toBeCloseTo(48, 0)
    })

    it('createSession 持久化', () => {
      const { createSession } = useVisitor()
      createSession('访客', 'guest', ['room1'])
      const saved = kvStore.get('hf:visitor_sessions')
      expect(saved).toHaveLength(1)
      expect(saved[0].name).toBe('访客')
    })

    it('verifyAccess 通过 accessKey 验证', () => {
      const { createSession, verifyAccess } = useVisitor()
      const session = createSession('访客', 'guest', ['room1'])
      const result = verifyAccess(session.accessKey)
      expect(result).not.toBeNull()
      expect(result!.id).toBe(session.id)
    })

    it('verifyAccess 无效 key 返回 null', () => {
      const { verifyAccess } = useVisitor()
      expect(verifyAccess('invalid_key')).toBeNull()
    })

    it('verifyAccess 增加 visitCount', () => {
      const { createSession, verifyAccess, sessions } = useVisitor()
      const session = createSession('访客', 'guest', ['room1'])
      verifyAccess(session.accessKey)
      expect(sessions.value[0].visitCount).toBe(1)
    })

    it('verifyAccess 更新 lastActiveAt 为有效时间', () => {
      const { createSession, verifyAccess, sessions } = useVisitor()
      const session = createSession('访客', 'guest', ['room1'])
      verifyAccess(session.accessKey)
      expect(sessions.value[0].lastActiveAt).toBeDefined()
      expect(new Date(sessions.value[0].lastActiveAt).getTime()).toBeGreaterThan(0)
    })

    it('verifyAccess 过期会话自动停用', () => {
      const { createSession, verifyAccess, sessions } = useVisitor()
      const session = createSession('访客', 'guest', ['room1'])
      // 手动设置过期
      sessions.value[0].expiresAt = new Date(Date.now() - 1000).toISOString()
      const result = verifyAccess(session.accessKey)
      expect(result).toBeNull()
      expect(sessions.value[0].active).toBe(false)
    })

    it('deactivateSession 停用会话', () => {
      const { createSession, deactivateSession, sessions, activeSessions } = useVisitor()
      const session = createSession('访客', 'guest', ['room1'])
      expect(sessions.value[0].active).toBe(true)
      const result = deactivateSession(session.id)
      expect(result).toBe(true)
      expect(sessions.value[0].active).toBe(false)
      expect(activeSessions.value).toHaveLength(0)
    })

    it('deactivateSession 不存在的 id 返回 false', () => {
      const { deactivateSession } = useVisitor()
      expect(deactivateSession('nonexistent')).toBe(false)
    })

    it('removeSession 删除会话', () => {
      const { createSession, removeSession, sessions } = useVisitor()
      const session = createSession('访客', 'guest', ['room1'])
      expect(sessions.value).toHaveLength(1)
      const result = removeSession(session.id)
      expect(result).toBe(true)
      expect(sessions.value).toHaveLength(0)
    })

    it('removeSession 清理关联足迹', () => {
      const { createSession, trackFootprint, removeSession, footprints } = useVisitor()
      const session = createSession('访客', 'guest', ['room1'])
      trackFootprint(session.id, 'room1', 'enter')
      expect(footprints.value).toHaveLength(1)
      removeSession(session.id)
      expect(footprints.value).toHaveLength(0)
    })

    it('removeSession 不存在的 id 返回 false', () => {
      const { removeSession } = useVisitor()
      expect(removeSession('nonexistent')).toBe(false)
    })
  })

  // ============================================================
  // 访问控制
  // ============================================================
  describe('访问控制', () => {
    it('canAccess 允许访问已授权房间', () => {
      const { createSession, canAccess } = useVisitor()
      const session = createSession('访客', 'guest', ['room1', 'room2'])
      expect(canAccess(session.id, 'room1')).toBe(true)
      expect(canAccess(session.id, 'room2')).toBe(true)
    })

    it('canAccess 拒绝未授权房间', () => {
      const { createSession, canAccess } = useVisitor()
      const session = createSession('访客', 'guest', ['room1'])
      expect(canAccess(session.id, 'room2')).toBe(false)
    })

    it('canAccess 通配符 * 允许所有房间', () => {
      const { createSession, canAccess } = useVisitor()
      const session = createSession('管理员', 'collaborator', ['*'])
      expect(canAccess(session.id, 'any-room')).toBe(true)
      expect(canAccess(session.id, 'another-room')).toBe(true)
    })

    it('canAccess 不存在的会话返回 false', () => {
      const { canAccess } = useVisitor()
      expect(canAccess('nonexistent', 'room1')).toBe(false)
    })

    it('canAccess 已停用会话返回 false', () => {
      const { createSession, deactivateSession, canAccess } = useVisitor()
      const session = createSession('访客', 'guest', ['room1'])
      deactivateSession(session.id)
      expect(canAccess(session.id, 'room1')).toBe(false)
    })

    it('hasPermission 检查角色权限', () => {
      const { createSession, hasPermission } = useVisitor()
      const session = createSession('好友', 'friend', ['room1'])
      expect(hasPermission(session.id, 'view:public')).toBe(true)
      expect(hasPermission(session.id, 'interact:basic')).toBe(true)
      expect(hasPermission(session.id, 'data:read')).toBe(true)
    })

    it('hasPermission 拒绝无权限操作', () => {
      const { createSession, hasPermission } = useVisitor()
      const session = createSession('访客', 'guest', ['room1'])
      expect(hasPermission(session.id, 'data:export')).toBe(false)
    })

    it('hasPermission 不存在的会话返回 false', () => {
      const { hasPermission } = useVisitor()
      expect(hasPermission('nonexistent', 'view:public')).toBe(false)
    })
  })

  // ============================================================
  // 足迹追踪
  // ============================================================
  describe('足迹追踪', () => {
    it('trackFootprint 记录进入足迹', () => {
      const { createSession, trackFootprint, footprints } = useVisitor()
      const session = createSession('访客', 'guest', ['room1'])
      const fp = trackFootprint(session.id, 'room1', 'enter')
      expect(fp).not.toBeNull()
      expect(fp!.id).toMatch(/^fp_/)
      expect(fp!.sessionId).toBe(session.id)
      expect(fp!.roomId).toBe('room1')
      expect(fp!.action).toBe('enter')
      expect(fp!.timestamp).toBeDefined()
      expect(footprints.value).toHaveLength(1)
    })

    it('trackFootprint 记录交互足迹', () => {
      const { createSession, trackFootprint, footprints } = useVisitor()
      const session = createSession('访客', 'guest', ['room1'])
      const fp = trackFootprint(session.id, 'room1', 'interact', '点击了按钮')
      expect(fp!.action).toBe('interact')
      expect(fp!.detail).toBe('点击了按钮')
      expect(footprints.value).toHaveLength(1)
    })

    it('trackFootprint 不存在的会话返回 null', () => {
      const { trackFootprint } = useVisitor()
      expect(trackFootprint('nonexistent', 'room1', 'enter')).toBeNull()
    })

    it('trackFootprint 持久化', () => {
      const { createSession, trackFootprint } = useVisitor()
      const session = createSession('访客', 'guest', ['room1'])
      trackFootprint(session.id, 'room1', 'enter')
      const saved = kvStore.get('hf:visitor_footprints')
      expect(saved).toHaveLength(1)
    })
  })

  // ============================================================
  // 邀请管理
  // ============================================================
  describe('邀请管理', () => {
    it('createInvitation 创建邀请码', () => {
      const { createInvitation, invitations } = useVisitor()
      const invite = createInvitation('guest', ['room1', 'room2'])
      expect(invite.id).toMatch(/^invite_/)
      expect(invite.code).toMatch(/^HF-/)
      expect(invite.role).toBe('guest')
      expect(invite.allowedRooms).toEqual(['room1', 'room2'])
      expect(invite.oneTime).toBe(false) // 默认非一次性
      expect(invite.maxUses).toBe(1)
      expect(invite.usedCount).toBe(0)
      expect(invite.valid).toBe(true)
      expect(invite.createdAt).toBeDefined()
      expect(invite.expiresAt).toBeDefined()
      expect(invitations.value).toHaveLength(1)
    })

    it('createInvitation 自定义选项', () => {
      const { createInvitation } = useVisitor()
      const invite = createInvitation('friend', ['room1'], {
        oneTime: false,
        maxUses: 5,
        expiresInHours: 48,
      })
      expect(invite.oneTime).toBe(false)
      expect(invite.maxUses).toBe(5)
    })

    it('createInvitation 持久化', () => {
      const { createInvitation } = useVisitor()
      createInvitation('guest', ['room1'])
      const saved = kvStore.get('hf:visitor_invitations')
      expect(saved).toHaveLength(1)
    })

    it('acceptInvitation 通过邀请码接受', () => {
      const { createInvitation, acceptInvitation, sessions } = useVisitor()
      const invite = createInvitation('guest', ['room1'])
      const session = acceptInvitation(invite.code, '新访客')
      expect(session).not.toBeNull()
      expect(session!.name).toBe('新访客')
      expect(session!.role).toBe('guest')
      expect(sessions.value).toHaveLength(1)
    })

    it('acceptInvitation 增加 usedCount', () => {
      const { createInvitation, acceptInvitation, invitations } = useVisitor()
      const invite = createInvitation('guest', ['room1'], { maxUses: 3 })
      acceptInvitation(invite.code, '访客1')
      expect(invitations.value[0].usedCount).toBe(1)
    })

    it('acceptInvitation 达到最大使用次数后失效', () => {
      const { createInvitation, acceptInvitation, invitations } = useVisitor()
      const invite = createInvitation('guest', ['room1'], { maxUses: 2 })
      acceptInvitation(invite.code, '访客1')
      acceptInvitation(invite.code, '访客2')
      expect(invitations.value[0].valid).toBe(false)
      expect(invitations.value[0].usedCount).toBe(2)
    })

    it('acceptInvitation 无效邀请码返回 null', () => {
      const { acceptInvitation } = useVisitor()
      expect(acceptInvitation('INVALID-CODE', '访客')).toBeNull()
    })

    it('acceptInvitation 已撤销邀请返回 null', () => {
      const { createInvitation, revokeInvitation, acceptInvitation } = useVisitor()
      const invite = createInvitation('guest', ['room1'])
      revokeInvitation(invite.id)
      expect(acceptInvitation(invite.code, '访客')).toBeNull()
    })

    it('revokeInvitation 撤销邀请', () => {
      const { createInvitation, revokeInvitation, invitations } = useVisitor()
      const invite = createInvitation('guest', ['room1'])
      expect(invitations.value[0].valid).toBe(true)
      const result = revokeInvitation(invite.id)
      expect(result).toBe(true)
      expect(invitations.value[0].valid).toBe(false)
    })

    it('revokeInvitation 不存在的 id 返回 false', () => {
      const { revokeInvitation } = useVisitor()
      expect(revokeInvitation('nonexistent')).toBe(false)
    })
  })

  // ============================================================
  // 访问规则
  // ============================================================
  describe('访问规则', () => {
    it('addRule 添加规则', () => {
      const { addRule, rules } = useVisitor()
      const rule = addRule({
        name: '限制规则',
        targetRoom: 'secret-room',
        minRole: 'friend',
        enabled: true,
      })
      expect(rule.id).toMatch(/^rule_/)
      expect(rule.name).toBe('限制规则')
      expect(rule.targetRoom).toBe('secret-room')
      expect(rule.minRole).toBe('friend')
      expect(rule.enabled).toBe(true)
      expect(rules.value).toHaveLength(1)
    })

    it('addRule 持久化', () => {
      const { addRule } = useVisitor()
      addRule({ name: '规则', targetRoom: 'r1', minRole: 'guest', enabled: true })
      const saved = kvStore.get('hf:visitor_rules')
      expect(saved).toHaveLength(1)
    })

    it('removeRule 移除规则', () => {
      const { addRule, removeRule, rules } = useVisitor()
      const rule = addRule({ name: '规则', targetRoom: 'r1', minRole: 'guest', enabled: true })
      expect(rules.value).toHaveLength(1)
      const result = removeRule(rule.id)
      expect(result).toBe(true)
      expect(rules.value).toHaveLength(0)
    })

    it('removeRule 不存在的 id 返回 false', () => {
      const { removeRule } = useVisitor()
      expect(removeRule('nonexistent')).toBe(false)
    })

    it('toggleRule 切换启用/禁用', () => {
      const { addRule, toggleRule, rules } = useVisitor()
      const rule = addRule({ name: '规则', targetRoom: 'r1', minRole: 'guest', enabled: true })
      expect(rules.value[0].enabled).toBe(true)

      const result = toggleRule(rule.id)
      expect(result).toBe(false)
      expect(rules.value[0].enabled).toBe(false)
    })

    it('toggleRule 不存在的 id 返回 false', () => {
      const { toggleRule } = useVisitor()
      expect(toggleRule('nonexistent')).toBe(false)
    })
  })

  // ============================================================
  // 统计
  // ============================================================
  describe('统计', () => {
    it('visitorStats.totalSessions 正确统计', () => {
      const { createSession, visitorStats } = useVisitor()
      createSession('访客1', 'guest', ['room1'])
      createSession('访客2', 'friend', ['room1'])
      expect(visitorStats.value.totalSessions).toBe(2)
    })

    it('visitorStats.activeSessions 正确统计', () => {
      const { createSession, deactivateSession, visitorStats } = useVisitor()
      const s1 = createSession('访客1', 'guest', ['room1'])
      createSession('访客2', 'friend', ['room1'])
      deactivateSession(s1.id)
      expect(visitorStats.value.activeSessions).toBe(1)
    })

    it('visitorStats.totalVisits 正确统计', () => {
      const { createSession, verifyAccess, visitorStats } = useVisitor()
      const s1 = createSession('访客1', 'guest', ['room1'])
      verifyAccess(s1.accessKey)
      verifyAccess(s1.accessKey)
      expect(visitorStats.value.totalVisits).toBe(2)
    })

    it('visitorStats.byRole 按角色统计', () => {
      const { createSession, visitorStats } = useVisitor()
      createSession('访客1', 'guest', ['room1'])
      createSession('访客2', 'guest', ['room1'])
      createSession('好友1', 'friend', ['room1'])
      const byRole = visitorStats.value.byRole
      expect(byRole.find((r: any) => r.role === 'guest').count).toBe(2)
      expect(byRole.find((r: any) => r.role === 'friend').count).toBe(1)
    })

    it('recentFootprints 最多返回 10 条', () => {
      const { createSession, trackFootprint, visitorStats } = useVisitor()
      const session = createSession('访客', 'guest', ['room1'])
      for (let i = 0; i < 15; i++) {
        trackFootprint(session.id, `room${i % 3}`, 'view')
      }
      expect(visitorStats.value.recentFootprints.length).toBeLessThanOrEqual(10)
    })
  })

  // ============================================================
  // 清理
  // ============================================================
  describe('清理', () => {
    it('cleanup 移除过期会话', () => {
      const { createSession, cleanup, sessions } = useVisitor()
      createSession('访客', 'guest', ['room1'])
      // 手动设置过期
      sessions.value[0].expiresAt = new Date(Date.now() - 1000).toISOString()
      sessions.value[0].active = true

      cleanup()
      expect(sessions.value).toHaveLength(0)
    })

    it('cleanup 移除过期邀请', () => {
      const { createInvitation, cleanup, invitations } = useVisitor()
      createInvitation('guest', ['room1'])
      // 手动设置过期
      invitations.value[0].expiresAt = new Date(Date.now() - 1000).toISOString()
      invitations.value[0].valid = true

      cleanup()
      expect(invitations.value).toHaveLength(0)
    })
  })

  // ============================================================
  // 完整工作流
  // ============================================================
  describe('完整工作流', () => {
    it('创建邀请 → 接受 → 访问 → 足迹 完整流程', () => {
      const { createInvitation, acceptInvitation, verifyAccess, canAccess, trackFootprint, visitorStats } = useVisitor()

      // 创建邀请
      const invite = createInvitation('friend', ['garden', 'library'])
      expect(invite.valid).toBe(true)

      // 接受邀请
      const session = acceptInvitation(invite.code, '小明')
      expect(session).not.toBeNull()
      expect(session!.name).toBe('小明')

      // 验证访问
      const verified = verifyAccess(session!.accessKey)
      expect(verified).not.toBeNull()

      // 权限检查
      expect(canAccess(session!.id, 'garden')).toBe(true)
      expect(canAccess(session!.id, 'secret')).toBe(false)

      // 足迹追踪
      trackFootprint(session!.id, 'garden', 'enter')
      trackFootprint(session!.id, 'garden', 'view', '查看花园')
      trackFootprint(session!.id, 'library', 'interact', '留言')

      // 统计验证
      const stats = visitorStats.value
      expect(stats.totalSessions).toBe(1)
      expect(stats.activeSessions).toBe(1)
      expect(stats.totalVisits).toBe(1)
      expect(stats.recentFootprints).toHaveLength(3)
    })

    it('规则管理完整流程', () => {
      const { addRule, toggleRule, removeRule, rules } = useVisitor()

      const rule = addRule({ name: '夜间限制', targetRoom: 'garden', minRole: 'friend', enabled: true })
      expect(rules.value).toHaveLength(1)

      toggleRule(rule.id)
      expect(rules.value[0].enabled).toBe(false)

      toggleRule(rule.id)
      expect(rules.value[0].enabled).toBe(true)

      removeRule(rule.id)
      expect(rules.value).toHaveLength(0)
    })
  })
})