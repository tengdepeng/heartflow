// ============================================================
// 桌面静默覆盖 · 门控组合式
// ------------------------------------------------------------
// 职责：在「锁屏/桌面静默覆盖」（蓝图 B2）中，把桌面原生浮动覆盖层窗口
// （后端 cmd_open_overlay_window / tauri-bridge.openOverlayWindow）接入：
//   1. 宪法门控（fail-closed）：仅当 elastic-sanctuary 规则（sanctuary:enable）
//      启用时才允许开启；宪法关闭则强制关闭（绝不静默绕过宪法）。
//   2. 平台降级：无 multiWindow 能力（Web/移动端）无原生多窗口，isAllowed=false，桥本身也
//      返回明确错误，双重 fail-closed。
//   3. 用户显式偏好：KV 持久化，默认 false。覆盖层只在用户主动开启且宪法/平台
//      允许时才真正打开窗口（持久模式）。
//   4. 锁屏模式（仅锁屏时显示）：用户开启后，覆盖层仅在 OS 锁屏时浮现、解锁即隐；
//      由后端 session-lock 事件驱动 sessionLocked，与持久模式共用同一收敛点（shouldBeOpen）。
//
// 设计原则（沿用安全岛心理安全约束）：
// - 仅本地，绝不外发；覆盖层是无交互的纯氛围光，不采集、不弹窗、不推送。
// - 单一事实源：shouldBeOpen（窗口应打开）= isAllowed（宪法∧平台）∧
//   (userWantsOverlay（持久模式）∨ (lockModeWantsOverlay ∧ sessionLocked)（锁屏模式）)。
//   窗口的实际开合由 applyState() 收敛，enable/disable/enableLockMode/disableLockMode 与
//   shouldBeOpen 的 watch 都汇入此函数，避免多处直接调用桥造成状态不一致。
// ============================================================

import { ref, computed, watch } from 'vue'
import { storage } from '../../engine/storage'
import {
  openOverlayWindow,
  closeOverlayWindow,
  listenSessionLock,
  startSessionLockMonitor,
} from '../../engine/tauri-bridge'
import { useRuleEnabled } from '../../composables/useConstitutionEffect'
import { hasCapability } from '../../utils/platform'

/** 用户显式偏好的持久化键（持久模式） */
export const DESKTOP_SILENT_OVERLAY_KEY = 'sanctuary_desktop_silent_overlay'
/** 锁屏模式（仅锁屏时显示）持久化键 */
export const LOCK_MODE_KEY = 'sanctuary_desktop_silent_overlay_lockmode'
/** 覆盖层形态偏好持久化键（B2-EXT-1 多静默覆盖形态） */
export const OVERLAY_FORM_KEY = 'sanctuary_desktop_overlay_form'
/** 覆盖内容偏好持久化键（B2-EXT-2：显隐报点/落款/辉光强度） */
export const OVERLAY_SHOW_BEACON_KEY = 'sanctuary_desktop_overlay_show_beacon'
export const OVERLAY_SHOW_HINT_KEY = 'sanctuary_desktop_overlay_show_hint'
export const OVERLAY_GLOW_INTENSITY_KEY = 'sanctuary_desktop_overlay_glow_intensity'

/**
 * 覆盖层形态定义（B2-EXT-1）：在「桌面静默覆盖」之外扩展更多「静」场景形态。
 * 形态仅决定视觉（辉光色 + 落款字 + 布局变体），绝不改变宪法/平台 fail-closed 门控。
 * - silent   静默暖光（默认，暖琥珀呼吸光环 + 「静」）
 * - breath   息壤呼吸（青绿息壤呼吸光痕 + 「息」）
 * - timeline 时间长廊（冷蓝横向流光长廊 + 「廊」）
 */
export type OverlayForm = 'silent' | 'breath' | 'timeline'

export interface OverlayFormDef {
  id: OverlayForm
  label: string
  /** 辉光主色（注入 overlay.html 的 --glow-color，不改变半透明深色底） */
  glow: string
  /** 落款字 */
  hint: string
  /** 一句话描述，供 UI 展示 */
  desc: string
}

export const OVERLAY_FORMS: OverlayFormDef[] = [
  { id: 'silent', label: '静默暖光', glow: '#d8a866', hint: '静', desc: '暖琥珀呼吸光环，默认的静默陪伴' },
  { id: 'breath', label: '息壤呼吸', glow: '#7fae9b', hint: '息', desc: '青绿息壤呼吸光痕，如大地缓缓吐纳' },
  { id: 'timeline', label: '时间长廊', glow: '#9bb4d8', hint: '廊', desc: '冷蓝横向流光长廊，沉入时间之外' },
]

