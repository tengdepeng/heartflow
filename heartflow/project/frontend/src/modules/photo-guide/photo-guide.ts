// ============================================================
// 藏象阁 · AI 拍照引导取景（Guided Photo Capture，INCR-506）
// ------------------------------------------------------------
// 借鉴 96 APK「知源中医」舌诊/面诊/脉诊拍照引导资源
// （raw: ai_tongue / ai_tongue_night / tongue_front /
//  face_analysis / face_front_hint / take_photo / shitu_loding）
// 与 lottie 脉诊相机 pulse_camera.zip。
// 提供「选场景 → 对齐取景 → 倒计时拍摄 → 本地画质评估」流程。
//
// 合规：零网络。图像仅在内存画布中做本地像素统计（亮度/清晰度/
// 主体占比），不上传、不落盘、不作医疗诊断；历史仅存元数据。
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'

const STORAGE_KEY = 'hf:photo_captures'
const MAX_HISTORY = 30

export type CaptureSceneId = 'tongue' | 'face' | 'pulse'

export interface CaptureScene {
  id: CaptureSceneId
  label: string
  icon: string
  desc: string
  /** 取景框宽高比 */
  aspect: '4:3' | '1:1'
  /** 取景框形态 */
  reticle: 'oval' | 'circle' | 'rect'
  /** 分步引导文案 */
  steps: string[]
  /** 拍摄要点 */
  tips: string[]
}

export const CAPTURE_SCENES: CaptureScene[] = [
  {
    id: 'tongue',
    label: '舌诊取景',
    icon: '👅',
    desc: '自然伸舌，舌尖朝下，避免染色食物',
    aspect: '4:3',
    reticle: 'oval',
    steps: [
      '在自然光下，面部朝向光源',
      '自然伸出舌头，舌尖向下、舌面舒展',
      '将舌面对准中央椭圆取景框',
      '保持 1 秒稳定后自动拍摄',
    ],
    tips: ['拍摄前 30 分钟避免咖啡/浓茶/有色饮料', '避免使用美颜或滤镜', '舌头不要过度用力'],
  },
  {
    id: 'face',
    label: '面诊取景',
    icon: '🙂',
    desc: '正面平视，露出额头与下巴',
    aspect: '4:3',
    reticle: 'rect',
    steps: [
      '面向光源，保持表情自然放松',
      '让面部完整落入中央方框',
      '头顶留白约一指宽，露出下巴',
      '双眼平视镜头后自动拍摄',
    ],
    tips: ['摘掉帽子、口罩与有色眼镜', '避免逆光或顶光造成阴影', '保持背景简洁'],
  },
  {
    id: 'pulse',
    label: '脉诊取景',
    icon: '💗',
    desc: '手腕平放，对准寸关尺区域',
    aspect: '1:1',
    reticle: 'circle',
    steps: [
      '手腕自然平放于桌面，掌心向上',
      '将手腕桡侧对准中央圆形取景框',
      '手指不要遮挡取景区域',
      '保持静止后自动拍摄',
    ],
    tips: ['拍摄前静坐 3 分钟', '光线均匀，避免手腕阴影', '可垫一块浅色布以突出手部'],
  },
]

export function sceneById(id: string): CaptureScene {
  return CAPTURE_SCENES.find((s) => s.id === id) ?? CAPTURE_SCENES[0]
}

// ------------------------------------------------------------
// 本地画质评估（纯函数，可单测）
// ------------------------------------------------------------

export interface ImageMetrics {
  /** 平均亮度 0~255 */
  brightness: number
  /** 清晰度 0~100（邻域梯度能量归一） */
  sharpness: number
  /** 主体占比 0~1（与四角背景色差异像素比例） */
  coverage: number
}

export interface CaptureEvaluation {
  /** 综合分 0~100 */
  score: number
  level: 'good' | 'fair' | 'poor'
  issues: string[]
  tips: string[]
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))

/** 由像素数据统计亮度 / 清晰度 / 主体占比（纯本地、无网络） */
export function analyzeImageData(
  data: Uint8ClampedArray | number[],
  width: number,
  height: number,
): ImageMetrics {
  const total = width * height
  if (width <= 0 || height <= 0 || data.length < total * 4) {
    return { brightness: 0, sharpness: 0, coverage: 0 }
  }

  const luma = (i: number): number => 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]

  // 平均亮度
  let sum = 0
  for (let p = 0; p < total; p++) sum += luma(p * 4)
  const brightness = sum / total

  // 清晰度：水平/垂直相邻像素亮度差的均值
  let gradSum = 0
  let gradCount = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const c = luma(i)
      if (x + 1 < width) {
        gradSum += Math.abs(c - luma(i + 4))
        gradCount++
      }
      if (y + 1 < height) {
        gradSum += Math.abs(c - luma(i + width * 4))
        gradCount++
      }
    }
  }
  const meanGrad = gradCount > 0 ? gradSum / gradCount : 0
  const sharpness = clamp((meanGrad / 55) * 100, 0, 100)

  // 主体占比：以四角 4×4 均色为背景，统计差异超阈值的像素
  const corner = (cx: number, cy: number): number => {
    let s = 0
    let n = 0
    for (let y = cy; y < cy + 4 && y < height; y++) {
      for (let x = cx; x < cx + 4 && x < width; x++) {
        s += luma((y * width + x) * 4)
        n++
      }
    }
    return n > 0 ? s / n : 0
  }
  const bgLuma =
    (corner(0, 0) + corner(Math.max(0, width - 4), 0) + corner(0, Math.max(0, height - 4)) + corner(Math.max(0, width - 4), Math.max(0, height - 4))) / 4
  const THRESHOLD = 32
  let subject = 0
  for (let p = 0; p < total; p++) {
    if (Math.abs(luma(p * 4) - bgLuma) > THRESHOLD) subject++
  }
  const coverage = subject / total

  return { brightness, sharpness, coverage }
}

