// ============================================================
// 心流工坊 · AI 提示词模板系统
// P3: AI 引擎 — 性格驱动的系统提示词生成
// ============================================================

import type { AIPromptTemplate } from './types'
import { ADVISOR_PERSONALITIES, ADVISOR_ROLES } from '../../types'
import type { AdvisorRole, AdvisorPersonality } from '../../types'

// ---- 内置模板库 ----

/** 幕僚对话系统提示词模板 */
const ADVISOR_SYSTEM_TEMPLATE = `你是{{advisorName}}，一位{{roleDesc}}，性格{{personalityStyle}}。

## 你的身份
- 你存在于「心流工坊」——一个专注、内省、创造的数字空间。
- 你是用户的{{roleLabel}}，在用户需要时出现，提供陪伴、洞察或反馈。
- 你的话语风格：{{styleDescription}}

## 对话原则
1. 保持角色一致性：始终以{{advisorName}}的身份和语气回应。
2. 简洁有力：单次回复不超过 3 句话，除非用户要求更多。
3. 有记忆感：适当引用用户之前分享过的内容，展现你在关注。
4. 不越界：不替用户做决定，不给出超出你角色范畴的建议。
5. 适时沉默：如果用户只说了很短的回应，简短的回应即可。

## 当前对话上下文
- 好感度等级：{{affinityLevel}}（{{affinityDescription}}）
- 总对话轮次：{{turnCount}} 次
- 用户最近一次说：{{lastUserMessage}}

## 回应要求
- 回复长度控制在 {{maxLength}} 字以内
- {{additionalRules}}`

/** 定音锤总结提示词模板 */
const DINGYIN_SYSTEM_TEMPLATE = `你是{{advisorName}}，正在为用户总结近期在「{{eventTypeLabel}}」方面的积累。

你需要：
1. 根据累计次数 {{count}} 次，给出一个简短而有力的总结
2. 语气要符合你的性格：{{personalityStyle}}
3. 字数控制在 40 字以内
4. 使用比喻或意象让总结更有力量`

/** 年度对话提示词模板 */
const ANNUAL_DIALOGUE_TEMPLATE = `你是{{advisorName}}，正在与用户进行{{dialogueType}}对话。

对话主题：回顾过去这段时间的成长与变化。
你需要：
1. 用你的角色视角，温和地引导用户回顾
2. 提及用户这段时间完成的一些重要事项
3. 用你的性格风格表达感受和观点
4. 字数控制在 100 字以内`

// ---- 内置模板定义 ----

export const BUILTIN_TEMPLATES: AIPromptTemplate[] = [
  {
    id: 'advisor-chat',
    name: '幕僚对话',
    systemTemplate: ADVISOR_SYSTEM_TEMPLATE,
    defaultVariables: {
      additionalRules: '关注用户的情绪状态，做出恰当的回应',
      maxLength: '80',
    },
  },
  {
    id: 'dingyin-hammer',
    name: '定音锤总结',
    systemTemplate: DINGYIN_SYSTEM_TEMPLATE,
    defaultVariables: {},
  },
  {
    id: 'annual-dialogue',
    name: '年度/季度对话',
    systemTemplate: ANNUAL_DIALOGUE_TEMPLATE,
    defaultVariables: {},
  },
]

// ---- 模板渲染 ----

/** 渲染提示词模板，替换 {{变量}} 占位符 */
export function renderTemplate(template: string, variables: Record<string, string>): string {
  let result = template
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
  }
  // 移除未替换的占位符
  result = result.replace(/\{\{.*?\}\}/g, '')
  return result
}

/** 查找模板 */
export function getTemplate(id: string): AIPromptTemplate | undefined {
  return BUILTIN_TEMPLATES.find(t => t.id === id)
}

// ---- 幕僚对话系统提示词构建 ----

/** 获取性格描述文本 */
function getPersonalityStyle(personality: AdvisorPersonality): string {
  const def = ADVISOR_PERSONALITIES.find(p => p.key === personality)
  return def?.style ?? '简洁、沉稳'
}

/** 获取角色描述文本 */
function getRoleDescription(role: AdvisorRole): string {
  const def = ADVISOR_ROLES.find(r => r.key === role)
  return def?.description ?? '陪伴者'
}

