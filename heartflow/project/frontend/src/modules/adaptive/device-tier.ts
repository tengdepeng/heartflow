// ============================================================
// 性能自适应 · 设备分级检测（M2）
// ============================================================
// 纯函数 + 浏览器探测分离：classifyTier 不依赖全局，便于测试注入；
// detectDeviceTier 仅在浏览器运行，SSR/测试/jsdom 安全降级。

export type DeviceTier = 'low' | 'mid' | 'high'

export interface DeviceTierInput {
  hardwareConcurrency?: number
  deviceMemory?: number
  webglRenderer?: string | null
}

/**
 * 纯函数：根据设备指标推断性能档。
 * 评分：核心数(≥8:+2 / ≥4:+1) + 内存(≥8GB:+2 / ≥4GB:+1)；
 * 软件渲染(GPU 线索)扣 2。≥4→high，≥2→mid，否则→low。
 */
export function classifyTier(input: DeviceTierInput): DeviceTier {
  const cores = input.hardwareConcurrency ?? 4
  const mem = input.deviceMemory ?? 4
  let score = 0
  if (cores >= 8) score += 2
  else if (cores >= 4) score += 1
  if (mem >= 8) score += 2
  else if (mem >= 4) score += 1

  const renderer = (input.webglRenderer ?? '').toLowerCase()
  if (renderer.includes('swiftshader') || renderer.includes('software')) score -= 2

  if (score >= 4) return 'high'
  if (score >= 2) return 'mid'
  return 'low'
}

/** 读取当前运行环境的设备指标（浏览器内；非浏览器降级为 mid） */
export function detectDeviceTier(): DeviceTier {
  if (typeof navigator === 'undefined' || typeof document === 'undefined') return 'mid'

  const cores = navigator.hardwareConcurrency
  const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory

  let webgl: string | null = null
  try {
    const canvas = document.createElement('canvas')
    const gl =
      (canvas.getContext('webgl') as WebGLRenderingContext | null) ??
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null)
    if (gl) {
      const dbg = gl.getExtension('WEBGL_debug_renderer_info')
      webgl = dbg ? (gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) as string) : 'webgl'
    }
  } catch {
    webgl = null
  }

  return classifyTier({ hardwareConcurrency: cores, deviceMemory: mem, webglRenderer: webgl })
}
