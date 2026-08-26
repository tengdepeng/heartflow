// ============================================================
// 释光阁 · 四束光 本地规则推理引擎
// ------------------------------------------------------------
// 纯函数、确定性、零网络：基于用户已记录的数据（反思、专注、冥想、
// 字镜墙、素镜墙）对四束光进行打分并产出数据驱动的洞察。
// 不引入任何随机性与外部调用，便于单元测试与可复现。
// ============================================================

export type LightKey = 'premise' | 'frame' | 'emotion' | 'absence'

export interface FourLightsInput {
  /** 反思笔记总数 */
  reflectionCount: number
  /** 近 30 天反思数 */
  reflectionRecentCount: number
  /** 冥想总次数 */
  meditationSessions: number
  /** 冥想连续天数 */
  meditationStreak: number
  /** 专注会话数 */
  focusSessions: number
  /** 专注覆盖的标签种类数 */
  focusTagVariety: number
  /** 专注覆盖的模式种类数 */
  focusModeVariety: number
  /** 平均单次专注时长（分钟） */
  avgFocusDurationMin: number
  /** 字镜墙词语数 */
  wordMirrorCount: number
  /** 素镜墙行为痕迹数 */
  wordHistoryCount: number
}

export interface LightState {
  key: LightKey
  label: string
  icon: string
  color: string
  /** 0-100 确定性评分 */
  score: number
  level: '微弱' | '微光' | '明亮' | '辉耀'
  /** 由输入数据推导的洞察（非随机） */
  insights: string[]
}

export const LIGHT_META: Record<LightKey, { label: string; icon: string; color: string }> = {
  premise: { label: '前提之光', icon: '↓', color: '#f0c040' },
  frame: { label: '框架之光', icon: '→', color: '#a07c8c' },
  emotion: { label: '情感之光', icon: '↑', color: '#d98c7a' },
  absence: { label: '缺席之光', icon: '○', color: '#555' },
}

export const LIGHT_ORDER: LightKey[] = ['premise', 'frame', 'emotion', 'absence']

function clamp(n: number, min = 0, max = 100): number {
  if (!isFinite(n)) return min
  return Math.max(min, Math.min(max, n))
}

function levelOf(score: number): LightState['level'] {
  if (score < 25) return '微弱'
  if (score < 50) return '微光'
  if (score < 75) return '明亮'
  return '辉耀'
}

function insightPremise(i: FourLightsInput): string[] {
  const out: string[] = []
  if (i.reflectionCount === 0) {
    out.push('你还没有写反思笔记——前提之光需要先有"被记录下来的前提"。')
  } else {
    const recent = i.reflectionRecentCount > 0 ? `（近 30 天 ${i.reflectionRecentCount} 条）` : ''
    out.push(`你已记录 ${i.reflectionCount} 条反思${recent}，前提之光在累积。`)
  }
  if (i.wordMirrorCount > 0) {
    out.push(`你收集了 ${i.wordMirrorCount} 个反复出现的词，留意它们背后默认的"前提"。`)
  }
  if (i.reflectionCount >= 10) {
    out.push('反思已成习惯，可尝试在每次记录里显式写下："我当时默认了什么？"')
  }
  return out
}

function insightFrame(i: FourLightsInput): string[] {
  const out: string[] = []
  if (i.focusTagVariety === 0 && i.meditationSessions === 0) {
    out.push('框架之光偏弱：尝试用不同维度（标签 / 模式）记录同一件事。')
  } else {
    const quality = i.focusTagVariety >= 4 ? '良好' : '尚可'
    out.push(`你的专注覆盖 ${i.focusTagVariety} 类标签、${i.focusModeVariety} 种模式，框架多样性${quality}。`)
  }
  if (i.meditationSessions > 0) {
    out.push(`冥想 ${i.meditationSessions} 次，有助于从"观察者"框架回看自己。`)
  }
  if (i.avgFocusDurationMin >= 25) {
    out.push(`平均单次专注 ${i.avgFocusDurationMin.toFixed(0)} 分钟，深度框架在形成。`)
  }
  return out
}

