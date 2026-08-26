// ============================================================
// Constitution 桥接层
// 简化透传：直接暴露 useComplianceBaseline 和 useComplianceReview 的原始 API
// ============================================================

import { useComplianceBaseline, useComplianceReview } from './index'

export function useConstitutionBridge() {
  const baseline = useComplianceBaseline()
  const review = useComplianceReview()

  return {
    // 合规基线
    auditLog: baseline.auditLog,
    complianceConfig: baseline.complianceConfig,
    recordAudit: baseline.recordAudit,
    getAuditLog: baseline.getAuditLog,
    getAuditStats: baseline.getAuditStats,
    clearAuditLog: baseline.clearAuditLog,
    checkRuleCompliance: baseline.checkRuleCompliance,
    checkConstitution: baseline.checkConstitution,
    detectConflicts: baseline.detectConflicts,
    generateReport: baseline.generateReport,
    updateConfig: baseline.updateConfig,
    getConfig: baseline.getConfig,
    resetConfig: baseline.resetConfig,

    // 合规审查
    sessions: review.sessions,
    checklist: review.checklist,
    history: review.history,
    reviewIsLoading: review.isLoading,
    initChecklist: review.initChecklist,
    runChecklist: review.runChecklist,
    markChecklistItem: review.markChecklistItem,
    getChecklistProgress: review.getChecklistProgress,
    createReview: review.createReview,
    submitReview: review.submitReview,
    startReview: review.startReview,
    addComment: review.addComment,
    makeDecision: review.makeDecision,
    computeAutoScore: review.computeAutoScore,
    getReviewHistory: review.getReviewHistory,
    loadReview: review.load,

    // 子模块直通
    baseline,
    review,
  }
}