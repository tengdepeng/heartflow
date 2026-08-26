// ============================================================
// 平台抽象层
// 统一检测当前运行环境：Tauri 桌面端 / 浏览器 Web / PWA / 移动端
// ============================================================

/** 平台类型 */
export type PlatformType = 'tauri' | 'web' | 'pwa'

/** 操作系统 */
export type OSPlatform = 'windows' | 'macos' | 'linux' | 'ios' | 'android' | 'unknown'

/** 设备类型 */
export type DeviceType = 'desktop' | 'tablet' | 'mobile'

/** 平台能力接口（各端实现按需覆盖） */
export interface PlatformCapabilities {
  /** 文件系统：持久化读写 */
  fileSystem: boolean
  /** 原生文件对话框（打开/保存） */
  nativeFileDialog: boolean
  /** 原生通知 */
  nativeNotification: boolean
  /** 后台计时（页面不可见时继续运行） */
  backgroundTimer: boolean
  /** 触觉反馈 */
  hapticFeedback: boolean
  /** 原生剪贴板 */
  nativeClipboard: boolean
  /** 全局键盘快捷键 */
  globalShortcut: boolean
  /** 多窗口 */
  multiWindow: boolean
  /** 菜单栏 */
  menuBar: boolean
  /** 屏幕常亮 */
  screenKeepAwake: boolean
  /** 本地 AI 推理 */
  localAI: boolean
  /** Tauri 桥接能力：任何 @tauri-apps/* 调用前先判此，避免 Web/移动端 import 白屏 */
  tauriApi: boolean
  /** 右键/长按菜单可用（pointer:fine 设备；触屏为 false） */
  contextMenu: boolean
  /** :hover 稳定可用（hover:hover 设备；触屏为 false） */
  hover: boolean
  /** HTML5 draggable 稳定可用（pointer:fine；触屏不可靠为 false） */
  nativeDrag: boolean
}

/** 平台信息 */
export interface PlatformInfo {
  type: PlatformType
  os: OSPlatform
  device: DeviceType
  capabilities: PlatformCapabilities
  /** Tauri 版本号（仅 tauri 平台有） */
  tauriVersion?: string
  /** 是否为开发模式 */
  isDev: boolean
}

// ---- 内部检测缓存 ----
let _cached: PlatformInfo | null = null

// ---- Tauri 导入标记（动态 import，避免 web 端报错） ----
let _isTauri: boolean | null = null

/** 检测是否运行在 Tauri 环境 */
async function detectTauri(): Promise<boolean> {
  if (_isTauri !== null) return _isTauri
  try {
    // Tauri v2 通过 @tauri-apps/api 的 check 方式
    const { isTauri } = await import('@tauri-apps/api/core')
    _isTauri = typeof isTauri === 'function' ? isTauri() : !!isTauri
    return _isTauri
  } catch {
    _isTauri = false
    return false
  }
}

/** 检测是否在独立窗口的 PWA 模式下运行 */
function detectPWA(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as any)?.standalone === true
}

/** 检测 OS */
function detectOS(): OSPlatform {
  if (typeof navigator === 'undefined') return 'unknown'
  const ua = navigator.userAgent
  if (ua.includes('Windows')) return 'windows'
  if (ua.includes('Mac OS')) return 'macos'
  if (ua.includes('Linux')) return 'linux'
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'unknown'
}

/** 检测设备类型 */
function detectDevice(): DeviceType {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return 'desktop'
  const ua = navigator.userAgent
  if (/Mobi|Android|iPhone|iPad|iPod/.test(ua)) {
    // iPadOS 13+ 不再包含 "iPad" 字样，用触摸点数和屏幕尺寸判断
    if ('maxTouchPoints' in navigator && navigator.maxTouchPoints > 1) {
      if (window.innerWidth >= 768 && window.innerHeight >= 768) {
        return 'tablet'
      }
    }
    return 'mobile'
  }
  return 'desktop'
}

/** 检测是否为精确指针 + 可悬停设备（鼠标/触控板）；触屏设备返回 false */
function detectFinePointer(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches
}