function insightEmotion(i: FourLightsInput): string[] {
  const out: string[] = []
  if (i.wordHistoryCount === 0 && i.reflectionRecentCount === 0) {
    out.push('情感之光偏弱：可在素镜墙留下身体反应与情绪标记。')
  } else {
    const recent = i.reflectionRecentCount > 0 ? `、近 ${i.reflectionRecentCount} 条近期反思` : ''
    out.push(`你留下了 ${i.wordHistoryCount} 条行为痕迹${recent}，情感觉察在生长。`)
  }
  if (i.meditationStreak > 0) {
    out.push(`连续冥想 ${i.meditationStreak} 天，情绪改善可被持续追踪。`)
  }
  return out
}

function insightAbsence(i: FourLightsInput): string[] {
  const out: string[] = []
  const active = [
    i.reflectionCount > 0,
    i.wordMirrorCount > 0,
    i.wordHistoryCount > 0,
    i.meditationSessions > 0,
    i.focusSessions > 0,
  ].filter(Boolean).length
  if (active <= 1) {
    out.push('缺席之光提醒：你只在单一渠道记录，许多维度尚未进入视野。')
  } else {
    out.push(`你已在 ${active} 个渠道留下痕迹，缺席之光鼓励你留意"还没被记录"的部分。`)
  }
  if (i.reflectionCount > 0) {
    out.push('在反思里试着写下："这件事里暂时没有提到谁 / 什么？"')
  }
  return out
}

/** 确定性评估四束光，返回按 LIGHT_ORDER 排列的状态数组。 */
export function evaluateFourLights(input: FourLightsInput): LightState[] {
  const safe: FourLightsInput = {
    reflectionCount: Math.max(0, input.reflectionCount | 0),
    reflectionRecentCount: Math.max(0, input.reflectionRecentCount | 0),
    meditationSessions: Math.max(0, input.meditationSessions | 0),
    meditationStreak: Math.max(0, input.meditationStreak | 0),
    focusSessions: Math.max(0, input.focusSessions | 0),
    focusTagVariety: Math.max(0, input.focusTagVariety | 0),
    focusModeVariety: Math.max(0, input.focusModeVariety | 0),
    avgFocusDurationMin: Math.max(0, input.avgFocusDurationMin || 0),
    wordMirrorCount: Math.max(0, input.wordMirrorCount | 0),
    wordHistoryCount: Math.max(0, input.wordHistoryCount | 0),
  }

  const scoreOf: Record<LightKey, number> = {
    premise: clamp(safe.reflectionCount * 5 + safe.reflectionRecentCount * 4 + safe.wordMirrorCount * 3),
    frame: clamp(safe.focusTagVariety * 9 + safe.focusModeVariety * 10 + safe.meditationSessions * 2),
    emotion: clamp(safe.wordHistoryCount * 5 + safe.reflectionRecentCount * 3 + safe.meditationStreak * 3),
    absence: clamp(
      [
        safe.reflectionCount > 0,
        safe.wordMirrorCount > 0,
        safe.wordHistoryCount > 0,
        safe.meditationSessions > 0,
        safe.focusSessions > 0,
      ].filter(Boolean).length * 16 + safe.reflectionCount * 2,
    ),
  }

  const insightOf: Record<LightKey, (i: FourLightsInput) => string[]> = {
    premise: insightPremise,
    frame: insightFrame,
    emotion: insightEmotion,
    absence: insightAbsence,
  }

  return LIGHT_ORDER.map((key) => {
    const meta = LIGHT_META[key]
    const score = scoreOf[key]
    return {
      key,
      label: meta.label,
      icon: meta.icon,
      color: meta.color,
      score,
      level: levelOf(score),
      insights: insightOf[key](safe),
    }
  })
}
