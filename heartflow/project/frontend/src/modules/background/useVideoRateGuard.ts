// 视频倍速守卫：浏览器在 loop 续播 / 缓冲停顿 / play() 后会把 playbackRate 静默复位为 1，
// 导致设定的倍速「定不住」（设了只坚持一会又变回 1×）。
// 此 composable 在播放相关事件与 ratechange 上强制重写 playbackRate，确保速度恒等于设定值。
// 背景全局视频（HomeBackgroundMedia.vue）与设置页预览（Settings.vue）共用同一逻辑。
import { watch, onBeforeUnmount, type Ref } from 'vue'

// 注：rate 变化时的即时写入（watch(rate) → 立即 set）仍由调用方保留（见 Settings.applyPreviewRate /
// HomeBackgroundMedia.syncVideoPlayback）；本 composable 只负责对抗浏览器在播放事件中的静默复位。

const RATE_GUARD_EVENTS = ['play', 'playing', 'canplay', 'loadeddata', 'seeked', 'ratechange'] as const

export function useVideoRateGuard(
  elRef: Ref<HTMLVideoElement | null>,
  rate: Ref<number>,
): void {
  let detach: (() => void) | null = null

  function attach(el: HTMLVideoElement | null) {
    if (!el) return
    const reApply = () => {
      if (el.playbackRate !== rate.value) {
        try {
          el.playbackRate = rate.value
        } catch {
          /* 个别环境不支持 playbackRate 写入，忽略 */
        }
      }
    }
    RATE_GUARD_EVENTS.forEach((ev) => el.addEventListener(ev, reApply))
    reApply()
    detach = () => {
      RATE_GUARD_EVENTS.forEach((ev) => el.removeEventListener(ev, reApply))
      detach = null
    }
  }

  watch(
    elRef,
    (el) => {
      detach?.()
      attach(el)
    },
    { immediate: true },
  )

  onBeforeUnmount(() => {
    detach?.()
  })
}