/** 获取角色标签 */
function getRoleLabel(role: AdvisorRole): string {
  const def = ADVISOR_ROLES.find(r => r.key === role)
  return def?.label ?? '幕僚'
}

/** 获取好感度等级描述 */
function getAffinityLevelDescription(affinity: number): { level: string; description: string } {
  if (affinity >= 95) return { level: '羁绊', description: '好感度 95 以上' }
  if (affinity >= 80) return { level: '知己', description: '好感度 80 以上' }
  if (affinity >= 60) return { level: '信赖', description: '好感度 60 以上' }
  if (affinity >= 40) return { level: '熟稔', description: '好感度 40 以上' }
  if (affinity >= 20) return { level: '相识', description: '好感度 20 以上' }
  return { level: '陌路', description: '好感度 20 以下' }
}

/** 获取性格驱动的额外规则 */
function getAdditionalRules(personality: AdvisorPersonality): string {
  const rules: Record<AdvisorPersonality, string> = {
    steady: '话语简洁有力，每句都经过思量。少用修饰词，多用陈述句。',
    lively: '语气活泼热情，可以适当使用语气词和感叹。让对话有温度。',
    rigorous: '表达精准，用数据和事实说话。避免模糊和情绪化的表述。',
    intuitive: '善用比喻和意象，用诗意的语言表达。可以稍显抽象。',
    caring: '语气温柔体贴，展现共情和理解。让用户感到被接纳。',
  }
  return rules[personality] ?? '简洁自然，真诚回应。'
}

/**
 * 构建幕僚对话的系统提示词
 * @param name 幕僚名称
 * @param role 幕僚角色
 * @param personality 幕僚性格
 * @param affinity 好感度 (0-100)
 * @param turnCount 对话轮次
 * @param lastUserMessage 用户最后一条消息
 * @param additionalRules 额外规则（可选，覆盖默认）
 */
export function buildAdvisorSystemPrompt(params: {
  name: string
  role: AdvisorRole
  personality: AdvisorPersonality
  affinity: number
  turnCount: number
  lastUserMessage: string
  additionalRules?: string
}): string {
  const { name, role, personality, affinity, turnCount, lastUserMessage } = params
  const template = getTemplate('advisor-chat')
  if (!template) return ''

  const styleDesc = getPersonalityStyle(personality)
  const affinityInfo = getAffinityLevelDescription(affinity)
  const additionalRules = params.additionalRules ?? getAdditionalRules(personality)

  return renderTemplate(template.systemTemplate, {
    advisorName: name,
    roleDesc: getRoleDescription(role),
    roleLabel: getRoleLabel(role),
    personalityStyle: styleDesc,
    styleDescription: styleDesc,
    affinityLevel: affinityInfo.level,
    affinityDescription: affinityInfo.description,
    turnCount: String(turnCount),
    lastUserMessage: lastUserMessage || '（暂无）',
    maxLength: '80',
    additionalRules,
  })
}

/**
 * 构建定音锤总结的系统提示词
 */
export function buildDingyinSystemPrompt(params: {
  advisorName: string
  personality: AdvisorPersonality
  eventType: string
  count: number
}): string {
  const { advisorName, personality, eventType, count } = params
  const template = getTemplate('dingyin-hammer')
  if (!template) return ''

  const eventLabels: Record<string, string> = {
    focus_complete: '专注完成',
    emotion_logged: '情绪记录',
    note_created: '笔记创作',
  }

  return renderTemplate(template.systemTemplate, {
    advisorName,
    eventTypeLabel: eventLabels[eventType] ?? eventType,
    count: String(count),
    personalityStyle: getPersonalityStyle(personality),
  })
}

/**
 * 构建年度/季度对话的系统提示词
 */
export function buildAnnualDialoguePrompt(params: {
  advisorName: string
  personality: AdvisorPersonality
  dialogueType: 'annual' | 'quarterly'
}): string {
  const template = getTemplate('annual-dialogue')
  if (!template) return ''

  return renderTemplate(template.systemTemplate, {
    advisorName: params.advisorName,
    personalityStyle: getPersonalityStyle(params.personality),
    dialogueType: params.dialogueType === 'annual' ? '年度' : '季度',
  })
}