// ============================================================
// useDesktopSilentOverlay 单元测试
// 覆盖：宪法 fail-closed 门控、平台降级、用户显式开关、后端失败兜底
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

// 宪法 elastic-sanctuary（sanctuary:enable）开关：需为 Vue ref 供 mock 返回并供测试翻转。
// 置于顶层——模块加载后即初始化，而 vi.mock 工厂在动态导入时才被调用，可安全引用。
const sanctuaryEnabledRef = ref(true)
// 平台检测亦用 ref 支撑，使组合式内的 computed 能随测试翻转而重算（真实环境平台不变）。
const isMobileRef = ref(false)

// 其余共享模拟对象放入 hoisted（不依赖任何 import，避免 TDZ）。
const hoisted = vi.hoisted(() => {
  // 捕获前端 subscribe 的锁屏回调，供测试模拟后端广播。
  const handlerStore: { handler: ((locked: boolean) => void) | null } = { handler: null }
  return {
    handlerStore,
    openOverlayWindow: vi.fn(
      async (
        _color: string,
        _opacity: number,
        _form?: string,
        _glow?: string,
        _showBeacon?: boolean,
        _showHint?: boolean,
        _glowIntensity?: number,
      ): Promise<{ success: boolean; error?: string }> => ({
        success: true,
      }),
    ),
    closeOverlayWindow: vi.fn(async (): Promise<{ success: boolean; error?: string }> => ({
      success: true,
    })),
    // 订阅成功后记录 handler，并返回可取消函数（data）。
    listenSessionLock: vi.fn(
      async (handler: (locked: boolean) => void): Promise<{ success: boolean; data?: () => void; error?: string }> => {
        handlerStore.handler = handler
        return { success: true, data: () => {} }
      },
    ),
    startSessionLockMonitor: vi.fn(async (): Promise<{ success: boolean; error?: string }> => ({
      success: true,
    })),
    getKV: vi.fn((_k: string, def: unknown) => def),
    setKV: vi.fn((_k: string, _v: unknown) => {}),
  }
})

vi.mock('../../../composables/useConstitutionEffect', () => ({
  useRuleEnabled: () => ({ isEnabled: sanctuaryEnabledRef, rule: ref(null) }),
}))

vi.mock('../../../utils/platform', () => ({
  hasCapability: (cap: string) => (cap === 'multiWindow' ? !isMobileRef.value : true),
}))

vi.mock('../../../engine/tauri-bridge', () => ({
  openOverlayWindow: (
    color: string,
    opacity: number,
    form?: string,
    glow?: string,
    showBeacon?: boolean,
    showHint?: boolean,
    glowIntensity?: number,
  ) => hoisted.openOverlayWindow(color, opacity, form, glow, showBeacon, showHint, glowIntensity),
  closeOverlayWindow: () => hoisted.closeOverlayWindow(),
  listenSessionLock: (handler: (locked: boolean) => void) => hoisted.listenSessionLock(handler),
  startSessionLockMonitor: () => hoisted.startSessionLockMonitor(),
}))

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: (k: string, def: unknown) => hoisted.getKV(k, def),
    setKV: (k: string, v: unknown) => hoisted.setKV(k, v),
  },
}))

import {
  useDesktopSilentOverlay,
  __resetLockListenerState,
  OVERLAY_FORM_KEY,
  OVERLAY_SHOW_BEACON_KEY,
  OVERLAY_SHOW_HINT_KEY,
  OVERLAY_GLOW_INTENSITY_KEY,
} from '../useDesktopSilentOverlay'
import type { OverlayForm } from '../useDesktopSilentOverlay'

// 单一实例（watch 挂在 shouldBeOpen 上，重复调用 useDesktopSilentOverlay 不会造成双重开合）
const overlay = useDesktopSilentOverlay()

