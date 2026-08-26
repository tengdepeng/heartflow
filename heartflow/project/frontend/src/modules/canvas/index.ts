// ============================================================
// 画布模块 · 心流画布逻辑
// ============================================================

import { ref, computed } from 'vue'
import type { TimeCrystal } from '../../types'
import type { CanvasLayoutMode, CanvasCrystal, GravityConfig, CanvasState } from './types'
import { DEFAULT_GRAVITY_CONFIG } from './types'
import { storage } from '../../engine/storage'

export type { CanvasLayoutMode, CanvasCrystal, GravityConfig, CanvasState } from './types'

// ---- 高级引力引擎 ----
export { useCanvasGravityEngine, PRESET_CONSTELLATIONS, BEAD_COLORS } from './canvas-gravity'
export type {
  JadeBead,
  MediumBreath,
  CrystalLanding,
  StarConstellation,
  StarNavNode,
  GravityParticle,
} from './canvas-gravity'

// ---- 全局画布状态 ----
const state = ref<CanvasState>({
  layoutMode: 'gravity',
  visible: true,
  selectedCrystalId: null,
})

/** 结晶列表（响应式） */
const canvasCrystals = ref<CanvasCrystal[]>([])

/** 引力配置 */
const gravityConfig = ref<GravityConfig>({ ...DEFAULT_GRAVITY_CONFIG })

/** 画布尺寸（会被 setCanvasSize 更新） */
const canvasWidth = ref(800)
const canvasHeight = ref(600)

/** 布局切换时的结晶重排脉冲（全局共享：App.vue 触发 / CanvasRoom 消费动画） */
const rearranging = ref(false)
let rearrangeTimer: ReturnType<typeof setTimeout> | null = null

// ---- 工具函数 ----

/** 获取随机浮动偏移 */
function randomFloatPhase(): number {
  return Math.random() * Math.PI * 2
}

/** 根据布局模式计算目标位置 */
function calcTargetPosition(
  crystal: TimeCrystal,
  index: number,
  total: number,
  mode: CanvasLayoutMode,
  width: number,
  height: number,
): { x: number; y: number; scale: number; opacity: number } {
  const margin = 60
  const cw = width - margin * 2
  const ch = height - margin * 2

  if (mode === 'grid') {
    // 网格模式：按生成时间排序，左到右、上到下
    const cols = Math.max(1, Math.floor(cw / 100))
    const rows = Math.ceil(total / cols)
    const col = index % cols
    const row = Math.floor(index / cols)
    const cellW = cw / cols
    const cellH = Math.min(120, ch / Math.max(1, rows))
    return {
      x: margin + col * cellW + cellW / 2,
      y: margin + row * cellH + cellH / 2,
      scale: 0.7 + Math.random() * 0.3,
      opacity: 0.85,
    }
  }

  // 引力模式：围绕中心呈放射状分布
  const cx = width * gravityConfig.value.centerX
  const cy = height * gravityConfig.value.centerY
  // 用 intensity 决定距中心的距离（高强度更靠近中心）
  const distRatio = 0.15 + (1 - crystal.intensity) * 0.7
  const maxRadius = Math.min(cw, ch) * 0.4
  const radius = maxRadius * distRatio
  // 用 index 均匀分布在圆周上 + 小随机偏移
  const angleOffset = (index / Math.max(1, total)) * Math.PI * 2 + Math.random() * 0.5
  const jitter = (Math.random() - 0.5) * 20

  return {
    x: cx + Math.cos(angleOffset) * (radius + jitter),
    y: cy + Math.sin(angleOffset) * (radius + jitter),
    scale: 0.5 + crystal.intensity * 0.6,
    opacity: 0.7 + crystal.intensity * 0.3,
  }
}

/** 重新计算所有结晶的位置 */
function relayout() {
  const mode = state.value.layoutMode
  const crystals = storage.getCrystals()
  const total = crystals.length
  canvasCrystals.value = crystals.map((c, i) => {
    const pos = calcTargetPosition(c, i, total, mode, canvasWidth.value, canvasHeight.value)
    // 保留浮动相位
    const existing = canvasCrystals.value.find(cc => cc.crystal.id === c.id)
    return {
      crystal: c,
      x: pos.x,
      y: pos.y,
      targetX: pos.x,
      targetY: pos.y,
      scale: pos.scale,
      opacity: pos.opacity,
      floatPhase: existing?.floatPhase ?? randomFloatPhase(),
    }
  })
}

// ---- 导出 hooks ----

export function useCanvasRoom() {
  /** 切换布局模式 */
  function setLayoutMode(mode: CanvasLayoutMode) {
    state.value.layoutMode = mode
    relayout()
  }

  /** 切换布局模式并触发结晶重排脉冲（700ms 后自动复位） */
  function toggleLayout() {
    setLayoutMode(state.value.layoutMode === 'gravity' ? 'grid' : 'gravity')
    rearranging.value = true
    if (rearrangeTimer) clearTimeout(rearrangeTimer)
    rearrangeTimer = setTimeout(() => { rearranging.value = false }, 700)
  }

  /** 更新画布尺寸 */
  function setCanvasSize(width: number, height: number) {
    canvasWidth.value = width
    canvasHeight.value = height
    relayout()
  }

  /** 选中结晶 */
  function selectCrystal(id: string | null) {
    state.value.selectedCrystalId = id
  }

  /** 刷新结晶列表（完成专注后调用） */
  function refresh() {
    relayout()
  }

  /** 选中的结晶数据 */
  const selectedCrystal = computed(() => {
    const id = state.value.selectedCrystalId
    if (!id) return null
    return canvasCrystals.value.find(cc => cc.crystal.id === id)?.crystal ?? null
  })

  /** 选中的结晶关联的 session */
  const selectedSession = computed(() => {
    const c = selectedCrystal.value
    if (!c) return null
    return storage.getSessions().find(s => s.id === c.sessionId) ?? null
  })

  return {
    // 状态
    state,
    canvasCrystals,
    gravityConfig,
    canvasWidth,
    canvasHeight,
    selectedCrystal,
    selectedSession,
    rearranging,
    // 操作
    setLayoutMode,
    toggleLayout,
    setCanvasSize,
    selectCrystal,
    refresh,
  }
}
