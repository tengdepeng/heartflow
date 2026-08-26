// ============================================================
// 镜我 · 自然语言创建（蓝图17 · 复用 intents.ts 创建计划/习惯/笔记）
// 解析自然语言 → 意图 → 分发到对应房间的创建 API，打通"输入即创建"。
//
// MVP 四件套（方案 6/8/11/12）：
//  - 实时意图预览（previewIntent / detectIntent）
//  - 房间感知路由（ctx.roomId 落到创建的实体）
//  - 意图可覆盖（ctx.overrideKind）
//  - 人格化回应（personaReply）
// ============================================================

import { parseTaskBest } from './parser'
import type { IntentCategory } from './types'
import { useStudy, extractTags } from '../study'
import { createNode } from '../knowledge/relation'
import type { KnowledgeNode, KnowledgeCategory } from '../knowledge/types'
import { useDisciplineBridge } from '../discipline/workshop-bridge'

/** 创建的落库分类 */
export type NLKind = 'habit' | 'plan' | 'note' | 'focus' | 'unsupported'

/** 自然语言创建结果 */
export type NLCreateResult =
  | { kind: 'plan'; id: string; title: string }
  | { kind: 'habit'; id: string; title: string }
  | { kind: 'note'; id: string }
  | { kind: 'focus' }
  | { kind: 'unsupported'; intent: IntentCategory | 'unknown' }

/** 实时意图预览（纯函数，不落库） */
export interface NLIntentPreview {
  /** 预览分类 */
  kind: NLKind
  /** 中文标签 */
  label: string
  /** 是否命中习惯关键词 */
  habitHit: boolean
  /** 置信度 0-1（habit 恒为 1） */
  confidence?: number
  /** 若给定房间，落库后将打上的房间标记 */
  roomId?: string
  /** 建议标题（habit/plan 有） */
  title?: string
}

/** 创建上下文（房间感知 + 意图覆盖） */
export interface NLCreateContext {
  /** 当前所在房间，落库实体将带上 roomId 供房间级聚合 */
  roomId?: string
  /** 用户手动覆盖的意图类型（绕过自动识别） */
  overrideKind?: Exclude<NLKind, 'unsupported'>
}

/** 习惯意图关键词（自律工坊：自然语言 → 习惯） */
const HABIT_KEYWORDS = ['习惯', '每天', '坚持', '养成', '打卡', '日常']

/** 分类中文标签 */
const KIND_LABEL: Record<NLKind, string> = {
  habit: '习惯',
  plan: '计划',
  note: '笔记',
  focus: '专注',
  unsupported: '暂不支持',
}

/** 是否命中"习惯"语义（优先于通用意图解析） */
export function detectHabitIntent(raw: string): boolean {
  const t = (raw || '').trim()
  return HABIT_KEYWORDS.some(k => t.includes(k))
}

function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

// ============================================================
// 语丝结构化抽取（方案 14）
// 从自然语言中抽取 时间 / 执行人 / 优先级 / 标题 / 标签，
// 让落库的笔记与计划自带结构，而非纯文本。
// ============================================================

