// ============================================================
// 镜我 · 自我认知档案分析引擎（INCR-34）
// 基于对话数据，以轻量阈值提炼人格风格、价值观、成长阶段与温和洞察
// 纯函数、无存储副作用；与 personality-model 深度建模互补
// ============================================================

import type { DialogueEntry } from './types'
import {
  STYLE_DIMENSION_META,
  VALUE_DIMENSION_META,
  GROWTH_PHASE_META,
} from './personality-model'
import type {
  StyleDimension,
  ValueDimension,
  GrowthNode,
} from './personality-model'

// ============================================================
// 类型
// ============================================================

/** 自我认知档案 · 概览 */
export interface SelfCognitionOverview {
  /** 全部对话条数（含镜我） */
  total: number
  /** 用户发言条数（可分析样本） */
  userCount: number
  /** 用户沉淀总字数 */
  totalWords: number
  /** 平均每条字数 */
  avgLength: number
  /** 覆盖天数 */
  daySpan: number
  /** 距最近一次对话天数 */
  lastActiveDays: number
  /** 近 7 天用户条数 */
  recent7: number
  /** 反思性表达占比 0-1 */
  reflectRatio: number
}

/** 风格维度行 */
export interface StyleDimensionRow {
  dimension: StyleDimension
  label: string
  highLabel: string
  lowLabel: string
  score: number
}

/** 价值观维度行 */
export interface ValueDimensionRow {
  dimension: ValueDimension
  label: string
  description: string
  score: number
  evidence: string[]
}

/** 成长阶段 */
export interface SelfCognitionGrowth {
  phase: GrowthNode['phase']
  label: string
  icon: string
  description: string
  rationale: string
}

/** 温和洞察 */
export interface SelfCognitionInsight {
  title: string
  detail: string
  tone: 'positive' | 'gentle' | 'neutral'
}

// ============================================================
// 关键词表（与 personality-model 语义对齐）
// ============================================================

const STYLE_KEYWORDS: Partial<Record<StyleDimension, string[]>> = {
  formality: ['您', '请', '谢谢', '感谢', '抱歉', '能否', '是否', '应当', '建议', '烦请'],
  emotionality: ['开心', '难过', '焦虑', '兴奋', '感动', '喜欢', '爱', '快乐', '幸福', '痛苦', '期待', '害怕', '担心', '棒', '赞'],
  directness: ['我要', '我想', '我决定', '我不', '直接', '马上', '现在'],
  reflectiveness: ['反思', '回顾', '为什么', '总结', '复盘', '思考', '觉得', '发现', '意识到', '成长', '收获', '学到'],
  creativity: ['创造', '想象', '如果', '试试', '新', '有趣', '独特', '创意', '不同'],
  analytical: ['因为', '所以', '如果', '那么', '首先', '总结', '因此', '分析', '数据', '逻辑', '原因', '结果'],
  social_warmth: ['谢谢', '辛苦', '加油', '没关系', '一起', '我们', '帮忙', '支持', '陪伴', '关心'],
}

const VALUE_KEYWORDS: Record<ValueDimension, string[]> = {
  autonomy: ['自己做', '独立', '自主', '自由', '选择', '决定', '我想', '我要', '不愿意被', '自己决定'],
  growth: ['学习', '成长', '进步', '提升', '发展', '变得更好', '努力', '练习', '掌握', '理解'],
  connection: ['朋友', '家人', '关系', '陪伴', '一起', '分享', '交流', '聊天', '理解我', '支持'],
  contribution: ['帮助', '贡献', '给予', '分享', '支持', '鼓励', '指导', '传授', '影响', '改变'],
  security: ['安全', '稳定', '保障', '确定', '安心', '放心', '可靠', '控制', '规划', '安排'],
  pleasure: ['开心', '快乐', '享受', '喜欢', '好吃', '好玩', '有趣', '放松', '娱乐', '美好'],
  achievement: ['完成', '达成', '目标', '成功', '突破', '超越', '优秀', '第一', '最好', '做到'],
  authenticity: ['真实', '诚实', '真诚', '自己', '本来', '伪装', '假装', '真实感受', '坦率', '实话'],
  balance: ['平衡', '休息', '放松', '工作', '生活', '节奏', '调整', '适度', '兼顾', '劳逸'],
  curiosity: ['为什么', '好奇', '探索', '发现', '了解', '想知道', '试试', '新鲜', '未知', '有趣'],
}

function userTexts(dialogues: DialogueEntry[]): string[] {
  return dialogues.filter((d) => d.role === 'user').map((d) => d.text)
}

function keywordHitCount(texts: string[], keywords: string[]): number {
  let match = 0
  for (const t of texts) {
    for (const kw of keywords) {
      if (t.includes(kw)) {
        match++
        break
      }
    }
  }
  return match
}

/** 与 personality-model 一致的评分：按命中比例适度放大并封顶 1 */
function scoreFromHits(textsLen: number, hits: number): number {
  if (textsLen === 0) return 0
  return Math.min(1, hits / (textsLen * 0.3))
}

// ============================================================
// 概览
// ============================================================

