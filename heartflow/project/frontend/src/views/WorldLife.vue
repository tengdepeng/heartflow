<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance wl">
    <!-- 氛围背景层：世界 · 昼夜与天气 -->
    <div data-enter class="wl-ambient" aria-hidden="true">
      <div class="wl-glow wl-glow--top"></div>
      <div class="wl-glow wl-glow--bottom"></div>
      <div class="wl-orb" aria-hidden="true">
        <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g stroke="currentColor" stroke-width="0.8" opacity="0.05">
            <circle cx="100" cy="100" r="60" />
            <circle cx="100" cy="100" r="80" />
            <ellipse cx="100" cy="100" rx="60" ry="20" />
            <ellipse cx="100" cy="100" rx="20" ry="60" />
            <line x1="100" y1="20" x2="100" y2="180" />
            <line x1="20" y1="100" x2="180" y2="100" />
          </g>
        </svg>
      </div>
    </div>

    <!-- Header -->
    <RoomLayout
      :title="roomData?.name"
      kicker="让世界呼吸——昼夜交替、天气流转、世代传承"
      :subtitle="roomData?.description"
      align="center"
      data-enter
    >
      <template #breadcrumb>
        <div class="breadcrumb-row">
          <button class="breadcrumb-link" @click="nav.enterRoom('home-space')">
            <span class="breadcrumb-home-icon">🏠</span>
            <span>家</span>
          </button>
          <span class="breadcrumb-sep">›</span>
          <span class="breadcrumb-link current">
            <span class="breadcrumb-icon">{{ roomData?.icon }}</span>
            <span>{{ roomData?.name }}</span>
          </span>
        </div>
      </template>

    <!-- 当前世界状态 -->
    <section data-enter class="wl-section">
      <div class="wl-now">
        <div class="wl-now-card">
          <span class="wl-now-icon">{{ day.phaseInfo.value.icon }}</span>
          <div class="wl-now-body">
            <span class="wl-now-label">昼夜</span>
            <span class="wl-now-value">{{ day.phaseInfo.value.label }}</span>
            <span class="wl-now-sub">{{ day.phaseInfo.value.startHour }}:00 – {{ day.phaseInfo.value.endHour }}:00</span>
          </div>
        </div>
        <div class="wl-now-card">
          <span class="wl-now-icon">{{ weather.weather.value.icon }}</span>
          <div class="wl-now-body">
            <span class="wl-now-label">天气</span>
            <span class="wl-now-value">{{ weather.weather.value.label }}</span>
            <span class="wl-now-sub">强度 {{ Math.round(weather.weatherIntensity.value * 100) }}%</span>
          </div>
        </div>
        <div class="wl-now-card">
          <span class="wl-now-icon">🌱</span>
          <div class="wl-now-body">
            <span class="wl-now-label">世代</span>
            <span class="wl-now-value">{{ legacy.currentGeneration.value ? '第' + legacy.currentGeneration.value.number + '代' : '尚未开启' }}</span>
            <span class="wl-now-sub">{{ legacy.currentGeneration.value?.carrierName ?? '等待第一位载体' }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 昼夜循环 -->
    <section data-enter class="wl-section">
      <h3 class="wl-section-title">🌗 昼夜循环</h3>
      <div class="wl-ctrl-row">
        <label class="wl-switch">
          <input type="checkbox" :checked="day.enabled.value" @change="toggleDayNight" />
          <span class="wl-switch-track"></span>
          <span class="wl-switch-label">启用昼夜循环</span>
        </label>
        <span v-if="day.overridePhase.value" class="wl-badge">手动覆盖：{{ day.phaseInfo.value.label }}</span>
      </div>
      <div class="wl-phases">
        <button
          v-for="p in day.allPhases"
          :key="p.phase"
          class="wl-phase"
          :class="{ active: day.currentPhase.value === p.phase }"
          @click="overridePhase(p.phase)"
        >
          <span class="wl-phase-icon">{{ p.icon }}</span>
          <span class="wl-phase-label">{{ p.label }}</span>
        </button>
      </div>
      <div class="wl-progress">
        <div class="wl-progress-track">
          <i :style="{ width: (day.phaseProgress.value * 100) + '%' }"></i>
        </div>
        <span class="wl-progress-label">本时段进度 {{ Math.round(day.phaseProgress.value * 100) }}% · 下一时段 {{ day.nextPhase.value.icon }} {{ day.nextPhase.value.label }}</span>
      </div>
      <div class="wl-ctrl-row">
        <button v-if="day.overridePhase.value" class="wl-btn wl-btn--ghost" @click="clearOverride">恢复跟随实际时间</button>
      </div>
    </section>

    <!-- 天气系统 -->
    <section data-enter class="wl-section">
      <h3 class="wl-section-title">🌦 天气系统</h3>
      <div class="wl-ctrl-row">
        <label class="wl-switch">
          <input type="checkbox" :checked="weather.autoCycle.value" @change="toggleAutoWeather" />
          <span class="wl-switch-track"></span>
          <span class="wl-switch-label">自动循环天气</span>
        </label>
        <button class="wl-btn wl-btn--ghost" @click="randomWeather">🎲 随机天气</button>
        <button class="wl-btn wl-btn--ghost" @click="nextWeather">⏭ 下一个</button>
      </div>
      <div class="wl-weathers">
        <button
          v-for="w in weather.allWeatherTypes"
          :key="w.type"
          class="wl-weather"
          :class="{ active: weather.currentWeather.value === w.type }"
          @click="setWeather(w.type)"
        >
          <span class="wl-weather-icon">{{ w.icon }}</span>
          <span class="wl-weather-label">{{ w.label }}</span>
        </button>
      </div>
      <div class="wl-intensity">
        <span class="wl-intensity-label">强度</span>
        <input
          type="range" min="0" max="100" :value="Math.round(weather.weatherIntensity.value * 100)"
          class="wl-range" @input="setIntensity(Number(($event.target as HTMLInputElement).value) / 100)"
        />
        <span class="wl-intensity-value">{{ Math.round(weather.weatherIntensity.value * 100) }}%</span>
      </div>
    </section>

    <!-- 世界传承 -->
    <section data-enter class="wl-section">
      <h3 class="wl-section-title">🕊 世界传承</h3>
      <div v-if="legacy.legacy.value.totalGenerations" class="wl-legacy-stats">
        <div class="wl-legacy-stat">
          <b>{{ legacy.legacy.value.totalGenerations }}</b>
          <span>世代</span>
        </div>
        <div class="wl-legacy-stat">
          <b>{{ legacy.legacy.value.totalInheritedSeeds }}</b>
          <span>传承种子</span>
        </div>
        <div class="wl-legacy-stat">
          <b>{{ legacy.legacy.value.totalInheritedWills }}</b>
          <span>传承遗志</span>
        </div>
      </div>
      <div v-if="legacy.currentGeneration.value" class="wl-gen-current">
        <span class="wl-gen-icon">🌱</span>
        <div class="wl-gen-body">
          <span class="wl-gen-name">第{{ legacy.currentGeneration.value.number }}代 · {{ legacy.currentGeneration.value.carrierName }}</span>
          <span class="wl-gen-meta">
            {{ legacy.currentGeneration.value.seedCount }} 种子 · {{ legacy.currentGeneration.value.focusMinutes }} 分钟 · {{ legacy.currentGeneration.value.flowerCount }} 花
          </span>
        </div>
      </div>
      <div v-if="legacy.pastGenerations.value.length" class="wl-gen-list">
        <div v-for="g in [...legacy.pastGenerations.value].sort((a, b) => b.number - a.number)" :key="g.id" class="wl-gen-item">
          <span class="wl-gen-icon">🪦</span>
          <div class="wl-gen-body">
            <span class="wl-gen-name">第{{ g.number }}代 · {{ g.carrierName }}</span>
            <span class="wl-gen-meta">
              {{ g.inheritedSeedCount }} 种子 → 传承 · {{ g.willIds.length }} 遗志
            </span>
          </div>
        </div>
      </div>
      <div v-if="narrative.length" class="wl-narrative">
        <p v-for="(line, i) in narrative" :key="i">{{ line }}</p>
      </div>
      <EmptyState
        v-else
        icon="🌱"
        title="世界尚未开启传承"
        hint="当第一位载体退休、新载体诞生时，世代将在此记录。"
        :glow="false"
        cta-label=""
      />
    </section>
    </RoomLayout>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useViewEntrance } from '../composables/useViewEntrance'
