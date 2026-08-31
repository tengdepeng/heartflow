// ============================================================
// 幕僚 · 完整类型体系
// ============================================================

import type { KnowledgeScope } from './knowledge-scope'

// ---- 核心枚举 ----

/** 幕僚角色 */
export type AdvisorRole = 'hermit' | 'scholar' | 'craftsman' | 'guardian'

/** 幕僚性格 */
export type AdvisorPersonality = 'steady' | 'lively' | 'rigorous' | 'intuitive' | 'caring'

/** 幕僚状态 */
export type AdvisorState = 'slumber' | 'awake' | 'meditating' | 'evolving'

// ---- 角色定义 ----

export interface RoleDefinition {
  key: AdvisorRole
  label: string
  description: string
  icon: string
}

export const ADVISOR_ROLES: RoleDefinition[] = [
  {
    key: 'hermit',
    label: '隐士',
    description: '内观自省，记录情绪与思绪，守护内心花园',
    icon: '🧘',
  },
  {
    key: 'scholar',
    label: '学士',
    description: '求知问道，整理知识与笔记，点亮智慧之灯',
    icon: '📚',
  },
  {
    key: 'craftsman',
    label: '匠人',
    description: '专注致志，管理时间与事务，雕琢每一刻',
    icon: '🔨',
  },
  {
    key: 'guardian',
    label: '守护者',
    description: '护身养性，关照健康与习惯，守望日常',
    icon: '🛡️',
  },
]

// ---- 性格定义 ----

export interface PersonalityDefinition {
  key: AdvisorPersonality
  label: string
  description: string
  /** 该性格的默认色系 */
  colorScheme: {
    primary: string
    secondary: string
    aura: string
    text: string
  }
  /** 好感度增长倍率（不同性格对不同事件反应不同） */
  affinityModifiers: Partial<Record<string, number>>
  /** 回复风格标签 */
  style: string
}

export const ADVISOR_PERSONALITIES: PersonalityDefinition[] = [
  {
    key: 'steady',
    label: '沉稳',
    description: '少言寡语，每句都经过思量，如山岳般可靠',
    colorScheme: {
      primary: '#4a7c9b',
      secondary: '#2d5a7a',
      aura: 'rgba(74, 124, 155, 0.15)',
      text: '#b8d4e8',
    },
    affinityModifiers: { focus_complete: 1.0, emotion_logged: 0.8, click: 0.3 },
    style: '简洁、沉稳、少修饰',
  },
  {
    key: 'lively',
    label: '活泼',
    description: '元气满满，爱用表情和感叹，像阳光一样温暖',
    colorScheme: {
      primary: '#e8956a',
      secondary: '#d47a4a',
      aura: 'rgba(232, 149, 106, 0.15)',
      text: '#fce4d6',
    },
    affinityModifiers: { focus_complete: 1.2, emotion_logged: 1.0, click: 0.6 },
    style: '热情、活泼、多用语气词',
  },
  {
    key: 'rigorous',
    label: '严谨',
    description: '数据说话，精确到小数点，拒绝模糊表述',
    colorScheme: {
      primary: '#7a8a9a',
      secondary: '#5a6a7a',
      aura: 'rgba(122, 138, 154, 0.15)',
      text: '#d0d8e0',
    },
    affinityModifiers: { focus_complete: 1.5, emotion_logged: 0.5, click: 0.2 },
    style: '精准、数据驱动、少废话',
  },
  {
    key: 'intuitive',
    label: '直觉',
    description: '诗意地说话，用比喻和意象触碰感受',
    colorScheme: {
      primary: '#8b6aaa',
      secondary: '#6d4f8a',
      aura: 'rgba(139, 106, 170, 0.15)',
      text: '#dfcef0',
    },
    affinityModifiers: { focus_complete: 0.8, emotion_logged: 1.5, click: 0.4 },
    style: '诗意、抽象、富有意象',
  },
  {
    key: 'caring',
    label: '温柔',
    description: '轻声细语，永远站在你这边，给你安全感',
    colorScheme: {
      primary: '#7aab8a',
      secondary: '#5a8a6a',
      aura: 'rgba(122, 171, 138, 0.15)',
      text: '#d0e8d8',
    },
    affinityModifiers: { focus_complete: 0.9, emotion_logged: 1.3, click: 0.5 },
    style: '温暖、体贴、富有同理心',
  },
]

