// 悬浮窗随窗口缩放重锚的纯几何计算（① 响应式自适应）。
// 抽成无 DOM 依赖的纯函数，便于单测锁定行为、避免回退。
// 调用方（App.vue 侧栏 / FloatingNavBar 底栏）负责传入真实尺寸与视口，
// 并用 rAF 合帧以规避拖拽缩放时高频写存储。

export interface FloatRect {
  width: number
  height: number
}

/**
 * 侧栏重锚：贴边轴钉回视口边、自由轴钳制进视口。
 * - 角落吸附态（pos 为 null）由 CSS .float-edge-* 响应式接管，不在此处理。
 * - free：x/y 双向钳制进视口（纵向允许上溢，与拖拽逻辑一致）。
 * - 单边吸附（left/right/top/bottom）或对角（tl/tr/bl/br）：
 *   贴边轴钉回视口对应边（如 right → x = vw - width），自由轴钳制进视口。
 */
export function clampSidebarFloat(
  pos: { x: number; y: number },
  edge: string,
  rect: FloatRect,
  vw: number,
  vh: number,
  keep = 48,
): { x: number; y: number } {
  const pinL = edge === 'left' || edge === 'tl' || edge === 'bl'
  const pinR = edge === 'right' || edge === 'tr' || edge === 'br'
  const pinT = edge === 'top' || edge === 'tl' || edge === 'tr'
  const pinB = edge === 'bottom' || edge === 'bl' || edge === 'br'
  let x = pos.x
  let y = pos.y
  if (pinL) x = 0
  else if (pinR) x = vw - rect.width
  else x = Math.max(-(rect.width - keep), Math.min(x, vw - keep))
  if (pinT) y = 0
  else if (pinB) y = vh - rect.height
  else y = Math.max(-(rect.height - keep), Math.min(y, vh - keep))
  return { x, y }
}

/**
 * 液态底栏（FloatingNavBar）重锚：navFloatPos 为「中心坐标」
 * （元素 CSS transform: translate(-50%,-50%)），故按半宽/半高钳制进视口。
 * docked（pos 为 null）由 CSS 贴底响应式接管，不在此处理。
 */
export function clampNavFloat(
  pos: { x: number; y: number },
  rect: FloatRect,
  vw: number,
  vh: number,
  keep = 24,
): { x: number; y: number } {
  const halfW = rect.width / 2
  const halfH = rect.height / 2
  return {
    x: Math.max(halfW + keep, Math.min(pos.x, vw - halfW - keep)),
    y: Math.max(halfH + keep, Math.min(pos.y, vh - halfH - keep)),
  }
}
