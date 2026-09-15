// ============================================================
// 调令意图解析引擎（幕僚管家核心 · 纯本地规则化）
// 输入自然语言调令 → 输出意图分类，供镜我派单与进度描述使用。
// 不依赖任何云端 AI，全部关键词规则在本地完成（符合宪法第1条·本地私有）。
// ============================================================

import {
  NAV_TARGETS,
  buildFeatureHint,
  matchExactDestination,
  pickDirectJump,
  resolveDestination,
  searchFeatures,
  type FeatureHit,
} from './featureDictionary'

export type CommandTaskType =
  | 'focus'
  | 'note'
  | 'emotion'
  | 'anchor'
  | 'review'
  | 'finance'
  | 'navigate'
  | 'general'

export interface CommandIntent {
  /** 内部任务类型键 */
  taskType: CommandTaskType
  /** 中文意图标签（用于调令台展示） */
  intentLabel: string
  /** 派单时传给 dispatchAvatar 的键 */
  dispatchKey: string
  /** 幕僚「任务中」所在的房间（蓝图644：进度描述带房间名） */
  room: string
  /** 任务中动作描述种子 */
  action: string
  /** navigate 类：目标路由（如 /settings），由 UI 层下达后立即跳转 */
  targetRoute?: string
  /** navigate 类：目标空间中文名 */
  targetName?: string
  /** 未命中已知意图时的功能搜索候选（供回复里让用户一句话确认） */
  suggestions?: FeatureHit[]
  /** 连候选都没有时的可用功能清单提示（替代干巴巴的「没有这个功能」） */
  featureHint?: string
}

// 关键词优先级：navigate > finance > review > emotion > anchor > note > focus > general
// 注1：review 优先于 note，因「查工作记录」「回顾」等含「记录」但语义是检索汇总。
// 注2：navigate 需「导航动词 + 目的地别名」双条件命中，否则回落常规意图——
//      否则「帮我设个锚点」「记录一下」这类含房间/功能词的调令会被误判为跳转。
// 注3：finance 优先于 review/note，因「查一下这个月的开销」含 review 的「查」、
//      「记一笔账」含 note 的「记一笔」，但用户真实意图是记账。
const NAVIGATE_KW = [
  '打开', '开启', '前往', '进入', '切到', '切换到', '跳到', '带我去', '转入', '去',
]

// ---- 财务 / 记账意图 ----
// 项目里真实存在的财务空间是 /reward「劳酬」（记账 v2：多账户 / 预算预警 /
// 支出流水 / 月结单 / CSV 导入）。此前词表完全没接上，导致「我要记账」被判为
// general，幕僚回不出有用信息。
/** 强财务词：出现即判为财务意图，不受记录动作词干扰 */
const FINANCE_STRONG_KW = [
  '记账', '账本', '算账', '财务', '收支', '流水账', '账单', '报销', '结余', '资产负债',
]
/** 弱财务词：出现即判为财务意图，除非同时出现明确的「记录/笔记」动作词 */
const FINANCE_WEAK_KW = [
  '开销', '花销', '花钱', '消费', '支出', '收入', '预算', '流水', '月结', '入账', '出账', '记一笔',
]
/** 明确的「记一条笔记」动作词：与弱财务词同时出现时，以笔记为准（如「记一下今天的开销」） */
const NOTE_ACTION_KW = [
  '记一下', '记一记', '记下', '笔记', '写下', '速记', '备忘', '摘', '记录',
]

const REVIEW_KW = [
  '查', '查看', '回顾', '统计', '汇总', '分析', '报告', '检索', '对比',
  '曲线', '复盘', '报表', '数据', '工作记录', '找一找', '找找', '回顾一下', '看看',
]
const EMOTION_KW = [
  '情绪', '心情', '感受', '难过', '开心', '焦虑', '低落', '平静', '愤怒',
  '情绪波动', '委屈', '放松', 'emo',
]
const ANCHOR_KW = [
  '锚点', '锚定', '目标', '习惯', '打卡', '待办', '计划', '任务清单', '养成', '立个 flag',
]
const NOTE_KW = [
  '笔记', '记录', '记一下', '记一记', '摘', '备忘', '写下来', '速记', '记下', '记一笔',
]
const FOCUS_KW = [
  '专注', '计时', '番茄', '心流', '干活', '学习', '开始工作', '深度工作', '写代码', '阅读', '沉浸',
]

const ROOM_BY_TYPE: Record<CommandTaskType, string> = {
  focus: '静谧庭院',
  note: '思绪书房',
  emotion: '情绪花房',
  anchor: '锚点庭院',
  review: '时间长廊',
  finance: '劳酬',
  navigate: '殿堂',
  general: '殿堂',
}

const ACTION_BY_TYPE: Record<CommandTaskType, string> = {
  focus: '为你开启专注场域',
  note: '替你沉淀思绪',
  emotion: '陪你梳理情绪',
  anchor: '为你锚定今日目标',
  review: '检索并交叉比对你的数据',
  finance: '为你打开账本，记账与预算都在这里',
  navigate: '为你开启对应空间',
  general: '协调相关幕僚',
}

const LABEL_BY_TYPE: Record<CommandTaskType, string> = {
  focus: '专注调度',
  note: '笔记记录',
  emotion: '情绪梳理',
  anchor: '锚点锚定',
  review: '汇总检索',
  finance: '记账理财',
  navigate: '空间跳转',
  general: '通用协调',
}

function hit(text: string, kws: string[]): boolean {
  return kws.some((k) => text.includes(k))
}

/** 匹配调令中的目的地别名，命中返回 { 路由, 中文名 } */
function matchNavTarget(text: string): { route: string; name: string } | null {
  for (const t of NAV_TARGETS) {
    if (t.keys.some((k) => text.includes(k))) return { route: t.route, name: t.name }
  }
  return null
}

