// ============================================================
// 通用跨域关联引擎 · 类型
// 蓝图第三部分·第二层（共鸣协议层）：把笔记/情绪/锚点/结晶/专注/目标/
// 关系/账本/载体等不同域的记录自动联系起来。
//
// 设计原则：
// - 纯前端、无 AI / 无 embedding、无新依赖（复用各域既有 tags + 时间戳）。
// - 只读 storage 的 get*，不写主 schema（避免触发 migrate / saveSchema）。
// - 关联结果仅在运行时计算，可解释、可测试。
// ============================================================

/** 参与的域（与 storage 顶层集合一一对应） */
export type DomainKey =
  | 'session'
  | 'crystal'
  | 'note'
  | 'anchor'
  | 'relation'
  | 'goal'
  | 'emotion'
  | 'ledger'
  | 'carrier'
  | 'advisor'

/** 关联类型 */
export type LinkType =
  /** 共享标签（跨域标签交集） */
  | 'shared-tag'
  /** 时间邻近（同一时间窗内先后发生） */
  | 'temporal-proximity'
  /** 因果顺序（硬外键或时间序启发式定向） */
  | 'causal-order'

/** 归一化后的全域条目（关联算法的统一输入） */
export interface NormalizedItem {
  domain: DomainKey
  id: string
  /** 展示标签 */
  label: string
  /** 归一化时间戳（ms） */
  ts: number
  /** 标签集合（含由枚举字段降级而来的"伪标签"） */
  tags: string[]
}

/** 一条跨域关联 */
export interface CrossDomainLink {
  id: string
  sourceDomain: DomainKey
  sourceId: string
  targetDomain: DomainKey
  targetId: string
  linkType: LinkType
  /** 关联强度 0..1 */
  strength: number
  /** 关联证据 */
  sharedTags?: string[]
  /** 时间距离（分钟），temporal / causal 用 */
  timeDistanceMin?: number
  /** 人类可读说明 */
  reason: string
  /** 引擎运行时刻（ISO） */
  createdAt: string
}

/** 关联图（节点 + 边），可直接喂给力导向布局 / 时间线视图 */
export interface AssociationGraph {
  nodes: Array<{ domain: DomainKey; id: string; label: string; ts: number }>
  links: CrossDomainLink[]
}
