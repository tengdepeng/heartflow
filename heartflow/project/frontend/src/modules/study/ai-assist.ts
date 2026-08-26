// ============================================================
// 思绪书房 · 就地写作助手（本地规则式，无云端依赖）
// 宪法第1条「本地私有」：不调用任何云端 LLM，全部文本处理在本地完成。
// 对应借鉴：Notion AI 就地生成（续写/扩写/总结/改语气），但以本地规则实现。
// ============================================================

export type AiAssistAction = 'continue' | 'expand' | 'summarize' | 'rewrite'

export type RewriteTone = 'formal' | 'gentle' | 'concise' | 'casual'

export interface AiAssistResult {
  action: AiAssistAction
  /** 生成/改写后的完整文本 */
  text: string
  /** 追加到原文末尾（continue/expand）还是替换（summarize/rewrite） */
  append: boolean
}

const SENTENCE_SPLIT = /(?<=[。！？!?；;])\s*/

function splitSentences(text: string): string[] {
  return text
    .split(SENTENCE_SPLIT)
    .map(s => s.trim())
    .filter(Boolean)
}

function lastSentence(text: string): string {
  const s = splitSentences(text)
  return s.length ? s[s.length - 1] : ''
}

/** 轻量中文分词：以功能字为分隔符，切出 2 字以上的实词 */
function tokenizeCJK(text: string): string[] {
  const stop = new Set(['的', '了', '是', '在', '和', '与', '也', '都', '就', '而', '及', '或', '这', '那', '我', '你', '他', '她', '它', '们', '个', '一', '为', '着', '过', '把', '被', '从', '到', '对', '说', '讲', '里', '下', '上', '中', '有', '没', '不', '会', '能', '要', '让', '给', '以', '之', '于', '其', '所', '等', '再', '又', '很', '更', '最'])
  const words: string[] = []
  let cur = ''
  for (const ch of text) {
    if (!/\p{L}\p{M}*/u.test(ch)) {
      if (cur) { words.push(cur); cur = '' }
      continue
    }
    if (stop.has(ch)) {
      if (cur) { words.push(cur); cur = '' }
      continue
    }
    cur += ch
  }
  if (cur) words.push(cur)
  return words.filter(w => w.length >= 2)
}

/** 提取文本中的关键词（去停用字后的高频实词） */
function keywords(text: string, limit = 4): string[] {
  const freq = new Map<string, number>()
  for (const w of tokenizeCJK(text)) {
    freq.set(w, (freq.get(w) || 0) + 1)
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(e => e[0])
}

/** 续写：基于末句生成一句自然的承接 */
function doContinue(text: string): string {
  const last = lastSentence(text)
  if (!last) return text
  const kw = keywords(last, 2)
  const subject = kw[0] || '这件事'
  const openers = [
    `进一步想，${subject}背后或许还有一层值得留意的意义。`,
    `顺着这个思路，${subject}与日常的关联也慢慢清晰起来。`,
    `回看这一段，${subject}带来的感受仍然鲜明。`,
    `如果把它放进更长的时间线里，${subject}的轮廓会更完整。`,
  ]
  const pick = openers[Math.abs(hash(last)) % openers.length]
  return `${text}\n\n${pick}`
}

/** 扩写：对末句补充细节与例子 */
function doExpand(text: string): string {
  const last = lastSentence(text)
  if (!last) return text
  const kw = keywords(last, 2)
  const subject = kw[0] || '这一点'
  const detail = [
    `具体来说，${subject}可以从几个侧面观察：它如何发生、带来了什么变化、又留下了什么痕迹。`,
    `换个角度想，${subject}并不孤立，它与此刻的心境、近来的节奏都彼此呼应。`,
    `如果试着把它写得更具体，${subject}的轮廓会一点点浮现出来。`,
  ]
  const pick = detail[Math.abs(hash(last)) % detail.length]
  return `${text}\n\n${pick}`
}

/** 总结：保留首句主题，压缩其余句子为要点短语 */
function doSummarize(text: string): string {
  const s = splitSentences(text)
  if (s.length === 0) return ''
  if (s.length === 1) return s[0]
  const head = s[0]
  const kw = keywords(s.slice(1).join(''), 3)
  if (kw.length === 0) return head
  return `${head}（要点：${kw.join('、')}）`
}

/** 改语气：以本地规则调整表达风格 */
function doRewrite(text: string, tone: RewriteTone): string {
  const s = splitSentences(text)
  if (s.length === 0) return text
  switch (tone) {
    case 'formal':
      return s.map(x => `${x}（此为记录，供日后回看。）`).join('')
    case 'gentle':
      return s.map(x => `${x} 慢慢来，不必着急。`).join('')
    case 'concise':
      return s.map(x => x.replace(/[，。]$/, '')).join('；') + '。'
    case 'casual':
      return s.map(x => `嘿，${x}`).join(' ')
    default:
      return text
  }
}

function hash(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

/**
 * 就地写作助手：在编辑器内对当前文本执行本地生成。
 * @param action 操作类型
 * @param text 当前全文
 * @param tone 改语气时的目标语气
 */
export function aiAssist(action: AiAssistAction, text: string, tone: RewriteTone = 'formal'): AiAssistResult {
  const trimmed = (text || '').trim()
  switch (action) {
    case 'continue':
      return { action, text: doContinue(trimmed), append: true }
    case 'expand':
      return { action, text: doExpand(trimmed), append: true }
    case 'summarize':
      return { action, text: doSummarize(trimmed), append: false }
    case 'rewrite':
      return { action, text: doRewrite(trimmed, tone), append: false }
    default:
      return { action, text: trimmed, append: false }
  }
}