beforeEach(() => {
  // 重置 mock 调用记录与返回值
  hoisted.openOverlayWindow.mockClear()
  hoisted.closeOverlayWindow.mockClear()
  hoisted.getKV.mockClear()
  hoisted.setKV.mockClear()
  hoisted.openOverlayWindow.mockResolvedValue({ success: true })
  hoisted.closeOverlayWindow.mockResolvedValue({ success: true })
  hoisted.getKV.mockImplementation((_k: string, def: unknown) => def)

  // 重置锁屏监听 mock：先清调用计数，再还原「捕获 handler」实现
  // （避免上个测试用 mockResolvedValue 覆盖实现后残留，导致后续测试拿不到 handler）
  hoisted.listenSessionLock.mockClear()
  hoisted.startSessionLockMonitor.mockClear()
  hoisted.listenSessionLock.mockImplementation(
    async (handler: (locked: boolean) => void) => {
      hoisted.handlerStore.handler = handler
      return { success: true, data: () => {} }
    },
  )
  hoisted.handlerStore.handler = null
  // 重置模块级单例的「监听已启动」标记，避免跨测试残留导致不重新订阅
  __resetLockListenerState()

  // 重置组合式单例状态（通过返回的 ref，无需 resetModules）
  sanctuaryEnabledRef.value = true
  isMobileRef.value = false
  overlay.userWantsOverlay.value = false
  overlay.lockModeWantsOverlay.value = false
  overlay.sessionLocked.value = false
  overlay.isWindowOpen.value = false
  overlay.lastError.value = null
  overlay.overlayForm.value = 'silent'
  overlay.showBeacon.value = true
  overlay.showHint.value = true
  overlay.glowIntensity.value = 1.0
  overlay.mobileOverlayVisible.value = false
})

describe('useDesktopSilentOverlay · fail-closed 门控', () => {
  it('宪法关闭（sanctuary:enable 未启用）时禁止开启，且不调用后端', async () => {
    sanctuaryEnabledRef.value = false
    expect(overlay.isAllowed.value).toBe(false)

    const ok = await overlay.enable()
    expect(ok).toBe(false)
    expect(hoisted.openOverlayWindow).not.toHaveBeenCalled()
    expect(overlay.userWantsOverlay.value).toBe(false)
    expect(overlay.lastError.value).toContain('安全岛')
  })

  it('移动端（isMobile）降级：不调用原生窗口，改由应用内浮层显示（平台只选机制）', async () => {
    isMobileRef.value = true
    // 宪法开启即允许；平台不再拦截开关，只决定「用什么渲染」
    expect(overlay.isAllowed.value).toBe(true)
    expect(overlay.canUseNativeWindow.value).toBe(false)

    const ok = await overlay.enable()
    expect(ok).toBe(true)
    expect(hoisted.openOverlayWindow).not.toHaveBeenCalled() // 移动端不走原生窗口
    expect(overlay.isWindowOpen.value).toBe(true)
    expect(overlay.mobileOverlayVisible.value).toBe(true) // 应用内浮层可见
  })

  it('移动端：宪法关闭（sanctuary:enable 未启用）仍 fail-closed 禁止开启', async () => {
    isMobileRef.value = true
    sanctuaryEnabledRef.value = false
    expect(overlay.isAllowed.value).toBe(false)

    const ok = await overlay.enable()
    expect(ok).toBe(false)
    expect(hoisted.openOverlayWindow).not.toHaveBeenCalled()
    expect(overlay.mobileOverlayVisible.value).toBe(false)
  })
})