// 导航动词按长度降序（剥离前缀时「带我去」须先于「去」命中，否则残余会多出「带我」）
const NAV_VERBS_BY_LEN = [...NAVIGATE_KW].sort((a, b) => b.length - a.length)

/** 剥离开头的导航动词，得到目的地短语；开头无动词则返回 null */
function stripNavVerb(text: string): string | null {
  for (const v of NAV_VERBS_BY_LEN) {
    if (text.startsWith(v)) {
      const rest = text.slice(v.length).trim()
      return rest || null
    }
  }
  return null
}

/**
 * 解析导航目标（调令「去 X / 打开 X / 裸房名」→ 真实路由，运行时对齐全量房间图）：
 *   1) 整句恰为房间名/功能说法 → 直达（裸房名，如「家」「幕僚好感」「心流」）
 *   2) 含导航动词 → 剥离动词后按残余短语定向（精确优先，避免「未完成花园」被「花园」劫持）
 *   3) 回退旧别名子串匹配（兼容「我要打开设置」这类动词不居首的说法）
 * 无动词且非裸房名 → null（不跳转，交回常规意图判定，防「帮我设个锚点」被误判为跳转）。
 */
function resolveNavTarget(text: string): { route: string; name: string } | null {
  const bare = matchExactDestination(text)
  if (bare) return { route: bare.route, name: bare.name }

  if (!hit(text, NAVIGATE_KW)) return null

  const residue = stripNavVerb(text)
  if (residue) {
    const dest = resolveDestination(residue)
    if (dest) return { route: dest.route, name: dest.name }
  }
  return matchNavTarget(text)
}

/** 是否为财务/记账意图（强词直接命中；弱词需无明确记录动作词） */
function isFinance(text: string): boolean {
  if (hit(text, FINANCE_STRONG_KW)) return true
  if (hit(text, FINANCE_WEAK_KW) && !hit(text, NOTE_ACTION_KW)) return true
  return false
}

/**
 * 解析调令文本为意图。纯规则、确定性、零外部依赖。
 *
 * 未匹配任何关键词时不再直接丢给 general 了事：先在功能词典里做一次模糊搜索
 * （词典运行时由 NAV_TARGETS + 真实路由表 + 房间图生成），
 *   · 唯一且高置信 → 直接跳转；
 *   · 多个相近     → 返回候选，让幕僚一句话请用户确认；
 *   · 都不相干     → 给出可用功能清单，而不是「没有这个功能」。
 */
export function parseCommandIntent(text: string): CommandIntent {
  const t = (text || '').trim()

  // 导航：裸房名直达，或「导航动词 + 目的地」双条件命中
  const nav = resolveNavTarget(t)
  const isNav = !!nav

  let taskType: CommandTaskType = 'general'
  if (isNav) taskType = 'navigate'
  else if (isFinance(t)) taskType = 'finance'
  else if (hit(t, REVIEW_KW)) taskType = 'review'
  else if (hit(t, EMOTION_KW)) taskType = 'emotion'
  else if (hit(t, ANCHOR_KW)) taskType = 'anchor'
  else if (hit(t, NOTE_KW)) taskType = 'note'
  else if (hit(t, FOCUS_KW)) taskType = 'focus'

  if (taskType === 'navigate' && nav) {
    return {
      taskType,
      intentLabel: `前往${nav.name}`,
      dispatchKey: taskType,
      room: nav.name,
      action: `为你开启${nav.name}`,
      targetRoute: nav.route,
      targetName: nav.name,
    }
  }

  // 财务意图落到真实存在的 /reward「劳酬」
  if (taskType === 'finance') {
    const target = NAV_TARGETS.find((x) => x.route === '/reward')
    const route = target?.route ?? '/reward'
    const name = target?.name ?? '劳酬'
    return {
      taskType,
      intentLabel: LABEL_BY_TYPE[taskType],
      dispatchKey: taskType,
      room: ROOM_BY_TYPE[taskType],
      action: ACTION_BY_TYPE[taskType],
      targetRoute: route,
      targetName: name,
    }
  }

  // ---- 功能搜索兜底：没命中任何已知意图 ----
  if (taskType === 'general' && t.length > 0) {
    const hits = searchFeatures(t, 3)
    const direct = pickDirectJump(t, hits)
    if (direct) {
      return {
        taskType: 'navigate',
        intentLabel: `前往${direct.name}`,
        dispatchKey: 'navigate',
        room: direct.name,
        action: `为你开启${direct.name}`,
        targetRoute: direct.route,
        targetName: direct.name,
      }
    }
    if (hits.length > 0) {
      return {
        taskType,
        intentLabel: LABEL_BY_TYPE[taskType],
        dispatchKey: taskType,
        room: ROOM_BY_TYPE[taskType],
        action: ACTION_BY_TYPE[taskType],
        suggestions: hits,
      }
    }
    return {
      taskType,
      intentLabel: LABEL_BY_TYPE[taskType],
      dispatchKey: taskType,
      room: ROOM_BY_TYPE[taskType],
      action: ACTION_BY_TYPE[taskType],
      featureHint: buildFeatureHint(),
    }
  }

  return {
    taskType,
    intentLabel: LABEL_BY_TYPE[taskType],
    dispatchKey: taskType,
    room: ROOM_BY_TYPE[taskType],
    action: ACTION_BY_TYPE[taskType],
  }
}

export {
  ROOM_BY_TYPE,
  ACTION_BY_TYPE,
  LABEL_BY_TYPE,
  NAV_TARGETS,
  matchNavTarget,
  searchFeatures,
  buildFeatureHint,
}
export type { FeatureHit }
