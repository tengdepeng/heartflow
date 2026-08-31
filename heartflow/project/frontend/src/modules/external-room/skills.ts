// ============================================================
// 外链房 · 技能登记（能力插件系统）
// ------------------------------------------------------------
// 宪法：本地私有（第1条）；超级自定义（第2条，可增删）。
// 叶子模块：仅依赖 engine/storage，不 import engine/ai 重链。
// 出口闸在组件层（SkillChannel.vue）调用 isExternalAIConsented，
// 本模块只负责登记与持久化；外部技能出网经闸门授权后才允许添加。
// 种子来源：镜我意图（modules/mirror/intents）+ 顾问调令（modules/advisor/commandIntent）。
// ============================================================

import { storage } from '../../engine/storage'
import { INTENT_INFO, getAllIntentCategories } from '../../modules/mirror/intents'
import type { CommandTaskType } from '../../modules/advisor/commandIntent'

export type SkillSource = 'mirror' | 'advisor' | 'external'

/** 一项技能 / 能力的定义（展示与登记用，不含执行逻辑） */
export interface SkillDef {
  id: string
  label: string
  icon: string
  description: string
  source: SkillSource
  /** 内置能力（镜我/顾问）默认可用；外部技能由用户添加 */
  builtin: boolean
  /** 外部技能调用出网，需出口闸同意 */
  requiresConsent: boolean
}

/** 用户添加的外部技能（持久化条目） */
export interface ExternalSkill {
  id: string
  name: string
  trigger: string
  icon: string
  description: string
  addedAt: string
}

export interface ExternalSkillInput {
  name: string
  trigger?: string
  icon?: string
  description?: string
}

const ENABLED_KEY = 'skill:enabled'
const EXTERNAL_KEY = 'skill:external'

// 顾问调令 8 类（与 modules/advisor/commandIntent 的 CommandTaskType 对齐，type-only 引用）。
// 元数据在本模块维护，避免耦合顾问内部 LABEL_BY_TYPE（未导出）。
const ADVISOR_SEED: Record<CommandTaskType, { label: string; icon: string; description: string }> = {
  focus:     { label: '专注 / 计时', icon: '⏱️', description: '启动专注计时，进入心流' },
  note:      { label: '笔记 / 记录', icon: '📝', description: '记录笔记、灵感与想法' },
  emotion:   { label: '情绪', icon: '🌿', description: '识别并疏导情绪波动' },
  anchor:    { label: '锚点', icon: '⚓', description: '设立与完成意图锚点' },
  review:    { label: '回顾 / 检索', icon: '🔍', description: '回顾工作与生活记录' },
  finance:   { label: '记账 / 财务', icon: '💰', description: '记账与开销分析' },
  navigate:  { label: '导航', icon: '🧭', description: '一句话跳转房间与功能' },
  general:   { label: '通用对话', icon: '💬', description: '通用陪伴与应答' },
}

function readEnabled(): Record<string, boolean> {
  return storage.getKV<Record<string, boolean>>(ENABLED_KEY, {})
}

function readExternal(): ExternalSkill[] {
  return storage.getKV<ExternalSkill[]>(EXTERNAL_KEY, [])
}

/** 镜我意图种子（排除 unknown），与 tool-cards.ts 一致 */
export function getMirrorSkills(): SkillDef[] {
  return getAllIntentCategories()
    .filter((c) => c !== 'unknown')
    .map((cat) => {
      const info = INTENT_INFO[cat]
      return {
        id: `mirror:${cat}`,
        label: info.label,
        icon: info.icon,
        description: info.description,
        source: 'mirror',
        builtin: true,
        requiresConsent: false,
      }
    })
}

/** 顾问调令种子（8 类），与 commandIntent 的 CommandTaskType 对齐 */
export function getAdvisorSkills(): SkillDef[] {
  return (Object.keys(ADVISOR_SEED) as CommandTaskType[]).map((t) => {
    const m = ADVISOR_SEED[t]
    return {
      id: `advisor:${t}`,
      label: m.label,
      icon: m.icon,
      description: m.description,
      source: 'advisor',
      builtin: true,
      requiresConsent: false,
    }
  })
}

export function getBuiltinSkills(): SkillDef[] {
  return [...getMirrorSkills(), ...getAdvisorSkills()]
}

export function getExternalSkills(): ExternalSkill[] {
  return readExternal()
}

export function getAllSkills(): SkillDef[] {
  const ext = readExternal().map<SkillDef>((s) => ({
    id: s.id,
    label: s.name,
    icon: s.icon,
    description: s.description || s.trigger,
    source: 'external',
    builtin: false,
    requiresConsent: true,
  }))
  return [...getBuiltinSkills(), ...ext]
}

/** 内置能力默认启用；外部技能按用户开关 */
export function isEnabled(id: string): boolean {
  const map = readEnabled()
  if (id in map) return map[id]
  return true
}

export function setEnabled(id: string, value: boolean): void {
  const map = readEnabled()
  map[id] = value
  storage.setKV(ENABLED_KEY, map)
}

export function getEnabledSkillIds(): string[] {
  return getAllSkills().filter((s) => isEnabled(s.id)).map((s) => s.id)
}

/**
 * 添加外部技能。空名 / 同名返回 null。
 * 注：出口闸授权由组件层把关（仅 consented 时调用本函数）——本叶子模块不 import AI 重链。
 */
export function addExternalSkill(input: ExternalSkillInput): ExternalSkill | null {
  const name = input.name?.trim()
  if (!name) return null
  const list = readExternal()
  if (list.some((s) => s.name === name)) return null
  const skill: ExternalSkill = {
    id: `external:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    trigger: input.trigger?.trim() ?? '',
    icon: input.icon?.trim() || '🔌',
    description: input.description?.trim() ?? '',
    addedAt: new Date().toISOString(),
  }
  storage.setKV(EXTERNAL_KEY, [...list, skill])
  return skill
}

export function removeExternalSkill(id: string): void {
  storage.setKV(EXTERNAL_KEY, readExternal().filter((s) => s.id !== id))
}

export interface SkillStatus {
  total: number
  builtin: number
  external: number
  enabled: number
  consented: boolean
}

/** 聚合状态。consented 由调用方（组件）传入，避免本模块耦合出口闸。 */
export function getStatus(consented: boolean): SkillStatus {
  const all = getAllSkills()
  return {
    total: all.length,
    builtin: all.filter((s) => s.builtin).length,
    external: all.filter((s) => !s.builtin).length,
    enabled: all.filter((s) => isEnabled(s.id)).length,
    consented,
  }
}