/**
 * 覆盖内容偏好（B2-EXT-2）：静默时「看到什么」由用户定义（第2条·超级自定义），
 * 仅决定视觉，绝不改变宪法/平台 fail-closed 门控。
 * - showBeacon  是否显示中心呼吸光点（报点），默认 true
 * - showHint    是否显示底部落款（静/息/廊），默认 true
 * - glowIntensity 辉光强度（0~2，1 为基准），默认 1.0
 */
export interface OverlayContentPref {
  showBeacon: boolean
  showHint: boolean
  glowIntensity: number
}

/** 覆盖层底色（暖夜色，带 alpha；与 overlay.html 光环暖色同系） */
const OVERLAY_COLOR = 'rgba(15, 11, 8, 0.55)'
/** 窗口整体不透明度（底色已含 alpha，这里保持 1 让光环完整可见） */
const OVERLAY_OPACITY = 1

// ---- 模块级单例（跨组件调用共享同一响应式来源） ----

/** 用户是否主动希望开启覆盖层（持久模式，持久化） */
const userWantsOverlay = ref<boolean>(storage.getKV(DESKTOP_SILENT_OVERLAY_KEY, false))
/** 用户是否开启「仅锁屏时显示」模式（锁屏模式，持久化） */
const lockModeWantsOverlay = ref<boolean>(storage.getKV(LOCK_MODE_KEY, false))
/** 覆盖层窗口当前是否实际打开（本地信念，由 open/close 调用维护） */
const isWindowOpen = ref<boolean>(false)
/** 最近一次操作错误信息（fail-closed 原因透出给 UI） */
const lastError = ref<string | null>(null)
/** 当前 OS 锁屏状态（由后端 session-lock 事件驱动；web/移动端恒为 false） */
const sessionLocked = ref<boolean>(false)
/** 覆盖层形态偏好（B2-EXT-1，持久化）；仅视觉，不触门控 */
const overlayForm = ref<OverlayForm>(storage.getKV(OVERLAY_FORM_KEY, 'silent') as OverlayForm)
/** 覆盖内容偏好（B2-EXT-2，持久化）；仅视觉，不触门控 */
const showBeacon = ref<boolean>(storage.getKV(OVERLAY_SHOW_BEACON_KEY, true) as boolean)
const showHint = ref<boolean>(storage.getKV(OVERLAY_SHOW_HINT_KEY, true) as boolean)
const glowIntensity = ref<number>(storage.getKV(OVERLAY_GLOW_INTENSITY_KEY, 1.0) as number)
/** 移动端应用内浮层可见性（B2-EXT-3）：平台无原生多窗口时由本标志驱动 Vue 浮层，
 *  与桌面端 isWindowOpen 共用同一「窗口实际开合」语义；默认隐藏。 */
const mobileOverlayVisible = ref<boolean>(false)

/**
 * 重入保护：applyState() 同时被「用户动作 enable/disable/enableLockMode」与
 * 「watch(shouldBeOpen)」多路调用，而 openWindow/closeWindow 内部存在 await ——
 * 若 watch 在 await 期间（isWindowOpen 尚未更新）再次进入 applyState，
 * 会造成覆盖层窗口被重复开/关。用同步置位的 applying 标志合并并发调用。
 */
let applying = false
/** 锁屏事件监听是否已启动（避免重复订阅前端事件） */
let lockListenerStarted = false

