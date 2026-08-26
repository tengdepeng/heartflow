// ============================================================
// 幕僚 · 载体本地 IO
// 蓝图第四部分「载体」：用户导入图片（本地降采样，不触云）+ 社区下载（本地 .carrier 文件）。
// 严格遵守宪法第1条「本地私有」：所有载体数据仅存于设备内，绝不上传云端。
// ============================================================

import type {
  AdvisorCarrier,
  AdvisorCarrierGeometry,
  AdvisorCarrierKind,
  AdvisorCarrierStage,
} from '../../types/advisor'
import { CARRIER_STAGE_ORDER } from '../../types/advisor'
import { assertShareLocalOnly } from '../share/share-local'

const GEOMETRY_SET: ReadonlySet<string> = new Set(['orb', 'crystal', 'flame', 'seed'])
const KIND_SET: ReadonlySet<string> = new Set(['official-geometry', 'user-image'])
const STAGE_SET: ReadonlySet<string> = new Set(CARRIER_STAGE_ORDER)

const MAX_IMPORT_DIM = 256

/** .carrier 文件格式版本 */
export const CARRIER_FILE_SCHEMA = 'heartflow.carrier'
export const CARRIER_FILE_VERSION = 1

export interface CarrierFilePayload {
  schema: string
  version: number
  /** 载体形态标签（如「玉珠」），导入时用于预填 formLabel */
  name: string
  carrier: AdvisorCarrier
}

/**
 * 读取用户选择的图片文件，降采样到最大边长 MAX_IMPORT_DIM，
 * 输出 PNG dataURL（避免原始大图占用设备存储）。
 * 仅在浏览器/桌面环境可用（依赖 document.createElement('canvas')）。
 */
export function readImageAsDataURL(file: File, maxDim: number = MAX_IMPORT_DIM): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('只能导入图片文件'))
      return
    }
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
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
      ctx.drawImage(img, 0, 0, w, h)
      try {
        resolve(canvas.toDataURL('image/png'))
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

/**
 * 校验并规整单个 AdvisorCarrier（含各生命阶段），丢弃非法字段。
 * 返回可能为 undefined（输入非法时）。
 */
export function sanitizeCarrier(input: unknown): AdvisorCarrier | undefined {
  if (!input || typeof input !== 'object') return undefined
  const obj = input as Record<string, unknown>

  const kind = obj.kind as AdvisorCarrierKind
  if (!KIND_SET.has(kind)) return undefined

  const carrier: AdvisorCarrier = { kind }

  if (kind === 'official-geometry') {
    const geometry = obj.geometry as AdvisorCarrierGeometry
    if (GEOMETRY_SET.has(geometry)) carrier.geometry = geometry
    else return undefined // 官方几何必须有合法几何体
  } else {
    // user-image：必须有 imageData
    if (typeof obj.imageData === 'string' && obj.imageData.startsWith('data:image/')) {
      carrier.imageData = obj.imageData
    } else {
      return undefined
    }
  }

  if (typeof obj.formLabel === 'string' && obj.formLabel.trim()) {
    carrier.formLabel = obj.formLabel.trim().slice(0, 32)
  }

  if (obj.stages && typeof obj.stages === 'object') {
    const stages = obj.stages as Record<string, unknown>
    const outStages: Partial<Record<AdvisorCarrierStage, AdvisorCarrier>> = {}
    for (const key of Object.keys(stages)) {
      if (!STAGE_SET.has(key)) continue
      const sub = sanitizeCarrier(stages[key])
      if (sub) outStages[key as AdvisorCarrierStage] = sub
    }
    if (Object.keys(outStages).length) carrier.stages = outStages
  }

  return carrier
}

/** 序列化载体为可分享的 .carrier 文件文本 */
export function exportCarrierFile(carrier: AdvisorCarrier, name: string): string {
  const payload: CarrierFilePayload = {
    schema: CARRIER_FILE_SCHEMA,
    version: CARRIER_FILE_VERSION,
    name: (name || '未命名载体').slice(0, 32),
    carrier,
  }
  return JSON.stringify(payload, null, 2)
}

/** 解析 .carrier 文件文本；非法时抛错 */
export function parseCarrierFile(text: string): CarrierFilePayload {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('文件不是合法的 .carrier 文件')
  }
  if (!data || typeof data !== 'object') throw new Error('载体文件内容为空或格式错误')
  const obj = data as Record<string, unknown>
  if (obj.schema !== CARRIER_FILE_SCHEMA) throw new Error('未知载体文件格式')
  const carrier = sanitizeCarrier(obj.carrier)
  if (!carrier) throw new Error('载体形态数据非法')
  return {
    schema: CARRIER_FILE_SCHEMA,
    version: typeof obj.version === 'number' ? obj.version : CARRIER_FILE_VERSION,
    name: typeof obj.name === 'string' ? obj.name : '未命名载体',
    carrier,
  }
}

/** 触发浏览器下载一个 .carrier 文件（纯本地，不触云） */
export function downloadCarrierFile(carrier: AdvisorCarrier, name: string): void {
  // 第43条本地边界：载体分享仅限本地 .carrier 文件，拦截任何云端目标
  assertShareLocalOnly('local')
  const text = exportCarrierFile(carrier, name)
  const safeName = (name || 'carrier').replace(/[^\w一-龥-]+/g, '_').slice(0, 32)
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${safeName}.carrier`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
