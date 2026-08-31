// ============================================================
// 协调权（蓝图第四部分·二）
//   蓝图原文：「镜我的总管与协调职能可转移给其他幕僚。用户可在镜我设置中
//   选择转移协调权，也可完全关闭集中协调机制。」
//
// 实证前提：当前代码里**没有总管实体** —— 派单（dispatchAvatar）是纯粹的
// role × taskType 权重算法，镜我只在派单失败时作为兜底名字硬编码出现
// （stores/advisor.ts 的 `advisor?.name ?? '镜我'`）。
// 故本模块先把「协调者」这个概念立起来，并给它三个真实的消费点：
//   1. 派单无人可选时，由协调者接手（替代硬编码的「镜我」）
//   2. 协调权可转移到指定幕僚
//   3. 关闭（off）后不派单署名，文案转为中性 —— 行为差异真实可见
// ============================================================

import { storage } from '../../engine/storage'
import type { AdvisorProfile } from '../../types'

export type CoordinatorMode = 'jingwo' | 'custom' | 'off'

export interface CoordinatorConfig {
  mode: CoordinatorMode
  /** mode='custom' 时的幕僚 id */
  advisorId?: string
}

/** 镜我预设 id（6 类固定幕僚之一） */
export const JINGWO_ID = 'preset-jingwo'

/** 默认：镜我任协调者 */
export const DEFAULT_COORDINATOR: CoordinatorConfig = { mode: 'jingwo' }

const COORDINATOR_KEY = 'advisor:coordinator'

/** 读取协调权配置（防脏数据） */
export function getCoordinatorConfig(): CoordinatorConfig {
  const raw = storage.getKV<CoordinatorConfig>(COORDINATOR_KEY, DEFAULT_COORDINATOR)
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_COORDINATOR }
  if (raw.mode === 'custom') {
    return raw.advisorId ? { mode: 'custom', advisorId: raw.advisorId } : { ...DEFAULT_COORDINATOR }
  }
  if (raw.mode === 'off') return { mode: 'off' }
  return { ...DEFAULT_COORDINATOR }
}

/** 保存协调权配置 */
export function setCoordinatorConfig(cfg: CoordinatorConfig): void {
  storage.setKV(COORDINATOR_KEY, cfg)
}

/**
 * 解析当前协调者。
 * - off → null（不设协调者）
 * - jingwo → 镜我；镜我不在位时回退到第一位在位的幕僚（保证协调不中断）
 * - custom → 指定幕僚；其不在位时同样回退到镜我/首位在位者
 *
 * @param advisors 候选名单（调用方传入，便于测试与避免重复读存储）
 */
export function resolveCoordinator(
  advisors: AdvisorProfile[] = storage.getAdvisors(),
): AdvisorProfile | null {
  const cfg = getCoordinatorConfig()
  if (cfg.mode === 'off') return null

  const active = advisors.filter((a) => !a.retired && a.state !== 'slumber')
  if (!active.length) return null

  if (cfg.mode === 'custom' && cfg.advisorId) {
    const picked = active.find((a) => a.id === cfg.advisorId)
    if (picked) return picked
  }

  // 默认（含 custom 目标失效的回退）：镜我 → 否则首位在位者
  return active.find((a) => a.id === JINGWO_ID) ?? active[0]
}