export function selfCognitionOverview(
  dialogues: DialogueEntry[],
  now: Date = new Date(),
): SelfCognitionOverview {
  const user = dialogues.filter((d) => d.role === 'user')
  const totalWords = user.reduce((s, d) => s + d.text.length, 0)

  let daySpan = 0
  let lastActiveDays = 0
  if (user.length > 0) {
    const timestamps = user.map((d) => d.timestamp)
    const minTs = Math.min(...timestamps)
    const maxTs = Math.max(...timestamps)
    daySpan = Math.max(1, Math.round((maxTs - minTs) / 86400000) + 1)
    lastActiveDays = Math.max(0, Math.round((now.getTime() - maxTs) / 86400000))
  }

  const recent7 = user.filter((d) => now.getTime() - d.timestamp <= 7 * 86400000).length

  const reflectWords = STYLE_KEYWORDS.reflectiveness ?? []
  const reflectRatio = user.length
    ? Math.min(1, keywordHitCount(user.map((d) => d.text), reflectWords) / user.length)
    : 0

  return {
    total: dialogues.length,
    userCount: user.length,
    totalWords,
    avgLength: user.length ? Math.round(totalWords / user.length) : 0,
    daySpan,
    lastActiveDays,
    recent7,
    reflectRatio,
  }
}

// ============================================================
// 人格风格
// ============================================================

export function selfCognitionStyle(dialogues: DialogueEntry[]): StyleDimensionRow[] {
  const texts = userTexts(dialogues)
  const n = texts.length

  const rows: StyleDimensionRow[] = (Object.keys(STYLE_DIMENSION_META) as StyleDimension[]).map(
    (dimension) => {
      const meta = STYLE_DIMENSION_META[dimension]
      let score: number
      if (dimension === 'conciseness') {
        score = n ? Math.min(1, texts.filter((t) => t.length < 30).length / n) : 0
      } else {
        score = scoreFromHits(n, keywordHitCount(texts, STYLE_KEYWORDS[dimension] ?? []))
      }
      return {
        dimension,
        label: meta.label,
        highLabel: meta.highLabel,
        lowLabel: meta.lowLabel,
        score,
      }
    },
  )

  return rows.sort((a, b) => b.score - a.score)
}

// ============================================================
// 价值观取向
// ============================================================

export function selfCognitionValues(dialogues: DialogueEntry[]): ValueDimensionRow[] {
  const texts = userTexts(dialogues)
  const n = texts.length

  const rows: ValueDimensionRow[] = (Object.keys(VALUE_DIMENSION_META) as ValueDimension[]).map(
    (dimension) => {
      const meta = VALUE_DIMENSION_META[dimension]
      const keywords = VALUE_KEYWORDS[dimension]

      let hits = 0
      const evidence: string[] = []
      for (const t of texts) {
        for (const kw of keywords) {
          if (t.includes(kw)) {
            hits++
            if (evidence.length < 4 && t.length > 10) {
              evidence.push(t.slice(0, 46) + (t.length > 46 ? '…' : ''))
            }
            break
          }
        }
      }

      return {
        dimension,
        label: meta.label,
        description: meta.description,
        score: scoreFromHits(n, hits),
        evidence,
      }
    },
  )

  return rows
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
}

// ============================================================
// 成长阶段
// ============================================================

export function selfCognitionGrowth(
  dialogues: DialogueEntry[],
  overview?: SelfCognitionOverview,
): SelfCognitionGrowth | null {
  const user = dialogues.filter((d) => d.role === 'user')
  if (user.length === 0) return null

  const ov = overview ?? selfCognitionOverview(dialogues)
  const reflect = ov.reflectRatio

  let phase: GrowthNode['phase']
  if (ov.daySpan < 7 || user.length < 8) {
    phase = 'initial'
  } else if (reflect >= 0.35 || ov.daySpan >= 90) {
    phase = 'transformation'
  } else if (ov.daySpan >= 30) {
    phase = 'consolidation'
  } else {
    phase = 'exploration'
  }

  const meta = GROWTH_PHASE_META[phase]
  const rationale = `基于 ${ov.daySpan} 天跨度 · ${user.length} 次留声 · 反思表达占比 ${Math.round(reflect * 100)}%`

  return {
    phase,
    label: meta.label,
    icon: meta.icon,
    description: meta.description,
    rationale,
  }
}

// ============================================================
// 温和洞察
// ============================================================

export function selfCognitionInsights(
  dialogues: DialogueEntry[],
  overview?: SelfCognitionOverview,
  styleRows?: StyleDimensionRow[],
): SelfCognitionInsight[] {
  const ov = overview ?? selfCognitionOverview(dialogues)
  const styles = styleRows ?? selfCognitionStyle(dialogues)
  const insights: SelfCognitionInsight[] = []

  const topStyle = styles[0]
  if (topStyle && topStyle.score >= 0.35) {
    insights.push({
      title: `你倾向于「${topStyle.highLabel}」的沟通风格`,
      detail: `在 ${ov.userCount} 次留声中，「${topStyle.label}」维度最为凸显，说明你习惯${topStyle.highLabel === '精简' ? '提炼要点、言简意赅' : '以这个方式组织自己的表达'}。`,
      tone: 'positive',
    })
  }

  if (ov.daySpan >= 14) {
    insights.push({
      title: '你拥有持续的自我对话习惯',
      detail: `画像跨度覆盖 ${ov.daySpan} 天，这是一段可被回溯的自我认知积累，值得珍视。`,
      tone: 'positive',
    })
  }

  if (ov.reflectRatio >= 0.3) {
    insights.push({
      title: '你时常向内反思',
      detail: `反思性表达占比达 ${Math.round(ov.reflectRatio * 100)}%，向内观照是你成长的重要养料。`,
      tone: 'positive',
    })
  }

  if (ov.userCount < 8 || topStyle.score < 0.35) {
    insights.push({
      title: '档案仍在生长',
      detail: `目前仅有 ${ov.userCount} 次留声，更多对话会让你的人格画像更加鲜明立体。`,
      tone: 'gentle',
    })
  }

  if (insights.length === 0) {
    insights.push({
      title: '等待第一道倒影',
      detail: '与镜我聊聊此刻的感受，第一抹自我认知便会开始显影。',
      tone: 'neutral',
    })
  }

  return insights.slice(0, 3)
}