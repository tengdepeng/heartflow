// 验证底部悬浮栏 ≡ 与侧边悬浮窗的交互链路（用户需求四条）：
// 1) 点 ≡ 调出 / 再点隐藏
// 2) 侧栏可拖到任意位置（sidebarFloatPos 持久）
// 3) 无操作 → chrome-hidden → 吸附最近边框并完全隐藏
// 4) 对侧栏操作（poke）→ 在原位置（sidebarFloatPos）出现，不回边框隐藏
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useChromeAutoHide } from '../modules/customization/useChromeAutoHide'
import { useAppearance } from '../modules/customization/useAppearance'

// 复位「显式展开常驻」标志（模块级单例，避免用例间串扰）
const { setSidebarPinned: _resetPinned } = useChromeAutoHide()

const {
  sidebarCollapsed,
  setSidebarCollapsed,
  sidebarFloatPos,
  setSidebarFloatPos,
  sidebarFloatEdge,
  setSidebarFloatEdge,
} = useAppearance()

// 模拟 onToggleSidebar 的真实实现（见 App.vue onToggleSidebar）
function onToggleSidebar(pokeSidebar: () => void, setSidebarPinned?: (v: boolean) => void) {
  const next = !sidebarCollapsed.value
  setSidebarCollapsed(next)
  if (setSidebarPinned) setSidebarPinned(!next) // 展开即 pinned，收起即 unpin
  if (!next) pokeSidebar() // 调出时唤醒无操作隐藏
}

describe('底部悬浮栏 ≡ 与侧边悬浮窗交互链路', () => {
  beforeEach(() => {
    // 复位模块级单例状态
    setSidebarCollapsed(false)
    setSidebarFloatPos(null)
    setSidebarFloatEdge('left')
    _resetPinned(false)
    vi.useRealTimers()
    localStorage.clear()
  })

  it('① 点 ≡ 调出、再点隐藏（toggle 侧栏显隐）', () => {
    const { sidebarAutoHidden, pokeSidebar, setSidebarPinned } = useChromeAutoHide()
    // 初始：显示态
    expect(sidebarCollapsed.value).toBe(false)
    expect(sidebarAutoHidden.value).toBe(false)

    // 第一次点击 ≡ → 隐藏（用户主动收起）
    onToggleSidebar(pokeSidebar, setSidebarPinned)
    expect(sidebarCollapsed.value).toBe(true)

    // 第二次点击 ≡ → 调出（且 pokeSidebar 唤醒无操作隐藏）
    onToggleSidebar(pokeSidebar, setSidebarPinned)
    expect(sidebarCollapsed.value).toBe(false)
    expect(sidebarAutoHidden.value).toBe(false)
  })

  it('② 侧栏可拖到任意位置并持久化（sidebarFloatPos）', () => {
    const pos = { x: 640, y: 360 }
    setSidebarFloatPos(pos)
    expect(sidebarFloatPos.value).toEqual(pos)
  })

  it('③ 无操作 → sidebarAutoHidden → 完全隐藏（吸附边框）', async () => {
    vi.useFakeTimers()
    const { sidebarAutoHidden, pokeSidebar } = useChromeAutoHide()
    // 启动侧栏空闲计时并立即可见
    pokeSidebar()
    expect(sidebarAutoHidden.value).toBe(false)
    // 快进超过 autoHideDelay（默认 4000ms）
    await vi.advanceTimersByTimeAsync(5000)
    expect(sidebarAutoHidden.value).toBe(true)
    vi.useRealTimers()
  })

  it('④ 对侧栏操作（pokeSidebar）→ 在原位置出现，不回边框隐藏', async () => {
    vi.useFakeTimers()
    const { sidebarAutoHidden, pokeSidebar } = useChromeAutoHide()
    // 先把侧栏拖到任意位置（自由坐标）
    const pos = { x: 640, y: 360 }
    setSidebarFloatPos(pos)
    setSidebarFloatEdge('free')

    // 无操作进入隐藏
    pokeSidebar()
    await vi.advanceTimersByTimeAsync(5000)
    expect(sidebarAutoHidden.value).toBe(true)

    // 对侧栏操作：pokeSidebar 唤醒
    pokeSidebar()
    expect(sidebarAutoHidden.value).toBe(false)
    // 唤醒后在原位置（sidebarFloatPos 仍在，非 null → 不回边框吸附隐藏态）
    expect(sidebarFloatPos.value).toEqual(pos)
    vi.useRealTimers()
  })

  it('⑤ 吸附最近边框：贴右时 edge=right，隐藏向右滑出', () => {
    setSidebarFloatEdge('right')
    setSidebarFloatPos(null) // 吸附态（无自由坐标）
    expect(sidebarFloatEdge.value).toBe('right')
    expect(sidebarFloatPos.value).toBeNull()
  })

  it('⑥ 显式展开（pinned）后不自动收起：空闲计时不再置 sidebarAutoHidden', async () => {
    vi.useFakeTimers()
    const { sidebarAutoHidden, pokeSidebar, setSidebarPinned } = useChromeAutoHide()
    // 用户点 ≡ 展开 → pinned（侧栏保持常驻）
    setSidebarPinned(true)
    pokeSidebar()
    expect(sidebarAutoHidden.value).toBe(false)
    // 即使空闲超时，pinned 侧栏不自动收起
    await vi.advanceTimersByTimeAsync(5000)
    expect(sidebarAutoHidden.value).toBe(false)
    // 用户再次收起 → unpin → 恢复空闲自动隐藏
    setSidebarPinned(false)
    pokeSidebar()
    await vi.advanceTimersByTimeAsync(5000)
    expect(sidebarAutoHidden.value).toBe(true)
    vi.useRealTimers()
  })
})
