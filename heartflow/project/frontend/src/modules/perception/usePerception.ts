/**
 * 感知层 · 采集器
 *
 * 纯前端实现（Web + Tauri webview 共用），零后端改动、零现有功能回归风险。
 * 为每个信号做 feature-detect，拿不到就填默认值 / null，绝不抛错或阻断渲染。
 *
 * 采集信号：
 *  - 时段：Date（始终可用）
 *  - 暗色：matchMedia('(prefers-color-scheme: dark)') + change 事件
 *  - 网络：navigator.onLine + online/offline 事件
 *  - 电量/充电：navigator.getBattery()（部分浏览器弃用，拿不到 → null）
 *  - 设备闲置：mousemove/keydown/visibilitychange 计时 + tick
 *  - 环境光：AmbientLightSensor API（Chrome/Edge 专属，不可用 → null）
 *  - 屏幕常亮：visibilitychange + wakeLock 感知（被动检测，不主动获取锁）
 *  - Tauri 系统状态：活跃窗口/系统主题/系统级电量/系统闲置（仅 Tauri 环境，10s 轮询，经 tauri-bridge.getSystemState → cmd_get_system_state）
 *  - activeApp / activeWindowTitle：Tauri 下由前台窗口标题派生填充（蓝图第995行系统级感知层语义：本应用上下文内的活跃位置）；web 恒 null 降级
 *  - isFocusing：由 runtime 圣所状态等权威来源派生，默认值 false
 */

import { isTauri } from '../../utils/platform'
import { getSystemState } from '../../engine/tauri-bridge'
import {
  type EnvironmentState,
  type PerceptionSource,
  type TimeOfDay,
  timeOfDayFromHour,
  createDefaultEnvironmentState,
  deriveActiveApp,
  DEFAULT_IDLE_THRESHOLD_MS,
  DEFAULT_LOW_POWER_LEVEL,
  PERCEPTION_TICK_MS,
} from './types'

/** 订阅回调类型 */
export type PerceptionListener = (state: EnvironmentState) => void