// ---- 好感度等级 ----

export interface AffinityTier {
  threshold: number
  title: string
  minInteractions: number
}

export const AFFINITY_TIERS: AffinityTier[] = [
  { threshold: 0, title: '陌路', minInteractions: 0 },
  { threshold: 20, title: '相识', minInteractions: 5 },
  { threshold: 40, title: '熟稔', minInteractions: 20 },
  { threshold: 60, title: '信赖', minInteractions: 50 },
  { threshold: 80, title: '知己', minInteractions: 100 },
  { threshold: 95, title: '羁绊', minInteractions: 200 },
]

// ---- 见证记录 ----

/**
 * 见证记录条目
 * 宪法第四部分「记录简化原则」：仅存中性引用，严禁落盘感受/描述/评价。
 * 蓝图要求「仅三元组 {advisor_id, memory_id, timestamp}」——at 为时间戳，
 * advisorId/memoryId 为匿名引用（旧数据可能缺失，允许未定义），
 * eventType 为中性事件类别（仅分类，不存感受/描述正文）。
 * 不保留任何自由文本 detail，从数据层杜绝幕僚"评价/拟人化"写入存储。
 */
export interface WitnessEntry {
  /** 见证时间戳（ISO） */
  at: string
  /** 中性事件类别（仅分类，不存感受/描述正文） */
  eventType: string
  /** 幕僚 ID（匿名引用，符合蓝图三元组；旧数据可能缺失） */
  advisorId?: string
  /** 关联记忆 ID（匿名引用；需记忆系统联动时填充，当前可选） */
  memoryId?: string
}

// ---- 对话消息类型 ----

/** 消息方向 */
export type MessageDirection = 'advisor_says' | 'user_replies'

// ---- 载体 · 形象自定义体系（蓝图第四部分） ----
// 蓝图16:533 载体形象选项：官方2D手绘 / 官方3D模型 / 官方抽象几何 / 用户自己导入 / 社区下载
// 蓝图16:444 载体编辑器：为「每个生命阶段」分别设置形态，调节外观/行为/声音，可分享
// 蓝图16:585 载体生命周期：诞生 → 成长 → 成熟 → 衰老 → 传承
// 蓝图16:508/538 镜我以「玉珠」为初始载体形态（见 preset-jingwo）。
//
// 设计约束（用户口径「完整按蓝图」）：
// - 系统绝不强制任何默认几何体——用户可自定义，或导入本地图片，或社区(.carrier)下载。
// - 官方抽象几何仅作为可选项之一保留（4 形），不再作为「唯一/默认」形态。
// - 用户导入图片：本地降采样 dataURL，不触云端（符合宪法第1条本地私有）。
// - 社区下载：落地为本地 .carrier 文件导入/分享，不触云端。

/** 官方抽象几何形态（保留为可选项，非强制默认） */
export type AdvisorCarrierGeometry = 'orb' | 'crystal' | 'flame' | 'seed'

/** 载体生命周期阶段（蓝图16:585） */
export type AdvisorCarrierStage = 'birth' | 'growth' | 'mature' | 'aging' | 'legacy'

/** 载体来源类型 */
export type AdvisorCarrierKind = 'official-geometry' | 'user-image'

/** 载体定义（可整体定义，亦可为某个生命阶段单独覆盖） */
export interface AdvisorCarrier {
  /** 来源：官方抽象几何 / 用户导入图片 */
  kind: AdvisorCarrierKind
  /** 官方抽象几何形态（kind=official-geometry 时有效） */
  geometry?: AdvisorCarrierGeometry
  /** 用户导入图片（dataURL，已降采样；kind=user-image 时有效） */
  imageData?: string
  /** 形态标签（如「玉珠」「萤火虫光点」，供展示与导出） */
  formLabel?: string
  /** 各生命阶段形态覆盖（可选；缺省阶段沿用顶层形态） */
  stages?: Partial<Record<AdvisorCarrierStage, AdvisorCarrier>>
}

