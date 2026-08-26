// ============================================================
// 跨端接续 · 传输抽象层（B1）
// 把「数据怎么离开/回到本设备」与业务解耦：
//   - 默认无任何传输通道（activeTransport = null）→ 守第1条「本地私有·默认关闭」
//   - 本地快照适配器（createLocalSnapshotAdapter）：纯本地序列化，零网络
//   - 未来 B1.4 网络适配器只需实现同一 TransportAdapter 接口即插即用
// ============================================================

import { storage } from '../../engine/storage'

/** 快照格式版本（破坏性变更时递增） */
export const SNAPSHOT_FORMAT = 'hf-snapshot/v1' as const

/** 跨端接续快照载体：与具体传输通道无关 */
export interface SnapshotBlob {
  format: typeof SNAPSHOT_FORMAT
  /** 导出时间戳（ISO8601） */
  exportedAt: string
  /** 完整存储 schema（kvStore + 结构化域） */
  schema: Record<string, unknown>
}

/** 传输通道类型 */
export type TransportKind = 'local' | 'network'

/**
 * 传输适配器接口：导出/导入一对回路。
 * 任何通道（本地文件、网络对等节点）都实现该接口，
 * 业务层（sync/index.ts）只认适配器，不关心底层介质。
 */
export interface TransportAdapter {
  readonly kind: TransportKind
  /** 从本设备导出一份快照 */
  export(): Promise<SnapshotBlob>
  /** 把一份快照导入本设备 */
  import(blob: SnapshotBlob): Promise<void>
}

/** 默认无传输通道哨兵（守默认关闭） */
export const NO_TRANSPORT: null = null

/**
 * 本地快照适配器：把完整存储 schema 序列化为 SnapshotBlob。
 * 纯本地、零网络调用，符合宪法第1条。
 * 文件落盘/解析由调用方（UI）负责，适配器只产出/消费内存中的 SnapshotBlob。
 */
export function createLocalSnapshotAdapter(): TransportAdapter {
  return {
    kind: 'local',
    async export(): Promise<SnapshotBlob> {
      const schema = storage.exportAllData() as unknown as Record<string, unknown>
      return {
        format: SNAPSHOT_FORMAT,
        exportedAt: new Date().toISOString(),
        schema,
      }
    },
    async import(blob: SnapshotBlob): Promise<void> {
      if (blob.format !== SNAPSHOT_FORMAT) {
        throw new Error(`不支持的快照格式：${String(blob.format)}`)
      }
      storage.importAllData(blob.schema)
    },
  }
}

// ============================================================
// B1.4 · 局域网边界传输适配器（守宪法第1条「本地私有」）
// 仅在「本地边界」内收发快照：localhost / 私有网段 / .local/.lan 主机名。
// 任何公网地址在传输层被硬性拒绝——fail-closed by construction，
// 不依赖运行时开关，构成第1条的最强保障。
// ============================================================

/** 局域网适配器配置 */
export interface LanAdapterOptions {
  /** 对等节点接收/提供快照的本地 URL，如 http://192.168.1.20:54321 */
  peerUrl: string
}

/**
 * 校验 URL 是否落在本地边界内（守宪法第1条本地私有·内核级不可关闭）。
 * 仅放行：localhost / 127.0.0.1 / ::1 / 私有 IPv4 段(10.*,172.16-31.*,192.168.*,169.254.*) / .local/.lan/.home 主机名。
 * 其余（公网 IP、公网域名）一律拒绝。
 */
export function isLocalBoundaryUrl(url: string): boolean {
  try {
    const u = new URL(url)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false
    const host = u.hostname.toLowerCase()
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]') return true
    const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
    if (m) {
      const a = Number(m[1])
      const b = Number(m[2])
      if (a === 10) return true
      if (a === 172 && b >= 16 && b <= 31) return true
      if (a === 192 && b === 168) return true
      if (a === 169 && b === 254) return true
      return false
    }
    if (host.endsWith('.local') || host.endsWith('.lan') || host.endsWith('.home')) return true
    return false
  } catch {
    return false
  }
}

/**
 * 局域网边界传输适配器：经 fetch 与本地对等节点收发快照。
 * - export()：把本机快照 PUT 到 peerUrl/snapshot（推送到对端）。
 * - import()：从 peerUrl/snapshot GET 对端快照并导入本机（覆盖）。
 * 任何非本地边界地址在调用即抛错，绝不外发到公网。
 * 注意：真正的「收」端由后端局域网命令（B1.4 后端）提供本地 HTTP 服务；
 * 本适配器只负责发送/拉取，且始终守住本地边界。
 */
export function createLanTransportAdapter(opts: LanAdapterOptions): TransportAdapter {
  const base = opts.peerUrl.replace(/\/+$/, '')
  return {
    kind: 'network',
    async export(): Promise<SnapshotBlob> {
      if (!isLocalBoundaryUrl(base)) {
        throw new Error(`拒绝非本地地址（违反宪法第1条本地私有）：${base}`)
      }
      const blob = await createLocalSnapshotAdapter().export()
      const res = await fetch(`${base}/snapshot`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(blob),
      })
      if (!res.ok) throw new Error(`局域网发送快照失败：${res.status}`)
      return blob
    },
    async import(blob: SnapshotBlob): Promise<void> {
      if (!isLocalBoundaryUrl(base)) {
        throw new Error(`拒绝非本地地址（违反宪法第1条本地私有）：${base}`)
      }
      if (blob.format !== SNAPSHOT_FORMAT) {
        throw new Error(`不支持的快照格式：${String(blob.format)}`)
      }
      const res = await fetch(`${base}/snapshot`, { method: 'GET' })
      if (!res.ok) throw new Error(`局域网接收快照失败：${res.status}`)
      const remote = (await res.json()) as SnapshotBlob
      if (remote.format !== SNAPSHOT_FORMAT) {
        throw new Error(`不支持的快照格式：${String(remote.format)}`)
      }
      storage.importAllData(remote.schema)
    },
  }
}