import { useRoomNavigation } from '../composables/useRoomNavigation'
import RoomLayout from '../components/RoomLayout.vue'
import EmptyState from '../components/EmptyState.vue'
import { useDayNightCycle, useWeather, useWorldLegacy } from '../modules/world-life'
import type { DayPhase } from '../modules/world-life'
import type { WeatherType } from '../modules/world-life'
import { getRoom } from '../engine/room-graph'

const { entranceClass, entranceRef } = useViewEntrance()
const nav = useRoomNavigation()
const roomData = computed(() => getRoom('world-life'))

const day = useDayNightCycle()
const weather = useWeather()
const legacy = useWorldLegacy()

const narrative = computed(() => legacy.generateLegacyNarrative())

function toggleDayNight() {
  if (day.enabled.value) day.disable()
  else day.enable()
}
function overridePhase(p: DayPhase) {
  day.setOverride(p)
}
function clearOverride() {
  day.setOverride(null)
}
function toggleAutoWeather() {
  if (weather.autoCycle.value) weather.stopAutoCycle()
  else weather.startAutoCycle()
}
function randomWeather() {
  weather.randomWeather()
}
function nextWeather() {
  weather.nextWeather()
}
function setWeather(t: WeatherType) {
  weather.setWeather(t)
}
function setIntensity(v: number) {
  weather.setIntensity(v)
}

