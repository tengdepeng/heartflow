// ============================================================
// 宪法体系 · 合规基线引擎
// 合规检查、审计日志、冲突检测、合规报告
// ============================================================

import { ref } from 'vue'
import type {
  ComplianceResult, ComplianceViolation, ComplianceWarning,
  ComplianceConfig, ComplianceReport,
  AuditEntry, AuditEventType, AuditStats,
  RuleConflict,
} from './types'
import { CONSTITUTION_STORAGE_KEYS, DEFAULT_COMPLIANCE_CONFIG } from './types'
import type { Constitution, MutableRule } from '../../types'
import { storage } from '../../engine/storage'

// ============================================================
// 核心价值定义（用于合规检查的基准）
// ============================================================

interface CoreValue {
  id: string
  name: string
  description: string
  /** 与此价值冲突的关键词 */
  conflictingKeywords: string[]
}

const CORE_VALUES: CoreValue[] = [
  {
    id: 'local-private',
    name: '本地私有',
    description: '所有数据仅存储于用户本地设备，不上传任何云端',
    conflictingKeywords: ['云端', '上传', '同步服务器', '云存储', '在线', '联网', '分享到', '发布到'],
  },
  {
    id: 'super-custom',
    name: '超级自定义',
    description: '所有规则、界面、交互方式均可由用户自定义',
    conflictingKeywords: ['固定', '不可修改', '强制', '必须', '自动决定', '系统推荐'],
  },
  {
    id: 'flow-first',
    name: '心流第一',
    description: '一切功能设计以维护和促进心流状态为首要目标',
    conflictingKeywords: ['推送', '通知', '提醒', '打断', '弹窗', '催促', '限期'],
  },
  {
    id: 'data-driven',
    name: '数据驱动自我探索',
    description: '不提供结论，只提供洞察的原材料',
    conflictingKeywords: ['建议', '推荐', '分析结论', '诊断', '评估', '评分'],
  },
  {
    id: 'neutral',
    name: '中性呈现',
    description: '界面与表达保持中性，不预设人格、身份或立场',
    conflictingKeywords: ['你应该', '你必须', '正确的', '错误的', '好', '坏'],
  },
]

// ============================================================
// 持久化
// ============================================================

function loadAuditLog(): AuditEntry[] {
  try {
    const raw = storage.getKV<string>(CONSTITUTION_STORAGE_KEYS.auditLog, '[]')
    return JSON.parse(raw)
  } catch { return [] }
}

function saveAuditLog(entries: AuditEntry[]): void {
  storage.setKV(CONSTITUTION_STORAGE_KEYS.auditLog, JSON.stringify(entries))
}

function loadComplianceConfig(): ComplianceConfig {
  try {
    const raw = storage.getKV<string>(CONSTITUTION_STORAGE_KEYS.complianceConfig, '')
    if (!raw) return { ...DEFAULT_COMPLIANCE_CONFIG }
    return { ...DEFAULT_COMPLIANCE_CONFIG, ...JSON.parse(raw) }
  } catch { return { ...DEFAULT_COMPLIANCE_CONFIG } }
}

function saveComplianceConfig(config: ComplianceConfig): void {
  storage.setKV(CONSTITUTION_STORAGE_KEYS.complianceConfig, JSON.stringify(config))
}

