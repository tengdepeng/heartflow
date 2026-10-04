<script setup lang="ts">
// ============================================================
// 阅览殿 · 悬浮迷你播放器（INCR-502）
// 听书/朗读时浮出的常驻迷你条：标题 + 播放/暂停 + 进度 + 收起/关闭。
// 借鉴 96 APK 知源中医 raw video_float_mini_window_guide /
// float_listener_play|pause / video_pause_to_resume。
// 纯本地、零网络；由听书面板（TtsControlPanel）注册控制回调并同步播放态。
// ============================================================
import { useMiniPlayer } from '../modules/reading/mini-player'

const { visible, playing, title, progress, progressPct, toggle, dismiss, close } = useMiniPlayer()
</script>

<template>
  <Transition name="mpb">
    <div v-if="visible" class="mpb-bar" role="region" aria-label="迷你播放器">
      <span class="mpb-icon" :class="{ 'is-playing': playing }">🎧</span>

      <div class="mpb-meta">
        <span class="mpb-title">{{ title || '听书' }}</span>
        <div class="mpb-progress">
          <span class="mpb-fill" :style="{ width: progressPct + '%' }" />
        </div>
      </div>

      <span v-if="progress.total > 0" class="mpb-count">
        {{ Math.min(progress.index + 1, progress.total) }}/{{ progress.total }}
      </span>

      <button class="mpb-btn mpb-toggle" type="button" :title="playing ? '暂停' : '播放'" @click="toggle">
        {{ playing ? '⏸' : '▶' }}
      </button>
      <button class="mpb-btn mpb-dismiss" type="button" title="收起" @click="dismiss">⌄</button>
      <button class="mpb-btn mpb-close" type="button" title="关闭并停止" @click="close">✕</button>
    </div>
  </Transition>
</template>

<style scoped>
.mpb-bar {
  position: fixed;
  left: 50%;
  bottom: 22px;
  transform: translateX(-50%);
  z-index: 60;
  display: flex;
  align-items: center;
  gap: 10px;
  width: min(560px, calc(100vw - 32px));
  padding: 8px 12px;
  border-radius: 14px;
  border: 1px solid rgba(var(--accent-rgb), 0.22);
  background: rgba(18, 22, 32, 0.92);
  backdrop-filter: blur(10px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
  color: var(--text-primary);
}

.mpb-icon {
  font-size: 16px;
  filter: grayscale(0.3);
}
.mpb-icon.is-playing {
  animation: mpb-pulse 1.6s ease-in-out infinite;
}
@keyframes mpb-pulse {
  0%, 100% { transform: scale(1); opacity: 0.85; }
  50% { transform: scale(1.14); opacity: 1; }
}

.mpb-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 5px; }
.mpb-title {
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: rgba(var(--text-primary-rgb), 0.9);
}
.mpb-progress {
  height: 3px;
  border-radius: 2px;
  background: rgba(var(--accent-rgb), 0.14);
  overflow: hidden;
}
.mpb-fill {
  display: block;
  height: 100%;
  border-radius: 2px;
  background: linear-gradient(90deg, rgba(var(--accent-rgb), 0.5), var(--accent));
  transition: width 0.3s;
}

.mpb-count {
  font-size: 11px;
  color: rgba(var(--text-primary-rgb), 0.5);
  font-variant-numeric: tabular-nums;
}

.mpb-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 1px solid rgba(var(--accent-rgb), 0.16);
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.06);
  color: rgba(var(--text-primary-rgb), 0.8);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.mpb-btn:hover { background: rgba(var(--accent-rgb), 0.14); border-color: rgba(var(--accent-rgb), 0.3); }
.mpb-toggle { background: rgba(var(--accent-rgb), 0.16); color: var(--accent); }

.mpb-enter-active,
.mpb-leave-active { transition: opacity 0.22s ease, transform 0.22s ease; }
.mpb-enter-from,
.mpb-leave-to { opacity: 0; transform: translateX(-50%) translateY(14px); }
</style>
