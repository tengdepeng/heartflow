// ============================================================
// 三级操作模式 · 中央决策门控
// 将"幕僚顾问主动动作"与"自动化流程执行"统一收口到操作模式判断：
// - silent  静默执行：直接执行（默认，对齐宪法"默认静默"）。
// - confirm 执行前确认：不自动执行，发出待确认事件，由用户点头才执行。
// - suggest 仅建议：不执行，仅发出建议事件。
// 本模块为纯逻辑，不依赖 Pinia，可在 timer / automation / advisor 等非组件上下文调用。
// ============================================================

import type { OperationMode } from '../../types'
import { storage } from '../../engine/storage'
import type { SavedFlow } from '../../types/automation'

/** 决策结果 */
export type GateDecision = 'execute' | 'confirm' | 'suggest'

/** 操作模式元信息（供 UI 展示） */
export const OPERATION_MODE_META: Record<OperationMode, { label: string; description: string }> = {
  silent: { label: '静默执行', description: '系统安静地自动完成，不打扰你' },
  confirm: { label: '执行前确认', description: '自动动作先待你确认，点头才执行' },
  suggest: { label: '仅建议', description: '只提示建议，从不自动执行' },
}

/** 读取当前操作模式（缺省视为 silent，fail-safe） */
export function getOperationMode(): OperationMode {
  const mode = (storage.getConfig() as { operationMode?: OperationMode }).operationMode
  return mode === 'confirm' || mode === 'suggest' ? mode : 'silent'
}

/**
 * 决策：给定当前操作模式，返回某"主动/自动"动作应如何处理。
 * silent → 直接执行；confirm/suggest → 返回对应待处理决策（由调用方发出事件并跳过执行）。
 */
export function decideForProactive(): GateDecision {
  const mode = getOperationMode()
  if (mode === 'silent') return 'execute'
  return mode
}

/** 门控事件载荷（由待确认/建议托盘消费） */
export interface OperationGateEvent {
  kind: 'automation' | 'advisor'
  decision: 'confirm' | 'suggest'
  message: string
  /** automation：待确认的流程（confirm 时由托盘"执行"按钮重新触发） */
  flow?: SavedFlow
  /** advisor：待确认/建议的文案与幕僚 id */
  text?: string
  advisorId?: string
  /**
   * advisor：原始用户指令文本（confirm 时由托盘"执行"按钮经
   * ADVISOR_CONFIRM_EXECUTE_EVENT 回投给镜我，真正执行动作，而非仅发声）。
   */
  originalText?: string
  /** advisor：解析出的意图类别，供回投执行时强制单一意图 */
  intent?: string
}

const GATE_EVENT_NAME = 'hf:operation-gate'

/**
 * 顾问确认执行事件：PendingActionsTray 在用户点击"执行"后派发，
 * 由 MirrorDialogue 监听并以 bypassGate 重新执行原始指令。
 * 走事件而非直接调用，避免跨组件实例的 dialogue 状态分裂。
 */
export const ADVISOR_CONFIRM_EXECUTE_EVENT = 'hf:advisor-confirm-execute'

/** 发出门控事件（待确认/建议），供全局托盘消费 */
export function emitOperationGate(event: OperationGateEvent): void {
  try {
    window.dispatchEvent(new CustomEvent<OperationGateEvent>(GATE_EVENT_NAME, { detail: event }))
  } catch {
    /* 无 window 环境（如纯测试）静默失败 */
  }
}

export { GATE_EVENT_NAME }
