<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import {
  useStandbyScene,
  SCENES,
  SCENE_META,
  MIN_IDLE_SECONDS,
  MAX_IDLE_SECONDS,
} from '../modules/standby-scene'

const { scene, idleSeconds, enabled, setScene, setIdleSeconds, toggleEnabled, reset } =
  useStandbyScene()

const overlay = ref(false)
const idleTicks = ref(0)
let tick: number | null = null

function stopTick() {
  if (tick !== null) {
    window.clearInterval(tick)
    tick = null
  }
}

function startTick() {
  stopTick()
  tick = window.setInterval(() => {
    if (!enabled.value) {
      idleTicks.value = 0
      return
    }
    idleTicks.value += 1
    if (idleTicks.value >= idleSeconds.value) overlay.value = true
  }, 1000)
}

function onActivity() {
  idleTicks.value = 0
  if (overlay.value) overlay.value = false
}

function preview() {
  idleTicks.value = 0
  overlay.value = true
}

function onIdleRange(e: Event) {
  setIdleSeconds(Number((e.target as HTMLInputElement).value))
}

onMounted(() => {
  document.addEventListener('pointermove', onActivity)
  document.addEventListener('keydown', onActivity)
  startTick()
})

onBeforeUnmount(() => {
  document.removeEventListener('pointermove', onActivity)
  document.removeEventListener('keydown', onActivity)
  stopTick()
})

watch([enabled, idleSeconds], () => {
  idleTicks.value = 0
  if (!enabled.value) overlay.value = false
  startTick()
})

const sceneMeta = computed(() => SCENE_META[scene.value])
const idleLabel = computed(() => `${idleSeconds.value}s`)
</script>

<template>
  <section class="sbs-panel">
    <header class="sbs-head">
      <div class="sbs-head-text">
        <span class="sbs-kicker">触角 · 空闲氛围</span>
        <h3 class="sbs-title">空闲待机氛围场景</h3>
      </div>
      <button
        class="sbs-enable"
        type="button"
        :class="{ 'is-on': enabled }"
        :aria-pressed="enabled"
        @click="toggleEnabled"
      >{{ enabled ? '已启用' : '已关闭' }}</button>
    </header>

    <div class="sbs-stage" :class="`is-${scene}`">
      <div class="sbs-scene" :class="`is-${scene}`">
        <span class="sbs-scene-icon">{{ sceneMeta.icon }}</span>
        <span class="sbs-scene-hint">{{ sceneMeta.hint }}</span>
      </div>
    </div>

    <div class="sbs-scenes">
      <button
        v-for="id in SCENES"
        :key="id"
        type="button"
        class="sbs-scene-btn"
        :class="{ 'is-active': id === scene }"
        @click="setScene(id)"
      >{{ SCENE_META[id].icon }} {{ SCENE_META[id].label }}</button>
    </div>

    <div class="sbs-idle">
      <span class="sbs-label">静置 {{ idleLabel }} 后浮现</span>
      <input
        class="sbs-range"
        type="range"
        :min="MIN_IDLE_SECONDS"
        :max="MAX_IDLE_SECONDS"
        :step="5"
        :value="idleSeconds"
        @input="onIdleRange"
      />
    </div>

    <div class="sbs-actions">
      <button class="sbs-preview" type="button" @click="preview">立即预览</button>
      <button class="sbs-reset" type="button" @click="reset">恢复默认</button>
    </div>

    <div v-if="overlay" class="sbs-overlay" :class="`is-${scene}`" @click="onActivity">
      <div class="sbs-overlay-scene" :class="`is-${scene}`">
        <span class="sbs-overlay-icon">{{ sceneMeta.icon }}</span>
        <span class="sbs-overlay-hint">{{ sceneMeta.hint }}</span>
        <span class="sbs-overlay-tip">轻触任意处返回</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.sbs-panel {
  margin: 18px 0;
  padding: 18px 20px 20px;
  border: 1px solid rgba(var(--accent-rgb), 0.18);
  border-radius: 18px;
  background: linear-gradient(160deg, rgba(var(--bg-card-rgb), 0.55), rgba(var(--bg-card-rgb), 0.4));
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.18);
  color: var(--text-primary);
}

.sbs-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.sbs-kicker { font-size: 12px; letter-spacing: 0.12em; color: rgba(var(--accent-rgb), 0.7); }
.sbs-title { margin: 2px 0 0; font-size: 17px; font-weight: 600; }

.sbs-enable {
  flex: none;
  padding: 5px 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.3);
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.2);
  color: rgba(var(--accent-rgb), 0.7);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
}

.sbs-enable.is-on { background: rgba(var(--accent-rgb), 0.2); color: var(--text-primary); }

.sbs-stage {
  height: 168px;
  border-radius: 14px;
  overflow: hidden;
  background: #0b0912;
  box-shadow: inset 0 0 0 1px rgba(var(--accent-rgb), 0.12);
}

.sbs-scene {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  overflow: hidden;
}

