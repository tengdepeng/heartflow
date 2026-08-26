// ============================================================
// 知微阁 · 词根词缀拆解引擎（不背单词 / 无痛单词 借鉴）
// ------------------------------------------------------------
// 内置常用英语词根/前缀/后缀小词典，对单词做启发式拆解：
//   前缀 + 词根 + 后缀
// 展示每个构词部件的含义与组合逻辑，帮助理解单词来源。
// 全部本地，守宪法第1条本地私有 / 拒 GPU 云端。
// 纯函数核心（可单测），供 WordRootPanel 渲染。
// ============================================================

// ============================================================
// 词根小词典
// ============================================================

export type WordPartType = 'prefix' | 'root' | 'suffix'

export interface WordPart {
  /** 部件原文（如 un-） */
  text: string
  type: WordPartType
  meaning: string
}

export interface DecomposedWord {
  word: string
  parts: WordPart[]
  /** 是否成功拆出至少一个词根/词缀 */
  matched: boolean
  /** 未识别部分 */
  residual: string
}

/** 前缀表：按长度降序匹配 */
const PREFIXES: WordPart[] = [
  { text: 'anti', type: 'prefix', meaning: '反对，对抗' },
  { text: 'auto', type: 'prefix', meaning: '自己，自动' },
  { text: 'extra', type: 'prefix', meaning: '超出，额外' },
  { text: 'hyper', type: 'prefix', meaning: '过度，超出' },
  { text: 'inter', type: 'prefix', meaning: '在…之间，相互' },
  { text: 'intra', type: 'prefix', meaning: '在…内部' },
  { text: 'micro', type: 'prefix', meaning: '微小' },
  { text: 'multi', type: 'prefix', meaning: '多' },
  { text: 'super', type: 'prefix', meaning: '超级，在上' },
  { text: 'trans', type: 'prefix', meaning: '横跨，转变' },
  { text: 'under', type: 'prefix', meaning: '在…之下，不足' },
  { text: 'un', type: 'prefix', meaning: '不，相反' },
  { text: 're', type: 'prefix', meaning: '再次，回' },
  { text: 'pre', type: 'prefix', meaning: '在…之前' },
  { text: 'post', type: 'prefix', meaning: '在…之后' },
  { text: 'dis', type: 'prefix', meaning: '不，分离' },
  { text: 'mis', type: 'prefix', meaning: '错误' },
  { text: 'non', type: 'prefix', meaning: '非，不' },
  { text: 'out', type: 'prefix', meaning: '超出，在外' },
  { text: 'over', type: 'prefix', meaning: '过度，在上' },
  { text: 'sub', type: 'prefix', meaning: '在…之下，次级' },
  { text: 'tele', type: 'prefix', meaning: '远距离' },
  { text: 'uni', type: 'prefix', meaning: '单一' },
  { text: 'bi', type: 'prefix', meaning: '二，双' },
  { text: 'tri', type: 'prefix', meaning: '三' },
  { text: 'co', type: 'prefix', meaning: '共同，一起' },
  { text: 'de', type: 'prefix', meaning: '向下，去除' },
  { text: 'ex', type: 'prefix', meaning: '向外，前任' },
  { text: 'im', type: 'prefix', meaning: '向内；不' },
  { text: 'in', type: 'prefix', meaning: '向内；不' },
  { text: 'il', type: 'prefix', meaning: '不（用于 l 前）' },
  { text: 'ir', type: 'prefix', meaning: '不（用于 r 前）' },
  { text: 'mal', type: 'prefix', meaning: '坏，不良' },
  { text: 'mono', type: 'prefix', meaning: '单一' },
  { text: 'poly', type: 'prefix', meaning: '多' },
  { text: 'pro', type: 'prefix', meaning: '向前，支持' },
  { text: 'semi', type: 'prefix', meaning: '半' },
  { text: 'fore', type: 'prefix', meaning: '在前，预先' },
  { text: 'mid', type: 'prefix', meaning: '中间' },
  { text: 'mini', type: 'prefix', meaning: '小' },
]

