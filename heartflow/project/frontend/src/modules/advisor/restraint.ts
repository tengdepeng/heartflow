// ============================================================
// 幕僚的克制（宪法第44条）· 代执行拦截门
// 把「幕僚不得代用户决策 / 发送 / 交易 / 代表用户与外部交互」变成可执行断言。
// 调令动作执行器（commandExecutor.runAction）在落地前经 advisorActionAllowed 校验。
// ============================================================

import { isTargetActive } from '../../engine/constitution-effect'

/** 宪法第44条「幕僚的克制」：禁止幕僚代用户执行的动作类别 */
export const RESTRICTED_ADVISOR_ACTIONS = new Set<string>([
  'send', // 代发消息
  'trade', // 代交易
  'external-interact', // 代表用户与外部世界交互
])

/** 幕僚克制是否生效（第44条默认启用） */
export function isAdvisorRestrained(): boolean {
  return isTargetActive('advisor:restraint')
}

/**
 * 幕僚动作是否允许执行。
 * - 非受限类别（focus / note / emotion / anchor / review / finance / navigate / general）一律放行；
 * - 受限类别在「幕僚的克制」生效时被拦截——幕僚不得代用户决策 / 发送 / 交易 / 外部交互。
 */
export function advisorActionAllowed(action: string): boolean {
  if (!RESTRICTED_ADVISOR_ACTIONS.has(action)) return true
  return !isAdvisorRestrained()
}
