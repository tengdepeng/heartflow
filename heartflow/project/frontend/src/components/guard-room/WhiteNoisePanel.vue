<template>
  <div data-enter class="guard-tab-content">
    <!-- 白噪音 -->
    <section class="guard-section">
      <h3 class="section-label">白噪音</h3>
      <p class="setting-hint">
        本地 Web Audio 合成，不联网。点击场景开始播放，再点一次停止。
      </p>

      <div class="noise-grid">
        <button
          v-for="s in NOISE_SCENES"
          :key="s.id"
          class="noise-scene"
          :class="{ active: currentSceneId === s.id && playing }"
          :style="{ '--noise-color': s.color }"
          @click="toggleScene(s.id)"
        >
          <span class="noise-icon">{{ s.icon }}</span>
          <span class="noise-label">{{ s.label }}</span>
          <span class="noise-desc">{{ s.desc }}</span>
          <span v-if="currentSceneId === s.id && playing" class="noise-eq">
            <i></i><i></i><i></i>
          </span>
        </button>
      </div>

      <div class="noise-controls">
        <div class="eye-slider-row">
          <span class="eye-slider-label">音量 <em>{{ Math.round(volume * 100) }}%</em></span>
          <input
            type="range" min="0" max="100" :value="Math.round(volume * 100)"
            @input="setVolume(Number(($event.target as HTMLInputElement).value) / 100)"
          />
        </div>

        <div class="noise-timer">
          <span class="eye-slider-label">睡眠定时</span>
          <div class="timer-btns">
            <button
              v-for="m in TIMER_OPTIONS"
              :key="m"
              class="timer-btn"
              :class="{ active: sleepMinutes === m }"
              @click="setSleepTimer(m)"
            >
              {{ m === 0 ? '关闭' : m + '分' }}
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useWhiteNoise, NOISE_SCENES } from '../../modules/guard/white-noise'

const TIMER_OPTIONS = [15, 30, 60, 0]

const {
  playing,
  currentSceneId,
  volume,
  sleepMinutes,
  load,
  toggleScene,
  setVolume,
  setSleepTimer,
} = useWhiteNoise()

onMounted(load)
</script>

<style scoped src="./guard-shared.css"></style>

<style scoped>
.noise-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 4px;
}

.noise-scene {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 16px 8px 12px;
  border-radius: 14px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  background: rgba(var(--bg-card-rgb), 0.35);
  color: rgba(var(--text-primary-rgb), 0.6);
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
  overflow: hidden;
}

.noise-scene:hover {
  background: rgba(var(--accent-rgb), 0.08);
  border-color: rgba(var(--accent-rgb), 0.25);
}

.noise-scene.active {
  border-color: var(--noise-color);
  background: color-mix(in srgb, var(--noise-color) 12%, transparent);
  box-shadow: 0 0 18px color-mix(in srgb, var(--noise-color) 25%, transparent);
}

.noise-icon {
  font-size: 22px;
  line-height: 1;
}

.noise-label {
  font-size: 13px;
  color: rgba(var(--text-primary-rgb), 0.75);
}

.noise-desc {
  font-size: 10px;
  color: var(--text-low);
  text-align: center;
}

/* 播放均衡器动画 */
.noise-eq {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 12px;
}

.noise-eq i {
  width: 3px;
  border-radius: 1px;
  background: var(--noise-color);
  animation: noise-eq-bounce 0.9s ease-in-out infinite;
}

.noise-eq i:nth-child(1) { animation-delay: 0s; }
.noise-eq i:nth-child(2) { animation-delay: 0.2s; }
.noise-eq i:nth-child(3) { animation-delay: 0.4s; }

@keyframes noise-eq-bounce {
  0%, 100% { height: 4px; }
  50% { height: 12px; }
}

.noise-controls {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px 0 4px;
}

.eye-slider-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.eye-slider-label {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: rgba(var(--text-primary-rgb), 0.6);
}

.eye-slider-label em {
  font-style: normal;
  color: var(--accent);
  font-size: 12px;
}

.eye-slider-row input[type='range'] {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: rgba(var(--accent-rgb), 0.18);
  outline: none;
  cursor: pointer;
}

.eye-slider-row input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent);
  border: 2px solid var(--bg-card);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

.noise-timer {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.timer-btns {
  display: flex;
  gap: 6px;
}

.timer-btn {
  flex: 1;
  padding: 8px 0;
  border-radius: 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  background: rgba(var(--bg-card-rgb), 0.35);
  color: rgba(var(--text-primary-rgb), 0.55);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.timer-btn:hover {
  background: rgba(var(--accent-rgb), 0.08);
}

.timer-btn.active {
  background: rgba(var(--accent-rgb), 0.15);
  border-color: rgba(var(--accent-rgb), 0.3);
  color: var(--accent);
}
</style>
