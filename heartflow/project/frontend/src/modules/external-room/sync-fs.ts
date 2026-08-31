// ============================================================
// 外链房 · 云同步 — 平台文件 I/O 隔离层
//
// 把「写盘」这件事从同步逻辑里摘出来，统一成 SyncTarget 抽象：
//   - path  : Tauri 桌面端，原生目录对话框选出的真实路径
//   - handle: 浏览器 File System Access API 拿到的目录句柄
//   - null  : 当前环境不支持直写，降级为手动导出/导入
//
// 宪法第 1 条（本地私有）：快照永远只落在用户自选的本地目录
// （建议放在自己的 OneDrive / 坚果云同步盘），零后端、零出网。
//
// 注意：plugin-dialog / plugin-fs 用「字符串字面量 specifier + @vite-ignore」
// 动态导入，避免在未安装这两个插件时破坏 typecheck / 构建；运行期
// Tauri 由 Rust 侧注入模块、浏览器由底层 API 提供，缺失则 .catch → null。
// ============================================================

import { isTauri } from '../../utils/platform'

/** 同步目标（目录）的两种形态 + 不支持 */
export type SyncTarget =
  | { kind: 'path'; path: string }
  | { kind: 'handle'; handle: unknown }
  | null

/** 同步目录内固定文件名（云盘 last-write-wins 语义，全设备同一文件名） */
export const SYNC_FILENAME = 'heartflow-sync-latest.json'

/** 直写能力是否可用（Tauri 或支持 FS Access API 的浏览器） */
export function isDirectWriteSupported(): boolean {
  if (isTauri()) return true
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

/** 选择同步目录，返回 SyncTarget；不支持或用户取消返回 null。 */
export async function pickSyncDirectory(): Promise<SyncTarget> {
  // —— Tauri：原生目录对话框 ——
  if (isTauri()) {
    try {
      const spec = '@tauri-apps/plugin-dialog' as string
      const mod: any = await import(/* @vite-ignore */ spec).catch(() => null)
      if (mod?.open) {
        const sel = await mod.open({
          directory: true,
          title: '选择同步文件夹（建议放在 OneDrive / 坚果云同步盘）',
        })
        return typeof sel === 'string' ? { kind: 'path', path: sel } : null
      }
    } catch {
      /* 插件缺失或用户取消 → 降级 */
    }
    return null
  }

  // —— 浏览器：File System Access API（Chromium 系）——
  if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
    try {
      const handle: unknown = await (window as any).showDirectoryPicker()
      return handle ? { kind: 'handle', handle } : null
    } catch {
      return null
    }
  }

  // —— 都不支持：走手动导出/导入 ——
  return null
}

function joinPath(dir: string, file: string): string {
  return dir.replace(/[\\/]+$/, '') + '/' + file
}

/** 把加密快照文本写入同步目录。target 为 null 抛错（上层应已降级）。 */
export async function writeSyncFile(target: SyncTarget, text: string): Promise<void> {
  if (!target) throw new SyncFsUnavailableError()

  if (target.kind === 'path') {
    const spec = '@tauri-apps/plugin-fs' as string
    const mod: any = await import(/* @vite-ignore */ spec).catch(() => null)
    if (!mod?.writeTextFile) throw new SyncFsUnavailableError()
    await mod.writeTextFile({ path: joinPath(target.path, SYNC_FILENAME), contents: text })
    return
  }

  // 浏览器句柄：经 createWritable 落盘
  const handle = target.handle as any
  const fileHandle = await handle.getFileHandle(SYNC_FILENAME, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(text)
  await writable.close()
}

/**
 * 读取同步目录的快照文本。
 * 文件不存在返回 null（首次同步 / 未拉取过）；其他错误抛出。
 */
export async function readSyncFile(target: SyncTarget): Promise<string | null> {
  if (!target) throw new SyncFsUnavailableError()

  if (target.kind === 'path') {
    const spec = '@tauri-apps/plugin-fs' as string
    const mod: any = await import(/* @vite-ignore */ spec).catch(() => null)
    if (!mod?.readTextFile) throw new SyncFsUnavailableError()
    try {
      return await mod.readTextFile(joinPath(target.path, SYNC_FILENAME))
    } catch {
      return null // 文件不存在
    }
  }

  // 浏览器句柄
  try {
    const handle = target.handle as any
    const fileHandle = await handle.getFileHandle(SYNC_FILENAME)
    const file = await fileHandle.getFile()
    return await file.text()
  } catch {
    return null
  }
}

/** 直写能力不可用的显式错误（上层据此走手动导出/导入） */
export class SyncFsUnavailableError extends Error {
  constructor() {
    super('SYNC_FS_UNAVAILABLE')
    this.name = 'SyncFsUnavailableError'
  }
}
