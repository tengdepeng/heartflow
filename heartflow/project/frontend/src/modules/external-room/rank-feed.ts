// ============================================================
// 外链房 · 榜单通道 — 外部数据源接入（仅接入，不呈现）
//
// 宪法禁竞速 / 排行类 UI，故本通道：
//   - 只提供「外部数据源接入位」，用户自填 URL 才启用；
//   - 接进来的数据**不在本通道渲染任何名次 / 排行**，仅作下游
//     （镜我 / 顾问）参照供给，由 getEnabledSources() 暴露；
//   - 默认关闭；关闭时零渲染、零网络开销；
//   - 启用需经出口闸同意（复用 isExternalAIConsented 出网总开关）。
//
// 本模块是叶子：只依赖 engine/storage，不 import engine/ai 的 index 重链。
// 出口闸的判定放在组件层（与 ExternalRoom 一致），保持模块纯净、易测。
// ============================================================

import { storage } from '../../engine/storage'

const KV_SOURCES = 'rank:sources'
const KV_ENABLED = 'rank:enabled'

/** 一个已接入的外部数据源（仅配置，不渲染排行） */
export interface RankSource {
  id: string
  url: string
  label: string
  addedAt: string
}

function genId(): string {
  return 'rs-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7)
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname || url
  } catch {
    return url
  }
}

export function getSources(): RankSource[] {
  return storage.getKV<RankSource[]>(KV_SOURCES, [])
}

/** 添加一个外部源；空 URL 或重复 URL 返回 null（不写入）。 */
export function addSource(input: { url: string; label?: string }): RankSource | null {
  const url = input.url.trim()
  if (!url) return null
  const list = getSources()
  if (list.some((s) => s.url === url)) return null
  const s: RankSource = {
    id: genId(),
    url,
    label: (input.label ?? '').trim() || hostOf(url),
    addedAt: new Date().toISOString(),
  }
  storage.setKV(KV_SOURCES, [...list, s])
  return s
}

export function removeSource(id: string): void {
  storage.setKV(
    KV_SOURCES,
    getSources().filter((s) => s.id !== id),
  )
}

export function isEnabled(): boolean {
  return storage.getKV<boolean>(KV_ENABLED, false)
}

export function setEnabled(v: boolean): void {
  storage.setKV(KV_ENABLED, v)
}

/**
 * 下游（镜我 / 顾问）取已启用源。本通道 UI 不渲染名次，仅作参照供给。
 * 未启用返回空数组（关闭即零供给、零网络）。
 */
export function getEnabledSources(): RankSource[] {
  return isEnabled() ? getSources() : []
}

export interface RankStatus {
  enabled: boolean
  sourceCount: number
  /** 出口闸（出网总开关）是否已同意——由组件层传入 */
  consented: boolean
}

export function getStatus(consented: boolean): RankStatus {
  return {
    enabled: isEnabled(),
    sourceCount: getSources().length,
    consented,
  }
}
