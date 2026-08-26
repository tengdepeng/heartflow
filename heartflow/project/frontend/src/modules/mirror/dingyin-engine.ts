// ============================================================
// 定音锤 · 证据聚合引擎
// 蓝图要求：从殿堂所有角落调取关于「你是一个怎样的人」的全部证据，分四幕呈现。
//
// 铁律：
//   1. 陈列而非叙事 —— 不使用因果连接词（"所以""因此""这说明"）
//   2. 只呈现不评判 —— 不说"好/坏/应该/需要"
//   3. 证据可溯源 —— 每条 detailLine 注明数据来源模块
//   4. 沉默默认 —— 空数据优雅降级，不报错、不伪造
// ============================================================

import { storage } from '../../engine/storage'
import { getLocalDateKey } from '../../utils/time'
import type { FourActItem, HammerState } from '../../stores/advisor'

// ---- 证据来源类型 ----
export type EvidenceSource =
  | 'focus'       // 专注
  | 'note'        // 笔记
  | 'crystal'     // 时间结晶
  | 'anchor'      // 逐日心锚
  | 'emotion'     // 情绪花房
  | 'relation'    // 羁绊之厅
  | 'goal'        // 目标
  | 'body'        // 身体温室
  | 'word-mirror' // 字镜阁
  | 'ledger'      // 留光阁
  | 'dream'       // 平行世界·梦境
  | 'reading'     // 阅览殿
  | 'discipline'  // 自律工坊
  | 'roots'       // 根脉之庭
  | 'carrier'     // 载体
  | 'breathing'   // 呼吸
  | 'worklog'     // 工痕
  | 'movement'    // 动律之间

/** 单条证据 */
export interface EvidenceLine {
  /** 人类可读的证据陈述 */
  text: string
  /** 证据来源模块 */
  source: EvidenceSource
  /** 数值（用于排序/权重） */
  weight: number
  /** 是否为「新变化」（最近 7 天内出现的变化） */
  isRecent: boolean
}

/** 定音锤触发新鲜度 */
export interface DingyinFreshness {
  /** 上次敲锤时间 */
  lastKnockedAt: string | null
  /** 自上次敲锤以来的新增证据数 */
  newEvidenceCount: number
  /** 是否有显著变化（建议重敲） */
  hasSignificantChange: boolean
  /** 建议重敲的原因 */
  suggestionReason: string | null
}

// ---- 常量 ----
const RECENT_DAYS = 7
const SIGNIFICANT_CHANGE_THRESHOLD = 5

// ---- 工具函数 ----

function daysAgo(iso: string): number {
  const now = Date.now()
  const then = new Date(iso).getTime()
  return Math.floor((now - then) / 86400000)
}

function isRecent(iso: string): boolean {
  return daysAgo(iso) <= RECENT_DAYS
}

function fmtDurationMinutes(ms: number): string {
  const mins = Math.round(ms / 60000)
  if (mins < 60) return `${mins} 分钟`
  const hours = Math.floor(mins / 60)
  const remain = mins % 60
  return remain > 0 ? `${hours} 小时 ${remain} 分钟` : `${hours} 小时`
}

function fmtRelativeDate(iso: string): string {
  const d = daysAgo(iso)
  if (d === 0) return '今天'
  if (d === 1) return '昨天'
  if (d <= 7) return `${d} 天前`
  if (d <= 30) return `${Math.floor(d / 7)} 周前`
  return `${Math.floor(d / 30)} 月前`
}

// ---- 证据采集器 ----

/**
 * 第一幕 · 你做过的事
 * 证据来源：专注、笔记、结晶、锚点、工痕、留光阁
 */
