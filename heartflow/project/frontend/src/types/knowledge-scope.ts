// ============================================================
// 幕僚专属知识库范围类型（蓝图第四部分·三）
// 抽到 src/types/ 共享：types/advisor.ts 与 modules/advisor/knowledge-scope.ts
// 都从这里取类型，避免 types → modules → engine 的 type-only 环。
// ============================================================

import type { DomainKey } from '../modules/association/types'

export type KnowledgeScopeMode = 'all' | 'domains' | 'manual'

export interface KnowledgeScope {
  mode: KnowledgeScopeMode
  /** mode='domains'：允许访问的域 */
  domains?: DomainKey[]
  /** mode='manual'：允许访问的条目键，格式 `域:条目id` */
  itemIds?: string[]
}
