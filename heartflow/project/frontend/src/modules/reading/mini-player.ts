// ============================================================
// 阅览殿 · 悬浮迷你播放器（Floating Mini Player，INCR-502）
// ------------------------------------------------------------
// 借鉴 96 APK「知源中医」raw 视频/听书浮窗引导
// video_float_mini_window_guide / float_listener_play|pause /
// book_listener_play|pause / video_pause_to_resume / video_playing。
// 听书/朗读时浮出一条常驻迷你条：标题 + 播放/暂停 + 进度 + 关闭，
// 用户可下滑收起、再点恢复。纯本地、零网络。
// 偏好（是否启用 + 上次标题）存 hf:mini_player；
// 实时播放态（visible/playing/progress）为运行态，不落盘。
// 落点：阅览殿 ReadingHall.vue 悬浮层（MiniPlayerBar.vue）。
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'

const STORAGE_KEY = 'hf:mini_player'

export interface MiniPlayerPrefs {
  /** 是否启用悬浮迷你播放条 */
  enabled: boolean
  /** 记忆上次播放标题，便于重新唤起 */
  lastTitle: string
}

export const DEFAULT_MINI_PLAYER: MiniPlayerPrefs = {
  enabled: true,
  lastTitle: '',
}

/** 迷你条向宿主注册的播放控制回调 */
export interface MiniPlayerControls {
  toggle: () => void
  stop: () => void
}

export interface MiniPlayerProgress {
  index: number
  total: number
}

const prefs = ref<MiniPlayerPrefs>({ ...DEFAULT_MINI_PLAYER })

// ---- 运行态（不落盘） ----
const visible = ref(false)
const playing = ref(false)
const title = ref('')
const progress = ref<MiniPlayerProgress>({ index: 0, total: 0 })

let controls: MiniPlayerControls | null = null

function load(): void {
  try {
    const saved = storage.getKV<MiniPlayerPrefs | null>(STORAGE_KEY, null)
    prefs.value = saved
      ? { enabled: saved.enabled !== false, lastTitle: String(saved.lastTitle ?? '') }
      : { ...DEFAULT_MINI_PLAYER }
  } catch {
    prefs.value = { ...DEFAULT_MINI_PLAYER }
  }
}

function persist(): void {
  storage.setKV(STORAGE_KEY, prefs.value)
}

load()

export function reloadMiniPlayer(): void {
  load()
}

export function useMiniPlayer() {
  const enabled = computed(() => prefs.value.enabled)
  const lastTitle = computed(() => prefs.value.lastTitle)
  const canControl = computed(() => controls !== null)
  const progressPct = computed(() => {
    const { index, total } = progress.value
    if (total <= 0) return 0
    return Math.round((Math.min(index, total) / total) * 100)
  })

  /** 宿主（听书面板）注册控制回调 */
  function attach(handlers: MiniPlayerControls): void {
    controls = handlers
  }

  function detach(): void {
    controls = null
  }

  /** 开始播放时唤起迷你条 */
  function open(t?: string): void {
    if (!prefs.value.enabled) return
    if (t) {
      title.value = t
      if (prefs.value.lastTitle !== t) {
        prefs.value = { ...prefs.value, lastTitle: t }
        persist()
      }
    }
    visible.value = true
  }

  /** 收起迷你条（播放继续，仅隐藏） */
  function dismiss(): void {
    visible.value = false
    playing.value = false
  }

  /** 关闭迷你条并停止播放 */
  function close(): void {
    controls?.stop()
    visible.value = false
    playing.value = false
    progress.value = { index: 0, total: 0 }
  }

  /** 播放/暂停切换（转发给宿主） */
  function toggle(): void {
    controls?.toggle()
  }

  /** 宿主同步实时播放态 */
  function sync(p: { playing: boolean; index: number; total: number }): void {
    playing.value = p.playing
    progress.value = { index: p.index, total: p.total }
  }

  function setEnabled(v: boolean): boolean {
    prefs.value = { ...prefs.value, enabled: v }
    persist()
    if (!v) visible.value = false
    return prefs.value.enabled
  }

  return {
    enabled,
    lastTitle,
    canControl,
    visible,
    playing,
    title,
    progress,
    progressPct,
    attach,
    detach,
    open,
    dismiss,
    close,
    toggle,
    sync,
    setEnabled,
  }
}
