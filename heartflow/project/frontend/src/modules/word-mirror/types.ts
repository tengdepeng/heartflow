// ============================================================
// 字镜阁 · 类型定义
// 词源网络 + 语义关联 + 词汇游戏
// ============================================================

/** 词汇熟练度 */
export type ProficiencyLevel = 1 | 2 | 3 | 4 | 5

/** 词性 */
export type PartOfSpeech =
  | 'noun' | 'verb' | 'adjective' | 'adverb'
  | 'preposition' | 'conjunction' | 'pronoun' | 'interjection'

/** 词汇条目 */
export interface WordEntry {
  id: string
  word: string
  definition: string
  proficiency: ProficiencyLevel
  favorite: boolean
  /** 词性 */
  pos?: PartOfSpeech
  /** 标签 */
  tags: string[]
  /** 来源（如某本书籍、某次对话） */
  source?: string
  /** 创建时间 */
  createdAt: string
  /** 最后复习时间 */
  lastReviewedAt?: string
  /** 复习次数 */
  reviewCount: number
}

/** 词源节点 */
export interface EtymologyNode {
  word: string
  /** 词源解释 */
  origin: string
  /** 词源语言 */
  language: string
  /** 同源词 */
  cognates: string[]
  /** 词根/词缀分解 */
  components: string[]
}

/** 语义关联边 */
export interface SemanticEdge {
  source: string
  target: string
  /** 关系类型 */
  relationType: SemanticRelation
  /** 关系强度 0-1 */
  strength: number
}

/** 语义关系类型 */
export type SemanticRelation =
  | 'synonym'      // 近义词
  | 'antonym'      // 反义词
  | 'hyponym'      // 下位词
  | 'hypernym'     // 上位词
  | 'meronym'      // 部分词
  | 'holonym'      // 整体词
  | 'collocation'  // 搭配
  | 'derivation'   // 派生
  | 'related'      // 相关

/** 语义网络 */
export interface SemanticNetwork {
  nodes: string[]
  edges: SemanticEdge[]
  /** 中心词 */
  center: string
}

/** 词汇游戏类型 */
export type WordGameType = 'flashcard' | 'match' | 'fill-blank' | 'etymology-quiz'

/** 词汇游戏回合 */
export interface WordGameRound {
  type: WordGameType
  /** 题目 */
  question: string
  /** 选项 */
  options: string[]
  /** 正确答案索引 */
  correctIndex: number
  /** 目标词汇 */
  targetWord: string
  /** 提示 */
  hint?: string
}

/** 词汇游戏会话 */
export interface WordGameSession {
  id: string
  gameType: WordGameType
  rounds: WordGameRound[]
  currentRound: number
  correctCount: number
  totalCount: number
  startedAt: string
  completedAt?: string
  /** 涉及词汇 ID 列表 */
  wordIds: string[]
}

/** 词汇分组 */
export interface WordGroup {
  key: string
  label: string
  count: number
  items: WordEntry[]
  expanded: boolean
}

/** 文字分析结果 */
export interface TextAnalysis {
  /** 词频统计 */
  wordFreq: { word: string; count: number }[]
  /** 情绪基调 */
  mood: string
  /** 字间关联 */
  wordPairs: { a: string; b: string; relation: string }[]
  /** 书写节奏 */
  rhythm: { segment: string; pace: 'fast' | 'normal' | 'slow' }[]
  /** 平均间距 */
  avgSpacing: number
  /** 平均句长 */
  avgSentenceLength: number
}

/** 分析历史 */
export interface AnalysisHistoryItem {
  id: string
  text: string
  topWords: string[]
  mood: string
  analyzedAt: string
}

/** 字镜阁状态 */
export interface WordMirrorState {
  words: WordEntry[]
  analyses: AnalysisHistoryItem[]
  networks: SemanticNetwork[]
  gameSessions: WordGameSession[]
}

/** 词汇统计 */
export interface WordStats {
  total: number
  learning: number
  mastered: number
  favorites: number
  averageProficiency: number
  recentlyReviewed: number
  /** 按熟练度分布 */
  proficiencyDistribution: Record<ProficiencyLevel, number>
}

/** 存储键 */
export const WORD_MIRROR_STORAGE_KEYS = {
  WORDS: 'hf:word_mirror',
  HISTORY: 'hf:word_history',
  NETWORKS: 'hf:word_networks',
  GAMES: 'hf:word_games',
} as const

/** 词汇熟练度元数据 */
export const PROFICIENCY_META: Record<ProficiencyLevel, { label: string; color: string; description: string }> = {
  1: { label: '初识', color: '#c46a5a', description: '刚接触，需要频繁复习' },
  2: { label: '了解', color: '#e0a96d', description: '有一定印象，但不够牢固' },
  3: { label: '熟悉', color: '#f0c040', description: '基本掌握，偶尔遗忘' },
  4: { label: '熟练', color: '#8a9a7a', description: '能够自如使用' },
  5: { label: '精通', color: '#6b9fc4', description: '深入理解，举一反三' },
}

/** 语义关系元数据 */
export const SEMANTIC_RELATION_META: Record<SemanticRelation, { label: string; color: string; icon: string }> = {
  synonym: { label: '近义', color: '#8a9a7a', icon: '≈' },
  antonym: { label: '反义', color: '#c46a5a', icon: '↔' },
  hyponym: { label: '下位', color: '#6b9fc4', icon: '↓' },
  hypernym: { label: '上位', color: '#e0a96d', icon: '↑' },
  meronym: { label: '部分', color: '#d98c7a', icon: '⊂' },
  holonym: { label: '整体', color: '#b5707a', icon: '⊃' },
  collocation: { label: '搭配', color: '#f0c040', icon: '+' },
  derivation: { label: '派生', color: '#6b9fc4', icon: '→' },
  related: { label: '相关', color: '#94a3b8', icon: '~' },
}

/** 游戏类型元数据 */
export const GAME_TYPE_META: Record<WordGameType, { label: string; icon: string; description: string }> = {
  flashcard: { label: '闪卡', icon: '▣', description: '翻转卡片记忆词汇释义' },
  match: { label: '配对', icon: '⇔', description: '将词汇与释义进行配对' },
  'fill-blank': { label: '填空', icon: '□', description: '根据语境填入正确词汇' },
  'etymology-quiz': { label: '词源', icon: '◇', description: '猜词源与同源词' },
}