describe('useDesktopSilentOverlay · 用户显式开关', () => {
  it('开启：调用 openOverlayWindow（携带底色/不透明度）并持久化偏好', async () => {
    expect(overlay.isAllowed.value).toBe(true)

    const ok = await overlay.enable()
    expect(ok).toBe(true)
    expect(hoisted.openOverlayWindow).toHaveBeenCalledTimes(1)
    expect(hoisted.openOverlayWindow).toHaveBeenCalledWith(
      overlay.overlayColor,
      overlay.overlayOpacity,
      'silent',
      '#d8a866',
      true,
      true,
      1.0,
    )
    expect(overlay.isWindowOpen.value).toBe(true)
    expect(overlay.userWantsOverlay.value).toBe(true)
    expect(hoisted.setKV).toHaveBeenCalledWith('sanctuary_desktop_silent_overlay', true)
  })

  it('关闭：调用 closeOverlayWindow 并清除偏好', async () => {
    await overlay.enable()
    expect(overlay.isWindowOpen.value).toBe(true)

    const ok = await overlay.disable()
    expect(ok).toBe(true)
    expect(hoisted.closeOverlayWindow).toHaveBeenCalledTimes(1)
    expect(overlay.isWindowOpen.value).toBe(false)
    expect(overlay.userWantsOverlay.value).toBe(false)
    expect(hoisted.setKV).toHaveBeenCalledWith('sanctuary_desktop_silent_overlay', false)
  })

  it('toggle 在开 / 关之间切换窗口状态', async () => {
    expect(overlay.userWantsOverlay.value).toBe(false)

    await overlay.toggle()
    expect(overlay.userWantsOverlay.value).toBe(true)
    expect(overlay.isWindowOpen.value).toBe(true)

    await overlay.toggle()
    expect(overlay.userWantsOverlay.value).toBe(false)
    expect(overlay.isWindowOpen.value).toBe(false)
  })
})

describe('useDesktopSilentOverlay · 覆盖形态（B2-EXT-1）', () => {
  it('默认形态为 silent，且提供 3 种可选形态', () => {
    expect(overlay.overlayForm.value).toBe('silent')
    expect(overlay.overlayForms.length).toBe(3)
  })

  it('setForm 更新偏好并持久化到 KV', async () => {
    await overlay.setForm('breath')
    expect(overlay.overlayForm.value).toBe('breath')
    expect(hoisted.setKV).toHaveBeenCalledWith(OVERLAY_FORM_KEY, 'breath')
  })

  it('开启时把当前形态 + 辉光透传给 openOverlayWindow', async () => {
    await overlay.setForm('timeline')
    await overlay.enable()
    expect(hoisted.openOverlayWindow).toHaveBeenCalledWith(
      overlay.overlayColor,
      overlay.overlayOpacity,
      'timeline',
      '#9bb4d8',
      true,
      true,
      1.0,
    )
  })

  it('窗口已开时 setForm 重建窗口以应用新形态（先关后开）', async () => {
    await overlay.enable()
    expect(hoisted.openOverlayWindow).toHaveBeenCalledTimes(1)

    hoisted.openOverlayWindow.mockClear()
    hoisted.closeOverlayWindow.mockClear()

    await overlay.setForm('breath')
    expect(hoisted.closeOverlayWindow).toHaveBeenCalledTimes(1)
    expect(hoisted.openOverlayWindow).toHaveBeenCalledTimes(1)
    expect(hoisted.openOverlayWindow).toHaveBeenCalledWith(
      overlay.overlayColor,
      overlay.overlayOpacity,
      'breath',
      '#7fae9b',
      true,
      true,
      1.0,
    )
  })

  it('非法形态被忽略（保持原值、不写 KV）', async () => {
    const bad = 'nope' as unknown as OverlayForm
    await overlay.setForm(bad)
    expect(overlay.overlayForm.value).toBe('silent')
    expect(hoisted.setKV).not.toHaveBeenCalledWith(OVERLAY_FORM_KEY, 'nope')
  })
})

describe('useDesktopSilentOverlay · 后端失败兜底', () => {
  it('后端开启失败：记录错误且不置为已打开（但保留用户意图）', async () => {
    hoisted.openOverlayWindow.mockResolvedValue({ success: false, error: '窗口创建失败' })

    const ok = await overlay.enable()
    expect(ok).toBe(false)
    expect(overlay.isWindowOpen.value).toBe(false)
    expect(overlay.lastError.value).toContain('窗口创建失败')
    expect(overlay.userWantsOverlay.value).toBe(true)
  })
})

