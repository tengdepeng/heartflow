// ============================================================
// 知微阁 · 智慧模块 barrel
// ------------------------------------------------------------
// 职责：
//  1. 知微记录（WisdomItem）的本地持久化与 CRUD
//  2. 提问 / 定音锤 / 年度回看 三套「光点并置」规则引擎
//
// 设计原则（沿用蓝图）：光点之间不使用任何因果连接词，仅并置呈现；
// 引擎为纯函数，依赖的数据由视图层聚合为 WisdomContext 传入，
// 模块自身不耦合任何 store / 其他模块，避免循环依赖。
// ============================================================

import { ref } from 'vue'
import { storage } from '../../engine/storage'

// ---- 常量 ----
// 与历史实现保持同一存储键，确保既有记录不丢失
export const WISDOM_ITEMS_KEY = 'hf:wisdom_items'

// ---- 类型 ----
export interface WisdomItem {
  id: string
  question: string
  answer: string
  createdAt: string
  tags: string[]
}

export interface AnswerCard {
  domain: string
  content: string
  room?: string
  route?: string
}

export interface WisdomContext {
  // 专注
  totalFocus: number
  totalMin: number
  todayFocus: number
  // 情绪（近 7 天）
  recentSad: number
  recentHappy: number
  recentCalm: number
  recentAnxious: number
  recentAngry: number
  // 记录与情绪标记
  totalNotes: number
  emotionCount: number
  // 心锚（今日）
  doneAnchors: number
  pendingAnchors: number
  // 工作（本月小时）
  monthHours: number
  // 关系（联系卡片数）
  relations: number
  // 身体（身体与睡眠记录总数）
  bodyRecords: number
}

// ---- 知微记录 CRUD ----
const items = ref<WisdomItem[]>(loadItems())

function normalizeItem(raw: any): WisdomItem {
  return {
    id: raw?.id || `wi_${Date.now()}`,
    question: raw?.question || '',
    answer: raw?.answer || raw?.answer_snapshot || '',
    createdAt: raw?.createdAt || raw?.created_at || new Date().toISOString(),
    tags: raw?.tags || [],
  }
}

function loadItems(): WisdomItem[] {
  const raw = storage.getKV<any[]>(WISDOM_ITEMS_KEY, [])
  return (raw || []).map(normalizeItem)
}

function saveItems(next: WisdomItem[]) {
  storage.setKV(WISDOM_ITEMS_KEY, next)
}

function reload() {
  items.value = loadItems()
}

function addWisdomItem(question: string, answer: string, tags: string[]): WisdomItem {
  const item: WisdomItem = {
    id: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    question,
    answer,
    createdAt: new Date().toISOString(),
    tags,
  }
  items.value = [item, ...items.value]
  saveItems(items.value)
  return item
}

function removeWisdomItem(id: string): boolean {
  const idx = items.value.findIndex(i => i.id === id)
  if (idx === -1) return false
  items.value = items.value.filter(i => i.id !== id)
  saveItems(items.value)
  return true
}