.sbs-scene-icon { font-size: 40px; animation: sbs-float 4s ease-in-out infinite; }
.sbs-scene-hint { font-size: 12px; color: rgba(232, 221, 208, 0.6); }

.sbs-scene.is-snow::before {
  content: '';
  position: absolute;
  inset: -50% 0;
  background-image: radial-gradient(2px 2px at 20% 30%, rgba(255, 255, 255, 0.8), transparent),
    radial-gradient(2px 2px at 70% 60%, rgba(255, 255, 255, 0.6), transparent),
    radial-gradient(1.5px 1.5px at 40% 80%, rgba(255, 255, 255, 0.7), transparent),
    radial-gradient(1.5px 1.5px at 85% 20%, rgba(255, 255, 255, 0.5), transparent);
  background-size: 120px 120px;
  animation: sbs-snow 9s linear infinite;
}

.sbs-scene.is-aurora::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, rgba(90, 184, 160, 0.35), rgba(120, 100, 200, 0.35), rgba(90, 184, 160, 0.2));
  filter: blur(26px);
  animation: sbs-aurora 7s ease-in-out infinite alternate;
}

.sbs-scene.is-pulse::before {
  content: '';
  position: absolute;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(var(--accent-rgb), 0.4), transparent 70%);
  animation: sbs-pulse 3.4s ease-in-out infinite;
}

.sbs-scene.is-keyboard::before {
  content: '▌';
  position: absolute;
  bottom: 26px;
  font-size: 16px;
  color: rgba(var(--accent-rgb), 0.7);
  animation: sbs-caret 1.1s steps(1) infinite;
}

.sbs-scene.is-cat::before {
  content: '🌙';
  position: absolute;
  top: 18px;
  right: 26px;
  font-size: 22px;
  opacity: 0.7;
  animation: sbs-float 6s ease-in-out infinite;
}

@keyframes sbs-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

@keyframes sbs-snow {
  from { transform: translateY(0); }
  to { transform: translateY(60px); }
}

@keyframes sbs-aurora {
  from { transform: translateX(-14px) scale(1.05); opacity: 0.7; }
  to { transform: translateX(14px) scale(1.15); opacity: 1; }
}

@keyframes sbs-pulse {
  0%, 100% { transform: scale(0.85); opacity: 0.5; }
  50% { transform: scale(1.15); opacity: 1; }
}

@keyframes sbs-caret {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}

.sbs-scenes { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }

.sbs-scene-btn {
  padding: 5px 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.24);
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.18);
  color: rgba(var(--accent-rgb), 0.7);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease;
}

.sbs-scene-btn.is-active { border-color: var(--accent); color: var(--text-primary); box-shadow: 0 0 0 1px var(--accent) inset; }

.sbs-idle { display: flex; flex-direction: column; gap: 6px; margin-top: 16px; }
.sbs-label { font-size: 11px; color: rgba(var(--accent-rgb), 0.6); }
.sbs-range { width: 100%; accent-color: var(--accent); }

.sbs-actions { display: flex; gap: 10px; margin-top: 14px; }

.sbs-preview {
  padding: 7px 16px;
  border: 1px solid rgba(var(--accent-rgb), 0.3);
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.14);
  color: var(--text-primary);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
}

.sbs-reset {
  padding: 7px 16px;
  border: 1px solid rgba(var(--accent-rgb), 0.24);
  border-radius: 8px;
  background: none;
  color: rgba(var(--accent-rgb), 0.7);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
}

.sbs-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #060409;
  cursor: pointer;
  animation: sbs-fade 0.5s ease;
}

.sbs-overlay-scene {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  overflow: hidden;
}

.sbs-overlay-icon { font-size: 96px; animation: sbs-float 5s ease-in-out infinite; }
.sbs-overlay-hint { font-size: 15px; color: rgba(232, 221, 208, 0.7); letter-spacing: 0.08em; }
.sbs-overlay-tip { position: absolute; bottom: 40px; font-size: 12px; color: rgba(232, 221, 208, 0.35); }

.sbs-overlay-scene.is-snow::before {
  content: '';
  position: absolute;
  inset: -50% 0;
  background-image: radial-gradient(3px 3px at 20% 30%, rgba(255, 255, 255, 0.8), transparent),
    radial-gradient(3px 3px at 70% 60%, rgba(255, 255, 255, 0.6), transparent),
    radial-gradient(2px 2px at 40% 80%, rgba(255, 255, 255, 0.7), transparent);
  background-size: 160px 160px;
  animation: sbs-snow 9s linear infinite;
}

.sbs-overlay-scene.is-aurora::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, rgba(90, 184, 160, 0.35), rgba(120, 100, 200, 0.35), rgba(90, 184, 160, 0.2));
  filter: blur(60px);
  animation: sbs-aurora 8s ease-in-out infinite alternate;
}

.sbs-overlay-scene.is-pulse::before {
  content: '';
  position: absolute;
  width: 320px;
  height: 320px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(var(--accent-rgb), 0.35), transparent 70%);
  animation: sbs-pulse 4s ease-in-out infinite;
}

@keyframes sbs-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
