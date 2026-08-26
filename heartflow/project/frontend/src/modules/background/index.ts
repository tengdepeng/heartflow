// ============================================================
// 背景音频路由（互斥出声）
// 任一时刻只允许一路同源音频：
//   - 默认：实时全局背景（App.vue → HomeBackgroundMedia）承载声音；
//   - 当用户打开背景配置界面（当前为「殿堂设置」路由）时，全局背景让出声音，
//     改由面板内的预览缩略图出声，避免两路同源音频叠加成回声。
// 注：首页的 BackgroundPanel 始终挂载，若在此也路由到预览会让首页英雄背景静音，
// 损害主使用场景，故仅「殿堂设置」路由设置该信号。
// ============================================================

import { ref, shallowRef } from 'vue'

// 模块级单例：是否有背景配置界面正在前台（目前由 殿堂设置 路由挂载时置真）。
const previewOwnsAudio = ref(false)

export { useVideoRateGuard } from './useVideoRateGuard'

export function useBackgroundPreviewAudio() {
  return {
    previewOwnsAudio,
    setPreviewOwnsAudio: (v: boolean) => {
      previewOwnsAudio.value = v
    },
  }
}

// ============================================================
// 背景视频预览 ↔ 全局 实时同步
// 殿堂设置里的预览 <video> 与 App.vue 的全局背景 <video> 是两份独立元素，
// 各自从头播放会逐帧漂移、造成「双重画面不同步」的观感。
// 本模块维护全局视频元素引用，并在设置页打开时以一个 rAF 循环把预览的
// currentTime / playbackRate 对齐到全局，实现「同一帧、同一速度」。
// 仅当两者 currentSrc 相同（同一媒体）时才同步，避免误改其它来源。
// ============================================================

const globalVideoEl = shallowRef<HTMLVideoElement | null>(null)
const previewFollowsGlobal = ref(false)
// 设置页（预览界面）是否在前台；全局背景视频是否被预览抑制解码（暂停，避免双路同源软解卡顿）
const previewActive = ref(false)
const globalDecodingSuppressed = ref(false)
let syncTimer: ReturnType<typeof setInterval> | null = null
let previewGetterRef: (() => HTMLVideoElement | null) | null = null

function cancelSyncLoop() {
  if (syncTimer && typeof clearInterval !== 'undefined') {
    clearInterval(syncTimer)
  }
  syncTimer = null
}

// 设置页在前台且预览独立播放时，暂停全局背景视频解码：
// 全局视频藏在设置页背后、用户不可见，两份同源视频同时软解会严重拖慢预览。
// 开启「与全局实时同步」时全局需驱动预览，故不抑制。
function suppressGlobalDecoding() {
  if (globalDecodingSuppressed.value) return
  globalDecodingSuppressed.value = true
  const g = globalVideoEl.value
  if (g && !g.paused) {
    try { g.pause() } catch { /* ignore */ }
  }
}

function releaseGlobalDecoding() {
  if (!globalDecodingSuppressed.value) return
  globalDecodingSuppressed.value = false
  const g = globalVideoEl.value
  if (g && g.paused) {
    try { g.play().catch(() => {}) } catch { /* ignore */ }
  }
}

// 预览在前台 且 未开启同步 → 抑制全局（只留预览一路解码）；
// 否则（未在前台 / 已开启同步）→ 释放全局（关闭设置页需恢复，开启同步需全局驱动预览）。
function recomputeGlobalSuppression() {
  if (previewActive.value && !previewFollowsGlobal.value) {
    suppressGlobalDecoding()
  } else {
    releaseGlobalDecoding()
  }
}

// 仅当「预览跟随全局」开启时才启动对齐：一次性种子到全局当前进度 + 周期(1s)轻量纠正，
// 取代原先每帧 rAF 对 paused 视频反复执行 currentTime= 的做法（每帧 seek 触发解码 stall，
// 是预览实时同步卡死的根因）。预览自身正常播放，与全局同速率自然同步。
function startSyncLoop() {
  cancelSyncLoop()
  if (!previewFollowsGlobal.value) return
  alignPreviewOnce()
  const p = previewGetterRef?.()
  if (p && p.paused) {
    try { p.play().catch(() => {}) } catch { /* ignore */ }
  }
  if (typeof setInterval !== 'undefined') {
    syncTimer = setInterval(correctDrift, 1000)
  }
}

// 开启同步瞬间：把预览种子到全局当前进度（同帧起点），并以同一速率播放（仅一次轻量 seek）
function alignPreviewOnce() {
  const g = globalVideoEl.value
  const p = previewGetterRef?.()
  if (!g || !p || !g.currentSrc || g.currentSrc !== p.currentSrc) return
  try {
    if (Math.abs(g.currentTime - p.currentTime) > 0.05 && g.readyState >= 1 && p.readyState >= 1) {
      p.currentTime = g.currentTime
    }
  } catch {
    /* 某些浏览器在 seek 范围外会抛错，忽略 */
  }
  try { p.playbackRate = g.playbackRate } catch { /* ignore */ }
}

// 周期(1s)漂移纠正：仅当漂移超 0.4s 才 seek（几乎不触发），全局暂停(sync 关闭/被抑制)时不纠正，
// 彻底杜绝卡死。
function correctDrift() {
  if (!previewFollowsGlobal.value) return
  const g = globalVideoEl.value
  const p = previewGetterRef?.()
  if (!g || !p || g.paused || !g.currentSrc || g.currentSrc !== p.currentSrc) return
  const drift = g.currentTime - p.currentTime
  if (Math.abs(drift) > 0.4 && g.readyState >= 1 && p.readyState >= 1) {
    try {
      p.currentTime = g.currentTime
    } catch {
      /* 某些浏览器在 seek 范围外会抛错，忽略 */
    }
  }
  if (p.playbackRate !== g.playbackRate) {
    try { p.playbackRate = g.playbackRate } catch { /* ignore */ }
  }
}

export function useBackgroundVideoSync() {
  /** 全局背景视频元素注册（HomeBackgroundMedia 挂载 video 时调用，卸载传 null） */
  function registerGlobalVideo(el: HTMLVideoElement | null) {
    globalVideoEl.value = el
  }

  /** 设置页是否让预览跟随全局进度（开启时启动对齐循环，关闭时停止并恢复预览自身播放） */
  function setPreviewFollows(v: boolean) {
    previewFollowsGlobal.value = v
    recomputeGlobalSuppression()
    if (v) {
      startSyncLoop()
    } else {
      cancelSyncLoop()
      // 关闭同步后，预览恢复自身自动播放（toggle 点击即用户手势，可安全 play）
      const p = previewGetterRef?.()
      if (p && p.paused) {
        try { p.play().catch(() => {}) } catch { /* ignore */ }
      }
    }
  }

  /** 设置页（预览界面）挂载/卸载：在前台且预览独立播放时抑制全局解码，离开时恢复 */
  function setPreviewActive(v: boolean) {
    previewActive.value = v
    recomputeGlobalSuppression()
  }

  /** 绑定预览元素；仅在跟随开启时启动循环。previewGetter 返回当前预览 <video>（可能因 src 变化重建） */
  function bindPreview(previewGetter: () => HTMLVideoElement | null) {
    previewGetterRef = previewGetter
    startSyncLoop()
  }

  /** 解绑预览并停止对齐循环 */
  function unbindPreview() {
    previewGetterRef = null
    cancelSyncLoop()
  }

  return {
    previewFollowsGlobal,
    globalDecodingSuppressed,
    registerGlobalVideo,
    setPreviewFollows,
    setPreviewActive,
    bindPreview,
    unbindPreview,
  }
}
