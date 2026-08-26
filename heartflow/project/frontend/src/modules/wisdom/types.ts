// ============================================================
// 知微阁 · 类型定义
//  知微记录（WisdomItem）与「光点并置」上下文（WisdomContext）
//  独立成 types.ts，供 index / wisdom-analytics / 视图共享，
//  避免「桶 → 分析引擎 → 桶」的循环依赖。
// ============================================================

/** 知微记录 */
export interface WisdomItem {
  id: string
  question: string
  answer: string
  createdAt: string
  tags: string[]
}

/** 光点卡片：仅并置呈现，不使用因果连接词 */
export interface AnswerCard {
  domain: string
  content: string
  room?: string
  route?: string
}

/** 视图层聚合的上下文：问询 / 定音锤 / 年度回看的数据底座 */
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