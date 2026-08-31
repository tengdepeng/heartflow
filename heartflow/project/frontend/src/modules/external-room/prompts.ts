// ============================================================
// 外链房 · 写作提示词（用户模板）
//
// 复用 engine/ai/prompt 的 BUILTIN_TEMPLATES 与 renderTemplate（{{变量}} 渲染），
// 仅补「用户私有模板」这一层：KV 持久化 + 增改删 + 复制内置为起点。
// 不另造存储；模块 API 暴露给 WritingAssistantPanel 等将来打通（本期不耦合）。
//
// 注意：只 import engine/ai/prompt（叶子，仅依赖 ./types 与 ../../types），
// 不 import engine/ai 的 index（会拉起 provider / tauri-provider 重链）。
// ============================================================

import { storage } from '../../engine/storage'
import { BUILTIN_TEMPLATES, renderTemplate } from '../../engine/ai/prompt'
import type { AIPromptTemplate } from '../../engine/ai/types'

const KV_KEY = 'prompts:user'

/** 用户私有提示词模板（与引擎 AIPromptTemplate 同构，builtin 恒为 false） */
export interface UserPromptTemplate {
  id: string
  name: string
  systemTemplate: string
  defaultVariables: Record<string, string>
  builtin: false
}

export function getUserTemplates(): UserPromptTemplate[] {
  return storage.getKV<UserPromptTemplate[]>(KV_KEY, [])
}

function persist(list: UserPromptTemplate[]): void {
  storage.setKV(KV_KEY, list)
}

function genId(): string {
  return 'pt-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7)
}

/**
 * 从模板文本解析 {{变量}} 名（去重、保序）。
 * 变量名允许英文/数字/下划线/中文；空白容忍（{{ name }} 等价 {{name}}）。
 */
export function extractVariables(template: string): string[] {
  const seen = new Set<string>()
  const re = /\{\{\s*([\w一-龥]+)\s*\}\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(template))) seen.add(m[1])
  return [...seen]
}

export function addUserTemplate(input: {
  name: string
  systemTemplate: string
  defaultVariables?: Record<string, string>
}): UserPromptTemplate {
  const t: UserPromptTemplate = {
    id: genId(),
    name: input.name.trim(),
    systemTemplate: input.systemTemplate,
    defaultVariables: { ...(input.defaultVariables ?? {}) },
    builtin: false,
  }
  persist([...getUserTemplates(), t])
  return t
}

export function updateUserTemplate(
  id: string,
  patch: Partial<Pick<UserPromptTemplate, 'name' | 'systemTemplate' | 'defaultVariables'>>,
): void {
  const next = getUserTemplates().map((t) =>
    t.id === id
      ? {
          ...t,
          name: patch.name?.trim() ?? t.name,
          systemTemplate: patch.systemTemplate ?? t.systemTemplate,
          defaultVariables: patch.defaultVariables ?? t.defaultVariables,
        }
      : t,
  )
  persist(next)
}

export function removeUserTemplate(id: string): void {
  persist(getUserTemplates().filter((t) => t.id !== id))
}

/** 复制内置模板为「我的起点」：带走 defaultVariables，名称加副本后缀避免重名。 */
export function duplicateBuiltin(id: string): UserPromptTemplate | null {
  const b = BUILTIN_TEMPLATES.find((t) => t.id === id)
  if (!b) return null
  const n = getUserTemplates().length + 1
  return addUserTemplate({
    name: `${b.name} 副本${n}`,
    systemTemplate: b.systemTemplate,
    defaultVariables: { ...(b.defaultVariables ?? {}) },
  })
}

export function getBuiltinTemplates(): AIPromptTemplate[] {
  return BUILTIN_TEMPLATES
}

/** 用变量值渲染模板（复用引擎 renderTemplate，未填变量自动留空）。 */
export function previewTemplate(
  systemTemplate: string,
  variables: Record<string, string>,
): string {
  return renderTemplate(systemTemplate, variables)
}
