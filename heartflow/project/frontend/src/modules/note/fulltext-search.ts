// ============================================================
// 思绪书房 · 全文搜索引擎（P16-8）
// 倒排索引 + TF-IDF 评分 + 模糊匹配 + 搜索建议
// ============================================================

import type { Note } from '../../types'

// ---- 搜索引擎类型 ----

/** 倒排索引条目 */
export interface InvertedIndexEntry {
  /** 词条 */
  term: string
  /** 文档频率（包含该词的文档数） */
  documentFrequency: number
  /** 倒排列表：文档ID → 词频 */
  postings: Map<string, number>
}

/** 搜索结果 */
export interface SearchResult {
  /** 笔记 */
  note: Note
  /** 相关性评分 0-100 */
  score: number
  /** 匹配详情 */
  matches: MatchDetail[]
  /** 高亮片段 */
  highlights: TextHighlight[]
}

/** 匹配详情 */
export interface MatchDetail {
  /** 匹配字段 */
  field: 'title' | 'content' | 'tags'
  /** 匹配词 */
  term: string
  /** 在该字段中的词频 */
  frequency: number
}

/** 文本高亮 */
export interface TextHighlight {
  /** 字段名 */
  field: 'title' | 'content'
  /** 高亮文本（匹配词用 <mark> 包裹） */
  text: string
}

/** 搜索统计 */
export interface SearchStats {
  /** 索引文档数 */
  indexedDocuments: number
  /** 索引词条数 */
  indexedTerms: number
  /** 平均文档长度 */
  avgDocumentLength: number
  /** 上次索引时间 */
  lastIndexedAt?: string
}

/** 搜索建议 */
export interface SearchSuggestion {
  /** 建议文本 */
  text: string
  /** 类型 */
  type: 'term' | 'tag' | 'phrase'
  /** 关联文档数 */
  documentCount: number
}

/** 搜索选项 */
export interface SearchOptions {
  /** 返回结果数 */
  limit?: number
  /** 最低评分阈值 */
  minScore?: number
  /** 是否启用模糊匹配 */
  fuzzy?: boolean
  /** 模糊匹配最大编辑距离 */
  maxEditDistance?: number
  /** 是否包含已归档笔记 */
  includeArchived?: boolean
  /** 标题权重 */
  titleWeight?: number
  /** 内容权重 */
  contentWeight?: number
  /** 标签权重 */
  tagWeight?: number
}

// ---- 分词器 ----

/** 中文停用词 */
const CHINESE_STOP_WORDS = new Set([
  '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一',
  '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着',
  '没有', '看', '好', '自己', '这', '他', '她', '它', '们', '那', '些',
  '所', '为', '所以', '因为', '但是', '然而', '而且', '或者', '如果',
  '虽然', '可以', '这个', '那个', '什么', '怎么', '如何', '为什么',
  '已经', '还是', '只是', '不过', '然后', '之后', '之前', '之后',
  '这里', '那里', '哪里', '这样', '那样', '一样', '时候', '时间',
  '知道', '觉得', '认为', '应该', '可能', '需要', '现在', '今天',
  '昨天', '明天', '今年', '去年', '一直', '总是', '经常', '很多',
  '非常', '比较', '真的', '其实', '当然', '一定', '必须', '等等',
  '进行', '使用', '通过', '可以', '能够', '开始', '已经', '没有',
])

/** 英文停用词 */
const ENGLISH_STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
  'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
  'before', 'after', 'above', 'below', 'between', 'under', 'again',
  'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why',
  'how', 'all', 'both', 'each', 'few', 'more', 'most', 'other', 'some',
  'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than',
  'too', 'very', 'and', 'but', 'or', 'if', 'while', 'this', 'that',
  'it', 'its', 'they', 'them', 'their', 'what', 'which', 'who',
])

// ---- 全文搜索引擎 ----

