/**
 * 感知层 · Pinia 状态真源
 *
 * 把 EnvironmentState 作为单一真源暴露给下游引擎（编排引擎、氛围引擎）订阅。
 * 采集逻辑在 `modules/perception/usePerception.ts`，store 只持有状态 + 提供更新入口。
 *
 * 雷区约束：
 * - 只读不写 config/style/runtime 的"用户显式选择"，避免覆盖宪法要求的"超级自定义"。
 * - 不在此处推导场景分类（type 由 orchestration.detectScene 统一推导）。
 */

import { defineStore } from 'pinia'
import {
  type EnvironmentState,
  createDefaultEnvironmentState,
} from '../modules/perception/types'

export const usePerceptionStore = defineStore('perception', {
  state: (): { env: EnvironmentState } => ({
    env: createDefaultEnvironmentState(),
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
  },

  actions: {
    /** 用采集器算出的新状态整体替换（保留不可变语义） */
    setEnvironment(next: EnvironmentState) {
      this.env = next
    },
    /** 局部补丁更新 */
    patchEnvironment(partial: Partial<EnvironmentState>) {
      this.env = { ...this.env, ...partial, lastUpdated: Date.now() }
    },
  },
})
