/**
 * 感知层 · Pinia 状态真源
 *
 * 把 EnvironmentState 作为单一真源暴露给下游引擎（编排引擎、氛围引擎）订阅。
 * 采集逻辑在 `modules/perception/usePerception.ts`，store 只持有状态 + 提供更新入口。
 *
 * 雷区约束：
 * - 只读不写 config/style/runtime 的"用户显式选择"，避免覆盖宪法要求的"超级自定义"。
 * - 不在此处推导场景分类（type 由 orchestration.detectScene 统一推导）。
 *
 * 宪法第43条「感知的边界」：本 store 是唯一写入点，写入前按 `authorizedDimensions`
 * 逐项授权遮蔽——未授权的维度字段回退默认值（不采集、不存储）。
 */

import { defineStore } from 'pinia'
import {
  type EnvironmentState,
  createDefaultEnvironmentState,
} from '../modules/perception/types'
import { isTargetActive } from '../engine/constitution-effect'

/** 蓝图第43条「感知的边界」：6 个可逐项授权的感知维度 */
export type PerceptionDimension =
  | 'location' // 活跃应用 / 窗口标题（Tauri 上下文位置）
  | 'light' // 环境光 / 暗色
  | 'battery' // 电量 / 充电 / 低电量
  | 'network' // 在线状态
  | 'motion' // 设备闲置 / 用户闲置
  | 'time' // 时段 / 小时

export const PERCEPTION_DIMENSIONS: PerceptionDimension[] = [
  'location',
  'light',
  'battery',
  'network',
  'motion',
  'time',
]

/** 维度 → EnvironmentState 字段映射（用于逐项授权遮蔽） */
const DIMENSION_FIELDS: Record<PerceptionDimension, (keyof EnvironmentState)[]> = {
  location: ['activeApp', 'activeWindowTitle'],
  light: ['ambientLight', 'isDark'],
  battery: ['batteryLevel', 'isCharging', 'isLowPower'],
  network: ['isOnline'],
  motion: ['deviceIdleMs', 'isUserIdle'],
  time: ['hour', 'timeOfDay'],
}

const DEFAULT_ENV = createDefaultEnvironmentState()

/**
 * 感知逐项授权遮蔽：当「感知的边界」(perception:enabled) 生效时，
 * 凡用户未逐项授权的维度，其字段回退到默认值（不采集、不存储）。
 * 宪法第43条：每一项感知都需用户单独开启；关闭边界则透传全部维度。
 */
export function maskUnauthorizedPerception(
  env: EnvironmentState,
  authorized: Set<PerceptionDimension>,
): EnvironmentState {
  if (!isTargetActive('perception:enabled')) return env
  const next: EnvironmentState = { ...env }
  const target = next as Record<keyof EnvironmentState, EnvironmentState[keyof EnvironmentState]>
  const defaults = DEFAULT_ENV as Record<keyof EnvironmentState, EnvironmentState[keyof EnvironmentState]>
  for (const dim of PERCEPTION_DIMENSIONS) {
    if (authorized.has(dim)) continue
    for (const f of DIMENSION_FIELDS[dim]) {
      target[f] = defaults[f]
    }
  }
  return next
}

export const usePerceptionStore = defineStore('perception', {
  state: (): { env: EnvironmentState; authorizedDimensions: PerceptionDimension[] } => ({
    env: createDefaultEnvironmentState(),
    // 默认 6 维度全部授权（超级自定义：用户可逐项关闭）
    authorizedDimensions: [...PERCEPTION_DIMENSIONS],
  }),

  getters: {
    /** 当前环境状态（只读副本语义，返回响应式 state） */
    environment(state): EnvironmentState {
      return state.env
    },
    /** 便捷：是否暗色 */
    isDark(state): boolean {
      return state.env.isDark
    },
    /** 便捷：是否低电量 */
    isLowPower(state): boolean {
      return state.env.isLowPower
    },
    /** 便捷：时段 */
    timeOfDay(state): EnvironmentState['timeOfDay'] {
      return state.env.timeOfDay
    },
    /** 维度是否已授权（供设置 UI 读数） */
    isDimensionAuthorized(state) {
      return (dim: PerceptionDimension) => state.authorizedDimensions.includes(dim)
    },
  },

  actions: {
    /** 用采集器算出的新状态整体替换（保留不可变语义；经逐项授权遮蔽） */
    setEnvironment(next: EnvironmentState) {
      const authorized = new Set(this.authorizedDimensions)
      this.env = maskUnauthorizedPerception(next, authorized)
    },
    /** 局部补丁更新（经逐项授权遮蔽） */
    patchEnvironment(partial: Partial<EnvironmentState>) {
      const merged = { ...this.env, ...partial, lastUpdated: Date.now() }
      const authorized = new Set(this.authorizedDimensions)
      this.env = maskUnauthorizedPerception(merged, authorized)
    },
    /** 逐项授权 / 撤销某维度（宪法第43条·超级自定义） */
    setDimensionAuthorized(dim: PerceptionDimension, allowed: boolean) {
      const set = new Set(this.authorizedDimensions)
      if (allowed) set.add(dim)
      else set.delete(dim)
      this.authorizedDimensions = [...set]
    },
  },
})
