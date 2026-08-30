// ============================================================
// Launcher · 3D 空间布局算法（纯函数，无 three 依赖）
// 抽成纯函数是为了可单测：happy-dom 无 WebGL，渲染器本身测不了，
// 但「给 N 个图标算摆在哪」必须可验证。
// 三种形态共用一套卡片对象，差别只在坐标与朝向。
// ============================================================

/** 空间形态 */
export type SpaceLayout = 'arc' | 'ring' | 'grid'

/** 单个卡片的空间位姿 */
export interface CardTransform {
  x: number
  y: number
  z: number
  /** 绕 Y 轴旋转（弧度）：卡片法线朝外、正对镜头 */
  rotY: number
}

/** 布局参数（常量集中，便于调参与测试断言） */
export const LAYOUT_CONSTANTS = {
  /** 弧墙：圆心 z、半径、单卡占用弧度 */
  arc: { centerZ: -3, radius: 4, perCardAngle: 0.42, maxSpread: Math.PI * 1.1 },
  /** 环阵：半径、层数、层高间距 */
  ring: { radius: 4.5, layerGap: 2.4 },
  /** 网格：列间距、行间距、最大列数 */
  grid: { gapX: 1.7, gapY: 1.7, maxCols: 6 },
} as const

/**
 * 计算 count 个卡片在给定形态下的位姿。
 * count=0 返回空数组；单卡片一律居中正对镜头。
 */
export function computeCardTransforms(layout: SpaceLayout, count: number): CardTransform[] {
  if (count <= 0) return []
  if (count === 1) return [{ x: 0, y: 0, z: 0, rotY: 0 }]

  switch (layout) {
    case 'arc':
      return arcTransforms(count)
    case 'ring':
      return ringTransforms(count)
    case 'grid':
      return gridTransforms(count)
    default:
      return gridTransforms(count)
  }
}

/** 内凹弧墙：卡片沿圆弧铺开，凹面朝镜头（游戏空间主视觉） */
function arcTransforms(count: number): CardTransform[] {
  const { centerZ, radius, perCardAngle, maxSpread } = LAYOUT_CONSTANTS.arc
  const spread = Math.min(maxSpread, perCardAngle * (count - 1))
  const out: CardTransform[] = []
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1) - 0.5
    const a = t * spread
    out.push({
      x: Math.sin(a) * radius,
      y: 0,
      z: centerZ + Math.cos(a) * radius,
      rotY: a,
    })
  }
  return out
}

/** 环阵：卡片环绕镜头，分层错落，配合自动旋转巡览 */
function ringTransforms(count: number): CardTransform[] {
  const { radius, layerGap } = LAYOUT_CONSTANTS.ring
  // 两层均分，奇数时上层多一个；单层（≤4 个）时不分层
  const layers = count <= 4 ? 1 : 2
  const perLayer = Math.ceil(count / layers)
  const out: CardTransform[] = []
  for (let i = 0; i < count; i++) {
    const layer = layers === 1 ? 0 : Math.floor(i / perLayer)
    const idxInLayer = layers === 1 ? i : i % perLayer
    const layerCount = layers === 1 ? count : Math.min(perLayer, count - layer * perLayer)
    const a = (idxInLayer / layerCount) * Math.PI * 2
    out.push({
      x: Math.sin(a) * radius,
      y: layers === 1 ? 0 : (layer === 0 ? layerGap / 2 : -layerGap / 2),
      z: -Math.cos(a) * radius,
      // 法线朝圆心（镜头所在），故取负角
      rotY: -a,
    })
  }
  return out
}

/** 正面墙阵：密集收纳，相机拉远即可一览 */
function gridTransforms(count: number): CardTransform[] {
  const { gapX, gapY, maxCols } = LAYOUT_CONSTANTS.grid
  const cols = Math.min(maxCols, Math.max(1, Math.ceil(Math.sqrt(count))))
  const rows = Math.ceil(count / cols)
  const out: CardTransform[] = []
  for (let i = 0; i < count; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)
    out.push({
      x: (col - (cols - 1) / 2) * gapX,
      y: ((rows - 1) / 2 - row) * gapY,
      z: 0,
      rotY: 0,
    })
  }
  return out
}

/**
 * 相机距离建议值：网格形态需要拉远才看得全。
 * 渲染器据此调整相机 z，避免用户切形态后卡片出画。
 */
export function suggestCameraDistance(layout: SpaceLayout, count: number): number {
  if (count === 0) return 7
  switch (layout) {
    case 'arc':
      return 7
    case 'ring':
      return 6.2
    case 'grid': {
      const { maxCols, gapY } = LAYOUT_CONSTANTS.grid
      const cols = Math.min(maxCols, Math.max(1, Math.ceil(Math.sqrt(count))))
      const rows = Math.ceil(count / cols)
      // 行越高越要后退；同时列多也要后退
      return 6 + rows * gapY * 0.42 + cols * 0.28
    }
    default:
      return 7
  }
}
