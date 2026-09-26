// ============================================================
// 本地图片读取与降采样工具
// ------------------------------------------------------------
// 宪法第1条「本地私有」：全程在浏览器/WebView 内用 canvas 完成，
// 图片不离开设备，不发任何请求。
// ============================================================

/** 读取文件为原始 dataURL（不做压缩，谨慎使用） */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/**
 * 读取图片文件并降采样，输出 JPEG dataURL（体积远小于原图/PNG）。
 * - maxDim：最长边上限（保持比例）
 * - quality：JPEG 质量 0~1
 * 依赖 canvas，仅在浏览器/桌面/移动 WebView 可用。
 */
export function fileToDownscaledDataUrl(
  file: File,
  maxDim = 1280,
  quality = 0.82,
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('只能导入图片文件'))
      return
    }
    if (typeof document === 'undefined') {
      reject(new Error('当前环境不支持图片处理'))
      return
    }
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      try {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
        const w = Math.max(1, Math.round(img.width * scale))
        const h = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('无法创建画布上下文'))
          return
        }
        // 透明通道用深色底填充，避免 JPEG 编码后透明区变黑边
        ctx.fillStyle = '#0d0b09'
        ctx.fillRect(0, 0, w, h)
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', quality))
      } catch (e) {
        reject(e instanceof Error ? e : new Error('图片编码失败'))
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片读取失败'))
    }
    img.src = url
  })
}
