<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useDynamicIsland, ISLAND_MODES, ISLAND_MODE_META } from '../modules/dynamic-island'
import type { IslandMode } from '../modules/dynamic-island'

const { mode, autoCycle, setMode, nextMode, toggleAutoCycle, reset } = useDynamicIsland()

const now = ref(new Date())
let clockTimer: number | null = null
let cycleTimer: number | null = null

const timeText = computed(() => {
  const d = now.value
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
})

const dateText = computed(() => {
  const d = now.value
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}月${p(d.getDate())}日`
})

function startClock() {
  stopClock()
  clockTimer = window.setInterval(() => {
    now.value = new Date()
  }, 1000)
}

function stopClock() {
  if (clockTimer !== null) {
    window.clearInterval(clockTimer)
    clockTimer = null
  }
}

function startCycle() {
  stopCycle()
  if (autoCycle.value) {
    cycleTimer = window.setInterval(() => nextMode(), 4000)
  }
}

function stopCycle() {
  if (cycleTimer !== null) {
    window.clearInterval(cycleTimer)
    cycleTimer = null
  }
}

onMounted(() => {
  startClock()
  startCycle()
})

onBeforeUnmount(() => {
  stopClock()
  stopCycle()
})

watch(autoCycle, startCycle)

function onPick(m: IslandMode) {
  setMode(m)
}
</script>

<template>
  <section class="dyl-panel">
    <header class="dyl-head">
      <div class="dyl-head-text">
        <span class="dyl-kicker">触角 · 状态展示</span>
        <h3 class="dyl-title">动态岛 · 状态胶囊</h3>
      </div>
      <button
        class="dyl-cycle"
        type="button"
        :class="{ 'is-on': autoCycle }"
        :aria-pressed="autoCycle"
        @click="toggleAutoCycle"
      >
        {{ autoCycle ? '自动轮播 · 开' : '自动轮播 · 关' }}
      </button>
    </header>

    <div class="dyl-stage">
      <div class="dyl-island" :class="`is-${mode}`">
        <span class="dyl-island-icon">{{ ISLAND_MODE_META[mode].icon }}</span>
        <div class="dyl-island-body">
          <template v-if="mode === 'clock'">
            <span class="dyl-island-main">{{ timeText }}</span>
            <span class="dyl-island-sub">{{ dateText }}</span>
          </template>
          <template v-else-if="mode === 'focus'">
            <span class="dyl-island-main">专注中 · 25:00</span>
            <span class="dyl-island-sub">保持节奏</span>
          </template>
          <template v-else-if="mode === 'notification'">
            <span class="dyl-island-main">3 条新通知</span>
            <span class="dyl-island-sub">点击查看</span>
          </template>
          <template v-else-if="mode === 'battery'">
            <span class="dyl-island-main">78%</span>
            <span class="dyl-island-sub">电量充足</span>
          </template>
          <template v-else>
            <span class="dyl-island-main">心流电台</span>
            <span class="dyl-island-sub">正在播放</span>
          </template>
        </div>
        <span v-if="mode === 'music'" class="dyl-bars" aria-hidden="true"><i /><i /><i /></span>
      </div>
    </div>

    <div class="dyl-modes">
      <button
        v-for="m in ISLAND_MODES"
        :key="m"
        type="button"
        class="dyl-mode"
        :class="{ 'is-active': m === mode }"
        @click="onPick(m)"
      >
        {{ ISLAND_MODE_META[m].icon }} {{ ISLAND_MODE_META[m].label }}
      </button>
    </div>

    <button class="dyl-reset" type="button" @click="reset">复位为默认</button>
  </section>
</template>

<style scoped>
.dyl-panel {
  margin: 18px 0;
  padding: 18px 20px 20px;
  border: 1px solid rgba(150, 130, 200, 0.28);
  border-radius: 18px;
  background: linear-gradient(160deg, rgba(38, 32, 54, 0.55), rgba(26, 22, 38, 0.5));
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.2);
  color: #e6e0f4;
}

.dyl-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.dyl-kicker { font-size: 12px; letter-spacing: 0.12em; color: #a892d8; opacity: 0.9; }
.dyl-title { margin: 2px 0 0; font-size: 17px; font-weight: 600; color: #f0ecfa; }

.dyl-cycle {
  flex: none;
  padding: 5px 12px;
  border: 1px solid rgba(150, 130, 200, 0.4);
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.2);
  color: #b8a8e0;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.dyl-cycle.is-on { background: rgba(150, 130, 200, 0.22); color: #ece6ff; }

.dyl-stage {
  display: flex;
  justify-content: center;
  padding: 14px 0 6px;
}

.dyl-island {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  min-width: 128px;
  padding: 10px 20px;
  border-radius: 26px;
  background: #0d0b14;
  box-shadow: 0 8px 26px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(150, 130, 200, 0.25);
  transition: min-width 0.5s cubic-bezier(0.22, 1, 0.36, 1), padding 0.5s ease, border-radius 0.5s ease;
}

.dyl-island.is-focus { min-width: 200px; border-radius: 30px; }
.dyl-island.is-notification { min-width: 176px; }
.dyl-island.is-music { min-width: 190px; border-radius: 30px; }

.dyl-island-icon { font-size: 20px; line-height: 1; }

.dyl-island-body { display: flex; flex-direction: column; gap: 1px; }

.dyl-island-main {
  font-size: 15px;
  font-weight: 600;
  color: #f0ecfa;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.dyl-island-sub { font-size: 10px; letter-spacing: 0.06em; color: #8d82ad; white-space: nowrap; }

.dyl-bars { display: inline-flex; align-items: flex-end; gap: 2px; height: 16px; }
.dyl-bars i { width: 3px; height: 100%; border-radius: 2px; background: #a892d8; animation: dyl-bar 0.9s ease-in-out infinite; }
.dyl-bars i:nth-child(2) { animation-delay: 0.2s; }
.dyl-bars i:nth-child(3) { animation-delay: 0.4s; }

@keyframes dyl-bar {
  0%, 100% { transform: scaleY(0.4); }
  50% { transform: scaleY(1); }
}

.dyl-modes { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-top: 16px; }

.dyl-mode {
  padding: 5px 12px;
  border: 1px solid rgba(150, 130, 200, 0.3);
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.18);
  color: #b8a8e0;
  font-size: 12px;
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease;
}

.dyl-mode.is-active { border-color: #a892d8; color: #f0ecfa; box-shadow: 0 0 0 1px #a892d8 inset; }

.dyl-reset {
  display: block;
  margin: 14px auto 0;
  padding: 5px 12px;
  border: 1px solid rgba(150, 130, 200, 0.24);
  border-radius: 8px;
  background: none;
  color: #9c8fc4;
  font-size: 12px;
  cursor: pointer;
}

.dyl-reset:hover { color: #d8cff0; }
</style>