/** 词根表：按长度降序匹配 */
const ROOTS: WordPart[] = [
  { text: 'struct', type: 'root', meaning: '建造' },
  { text: 'scrib', type: 'root', meaning: '写' },
  { text: 'script', type: 'root', meaning: '写' },
  { text: 'spect', type: 'root', meaning: '看' },
  { text: 'tract', type: 'root', meaning: '拉，拖' },
  { text: 'dict', type: 'root', meaning: '说' },
  { text: 'duct', type: 'root', meaning: '引导' },
  { text: 'graph', type: 'root', meaning: '写，画' },
  { text: 'ject', type: 'root', meaning: '投，掷' },
  { text: 'morph', type: 'root', meaning: '形态' },
  { text: 'chron', type: 'root', meaning: '时间' },
  { text: 'cred', type: 'root', meaning: '相信' },
  { text: 'hydr', type: 'root', meaning: '水' },
  { text: 'psych', type: 'root', meaning: '心灵' },
  { text: 'phon', type: 'root', meaning: '声音' },
  { text: 'photo', type: 'root', meaning: '光' },
  { text: 'port', type: 'root', meaning: '搬运，港口' },
  { text: 'spec', type: 'root', meaning: '看' },
  { text: 'spir', type: 'root', meaning: '呼吸，精神' },
  { text: 'therm', type: 'root', meaning: '热' },
  { text: 'viv', type: 'root', meaning: '生命' },
  { text: 'vit', type: 'root', meaning: '生命' },
  { text: 'aud', type: 'root', meaning: '听' },
  { text: 'bene', type: 'root', meaning: '好' },
  { text: 'bio', type: 'root', meaning: '生命，生物' },
  { text: 'geo', type: 'root', meaning: '地球，土地' },
  { text: 'loc', type: 'root', meaning: '地方' },
  { text: 'man', type: 'root', meaning: '手' },
  { text: 'mem', type: 'root', meaning: '记忆' },
  { text: 'mort', type: 'root', meaning: '死亡' },
  { text: 'nav', type: 'root', meaning: '船，航行' },
  { text: 'nov', type: 'root', meaning: '新' },
  { text: 'omni', type: 'root', meaning: '全部' },
  { text: 'phil', type: 'root', meaning: '爱' },
  { text: 'sens', type: 'root', meaning: '感觉' },
  { text: 'sent', type: 'root', meaning: '感觉' },
  { text: 'sequ', type: 'root', meaning: '跟随' },
  { text: 'sol', type: 'root', meaning: '单独' },
  { text: 'terr', type: 'root', meaning: '土地' },
  { text: 'urb', type: 'root', meaning: '城市' },
  { text: 'vac', type: 'root', meaning: '空' },
  { text: 'ver', type: 'root', meaning: '真实' },
  { text: 'voc', type: 'root', meaning: '声音，呼唤' },
  { text: 'vok', type: 'root', meaning: '呼唤' },
  { text: 'vol', type: 'root', meaning: '意愿' },
  { text: 'mit', type: 'root', meaning: '送' },
  { text: 'miss', type: 'root', meaning: '送' },
  { text: 'path', type: 'root', meaning: '感情，疾病' },
  { text: 'fact', type: 'root', meaning: '做，制造' },
  { text: 'fac', type: 'root', meaning: '做，制造' },
  { text: 'fer', type: 'root', meaning: '带来，承载' },
  { text: 'log', type: 'root', meaning: '话语，学问' },
  { text: 'jur', type: 'root', meaning: '法律' },
  { text: 'jus', type: 'root', meaning: '法律，公正' },
  { text: 'ven', type: 'root', meaning: '来' },
  { text: 'vent', type: 'root', meaning: '来' },
  { text: 'vid', type: 'root', meaning: '看' },
  { text: 'vis', type: 'root', meaning: '看' },
]

/** 后缀表：按长度降序匹配 */
const SUFFIXES: WordPart[] = [
  { text: 'ation', type: 'suffix', meaning: '…的行为/状态' },
  { text: 'able', type: 'suffix', meaning: '能够…的' },
  { text: 'ible', type: 'suffix', meaning: '能够…的' },
  { text: 'ance', type: 'suffix', meaning: '…的状态/性质' },
  { text: 'ence', type: 'suffix', meaning: '…的状态/性质' },
  { text: 'ment', type: 'suffix', meaning: '…的结果/状态' },
  { text: 'ness', type: 'suffix', meaning: '…的性质/状态' },
  { text: 'tion', type: 'suffix', meaning: '…的行为/状态' },
  { text: 'ious', type: 'suffix', meaning: '充满…的' },
  { text: 'ous', type: 'suffix', meaning: '充满…的' },
  { text: 'ful', type: 'suffix', meaning: '充满…的' },
  { text: 'ive', type: 'suffix', meaning: '有…倾向的' },
  { text: 'less', type: 'suffix', meaning: '没有…的' },
  { text: 'ship', type: 'suffix', meaning: '…的状态/身份' },
  { text: 'ity', type: 'suffix', meaning: '…的性质' },
  { text: 'ist', type: 'suffix', meaning: '…的人' },
  { text: 'ism', type: 'suffix', meaning: '…主义/学说' },
  { text: 'ize', type: 'suffix', meaning: '使…化' },
  { text: 'ise', type: 'suffix', meaning: '使…化' },
  { text: 'ing', type: 'suffix', meaning: '…的/正在…' },
  { text: 'ed', type: 'suffix', meaning: '…的（过去）' },
  { text: 'er', type: 'suffix', meaning: '…的人/物' },
  { text: 'or', type: 'suffix', meaning: '…的人/物' },
  { text: 'ly', type: 'suffix', meaning: '以…方式' },
  { text: 'al', type: 'suffix', meaning: '与…有关的' },
  { text: 'ic', type: 'suffix', meaning: '与…有关的' },
  { text: 'y', type: 'suffix', meaning: '具有…的' },
]

