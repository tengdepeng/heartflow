// ============================================================
// 阅览殿 · AI 问书（读书 #5：本地模型伴读，不外发）
// 借鉴 微信读书「长按原文即伴读」：
// 选中/点击原文段落 → 就这段提问 → 由本地 AI 引擎结合原文作答。
//
// 本层只做「伴读提示词构建（纯函数）」+「问书状态编排（composable）」；
// AI 传输仍走 engine/ai，provider 层已由 external-gate 把关（非本地端点默认拦截），
// 符合宪法第1条「本地私有」与 complianceOverride.allowExternalAI:false。
// ============================================================

import { ref } from 'vue'
import type { AIMessage } from '@/engine/ai/types'

/** 单轮问书记录 */
export interface AskBookTurn {
  role: 'user' | 'assistant'
  content: string
}

/** 问书上下文 */
export interface AskBookContext {
  /** 书名（可空） */
  bookTitle?: string
  /** 选中的原文段落 */
  passage: string
  /** 用户问题 */
  question: string
  /** 已有对话轮次（追问时带上） */
  history?: AskBookTurn[]
}

/** 快捷问题：段末一键提问 */
export const ASK_BOOK_QUICK_QUESTIONS = [
  '这段在说什么？',
  '作者想表达什么？',
  '帮我举个生活里的例子',
  '这句话为什么重要？',
] as const

/**
 * 伴读系统提示词：约束「紧扣原文、不臆测、简洁温暖」。
 * 传入 passage 时把原文作为上下文附在系统提示中（追问轮次无需重复原文）。
 */
export function buildAskBookSystemPrompt(ctx?: { bookTitle?: string; passage?: string }): string {
  let prompt = `你是用户的「伴读」，帮助用户读懂正在读的书。
请遵循：
- 紧扣用户选中的原文作答，不编造原文没有的信息
- 用简洁、温暖的中文，避免术语堆砌
- 先回答问题，再给一句延伸联想或追问
- 不确定时坦诚说明，不臆测`
  const passage = (ctx?.passage ?? '').trim()
  if (passage) {
    const title = (ctx?.bookTitle ?? '').trim()
    prompt += `\n\n【用户正在读的原文${title ? `·《${title}》` : ''}】\n${passage}`
  }
  return prompt
}

/** 构建问书消息列表：system（含原文）→ 历史轮次 → 当前问题 */
export function buildAskBookMessages(ctx: AskBookContext): AIMessage[] {
  const messages: AIMessage[] = [
    {
      role: 'system',
      content: buildAskBookSystemPrompt({ bookTitle: ctx.bookTitle, passage: ctx.passage }),
    },
  ]
  for (const turn of ctx.history ?? []) {
    messages.push({ role: turn.role, content: turn.content })
  }
  messages.push({ role: 'user', content: ctx.question.trim() })
  return messages
}

/**
 * 本地 AI 是否可用于问书：引擎已启用且存在可用提供商。
 * 动态导入 engine/ai 以避免 barrel 循环依赖；任何异常一律回落 false（fail-closed）。
 */
export async function isAskBookAvailable(): Promise<boolean> {
  try {
    const { isAIEngineEnabled, hasUsableProvider } = await import('@/engine/ai')
    return isAIEngineEnabled() && hasUsableProvider()
  } catch {
    return false
  }
}

/** AI 问书 composable：可用性探测 + 提问状态 + 对话轮次 */
export function useAskBook() {
  const available = ref(false)
  const asking = ref(false)
  const answer = ref('')
  const error = ref<string | null>(null)
  const history = ref<AskBookTurn[]>([])
  const callCount = ref(0)

  /** 重新探测本地 AI 可用性（挂载时调用，配置变更后可手动重试） */
  async function refreshAvailability(): Promise<boolean> {
    available.value = await isAskBookAvailable()
    return available.value
  }

  /** 就当前原文提问；成功返回 true 并写入 answer/history */
  async function ask(
    question: string,
    ctx: { bookTitle?: string; passage: string },
  ): Promise<boolean> {
    const q = question.trim()
    if (!q || asking.value) return false
    asking.value = true
    error.value = null
    answer.value = ''
    try {
      const { aiEngine } = await import('@/engine/ai')
      const messages = buildAskBookMessages({
        bookTitle: ctx.bookTitle,
        passage: ctx.passage,
        question: q,
        history: history.value,
      })
      const res = await aiEngine.chat(messages)
      callCount.value++
      if (res.success && res.text) {
        answer.value = res.text
        history.value = [
          ...history.value,
          { role: 'user', content: q },
          { role: 'assistant', content: res.text },
        ]
        return true
      }
      error.value = res.error || '本地模型未返回内容'
      return false
    } catch (err) {
      error.value = err instanceof Error ? err.message : '问书失败'
      return false
    } finally {
      asking.value = false
    }
  }

  /** 清空当前问答与对话轮次（保留可用性状态） */
  function reset(): void {
    asking.value = false
    answer.value = ''
    error.value = null
    history.value = []
  }

  return {
    available,
    asking,
    answer,
    error,
    history,
    callCount,
    refreshAvailability,
    ask,
    reset,
  }
}
