// ============================================================
// 殿堂触角 Composable
// 抽象桌面端（Tauri）触角能力，为 Web 端提供模拟入口
// ============================================================

import { storage } from '../engine/storage'
import { emitOsNotification } from '../engine/os-notification'
import { useDesktopSilentOverlay } from '../modules/sanctuary/useDesktopSilentOverlay'
import { isTauri, hasCapability } from '../utils/platform'

export function useDesktopTouchpoints() {
  // 检查是否在 Tauri 环境（统一走平台能力检测，避免裸 '__TAURI__'）
  const isTauriEnv = isTauri()

  /** 显示原生通知 */
  async function showNotification(title: string, body: string) {
    // 宪法第5条端到端 fail-closed：统一入口内部已门控 isOsNotificationBlocked。
    // 未授权（default）时尝试请求权限，授权后再经统一入口发射，避免绕过门控。
    if (Notification.permission === 'default') {
      try {
        await Notification.requestPermission()
      } catch {
        // 静默失败
      }
    }
    emitOsNotification({ title, options: { body, icon: '/favicon.ico' } })
  }

  /** 设置桌面快捷入口（仅 Tauri） */
  async function pinToDesktop() {
    if (hasCapability('tauriApi')) {
      try {
        const { openUrl } = await import('@tauri-apps/plugin-opener')
        await openUrl('https://heartflow.app')
      } catch {
        // 静默失败
      }
    }
  }

  /**
   * 设置锁屏光痕 —— 已接成「桌面静默覆盖」入口。
   * 持久化用户偏好（KV），并驱动桌面静默覆盖的开启/关闭。
   * 宪法门控（elastic-sanctuary）与平台降级（移动端）由 useDesktopSilentOverlay 内部
   * fail-closed 处理：宪法关闭或移动端时 enable() 自动失败、不打开窗口，绝不绕过宪法。
   */
  function setLockScreenGlow(enabled: boolean) {
    storage.setKV('hf:lock_screen_glow', enabled ? '1' : '0')
    const overlay = useDesktopSilentOverlay()
    if (enabled) void overlay.enable()
    else void overlay.disable()
  }

  function getLockScreenGlow(): boolean {
    return storage.getKV<string>('hf:lock_screen_glow', '0') === '1'
  }

  /** 设置幕僚问候浮窗（浮窗组件已经在 MirrorSelf 中实现） */
  function setGreetingFloating(enabled: boolean) {
    storage.setKV('hf:greeting_floating', enabled ? '1' : '0')
  }

  function getGreetingFloating(): boolean {
    return storage.getKV<string>('hf:greeting_floating', '1') !== '0'
  }

  /** 设置第三方美化覆盖层 */
  function setOverlayMode(mode: 'none' | 'minimal' | 'ambient') {
    storage.setKV('hf:overlay_mode', mode)
  }

  function getOverlayMode(): 'none' | 'minimal' | 'ambient' {
    return (storage.getKV<string>('hf:overlay_mode', 'none')) as 'none' | 'minimal' | 'ambient'
  }

  return {
    isTauri: isTauriEnv,
    showNotification,
    pinToDesktop,
    setLockScreenGlow,
    getLockScreenGlow,
    setGreetingFloating,
    getGreetingFloating,
    setOverlayMode,
    getOverlayMode,
  }
}