// ---- 规则引擎：关键词匹配 + 数据域路由 ----
// 原则：光点之间不使用任何因果连接词，仅并置呈现
function runAsk(ctx: WisdomContext, question: string): AnswerCard[] {
  const q = question.toLowerCase()
  const cards: AnswerCard[] = []

  if (q.includes('状态') || q.includes('怎么样') || q.includes('近况')) {
    cards.push({
      domain: '专注',
      content: `${ctx.totalFocus} 次专注记录，共 ${ctx.totalMin} 分钟`,
      room: '时间长廊',
    })
    if (ctx.recentSad > 0) {
      cards.push({
        domain: '情绪',
        content: `最近 7 天有 ${ctx.recentSad} 次"低落"标记`,
        room: '情绪花房',
      })
    }
    if (ctx.recentHappy > 0) {
      cards.push({
        domain: '情绪',
        content: `最近 7 天有 ${ctx.recentHappy} 次"开心"标记`,
        room: '情绪花房',
      })
    }
    cards.push({
      domain: '记录',
      content: `当前共有 ${ctx.totalNotes} 条记录`,
      room: '思绪书房',
    })
    cards.push({
      domain: '心锚',
      content: `今天有 ${ctx.doneAnchors} 个已安放锚点，${ctx.pendingAnchors} 个停留中的锚点`,
      room: '逐日心锚',
    })
    if (ctx.monthHours > 0) {
      cards.push({
        domain: '工作',
        content: `本月累计约 ${ctx.monthHours} 小时`,
        room: '更漏',
      })
    }
  } else if (q.includes('注意') || q.includes('该')) {
    if (ctx.recentSad >= 3) {
      cards.push({
        domain: '情绪',
        content: `最近 7 天有 ${ctx.recentSad} 次"低落"标记`,
        room: '情绪花房',
      })
    }
    if (ctx.pendingAnchors > 3) {
      cards.push({
        domain: '心锚',
        content: `当前有 ${ctx.pendingAnchors} 个停留中的锚点`,
        room: '逐日心锚',
      })
    }
    if (ctx.monthHours > 180) {
      cards.push({
        domain: '工作',
        content: `本月累计约 ${ctx.monthHours} 小时`,
        room: '更漏',
      })
    }
    if (!cards.length) {
      cards.push({ domain: '记录', content: '这段时间的记录分布较为分散' })
    }
  } else if (q.includes('关系') || q.includes('羁绊') || q.includes('朋友') || q.includes('家人') || q.includes('联系')) {
    cards.push({
      domain: '关系',
      content: `羁绊之厅里有 ${ctx.relations} 张联系卡片`,
      room: '羁绊之厅',
    })
    cards.push({
      domain: '记录',
      content: '这里可以回看你留下的联系与对话记录',
      room: '羁绊之厅',
    })
  } else if (q.includes('时间') || q.includes('变化') || q.includes('趋势')) {
    cards.push({
      domain: '专注',
      content: `${ctx.totalFocus} 次专注记录，共 ${ctx.totalMin} 分钟`,
      room: '时间长廊',
    })
    cards.push({
      domain: '情绪',
      content: `最近 7 天：${ctx.recentHappy} 次开心，${ctx.recentCalm} 次平静，${ctx.recentSad} 次低落，${ctx.recentAnxious} 次紧绷，${ctx.recentAngry} 次烦躁`,
      room: '情绪花房',
    })
    cards.push({
      domain: '记录',
      content: `当前共有 ${ctx.totalNotes} 条记录`,
      room: '思绪书房',
    })
    cards.push({
      domain: '工作',
      content: `本月累计约 ${ctx.monthHours} 小时`,
      room: '更漏',
    })
  } else if (q.includes('情绪') || q.includes('心情') || q.includes('感受')) {
    cards.push({
      domain: '情绪',
      content: `最近 7 天：${ctx.recentHappy} 次开心，${ctx.recentCalm} 次平静，${ctx.recentSad} 次低落，${ctx.recentAnxious} 次紧绷，${ctx.recentAngry} 次烦躁`,
      room: '情绪花房',
    })
  } else if (q.includes('工作') || q.includes('专注') || q.includes('时长')) {
    cards.push({
      domain: '专注',
      content: `${ctx.totalFocus} 次专注记录，${ctx.totalMin} 分钟。今天 ${ctx.todayFocus} 次`,
      room: '时间长廊',
    })
    cards.push({
      domain: '工作',
      content: `本月累计约 ${ctx.monthHours} 小时`,
      room: '更漏',
    })
  } else if (q.includes('身体') || q.includes('健康')) {
    // 已接入真实身体数据（蓝图13：身体温室 ↔ 知微阁 互引）
    const b = ctx.bodyRecords
    cards.push({
      domain: '身体',
      content: b > 0
        ? `身体温室已留下 ${b} 条身体与睡眠记录`
        : '身体温室暂时还没有记录，可以从今天的一次身体觉察开始',
      room: '身体温室',
    })
  } else {
    // 默认：并置一组当前记录
    cards.push({
      domain: '专注',
      content: `${ctx.totalFocus} 次专注记录，${ctx.totalMin} 分钟`,
      room: '时间长廊',
    })
    cards.push({
      domain: '情绪',
      content: `最近 7 天：${ctx.recentHappy} 次开心，${ctx.recentCalm} 次平静，${ctx.recentSad} 次低落`,
      room: '情绪花房',
    })
    cards.push({
      domain: '记录',
      content: `${ctx.totalNotes} 条记录`,
      room: '思绪书房',
    })
    cards.push({
      domain: '心锚',
      content: `今天 ${ctx.doneAnchors} 个已安放，${ctx.pendingAnchors} 个停留中`,
      room: '逐日心锚',
    })
  }

  return cards
}

// ---- 定音锤：轻量回看片段（不叙事）----
function runHammer(ctx: WisdomContext): (AnswerCard & { title: string })[] {
  return [
    { title: '专注与时长', domain: '专注', content: `${ctx.totalFocus} 次专注记录，共 ${ctx.totalMin} 分钟。本月累计约 ${ctx.monthHours} 小时`, room: '时间长廊' },
    { title: '联系卡片', domain: '关系', content: `羁绊之厅里放着 ${ctx.relations} 张联系卡片`, room: '羁绊之厅' },
    { title: '时间里的位置', domain: '记录', content: '蜕变回廊、经略阁与根脉之庭中，保留着不同时间段留下的记录与节点', room: '经略阁' },
    { title: '文字与标记', domain: '情绪', content: `字镜阁里的字、素镜里的回看片段，以及近期情绪标记，都并置在这里`, room: '情绪花房' },
  ]
}

// ---- 年度回看（纯数据罗列）----
function buildAnnualLetter(ctx: WisdomContext): string {
  const now = new Date()
  const lines = [
    `专注次数：${ctx.totalFocus}`,
    `专注总时长：${ctx.totalMin} 分钟`,
    `记录数量：${ctx.totalNotes}`,
    `情绪标记次数：${ctx.emotionCount}`,
    `关系卡片数：${ctx.relations}`,
  ]
  return `年度回看\n\n${lines.join('\n')}\n\n——知微阁 · ${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`
}

// ---- 组合式入口 ----
export function useWisdom() {
  return {
    wisdomItems: items,
    reload,
    addWisdomItem,
    removeWisdomItem,
    runAsk,
    runHammer,
    buildAnnualLetter,
  }
}

// ---- 对话历史（视图数据层下沉，独立于 useWisdom）----
export { useWisdomHistory, WISDOM_HISTORY_KEY } from './history'
export type { HistoryItem } from './history'