export function useFulltextSearch() {
  /** 倒排索引 */
  let index: Map<string, InvertedIndexEntry> = new Map()
  /** 已索引的文档 */
  let indexedDocs: Map<string, { note: Note; length: number }> = new Map()
  /** 总文档长度 */
  let totalDocLength = 0
  /** 上次索引时间 */
  let lastIndexedAt: string | undefined

  /**
   * 构建倒排索引
   */
  function buildIndex(notes: Note[]): void {
    index = new Map()
    indexedDocs = new Map()
    totalDocLength = 0

    const activeNotes = notes.filter(n => !n.deletedAt)

    for (const note of activeNotes) {
      // 组合所有可搜索文本
      const text = `${note.title} ${note.title} ${note.content} ${note.tags.join(' ')}`
      const tokens = tokenize(text)
      const docLength = tokens.length
      totalDocLength += docLength

      indexedDocs.set(note.id, { note, length: docLength })

      // 统计词频
      const termFreq = new Map<string, number>()
      for (const token of tokens) {
        termFreq.set(token, (termFreq.get(token) || 0) + 1)
      }

      // 更新倒排索引
      for (const [term, freq] of termFreq) {
        if (!index.has(term)) {
          index.set(term, {
            term,
            documentFrequency: 0,
            postings: new Map(),
          })
        }
        const entry = index.get(term)!
        entry.postings.set(note.id, freq)
        entry.documentFrequency = entry.postings.size
      }
    }

    lastIndexedAt = new Date().toISOString()
  }

  /**
   * 搜索笔记
   */
  function search(
    query: string,
    notes: Note[],
    options: SearchOptions = {},
  ): SearchResult[] {
    const {
      limit = 20,
      minScore = 0,
      fuzzy = true,
      maxEditDistance = 2,
      includeArchived = false,
      titleWeight = 3.0,
      contentWeight = 1.0,
      tagWeight = 2.0,
    } = options

    if (!query.trim()) return []

    const queryTokens = tokenize(query)
    if (queryTokens.length === 0) return []

    const totalDocs = indexedDocs.size
    const results: SearchResult[] = []

    const activeNotes = notes.filter(n => {
      if (n.deletedAt) return false
      if (!includeArchived && n.archived) return false
      return true
    })

    for (const note of activeNotes) {
      let totalScore = 0
      const matches: MatchDetail[] = []
      const matchedTerms = new Set<string>()

      for (const token of queryTokens) {
        // 标题匹配
        const titleMatches = countMatches(note.title, token, fuzzy, maxEditDistance)
        if (titleMatches > 0) {
          totalScore += titleMatches * titleWeight * idf(token, totalDocs, index)
          matches.push({ field: 'title', term: token, frequency: titleMatches })
          matchedTerms.add(token)
        }

        // 内容匹配
        const contentMatches = countMatches(note.content, token, fuzzy, maxEditDistance)
        if (contentMatches > 0) {
          totalScore += contentMatches * contentWeight * idf(token, totalDocs, index)
          matches.push({ field: 'content', term: token, frequency: contentMatches })
          matchedTerms.add(token)
        }

        // 标签匹配
        const tagMatches = note.tags.filter(t => matchesToken(t, token, fuzzy, maxEditDistance)).length
        if (tagMatches > 0) {
          totalScore += tagMatches * tagWeight * idf(token, totalDocs, index)
          matches.push({ field: 'tags', term: token, frequency: tagMatches })
          matchedTerms.add(token)
        }
      }

      // 精确短语匹配加分
      const phraseBonus = computePhraseBonus(query, note, matchedTerms)
      totalScore += phraseBonus

      // 归一化评分到 0-100
      const normalizedScore = normalizeScore(totalScore, queryTokens.length)

      if (normalizedScore >= minScore) {
        results.push({
          note,
          score: normalizedScore,
          matches,
          highlights: generateHighlights(note, queryTokens, fuzzy, maxEditDistance),
        })
      }
    }

    // 排序并截断
    results.sort((a, b) => b.score - a.score)
    return results.slice(0, limit)
  }

  /**
   * 快速搜索（仅返回笔记 ID）
   */
  function quickSearch(
    query: string,
    notes: Note[],
    limit: number = 10,
  ): string[] {
    const results = search(query, notes, { limit, minScore: 1, fuzzy: true })
    return results.map(r => r.note.id)
  }

  /**
   * 搜索建议（自动补全）
   */
  function suggest(
    prefix: string,
    notes: Note[],
    limit: number = 8,
  ): SearchSuggestion[] {
    if (!prefix.trim()) return []
    const suggestions: SearchSuggestion[] = []
    const lowerPrefix = prefix.toLowerCase()

    // 1. 词条建议：从索引中找匹配的词条
    const termSuggestions: { text: string; count: number }[] = []
    for (const [term, entry] of index) {
      if (term.startsWith(lowerPrefix) && term !== lowerPrefix) {
        termSuggestions.push({ text: term, count: entry.documentFrequency })
      }
    }
    termSuggestions
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .forEach(s => suggestions.push({
        text: s.text,
        type: 'term',
        documentCount: s.count,
      }))

    // 2. 标签建议
    const activeNotes = notes.filter(n => !n.deletedAt)
    const tagCounts = new Map<string, number>()
    for (const note of activeNotes) {
      for (const tag of note.tags) {
        if (tag.toLowerCase().startsWith(lowerPrefix)) {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
        }
      }
    }
    ;[...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .forEach(([tag, count]) => suggestions.push({
        text: tag,
        type: 'tag',
        documentCount: count,
      }))

    // 3. 短语建议：标题中匹配的片段
    const phraseSet = new Set<string>()
    for (const note of activeNotes) {
      const lowerTitle = note.title.toLowerCase()
      const idx = lowerTitle.indexOf(lowerPrefix)
      if (idx >= 0) {
        const end = Math.min(idx + lowerPrefix.length + 20, lowerTitle.length)
        const phrase = note.title.slice(idx, end).trim()
        if (phrase.length > lowerPrefix.length) {
          phraseSet.add(phrase)
        }
      }
    }
    ;[...phraseSet].slice(0, 3).forEach(text => suggestions.push({
      text,
      type: 'phrase',
      documentCount: 1,
    }))

    return suggestions.slice(0, limit)
  }

  /**
   * 获取搜索统计
   */
  function getStats(): SearchStats {
    return {
      indexedDocuments: indexedDocs.size,
      indexedTerms: index.size,
      avgDocumentLength: indexedDocs.size > 0
        ? Math.round(totalDocLength / indexedDocs.size)
        : 0,
      lastIndexedAt,
    }
  }

  /**
   * 获取相关词条（基于共现）
   */
  function getRelatedTerms(term: string, limit: number = 10): string[] {
    const entry = index.get(term)
    if (!entry) return []

    const relatedDocs = new Set(entry.postings.keys())
    const cooccurrence = new Map<string, number>()

    for (const docId of relatedDocs) {
      for (const [otherTerm, otherEntry] of index) {
        if (otherTerm === term) continue
        if (otherEntry.postings.has(docId)) {
          cooccurrence.set(otherTerm, (cooccurrence.get(otherTerm) || 0) + 1)
        }
      }
    }

    return [...cooccurrence.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([t]) => t)
  }

  return {
    buildIndex,
    search,
    quickSearch,
    suggest,
    getStats,
    getRelatedTerms,
  }
}

// ---- 内部函数 ----

/** 分词 */
function tokenize(text: string): string[] {
  const tokens: string[] = []

  // 分割中文和英文
  // 中文：按字符分割，连续中文字符组成词（2-3 字）
  const chineseChars = text.match(/[\u4e00-\u9fff]+/g)
  if (chineseChars) {
    for (const segment of chineseChars) {
      // 二元组和三元组分词
      for (let i = 0; i < segment.length - 1; i++) {
        const bigram = segment.slice(i, i + 2)
        if (!CHINESE_STOP_WORDS.has(bigram)) {
          tokens.push(bigram)
        }
      }
      for (let i = 0; i < segment.length - 2; i++) {
        const trigram = segment.slice(i, i + 3)
        tokens.push(trigram)
      }
      // 单字（非停用词）
      for (const char of segment) {
        if (!CHINESE_STOP_WORDS.has(char)) {
          tokens.push(char)
        }
      }
    }
  }

  // 英文：按空格和标点分词
  const englishWords = text.match(/[a-zA-Z]+/g)
  if (englishWords) {
    for (const word of englishWords) {
      const lower = word.toLowerCase()
      if (!ENGLISH_STOP_WORDS.has(lower) && lower.length > 1) {
        tokens.push(lower)
      }
    }
  }

  // 数字单独提取
  const numbers = text.match(/\d+/g)
  if (numbers) {
    for (const num of numbers) {
      tokens.push(num)
    }
  }

  return tokens
}

/** 计算逆文档频率 */
function idf(term: string, totalDocs: number, index: Map<string, InvertedIndexEntry>): number {
  const entry = index.get(term)
  if (!entry || entry.documentFrequency === 0) return 1
  return Math.log(1 + totalDocs / entry.documentFrequency)
}

/** 计算匹配次数 */
function countMatches(
  text: string,
  token: string,
  fuzzy: boolean,
  maxEditDistance: number,
): number {
  if (!fuzzy) {
    return (text.toLowerCase().match(new RegExp(escapeRegExp(token), 'gi')) || []).length
  }

  // 精确匹配
  let count = (text.toLowerCase().match(new RegExp(escapeRegExp(token), 'gi')) || []).length

  // 模糊匹配：对文本中的每个词进行编辑距离计算
  if (count === 0 && token.length >= 3) {
    const words = text.toLowerCase().split(/[\s,，。！？、；：""''（）\(\)\[\]【】]+/)
    for (const word of words) {
      if (word.length >= 2 && editDistance(word, token) <= maxEditDistance) {
        count++
      }
    }
  }

  return count
}

/** 检查 token 是否匹配 */
function matchesToken(
  text: string,
  token: string,
  fuzzy: boolean,
  maxEditDistance: number,
): boolean {
  const lower = text.toLowerCase()
  if (lower === token) return true
  if (lower.includes(token)) return true

  if (fuzzy && token.length >= 3 && text.length >= 2) {
    return editDistance(lower, token) <= maxEditDistance
  }

  return false
}

/** 短语匹配加分 */
function computePhraseBonus(
  query: string,
  note: Note,
  _matchedTerms: Set<string>,
): number {
  let bonus = 0
  const lowerQuery = query.toLowerCase()

  // 标题精确短语匹配
  if (note.title.toLowerCase().includes(lowerQuery)) {
    bonus += 10
  }

  // 内容精确短语匹配
  if (note.content.toLowerCase().includes(lowerQuery)) {
    bonus += 5
  }

  // 查询词在标题中连续出现
  const titleWords = note.title.toLowerCase().split(/\s+/)
  const queryWords = lowerQuery.split(/\s+/)
  if (queryWords.length >= 2) {
    for (let i = 0; i <= titleWords.length - queryWords.length; i++) {
      let match = true
      for (let j = 0; j < queryWords.length; j++) {
        if (titleWords[i + j] !== queryWords[j]) {
          match = false
          break
        }
      }
      if (match) {
        bonus += 8
        break
      }
    }
  }

  return bonus
}

/** 归一化评分 */
function normalizeScore(rawScore: number, queryTokenCount: number): number {
  // 使用 sigmoid 函数映射到 0-100
  const normalized = 100 / (1 + Math.exp(-rawScore / (queryTokenCount * 3 + 5)))
  return Math.round(normalized)
}

/** 生成高亮片段 */
function generateHighlights(
  note: Note,
  queryTokens: string[],
  fuzzy: boolean,
  maxEditDistance: number,
): TextHighlight[] {
  const highlights: TextHighlight[] = []

  // 标题高亮
  let highlightedTitle = note.title
  for (const token of queryTokens) {
    const regex = new RegExp(`(${escapeRegExp(token)})`, 'gi')
    highlightedTitle = highlightedTitle.replace(regex, '<mark>$1</mark>')
  }
  if (highlightedTitle !== note.title) {
    highlights.push({ field: 'title', text: highlightedTitle })
  }

  // 内容高亮：提取包含匹配词的片段
  const contentLower = note.content.toLowerCase()
  const matchPositions: number[] = []

  for (const token of queryTokens) {
    let idx = contentLower.indexOf(token)
    while (idx >= 0) {
      matchPositions.push(idx)
      idx = contentLower.indexOf(token, idx + 1)
    }

    // 模糊匹配
    if (fuzzy && token.length >= 3) {
      const words = note.content.split(/[\s,，。！？、；：""''（）\(\)\[\]【】]+/)
      let pos = 0
      for (const word of words) {
        if (word.length >= 2 && editDistance(word.toLowerCase(), token) <= maxEditDistance) {
          matchPositions.push(pos)
        }
        pos += word.length + 1
      }
    }
  }

  if (matchPositions.length > 0) {
    // 取第一个匹配位置，截取上下文
    const pos = matchPositions[0]
    const contextStart = Math.max(0, pos - 40)
    const contextEnd = Math.min(note.content.length, pos + 100)
    let snippet = note.content.slice(contextStart, contextEnd)

    if (contextStart > 0) snippet = '...' + snippet
    if (contextEnd < note.content.length) snippet = snippet + '...'

    // 高亮匹配词
    for (const token of queryTokens) {
      const regex = new RegExp(`(${escapeRegExp(token)})`, 'gi')
      snippet = snippet.replace(regex, '<mark>$1</mark>')
    }

    highlights.push({ field: 'content', text: snippet })
  }

  return highlights
}

/** 编辑距离（Levenshtein） */
function editDistance(s1: string, s2: string): number {
  const m = s1.length
  const n = s2.length

  // 快速剪枝
  if (Math.abs(m - n) > 3) return Math.max(m, n)

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
      }
    }
  }

  return dp[m][n]
}

/** 转义正则特殊字符 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}