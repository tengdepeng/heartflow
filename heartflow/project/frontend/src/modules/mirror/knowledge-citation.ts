// ============================================================
// 镜我 · 知识出处标注（深度借鉴：Kimi 文件对话 / TRAE 项目理解 / ima 知识库问答）
//   蓝图第四部分·三「专属知识库」的可见化：不只把知识注入提示词，
//   还把回答所依据的本地条目结构化带给 UI，让镜我「作答标注出处」。
//
// 消费点：useMirrorDialogue 在兜底/无计划回应时注入 DialogueEntry.sources，
//        MirrorDialogue 在回答气泡下渲染 📎 出处块。
// ============================================================

import { collectAllItems } from '../association/engine'
import { archiveDomainLabel } from '../association/association-archive-analytics'
import type { DomainKey } from '../association/types'

/** 一条回答出处（回答所依据的本地条目） */
export interface KnowledgeCitation {
  domain: DomainKey
  id: string
  label: string
  /** YYYY-MM-DD */
  date: string
  /** 领域中文标签（笔记/心锚/目标…） */
  domainLabel: string
}

/** 问句中常见但与资料检索无关的词，跳过以免把通用提问误配成检索词 */
const STOP_WORDS = new Set([
  '查看', '今天', '我的', '这个', '那个', '什么', '能', '做', '有',
  '哪些', '房间', '数据', '目前', '现在', '最近', '帮我', '一下', '相关',
])

function fmtDate(ts: number): string {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/**
 * 按用户提问在殿堂痕迹中检索「可能相关的本地条目」作为回答出处。
 *
 * 检索口径（三层，命中任一即入选）：
 *  1. 分隔符分词后的有效词出现在条目标签中；
 *  2. 提问整句点名某条目（标签整体出现在提问中）；
 *  3. 中文口语提问无分隔符时，取提问的 2 字滑窗（剔除停用词）做补充——
 *     「我的跑步记录怎么样」→「跑步」命中「晨间跑步笔记」，避免整句成词永远匹配不上。
 * 按时间倒序取最近 limit 条——保守且可预测，避免把通用提问误配成引用。
 *
 * @param query 用户原始输入
 * @param limit 最多返回条数（默认 3）
 * @returns 结构化出处；无有效检索词或无命中时返回空数组
 */
export function collectKnowledgeCitations(query: string, limit = 3): KnowledgeCitation[] {
  const q = (query || '').trim()
  if (!q) return []

  const words = q
    .split(/[\s,，。、;；?？!！]+/)
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0 && !STOP_WORDS.has(t))
  if (!words.length) return []

  // 无分隔符整句（中文口语）：2 字滑窗补充检索词，剔除停用词
  const bigrams = new Set<string>()
  if (words.length === 1 && words[0].length > 2) {
    const s = words[0]
    for (let i = 0; i + 2 <= s.length; i++) {
      const g = s.slice(i, i + 2)
      if (!STOP_WORDS.has(g)) bigrams.add(g)
    }
  }

  const hits = collectAllItems().filter((i) => {
    const label = i.label.toLowerCase()
    if (words.some((t) => label.includes(t))) return true
    if (label.length >= 2 && q.includes(label)) return true
    for (const g of bigrams) if (label.includes(g)) return true
    return false
  })

  return [...hits]
    .sort((a, b) => b.ts - a.ts)
    .slice(0, Math.max(1, limit))
    .map((i) => ({
      domain: i.domain,
      id: i.id,
      label: i.label,
      date: fmtDate(i.ts),
      domainLabel: archiveDomainLabel(i.domain),
    }))
}
