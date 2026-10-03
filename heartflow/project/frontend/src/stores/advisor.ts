// ============================================================
// 镜我 · 幕僚状态管理
// Phase 1: 本地规则匹配, 无外部 API
// ============================================================

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { storage } from '../engine/storage'
import { getLocalDateKey } from '../utils/time'
import { AFFINITY_TIERS, ADVISOR_PERSONALITIES } from '../types'
import type { WitnessEntry, MessageDirection } from '../types'
import { aiEngine, isAIEngineEnabled } from '../engine/ai'
import { checkAdvisorNeutrality, checkAdvisorDataDriven } from '../modules/constitution/neutrality-checker'
import { useComplianceBaseline } from '../modules/constitution/compliance-baseline'
import { DEFAULT_ADVISOR_PRESETS } from '../modules/advisor/presets'
import { parseCommandIntent } from '../modules/advisor/commandIntent'
import type { CommandTaskType } from '../modules/advisor/commandIntent'
import { isLongDormant } from '../modules/advisor/longDormancy'
import { decideForProactive, emitOperationGate } from '../modules/operation-mode/gate'
import { collectHallKnowledge } from '../modules/advisor/knowledge-scope'
import { useAdvisorDailyLife } from '../modules/advisor/daily-life'
import { buildAdvisorSituationContext } from '../modules/advisor/situation'

interface AdvisorMessage {
  id: string
  text: string
  at: string
  /** 触发原因 */
  trigger: string
  /** 消息方向 */
  direction?: MessageDirection
  /** 宪法运行时文案中性检测结果（仅记录命中，默认不拦截；便于审计与合规面板） */
  constitutionFlags?: {
    forbiddenPatterns: string[]
    comparativePhrases: string[]
    personification: string[]
    /** 第4条·只给原材料不给结论：命中的结论性/评判性关键词 */
    dataDriven: string[]
  }
}

/** 定音锤四幕 (Four Acts) 锤子状态 */
export type HammerState = 'idle' | 'confirming' | 'presenting' | 'completed'

/** 定音锤四幕 (Four Acts) 数据项 */
export interface FourActItem {
  id: string
  title: string
  icon: string
  summary: string
  detailLines: string[]
  progress: number
  color: string
  hammerState: HammerState
}

/** 幕僚调度系统 - 任务感知数据 */
export interface TaskAwareness {
  focusCount: number
  noteCount: number
  emotionCount: number
  anchorCount: number
  activeAdvisorCount: number
  lastActivity: string
  todayDate: string
}

/** 幕僚调度系统 - 进度单项 */
export interface TaskProgressItem {
  current: number
  total: number
  label: string
}

/** 幕僚调度系统 - 任务进度 */
export interface TaskProgress {
  focus: TaskProgressItem
  notes: TaskProgressItem
  emotions: TaskProgressItem
  anchors: TaskProgressItem
}

/** 调令系统 - 单条调令任务（幕僚管家闭环） */
export interface CommandTask {
  id: string
  /** 用户原始调令文本 */
  command: string
  /** 意图中文标签 */
  intentLabel: string
  /** 任务类型 */
  taskType: CommandTaskType
  /** 派单到的幕僚 */
  advisorId?: string
  advisorName?: string
  /** running（任务中）/ done（已完成，浮现完成光点） */
  status: 'running' | 'done'
  /** 「任务中」进度描述（蓝图648：带房间名的过程叙述） */
  progressDesc: string
  /** 完成一句话结论（review 类为真实数据汇总） */
  resultSummary?: string
  createdAt: string
  finishedAt?: string
  /** 极淡「完成」光点标记（蓝图650：完成后浮现） */
  doneLight: boolean
  /** navigate 类：目标路由，UI 层下达后立即跳转（调令要真办事，不能只汇报） */
  targetRoute?: string
}

/** 角色-任务匹配权重矩阵 */
const ROLE_TASK_AFFINITY: Record<string, Record<string, number>> = {
  guardian:  { focus: 0.6, note: 0.7, emotion: 0.9, anchor: 0.5, review: 0.6, finance: 0.7, navigate: 0.85, general: 0.8 },
  scholar:   { focus: 0.8, note: 0.9, emotion: 0.5, anchor: 0.7, review: 0.95, finance: 0.8, navigate: 0.7, general: 0.6 },
  craftsman: { focus: 0.9, note: 0.6, emotion: 0.4, anchor: 0.8, review: 0.7, finance: 0.8, navigate: 0.7, general: 0.7 },
  hermit:    { focus: 0.5, note: 0.7, emotion: 0.9, anchor: 0.6, review: 0.5, finance: 0.5, navigate: 0.6, general: 0.8 },
}

