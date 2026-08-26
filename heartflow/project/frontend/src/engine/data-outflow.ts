// ============================================================
// 守护室 · 数据流出日志（蓝图 模块六「完整数据流出的日志」）
// 本地记录每一次「数据离开本设备」的事件，强化第1条·本地私有的透明度。
// 仅记录：时间 / 渠道 / 净化后的去向 / 摘要 —— 绝不记录任何数据载荷。
// 所有写入失败静默吞掉，绝不阻塞主业务流程。
// ============================================================

import { ref } from 'vue'
import { storage } from './storage'

/** 数据流出渠道 */
export type OutflowChannel = 'export' | 'sync' | 'external-ai' | 'share' | 'backup'

/** 单条数据流出记录 */
export interface GuardOutflowLog {
  id: string
  /** ISO 时间戳 */
  at: string
  channel: OutflowChannel
  /** 中文渠道标签（避免枚举散落 UI） */
  channelLabel: string
  /** 净化后的去向：本地文件 / 对等节点 / 外部模型API（仅端点）等，绝不出现具体地址或载荷 */
  target: string
  /** 人类可读摘要，不记录内容 */
  summary: string
}

const OUTFLOW_KEY = 'hf:guard_outflow_logs'
const MAX_LOGS = 500

/**
 * 从 URL 提取主机名（仅端点，剔除路径/密钥/query），用于「净化后的去向」。
 * 入参为空或解析失败时回退为通用标签，绝不泄露完整地址或凭证。
 */
export function sanitizeHost(raw: string | undefined): string {
  if (!raw) return '外部模型API'
  try {
    const u = new URL(raw)
    return u.host || u.hostname || '外部模型API'
  } catch {
    return '外部模型API'
  }
}

// ---- 模块级单例 ref ----
const logs = ref<GuardOutflowLog[]>([])
let loaded = false

function load(): void {
  if (loaded) return
  try {
    logs.value = storage.getKV<GuardOutflowLog[]>(OUTFLOW_KEY, [])
  } catch {
    logs.value = []
  }
  loaded = true
}

function save(): void {
  try {
    storage.setKV(OUTFLOW_KEY, logs.value)
  } catch {
    /* 静默失败 */
  }
}

/**
 * 记录一次数据流出事件（本地、静默、不阻塞主流程）。
 * @param channel 渠道类型
 * @param channelLabel 中文标签
 * @param target 净化后的去向（绝不含具体地址/载荷）
 * @param summary 人类可读摘要
 */
function recordOutflow(
  channel: OutflowChannel,
  channelLabel: string,
  target: string,
  summary: string,
): void {
  try {
    load()
    logs.value.unshift({
      id: `of_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      at: new Date().toISOString(),
      channel,
      channelLabel,
      target,
      summary,
    })
    if (logs.value.length > MAX_LOGS) {
      logs.value = logs.value.slice(0, MAX_LOGS)
    }
    save()
  } catch {
    /* 静默失败，不阻塞主流程 */
  }
}

function clearOutflowLog(id: string): void {
  load()
  logs.value = logs.value.filter((l) => l.id !== id)
  save()
}

function clearAllOutflow(): void {
  load()
  logs.value = []
  save()
}

/** 使用数据流出日志（模块级单例，跨视图共享） */
export function useDataOutflow() {
  return {
    logs,
    load,
    save,
    recordOutflow,
    clearOutflowLog,
    clearAllOutflow,
  }
}