/** 按长度降序排序的匹配表 */
const PREFIX_SORTED = [...PREFIXES].sort((a, b) => b.text.length - a.text.length)
const ROOT_SORTED = [...ROOTS].sort((a, b) => b.text.length - a.text.length)
const SUFFIX_SORTED = [...SUFFIXES].sort((a, b) => b.text.length - a.text.length)

// ============================================================
// 纯函数核心
// ============================================================

function matchAt(parts: WordPart[], word: string, start: number): WordPart | null {
  const rest = word.slice(start)
  for (const p of parts) {
    if (rest.startsWith(p.text)) return p
  }
  return null
}

function matchEnd(parts: WordPart[], word: string, end: number): WordPart | null {
  const head = word.slice(0, end)
  for (const p of parts) {
    if (head.endsWith(p.text)) return p
  }
  return null
}

/** 启发式拆解单词：前缀 + 词根 + 后缀 */
export function decomposeWord(word: string): DecomposedWord {
  const w = word.trim().toLowerCase()
  if (!w) return { word, parts: [], matched: false, residual: '' }

  const parts: WordPart[] = []
  let pos = 0

  // 1. 前缀（最长优先）
  const prefix = matchAt(PREFIX_SORTED, w, 0)
  if (prefix && prefix.text.length < w.length) {
    parts.push(prefix)
    pos = prefix.text.length
  }

  // 2. 后缀（最长优先，从尾部匹配）
  let end = w.length
  const suffix = matchEnd(SUFFIX_SORTED, w, end)
  if (suffix && suffix.text.length < w.length - pos) {
    parts.push(suffix)
    end = w.length - suffix.text.length
  }

  // 3. 词根（在中间段匹配，最长优先）
  const middle = w.slice(pos, end)
  for (const r of ROOT_SORTED) {
    const idx = middle.indexOf(r.text)
    if (idx !== -1) {
      const before = middle.slice(0, idx)
      const after = middle.slice(idx + r.text.length)
      if (before.length <= 2 && after.length <= 2) {
        if (before) parts.push({ text: before, type: 'root', meaning: '（未识别）' })
        parts.push(r)
        if (after) parts.push({ text: after, type: 'root', meaning: '（未识别）' })
        break
      }
    }
  }

  // 排序：前缀在前，后缀在后
  const prefixParts = parts.filter(p => p.type === 'prefix')
  const suffixParts = parts.filter(p => p.type === 'suffix')
  const rootParts = parts.filter(p => p.type === 'root')
  const ordered = [...prefixParts, ...rootParts, ...suffixParts]

  // 剩余未识别部分
  const consumed = ordered.reduce((s, p) => s + p.text.length, 0)
  const residual = w.slice(consumed)

  return {
    word: w,
    parts: ordered,
    matched: ordered.some(p => p.type !== 'root' || p.meaning !== '（未识别）'),
    residual,
  }
}

/** 查词根/词缀释义 */
export function lookupPart(part: string): WordPart | null {
  const p = part.toLowerCase().replace(/[^a-z]/g, '')
  if (!p) return null
  return (
    PREFIXES.find(x => x.text === p) ||
    ROOTS.find(x => x.text === p) ||
    SUFFIXES.find(x => x.text === p) ||
    null
  )
}

/** 拆解洞察：温和说明构词逻辑 */
export function wordRootInsights(word: string, limit = 3): string[] {
  const d = decomposeWord(word)
  const insights: string[] = []
  if (!d.matched) {
    return [`「${word}」暂时没拆出熟悉的词根词缀，可能是专名或缩写。`]
  }
  const root = d.parts.find(p => p.type === 'root' && p.meaning !== '（未识别）')
  const prefix = d.parts.find(p => p.type === 'prefix')
  const suffix = d.parts.find(p => p.type === 'suffix')
  if (prefix && root) {
    insights.push(`「${prefix.text}」表示「${prefix.meaning}」，「${root.text}」表示「${root.meaning}」，合起来大致是「${prefix.meaning}地${root.meaning}」。`)
  } else if (root) {
    insights.push(`核心词根是「${root.text}」，意为「${root.meaning}」。`)
  }
  if (suffix) {
    insights.push(`词尾「${suffix.text}」表示「${suffix.meaning}」。`)
  }
  return insights.slice(0, limit)
}
