// ============================================================
// 调令任务拆解（蓝图第四部分·八）
//   蓝图原文：「如果需要跨多个领域，她会把任务拆解分给不同幕僚
//             各自处理，最后汇总。」
//
// 设计约束（重要）：
//   1. **只拆真实跨领域的调令**——命中 ≥2 个域才拆；单域调令维持原样，
//      不为了「看起来像多幕僚协作」而硬拆。
//   2. **子任务结果一律来自真实读取的统计**，绝不编造内容
//      （项目纪律：占位/骨架可以，虚假数据不行）。
//   3. 领域口径与 association 的 DomainKey 同源，和「专属知识库范围」一致。
// ============================================================

import { storage } from '../../engine/storage'
import type { DomainKey } from '../association/types'

export interface CommandSubTask {
  id: string
  /** 所属领域 */
  domain: DomainKey
  /** 所在房间名（蓝图648：进度描述要带房间名） */
  room: string
  /** 执行的幕僚 */
  advisorId?: string
  advisorName?: string
  status: 'running' | 'done'
  /** 一句话结论（真实统计，非编造） */
  result?: string
}

/** 领域 → 房间名 + 关键词 + 取数函数 */
const DOMAIN_SPEC: Record<
  DomainKey,
  { room: string; keywords: string[]; summarize: () => string }
> = {
  session: {
    room: '时间长廊',
    keywords: ['专注', '心流', '计时', '番茄', '沉浸'],
    summarize: () => {
      const list = storage.getSessions().filter((s: any) => s.completedAt)
      if (!list.length) return '暂无专注记录'
      const ms = list.reduce((sum: number, s: any) => sum + (s.elapsed ?? 0), 0)
      return `专注 ${list.length} 次，累计 ${Math.round(ms / 60000)} 分钟`
    },
  },
  note: {
    room: '思绪书房',
    keywords: ['笔记', '写下', '文章', '记录过', '写过'],
    summarize: () => {
      const list = storage.getNotes()
      return list.length ? `笔记 ${list.length} 篇` : '暂无笔记'
    },
  },
  emotion: {
    room: '情绪花房',
    keywords: ['情绪', '心情', '感受', '低落', '焦虑', '开心', '平静'],
    summarize: () => {
      const list = storage.getEmotions()
      if (!list.length) return '暂无情绪记录'
      const last = list[list.length - 1] as any
      return `情绪记录 ${list.length} 条，最近一次「${last?.note ?? last?.type ?? '未命名'}」`
    },
  },
  ledger: {
    room: '劳酬',
    keywords: ['账本', '记账', '收支', '开销', '花销', '收入', '工资', '奖酬', '报销'],
    summarize: () => {
      const list = storage.getLedger()
      if (!list.length) return '暂无账目'
      const income = list.filter((r: any) => r.type === 'income').length
      return `账目 ${list.length} 笔（收入 ${income} / 支出 ${list.length - income}）`
    },
  },
  anchor: {
    room: '逐日心锚',
    keywords: ['锚点', '今日目标', '心锚'],
    summarize: () => {
      const list = storage.getAnchors()
      if (!list.length) return '暂无心锚'
      const done = list.filter((a: any) => a.done).length
      return `心锚 ${list.length} 个，已完成 ${done} 个`
    },
  },
  goal: {
    room: '留光阁',
    keywords: ['目标', '愿望', '期许', '立志'],
    summarize: () => {
      const list = storage.getGoals()
      return list.length ? `目标 ${list.length} 个` : '暂无目标'
    },
  },
  relation: {
    room: '羁绊之厅',
    keywords: ['关系', '人际', '朋友', '家人', '羁绊'],
    summarize: () => {
      const list = storage.getRelations()
      return list.length ? `人物卡片 ${list.length} 张` : '暂无人物卡片'
    },
  },
  crystal: {
    room: '时间结晶',
    keywords: ['结晶', '时间结晶'],
    summarize: () => {
      const list = storage.getCrystals()
      return list.length ? `时间结晶 ${list.length} 颗` : '暂无结晶'
    },
  },
  // 载体 / 幕僚本身不作为「调令要查的领域」，不给关键词，永不命中
  carrier: { room: '载体', keywords: [], summarize: () => '' },
  advisor: { room: '幕僚阁', keywords: [], summarize: () => '' },
}

