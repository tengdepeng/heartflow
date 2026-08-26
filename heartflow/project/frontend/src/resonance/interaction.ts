// ============================================================
// 共鸣协议层 · 交互引擎接口 (IInteractionEngine)
// 定义所有交互行为的统一契约
// 不实现具体功能，只定规则
// ============================================================

import type { ResonanceResult, NavigationContext, ResonanceEventListener } from './types'

/** 交互事件类型 */
export type InteractionEventType =
  | 'long-press'       // 长按
  | 'circle'           // 画圈
  | 'cross'            // 画叉
  | 'wave'             // 画波浪线
  | 'two-finger-press' // 双指长按
  | 'three-finger-circle' // 三指画圆
  | 'edge-swipe'       // 边缘滑动
  | 'tap'              // 单击
  | 'double-tap'       // 双击
  | 'swipe-up'         // 上滑
  | 'swipe-down'       // 下滑
  | 'swipe-left'       // 左滑
  | 'swipe-right'      // 右滑
  | 'pinch'            // 捏合
  | 'keyboard'         // 键盘快捷键
  | 'voice'            // 语音指令

/** 交互事件数据 */
export interface InteractionEvent {
  /** 事件类型 */
  type: InteractionEventType
  /** 触发时间戳 */
  timestamp: number
  /** 触发位置（x, y 坐标，可选） */
  position?: { x: number; y: number }
  /** 事件强度/力度（0-1，可选） */
  intensity?: number
  /** 关联的导航上下文 */
  context?: NavigationContext
  /** 额外参数 */
  payload?: Record<string, unknown>
}

/** 交互引擎配置项 */
export interface InteractionConfig {
  /** 长按阈值（毫秒） */
  longPressDuration: number
  /** 最小移动距离（像素） */
  minMoveDistance: number
  /** 采样间隔（毫秒） */
  sampleInterval: number
  /** 是否启用键盘快捷键 */
  enableKeyboardShortcuts: boolean
  /** 是否启用语音指令 */
  enableVoice: boolean
  /** 是否启用触觉反馈 */
  enableHapticFeedback: boolean
}

/**
 * 交互引擎接口
 * 所有交互引擎实现必须遵守此契约
 */
export interface IInteractionEngine {
  /** 引擎标识 */
  readonly id: string
  /** 引擎名称 */
  readonly name: string

  // ---- 生命周期 ----
  /** 初始化引擎 */
  initialize(config: InteractionConfig): void
  /** 销毁引擎，释放资源 */
  destroy(): void

  // ---- 事件处理 ----
  /** 处理一个交互事件 */
  handleEvent(event: InteractionEvent): Promise<ResonanceResult<void>>
  /** 注册事件监听器 */
  on(eventType: InteractionEventType, listener: ResonanceEventListener<InteractionEvent>): void
  /** 移除事件监听器 */
  off(eventType: InteractionEventType, listener: ResonanceEventListener<InteractionEvent>): void

  // ---- 配置 ----
  /** 获取当前配置 */
  getConfig(): InteractionConfig
  /** 更新配置 */
  updateConfig(partial: Partial<InteractionConfig>): void

  // ---- 状态 ----
  /** 引擎是否已初始化 */
  readonly initialized: boolean
  /** 引擎是否启用 */
  readonly enabled: boolean
  /** 启用/禁用引擎 */
  setEnabled(enabled: boolean): void
}

/** 可交互性（交互引擎与组件的桥梁） */
export interface IInteractive {
  /** 获取此组件关注的交互事件类型列表 */
  readonly interestedEvents: InteractionEventType[]
  /** 处理交互事件 */
  onInteraction(event: InteractionEvent): Promise<ResonanceResult<void>> | void
}