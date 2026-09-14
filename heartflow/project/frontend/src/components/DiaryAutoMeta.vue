<template>
  <div class="zim">
    <!-- 开关行 -->
    <div class="zim-toggle">
      <span v-if="meta" class="zim-date">{{ meta.date }} · {{ meta.weekday }}</span>
      <label class="zim-on"><input type="checkbox" :checked="enabled" @change="onToggle" /> 自动记录时令</label>
    </div>

    <!-- 时令徽章 -->
    <div v-if="meta" class="zim-bar">
      <span class="zim-chip" :style="{ borderColor: weather?.color }">
        <button v-if="!editing" class="zim-chip-btn" @click="editWeather" :title="'点击更换天气'">
          {{ weather ? weather.icon + ' ' + weather.label : '➕ 天气' }}
        </button>
        <span v-else class="zim-picker">
          <button v-for="w in WEATHER_PRESETS" :key="w.type"
            class="zim-w" :class="{ active: meta.weather === w.type }"
            :title="w.label" @click="pickWeather(w.type)">{{ w.icon }}</button>
        </span>
      </span>

      <span class="zim-chip">
        <span class="zim-branch">{{ meta.shichen }}</span>
        <span class="zim-sub">{{ meta.shichenAlias }}</span>
        <em class="zim-element">{{ meta.shichenElement }}</em>
      </span>

      <span class="zim-chip">
        <span class="zim-sub">{{ meta.solarTermIcon }}</span>
        <span class="zim-branch">{{ meta.solarTerm }}</span>
      </span>

      <span class="zim-chip zim-season">{{ meta.season }}</span>
    </div>

    <!-- 生成按钮 -->
    <button v-if="!meta" class="zim-refresh" @click="collect">此刻记一笔</button>
    <button v-else class="zim-refresh" @click="collect" title="刷新为当前时刻">↻</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  useZeitgeist,
  weatherPreset,
  WEATHER_PRESETS,
  type WeatherType,
} from '../modules/zeitgeist'

const { pref, updatePref, collectNow, lastMeta } = useZeitgeist()

const meta = ref(lastMeta())
const editing = ref(false)

const enabled = computed(() => pref.value.autoCollect)
const weather = computed(() => (meta.value?.weather ? weatherPreset(meta.value.weather) : null))

function collect() {
  meta.value = collectNow()
  editing.value = false
}

function onToggle(e: Event) {
  updatePref({ autoCollect: (e.target as HTMLInputElement).checked })
}

function editWeather() {
  editing.value = true
}

function pickWeather(type: WeatherType) {
  if (meta.value) {
    meta.value = collectNow(new Date(), type)
  }
  editing.value = false
}

onMounted(() => {
  if (!meta.value) collect()
})
</script>

<style scoped>
.zim { margin-top: 14px; font-size: 13px; }
.zim-toggle { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.zim-date { opacity: 0.7; }
.zim-on { display: inline-flex; align-items: center; gap: 5px; opacity: 0.8; font-size: 12px; cursor: pointer; }
.zim-bar { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.zim-chip {
  display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px;
  border: 1px solid rgba(255, 255, 255, 0.14); border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
}
.zim-chip-btn { border: none; background: transparent; color: inherit; cursor: pointer; font-size: 13px; }
.zim-branch { font-weight: 700; font-size: 15px; }
.zim-sub { font-size: 11px; opacity: 0.7; }
.zim-element { font-style: normal; font-size: 11px; color: #a7e3c9; }
.zim-season { color: #f0c040; }
.zim-picker { display: inline-flex; gap: 4px; }
.zim-w { border: none; background: transparent; cursor: pointer; font-size: 15px; opacity: 0.6; }
.zim-w.active { opacity: 1; transform: scale(1.15); }
.zim-refresh { margin-top: 8px; padding: 5px 12px; border-radius: 8px; border: 1px dashed rgba(255,255,255,0.18); background: transparent; color: inherit; cursor: pointer; font-size: 12px; }
.zim-refresh:hover { background: rgba(255,255,255,0.06); }
</style>