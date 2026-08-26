// ============================================================
// 镜我 · 意图场景卡分发映射（纯逻辑，可单测）
// 蓝图17 · 模块七 镜我：10 意图可视化为场景卡 / 工具卡（百宝袋）
// 宪法：本地优先（第1条）；无推送 / 无操控（第52条）
// ============================================================

import type { IntentCategory } from './types'

/**
 * 意图 → 房间路由映射。
 * 可导航的意图直接跳转至对应功能房间，由该房间接管后续交互。
 */
export const INTENT_ROUTE: Partial<Record<IntentCategory, string>> = {
  note: '/notes',
  emotion: '/emotion',
  anchor: '/anchor',
  plan: '/notes',
  reflect: '/timeline',
  learn: '/wisdom',
  create: '/craft',
  rest: '/rest',
  explore: '/',
}

/**
 * 需直接执行（而非导航）的意图。
 * 「专注」应直接启动计时器，不跳转房间。
 */
export const DIRECT_ACTION_INTENTS: IntentCategory[] = ['focus']

/** 取得意图对应的导航路由；无则为 null（如专注走直接执行）。 */
export function getIntentRoute(category: IntentCategory): string | null {
  return INTENT_ROUTE[category] ?? null
}

/** 该意图是否需直接执行（而非导航）。 */
export function isDirectAction(category: IntentCategory): boolean {
  return DIRECT_ACTION_INTENTS.includes(category)
}
