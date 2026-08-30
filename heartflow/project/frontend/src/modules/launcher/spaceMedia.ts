// ============================================================
// Launcher · 空间素材解析（背景图 / 背景视频）
//
// 现实约束（必须对用户诚实，不做假承诺）：
//   1. 浏览器 <input type="file"> 只给 File，拿不到绝对路径。
//   2. 图片可 readAsDataURL 持久化（几百 KB 内可接受）。
//   3. 视频转 data URI 动辄几十 MB，塞进明文 JSON 引擎会拖垮启动，
//      故：视频走 blob URL 仅当前会话有效；要跨会话生效需用户填绝对路径，
//      Tauri 下用 convertFileSrc 转 asset:// 协议加载（路径本身可持久化）。
// ============================================================

/** 是否运行在 Tauri 运行时 */
export function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

/** File → data URI（图片用；视频请勿调用） */
export function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('read failed'))
    reader.readAsDataURL(file)
  })
}

/** 视频：仅当前会话可用的 blob URL（刷新即失效，UI 会明确提示） */
export function fileToObjectUrl(file: File): string {
  return URL.createObjectURL(file)
}

/**
 * 把用户填的本地绝对路径解析成可加载 URL。
 * 已是可加载协议（data/blob/http/asset）则原样返回。
 */
export async function resolveAssetUrl(src: string): Promise<string> {
  if (!src) return src
  if (/^(data|blob|https?|asset|file):/i.test(src)) return src
  if (!isTauriRuntime()) return src
  try {
    const { convertFileSrc } = await import('@tauri-apps/api/core')
    return convertFileSrc(src)
  } catch {
    return src
  }
}

/** 该背景源是否能跨会话复用（blob 不行，需要在 UI 里提示） */
export function isPersistentSource(src: string | null): boolean {
  if (!src) return false
  return !src.startsWith('blob:')
}