function gatherActOne(): EvidenceLine[] {
  const lines: EvidenceLine[] = []
  const localToday = getLocalDateKey()

  // 专注
  const sessions = storage.getSessions()
  const completed = sessions.filter(s => s.status === 'completed')
  const totalFocus = completed.length
  const totalMs = completed.reduce((sum, s) => sum + (s.elapsed || 0), 0)
  const todaySessions = completed.filter(s => s.completedAt?.startsWith(localToday))
  const recentSessions = completed.filter(s => isRecent(s.completedAt || ''))

  if (totalFocus > 0) {
    lines.push({
      text: `专注完成 ${totalFocus} 次，累计 ${fmtDurationMinutes(totalMs)}`,
      source: 'focus', weight: totalFocus, isRecent: recentSessions.length > 0,
    })
    if (todaySessions.length > 0) {
      lines.push({
        text: `今日已专注 ${todaySessions.length} 次`,
        source: 'focus', weight: todaySessions.length * 3, isRecent: true,
      })
    }
    if (recentSessions.length > 0) {
      const recentMs = recentSessions.reduce((sum, s) => sum + (s.elapsed || 0), 0)
      lines.push({
        text: `最近 7 天完成 ${recentSessions.length} 次专注，共 ${fmtDurationMinutes(recentMs)}`,
        source: 'focus', weight: recentSessions.length * 2, isRecent: true,
      })
    }
  }

  // 笔记
  const notes = storage.getNotes()
  if (notes.length > 0) {
    const recentNotes = notes.filter(n => isRecent(n.updatedAt || n.createdAt))
    lines.push({
      text: `笔记 ${notes.length} 篇`,
      source: 'note', weight: notes.length, isRecent: recentNotes.length > 0,
    })
    if (recentNotes.length > 0) {
      lines.push({
        text: `最近 7 天新增 ${recentNotes.length} 篇笔记`,
        source: 'note', weight: recentNotes.length * 2, isRecent: true,
      })
    }
  }

  // 结晶
  const crystals = storage.getCrystals()
  if (crystals.length > 0) {
    const recentCrystals = crystals.filter(c => isRecent(c.createdAt))
    lines.push({
      text: `时间结晶 ${crystals.length} 颗`,
      source: 'crystal', weight: crystals.length, isRecent: recentCrystals.length > 0,
    })
  }

  // 锚点
  const anchors = storage.getAnchors()
  const completedAnchors = anchors.filter(a => a.done)
  const todayAnchors = anchors.filter(a => a.targetDate === localToday)
  if (anchors.length > 0) {
    lines.push({
      text: `锚点 ${completedAnchors.length}/${anchors.length} 已完成`,
      source: 'anchor', weight: anchors.length, isRecent: todayAnchors.length > 0,
    })
  }

  // 工痕
  const worklogs = storage.getKV<any[]>('hf:worklog_records', [])
  if (worklogs.length > 0) {
    const recentWorklogs = worklogs.filter((w: any) => isRecent(w.at || w.createdAt))
    lines.push({
      text: `工痕记录 ${worklogs.length} 条`,
      source: 'worklog', weight: worklogs.length, isRecent: recentWorklogs.length > 0,
    })
  }

  // 留光阁
  const ledger = storage.getKV<any[]>('hf:ledger', [])
  if (ledger.length > 0) {
    const recentLedger = ledger.filter((l: any) => isRecent(l.at || l.createdAt))
    lines.push({
      text: `留光阁冥想 ${ledger.length} 次`,
      source: 'ledger', weight: ledger.length, isRecent: recentLedger.length > 0,
    })
  }

  return lines
}

/**
 * 第二幕 · 你如何对待别人
 * 证据来源：关系卡片、亲密度、最近联系、羁绊桥
 */