describe('useDesktopSilentOverlay · 锁屏模式（仅锁屏时显示）', () => {
  it('开启锁屏模式：订阅事件 + 请后端启动监听，但锁屏前窗口不打开', async () => {
    expect(overlay.isAllowed.value).toBe(true)

    const ok = await overlay.enableLockMode()
    expect(ok).toBe(false) // 尚未锁屏，窗口未开
    expect(overlay.isWindowOpen.value).toBe(false)
    expect(overlay.lockModeWantsOverlay.value).toBe(true)
    expect(hoisted.setKV).toHaveBeenCalledWith('sanctuary_desktop_silent_overlay_lockmode', true)
    expect(hoisted.listenSessionLock).toHaveBeenCalledTimes(1)
    expect(hoisted.startSessionLockMonitor).toHaveBeenCalledTimes(1)
  })

  it('锁屏事件驱动：locked=true 开窗，locked=false 关窗', async () => {
    await overlay.enableLockMode()
    expect(overlay.isWindowOpen.value).toBe(false)

    // 模拟后端广播「已锁屏」
    const handler = hoisted.handlerStore.handler
    expect(handler).toBeTypeOf('function')
    handler!(true)
    expect(overlay.sessionLocked.value).toBe(true)
    await overlay.applyState() // 收敛窗口（watch 亦会触发，这里显式保证确定性）
    expect(overlay.isWindowOpen.value).toBe(true)
    expect(hoisted.openOverlayWindow).toHaveBeenCalledTimes(1)

    // 模拟「已解锁」
    handler!(false)
    expect(overlay.sessionLocked.value).toBe(false)
    await overlay.applyState()
    expect(overlay.isWindowOpen.value).toBe(false)
    expect(hoisted.closeOverlayWindow).toHaveBeenCalledTimes(1)
  })

  it('锁屏模式：宪法关闭时禁止开启（不订阅、不启动后端）', async () => {
    sanctuaryEnabledRef.value = false
    expect(overlay.isAllowed.value).toBe(false)

    const ok = await overlay.enableLockMode()
    expect(ok).toBe(false)
    expect(overlay.lockModeWantsOverlay.value).toBe(false)
    expect(hoisted.listenSessionLock).not.toHaveBeenCalled()
    expect(hoisted.startSessionLockMonitor).not.toHaveBeenCalled()
  })

  it('锁屏模式：订阅失败时优雅降级（保留意图、不崩溃）', async () => {
    hoisted.listenSessionLock.mockResolvedValue({ success: false, error: 'no tauri' })

    const ok = await overlay.enableLockMode()
    expect(ok).toBe(false)
    // 意图仍被保留（用户偏好落地），仅 OS 监听不可用
    expect(overlay.lockModeWantsOverlay.value).toBe(true)
    expect(hoisted.startSessionLockMonitor).not.toHaveBeenCalled()
    expect(overlay.isWindowOpen.value).toBe(false)
  })

  it('关闭锁屏模式：清除意图并关窗（若已开）', async () => {
    await overlay.enableLockMode()
    const handler = hoisted.handlerStore.handler!
    handler!(true)
    await overlay.applyState()
    expect(overlay.isWindowOpen.value).toBe(true)

    const ok = await overlay.disableLockMode()
    expect(ok).toBe(true)
    expect(overlay.lockModeWantsOverlay.value).toBe(false)
    expect(hoisted.setKV).toHaveBeenCalledWith('sanctuary_desktop_silent_overlay_lockmode', false)
    expect(overlay.isWindowOpen.value).toBe(false)
  })
})

