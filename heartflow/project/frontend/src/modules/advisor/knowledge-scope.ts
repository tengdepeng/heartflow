// ============================================================
// 幕僚专属知识库范围（蓝图第四部分·三）
//   蓝图原文：「专属知识库：可访问全殿堂所有数据 / 只访问特定领域 /
//             只访问用户手动指定的数据范围」
//
// 关键：本模块同时提供**消费点** collectHallKnowledge()。
// 若只在 AdvisorProfile 上加字段而不接进回答链路，就会变成又一个
// 「存了不消费」的孤儿（本项目最高频的坑），故字段与检索一并落地。
// ============================================================

import { collectAllItems } from '../association/engine'
import { DOMAIN_ARCHIVE_META } from '../association/association-archive-analytics'
import type { DomainKey } from '../association/types'
import type { KnowledgeScope } from '../../types/knowledge-scope'

export type { KnowledgeScope, KnowledgeScopeMode } from '../../types/knowledge-scope'

/** 默认范围：全殿堂（与蓝图「可访问全殿堂所有数据」一致） */
export const DEFAULT_KNOWLEDGE_SCOPE: KnowledgeScope = { mode: 'all' }

/** 条目在手动模式下的唯一键（跨 domain 避免 id 撞车） */
export function itemKey(it: { domain: DomainKey; id: string }): string {
  return `${it.domain}:${it.id}`
}

/**
 * 归一化范围：防脏数据与缺省。
 * 约定：domains / itemIds 为空集合时回退为「全殿堂」——
 * 一个什么都不许看的幕僚无法回答任何问题，这不是有用的配置。
 */
export function normalizeScope(scope?: KnowledgeScope | null): KnowledgeScope {
  if (!scope || typeof scope !== 'object') return { ...DEFAULT_KNOWLEDGE_SCOPE }
  if (scope.mode === 'domains') {
    const domains = Array.isArray(scope.domains) ? scope.domains.filter(Boolean) : []
    return domains.length ? { mode: 'domains', domains } : { ...DEFAULT_KNOWLEDGE_SCOPE }
  }
  if (scope.mode === 'manual') {
    const itemIds = Array.isArray(scope.itemIds) ? scope.itemIds.filter(Boolean) : []
    return itemIds.length ? { mode: 'manual', itemIds } : { ...DEFAULT_KNOWLEDGE_SCOPE }
  }
  return { ...DEFAULT_KNOWLEDGE_SCOPE }
}

function fmtDate(ts: number): string {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/**
 * 按幕僚的知识库范围，从殿堂检索痕迹并渲染成给 AI 看的简短上下文。
 *
 * 这是「专属知识库」真正的消费点：结果会被注入幕僚回答的系统提示词，
 * 让幕僚只从用户授权给它的范围内取材（蓝图第四部分·十 隐私要求）。
 *
 * @param scope 幕僚的知识库范围（缺省/非法值按全殿堂处理）
 * @param limit 最多取多少条（默认 12）——提示词有成本，只给最近的痕迹
 * @returns 渲染好的多行文本；无痕迹时返回空串（调用方据此省略该段）
 */
export function collectHallKnowledge(
  scope?: KnowledgeScope | null,
  limit = 12,
): string {
  const s = normalizeScope(scope)
  let items = collectAllItems()

  if (s.mode === 'domains') {
    const allow = new Set<DomainKey>(s.domains!)
    items = items.filter((i) => allow.has(i.domain))
  } else if (s.mode === 'manual') {
    const allow = new Set<string>(s.itemIds!)
    items = items.filter((i) => allow.has(itemKey(i)))
  }

  if (!items.length) return ''

  const recent = [...items].sort((a, b) => b.ts - a.ts).slice(0, Math.max(1, limit))

  return recent
    .map((i) => {
      const meta = DOMAIN_ARCHIVE_META[i.domain]
      const label = meta?.label ?? i.domain
      return `- [${label}] ${i.label}（${fmtDate(i.ts)}）`
    })
    .join('\n')
}
