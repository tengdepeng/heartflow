// ============================================================
// 宪法体系 · 合规基线类型定义
// 合规检查、审计日志、冲突检测
// ============================================================

// 类型引用来自 ../../types (MutableRule, ImmutableRule, Constitution)
// 在 compliance-baseline.ts 中使用

// ============================================================
// 合规检查
// ============================================================

/** 合规检查结果 */
export interface ComplianceResult {
  /** 是否通过合规检查 */
  passed: boolean
  /** 合规评分 (0-100) */
  score: number
  /** 违规项列表 */
  violations: ComplianceViolation[]
  /** 警告列表 */
  warnings: ComplianceWarning[]
  /** 检查时间 */
  checkedAt: string
}

/** 合规违规项 */
export interface ComplianceViolation {
  /** 违规规则 ID */
  ruleId: string
  /** 违规规则标题 */
  ruleTitle: string
  /** 违反的核心价值 */
  coreValue: string
  /** 违规描述 */
  description: string
  /** 严重程度 */
  severity: 'critical' | 'major' | 'minor'
  /** 修复建议 */
  suggestion: string
}

/** 合规警告 */
export interface ComplianceWarning {
  /** 相关规则 ID */
  ruleId: string
  /** 警告标题 */
  title: string
  /** 警告描述 */
  description: string
}

/** 合规基线配置 */
export interface ComplianceConfig {
  /** 是否启用自动合规检查 */
  autoCheck: boolean
  /** 最低合规分数阈值 */
  minScore: number
  /** 是否在新规则添加时自动检查 */
  checkOnAdd: boolean
  /** 是否在规则修改时自动检查 */
  checkOnUpdate: boolean
}

// ============================================================
// 审计日志
// ============================================================

/** 审计事件类型 */
export type AuditEventType = 'rule_added' | 'rule_updated' | 'rule_removed' | 'rule_toggled' | 'rule_reordered' | 'constitution_imported' | 'constitution_reset' | 'compliance_checked'

/** 审计日志条目 */
export interface AuditEntry {
  id: string
  /** 事件类型 */
  eventType: AuditEventType
  /** 事件描述 */
  description: string
  /** 变更前快照（可选） */
  before?: unknown
  /** 变更后快照（可选） */
  after?: unknown
  /** 相关规则 ID */
  ruleId?: string
  /** 执行操作的用户标识 */
  operator: string
  /** 时间戳 */
  timestamp: string
  /** 合规检查结果（仅 compliance_checked 事件） */
  complianceResult?: ComplianceResult
}

/** 审计统计 */
export interface AuditStats {
  totalEntries: number
  byType: Record<AuditEventType, number>
  firstEntryAt: string
  lastEntryAt: string
  recentChanges: number
}

// ============================================================
// 规则冲突检测
// ============================================================

/** 规则冲突 */
export interface RuleConflict {
  /** 冲突规则 A */
  ruleA: { id: string; title: string }
  /** 冲突规则 B */
  ruleB: { id: string; title: string }
  /** 冲突类型 */
  type: 'contradiction' | 'overlap' | 'tension'
  /** 冲突描述 */
  description: string
  /** 建议解决方案 */
  resolution: string
}

// ============================================================
// 合规报告
// ============================================================

/** 合规报告 */
export interface ComplianceReport {
  /** 生成时间 */
  generatedAt: string
  /** 宪法版本 */
  constitutionVersion: string
  /** 总规则数 */
  totalRules: number
  /** 启用规则数 */
  enabledRules: number
  /** 合规评分 */
  score: number
  /** 违规项 */
  violations: ComplianceViolation[]
  /** 警告 */
  warnings: ComplianceWarning[]
  /** 规则冲突 */
  conflicts: RuleConflict[]
  /** 审计摘要 */
  auditSummary: AuditStats
  /** 健康状态 */
  health: 'healthy' | 'caution' | 'warning' | 'critical'
}

// ============================================================
// 存储键
// ============================================================

export const CONSTITUTION_STORAGE_KEYS = {
  auditLog: 'hf:constitution:audit_log',
  complianceConfig: 'hf:constitution:compliance_config',
  lastCheck: 'hf:constitution:last_check',
} as const

// ============================================================
// 默认配置
// ============================================================

export const DEFAULT_COMPLIANCE_CONFIG: ComplianceConfig = {
  autoCheck: true,
  minScore: 60,
  checkOnAdd: true,
  checkOnUpdate: true,
}