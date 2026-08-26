// ============================================================
// 全我镜 · 自我对话共享类型
// 与 wisdom/types.ts 同款——把共享类型从 index.ts 中提出，
// 避免 index <-> analytics 循环依赖。
// ============================================================

export interface SelfTalk {
  id: string
  text: string
  at: string
  roomContext: string | null
}