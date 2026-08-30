// ============================================================
// 共鸣协议层 · Advisor 桥接器
// 将幕僚状态通过共振层暴露，替代直接 import useAdvisorStore
// ============================================================

import { reactive } from 'vue'
import { useAdvisorStore } from '../../stores/advisor'
import { storeToRefs } from 'pinia'

export function useAdvisor() {
  const store = useAdvisorStore()
  const { messages, currentBubble, affinityMap, interactionCountMap, advisors, commandTasks } = storeToRefs(store)

  return reactive({
    // 响应式状态
    messages,
    currentBubble,
    affinityMap,
    interactionCountMap,
    advisors,

    // 幕僚 CRUD
    refreshAdvisors: store.refreshAdvisors?.bind(store),
    getAdvisorById: store.getAdvisorById?.bind(store),
    addAdvisorProfile: store.addAdvisorProfile?.bind(store),
    updateAdvisorProfile: store.updateAdvisorProfile?.bind(store),
    removeAdvisorProfile: store.removeAdvisorProfile?.bind(store),

    // 好感度系统
    getAffinityTier: store.getAffinityTier?.bind(store),
    saveAffinity: store.saveAffinity?.bind(store),
    onAffinityMilestone: store.onAffinityMilestone?.bind(store),

    // 定音锤
    getDingyinHammer: store.getDingyinHammer?.bind(store),
    triggerDingyinHammer: store.triggerDingyinHammer?.bind(store),
    getDingyinProgress: store.getDingyinProgress?.bind(store),
    getAllDingyinProgress: store.getAllDingyinProgress?.bind(store),
    getFourActs: store.getFourActs?.bind(store),
    getFourActsProgress: store.getFourActsProgress?.bind(store),

    // 幕僚调度系统
    getTaskAwareness: store.getTaskAwareness?.bind(store),
    dispatchAvatar: store.dispatchAvatar?.bind(store),
    getTaskProgress: store.getTaskProgress?.bind(store),
    // 调令系统（幕僚管家闭环）
    commandTasks,
    issueCommand: store.issueCommand?.bind(store),
    getCommandTasks: store.getCommandTasks?.bind(store),

    // 年度/季度对话
    getAnnualDialogue: store.getAnnualDialogue?.bind(store),
    triggerAnnualDialogue: store.triggerAnnualDialogue?.bind(store),
    getQuarterlyDialogue: store.getQuarterlyDialogue?.bind(store),
    triggerQuarterlyDialogue: store.triggerQuarterlyDialogue?.bind(store),

    // 见证系统
    witness: store.witness?.bind(store),
    witnessAll: store.witnessAll?.bind(store),
    getWitnessLog: store.getWitnessLog?.bind(store),
    getWitnessSummary: store.getWitnessSummary?.bind(store),
    clearWitnessLog: store.clearWitnessLog?.bind(store),

    // 互动系统
    reply: store.reply?.bind(store),
    replySync: store.replySync?.bind(store),
    getConversationContext: store.getConversationContext?.bind(store),

    // 退休系统
    retireAdvisor: store.retireAdvisor?.bind(store),
    unretireAdvisor: store.unretireAdvisor?.bind(store),
    isRetired: store.isRetired?.bind(store),
    getActiveAdvisors: store.getActiveAdvisors?.bind(store),
    getRetiredAdvisors: store.getRetiredAdvisors?.bind(store),

    // 核心响应
    say: store.say?.bind(store),
    onFocusComplete: store.onFocusComplete?.bind(store),
    onVisit: store.onVisit?.bind(store),
    onEmotionLogged: store.onEmotionLogged?.bind(store),
    onNoteCreated: store.onNoteCreated?.bind(store),
    onReturn: store.onReturn?.bind(store),
    checkReturn: store.checkReturn?.bind(store),
    onTap: store.onTap?.bind(store),
    resetDaily: store.resetDaily?.bind(store),
    getQuickStats: store.getQuickStats?.bind(store),
    pauseForSanctuary: store.pauseForSanctuary?.bind(store),
    resumeFromSanctuary: store.resumeFromSanctuary?.bind(store),
  })
}