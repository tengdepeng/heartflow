// ============================================================
// 访客模式 · 类型定义
// 蓝图定义：
//   访客模式允许他人以受限视角浏览殿堂
//   支持访问权限控制、会话管理、访客足迹
// ============================================================

/** 访客权限级别 */
export type VisitorPermission =
  | 'view:public'        // 查看公开空间
  | 'view:restricted'    // 查看受限空间（需授权）
  | 'interact:basic'     // 基础交互（点赞、留言）
  | 'interact:advanced'  // 高级交互（评论、协作）
  | 'data:read'          // 读取数据
  | 'data:export'        // 导出数据
  | 'admin:manage'       // 管理访客

/** 访客角色 */
export type VisitorRole = 'stranger' | 'guest' | 'friend' | 'family' | 'collaborator'

/** 访客角色对应的默认权限 */
export const VISITOR_ROLE_PERMISSIONS: Record<VisitorRole, VisitorPermission[]> = {
  stranger: ['view:public'],
  guest: ['view:public', 'view:restricted', 'interact:basic'],
  friend: ['view:public', 'view:restricted', 'interact:basic', 'interact:advanced', 'data:read'],
  family: ['view:public', 'view:restricted', 'interact:basic', 'interact:advanced', 'data:read', 'data:export'],
  collaborator: ['view:public', 'view:restricted', 'interact:basic', 'interact:advanced', 'data:read'],
}

export const VISITOR_ROLE_LABELS: Record<VisitorRole, string> = {
  stranger: '陌生人',
  guest: '访客',
  friend: '好友',
  family: '家人',
  collaborator: '协作者',
}

/** 访客会话 */
export interface VisitorSession {
  id: string
  /** 访客名称 */
  name: string
  /** 访客角色 */
  role: VisitorRole
  /** 访客头像 */
  avatar?: string
  /** 访问密钥（一次性/临时） */
  accessKey: string
  /** 允许访问的空间 ID 列表 */
  allowedRooms: string[]
  /** 授予的权限 */
  permissions: VisitorPermission[]
  /** 会话创建时间 */
  createdAt: string
  /** 会话过期时间 */
  expiresAt: string
  /** 最后活跃时间 */
  lastActiveAt: string
  /** 是否激活 */
  active: boolean
  /** 访问次数 */
  visitCount: number
}

/** 访客足迹 */
export interface VisitorFootprint {
  id: string
  sessionId: string
  visitorName: string
  /** 访问的房间 ID */
  roomId: string
  /** 访问时间 */
  timestamp: string
  /** 操作类型 */
  action: 'enter' | 'leave' | 'view' | 'interact' | 'export'
  /** 操作详情 */
  detail?: string
}

/** 访问邀请 */
export interface VisitorInvitation {
  id: string
  /** 邀请码 */
  code: string
  /** 邀请人 */
  hostName: string
  /** 邀请角色 */
  role: VisitorRole
  /** 允许访问的空间 */
  allowedRooms: string[]
  /** 是否一次性 */
  oneTime: boolean
  /** 最大使用次数 */
  maxUses: number
  /** 已使用次数 */
  usedCount: number
  /** 创建时间 */
  createdAt: string
  /** 过期时间 */
  expiresAt: string
  /** 是否有效 */
  valid: boolean
}

/** 访问控制规则 */
export interface AccessRule {
  id: string
  /** 规则名称 */
  name: string
  /** 目标空间 */
  targetRoom: string
  /** 需要的最低角色 */
  minRole: VisitorRole
  /** 需要的时间段（cron 表达式或自然语言） */
  timeWindow?: string
  /** 是否启用 */
  enabled: boolean
}

/** 访客统计 */
export interface VisitorStats {
  totalSessions: number
  activeSessions: number
  totalVisits: number
  uniqueVisitors: number
  byRole: { role: VisitorRole; label: string; count: number }[]
  byRoom: { roomId: string; count: number }[]
  recentFootprints: VisitorFootprint[]
}