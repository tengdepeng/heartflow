// ============================================================
// 经略阁 · 知识关系引擎 · 类型定义
// ============================================================

/** 知识分类 */
export type KnowledgeCategory = 'concept' | 'rule' | 'frame' | 'insight' | 'pitfall' | 'metaphor'

/** 关系类型 */
export type RelationType = 'related' | 'causal' | 'belongs' | 'contrast'

/** 知识节点 */
export interface KnowledgeNode {
  id: string
  title: string
  desc: string
  cat: KnowledgeCategory
  tags: string[]
  createdAt: string
  updatedAt: string
  /** 关联房间（语丝从某房间创建计划时带上，用于房间级聚合；可空） */
  roomId?: string
  /** 截止时间（语丝抽取；本地 YYYY-MM-DD 或带时间；可空） */
  due?: string | null
  /** 执行人（语丝抽取；可空） */
  assignee?: string | null
  /** 优先级（语丝抽取：low/normal/high；可空） */
  priority?: 'low' | 'normal' | 'high'
}

/** 知识关系 */
export interface KnowledgeRelation {
  id: string
  sourceId: string
  targetId: string
  type: RelationType
  label: string
  createdAt: string
}

/** 关系类型元数据 */
export interface RelationTypeMeta {
  label: string
  icon: string
  color: string
  desc: string
}

export const RELATION_TYPE_META: Record<RelationType, RelationTypeMeta> = {
  related: {
    label: '关联',
    icon: '🔗',
    color: '#6b9fc4',
    desc: '知识点之间存在相关性或引用关系',
  },
  causal: {
    label: '因果',
    icon: '⚡',
    color: '#E67E22',
    desc: '知识点之间存在因果关系',
  },
  belongs: {
    label: '归属',
    icon: '📂',
    color: '#8a9a7a',
    desc: '知识点之间存在从属或包含关系',
  },
  contrast: {
    label: '对比',
    icon: '⚖️',
    color: '#a07c8c',
    desc: '知识点之间存在对比或对立关系',
  },
}