function gatherActTwo(): EvidenceLine[] {
  const lines: EvidenceLine[] = []
  const relations = storage.getRelations()

  if (relations.length === 0) return lines

  const relationLabelMap: Record<string, string> = {
    family: '家人', lover: '伴侣', friend: '朋友', colleague: '同事', mentor: '导师', other: '其他',
  }

  lines.push({
    text: `人物卡片 ${relations.length} 张`,
    source: 'relation', weight: relations.length, isRecent: false,
  })

  // 关系类型分布
  const typeCounts: Record<string, number> = {}
  for (const r of relations) {
    typeCounts[r.relation] = (typeCounts[r.relation] || 0) + 1
  }
  const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])
  for (const [type, count] of sortedTypes) {
    lines.push({
      text: `${relationLabelMap[type] || type} ${count} 位`,
      source: 'relation', weight: count, isRecent: false,
    })
  }

  // 亲密度最高的三位
  const topRelations = relations
    .sort((a, b) => b.closeness - a.closeness)
    .slice(0, 3)
  for (const r of topRelations) {
    lines.push({
      text: `${r.name}（${relationLabelMap[r.relation] || r.relation}）亲密度 ${Math.round(r.closeness * 100)}%`,
      source: 'relation', weight: Math.round(r.closeness * 10), isRecent: false,
    })
  }

  // 最近联系
  const recentContacts = relations
    .filter(r => r.lastContact)
    .sort((a, b) => new Date(b.lastContact!).getTime() - new Date(a.lastContact!).getTime())
    .slice(0, 3)
  for (const r of recentContacts) {
    const isRecentContact = isRecent(r.lastContact!)
    lines.push({
      text: `${r.name} 最近联系 ${fmtRelativeDate(r.lastContact!)}`,
      source: 'relation', weight: isRecentContact ? 5 : 1, isRecent: isRecentContact,
    })
  }

  return lines
}

/**
 * 第三幕 · 你如何成长
 * 证据来源：目标、自律、根脉、载体、阅览
 */
function gatherActThree(): EvidenceLine[] {
  const lines: EvidenceLine[] = []

  // 目标
  const goals = storage.getGoals()
  const domainLabelMap: Record<string, string> = {
    work: '工作', growth: '成长', health: '健康', relation: '关系', wealth: '财富', play: '逸趣', other: '其他',
  }

  if (goals.length > 0) {
    const visionCount = goals.filter(g => g.tier === 'vision').length
    const targetCount = goals.filter(g => g.tier === 'target').length
    const planCount = goals.filter(g => g.tier === 'plan').length
    const bloomGoals = goals.filter(g => g.status === 'bloom')
    const growingGoals = goals.filter(g => g.status === 'growing' || g.status === 'sprout')

    lines.push({
      text: `目标 ${goals.length} 个（愿景 ${visionCount}，目标 ${targetCount}，计划 ${planCount}）`,
      source: 'goal', weight: goals.length, isRecent: false,
    })
    lines.push({
      text: `已开花 ${bloomGoals.length} 个，生长中 ${growingGoals.length} 个`,
      source: 'goal', weight: bloomGoals.length * 2, isRecent: false,
    })

    const domainCounts: Record<string, number> = {}
    for (const g of goals) {
      domainCounts[g.domain] = (domainCounts[g.domain] || 0) + 1
    }
    const topDomain = Object.entries(domainCounts).sort((a, b) => b[1] - a[1])[0]
    if (topDomain) {
      lines.push({
        text: `投入最多的领域：${domainLabelMap[topDomain[0]] || topDomain[0]}（${topDomain[1]} 个目标）`,
        source: 'goal', weight: topDomain[1], isRecent: false,
      })
    }

    for (const g of bloomGoals.slice(0, 3)) {
      lines.push({
        text: `${g.title} 已开花`,
        source: 'goal', weight: 3, isRecent: isRecent(g.updatedAt || ''),
      })
    }
  }

  // 自律工坊
  const habits = storage.getKV<any[]>('hf:discipline_habits', [])
  if (habits.length > 0) {
    const activeHabits = habits.filter((h: any) => !h.archived)
    const recentStreak = habits.filter((h: any) => {
      const lastCheck = h.lastCheckIn || h.updatedAt
      return lastCheck && isRecent(lastCheck)
    })
    lines.push({
      text: `自律习惯 ${activeHabits.length} 个`,
      source: 'discipline', weight: activeHabits.length, isRecent: recentStreak.length > 0,
    })
  }

  // 阅览殿
  const readingLogs = storage.getKV<any[]>('hf:reading_logs', [])
  if (readingLogs.length > 0) {
    const recentReading = readingLogs.filter((r: any) => isRecent(r.at || r.createdAt))
    lines.push({
      text: `阅读记录 ${readingLogs.length} 条`,
      source: 'reading', weight: readingLogs.length, isRecent: recentReading.length > 0,
    })
  }

  // 载体
  const carriers = storage.getKV<any[]>('hf:carriers', [])
  if (carriers.length > 0) {
    const activeCarriers = carriers.filter((c: any) => c.status !== 'retired')
    lines.push({
      text: `载体 ${activeCarriers.length} 个活跃`,
      source: 'carrier', weight: activeCarriers.length, isRecent: false,
    })
  }

  return lines
}

