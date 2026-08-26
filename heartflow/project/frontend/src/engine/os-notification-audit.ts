// ============================================================
// A3-EXT-1 · OS 通知审计日志（零外网 · 纯本地）
// 在统一发射入口 emitOsNotification 之外，记录每一次发射尝试的
// 「何时 / 目标 / 宪法拦截否 / 实际落地否」，落实透明度 + 宪法第5条合规可证明。
// 所有数据仅落本地 KV（hf:os-notification-audit），绝不触外网。
// ============================================================

import { storage } from './storage'

const AUDIT_KEY = 'hf:os-notification-audit'
const MAX_ENTRIES = 200

/** 单次发射审计条目 */
export interface OsNotificationAuditEntry {
  id: string
  /** ISO 时间戳 */
  at: string
  /** 通知标题（已去敏，仅标题，不含任意 body 之外的外部内容） */
  title: string
  /** 宪法门控结果 */
  blocked: boolean
  /** 实际是否构造出 Notification 实例（落地） */
  delivered: boolean
  /** 未落地原因（宪法拦截 / 无 API / 未授权 / 构造异常 / 已落地） */
  reason: 'constitution' | 'no-api' | 'no-permission' | 'construct-error' | 'delivered'
}

interface AuditStore {
  entries: OsNotificationAuditEntry[]
}

function readStore(): AuditStore {
  return storage.getKV<AuditStore>(AUDIT_KEY, { entries: [] })
}

function writeStore(s: AuditStore): void {
  // 仅保留最近 MAX_ENTRIES 条，避免无限增长（仍全本地，零外网）
  if (s.entries.length > MAX_ENTRIES) {
    s.entries = s.entries.slice(s.entries.length - MAX_ENTRIES)
  }
  storage.setKV(AUDIT_KEY, s)
}

/**
 * 记录一次发射审计。fail-closed 友好：调用方在 emitOsNotification 各分支
 * 直接调用本函数，不依赖其返回值，确保「宪法阻断 / 未授权 / 构造异常」也留痕。
 */
export function recordOsNotificationAttempt(entry: {
  title: string
  blocked: boolean
  delivered: boolean
  reason: OsNotificationAuditEntry['reason']
}): OsNotificationAuditEntry {
  const full: OsNotificationAuditEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    title: entry.title,
    blocked: entry.blocked,
    delivered: entry.delivered,
    reason: entry.reason,
  }
  const s = readStore()
  s.entries.push(full)
  writeStore(s)
  return full
}

/** 取最近 N 条（默认全部，最多 MAX_ENTRIES），由旧到新 */
export function getOsNotificationAudit(limit?: number): OsNotificationAuditEntry[] {
  const s = readStore()
  const all = [...s.entries].sort((a, b) => a.at.localeCompare(b.at))
  return typeof limit === 'number' ? all.slice(-limit) : all
}

/** 统计：总次数 / 被宪法拦截 / 实际落地 / 其它未落地 */
export function getOsNotificationAuditSummary() {
  const all = getOsNotificationAudit()
  return {
    total: all.length,
    blocked: all.filter(e => e.blocked).length,
    delivered: all.filter(e => e.delivered).length,
    failed: all.filter(e => !e.delivered && !e.blocked).length,
  }
}

/** 清空本地审计（仅本地，零外网） */
export function clearOsNotificationAudit(): void {
  storage.setKV(AUDIT_KEY, { entries: [] } satisfies AuditStore)
}