export const useAdvisorStore = defineStore('advisor', () => {
  // 对话记录
  const messages = ref<AdvisorMessage[]>(loadMessages())
  // 当前可见的回应
  const currentBubble = ref<string | null>(null)
  // 气泡自动消失计时
  let bubbleTimer: ReturnType<typeof setTimeout> | null = null
  // 上次回应时间（防止频繁触发）
  let lastResponse = 0
  // 今日已回复次数
  let todayResponseCount = 0
  const pausedForSanctuary = ref(false)

  // ---- 幕僚列表（响应式，从 storage 同步） ----
  const advisors = ref<import('../types').AdvisorProfile[]>(storage.getAdvisors())

  /** 从 storage 刷新幕僚列表 */
  function refreshAdvisors() {
    advisors.value = storage.getAdvisors()
  }

  /** 获取单个幕僚 */
  function getAdvisorById(id: string): import('../types').AdvisorProfile | undefined {
    return advisors.value.find(a => a.id === id)
  }

  /** 创建幕僚并持久化 */
  function addAdvisorProfile(profile: import('../types').AdvisorProfile): boolean {
    if (advisors.value.some(a => a.id === profile.id)) return false
    const all = storage.getAdvisors()
    all.push(profile)
    storage.setAdvisors(all)
    refreshAdvisors()
    initAffinity()
    return true
  }

  /** 更新幕僚并持久化 */
  function updateAdvisorProfile(id: string, updates: Partial<import('../types').AdvisorProfile>): boolean {
    const all = storage.getAdvisors()
    const idx = all.findIndex(a => a.id === id)
    if (idx === -1) return false
    Object.assign(all[idx], updates)
    storage.setAdvisors(all)
    refreshAdvisors()
    return true
  }

  /** 删除幕僚并持久化 */
  function removeAdvisorProfile(id: string): boolean {
    const all = storage.getAdvisors()
    const idx = all.findIndex(a => a.id === id)
    if (idx === -1) return false
    all.splice(idx, 1)
    storage.setAdvisors(all)
    refreshAdvisors()
    return true
  }

  /**
   * 长眠守护（宪法第55条 elastic-long-dormancy → advisor:long-dormancy）。
   * 周期性落实「长眠→slumber / 重新互动→awake」状态切换：
   * - 超过阈值且当前不在 slumber → 置 slumber（自然沉睡）
   * - 当前为 slumber 但已重新互动（lastActiveAt 近期）→ 唤醒回 awake
   * 不触碰 meditating / evolving 等其它状态；退休幕僚跳过。
   * 纯调度在 composables/useLongDormancy，此处仅把判定结果落到 store 的 state。
   */
  function applyLongDormancy(): void {
    const now = new Date()
    const all = storage.getAdvisors()
    let changed = false
    for (const a of all) {
      if (a.retired) continue
      if (isLongDormant(a.lastActiveAt, now)) {
        if (a.state !== 'slumber') { a.state = 'slumber'; changed = true }
      } else if (a.state === 'slumber') {
        a.state = 'awake'; changed = true
      }
    }
    if (changed) {
      storage.setAdvisors(all)
      refreshAdvisors()
    }
  }

  // ---- 好感度系统 ----

  /** 每个幕僚的好感度 (0-100) */
  const affinityMap = ref<Map<string, number>>(new Map())
  /** 每个幕僚的交互次数 */
  const interactionCountMap = ref<Map<string, number>>(new Map())
  /** 每个幕僚上次达到的等级索引，用于检测里程碑 */
  const lastAffinityTierIndex = ref<Map<string, number>>(new Map())

  /** 从 storage 加载幕僚数据，初始化好感度映射 */
  function initAffinity() {
    const advisors = storage.getAdvisors()
    for (const a of advisors) {
      affinityMap.value.set(a.id, a.affinity ?? 0)
      interactionCountMap.value.set(a.id, a.totalInteractions ?? 0)
      // 计算当前等级索引
      const idx = getTierIndex(a.affinity ?? 0, a.totalInteractions ?? 0)
      lastAffinityTierIndex.value.set(a.id, idx)
    }
  }

  /**
   * 确保 6 类固定幕僚预设已注入（幂等）。
   * 蓝图第四部分"幕僚统一体系"：镜我/追风/灵犀/默渊/时痕/守钟人。
   * 仅对尚不存在的 preset-* id 调用 addAdvisorProfile（自带去重），
   * 绝不覆盖用户已自定义幕僚。
   */
  function ensureDefaultAdvisors() {
    const existing = new Set(storage.getAdvisors().map(a => a.id))
    for (const preset of DEFAULT_ADVISOR_PRESETS) {
      if (existing.has(preset.id)) continue
      addAdvisorProfile(preset)
    }
  }

  /** 获取好感度对应等级索引 */
  function getTierIndex(affinity: number, interactions: number): number {
    let idx = 0
    for (let i = AFFINITY_TIERS.length - 1; i >= 0; i--) {
      const t = AFFINITY_TIERS[i]
      if (affinity >= t.threshold && interactions >= t.minInteractions) {
        idx = i
        break
      }
    }
    return idx
  }

  /**
   * 获取指定幕僚的当前好感度等级
   */
  function getAffinityTier(advisorId: string): { title: string; threshold: number; affinity: number; interactions: number; index: number } {
    const affinity = affinityMap.value.get(advisorId) ?? 0
    const interactions = interactionCountMap.value.get(advisorId) ?? 0
    const idx = getTierIndex(affinity, interactions)
    const tier = AFFINITY_TIERS[idx]
    return {
      title: tier.title,
      threshold: tier.threshold,
      affinity,
      interactions,
      index: idx,
    }
  }

  /** 根据事件类型获取基础好感度增量 */
  function getBaseIncrement(trigger: string): number {
    const increments = storage.getConfig().advisor.affinityIncrements
    return increments[trigger] ?? 0.5
  }

  /** 将好感度持久化到 storage */
  function saveAffinity() {
    const advisors = storage.getAdvisors()
    for (const a of advisors) {
      a.affinity = Math.round(affinityMap.value.get(a.id) ?? 0)
      a.totalInteractions = interactionCountMap.value.get(a.id) ?? 0
    }
    storage.setAdvisors(advisors)
  }

  /** 好感度达到新等级时触发特殊回应 */
  function onAffinityMilestone(advisorId: string) {
    const advisors = storage.getAdvisors()
    const advisor = advisors.find(a => a.id === advisorId)
    if (!advisor) return

    const currentTier = getAffinityTier(advisorId)
    const prevIndex = lastAffinityTierIndex.value.get(advisorId) ?? 0

    if (currentTier.index > prevIndex) {
      lastAffinityTierIndex.value.set(advisorId, currentTier.index)
      // 落库好感度里程碑（层级达成时刻），随 saveAffinity 一并持久化
      if (!advisor.affinityMilestones) advisor.affinityMilestones = []
      advisor.affinityMilestones.push({
        tier: currentTier.index,
        title: currentTier.title,
        reachedAt: new Date().toISOString(),
      })
      saveAffinity()
    }
  }

  // ---- 定音锤（事件累计阈值触发总结） ----

  /** 从持久化配置读取定音锤阈值 */
  function getDingyinThresholds(): Record<string, number[]> {
    return storage.getConfig().advisor.dingyinThresholds as unknown as Record<string, number[]>
  }

  const DINGYIN_STORAGE_KEY = 'hf:dingyin_counts'

  /** 加载定音锤计数 */
  function loadDingyinCounts(): Record<string, Record<string, number>> {
    try {
      return storage.getKV<Record<string, Record<string, number>>>(DINGYIN_STORAGE_KEY, {})
    } catch {
      return {}
    }
  }

  /** 保存定音锤计数 */
  function saveDingyinCounts(counts: Record<string, Record<string, number>>) {
    storage.setKV(DINGYIN_STORAGE_KEY, counts)
  }

  /**
   * 定音锤：检查某类型事件累计是否达到阈值，若达到则返回一段总结性的话
   * @param advisorId 幕僚 ID
   * @param eventType 事件类型（focus_complete / emotion_logged / note_created）
   * @returns 总结语句，若未达到阈值则返回 null
   */
  function getDingyinHammer(advisorId: string, eventType: string): string | null {
    const counts = loadDingyinCounts()
    if (!counts[advisorId]) counts[advisorId] = {}
    counts[advisorId][eventType] = (counts[advisorId][eventType] ?? 0) + 1
    const count = counts[advisorId][eventType]
    saveDingyinCounts(counts)

    const DINGYIN_THRESHOLDS = getDingyinThresholds()
    const thresholds = DINGYIN_THRESHOLDS[eventType] ?? []
    if (!thresholds.includes(count)) return null

    const advisors = storage.getAdvisors()
    const advisor = advisors.find(a => a.id === advisorId)
    const name = advisor?.name ?? '幕僚'

    const messages: Record<string, string[]> = {
      focus_complete: [
        `${name}：「专注完成 ${count} 次。」`,
        `${name}：「专注 ${count} 次。」`,
        `${name}：「${count} 次专注已记录。」`,
      ],
      emotion_logged: [
        `${name}：「已记录 ${count} 次情绪。」`,
        `${name}：「${count} 次情绪标记。」`,
        `${name}：「已写下 ${count} 次情绪。」`,
      ],
      note_created: [
        `${name}：「已写下 ${count} 篇笔记。」`,
        `${name}：「${count} 篇笔记已记录。」`,
        `${name}：「笔记已积 ${count} 篇。」`,
      ],
    }
    const pool = messages[eventType] ?? [`${name}：「已累计 ${count} 次。」`]
    return pool[count % pool.length]
  }

  /**
   * 定音锤集成版：通过气泡系统显示定音锤总结
   * @param eventType 事件类型
   * @param advisorId 幕僚 ID（可选）
   * @returns 是否触发了定音锤
   */
  function triggerDingyinHammer(eventType: string, advisorId?: string): boolean {
    const text = getDingyinHammer(advisorId ?? 'default', eventType)
    if (text) {
      say(text, `dingyin_${eventType}`, advisorId)
      return true
    }
    return false
  }

  /**
   * 获取定音锤进度：当前计数和下一个阈值
   * @param eventType 事件类型
   * @returns { current: number, next: number | null, progress: number }
   */
  function getDingyinProgress(advisorId: string, eventType: string): { current: number; next: number | null; progress: number } {
    const counts = loadDingyinCounts()
    const count = counts[advisorId]?.[eventType] ?? 0
    const thresholds = getDingyinThresholds()[eventType] ?? []
    const nextThreshold = thresholds.find(t => t > count) ?? null
    const prevThreshold = [...thresholds].reverse().find(t => t <= count) ?? 0
    const next = nextThreshold ?? prevThreshold
    const progress = next > prevThreshold ? ((count - prevThreshold) / (next - prevThreshold)) : 1
    return { current: count, next: nextThreshold, progress: Math.min(1, Math.max(0, progress)) }
  }

  /**
   * 获取所有事件类型的定音锤进度摘要
   */
  function getAllDingyinProgress(advisorId: string): Record<string, { current: number; next: number | null; progress: number }> {
    const types = Object.keys(getDingyinThresholds())
    const result: Record<string, { current: number; next: number | null; progress: number }> = {}
    for (const t of types) {
      result[t] = getDingyinProgress(advisorId, t)
    }
    return result
  }

  // ---- 定音锤四幕 (Four Acts) ----

  /**
   * 生成定音锤四幕数据，跨模块聚合：
   * 第一幕「你做过的事」：专注、笔记、结晶、锚点
   * 第二幕「你如何对待别人」：人物卡片、亲密度、最近联系
   * 第三幕「你如何成长」：目标进度、生长状态、里程碑
   * 第四幕「你内心真正的声音」：情绪分布、身体健康、字镜映照
   *
   * 铁律：陈列而非叙事——detailLines 中不使用因果连接词
   */
  function getFourActs(): FourActItem[] {
    const sessions = storage.getSessions()
    const notes = storage.getNotes()
    const emotions = storage.getEmotions()
    const anchors = storage.getAnchors()
    const crystals = storage.getCrystals()
    const relations = storage.getRelations()
    const goals = storage.getGoals()

    // ---- 跨模块 KV 数据 ----
    const bodyLogs = storage.getKV<any[]>('hf:body_logs', [])
    const wordMirrorWords = storage.getKV<any[]>('hf:word_mirror', [])
    const wordHistory = storage.getKV<any[]>('hf:word_history', [])

    // ---- 第一幕数据：你做过的事 ----
    const completedSessions = sessions.filter(s => s.status === 'completed')
    const totalFocusCount = completedSessions.length
    const totalFocusDuration = completedSessions.reduce((sum, s) => sum + (s.elapsed || 0), 0)
    const totalFocusMinutes = Math.round(totalFocusDuration / 60000)
    const totalAnchors = anchors.length
    const completedAnchors = anchors.filter(a => a.done).length
    const totalCrystals = crystals.length
    const totalNotes = notes.length

    const localToday = getLocalDateKey()
    const todaySessions = completedSessions.filter(s => s.completedAt?.startsWith(localToday))
    const todayAnchors = anchors.filter(a => a.targetDate === localToday)
    const todayCompletedAnchors = todayAnchors.filter(a => a.done)

    const focusProgress = Math.min(1, totalFocusCount / 20)
    const anchorProgress = totalAnchors > 0 ? completedAnchors / totalAnchors : 0
    const crystalProgress = Math.min(1, totalCrystals / 10)
    const noteProgress = Math.min(1, totalNotes / 30)

    // ---- 第二幕数据：你如何对待别人 ----
    const relationCount = relations.length
    const relationTypeCounts: Record<string, number> = {}
    for (const r of relations) {
      relationTypeCounts[r.relation] = (relationTypeCounts[r.relation] || 0) + 1
    }
    const topRelations = relations
      .sort((a, b) => b.closeness - a.closeness)
      .slice(0, 3)
    const recentContacts = relations
      .filter(r => r.lastContact)
      .sort((a, b) => new Date(b.lastContact!).getTime() - new Date(a.lastContact!).getTime())
      .slice(0, 3)

    const relationLabelMap: Record<string, string> = {
      family: '家人', lover: '伴侣', friend: '朋友', colleague: '同事', mentor: '导师', other: '其他',
    }

    // ---- 第三幕数据：你如何成长 ----
    const totalGoals = goals.length
    const visionCount = goals.filter(g => g.tier === 'vision').length
    const targetCount = goals.filter(g => g.tier === 'target').length
    const planCount = goals.filter(g => g.tier === 'plan').length
    const bloomGoals = goals.filter(g => g.status === 'bloom')
    const growingGoals = goals.filter(g => g.status === 'growing' || g.status === 'sprout')
    const goalDomainCounts: Record<string, number> = {}
    for (const g of goals) {
      goalDomainCounts[g.domain] = (goalDomainCounts[g.domain] || 0) + 1
    }
    const topDomain = Object.entries(goalDomainCounts).sort((a, b) => b[1] - a[1])[0]
    const domainLabelMap: Record<string, string> = {
      work: '工作', growth: '成长', health: '健康', relation: '关系', wealth: '财富', play: '逸趣', other: '其他',
    }

    const goalProgress = Math.min(1, totalGoals / 10)
    const bloomProgress = totalGoals > 0 ? bloomGoals.length / totalGoals : 0

    // ---- 第四幕数据：你内心真正的声音 ----
    const totalEmotions = emotions.length
    const emotionTypeCounts: Record<string, number> = {}
    for (const e of emotions) {
      emotionTypeCounts[e.type] = (emotionTypeCounts[e.type] || 0) + 1
    }
    const sortedEmotions = Object.entries(emotionTypeCounts).sort((a, b) => b[1] - a[1])

    const emotionLabelMap: Record<string, string> = {
      happy: '开心', calm: '平静', sad: '低落', anxious: '焦虑', angry: '愤怒',
    }

    // 身体数据
    const sleepLogs = bodyLogs.filter((l: any) => l.type === 'sleep')
    const exerciseLogs = bodyLogs.filter((l: any) => l.type === 'exercise')
    const mealLogs = bodyLogs.filter((l: any) => l.type === 'meal')
    const totalSleepHours = sleepLogs.reduce((sum: number, l: any) => sum + (l.value?.hours || 0), 0)
    const totalExerciseMinutes = exerciseLogs.reduce((sum: number, l: any) => sum + (l.value?.minutes || 0), 0)
    const avgSleep = sleepLogs.length > 0 ? Math.round(totalSleepHours / sleepLogs.length * 10) / 10 : 0

    // 字镜数据
    const totalWords = wordMirrorWords.length
    const memorizedWords = wordMirrorWords.filter((w: any) => w.proficiency >= 5).length
    const wordHistoryCount = wordHistory.length

    const emotionProgress = Math.min(1, totalEmotions / 30)
    const bodyProgress = bodyLogs.length > 0 ? Math.min(1, bodyLogs.length / 20) : 0
    const wordProgress = totalWords > 0 ? memorizedWords / totalWords : 0

    return [
      // ---- 第一幕：你做过的事 ----
      {
        id: 'act_what_you_did',
        title: '你做过的事',
        icon: '  ',
        summary: `${totalFocusCount} 次专注，${totalNotes} 篇笔记，${totalCrystals} 颗结晶`,
        detailLines: [
          `专注完成 ${totalFocusCount} 次（约 ${totalFocusMinutes} 分钟）`,
          `今日专注 ${todaySessions.length} 次`,
          `笔记 ${totalNotes} 篇`,
          `时间结晶 ${totalCrystals} 颗`,
          `锚点 ${completedAnchors}/${totalAnchors} 已完成（今日 ${todayCompletedAnchors.length}/${todayAnchors.length}）`,
        ],
        progress: (focusProgress + noteProgress + crystalProgress + anchorProgress) / 4,
        color: '#f0c040',
        hammerState: 'idle',
      },
      // ---- 第二幕：你如何对待别人 ----
      {
        id: 'act_how_you_treat_others',
        title: '你如何对待别人',
        icon: '  ',
        summary: relationCount > 0
          ? `${relationCount} 位人物卡片，${Object.keys(relationTypeCounts).length} 种关系类型`
          : '暂无关系卡片',
        detailLines: [
          relationCount > 0 ? `人物卡片 ${relationCount} 张` : '人物卡片 0 张',
          ...Object.entries(relationTypeCounts).map(([type, count]) =>
            `${relationLabelMap[type] || type} ${count} 位`),
          ...topRelations.map(r =>
            `${r.name}（${relationLabelMap[r.relation] || r.relation}）亲密度 ${Math.round(r.closeness * 100)}%`),
          ...recentContacts.map(r =>
            `${r.name} 最近联系 ${r.lastContact ? fmtRelativeDate(r.lastContact) : '未记录'}`),
          ...(relationCount === 0 ? ['暂无关系数据'] : []),
        ],
        progress: Math.min(1, relationCount / 10),
        color: '#d98c7a',
        hammerState: 'idle',
      },
      // ---- 第三幕：你如何成长 ----
      {
        id: 'act_how_you_grow',
        title: '你如何成长',
        icon: '  ',
        summary: totalGoals > 0
          ? `${totalGoals} 个目标（${visionCount} 愿景 / ${targetCount} 目标 / ${planCount} 计划）`
          : '暂无目标',
        detailLines: [
          totalGoals > 0 ? `目标共 ${totalGoals} 个` : '目标 0 个',
          `愿景 ${visionCount} 个，目标 ${targetCount} 个，计划 ${planCount} 个`,
          `已开花 ${bloomGoals.length} 个，生长中 ${growingGoals.length} 个`,
          ...(topDomain ? [`最活跃领域 ${domainLabelMap[topDomain[0]] || topDomain[0]}（${topDomain[1]} 个）`] : []),
          ...bloomGoals.slice(0, 3).map(g => `${g.title} 已开花`),
          ...(totalGoals === 0 ? ['暂无目标数据'] : []),
        ],
        progress: (goalProgress + bloomProgress) / 2,
        color: '#8a9a7a',
        hammerState: 'idle',
      },
      // ---- 第四幕：你内心真正的声音 ----
      {
        id: 'act_inner_voice',
        title: '你内心真正的声音',
        icon: '  ',
        summary: `${totalEmotions} 次情绪记录，${bodyLogs.length} 条身体日志，${totalWords} 个词汇`,
        detailLines: [
          `情绪记录 ${totalEmotions} 次`,
          ...sortedEmotions.slice(0, 3).map(([type, count]) =>
            `${emotionLabelMap[type] || type} ${count} 次`),
          `身体日志 ${bodyLogs.length} 条（睡眠 ${sleepLogs.length} 次，运动 ${exerciseLogs.length} 次，饮食 ${mealLogs.length} 次）`,
          avgSleep > 0 ? `平均睡眠 ${avgSleep} 小时` : '暂无睡眠数据',
          totalExerciseMinutes > 0 ? `累计运动 ${totalExerciseMinutes} 分钟` : '暂无运动数据',
          `字镜词汇 ${totalWords} 个（熟记 ${memorizedWords} 个）`,
          `字镜分析 ${wordHistoryCount} 次`,
          ...(totalWords > 0 ? [] : ['暂无字镜数据']),
        ],
        progress: (emotionProgress + bodyProgress + wordProgress) / 3,
        color: '#a07c8c',
        hammerState: 'idle',
      },
    ]
  }

  /**
   * 铁律·镜我的终结回应：
   * 在四幕全部呈现完毕后，只输出这一句话，不做任何总结性叙事。
   */
  function getFourActsIronLawResponse(): string {
    return '我把我看到的东西放在这里了。'
  }

  /**
   * 格式化相对日期（如"3天前"、"今天"）
   */
  function fmtRelativeDate(iso: string): string {
    const now = Date.now()
    const then = new Date(iso).getTime()
    const diffDays = Math.floor((now - then) / 86400000)
    if (diffDays === 0) return '今天'
    if (diffDays === 1) return '昨天'
    if (diffDays <= 7) return `${diffDays} 天前`
    if (diffDays <= 30) return `${Math.floor(diffDays / 7)} 周前`
    return `${Math.floor(diffDays / 30)} 月前`
  }

  /**
   * 获取定音锤四幕的总体进度
   */
  function getFourActsProgress(): { completed: number; total: number } {
    const acts = getFourActs()
    const completed = acts.filter(a => a.progress >= 1).length
    return { completed, total: acts.length }
  }

  // ---- 幕僚调度系统 ----

  /**
   * 获取任务感知数据：今日各项计数和活跃幕僚数
   */
  function getTaskAwareness(): TaskAwareness {
    const localToday = getLocalDateKey()
    const timestampToday = new Date().toISOString().slice(0, 10)
    const sessions = storage.getSessions()
    const todaySessions = sessions.filter(s => s.completedAt?.startsWith(timestampToday))
    const focusCount = todaySessions.length
    const noteCount = storage.getNotes().length
    const emotionCount = storage.getEmotions().length
    const anchorCount = storage.getAnchors().length
    const activeAdvisorCount = storage.getAdvisors().filter(a => !a.retired).length

    // 在所有数据中找最新活动时间
    const allTimestamps: string[] = []
    for (const s of sessions) {
      if (s.completedAt) allTimestamps.push(s.completedAt)
    }
    for (const n of storage.getNotes()) {
      if (n.createdAt) allTimestamps.push(n.createdAt)
    }
    for (const e of storage.getEmotions()) {
      if (e.createdAt) allTimestamps.push(e.createdAt)
    }
    const lastActivity = allTimestamps.length > 0
      ? allTimestamps.sort().reverse()[0]
      : new Date().toISOString()

    return {
      focusCount,
      noteCount,
      emotionCount,
      anchorCount,
      activeAdvisorCount,
      lastActivity,
      todayDate: localToday,
    }
  }

  /**
   * 根据任务类型调度最佳幕僚
   * 综合评分 = 角色匹配分（纯角色匹配，已移除好感度加权，避免系统强加的情感操控）
   * @param taskType 任务类型（focus / note / emotion / anchor / general）
   * @returns 匹配的幕僚信息（id, name, role, affinity）或 null
   */
  function dispatchAvatar(taskType: string): { id: string; name: string; role: string; affinity: number } | null {
    const advisors = storage.getAdvisors().filter(a => !a.retired)
    if (advisors.length === 0) return null

    let bestScore = -1
    let bestAdvisor: { id: string; name: string; role: string; affinity: number } | null = null

    for (const a of advisors) {
      const roleKey = a.role.toLowerCase()
      const weights = ROLE_TASK_AFFINITY[roleKey]
      if (!weights) continue
      const roleMatch = weights[taskType] ?? weights.general ?? 0.5
      const affinity = a.affinity ?? 0
      const score = roleMatch
      if (score > bestScore) {
        bestScore = score
        bestAdvisor = { id: a.id, name: a.name, role: a.role, affinity }
      }
    }

    return bestAdvisor
  }

  /**
   * 获取今日任务进度
   */
  function getTaskProgress(): TaskProgress {
    const localToday = getLocalDateKey()
    const timestampToday = new Date().toISOString().slice(0, 10)
    const sessions = storage.getSessions()
    const todaySessions = sessions.filter(s => s.completedAt?.startsWith(timestampToday))
    const focusCount = todaySessions.length

    const notes = storage.getNotes()
    const todayNotes = notes.filter(n => n.createdAt?.startsWith(timestampToday))

    const emotions = storage.getEmotions()
    const todayEmotions = emotions.filter(e => e.createdAt?.startsWith(timestampToday))

    const anchors = storage.getAnchors()
    const todayAnchors = anchors.filter(a => a.targetDate === localToday)
    const todayCompletedAnchors = todayAnchors.filter(a => a.done)

    return {
      focus: { current: focusCount, total: 8, label: '专注' },
      notes: { current: todayNotes.length, total: 5, label: '笔记' },
      emotions: { current: todayEmotions.length, total: 5, label: '情绪' },
      anchors: { current: todayCompletedAnchors.length, total: Math.max(todayAnchors.length, 1), label: '锚点' },
    }
  }

  // ---- 调令系统（幕僚管家闭环） ----
  const COMMAND_TASKS_KEY = 'hf:command-tasks'
  const commandTasks = ref<CommandTask[]>([])

  /** 载入历史调令任务；会话恢复时把上一轮未收尾的 running 标记为已完成 */
  function loadCommandTasks(): CommandTask[] {
    const raw = storage.getKV<CommandTask[]>(COMMAND_TASKS_KEY, [])
    // 防御：存储里该键可能被写脏成非数组，直接 for...of 会让整个 store 初始化崩掉
    const list = Array.isArray(raw) ? raw : []
    for (const t of list) {
      if (t.status === 'running') {
        t.status = 'done'
        t.doneLight = true
        t.finishedAt = t.finishedAt ?? new Date().toISOString()
        t.resultSummary = t.resultSummary ?? '（会话恢复时已收尾）'
        t.progressDesc = '已收尾'
      }
    }
    return list
  }
  commandTasks.value = loadCommandTasks()

  function persistCommandTasks() {
    storage.setKV(COMMAND_TASKS_KEY, commandTasks.value)
  }

  /** review 类调令：真实统计近 30 天数据，给出一句话结论（蓝图646：跨域汇总） */
  function buildReviewSummary(): string {
    const since = new Date(Date.now() - 30 * 86400000).toISOString()
    const sessions = storage.getSessions().filter((s) => (s.completedAt ?? '') >= since)
    const notes = storage.getNotes().filter((n) => (n.createdAt ?? '') >= since)
    const emotions = storage.getEmotions().filter((e) => (e.createdAt ?? '') >= since)
    return `近 30 天：专注 ${sessions.length} 次 · 笔记 ${notes.length} 篇 · 情绪 ${emotions.length} 条`
  }

  /**
   * general 类调令的收尾话术。
   * 没命中任何已知意图时，先在功能词典里模糊搜过一遍：
   *   · 有候选 → 报出最相近的几个名字，让用户一句话确认；
   *   · 没候选 → 给出可用功能清单，而不是干巴巴的「没有这个功能」。
   */
  function buildGeneralSummary(
    advisorName: string,
    suggestions?: { route: string; name: string }[],
    featureHint?: string,
  ): string {
    if (suggestions && suggestions.length > 0) {
      const names = suggestions.map((s) => s.name).join(' / ')
      return `没太确定你要哪个，是不是想去：${names}？说一声我就带你去。`
    }
    if (featureHint) {
      return `没找到你说的那个，不过殿堂里有这些：${featureHint}。换个说法我再试试。`
    }
    return `已交由 ${advisorName} 协调，随时回看。`
  }

  /**
   * 下达调令：镜我解析意图 → 派单 → 进入「任务中」→ 短暂运行后收尾浮现完成光点。
   * 本地无云端 AI 执行后端，故以进度描述 + 完成光点呈现闭环（蓝图644–650）。
   */
  function issueCommand(text: string): CommandTask | null {
    const cmd = (text || '').trim()
    if (!cmd) return null

    const intent = parseCommandIntent(cmd)
    const advisor = dispatchAvatar(intent.dispatchKey)
    const advisorName = advisor?.name ?? '镜我'
    const advisorId = advisor?.id
    const now = new Date().toISOString()

    const task: CommandTask = {
      id: `cmd_${Date.now()}`,
      command: cmd,
      intentLabel: intent.intentLabel,
      taskType: intent.taskType,
      advisorId,
      advisorName,
      status: 'running',
      progressDesc: `${advisorName} 正在 ${intent.room} ${intent.action}…`,
      createdAt: now,
      doneLight: false,
      ...(intent.targetRoute ? { targetRoute: intent.targetRoute } : {}),
    }
    commandTasks.value.push(task)
    persistCommandTasks()

    // 任务生命周期：运行 → 收尾（仅本地计时，真实执行由蓝图未来本地 AI 接管）
    setTimeout(() => {
      const t = commandTasks.value.find((x) => x.id === task.id)
      if (!t || t.status === 'done') return
      let summary: string
      switch (intent.taskType) {
        case 'review': summary = buildReviewSummary(); break
        case 'navigate': summary = `已为你打开${intent.targetName ?? '目标空间'}。`; break
        case 'finance':
          // 财务/记账：项目里真实存在的是 /reward「劳酬」（记账 v2），
          // 此前词表没接上，用户问「我要记账」会被当成没有这个功能。
          summary = `已为你打开${intent.targetName ?? '劳酬'}：记账、预算、支出流水都在里面。`
          break
        case 'focus': summary = `已为你开启专注（${storage.getConfig().timer.defaultDuration} 分钟），愿心流自来。`; break
        case 'note': summary = '已打开笔记编辑器，写下即沉淀。'; break
        case 'emotion': summary = '已为你打开情绪花房，慢慢说。'; break
        case 'anchor': summary = '已为你打开锚点庭院，立个今日目标。'; break
        default:
          // 功能搜索兜底：宁可给候选/清单，也不回一句「没有这个功能」
          summary = buildGeneralSummary(advisorName, intent.suggestions, intent.featureHint)
          break
      }
      t.status = 'done'
      t.doneLight = true
      t.finishedAt = new Date().toISOString()
      t.resultSummary = summary
      t.progressDesc = `${advisorName} 已完成。`
      persistCommandTasks()
    }, 1600)

    return task
  }

  function getCommandTasks(): CommandTask[] {
    return commandTasks.value
  }

  // ---- 见证系统 ----

  /**
   * 记录幕僚见证的事件
   * @param advisorId 幕僚 ID
   * @param eventType 事件类型
   * @param detail 事件详情
   */
  function witness(advisorId: string, eventType: string): void {
    const advisors = storage.getAdvisors()
    const advisor = advisors.find(a => a.id === advisorId)
    if (!advisor || advisor.retired) return

    if (!advisor.witnessLog) advisor.witnessLog = []
    advisor.witnessLog.push({
      at: new Date().toISOString(),
      eventType,
      advisorId,
    })
    // 超过上限时滚动清除最旧的
    const witnessLogMax = storage.getConfig().advisor.witnessLogMax
    if (advisor.witnessLog.length > witnessLogMax) {
      advisor.witnessLog = advisor.witnessLog.slice(-witnessLogMax)
    }
    advisor.lastActiveAt = new Date().toISOString()
    storage.setAdvisors(advisors)
  }

  /**
   * 获取幕僚的见证记录
   * @param advisorId 幕僚 ID
   * @param limit 返回条数（默认从配置读取，0 表示全部）
   */
  function getWitnessLog(advisorId: string, limit?: number): WitnessEntry[] {
    const advisors = storage.getAdvisors()
    const advisor = advisors.find(a => a.id === advisorId)
    const log = advisor?.witnessLog ?? []
    const effectiveLimit = limit ?? storage.getConfig().advisor.witnessLogDefaultLimit
    return effectiveLimit > 0 ? log.slice(-effectiveLimit) : log
  }

  /**
   * 获取幕僚见证摘要：按事件类型统计数量
   * @param advisorId 幕僚 ID
   */
  function getWitnessSummary(advisorId: string): Record<string, number> {
    const advisors = storage.getAdvisors()
    const advisor = advisors.find(a => a.id === advisorId)
    const log = advisor?.witnessLog ?? []
    const summary: Record<string, number> = {}
    for (const entry of log) {
      summary[entry.eventType] = (summary[entry.eventType] ?? 0) + 1
    }
    return summary
  }

  /** 清除幕僚的见证记录 */
  function clearWitnessLog(advisorId: string): void {
    const advisors = storage.getAdvisors()
    const advisor = advisors.find(a => a.id === advisorId)
    if (advisor) {
      advisor.witnessLog = []
      storage.setAdvisors(advisors)
    }
  }

  // ---- 互动系统 ----

  /**
   * 用户回复幕僚（双向对话）
   * 优先使用 AI 引擎生成回应，失败时回退到规则匹配
   * @param advisorId 幕僚 ID
   * @param text 用户回复内容
   * @returns 幕僚的回应（根据性格和上下文生成）
   */
  async function reply(advisorId: string, text: string): Promise<string> {
    const advisors = storage.getAdvisors()
    const advisor = advisors.find(a => a.id === advisorId)
    if (!advisor || advisor.retired) return ''

    // 记录用户回复
    const now = Date.now()
    const replyMsg: AdvisorMessage = {
      id: `reply_${now}`,
      text,
      at: new Date().toISOString(),
      trigger: 'user_reply',
      direction: 'user_replies',
    }
    messages.value.push(replyMsg)

    // 更新对话上下文
    if (!advisor.conversationContext) {
      advisor.conversationContext = {
        lastAdvisorMessage: null,
        lastUserReply: null,
        turnCount: 0,
      }
    }
    advisor.conversationContext.lastUserReply = text
    advisor.conversationContext.turnCount++

    // 尝试 AI 引擎生成回应，失败时回退到规则匹配
    let response = ''
    if (isAIEngineEnabled()) {
      // 情境感知 + 接通专属知识库：组装天色时段 / 幕僚当前活动 / 授权殿堂痕迹
      const life = useAdvisorDailyLife()
      const situation = buildAdvisorSituationContext({
        timeSlot: life.currentTimeSlot.value,
        activities: life.getCurrentActivities(advisorId),
        knowledge: collectHallKnowledge(advisor.knowledgeScope),
      })
      response = await aiEngine.getAdvisorReply(
        advisorId,
        advisor.name,
        advisor.role,
        advisor.personality,
        advisor.affinity,
        text,
        advisor.conversationContext.turnCount,
        situation,
      )
    }
    // 若 AI 未启用或返回空，使用规则匹配
    if (!response) {
      const personality = ADVISOR_PERSONALITIES.find(p => p.key === advisor.personality)
      response = generateReply(advisor.name, personality?.style ?? '简洁', text)
    }

    // 记录幕僚回应
    const responseMsg: AdvisorMessage = {
      id: `adv_${now}`,
      text: response,
      at: new Date().toISOString(),
      trigger: 'advisor_reply',
      direction: 'advisor_says',
    }
    messages.value.push(responseMsg)
    advisor.conversationContext.lastAdvisorMessage = response
    advisor.lastActiveAt = new Date().toISOString()

    // 好感度提升
    const current = affinityMap.value.get(advisorId) ?? 0
    const affinityMax = storage.getConfig().advisor.affinityMax
    affinityMap.value.set(advisorId, Math.min(affinityMax, current + 0.5))
    const count = interactionCountMap.value.get(advisorId) ?? 0
    interactionCountMap.value.set(advisorId, count + 1)
    saveAffinity()

    storage.setAdvisors(advisors)
    persist()

    // 显示气泡
    currentBubble.value = response
    if (bubbleTimer) clearTimeout(bubbleTimer)
    bubbleTimer = setTimeout(() => {
      currentBubble.value = null
    }, storage.getConfig().advisor.bubbleDuration)

    return response
  }

  /**
   * 同步版本 reply（无 AI，仅规则匹配）
   * 用于测试或不需要 AI 的场景
   */
  function replySync(advisorId: string, text: string): string {
    const advisors = storage.getAdvisors()
    const advisor = advisors.find(a => a.id === advisorId)
    if (!advisor || advisor.retired) return ''

    const now = Date.now()
    const replyMsg: AdvisorMessage = {
      id: `reply_${now}`,
      text,
      at: new Date().toISOString(),
      trigger: 'user_reply',
      direction: 'user_replies',
    }
    messages.value.push(replyMsg)

    if (!advisor.conversationContext) {
      advisor.conversationContext = {
        lastAdvisorMessage: null,
        lastUserReply: null,
        turnCount: 0,
      }
    }
    advisor.conversationContext.lastUserReply = text
    advisor.conversationContext.turnCount++

    const personality = ADVISOR_PERSONALITIES.find(p => p.key === advisor.personality)
    const response = generateReply(advisor.name, personality?.style ?? '简洁', text)

    const responseMsg: AdvisorMessage = {
      id: `adv_${now}`,
      text: response,
      at: new Date().toISOString(),
      trigger: 'advisor_reply',
      direction: 'advisor_says',
    }
    messages.value.push(responseMsg)
    advisor.conversationContext.lastAdvisorMessage = response
    advisor.lastActiveAt = new Date().toISOString()

    const current = affinityMap.value.get(advisorId) ?? 0
    affinityMap.value.set(advisorId, Math.min(100, current + 0.5))
    const count = interactionCountMap.value.get(advisorId) ?? 0
    interactionCountMap.value.set(advisorId, count + 1)
    saveAffinity()

    storage.setAdvisors(advisors)
    persist()

    currentBubble.value = response
    if (bubbleTimer) clearTimeout(bubbleTimer)
    bubbleTimer = setTimeout(() => {
      currentBubble.value = null
    }, storage.getConfig().advisor.bubbleDuration)

    return response
  }

  /**
   * 生成幕僚对用户回复的回应
   */
  function generateReply(name: string, style: string, userText: string): string {
    // 根据用户输入长度和风格生成回应
    const len = userText.length
    const shortReplies = [
      `${name}点了点头。`,
      `${name}：「嗯。」`,
      `${name}认真听着。`,
      `${name}：「记下了。」`,
    ]
    const mediumReplies = [
      `${name}：「我明白了，这些我会记住。」`,
      `${name}：「你说得对，让我想想。」`,
      `${name}：「继续说吧，我在听。」`,
    ]
    const longReplies = [
      `${name}：「你说得很详细，我记在心里了。」`,
      `${name}：「这些话很有分量，我会好好收藏。」`,
      `${name}：「感谢你愿意分享这些。」`,
    ]

    let pool: string[]
    if (len < 10) {
      pool = shortReplies
    } else if (len < 50) {
      pool = mediumReplies
    } else {
      pool = longReplies
    }

    // 根据风格调整
    if (style.includes('热情') || style.includes('活泼')) {
      pool = pool.map(s => s.replace('。', '！'))
    } else if (style.includes('简洁')) {
      pool = shortReplies
    }

    return pool[Math.floor(Math.random() * pool.length)]
  }

  /**
   * 获取与幕僚的对话上下文
   */
  function getConversationContext(advisorId: string): { lastAdvisorMessage: string | null; lastUserReply: string | null; turnCount: number } {
    const advisors = storage.getAdvisors()
    const advisor = advisors.find(a => a.id === advisorId)
    return advisor?.conversationContext ?? {
      lastAdvisorMessage: null,
      lastUserReply: null,
      turnCount: 0,
    }
  }

  // ---- 退休系统 ----

  /** 退休幕僚 */
  function retireAdvisor(advisorId: string): boolean {
    const advisors = storage.getAdvisors()
    const advisor = advisors.find(a => a.id === advisorId)
    if (!advisor || advisor.retired) return false
    advisor.retired = true
    advisor.retiredAt = new Date().toISOString()
    advisor.state = 'slumber'
    storage.setAdvisors(advisors)
    return true
  }

  /** 取消退休（唤醒幕僚） */
  function unretireAdvisor(advisorId: string): boolean {
    const advisors = storage.getAdvisors()
    const advisor = advisors.find(a => a.id === advisorId)
    if (!advisor || !advisor.retired) return false
    advisor.retired = false
    advisor.retiredAt = null
    advisor.state = 'awake'
    storage.setAdvisors(advisors)
    return true
  }

  /** 检查幕僚是否已退休 */
  function isRetired(advisorId: string): boolean {
    const advisors = storage.getAdvisors()
    const advisor = advisors.find(a => a.id === advisorId)
    return advisor?.retired ?? false
  }

  /** 获取所有非退休的幕僚 */
  function getActiveAdvisors(): { id: string; name: string; role: string; affinity: number }[] {
    const advisors = storage.getAdvisors()
    return advisors
      .filter(a => !a.retired)
      .map(a => ({ id: a.id, name: a.name, role: a.role, affinity: a.affinity }))
  }

  /** 获取所有已退休的幕僚 */
  function getRetiredAdvisors(): { id: string; name: string; role: string; retiredAt: string | null }[] {
    const advisors = storage.getAdvisors()
    return advisors
      .filter(a => a.retired)
      .map(a => ({ id: a.id, name: a.name, role: a.role, retiredAt: a.retiredAt ?? null }))
  }

  // ---- 年度对话 ----

  const ANNUAL_DIALOGUE_KEY = 'hf:annual_dialogue_year'

  /**
   * 年度对话：在每年 1 月 1 日首次启动时，生成一份增强叙事性的年度回顾
   * 按专注 / 笔记 / 情绪 / 锚点 / 结晶五个维度分段构建，末尾附启发性结语
   * @returns 年度回顾文本，若非 1 月 1 日或已显示过则返回 null
   */
  function getAnnualDialogue(): string | null {
    const now = new Date()
    if (now.getMonth() !== 0 || now.getDate() !== 1) return null

    const lastYear = now.getFullYear() - 1
    const shownYear = storage.getKV<number>(ANNUAL_DIALOGUE_KEY, 0)
    if (shownYear >= lastYear) return null // 已显示过

    storage.setKV(ANNUAL_DIALOGUE_KEY, lastYear)

    const sessions = storage.getSessions()
    const notes = storage.getNotes()
    const emotions = storage.getEmotions()
    const crystals = storage.getCrystals()
    const anchors = storage.getAnchors()

    const lastYearSessions = sessions.filter(s => {
      if (!s.completedAt) return false
      return new Date(s.completedAt).getFullYear() === lastYear
    })
    const lastYearNotes = notes.filter(n => {
      return new Date(n.createdAt).getFullYear() === lastYear
    })
    const lastYearEmotions = emotions.filter(e => {
      return new Date(e.createdAt).getFullYear() === lastYear
    })
    const lastYearCrystals = crystals.filter(c => {
      return new Date(c.createdAt).getFullYear() === lastYear
    })
    const lastYearAnchors = anchors.filter(a => {
      return new Date(a.createdAt).getFullYear() === lastYear
    })
    const completedAnchors = lastYearAnchors.filter(a => a.done).length

    const totalFocusCount = lastYearSessions.length
    const totalFocusDuration = lastYearSessions.reduce((sum, s) => sum + (s.elapsed || 0), 0)
    const totalFocusMinutes = Math.round(totalFocusDuration / 60000)
    const totalNotes = lastYearNotes.length
    const totalEmotions = lastYearEmotions.length
    const totalCrystals = lastYearCrystals.length

    // ---- 按维度构建叙事性文本 ----
    const parts: string[] = []
    parts.push(`「年度回顾 · ${lastYear}」`)

    // 专注维度
    if (totalFocusCount > 0) {
      parts.push(`【专注】这一年，你完成了 ${totalFocusCount} 次专注，累计 ${totalFocusMinutes} 分钟。每一次专注都是对时间的郑重承诺。`)
    } else {
      parts.push(`【专注】这一年尚未记录专注时光。每一段专注，都是与自己的深度对话。`)
    }

    // 笔记维度
    if (totalNotes > 0) {
      parts.push(`【笔记】你写下了 ${totalNotes} 篇笔记，字里行间藏着思考的轨迹。`)
    } else {
      parts.push(`【笔记】这一年还没有留下笔记。每一个想法，都值得被记录。`)
    }

    // 情绪维度
    if (totalEmotions > 0) {
      parts.push(`【情绪】你记录了 ${totalEmotions} 次情绪波动，每一种情绪都是生命的真实回响。`)
    } else {
      parts.push(`【情绪】这一年尚未记录情绪。每一次觉察，都是与自己和解的开始。`)
    }

    // 锚点维度
    if (lastYearAnchors.length > 0) {
      parts.push(`【锚点】你设立了 ${lastYearAnchors.length} 个锚点，其中 ${completedAnchors} 个已安然抵达。`)
    } else {
      parts.push(`【锚点】这一年尚未设立锚点。每一个锚点，都是对未来的温柔约定。`)
    }

    // 结晶维度
    if (totalCrystals > 0) {
      parts.push(`【结晶】时光凝结出 ${totalCrystals} 颗结晶，每一颗都映照着你的成长。`)
    } else {
      parts.push(`【结晶】这一年尚未凝结时间结晶。每一次沉淀，都会凝结成独一无二的光芒。`)
    }

    // 启发性结语
    parts.push('一月伊始，新的篇章正待书写。')

    return parts.join('\n')
  }

  /**
   * 年度对话集成版：通过气泡系统显示年度回顾
   * @returns 是否触发了年度对话
   */
  function triggerAnnualDialogue(): boolean {
    const text = getAnnualDialogue()
    if (text) {
      say(text, 'annual_dialogue')
      return true
    }
    return false
  }

  /**
   * 获取季度回顾：每季度末生成一次回顾
   * @returns 季度回顾文本，若未到季度末或已显示过则返回 null
   */
  function getQuarterlyDialogue(): string | null {
    const now = new Date()
    const quarter = Math.floor(now.getMonth() / 3) // 0-3
    const quarterEndMonth = quarter * 3 + 2 // 季末月 (2,5,8,11)
    // 只在季末月的最后 7 天触发
    if (now.getMonth() !== quarterEndMonth) return null
    const daysUntilEnd = new Date(now.getFullYear(), quarterEndMonth + 1, 0).getDate() - now.getDate()
    if (daysUntilEnd > 7) return null

    const key = `hf:quarterly_${now.getFullYear()}_q${quarter + 1}`
    const shown = storage.getKV<boolean>(key, false)
    if (shown) return null
    storage.setKV(key, true)

    const sessions = storage.getSessions()
    const notes = storage.getNotes()
    const emotions = storage.getEmotions()

    const quarterStart = new Date(now.getFullYear(), quarter * 3, 1)
    const quarterEnd = new Date(now.getFullYear(), quarter * 3 + 3, 0)

    const qSessions = sessions.filter(s => {
      if (!s.completedAt) return false
      const d = new Date(s.completedAt)
      return d >= quarterStart && d <= quarterEnd
    })
    const qNotes = notes.filter(n => {
      const d = new Date(n.createdAt)
      return d >= quarterStart && d <= quarterEnd
    })
    const qEmotions = emotions.filter(e => {
      const d = new Date(e.createdAt)
      return d >= quarterStart && d <= quarterEnd
    })

    const totalFocus = qSessions.length
    const totalMinutes = Math.round(qSessions.reduce((s, x) => s + (x.elapsed || 0), 0) / 60000)
    const totalNotes = qNotes.length
    const totalEmotions = qEmotions.length

    const quarterNames = ['一', '二', '三', '四']
    return `「第${quarterNames[quarter]}季度回顾」这个季度，你完成了 ${totalFocus} 次专注（${totalMinutes} 分钟），写下了 ${totalNotes} 篇笔记，记录了 ${totalEmotions} 次情绪。继续前行。`
  }

  /**
   * 季度对话集成版：通过气泡系统显示季度回顾
   * @returns 是否触发了季度对话
   */
  function triggerQuarterlyDialogue(): boolean {
    const text = getQuarterlyDialogue()
    if (text) {
      say(text, 'quarterly_dialogue')
      return true
    }
    return false
  }

  // ---- 原有逻辑 ----

  function loadMessages(): AdvisorMessage[] {
    return storage.getAdvisorMessages()
  }

  function persist() {
    const msgLimit = storage.getConfig().advisor.messageStorageLimit
    storage.setAdvisorMessages(messages.value.slice(-msgLimit))
  }

  /** 显示一句回应（自动消失） */
  function say(text: string, trigger = '', advisorId?: string) {
    const now = Date.now()
    if (pausedForSanctuary.value) return
    // 顾问总开关：关闭时静默（除非合规覆盖允许幕僚主动问候）
    const cfg = storage.getConfig()
    if (!cfg.advisorEnabled && !cfg.complianceOverride.advisorEnabled) return
    // 退休检查：如果指定了幕僚且已退休，不回应
    if (advisorId && isRetired(advisorId)) return
    // 限频：从配置读取限频间隔（定音锤和专注完成不受限频）
    const isHighPriority = trigger === 'focus_complete' || trigger.startsWith('dingyin_') || trigger === 'annual_dialogue' || trigger === 'quarterly_dialogue'
    const advisorCfg = storage.getConfig().advisor
    if (now - lastResponse < advisorCfg.rateLimitInterval && !isHighPriority) return
    // 每日最多主动回应上限（从配置读取，定音锤和年度对话不受限）
    if (todayResponseCount > advisorCfg.dailyResponseLimit && trigger !== 'click' && !isHighPriority) return

    // ---- 三级操作模式门控：仅对"主动动作"生效（click / 高优先级事件不在此列） ----
    // 非静默模式：不自动发声，转为待确认/建议事件，由用户点头才真正说出口。
    if (trigger !== 'click' && !isHighPriority) {
      const decision = decideForProactive()
      if (decision !== 'execute') {
        emitOperationGate({
          kind: 'advisor',
          decision,
          message: decision === 'confirm'
            ? `顾问想主动说：「${text}」`
            : `顾问建议：「${text}」`,
          text,
          advisorId,
        })
        return false
      }
    }

    lastResponse = now
    todayResponseCount++

    const msg: AdvisorMessage = {
      id: `msg_${now}`,
      text,
      at: new Date().toISOString(),
      trigger,
      direction: 'advisor_says',
    }

    // ---- 宪法第2条·超级自定义 / 第8条·中性呈现：运行时文案中性检测 ----
    // 蓝图要求"表达保持中性，不预设人格/立场/替用户作判断"。
    // 当对应 complianceOverride 关闭（默认）时，过滤器激活，执行真实检测。
    // 当前语义为"观测"：把命中写入消息元数据并累加审计，不拦截消息下发
    // （先建立检测与可见性，后续版本可在配置允许时升级为拦截）。
    const neutrality = checkAdvisorNeutrality(text)
    // 第4条·只给原材料不给结论：结论性表达检测（观测式 + override-aware）
    const dataDrivenHits = checkAdvisorDataDriven(text)
    const flags = {
      forbiddenPatterns: neutrality.forbiddenPatterns.map(h => h.matched),
      comparativePhrases: neutrality.comparativePhrases.map(h => h.matched),
      personification: neutrality.personification.map(h => h.matched),
      dataDriven: dataDrivenHits,
    }
    const hasNeutralityFlag =
      flags.forbiddenPatterns.length + flags.comparativePhrases.length + flags.personification.length > 0
    const hasDataDrivenFlag = flags.dataDriven.length > 0
    if (hasNeutralityFlag || hasDataDrivenFlag) {
      msg.constitutionFlags = flags
      // 累加审计（与 constitution 模块的审计日志同口径，便于合规面板统一查看）
      try {
        const baseline = useComplianceBaseline()
        if (hasNeutralityFlag) {
          baseline.recordAudit(
            'compliance_checked',
            `幕僚文案触发中性检测（第8条·中性呈现）：${JSON.stringify({
              forbiddenPatterns: flags.forbiddenPatterns,
              comparativePhrases: flags.comparativePhrases,
              personification: flags.personification,
            })}`,
            'neutral',
          )
        }
        if (hasDataDrivenFlag) {
          baseline.recordAudit(
            'compliance_checked',
            `幕僚文案触发结论性表达检测（第4条·只给原材料不给结论）：${JSON.stringify(flags.dataDriven)}`,
            'dataDriven',
          )
        }
      } catch {
        // 审计失败不影响消息下发
      }
    }

    messages.value.push(msg)
    persist()

    currentBubble.value = text
    if (bubbleTimer) clearTimeout(bubbleTimer)
    bubbleTimer = setTimeout(() => {
      currentBubble.value = null
    }, advisorCfg.bubbleDuration)

    // ---- 好感度处理 ----
    if (advisorId) {
      const advisors = storage.getAdvisors()
      const advisor = advisors.find(a => a.id === advisorId)
      if (advisor) {
        // 自动记录见证（仅存中性类别与时间戳，禁感受/描述）
        witness(advisorId, trigger)

        const personality = ADVISOR_PERSONALITIES.find(p => p.key === advisor.personality)
        const modifier = personality?.affinityModifiers?.[trigger] ?? 0.5
        const baseIncrement = getBaseIncrement(trigger)
        const increment = baseIncrement * modifier

        const current = affinityMap.value.get(advisorId) ?? 0
        const newVal = Math.min(100, current + increment)
        affinityMap.value.set(advisorId, newVal)

        const count = interactionCountMap.value.get(advisorId) ?? 0
        interactionCountMap.value.set(advisorId, count + 1)

        // 检查里程碑
        onAffinityMilestone(advisorId)
      }
    }
  }

  /** 每日重置计数器 */
  function resetDaily() {
    const localToday = getLocalDateKey()
    const timestampToday = new Date().toISOString().slice(0, 10)
    const lastReset = storage.getConfig().advisorResetDate || ''
    if (lastReset !== localToday) {
      const cfg = storage.getConfig()
      cfg.advisorResetDate = localToday
      storage.setConfig(cfg)
      // 新的一天，触发每日重置事件
      onReset()
    }
    // 始终从已存储的消息中统计今日已回复次数（页面刷新后也能正确恢复）
    todayResponseCount = messages.value.filter(
      m => m.at?.startsWith(timestampToday)
    ).length
  }

  /** 每日重置回调——新的一天首次加载时触发 */
  function onReset() {
    // 新的一天，检查年度/季度对话
    triggerAnnualDialogue()
    triggerQuarterlyDialogue()
  }

  // ---- 回应规则引擎 ----

  /** 记录见证到所有活跃的幕僚 */
  function witnessAll(eventType: string): void {
    const advisors = storage.getAdvisors()
    for (const a of advisors) {
      if (!a.retired) {
        witness(a.id, eventType)
      }
    }
  }

  function onFocusComplete(count: number) {
    resetDaily()
    witnessAll('focus_complete')
    const pool = [
      '已完成一次专注。',
      '本次专注已记录。',
      '又完成一次专注。',
      '专注已结束。',
    ]
    if (count === 1) {
      say(pool[Math.floor(Math.random() * pool.length)], 'focus_complete')
    } else if (count === 4) {
      say('今天已完成 4 次专注。', 'focus_milestone')
    } else if (count === 8) {
      say('今天已完成 8 次专注。', 'focus_milestone')
    } else if (count % 3 === 0) {
      say(pool[Math.floor(Math.random() * pool.length)], 'focus_complete')
    }
    // 触发定音锤检查
    triggerDingyinHammer('focus_complete')
  }

  function onVisit(hour: number) {
    if (hour >= 0 && hour < 5) {
      witnessAll('late_night')
      say('已记录深夜访问。', 'late_night')
    }
  }

  function onEmotionLogged(type: string, _note: string) {
    resetDaily()
    witnessAll('emotion_logged')
    if (type === 'sad' || type === 'angry') {
      say('已记录这次情绪。', 'emotion_logged')
    } else if (type === 'happy') {
      say('已记录这次情绪。', 'emotion_logged')
    } else {
      say('已记录。', 'emotion_logged')
    }
    // 触发定音锤检查
    triggerDingyinHammer('emotion_logged')
  }

  function onNoteCreated() {
    resetDaily()
    witnessAll('note_created')
    say('笔记已记录。', 'note_created')
    // 触发定音锤检查
    triggerDingyinHammer('note_created')
  }

  function onReturn(daysSince: number) {
    if (daysSince > 7) {
      witnessAll('return')
      say('已记录间隔后返回。', 'return')
    }
  }

  /** 检测用户是否离开多日后返回，并更新最后访问日期 */
  function checkReturn() {
    const today = getLocalDateKey()
    const cfg = storage.getConfig()
    const lastVisit = cfg.lastVisitDate
    if (lastVisit && lastVisit !== today) {
      const lastDate = new Date(lastVisit)
      const todayDate = new Date(today)
      const diffMs = todayDate.getTime() - lastDate.getTime()
      const daysSince = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      if (daysSince > 0) {
        onReturn(daysSince)
      }
    }
    cfg.lastVisitDate = today
    storage.setConfig(cfg)
  }

  /** 点击载体时随机一句话 */
  function onTap() {
    if (pausedForSanctuary.value) return
    const stats = getQuickStats()
    const pool = [
      `今天完成了 ${stats.focusCount} 次专注。`,
      `花房里有 ${stats.emotionCount} 朵花。`,
      `书架上放着 ${stats.noteCount} 本笔记。`,
      `今日有 ${stats.pendingAnchors} 个未完成锚点。`,
      '可查看当前记录。',
    ]
    say(pool[Math.floor(Math.random() * pool.length)], 'click')
  }

  function getQuickStats() {
    const localToday = getLocalDateKey()
    const timestampToday = new Date().toISOString().slice(0, 10)
    const sessions = storage.getSessions()
    return {
      focusCount: sessions.filter(s => s.completedAt?.startsWith(timestampToday)).length,
      emotionCount: storage.getEmotions().length,
      noteCount: storage.getNotes().length,
      pendingAnchors: storage.getAnchors().filter((a: any) => !a.done && a.targetDate === localToday).length,
    }
  }

  // 初始化后立即同步今日计数 & 初始化好感度
  resetDaily()
  initAffinity()
  // 注入 6 类固定幕僚预设（幂等，不覆盖用户自定义）
  ensureDefaultAdvisors()

  function pauseForSanctuary() {
    pausedForSanctuary.value = true
    currentBubble.value = null
    if (bubbleTimer) {
      clearTimeout(bubbleTimer)
      bubbleTimer = null
    }
  }

  function resumeFromSanctuary() {
    pausedForSanctuary.value = false
  }

  return {
    messages,
    currentBubble,
    affinityMap,
    interactionCountMap,
    say,
    onFocusComplete,
    onVisit,
    onEmotionLogged,
    onNoteCreated,
    onReturn,
    checkReturn,
    onTap,
    resetDaily,
    onReset,
    getQuickStats,
    pauseForSanctuary,
    resumeFromSanctuary,
    getAffinityTier,
    saveAffinity,
    onAffinityMilestone,
    getDingyinHammer,
    triggerDingyinHammer,
    getDingyinProgress,
    getAllDingyinProgress,
    getFourActs,
    getFourActsIronLawResponse,
    getFourActsProgress,
    // 幕僚调度系统
    getTaskAwareness,
    dispatchAvatar,
    getTaskProgress,
    // 调令系统（幕僚管家闭环）
    commandTasks,
    issueCommand,
    getCommandTasks,
    getAnnualDialogue,
    triggerAnnualDialogue,
    getQuarterlyDialogue,
    triggerQuarterlyDialogue,
    // 见证系统
    witness,
    witnessAll,
    getWitnessLog,
    getWitnessSummary,
    clearWitnessLog,
    // 互动系统
    reply,
    replySync,
    getConversationContext,
    // 退休系统
    retireAdvisor,
    unretireAdvisor,
    isRetired,
    getActiveAdvisors,
    getRetiredAdvisors,
    // 幕僚 CRUD（响应式）
    advisors,
    refreshAdvisors,
    getAdvisorById,
    addAdvisorProfile,
    updateAdvisorProfile,
    removeAdvisorProfile,
    ensureDefaultAdvisors,
    applyLongDormancy,
  }
})