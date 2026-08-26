// ============================================================
// 共鸣协议层 · RuntimeState 桥接器
// 将 useRuntimeStore 的 sanctuary 状态通过共振注册表暴露
// 替代模块直接 import runtime store 的耦合模式
// ============================================================

import { computed } from 'vue'
import { useResonance } from '../index'
import type { ModuleIdentity, ResonanceResult } from '../types'
import type { CapabilityMeta, CapabilityStatus, CapabilityInvocation, IBusinessCapability } from '../capability'

// ---- 模块标识 ----

const RUNTIME_MODULE_ID = 'runtime-state'

const identity: ModuleIdentity = {
  id: RUNTIME_MODULE_ID,
  name: '运行时状态管理',
  version: '1.0.0',
  description: '管理 sanctuary 安全岛激活/退出状态，协调 timer 和 advisor 的暂停/恢复',
  provides: ['capability'],
  requires: [],
}

// ---- 桥接能力 ----

class RuntimeStateBridge implements IBusinessCapability {
  readonly meta: CapabilityMeta = {
    id: 'runtime-state',
    name: '运行时状态',
    level: 'core',
    description: 'sanctuary 安全岛激活状态查询与切换',
    dependencies: [],
    version: '1.0.0',
  }

  private _status: CapabilityStatus = {
    initialized: true,
    enabled: true,
    busy: false,
    lastActivityAt: null,
  }

  private _statusListeners: Array<(status: CapabilityStatus) => void> = []

  // 运行时状态由外部 setter 注入（从 Pinia store 读取）
  private _isSanctuaryActive = false
  private _enterSanctuary: (() => void) | null = null
  private _exitSanctuary: (() => void) | null = null

  /** 绑定到真实的 runtime store（仅在 main.ts 中调用一次） */
  bind(
    getIsSanctuaryActive: () => boolean,
    enterSanctuary: () => void,
    exitSanctuary: () => void,
  ) {
    // 使用 getter 模式保持响应式兼容 — computed 内部访问时会追踪 store 的 ref
    const self = this
    Object.defineProperty(self, '_isSanctuaryActive', {
      get: getIsSanctuaryActive,
      configurable: true,
    })
    this._enterSanctuary = enterSanctuary
    this._exitSanctuary = exitSanctuary
  }

  get isSanctuaryActive(): boolean {
    return this._isSanctuaryActive
  }

  // ========== IBusinessCapability 实现 ==========

  async initialize(): Promise<ResonanceResult<void>> {
    this._status = { ...this._status, initialized: true }
    return { success: true }
  }

  async destroy(): Promise<ResonanceResult<void>> {
    this._enterSanctuary = null
    this._exitSanctuary = null
    this._statusListeners = []
    return { success: true }
  }

  async invoke(invocation: CapabilityInvocation): Promise<ResonanceResult<unknown>> {
    this._status = { ...this._status, lastActivityAt: Date.now() }

    switch (invocation.operation) {
      case 'enterSanctuary':
        if (this._enterSanctuary) {
          this._enterSanctuary()
          return { success: true, data: { active: true } }
        }
        return { success: false, error: 'enterSanctuary 未绑定' }

      case 'exitSanctuary':
        if (this._exitSanctuary) {
          this._exitSanctuary()
          return { success: true, data: { active: false } }
        }
        return { success: false, error: 'exitSanctuary 未绑定' }

      case 'getSanctuaryState':
        return { success: true, data: { active: this.isSanctuaryActive } }

      default:
        return { success: false, error: `未知操作: ${invocation.operation}` }
    }
  }

  canHandle(operation: string): boolean {
    return ['enterSanctuary', 'exitSanctuary', 'getSanctuaryState'].includes(operation)
  }

  getStatus(): CapabilityStatus {
    return { ...this._status }
  }

  enable(): void {
    this._status = { ...this._status, enabled: true }
  }

  disable(): void {
    this._status = { ...this._status, enabled: false }
  }

  onStatusChange(listener: (status: CapabilityStatus) => void): void {
    this._statusListeners.push(listener)
  }

  offStatusChange(listener: (status: CapabilityStatus) => void): void {
    this._statusListeners = this._statusListeners.filter(l => l !== listener)
  }
}

// ---- 单例 + 注册 ----

let bridgeInstance: RuntimeStateBridge | null = null

/** 获取 RuntimeState 桥接器（自动注册到共振注册表） */
export function getRuntimeStateBridge(): RuntimeStateBridge {
  if (!bridgeInstance) {
    bridgeInstance = new RuntimeStateBridge()
    const resonance = useResonance()
    const result = resonance.register(identity, bridgeInstance)
    if (!result.success) {
      console.warn('[Resonance] RuntimeState 注册失败:', result.error)
    }
  }
  return bridgeInstance
}

// ---- Vue 响应式 composable（模块使用此接口替代直接 import store） ----

/**
 * 运行时状态 composable
 * 模块通过此 composable 获取响应式的 sanctuary 状态，
 * 而无需直接 import useRuntimeStore
 */
export function useRuntimeState() {
  const bridge = getRuntimeStateBridge()

  // computed 内部访问 bridge.isSanctuaryActive，
  // 其 getter 最终读取 useRuntimeStore 的 ref，因此是响应式的
  const isSanctuaryActive = computed(() => bridge.isSanctuaryActive)

  function enterSanctuary() {
    bridge.invoke({ operation: 'enterSanctuary' })
  }

  function exitSanctuary() {
    bridge.invoke({ operation: 'exitSanctuary' })
  }

  return {
    isSanctuaryActive,
    enterSanctuary,
    exitSanctuary,
  }
}

// ---- 便捷函数（非响应式，适用于非 Vue 上下文） ----

/** 查询 sanctuary 是否激活（非响应式，单次查询） */
export function querySanctuaryState(): boolean {
  const resonance = useResonance()
  const providers = resonance.findByInterface('capability')
  const bridge = providers.find(p => p.identity.id === RUNTIME_MODULE_ID)
  if (bridge && bridge.instance) {
    return (bridge.instance as RuntimeStateBridge).isSanctuaryActive
  }
  return false
}