export function usePerception() {
  const source: PerceptionSource = isTauri() ? 'tauri' : 'web'

  let env: EnvironmentState = createDefaultEnvironmentState(source)

  // ---- 监听器 ----
  const listeners = new Set<PerceptionListener>()
  let running = false

  // ---- 原生句柄（用于卸载） ----
  let darkMedia: MediaQueryList | null = null
  let darkApply: (() => void) | null = null
  let batteryHandlers: Array<() => void> = []
  let tickTimer: ReturnType<typeof setInterval> | null = null
  let tauriPollTimer: ReturnType<typeof setInterval> | null = null
  let lastActivityTs = Date.now()
  let boundActivityHandlers: Array<{ type: string; fn: EventListener }> = []
  let ambientLightSensor: any = null
  let visibilityHandler: (() => void) | null = null

  // ---- 工具 ----
  function emit() {
    env = { ...env, lastUpdated: Date.now() }
    listeners.forEach((fn) => fn(env))
  }

  function readHourAndTimeOfDay() {
    const hour = new Date().getHours()
    const timeOfDay: TimeOfDay = timeOfDayFromHour(hour)
    return { hour, timeOfDay }
  }

  // ---- 各信号采集 ----

  function setupDarkMode() {
    if (typeof window === 'undefined' || !window.matchMedia) return
    darkMedia = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      env = { ...env, isDark: darkMedia ? darkMedia.matches : false }
      emit()
    }
    darkApply = apply
    // 兼容旧浏览器（无 addEventListener 的 MediaQueryList）
    if (darkMedia.addEventListener) {
      darkMedia.addEventListener('change', apply)
    } else if ((darkMedia as any).addListener) {
      ;(darkMedia as any).addListener(apply)
    }
    apply()
  }

  function setupNetwork() {
    if (typeof navigator === 'undefined') return
    const apply = () => {
      env = { ...env, isOnline: navigator.onLine !== false }
      emit()
    }
    window.addEventListener('online', apply)
    window.addEventListener('offline', apply)
    apply()
  }

  function setupBattery() {
    const nav: any = typeof navigator !== 'undefined' ? navigator : null
    if (!nav || typeof nav.getBattery !== 'function') {
      // 不可用 → 保持 null，不进入低电量逻辑
      env = { ...env, batteryLevel: null, isCharging: null, isLowPower: false }
      emit()
      return
    }
    nav.getBattery().then((b: any) => {
      const apply = () => {
        const level = typeof b.level === 'number' ? b.level : null
        const charging = typeof b.charging === 'boolean' ? b.charging : null
        const isLowPower = level !== null && charging === false && level <= DEFAULT_LOW_POWER_LEVEL
        env = { ...env, batteryLevel: level, isCharging: charging, isLowPower }
        emit()
      }
      apply()
      if (b.addEventListener) {
        b.addEventListener('levelchange', apply)
        b.addEventListener('chargingchange', apply)
        batteryHandlers.push(() => {
          b.removeEventListener('levelchange', apply)
          b.removeEventListener('chargingchange', apply)
        })
      }
    }).catch(() => {
      // 权限被拒等 → 保持 null
      env = { ...env, batteryLevel: null, isCharging: null, isLowPower: false }
      emit()
    })
  }

  function onActivity() {
    lastActivityTs = Date.now()
  }

  function setupIdleTracking() {
    const events: Array<{ type: string; fn: EventListener }> = [
      { type: 'mousemove', fn: onActivity as EventListener },
      { type: 'keydown', fn: onActivity as EventListener },
      { type: 'visibilitychange', fn: onActivity as EventListener },
    ]
    events.forEach(({ type, fn }) => {
      window.addEventListener(type, fn, { passive: true })
    })
    boundActivityHandlers = events
  }

  function recalcIdle() {
    const idle = Date.now() - lastActivityTs
    const wasIdle = env.isUserIdle
    const isUserIdle = idle > DEFAULT_IDLE_THRESHOLD_MS
    if (idle !== env.deviceIdleMs || isUserIdle !== wasIdle) {
      env = { ...env, deviceIdleMs: idle, isUserIdle }
      emit()
    }
  }

  // ---- P2 增强信号采集 ----

  function setupAmbientLight() {
    if (typeof window === 'undefined') return
    try {
      const SensorClass = (window as any).AmbientLightSensor
      if (!SensorClass) {
        env = { ...env, ambientLight: null }
        return
      }
      ambientLightSensor = new SensorClass()
      ambientLightSensor.addEventListener('reading', () => {
        env = { ...env, ambientLight: ambientLightSensor.illuminance }
        emit()
      })
      ambientLightSensor.addEventListener('error', () => {
        env = { ...env, ambientLight: null }
        emit()
      })
      ambientLightSensor.start()
    } catch {
      env = { ...env, ambientLight: null }
    }
  }

  function setupScreenAwake() {
    if (typeof window === 'undefined') return
    const apply = () => {
      const awake = document.visibilityState === 'visible'
      if (awake !== env.isScreenAwake) {
        env = { ...env, isScreenAwake: awake }
        emit()
      }
    }
    visibilityHandler = apply
    document.addEventListener('visibilitychange', apply, { passive: true })
    apply()
  }

  function setupTauriSystemPoll() {
    if (source !== 'tauri') return
    const poll = async () => {
      try {
        const result = await getSystemState()
        if (!result.success || !result.data) return
        const s = result.data
        let changed = false

        if (s.active_window_title !== env.activeWindowTitle) {
          env = { ...env, activeWindowTitle: s.active_window_title }
          changed = true
        }
        // 应用内 webview 能得到的"前台应用"信号即当前窗口标题；
        // 统一以窗口标题派生 activeApp（蓝图第995行系统级感知层语义：在本应用上下文内的活跃位置）。
        const derivedActiveApp = deriveActiveApp(s.active_window_title)
        if (derivedActiveApp !== env.activeApp) {
          env = { ...env, activeApp: derivedActiveApp }
          changed = true
        }
        if (s.system_theme !== null && s.system_theme !== env.systemTheme) {
          env = { ...env, systemTheme: s.system_theme }
          changed = true
        }
        // Tauri 系统级电量数据更可靠，覆盖 web getBattery 的值
        if (s.battery_level !== null) {
          const isLowPower = !s.battery_charging && s.battery_level <= DEFAULT_LOW_POWER_LEVEL
          if (env.batteryLevel !== s.battery_level || env.isCharging !== s.battery_charging || env.isLowPower !== isLowPower) {
            env = { ...env, batteryLevel: s.battery_level, isCharging: s.battery_charging, isLowPower }
            changed = true
          }
        }
        // Tauri 系统级空闲时间更精确，覆盖前端计时
        if (s.system_idle_ms !== env.deviceIdleMs) {
          env = { ...env, deviceIdleMs: s.system_idle_ms, isUserIdle: s.system_idle_ms > DEFAULT_IDLE_THRESHOLD_MS }
          changed = true
        }
        if (changed) emit()
      } catch {
        // Tauri 命令不可用 → 静默降级，不影响前端采集
      }
    }
    poll()
    tauriPollTimer = setInterval(poll, 10_000)
  }

  function tick() {
    const { hour, timeOfDay } = readHourAndTimeOfDay()
    recalcIdle()
    // 时段也可能跨点变化
    if (hour !== env.hour || timeOfDay !== env.timeOfDay) {
      env = { ...env, hour, timeOfDay }
      emit()
    }
  }

  // ---- 生命周期 ----

  function start() {
    if (running) return
    running = true
    setupDarkMode()
    setupNetwork()
    setupBattery()
    setupIdleTracking()
    setupAmbientLight()
    setupScreenAwake()
    setupTauriSystemPoll()
    tick()
    tickTimer = setInterval(tick, PERCEPTION_TICK_MS)
  }

  function stop() {
    if (!running) return
    running = false
    if (tickTimer) {
      clearInterval(tickTimer)
      tickTimer = null
    }
    if (tauriPollTimer) {
      clearInterval(tauriPollTimer)
      tauriPollTimer = null
    }
    if (darkMedia && darkApply) {
      const remove = (darkMedia as any).removeEventListener || (darkMedia as any).removeListener
      if (remove) remove.call(darkMedia, 'change', darkApply)
      darkApply = null
    }
    batteryHandlers.forEach((off) => off())
    batteryHandlers = []
    boundActivityHandlers.forEach(({ type, fn }) => window.removeEventListener(type, fn))
    boundActivityHandlers = []
    if (ambientLightSensor) {
      try { ambientLightSensor.stop() } catch { /* 静默 */ }
      ambientLightSensor = null
    }
    if (visibilityHandler) {
      document.removeEventListener('visibilitychange', visibilityHandler)
      visibilityHandler = null
    }
  }

  function subscribe(fn: PerceptionListener): () => void {
    listeners.add(fn)
    // 立即推一次当前状态
    fn(env)
    return () => listeners.delete(fn)
  }

  /** 当前快照 */
  function snapshot(): EnvironmentState {
    return { ...env }
  }

  return { start, stop, subscribe, snapshot, get source() { return source } }
}

/**
 * 单例访问器：保证整应用共享同一采集器实例。
 * 注意：Pinia store 也是单例，但采集器需在 app.mount 之前（main.ts bootstrap）启动，
 * 故与 store 解耦、单独保持单例引用。
 */
let singleton: ReturnType<typeof usePerception> | null = null

export function getPerception(): ReturnType<typeof usePerception> {
  if (!singleton) singleton = usePerception()
  return singleton
}
