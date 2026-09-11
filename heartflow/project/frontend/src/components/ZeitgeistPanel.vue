<template>
  <section class="zgp" aria-label="时令元数据">
    <div class="zgp-head">
      <span class="zgp-title">🌤 时令元数据</span>
      <span class="zgp-sub">时辰 · 节气 · 季节 · 天气</span>
    </div>

    <!-- 当前时令 -->
    <div class="zgp-block">
      <span class="zgp-block-label">当前时令</span>
      <div class="zgp-now">
        <div class="zgp-now-item">
          <span class="zgp-now-big">{{ currentShichen.name }}</span>
          <span class="zgp-now-meta">{{ currentShichen.alias }} · {{ currentShichen.element }}时</span>
        </div>
        <div class="zgp-now-item">
          <span class="zgp-now-big">{{ currentTerm.icon }} {{ currentTerm.name }}</span>
          <span class="zgp-now-meta">{{ currentSeason }}季 · {{ currentTerm.desc }}</span>
        </div>
      </div>
      <p class="zgp-hint">{{ nowLabel }} · 十二时辰按 2 小时一段自动流转</p>
    </div>

    <!-- 十二时辰 -->
    <div class="zgp-block">
      <span class="zgp-block-label">十二时辰</span>
      <div class="zgp-ring">
        <button
          v-for="s in SHICHEN_LIST"
          :key="s.branch"
          class="zgp-ring-item"
          :class="{ on: s.branch === currentShichen.branch }"
          :title="`${s.alias}（${s.element}）`"
        >
          <span class="zgp-ring-branch">{{ s.branch }}</span>
          <span class="zgp-ring-alias">{{ s.alias }}</span>
        </button>
      </div>
    </div>

    <!-- 时令采集 -->
    <div class="zgp-block">
      <span class="zgp-block-label">时令采集</span>
      <div class="zgp-weather">
        <button
          v-for="w in WEATHER_PRESETS"
          :key="w.type"
          class="zgp-weather-item"
          :class="{ on: selectedWeather === w.type }"
          @click="selectedWeather = w.type"
        >
          <span class="zgp-weather-icon">{{ w.icon }}</span>
          <span class="zgp-weather-label">{{ w.label }}</span>
        </button>
      </div>
      <button class="zgp-collect" @click="handleCollect">采集当前时令</button>
      <template v-if="last">
        <div class="zgp-last">
          <span class="zgp-last-date">{{ last.date }} · {{ last.weekday }}</span>
          <span class="zgp-last-meta">
            {{ last.shichen }}时 · {{ last.solarTerm }} · {{ last.season }}季
            <template v-if="last.weather"> · {{ weatherPreset(last.weather).label }}</template>
          </span>
        </div>
      </template>
      <p v-else class="zgp-empty">尚未采集，点击「采集当前时令」生成今日时令快照。</p>
    </div>

    <!-- 偏好 -->
    <div class="zgp-block">
      <span class="zgp-block-label">偏好</span>
      <label class="zgp-pref">
        <input type="checkbox" :checked="pref.autoCollect" @change="toggleAutoCollect" />
        <span>新建日志时自动采集时令元数据</span>
      </label>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  useZeitgeist,
  shichenForDate,
  solarTermOnDate,
  seasonForMonth,
  weatherPreset,
  SHICHEN_LIST,
  WEATHER_PRESETS,
} from '../modules/zeitgeist'
import type { WeatherType } from '../modules/zeitgeist'

const { pref, updatePref, collectNow, lastMeta } = useZeitgeist()

const now = ref(new Date())
const selectedWeather = ref<WeatherType | null>(null)

const currentShichen = computed(() => shichenForDate(now.value))
const currentTerm = computed(() => solarTermOnDate(now.value))
const currentSeason = computed(() => seasonForMonth(now.value.getMonth() + 1))
const nowLabel = computed(() => now.value.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' }))
const last = computed(() => lastMeta())

function handleCollect(): void {
  collectNow(now.value, selectedWeather.value)
  selectedWeather.value = null
}

function toggleAutoCollect(e: Event): void {
  updatePref({ autoCollect: (e.target as HTMLInputElement).checked })
}
</script>

<style scoped>
.zgp {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
  border-radius: 12px;
  background: var(--panel-bg, rgba(255, 255, 255, 0.03));
}
.zgp-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.zgp-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, #e8e6e1);
}
.zgp-sub {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.6));
}
.zgp-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.zgp-block-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary, rgba(232, 230, 225, 0.6));
}
.zgp-now {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.zgp-now-item {
  flex: 1;
  min-width: 120px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px;
  border-radius: 8px;
  background: var(--panel-bg, rgba(255, 255, 255, 0.04));
}
.zgp-now-big {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #e8e6e1);
}
.zgp-now-meta {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.6));
}
.zgp-hint {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.5));
  margin: 0;
}
.zgp-ring {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 6px;
}
.zgp-ring-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 4px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary, rgba(232, 230, 225, 0.6));
  cursor: default;
}
.zgp-ring-item.on {
  border-color: #f0c040;
  color: #f0c040;
  background: rgba(240, 192, 64, 0.08);
}
.zgp-ring-branch {
  font-size: 14px;
  font-weight: 600;
}
.zgp-ring-alias {
  font-size: 11px;
}
.zgp-weather {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.zgp-weather-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 8px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary, rgba(232, 230, 225, 0.6));
  cursor: pointer;
}
.zgp-weather-item.on {
  border-color: #f0c040;
  color: #f0c040;
  background: rgba(240, 192, 64, 0.08);
}
.zgp-weather-icon {
  font-size: 16px;
}
.zgp-weather-label {
  font-size: 11px;
}
.zgp-collect {
  align-self: flex-start;
  padding: 6px 14px;
  border: none;
  border-radius: 8px;
  background: #f0c040;
  color: #1a1a1a;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.zgp-last {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--panel-bg, rgba(255, 255, 255, 0.04));
}
.zgp-last-date {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #e8e6e1);
}
.zgp-last-meta {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.6));
}
.zgp-empty {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.5));
  margin: 0;
}
.zgp-pref {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-primary, #e8e6e1);
  cursor: pointer;
}
</style>