const WEEKDAYS: Record<string, number> = {
  日: 0, 天: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6,
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** 本地日期/时间格式化（避免 toISOString 的时区位移导致跨日） */
function toLocalStr(d: Date, withTime: boolean, h = 0, m = 0): string {
  const date = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
  return withTime ? `${date}T${pad2(h)}:${pad2(m)}:00` : date
}

/** 抽取截止时间（相对日 / 星期 / 绝对日期 + 时间点） */
export function extractDue(raw: string, base: Date = new Date()): { iso: string | null; label: string | null } {
  const t = raw || ''

  // 1) 相对日
  let offset: number | null = null
  let label: string | null = null
  if (/今[天日]/.test(t)) { offset = 0; label = '今天' }
  else if (/大后天/.test(t)) { offset = 3; label = '大后天' }
  else if (/后天/.test(t)) { offset = 2; label = '后天' }
  else if (/明天|明日/.test(t)) { offset = 1; label = '明天' }
  else if (/前天/.test(t)) { offset = -2; label = '前天' }
  else if (/昨天|昨日/.test(t)) { offset = -1; label = '昨天' }

  // 2) 星期（含"下周X"）
  if (offset === null) {
    const wm = t.match(/(下{0,2}周|下{0,2}星期|下{0,2}礼拜)([一二三四五六日天])/)
    if (wm) {
      const target = WEEKDAYS[wm[2]]
      const isNext = /下/.test(wm[1])
      const cur = base.getDay()
      let diff = (target - cur + 7) % 7
      if (isNext) diff += 7
      offset = diff
      label = wm[0]
    }
  }

  // 3) 绝对日期
  let year: number | null = null
  let month: number | null = null
  let day: number | null = null
  if (offset === null) {
    const full = t.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
    if (full) {
      year = +full[1]; month = +full[2] - 1; day = +full[3]
    } else {
      const md = t.match(/(\d{1,2})月(\d{1,2})[日号]?/)
      if (md) {
        year = base.getFullYear(); month = +md[1] - 1; day = +md[2]
        if (month < base.getMonth()) year += 1
      } else {
        const sl = t.match(/(\d{1,2})[/\.\-](\d{1,2})/)
        if (sl) {
          year = base.getFullYear(); month = +sl[1] - 1; day = +sl[2]
          if (month < base.getMonth() || (month === base.getMonth() && day < base.getDate())) year += 1
        }
      }
    }
  }

  // 4) 时间点（下午/晚上等 +12；上午/早上取 12 小时制）
  let hh: number | null = null
  let mm = 0
  const colon = t.match(/(上午|早上|凌晨|下午|晚上|中午)?\s*(\d{1,2})\s*[:：]\s*(\d{2})/)
  if (colon) {
    hh = +colon[2]; mm = +colon[3]
    const period = colon[1] || ''
    if (/下午|晚上|中午/.test(period) && hh < 12) hh += 12
    if (/上午|早上|凌晨/.test(period)) hh = hh % 12
  } else {
    const oclock = t.match(/(上午|早上|凌晨|下午|晚上|中午)?\s*(\d{1,2})\s*点/)
    if (oclock) {
      hh = +oclock[2]
      const period = oclock[1] || ''
      if (/下午|晚上|中午/.test(period) && hh < 12) hh += 12
      if (/上午|早上|凌晨/.test(period)) hh = hh % 12
    }
  }

  // 组装日期
  let date: Date | null = null
  if (offset !== null) {
    date = new Date(base)
    date.setDate(date.getDate() + offset)
  } else if (year !== null && month !== null && day !== null) {
    date = new Date(year, month, day)
  }

  if (!date) return { iso: null, label: null }
  if (hh !== null) {
    const timeLabel = `${pad2(hh)}:${pad2(mm)}`
    return { iso: toLocalStr(date, true, hh, mm), label: label ? `${label} ${timeLabel}` : timeLabel }
  }
  return { iso: toLocalStr(date, false), label }
}

/** 抽取执行人（@提及 / 交给·让·指派给 + 中文名 + 动作动词 / 和X一起） */
export function extractAssignee(raw: string): string | null {
  const t = raw || ''
  const at = t.match(/@([^\s@，。；,;：:]+)/)
  if (at) return at[1]
  const verb = t.match(
    /(?:交给|指派给|分配给|让|派)\s*([\u4e00-\u9fa5]{2,4}?)\s*(?:赶紧|立即|尽快|紧急)?\s*(去|做|完成|负责|处理|写|跑|看|准备|一下|落实|执行|推进|整理|修复|上线)/,
  )
  if (verb) return verb[1]
  const withSb = t.match(/(?:和|跟|同|与)\s*([\u4e00-\u9fa5]{1,6}?)\s*(?:一起|去|跑|做|玩|聊|吃饭|完成|负责)/)
  if (withSb) return withSb[1]
  return null
}

/** 抽取优先级（紧急/重要 → 高；不急/有空 → 低；其余 普通） */
export function extractPriority(raw: string): 'low' | 'normal' | 'high' {
  const t = raw || ''
  if (/紧急|重要|高优|立马|马上|尽快|优先|必须|务必|赶紧/.test(t)) return 'high'
  if (/不急|有空|低优|随便|改天|闲时|慢慢|再说/.test(t)) return 'low'
  return 'normal'
}

/** 结构化抽取结果（方案 14 对外暴露） */
export interface StructuredIntent {
  /** 去标签后的干净正文 */
  cleanText: string
  /** 派生标题（首句 ≤30 字） */
  title: string
  /** 标签（含 #标签） */
  tags: string[]
  /** 截止时间 ISO（本地） */
  due: string | null
  /** 截止时间可读标签 */
  dueLabel: string | null
  /** 执行人 */
  assignee: string | null
  /** 优先级 */
  priority: 'low' | 'normal' | 'high'
}

/** 从自然语言抽取全部结构化字段（不落库，供 UI 预览与落库复用） */
export function extractStructured(raw: string): StructuredIntent {
  const text = (raw || '').trim()
  const tags = extractTags(text)
  const due = extractDue(text)
  const assignee = extractAssignee(text)
  const priority = extractPriority(text)
  const cleanText = text
    .replace(/(?:^|\s)#([\p{L}\p{N}_]+)/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const title = (cleanText.split(/[，。；!?\n]/)[0] || '').trim().slice(0, 30)
  return { cleanText, title, tags, due: due.iso, dueLabel: due.label, assignee, priority }
}

/** 将计划文本落库为经略阁知识节点（默认分类 frame） */
function createPlanNode(
  text: string,
  roomId?: string,
  opts?: {
    title?: string
    tags?: string[]
    due?: string | null
    assignee?: string | null
    priority?: 'low' | 'normal' | 'high'
  },
): KnowledgeNode {
  const now = new Date().toISOString()
  const node: KnowledgeNode = {
    id: genId('node'),
    title: (opts?.title || text).slice(0, 60) || '未命名计划',
    desc: text,
    cat: 'frame' as KnowledgeCategory,
    tags: opts?.tags ?? [],
    createdAt: now,
    updatedAt: now,
    roomId: roomId || undefined,
    due: opts?.due || undefined,
    assignee: opts?.assignee || undefined,
    priority: opts?.priority || undefined,
  }
  return createNode(node)
}

/**
 * 纯预览：解析输入意图，但不做任何落库。
 * 供 UI 实时展示"将创建什么"，以及房间感知提示。
 */
export function detectIntent(raw: string, ctx?: { roomId?: string }): NLIntentPreview {
  const text = (raw || '').trim()
  if (!text) {
    return { kind: 'unsupported', label: KIND_LABEL.unsupported, habitHit: false, roomId: ctx?.roomId }
  }

  if (detectHabitIntent(text)) {
    const title = text.replace(new RegExp(`(${HABIT_KEYWORDS.join('|')})`, 'g'), '').trim() || text
    return { kind: 'habit', label: KIND_LABEL.habit, habitHit: true, confidence: 1, roomId: ctx?.roomId, title }
  }

  const parsed = parseTaskBest(text)
  const intent: IntentCategory = parsed?.intent ?? 'unknown'
  const map: Record<string, NLKind> = { plan: 'plan', note: 'note', focus: 'focus' }
  const kind = map[intent] ?? 'unsupported'
  return {
    kind,
    label: KIND_LABEL[kind],
    habitHit: false,
    confidence: parsed?.confidence,
    roomId: ctx?.roomId,
  }
}

/** 预览别名（语义更贴近 UI 调用点） */
export function previewIntent(raw: string, ctx?: { roomId?: string }): NLIntentPreview {
  return detectIntent(raw, ctx)
}

/**
 * 人格化回应文案（方案 12）。
 * 依据陪伴幕僚的性格（steady/lively/rigorous/intuitive/caring）给出不同语气的收尾句。
 * 语气保持克制、中性，不夸大、不操控。
 */
const PERSONA_REPLY: Record<Exclude<NLKind, 'unsupported'>, Record<string, string>> = {
  habit: {
    steady: '习惯已种下，日拱一卒便好。',
    lively: '新习惯记下啦，明天见分晓～',
    rigorous: '已建立习惯追踪，建议设定可量化目标。',
    intuitive: '感觉这会是个温柔的开始。',
    caring: '我陪你一起，慢慢来。',
    default: '已为你记下这个习惯。',
  },
  plan: {
    steady: '计划已落进经略阁，按节奏推进。',
    lively: '计划收好咯，随时可以展开～',
    rigorous: '已生成计划节点，建议拆成可执行步骤。',
    intuitive: '让它先在心里长一会儿。',
    caring: '想做就做，我替你记着。',
    default: '已为你创建计划。',
  },
  note: {
    steady: '灵感已收进思绪书房。',
    lively: '记下啦，回头翻翻会有新意思～',
    rigorous: '已归档为笔记，可补充标签与关联。',
    intuitive: '念头落定，留白处自有回响。',
    caring: '你的小心思，我好好收着。',
    default: '已为你记录笔记。',
  },
  focus: {
    steady: '专注已就绪，去计时器开始吧。',
    lively: '进入专注模式，冲鸭～',
    rigorous: '已标记专注意图，请启动计时。',
    intuitive: '呼吸放轻，慢慢沉下来。',
    caring: '累了就歇，不必勉强。',
    default: '已为你准备专注。',
  },
}

/** 取性格对应的回应文案（未知性格回落 default） */
export function personaReply(
  kind: Exclude<NLKind, 'unsupported'>,
  persona: string,
): string {
  const table = PERSONA_REPLY[kind]
  return table[persona] ?? table.default
}

/**
 * 自然语言创建入口：
 * 1) 习惯关键词优先 → 自律工坊创建习惯；
 * 2) 否则经镜我意图解析分发：
 *    - plan  → 经略阁知识节点
 *    - note  → 思绪书房快速记录
 *    - focus → 启动专注（无落库实体）
 *    - 其余  → unsupported
 * 支持 ctx.roomId（房间感知落库）与 ctx.overrideKind（手动覆盖意图）。
 */
export function executeNaturalLanguageCreate(raw: string, ctx?: NLCreateContext): NLCreateResult {
  const text = (raw || '').trim()
  if (!text) return { kind: 'unsupported', intent: 'unknown' }

  // 手动覆盖优先：用户显式指定落库类型
  if (ctx?.overrideKind) {
    return dispatchByKind(ctx.overrideKind, text, ctx.roomId)
  }

  if (detectHabitIntent(text)) {
    const title = text.replace(new RegExp(`(${HABIT_KEYWORDS.join('|')})`, 'g'), '').trim() || text
    const habit = useDisciplineBridge().addHabit(title, '', '🌱', 'easy', 'daily', 1)
    return { kind: 'habit', id: habit.id, title: habit.title }
  }

  const parsed = parseTaskBest(text)
  const intent: IntentCategory = parsed?.intent ?? 'unknown'

  switch (intent) {
    case 'plan': {
      const s = extractStructured(text)
      const node = createPlanNode(text, ctx?.roomId, {
        title: s.title || undefined,
        tags: s.tags,
        due: s.due,
        assignee: s.assignee,
        priority: s.priority,
      })
      return { kind: 'plan', id: node.id, title: node.title }
    }
    case 'note': {
      const s = extractStructured(text)
      const note = useStudy().quickCapture(text, {
        roomId: ctx?.roomId,
        title: s.title,
        tags: s.tags,
        due: s.due,
        assignee: s.assignee,
        priority: s.priority,
      })
      return note ? { kind: 'note', id: note.id } : { kind: 'unsupported', intent }
    }
    case 'focus':
      return { kind: 'focus' }
    default:
      return { kind: 'unsupported', intent }
  }
}

/** 按指定类型分发（供覆盖与常规流程共用） */
function dispatchByKind(kind: Exclude<NLKind, 'unsupported'>, text: string, roomId?: string): NLCreateResult {
  switch (kind) {
    case 'habit': {
      const title = text.replace(new RegExp(`(${HABIT_KEYWORDS.join('|')})`, 'g'), '').trim() || text
      const habit = useDisciplineBridge().addHabit(title, '', '🌱', 'easy', 'daily', 1)
      return { kind: 'habit', id: habit.id, title: habit.title }
    }
    case 'plan': {
      const s = extractStructured(text)
      const node = createPlanNode(text, roomId, {
        title: s.title || undefined,
        tags: s.tags,
        due: s.due,
        assignee: s.assignee,
        priority: s.priority,
      })
      return { kind: 'plan', id: node.id, title: node.title }
    }
    case 'note': {
      const s = extractStructured(text)
      const note = useStudy().quickCapture(text, {
        roomId,
        title: s.title,
        tags: s.tags,
        due: s.due,
        assignee: s.assignee,
        priority: s.priority,
      })
      return note ? { kind: 'note', id: note.id } : { kind: 'unsupported', intent: 'unknown' }
    }
    case 'focus':
      return { kind: 'focus' }
  }
}
