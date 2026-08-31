// 运行时窗口图标热替换（item3 · 桌面/App 图标自定义）。
// 用户在「设置 → 应用图标」选取品牌图（图片 data-uri）后，让窗口标题栏 / 任务栏
// 图标即时变更，无需重新打包。
// - 浏览器 / 非 Tauri 环境：no-op（保留既有 favicon 逻辑，见 App.vue watch）。
// - 字形或空值：no-op（保留构建期默认图标）。
// 注意：@tauri-apps/api 的 Image 构造器是内部 `constructor(rid)`，必须经静态方法
// `Image.new(rgba, w, h)` 创建（传入 RGBA + 尺寸，不依赖 Cargo image-png 特性）。

import { getCurrentWindow } from '@tauri-apps/api/window'
import { Image as TauriImage } from '@tauri-apps/api/image'
import { isImageIcon } from '../../utils/icon'

/** 是否处于 Tauri 桌面运行时（沿用项目既有守卫，见 auraLayer.ts / spaceMedia.ts） */
function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

/** 把图片 data-uri 解码为 256×256 居中铺满的 RGBA 像素（供 TauriImage.new 使用） */
async function dataUriToRgba(dataUri: string, size = 256): Promise<{ rgba: Uint8Array; w: number; h: number }> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = document.createElement('img')
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error('品牌图标解码失败'))
    el.src = dataUri
  })
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建 canvas 2D 上下文')
  // 透明底，居中 cover 铺满
  const scale = Math.max(size / img.width, size / img.height)
  const w = img.width * scale
  const h = img.height * scale
  ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
  const data = ctx.getImageData(0, 0, size, size).data
  return { rgba: new Uint8Array(data), w: size, h: size }
}

/** 把 RGBA 像素推到当前窗口图标（独立抽出便于单测，绕开 canvas 解码） */
export async function pushRgbaToWindow(rgba: Uint8Array, w: number, h: number): Promise<void> {
  if (!isTauriRuntime()) return
  const image = await TauriImage.new(rgba, w, h)
  await getCurrentWindow().setIcon(image)
}

/** 应用品牌图到窗口图标：非 Tauri / 空 / 字形 均 no-op；图片则热替换。 */
export async function applyBrandIconToWindow(icon: string | null): Promise<void> {
  if (!isTauriRuntime()) return
  if (!icon || !isImageIcon(icon)) return
  try {
    const { rgba, w, h } = await dataUriToRgba(icon, 256)
    await pushRgbaToWindow(rgba, w, h)
  } catch {
    /* 解码或设置失败静默忽略，保留默认图标，不影响主流程 */
  }
}
