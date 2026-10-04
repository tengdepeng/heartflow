<template>
  <section class="sgs-panel">
    <header class="sgs-head">
      <div>
        <h4 class="sgs-title">🌠 观星地点库</h4>
        <p class="sgs-hint">精选国内暗夜/观星/天文台，设为观测地即驱动上方星图投影</p>
      </div>
      <span class="sgs-count">{{ CURATED_SPOTS.length }} 处</span>
    </header>

    <div class="sgs-controls">
      <input
        class="sgs-search"
        type="search"
        v-model="query"
        placeholder="搜索地名 / 省份 / 特色"
        aria-label="搜索观星地点"
      />
      <select class="sgs-prov" v-model="province" aria-label="按省份筛选">
        <option value="">全部省份</option>
        <option v-for="p in provinces" :key="p" :value="p">{{ p }}</option>
      </select>
    </div>

    <p class="sgs-current" v-if="selectedSpot">
      <span>📌 当前观测地：<b>{{ selectedSpot.name }}</b>
        （{{ selectedSpot.lat }}°N · {{ selectedSpot.lng }}°E · {{ selectedSpot.altitude }}m）</span>
      <button class="sgs-clear" type="button" @click="clearSpot">清除</button>
    </p>

    <ul class="sgs-list">
      <li
        v-for="s in displayList"
        :key="s.id"
        class="sgs-item"
        :class="{ active: s.id === selectedId }"
      >
        <div class="sgs-row">
          <span class="sgs-name">{{ s.name }}</span>
          <span class="sgs-prov">{{ s.province }}</span>
          <span class="sgs-bortle" :data-b="s.bortle">{{ bortleLabel(s.bortle) }}</span>
        </div>
        <p class="sgs-desc">{{ s.desc }}</p>
        <p class="sgs-meta">📍 {{ s.lat }}°N · {{ s.lng }}°E · ⛰ {{ s.altitude }} m</p>
        <button
          class="sgs-pick"
          type="button"
          :disabled="s.id === selectedId"
          @click="setSpot(s.id)"
        >{{ s.id === selectedId ? '✓ 已设为观测地' : '设为观测地' }}</button>
      </li>
      <li v-if="displayList.length === 0" class="sgs-empty">未找到匹配的观星地点。</li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  CURATED_SPOTS,
  bortleLabel,
  filterByProvince,
  searchSpots,
  sortByDarkness,
  useStargazingSpots,
} from '../modules/sky'

const { selectedId, selectedSpot, provinces, setSpot, clearSpot } = useStargazingSpots()

const query = ref('')
const province = ref('')

const displayList = computed<typeof CURATED_SPOTS>(() =>
  sortByDarkness(filterByProvince(searchSpots(CURATED_SPOTS, query.value), province.value), true),
)
</script>

<style scoped>
.sgs-panel {
  margin-top: 18px; padding-top: 14px; border-top: 1px dashed rgba(255, 255, 255, 0.14);
}
.sgs-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.sgs-title { margin: 0; }
.sgs-hint { margin: 4px 0 12px; font-size: 12px; opacity: 0.62; }
.sgs-count { font-size: 12px; color: #8ab4ff; opacity: 0.9; white-space: nowrap; }
.sgs-controls { display: flex; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
.sgs-search {
  flex: 1 1 200px; min-width: 160px; padding: 7px 11px; font-size: 13px;
  border: 1px solid rgba(148, 163, 184, 0.28); border-radius: 8px;
  background: rgba(255, 255, 255, 0.04); color: inherit;
}
.sgs-prov {
  padding: 7px 11px; font-size: 13px;
  border: 1px solid rgba(148, 163, 184, 0.28); border-radius: 8px;
  background: rgba(255, 255, 255, 0.04); color: inherit;
}
.sgs-current {
  margin: 0 0 12px; font-size: 12px; color: #8ab4ff; opacity: 0.92;
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
}
.sgs-clear {
  padding: 3px 9px; font-size: 12px; border: 1px solid rgba(138, 180, 255, 0.4);
  border-radius: 999px; background: rgba(138, 180, 255, 0.1); color: #8ab4ff; cursor: pointer;
}
.sgs-list {
  list-style: none; margin: 0; padding: 0;
  max-height: 360px; overflow-y: auto; display: grid; gap: 10px;
}
.sgs-item {
  padding: 11px 13px; border: 1px solid rgba(148, 163, 184, 0.22); border-radius: 10px;
  background: rgba(255, 255, 255, 0.03); transition: border-color 0.16s, background 0.16s;
}
.sgs-item.active { border-color: #8ab4ff; background: rgba(138, 180, 255, 0.12); }
.sgs-row { display: flex; align-items: center; gap: 8px; }
.sgs-name { font-size: 14px; font-weight: 600; }
.sgs-prov { font-size: 12px; opacity: 0.6; }
.sgs-bortle {
  margin-left: auto; font-size: 11px; padding: 2px 8px; border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.3); opacity: 0.85; white-space: nowrap;
}
.sgs-bortle[data-b="1"], .sgs-bortle[data-b="2"] { color: #6ee7b7; border-color: rgba(110, 231, 183, 0.5); }
.sgs-bortle[data-b="3"], .sgs-bortle[data-b="4"] { color: #f0c040; border-color: rgba(240, 192, 64, 0.5); }
.sgs-bortle[data-b="5"], .sgs-bortle[data-b="6"] { color: #f59e0b; border-color: rgba(245, 158, 11, 0.5); }
.sgs-bortle[data-b="7"], .sgs-bortle[data-b="8"], .sgs-bortle[data-b="9"] { color: #ef4444; border-color: rgba(239, 68, 68, 0.5); }
.sgs-desc { margin: 7px 0 4px; font-size: 12px; line-height: 1.5; opacity: 0.82; }
.sgs-meta { margin: 0 0 9px; font-size: 11px; opacity: 0.6; }
.sgs-pick {
  padding: 5px 13px; font-size: 12px; border: 1px solid rgba(138, 180, 255, 0.45);
  border-radius: 999px; background: rgba(138, 180, 255, 0.12); color: #8ab4ff; cursor: pointer;
  transition: all 0.16s;
}
.sgs-pick:hover:not(:disabled) { background: rgba(138, 180, 255, 0.22); }
.sgs-pick:disabled { opacity: 0.55; cursor: default; }
.sgs-empty { padding: 16px; text-align: center; font-size: 13px; opacity: 0.55; }
</style>
