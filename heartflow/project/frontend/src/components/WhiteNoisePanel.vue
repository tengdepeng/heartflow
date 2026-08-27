<template>
  <section class="wn-panel" aria-label="白噪音">
    <div class="wn-panel-head">
      <span class="wn-panel-title">🎧 白噪音</span>
      <span class="wn-panel-sub">Web Audio 本地合成 · 不联网</span>
      <span class="wn-status" :class="{ on: playing }">{{ playing ? '播放中' : '已停止' }}</span>
    </div>

    <div class="wn-block">
      <span class="wn-block-label">选择声景</span>
      <div class="wn-scenes">
        <button
          v-for="s in NOISE_SCENES"
          :key="s.id"
          class="wn-scene"
          :class="{ active: currentSceneId === s.id, playing: playing && currentSceneId === s.id }"
          @click="toggleScene(s.id)"
        >
          <span class="wn-scene-icon" :style="{ color: s.color }">{{ s.icon }}</span>
          <span class="wn-scene-label">{{ s.label }}</span>
          <span class="wn-scene-desc">{{ s.desc }}</span>
          <span v-if="playing && currentSceneId === s.id" class="wn-now-playing">停止</span>
        </button>
      </div>
      <div class="wn-row">
        <button class="wn-btn" @click="stopAll()">全部停止</button>
      </div>
    </div>

    <div class="wn-block">
      <span class="wn-block-label">音量</span>
      <div class="wn-row">
        <input type="range" min="0" max="1" step="0.05" :value="volume" @input="onVolume" />
        <span class="wn-vol">{{ Math.round(volume * 100) }}%</span>
      </div>
    </div>

    <div class="wn-block">
      <span class="wn-block-label">定时关闭（分钟）</span>
      <div class="wn-row">
        <button v-for="m in SLEEP_OPTIONS" :key="m" class="wn-chip" :class="{ on: sleepMinutes === m }" @click="setSleepTimer(m)">
          {{ m }} 分钟
        </button>
        <button class="wn-chip" :class="{ on: sleepMinutes === 0 }" @click="setSleepTimer(0)">取消</button>
      </div>
      <p v-if="sleepMinutes > 0" class="wn-hint">将在 {{ sleepMinutes }} 分钟后自动停止</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useWhiteNoise, NOISE_SCENES } from '../modules/guard/white-noise'

const SLEEP_OPTIONS = [15, 30, 60]

const {
  playing,
  currentSceneId,
  volume,
  sleepMinutes,
  load,
  toggleScene,
  stopAll,
  setVolume,
  setSleepTimer,
} = useWhiteNoise()

onMounted(() => load())

function onVolume(e: Event) {
  setVolume(Number((e.target as HTMLInputElement).value))
}
</script>

<style scoped>
.wn-panel {
  margin: 22px auto 0;
  max-width: 720px;
  padding: 18px 20px;
  border-radius: 14px;
  background: var(--card-bg);
  border: 1px solid var(--border);
}
.wn-panel-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 14px;
}
.wn-panel-title {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--text-high);
}
.wn-panel-sub {
  font-size: 12px;
  color: var(--text-dim);
}
.wn-status {
  margin-left: auto;
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 999px;
  background: rgba(232, 224, 216, 0.08);
  color: var(--text-dim);
}
.wn-status.on {
  background: rgba(165, 180, 252, 0.18);
  color: #a5b4fc;
}
.wn-block {
  padding: 12px 0;
  border-top: 1px dashed var(--border);
}
.wn-block:first-of-type {
  border-top: none;
}
.wn-block-label {
  display: block;
  font-size: 12px;
  letter-spacing: 1px;
  color: var(--text-medium);
  margin-bottom: 10px;
}
.wn-scenes {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.wn-scene {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 12px 8px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-medium);
  cursor: pointer;
  transition: all 0.2s;
}
.wn-scene:hover {
  border-color: var(--accent);
}
.wn-scene.active {
  border-color: var(--accent);
  background: rgba(165, 180, 252, 0.08);
}
.wn-scene.playing {
  box-shadow: 0 0 12px rgba(165, 180, 252, 0.25);
}
.wn-scene-icon {
  font-size: 22px;
}
.wn-scene-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-high);
}
.wn-scene-desc {
  font-size: 11px;
  color: var(--text-dim);
}
.wn-now-playing {
  margin-top: 2px;
  font-size: 11px;
  color: #a5b4fc;
}
.wn-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  flex-wrap: wrap;
}
.wn-btn {
  padding: 7px 16px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-medium);
  font-size: 13px;
  cursor: pointer;
}
.wn-btn:hover {
  border-color: var(--accent);
  color: var(--text-high);
}
.wn-row input[type='range'] {
  flex: 1;
  accent-color: var(--accent);
}
.wn-vol {
  flex: 0 0 44px;
  text-align: right;
  font-size: 13px;
  color: var(--text-high);
  font-variant-numeric: tabular-nums;
}
.wn-chip {
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-medium);
  font-size: 12px;
  cursor: pointer;
}
.wn-chip.on {
  border-color: var(--accent);
  color: var(--text-high);
  background: rgba(165, 180, 252, 0.1);
}
.wn-hint {
  margin: 10px 0 0;
  font-size: 12px;
  color: var(--text-dim);
}
</style>