/** 领域 → 派单用的任务类型（dispatchAvatar 吃 taskType） */
export const DOMAIN_TASK_TYPE: Record<DomainKey, string> = {
  session: 'focus',
  note: 'note',
  emotion: 'emotion',
  ledger: 'finance',
  anchor: 'anchor',
  goal: 'review',
  relation: 'review',
  crystal: 'review',
  carrier: 'general',
  advisor: 'general',
}

// ---- 拆不拆的判据 ----
// 不能拿 parseCommandIntent 的 taskType 当闸门：它只会选出**一个**胜出领域
// （例：「把专注、情绪和开销一起复盘」里「开销」是弱财务词，整条会被判成
// finance），跨领域调令恰好总在这条路上被误拦。所以判据放在本模块里自持：
//   ① 是查询型（有明确的查/复盘/汇总类动词）；
//   ② 不是动作型（要记一笔 / 要新建 / 要跳转的，一律不拆，交回原路执行）；
//   ③ 真的命中 ≥2 个领域。
/** 查询动词：有它才说明用户是在「问」，而不是在「做」 */
const QUERY_KW = [
  '查', '查看', '看看', '看一下', '回顾', '复盘', '统计', '汇总', '分析',
  '整理', '梳理', '理一下', '理一理', '对比', '报告', '总结', '盘一盘',
]
/** 动作词：命中即不拆——用户要的是落一笔账 / 建一条记录 / 跳一个房间 */
const ACTION_KW = [
  '记一笔', '记账', '记一下', '记一记', '记下', '写下', '速记',
  '新建', '添加', '创建', '开始', '开启',
  '打开', '前往', '进入', '切到', '切换到', '跳到', '带我去', '转入',
]

/** 是否是「跨领域查询」——拆解的唯一入口判据 */
export function isCrossDomainQuery(text: string): boolean {
  const t = (text || '').trim()
  if (!t) return false
  if (ACTION_KW.some((k) => t.includes(k))) return false
  if (!QUERY_KW.some((k) => t.includes(k))) return false
  return detectDomains(t).length >= 2
}

/** 识别调令命中的领域（≥2 个才算跨领域） */
export function detectDomains(text: string): DomainKey[] {
  const t = (text || '').trim()
  if (!t) return []
  const hits: DomainKey[] = []
  for (const [domain, spec] of Object.entries(DOMAIN_SPEC) as [DomainKey, typeof DOMAIN_SPEC[DomainKey]][]) {
    if (!spec.keywords.length) continue
    if (spec.keywords.some((k) => t.includes(k))) hits.push(domain)
  }
  return hits
}

/**
 * 把跨领域调令拆成子任务。
 * 仅在「跨领域查询」时返回子任务；动作型 / 单域 / 无查询动词一律返回空数组，
 * 调用方据此维持单任务原样（不为了看起来热闹而硬拆）。
 */
export function decomposeCommand(text: string): CommandSubTask[] {
  if (!isCrossDomainQuery(text)) return []
  const domains = detectDomains(text)
  const now = Date.now()
  return domains.map((domain, i) => ({
    id: `sub_${now}_${i}`,
    domain,
    room: DOMAIN_SPEC[domain].room,
    status: 'running' as const,
  }))
}

/** 执行一个子任务：读取该领域的真实统计 */
export function runSubTask(task: CommandSubTask): string {
  try {
    return DOMAIN_SPEC[task.domain].summarize()
  } catch {
    return '该领域暂时读不到数据'
  }
}

/** 把各子任务的结论汇总成一句话（蓝图650：先概括结论） */
export function summarizeSubTasks(tasks: CommandSubTask[]): string {
  const done = tasks.filter((t) => t.status === 'done' && t.result)
  if (!done.length) return '几位幕僚都还没查到东西。'
  const parts = done.map((t) => {
    const who = t.advisorName ? `${t.advisorName}在${t.room}查到：` : `${t.room}：`
    return `${who}${t.result}`
  })
  return `已分头查过——${parts.join('；')}。`
}

export const DOMAIN_ROOM_LABEL: Record<DomainKey, string> = Object.fromEntries(
  (Object.keys(DOMAIN_SPEC) as DomainKey[]).map((k) => [k, DOMAIN_SPEC[k].room]),
) as Record<DomainKey, string>