function generateId(): string {
  return `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

// ============================================================
// 引擎
// ============================================================

const auditLog = ref<AuditEntry[]>(loadAuditLog())
const complianceConfig = ref<ComplianceConfig>(loadComplianceConfig())

export function useComplianceBaseline() {
  // ---- 审计日志 ----

  /** 记录审计事件 */
  function recordAudit(
    eventType: AuditEventType,
    description: string,
    ruleId?: string,
    before?: unknown,
    after?: unknown,
  ): AuditEntry {
    const entry: AuditEntry = {
      id: generateId(),
      eventType,
      description,
      before,
      after,
      ruleId,
      operator: 'user',
      timestamp: new Date().toISOString(),
    }
    auditLog.value = [...auditLog.value, entry]
    saveAuditLog(auditLog.value)
    return entry
  }

  /** 获取审计日志 */
  function getAuditLog(limit?: number): AuditEntry[] {
    const sorted = [...auditLog.value].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    return limit ? sorted.slice(0, limit) : sorted
  }

  /** 获取审计统计 */
  function getAuditStats(): AuditStats {
    const entries = auditLog.value
    const byType: Record<string, number> = {}
    for (const e of entries) {
      byType[e.eventType] = (byType[e.eventType] ?? 0) + 1
    }
    const sorted = [...entries].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    )
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    return {
      totalEntries: entries.length,
      byType: byType as Record<AuditEventType, number>,
      firstEntryAt: sorted[0]?.timestamp ?? '',
      lastEntryAt: sorted[sorted.length - 1]?.timestamp ?? '',
      recentChanges: entries.filter(e => new Date(e.timestamp) >= weekAgo).length,
    }
  }

  /** 清空审计日志 */
  function clearAuditLog(): void {
    auditLog.value = []
    saveAuditLog([])
  }

  // ---- 合规检查 ----

  /**
   * 对指定规则进行合规检查
   * 检查规则是否与核心价值冲突
   */
  function checkRuleCompliance(rule: MutableRule): ComplianceViolation[] {
    const violations: ComplianceViolation[] = []
    const text = `${rule.title} ${rule.description}`.toLowerCase()

    for (const coreValue of CORE_VALUES) {
      for (const keyword of coreValue.conflictingKeywords) {
        if (text.includes(keyword)) {
          const severity: 'critical' | 'major' | 'minor' =
            coreValue.id === 'local-private' ? 'critical' :
            coreValue.id === 'flow-first' ? 'major' :
            'minor'

          const suggestionMap: Record<string, string> = {
            'local-private': '请移除涉及云端、上传或联网的表述，改为强调本地存储与隐私保护',
            'super-custom': '请移除强制或不可修改的表述，改为强调用户可自定义',
            'flow-first': '请移除推送、通知或打断相关的表述，改为强调静默与不干扰',
            'data-driven': '请移除建议、诊断或评估相关表述，改为强调数据呈现而非结论',
            'neutral': '请移除价值判断相关表述，保持中性描述',
          }

          violations.push({
            ruleId: rule.id,
            ruleTitle: rule.title,
            coreValue: coreValue.name,
            description: `规则「${rule.title}」包含与核心价值「${coreValue.name}」冲突的关键词：「${keyword}」`,
            severity,
            suggestion: suggestionMap[coreValue.id] ?? '请修改规则描述以符合宪法核心价值',
          })
          break // 每个核心价值只报告一次
        }
      }
    }

    return violations
  }

  /**
   * 对完整宪法进行合规检查
   */
  function checkConstitution(constitution: Constitution): ComplianceResult {
    const violations: ComplianceViolation[] = []
    const warnings: ComplianceWarning[] = []

    // 检查每条可变规则
    for (const rule of constitution.mutableRules) {
      if (!rule.enabled) continue
      const ruleViolations = checkRuleCompliance(rule)
      violations.push(...ruleViolations)
    }

    // 规则数量警告
    if (constitution.mutableRules.filter(r => r.enabled).length < 5) {
      warnings.push({
        ruleId: '',
        title: '规则数量不足',
        description: '当前启用的弹性规则少于 5 条，建议至少保留核心规则以维护宪法完整性',
      })
    }

    if (constitution.mutableRules.filter(r => r.enabled).length > 50) {
      warnings.push({
        ruleId: '',
        title: '规则数量过多',
        description: '当前启用的弹性规则超过 50 条，过多的规则可能稀释宪法核心价值',
      })
    }

    // 计算合规分数
    const baseScore = 100
    const criticalViolations = violations.filter(v => v.severity === 'critical').length
    const majorViolations = violations.filter(v => v.severity === 'major').length
    const minorViolations = violations.filter(v => v.severity === 'minor').length
    const score = Math.max(0, baseScore - criticalViolations * 30 - majorViolations * 15 - minorViolations * 5)

    const config = complianceConfig.value
    const passed = score >= config.minScore

    const result: ComplianceResult = {
      passed,
      score,
      violations,
      warnings,
      checkedAt: new Date().toISOString(),
    }

    // 记录审计
    recordAudit('compliance_checked', `合规检查完成，评分：${score}，${passed ? '通过' : '未通过'}`, undefined, undefined, { score, passed })

    return result
  }

  // ---- 冲突检测 ----

  /**
   * 检测规则之间的冲突
   * 使用关键词分析和语义相似度检测
   */
  function detectConflicts(rules: MutableRule[]): RuleConflict[] {
    const conflicts: RuleConflict[] = []
    const enabledRules = rules.filter(r => r.enabled)

    // 矛盾词对检测
    const contradictionPairs: [string, string, string][] = [
      ['沉默', '提醒', '一条规则强调沉默，另一条要求提醒——存在行为矛盾'],
      ['保留', '删除', '一条规则强调保留，另一条要求删除——存在数据矛盾'],
      ['公开', '私密', '一条规则强调公开，另一条要求私密——存在可见性矛盾'],
      ['快速', '缓慢', '一条规则强调快速，另一条鼓励缓慢——存在节奏矛盾'],
      ['自动', '手动', '一条规则强调自动化，另一条要求手动——存在操作矛盾'],
    ]

    for (let i = 0; i < enabledRules.length; i++) {
      for (let j = i + 1; j < enabledRules.length; j++) {
        const a = enabledRules[i]
        const b = enabledRules[j]
        const textA = `${a.title} ${a.description}`
        const textB = `${b.title} ${b.description}`

        for (const [wordA, wordB, desc] of contradictionPairs) {
          if (textA.includes(wordA) && textB.includes(wordB)) {
            conflicts.push({
              ruleA: { id: a.id, title: a.title },
              ruleB: { id: b.id, title: b.title },
              type: 'contradiction',
              description: desc,
              resolution: `建议审查「${a.title}」与「${b.title}」的表述，确保两者不构成行为冲突`,
            })
            break
          }
        }

        // 重叠检测
        if (a.title === b.title) {
          conflicts.push({
            ruleA: { id: a.id, title: a.title },
            ruleB: { id: b.id, title: b.title },
            type: 'overlap',
            description: `两条规则标题相同：「${a.title}」，可能存在内容重复`,
            resolution: `建议合并或删除其中一条重复规则`,
          })
        }

        // 张力检测：规则描述高度相似但类型不同
        const similarity = calculateTextSimilarity(a.description, b.description)
        if (similarity > 0.7 && a.type !== b.type) {
          conflicts.push({
            ruleA: { id: a.id, title: a.title },
            ruleB: { id: b.id, title: b.title },
            type: 'tension',
            description: `「${a.title}」与「${b.title}」描述高度相似（${Math.round(similarity * 100)}%），但类型不同（${a.type} vs ${b.type}）`,
            resolution: `建议统一两条规则的类型，或明确区分其适用范围`,
          })
        }
      }
    }

    return conflicts
  }

  // ---- 合规报告 ----

  /**
   * 生成完整的合规报告
   */
  function generateReport(constitution: Constitution): ComplianceReport {
    const complianceResult = checkConstitution(constitution)
    const conflicts = detectConflicts(constitution.mutableRules)
    const auditStats = getAuditStats()

    const health: 'healthy' | 'caution' | 'warning' | 'critical' =
      complianceResult.score >= 90 ? 'healthy' :
      complianceResult.score >= 70 ? 'caution' :
      complianceResult.score >= 50 ? 'warning' :
      'critical'

    return {
      generatedAt: new Date().toISOString(),
      constitutionVersion: constitution.version,
      totalRules: constitution.mutableRules.length,
      enabledRules: constitution.mutableRules.filter(r => r.enabled).length,
      score: complianceResult.score,
      violations: complianceResult.violations,
      warnings: complianceResult.warnings,
      conflicts,
      auditSummary: auditStats,
      health,
    }
  }

  // ---- 合规配置管理 ----

  /** 更新合规配置 */
  function updateConfig(updates: Partial<ComplianceConfig>): void {
    complianceConfig.value = { ...complianceConfig.value, ...updates }
    saveComplianceConfig(complianceConfig.value)
  }

  /** 获取当前合规配置 */
  function getConfig(): ComplianceConfig {
    return { ...complianceConfig.value }
  }

  /** 重置合规配置 */
  function resetConfig(): void {
    complianceConfig.value = { ...DEFAULT_COMPLIANCE_CONFIG }
    saveComplianceConfig(complianceConfig.value)
  }

  return {
    // 审计日志
    auditLog,
    recordAudit,
    getAuditLog,
    getAuditStats,
    clearAuditLog,

    // 合规检查
    checkRuleCompliance,
    checkConstitution,
    detectConflicts,
    generateReport,

    // 合规配置
    complianceConfig,
    updateConfig,
    getConfig,
    resetConfig,
  }
}

// ============================================================
// 辅助函数
// ============================================================

/** 计算两段文本的简单相似度（基于共同词） */
function calculateTextSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.split(/[\s，,。.、；;：:！!？?]+/).filter(w => w.length > 1))
  const wordsB = new Set(b.split(/[\s，,。.、；;：:！!？?]+/).filter(w => w.length > 1))
  if (wordsA.size === 0 || wordsB.size === 0) return 0
  let common = 0
  for (const w of wordsA) {
    if (wordsB.has(w)) common++
  }
  return common / Math.max(wordsA.size, wordsB.size)
}