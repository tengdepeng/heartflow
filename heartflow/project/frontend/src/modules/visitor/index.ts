// ⚠️ 本文件是纯 barrel（模块出口）：真实状态定义已下沉 ./visitor-store。
//    barrel 若自身定义符号、又被 bridge 反向引用，会构成 index ↔ bridge 循环依赖，
//    故本地定义一律外置，此处只做转发。

export { useVisitor } from './visitor-store'

// ============================================================
// 访客模式 · 状态管理
// 提供访客会话管理、邀请码生成、访问控制、足迹追踪
// ============================================================

export type {
  VisitorSession,
  VisitorFootprint,
  VisitorInvitation,
  AccessRule,
  VisitorRole,
  VisitorPermission,
  VisitorStats,
} from './types'
export { VISITOR_ROLE_PERMISSIONS, VISITOR_ROLE_LABELS } from './types'
export { useVisitorBridge } from './visitor-bridge'
export type { VisitorSummary, SessionInfo } from './visitor-bridge'
