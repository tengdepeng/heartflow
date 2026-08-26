// ============================================================
// 超级自定义 · 视觉强度组合式（宪法第二条）
// 将「粒子画布 / 环境辉光 / 环境颗粒 / 漂浮微尘 / 全局背景」的各项不透明度
// （0–100%）持久化到本地 KV，并以 CSS 变量写入 :root，供壳层与各视图消费。
//
// 设计要点：
// - 模块级单例 ref：所有视图（Settings 滑块、CanvasRoom 快速切换、壳层渲染）
//   共享同一份状态，互不冲突。
// - 数值语义：0 = 完全隐藏（透出下方图层），100 = 满强度（沿用现状默认）。
// - 与宪法 --hf-* 软效果倍率（particle-density / animate-speed 等 enable/disable
//   型开关）相互独立、乘法叠加，不抢占其语义。
// - 可扩展：新增一项强度控制只需在 createAlphaControl 下加一行 + 一处滑块。
// ============================================================

import { ref, type Ref, type UnwrapRef } from 'vue'
import { storage } from '../../engine/storage'

interface AlphaControl {
  state: Ref<number>
  set: (value: number) => void
}

function createAlphaControl(
  storageKey: string,
  cssVar: string,
  def: number,
): AlphaControl {
  const state = ref<number>(storage.getKV<number>(storageKey, def))

  const set = (value: number): void => {
    const clamped = Math.min(100, Math.max(0, Math.round(value)))
    state.value = clamped
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty(cssVar, String(clamped / 100))
    }
    storage.setKV(storageKey, clamped)
  }

  // 模块加载即把已持久化的值写入 :root（首屏即生效，无需等待设置页打开）
  set(state.value)
  return { state, set }
}

// ---- 通用简单设置（无 CSS 变量副作用，由消费方自行映射） ----
// 用于侧边栏宽度 / 通透度 / 背景模式 / 默认折叠 / 密度 / 空闲时长等：
// 仅持久化到本地 KV + 模块级单例，具体 CSS 变量由 App.vue 的 shellStyle 派生注入。
interface SimpleControl<T> {
  state: Ref<UnwrapRef<T>>
  set: (value: T) => void
}

function createSimple<T>(storageKey: string, def: T): SimpleControl<T> {
  const state = ref<T>(storage.getKV<T>(storageKey, def))
  const set = (value: T): void => {
    state.value = value
    storage.setKV(storageKey, value)
  }
  return { state: state as Ref<UnwrapRef<T>>, set }
}

// ---- 各项视觉强度控制（storageKey → CSS 变量 → 默认值） ----
const canvasAlphaCtrl = createAlphaControl('ui:canvas-alpha', '--canvas-alpha', 100)
const ambientGlowAlphaCtrl = createAlphaControl('ui:ambient-glow-alpha', '--ambient-glow-alpha', 100)
const ambientGrainAlphaCtrl = createAlphaControl('ui:ambient-grain-alpha', '--ambient-grain-alpha', 50)
const ambientDustAlphaCtrl = createAlphaControl('ui:ambient-dust-alpha', '--ambient-dust-alpha', 30)
const appBgAlphaCtrl = createAlphaControl('ui:app-bg-alpha', '--app-bg-alpha', 100)

// ---- 界面自动隐藏（侧边栏 + 悬浮按钮）开关：默认开启（沉浸式默认隐藏） ----
const autoHideChromeState = ref<boolean>(storage.getKV<boolean>('ui:auto-hide-chrome', true))
function setAutoHideChrome(value: boolean): void {
  autoHideChromeState.value = value
  storage.setKV('ui:auto-hide-chrome', value)
}

// ---- 自动隐藏空闲时长（毫秒）：默认 3000，设置页可调（1s–10s） ----
const autoHideDelayCtrl = createSimple<number>('ui:auto-hide-delay', 3000)

// ---- 侧边栏自定义（超级自定义 · 侧边栏子组） ----
// 宽度（px）：默认 220；可选 180 / 220 / 260 / 300
const sidebarWidthCtrl = createSimple<number>('ui:sidebar-width', 220)
// 毛玻璃通透度（0–100）：仅“毛玻璃”背景模式下生效，越高越透、模糊越强
const sidebarGlassCtrl = createSimple<number>('ui:sidebar-glass', 40)
// 背景模式：solid 独立深色实底（默认，等同现状）/ glass 毛玻璃透明，露出全局背景
const sidebarBgModeCtrl = createSimple<string>('ui:sidebar-bg-mode', 'solid')
// 桌面端启动默认状态：true=默认进入沉浸（侧栏收起）/ false=启动即展开
const sidebarDefaultCollapsedCtrl = createSimple<boolean>('ui:sidebar-default-collapsed', true)
// 项目组密度：compact / standard / relaxed
const sidebarDensityCtrl = createSimple<string>('ui:sidebar-density', 'standard')

// 桌面端：用户主动收起/展开态（汉堡 ≡ 切换，跨刷新保留）
const sidebarCollapsedCtrl = createSimple<boolean>('ui:sidebar-collapsed', false)
// 桌面端悬浮侧栏自由坐标（px；拖动后落盘；null=交 CSS 边缘吸附）
const sidebarFloatPosCtrl = createSimple<{ x: number; y: number } | null>('ui:sidebar-float-pos', null)
// 桌面端悬浮侧栏吸附边（拖动松手后落盘）
const sidebarFloatEdgeCtrl = createSimple<string>('ui:sidebar-float-edge', 'left')
// 悬浮液态栏自由坐标（px 中心；floating 模式拖动后落盘；null=贴底 docked）
const navFloatPosCtrl = createSimple<{ x: number; y: number } | null>('ui:nav-float-pos', null)