onMounted(() => {
  day.load()
  weather.load()
  legacy.load()
  if (day.enabled.value) day.start()
})
onUnmounted(() => {
  day.stop()
})
</script>

<style scoped>
.wl { position: relative; max-width: 860px; margin: 0 auto; padding: 0 0 60px; }
.wl-ambient { position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
.wl-glow { position: absolute; border-radius: 50%; filter: blur(90px); opacity: 0.14; }
.wl-glow--top { width: 420px; height: 420px; top: -120px; right: -80px; background: #6b9fc4; }
.wl-glow--bottom { width: 380px; height: 380px; bottom: -100px; left: -80px; background: #f59e6c; }
.wl-orb { position: absolute; left: 8%; top: 16%; opacity: 0.5; }

.wl-section { position: relative; z-index: 1; margin-bottom: 20px; padding: 18px 20px; border-radius: 14px; background: var(--card-bg, rgba(18, 14, 11, 0.6)); border: 1px solid var(--border, rgba(255, 255, 255, 0.08)); }
.wl-section-title { font-size: 13px; letter-spacing: 2px; color: var(--text-high, rgba(232, 224, 216, 0.88)); margin: 0 0 12px; }

.wl-now { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.wl-now-card { display: flex; align-items: center; gap: 10px; padding: 12px; border-radius: 12px; background: rgba(255,255,255,0.03); }
.wl-now-icon { font-size: 24px; }
.wl-now-body { display: flex; flex-direction: column; gap: 1px; }
.wl-now-label { font-size: 10px; color: rgba(232, 221, 208, 0.4); }
.wl-now-value { font-size: 15px; font-weight: 600; color: var(--text-high, rgba(232, 224, 216, 0.88)); }
.wl-now-sub { font-size: 10px; color: rgba(232, 221, 208, 0.45); }

.wl-ctrl-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
.wl-switch { display: flex; align-items: center; gap: 8px; cursor: pointer; }
.wl-switch input { display: none; }
.wl-switch-track { width: 34px; height: 18px; border-radius: 999px; background: rgba(255,255,255,0.1); position: relative; transition: all 0.2s; }
.wl-switch-track::after { content: ''; position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; border-radius: 50%; background: rgba(232, 221, 208, 0.5); transition: all 0.2s; }
.wl-switch input:checked + .wl-switch-track { background: rgba(var(--accent-rgb), 0.35); }
.wl-switch input:checked + .wl-switch-track::after { left: 18px; background: var(--accent, #d4a574); }
.wl-switch-label { font-size: 12px; color: rgba(232, 221, 208, 0.7); }
.wl-badge { font-size: 10px; padding: 2px 10px; border-radius: 8px; background: rgba(240,192,64,0.12); color: #f0c040; }

.wl-phases { display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; margin-bottom: 12px; }
.wl-phase { display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 8px 4px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.02); cursor: pointer; transition: all 0.2s; }
.wl-phase:hover { border-color: rgba(var(--accent-rgb), 0.3); }
.wl-phase.active { border-color: rgba(var(--accent-rgb), 0.5); background: rgba(var(--accent-rgb), 0.12); }
.wl-phase-icon { font-size: 16px; }
.wl-phase-label { font-size: 10px; color: rgba(232, 221, 208, 0.6); }

.wl-progress { margin-bottom: 12px; }
.wl-progress-track { height: 6px; border-radius: 999px; background: rgba(255,255,255,0.06); overflow: hidden; margin-bottom: 6px; }
.wl-progress-track i { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, #f59e6c, #f0c040); transition: width 0.3s ease; }
.wl-progress-label { font-size: 10px; color: rgba(232, 221, 208, 0.45); }

.wl-weathers { display: grid; grid-template-columns: repeat(8, 1fr); gap: 6px; margin-bottom: 12px; }
.wl-weather { display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 8px 2px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.02); cursor: pointer; transition: all 0.2s; }
.wl-weather:hover { border-color: rgba(var(--accent-rgb), 0.3); }
.wl-weather.active { border-color: rgba(var(--accent-rgb), 0.5); background: rgba(var(--accent-rgb), 0.12); }
.wl-weather-icon { font-size: 15px; }
.wl-weather-label { font-size: 9px; color: rgba(232, 221, 208, 0.6); }

.wl-intensity { display: flex; align-items: center; gap: 10px; }
.wl-intensity-label { font-size: 11px; color: rgba(232, 221, 208, 0.5); }
.wl-range { flex: 1; accent-color: #f0c040; }
.wl-intensity-value { font-size: 11px; color: rgba(232, 221, 208, 0.6); width: 36px; text-align: right; font-variant-numeric: tabular-nums; }

.wl-btn { padding: 6px 14px; border-radius: 8px; border: 1px solid rgba(var(--accent-rgb), 0.3); background: rgba(var(--accent-rgb), 0.1); color: var(--accent, #d4a574); font-size: 11px; font-family: inherit; cursor: pointer; transition: all 0.2s; }
.wl-btn:hover { background: rgba(var(--accent-rgb), 0.18); }
.wl-btn--ghost { background: transparent; border-color: rgba(255,255,255,0.15); color: rgba(232, 221, 208, 0.6); }
.wl-btn--ghost:hover { border-color: rgba(var(--accent-rgb), 0.4); color: var(--accent, #d4a574); background: rgba(var(--accent-rgb), 0.08); }

.wl-legacy-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px; }
.wl-legacy-stat { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 10px 4px; border-radius: 10px; background: rgba(255,255,255,0.03); }
.wl-legacy-stat b { font-size: 18px; font-weight: 600; color: var(--text-high, rgba(232, 224, 216, 0.88)); }
.wl-legacy-stat span { font-size: 10px; color: rgba(232, 221, 208, 0.4); }

.wl-gen-current, .wl-gen-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; background: rgba(255,255,255,0.03); margin-bottom: 6px; }
.wl-gen-current { border: 1px solid rgba(138,154,122,0.25); }
.wl-gen-icon { font-size: 18px; }
.wl-gen-body { display: flex; flex-direction: column; gap: 2px; }
.wl-gen-name { font-size: 12px; font-weight: 600; color: var(--text-high, rgba(232, 224, 216, 0.88)); }
.wl-gen-meta { font-size: 10px; color: rgba(232, 221, 208, 0.45); }

.wl-narrative { margin-top: 10px; padding: 10px 12px; border-radius: 10px; background: rgba(240,192,64,0.05); border: 1px dashed rgba(240,192,64,0.2); }
.wl-narrative p { font-size: 11px; color: rgba(232, 221, 208, 0.65); margin: 0 0 4px; line-height: 1.6; }
.wl-narrative p:last-child { margin-bottom: 0; }

/* 已迁共享 EmptyState */

@media (max-width: 640px) {
  .wl { padding: 0 0 48px; }
  .wl-now { grid-template-columns: 1fr; }
  .wl-phases { grid-template-columns: repeat(3, 1fr); }
  .wl-weathers { grid-template-columns: repeat(4, 1fr); }
  /* 面包屑行避让常驻顶左的 GlobalDropDrawer grip（fixed; left:12px; 约 104px 宽，右沿 x≈116）：
     原居中布局在窄屏左端会压到 grip，改为左对齐并右移让位。 */
  .breadcrumb-row { justify-content: flex-start; padding-left: calc(120px + env(safe-area-inset-left, 0px)); }
}
</style>