/** 由画质指标给出取景质量评估（纯函数） */
export function evaluateCapture(m: ImageMetrics): CaptureEvaluation {
  const issues: string[] = []
  const tips: string[] = []
  let score = 100

  if (m.brightness < 95) {
    score -= clamp(((95 - m.brightness) / 95) * 40, 0, 40)
    issues.push('画面偏暗')
    tips.push('移到光线充足处，避免背光拍摄')
  } else if (m.brightness > 175) {
    score -= clamp(((m.brightness - 175) / 80) * 40, 0, 40)
    issues.push('画面过曝')
    tips.push('避开强光直射，减少反光')
  }

  if (m.sharpness < 45) {
    score -= clamp(((45 - m.sharpness) / 45) * 45, 0, 45)
    issues.push('画面偏模糊')
    tips.push('保持设备稳定，对准后停留约 1 秒')
  }

  if (m.coverage < 0.3) {
    score -= clamp(((0.3 - m.coverage) / 0.3) * 30, 0, 30)
    issues.push('主体占比偏小')
    tips.push('靠近一些，让主体填满取景框')
  } else if (m.coverage > 0.9) {
    score -= clamp(((m.coverage - 0.9) / 0.1) * 20, 0, 20)
    issues.push('主体过于贴边')
    tips.push('稍微后退，留出边缘空间')
  }

  score = clamp(Math.round(score), 0, 100)
  const level: CaptureEvaluation['level'] = score >= 80 ? 'good' : score >= 55 ? 'fair' : 'poor'
  if (issues.length === 0) tips.push('取景质量良好，可继续记录感受')
  return { score, level, issues, tips }
}

export const LEVEL_LABEL: Record<CaptureEvaluation['level'], string> = {
  good: '清晰',
  fair: '尚可',
  poor: '需重拍',
}

// ------------------------------------------------------------
// 历史（仅存元数据，不保存图像）
// ------------------------------------------------------------

export interface CaptureRecord {
  id: string
  sceneId: CaptureSceneId
  at: string
  score: number
  level: CaptureEvaluation['level']
}

export type CapturePhase = 'idle' | 'aligning' | 'captured' | 'result'

function normalizeRecords(raw: unknown): CaptureRecord[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((r): r is CaptureRecord => !!r && typeof r === 'object' && typeof (r as CaptureRecord).id === 'string')
    .map((r) => ({
      id: r.id,
      sceneId: (['tongue', 'face', 'pulse'] as const).includes(r.sceneId) ? r.sceneId : 'tongue',
      at: typeof r.at === 'string' ? r.at : new Date().toISOString(),
      score: typeof r.score === 'number' ? clamp(Math.round(r.score), 0, 100) : 0,
      level: (['good', 'fair', 'poor'] as const).includes(r.level) ? r.level : 'fair',
    }))
    .slice(0, MAX_HISTORY)
}

const activeSceneId = ref<CaptureSceneId>('tongue')
const phase = ref<CapturePhase>('idle')
const result = ref<CaptureEvaluation | null>(null)
const history = ref<CaptureRecord[]>([])

function load(): void {
  try {
    history.value = normalizeRecords(storage.getKV<unknown>(STORAGE_KEY, []))
  } catch {
    history.value = []
  }
}

function persist(): void {
  storage.setKV(STORAGE_KEY, history.value)
}

load()

export function reloadPhotoGuide(): void {
  load()
}

export function usePhotoGuide() {
  const scene = computed(() => sceneById(activeSceneId.value))
  const scenes = computed(() => CAPTURE_SCENES)
  const records = computed(() => history.value)
  const latest = computed(() => history.value[0] ?? null)

  function selectScene(id: CaptureSceneId): void {
    activeSceneId.value = sceneById(id).id
    phase.value = 'idle'
    result.value = null
  }

  function beginAligning(): void {
    phase.value = 'aligning'
    result.value = null
  }

  function markCaptured(): void {
    phase.value = 'captured'
  }

  /** 由画布统计指标出评估并写入历史 */
  function submitMetrics(m: ImageMetrics): CaptureEvaluation {
    const evaluation = evaluateCapture(m)
    result.value = evaluation
    phase.value = 'result'
    const record: CaptureRecord = {
      id: `pc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      sceneId: activeSceneId.value,
      at: new Date().toISOString(),
      score: evaluation.score,
      level: evaluation.level,
    }
    history.value = [record, ...history.value].slice(0, MAX_HISTORY)
    persist()
    return evaluation
  }

  function reset(): void {
    phase.value = 'idle'
    result.value = null
  }

  function clearHistory(): void {
    history.value = []
    persist()
  }

  return {
    scenes,
    scene,
    activeSceneId,
    phase,
    result,
    records,
    latest,
    selectScene,
    beginAligning,
    markCaptured,
    submitMetrics,
    reset,
    clearHistory,
  }
}