// ---- 顶栏 / 底栏（移动/平板端）不透明度（超级自定义 · 与侧边栏同级） ----
// 仅移动/平板端显示的 .mobile-top-bar / .mobile-bottom-nav 背景不透明度（0–100），
// 语义为「不透明度」：0 = 全透（看不见栏）、100 = 全实底。默认 95（对应原 rgba(...,0.95)）。
const edgeBarAlphaCtrl = createSimple<number>('ui:edge-bar-alpha', 95)

// ---- 背景视频播放速度（超级自定义 · 背景介质） ----
// 应用到全局背景视频与设置页预览：0.5 / 0.75 / 1 / 1.25 / 1.5 / 2，默认 1。
const bgVideoRateCtrl = createSimple<number>('ui:bg-video-rate', 1)

// ---- 悬浮液态栏 · 玻璃通透度与呼吸动画（超级自定义 · 液态玻璃 sheen） ----
// 玻璃通透度（0–100）：越高越透、模糊越强
const barGlassAlphaCtrl = createAlphaControl('ui:bar-glass-alpha', '--bar-glass-alpha', 100)
// 呼吸动画开关（默认开启）
const barBreathEnabledCtrl = createSimple<boolean>('ui:bar-breath-enabled', true)
// 呼吸速度（0.5–2，默认 1）
const barBreathSpeedCtrl = createSimple<number>('ui:bar-breath-speed', 1)

// ---- 导航布局模式：floating（悬浮双浮岛，默认）/ docked（桌面端上下固定栏） ----
const navModeCtrl = createSimple<string>('ui:nav-mode', 'floating')

export function useAppearance() {
  return {
    // ---- 状态（Ref，模板自动解包） ----
    canvasAlpha: canvasAlphaCtrl.state,
    ambientGlowAlpha: ambientGlowAlphaCtrl.state,
    ambientGrainAlpha: ambientGrainAlphaCtrl.state,
    ambientDustAlpha: ambientDustAlphaCtrl.state,
    appBgAlpha: appBgAlphaCtrl.state,
    autoHideChrome: autoHideChromeState,
    autoHideDelay: autoHideDelayCtrl.state,
    sidebarWidth: sidebarWidthCtrl.state,
    sidebarGlass: sidebarGlassCtrl.state,
    sidebarBgMode: sidebarBgModeCtrl.state,
    sidebarDefaultCollapsed: sidebarDefaultCollapsedCtrl.state,
    sidebarDensity: sidebarDensityCtrl.state,
    sidebarCollapsed: sidebarCollapsedCtrl.state,
    sidebarFloatPos: sidebarFloatPosCtrl.state,
    sidebarFloatEdge: sidebarFloatEdgeCtrl.state,
    navFloatPos: navFloatPosCtrl.state,
    edgeBarAlpha: edgeBarAlphaCtrl.state,
    bgVideoRate: bgVideoRateCtrl.state,
    barGlassAlpha: barGlassAlphaCtrl.state,
    barBreathEnabled: barBreathEnabledCtrl.state,
    barBreathSpeed: barBreathSpeedCtrl.state,
    navMode: navModeCtrl.state,
    // ---- 设置器（写入 CSS 变量 + 持久化） ----
    setCanvasAlpha: canvasAlphaCtrl.set,
    setAmbientGlowAlpha: ambientGlowAlphaCtrl.set,
    setAmbientGrainAlpha: ambientGrainAlphaCtrl.set,
    setAmbientDustAlpha: ambientDustAlphaCtrl.set,
    setAppBgAlpha: appBgAlphaCtrl.set,
    setAutoHideChrome,
    setAutoHideDelay: autoHideDelayCtrl.set,
    setSidebarWidth: sidebarWidthCtrl.set,
    setSidebarGlass: sidebarGlassCtrl.set,
    setSidebarBgMode: sidebarBgModeCtrl.set,
    setSidebarDefaultCollapsed: sidebarDefaultCollapsedCtrl.set,
    setSidebarDensity: sidebarDensityCtrl.set,
    setSidebarCollapsed: sidebarCollapsedCtrl.set,
    setSidebarFloatPos: sidebarFloatPosCtrl.set,
    setSidebarFloatEdge: sidebarFloatEdgeCtrl.set,
    setNavFloatPos: navFloatPosCtrl.set,
    setEdgeBarAlpha: edgeBarAlphaCtrl.set,
    setBgVideoRate: bgVideoRateCtrl.set,
    setBarGlassAlpha: barGlassAlphaCtrl.set,
    setBarBreathEnabled: barBreathEnabledCtrl.set,
    setBarBreathSpeed: barBreathSpeedCtrl.set,
    setNavMode: navModeCtrl.set,
  }
}

// 幂等重放：App.vue onMounted 调用，确保首屏变量就位
// （防御性 —— 模块加载时已写过一次，此处防止任何延迟导入场景）
export function initAppearance(): void {
  canvasAlphaCtrl.set(canvasAlphaCtrl.state.value)
  ambientGlowAlphaCtrl.set(ambientGlowAlphaCtrl.state.value)
  ambientGrainAlphaCtrl.set(ambientGrainAlphaCtrl.state.value)
  ambientDustAlphaCtrl.set(ambientDustAlphaCtrl.state.value)
  appBgAlphaCtrl.set(appBgAlphaCtrl.state.value)
}