/**
 * 第四幕 · 你内心真正的声音
 * 证据来源：情绪、身体、字镜、梦境、呼吸
 */
function gatherActFour(): EvidenceLine[] {
  const lines: EvidenceLine[] = []

  // 情绪
  const emotions = storage.getEmotions()
  const emotionLabelMap: Record<string, string> = {
    happy: '开心', calm: '平静', sad: '低落', anxious: '焦虑', angry: '愤怒',
  }

  if (emotions.length > 0) {
    const recentEmotions = emotions.filter(e => isRecent(e.createdAt))
    lines.push({
      text: `情绪记录 ${emotions.length} 次`,
      source: 'emotion', weight: emotions.length, isRecent: recentEmotions.length > 0,
    })

    const typeCounts: Record<string, number> = {}
    for (const e of emotions) {
      typeCounts[e.type] = (typeCounts[e.type] || 0) + 1
    }
    const sortedEmotions = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])
    for (const [type, count] of sortedEmotions.slice(0, 3)) {
      lines.push({
        text: `${emotionLabelMap[type] || type} ${count} 次`,
        source: 'emotion', weight: count, isRecent: false,
      })
    }

    // 情绪趋势：最近 7 天 vs 之前
    if (recentEmotions.length > 0 && emotions.length > recentEmotions.length) {
      lines.push({
        text: `最近 7 天记录 ${recentEmotions.length} 次情绪`,
        source: 'emotion', weight: recentEmotions.length * 2, isRecent: true,
      })
    }
  }

  // 身体
  const bodyLogs = storage.getKV<any[]>('hf:body_logs', [])
  if (bodyLogs.length > 0) {
    const sleepLogs = bodyLogs.filter((l: any) => l.type === 'sleep')
    const exerciseLogs = bodyLogs.filter((l: any) => l.type === 'exercise')
    const mealLogs = bodyLogs.filter((l: any) => l.type === 'meal')

    if (sleepLogs.length > 0) {
      const totalHours = sleepLogs.reduce((sum: number, l: any) => sum + (l.value?.hours || 0), 0)
      const avgSleep = Math.round(totalHours / sleepLogs.length * 10) / 10
      lines.push({
        text: `平均睡眠 ${avgSleep} 小时（${sleepLogs.length} 次记录）`,
        source: 'body', weight: sleepLogs.length, isRecent: false,
      })
    }
    if (exerciseLogs.length > 0) {
      const totalMins = exerciseLogs.reduce((sum: number, l: any) => sum + (l.value?.minutes || 0), 0)
      lines.push({
        text: `累计运动 ${totalMins} 分钟（${exerciseLogs.length} 次记录）`,
        source: 'body', weight: exerciseLogs.length, isRecent: false,
      })
    }
    if (mealLogs.length > 0) {
      lines.push({
        text: `饮食记录 ${mealLogs.length} 次`,
        source: 'body', weight: mealLogs.length, isRecent: false,
      })
    }
  }

  // 字镜
  const wordMirrorWords = storage.getKV<any[]>('hf:word_mirror', [])
  const wordHistory = storage.getKV<any[]>('hf:word_history', [])
  if (wordMirrorWords.length > 0) {
    const memorized = wordMirrorWords.filter((w: any) => w.proficiency >= 5).length
    lines.push({
      text: `字镜词汇 ${wordMirrorWords.length} 个（熟记 ${memorized} 个）`,
      source: 'word-mirror', weight: wordMirrorWords.length, isRecent: false,
    })
  }
  if (wordHistory.length > 0) {
    lines.push({
      text: `字镜分析 ${wordHistory.length} 次`,
      source: 'word-mirror', weight: wordHistory.length, isRecent: false,
    })
  }

  // 梦境
  const dreams = storage.getKV<any[]>('hf:dreams', [])
  if (dreams.length > 0) {
    const recentDreams = dreams.filter((d: any) => isRecent(d.at || d.createdAt))
    lines.push({
      text: `梦境记录 ${dreams.length} 则`,
      source: 'dream', weight: dreams.length, isRecent: recentDreams.length > 0,
    })
  }

  // 呼吸
  const breathingLogs = storage.getKV<any[]>('hf:breathing_logs', [])
  if (breathingLogs.length > 0) {
    const recentBreathing = breathingLogs.filter((b: any) => isRecent(b.at || b.createdAt))
    lines.push({
      text: `呼吸练习 ${breathingLogs.length} 次`,
      source: 'breathing', weight: breathingLogs.length, isRecent: recentBreathing.length > 0,
    })
  }

  return lines
}

