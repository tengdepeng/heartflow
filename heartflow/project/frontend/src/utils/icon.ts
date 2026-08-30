// 图标自定义工具：区分「字形（emoji/字符）」与「图片（data-uri/url）」图标，
// 供侧栏/启动器/品牌位统一渲染。本项目房间图标沿用 emoji 字形约定，
// 自定义图片以 data-uri 或 http(s)/相对路径存储于 customIcon / appBrandIcon。

/** 判断图标值是否为可渲染的图片地址（而非字形字符） */
export function isImageIcon(v: string | null | undefined): boolean {
  if (!v) return false
  const s = v.trim()
  return /^(https?:\/\/|data:image\/|blob:|^\/)/i.test(s)
}

/**
 * 预设字形面板：覆盖院落常见房间语义的精选 emoji 字形。
 * 保持与房间图默认 icon 一致的设计语言（字形而非图片），用户可在此快速选取。
 */
export const GLYPH_PALETTE: string[] = [
  '🏠', '🛋️', '🌿', '🔥', '💡', '📖', '✍️', '🧠',
  '⏳', '🎯', '🌅', '🌙', '🪞', '⚓', '🗺️', '🧭',
  '💎', '🌌', '⭐', '🌟', '🔮', '🎨', '🎵', '📝',
  '🗂️', '📊', '📈', '💰', '🩺', '🌾', '⚡', '🕊️',
  '🪷', '🫧', '🪐', '🌊', '🔆', '🜂', '🜄', '✦',
]

/** 将 File 读取为 data-uri（用于图片型自定义图标上传） */
export function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error ?? new Error('读取文件失败'))
    reader.readAsDataURL(file)
  })
}
