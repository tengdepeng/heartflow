import { describe, it, expect } from 'vitest'

/**
 * 悬浮侧栏吸附分档逻辑单测。
 * 复刻 App.vue onDragEnd 的四边独立判定（非取最近边），
 * 确保角落(tl/tr/bl/br)、单边(l/r/t/b)、自由(free) 分档正确。
 * 这样拖到左上/右上角会停角落，而不会强制吸附到正左/正右。
 */
const SNAP = 24

function classify(rect: { left: number; right: number; top: number; bottom: number }, vw: number, vh: number) {
  const distLeft = rect.left
  const distRight = vw - rect.right
  const distTop = rect.top
  const distBottom = vh - rect.bottom
  const snapL = distLeft <= SNAP
  const snapR = distRight <= SNAP
  const snapT = distTop <= SNAP
  const snapB = distBottom <= SNAP
  const hEdge = snapL ? 'left' : snapR ? 'right' : ''
  const vEdge = snapT ? 'top' : snapB ? 'bottom' : ''
  return hEdge && vEdge ? `${vEdge.charAt(0)}${hEdge.charAt(0)}`
    : hEdge ? hEdge
    : vEdge ? vEdge
    : 'free'
}

describe('sidebar float snap classification', () => {
  const vw = 1440
  const vh = 900

  // 注意：真实 onDragEnd 用「拖动末帧指针坐标 pos」算四边距离，而非 getBoundingClientRect()，
  // 后者在松手瞬间仍挂着旧 float-edge-* 类（如 left:0/top:50%）会读出被 CSS 拉偏的位置，
  // 导致「一松手自动回缩左上角」。以下 classify() 复刻纯坐标逻辑。

  it('左上角 → tl', () => {
    expect(classify({ left: 0, right: 220, top: 0, bottom: 300 }, vw, vh)).toBe('tl')
  })

  it('右上角 → tr', () => {
    expect(classify({ left: 1220, right: 1440, top: 0, bottom: 300 }, vw, vh)).toBe('tr')
  })

  it('左下角 → bl', () => {
    expect(classify({ left: 0, right: 220, top: 600, bottom: 900 }, vw, vh)).toBe('bl')
  })

  it('右下角 → br', () => {
    expect(classify({ left: 1220, right: 1440, top: 600, bottom: 900 }, vw, vh)).toBe('br')
  })

  it('仅贴左（y 在中部）→ left', () => {
    expect(classify({ left: 0, right: 220, top: 400, bottom: 700 }, vw, vh)).toBe('left')
  })

  it('仅贴右 → right', () => {
    expect(classify({ left: 1220, right: 1440, top: 400, bottom: 700 }, vw, vh)).toBe('right')
  })

  it('仅贴顶（x 在中部）→ top', () => {
    expect(classify({ left: 600, right: 820, top: 0, bottom: 300 }, vw, vh)).toBe('top')
  })

  it('仅贴底 → bottom', () => {
    expect(classify({ left: 600, right: 820, top: 600, bottom: 900 }, vw, vh)).toBe('bottom')
  })

  it('距所有边都远 → free', () => {
    expect(classify({ left: 500, right: 720, top: 350, bottom: 650 }, vw, vh)).toBe('free')
  })

  it('贴左但未进顶阈值（顶部留 50px）→ left（非 tl）', () => {
    expect(classify({ left: 0, right: 220, top: 50, bottom: 350 }, vw, vh)).toBe('left')
  })

  it('靠近边但未达阈值（30px）→ free', () => {
    expect(classify({ left: 30, right: 250, top: 30, bottom: 330 }, vw, vh)).toBe('free')
  })

  it('拖到视口正中（远离所有边）→ free 不回缩', () => {
    // 复现「一松手自动回缩左上角」bug 的反例：用指针坐标 pos 而非被 CSS 污染的 rect
    const mid = { left: 600, right: 820, top: 350, bottom: 650 }
    expect(classify(mid, vw, vh)).toBe('free')
  })
})