describe('useDesktopSilentOverlay · 覆盖内容（B2-EXT-2）', () => {
  it('默认内容偏好：报点/落款开启，辉光强度 1.0', () => {
    expect(overlay.showBeacon.value).toBe(true)
    expect(overlay.showHint.value).toBe(true)
    expect(overlay.glowIntensity.value).toBe(1.0)
  })

  it('setContent 更新并持久化报点/落款偏好', async () => {
    await overlay.setContent({ showBeacon: false, showHint: false })
    expect(overlay.showBeacon.value).toBe(false)
    expect(overlay.showHint.value).toBe(false)
    expect(hoisted.setKV).toHaveBeenCalledWith(OVERLAY_SHOW_BEACON_KEY, false)
    expect(hoisted.setKV).toHaveBeenCalledWith(OVERLAY_SHOW_HINT_KEY, false)
  })

  it('setContent 钳制辉光强度到 0~2', async () => {
    await overlay.setContent({ glowIntensity: 5 })
    expect(overlay.glowIntensity.value).toBe(2)
    await overlay.setContent({ glowIntensity: -3 })
    expect(overlay.glowIntensity.value).toBe(0)
    expect(hoisted.setKV).toHaveBeenCalledWith(OVERLAY_GLOW_INTENSITY_KEY, 2)
    expect(hoisted.setKV).toHaveBeenCalledWith(OVERLAY_GLOW_INTENSITY_KEY, 0)
  })

  it('开启时 setContent 重建窗口以应用新内容（先关后开，并透传内容）', async () => {
    await overlay.enable()
    hoisted.openOverlayWindow.mockClear()
    hoisted.closeOverlayWindow.mockClear()

    await overlay.setContent({ showBeacon: false, glowIntensity: 1.5 })
    expect(hoisted.closeOverlayWindow).toHaveBeenCalledTimes(1)
    expect(hoisted.openOverlayWindow).toHaveBeenCalledTimes(1)
    expect(hoisted.openOverlayWindow).toHaveBeenCalledWith(
      overlay.overlayColor,
      overlay.overlayOpacity,
      'silent',
      '#d8a866',
      false,
      true,
      1.5,
    )
  })

  it('rebuild=false 时仅改 ref/KV，不重建窗口（滑杆拖动预览）', async () => {
    await overlay.enable()
    hoisted.openOverlayWindow.mockClear()
    hoisted.closeOverlayWindow.mockClear()

    await overlay.setContent({ glowIntensity: 0.5 }, false)
    expect(overlay.glowIntensity.value).toBe(0.5)
    expect(hoisted.setKV).toHaveBeenCalledWith(OVERLAY_GLOW_INTENSITY_KEY, 0.5)
    expect(hoisted.openOverlayWindow).not.toHaveBeenCalled()
    expect(hoisted.closeOverlayWindow).not.toHaveBeenCalled()
  })
})

describe('useDesktopSilentOverlay · 移动端应用内浮层（B2-EXT-3）', () => {
  it('移动端开启：原生窗口不调用，mobileOverlayVisible 驱动应用内浮层', async () => {
    isMobileRef.value = true
    const ok = await overlay.enable()
    expect(ok).toBe(true)
    expect(overlay.isWindowOpen.value).toBe(true)
    expect(overlay.mobileOverlayVisible.value).toBe(true)
    expect(hoisted.openOverlayWindow).not.toHaveBeenCalled()
    expect(hoisted.closeOverlayWindow).not.toHaveBeenCalled()
  })

  it('移动端关闭：仅隐藏应用内浮层，不调用原生桥', async () => {
    isMobileRef.value = true
    await overlay.enable()
    hoisted.openOverlayWindow.mockClear()
    hoisted.closeOverlayWindow.mockClear()

    const ok = await overlay.disable()
    expect(ok).toBe(true)
    expect(overlay.mobileOverlayVisible.value).toBe(false)
    expect(overlay.isWindowOpen.value).toBe(false)
    expect(hoisted.closeOverlayWindow).not.toHaveBeenCalled()
  })

  it('移动端内容偏好经应用内浮层驱动（不依赖原生窗口重建）', async () => {
    isMobileRef.value = true
    await overlay.enable()
    hoisted.openOverlayWindow.mockClear()

    await overlay.setContent({ showBeacon: false, glowIntensity: 1.8 })
    expect(hoisted.openOverlayWindow).not.toHaveBeenCalled()
    expect(overlay.showBeacon.value).toBe(false)
    expect(overlay.glowIntensity.value).toBe(1.8)
    expect(overlay.mobileOverlayVisible.value).toBe(true)
  })
})