/** 获取平台能力集 */
function getCapabilities(type: PlatformType, os: OSPlatform): PlatformCapabilities {
  // 非浏览器环境（测试/SSR）统一返回最小能力集
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      fileSystem: false,
      nativeFileDialog: false,
      nativeNotification: false,
      backgroundTimer: false,
      hapticFeedback: false,
      nativeClipboard: false,
      globalShortcut: false,
      multiWindow: false,
      menuBar: false,
      screenKeepAwake: false,
      localAI: false,
      tauriApi: false,
      contextMenu: false,
      hover: false,
      nativeDrag: false,
    }
  }

  // 基础能力：所有平台都有的
  const fine = detectFinePointer()
  const base: PlatformCapabilities = {
    fileSystem: false,
    nativeFileDialog: false,
    nativeNotification: 'Notification' in window,
    backgroundTimer: false,
    hapticFeedback: false,
    nativeClipboard: false,
    globalShortcut: false,
    multiWindow: false,
    menuBar: false,
    screenKeepAwake: false,
    localAI: false,
    tauriApi: false,
    contextMenu: fine,
    hover: fine,
    nativeDrag: fine,
  }

  if (type === 'tauri') {
    return {
      ...base,
      fileSystem: true,
      nativeFileDialog: true,
      nativeNotification: true,
      backgroundTimer: true,
      hapticFeedback: os === 'ios' || os === 'android',
      nativeClipboard: true,
      globalShortcut: true,
      multiWindow: true,
      menuBar: true,
      screenKeepAwake: true,
      localAI: os === 'macos', // Apple Intelligence
      tauriApi: true,
    }
  }

  if (type === 'pwa') {
    return {
      ...base,
      fileSystem: 'showDirectoryPicker' in window,
      nativeNotification: 'Notification' in window && 'serviceWorker' in navigator,
      backgroundTimer: 'serviceWorker' in navigator,
      hapticFeedback: os === 'ios' || os === 'android',
      nativeClipboard: 'clipboard' in navigator,
      screenKeepAwake: 'wakeLock' in navigator,
    }
  }

  // web (browser)
  return {
    ...base,
    nativeNotification: 'Notification' in window,
    nativeClipboard: 'clipboard' in navigator,
    hapticFeedback: os === 'ios' || os === 'android',
  }
}

/** 是否为开发模式 */
function detectDev(): boolean {
  if (typeof window === 'undefined') return false
  // Vite 开发服务器注入
  return import.meta.env?.DEV === true
    || window.location.hostname === 'localhost'
    || window.location.hostname === '127.0.0.1'
}

/**
 * 初始化并获取平台信息
 * 应在应用启动时调用一次，后续通过 getPlatform() 获取缓存
 */
export async function initPlatform(): Promise<PlatformInfo> {
  if (_cached) return _cached

  const isTauri = await detectTauri()
  const isPWA = !isTauri && detectPWA()
  const type: PlatformType = isTauri ? 'tauri' : isPWA ? 'pwa' : 'web'
  const os = detectOS()
  const device = detectDevice()

  _cached = {
    type,
    os,
    device,
    capabilities: getCapabilities(type, os),
    isDev: detectDev(),
  }

  return _cached
}

/** 获取已缓存平台信息（必须在 initPlatform 之后调用） */
export function getPlatform(): PlatformInfo {
  if (!_cached) {
    // 兜底：同步构造一个基础检测（非 Tauri 环境）
    const os = detectOS()
    const device = detectDevice()
    const type: PlatformType = detectPWA() ? 'pwa' : 'web'
    _cached = {
      type,
      os,
      device,
      capabilities: getCapabilities(type, os),
      isDev: detectDev(),
    }
  }
  return _cached
}

/** 便捷方法：当前是否为 Tauri 桌面端 */
export function isTauri(): boolean {
  return getPlatform().type === 'tauri'
}

/**
 * @deprecated 此函数仅表征「设备形态」（基于 UA），不参与布局决策。
 * 布局断点请用 useBreakpoint()（视口 640/1024 真源）。
 */
export function isDeviceMobile(): boolean {
  return getPlatform().device === 'mobile'
}

/**
 * @deprecated 此函数仅表征「设备形态」（基于 UA），不参与布局决策。
 * 布局断点请用 useBreakpoint()（视口 640/1024 真源）。
 */
export function isDeviceTablet(): boolean {
  return getPlatform().device === 'tablet'
}

/**
 * @deprecated 此函数仅表征「设备形态」（基于 UA），不参与布局决策。
 * 布局断点请用 useBreakpoint()（视口 640/1024 真源）。
 */
export function isDeviceDesktop(): boolean {
  return getPlatform().device === 'desktop'
}

/** 便捷方法：当前平台是否支持某能力 */
export function hasCapability(cap: keyof PlatformCapabilities): boolean {
  return getPlatform().capabilities[cap]
}

/**
 * 触发触觉反馈（振动）
 * 受宪法合规覆盖 control：当 complianceOverride.hapticFeedbackOverwrite = true 时启用。
 * 为避免 utils 层反向依赖 engine（storage），由调用方传入 enabled 标志。
 * 强度：'light' = 15ms, 'medium' = 30ms
 */
export function triggerHaptic(
  intensity: 'light' | 'medium' = 'light',
  enabled: boolean = true,
) {
  try {
    if (!enabled) return
    if (navigator.vibrate) {
      const duration = intensity === 'light' ? 15 : 30
      navigator.vibrate(duration)
    }
  } catch {
    // 静默失败：不影响用户体验
  }
}