/** 生命周期阶段顺序 */
export const CARRIER_STAGE_ORDER: AdvisorCarrierStage[] = ['birth', 'growth', 'mature', 'aging', 'legacy']

/** 生命周期阶段中文标签 */
export const CARRIER_STAGE_LABELS: Record<AdvisorCarrierStage, string> = {
  birth: '诞生',
  growth: '成长',
  mature: '成熟',
  aging: '衰老',
  legacy: '传承',
}

/** 官方抽象几何目录（保留 4 形，作为可选项而非强制默认） */
export const OFFICIAL_CARRIER_GEOMETRIES: { value: AdvisorCarrierGeometry; label: string; glyph: string }[] = [
  { value: 'orb', label: '玉珠', glyph: '◉' },
  { value: 'crystal', label: '晶簇', glyph: '◆' },
  { value: 'flame', label: '焰', glyph: '♜' },
  { value: 'seed', label: '种', glyph: '❉' },
]

/** 官方几何字形映射 */
export const OFFICIAL_GEOMETRY_GLYPH: Record<AdvisorCarrierGeometry, string> = {
  orb: '◉',
  crystal: '◆',
  flame: '♜',
  seed: '❉',
}

/**
 * 6 固定预设的官方载体形态标签（蓝图16:538-543 各自的载体）：
 * 玉珠 / 萤火虫光点 / 暖光灯笼 / 深色墨砚 / 沙漏 / 古铜钟。
 * 预设幕僚的 kind=official-geometry，formLabel 取自此处。
 */
export const PRESET_CARRIER_FORMS: Record<string, string> = {
  'preset-jingwo': '玉珠',
  'preset-zhuifeng': '萤火虫光点',
  'preset-lingxi': '暖光灯笼',
  'preset-moyuan': '深色墨砚',
  'preset-shichen': '沙漏',
  'preset-shouzhongren': '古铜钟',
}

/**
 * 解析载体在某生命阶段的有效形态（缺省阶段沿用顶层）。
 */
export function carrierResolveStage(
  carrier: AdvisorCarrier | undefined,
  stage?: AdvisorCarrierStage,
): AdvisorCarrier | undefined {
  if (!carrier) return undefined
  if (stage && carrier.stages && carrier.stages[stage]) return carrier.stages[stage]
  return carrier
}

/**
 * 取载体的展示字形：
 * - 官方几何 → 对应字形
 * - 用户图片 → 占位字形（实际渲染时由调用方判定 imageData 改用 <img>）
 * - 无载体 → 回退 undefined（交由调用方按 personality 兜底）
 */
export function carrierGlyph(
  carrier: AdvisorCarrier | undefined,
  stage?: AdvisorCarrierStage,
): string | undefined {
  const resolved = carrierResolveStage(carrier, stage)
  if (!resolved) return undefined
  if (resolved.kind === 'user-image') return '◈' // 图片形态占位，调用方应改渲染 img
  if (resolved.geometry) return OFFICIAL_GEOMETRY_GLYPH[resolved.geometry]
  return undefined
}

/** 判断载体是否为用户导入图片形态 */
export function carrierIsImage(
  carrier: AdvisorCarrier | undefined,
  stage?: AdvisorCarrierStage,
): boolean {
  const resolved = carrierResolveStage(carrier, stage)
  return !!resolved && resolved.kind === 'user-image' && !!resolved.imageData
}

/**
 * 推导幕僚载体当前生命阶段（蓝图16:585 生命周期 诞生→成长→成熟→衰老→传承）。
 * 纯函数：依据 tenure(createdAt) / 亲密度 / 是否退休 推导，不落盘——
 * 渲染时由 carrierResolveStage 解析对应阶段形态，故无需持久化"当前阶段"。
 * - retired → legacy（传承 / 归档）
 * - tenure < 30d → birth；< 180d → growth；< 365d → mature
 * - tenure ≥ 365d：亲密度 ≥ 40 视为仍活跃 → mature，否则 → aging（久疏）
 */