// ---- 证据聚合 ----

/**
 * 按 weight 降序排列，取前 N 条
 */
function topEvidence(lines: EvidenceLine[], n: number): EvidenceLine[] {
  return [...lines].sort((a, b) => b.weight - a.weight).slice(0, n)
}

/**
 * 计算证据进度（0-1）
 */
function evidenceProgress(lines: EvidenceLine[], threshold: number): number {
  const totalWeight = lines.reduce((sum, l) => sum + l.weight, 0)
  return Math.min(1, totalWeight / threshold)
}

// ---- 主入口 ----

const DINGYIN_KNOCK_KEY = 'hf:dingyin_knock_ts'

/**
 * 从殿堂所有角落调取证据，生成四幕数据。
 * 每一幕的 detailLines 为叙事级证据陈述（非统计数字），
 * 遵守铁律：陈列而非叙事、只呈现不评判。
 */
export function gatherFourActs(): FourActItem[] {
  const act1 = gatherActOne()
  const act2 = gatherActTwo()
  const act3 = gatherActThree()
  const act4 = gatherActFour()

  const act1Lines = topEvidence(act1, 8)
  const act2Lines = topEvidence(act2, 8)
  const act3Lines = topEvidence(act3, 8)
  const act4Lines = topEvidence(act4, 8)

  const hasAct1 = act1Lines.length > 0
  const hasAct2 = act2Lines.length > 0
  const hasAct3 = act3Lines.length > 0
  const hasAct4 = act4Lines.length > 0

  return [
    {
      id: 'act_what_you_did',
      title: '你做过的事',
      icon: '📜',
      summary: hasAct1
        ? `${act1Lines.length} 条证据，来自 ${new Set(act1Lines.map(l => l.source)).size} 个角落`
        : '暂无记录',
      detailLines: hasAct1 ? act1Lines.map(l => l.text) : ['这里还没有你留下的痕迹。'],
      progress: evidenceProgress(act1, 30),
      color: '#f0c040',
      hammerState: 'idle' as HammerState,
    },
    {
      id: 'act_how_you_treat_others',
      title: '你如何对待别人',
      icon: '🤝',
      summary: hasAct2
        ? `${act2Lines.length} 条证据，来自 ${new Set(act2Lines.map(l => l.source)).size} 个角落`
        : '暂无关系卡片',
      detailLines: hasAct2 ? act2Lines.map(l => l.text) : ['还没有建立关系卡片。'],
      progress: evidenceProgress(act2, 15),
      color: '#d98c7a',
      hammerState: 'idle' as HammerState,
    },
    {
      id: 'act_how_you_grow',
      title: '你如何成长',
      icon: '🌱',
      summary: hasAct3
        ? `${act3Lines.length} 条证据，来自 ${new Set(act3Lines.map(l => l.source)).size} 个角落`
        : '暂无目标',
      detailLines: hasAct3 ? act3Lines.map(l => l.text) : ['还没有种下目标。'],
      progress: evidenceProgress(act3, 20),
      color: '#8a9a7a',
      hammerState: 'idle' as HammerState,
    },
    {
      id: 'act_inner_voice',
      title: '你内心真正的声音',
      icon: '🔮',
      summary: hasAct4
        ? `${act4Lines.length} 条证据，来自 ${new Set(act4Lines.map(l => l.source)).size} 个角落`
        : '暂无记录',
      detailLines: hasAct4 ? act4Lines.map(l => l.text) : ['还没有记录下内心的声音。'],
      progress: evidenceProgress(act4, 25),
      color: '#a07c8c',
      hammerState: 'idle' as HammerState,
    },
  ]
}