export function useDesktopSilentOverlay() {
  // 宪法门控：elastic-sanctuary 规则启用 ⟺ sanctuary:enable 目标活跃
  const { isEnabled: sanctuaryEnabled } = useRuleEnabled('elastic-sanctuary')

  // 渲染机制：桌面才有原生多窗口，移动端改走应用内浮层（B2-EXT-3，平台只选机制不选门控）。
  // 注意：宪法 fail-closed 门控只认 sanctuaryEnabled，不因地平台而放行/拦截。
  const canUseNativeWindow = computed(() => hasCapability('multiWindow'))

  // 宪法门控：仅 elastic-sanctuary 启用才“被允许”开启（fail-closed 第一道闸）。
  // 平台只决定“用什么渲染”（原生窗口 / 应用内浮层），不决定“能否开”。
  const isAllowed = computed(() => sanctuaryEnabled.value)

  // 持久模式意图 ∧ 允许 = 实际生效（对应 UI 主开关语义）
  const isActive = computed(() => userWantsOverlay.value && isAllowed.value)

  // 窗口是否“应该打开”：持久模式，或（锁屏模式 ∧ 当前已锁屏）。两路均受宪法∧平台门控。
  const shouldBeOpen = computed(() =>
    isAllowed.value &&
    (userWantsOverlay.value || (lockModeWantsOverlay.value && sessionLocked.value)),
  )

  // ---- 内部：窗口实际开合（收敛点） ----

  async function openWindow(): Promise<boolean> {
    const def = OVERLAY_FORMS.find((f) => f.id === overlayForm.value) ?? OVERLAY_FORMS[0]
    // 移动端降级（B2-EXT-3）：无原生多窗口，改由应用内浮层 MobileSilentOverlay 渲染，
    // 不调用 openOverlayWindow（其桥在移动端本就返回明确错误，双重 fail-closed）。
    if (!canUseNativeWindow.value) {
      mobileOverlayVisible.value = true
      isWindowOpen.value = true
      return true
    }
    // 底色（深色半透明）恒为 OVERLAY_COLOR；形态/辉光色/内容偏好经桥透传，
    // 后端 eval 写入 window.__OVERLAY_*__ 全局，overlay.html 据此渲染（仅外观，不改门控）。
    const res = await openOverlayWindow(
      OVERLAY_COLOR,
      OVERLAY_OPACITY,
      def.id,
      def.glow,
      showBeacon.value,
      showHint.value,
      glowIntensity.value,
    )
    if (!res.success) {
      lastError.value = res.error ?? '开启桌面静默覆盖失败'
      isWindowOpen.value = false
      mobileOverlayVisible.value = false
      return false
    }
    isWindowOpen.value = true
    return true
  }

  async function closeWindow(): Promise<boolean> {
    // 移动端降级（B2-EXT-3）：仅隐藏应用内浮层，不调用原生桥。
    if (!canUseNativeWindow.value) {
      mobileOverlayVisible.value = false
      isWindowOpen.value = false
      return true
    }
    // 关闭无论后端是否成功，本地都置为关闭（fail-safe：窗口不存在时后端 no-op）
    const res = await closeOverlayWindow()
    isWindowOpen.value = false
    mobileOverlayVisible.value = false
    if (!res.success) {
      // 关闭失败通常是窗口已不存在，不阻断；仅在确实异常时记录
      lastError.value = res.error ?? null
      return false
    }
    return true
  }

  /** 把「实际窗口状态」收敛到「shouldBeOpen 期望状态」 */
  async function applyState() {
    // 重入保护：合并「用户动作」与「watch(shouldBeOpen)」的并发调用，避免 await 期间重复开/关窗口。
    if (applying) return
    applying = true
    try {
      if (shouldBeOpen.value) {
        if (!isWindowOpen.value) await openWindow()
      } else {
        if (isWindowOpen.value) await closeWindow()
      }
    } finally {
      applying = false
    }
  }

  // ---- 对外动作：持久模式 ----

  /** 持久模式开启：先校验宪法/平台，再置意图并开窗口 */
  async function enable(): Promise<boolean> {
    lastError.value = null
    if (!isAllowed.value) {
      lastError.value = '安全岛未开启，桌面静默覆盖不可用'
      return false
    }
    userWantsOverlay.value = true
    storage.setKV(DESKTOP_SILENT_OVERLAY_KEY, true)
    await applyState()
    return isWindowOpen.value
  }

  /** 持久模式关闭：清除意图并关窗口 */
  async function disable(): Promise<boolean> {
    lastError.value = null
    userWantsOverlay.value = false
    storage.setKV(DESKTOP_SILENT_OVERLAY_KEY, false)
    await applyState()
    return !isWindowOpen.value
  }

  /** 切换持久模式 */
  async function toggle(): Promise<boolean> {
    return userWantsOverlay.value ? await disable() : await enable()
  }

  // ---- 对外动作：覆盖层形态（B2-EXT-1，仅视觉） ----

  /**
   * 切换覆盖层形态（silent/breath/timeline）。仅改变视觉，不触碰宪法/平台门控。
   * 若窗口已在显示，重建以应用新形态（native 窗口视觉由 form 决定）。
   */
  async function setForm(form: OverlayForm): Promise<void> {
    if (!OVERLAY_FORMS.some((f) => f.id === form)) return
    overlayForm.value = form
    storage.setKV(OVERLAY_FORM_KEY, form)
    if (isWindowOpen.value) {
      await closeWindow()
      await openWindow()
    }
  }

  // ---- 对外动作：覆盖内容偏好（B2-EXT-2，仅视觉） ----

  /**
   * 设置覆盖内容偏好（显隐报点/落款/辉光强度）。仅改变视觉，不触碰宪法/平台门控。
   * 每个字段独立持久化到 KV；若窗口（原生或应用内）已在显示，重建以应用新内容。
   * @param rebuild 是否重建窗口以让原生覆盖层即时采纳（默认 true）。滑杆拖动时用 false
   *   做轻量本地预览（仅改 ref/KV，不动窗口），松开时再传 true 一次性重建。
   */
  async function setContent(partial: Partial<OverlayContentPref>, rebuild: boolean = true): Promise<void> {
    if (partial.showBeacon !== undefined) {
      showBeacon.value = !!partial.showBeacon
      storage.setKV(OVERLAY_SHOW_BEACON_KEY, showBeacon.value)
    }
    if (partial.showHint !== undefined) {
      showHint.value = !!partial.showHint
      storage.setKV(OVERLAY_SHOW_HINT_KEY, showHint.value)
    }
    if (partial.glowIntensity !== undefined) {
      const v = Number(partial.glowIntensity)
      if (!Number.isNaN(v)) {
        // 钳制到 0~2，避免极端值破坏视觉
        glowIntensity.value = Math.min(2, Math.max(0, v))
        storage.setKV(OVERLAY_GLOW_INTENSITY_KEY, glowIntensity.value)
      }
    }
    if (rebuild && isWindowOpen.value) {
      await closeWindow()
      await openWindow()
    }
  }

  // ---- 对外动作：锁屏模式（仅锁屏时显示） ----

  /** 锁屏模式开启：订阅锁屏事件并请后端启动 OS 监听；窗口在锁屏时由 watch 自动开 */
  async function enableLockMode(): Promise<boolean> {
    lastError.value = null
    if (!isAllowed.value) {
      lastError.value = '安全岛未开启，桌面静默覆盖不可用'
      return false
    }
    lockModeWantsOverlay.value = true
    storage.setKV(LOCK_MODE_KEY, true)
    await ensureLockListener()
    await applyState()
    return isWindowOpen.value
  }

  /** 锁屏模式关闭：清除意图并关窗口 */
  async function disableLockMode(): Promise<boolean> {
    lastError.value = null
    lockModeWantsOverlay.value = false
    storage.setKV(LOCK_MODE_KEY, false)
    await applyState()
    return !isWindowOpen.value
  }

  /** 启动锁屏事件监听（幂等）；订阅成功后再请后端开始 OS 监听 */
  async function ensureLockListener() {
    if (lockListenerStarted) return
    lockListenerStarted = true
    const res = await listenSessionLock((locked) => {
      sessionLocked.value = locked
    })
    if (!res.success) {
      lockListenerStarted = false // 允许后续重试（例如回到 Tauri 环境）
      return
    }
    // 启动后端 OS 锁屏监听（桌面专属；失败不影响前端订阅，仅锁屏模式保持 inert，绝不崩溃）
    void startSessionLockMonitor()
  }

  // ---- 宪法 / 平台 / 意图 / 锁屏 任意变化 → 收敛窗口（fail-closed 兜底） ----
  // 监听 shouldBeOpen：其依赖 isAllowed / userWantsOverlay / lockModeWantsOverlay / sessionLocked
  // 任一变化导致开合决策翻转时，自动收敛窗口；宪法关闭或切移动端会强制关窗
  // （绝不残留一个绕过宪法的覆盖层）。
  watch(shouldBeOpen, () => {
    void applyState()
  })

  return {
    // 状态
    userWantsOverlay,
    lockModeWantsOverlay,
    sessionLocked,
    isWindowOpen,
    isAllowed,
    isActive,
    shouldBeOpen,
    lastError,
    overlayForm,
    // 状态（内容偏好 · B2-EXT-2）
    showBeacon,
    showHint,
    glowIntensity,
    // 状态（移动端应用内浮层 · B2-EXT-3）
    mobileOverlayVisible,
    canUseNativeWindow,
    // 动作（持久模式）
    enable,
    disable,
    toggle,
    // 动作（锁屏模式）
    enableLockMode,
    disableLockMode,
    applyState,
    // 动作（形态 · B2-EXT-1）
    setForm,
    // 动作（内容偏好 · B2-EXT-2）
    setContent,
    // 常量（供 UI 展示/测试）
    overlayColor: OVERLAY_COLOR,
    overlayOpacity: OVERLAY_OPACITY,
    overlayForms: OVERLAY_FORMS,
  }
}

/** 仅供测试：重置锁屏监听启动标记（模块级单例跨测试残留，避免重复订阅误判） */
export function __resetLockListenerState() {
  lockListenerStarted = false
}
