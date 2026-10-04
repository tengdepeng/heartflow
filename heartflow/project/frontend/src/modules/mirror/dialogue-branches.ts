// ============================================================
// 镜面对话 · 回答分支导航（INCR-478）
// 借鉴 DeepSeek「Message N of M」：同一轮提问可保留多次生成的候选回答，
// 用户以 ‹ 第 N / M 个回答 › 前后切换，而非覆盖或重复追加消息。
// 纯函数层：变体抽取 + 不可变追加 + 不可变切换 + 计数/摘要。
// 仅作用于内存中的 dialogue（useMirrorDialogue），符合「本地私有」约束。
// ============================================================
import type { DialogueEntry, DialogueVariant, ExecutionResult } from './types'
import type { KnowledgeCitation } from './knowledge-citation'

let variantCounter = 0

/** 构造一个新变体 */
export function createVariant(
  text: string,
  opts?: {
    executionResult?: ExecutionResult
    sources?: KnowledgeCitation[]
    createdAt?: number
  },
): DialogueVariant {
  return {
    id: `var_${Date.now()}_${++variantCounter}`,
    text,
    executionResult: opts?.executionResult,
    sources: opts?.sources,
    createdAt: opts?.createdAt ?? Date.now(),
  }
}

/** 把条目当前的展示态抽成一个变体（首次分叉时把原回应纳入变体列表） */
function entryVariant(entry: DialogueEntry): DialogueVariant {
  return {
    id: `${entry.id}__v0`,
    text: entry.text,
    executionResult: entry.executionResult,
    sources: entry.sources,
    createdAt: entry.timestamp,
  }
}

/** 条目的变体列表（无 variants 时视作仅含当前展示态的单变体） */
export function variantList(entry: DialogueEntry): DialogueVariant[] {
  return entry.variants && entry.variants.length ? entry.variants : [entryVariant(entry)]
}

/** 变体总数 */
export function variantCount(entry: DialogueEntry): number {
  return variantList(entry).length
}

/** 当前激活变体下标（越界钳制，缺省取最后一个） */
export function activeVariantIndex(entry: DialogueEntry): number {
  const total = variantCount(entry)
  const raw = entry.activeVariant ?? total - 1
  if (!Number.isFinite(raw)) return total - 1
  return Math.min(Math.max(Math.trunc(raw), 0), total - 1)
}

/** 是否已分叉（多于一个变体） */
export function hasMultipleVariants(entry: DialogueEntry): boolean {
  return variantCount(entry) > 1
}

/** 分支摘要：下标 / 总数 / 展示文案 */
export function variantSummary(entry: DialogueEntry): { index: number; total: number; label: string } {
  const total = variantCount(entry)
  const index = activeVariantIndex(entry)
  return { index, total, label: `第 ${index + 1} / ${total} 个回答` }
}

/** 把条目展示字段同步为指定变体（text/executionResult/sources 均跟随激活变体） */
function syncDisplay(entry: DialogueEntry, variants: DialogueVariant[], activeVariant: number): DialogueEntry {
  const v = variants[activeVariant]
  return {
    ...entry,
    variants,
    activeVariant,
    text: v.text,
    executionResult: v.executionResult,
    sources: v.sources,
  }
}

/** 追加变体并切换到它（不可变） */
export function appendVariant(entry: DialogueEntry, variant: DialogueVariant): DialogueEntry {
  const base = entry.variants && entry.variants.length ? entry.variants : [entryVariant(entry)]
  const variants = [...base, variant]
  return syncDisplay(entry, variants, variants.length - 1)
}

/** 切换到指定变体（不可变；越界钳制） */
export function switchVariant(entry: DialogueEntry, index: number): DialogueEntry {
  const base = entry.variants && entry.variants.length ? entry.variants : [entryVariant(entry)]
  const clamped = Math.min(Math.max(Math.trunc(index), 0), base.length - 1)
  return syncDisplay(entry, base, clamped)
}