/**
 * 铁律·镜我的终结回应：
 * 在四幕全部呈现完毕后，只输出这一句话，不做任何总结性叙事。
 */
export function getIronLawResponse(): string {
  return '我把我看到的东西放在这里了。'
}

/**
 * 获取定音锤四幕总体进度
 */
export function getFourActsProgress(): { completed: number; total: number } {
  const acts = gatherFourActs()
  const completed = acts.filter(a => a.progress >= 1).length
  return { completed, total: acts.length }
}

/**
 * 记录敲锤时间，并计算新鲜度。
 */
export function knockAndGetFreshness(): DingyinFreshness {
  const prevKnock = storage.getKV<string | null>(DINGYIN_KNOCK_KEY, null)
  const now = new Date().toISOString()
  storage.setKV(DINGYIN_KNOCK_KEY, now)

  if (!prevKnock) {
    return {
      lastKnockedAt: null,
      newEvidenceCount: 0,
      hasSignificantChange: false,
      suggestionReason: null,
    }
  }

  // 统计自上次敲锤以来的新增证据
  const allLines = [
    ...gatherActOne(),
    ...gatherActTwo(),
    ...gatherActThree(),
    ...gatherActFour(),
  ]
  const newEvidence = allLines.filter(l => l.isRecent).length

  return {
    lastKnockedAt: prevKnock,
    newEvidenceCount: newEvidence,
    hasSignificantChange: newEvidence >= SIGNIFICANT_CHANGE_THRESHOLD,
    suggestionReason: newEvidence >= SIGNIFICANT_CHANGE_THRESHOLD
      ? `自上次敲锤以来，有 ${newEvidence} 条新证据产生`
      : null,
  }
}

/**
 * 检查是否有新证据值得重敲（不记录敲锤时间，仅查询）。
 */
export function checkFreshness(): DingyinFreshness {
  const prevKnock = storage.getKV<string | null>(DINGYIN_KNOCK_KEY, null)
  if (!prevKnock) {
    return {
      lastKnockedAt: null,
      newEvidenceCount: 0,
      hasSignificantChange: false,
      suggestionReason: null,
    }
  }

  const allLines = [
    ...gatherActOne(),
    ...gatherActTwo(),
    ...gatherActThree(),
    ...gatherActFour(),
  ]
  const newEvidence = allLines.filter(l => l.isRecent).length

  return {
    lastKnockedAt: prevKnock,
    newEvidenceCount: newEvidence,
    hasSignificantChange: newEvidence >= SIGNIFICANT_CHANGE_THRESHOLD,
    suggestionReason: newEvidence >= SIGNIFICANT_CHANGE_THRESHOLD
      ? `自上次敲锤以来，有 ${newEvidence} 条新证据产生`
      : null,
  }
}