export function advisorCarrierStageOf(profile: AdvisorProfile): AdvisorCarrierStage {
  if (profile.retired) return 'legacy'
  const created = profile.createdAt ? new Date(profile.createdAt).getTime() : Date.now()
  const tenureDays = (Date.now() - created) / 86_400_000
  if (tenureDays >= 365) return (profile.affinity ?? 0) >= 40 ? 'mature' : 'aging'
  if (tenureDays >= 180) return 'mature'
  if (tenureDays >= 30) return 'growth'
  return 'birth'
}

// ---- 幕僚完整资料 ----

export interface AdvisorProfile {
  /** 唯一标识 */
  id: string
  /** 幕僚名称（用户可自定义） */
  name: string
  /** 角色 */
  role: AdvisorRole
  /** 性格 */
  personality: AdvisorPersonality
  /** 当前状态 */
  state: AdvisorState
  /** 好感度 0-100 */
  affinity: number
  /** 当前等级（基于好感度） */
  level: number
  /** 总交互次数 */
  totalInteractions: number
  /** 创建时间 */
  createdAt: string
  /** 最后活动时间 */
  lastActiveAt: string | null
  /** 是否解锁（创建后即解锁） */
  unlocked: boolean
  /** 用户自定义色系（覆盖性格默认色系） */
  customColorScheme?: {
    primary: string
    secondary: string
    aura: string
    text: string
  }
  /** 个性化问候语（达到知己后解锁自定义） */
  customGreeting?: string
  /** @deprecated 旧载体形态枚举，已被 carrier 取代；normalizeAdvisor 会迁移为 carrier */
  carrierShape?: 'orb' | 'crystal' | 'flame' | 'seed'
  /** 载体（形象自定义体系，蓝图第四部分）：官方几何 / 用户导入 / 各生命阶段 / 可分享（.carrier） */
  carrier?: AdvisorCarrier
  /** 职责描述（固定幕僚预设用，说明其核心看守领域） */
  responsibilities?: string
  /** 派生来源：若本幕僚是基于某固定预设（preset-*）派生而来，记录来源预设 id；用户纯空白创建则为 undefined。仅作溯源展示，不影响 6 预设幂等注入。 */
  derivedFrom?: string
  /** 是否已退休 */
  retired?: boolean
  /** 退休时间 */
  retiredAt?: string | null
  /** 见证记录（上限 500 条，自动滚动清除） */
  witnessLog?: WitnessEntry[]
  /** 对话上下文（最近 5 轮） */
  conversationContext?: {
    /** 最近一条幕僚消息 */
    lastAdvisorMessage: string | null
    /** 最近一条用户回复 */
    lastUserReply: string | null
    /** 消息轮次序号 */
    turnCount: number
  }
  /** 专属知识库范围（蓝图第四部分·三）：默认全殿堂，可在幕僚设置中收窄。
   *  经 knowledge-scope.collectHallKnowledge 消费，注入幕僚回答链路。 */
  knowledgeScope?: KnowledgeScope
}

// ---- 幕僚消息 ----

export interface AdvisorMessage {
  id: string
  advisorId: string
  text: string
  at: string
  trigger: string
}

// ---- 性格驱动的回复池 ----

export type ResponseContext =
  | 'focus_complete'
  | 'focus_milestone'
  | 'emotion_logged'
  | 'click'
  | 'daily_reset'
  | 'late_night'
  | 'return'
  | 'note_created'
  | 'affinity_milestone'

/** 性格回复模板条目 */
export interface ResponseTemplate {
  context: ResponseContext
  templates: string[]
  /** 额外参数：如 focus milestone 的数字 */
  dynamic?: boolean
}

// ---- 创建幕僚时的初始配置 ----

export interface AdvisorCreationParams {
  name: string
  role: AdvisorRole
  personality: AdvisorPersonality
}
